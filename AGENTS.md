# AGENTS.md

## Cursor Cloud specific instructions

### Overview
This is an Intelligent Adaptive API Gateway with a Node.js/Express backend and a React/Vite frontend. It uses MongoDB for persistence and Redis for rate limiting / circuit breaker state (graceful degradation without Redis).

### Required infrastructure
- **MongoDB** must be running on localhost before starting the backend. Start with: `mongod --dbpath /data/db --logpath /var/log/mongod.log --logappend --fork`
- **Redis** is optional; backend runs in degraded mode without it.

### Environment setup
- Copy `backend/.env.example` to `backend/.env` and fill in values. Key: generate `BETTER_AUTH_SECRET` via `openssl rand -base64 32`.
- The system-level `PORT` env var may override the `.env` PORT value. The frontend hardcodes the backend dev URL in `frontend/src/lib/auth-client.js`, so `BETTER_AUTH_URL` in `.env` should match whatever port the backend actually binds to.

### Running the app
- From repo root: `npm run dev` starts both backend (nodemon) and frontend (vite) via `concurrently`.
- See `package.json` scripts for individual commands: `npm run dev:backend`, `npm run dev:frontend`.

### Lint / Test / Build
- **Lint**: `npm run lint --prefix frontend` (ESLint). Note: the codebase has pre-existing lint errors (unused vars, react-hooks warnings). No backend lint is configured.
- **Test**: `npm test --prefix backend` currently echoes "no test specified". No automated test suite exists.
- **Build**: `npm run build --prefix frontend` (Vite production build).

### Gotchas
- `backend/src/config/database.js` had a stray `, temp1` on the Mongoose `serverApi.version` line causing a `SyntaxError`. Fixed on the `cursor/development-environment-setup-5824` branch.
- The `.env` file is gitignored; it must be created from `.env.example` on each fresh setup.
- Default admin credentials seeded at startup: `admin@gateway.local` / `Admin@1234`.
- Temp test servers (`temp_servers/`) can be started and registered via `bash start-and-register.sh` or manually with the PORT env var and node command.
