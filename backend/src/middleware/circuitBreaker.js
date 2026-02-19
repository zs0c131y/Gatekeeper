/**
 * Circuit Breaker state machine.
 *
 * States:
 *   CLOSED     — normal operation; requests flow through.
 *   OPEN       — backend deemed unhealthy; requests are blocked immediately.
 *   HALF_OPEN  — cooldown elapsed; a limited set of test requests are allowed
 *                to probe the backend before transitioning to CLOSED or OPEN.
 *
 * All state is stored in Redis so all gateway instances share the same view.
 * If Redis is unavailable the circuit defaults to CLOSED (fail-open) so that
 * a cache outage does not take down the gateway.
 */

const redisKeys = require("../config/redisKeys");
const { getRedisClient } = require("../config/database");
const Config = require("../models/Config");

const STATES = Object.freeze({
  CLOSED: "CLOSED",
  OPEN: "OPEN",
  HALF_OPEN: "HALF_OPEN",
});

// ── Config helpers ─────────────────────────────────────────────────────────

/** Cached config values (reloaded once per minute). */
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
    failureThreshold: map["circuit_breaker.failure_threshold"] ?? 5,
    recoveryTimeoutMs: map["circuit_breaker.recovery_timeout_ms"] ?? 30_000,
    halfOpenMaxCalls: map["circuit_breaker.half_open_max_calls"] ?? 3,
  };
  _configCachedAt = now;
  return _configCache;
}

// ── State machine ──────────────────────────────────────────────────────────

/**
 * Returns the current effective state of the circuit for `backendName`.
 * Automatically transitions OPEN → HALF_OPEN when the recovery timeout elapses.
 *
 * @param {string} backendName
 * @returns {Promise<'CLOSED'|'OPEN'|'HALF_OPEN'>}
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
      return STATES.HALF_OPEN;
    }
  }

  return state;
}

/**
 * Record a successful upstream response.
 * HALF_OPEN → CLOSED + reset failure counters.
 * CLOSED stays CLOSED.
 *
 * @param {string} backendName
 */
async function recordSuccess(backendName) {
  const redis = getRedisClient();
  if (!redis) return;

  const state = await redis.get(redisKeys.circuitState(backendName));
  if (state === STATES.HALF_OPEN || state === STATES.OPEN) {
    await redis.set(redisKeys.circuitState(backendName), STATES.CLOSED);
    await redis.del(redisKeys.circuitFailureCount(backendName));
    await redis.del(redisKeys.circuitLastFailure(backendName));
    console.log(`[CircuitBreaker] ${backendName} → CLOSED`);
  }
}

/**
 * Record a failed upstream response / timeout.
 * Increments failure counter; when threshold is reached the circuit OPENS.
 *
 * @param {string} backendName
 */
async function recordFailure(backendName) {
  const redis = getRedisClient();
  if (!redis) return;

  const { failureThreshold } = await getConfig();
  const failures = await redis.incr(redisKeys.circuitFailureCount(backendName));
  await redis.set(
    redisKeys.circuitLastFailure(backendName),
    String(Date.now()),
  );

  const currentState =
    (await redis.get(redisKeys.circuitState(backendName))) || STATES.CLOSED;

  if (failures >= failureThreshold && currentState !== STATES.OPEN) {
    await redis.set(redisKeys.circuitState(backendName), STATES.OPEN);
    console.warn(
      `[CircuitBreaker] ${backendName} → OPEN (failures=${failures})`,
    );
  } else if (currentState === STATES.HALF_OPEN) {
    // A failure during probe → back to OPEN
    await redis.set(redisKeys.circuitState(backendName), STATES.OPEN);
    await redis.set(
      redisKeys.circuitLastFailure(backendName),
      String(Date.now()),
    );
    console.warn(`[CircuitBreaker] ${backendName} → OPEN (probe failed)`);
  }
}

/**
 * Express middleware factory that rejects requests when the circuit is OPEN.
 * Expects `req.targetBackend` to be populated by the router upstream.
 *
 * @param {string} backendName
 */
function circuitBreakerGuard(backendName) {
  return async (req, res, next) => {
    const state = await getState(backendName);
    if (state === STATES.OPEN) {
      return res.status(503).json({
        error: "Service temporarily unavailable (circuit open)",
        code: "CIRCUIT_OPEN",
        backend: backendName,
      });
    }
    next();
  };
}

module.exports = {
  STATES,
  getState,
  recordSuccess,
  recordFailure,
  circuitBreakerGuard,
};
