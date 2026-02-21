# Gatekeeper API Documentation

This document provides a comprehensive overview of the available API endpoints for the Gatekeeper project.

## Base URL
The API is served at `/api`.

## Route Categories
The application currently serves two distinct categories of routes:

1.  **Production / Real Routes (MongoDB + Redis)**: Fully functional endpoints for authentication and API key management.
2.  **Prototype / Mock Routes (In-Memory)**: Simulation endpoints for the dashboard features (Overview, Analytics, Logs, Settings) backed by `mockData.js`.

---

## 1. Production Routes (Real Data)

These routes interact with the MongoDB database and Redis cache. They require proper authentication headers.

### Authentication
**Base Path:** `/api/auth`

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/register` | Register a new user (Admin only). | Yes (Admin) |
| `POST` | `/login` | Authenticate user and receive access/refresh tokens. | No |
| `POST` | `/refresh` | Refresh an expired access token using a refresh token. | No |
| `POST` | `/logout` | Invalidate the current session (blacklists access token, removes refresh token). | Yes (JWT) |
| `GET` | `/me` | Get profile information for the currently authenticated user. | Yes (JWT) |
| `POST` | `/change-password` | Change the password for the current user. | Yes (JWT) |

#### Request Bodies

**POST /register**
```json
{
  "username": "newadmin",
  "email": "admin@gateway.local",
  "password": "StrongPassword123!",
  "role": "admin" // or "viewer"
}
```

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

### API Key Management (Admin)
**Base Path:** `/api/admin/api-keys`
**Requirement:** All routes require a valid JWT via `Authorization: Bearer <token>` header AND the user must have the `admin` role.

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/` | List all registered API keys (metadata only, no raw keys). |
| `POST` | `/` | Create a new API key. Returns the raw key **once**. |
| `PATCH` | `/:id/revoke` | Revoke an existing API key (sets `isActive` to false). |
| `DELETE` | `/:id` | Permanently delete an API key. |

#### Request Bodies

**POST /** (Create API Key)
```json
{
  "name": "Service A Key",
  "clientId": "service-a",
  "scopes": ["read:users", "write:logs"],    // Optional
  "rateLimit": 1000,                         // Optional (Global default used if omitted)
  "expiresAt": "2024-12-31T23:59:59Z"        // Optional (No expiry if omitted)
}
```

**PATCH /:id/revoke**
*   No body required.
*   Action: Sets `isActive: false` in the database.

---

## 2. Prototype Routes (Mock Data)

These routes simulate a fully populated API Gateway dashboard. They do **not** persist data to the database and reset on server restart.

### Overview Dashboard
**Base Path:** `/api/overview`

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/` | Aggregated snapshot for the dashboard (metrics, traffic, top endpoints). |
| `GET` | `/metrics` | General system metrics (requests, errors, latency, etc.). |
| `GET` | `/traffic` | Traffic volume data for the last N seconds (default 60). |
| `GET` | `/traffic/stream` | Server-Sent Events (SSE) stream for real-time traffic updates. |
| `GET` | `/endpoints` | Top accessed endpoints based on mock usage. |
| `GET` | `/circuit-breakers` | Status of all simulated circuit breakers. |
| `POST` | `/circuit-breakers/:name/trip` | Manually open (trip) a specific circuit breaker. |
| `POST` | `/circuit-breakers/:name/reset` | Reset a circuit breaker (close it). |
| `GET` | `/alerts` | Recent simulated system alerts. |

### Analytics Dashboard
**Base Path:** `/api/analytics`

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/summary` | Aggregated analytics data for charts (traffic, latency, errors). |
| `GET` | `/traffic` | Traffic data points (mocked). |
| `GET` | `/latency-distribution` | Distribution of request latencies. |
| `GET` | `/errors` | Error breakdown by type and timeline. |
| `GET` | `/endpoints` | Comprehensive performance metrics per endpoint. |
| `GET` | `/clients` | Simulated client activity metrics. |

### Logs Explorer
**Base Path:** `/api/logs`

| Method | Endpoint | Query Params | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/` | `page`, `limit`, `status`, `search` | Search and filter mock logs. |
| `GET` | `/:id` | - | Get details of a specific log entry. |
| `GET` | `/stream/live` | - | SSE stream for real-time log tailing. |

### System Settings (Mock Configuration)
**Base Path:** `/api/settings`
> **Note:** These settings modify in-memory variables only. They illustrate the configuration UI flow but do not affect the actual server behavior (except within the mock data logic itself).

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET/PUT` | `/general` | Manage general application settings (mock). |
| `GET/PUT` | `/rate-limiting` | Manage rate limiting rules (mock object). |
| `GET/PUT` | `/circuit-breakers` | Configure circuit breaker thresholds (mock). |
| `GET/POST`| `/backends` | CRUD for backend services (mock list). |
| `PUT/DELETE`| `/backends/:name` | Update/Remove a backend service from the mock list. |
| `GET/PUT` | `/security` | Manage security policies (mock). |
| `GET/PUT` | `/alerts` | Configure alerting rules (mock). |
| `GET` | `/api-keys` | **[Mock]** List simulated API keys for dashboard UI demo. |
| `POST` | `/api-keys` | **[Mock]** Generate a simulated API key. |
| `DELETE` | `/api-keys/:id` | **[Mock]** Revoke a simulated API key. |

---

## 3. Discrepancy Note

You will notice two sets of API Key routes:
1.  `/api/admin/api-keys` (Real, MongoDB-backed) — Use this for actual gateway security.
2.  `/api/settings/api-keys` (Mock, Memory-backed) — Use this only to test the Settings UI components.

