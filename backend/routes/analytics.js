/**
 * /api/analytics - analytics and aggregations.
 */
const { Router } = require("express");

const Log = require("../src/models/Log");
const Analytics = require("../src/models/Analytics");
const ClientProfile = require("../src/models/ClientProfile");

const router = Router();

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function percentile(sorted, pct) {
  if (!sorted.length) return 0;
  const idx = Math.floor((sorted.length - 1) * (pct / 100));
  return sorted[idx] || 0;
}

function floorToHour(date) {
  const d = new Date(date);
  d.setMinutes(0, 0, 0);
  return d;
}

async function getLogsSince(hours, limit = 25_000) {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);
  return Log.find({ timestamp: { $gte: since } })
    .sort({ timestamp: -1 })
    .limit(limit)
    .lean();
}

function bucketByHour(logs) {
  const map = {};
  logs.forEach((l) => {
    const hour = floorToHour(l.timestamp).toISOString();
    if (!map[hour]) {
      map[hour] = { time: hour, successful: 0, errors: 0, c4xx: 0, c5xx: 0 };
    }
    if (l.status >= 500) {
      map[hour].errors += 1;
      map[hour].c5xx += 1;
    } else if (l.status >= 400) {
      map[hour].errors += 1;
      map[hour].c4xx += 1;
    } else {
      map[hour].successful += 1;
    }
  });
  return Object.values(map).sort((a, b) => new Date(a.time) - new Date(b.time));
}

function buildLatencyDistribution(logs) {
  const ranges = [
    { range: "0-10ms", min: 0, max: 10 },
    { range: "10-50ms", min: 10, max: 50 },
    { range: "50-100ms", min: 50, max: 100 },
    { range: "100-200ms", min: 100, max: 200 },
    { range: "200-500ms", min: 200, max: 500 },
    { range: "500ms+", min: 500, max: Infinity },
  ];

  return ranges.map((r) => ({
    range: r.range,
    count: logs.filter((l) => l.latency >= r.min && l.latency < r.max).length,
  }));
}

function buildEndpointMetrics(logs) {
  const map = {};

  logs.forEach((l) => {
    const ep = l.endpoint;
    if (!map[ep]) {
      map[ep] = {
        endpoint: ep,
        requests: 0,
        errors: 0,
        latencies: [],
      };
    }

    map[ep].requests += 1;
    map[ep].latencies.push(toNumber(l.latency));
    if (l.status >= 400) map[ep].errors += 1;
  });

  return Object.values(map)
    .map((e) => {
      const sorted = [...e.latencies].sort((a, b) => a - b);
      const avgLatency = e.latencies.length
        ? Math.round(e.latencies.reduce((s, v) => s + v, 0) / e.latencies.length)
        : 0;

      return {
        endpoint: e.endpoint,
        requests: e.requests,
        avgLatency,
        p50: percentile(sorted, 50),
        p95: percentile(sorted, 95),
        p99: percentile(sorted, 99),
        successRate: Number((((e.requests - e.errors) / Math.max(1, e.requests)) * 100).toFixed(1)),
        errors: e.errors,
      };
    })
    .sort((a, b) => b.requests - a.requests);
}

function buildMethodBreakdown(logs) {
  const counts = {};
  logs.forEach((l) => {
    counts[l.method] = (counts[l.method] || 0) + 1;
  });

  const COLORS = {
    GET: "#10b981",
    POST: "#3b82f6",
    PUT: "#f59e0b",
    DELETE: "#ef4444",
    PATCH: "#8b5cf6",
  };

  return Object.entries(counts)
    .map(([method, count]) => ({
      method,
      count,
      color: COLORS[method] || "#6b7280",
    }))
    .sort((a, b) => b.count - a.count);
}

function buildTopErrorEndpoints(logs) {
  const totals = {};
  const errors = {};

  logs.forEach((l) => {
    totals[l.endpoint] = (totals[l.endpoint] || 0) + 1;
    if (l.status >= 400) errors[l.endpoint] = (errors[l.endpoint] || 0) + 1;
  });

  return Object.entries(errors)
    .map(([endpoint, errorCount]) => ({
      endpoint,
      errorCount,
      totalRequests: totals[endpoint] || 0,
      errorRate: Number(((errorCount / Math.max(1, totals[endpoint] || 1)) * 100).toFixed(1)),
    }))
    .sort((a, b) => b.errorCount - a.errorCount)
    .slice(0, 10);
}

router.get("/traffic", async (req, res, next) => {
  try {
    const hours = Math.min(toNumber(req.query.hours, 24), 168);
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

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

    const logs = await getLogsSince(hours);
    const buckets = bucketByHour(logs);
    res.json(buckets.map((b) => ({ time: b.time, successful: b.successful, errors: b.errors })));
  } catch (err) {
    next(err);
  }
});

