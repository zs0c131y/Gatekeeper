const express = require("express");
const http = require("http");
const mongoose = require("mongoose");
require("dotenv").config();

const logger = require("./src/utils/logger");
const {
  connectMongoDB,
  connectRedis,
  getRedisClient,
} = require("./src/config/database");
const {
  applyPreBodySecurity,
  applyBodyParsing,
} = require("./src/middleware/security");
const errorHandler = require("./src/middleware/errorHandler");
const seed = require("./src/config/seed");
const { initAuth, getAuth } = require("./src/lib/auth");
const { toNodeHandler } = require("better-auth/node");
const { initWebSocket } = require("./src/services/websocket");

const overviewRoutes = require("./routes/overview");
const analyticsRoutes = require("./routes/analytics");
const logsRoutes = require("./routes/logs");
const settingsRoutes = require("./routes/settings");

const userRoutes = require("./src/routes/user");
const apiKeyRoutes = require("./src/routes/apiKeys");

const gatewayRoutes = require("./src/routes/gateway");
const { startHealthCheckLoop } = require("./src/services/healthCheck");
const { startLogQueue } = require("./src/services/logQueue");
const {
  startAnalyticsAggregationLoop,
} = require("./src/services/analyticsAggregator");

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

// ── Phase 1: Security headers + CORS (must precede the auth handler) ─────────
applyPreBodySecurity(app);

// ── better-auth handler  (must be BEFORE body-parsing middleware) ─────────────
// The lazy wrapper survives being registered before initAuth() is called; by
// the time the server accepts connections, initAuth() will already have run.
app.all("/api/auth/*", (req, res) => {
  let handler;
  try {
    handler = toNodeHandler(getAuth());
  } catch {
    return res
      .status(503)
      .json({ error: "Auth service not ready", code: "AUTH_NOT_READY" });
  }
  return handler(req, res);
});

// ── Phase 2: Body parsing + sanitation ────────────────────────────────────────
applyBodyParsing(app);

app.get("/", (_req, res) =>
  res.json({ message: "Gatekeeper API is running", version: "1.0.0" }),
);

app.get("/health", (_req, res) =>
  res.json({ status: "ok", uptime: process.uptime() }),
);

app.get("/api/status", async (_req, res) => {
  const redis = getRedisClient();
  let redisHealthy = false;

  if (redis) {
    try {
      await redis.ping();
      redisHealthy = true;
    } catch {
      redisHealthy = false;
    }
  }

  const Backend = require("./src/models/Backend");
  const Log = require("./src/models/Log");

  let activeBackends = 0;
  let totalBackends = 0;
  try {
    totalBackends = await Backend.countDocuments();
    activeBackends = await Backend.countDocuments({ isActive: true });
  } catch {
    /* ignore */
  }

  let requestCount = 0;
  let avgLatency = 0;
  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const stats = await Log.aggregate([
      { $match: { timestamp: { $gte: oneHourAgo } } },
      {
        $group: { _id: null, count: { $sum: 1 }, avgLat: { $avg: "$latency" } },
      },
    ]);
    if (stats.length > 0) {
      requestCount = stats[0].count;
      avgLatency = Math.round(stats[0].avgLat || 0);
    }
  } catch {
    /* ignore */
  }

  res.json({
    status: "ok",
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    services: {
      mongodb: {
        connected: mongoose.connection.readyState === 1,
        readyState: mongoose.connection.readyState,
      },
      redis: {
        connected: redisHealthy,
      },
    },
    backends: {
      total: totalBackends,
      active: activeBackends,
    },
    requestCount,
    avgLatency,
  });
});

app.use("/api/overview", overviewRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/logs", logsRoutes);
app.use("/api/settings", settingsRoutes);

app.use("/api/user", userRoutes);
app.use("/api/admin/api-keys", apiKeyRoutes);

app.use("/gateway", gatewayRoutes);

app.use((_req, res) => res.status(404).json({ error: "Not found" }));

app.use(errorHandler);

async function start() {
  try {
    await connectMongoDB();

    let redisClient = null;
    try {
      await connectRedis();
      redisClient = getRedisClient();
    } catch (err) {
      logger.warn("Redis unavailable, running in degraded mode", {
        error: err.message,
      });
    }

    initAuth(mongoose.connection.db, redisClient);
    initWebSocket(server);

    await seed();
    await startHealthCheckLoop();
    startLogQueue();
    startAnalyticsAggregationLoop();

    server.listen(PORT, () => {
      logger.info(`Gateway API running on http://localhost:${PORT}`);
    });
  } catch (err) {
    logger.error("Failed to start server", { error: err.message });
    process.exit(1);
  }
}

start();

module.exports = { app, server };
