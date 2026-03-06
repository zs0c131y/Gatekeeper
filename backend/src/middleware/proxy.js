/**
 * HTTP Reverse Proxy Middleware.
 *
 * Responsibilities:
 *   1. Path transformation (stripPrefix / addPrefix from Route document).
 *   2. Forward request to upstream backend.
 *   3. Stream upstream response back to client.
 *   4. Record circuit breaker success/failure.
 *   5. Queue structured logs for async persistence.
 */

const http = require("http");
const https = require("https");
const { URL } = require("url");
const crypto = require("crypto");

const Config = require("../models/Config");
const Route = require("../models/Route");
const redisKeys = require("../config/redisKeys");
const { getRedisClient } = require("../config/database");
const { recordSuccess, recordFailure } = require("./circuitBreaker");
const { enqueueLog } = require("../services/logQueue");
const logger = require("../utils/logger");
const { recordRequest, emitError, emitLog } = require("../services/websocket");
const { recordClientRequest } = require("../services/clientProfiler");
const { createAlert } = require("../services/alertService");
const { recordTrafficMetrics } = require("./rateLimit");

let _customHeadersCache = null;
let _customHeadersCachedAt = 0;

function invalidateProxyConfigCache() {
  _customHeadersCache = null;
  _customHeadersCachedAt = 0;
}

function transformPath(incomingPath, route) {
  let path = incomingPath;

  logger.debug("[proxy] transformPath", {
    incomingPath,
    stripPrefix: route.stripPrefix,
    addPrefix: route.addPrefix,
  });

  if (route.stripPrefix && path.startsWith(route.stripPrefix)) {
    path = path.slice(route.stripPrefix.length) || "/";
  }

  if (route.addPrefix) {
    path = route.addPrefix + path;
  }

  logger.debug("[proxy] transformPath result", { path });
  return path || "/";
}

function getBodyBuffer(req) {
  const noBodyMethods = new Set(["GET", "HEAD", "OPTIONS"]);
  if (noBodyMethods.has(req.method?.toUpperCase())) return null;

  if (Buffer.isBuffer(req.rawBody) && req.rawBody.length > 0) {
    return req.rawBody;
  }

  if (Buffer.isBuffer(req.body) && req.body.length > 0) {
    return req.body;
  }

  if (typeof req.body === "string" && req.body.length > 0) {
    return Buffer.from(req.body, "utf8");
  }

  if (
    req.body &&
    typeof req.body === "object" &&
    Object.keys(req.body).length > 0
  ) {
    return Buffer.from(JSON.stringify(req.body), "utf8");
  }

  return null;
}

async function getGlobalCustomHeaders() {
  const now = Date.now();
  if (_customHeadersCache && now - _customHeadersCachedAt < 30_000) {
    return _customHeadersCache;
  }

  try {
    const doc = await Config.findOne({
      key: "routing.custom_headers",
      isActive: true,
    }).lean();

    const value = doc?.value;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      _customHeadersCache = value;
    } else {
      _customHeadersCache = {};
    }
  } catch {
    _customHeadersCache = {};
  }

  _customHeadersCachedAt = now;
  return _customHeadersCache;
}

let _ddosThresholdCache = null;
let _ddosThresholdCachedAt = 0;

async function getDdosThreshold() {
  const now = Date.now();
  if (_ddosThresholdCache !== null && now - _ddosThresholdCachedAt < 30_000) {
    return _ddosThresholdCache;
  }
  try {
    const doc = await Config.findOne({
      key: "routing.ddos_threshold_rpm",
      isActive: true,
    }).lean();
    _ddosThresholdCache = Number(doc?.value ?? 500);
  } catch {
    _ddosThresholdCache = 500;
  }
  _ddosThresholdCachedAt = now;
  return _ddosThresholdCache;
}

