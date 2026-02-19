/**
 * /api/settings — real-data implementation.
 */
const { Router } = require("express");
const Config = require("../src/models/Config");
const Backend = require("../src/models/Backend");
const ApiKey = require("../src/models/ApiKey");
const { requireJWT, requireRole } = require("../src/middleware/auth");
const { getRedisClient } = require("../src/config/database");
const redisKeys = require("../src/config/redisKeys");

const router = Router();

async function getCategoryMap(category) {
  const docs = await Config.find({ category, isActive: true }).lean();
  const map = {};
  docs.forEach((d) => {
    map[d.key] = d.value;
  });
  return map;
}

async function upsertConfig(key, value, updatedBy) {
  await Config.findOneAndUpdate(
    { key },
    { value, updatedBy },
    { upsert: true, new: true, runValidators: false },
  );
}

// ── General ────────────────────────────────────────────────────────────────
router.get("/general", async (_req, res, next) => {
  try {
    const m = await getCategoryMap("general");
    res.json({
      gatewayName: m["general.gateway_name"] ?? "Gatekeeper API Gateway",
      loggingLevel: m["general.logging_level"] ?? "info",
      logRetentionDays: m["general.log_retention_days"] ?? 30,
      adaptiveRateLimiting: m["general.adaptive_rate_limiting"] ?? true,
      circuitBreaking: m["general.circuit_breaking"] ?? true,
      realtimeAnalytics: m["general.realtime_analytics"] ?? true,
    });
  } catch (err) {
    next(err);
  }
});
router.put(
  "/general",
  requireJWT,
  requireRole("admin"),
  async (req, res, next) => {
    try {
      const by = req.user?.userId || "system";
      const fields = {
        "general.gateway_name": req.body.gatewayName,
        "general.logging_level": req.body.loggingLevel,
        "general.log_retention_days": req.body.logRetentionDays,
        "general.adaptive_rate_limiting": req.body.adaptiveRateLimiting,
        "general.circuit_breaking": req.body.circuitBreaking,
        "general.realtime_analytics": req.body.realtimeAnalytics,
      };
      await Promise.all(
        Object.entries(fields)
          .filter(([, v]) => v !== undefined)
          .map(([k, v]) => upsertConfig(k, v, by)),
      );
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  },
);

// ── Rate Limiting ──────────────────────────────────────────────────────────
router.get("/rate-limiting", async (_req, res, next) => {
  try {
    const m = await getCategoryMap("rate_limiting");
    res.json({
      global: {
        requestsPerMinute: m["rate_limiting.default_rpm"] ?? 100,
        burstMultiplier: m["rate_limiting.burst_multiplier"] ?? 1.5,
      },
    });
  } catch (err) {
    next(err);
  }
});
router.put(
  "/rate-limiting",
  requireJWT,
  requireRole("admin"),
  async (req, res, next) => {
    try {
      const by = req.user?.userId || "system";
      if (req.body.global?.requestsPerMinute !== undefined)
        await upsertConfig(
          "rate_limiting.default_rpm",
          req.body.global.requestsPerMinute,
          by,
        );
      if (req.body.global?.burstMultiplier !== undefined)
        await upsertConfig(
          "rate_limiting.burst_multiplier",
          req.body.global.burstMultiplier,
          by,
        );
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  },
);

// ── Circuit Breakers ───────────────────────────────────────────────────────
router.get("/circuit-breakers", async (_req, res, next) => {
  try {
    const m = await getCategoryMap("circuit_breaker");
    res.json({
      failureThreshold: m["circuit_breaker.failure_threshold"] ?? 5,
      recoveryTimeoutMs: m["circuit_breaker.recovery_timeout_ms"] ?? 30000,
      halfOpenMaxCalls: m["circuit_breaker.half_open_max_calls"] ?? 3,
    });
  } catch (err) {
    next(err);
  }
});
router.put(
  "/circuit-breakers",
  requireJWT,
  requireRole("admin"),
  async (req, res, next) => {
    try {
      const by = req.user?.userId || "system";
      const map = {
        failureThreshold: "circuit_breaker.failure_threshold",
        recoveryTimeoutMs: "circuit_breaker.recovery_timeout_ms",
        halfOpenMaxCalls: "circuit_breaker.half_open_max_calls",
      };
      await Promise.all(
        Object.entries(map)
          .filter(([k]) => req.body[k] !== undefined)
          .map(([k, dbKey]) => upsertConfig(dbKey, req.body[k], by)),
      );
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  },
);

// ── Backends ───────────────────────────────────────────────────────────────
router.get("/backends", async (_req, res, next) => {
  try {
    const redis = getRedisClient();
    const backends = await Backend.find().lean();
    const result = await Promise.all(
      backends.map(async (b) => {
        let score = null;
        if (redis) {
          const raw = await redis.get(redisKeys.healthScore(b.name));
          score = raw !== null ? parseInt(raw, 10) : null;
        }
        const status =
          score === null
            ? "unknown"
            : score >= 80
              ? "healthy"
              : score >= 50
                ? "degraded"
                : "unhealthy";
        return {
          _id: b._id,
          name: b.name,
          url: b.baseUrl,
          healthPath: b.healthCheckPath,
          weight: b.weight,
          timeout: b.timeout,
          isActive: b.isActive,
          status,
        };
      }),
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
});
router.post(
  "/backends",
  requireJWT,
  requireRole("admin"),
  async (req, res, next) => {
    try {
      const { name, url, healthPath, weight, timeout } = req.body;
      if (!name || !url)
        return res.status(400).json({ error: "name and url are required" });
      const backend = await Backend.create({
        name,
        baseUrl: url,
        healthCheckPath: healthPath || "/health",
        weight: weight || 1,
        timeout: timeout || 5000,
      });
      res.status(201).json(backend);
    } catch (err) {
      next(err);
    }
  },
);
router.put(
  "/backends/:name",
  requireJWT,
  requireRole("admin"),
  async (req, res, next) => {
    try {
      const { url, healthPath, weight, timeout, isActive } = req.body;
      const update = {};
      if (url !== undefined) update.baseUrl = url;
      if (healthPath !== undefined) update.healthCheckPath = healthPath;
      if (weight !== undefined) update.weight = weight;
      if (timeout !== undefined) update.timeout = timeout;
      if (isActive !== undefined) update.isActive = isActive;
      const updated = await Backend.findOneAndUpdate(
        { name: req.params.name },
        update,
        { new: true },
      );
      if (!updated) return res.status(404).json({ error: "Backend not found" });
      res.json(updated);
    } catch (err) {
      next(err);
    }
  },
);
router.delete(
  "/backends/:name",
  requireJWT,
  requireRole("admin"),
  async (req, res, next) => {
    try {
      await Backend.findOneAndDelete({ name: req.params.name });
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  },
);

// ── Security ───────────────────────────────────────────────────────────────
router.get("/security", async (_req, res, next) => {
  try {
    const m = await getCategoryMap("security");
    res.json({
      jwtExpiry: m["security.jwt_expiry"] ?? 3600,
      apiKeyHeader: m["security.api_key_header"] ?? "x-api-key",
    });
  } catch (err) {
    next(err);
  }
});
router.put(
  "/security",
  requireJWT,
  requireRole("admin"),
  async (req, res, next) => {
    try {
      const by = req.user?.userId || "system";
      if (req.body.jwtExpiry !== undefined)
        await upsertConfig("security.jwt_expiry", req.body.jwtExpiry, by);
      if (req.body.apiKeyHeader !== undefined)
        await upsertConfig(
          "security.api_key_header",
          req.body.apiKeyHeader,
          by,
        );
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  },
);

// ── API Keys (read-only here — full management via /api/admin/api-keys) ────
router.get("/api-keys", requireJWT, async (_req, res, next) => {
  try {
    const keys = await ApiKey.find({ isActive: true })
      .select("-keyHash")
      .lean();
    res.json(
      keys.map((k) => ({
        id: k._id,
        name: k.name,
        clientId: k.clientId,
        prefix: k.keyPrefix,
        scopes: k.scopes,
        lastUsedAt: k.lastUsedAt,
        createdAt: k.createdAt,
        expiresAt: k.expiresAt,
      })),
    );
  } catch (err) {
    next(err);
  }
});

// ── Full settings dump ─────────────────────────────────────────────────────
router.get("/", async (_req, res, next) => {
  try {
    const [general, rl, cb] = await Promise.all([
      getCategoryMap("general"),
      getCategoryMap("rate_limiting"),
      getCategoryMap("circuit_breaker"),
    ]);
    res.json({ general, rateLimiting: rl, circuitBreaker: cb });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
