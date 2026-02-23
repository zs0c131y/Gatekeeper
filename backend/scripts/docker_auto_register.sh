#!/bin/sh

# Auto-registration script for the Backend Docker Container
echo "Starting auto-registration for Temp Servers..."

# Give MongoDB a few seconds to fully initialize
sleep 5

cd /app/scripts || exit 1

# Register Temp Server 1
node register_service.js << 'EOF'
Temp Server 1
http://temp:3000
/temp1/*
/temp1
n
EOF

# Register Temp Server 2
node register_service.js << 'EOF'
Temp Server 2
http://temp-2:3000
/temp2/*
/temp2
n
EOF

echo "Auto-registration completed!"
