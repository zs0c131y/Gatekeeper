const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const redisKeys = require('../config/redisKeys');
const { getRedisClient } = require('../config/database');

/**
 * Generate a JWT access token.
 * @param {{ userId: string, role: string }} payload - Token payload.
 * @returns {string} Signed JWT.
 */
function generateAccessToken(payload) {
  const secret = process.env.JWT_SECRET;
  const expiry = process.env.JWT_EXPIRY || '1h';

  return jwt.sign(
    {
      userId: payload.userId,
      role: payload.role,
      jti: crypto.randomUUID(),
    },
    secret,
    { expiresIn: expiry }
  );
}

/**
 * Generate a long-lived refresh token.
 * @param {string} userId - The user ID.
 * @returns {string} Signed refresh JWT.
 */
function generateRefreshToken(userId) {
  const secret = process.env.JWT_SECRET;

  return jwt.sign(
    {
      userId,
      jti: crypto.randomUUID(),
    },
    secret,
    { expiresIn: '7d' }
  );
}

/**
 * Verify and decode a JWT token.
 * @param {string} token - The JWT to verify.
 * @returns {object} Decoded token payload.
 * @throws {JsonWebTokenError|TokenExpiredError} On invalid/expired token.
 */
function verifyToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}

/**
 * Blacklist a token's JTI in Redis with TTL.
 * @param {string} jti - The JWT ID to blacklist.
 * @param {number} expiresInSeconds - TTL in seconds.
 */
async function blacklistToken(jti, expiresInSeconds) {
  const redis = getRedisClient();
  if (!redis) return;
  await redis.set(redisKeys.jwtBlacklist(jti), '1', 'EX', expiresInSeconds);
}

/**
 * Check if a token's JTI is blacklisted.
 * @param {string} jti - The JWT ID to check.
 * @returns {Promise<boolean>} True if blacklisted.
 */
async function isTokenBlacklisted(jti) {
  const redis = getRedisClient();
  if (!redis) return false;
  const result = await redis.get(redisKeys.jwtBlacklist(jti));
  return result !== null;
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  blacklistToken,
  isTokenBlacklisted,
};
