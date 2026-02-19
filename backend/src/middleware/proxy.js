/**
 * HTTP Reverse Proxy Middleware.
 *
 * Responsibilities:
 *   1. Path transformation (stripPrefix / addPrefix from Route document).
 *   2. Forward the request to the upstream backend using native http/https.
 *   3. Stream the upstream response back to the client.
 *   4. Record circuit-breaker success/failure.
 *   5. Write a Log document to MongoDB (async, non-blocking).
 *
 * NOTE: `express.json()` has already parsed `req.body` by the time this
 * middleware runs.  The body is re-serialised into a Buffer for forwarding.
 */

const http = require("http");
const https = require("https");
const { URL } = require("url");
const crypto = require("crypto");

const Log = require("../models/Log");
const { recordSuccess, recordFailure } = require("./circuitBreaker");

// ── Path transformation ────────────────────────────────────────────────────

/**
 * Apply route path rules to produce the upstream path.
 *
 * @param {string} incomingPath  — e.g. "/api/users/123"
 * @param {object} route         — Route document with optional stripPrefix / addPrefix
 * @returns {string}
 */
function transformPath(incomingPath, route) {
  let path = incomingPath;

  if (route.stripPrefix && path.startsWith(route.stripPrefix)) {
    path = path.slice(route.stripPrefix.length) || "/";
  }

  if (route.addPrefix) {
    path = route.addPrefix + path;
  }

  return path || "/";
}

// ── Raw body buffer ────────────────────────────────────────────────────────

/**
 * Re-serialise the already-parsed `req.body` into a Buffer suitable for
 * forwarding.  Returns `null` for GET/HEAD/OPTIONS requests or empty bodies.
 *
 * @param {import('express').Request} req
 * @returns {Buffer|null}
 */
function getBodyBuffer(req) {
  const noBodyMethods = new Set(["GET", "HEAD", "OPTIONS", "DELETE"]);
  if (noBodyMethods.has(req.method?.toUpperCase())) return null;
  if (!req.body || Object.keys(req.body).length === 0) return null;
  return Buffer.from(JSON.stringify(req.body), "utf8");
}

// ── Core proxy function ────────────────────────────────────────────────────

/**
 * Forward the current request to `backend` at `upstreamPath`.
 *
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 * @param {object} backend  — Mongoose Backend doc (plain object)
 * @param {string} upstreamPath — transformed path including any query string
 * @returns {Promise<{ statusCode: number, durationMs: number }>}
 */
function forwardRequest(req, res, backend, upstreamPath) {
  return new Promise((resolve, reject) => {
    const target = new URL(backend.baseUrl);
    const isHttps = target.protocol === "https:";
    const transport = isHttps ? https : http;
    const timeout = backend.timeout ?? 5000;

    // Carry the original query string
    const qs = req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
    const fullPath = upstreamPath + qs;

    // Re-serialised body (may be null)
    const bodyBuf = getBodyBuffer(req);

    // Hop-by-hop headers to strip
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

    forwardHeaders["host"] = target.host;
    forwardHeaders["x-forwarded-for"] =
      req.ip || req.socket?.remoteAddress || "";
    forwardHeaders["x-forwarded-proto"] = req.protocol || "http";
    forwardHeaders["x-forwarded-host"] = req.hostname || "";
    forwardHeaders["x-request-id"] =
      req.traceId || crypto.randomBytes(8).toString("hex");

    if (bodyBuf) {
      forwardHeaders["content-type"] = "application/json";
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

        // Copy status + headers (strip hop-by-hop)
        res.status(proxyRes.statusCode);
        for (const [k, v] of Object.entries(proxyRes.headers)) {
          if (!HOP_BY_HOP.has(k.toLowerCase())) {
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

    if (bodyBuf) {
      proxyReq.write(bodyBuf);
    }
    proxyReq.end();
  });
}

// ── Log writer ─────────────────────────────────────────────────────────────

/**
 * Persist a Log document.  Called fire-and-forget — errors are swallowed so
 * logging failures never affect the in-flight request.
 */
function writeLog(fields) {
  Log.create(fields).catch((err) => {
    console.error("[Proxy] Log write failed:", err.message);
  });
}

// ── Middleware factory ─────────────────────────────────────────────────────

/**
 * Build an Express middleware that proxies the current request to `backend`
 * according to the routing `route` document.
 *
 * @param {object} backend — Backend Mongoose document (toObject or lean)
 * @param {object} route   — Route Mongoose document (toObject or lean)
 */
function createProxyMiddleware(backend, route) {
  return async (req, res) => {
    const start = Date.now();
    const traceId =
      req.traceId || "gk-" + crypto.randomBytes(6).toString("hex");
    const upstreamPath = transformPath(req.path, route);

    // Attach traceId to request so other middleware can read it
    req.traceId = traceId;
    res.setHeader("X-Trace-Id", traceId);

    let statusCode = 502;
    let errorMessage;

    try {
      const result = await forwardRequest(req, res, backend, upstreamPath);
      statusCode = result.statusCode;

      const isFailure = statusCode >= 500;
      if (isFailure) {
        await recordFailure(backend.name);
      } else {
        await recordSuccess(backend.name);
      }
    } catch (err) {
      errorMessage = err.message;
      await recordFailure(backend.name);

      if (!res.headersSent) {
        res.status(502).json({
          error: "Bad gateway — upstream unreachable",
          code: "UPSTREAM_ERROR",
          message: err.message,
          traceId,
        });
      }
    } finally {
      const latency = Date.now() - start;

      writeLog({
        traceId,
        timestamp: new Date(),
        method: req.method,
        endpoint: req.path,
        status: statusCode,
        latency,
        gatewayOverhead: Math.min(latency, 15), // overhead estimation
        clientIp: req.ip || "0.0.0.0",
        backendId: backend._id ?? undefined,
        apiKeyId: req.apiKey?._id ?? undefined,
        userId: req.user?.userId ?? undefined,
        errorMessage,
        requestSize: req.headers["content-length"]
          ? parseInt(req.headers["content-length"], 10)
          : undefined,
      });
    }
  };
}

module.exports = { createProxyMiddleware, transformPath };
