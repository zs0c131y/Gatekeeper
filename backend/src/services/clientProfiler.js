/**
 * Client Behavior Profiler.
 *
 * Tracks request patterns per client (IP or API key) and computes a
 * behavior score (0-100). Supports whitelist, blacklist, and auto-blocking
 * of clients with excessive rate-limit violations.
 */

const ClientProfile = require("../models/ClientProfile");
const logger = require("../utils/logger");

const AUTO_BLOCK_VIOLATION_THRESHOLD = 50;

/**
 * Record a request from a client.
 * Updates counters, timestamps, and recalculates behavior score.
 */
async function recordClientRequest(clientId, clientType, opts = {}) {
  try {
    const now = new Date();

    const existing = await ClientProfile.findOne(
      { clientId },
      { lastSeen: 1, totalRequests: 1, avgRequestInterval: 1 },
    ).lean();

    const update = {
      $inc: { totalRequests: 1 },
      $set: { lastSeen: now },
      $setOnInsert: {
        clientId,
        clientType: clientType || "ip",
        firstSeen: now,
        isBlocked: false,
        isWhitelisted: false,
        blockedRequests: 0,
        rateLimitViolations: 0,
        behaviorScore: 100,
      },
    };

    if (opts.latency) {
      update.$set.avgLatency = opts.latency;
    }

    if (existing && existing.lastSeen) {
      const interval = now.getTime() - new Date(existing.lastSeen).getTime();
      const prevAvg = existing.avgRequestInterval || 0;
      const count = existing.totalRequests || 1;
      update.$set.avgRequestInterval = Math.round(
        (prevAvg * (count - 1) + interval) / count,
      );
    }

    await ClientProfile.findOneAndUpdate({ clientId }, update, {
      upsert: true,
      returnDocument: "after",
    });
  } catch (err) {
    logger.error("[ClientProfiler] recordClientRequest failed", {
      clientId,
      error: err.message,
    });
  }
}

/**
 * Record a rate-limit violation and potentially auto-block.
 */
async function recordViolation(clientId) {
  try {
    const profile = await ClientProfile.findOneAndUpdate(
      { clientId },
      {
        $inc: { rateLimitViolations: 1, blockedRequests: 1 },
        $set: { lastSeen: new Date() },
      },
      { new: true },
    );

    if (
      profile &&
      !profile.isWhitelisted &&
      profile.rateLimitViolations >= AUTO_BLOCK_VIOLATION_THRESHOLD
    ) {
      await ClientProfile.updateOne(
        { clientId },
        { $set: { isBlocked: true } },
      );
      logger.warn("[ClientProfiler] Auto-blocked client", {
        clientId,
        violations: profile.rateLimitViolations,
      });
    }
  } catch (err) {
    logger.error("[ClientProfiler] recordViolation failed", {
      clientId,
      error: err.message,
    });
  }
}

/**
 * Recalculate behavior score for a client (0-100).
 *
 * Score factors:
 * - Base: 100
 * - Deduct for rate limit violations (−2 per violation, max −40)
 * - Deduct for blocked requests ratio (max −30)
 * - Deduct for very high request volume in short time (max −30)
 */
async function recalculateScore(clientId) {
  try {
    const profile = await ClientProfile.findOne({ clientId }).lean();
    if (!profile) return;

    let score = 100;

    const violationPenalty = Math.min(40, profile.rateLimitViolations * 2);
    score -= violationPenalty;

    if (profile.totalRequests > 0) {
      const blockedRatio = profile.blockedRequests / profile.totalRequests;
      score -= Math.min(30, Math.round(blockedRatio * 100));
    }

    score = Math.max(0, Math.min(100, score));

    await ClientProfile.updateOne(
      { clientId },
      { $set: { behaviorScore: score } },
    );
    return score;
  } catch (err) {
    logger.error("[ClientProfiler] recalculateScore failed", {
      clientId,
      error: err.message,
    });
    return null;
  }
}

/**
 * Check if a client is blocked.
 */
async function isClientBlocked(clientId) {
  try {
    const profile = await ClientProfile.findOne(
      { clientId },
      { isBlocked: 1, isWhitelisted: 1 },
    ).lean();
    if (!profile) return false;
    if (profile.isWhitelisted) return false;
    return profile.isBlocked === true;
  } catch {
    return false;
  }
}

module.exports = {
  recordClientRequest,
  recordViolation,
  recalculateScore,
  isClientBlocked,
};
