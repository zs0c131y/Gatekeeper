/**
 * Gateway catch-all router.
 *
 * Middleware chain per request:
 *   1. Route lookup (all matching active routes).
 *   2. Health-aware candidate selection with weighted round-robin.
 *   3. Authentication (JWT/API key per route).
 *   4. Circuit-breaker guard (including HALF_OPEN probe limits).
 *   5. Adaptive rate limiting.
 *   6. Reverse proxy forwarding.
 */

const { Router } = require("express");
const crypto = require("crypto");

const Route = require("../models/Route");
const {
  optionalJWT,
  requireJWT,
  requireApiKey,
} = require("../middleware/auth");
const { getState, allowRequest, STATES } = require("../middleware/circuitBreaker");
const { rateLimitMiddleware } = require("../middleware/rateLimit");
const { createProxyMiddleware } = require("../middleware/proxy");
const { getRedisClient } = require("../config/database");
const redisKeys = require("../config/redisKeys");

const router = Router();
const rrState = new Map();

function routePatternMatches(routePath, requestPath) {
  const escaped = routePath
    .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\\\*/g, ".*");

  const re = new RegExp(`^${escaped}(/.*)?$`);
  return re.test(requestPath);
}

async function findMatchingRoutes(method, path) {
  const routes = await Route.find({ isActive: true })
    .sort({ priority: -1 })
    .populate("backendId")
    .lean();

  const matches = routes.filter((route) => {
    if (route.method !== "*" && route.method !== method) return false;
    return routePatternMatches(route.path, path);
  });

  if (matches.length === 0) return [];

  // Keep only highest-priority cohort so lower-priority rules do not shadow.
  const topPriority = matches[0].priority ?? 0;
  return matches.filter((r) => (r.priority ?? 0) === topPriority);
}

function generateTraceparent() {
  const traceId = crypto.randomBytes(16).toString("hex");
  const spanId = crypto.randomBytes(8).toString("hex");
  return `00-${traceId}-${spanId}-01`;
}

async function readHealthScore(redis, backendName) {
  if (!redis) return 100;
  const raw = await redis.get(redisKeys.healthScore(backendName));
  if (raw === null) return 100;
  const n = Number(raw);
  return Number.isFinite(n) ? n : 100;
}

function weightedRoundRobinPick(candidates, groupKey) {
  const weighted = [];
  candidates.forEach((candidate, idx) => {
    const backendWeight = Math.max(1, Number(candidate.backend.weight || 1));
    const healthFactor = Math.max(0.25, Number(candidate.healthScore || 100) / 100);
    const computedWeight = Math.max(1, Math.round(backendWeight * healthFactor * 4));
    const cappedWeight = Math.min(40, computedWeight);
    for (let i = 0; i < cappedWeight; i += 1) weighted.push(idx);
  });

  if (weighted.length === 0) return null;

  const idx = rrState.get(groupKey) || 0;
  const selectedWeightedIdx = weighted[idx % weighted.length];
  rrState.set(groupKey, idx + 1);
  return candidates[selectedWeightedIdx];
}

