# Stage 1 & 2 Documentation

## 1. Overview & Hybrid Architecture

The **Gatekeeper** project currently operates on a **Hybrid Architecture** to facilitate rapid frontend development while building a robust backend foundation.

1.  **Real Backend Core (Stages 1 & 2)**:
    *   **Authentication**: Fully functional JWT-based auth system backed by MongoDB (`users`) and Redis (token blacklisting).
    *   **Gateway Security**: Real API Key management (`apikeys`) backed by MongoDB, used to secure the actual gateway proxy routes.
    *   **Infrastructure**: MongoDB and Redis connections, error handling, and security middleware are production-ready.

2.  **Mock Dashboard Layer**:
    *   The Admin Dashboard APIs (Overview, Analytics, Logs, Configuration) are currently powered by an **In-Memory Mock Store** (`data/mockData.js`).
    *   **Why?** This allows the frontend team to build and style complex charts and tables immediately without waiting for the real metrics aggregator and log ingestion pipeline to be fully built.

> **Note:** The schemas described below exist in the codebase (`src/models/*`) and are ready for future stages, but the *dashboard endpoints* currently bypass them in favor of the mock data for demonstration purposes.

---

## 2. Database Schemas (Real & Ready)

These Mongoose models are defined in `src/models/` and are used by the Auth and Admin/API-Key routes.

### 2.1 Users (`users`)
**Status: ACTIVE (Used by Auth System)**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `username` | String | Yes | Unique, trimmed, lowercase |
| `email` | String | Yes | Unique, trimmed, lowercase, validated format |
| `passwordHash` | String | Yes | bcrypt hashed (saltRounds: 12) |
| `role` | String | Yes | Enum: `admin`, `viewer`. Default: `viewer` |
| `isActive` | Boolean | Yes | Default: `true` |
| `lastLogin` | Date | No | Updated on each successful login |
| `createdAt` | Date | Auto | Mongoose timestamps |
| `updatedAt` | Date | Auto | Mongoose timestamps |

**Indexes:** `email` (unique), `username` (unique)

### 2.2 API Keys (`apikeys`)
**Status: ACTIVE (Used by Admin Keys API)**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `keyHash` | String | Yes | SHA-256 hash of the raw key |
| `keyPrefix` | String | Yes | First 8 chars of raw key |
| `name` | String | Yes | Human-readable label |
| `clientId` | String | Yes | Client identifier |
| `scopes` | [String] | No | Allowed scopes e.g. `['read', 'write']` |
| `rateLimit` | Number | No | Custom req/min override |
| `isActive` | Boolean | Yes | Default: `true` |
| `expiresAt` | Date | No | Optional expiry |
| `lastUsedAt` | Date | No | Updated on each use |
| `createdAt` | Date | Auto | Mongoose timestamps |
| `updatedAt` | Date | Auto | Mongoose timestamps |

**Indexes:** `keyPrefix`, `clientId`

### 2.3 - 2.9 (Future Integration)
The following schemas are defined but their corresponding API endpoints are currently serving **Mock Data**.

*   **Config (`configs`)**: For dynamic gateway settings.
*   **Backend (`backends`)**: For defining upstream services.
*   **Route (`routes`)**: For defining gateway routing rules.
*   **Log (`logs`)**: For storing request traffic logs.
*   **Analytics (`analytics`)**: For pre-aggregated metrics.
*   **ClientProfile (`clientprofiles`)**: For tracking client behavior.
*   **Alert (`alerts`)**: For system notifications.

---

## 3. Redis Key Structures (Active)

Redis is currently used for **Authentication Token Management**.

| Key Pattern | Purpose | TTL | Status |
|-------------|---------|-----|--------|
| `auth:blacklist:{jti}` | Blacklisted JWT token ID | Remaining token TTL | **Active** |
| `auth:refresh:{userId}` | Active refresh token JTI | 7 days | **Active** |
| `rl:counter:{clientId}` | Rate limit counter | Window size | *Future* |
| `cb:state:{backendName}` | Circuit breaker state | None | *Future* |
| `metrics:cache:{period}` | Cached analytics | Configurable | *Future* |

---

## 4. Authentication System (Deep Dive)

### JWT Flow (Dashboard Users)

1.  **Login:** User submits email + password to `POST /api/auth/login`
2.  Server validates credentials, generates an access token (1h expiry) and refresh token (7d expiry)
3.  Refresh token's JTI is stored in Redis with 7-day TTL
4.  **Protected Routes:** Client sends `Authorization: Bearer <token>` header
5.  `requireJWT` middleware verifies token signature, checks blacklist, and attaches user to `req.user`
6.  **Token Refresh:** Client sends refresh token to `POST /api/auth/refresh` to get a new access token
7.  **Logout:** `POST /api/auth/logout` blacklists the access token JTI in Redis with remaining TTL and deletes the refresh token
8.  **Password Change:** Blacklists current tokens and removes refresh token, forcing re-login

### API Key Flow (Gateway Clients)

1.  **Key Creation:** Admin creates a key via `POST /api/admin/api-keys`. Raw key is returned once
2.  **Client Usage:** Client sends raw key in `x-api-key` header (or configured header)
3.  `requireApiKey` middleware extracts prefix (first 8 chars), looks up by prefix, hashes raw key, and compares to stored hash
4.  Checks `isActive` and `expiresAt`
5.  Updates `lastUsedAt` asynchronously

### Token Blacklisting

-   Blacklisted JTIs are stored in Redis with TTL matching the token's remaining lifetime
-   On every JWT-protected request, the middleware checks Redis for the JTI
-   This ensures revoked tokens cannot be used even before natural expiry

