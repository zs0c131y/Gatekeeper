const express = require("express");
const cors    = require("cors");
require("dotenv").config({ path: "../.env" });

const overviewRoutes  = require("./routes/overview");
const analyticsRoutes = require("./routes/analytics");
const logsRoutes      = require("./routes/logs");
const settingsRoutes  = require("./routes/settings");

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ─────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Routes ─────────────────────────────────────────────────────────────────
app.get("/", (_req, res) => res.json({ message: "Gatekeeper API is running", version: "1.0.0" }));
app.get("/health", (_req, res) => res.json({ status: "ok", uptime: process.uptime() }));

app.use("/api/overview",  overviewRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/logs",      logsRoutes);
app.use("/api/settings",  settingsRoutes);

// 404
app.use((_req, res) => res.status(404).json({ error: "Not found" }));

// ── Optional DB connections (non-blocking for demo) ───────────────────────
async function tryConnectDatabases() {
  if (!process.env.MONGO_URI) {
    console.log("⚠️  MONGO_URI not set — running without MongoDB");
    return;
  }
  try {
    const { MongoClient } = require("mongodb");
    const client = new MongoClient(process.env.MONGO_URI);
    await client.connect();
    console.log("✅ Connected to MongoDB");
    app.locals.mongo = client;
  } catch (err) {
    console.warn("⚠️  MongoDB connection failed:", err.message);
  }

  if (!process.env.REDIS_HOST) return;
  try {
    const { createClient } = require("redis");
    const redis = createClient({
      username: process.env.REDIS_USERNAME,
      password: process.env.REDIS_PASSWORD,
      socket: {
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT) || 6379,
      },
    });
    redis.on("error", (e) => console.warn("Redis error:", e.message));
    await redis.connect();
    console.log("✅ Connected to Redis");
    app.locals.redis = redis;
  } catch (err) {
    console.warn("⚠️  Redis connection failed:", err.message);
  }
}

// ── Start ──────────────────────────────────────────────────────────────────
app.listen(PORT, async () => {
  console.log(`🚀 Gatekeeper API running on http://localhost:${PORT}`);
  await tryConnectDatabases();
});

module.exports = app;
