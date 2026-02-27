/**
 * Socket.io WebSocket Service.
 *
 * Provides real-time event broadcasting to connected dashboard clients.
 *
 * Events emitted:
 *   - traffic:update   — periodic throughput / req/sec snapshot
 *   - latency:update   — average latency update
 *   - error:new        — when an upstream error occurs
 *   - circuit:change   — circuit breaker state change
 *   - alert:new        — new system alert
 *   - log:new          — new request log entry
 */

const { Server } = require("socket.io");
const logger = require("../utils/logger");

let io = null;
let _metricsInterval = null;

// Running counters for periodic traffic snapshots
let _requestCount = 0;
let _errorCount = 0;
let _totalLatency = 0;

function initWebSocket(httpServer) {
  const frontendPort = "5173";
  const backendPort = process.env.PORT || "3000";
  const defaults = [
    `http://localhost:${frontendPort}`,
    `http://localhost:${backendPort}`,
  ];
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",").map((s) => s.trim())
    : defaults;

  io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      methods: ["GET", "POST"],
      credentials: true,
    },
    path: "/socket.io",
  });

  const dashboard = io.of("/dashboard");

  dashboard.on("connection", (socket) => {
    logger.info("[WebSocket] Dashboard client connected", {
      id: socket.id,
    });

    socket.on("disconnect", (reason) => {
      logger.debug("[WebSocket] Dashboard client disconnected", {
        id: socket.id,
        reason,
      });
    });
  });

  // Emit aggregated traffic metrics every second
  _metricsInterval = setInterval(() => {
    const avgLatency =
      _requestCount > 0 ? Math.round(_totalLatency / _requestCount) : 0;

    dashboard.emit("traffic:update", {
      timestamp: new Date().toISOString(),
      requestCount: _requestCount,
      errorCount: _errorCount,
      reqPerSec: _requestCount,
      avgLatency,
    });

    if (avgLatency > 0) {
      dashboard.emit("latency:update", {
        timestamp: new Date().toISOString(),
        avgLatency,
      });
    }

    // Reset counters for next interval
    _requestCount = 0;
    _errorCount = 0;
    _totalLatency = 0;
  }, 1000);

  logger.info("[WebSocket] Socket.io server initialized");
  return io;
}

function getIO() {
  return io;
}

function getDashboardNamespace() {
  return io ? io.of("/dashboard") : null;
}

/** Record a request for the periodic traffic snapshot. */
function recordRequest(latency, isError) {
  _requestCount += 1;
  _totalLatency += latency || 0;
  if (isError) _errorCount += 1;
}

/** Emit a new error event to all dashboard clients. */
function emitError(errorData) {
  const ns = getDashboardNamespace();
  if (ns) ns.emit("error:new", errorData);
}

/** Emit a circuit breaker state change. */
function emitCircuitChange(data) {
  const ns = getDashboardNamespace();
  if (ns) ns.emit("circuit:change", data);
}

/** Emit a new alert. */
function emitAlert(alert) {
  const ns = getDashboardNamespace();
  if (ns) ns.emit("alert:new", alert);
}

/** Emit a new log entry. */
function emitLog(logEntry) {
  const ns = getDashboardNamespace();
  if (ns) ns.emit("log:new", logEntry);
}

function stopWebSocket() {
  if (_metricsInterval) clearInterval(_metricsInterval);
  if (io) io.close();
  io = null;
}

module.exports = {
  initWebSocket,
  getIO,
  getDashboardNamespace,
  recordRequest,
  emitError,
  emitCircuitChange,
  emitAlert,
  emitLog,
  stopWebSocket,
};
