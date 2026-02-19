# Gatekeeper API Documentation

This document provides a comprehensive overview of the available API endpoints for the Gatekeeper project.

## Base URL
The API is served at `/api`.

## Route Categories
The application currently serves two categories of routes:
1. **Core Features (Mock Data)**: Routes powered by `mockData.js`, primarily for frontend prototyping and visualization.
2. **Authentication & Admin (Real Data)**: Routes powered by MongoDB and Redis, handling user authentication and API key management.

---

## 1. Authentication & Admin Routes (Real Data)

These routes interact with the database and require authentication/authorization where specified.

### Authentication
**Base Path:** `/api/auth`

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/login` | Authenticate user and receive access/refresh tokens. | No |
| `POST` | `/refresh` | Refresh an expired access token using a refresh token. | No |
| `POST` | `/logout` | Invalidate the current session (blacklists access token, removes refresh token). | Yes (JWT) |
| `GET` | `/me` | Get profile information for the currently authenticated user. | Yes (JWT) |
| `POST` | `/change-password` | Change the password for the current user. | Yes (JWT) |

#### Request Bodies

**POST /login**
```json
{
  "email": "user@example.com",
  "password": "yourPassword123"
}
```

**POST /refresh**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR..."
}
```

**POST /change-password**
```json
{
  "currentPassword": "oldPassword123",
  "newPassword": "NewPassword123!" 
}
```
*Note: New password must be at least 8 chars, contain uppercase, lowercase, number, and special char.*

### API Keys (Admin)
**Base Path:** `/api/admin/api-keys`
**Requirement:** All routes require a valid JWT and `admin` role.

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/` | List all registered API keys. |
| `POST` | `/` | Create a new API key. Returns the raw key only once. |
| `PATCH` | `/:id/revoke` | Revoke an existing API key (sets `isActive` to false). |
| `DELETE` | `/:id` | Permanently delete an API key. |

#### Request Bodies

**POST /** (Create API Key)
```json
{
  "name": "Service A Key",
  "clientId": "service-a",
  "scopes": ["read:users", "write:logs"],    // Optional
  "rateLimit": 1000,                         // Optional
  "expiresAt": "2024-12-31T23:59:59Z"        // Optional
}
```

---

## 2. Core Feature Routes (Mock Data)

These routes currently return simulated data for the dashboard features.

### Overview
**Base Path:** `/api/overview`

| Method | Endpoint | Query Params | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/metrics` | - | General system metrics (requests, errors, latency, etc.). |
| `GET` | `/traffic` | `seconds` (default: 60) | Traffic volume data for the last N seconds. |
| `GET` | `/traffic/stream` | - | Server-Sent Events (SSE) stream for real-time traffic updates. |
| `GET` | `/endpoints` | - | Top accessed endpoints. |
| `GET` | `/circuit-breakers` | - | Status of all circuit breakers. |
| `POST` | `/circuit-breakers/:name/trip` | - | Manually open (trip) a specific circuit breaker. |
| `POST` | `/circuit-breakers/:name/reset` | - | Reset a circuit breaker (close it). |
| `GET` | `/alerts` | - | Recent system alerts. |

*(No specific request bodies required for Overview POST routes, they act on the URL parameter :name)*

### Analytics
**Base Path:** `/api/analytics`

| Method | Endpoint | Query Params | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/traffic` | `hours` (default: 24) | Traffic data points for the specified duration. |
| `GET` | `/latency-distribution` | - | Distribution of request latencies. |
| `GET` | `/errors` | - | Error breakdown by type and timeline. |
| `GET` | `/endpoints` | - | Comprehensive performance metrics per endpoint. |
| `GET` | `/clients` | - | Activity metrics by client. |
| `GET` | `/summary` | `hours` | specific aggregation of all analytics data in one call. |

### Logs
**Base Path:** `/api/logs`

| Method | Endpoint | Query Params | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/` | `page`, `limit`, `method`, `status`, `search`, `clientIp` | Search and filter system logs. |
| `GET` | `/:id` | - | Get details of a specific log entry. |
| `GET` | `/stream/live` | - | SSE stream for real-time log tailing. |

### Settings
**Base Path:** `/api/settings`

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/` | Get all settings configurations. |
| `GET/PUT` | `/general` | Manage general application settings. |
| `GET/PUT` | `/rate-limiting` | Manage global rate limiting rules. |
| `GET/PUT` | `/circuit-breakers` | Configure circuit breaker thresholds. |
| `GET` | `/backends` | List configured backend services. |
| `POST` | `/backends` | Add a new backend service. |
| `PUT` | `/backends/:name` | Update an existing backend service. |
| `DELETE` | `/backends/:name` | Remove a backend service. |
| `GET/PUT` | `/security` | Manage security polices. |
| `GET/PUT` | `/alerts` | Configure alerting rules. |
| `GET` | `/api-keys` | List API keys (Mock implementation). |
| `POST` | `/api-keys` | Generate a new API key (Mock implementation). |
| `DELETE` | `/api-keys/:id` | Revoke an API key (Mock implementation). |

#### Request Bodies

**PUT /general**
```json
{
  "gatewayName": "Gatekeeper API Gateway",
  "loggingLevel": "debug",
  "logRetentionDays": 60,
  "adaptiveRateLimiting": true,
  "circuitBreaking": true,
  "realtimeAnalytics": true
}
```

**PUT /rate-limiting**
```json
{
  "global": { 
    "requestsPerMinute": 2000, 
    "burstAllowance": 150 
  },
  "adaptive": { 
    "enabled": true, 
    "sensitivity": "High", 
    "minLimit": 50, 
    "maxLimit": 5000 
  }
}
```

**PUT /circuit-breakers**
```json
{
  "failureThreshold": 40,
  "requestCount": 20,
  "timeoutSeconds": 90
}
```

**POST /backends**
```json
{
  "name": "new-service",
  "url": "http://localhost:3005",
  "healthPath": "/health",
  "weight": 1
}
```

**PUT /backends/:name**
```json
{
  "url": "http://localhost:3006",
  "weight": 2
}
```

**PUT /security**
```json
{
  "jwtExpiration": "2h",
  "mfaEnabled": false,
  "ipAccessControl": true,
  "ipRules": {
    "blacklist": ["192.0.2.200"]
  }
}
```

**PUT /alerts**
```json
{
  "notifications": {
    "email": "admin@example.com",
    "webhookUrl": "https://slack.com/webhook/..."
  }
}
```
