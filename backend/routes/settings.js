/**
 * /api/settings - configuration and management APIs.
 */
const { Router } = require("express");
const mongoose = require("mongoose");

const Config = require("../src/models/Config");
const Backend = require("../src/models/Backend");
const ApiKey = require("../src/models/ApiKey");
const Route = require("../src/models/Route");
const { requireJWT, requireRole } = require("../src/middleware/auth");
const { getRedisClient } = require("../src/config/database");
const redisKeys = require("../src/config/redisKeys");
const {
  invalidateRateLimitConfigCache,
} = require("../src/middleware/rateLimit");
const {
  invalidateCircuitBreakerConfigCache,
} = require("../src/middleware/circuitBreaker");
const {
  invalidateProxyConfigCache,
  invalidateDdosThresholdCache,
} = require("../src/middleware/proxy");
const {
  scoreToStatus,
  getMemoryScore,
} = require("../src/services/healthCheck");

const router = Router();

function asObjectIdMaybe(value) {
  if (!value) return null;
  if (mongoose.Types.ObjectId.isValid(value))
    return new mongoose.Types.ObjectId(value);
  return null;
}

async function getCategoryMap(category) {
  const docs = await Config.find({ category, isActive: true }).lean();
  const map = {};
  docs.forEach((d) => {
    map[d.key] = d.value;
  });
  return map;
}

function invalidateConfigDependents(key) {
  if (key.startsWith("rate_limiting.")) invalidateRateLimitConfigCache();
  if (key.startsWith("circuit_breaker.")) invalidateCircuitBreakerConfigCache();
  if (key === "routing.custom_headers") invalidateProxyConfigCache();
  if (key === "routing.ddos_threshold_rpm") invalidateDdosThresholdCache();
}

async function upsertConfig(key, value, updatedBy) {
  await Config.findOneAndUpdate(
    { key },
    { value, updatedBy },
    { upsert: true, returnDocument: "after", runValidators: false },
  );
  invalidateConfigDependents(key);
}

async function getGeneralSettings() {
  const m = await getCategoryMap("general");
  const routing = await getCategoryMap("routing");
  return {
    gatewayName: m["general.gateway_name"] ?? "Gatekeeper API Gateway",
    loggingLevel: m["general.logging_level"] ?? "info",
    logRetentionDays: m["general.log_retention_days"] ?? 30,
    adaptiveRateLimiting: m["general.adaptive_rate_limiting"] ?? true,
    circuitBreaking: m["general.circuit_breaking"] ?? true,
    realtimeAnalytics: m["general.realtime_analytics"] ?? true,
    ddosThresholdRpm: routing["routing.ddos_threshold_rpm"] ?? 500,
  };
}

async function getRateLimitingSettings() {
  const m = await getCategoryMap("rate_limiting");
  return {
    global: {
      requestsPerMinute: m["rate_limiting.default_rpm"] ?? 100,
      burstMultiplier: m["rate_limiting.burst_multiplier"] ?? 1.5,
      manualOverrideEnabled:
        m["rate_limiting.manual_override_enabled"] ?? false,
      manualOverrideRpm: m["rate_limiting.manual_override_rpm"] ?? 0,
    },
  };
}

async function getCircuitBreakerSettings() {
  const m = await getCategoryMap("circuit_breaker");
  return {
    failureThreshold: m["circuit_breaker.failure_threshold"] ?? 5,
    recoveryTimeoutMs: m["circuit_breaker.recovery_timeout_ms"] ?? 30000,
    halfOpenMaxCalls: m["circuit_breaker.half_open_max_calls"] ?? 3,
  };
}

async function getSecuritySettings() {
  const m = await getCategoryMap("security");
  return {
    jwtExpiry: m["security.jwt_expiry"] ?? 3600,
    apiKeyHeader: m["security.api_key_header"] ?? "x-api-key",
  };
}

