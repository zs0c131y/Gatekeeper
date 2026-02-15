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

module.exports = router;
