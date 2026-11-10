#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
while [ "$#" -gt 0 ]; do
  case "$1" in
    --port) export SAMBA_PORT="$2"; shift 2;;
    --host) [ "$2" = 127.0.0.1 ] || { echo 'Only loopback is supported'; exit 1; }; shift 2;;
    --strictPort) shift;;
    *) echo 'Unknown argument'; exit 1;;
  esac
done
trap 'python3 scripts/devnet.py stop' EXIT
python3 scripts/devnet.py start
node services/gateway.mjs
