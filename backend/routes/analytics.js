/**
 * /api/analytics — real-data implementation.
 */
const { Router } = require("express");
const Log = require("../src/models/Log");
const Analytics = require("../src/models/Analytics");
const ClientProfile = require("../src/models/ClientProfile");

const router = Router();

// GET /api/analytics/traffic?hours=24
router.get("/traffic", async (req, res, next) => {
  try {
    const hours = Math.min(parseInt(req.query.hours) || 24, 168);
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    // Try hourly Analytics documents first
    const analytics = await Analytics.find({
      period: "hour",
      timestamp: { $gte: since },
    })
      .sort({ timestamp: 1 })
      .lean();

    if (analytics.length > 0) {
      return res.json(
        analytics.map((a) => ({
          time: a.timestamp,
          successful: a.successCount,
          errors: a.errorCount,
        })),
      );
    }

    // Fallback: aggregate raw logs per hour
    const logs = await Log.find({ timestamp: { $gte: since } }).lean();
    const buckets = {};
    for (const l of logs) {
      const h = new Date(l.timestamp);
      h.setMinutes(0, 0, 0);
      const key = h.toISOString();
      if (!buckets[key]) buckets[key] = { time: key, successful: 0, errors: 0 };
      if (l.status >= 400) buckets[key].errors++;
      else buckets[key].successful++;
    }
    res.json(
      Object.values(buckets).sort(
        (a, b) => new Date(a.time) - new Date(b.time),
      ),
    );
  } catch (err) {
    next(err);
  }
});

// GET /api/analytics/latency-distribution
router.get("/latency-distribution", async (_req, res, next) => {
  try {
    const logs = await Log.find().sort({ timestamp: -1 }).limit(1000).lean();
    const ranges = [
      { range: "0-10ms", min: 0, max: 10 },
      { range: "10-50ms", min: 10, max: 50 },
      { range: "50-100ms", min: 50, max: 100 },
      { range: "100-200ms", min: 100, max: 200 },
      { range: "200-500ms", min: 200, max: 500 },
      { range: "500ms+", min: 500, max: Infinity },
    ];
    res.json(
      ranges.map((r) => ({
        range: r.range,
        count: logs.filter((l) => l.latency >= r.min && l.latency < r.max)
          .length,
      })),
    );
  } catch (err) {
    next(err);
  }
});

