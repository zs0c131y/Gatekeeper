/**
 * Backend Health Check Service.
 *
 * Periodically pings each active Backend's `healthCheckPath` and writes the
 * result to Redis:
 *   health:score:{name}     — 0-100 integer
 *   health:lastcheck:{name} — ISO timestamp
 *
 * Health score calculation:
 *   - 200-299 response within `timeout` ms → 100
 *   - 3xx redirect                         → 80
 *   - 4xx client error (backend is up)     → 60
 *   - Timeout or 5xx                       → 0
 *
 * The interval is driven by `routing.health_check_interval_ms` in Config
 * (default 30 000 ms).  The loop is started once at server boot and can be
 * cleanly stopped via `stopHealthCheckLoop()`.
 */

const http = require("http");
const https = require("https");
const { URL } = require("url");

const Backend = require("../models/Backend");
const Config = require("../models/Config");
const redisKeys = require("../config/redisKeys");
const { getRedisClient } = require("../config/database");

let _intervalId = null;

// ── Single backend check ───────────────────────────────────────────────────

/**
 * Probe one backend and return a score 0-100.
 *
 * @param {object} backend — Mongoose Backend document (plain object ok).
 * @returns {Promise<number>}
 */
function probeBackend(backend) {
  return new Promise((resolve) => {
    const targetUrl = new URL(
      backend.healthCheckPath || "/health",
      backend.baseUrl,
    );

    const transport = targetUrl.protocol === "https:" ? https : http;
    const timeout = Math.min(backend.timeout ?? 5000, 10_000);

    const req = transport.request(
      {
        hostname: targetUrl.hostname,
        port: targetUrl.port || (targetUrl.protocol === "https:" ? 443 : 80),
        path: targetUrl.pathname + targetUrl.search,
        method: "GET",
        timeout,
        headers: { "User-Agent": "Gatekeeper-HealthCheck/1.0" },
      },
      (res) => {
        // Drain the response body so the connection closes properly
        res.resume();

        const { statusCode } = res;
        let score;
        if (statusCode >= 200 && statusCode < 300) score = 100;
        else if (statusCode >= 300 && statusCode < 400) score = 80;
        else if (statusCode >= 400 && statusCode < 500) score = 60;
        else score = 0;

        resolve(score);
      },
    );

    req.on("timeout", () => {
      req.destroy();
      resolve(0);
    });
    req.on("error", () => resolve(0));
    req.end();
  });
}

/**
 * Run a health check for a single backend and persist the result to Redis.
 *
 * @param {object} backend
 */
async function checkBackend(backend) {
  const redis = getRedisClient();
  if (!redis) return;

  try {
    const score = await probeBackend(backend);
    await redis.set(redisKeys.healthScore(backend.name), String(score));
    await redis.set(
      redisKeys.healthLastCheck(backend.name),
      new Date().toISOString(),
    );

    console.log(`[HealthCheck] ${backend.name}: score=${score}`);
  } catch (err) {
    console.error(`[HealthCheck] ${backend.name} error:`, err.message);
  }
}

// ── Loop ───────────────────────────────────────────────────────────────────

/**
 * Check all active backends once.
 */
async function runHealthChecks() {
  try {
    const backends = await Backend.find({ isActive: true }).lean();
    await Promise.allSettled(backends.map(checkBackend));
  } catch (err) {
    console.error("[HealthCheck] Failed to fetch backends:", err.message);
  }
}

/**
 * Start the recurring health check loop.
 * Safe to call multiple times — will not create duplicate intervals.
 */
async function startHealthCheckLoop() {
  if (_intervalId) return;

  // Read interval from Config, fall back to 30 s
  let intervalMs = 30_000;
  try {
    const doc = await Config.findOne({
      key: "routing.health_check_interval_ms",
      isActive: true,
    }).lean();
    if (doc?.value) intervalMs = Number(doc.value);
  } catch {
    // Config unavailable — use default
  }

  console.log(
    `[HealthCheck] Starting health check loop (interval=${intervalMs}ms)`,
  );
  await runHealthChecks(); // Run immediately on startup
  _intervalId = setInterval(runHealthChecks, intervalMs);
}

/**
 * Stop the health check loop.
 */
function stopHealthCheckLoop() {
  if (_intervalId) {
    clearInterval(_intervalId);
    _intervalId = null;
    console.log("[HealthCheck] Loop stopped");
  }
}

/**
 * Convenience: convert a Redis health score to a human-readable status string.
 *
 * @param {number|string|null} score
 * @returns {'healthy'|'degraded'|'unhealthy'|'unknown'}
 */
function scoreToStatus(score) {
  const n = score === null || score === undefined ? null : parseInt(score, 10);
  if (n === null || isNaN(n)) return "unknown";
  if (n >= 80) return "healthy";
  if (n >= 50) return "degraded";
  return "unhealthy";
}

module.exports = {
  startHealthCheckLoop,
  stopHealthCheckLoop,
  runHealthChecks,
  scoreToStatus,
};
