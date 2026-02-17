const express = require("express");
require("dotenv").config();

const { connectMongoDB, connectRedis } = require("./src/config/database");
const { applySecurityMiddleware } = require("./src/middleware/security");
const errorHandler = require("./src/middleware/errorHandler");
const seed = require("./src/config/seed");

// Existing routes
const overviewRoutes  = require("./routes/overview");
const analyticsRoutes = require("./routes/analytics");
const logsRoutes      = require("./routes/logs");
const settingsRoutes  = require("./routes/settings");

// New auth routes
const authRoutes   = require("./src/routes/auth");
const apiKeyRoutes = require("./src/routes/apiKeys");

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Security Middleware ───────────────────────────────────────────────────
applySecurityMiddleware(app);

// ── Routes ────────────────────────────────────────────────────────────────
app.get("/", (_req, res) => res.json({ message: "Gatekeeper API is running", version: "1.0.0" }));
app.get("/health", (_req, res) => res.json({ status: "ok", uptime: process.uptime() }));

app.use("/api/overview",  overviewRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/logs",      logsRoutes);
app.use("/api/settings",  settingsRoutes);

app.use("/api/auth",           authRoutes);
app.use("/api/admin/api-keys", apiKeyRoutes);

// 404
app.use((_req, res) => res.status(404).json({ error: "Not found" }));

// ── Global Error Handler ──────────────────────────────────────────────────
app.use(errorHandler);

// ── Start ─────────────────────────────────────────────────────────────────
async function start() {
  try {
    await connectMongoDB();
    await connectRedis();
    await seed();

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
