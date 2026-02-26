const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const express = require("express");

function sanitizeValue(value) {
  if (typeof value === "string") {
    return value.replace(/\0/g, "").trim();
  }
  if (Array.isArray(value)) return value.map(sanitizeValue);
  if (value && typeof value === "object") {
    const out = {};
    Object.entries(value).forEach(([k, v]) => {
      out[k] = sanitizeValue(v);
    });
    return out;
  }
  return value;
}

function captureRawBody(req, _res, buf) {
  if (!buf || buf.length === 0) return;
  req.rawBody = Buffer.from(buf);
}

/**
 * Phase 1 – apply security headers and CORS *before* body parsing.
 * The better-auth request handler must be mounted after this call but
 * before applyBodyParsing(), so that it can read the raw request body.
 *
 * @param {import('express').Express} app
 */
function applyPreBodySecurity(app) {
  app.use(helmet());

  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
    : ["http://localhost:3000", "http://localhost:5173"];

  app.use(
    cors({
      origin: allowedOrigins,
      credentials: true,
      exposedHeaders: ["X-Trace-Id", "Traceparent"],
    }),
  );

  // Rate-limit the auth path (applied before the auth handler itself)
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: "Too many requests, please try again later",
      code: "RATE_LIMITED",
    },
  });
  app.use("/api/auth", authLimiter);
}

/**
 * Phase 2 – apply body parsing and sanitation middleware.
 * Must be called *after* the better-auth handler is mounted.
 *
 * @param {import('express').Express} app
 */
function applyBodyParsing(app) {
  const jsonBodyLimit = process.env.JSON_BODY_LIMIT || "256kb";
  const formBodyLimit = process.env.FORM_BODY_LIMIT || "64kb";

  app.use(
    express.json({
      limit: jsonBodyLimit,
      verify: captureRawBody,
    }),
  );
  app.use(
    express.urlencoded({
      extended: true,
      limit: formBodyLimit,
      verify: captureRawBody,
    }),
  );

  // Lightweight sanitization pass for query/body payloads.
  app.use((req, _res, next) => {
    if (req.query) req.query = sanitizeValue(req.query);
    if (req.body && typeof req.body === "object") {
      req.body = sanitizeValue(req.body);
    }
    next();
  });
}

/**
 * Convenience wrapper – applies both phases in the correct order.
 * Still exported so existing tests / scripts don't break.
 *
 * @param {import('express').Express} app
 */
function applySecurityMiddleware(app) {
  applyPreBodySecurity(app);
  applyBodyParsing(app);
}

module.exports = {
  applyPreBodySecurity,
  applyBodyParsing,
  applySecurityMiddleware,
};
