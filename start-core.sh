#!/bin/bash
export PATH="$HOME/.local/bin:$PATH"
export HTPASSWD_FILE=/home/sysops/sysone/SystemOne/data/.htpasswd
export JWT_SECRET=sysone-dev-jwt-secret
export DB_HOST=localhost
export DB_PORT=5432
export DB_NAME=systemone
export DB_USER=sysops
export DB_PASSWORD=sysone123
export REDIS_URL=redis://localhost:6379/0
cd /home/sysops/sysone/SystemOne/services/core-engine
nohup uvicorn app.main:app --host 0.0.0.0 --port 8001 > /tmp/core-engine.log 2>&1 &
echo "Core engine PID: $!"