async function getAlertSettings() {
  const m = await getCategoryMap("alerts");
  return {
    email: m["alerts.email"] ?? "",
    webhook: m["alerts.webhook"] ?? "",
    rules: Array.isArray(m["alerts.rules"]) ? m["alerts.rules"] : [],
  };
}

async function getBackendsView() {
  const redis = getRedisClient();
  const backends = await Backend.find().lean();

  return Promise.all(
    backends.map(async (b) => {
      let score = null;
      if (redis) {
        const raw = await redis.get(redisKeys.healthScore(b.name));
        score = raw !== null ? parseInt(raw, 10) : null;
      }

      // When Redis is available, read the authoritative circuit breaker state.
      // When Redis is unavailable, derive the state from the in-memory health
      // score so that unreachable backends don't wrongly appear as "Normal".
      let circuitState;
      if (redis) {
        circuitState =
          (await redis.get(redisKeys.circuitState(b.name))) || "CLOSED";
      } else {
        const memScore = getMemoryScore(b.name);
        // null score = not yet probed → default to CLOSED (healthy assumption).
        // score < 20 = probe failed / unreachable → surface as OPEN.
        circuitState = memScore === null || memScore >= 20 ? "CLOSED" : "OPEN";
      }

      const status = scoreToStatus(score, {
        healthyAbove: b.healthyAbove,
        degradedAbove: b.degradedAbove,
      });

      const shape = {
        _id: b._id,
        id: b._id,
        name: b.name,
        url: b.baseUrl,
        healthPath: b.healthCheckPath,
        weight: b.weight,
        timeout: b.timeout,
        isActive: b.isActive,
        healthyAbove: b.healthyAbove ?? 80,
        degradedAbove: b.degradedAbove ?? 50,
        status,
        healthScore: score,
        circuitState,
      };

      // Backward-compatible aliases for existing UI usage.
      return {
        ...shape,
        base_url: shape.url,
        health_endpoint: shape.healthPath,
        health_score: shape.healthScore,
        circuit_state: shape.circuitState,
      };
    }),
  );
}

async function updateGeneral(payload, updatedBy) {
  const fields = {
    "general.gateway_name": payload.gatewayName,
    "general.logging_level": payload.loggingLevel,
    "general.log_retention_days": payload.logRetentionDays,
    "general.adaptive_rate_limiting": payload.adaptiveRateLimiting,
    "general.circuit_breaking": payload.circuitBreaking,
    "general.realtime_analytics": payload.realtimeAnalytics,
    "routing.ddos_threshold_rpm": payload.ddosThresholdRpm,
  };

  await Promise.all(
    Object.entries(fields)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => upsertConfig(k, v, updatedBy)),
  );
}

async function updateRateLimiting(payload, updatedBy) {
  const global = payload.global || payload;
  if (global.requestsPerMinute !== undefined) {
    await upsertConfig(
      "rate_limiting.default_rpm",
      global.requestsPerMinute,
      updatedBy,
    );
  }
  if (global.burstMultiplier !== undefined) {
    await upsertConfig(
      "rate_limiting.burst_multiplier",
      global.burstMultiplier,
      updatedBy,
    );
  }
  if (global.manualOverrideEnabled !== undefined) {
    await upsertConfig(
      "rate_limiting.manual_override_enabled",
      global.manualOverrideEnabled,
      updatedBy,
    );
  }
  if (global.manualOverrideRpm !== undefined) {
    await upsertConfig(
      "rate_limiting.manual_override_rpm",
      global.manualOverrideRpm,
      updatedBy,
    );
  }
}

async function updateCircuitBreaker(payload, updatedBy) {
  const map = {
    failureThreshold: "circuit_breaker.failure_threshold",
    recoveryTimeoutMs: "circuit_breaker.recovery_timeout_ms",
    halfOpenMaxCalls: "circuit_breaker.half_open_max_calls",
  };

  await Promise.all(
    Object.entries(map)
      .filter(([k]) => payload[k] !== undefined)
      .map(([k, dbKey]) => upsertConfig(dbKey, payload[k], updatedBy)),
  );
}

