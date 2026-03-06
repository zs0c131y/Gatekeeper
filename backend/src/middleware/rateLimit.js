/**
 * Redis-backed adaptive token-bucket rate limiter.
 *
 * Features:
 * - IP-based and API key-based identity.
 * - Per-route overrides.
 * - Burst handling via configurable burst multiplier.
 * - Adaptive throttling based on backend health/circuit state.
 * - Manual override support via Config.
 *
 * If Redis is unavailable, requests are allowed (fail-open).
 */

const redisKeys = require("../config/redisKeys");
const { getRedisClient } = require("../config/database");
const Config = require("../models/Config");
const logger = require("../utils/logger");
const { recordViolation } = require("../services/clientProfiler");

let _configCache = null;
let _cachedAt = 0;

async function getRateLimitConfig() {
  const now = Date.now();
  if (_configCache && now - _cachedAt < 30_000) return _configCache;

  const docs = await Config.find({
    key: {
      $in: [
        "rate_limiting.default_rpm",
        "rate_limiting.burst_multiplier",
        "rate_limiting.manual_override_enabled",
        "rate_limiting.manual_override_rpm",
        "general.adaptive_rate_limiting",
      ],
    },
    isActive: true,
  }).lean();

  const map = {};
  docs.forEach((d) => {
    map[d.key] = d.value;
  });

  _configCache = {
    defaultRpm: Number(map["rate_limiting.default_rpm"] ?? 100),
    burstMultiplier: Number(map["rate_limiting.burst_multiplier"] ?? 1.5),
    manualOverrideEnabled: Boolean(
      map["rate_limiting.manual_override_enabled"] ?? false,
    ),
    manualOverrideRpm: Number(map["rate_limiting.manual_override_rpm"] ?? 0),
    adaptiveEnabled: Boolean(map["general.adaptive_rate_limiting"] ?? true),
  };
  _cachedAt = now;
  return _configCache;
}

