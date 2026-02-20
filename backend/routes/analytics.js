    const { Router } = require("express");
const data = require("../data/mockData");

const router = Router();

// GET /api/analytics/traffic?hours=24
router.get("/traffic", (req, res) => {
  const hours = Math.min(parseInt(req.query.hours) || 24, 168);
  res.json(data.getTrafficOverTime(hours));
});

// GET /api/analytics/latency-distribution
router.get("/latency-distribution", (_req, res) => {
  res.json(data.getLatencyDistribution());
});

// GET /api/analytics/errors
router.get("/errors", (_req, res) => {
  res.json({
    byType:   data.getErrorsByType(),
    timeline: data.getTrafficOverTime(24).map((d) => ({
      time: d.time,
      "4xx": Math.floor(d.errors * 0.65),
      "5xx": Math.floor(d.errors * 0.35),
    })),
  });
});

// GET /api/analytics/endpoints
router.get("/endpoints", (_req, res) => {
  res.json(data.getEndpointPerformance());
});

// GET /api/analytics/clients
router.get("/clients", (_req, res) => {
  res.json(data.getClientActivity());
});

// GET /api/analytics/summary  — all in one call
router.get("/summary", (req, res) => {
  const hours = Math.min(parseInt(req.query.hours) || 24, 168);
  const traffic = data.getTrafficOverTime(hours);
  res.json({
    traffic,
    latencyDistribution: data.getLatencyDistribution(),
    errors: {
      byType:   data.getErrorsByType(),
      timeline: traffic.map((d) => ({
        time: d.time,
        "4xx": Math.floor(d.errors * 0.65),
        "5xx": Math.floor(d.errors * 0.35),
      })),
    },
    endpoints: data.getEndpointPerformance(),
    clients:   data.getClientActivity(),
  });
});

// GET /api/analytics/analysis  — aggregated analysis dashboard payload
router.get("/analysis", (_req, res) => {
  const { logs: recentLogs } = data.getLogs({ limit: 500 });

  // ── KPI Cards ───────────────────────────────────────────────────────────
  const totalRequests = recentLogs.length;
  const errors = recentLogs.filter((l) => l.status >= 400).length;
  const avgLatency = totalRequests
    ? Math.round(recentLogs.reduce((s, l) => s + l.latency, 0) / totalRequests)
    : 0;
  const errorRate = totalRequests
    ? parseFloat(((errors / totalRequests) * 100).toFixed(1))
    : 0;
  // Throughput: requests per second over the time span of recent logs
  const timeSpanMs =
    recentLogs.length >= 2
      ? new Date(recentLogs[0].timestamp) - new Date(recentLogs[recentLogs.length - 1].timestamp)
      : 1000;
  const throughput = parseFloat(((totalRequests / (timeSpanMs / 1000)) || 0).toFixed(1));

  // ── Method Breakdown ────────────────────────────────────────────────────
  const methodCounts = {};
  recentLogs.forEach((l) => {
    methodCounts[l.method] = (methodCounts[l.method] || 0) + 1;
  });
  const COLORS = { GET: "#10b981", POST: "#3b82f6", PUT: "#f59e0b", DELETE: "#ef4444", PATCH: "#8b5cf6" };
  const methodBreakdown = Object.entries(methodCounts)
    .map(([method, count]) => ({ method, count, color: COLORS[method] || "#6b7280" }))
    .sort((a, b) => b.count - a.count);

  // ── Hourly Traffic Heatmap ──────────────────────────────────────────────
  const hourlyCounts = Array(24).fill(0);
  const hourlyErrors = Array(24).fill(0);
  recentLogs.forEach((l) => {
    const hour = new Date(l.timestamp).getHours();
    hourlyCounts[hour]++;
    if (l.status >= 400) hourlyErrors[hour]++;
  });
  const hourlyTraffic = hourlyCounts.map((count, hour) => ({
    hour: `${String(hour).padStart(2, "0")}:00`,
    requests: count,
    errors: hourlyErrors[hour],
  }));

  // ── Top Error Endpoints ─────────────────────────────────────────────────
  const endpointErrors = {};
  const endpointTotal = {};
  recentLogs.forEach((l) => {
    endpointTotal[l.endpoint] = (endpointTotal[l.endpoint] || 0) + 1;
    if (l.status >= 400) endpointErrors[l.endpoint] = (endpointErrors[l.endpoint] || 0) + 1;
  });
  const topErrorEndpoints = Object.entries(endpointErrors)
    .map(([endpoint, errorCount]) => ({
      endpoint,
      errorCount,
      totalRequests: endpointTotal[endpoint] || 0,
      errorRate: parseFloat(((errorCount / (endpointTotal[endpoint] || 1)) * 100).toFixed(1)),
    }))
    .sort((a, b) => b.errorCount - a.errorCount)
    .slice(0, 10);

  res.json({
    kpi: { totalRequests, avgLatency, errorRate, throughput },
    latencyDistribution: data.getLatencyDistribution(),
    methodBreakdown,
    clients: data.getClientActivity(),
    hourlyTraffic,
    topErrorEndpoints,
  });
});

module.exports = router;
