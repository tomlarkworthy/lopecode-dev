#!/usr/bin/env bash
# Full robocoop-5 regression sweep on MiMo (all 45 evals, one process so a shared browser is reused).
# ~$0.30 in OpenRouter turns — run when the gate categories are green, not while iterating.
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p results
node run.mjs --model "${MODEL:-xiaomi/mimo-v2.5-pro}" --timeout 180000 \
  --json "results/full-sweep-$(date +%Y%m%d-%H%M).json" "$@"
