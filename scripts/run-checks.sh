#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
cleanup() { python3 scripts/devnet.py stop; [ -z "${GATEWAY_PID:-}" ] || kill "$GATEWAY_PID" 2>/dev/null || true; }
trap cleanup EXIT
python3 scripts/devnet.py start
SAMBA_FAUCET_DB="$(mktemp .devnet/check-faucet-XXXXXX.sqlite)" node services/gateway.mjs > .devnet/gateway.log 2>&1 &
GATEWAY_PID=$!
node tests/integration.mjs