async function checkDdos(routePath) {
  const redis = getRedisClient();
  if (!redis) return; // graceful degradation

  try {
    const key = redisKeys.ddosCounter(routePath);
    const count = await redis.incr(key);
    if (count === 1) {
      // First request in window — set 60s TTL
      await redis.expire(key, 60);
    }

    const threshold = await getDdosThreshold();
    if (count > threshold) {
      // Auto-disable the route. findOneAndUpdate is idempotent (only disables once).
      const updated = await Route.findOneAndUpdate(
        { path: routePath, isActive: true },
        { isActive: false },
        { returnDocument: "after" },
      );

      if (updated) {
        createAlert("ddos", `Route ${routePath} auto-disabled: ${count} req/min exceeded threshold ${threshold}`, {
          source: "ddos_protection",
          metadata: { routePath, count, threshold },
        }).catch(() => {});
        logger.warn("[DDoS] Auto-disabled route", {
          routePath,
          count,
          threshold,
        });
      }
    }
  } catch (err) {
    logger.error("[DDoS] check error", { error: err.message });
  }
}

function buildInjectedHeaders(route, globalHeaders) {
  const routeHeaders =
    route.injectHeaders && typeof route.injectHeaders === "object"
      ? route.injectHeaders
      : {};

  return {
    ...globalHeaders,
    ...routeHeaders,
  };
}

async function forwardRequest(req, res, backend, upstreamPath, route) {
  return new Promise(async (resolve, reject) => {
    try {
      const target = new URL(backend.baseUrl);
      const isHttps = target.protocol === "https:";
      const transport = isHttps ? https : http;
      const timeout = backend.timeout ?? 5000;

      const qs = req.url.includes("?")
        ? req.url.slice(req.url.indexOf("?"))
        : "";
      const fullPath = upstreamPath + qs;

      const bodyBuf = getBodyBuffer(req);

      const HOP_BY_HOP = new Set([
        "connection",
        "keep-alive",
        "proxy-authenticate",
        "proxy-authorization",
        "te",
        "trailer",
        "transfer-encoding",
        "upgrade",
      ]);

      const forwardHeaders = {};
      for (const [k, v] of Object.entries(req.headers)) {
        if (!HOP_BY_HOP.has(k.toLowerCase())) {
          forwardHeaders[k] = v;
        }
      }

      const globalCustomHeaders = await getGlobalCustomHeaders();
      const mergedInjected = buildInjectedHeaders(route, globalCustomHeaders);
      for (const [k, v] of Object.entries(mergedInjected)) {
        if (v !== undefined && v !== null) {
          forwardHeaders[k.toLowerCase()] = String(v);
        }
      }

      forwardHeaders.host = target.host;
      forwardHeaders["x-forwarded-for"] =
        req.ip || req.socket?.remoteAddress || "";
      forwardHeaders["x-forwarded-proto"] = req.protocol || "http";
      forwardHeaders["x-forwarded-host"] = req.hostname || "";

      if (route.stripPrefix) {
        forwardHeaders["x-forwarded-prefix"] = route.stripPrefix;
      }
      forwardHeaders["x-gateway-id"] = process.env.GATEWAY_ID || "gateway-1";
      forwardHeaders["x-request-id"] =
        req.traceId || crypto.randomBytes(8).toString("hex");
      forwardHeaders["x-trace-id"] = req.traceId;
      forwardHeaders.traceparent = req.traceparent;

      if (bodyBuf) {
        if (!forwardHeaders["content-type"]) {
          forwardHeaders["content-type"] = "application/json";
        }
        forwardHeaders["content-length"] = String(bodyBuf.length);
      } else {
        delete forwardHeaders["content-length"];
      }

      const start = Date.now();

      const proxyReq = transport.request(
        {
          hostname: target.hostname,
          port: target.port || (isHttps ? 443 : 80),
          path: fullPath,
          method: req.method,
          headers: forwardHeaders,
          timeout,
        },
        (proxyRes) => {
          const durationMs = Date.now() - start;

          res.status(proxyRes.statusCode);
          for (const [k, v] of Object.entries(proxyRes.headers)) {
            if (!HOP_BY_HOP.has(k.toLowerCase())) {
              // Rewrite Location headers on redirects to include the prefix
              if (
                k.toLowerCase() === "location" &&
                route.stripPrefix &&
                proxyRes.statusCode >= 300 &&
                proxyRes.statusCode < 400
              ) {
                const loc = String(v);
                // Only rewrite relative paths that don't already have the prefix
                if (loc.startsWith("/") && !loc.startsWith(route.stripPrefix)) {
                  res.setHeader(k, route.stripPrefix + loc);
                  continue;
                }
              }
              res.setHeader(k, v);
            }
          }

          proxyRes.pipe(res);
          proxyRes.on("end", () =>
            resolve({ statusCode: proxyRes.statusCode, durationMs }),
          );
        },
      );

      proxyReq.on("timeout", () => {
        proxyReq.destroy();
        reject(
          Object.assign(new Error("Upstream request timed out"), {
            code: "UPSTREAM_TIMEOUT",
          }),
        );
      });

      proxyReq.on("error", (err) => reject(err));

      if (bodyBuf) proxyReq.write(bodyBuf);
      proxyReq.end();
    } catch (err) {
      reject(err);
    }
  });
}

