/**
 * Redis key structure helpers.
 * All Redis keys used across the application must be generated from here.
 * Never hardcode Redis keys elsewhere in the codebase.
 */

const redisKeys = {
  // Rate limiting
  /** @param {string} clientId */
  rateLimitCounter: (clientId) => `rl:counter:${clientId}`,
  /** @param {string} clientId */
  rateLimitBucket: (clientId) => `rl:bucket:${clientId}`,

  // Circuit breaker
  /** @param {string} backendName */
  circuitState: (backendName) => `cb:state:${backendName}`,
  /** @param {string} backendName */
  circuitFailureCount: (backendName) => `cb:failures:${backendName}`,
  /** @param {string} backendName */
  circuitLastFailure: (backendName) => `cb:lastfail:${backendName}`,

  // Health scores
  /** @param {string} backendName */
  healthScore: (backendName) => `health:score:${backendName}`,
  /** @param {string} backendName */
  healthLastCheck: (backendName) => `health:lastcheck:${backendName}`,

  // Metrics cache
  /** @param {string} period */
  metricsCache: (period) => `metrics:cache:${period}`,
  overviewCache: () => 'metrics:overview',

  // Auth
  /** @param {string} jti */
  jwtBlacklist: (jti) => `auth:blacklist:${jti}`,
  /** @param {string} userId */
  refreshToken: (userId) => `auth:refresh:${userId}`,
};

module.exports = redisKeys;
