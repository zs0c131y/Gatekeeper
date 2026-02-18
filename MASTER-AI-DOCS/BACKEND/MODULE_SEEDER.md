# Module: Synthetic Data Seeder

## 1. Responsibility

This module generates realistic API gateway traffic data and seeds it into the project's MongoDB and Redis databases. It provides a complete dataset for development, testing, and demonstration of the gateway's monitoring and analytics capabilities.

## 2. Workflow

1.  Connects to MongoDB (`MONGODB_URI`) and Redis (`REDIS_URL`) using the same connection helpers as the main server.
2.  Optionally cleans existing seeded data if `--clean` flag is provided.
3.  Seeds **Backend** service definitions (5 services) into MongoDB.
4.  Seeds **Route** definitions (10 routes) linking endpoints to backends.
5.  Generates **Log** entries (configurable count, default 50,000) spread across a configurable date range (default 30 days) and bulk-inserts into MongoDB.
6.  Aggregates generated logs into hourly **Analytics** documents and inserts into MongoDB.
7.  Generates **Alert** entries (50) with timestamps spread across the date range.
8.  Derives **ClientProfile** documents from unique client IPs found in the logs.
9.  Seeds **Redis** with circuit breaker state, health scores, rate-limit counters, and metrics cache using the centralized `redisKeys.js` key patterns.

## 3. Interfaces

| Type | Name | Description |
| :--- | :--- | :--- |
| **CLI Script** | `node scripts/seedSyntheticData.js` | Main entry point for seeding data. |
| **CLI Option** | `--count=N` | Number of log entries to generate (default: 50000). |
| **CLI Option** | `--days=N` | Number of days to spread logs across (default: 30). |
| **CLI Option** | `--clean` | Drops existing data before seeding. |
| **Shell Script** | `scripts/seed.sh` | Convenience wrapper for Docker container execution. |

## 4. Data Seeded

### MongoDB Collections

| Collection | Count | Description |
| :--- | :--- | :--- |
| `backends` | 5 | `users-service`, `products-service`, `orders-service`, `payments-service`, `inventory-service` |
| `routes` | 10 | Endpoint-to-backend routing rules with auth and rate-limit config. |
| `logs` | Configurable | Request logs with trace IDs, latency, status codes, error messages. |
| `analytics` | ~720 per 30 days | Hourly aggregates: request counts, latency percentiles, throughput. |
| `alerts` | 50 | System alerts from `circuit_breaker`, `rate_limiter`, `health_monitor`. |
| `clientprofiles` | ~20 | Per-IP client profiles with request stats and latency averages. |

### Redis Keys

| Key Pattern | Count | Description |
| :--- | :--- | :--- |
| `cb:state:{name}` | 5 | Circuit breaker state (CLOSED, HALF_OPEN, OPEN). |
| `cb:failures:{name}` | 5 | Consecutive failure counters. |
| `cb:lastfail:{name}` | 5 | Last failure timestamps. |
| `health:score:{name}` | 5 | Backend health scores (0-100). |
| `health:lastcheck:{name}` | 5 | Last health check timestamps. |
| `rl:counter:{clientId}` | ~20 | Rate-limit request counters per client IP. |
| `rl:bucket:{clientId}` | ~20 | Token bucket state per client IP. |
| `metrics:overview` | 1 | Cached dashboard overview snapshot. |
| `metrics:cache:hour` | 1 | Cached hourly analytics summary. |

## 5. Data Distributions

| Field | Distribution |
| :--- | :--- |
| Methods | GET (40%), POST (25%), PUT (15%), DELETE (10%), PATCH (10%) |
| Status Codes | 200 (40%), 201 (15%), 204 (10%), 400 (8%), 401 (7%), 403 (5%), 404 (8%), 500 (4%), 502 (2%), 503 (1%) |
| Latency | Gaussian (mean=120ms, σ=80ms, clamped to 5-2000ms) |
| Request Size | Gaussian (mean=1200B, σ=500B) |
| Response Size | Gaussian (mean=5000B, σ=2000B) |

## 6. Dependencies

*   **Internal Models:** `Backend`, `Route`, `Log`, `Analytics`, `Alert`, `ClientProfile`
*   **Internal Config:** `src/config/redisKeys.js`, `src/config/database.js`
*   **External Libs:** `mongoose`, `ioredis`, `dotenv`, `crypto`

## 7. Interaction with Other Modules

*   **Logging & Tracing:** Seeds the `logs` collection that the logging module queries.
*   **Analytics:** Seeds the `analytics` collection and `metrics:*` Redis cache that the analytics module reads.
*   **Dashboard:** All seeded data is consumed by the frontend dashboard pages (Overview, Analytics, Logs).
*   **Circuit Breaking:** Seeds `cb:*` Redis keys that the circuit breaker module reads.
*   **Rate Limiting:** Seeds `rl:*` Redis keys that the rate limiter module checks.
*   **Health Monitoring:** Seeds `health:*` Redis keys.
