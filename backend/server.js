const express = require("express");
const mongoose = require("mongoose");
require("dotenv").config();

const {
  connectMongoDB,
  connectRedis,
  getRedisClient,
} = require("./src/config/database");
const { applySecurityMiddleware } = require("./src/middleware/security");
const errorHandler = require("./src/middleware/errorHandler");
const seed = require("./src/config/seed");

const overviewRoutes = require("./routes/overview");
const analyticsRoutes = require("./routes/analytics");
const logsRoutes = require("./routes/logs");
const settingsRoutes = require("./routes/settings");

const authRoutes = require("./src/routes/auth");
const apiKeyRoutes = require("./src/routes/apiKeys");

const gatewayRoutes = require("./src/routes/gateway");
const { startHealthCheckLoop } = require("./src/services/healthCheck");
const { startLogQueue } = require("./src/services/logQueue");
const {
  startAnalyticsAggregationLoop,
} = require("./src/services/analyticsAggregator");

const app = express();
const PORT = process.env.PORT || 3000;

applySecurityMiddleware(app);

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

app.use("/api/auth", authRoutes);
app.use("/api/admin/api-keys", apiKeyRoutes);

app.use("/gateway", gatewayRoutes);

app.use((_req, res) => res.status(404).json({ error: "Not found" }));

app.use(errorHandler);

async function start() {
  try {
    await connectMongoDB();

    try {
      await connectRedis();
    } catch (err) {
      // Graceful degradation: continue without Redis-backed features.
      console.warn("Redis unavailable, running in degraded mode:", err.message);
    }

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
