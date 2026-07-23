#!/bin/bash
# start-core.sh — native (non-Docker) launcher for FinOne core-engine.
# Use this on hosts without Docker; production should use `make up` (docker-compose).
#
# Reads secrets from core-engine.env at the repo root (gitignored values stay
# out of the shell history). Override anything via shell env if needed.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Load secrets from core-engine.env (DB creds, JWT, single-user token, etc.)
if [ -f core-engine.env ]; then
  set -a
  # shellcheck disable=SC1091
  . ./core-engine.env
  set +a
fi

# Single-user mode does not need an htpasswd file. Multi-user mode defaults to
# /config/users.htpasswd inside containers; on a native host, anchor it under
# the repos data/ dir so the AuthService can find/write it.
if [ -z "${HTPASSWD_FILE:-}" ]; then
  export HTPASSWD_FILE="$SCRIPT_DIR/data/users.htpasswd"
fi

# Native host: 8001 is the docs/Compose default but the dev stack on
# 192.168.50.63 binds core-engine on 8003 (the Vite proxy target). Override
# with PORT to choose.
export PORT="${PORT:-8003}"

cd services/core-engine
exec /usr/bin/python3 -m uvicorn app.main:app \
  --host "${HOST:-0.0.0.0}" \
  --port "$PORT" \
  > /tmp/core-engine.log 2>&1
