const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const express = require('express');

/**
 * Apply all security middleware to the Express app.
 * @param {import('express').Express} app
 */
function applySecurityMiddleware(app) {
  // Security headers
  app.use(helmet());

  // CORS
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
    : ['http://localhost:3000', 'http://localhost:5173'];

  app.use(
    cors({
      origin: allowedOrigins,
      credentials: true,
    })
  );

  // Rate limit for auth endpoints — 100 requests per 15 min per IP
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later', code: 'RATE_LIMITED' },
  });
  app.use('/api/auth', authLimiter);

  // Cap request body size
  app.use(express.json({ limit: '10kb' }));
  app.use(express.urlencoded({ extended: true, limit: '10kb' }));
}

module.exports = { applySecurityMiddleware };
