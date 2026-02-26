# Gateway Service Management Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove stale Docker backends, add per-backend health thresholds, replace route disable with a proper confirmation dialog + panic kill button, and add DDoS auto-disable with a configurable RPM threshold.

**Architecture:** Four independent layers of change: (1) one-time DB cleanup, (2) Backend model + API + health logic for per-backend thresholds, (3) proxy middleware for DDoS counter, (4) frontend Settings UI for all three user-facing features. Each task ends with a commit. No new dependencies required — uses existing Mongoose, Redis, and shadcn/ui primitives.

**Tech Stack:** Express/Mongoose backend, React + shadcn/ui frontend, Redis for DDoS counter, MongoDB Atlas for persistence.

---

## Task 1: Remove stale Docker backends and their routes

**Files:**
- Run: `backend/scripts/` (one-time script, delete after use)

**Step 1: Run the cleanup directly from Node**

```bash
cd backend && node -e "
require('dotenv').config();
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const Backend = require('./src/models/Backend');
  const Route = require('./src/models/Route');

  const staleNames = [
    'users-service',
    'inventory-service',
    'payments-service',
    'products-service',
    'orders-service',
  ];

  const stale = await Backend.find({ name: { \$in: staleNames } }).lean();
  const staleIds = stale.map((b) => b._id);

  const rDel = await Route.deleteMany({ backendId: { \$in: staleIds } });
  const bDel = await Backend.deleteMany({ name: { \$in: staleNames } });

  console.log('Routes deleted:', rDel.deletedCount);
  console.log('Backends deleted:', bDel.deletedCount);
  await mongoose.disconnect();
}).catch(e => { console.error(e.message); process.exit(1); });
"
```

**Step 2: Verify**

Expected output:
```
Routes deleted: 5
Backends deleted: 5
```

Then confirm:
```bash
node -e "
require('dotenv').config();
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const Backend = require('./src/models/Backend');
  const Route = require('./src/models/Route');
  const b = await Backend.find().lean();
  const r = await Route.find().lean();
  console.log('Backends remaining:', b.map(x => x.name));
  console.log('Routes remaining:', r.map(x => x.path));
  await mongoose.disconnect();
});
"
```

Expected: only `Temp Server 1`, `Temp Server 2` and their two routes.

**Step 3: Commit**

```bash
cd .. && git add -A && git commit -m "chore: remove stale Docker-only backends and their routes"
```

---

## Task 2: Add healthyAbove / degradedAbove to Backend model

**Files:**
- Modify: `backend/src/models/Backend.js`

**Step 1: Add the two new fields to the schema**

Open `backend/src/models/Backend.js`. After the `timeout` field and before the closing of the schema definition, add:

```js
    healthyAbove: {
      type: Number,
      default: 80,
      min: 0,
      max: 100,
    },
    degradedAbove: {
      type: Number,
      default: 50,
      min: 0,
      max: 100,
    },
```

The full schema field list should now read: `name`, `baseUrl`, `healthCheckPath`, `isActive`, `weight`, `timeout`, `healthyAbove`, `degradedAbove`, `tags`.

**Step 2: Verify schema loads without error**

```bash
cd backend && node -e "const B = require('./src/models/Backend'); console.log('fields:', Object.keys(B.schema.paths).join(', '))"
```

Expected output includes: `healthyAbove, degradedAbove`

**Step 3: Commit**

```bash
git add backend/src/models/Backend.js
git commit -m "feat: add healthyAbove and degradedAbove threshold fields to Backend model"
```

---

## Task 3: Refactor scoreToStatus to use per-backend thresholds

**Files:**
- Modify: `backend/src/services/healthCheck.js`
- Modify: `backend/routes/overview.js`
- Modify: `backend/routes/settings.js`

**Step 1: Update `scoreToStatus` in `healthCheck.js`**

The current signature is `scoreToStatus(score)`. Change it to accept an optional `thresholds` argument:

