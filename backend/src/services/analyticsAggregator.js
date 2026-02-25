const Analytics = require("../models/Analytics");
const Log = require("../models/Log");

let timer = null;

function percentile(sorted, pct) {
  if (!sorted.length) return 0;
  const idx = Math.floor((sorted.length - 1) * (pct / 100));
  return sorted[idx] || 0;
}

function floorToMinute(date) {
  const d = new Date(date);
  d.setSeconds(0, 0);
  return d;
}

function floorToHour(date) {
  const d = new Date(date);
  d.setMinutes(0, 0, 0);
  return d;
}

function floorToDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

async function aggregatePeriod(period, bucketStart, bucketEnd) {
  const logs = await Log.find({
    timestamp: { $gte: bucketStart, $lt: bucketEnd },
  })
    .select("timestamp latency status")
    .lean();

  const totalRequests = logs.length;
  const successCount = logs.filter(
    (l) => l.status >= 200 && l.status < 400,
  ).length;
  const errorCount = totalRequests - successCount;

  const latencies = logs
    .map((l) => Number(l.latency || 0))
    .sort((a, b) => a - b);
  const avgLatency = totalRequests
    ? Math.round(latencies.reduce((sum, v) => sum + v, 0) / totalRequests)
    : 0;

  const throughput =
    totalRequests / Math.max(1, (bucketEnd - bucketStart) / 1000);

  await Analytics.findOneAndUpdate(
    { period, timestamp: bucketStart },
    {
      period,
      timestamp: bucketStart,
      totalRequests,
      successCount,
      errorCount,
      avgLatency,
      p50Latency: percentile(latencies, 50),
      p95Latency: percentile(latencies, 95),
      p99Latency: percentile(latencies, 99),
      throughput: Number(throughput.toFixed(3)),
    },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
  );
}

async function runAnalyticsAggregation() {
  const now = new Date();
  const minuteStart = floorToMinute(now);
  const hourStart = floorToHour(now);
  const dayStart = floorToDay(now);

  await Promise.allSettled([
    aggregatePeriod(
      "minute",
      minuteStart,
      new Date(minuteStart.getTime() + 60_000),
    ),
    aggregatePeriod(
      "hour",
      hourStart,
      new Date(hourStart.getTime() + 60 * 60_000),
    ),
    aggregatePeriod(
      "day",
      dayStart,
      new Date(dayStart.getTime() + 24 * 60 * 60_000),
    ),
  ]);
}

function startAnalyticsAggregationLoop() {
  if (timer) return;

  runAnalyticsAggregation().catch((err) => {
    console.error("[AnalyticsAggregator] initial run failed:", err.message);
  });

  timer = setInterval(() => {
    runAnalyticsAggregation().catch((err) => {
      console.error("[AnalyticsAggregator] run failed:", err.message);
    });
  }, 60_000);

  if (typeof timer.unref === "function") timer.unref();
}

function stopAnalyticsAggregationLoop() {
  if (!timer) return;
  clearInterval(timer);
  timer = null;
}

module.exports = {
  runAnalyticsAggregation,
  startAnalyticsAggregationLoop,
  stopAnalyticsAggregationLoop,
};
