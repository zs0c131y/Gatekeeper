#!/bin/bash

# Resolve the repo root regardless of where this script is called from
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=========================================================="
echo "    Gatekeeper: Setup Temp Servers & Routes               "
echo "=========================================================="
echo ""

PORT1=3001
PORT2=3002

# Install temp_servers dependencies if missing
if [ ! -d "$REPO_ROOT/temp_servers/node_modules" ]; then
  echo "Installing temp_servers dependencies..."
  (cd "$REPO_ROOT/temp_servers" && npm install --silent) || {
    echo "Failed to install temp_servers dependencies."
    exit 1
  }
fi

echo "Starting Temp Server 1 on port $PORT1..."
PORT=$PORT1 node "$REPO_ROOT/temp_servers/server.js" &
PID1=$!

echo "Starting Temp Server 2 on port $PORT2..."
PORT=$PORT2 node "$REPO_ROOT/temp_servers/server.js" &
PID2=$!

# Give servers a moment to start
sleep 2

# Run register_service.js from backend/scripts/ so its dotenv path('../.env') resolves to backend/.env
# MSYS_NO_PATHCONV=1 prevents Git Bash on Windows from silently converting POSIX-style
# arguments like /temp1 into full Windows paths like C:/Program Files/Git/temp1.
echo ""
echo "[1/2] Registering Temp Server 1..."
(cd "$REPO_ROOT/backend/scripts" && MSYS_NO_PATHCONV=1 node register_service.js \
  "Temp Server 1" "http://localhost:$PORT1" "/temp1/*" "/temp1" "n")

echo ""
echo "[2/2] Registering Temp Server 2..."
(cd "$REPO_ROOT/backend/scripts" && MSYS_NO_PATHCONV=1 node register_service.js \
  "Temp Server 2" "http://localhost:$PORT2" "/temp2/*" "/temp2" "n")

echo ""
echo "=========================================================="
echo "    Done! Services registered."
echo ""
echo "    Temp Server 1 (PID $PID1): http://localhost:$PORT1"
echo "    Temp Server 2 (PID $PID2): http://localhost:$PORT2"
echo ""
echo "    Press Ctrl+C to stop the temp servers."
echo "=========================================================="

cleanup() {
  echo ""
  echo "Stopping temp servers..."
  kill "$PID1" "$PID2" 2>/dev/null
  exit 0
}
trap cleanup SIGINT SIGTERM

wait "$PID1" "$PID2"
