# User Guide

## Dashboard Overview

### Overview Page
The Overview page is the main dashboard, providing a real-time snapshot of your API gateway.

**Metric Cards (top row):**
- **Total Requests** — total number of proxied requests in the current window
- **Avg Latency** — average end-to-end response time in milliseconds
- **Error Rate** — percentage of 4xx + 5xx responses
- **Active Backends** — number of healthy backend services vs total registered

**Traffic Overview Chart:**
- Real-time area chart showing requests per second
- Updates every second via SSE (Server-Sent Events)
- Use the "Pause" button to freeze the chart; "Resume" to restart
- Window selector: 10 / 20 / 30 data points

**Other Panels:**
- **Top Endpoints** — most-requested gateway endpoints sorted by volume
- **Backend Services** — list of registered backends with health score, circuit breaker state, and status badge
- **Recent Alerts** — latest system alerts (circuit breaker events, DDoS triggers, etc.)

### Analytics Page
Deep-dive into gateway performance and traffic patterns.

- **Time Range Selector** — 6h / 24h / 3d / 7d
- **KPI Cards** — Total Requests, Avg Latency, Error Rate, Throughput
- **Latency Distribution** — histogram of response times by bucket
- **HTTP Method Breakdown** — pie chart of GET / POST / PUT / DELETE / PATCH
- **Traffic Heatmap** — color-coded grid showing request density by hour
- **Endpoint Performance** — table with P50, P95, P99 latency and success rate
- **Client Activity** — IP/API key based activity with threat indicators
- **Hourly Traffic Pattern** — bar chart of requests and errors by hour
- **Top Error Endpoints** — endpoints with highest error counts

**Export:** Click the "Export" button to download the full analytics data as JSON.

### Logs Page
Browse and search request logs.

**Filters:**
- **Trace ID** — search by specific trace identifier
- **Method** — filter by HTTP method
- **Status Code** — filter by response status
- **Endpoint** — filter by endpoint path

**Quick Filters:**
- **Errors only** — show only 5xx responses
- **Slow requests >1s** — show requests with latency over 1 second
- **Last hour** — show only logs from the past 60 minutes

**Live Updates:** Toggle the "Live Updates" switch to stream new logs in real time.

**Log Detail Modal:** Click the eye icon on any log row to see full request details, trace information, response breakdown, and error details.

**Export:** Click "Export CSV" to download the current filtered log view.

### Settings Page
Configure all gateway features.

| Tab | What You Can Configure |
|-----|----------------------|
| **General** | Gateway name, logging level, log retention, feature toggles (adaptive rate limiting, circuit breaking, real-time analytics), DDoS threshold |
| **Rate Limiting** | Global RPM limit, burst multiplier, manual override |
| **Circuit Breakers** | Failure threshold, recovery timeout, half-open test requests |
| **Backends** | Add / edit / delete backend services with URL, health check path, weight, timeout |
| **Routes** | Add / edit / delete routing rules with path, method, backend, strip/add prefix, auth requirement, priority |
| **Security** | JWT expiry, API key header name, API key management (create / revoke / delete) |
| **Alerts** | Enable/disable alert rules, email and webhook notification channels |

### Profile Page
- **Avatar** — upload a profile picture (auto-compressed)
- **Identity** — edit username and email
- **Preferences** — email alerts, live dashboard streaming, compact tables
- **Security** — change password with strength indicator
- **Danger Zone** — delete account (requires typing "delete" to confirm)

---

## Troubleshooting

### Backend won't start
1. Check MongoDB is running: `mongosh --eval "db.runCommand({ping:1})"`
2. Verify `.env` file exists in `backend/` with valid `MONGODB_URI`
3. Check for syntax errors: `node --check backend/server.js`

### Frontend shows "Network Error"
1. Confirm the backend is running on the expected port
2. Check `ALLOWED_ORIGINS` in `backend/.env` includes the frontend URL
3. Check browser console for CORS errors

### Rate limiting not working
1. Verify Redis is running: `redis-cli ping` should return `PONG`
2. Rate limiting fails open without Redis — requests will pass through
3. Check the rate limit config in Settings → Rate Limiting

### Circuit breaker stuck in OPEN
1. Go to Overview → Backend Services to see current state
2. Use the manual reset: POST to `/api/overview/circuit-breakers/:name/reset`
3. Verify the backend service is actually healthy

### Health checks show score=0
1. Confirm the backend service is running and reachable
2. Check the health check endpoint path in Settings → Backends
3. Default health check path is `/health` — ensure your backend implements it

---

## FAQ

**Q: Can I run without Redis?**
A: Yes. The gateway runs in "degraded mode" without Redis. Rate limiting, circuit breaker state, and health scores fall back to in-memory or fail-open behavior. Redis is recommended for production.

**Q: How do I register a new backend service?**
A: Go to Settings → Backends → "Add Backend". Enter the service name, base URL, health check path, and timeout. Then go to Settings → Routes to create a routing rule pointing to it.

**Q: How do I create an API key?**
A: Go to Settings → Security → API Keys section → "Create API Key". The key is shown once — copy it immediately. Use it in requests via the header configured in API Key Header Name.

**Q: How long are logs retained?**
A: 30 days by default (configured via a MongoDB TTL index). You can adjust the retention period in Settings → General.

**Q: Does the gateway support HTTPS?**
A: The gateway itself runs HTTP. For HTTPS, place it behind a reverse proxy (nginx, Caddy) or load balancer that terminates TLS. The production Docker Compose includes an nginx configuration.

**Q: How does adaptive rate limiting work?**
A: The gateway tracks per-endpoint traffic baselines (average latency, error rate) over rolling 10-minute windows. When latency increases above 200ms or error rate exceeds 5%, limits are automatically reduced. When traffic is low and healthy, limits increase up to 1.5x the base value. Manual override is always available in Settings.

**Q: What happens when a circuit breaker opens?**
A: Requests to that backend return 503 immediately. After the recovery timeout (default 30s), the circuit moves to HALF_OPEN and allows a limited number of test requests. If those succeed, the circuit closes. If they fail, it re-opens.
