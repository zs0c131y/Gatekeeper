#!/bin/bash

# Configuration and Gateway Registration Script
echo "=========================================================="
echo "    Gatekeeper: Setup Temp Servers Routes                 "
echo "=========================================================="
echo ""

# Define ports
PORT1=3001
PORT2=3002

echo "Starting Temp Server 1 on port $PORT1..."
PORT=$PORT1 node temp_servers/server.js &

echo "Starting Temp Server 2 on port $PORT2..."
PORT=$PORT2 node temp_servers/server.js &

# Give servers a moment to start
sleep 2

cd backend/scripts || exit 1

echo ""
echo "[1/2] Registering Temp Server 1..."
node register_service.js "Temp Server 1" "http://localhost:$PORT1" "/temp1/*" "/temp1" "n"

echo ""
echo "[2/2] Registering Temp Server 2..."
node register_service.js "Temp Server 2" "http://localhost:$PORT2" "/temp2/*" "/temp2" "n"

echo ""
echo "=========================================================="
echo "    Done! Your services are configured.                   "
echo "=========================================================="
