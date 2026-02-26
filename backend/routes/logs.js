/**
 * /api/logs - log querying and streaming.
 */
const { Router } = require("express");
const Log = require("../src/models/Log");

const router = Router();

function normalizeLog(log) {
  if (!log) return log;
  return {
    ...log,
    trace_id: log.traceId,
    status_code: log.status,
    latency_ms: log.latency,
    client_ip: log.clientIp,
    error_message: log.errorMessage,
  };
}

router.get("/stream/live", (req, res) => {
  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.flushHeaders();

  const routesOnly = req.query.routesOnly === "true";
  let lastTimestamp = new Date();

  const send = async () => {
    try {
      const streamFilter = { timestamp: { $gt: lastTimestamp } };
      if (routesOnly) streamFilter.source = "gateway";
      const newLogs = await Log.find(streamFilter)
        .sort({ timestamp: 1 })
        .limit(25)
        .lean();

      for (const log of newLogs) {
        res.write(`data: ${JSON.stringify(normalizeLog(log))}\n\n`);
        const ts = new Date(log.timestamp);
        if (ts > lastTimestamp) lastTimestamp = ts;
      }
    } catch {
      // Ignore per tick failures to keep stream alive.
    }
  };

  const interval = setInterval(send, 1000);
  req.on("close", () => clearInterval(interval));
});

router.get("/", async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit, 10) || 25, 100);

    const method = req.query.method;
    const status = req.query.status;
    const search = req.query.search || req.query.trace_id;
    const clientIp = req.query.clientIp || req.query.client_ip;
    const endpoint = req.query.endpoint;
    const from = req.query.from;
    const to = req.query.to;

    const routesOnly = req.query.routesOnly === "true";
    const filter = {};

    if (routesOnly) filter.source = "gateway";
    if (method) filter.method = String(method).toUpperCase();
    if (clientIp) filter.clientIp = { $regex: String(clientIp), $options: "i" };
    if (endpoint) filter.endpoint = { $regex: String(endpoint), $options: "i" };
    if (search) filter.traceId = { $regex: String(search), $options: "i" };

    if (status) {
      const code = parseInt(status, 10);
      if (!Number.isNaN(code)) {
        filter.status = code;
      } else {
        const prefix = parseInt(String(status).charAt(0), 10);
        if (!Number.isNaN(prefix)) {
          filter.status = { $gte: prefix * 100, $lt: (prefix + 1) * 100 };
        }
      }
    }

    if (from || to) {
      filter.timestamp = {};
      if (from) filter.timestamp.$gte = new Date(from);
      if (to) filter.timestamp.$lte = new Date(to);
    }

    const [logs, total] = await Promise.all([
      Log.find(filter)
        .sort({ timestamp: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Log.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;
    const normalized = logs.map(normalizeLog);

    res.json({
      logs: normalized,
      total,
      page,
      limit,
      totalPages,
      pagination: {
        total,
        totalPages,
        page,
        limit,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.get("/:traceId", async (req, res, next) => {
  try {
    const log = await Log.findOne({ traceId: req.params.traceId }).lean();
    if (!log) return res.status(404).json({ error: "Log entry not found" });
    res.json(normalizeLog(log));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
