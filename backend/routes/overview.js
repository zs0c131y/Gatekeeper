const { Router } = require("express");
const data = require("../data/mockData");

const router = Router();

// GET /api/overview  — aggregated snapshot for the dashboard
router.get("/", (_req, res) => {
  const recentLogs = data.getLogs({ limit: 100 }).logs;
  const errors = recentLogs.filter((l) => l.status >= 400).length;
  const avgLatency = recentLogs.length
    ? Math.round(
        recentLogs.reduce((s, l) => s + l.latency, 0) / recentLogs.length,
      )
    : 0;
  const errorRate = recentLogs.length
    ? parseFloat(((errors / recentLogs.length) * 100).toFixed(1))
    : 0;

  const backends = data.getBackends().map((b) => {
    const cb = data.getCircuitBreakers().find((c) => c.name === b.name) || {};
    return {
      name: b.name,
      status: b.status,
      circuitState: cb.state || "CLOSED",
      healthScore: cb.health ?? 100,
    };
  });

  const activeBackends = backends.filter((b) => b.status === "healthy").length;

  const trafficData = data.getLiveTraffic(30).map((p, i) => ({
    timestamp: Date.now() - (30 - i) * 1000,
    requests: p.requests,
  }));

  const topEndpoints = data
    .getTopEndpoints()
    .slice(0, 10)
    .map((ep) => ({
      endpoint: ep.endpoint,
      requests: ep.requests,
      avgLatency: ep.latency,
      errorRate: ep.errorRate,
    }));

  res.json({
    totalRequests: recentLogs.length,
    avgLatency,
    errorRate,
    activeBackends,
    backends,
    trafficData,
    topEndpoints,
  });
});

// GET /api/overview/metrics
router.get("/metrics", (_req, res) => {
  res.json(data.getMetrics());
});

// GET /api/overview/traffic?seconds=60
router.get("/traffic", (req, res) => {
  const seconds = Math.min(parseInt(req.query.seconds) || 60, 300);
  res.json(data.getLiveTraffic(seconds));
});

// GET /api/overview/traffic/stream  — Server-Sent Events for live traffic
router.get("/traffic/stream", (req, res) => {
  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.flushHeaders();

  const send = () => {
    const point = data.getLiveTrafficPoint();
    res.write(`data: ${JSON.stringify(point)}\n\n`);
  };

  send(); // initial point
  const interval = setInterval(send, 1000);

  req.on("close", () => clearInterval(interval));
});

// GET /api/overview/endpoints
router.get("/endpoints", (_req, res) => {
  res.json(data.getTopEndpoints());
});

// GET /api/overview/circuit-breakers
router.get("/circuit-breakers", (_req, res) => {
  res.json(data.getCircuitBreakers());
});

// POST /api/overview/circuit-breakers/:name/trip
router.post("/circuit-breakers/:name/trip", (req, res) => {
  data.manuallyTripCircuitBreaker(req.params.name);
  res.json({ success: true });
});

// POST /api/overview/circuit-breakers/:name/reset
router.post("/circuit-breakers/:name/reset", (req, res) => {
  data.resetCircuitBreaker(req.params.name);
  res.json({ success: true });
});

// GET /api/overview/alerts
router.get("/alerts", (_req, res) => {
  res.json(data.getAlerts());
});

module.exports = router;