```js
function scoreToStatus(score, thresholds = {}) {
  const n = score === null || score === undefined ? null : parseInt(score, 10);
  if (n === null || Number.isNaN(n)) return "unknown";
  const healthyAbove = thresholds.healthyAbove ?? 80;
  const degradedAbove = thresholds.degradedAbove ?? 50;
  if (n >= healthyAbove) return "healthy";
  if (n >= degradedAbove) return "degraded";
  return "unhealthy";
}
```

**Step 2: Update `getBackendsView` in `backend/routes/settings.js`**

Inside the `backends.map(async (b) => { ... })` block, change the status computation. Find this block (around line 122–128):

```js
      const status =
        score === null
          ? "unknown"
          : score >= 80
            ? "healthy"
            : score >= 50
              ? "degraded"
              : "unhealthy";
```

Replace it with:

```js
      const status = scoreToStatus(score, {
        healthyAbove: b.healthyAbove,
        degradedAbove: b.degradedAbove,
      });
```

Add the import at the top of `settings.js` (it already imports from healthCheck for `scoreToStatus` if it does — check first):

```js
const { scoreToStatus } = require("../src/services/healthCheck");
```

**Step 3: Update `overview.js` `getBackendsView` equivalent**

In `backend/routes/overview.js`, inside the `dbBackends.map(async (b) => { ... })` block (around line 126–142), find:

```js
          status: scoreToStatus(score),
```

Change to:

```js
          status: scoreToStatus(score, {
            healthyAbove: b.healthyAbove,
            degradedAbove: b.degradedAbove,
          }),
```

**Step 4: Update `settings.js` backend create/update to pass through threshold fields**

In the `POST /backends` handler (around line 320–348), add to the `Backend.create(...)` call:

```js
      const backend = await Backend.create({
        name,
        baseUrl: url,
        healthCheckPath: healthPath || "/health",
        weight: weight || 1,
        timeout: timeout || 5000,
        healthyAbove: req.body.healthyAbove ?? 80,
        degradedAbove: req.body.degradedAbove ?? 50,
      });
```

In the `PUT /backends/:nameOrId` handler (around line 351–392), add inside the `update` object construction:

```js
      if (req.body.healthyAbove !== undefined) update.healthyAbove = req.body.healthyAbove;
      if (req.body.degradedAbove !== undefined) update.degradedAbove = req.body.degradedAbove;
```

**Step 5: Expose threshold fields in `getBackendsView`**

In `settings.js` `getBackendsView`, the `shape` object (around line 131–152) should include the new fields:

```js
      const shape = {
        _id: b._id,
        id: b._id,
        name: b.name,
        url: b.baseUrl,
        healthPath: b.healthCheckPath,
        weight: b.weight,
        timeout: b.timeout,
        isActive: b.isActive,
        healthyAbove: b.healthyAbove ?? 80,
        degradedAbove: b.degradedAbove ?? 50,
        status,
        healthScore: score,
        circuitState,
      };
```

**Step 6: Verify**

```bash
curl -s http://localhost:3000/api/settings/backends | node -e "
const d = JSON.parse(require('fs').readFileSync(0,'utf8'));
d.backends.forEach(b => console.log(b.name, 'healthyAbove:', b.healthyAbove, 'degradedAbove:', b.degradedAbove));
"
```

Expected: both temp servers shown with `healthyAbove: 80, degradedAbove: 50`.

**Step 7: Commit**

```bash
git add backend/src/services/healthCheck.js backend/routes/overview.js backend/routes/settings.js
git commit -m "feat: refactor scoreToStatus to use per-backend health thresholds"
```

---

## Task 4: Add DDoS Redis key to redisKeys

**Files:**
- Modify: `backend/src/config/redisKeys.js`

**Step 1: Add the DDoS counter key**

Open `backend/src/config/redisKeys.js`. Add to the `redisKeys` object, before the closing `};`:

```js
  // DDoS auto-disable counters (60s sliding window)
  /** @param {string} routePath */
  ddosCounter: (routePath) => `ddos:rps:${routePath}`,
```

**Step 2: Verify**

```bash
cd backend && node -e "const k = require('./src/config/redisKeys'); console.log(k.ddosCounter('/temp1/*'))"
```

Expected: `ddos:rps:/temp1/*`

