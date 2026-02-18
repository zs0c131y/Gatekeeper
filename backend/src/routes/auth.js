const express = require('express');
const router = express.Router();

const User = require('../models/User');
const { comparePassword, hashPassword } = require('../utils/password');
const {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  blacklistToken,
  isTokenBlacklisted,
} = require('../utils/jwt');
const redisKeys = require('../config/redisKeys');
const { getRedisClient } = require('../config/database');
const { requireJWT, requireRole } = require('../middleware/auth');
const {
  validateLogin,
  validateRegister,
  validateChangePassword,
  handleValidationErrors,
} = require('../middleware/validate');

/**
 * Async route handler wrapper.
 * @param {Function} fn - Async route handler.
 */
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// POST /api/auth/register  (admin only)
router.post(
  '/register',
  requireJWT,
  requireRole('admin'),
  validateRegister,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const { username, email, password, role = 'viewer' } = req.body;

    const existing = await User.findOne({ $or: [{ email }, { username }] });
    if (existing) {
      const field = existing.email === email ? 'email' : 'username';
      return res.status(409).json({
        error: `A user with that ${field} already exists`,
        code: 'USER_EXISTS',
      });
    }

    const passwordHash = await hashPassword(password);
    const user = await User.create({ username, email, passwordHash, role });

    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  })
);

// POST /api/auth/login
router.post(
  '/login',
  validateLogin,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' });
    }

    const valid = await comparePassword(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' });
    }

    const accessToken = generateAccessToken({ userId: user._id.toString(), role: user.role });
    const refreshToken = generateRefreshToken(user._id.toString());

    // Store refresh token in Redis with 7-day TTL
    const redis = getRedisClient();
    if (redis) {
      const decoded = verifyToken(refreshToken);
      await redis.set(
        redisKeys.refreshToken(user._id.toString()),
        decoded.jti,
        'EX',
        7 * 24 * 60 * 60
      );
    }

    // Update lastLogin
    user.lastLogin = new Date();
    await user.save();

    res.json({
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  })
);

// POST /api/auth/refresh
router.post(
  '/refresh',
  asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token required', code: 'TOKEN_REQUIRED' });
    }

    const decoded = verifyToken(refreshToken);

    // Check if the refresh token JTI matches what's stored in Redis
    const redis = getRedisClient();
    if (redis) {
      const storedJti = await redis.get(redisKeys.refreshToken(decoded.userId));
      if (storedJti !== decoded.jti) {
        return res.status(401).json({ error: 'Invalid refresh token', code: 'TOKEN_INVALID' });
      }
    }

    const user = await User.findById(decoded.userId);
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'User not found or inactive', code: 'USER_INACTIVE' });
    }

    const accessToken = generateAccessToken({ userId: user._id.toString(), role: user.role });

    res.json({ accessToken });
  })
);

// POST /api/auth/logout
router.post(
  '/logout',
  requireJWT,
  asyncHandler(async (req, res) => {
    // Blacklist the current access token
    const decoded = req.user;
    const tokenExp = decoded.exp;
    const now = Math.floor(Date.now() / 1000);
    const remainingTTL = Math.max(tokenExp - now, 0);

    if (remainingTTL > 0) {
      await blacklistToken(decoded.jti, remainingTTL);
    }

    // Delete refresh token from Redis
    const redis = getRedisClient();
    if (redis) {
      await redis.del(redisKeys.refreshToken(decoded.userId));
    }

    res.json({ message: 'Logged out successfully' });
  })
);

// GET /api/auth/me
router.get(
  '/me',
  requireJWT,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.userId).select(
      'username email role lastLogin'
    );
    if (!user) {
      return res.status(404).json({ error: 'User not found', code: 'NOT_FOUND' });
    }

    res.json({
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      lastLogin: user.lastLogin,
    });
  })
);

// POST /api/auth/change-password
router.post(
  '/change-password',
  requireJWT,
  validateChangePassword,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found', code: 'NOT_FOUND' });
    }

    const valid = await comparePassword(currentPassword, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Current password is incorrect', code: 'INVALID_PASSWORD' });
    }

    user.passwordHash = await hashPassword(newPassword);
    await user.save();

    // Blacklist current access token
    const tokenExp = req.user.exp;
    const now = Math.floor(Date.now() / 1000);
    const remainingTTL = Math.max(tokenExp - now, 0);
    if (remainingTTL > 0) {
      await blacklistToken(req.user.jti, remainingTTL);
    }

    // Delete refresh token from Redis
    const redis = getRedisClient();
    if (redis) {
      await redis.del(redisKeys.refreshToken(req.user.userId));
    }

    res.json({ message: 'Password changed successfully' });
  })
);

module.exports = router;
