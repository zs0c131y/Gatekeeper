const crypto = require('crypto');

/**
 * Generate a new API key with prefix, hash, and raw key.
 * @returns {{ rawKey: string, keyPrefix: string, keyHash: string }}
 */
function generateApiKey() {
  const randomHex = crypto.randomBytes(16).toString('hex'); // 32 hex chars
  const rawKey = `gk_${randomHex}`;
  const keyPrefix = rawKey.substring(0, 8);
  const keyHash = hashApiKey(rawKey);

  return { rawKey, keyPrefix, keyHash };
}

/**
 * Hash an API key using SHA-256.
 * @param {string} rawKey - The raw API key.
 * @returns {string} SHA-256 hex digest.
 */
function hashApiKey(rawKey) {
  return crypto.createHash('sha256').update(rawKey).digest('hex');
}

/**
 * Verify a raw API key against a stored hash.
 * @param {string} rawKey - The raw API key to verify.
 * @param {string} storedHash - The stored SHA-256 hash.
 * @returns {boolean} True if the key matches.
 */
function verifyApiKey(rawKey, storedHash) {
  const computedHash = hashApiKey(rawKey);
  return crypto.timingSafeEqual(
    Buffer.from(computedHash, 'hex'),
    Buffer.from(storedHash, 'hex')
  );
}

module.exports = { generateApiKey, hashApiKey, verifyApiKey };
