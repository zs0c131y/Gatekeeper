# Module: Analytics

## 1. Responsibility

This module handles all API requests related to analytics data for the Gatekeeper dashboard. It retrieves, processes, and formats analytics data from the in-memory data store (mockData) and computes aggregate insights on-the-fly from recent log entries.

## 2. Workflow

1.  Receives an HTTP request on an analytics-related endpoint.
2.  Queries the data store for raw data (logs, latency buckets, client activity, etc.).
3.  Performs server-side aggregation and computation (KPIs, method breakdown, hourly traffic patterns, error rankings).
4.  Formats the data into a JSON response and sends it back to the client.

## 3. Interfaces

| Type | Name | Description |
| :--- | :--- | :--- |
| **API Route** | `GET /api/analytics/traffic?hours=N` | Hourly traffic over time (successful + errors). |
| **API Route** | `GET /api/analytics/latency-distribution` | Histogram of latency buckets (0-10ms … 500ms+). |
| **API Route** | `GET /api/analytics/errors` | Error breakdown by type (4xx/5xx) + error timeline. |
| **API Route** | `GET /api/analytics/endpoints` | Per-endpoint performance (avg, p95, p99, success rate). |
| **API Route** | `GET /api/analytics/clients` | Per-client-IP activity and suspicious flags. |
| **API Route** | `GET /api/analytics/summary` | All of the above in a single payload. |
| **API Route** | `GET /api/analytics/analysis` | **Aggregated analysis dashboard payload** — KPIs, latency distribution, HTTP method breakdown, client activity, hourly traffic heatmap, and top error endpoints. |

## 4. Dependencies

*   **Internal Data:** `mockData.js` — `getLogs()`, `getLatencyDistribution()`, `getClientActivity()`, `getErrorsByType()`, `getEndpointPerformance()`, `getTrafficOverTime()`.
*   **External Libs:** `express`.

## 5. Interaction with Other Modules

*   **Logging & Tracing:** Consumes log entries to compute KPIs, method breakdown, hourly traffic, and error rankings.
*   **Dashboard / Frontend:** Provides all data required for the Analytics page visualizations.
*   **Rate Limiting:** Error rate and latency data can inform adaptive rate limit adjustments.

## 6. Analysis Endpoint Response Schema

```json
{
  "kpi": {
    "totalRequests": 500,
    "avgLatency": 142,
    "errorRate": 28.4,
    "throughput": 1.2
  },
  "latencyDistribution": [
    { "range": "0-10ms", "count": 1200 }
  ],
  "methodBreakdown": [
    { "method": "GET", "count": 210, "color": "#10b981" }
  ],
  "clients": [
    { "client": "192.168.1.45", "requests": 5000, "errorRate": 3.2, "violations": 5, "lastSeen": "2m ago", "suspicious": false }
  ],
  "hourlyTraffic": [
    { "hour": "00:00", "requests": 45, "errors": 12 }
  ],
  "topErrorEndpoints": [
    { "endpoint": "/api/checkout", "errorCount": 42, "totalRequests": 120, "errorRate": 35.0 }
  ]
}
```
