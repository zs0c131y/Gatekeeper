# Data Structures

## 1. MongoDB Collections

| Collection | Description |
| :--- | :--- |
| `Configs` | Stores system configuration that can be dynamically updated. |
| `Backends` | Stores definitions of registered backend services. |
| `Routes` | Stores the routing rules for the gateway. |
| `Logs` | Stores a log entry for every request processed by the gateway. |
| `Analytics` | Stores aggregated metrics for performance and traffic analysis. |
| `ClientProfiles` | Stores data for tracking the behavior of individual clients. |
| `ApiKeys` | Stores API keys used for authentication. |
| `Alerts` | Stores system notifications and alerts. |

## 2. Redis Data Structures

| Key Type | Description |
| :--- | :--- |
| **Rate Limit Counters** | Stores the current token bucket count for each client. |
| **Circuit States** | Stores the current state (`CLOSED`, `OPEN`, `HALF_OPEN`) for each backend service's circuit breaker. |
| **Health Scores** | Stores the calculated health score for each backend service. |
| **Real-time Metrics** | Caches frequently accessed metrics for the dashboard. |

## 3. Individual Schemas

### Log Entry

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | `number` | Unique identifier for the log entry. |
| `timestamp` | `string` | ISO 8601 timestamp of the request. |
| `method` | `string` | HTTP method of the request. |
| `endpoint` | `string` | Requested API endpoint. |
| `status` | `number` | HTTP status code of the response. |
| `latency` | `number` | Request processing time in milliseconds. |
| `clientIp` | `string` | IP address of the client. |
| `traceId` | `string` | Unique identifier for tracing the request. |
| `gatewayOverhead`| `number` | Overhead added by the gateway in milliseconds. |

### Circuit Breaker

| Field | Type | Description |
| :--- | :--- | :--- |
| `name` | `string` | Name of the associated service. |
| `state` | `string` | Current state: "CLOSED", "OPEN", or "HALF_OPEN". |
| `health` | `number` | Health score of the service (0-100). |
| `lastChange` | `string` | Human-readable time since the last state change. |

### Alert

| Field | Type | Description |
| :--- | :--- | :--- |
| `type` | `string` | Alert type: "error", "warning", or "info". |
| `msg` | `string` | The alert message. |
