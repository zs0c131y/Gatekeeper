/**
 * /api/logs — real-data implementation.
 */
const { Router } = require("express");
const Log = require("../src/models/Log");

const router = Router();

// SSE route must be registered BEFORE /:id to avoid being shadowed
// GET /api/logs/stream/live — SSE for real-time log tailing
router.get("/stream/live", (req, res) => {
  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.flushHeaders();

  let lastTimestamp = new Date();

  const send = async () => {
    try {
      const newLogs = await Log.find({ timestamp: { $gt: lastTimestamp } })
        .sort({ timestamp: 1 })
        .limit(10)
        .lean();
      for (const l of newLogs) {
        res.write(`data: ${JSON.stringify(l)}\n\n`);
        if (new Date(l.timestamp) > lastTimestamp)
          lastTimestamp = new Date(l.timestamp);
      }
    } catch {
      /* connection may have closed */
    }
  };

  const interval = setInterval(send, 1000);
  req.on("close", () => clearInterval(interval));
});

// GET /api/logs?page=1&limit=25&method=GET&status=4xx&search=trace-abc&clientIp=192
router.get("/", async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 25, 100);
    const { method, status, search, clientIp } = req.query;

    const filter = {};
    if (method) filter.method = method.toUpperCase();
    if (clientIp) filter.clientIp = { $regex: clientIp };
    if (search) filter.traceId = { $regex: search, $options: "i" };
    if (status) {
      const code = parseInt(status);
      if (!isNaN(code)) {
        filter.status = code;
      } else {
        const prefix = parseInt(status.charAt(0));
        filter.status = { $gte: prefix * 100, $lt: (prefix + 1) * 100 };
      }
    }

    const [logs, total] = await Promise.all([
      Log.find(filter)
        .sort({ timestamp: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Log.countDocuments(filter),
    ]);

    res.json({
      logs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/logs/:traceId
router.get("/:traceId", async (req, res, next) => {
  try {
    const log = await Log.findOne({ traceId: req.params.traceId }).lean();
    if (!log) return res.status(404).json({ error: "Log entry not found" });
    res.json(log);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