**Step 3: Commit**

```bash
git add backend/src/config/redisKeys.js
git commit -m "feat: add ddosCounter Redis key helper"
```

---

## Task 5: Add DDoS threshold config to seed

**Files:**
- Modify: `backend/src/config/seed.js`

**Step 1: Add the config entry**

In `seed.js`, inside the `DEFAULT_CONFIGS` array, add a new entry after the last existing config:

```js
  {
    key: "routing.ddos_threshold_rpm",
    value: 500,
    description: "Requests per minute per route that triggers automatic route disable (DDoS protection)",
    category: "routing",
  },
```

**Step 2: Upsert it into the DB right now** (since the server already ran seed once without it):

```bash
cd backend && node -e "
require('dotenv').config();
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const Config = require('./src/models/Config');
  await Config.findOneAndUpdate(
    { key: 'routing.ddos_threshold_rpm' },
    { key: 'routing.ddos_threshold_rpm', value: 500, description: 'DDoS auto-disable threshold (RPM)', category: 'routing', isActive: true },
    { upsert: true }
  );
  console.log('DDoS threshold config seeded');
  await mongoose.disconnect();
});
"
```

**Step 3: Verify**

```bash
curl -s http://localhost:3000/api/settings/general | node -e "const d=JSON.parse(require('fs').readFileSync(0,'utf8')); console.log(JSON.stringify(d,null,2))" 2>&1 | head -30
```

**Step 4: Commit**

```bash
git add backend/src/config/seed.js
git commit -m "feat: add routing.ddos_threshold_rpm to default config seed"
```

---

## Task 6: Expose DDoS threshold in the Settings API

**Files:**
- Modify: `backend/routes/settings.js`

**Step 1: Add DDoS threshold to `getGeneralSettings`**

In the `getGeneralSettings` function (around line 55–65), add one more field:

```js
async function getGeneralSettings() {
  const m = await getCategoryMap("general");
  const routing = await getCategoryMap("routing");
  return {
    gatewayName: m["general.gateway_name"] ?? "Gatekeeper API Gateway",
    loggingLevel: m["general.logging_level"] ?? "info",
    logRetentionDays: m["general.log_retention_days"] ?? 30,
    adaptiveRateLimiting: m["general.adaptive_rate_limiting"] ?? true,
    circuitBreaking: m["general.circuit_breaking"] ?? true,
    realtimeAnalytics: m["general.realtime_analytics"] ?? true,
    ddosThresholdRpm: routing["routing.ddos_threshold_rpm"] ?? 500,
  };
}
```

**Step 2: Add DDoS threshold to `updateGeneral`**

In the `updateGeneral` function (around line 157–172), add to the `fields` object:

```js
    "routing.ddos_threshold_rpm": payload.ddosThresholdRpm,
```

Also update `invalidateConfigDependents` in `settings.js` to handle it (it will do nothing extra — it only affects the proxy inline, no cache to invalidate). No change needed there.

**Step 3: Verify the API returns the new field**

```bash
curl -s http://localhost:3000/api/settings/general
```

Expected: JSON includes `"ddosThresholdRpm": 500`

**Step 4: Commit**

```bash
git add backend/routes/settings.js
git commit -m "feat: expose ddosThresholdRpm in general settings API"
```

---

## Task 7: Add DDoS auto-detect to proxy middleware

**Files:**
- Modify: `backend/src/middleware/proxy.js`

**Step 1: Add import for Config and Route model at top of proxy.js**

`proxy.js` already imports `Config`. Check line 17: `const Config = require("../models/Config");`

Add Route model import after it:
```js
const Route = require("../models/Route");
const Alert = require("../models/Alert");
```

Also ensure redisKeys is imported — add if not present:
```js
const redisKeys = require("../config/redisKeys");
```

And the getRedisClient import:
```js
const { getRedisClient } = require("../config/database");
```

**Step 2: Add DDoS threshold reader function** (with 30s cache, same pattern as `getGlobalCustomHeaders`)

Add this function after `getGlobalCustomHeaders`:

