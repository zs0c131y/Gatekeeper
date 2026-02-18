#!/bin/sh
# Convenience wrapper to run the synthetic data seeder inside the Docker container.
# Usage: docker compose exec backend sh scripts/seed.sh [options]
#   --count=N   Number of log entries (default: 50000)
#   --days=N    Day range (default: 30)
#   --clean     Wipe existing data first

node /app/scripts/seedSyntheticData.js "$@"
