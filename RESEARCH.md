# Research: Unified Service Management & Proxy Pathing

## Context
The user wants to streamline the addition of microservices, ensuring that requests to a service like "dev" are routed to `<domain>/gateway/dev` and that links within the service don't break the subpath routing.

## Findings
### 1. Proxy Pathing & Link Rewriting
- **Current State**: The gateway uses `stripPrefix` and `addPrefix` for path transformation but doesn't inform the backend of the original prefix.
- **Requirement**: Implement `X-Forwarded-Prefix` so the backend can generate correct links.
- **Requirement**: Implement `Location` header rewriting in the proxy response to handle redirects.

### 2. Service Management (UI/UX)
- **Current State**: Users must add a `Backend` first, then a `Route` pointing to it. If they forget the route, the service doesn't "appear" in terms of routing.
- **Requirement**: A "Services" tab that creates both a Backend and a Route in one step.
- **Requirement**: Automatic route generation (e.g., if service is "dev", path is `/gateway/dev/*` and `stripPrefix` is `/gateway/dev`).

### 3. "Not getting added" Issue
- **Observation**: If a backend is added without a route, it shows up in the "Backends" tab but nothing is routed to it. The user likely expects it to "just work" after adding.

## Strategy
1. **Middleware Update**: Modify `backend/src/middleware/proxy.js` to add `X-Forwarded-Prefix` and rewrite `Location` headers.
2. **Backend API Update**: Add a "Service" orchestrator endpoint in `backend/routes/settings.js` to handle atomic creation of Backend + Route.
3. **Frontend Update**:
    - Add "Services" tab to `frontend/src/Dashboard/pages/Settings.jsx`.
    - Modify `Overview.jsx` to list "Services" (Backends with at least one matching route).
4. **Cleanup**: Remove `docs/plans/2026-02-26-gateway-service-management-design.md` and `docs/plans/2026-02-26-gateway-service-management.md`.

## Verification Plan
- **Automated**: Test proxy header injection.
- **Manual**: Create a "Service", verify Backend and Route exist, verify routing to `<domain>/gateway/service-name`.
