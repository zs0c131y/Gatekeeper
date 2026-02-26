/**
 * /api/overview — real-data implementation.
 */
const { Router } = require("express");
const Log = require("../src/models/Log");
const Backend = require("../src/models/Backend");
const Alert = require("../src/models/Alert");
const { getRedisClient } = require("../src/config/database");
const redisKeys = require("../src/config/redisKeys");
const {
  scoreToStatus,
  getMemoryScore,
} = require("../src/services/healthCheck");
const { requireJWT } = require("../src/middleware/auth");

const router = Router();

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function getCircuitStateRaw(redis, name) {
  if (!redis) return "CLOSED";
  return (await redis.get(redisKeys.circuitState(name))) || "CLOSED";
}
async function getHealthScoreRaw(redis, name) {
  if (redis) {
    const v = await redis.get(redisKeys.healthScore(name));
    return v === null ? null : parseInt(v, 10);
  }
  // Redis unavailable — fall back to in-memory scores written by health check service.
  return getMemoryScore(name);
}

// Build time-bucketed traffic data for the chart.
// Returns `buckets` data points, each covering `intervalMs` milliseconds.
function buildTrafficBuckets(logs, intervalMs = 60_000, buckets = 30) {
  const now = Date.now();
  const windowStart = now - buckets * intervalMs;
  const counts = new Array(buckets).fill(0);

  for (const log of logs) {
    const ts = new Date(log.timestamp).getTime();
    if (ts < windowStart) continue;
    const idx = Math.floor((ts - windowStart) / intervalMs);
    if (idx >= 0 && idx < buckets) counts[idx]++;
  }

  return counts.map((count, i) => ({
    timestamp: windowStart + (i + 1) * intervalMs,
    requests: count,
  }));
}

function buildTopEndpoints(logs) {
  const epMap = {};
  for (const log of logs) {
    const ep = log.endpoint;
    if (!epMap[ep]) epMap[ep] = { endpoint: ep, count: 0, lSum: 0, errors: 0 };
    epMap[ep].count++;
    epMap[ep].lSum += log.latency || 0;
    if (log.status >= 400) epMap[ep].errors++;
  }
  return Object.values(epMap)
    .map((e) => ({
      endpoint: e.endpoint,
      requests: e.count,
      avgLatency: Math.round(e.lSum / e.count),
      errorRate: parseFloat(((e.errors / e.count) * 100).toFixed(1)),
    }))
    .sort((a, b) => b.requests - a.requests)
    .slice(0, 10);
}

function computeMetrics(logs) {
  const total = logs.length;
  const errors = logs.filter((l) => l.status >= 400).length;
  const avgLatency = total
    ? Math.round(logs.reduce((s, l) => s + (l.latency || 0), 0) / total)
    : 0;
  const errorRate = total ? parseFloat(((errors / total) * 100).toFixed(1)) : 0;
  return { total, avgLatency, errorRate };
}

