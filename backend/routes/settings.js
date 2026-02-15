const { Router } = require("express");
const data = require("../data/mockData");

const router = Router();

// ── General ────────────────────────────────────────────────────────────────
router.get("/general", (_req, res) => res.json(data.getGeneralSettings()));
router.put("/general", (req, res) => res.json(data.updateGeneralSettings(req.body)));

// ── Rate Limiting ──────────────────────────────────────────────────────────
router.get("/rate-limiting", (_req, res) => res.json(data.getRateLimiting()));
router.put("/rate-limiting", (req, res) => res.json(data.updateRateLimiting(req.body)));

// ── Circuit Breakers ───────────────────────────────────────────────────────
router.get("/circuit-breakers", (_req, res) => res.json(data.getCBConfig()));
router.put("/circuit-breakers", (req, res) => res.json(data.updateCBConfig(req.body)));

// ── Backends ───────────────────────────────────────────────────────────────
router.get("/backends", (_req, res) => res.json(data.getBackends()));

router.post("/backends", (req, res) => {
  const { name, url, healthPath, weight } = req.body;
  if (!name || !url) return res.status(400).json({ error: "name and url are required" });
  const entry = data.addBackend({ name, url, healthPath: healthPath || "/health", weight: weight || 1 });
  res.status(201).json(entry);
});

router.put("/backends/:name", (req, res) => {
  const updated = data.updateBackend(req.params.name, req.body);
  if (!updated) return res.status(404).json({ error: "Backend not found" });
  res.json(updated);
});

router.delete("/backends/:name", (req, res) => {
  data.deleteBackend(req.params.name);
  res.json({ success: true });
});

// ── Security ───────────────────────────────────────────────────────────────
router.get("/security", (_req, res) => res.json(data.getSecurity()));
router.put("/security", (req, res) => res.json(data.updateSecurity(req.body)));

// ── API Keys ───────────────────────────────────────────────────────────────
router.get("/api-keys", (_req, res) => res.json(data.getApiKeys()));

router.post("/api-keys", (_req, res) => {
  const entry = data.generateApiKey();
  res.status(201).json(entry);
});

router.delete("/api-keys/:id", (req, res) => {
  data.revokeApiKey(req.params.id);
  res.json({ success: true });
});

// ── Alerts ─────────────────────────────────────────────────────────────────
router.get("/alerts", (_req, res) => res.json(data.getAlertSettings()));
router.put("/alerts", (req, res) => res.json(data.updateAlertSettings(req.body)));

// ── Full settings dump ─────────────────────────────────────────────────────
router.get("/", (_req, res) => res.json(data.getSettings()));

module.exports = router;
