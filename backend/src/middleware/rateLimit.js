/**
 * Redis-backed sliding-window (fixed-window per minute) rate limiter.
 *
 * Key: `rl:counter:{clientId}`
 * Window: 60 seconds (reset via Redis EXPIRE set on first increment).
 *
 * If Redis is unavailable all requests are allowed (fail-open).
 */

const redisKeys = require("../config/redisKeys");
const { getRedisClient } = require("../config/database");
const Config = require("../models/Config");

let _defaultRpm = null;
let _defaultRpmFetchedAt = 0;

async function getDefaultRpm() {
  const now = Date.now();
  if (_defaultRpm !== null && now - _defaultRpmFetchedAt < 60_000)
    return _defaultRpm;

  const doc = await Config.findOne({
    key: "rate_limiting.default_rpm",
    isActive: true,
  }).lean();
  _defaultRpm = doc?.value ?? 100;
  _defaultRpmFetchedAt = now;
  return _defaultRpm;
}

/**
 * Check whether `clientId` is within its rate limit.
 *
 * @param {string} clientId       — IP address or API key clientId.
 * @param {number|null} limitRpm  — custom limit; falls back to default_rpm config.
 * @returns {Promise<{ allowed: boolean, remaining: number, limit: number }>}
 */
async function checkRateLimit(clientId, limitRpm = null) {
  const redis = getRedisClient();
  if (!redis) return { allowed: true, remaining: 9999, limit: 9999 };

  const limit = limitRpm ?? (await getDefaultRpm());
  const key = redisKeys.rateLimitCounter(clientId);

  const count = await redis.incr(key);
  if (count === 1) {
    // First request in this window — set 60-second expiry
    await redis.expire(key, 60);
  }

  const remaining = Math.max(0, limit - count);
  return { allowed: count <= limit, remaining, limit };
}

/**
 * Express middleware that applies per-client rate limiting.
 * Uses `req.apiKey.clientId` when present, otherwise the remote IP.
 * A per-route override can be passed as `limitRpm`.
 *
 * @param {number|null} limitRpm  — route-level override (null = use default).
 */
function rateLimitMiddleware(limitRpm = null) {
  return async (req, res, next) => {
    const clientId =
      req.apiKey?.clientId || req.ip || req.socket?.remoteAddress || "unknown";
    const perKeyLimit = req.apiKey?.rateLimit ?? limitRpm;

    const { allowed, remaining, limit } = await checkRateLimit(
      clientId,
      perKeyLimit,
    );

    res.setHeader("X-RateLimit-Limit", String(limit));
    res.setHeader("X-RateLimit-Remaining", String(remaining));

    if (!allowed) {
      return res.status(429).json({
        error: "Rate limit exceeded",
        code: "RATE_LIMITED",
        retryAfter: 60,
      });
    }

    next();
  };
}

module.exports = { checkRateLimit, rateLimitMiddleware };