// GET /api/analytics/errors
router.get("/errors", async (_req, res, next) => {
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const logs = await Log.find({ timestamp: { $gte: since } }).lean();
    const c4xx = logs.filter((l) => l.status >= 400 && l.status < 500).length;
    const c5xx = logs.filter((l) => l.status >= 500).length;

    const buckets = {};
    for (const l of logs) {
      const h = new Date(l.timestamp);
      h.setMinutes(0, 0, 0);
      const key = h.toISOString();
      if (!buckets[key]) buckets[key] = { time: key, "4xx": 0, "5xx": 0 };
      if (l.status >= 400 && l.status < 500) buckets[key]["4xx"]++;
      else if (l.status >= 500) buckets[key]["5xx"]++;
    }
    res.json({
      byType: [
        { name: "4xx Client Errors", value: c4xx, color: "#f59e0b" },
        { name: "5xx Server Errors", value: c5xx, color: "#ef4444" },
      ],
      timeline: Object.values(buckets).sort(
        (a, b) => new Date(a.time) - new Date(b.time),
      ),
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/analytics/endpoints
router.get("/endpoints", async (_req, res, next) => {
  try {
    const logs = await Log.find().sort({ timestamp: -1 }).limit(2000).lean();
    const map = {};
    for (const l of logs) {
      const ep = l.endpoint;
      if (!map[ep])
        map[ep] = { endpoint: ep, requests: 0, lats: [], errors: 0 };
      map[ep].requests++;
      map[ep].lats.push(l.latency || 0);
      if (l.status >= 400) map[ep].errors++;
    }
    res.json(
      Object.values(map)
        .map((e) => {
          const sorted = [...e.lats].sort((a, b) => a - b);
          const p = (pct) =>
            sorted[Math.floor((sorted.length * pct) / 100)] || 0;
          return {
            endpoint: e.endpoint,
            requests: e.requests,
            avgLatency: Math.round(
              e.lats.reduce((s, v) => s + v, 0) / e.lats.length,
            ),
            p95: p(95),
            p99: p(99),
            successRate: parseFloat(
              (((e.requests - e.errors) / e.requests) * 100).toFixed(1),
            ),
            errors: e.errors,
          };
        })
        .sort((a, b) => b.requests - a.requests)
        .slice(0, 10),
    );
  } catch (err) {
    next(err);
  }
});

// GET /api/analytics/clients
router.get("/clients", async (_req, res, next) => {
  try {
    const profiles = await ClientProfile.find()
      .sort({ totalRequests: -1 })
      .limit(20)
      .lean();
    res.json(
      profiles.map((p) => ({
        client: p.clientId,
        requests: p.totalRequests,
        errorRate: 0,
        violations: p.blockedRequests,
        lastSeen: p.lastSeen,
        suspicious: p.isBlocked,
      })),
    );
  } catch (err) {
    next(err);
  }
});

// GET /api/analytics/summary
router.get("/summary", async (req, res, next) => {
  try {
    const hours = Math.min(parseInt(req.query.hours) || 24, 168);
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    const logs = await Log.find({ timestamp: { $gte: since } }).lean();

    const buckets = {};
    const epMap = {};
    const latencies = [];
    let c4xx = 0,
      c5xx = 0;

    for (const l of logs) {
      const h = new Date(l.timestamp);
      h.setMinutes(0, 0, 0);
      const key = h.toISOString();
      if (!buckets[key]) buckets[key] = { time: key, successful: 0, errors: 0 };
      if (l.status >= 400) {
        buckets[key].errors++;
        if (l.status < 500) c4xx++;
        else c5xx++;
      } else buckets[key].successful++;

      latencies.push(l.latency || 0);

      if (!epMap[l.endpoint])
        epMap[l.endpoint] = {
          endpoint: l.endpoint,
          requests: 0,
          lats: [],
          errors: 0,
        };
      epMap[l.endpoint].requests++;
      epMap[l.endpoint].lats.push(l.latency || 0);
      if (l.status >= 400) epMap[l.endpoint].errors++;
    }

    const traffic = Object.values(buckets).sort(
      (a, b) => new Date(a.time) - new Date(b.time),
    );
    const latSorted = [...latencies].sort((a, b) => a - b);
    const lpct = (pct) =>
      latSorted[Math.floor((latSorted.length * pct) / 100)] || 0;
    const latDist = [
      { range: "0-10ms", count: latencies.filter((v) => v < 10).length },
      {
        range: "10-50ms",
        count: latencies.filter((v) => v >= 10 && v < 50).length,
      },
      {
        range: "50-100ms",
        count: latencies.filter((v) => v >= 50 && v < 100).length,
      },
      {
        range: "100-200ms",
        count: latencies.filter((v) => v >= 100 && v < 200).length,
      },
      {
        range: "200-500ms",
        count: latencies.filter((v) => v >= 200 && v < 500).length,
      },
      { range: "500ms+", count: latencies.filter((v) => v >= 500).length },
    ];

    res.json({
      traffic,
      latencyDistribution: latDist,
      errors: {
        byType: [
          { name: "4xx Client Errors", value: c4xx, color: "#f59e0b" },
          { name: "5xx Server Errors", value: c5xx, color: "#ef4444" },
        ],
        timeline: traffic.map((t) => ({ time: t.time, "4xx": 0, "5xx": 0 })),
      },
      endpoints: Object.values(epMap)
        .map((e) => ({
          endpoint: e.endpoint,
          requests: e.requests,
          avgLatency: Math.round(
            e.lats.reduce((s, v) => s + v, 0) / (e.lats.length || 1),
          ),
          p95: lpct(95),
          p99: lpct(99),
          successRate: parseFloat(
            (((e.requests - e.errors) / e.requests) * 100).toFixed(1),
          ),
          errors: e.errors,
        }))
        .sort((a, b) => b.requests - a.requests)
        .slice(0, 10),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