function invalidateRateLimitConfigCache() {
  _configCache = null;
  _cachedAt = 0;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Record traffic metrics in Redis for baseline calculations.
 * Stores per-endpoint latency and error data in 1-minute windows.
 */
async function recordTrafficMetrics(endpoint, latency, isError) {
  const redis = getRedisClient();
  if (!redis || !endpoint) return;

  try {
    const bucket = `adaptive:traffic:${endpoint}:${Math.floor(Date.now() / 60000)}`;
    await redis.hincrby(bucket, "count", 1);
    await redis.hincrby(bucket, "totalLatency", Math.round(latency || 0));
    if (isError) await redis.hincrby(bucket, "errors", 1);
    await redis.expire(bucket, 3600);
  } catch {
    // Non-critical, fail silently
  }
}

/**
 * Read recent traffic metrics from Redis for adaptive decisions.
 * Returns { avgLatency, errorRate, requestCount } over last 10 minutes.
 */
async function getTrafficBaseline(endpoint) {
  const redis = getRedisClient();
  if (!redis || !endpoint) return { avgLatency: 0, errorRate: 0, requestCount: 0 };

  try {
    const now = Math.floor(Date.now() / 60000);
    let totalCount = 0;
    let totalLatency = 0;
    let totalErrors = 0;

    const pipeline = redis.pipeline();
    for (let i = 1; i <= 10; i++) {
      pipeline.hgetall(`adaptive:traffic:${endpoint}:${now - i}`);
    }
    const results = await pipeline.exec();

    for (const [, val] of results) {
      if (val && val.count) {
        totalCount += Number(val.count) || 0;
        totalLatency += Number(val.totalLatency) || 0;
        totalErrors += Number(val.errors) || 0;
      }
    }

    return {
      avgLatency: totalCount > 0 ? totalLatency / totalCount : 0,
      errorRate: totalCount > 0 ? totalErrors / totalCount : 0,
      requestCount: totalCount,
    };
  } catch {
    return { avgLatency: 0, errorRate: 0, requestCount: 0 };
  }
}

function getAdaptiveMultiplier(req, baseRpm = 100) {
  const score = Number(req.backendHealthScore ?? 100);
  const circuitState = req.backendCircuitState || "CLOSED";

  let healthFactor;
  if (score >= 85) healthFactor = 1;
  else if (score >= 70) healthFactor = 0.9;
  else if (score >= 55) healthFactor = 0.75;
  else healthFactor = 0.55;

  const circuitFactor =
    circuitState === "HALF_OPEN" ? 0.8 : circuitState === "OPEN" ? 0.5 : 1;

  const baseline = req._trafficBaseline;
  let latencyFactor = 1;
  let errorFactor = 1;
  let trafficFactor = 1;

  if (baseline && baseline.requestCount >= 10) {
    // Reduce limits when latency is high (>50% above normal ~100ms threshold)
    if (baseline.avgLatency > 500) {
      latencyFactor = 0.5;
    } else if (baseline.avgLatency > 200) {
      latencyFactor = 0.75;
    }

    // Reduce limits when error rate exceeds thresholds
    if (baseline.errorRate > 0.1) {
      errorFactor = 0.5;
    } else if (baseline.errorRate > 0.05) {
      errorFactor = 0.75;
    }

    // Increase limits when traffic is well below capacity and healthy
    // If low traffic + low latency + low errors => allow more throughput
    const rpm = baseline.requestCount * 6; // extrapolate 10min window to rpm
    if (rpm < baseRpm * 0.3 && baseline.avgLatency < 50 && baseline.errorRate < 0.01) {
      trafficFactor = 1.3;
    } else if (rpm < baseRpm * 0.5 && baseline.avgLatency < 100 && baseline.errorRate < 0.03) {
      trafficFactor = 1.15;
    }
  }

  return clamp(healthFactor * circuitFactor * latencyFactor * errorFactor * trafficFactor, 0.3, 1.5);
}

async function computeEffectiveLimit(baseLimit, cfg, req) {
  if (cfg.manualOverrideEnabled && cfg.manualOverrideRpm > 0) {
    return cfg.manualOverrideRpm;
  }

  if (!cfg.adaptiveEnabled) return baseLimit;

  try {
    req._trafficBaseline = await getTrafficBaseline(req.path);
  } catch {
    req._trafficBaseline = null;
  }

  const adaptiveMultiplier = getAdaptiveMultiplier(req, baseLimit);
  return Math.max(1, Math.floor(baseLimit * adaptiveMultiplier));
}

/**
 * Token bucket check.
 *
 * @returns {Promise<{allowed:boolean, remaining:number, limit:number, retryAfter:number, reset:number}>}
 */
async function checkRateLimit(clientId, limitRpm = null, req = {}) {
  const redis = getRedisClient();
  if (!redis) {
    return {
      allowed: true,
      remaining: 9999,
      limit: 9999,
      retryAfter: 0,
      reset: 0,
    };
  }

  const cfg = await getRateLimitConfig();
  const baseLimit = Number(limitRpm ?? cfg.defaultRpm);
  const effectiveLimit = await computeEffectiveLimit(baseLimit, cfg, req);
  const burstMultiplier = clamp(cfg.burstMultiplier, 1, 10);

  const refillPerSec = effectiveLimit / 60;
  const capacity = Math.max(1, Math.floor(effectiveLimit * burstMultiplier));
  const bucketKey = redisKeys.rateLimitBucket(clientId);

  const now = Date.now();
  const rawBucket = await redis.get(bucketKey);

  let tokens = capacity;
  let lastRefill = now;

  if (rawBucket) {
    try {
      const parsed = JSON.parse(rawBucket);
      tokens = Number(parsed.tokens);
      lastRefill = Number(parsed.lastRefill);
      if (!Number.isFinite(tokens)) tokens = capacity;
      if (!Number.isFinite(lastRefill)) lastRefill = now;
    } catch {
      tokens = capacity;
      lastRefill = now;
    }
  }

  const elapsed = Math.max(0, (now - lastRefill) / 1000);
  tokens = Math.min(capacity, tokens + elapsed * refillPerSec);

  let allowed = false;
  let retryAfter = 0;

  if (tokens >= 1) {
    allowed = true;
    tokens -= 1;
  } else {
    allowed = false;
    retryAfter = Math.max(1, Math.ceil((1 - tokens) / refillPerSec));
  }

  const remaining = Math.max(0, Math.floor(tokens));

  const ttlSeconds = Math.max(120, Math.ceil(capacity / Math.max(refillPerSec, 0.1)));
  await redis.set(
    bucketKey,
    JSON.stringify({ tokens, lastRefill: now }),
    "EX",
    ttlSeconds,
  );

  // Lightweight per-minute counter for operational visibility
  const counterKey = redisKeys.rateLimitCounter(clientId);
  const count = await redis.incr(counterKey);
  if (count === 1) await redis.expire(counterKey, 60);

  return {
    allowed,
    remaining,
    limit: effectiveLimit,
    retryAfter,
    reset: Math.max(1, Math.ceil((capacity - tokens) / refillPerSec)),
  };
}

function rateLimitMiddleware(limitRpm = null) {
  return async (req, res, next) => {
    try {
      const clientId =
        req.apiKey?.clientId || req.ip || req.socket?.remoteAddress || "unknown";
      const perKeyLimit = req.apiKey?.rateLimit ?? limitRpm;

      const { allowed, remaining, limit, retryAfter, reset } = await checkRateLimit(
        clientId,
        perKeyLimit,
        req,
      );

      res.setHeader("X-RateLimit-Limit", String(limit));
      res.setHeader("X-RateLimit-Remaining", String(remaining));
      res.setHeader("X-RateLimit-Reset", String(reset));

      if (!allowed) {
        res.setHeader("Retry-After", String(retryAfter));
        recordViolation(clientId).catch(() => {});
        return res.status(429).json({
          error: "Rate limit exceeded",
          code: "RATE_LIMITED",
          retryAfter,
        });
      }

      next();
    } catch (err) {
      logger.error("[RateLimit] failed-open", { error: err.message });
      next();
    }
  };
}

module.exports = {
  checkRateLimit,
  rateLimitMiddleware,
  invalidateRateLimitConfigCache,
  recordTrafficMetrics,
};
