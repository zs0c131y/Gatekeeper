# Plan: Unified Microservice Management & Proxy Pathing

## Phase 1: Cleanup
- [ ] Remove old planning files:
    - `docs/plans/2026-02-26-gateway-service-management-design.md`
    - `docs/plans/2026-02-26-gateway-service-management.md`

## Phase 2: Proxy Pathing & Header Injection
- [ ] Update `backend/src/middleware/proxy.js`:
    - Inject `X-Forwarded-Prefix` based on `route.stripPrefix`.
    - Rewrite `Location` response headers for redirects to include the prefix.

## Phase 3: Unified Service API
- [ ] Add `/api/settings/services` POST endpoint to `backend/routes/settings.js`:
    - Takes `name`, `url`, `prefix` (defaults to `/gateway/{name}`).
    - Creates a `Backend` document.
    - Creates a `Route` document with `path: "{prefix}/*"`, `stripPrefix: "{prefix}"`, and `backendId: {backend._id}`.

## Phase 4: Frontend "Services" Tab
- [ ] Update `frontend/src/Dashboard/pages/Settings.jsx`:
    - Add "Services" tab as the primary management view for microservices.
    - Implement a unified "Add Service" modal that calls the new `/api/settings/services` endpoint.
    - Display "Services" list (aggregated from backends + routes).

## Phase 5: Dashboard Overview
- [ ] Update `frontend/src/Dashboard/pages/Overview.jsx`:
    - Ensure active "Services" are clearly listed, showing their status and gateway path.

## Verification
- [ ] Verify that adding a "dev" service at `http://dev:3000` creates a route `/gateway/dev/*`.
- [ ] Verify that a request to `<gateway>/gateway/dev/test` is proxied to `http://dev:3000/test`.
- [ ] Verify that `X-Forwarded-Prefix: /gateway/dev` is received by the backend.
- [ ] Verify that a 302 redirect from the backend to `/login` is rewritten by the gateway to `/gateway/dev/login`.