---

## 5. API Endpoints Reference

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| `POST` | `/api/auth/login` | No | Login with email + password, returns tokens |
| `POST` | `/api/auth/refresh` | No | Refresh access token using refresh token |
| `POST` | `/api/auth/logout` | JWT | Blacklist current token, delete refresh token |
| `GET` | `/api/auth/me` | JWT | Get current user profile |
| `POST` | `/api/auth/change-password` | JWT | Change password with validation |
| `GET` | `/api/admin/api-keys` | JWT + Admin | List all API keys (no hashes exposed) |
| `POST` | `/api/admin/api-keys` | JWT + Admin | Create new API key (raw key returned once) |
| `PATCH` | `/api/admin/api-keys/:id/revoke` | JWT + Admin | Revoke an API key |
| `DELETE` | `/api/admin/api-keys/:id` | JWT + Admin | Permanently delete an API key |

---

## 6. Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `MONGODB_URI` | MongoDB connection string | `mongodb://admin:secret123@localhost:27017/gatekeeper?authSource=admin` |
| `REDIS_URL` | Redis connection URL | `redis://appuser:strongpassword123@localhost:6379` |
| `JWT_SECRET` | Secret key for signing JWTs (min 32 chars) | `gatekeeper_jwt_secret_key_dev_32chars_min` |
| `JWT_EXPIRY` | Access token expiry duration | `1h` |
| `API_KEY_HEADER` | HTTP header for API key auth | `x-api-key` |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins | `http://localhost:3000,http://localhost:5173` |
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | Server port | `9000` |

---

## 7. File Structure

```
backend/
├── src/
│   ├── config/
│   │   ├── database.js          # MongoDB & Redis connection
│   │   ├── redisKeys.js         # Redis key pattern helpers
│   │   └── seed.js              # Database seeder (admin user + default configs)
│   ├── models/
│   │   ├── User.js              # Dashboard admin/viewer users
│   │   ├── ApiKey.js            # Gateway client API keys
│   │   ├── Config.js            # Dynamic system configuration
│   │   ├── Backend.js           # Upstream backend service definitions
│   │   ├── Route.js             # Gateway routing rules
│   │   ├── Log.js               # Request log entries (30-day TTL)
│   │   ├── Analytics.js         # Aggregated metrics snapshots
│   │   ├── ClientProfile.js     # Client behavior tracking
│   │   └── Alert.js             # System notifications/alerts
│   ├── middleware/
│   │   ├── auth.js              # JWT & API Key auth middleware
│   │   ├── validate.js          # express-validator rules
│   │   ├── security.js          # Helmet, CORS, rate limit, body size
│   │   └── errorHandler.js      # Global error handler
│   ├── routes/
│   │   ├── auth.js              # Auth endpoints (login, refresh, logout, me, change-password)
│   │   └── apiKeys.js           # API key management endpoints (CRUD)
│   └── utils/
│       ├── password.js          # bcrypt hash/compare
│       ├── jwt.js               # JWT generate/verify/blacklist
│       └── apiKey.js            # API key generate/hash/verify
├── .env                         # Local env vars
├── .env.example                 # Example env vars
├── server.js                    # Updated Express app entry point
└── package.json                 # Updated with new dependencies
```

---

## 8. Dependencies Added

| Package | Purpose |
|---------|---------|
| `mongoose` | MongoDB ODM for schema definitions and queries |
| `ioredis` | Redis client (replaces `redis` package for better performance) |
| `jsonwebtoken` | JWT signing and verification |
| `bcryptjs` | Password hashing with bcrypt |
| `express-validator` | Input validation middleware |
| `helmet` | Security HTTP headers |
| `express-rate-limit` | Rate limiting on auth endpoints |

Note: `cors` and `express` were already installed.

---

## 9. Setup Instructions

1. **Start Docker containers:**
   ```bash
   cd DockerFiles
   docker compose -f docker-compose-dev.yml up -d mongo redis
   ```

2. **Install dependencies:**
   ```bash
   cd backend
   npm install
   ```

3. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your MongoDB/Redis connection details
   ```

4. **Run the seeder standalone (optional):**
   ```bash
   cd backend
   MONGODB_URI=mongodb://admin:secret123@localhost:27017/gatekeeper?authSource=admin node src/config/seed.js
   ```

5. **Start the server:**
   ```bash
   cd backend
   npm run dev
   ```

6. **Test login:**
   ```bash
   curl -X POST http://localhost:9000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@gateway.local","password":"Admin@1234"}'
   ```

---

## 10. Security Notes

- **bcrypt saltRounds: 12** — industry standard balancing security and performance. Lower rounds are too fast for brute-force resistance; higher rounds impact login latency.
- **Raw API keys are never stored** — only the SHA-256 hash is saved. The raw key is returned exactly once at creation time. This prevents key exposure even if the database is compromised.
- **JWT blacklisting via Redis** — when a user logs out or changes their password, the token's JTI is stored in Redis with TTL matching the remaining token lifetime. This provides immediate revocation without requiring a database lookup on every request.
- **Refresh tokens in Redis** — only the JTI of the active refresh token is stored per user. This ensures only one refresh token is valid at a time and enables instant invalidation.
- **Timing-safe comparison** for API key verification using `crypto.timingSafeEqual` to prevent timing attacks.
- **Request body size limited to 10kb** to prevent payload-based attacks.
- **Auth endpoint rate limiting** at 100 requests per 15 minutes per IP to mitigate brute-force login attempts.
- **Helmet security headers** applied globally for XSS protection, content-type sniffing prevention, etc.
