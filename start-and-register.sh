#!/bin/bash

# Configuration and Gateway Registration Script
echo "=========================================================="
echo "    Gatekeeper: Setup Temp Servers Routes                 "
echo "=========================================================="
echo ""

cd backend/scripts || exit 1

echo "[1/2] Registering Temp Server 1..."
node register_service.js << 'EOF'
Temp Server 1
http://localhost:3000
/temp1/*
/temp1
n
EOF

echo ""
echo "[2/2] Registering Temp Server 2..."
node register_service.js << 'EOF'
Temp Server 2
http://localhost:3000
/temp2/*
/temp2
n
EOF

echo ""
echo "=========================================================="
echo "    Done! Your services are configured.                   "
echo "=========================================================="