function writeLog(fields) {
  enqueueLog(fields);
}

function createProxyMiddleware(backend, route) {
  return async (req, res) => {
    const start = Date.now();
    const traceId =
      req.traceId || `gk-${crypto.randomBytes(6).toString("hex")}`;
    const upstreamPath = transformPath(req.path, route);

    req.traceId = traceId;
    res.setHeader("X-Gateway-Id", process.env.GATEWAY_ID || "gateway-1");
    res.setHeader("X-Trace-Id", traceId);
    res.setHeader("X-Request-Id", traceId);
    if (req.traceparent) res.setHeader("Traceparent", req.traceparent);

    let statusCode = 502;
    let errorMessage;
    let errorStack;

    try {
      const result = await forwardRequest(
        req,
        res,
        backend,
        upstreamPath,
        route,
      );
      statusCode = result.statusCode;

      if (statusCode >= 500) await recordFailure(backend.name);
      else await recordSuccess(backend.name);
    } catch (err) {
      errorMessage = err.message;
      errorStack = err.stack;
      await recordFailure(backend.name);

      if (!res.headersSent) {
        res.status(502).json({
          error: "Bad gateway - upstream unreachable",
          code: "UPSTREAM_ERROR",
          message: err.message,
          traceId,
        });
      }
    } finally {
      const latency = Date.now() - start;
      const isError = statusCode >= 400;

      const logEntry = {
        traceId,
        timestamp: new Date(),
        method: req.method,
        endpoint: req.path,
        status: statusCode,
        latency,
        gatewayOverhead: Math.min(latency, 15),
        clientIp: req.ip || "0.0.0.0",
        backendId: backend._id ?? undefined,
        apiKeyId: req.apiKey?._id ?? undefined,
        userId: req.user?.userId ?? undefined,
        errorMessage,
        errorStack,
        source: "gateway",
        requestSize: req.headers["content-length"]
          ? parseInt(req.headers["content-length"], 10)
          : undefined,
      };

      writeLog(logEntry);

      // Emit to WebSocket clients
      recordRequest(latency, isError);
      emitLog(logEntry);

      if (isError && statusCode >= 500) {
        emitError({
          traceId,
          endpoint: req.path,
          status: statusCode,
          message: errorMessage,
          backend: backend.name,
          timestamp: new Date().toISOString(),
        });
      }

      // Client behavior profiling
      const clientId =
        req.apiKey?.clientId || req.ip || req.socket?.remoteAddress || "unknown";
      recordClientRequest(clientId, req.apiKey ? "apikey" : "ip", {
        latency,
      }).catch(() => {});

      // Record traffic metrics for adaptive rate limiting
      recordTrafficMetrics(req.path, latency, isError).catch(() => {});

      // Fire-and-forget DDoS check
      checkDdos(req.path).catch(() => {});
    }
  };
}

function invalidateDdosThresholdCache() {
  _ddosThresholdCache = null;
  _ddosThresholdCachedAt = 0;
}

module.exports = {
  createProxyMiddleware,
  transformPath,
  getGlobalCustomHeaders,
  invalidateProxyConfigCache,
  invalidateDdosThresholdCache,
};
