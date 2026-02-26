const { fromNodeHeaders } = require("better-auth/node");
const { getAuth } = require("../lib/auth");
const { verifyApiKey: verifyApiKeyUtil } = require("../utils/apiKey");
const ApiKey = require("../models/ApiKey");

/**
 * Middleware: Requires a valid better-auth session (cookie or Bearer token).
 * Attaches the session user to req.user and the session record to req.session.
 */
async function requireJWT(req, res, next) {
  try {
    const session = await getAuth().api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!session) {
      return res
        .status(401)
        .json({ error: "Authentication required", code: "AUTH_REQUIRED" });
    }

    req.user = session.user;
    req.session = session.session;
    next();
  } catch {
    return res
      .status(401)
      .json({ error: "Authentication required", code: "AUTH_REQUIRED" });
  }
}

/**
 * Middleware: Requires a valid API key in the configured header.
 * Attaches the ApiKey document to req.apiKey.
 */
async function requireApiKey(req, res, next) {
  try {
    const headerName = process.env.API_KEY_HEADER || "x-api-key";
    const rawKey = req.headers[headerName];

    if (!rawKey || rawKey.length < 8) {
      return res
        .status(401)
        .json({ error: "API key required", code: "API_KEY_REQUIRED" });
    }

    const keyPrefix = rawKey.substring(0, 8);
    const apiKeyDoc = await ApiKey.findOne({ keyPrefix, isActive: true });

    if (!apiKeyDoc) {
      return res
        .status(401)
        .json({ error: "Invalid API key", code: "API_KEY_INVALID" });
    }

    const valid = verifyApiKeyUtil(rawKey, apiKeyDoc.keyHash);
    if (!valid) {
      return res
        .status(401)
        .json({ error: "Invalid API key", code: "API_KEY_INVALID" });
    }

    if (apiKeyDoc.expiresAt && apiKeyDoc.expiresAt < new Date()) {
      return res
        .status(401)
        .json({ error: "API key expired", code: "API_KEY_EXPIRED" });
    }

    req.apiKey = apiKeyDoc;

    // Update lastUsedAt asynchronously — do not block the request
    ApiKey.updateOne({ _id: apiKeyDoc._id }, { lastUsedAt: new Date() }).catch(
      () => {},
    );

    next();
  } catch (err) {
    return res
      .status(401)
      .json({ error: "API key authentication failed", code: "API_KEY_ERROR" });
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
      return res
        .status(401)
        .json({ error: "Authentication required", code: "AUTH_REQUIRED" });
    }
    if (!roles.includes(req.user.role)) {
      return res
        .status(403)
        .json({ error: "Insufficient permissions", code: "FORBIDDEN" });
    }
    next();
  };
}

/**
 * Middleware: Optionally reads the better-auth session if present.
 * Never blocks the request.
 */
async function optionalJWT(req, res, next) {
  try {
    const session = await getAuth().api.getSession({
      headers: fromNodeHeaders(req.headers),
    });
    if (session) {
      req.user = session.user;
      req.session = session.session;
    }
  } catch {
    // No valid session — continue without user context
  }
  next();
}

module.exports = { requireJWT, requireApiKey, requireRole, optionalJWT };
