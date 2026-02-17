const { verifyToken, isTokenBlacklisted } = require('../utils/jwt');
const { verifyApiKey: verifyApiKeyUtil } = require('../utils/apiKey');
const ApiKey = require('../models/ApiKey');

/**
 * Middleware: Requires a valid JWT Bearer token.
 * Attaches decoded user to req.user.
 */
async function requireJWT(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Access token required', code: 'TOKEN_REQUIRED' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);

    const blacklisted = await isTokenBlacklisted(decoded.jti);
    if (blacklisted) {
      return res.status(401).json({ error: 'Token has been revoked', code: 'TOKEN_REVOKED' });
    }

    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ error: 'Invalid token', code: 'TOKEN_INVALID' });
  }
}

/**
 * Middleware: Requires a valid API key in the configured header.
 * Attaches the ApiKey document to req.apiKey.
 */
async function requireApiKey(req, res, next) {
  try {
    const headerName = process.env.API_KEY_HEADER || 'x-api-key';
    const rawKey = req.headers[headerName];

    if (!rawKey || rawKey.length < 8) {
      return res.status(401).json({ error: 'API key required', code: 'API_KEY_REQUIRED' });
    }

    const keyPrefix = rawKey.substring(0, 8);
    const apiKeyDoc = await ApiKey.findOne({ keyPrefix, isActive: true });

    if (!apiKeyDoc) {
      return res.status(401).json({ error: 'Invalid API key', code: 'API_KEY_INVALID' });
    }

    const valid = verifyApiKeyUtil(rawKey, apiKeyDoc.keyHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid API key', code: 'API_KEY_INVALID' });
    }

    if (apiKeyDoc.expiresAt && apiKeyDoc.expiresAt < new Date()) {
      return res.status(401).json({ error: 'API key expired', code: 'API_KEY_EXPIRED' });
    }

    req.apiKey = apiKeyDoc;

    // Update lastUsedAt asynchronously — do not block the request
    ApiKey.updateOne({ _id: apiKeyDoc._id }, { lastUsedAt: new Date() }).catch(() => {});

    next();
  } catch (err) {
    return res.status(401).json({ error: 'API key authentication failed', code: 'API_KEY_ERROR' });
  }
}

/**
 * Middleware factory: Requires the authenticated user to have one of the specified roles.
 * Must be used after requireJWT.
 * @param {...string} roles - Allowed roles.
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required', code: 'AUTH_REQUIRED' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions', code: 'FORBIDDEN' });
    }
    next();
  };
}

/**
 * Middleware: Optionally decodes JWT if present, but does not block the request.
 */
async function optionalJWT(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);

    const blacklisted = await isTokenBlacklisted(decoded.jti);
    if (!blacklisted) {
      req.user = decoded;
    }
  } catch {
    // Token invalid or expired — continue without user
  }
  next();
}

module.exports = { requireJWT, requireApiKey, requireRole, optionalJWT };
