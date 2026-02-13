const { Router } = require("express");
const data = require("../data/mockData");

const router = Router();

// GET /api/logs?page=1&limit=25&method=GET&status=4xx&search=trace-abc&clientIp=192
router.get("/", (req, res) => {
  const { page, limit, method, status, search, clientIp } = req.query;
  const result = data.getLogs({
    page:     parseInt(page)  || 1,
    limit:    Math.min(parseInt(limit) || 25, 100),
    method,
    status,
    search,
    clientIp,
  });
  res.json(result);
});

// GET /api/logs/:id
router.get("/:id", (req, res) => {
  const log = data.getLogById(req.params.id);
  if (!log) return res.status(404).json({ error: "Log entry not found" });
  res.json(log);
});

// GET /api/logs/stream  — SSE for real-time log tailing
router.get("/stream/live", (req, res) => {
  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.flushHeaders();

  let lastId = 0;

  const send = () => {
    const { logs: recent } = data.getLogs({ page: 1, limit: 10 });
    const newEntries = recent.filter((l) => l.id > lastId);
    newEntries.reverse().forEach((l) => {
      res.write(`data: ${JSON.stringify(l)}\n\n`);
      lastId = Math.max(lastId, l.id);
    });
  };

  // Set lastId to current newest
  const { logs: init } = data.getLogs({ page: 1, limit: 1 });
  if (init.length) lastId = init[0].id;

  const interval = setInterval(send, 1000);
  req.on("close", () => clearInterval(interval));
});

module.exports = router;
