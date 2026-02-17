const express = require('express');
const router = express.Router();

const ApiKey = require('../models/ApiKey');
const { generateApiKey } = require('../utils/apiKey');
const { requireJWT, requireRole } = require('../middleware/auth');
const { validateCreateApiKey, handleValidationErrors } = require('../middleware/validate');

/**
 * Async route handler wrapper.
 * @param {Function} fn - Async route handler.
 */
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// All routes require JWT + admin role
router.use(requireJWT, requireRole('admin'));

// GET /api/admin/api-keys
router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const keys = await ApiKey.find(
      {},
      'keyPrefix name clientId scopes isActive expiresAt lastUsedAt createdAt'
    );
    res.json(keys);
  })
);

// POST /api/admin/api-keys
router.post(
  '/',
  validateCreateApiKey,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const { name, clientId, scopes, rateLimit, expiresAt } = req.body;

    const { rawKey, keyPrefix, keyHash } = generateApiKey();

    const apiKeyDoc = await ApiKey.create({
      keyHash,
      keyPrefix,
      name,
      clientId,
      scopes: scopes || [],
      rateLimit: rateLimit || undefined,
      expiresAt: expiresAt || undefined,
    });

    // Return raw key ONCE — it can never be retrieved again
    res.status(201).json({
      rawKey,
      keyPrefix: apiKeyDoc.keyPrefix,
      name: apiKeyDoc.name,
      clientId: apiKeyDoc.clientId,
      scopes: apiKeyDoc.scopes,
      createdAt: apiKeyDoc.createdAt,
    });
  })
);

// PATCH /api/admin/api-keys/:id/revoke
router.patch(
  '/:id/revoke',
  asyncHandler(async (req, res) => {
    const key = await ApiKey.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!key) {
      return res.status(404).json({ error: 'API key not found', code: 'NOT_FOUND' });
    }
    res.json({ message: 'Key revoked' });
  })
);

// DELETE /api/admin/api-keys/:id
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const key = await ApiKey.findByIdAndDelete(req.params.id);
    if (!key) {
      return res.status(404).json({ error: 'API key not found', code: 'NOT_FOUND' });
    }
    res.json({ message: 'Key deleted' });
  })
);

module.exports = router;