router.use(async (req, res, next) => {
  const incomingTraceId = req.headers["x-trace-id"] || req.headers["x-request-id"];
  req.traceId =
    typeof incomingTraceId === "string" && incomingTraceId.trim()
      ? incomingTraceId.trim()
      : `gk-${crypto.randomBytes(6).toString("hex")}`;

  req.traceparent =
    typeof req.headers.traceparent === "string" && req.headers.traceparent.trim()
      ? req.headers.traceparent.trim()
      : generateTraceparent();

  res.setHeader("X-Trace-Id", req.traceId);
  res.setHeader("Traceparent", req.traceparent);

  let routes;
  try {
    routes = await findMatchingRoutes(req.method, req.path);
  } catch (err) {
    return next(err);
  }

  if (routes.length === 0) {
    return res.status(404).json({
      error: "No gateway route matched this request",
      code: "ROUTE_NOT_FOUND",
      path: req.path,
      traceId: req.traceId,
    });
  }

  const activeRoutes = routes.filter((r) => r.backendId && r.backendId.isActive);
  if (activeRoutes.length === 0) {
    return res.status(503).json({
      error: "Gateway route has no active backend",
      code: "BACKEND_UNAVAILABLE",
      traceId: req.traceId,
    });
  }

  // Enrich route candidates with health + circuit state.
  const redis = getRedisClient();
  const candidates = await Promise.all(
    activeRoutes.map(async (route) => {
      const backend = route.backendId;
      const [healthScore, circuitState] = await Promise.all([
        readHealthScore(redis, backend.name),
        getState(backend.name),
      ]);
      return { route, backend, healthScore, circuitState };
    }),
  );

  const nonOpen = candidates.filter((c) => c.circuitState !== STATES.OPEN);
  if (nonOpen.length === 0) {
    return res.status(503).json({
      error: "All matching backends are currently unavailable",
      code: "BACKEND_POOL_UNAVAILABLE",
      traceId: req.traceId,
    });
  }

  // Prefer healthy candidates first, then degraded fallback.
  const healthyPool = nonOpen.filter((c) => c.healthScore >= 50);
  const selectionPool = healthyPool.length > 0 ? healthyPool : nonOpen;

  const routeGroupKey = `${req.method}:${selectionPool[0].route.path}:${selectionPool[0].route.priority ?? 0}`;

  // Pick candidate; enforce HALF_OPEN probe limits; retry with remaining candidates.
  let candidatePool = [...selectionPool];
  let selected = null;
  let effectiveCircuitState = STATES.CLOSED;

  while (candidatePool.length > 0 && !selected) {
    const picked = weightedRoundRobinPick(candidatePool, routeGroupKey);
    if (!picked) break;

    const probe = await allowRequest(picked.backend.name);
    if (probe.allowed) {
      selected = picked;
      effectiveCircuitState = probe.state;
      break;
    }

    candidatePool = candidatePool.filter((c) => c.backend.name !== picked.backend.name);
  }

  if (!selected) {
    return res.status(503).json({
      error: "Service temporarily unavailable (circuit open)",
      code: "CIRCUIT_OPEN",
      traceId: req.traceId,
    });
  }

  const { route, backend, healthScore } = selected;

  // Authentication
  if (route.requiresAuth) {
    const hasBearer = req.headers.authorization?.startsWith("Bearer ");
    const hasApiKey = !!req.headers[process.env.API_KEY_HEADER || "x-api-key"];
    const hasCookie = !!req.headers.cookie?.includes("better-auth.session_token");

    if (hasApiKey) {
      await new Promise((resolve, reject) =>
        requireApiKey(req, res, (err) => (err ? reject(err) : resolve())),
      );
      if (res.headersSent) return;
    } else if (hasBearer || hasCookie) {
      await new Promise((resolve, reject) =>
        requireJWT(req, res, (err) => (err ? reject(err) : resolve())),
      );
      if (res.headersSent) return;
    } else {
      return res.status(401).json({
        error: "Authentication required for this route",
        code: "AUTH_REQUIRED",
        traceId: req.traceId,
      });
    }
  } else {
    await new Promise((resolve) => optionalJWT(req, res, resolve));
  }

  req.targetBackend = backend;
  req.backendHealthScore = healthScore;
  req.backendCircuitState = effectiveCircuitState;

  // Adaptive/burst rate limiting
  await new Promise((resolve, reject) =>
    rateLimitMiddleware(route.rateLimit ?? null)(req, res, (err) =>
      err ? reject(err) : resolve(),
    ),
  );
  if (res.headersSent) return;

  const proxyHandler = createProxyMiddleware(backend, route);
  return proxyHandler(req, res);
});

module.exports = router;