// GET /api/overview
router.get("/", async (req, res, next) => {
  try {
    const redis = getRedisClient();
    const routesOnly = req.query.routesOnly === "true";
    const sourceFilter = routesOnly ? { source: "gateway" } : {};

    const now = Date.now();
    const oneHourAgo = new Date(now - 60 * 60 * 1000);
    const twoHoursAgo = new Date(now - 2 * 60 * 60 * 1000);

    // Fetch current and previous hour in parallel for change comparison.
    const [currentLogs, prevLogs] = await Promise.all([
      Log.find({ ...sourceFilter, timestamp: { $gte: oneHourAgo } })
        .sort({ timestamp: -1 })
        .limit(20_000)
        .lean(),
      Log.find({
        ...sourceFilter,
        timestamp: { $gte: twoHoursAgo, $lt: oneHourAgo },
      })
        .sort({ timestamp: -1 })
        .limit(20_000)
        .lean(),
    ]);

    const cur = computeMetrics(currentLogs);
    const prev = computeMetrics(prevLogs);

    const sign = (n) => (n >= 0 ? "+" : "");
    const requestsChange = prev.total
      ? `${sign(cur.total - prev.total)}${cur.total - prev.total}`
      : null;
    const latencyChange = prev.avgLatency
      ? `${sign(cur.avgLatency - prev.avgLatency)}${cur.avgLatency - prev.avgLatency}ms`
      : null;
    const errorRateChange = prev.total
      ? `${sign(cur.errorRate - prev.errorRate)}${(cur.errorRate - prev.errorRate).toFixed(1)}%`
      : null;

    const dbBackends = await Backend.find({ isActive: true }).lean();
    const backends = await Promise.all(
      dbBackends.map(async (b) => {
        const score = await getHealthScoreRaw(redis, b.name);
        const circuitState = await getCircuitStateRaw(redis, b.name);
        return {
          name: b.name,
          status: scoreToStatus(score),
          circuitState,
          healthScore: score ?? 0,
        };
      }),
    );
    // "active" = any backend that is responding (healthy or degraded).
    // "unhealthy"/"unknown" = not reachable.
    const activeBackends = backends.filter(
      (b) => b.status === "healthy" || b.status === "degraded",
    ).length;

    res.json({
      totalRequests: cur.total,
      avgLatency: cur.avgLatency,
      errorRate: cur.errorRate,
      requestsChange,
      latencyChange,
      errorRateChange,
      activeBackends,
      backends,
      trafficData: buildTrafficBuckets(currentLogs),
      topEndpoints: buildTopEndpoints(currentLogs),
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/overview/metrics
router.get("/metrics", async (_req, res, next) => {
  try {
    const redis = getRedisClient();
    const cached = redis ? await redis.get(redisKeys.overviewCache()) : null;
    if (cached) return res.json(JSON.parse(cached));
    const recentLogs = await Log.find()
      .sort({ timestamp: -1 })
      .limit(100)
      .lean();
    const dbBackends = await Backend.find({ isActive: true }).lean();
    const errors = recentLogs.filter((l) => l.status >= 400).length;
    const avgLatency = recentLogs.length
      ? Math.round(
          recentLogs.reduce((s, l) => s + l.latency, 0) / recentLogs.length,
        )
      : 0;
    const metrics = {
      totalRequests: { value: recentLogs.length, change: 0 },
      avgLatency: { value: `${avgLatency}ms`, change: 0 },
      errorRate: {
        value: `${((errors / (recentLogs.length || 1)) * 100).toFixed(1)}%`,
        change: 0,
      },
      activeBackends: {
        value: `${dbBackends.length}/${dbBackends.length}`,
        change: 0,
      },
    };
    if (redis)
      await redis.setex(redisKeys.overviewCache(), 10, JSON.stringify(metrics));
    res.json(metrics);
  } catch (err) {
    next(err);
  }
});

// GET /api/overview/traffic?seconds=60
router.get("/traffic", async (req, res, next) => {
  try {
    const seconds = Math.min(parseInt(req.query.seconds) || 60, 300);
    const since = new Date(Date.now() - seconds * 1000);
    const logs = await Log.find({ timestamp: { $gte: since } })
      .sort({ timestamp: 1 })
      .lean();
    res.json(logs.map((l, i) => ({ time: i, requests: 1 })));
  } catch (err) {
    next(err);
  }
});

// GET /api/overview/traffic/stream — SSE
// Counts new logs since the last tick using a sliding cursor so we never miss
// a log that lands between ticks or during a slow DB flush.
router.get("/traffic/stream", (req, res) => {
  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.flushHeaders();

  const routesOnly = req.query.routesOnly === "true";

  // Start the cursor 2 seconds in the past to pick up any logs already flushed
  // to DB that arrived just before the SSE connection was opened.
  let cursor = new Date(Date.now() - 2000);

  const send = async () => {
    try {
      const tickStart = new Date();
      const filter = { timestamp: { $gte: cursor } };
      if (routesOnly) filter.source = "gateway";
      const count = await Log.countDocuments(filter);
      // Advance cursor to now so the next tick only counts genuinely new logs.
      cursor = tickStart;
      res.write(
        `data: ${JSON.stringify({ time: Date.now(), requests: count })}\n\n`,
      );
    } catch {
      /* swallow */
    }
  };
  const interval = setInterval(send, 1000);
  res.on("close", () => clearInterval(interval));
});

// GET /api/overview/endpoints
router.get("/endpoints", async (_req, res, next) => {
  try {
    const logs = await Log.find().sort({ timestamp: -1 }).limit(500).lean();
    const map = {};
    for (const l of logs) {
      if (!map[l.endpoint])
        map[l.endpoint] = {
          endpoint: l.endpoint,
          requests: 0,
          lSum: 0,
          errors: 0,
        };
      map[l.endpoint].requests++;
      map[l.endpoint].lSum += l.latency || 0;
      if (l.status >= 400) map[l.endpoint].errors++;
    }
    res.json(
      Object.values(map)
        .map((e) => ({
          endpoint: e.endpoint,
          requests: e.requests,
          latency: Math.round(e.lSum / e.requests),
          errorRate: parseFloat(((e.errors / e.requests) * 100).toFixed(1)),
        }))
        .sort((a, b) => b.requests - a.requests),
    );
  } catch (err) {
    next(err);
  }
});

// GET /api/overview/circuit-breakers
router.get("/circuit-breakers", async (_req, res, next) => {
  try {
    const redis = getRedisClient();
    const backends = await Backend.find({ isActive: true }).lean();
    const result = await Promise.all(
      backends.map(async (b) => {
        const state = await getCircuitStateRaw(redis, b.name);
        const score = await getHealthScoreRaw(redis, b.name);
        return { name: b.name, state, health: score ?? 100, lastChange: "N/A" };
      }),
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/overview/circuit-breakers/:name/trip
router.post("/circuit-breakers/:name/trip", async (req, res, next) => {
  try {
    const redis = getRedisClient();
    if (redis) {
      await redis.set(redisKeys.circuitState(req.params.name), "OPEN");
      await redis.set(
        redisKeys.circuitLastFailure(req.params.name),
        String(Date.now()),
      );
    }
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// POST /api/overview/circuit-breakers/:name/reset
router.post("/circuit-breakers/:name/reset", async (req, res, next) => {
  try {
    const redis = getRedisClient();
    if (redis) {
      await redis.set(redisKeys.circuitState(req.params.name), "CLOSED");
      await redis.del(redisKeys.circuitFailureCount(req.params.name));
      await redis.del(redisKeys.circuitLastFailure(req.params.name));
    }
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// GET /api/overview/alerts
router.get("/alerts", async (_req, res, next) => {
  try {
    const alerts = await Alert.find().sort({ createdAt: -1 }).limit(20).lean();
    res.json(
      alerts.map((a, i) => ({
        id: a._id,
        time: i === 0 ? "just now" : `${i * 2}m ago`,
        type: a.type,
        message: a.message,
        timestamp: a.createdAt,
        isRead: a.isRead,
      })),
    );
  } catch (err) {
    next(err);
  }
});

// PATCH /api/overview/alerts/:id/read
router.patch("/alerts/:id/read", requireJWT, async (req, res, next) => {
  try {
    const updated = await Alert.findByIdAndUpdate(
      req.params.id,
      { isRead: true },
      { returnDocument: "after" },
    ).lean();

    if (!updated) {
      return res.status(404).json({ error: "Alert not found" });
    }

    res.json({
      id: updated._id,
      type: updated.type,
      message: updated.message,
      timestamp: updated.createdAt,
      isRead: updated.isRead,
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/overview/alerts/read-all
router.patch("/alerts/read-all", requireJWT, async (_req, res, next) => {
  try {
    const result = await Alert.updateMany({ isRead: false }, { isRead: true });
    res.json({
      success: true,
      updatedCount: result.modifiedCount || 0,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/overview/search?q=...
router.get("/search", requireJWT, async (req, res, next) => {
  try {
    const q = String(req.query.q || "").trim();
    if (q.length < 2) {
      return res.json({ query: q, items: [] });
    }

    const regex = new RegExp(escapeRegex(q), "i");

    const [logs, backends, alerts] = await Promise.all([
      Log.find({
        $or: [{ endpoint: regex }, { traceId: regex }, { clientIp: regex }],
      })
        .sort({ timestamp: -1 })
        .limit(100)
        .lean(),
      Backend.find({
        $or: [{ name: regex }, { url: regex }, { healthPath: regex }],
      })
        .sort({ updatedAt: -1 })
        .limit(20)
        .lean(),
      Alert.find({ message: regex }).sort({ createdAt: -1 }).limit(20).lean(),
    ]);

    const endpointMap = new Map();
    const traceMap = new Map();

    logs.forEach((log) => {
      if (log.endpoint && regex.test(log.endpoint)) {
        endpointMap.set(log.endpoint, (endpointMap.get(log.endpoint) || 0) + 1);
      }
      if (log.traceId && !traceMap.has(log.traceId)) {
        traceMap.set(log.traceId, log);
      }
    });

    const items = [];

    Array.from(endpointMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .forEach(([endpoint, requests]) => {
        items.push({
          id: `endpoint-${endpoint}`,
          type: "endpoint",
          title: endpoint,
          subtitle: `${requests} recent requests`,
          route: "/dashboard/analytics",
        });
      });

    Array.from(traceMap.entries())
      .slice(0, 5)
      .forEach(([traceId, log]) => {
        items.push({
          id: `trace-${traceId}`,
          type: "trace",
          title: traceId,
          subtitle: `${log.method} ${log.endpoint} - ${log.status}`,
          route: "/dashboard/logs",
        });
      });

    backends.slice(0, 5).forEach((backend) => {
      items.push({
        id: `backend-${backend._id}`,
        type: "backend",
        title: backend.name,
        subtitle: backend.url,
        route: "/dashboard/settings",
      });
    });

    alerts.slice(0, 5).forEach((alert) => {
      items.push({
        id: `alert-${alert._id}`,
        type: "alert",
        title: alert.message,
        subtitle: `${alert.type.toUpperCase()} - ${new Date(alert.createdAt).toLocaleString()}`,
        route: "/dashboard",
        alertId: alert._id,
      });
    });

    res.json({ query: q, items: items.slice(0, 15) });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
