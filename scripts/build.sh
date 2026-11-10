#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
PIN=ba66d3106a52f84b1c1ede8d9683c2df98d742ef
mkdir -p .vendor bin
if [ ! -d .vendor/cosmos-evm/.git ]; then
  git clone --no-checkout https://github.com/cosmos/evm.git .vendor/cosmos-evm
fi
git -C .vendor/cosmos-evm fetch origin "$PIN"
git -C .vendor/cosmos-evm checkout --detach "$PIN"
test "$(git -C .vendor/cosmos-evm rev-parse HEAD)" = "$PIN"
(cd .vendor/cosmos-evm/evmd && CGO_ENABLED=1 GOMEMLIMIT="${GOMEMLIMIT:-1200MiB}" GOGC="${GOGC:-20}" go build -p "${BUILD_JOBS:-3}" -ldflags='-s -w' -o ../../../bin/evmd ./cmd/evmd)