```js
let _ddosThresholdCache = null;
let _ddosThresholdCachedAt = 0;

async function getDdosThreshold() {
  const now = Date.now();
  if (_ddosThresholdCache !== null && now - _ddosThresholdCachedAt < 30_000) {
    return _ddosThresholdCache;
  }
  try {
    const doc = await Config.findOne({
      key: "routing.ddos_threshold_rpm",
      isActive: true,
    }).lean();
    _ddosThresholdCache = Number(doc?.value ?? 500);
  } catch {
    _ddosThresholdCache = 500;
  }
  _ddosThresholdCachedAt = now;
  return _ddosThresholdCache;
}
```

**Step 3: Add `checkDdos` function**

Add this function after `getDdosThreshold`:

```js
async function checkDdos(routePath) {
  const redis = getRedisClient();
  if (!redis) return; // graceful degradation

  try {
    const key = redisKeys.ddosCounter(routePath);
    const count = await redis.incr(key);
    if (count === 1) {
      // First request in window — set 60s TTL
      await redis.expire(key, 60);
    }

    const threshold = await getDdosThreshold();
    if (count > threshold) {
      // Auto-disable the route. Use updateOne so it's idempotent.
      const updated = await Route.findOneAndUpdate(
        { path: routePath, isActive: true },
        { isActive: false },
        { returnDocument: "after" },
      );

      if (updated) {
        await Alert.create({
          type: "ddos",
          message: `Route ${routePath} auto-disabled: ${count} req/min exceeded threshold ${threshold}`,
          isRead: false,
        });
        console.warn(
          `[DDoS] Auto-disabled route ${routePath}: ${count} req/min > ${threshold} threshold`,
        );
      }
    }
  } catch (err) {
    // Never let DDoS check crash a proxied request
    console.error("[DDoS] check error:", err.message);
  }
}
```

**Step 4: Call `checkDdos` in the proxy handler**

In `createProxyMiddleware`, inside the `finally` block, add a fire-and-forget call after `writeLog(...)`:

```js
    } finally {
      const latency = Date.now() - start;

      writeLog({
        traceId,
        timestamp: new Date(),
        method: req.method,
        endpoint: req.path,
        status: statusCode,
        latency,
        gatewayOverhead: Math.min(latency, 15),
        clientIp: req.ip || "0.0.0.0",
        backendId: backend._id ?? undefined,
        apiKeyId: req.apiKey?._id ?? undefined,
        userId: req.user?.userId ?? undefined,
        errorMessage,
        source: "gateway",
        requestSize: req.headers["content-length"]
          ? parseInt(req.headers["content-length"], 10)
          : undefined,
      });

      // Fire-and-forget DDoS check — never blocks the response
      checkDdos(req.path).catch(() => {});
    }
```

**Step 5: Export the threshold invalidator** (so settings API can bust the cache on save):

At the bottom of proxy.js where exports are defined, add:

```js
function invalidateDdosThresholdCache() {
  _ddosThresholdCache = null;
  _ddosThresholdCachedAt = 0;
}

module.exports = {
  createProxyMiddleware,
  transformPath,
  getGlobalCustomHeaders,
  invalidateProxyConfigCache,
  invalidateDdosThresholdCache,
};
```

**Step 6: Wire the cache invalidation in settings.js**

In `settings.js`, update the import of proxy:

```js
const {
  invalidateProxyConfigCache,
  invalidateDdosThresholdCache,
} = require("../src/middleware/proxy");
```

In `invalidateConfigDependents`:

```js
function invalidateConfigDependents(key) {
  if (key.startsWith("rate_limiting.")) invalidateRateLimitConfigCache();
  if (key.startsWith("circuit_breaker.")) invalidateCircuitBreakerConfigCache();
  if (key === "routing.custom_headers") invalidateProxyConfigCache();
  if (key === "routing.ddos_threshold_rpm") invalidateDdosThresholdCache();
}
```

**Step 7: Verify DDoS detection (manual)**

Send > 500 requests to a route quickly:

```bash
for i in $(seq 1 510); do curl -s http://localhost:3000/gateway/temp1/ > /dev/null; done
```

Then check if the route got disabled:

```bash
curl -s http://localhost:3000/api/settings/routes | node -e "
const d = JSON.parse(require('fs').readFileSync(0,'utf8'));
d.routes.forEach(r => console.log(r.path, 'isActive:', r.isActive));
"
```

Expected: `/temp1/*` shows `isActive: false`

Re-enable for subsequent testing:
```bash
# Get the route ID first, then update it
curl -s http://localhost:3000/api/settings/routes | node -e "
const d = JSON.parse(require('fs').readFileSync(0,'utf8'));
d.routes.filter(r => r.path === '/temp1/*').forEach(r => console.log(r._id));
"
# Then re-enable:
# curl -X PUT http://localhost:3000/api/settings/routes/<ID> -H 'Content-Type: application/json' -d '{"isActive":true}' -H 'Authorization: Bearer <token>'
```

**Step 8: Commit**

```bash
git add backend/src/middleware/proxy.js backend/src/config/redisKeys.js backend/routes/settings.js
git commit -m "feat: add DDoS auto-detect with configurable RPM threshold and auto-route-disable"
```

---

## Task 8: Frontend — Backend modal threshold fields

**Files:**
- Modify: `frontend/src/Dashboard/pages/Settings.jsx` — `BackendModal` component only

**Step 1: Update `BackendModal` form state**

In `BackendModal`, update the initial state to include the threshold fields:

```js
function BackendModal({ initial, onClose, onSubmit }) {
  const [form, setForm] = useState({
    name: initial?.name || "",
    base_url: initial?.url || initial?.base_url || "",
    health_endpoint:
      initial?.healthPath || initial?.health_endpoint || "/health",
    weight: initial?.weight || 1,
    timeout: initial?.timeout || 5000,
    healthyAbove: initial?.healthyAbove ?? 80,
    degradedAbove: initial?.degradedAbove ?? 50,
  });
```

**Step 2: Add threshold fields to the form JSX**

After the existing `Timeout (ms)` `<Field>` element and before the submit buttons, add:

```jsx
          <div className="space-y-3 pt-2 border-t border-white/10">
            <p className="text-sm text-gray-400">Health Status Thresholds</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-gray-400">
                  Healthy above (0–100)
                </Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={form.healthyAbove}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, healthyAbove: Number(e.target.value) }))
                  }
                  className="bg-white/5 border-white/10 text-white h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-gray-400">
                  Degraded above (0–100)
                </Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={form.degradedAbove}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, degradedAbove: Number(e.target.value) }))
                  }
                  className="bg-white/5 border-white/10 text-white h-8 text-sm"
                />
              </div>
            </div>
            <div className="flex gap-2 text-xs">
              <span className="text-emerald-400">
                ● ≥{form.healthyAbove} healthy
              </span>
              <span className="text-amber-400">
                ● ≥{form.degradedAbove} degraded
              </span>
              <span className="text-red-400">
                ● &lt;{form.degradedAbove} unhealthy
              </span>
            </div>
          </div>
```

**Step 3: Verify in browser**

Navigate to Settings → Backends → click "Edit" on Temp Server 1. Confirm the modal shows "Healthy above" and "Degraded above" inputs with a color legend. Change Healthy above to 90, save. Check the backend card updates its health status accordingly on next health check.

**Step 4: Commit**

```bash
git add frontend/src/Dashboard/pages/Settings.jsx
git commit -m "feat: add per-backend health threshold inputs to BackendModal"
```

---

## Task 9: Frontend — Route disable confirmation dialog

**Files:**
- Modify: `frontend/src/Dashboard/pages/Settings.jsx` — `RoutesTab` component only

**Step 1: Add a `ConfirmDisableDialog` component**

Add this component to `Settings.jsx` above `RoutesTab`:

```jsx
function ConfirmDisableDialog({ route, onConfirm, onCancel }) {
  if (!route) return null;
  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="bg-[#111111] border-white/20 text-white max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-white">Disable Route?</DialogTitle>
          <DialogDescription className="text-gray-400 space-y-1 pt-1">
            <span className="block">
              <span className="font-mono text-amber-400">
                {route.method} {route.path}
              </span>
            </span>
            <span className="block text-sm">
              → {route.backendId?.name ?? route.backendId}
            </span>
            <span className="block text-sm text-red-400 pt-1">
              All traffic to this backend will stop immediately.
            </span>
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-2 pt-2">
          <Button
            onClick={onConfirm}
            className="flex-1 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400"
          >
            Disable Route
          </Button>
          <Button
            onClick={onCancel}
            variant="outline"
            className="flex-1 bg-white/5 hover:bg-white/10 border-white/10 text-white"
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

**Step 2: Update `RoutesTab` to use the dialog**

At the top of the `RoutesTab` function, add state:

```js
  const [confirmDisable, setConfirmDisable] = useState(null); // holds the route to disable
```

Change `handleDelete` and add a new `handleToggleActive` function:

```js
  const handleDelete = async (route) => {
    if (!window.confirm(`Delete route ${route.method} ${route.path}?`)) return;
    await api.deleteRoute(route._id);
    refetch();
  };

  const handleToggleActive = async (route, newValue) => {
    if (!newValue) {
      // Disabling — require confirmation
      setConfirmDisable(route);
      return;
    }
    // Re-enabling — no confirmation needed
    await api.updateRoute(route._id, { isActive: true });
    refetch();
  };

  const handleConfirmDisable = async () => {
    if (!confirmDisable) return;
    await api.updateRoute(confirmDisable._id, { isActive: false });
    setConfirmDisable(null);
    refetch();
  };
```

**Step 3: Replace the existing active/inactive Badge with a clickable toggle**

In the route row JSX, find the `<Badge variant={route.isActive !== false ? "success" : "destructive"}>` and replace it with a button that triggers `handleToggleActive`:

```jsx
                  <button
                    onClick={() =>
                      handleToggleActive(route, route.isActive === false)
                    }
                    className={cn(
                      "text-xs px-2 py-0.5 rounded-full border font-medium transition-colors cursor-pointer",
                      route.isActive !== false
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
                        : "bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20",
                    )}
                  >
                    {route.isActive !== false ? "Active" : "Off"}
                  </button>
```

**Step 4: Add the dialog to the JSX return**

At the end of the `RoutesTab` return, before the closing `</div>`, add:

```jsx
      <ConfirmDisableDialog
        route={confirmDisable}
        onConfirm={handleConfirmDisable}
        onCancel={() => setConfirmDisable(null)}
      />
```

Make sure `cn` is imported — it should already be at the top of the file.

**Step 5: Verify in browser**

Navigate to Settings → Routes. Click the "Active" badge on a route. Confirm a dialog appears with the route details and a "Disable Route" button. Click Cancel — route stays active. Click Disable Route — route shows "Off".

**Step 6: Commit**

```bash
git add frontend/src/Dashboard/pages/Settings.jsx
git commit -m "feat: replace window.confirm with confirmation dialog for route disable"
```

---

## Task 10: Frontend — Panic kill button per route

**Files:**
- Modify: `frontend/src/Dashboard/pages/Settings.jsx` — `RoutesTab` component only

**Step 1: Add `Zap` to the lucide imports**

Find the import at the top of `Settings.jsx`:

```js
import {
  Save,
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  Key,
  Copy,
  Shield,
  Server,
  Route,
} from "lucide-react";
```

Add `Zap` to this list.

**Step 2: Add `handleKill` function to `RoutesTab`**

Add this function alongside `handleDelete`:

```js
  const handleKill = async (route) => {
    await api.updateRoute(route._id, { isActive: false });
    refetch();
  };
```

**Step 3: Add the Kill button to each route row**

In the route row's action buttons section (the `<div className="flex gap-2 shrink-0">`), add a Kill button after the Delete button:

```jsx
                <div className="flex gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditing(route);
                      setShowModal(true);
                    }}
                    className="bg-white/5 hover:bg-white/10 border-white/10 text-white h-8 w-8 p-0"
                    title="Edit route"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(route)}
                    className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 h-8 w-8 p-0"
                    title="Delete route"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleKill(route)}
                    disabled={route.isActive === false}
                    className="bg-red-600/20 hover:bg-red-600/40 border border-red-600/40 text-red-300 h-8 w-8 p-0 shadow-[0_0_8px_rgba(220,38,38,0.3)] disabled:opacity-30 disabled:shadow-none"
                    title="Force kill — disables instantly, no confirmation"
                  >
                    <Zap className="w-3.5 h-3.5" />
                  </Button>
                </div>