router.get("/latency-distribution", async (req, res, next) => {
  try {
    const hours = Math.min(toNumber(req.query.hours, 24), 168);
    const logs = await getLogsSince(hours, 30_000);
    res.json(buildLatencyDistribution(logs));
  } catch (err) {
    next(err);
  }
});

router.get("/errors", async (req, res, next) => {
  try {
    const hours = Math.min(toNumber(req.query.hours, 24), 168);
    const logs = await getLogsSince(hours, 30_000);

    const c4xx = logs.filter((l) => l.status >= 400 && l.status < 500).length;
    const c5xx = logs.filter((l) => l.status >= 500).length;

    const timeline = bucketByHour(logs).map((b) => ({
      time: b.time,
      "4xx": b.c4xx,
      "5xx": b.c5xx,
    }));

    res.json({
      byType: [
        { name: "4xx Client Errors", value: c4xx, color: "#f59e0b" },
        { name: "5xx Server Errors", value: c5xx, color: "#ef4444" },
      ],
      timeline,
    });
  } catch (err) {
    next(err);
  }
});

router.get("/endpoints", async (req, res, next) => {
  try {
    const hours = Math.min(toNumber(req.query.hours, 24), 168);
    const logs = await getLogsSince(hours, 40_000);
    res.json(buildEndpointMetrics(logs).slice(0, 20));
  } catch (err) {
    next(err);
  }
});

router.get("/clients", async (_req, res, next) => {
  try {
    const profiles = await ClientProfile.find()
      .sort({ totalRequests: -1 })
      .limit(50)
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

router.get("/summary", async (req, res, next) => {
  try {
    const hours = Math.min(toNumber(req.query.hours, 24), 168);
    const logs = await getLogsSince(hours, 40_000);

    const trafficBuckets = bucketByHour(logs);
    const endpointMetrics = buildEndpointMetrics(logs).slice(0, 20);
    const latencies = logs.map((l) => toNumber(l.latency)).sort((a, b) => a - b);

    const c4xx = logs.filter((l) => l.status >= 400 && l.status < 500).length;
    const c5xx = logs.filter((l) => l.status >= 500).length;

    res.json({
      traffic: trafficBuckets.map((b) => ({
        time: b.time,
        successful: b.successful,
        errors: b.errors,
      })),
      latencyDistribution: buildLatencyDistribution(logs),
      latencyPercentiles: {
        p50: percentile(latencies, 50),
        p95: percentile(latencies, 95),
        p99: percentile(latencies, 99),
      },
      errors: {
        byType: [
          { name: "4xx Client Errors", value: c4xx, color: "#f59e0b" },
          { name: "5xx Server Errors", value: c5xx, color: "#ef4444" },
        ],
        timeline: trafficBuckets.map((b) => ({
          time: b.time,
          "4xx": b.c4xx,
          "5xx": b.c5xx,
        })),
      },
      endpoints: endpointMetrics,
    });
  } catch (err) {
    next(err);
  }
});

router.get("/analysis", async (req, res, next) => {
  try {
    const hours = Math.min(toNumber(req.query.hours, 24), 168);
    const logs = await getLogsSince(hours, 40_000);

    const totalRequests = logs.length;
    const errorCount = logs.filter((l) => l.status >= 400).length;
    const avgLatency = totalRequests
      ? Math.round(logs.reduce((s, l) => s + toNumber(l.latency), 0) / totalRequests)
      : 0;
    const errorRate = totalRequests
      ? Number(((errorCount / totalRequests) * 100).toFixed(1))
      : 0;

    const oldest = logs[logs.length - 1]?.timestamp;
    const newest = logs[0]?.timestamp;
    const spanSec = oldest && newest
      ? Math.max(1, (new Date(newest) - new Date(oldest)) / 1000)
      : 1;

    const throughput = Number((totalRequests / spanSec).toFixed(2));
    const trafficBuckets = bucketByHour(logs);
    const endpointMetrics = buildEndpointMetrics(logs);
    const clients = await ClientProfile.find()
      .sort({ totalRequests: -1 })
      .limit(20)
      .lean();

    res.json({
      kpi: { totalRequests, avgLatency, errorRate, throughput },
      latencyDistribution: buildLatencyDistribution(logs),
      methodBreakdown: buildMethodBreakdown(logs),
      clients: clients.map((p) => ({
        client: p.clientId,
        requests: p.totalRequests,
        errorRate: 0,
        violations: p.blockedRequests,
        lastSeen: p.lastSeen,
        suspicious: p.isBlocked,
      })),
      hourlyTraffic: trafficBuckets.map((b) => ({
        hour: new Date(b.time).toISOString().slice(11, 16),
        requests: b.successful + b.errors,
        errors: b.errors,
      })),
      topErrorEndpoints: buildTopErrorEndpoints(logs),
      endpointPerformance: endpointMetrics.slice(0, 10),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