async function updateSecurity(payload, updatedBy) {
  if (payload.jwtExpiry !== undefined) {
    await upsertConfig("security.jwt_expiry", payload.jwtExpiry, updatedBy);
  }
  if (payload.apiKeyHeader !== undefined) {
    await upsertConfig(
      "security.api_key_header",
      payload.apiKeyHeader,
      updatedBy,
    );
  }
}

async function updateAlerts(payload, updatedBy) {
  if (payload.email !== undefined) {
    await upsertConfig("alerts.email", payload.email, updatedBy);
  }
  if (payload.webhook !== undefined) {
    await upsertConfig("alerts.webhook", payload.webhook, updatedBy);
  }
  if (payload.rules !== undefined) {
    await upsertConfig("alerts.rules", payload.rules, updatedBy);
  }
}

router.get("/general", async (_req, res, next) => {
  try {
    res.json(await getGeneralSettings());
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
      await updateGeneral(req.body, req.user?.userId || "system");
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  },
);

router.get("/rate-limiting", async (_req, res, next) => {
  try {
    res.json(await getRateLimitingSettings());
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
      await updateRateLimiting(req.body, req.user?.userId || "system");
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  },
);

router.get("/circuit-breakers", async (_req, res, next) => {
  try {
    res.json(await getCircuitBreakerSettings());
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
      await updateCircuitBreaker(req.body, req.user?.userId || "system");
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  },
);

router.get("/backends", async (_req, res, next) => {
  try {
    const result = await getBackendsView();
    res.json({ backends: result, items: result });
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
      const name = req.body.name;
      const url = req.body.url || req.body.base_url;
      const healthPath = req.body.healthPath || req.body.health_endpoint;
      const weight = req.body.weight;
      const timeout = req.body.timeout;

      if (!name || !url) {
        return res.status(400).json({ error: "name and url are required" });
      }

      const backend = await Backend.create({
        name,
        baseUrl: url,
        healthCheckPath: healthPath || "/health",
        weight: weight || 1,
        timeout: timeout || 5000,
        healthyAbove: req.body.healthyAbove ?? 80,
        degradedAbove: req.body.degradedAbove ?? 50,
      });

      res.status(201).json(backend);
    } catch (err) {
      next(err);
    }
  },
);

router.put(
  "/backends/:nameOrId",
  requireJWT,
  requireRole("admin"),
  async (req, res, next) => {
    try {
      const { nameOrId } = req.params;
      const id = asObjectIdMaybe(nameOrId);

      const {
        url,
        base_url,
        healthPath,
        health_endpoint,
        weight,
        timeout,
        isActive,
      } = req.body;
      const update = {};

      if (url !== undefined || base_url !== undefined) {
        update.baseUrl = url ?? base_url;
      }
      if (healthPath !== undefined || health_endpoint !== undefined) {
        update.healthCheckPath = healthPath ?? health_endpoint;
      }
      if (weight !== undefined) update.weight = weight;
      if (timeout !== undefined) update.timeout = timeout;
      if (isActive !== undefined) update.isActive = isActive;
      if (req.body.healthyAbove !== undefined)
        update.healthyAbove = req.body.healthyAbove;
      if (req.body.degradedAbove !== undefined)
        update.degradedAbove = req.body.degradedAbove;

      const query = id ? { _id: id } : { name: nameOrId };
      const updated = await Backend.findOneAndUpdate(query, update, {
        returnDocument: "after",
      });
      if (!updated) return res.status(404).json({ error: "Backend not found" });

      res.json(updated);
    } catch (err) {
      next(err);
    }
  },
);

router.delete(
  "/backends/:nameOrId",
  requireJWT,
  requireRole("admin"),
  async (req, res, next) => {
    try {
      const { nameOrId } = req.params;
      const id = asObjectIdMaybe(nameOrId);
      const query = id ? { _id: id } : { name: nameOrId };

      const deleted = await Backend.findOneAndDelete(query);
      if (!deleted) return res.status(404).json({ error: "Backend not found" });

      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  },
);

router.get("/security", async (_req, res, next) => {
  try {
    res.json(await getSecuritySettings());
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
      await updateSecurity(req.body, req.user?.userId || "system");
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  },
);

router.get("/alerts", async (_req, res, next) => {
  try {
    res.json(await getAlertSettings());
  } catch (err) {
    next(err);
  }
});

router.put(
  "/alerts",
  requireJWT,
  requireRole("admin"),
  async (req, res, next) => {
    try {
      await updateAlerts(req.body, req.user?.userId || "system");
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  },
);

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

// ── Unified Service API ─────────────────────────────────────────────────────

router.post(
  "/services",
  requireJWT,
  requireRole("admin"),
  async (req, res, next) => {
    try {
      const { name, url, prefix } = req.body;
      if (!name || !url) {
        return res.status(400).json({ error: "name and url are required" });
      }

      const servicePrefix = prefix || `/gateway/${name}`;

      const backend = await Backend.create({
        name,
        baseUrl: url,
        healthCheckPath: req.body.healthPath || "/health",
        weight: req.body.weight || 1,
        timeout: req.body.timeout || 5000,
        healthyAbove: req.body.healthyAbove ?? 80,
        degradedAbove: req.body.degradedAbove ?? 50,
      });

      const route = await Route.create({
        path: `${servicePrefix}/*`,
        method: "*",
        backendId: backend._id,
        stripPrefix: servicePrefix,
        isActive: true,
        priority: 10,
      });

      const populated = await Route.findById(route._id)
        .populate("backendId", "name baseUrl")
        .lean();

      res.status(201).json({ backend, route: populated });
    } catch (err) {
      next(err);
    }
  },
);

router.get("/services", requireJWT, async (_req, res, next) => {
  try {
    const backends = await Backend.find().lean();
    const routes = await Route.find()
      .populate("backendId", "name baseUrl")
      .lean();

    const services = backends.map((b) => {
      const linkedRoutes = routes.filter(
        (r) => String(r.backendId?._id || r.backendId) === String(b._id),
      );
      const gatewayRoute = linkedRoutes.find(
        (r) => r.path?.endsWith("/*") && r.stripPrefix,
      );
      return {
        _id: b._id,
        name: b.name,
        url: b.baseUrl,
        prefix: gatewayRoute?.stripPrefix || null,
        gatewayPath: gatewayRoute?.path || null,
        isActive: b.isActive,
        routeActive: gatewayRoute?.isActive ?? null,
        routeId: gatewayRoute?._id || null,
        routes: linkedRoutes.length,
      };
    });

    res.json({ services });
  } catch (err) {
    next(err);
  }
});

router.delete(
  "/services/:nameOrId",
  requireJWT,
  requireRole("admin"),
  async (req, res, next) => {
    try {
      const { nameOrId } = req.params;
      const id = asObjectIdMaybe(nameOrId);
      const query = id ? { _id: id } : { name: nameOrId };

      const backend = await Backend.findOne(query);
      if (!backend) return res.status(404).json({ error: "Service not found" });

      await Route.deleteMany({ backendId: backend._id });
      await Backend.findByIdAndDelete(backend._id);

      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  },
);

// ── Routes CRUD ─────────────────────────────────────────────────────────────

router.get("/routes", requireJWT, async (_req, res, next) => {
  try {
    const routes = await Route.find()
      .populate("backendId", "name baseUrl")
      .lean();
    res.json({ routes });
  } catch (err) {
    next(err);
  }
});

router.post(
  "/routes",
  requireJWT,
  requireRole("admin"),
  async (req, res, next) => {
    try {
      const {
        path,
        method,
        backendId,
        stripPrefix,
        addPrefix,
        isActive,
        requiresAuth,
        rateLimit,
        priority,
      } = req.body;
      if (!path || !method || !backendId) {
        return res
          .status(400)
          .json({ error: "path, method and backendId are required" });
      }
      const route = await Route.create({
        path,
        method,
        backendId,
        stripPrefix,
        addPrefix,
        isActive,
        requiresAuth,
        rateLimit,
        priority,
      });
      const populated = await Route.findById(route._id)
        .populate("backendId", "name baseUrl")
        .lean();
      res.status(201).json(populated);
    } catch (err) {
      next(err);
    }
  },
);

router.put(
  "/routes/:id",
  requireJWT,
  requireRole("admin"),
  async (req, res, next) => {
    try {
      const {
        path,
        method,
        backendId,
        stripPrefix,
        addPrefix,
        isActive,
        requiresAuth,
        rateLimit,
        priority,
      } = req.body;
      const update = {};
      if (path !== undefined) update.path = path;
      if (method !== undefined) update.method = method;
      if (backendId !== undefined) update.backendId = backendId;
      if (stripPrefix !== undefined) update.stripPrefix = stripPrefix;
      if (addPrefix !== undefined) update.addPrefix = addPrefix;
      if (isActive !== undefined) update.isActive = isActive;
      if (requiresAuth !== undefined) update.requiresAuth = requiresAuth;
      if (rateLimit !== undefined) update.rateLimit = rateLimit;
      if (priority !== undefined) update.priority = priority;

      const updated = await Route.findByIdAndUpdate(req.params.id, update, {
        returnDocument: "after",
      }).populate("backendId", "name baseUrl");
      if (!updated) return res.status(404).json({ error: "Route not found" });
      res.json(updated);
    } catch (err) {
      next(err);
    }
  },
);

router.delete(
  "/routes/:id",
  requireJWT,
  requireRole("admin"),
  async (req, res, next) => {
    try {
      const deleted = await Route.findByIdAndDelete(req.params.id);
      if (!deleted) return res.status(404).json({ error: "Route not found" });
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  },
);

// Aggregate settings for dashboard UI.
router.get("/", async (_req, res, next) => {
  try {
    const [
      general,
      rateLimiting,
      circuitBreaker,
      security,
      alerts,
      backendPayload,
    ] = await Promise.all([
      getGeneralSettings(),
      getRateLimitingSettings(),
      getCircuitBreakerSettings(),
      getSecuritySettings(),
      getAlertSettings(),
      getBackendsView(),
    ]);

    // Keep legacy maps as compatibility payload.
    const [generalMap, rlMap, cbMap] = await Promise.all([
      getCategoryMap("general"),
      getCategoryMap("rate_limiting"),
      getCategoryMap("circuit_breaker"),
    ]);

    res.json({
      ...general,
      rateLimiting,
      circuitBreaker,
      security,
      alerts,
      backends: backendPayload,
      general: generalMap,
      rateLimitingMap: rlMap,
      circuitBreakerMap: cbMap,
    });
  } catch (err) {
    next(err);
  }
});

// Aggregate update endpoint for dashboard "Save" actions.
router.put("/", requireJWT, requireRole("admin"), async (req, res, next) => {
  try {
    const by = req.user?.userId || "system";
    const body = req.body || {};

    // Flat general payload OR nested general payload.
    const generalPayload = body.generalSettings || body.general || body;
    await updateGeneral(generalPayload, by);

    if (body.rateLimiting) await updateRateLimiting(body.rateLimiting, by);
    if (body.circuitBreaker)
      await updateCircuitBreaker(body.circuitBreaker, by);
    if (body.security) await updateSecurity(body.security, by);
    if (body.alerts) await updateAlerts(body.alerts, by);

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
