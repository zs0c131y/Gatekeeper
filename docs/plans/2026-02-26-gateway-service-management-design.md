# Gateway Service Management — Design Document

**Date:** 2026-02-26
**Status:** Approved

## Problem

The gateway database contains 5 stale Docker-only backends that are unreachable outside Docker, showing 0% health. Health status thresholds are hardcoded globally. Route disabling uses a primitive `window.confirm` with no emergency path. There is no DDoS auto-protection.

## Goals

1. Remove 5 stale Docker backends and their routes from the database.
2. Let users configure per-backend health thresholds (healthy / degraded / unhealthy).
3. Route disabling requires a proper confirmation dialog; emergencies have a panic button.
4. DDoS auto-disable: configurable RPM threshold, auto-disables route + creates Alert.

---

## Section 1 — DB Cleanup

Delete the following backends and all routes referencing them:
- `users-service`, `inventory-service`, `payments-service`, `products-service`, `orders-service`

Keep: `Temp Server 1` (`localhost:3001`), `Temp Server 2` (`localhost:3002`).

**Implementation:** one-time Node script using Mongoose. No model changes needed.

---

## Section 2 — Per-Backend Health Thresholds

### Model Change (`Backend.js`)

Add two fields:
```js
healthyAbove:  { type: Number, default: 80 }   // score >= this → healthy
degradedAbove: { type: Number, default: 50 }   // score >= this → degraded, else unhealthy
```

### Backend Logic

Replace the hardcoded `score >= 80 / score >= 50` checks in `settings.js` (`getBackendsView`), `overview.js` (`getHealthScoreRaw` usage), and `healthCheck.js` (`scoreToStatus`) with per-backend threshold lookups.

Since `scoreToStatus` currently receives only a score (not the backend object), it will be refactored to accept `(score, thresholds)` where `thresholds = { healthyAbove, degradedAbove }`.

### UI Change (`Settings.jsx` — BackendModal)

Add two number inputs below the existing fields:
- **Healthy above** (0–100, default 80) — tooltip: "Score at or above this = healthy"
- **Degraded above** (0–100, default 50) — tooltip: "Score at or above this = degraded; below = unhealthy"

A small color legend (green/yellow/red) shows the resulting ranges as the user types.

---

## Section 3 — Route Disable Confirmation + Panic Button

### Normal Disable Flow

When a user toggles a route's active state to `false` (or clicks a "Disable" button):
1. A `<Dialog>` opens (replaces `window.confirm`) showing:
   - Route: `METHOD /path`
   - Target: backend name
   - Warning: "Traffic to this backend will stop immediately."
2. Buttons: **Cancel** | **Disable Route** (amber/destructive style)

Re-enabling a disabled route does **not** require confirmation.

### Panic Button (Force Kill)

Each route row gets a `<Zap>` icon button (red, right-most action):
- Labeled "Kill" on hover
- Bypasses the confirmation dialog entirely
- Immediately calls `PUT /api/settings/routes/:id` with `{ isActive: false }`
- Shows a brief "Route killed" toast notification

**UI-only change.** The existing `PUT /api/settings/routes/:id` API already accepts `isActive`.

---

## Section 4 — DDoS Auto-Detect

### New Config Setting

Key: `routing.ddos_threshold_rpm`, default: `500`
Added to `seed.js` and exposed in the General Settings tab as **"DDoS Auto-disable Threshold (RPM)"**.

### Detection Mechanism (`proxy.js`)

After each proxied request completes (in the `finally` block):
1. `INCR gk:ddos:{routePath}` in Redis (fire-and-forget, non-blocking).
2. `EXPIRE gk:ddos:{routePath} 60` on first creation (sliding 60s window).
3. Read the current count. If `count > ddos_threshold_rpm`:
   - `Route.findOneAndUpdate({ path: routePath, isActive: true }, { isActive: false })`
   - `Alert.create({ type: 'ddos', message: 'Route /path auto-disabled: N req/min exceeded threshold T' })`
   - `console.warn(...)` server-side

### Re-enable

Auto-disabled routes must be re-enabled manually by an admin in the Routes tab (goes through the normal toggle → confirmation dialog flow). No auto-recovery.

### Fallback (no Redis)

If Redis is unavailable, the DDoS counter is skipped silently. Panic button still works.

---

## Files Changed

| File | Change |
|------|--------|
| `backend/src/models/Backend.js` | Add `healthyAbove`, `degradedAbove` fields |
| `backend/routes/settings.js` | Read/write threshold fields; use them in `getBackendsView` |
| `backend/routes/overview.js` | Use per-backend thresholds for status classification |
| `backend/src/services/healthCheck.js` | Refactor `scoreToStatus(score, thresholds)` |
| `backend/src/middleware/proxy.js` | Add DDoS Redis counter + auto-disable logic |
| `backend/src/config/seed.js` | Add `routing.ddos_threshold_rpm` config |
| `frontend/src/Dashboard/pages/Settings.jsx` | Confirmation dialog, panic button, threshold fields, DDoS setting |
| *(one-time run)* | DB cleanup script |
