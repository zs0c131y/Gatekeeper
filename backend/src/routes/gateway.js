/**
 * Gateway catch-all router.
 *
 * Every request that reaches this router is treated as a client request
 * to be proxied to a registered backend service.
 *
 * Middleware chain per request:
 *   1. Lookup matching Route from MongoDB (sorted by priority desc).
 *   2. If requiresAuth → enforce JWT or API key.
 *   3. Check circuit breaker state for the target backend.
 *   4. Apply per-route / per-client rate limit.
 *   5. Forward the request (proxy.js).
 */

const { Router } = require("express");
const crypto = require("crypto");

const Route = require("../models/Route");
const Backend = require("../models/Backend");
const {
  optionalJWT,
  requireJWT,
  requireApiKey,
} = require("../middleware/auth");
const { getState, STATES } = require("../middleware/circuitBreaker");
const { rateLimitMiddleware } = require("../middleware/rateLimit");
const { createProxyMiddleware } = require("../middleware/proxy");

const router = Router();

// ── Route matching ─────────────────────────────────────────────────────────

/**
 * Find the highest-priority active Route that matches `method` and `path`.
 *
 * Route.path patterns use '*' as a wildcard (converted to '.*' regexp).
 *
 * @param {string} method  — HTTP method uppercase
 * @param {string} path    — URL path (no query string)
 * @returns {Promise<object|null>} populated Route doc or null
 */
async function findMatchingRoute(method, path) {
  // Fetch all active routes, sorted by priority descending
  const routes = await Route.find({ isActive: true })
    .sort({ priority: -1 })
    .populate("backendId")
    .lean();

  for (const route of routes) {
    // Method check — '*' matches anything
    if (route.method !== "*" && route.method !== method) continue;

    // Path pattern: '*' → '.*', escape dots outside wildcards
    const escaped = route.path
      .replace(/[.+?^${}()|[\]\\]/g, "\\$&") // escape regex special chars
      .replace(/\\\*/g, ".*"); // un-escape our wildcard

    const re = new RegExp(`^${escaped}(/.*)?$`);
    if (re.test(path)) return route;
  }

  return null;
}

// ── Gateway handler ────────────────────────────────────────────────────────

router.use(async (req, res, next) => {
  // Attach a trace ID early so error responses include it
  req.traceId = "gk-" + crypto.randomBytes(6).toString("hex");
  res.setHeader("X-Trace-Id", req.traceId);

  // ── 1. Route lookup ──────────────────────────────────────────────────────
  let route;
  try {
    route = await findMatchingRoute(req.method, req.path);
  } catch (err) {
    return next(err); // DB error → global error handler
  }

  if (!route) {
    return res.status(404).json({
      error: "No gateway route matched this request",
      code: "ROUTE_NOT_FOUND",
      path: req.path,
      traceId: req.traceId,
    });
  }

  const backend = route.backendId; // populated

  if (!backend || !backend.isActive) {
    return res.status(503).json({
      error: "Gateway route has no active backend",
      code: "BACKEND_UNAVAILABLE",
      traceId: req.traceId,
    });
  }

  // ── 2. Authentication ────────────────────────────────────────────────────
  if (route.requiresAuth) {
    const hasBearer = req.headers.authorization?.startsWith("Bearer ");
    const hasApiKey = !!req.headers[process.env.API_KEY_HEADER || "x-api-key"];

    if (hasApiKey) {
      await new Promise((resolve, reject) =>
        requireApiKey(req, res, (err) => (err ? reject(err) : resolve())),
      );
      if (res.headersSent) return;
    } else if (hasBearer) {
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
    // Optionally decode JWT if present (attaches req.user without blocking)
    await new Promise((resolve) => optionalJWT(req, res, resolve));
  }

  // ── 3. Circuit breaker ───────────────────────────────────────────────────
  const circuitState = await getState(backend.name);
  if (circuitState === STATES.OPEN) {
    return res.status(503).json({
      error: "Service temporarily unavailable (circuit open)",
      code: "CIRCUIT_OPEN",
      backend: backend.name,
      traceId: req.traceId,
    });
  }

  // ── 4. Rate limiting ─────────────────────────────────────────────────────
  await new Promise((resolve, reject) =>
    rateLimitMiddleware(route.rateLimit ?? null)(req, res, (err) =>
      err ? reject(err) : resolve(),
    ),
  );
  if (res.headersSent) return;

  // ── 5. Proxy ─────────────────────────────────────────────────────────────
  const proxyHandler = createProxyMiddleware(backend, route);
  return proxyHandler(req, res);
});

module.exports = router;
