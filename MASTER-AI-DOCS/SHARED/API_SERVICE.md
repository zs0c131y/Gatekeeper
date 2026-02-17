# Service: Backend API

## 1. API Contract

This service provides the main REST API for the Gatekeeper application. All endpoints are prefixed with `/api`.

## 2. Inputs

Inputs are provided as JSON in the request body for `POST` and `PUT` requests, and as query parameters for `GET` requests.

## 3. Outputs

All outputs are in JSON format. A successful request will return a `200 OK` status code with the requested data in the body. Errors will be returned with an appropriate `4xx` or `5xx` status code and a JSON body containing an `error` message.

## 4. Validation

The server validates all incoming data. Invalid data will result in a `400 Bad Request` error.

## 5. API Routes

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/analytics` | Retrieves a summary of analytics data. |
| `GET` | `/analytics/detailed` | Retrieves detailed analytics data. |
| `GET` | `/logs` | Retrieves a list of recent log entries. |
| `GET` | `/logs/search` | Searches for log entries. |
| `GET` | `/overview` | Retrieves aggregated data for the main dashboard. |
| `GET` | `/settings` | Retrieves the current system settings. |
| `POST` | `/settings` | Updates the system settings. |
| `POST` | `/auth/login` | Login with email + password, returns access + refresh tokens. |
| `POST` | `/auth/refresh` | Refresh access token using refresh token. |
| `POST` | `/auth/logout` | Blacklist current token and delete refresh token. Requires JWT. |
| `GET` | `/auth/me` | Get current authenticated user profile. Requires JWT. |
| `POST` | `/auth/change-password` | Change password with strength validation. Requires JWT. |
| `GET` | `/admin/api-keys` | List all API keys (hashes not exposed). Requires JWT + Admin. |
| `POST` | `/admin/api-keys` | Create new API key (raw key returned once). Requires JWT + Admin. |
| `PATCH` | `/admin/api-keys/:id/revoke` | Revoke an API key. Requires JWT + Admin. |
| `DELETE` | `/admin/api-keys/:id` | Permanently delete an API key. Requires JWT + Admin. |

## 6. Performance Notes

*   Endpoints that query large amounts of data (e.g., `/logs/search`) may have higher latency.
*   Pagination is used on endpoints that can return large lists of items.
*   Caching is used for frequently accessed, non-volatile data to improve response times.
