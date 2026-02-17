# Module: Security

## 1. Responsibility

This module is responsible for enforcing security policies on incoming requests.

## 2. Inputs

*   Incoming HTTP Request (headers, body).
*   `ApiKeys` collection from the database.
*   `Users` collection from the database.
*   CORS policies from the configuration (`ALLOWED_ORIGINS` env var).
*   Request size limits (10kb max body size).
*   JWT tokens from `Authorization: Bearer` header.
*   API keys from `x-api-key` header (configurable via `API_KEY_HEADER` env var).

## 3. Outputs

*   A decision to allow or deny a request based on authentication (JWT, API Key).
*   Sanitized request inputs (via express-validator).
*   Security headers added to the response (via helmet).
*   Enforcement of CORS policies.
*   Rate limiting on auth endpoints (100 req/15 min per IP).

## 4. Implementation Details

### JWT Authentication (`src/middleware/auth.js` → `requireJWT`)

1. Extracts Bearer token from `Authorization` header.
2. Verifies token signature and expiry using `jsonwebtoken` (`src/utils/jwt.js`).
3. Checks Redis blacklist for the token's JTI via `redisKeys.jwtBlacklist(jti)`.
4. Attaches decoded payload to `req.user` with `userId`, `role`, `jti`, `iat`, `exp`.
5. Returns `401` with error code on failure (`TOKEN_REQUIRED`, `TOKEN_REVOKED`, `TOKEN_EXPIRED`, `TOKEN_INVALID`).

### API Key Authentication (`src/middleware/auth.js` → `requireApiKey`)

1. Reads raw key from the header defined by `API_KEY_HEADER` env var (default: `x-api-key`).
2. Extracts `keyPrefix` (first 8 characters of the raw key).
3. Looks up `ApiKey` document by `keyPrefix` where `isActive: true` (`src/models/ApiKey.js`).
4. Hashes the raw key with SHA-256 and uses timing-safe comparison against stored `keyHash` (`src/utils/apiKey.js`).
5. Checks `expiresAt` for expired keys.
6. Attaches the `ApiKey` document to `req.apiKey`.
7. Updates `lastUsedAt` asynchronously (non-blocking).
8. Returns `401` with error code on failure (`API_KEY_REQUIRED`, `API_KEY_INVALID`, `API_KEY_EXPIRED`).

### Role-Based Access (`src/middleware/auth.js` → `requireRole`)

1. Factory function that accepts allowed roles (e.g., `requireRole('admin')`).
2. Must be used after `requireJWT` middleware.
3. Checks `req.user.role` against the allowed roles array.
4. Returns `403 FORBIDDEN` if role is not in the allowed list.

### Optional JWT (`src/middleware/auth.js` → `optionalJWT`)

1. Same logic as `requireJWT` but does not block if no token is present.
2. Attaches user to `req.user` if a valid token is found, otherwise continues without error.

### Security Middleware (`src/middleware/security.js` → `applySecurityMiddleware`)

1. **Helmet:** Applies security headers (XSS protection, content-type sniffing, etc.).
2. **CORS:** Configured with origins from `ALLOWED_ORIGINS` env var (comma-separated).
3. **Rate Limiting:** 100 requests per 15 minutes per IP on `/api/auth` routes.
4. **Body Size:** `express.json({ limit: '10kb' })` caps request body size.

### Input Validation (`src/middleware/validate.js`)

1. `validateLogin` — email format required, password required.
2. `validateChangePassword` — both fields required, new password strength check (min 8 chars, uppercase, lowercase, number, special char).
3. `validateCreateApiKey` — name required, clientId required, scopes must be array of strings.
4. `handleValidationErrors` — catches express-validator errors, returns `400 VALIDATION_ERROR` with structured details.

### Global Error Handler (`src/middleware/errorHandler.js`)

1. Handles Mongoose `ValidationError` (400), `CastError` (400), duplicate key error 11000 (409).
2. Handles `JsonWebTokenError` (401), `TokenExpiredError` (401).
3. Logs 5xx errors with `req.traceId`.
4. In development: includes stack trace. In production: hides internal details.
5. Consistent shape: `{ error, code }`.

## 5. File Paths

| Component | File |
| :--- | :--- |
| Auth middleware (JWT, API Key, Role, Optional JWT) | `src/middleware/auth.js` |
| Security middleware (Helmet, CORS, Rate Limit) | `src/middleware/security.js` |
| Validation middleware | `src/middleware/validate.js` |
| Global error handler | `src/middleware/errorHandler.js` |
| JWT utilities | `src/utils/jwt.js` |
| Password utilities | `src/utils/password.js` |
| API Key utilities | `src/utils/apiKey.js` |
| Auth routes | `src/routes/auth.js` |
| API Key management routes | `src/routes/apiKeys.js` |

## 6. Dependencies

*   **Data:** `ApiKeys` collection, `Users` collection.
*   **Redis:** JWT blacklist keys, refresh token storage.
*   **NPM:** `jsonwebtoken`, `bcryptjs`, `helmet`, `cors`, `express-rate-limit`, `express-validator`.

## 7. Interaction with Other Modules

*   **Request Routing:** This module acts as a gate before the request is passed to the routing module.
*   **Configuration:** Reads security settings like request size limits and CORS policies from env vars and the `Config` collection.
*   **Redis:** Uses Redis for JWT blacklisting and refresh token storage via `src/config/redisKeys.js`.