```

**Step 4: Verify in browser**

Navigate to Settings → Routes. Each row should now show three icons: Edit (pencil), Delete (trash), Kill (zap). The Kill button has a red glow. Clicking it immediately disables the route with no dialog. It becomes greyed out when the route is already inactive.

**Step 5: Commit**

```bash
git add frontend/src/Dashboard/pages/Settings.jsx
git commit -m "feat: add panic kill button to route rows for instant no-confirm disable"
```

---

## Task 11: Frontend — DDoS threshold in General Settings tab

**Files:**
- Modify: `frontend/src/Dashboard/pages/Settings.jsx` — `GeneralTab` component only

**Step 1: Add `ddosThresholdRpm` to `GeneralTab` form state**

In `GeneralTab`, update the initial state:

```js
  const [form, setForm] = useState({
    gatewayName: "",
    loggingLevel: "info",
    logRetentionDays: 30,
    adaptiveRateLimiting: true,
    circuitBreaking: true,
    realtimeAnalytics: true,
    ddosThresholdRpm: 500,
  });
```

The `useEffect` that calls `setForm((prev) => ({ ...prev, ...settings }))` will automatically pick up `ddosThresholdRpm` from the API response — no changes needed there.

**Step 2: Add the DDoS threshold input to the form JSX**

In the `GeneralTab` return, after the `Log Retention (days)` input and before the toggle cards grid, add a new section:

```jsx
        <div className="space-y-2 md:col-span-2">
          <Label className="text-gray-300">
            DDoS Auto-disable Threshold (req/min per route)
          </Label>
          <Input
            type="number"
            min={10}
            value={form.ddosThresholdRpm}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                ddosThresholdRpm: Number(e.target.value),
              }))
            }
            className="bg-white/5 border-white/10 text-white"
          />
          <p className="text-xs text-gray-500">
            When any route receives more than this many requests per minute, it
            is automatically disabled and an alert is created. Re-enable
            manually from the Routes tab.
          </p>
        </div>
```

**Step 3: Verify in browser**

Navigate to Settings → General. Confirm "DDoS Auto-disable Threshold" input shows `500`. Change it to `200`, click Save. Restart nothing — the proxy middleware reads from DB with a 30s cache. After 30 seconds, new threshold is live.

**Step 4: Commit**

```bash
git add frontend/src/Dashboard/pages/Settings.jsx
git commit -m "feat: add DDoS auto-disable threshold setting to General Settings tab"
```

---

## Final Verification

1. **Dashboard** shows 2 backends, both healthy: `Active Backends: 2/2`
2. **Settings → Backends**: edit Temp Server 1, set Healthy above to 70 — save — verify status label updates on next health check
3. **Settings → Routes**: click "Active" badge → confirmation dialog appears → Cancel keeps it active
4. **Settings → Routes**: click the Zap button → route immediately shows "Off" with no dialog
5. **Settings → General**: DDoS threshold field visible and saves correctly
6. **DDoS protection**: send 510 rapid requests to a route, confirm it auto-disables and an alert appears in the Overview alerts panel

---

## Summary of All Files Changed

| File | Tasks |
|------|-------|
| `backend/src/models/Backend.js` | Task 2 |
| `backend/src/config/redisKeys.js` | Task 4 |
| `backend/src/config/seed.js` | Task 5 |
| `backend/src/services/healthCheck.js` | Task 3 |
| `backend/src/middleware/proxy.js` | Task 7 |
| `backend/routes/overview.js` | Task 3 |
| `backend/routes/settings.js` | Tasks 3, 6, 7 |
| `frontend/src/Dashboard/pages/Settings.jsx` | Tasks 8, 9, 10, 11 |
