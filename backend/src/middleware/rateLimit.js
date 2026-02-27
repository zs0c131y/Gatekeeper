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

function getAdaptiveMultiplier(req) {
  const score = Number(req.backendHealthScore ?? 100);
  const circuitState = req.backendCircuitState || "CLOSED";

  let healthFactor;
  if (score >= 85) healthFactor = 1;
  else if (score >= 70) healthFactor = 0.9;
  else if (score >= 55) healthFactor = 0.75;
  else healthFactor = 0.55;

  const circuitFactor =
    circuitState === "HALF_OPEN" ? 0.8 : circuitState === "OPEN" ? 0.5 : 1;

  return clamp(healthFactor * circuitFactor, 0.4, 1);
}

function computeEffectiveLimit(baseLimit, cfg, req) {
  if (cfg.manualOverrideEnabled && cfg.manualOverrideRpm > 0) {
    return cfg.manualOverrideRpm;
  }

  if (!cfg.adaptiveEnabled) return baseLimit;

  const adaptiveMultiplier = getAdaptiveMultiplier(req);
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
  const effectiveLimit = computeEffectiveLimit(baseLimit, cfg, req);
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
};
