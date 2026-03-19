/**
 * /api/clients — Client behavior profiling API.
 *
 * Exposes client profiles (behavior scores, violations, whitelist/blacklist)
 * tracked by the clientProfiler service.
 */
const { Router } = require("express");
const ClientProfile = require("../models/ClientProfile");
const { recalculateScore } = require("../services/clientProfiler");
const { requireJWT } = require("../middleware/auth");

const router = Router();

// All client profiler routes require authentication
router.use(requireJWT);

/**
 * GET /api/clients
 * List all client profiles with pagination, sorting, and filtering.
 *
 * Query params:
 *   - limit (number, default 50, max 200)
 *   - skip  (number, default 0)
 *   - sort  (string: "requests" | "score" | "violations" | "lastSeen", default "requests")
 *   - order (string: "asc" | "desc", default "desc")
 *   - blocked (string: "true" | "false" — filter by blocked status)
 *   - whitelisted (string: "true" | "false" — filter by whitelist status)
 *   - search (string — partial match on clientId)
 */
router.get("/", async (req, res, next) => {
  try {
    const limit = Math.min(Math.max(1, Number(req.query.limit) || 50), 200);
    const skip = Math.max(0, Number(req.query.skip) || 0);

    const sortField = {
      requests: "totalRequests",
      score: "behaviorScore",
      violations: "rateLimitViolations",
      lastSeen: "lastSeen",
    }[req.query.sort] || "totalRequests";

    const sortOrder = req.query.order === "asc" ? 1 : -1;

    const filter = {};
    if (req.query.blocked === "true") filter.isBlocked = true;
    if (req.query.blocked === "false") filter.isBlocked = false;
    if (req.query.whitelisted === "true") filter.isWhitelisted = true;
    if (req.query.whitelisted === "false") filter.isWhitelisted = false;
    if (req.query.search) {
      filter.clientId = { $regex: req.query.search, $options: "i" };
    }

    const [profiles, total] = await Promise.all([
      ClientProfile.find(filter)
        .sort({ [sortField]: sortOrder })
        .skip(skip)
        .limit(limit)
        .lean(),
      ClientProfile.countDocuments(filter),
    ]);

    res.json({
      clients: profiles.map((p) => ({
        id: p._id,
        clientId: p.clientId,
        clientType: p.clientType,
        totalRequests: p.totalRequests,
        blockedRequests: p.blockedRequests,
        rateLimitViolations: p.rateLimitViolations,
        behaviorScore: p.behaviorScore,
        avgLatency: p.avgLatency || 0,
        avgRequestInterval: p.avgRequestInterval || 0,
        isBlocked: p.isBlocked,
        isWhitelisted: p.isWhitelisted,
        firstSeen: p.firstSeen,
        lastSeen: p.lastSeen,
        notes: p.notes || "",
      })),
      total,
      limit,
      skip,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/clients/:clientId
 * Get a single client profile by clientId.
 */
router.get("/:clientId", async (req, res, next) => {
  try {
    const profile = await ClientProfile.findOne({
      clientId: req.params.clientId,
    }).lean();

    if (!profile) {
      return res.status(404).json({ error: "Client not found" });
    }

    // Recalculate score on demand for fresh data
    const freshScore = await recalculateScore(req.params.clientId);

    res.json({
      id: profile._id,
      clientId: profile.clientId,
      clientType: profile.clientType,
      totalRequests: profile.totalRequests,
      blockedRequests: profile.blockedRequests,
      rateLimitViolations: profile.rateLimitViolations,
      behaviorScore: freshScore ?? profile.behaviorScore,
      avgLatency: profile.avgLatency || 0,
      avgRequestInterval: profile.avgRequestInterval || 0,
      isBlocked: profile.isBlocked,
      isWhitelisted: profile.isWhitelisted,
      customRateLimit: profile.customRateLimit,
      firstSeen: profile.firstSeen,
      lastSeen: profile.lastSeen,
      notes: profile.notes || "",
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/clients/:clientId/block
 * Block or unblock a client.
 * Body: { blocked: true/false }
 */
router.patch("/:clientId/block", async (req, res, next) => {
  try {
    const { blocked } = req.body;
    if (typeof blocked !== "boolean") {
      return res
        .status(400)
        .json({ error: "'blocked' must be a boolean" });
    }

    const profile = await ClientProfile.findOneAndUpdate(
      { clientId: req.params.clientId },
      { $set: { isBlocked: blocked } },
      { returnDocument: "after" },
    );

    if (!profile) {
      return res.status(404).json({ error: "Client not found" });
    }

    res.json({
      clientId: profile.clientId,
      isBlocked: profile.isBlocked,
      message: blocked ? "Client blocked" : "Client unblocked",
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/clients/:clientId/whitelist
 * Add or remove a client from the whitelist.
 * Body: { whitelisted: true/false }
 */
router.patch("/:clientId/whitelist", async (req, res, next) => {
  try {
    const { whitelisted } = req.body;
    if (typeof whitelisted !== "boolean") {
      return res
        .status(400)
        .json({ error: "'whitelisted' must be a boolean" });
    }

    const update = { $set: { isWhitelisted: whitelisted } };
    // Whitelisting should also unblock
    if (whitelisted) {
      update.$set.isBlocked = false;
    }

    const profile = await ClientProfile.findOneAndUpdate(
      { clientId: req.params.clientId },
      update,
      { returnDocument: "after" },
    );

    if (!profile) {
      return res.status(404).json({ error: "Client not found" });
    }

    res.json({
      clientId: profile.clientId,
      isWhitelisted: profile.isWhitelisted,
      isBlocked: profile.isBlocked,
      message: whitelisted
        ? "Client whitelisted"
        : "Client removed from whitelist",
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/clients/:clientId/notes
 * Update notes for a client profile.
 * Body: { notes: "string" }
 */
router.patch("/:clientId/notes", async (req, res, next) => {
  try {
    const { notes } = req.body;
    if (typeof notes !== "string") {
      return res.status(400).json({ error: "'notes' must be a string" });
    }

    const profile = await ClientProfile.findOneAndUpdate(
      { clientId: req.params.clientId },
      { $set: { notes } },
      { returnDocument: "after" },
    );

    if (!profile) {
      return res.status(404).json({ error: "Client not found" });
    }

    res.json({
      clientId: profile.clientId,
      notes: profile.notes,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/clients/:clientId/rate-limit
 * Set a custom rate limit for a client.
 * Body: { rateLimit: number | null }
 */
router.patch("/:clientId/rate-limit", async (req, res, next) => {
  try {
    const { rateLimit } = req.body;
    if (rateLimit !== null && (typeof rateLimit !== "number" || rateLimit < 0)) {
      return res
        .status(400)
        .json({ error: "'rateLimit' must be a positive number or null" });
    }

    const profile = await ClientProfile.findOneAndUpdate(
      { clientId: req.params.clientId },
      { $set: { customRateLimit: rateLimit } },
      { returnDocument: "after" },
    );

    if (!profile) {
      return res.status(404).json({ error: "Client not found" });
    }

    res.json({
      clientId: profile.clientId,
      customRateLimit: profile.customRateLimit,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
