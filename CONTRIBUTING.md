# Contributing

Thank you for considering contributing! This document outlines how to get started.

## Development Setup

1. **Clone the repository**
   ```bash
   git clone <repo-url>
   cd <repo-name>
   ```

2. **Install dependencies**
   ```bash
   npm install
   npm run install:all
   ```

3. **Set up environment**
   ```bash
   cp backend/.env.example backend/.env
   # Edit backend/.env with your MongoDB URI, auth secret, etc.
   ```

4. **Start infrastructure**
   - MongoDB must be running on `localhost:27017`
   - Redis is optional but recommended on `localhost:6379`

5. **Run development servers**
   ```bash
   npm run dev
   ```
   Backend runs on port 3000, frontend on port 5173.

## Project Structure

- `backend/` — Node.js/Express API gateway server
- `frontend/` — React/Vite dashboard SPA
- `temp_servers/` — Dummy microservices for testing
- `DockerFiles/` — Docker configurations
- `docs/` — Documentation

## Code Guidelines

- **Backend**: CommonJS modules, Express middleware pattern
- **Frontend**: ESM, React functional components with hooks
- **Styling**: Tailwind CSS utility classes, dark theme throughout
- **Logging**: Use the Winston logger (`require("../utils/logger")`) — never `console.log` in production code
- **Error handling**: All async route handlers must catch errors; use the global error handler
- **Database**: Mongoose models with explicit schema definitions and indexes
- **Redis**: Use `redisKeys.js` for all key generation — never hardcode key strings

## Making Changes

1. Create a feature branch from `main`
2. Make your changes with clear, atomic commits
3. Ensure `npm run build --prefix frontend` succeeds
4. Ensure `npm run lint --prefix frontend` passes (or only has pre-existing warnings)
5. Verify the backend starts without errors
6. Submit a pull request with a clear description

## Reporting Issues

Open a GitHub issue with:
- Steps to reproduce
- Expected behavior
- Actual behavior
- Environment (OS, Node version, browser)

## License

By contributing, you agree that your contributions will be licensed under the project's AGPL-3.0 license.
