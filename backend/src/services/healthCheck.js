/**
 * Backend Health Check Service.
 */

const http = require("http");
const https = require("https");
const { URL } = require("url");

const Backend = require("../models/Backend");
const Config = require("../models/Config");
const redisKeys = require("../config/redisKeys");
const { getRedisClient } = require("../config/database");
const logger = require("../utils/logger");

let _timer = null;

// In-memory score fallback used when Redis is unavailable.
const _memScores = new Map();

function probeBackend(backend) {
  return new Promise((resolve) => {
    const targetUrl = new URL(backend.healthCheckPath || "/health", backend.baseUrl);
    const transport = targetUrl.protocol === "https:" ? https : http;
    const timeout = Math.min(backend.timeout ?? 5000, 10_000);

    const req = transport.request(
      {
        hostname: targetUrl.hostname,
        port: targetUrl.port || (targetUrl.protocol === "https:" ? 443 : 80),
        path: targetUrl.pathname + targetUrl.search,
        method: "GET",
        timeout,
        headers: { "User-Agent": "[REDACTED]-HealthCheck/1.0" },
      },
      (res) => {
        res.resume();
        const { statusCode } = res;
        if (statusCode >= 200 && statusCode < 300) return resolve(100);
        if (statusCode >= 300 && statusCode < 400) return resolve(80);
        if (statusCode >= 400 && statusCode < 500) return resolve(60);
        return resolve(0);
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

async function checkBackend(backend) {
  const redis = getRedisClient();

  try {
    const score = await probeBackend(backend);
    if (redis) {
      await redis.set(redisKeys.healthScore(backend.name), String(score));
      await redis.set(redisKeys.healthLastCheck(backend.name), new Date().toISOString());
    } else {
      _memScores.set(backend.name, score);
    }
    logger.debug(`[HealthCheck] ${backend.name}: score=${score}`);
  } catch (err) {
    logger.error(`[HealthCheck] ${backend.name} error`, { error: err.message });
  }
}

/** Returns the in-memory health score for a backend (Redis-free fallback). */
function getMemoryScore(name) {
  const v = _memScores.get(name);
  return v === undefined ? null : v;
}

async function runHealthChecks() {
  try {
    const backends = await Backend.find({ isActive: true }).lean();
    await Promise.allSettled(backends.map(checkBackend));
  } catch (err) {
    logger.error("[HealthCheck] Failed to fetch backends", { error: err.message });
  }
}

async function readIntervalMs() {
  try {
    const doc = await Config.findOne({
      key: "routing.health_check_interval_ms",
      isActive: true,
    }).lean();
    return Number(doc?.value || 30_000);
  } catch {
    return 30_000;
  }
}

async function startHealthCheckLoop() {
  if (_timer) return;

  async function schedule() {
    const intervalMs = Math.max(5_000, await readIntervalMs());
    _timer = setTimeout(async () => {
      await runHealthChecks();
      await schedule();
    }, intervalMs);
    if (typeof _timer.unref === "function") _timer.unref();
  }

  logger.info("[HealthCheck] Starting health check loop");
  await runHealthChecks();
  await schedule();
}

function stopHealthCheckLoop() {
  if (_timer) {
    clearTimeout(_timer);
    _timer = null;
    logger.info("[HealthCheck] Loop stopped");
  }
}

function scoreToStatus(score, thresholds = {}) {
  const n = score === null || score === undefined ? null : parseInt(score, 10);
  if (n === null || Number.isNaN(n)) return "unknown";
  const healthyAbove = thresholds.healthyAbove ?? 80;
  const degradedAbove = thresholds.degradedAbove ?? 50;
  if (n >= healthyAbove) return "healthy";
  if (n >= degradedAbove) return "degraded";
  return "unhealthy";
}

module.exports = {
  startHealthCheckLoop,
  stopHealthCheckLoop,
  runHealthChecks,
  scoreToStatus,
  getMemoryScore,
};
