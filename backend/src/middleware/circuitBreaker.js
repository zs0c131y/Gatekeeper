/**
 * Circuit Breaker state machine.
 *
 * States:
 *   CLOSED    - normal operation; requests flow through.
 *   OPEN      - backend deemed unhealthy; requests are blocked immediately.
 *   HALF_OPEN - cooldown elapsed; a limited set of test requests are allowed
 *               to probe the backend before transitioning to CLOSED or OPEN.
 *
 * All state is stored in Redis so all gateway instances share the same view.
 * If Redis is unavailable the circuit defaults to CLOSED (fail-open).
 */

const redisKeys = require("../config/redisKeys");
const { getRedisClient } = require("../config/database");
const Config = require("../models/Config");

const STATES = Object.freeze({
  CLOSED: "CLOSED",
  OPEN: "OPEN",
  HALF_OPEN: "HALF_OPEN",
});

// Cached config values (reloaded once per minute)
let _configCache = null;
let _configCachedAt = 0;

async function getConfig() {
  const now = Date.now();
  if (_configCache && now - _configCachedAt < 60_000) return _configCache;

  const docs = await Config.find({
    key: {
      $in: [
        "circuit_breaker.failure_threshold",
        "circuit_breaker.recovery_timeout_ms",
        "circuit_breaker.half_open_max_calls",
      ],
    },
    isActive: true,
  }).lean();

  const map = {};
  docs.forEach((d) => {
    map[d.key] = d.value;
  });

  _configCache = {
    failureThreshold: Number(map["circuit_breaker.failure_threshold"] ?? 5),
    recoveryTimeoutMs: Number(
      map["circuit_breaker.recovery_timeout_ms"] ?? 30_000,
    ),
    halfOpenMaxCalls: Number(map["circuit_breaker.half_open_max_calls"] ?? 3),
  };
  _configCachedAt = now;
  return _configCache;
}

function invalidateCircuitBreakerConfigCache() {
  _configCache = null;
  _configCachedAt = 0;
}

/**
 * Returns the current effective state of the circuit for `backendName`.
 * Automatically transitions OPEN -> HALF_OPEN when the recovery timeout elapses.
 */
async function getState(backendName) {
  const redis = getRedisClient();
  if (!redis) return STATES.CLOSED;

  const raw = await redis.get(redisKeys.circuitState(backendName));
  const state = raw || STATES.CLOSED;

  if (state === STATES.OPEN) {
    const { recoveryTimeoutMs } = await getConfig();
    const lastFail = await redis.get(redisKeys.circuitLastFailure(backendName));
    if (lastFail && Date.now() - parseInt(lastFail, 10) >= recoveryTimeoutMs) {
      await redis.set(redisKeys.circuitState(backendName), STATES.HALF_OPEN);
      await redis.del(redisKeys.circuitHalfOpenCalls(backendName));
      return STATES.HALF_OPEN;
    }
  }

  return state;
}

/**
 * Determines whether the current request can pass the breaker.
 * Enforces HALF_OPEN probe limits.
 */
async function allowRequest(backendName) {
  const state = await getState(backendName);
  if (state === STATES.OPEN) return { state, allowed: false };
  if (state !== STATES.HALF_OPEN) return { state, allowed: true };

  const redis = getRedisClient();
  if (!redis) return { state, allowed: true };

  const { halfOpenMaxCalls } = await getConfig();
  const key = redisKeys.circuitHalfOpenCalls(backendName);
  const calls = await redis.incr(key);
  if (calls === 1) await redis.expire(key, 60);

  return { state, allowed: calls <= halfOpenMaxCalls };
}

/**
 * Record a successful upstream response.
 * HALF_OPEN/OPEN -> CLOSED + reset counters.
 */
async function recordSuccess(backendName) {
  const redis = getRedisClient();
  if (!redis) return;

  const state = await redis.get(redisKeys.circuitState(backendName));
  if (state === STATES.HALF_OPEN || state === STATES.OPEN) {
    await redis.set(redisKeys.circuitState(backendName), STATES.CLOSED);
    await redis.del(redisKeys.circuitFailureCount(backendName));
    await redis.del(redisKeys.circuitLastFailure(backendName));
    await redis.del(redisKeys.circuitHalfOpenCalls(backendName));
    console.log(`[CircuitBreaker] ${backendName} -> CLOSED`);
  }
}

/**
 * Record a failed upstream response/timeout.
 */
async function recordFailure(backendName) {
  const redis = getRedisClient();
  if (!redis) return;

  const { failureThreshold } = await getConfig();
  const failures = await redis.incr(redisKeys.circuitFailureCount(backendName));
  await redis.set(redisKeys.circuitLastFailure(backendName), String(Date.now()));

  const currentState =
    (await redis.get(redisKeys.circuitState(backendName))) || STATES.CLOSED;

  if (failures >= failureThreshold && currentState !== STATES.OPEN) {
    await redis.set(redisKeys.circuitState(backendName), STATES.OPEN);
    await redis.del(redisKeys.circuitHalfOpenCalls(backendName));
    console.warn(`[CircuitBreaker] ${backendName} -> OPEN (failures=${failures})`);
  } else if (currentState === STATES.HALF_OPEN) {
    await redis.set(redisKeys.circuitState(backendName), STATES.OPEN);
    await redis.set(redisKeys.circuitLastFailure(backendName), String(Date.now()));
    await redis.del(redisKeys.circuitHalfOpenCalls(backendName));
    console.warn(`[CircuitBreaker] ${backendName} -> OPEN (probe failed)`);
  }
}

/**
 * Express middleware factory that rejects requests when the circuit is OPEN.
 */
function circuitBreakerGuard(backendName) {
  return async (_req, res, next) => {
    const { state, allowed } = await allowRequest(backendName);
    if (!allowed) {
      return res.status(503).json({
        error: "Service temporarily unavailable (circuit open)",
        code: "CIRCUIT_OPEN",
        backend: backendName,
        state,
      });
    }
    next();
  };
}

module.exports = {
  STATES,
  getState,
  allowRequest,
  recordSuccess,
  recordFailure,
  circuitBreakerGuard,
  invalidateCircuitBreakerConfigCache,
};
