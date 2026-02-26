const express = require("express");
const mongoose = require("mongoose");
require("dotenv").config();

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
      // Graceful degradation: continue without Redis-backed features.
      console.warn("Redis unavailable, running in degraded mode:", err.message);
    }

    // Initialise better-auth now that the DB (and optionally Redis) is ready.
    // mongoose.connection.db is the native Db instance.
    initAuth(mongoose.connection.db, redisClient);

    await seed();
    await startHealthCheckLoop();
    startLogQueue();
    startAnalyticsAggregationLoop();

    app.listen(PORT, () => {
      console.log(`Gatekeeper API running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err.message);
    process.exit(1);
  }
}

start();

module.exports = app;
