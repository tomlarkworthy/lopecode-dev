#!/usr/bin/env bash
# Full robocoop-5 regression sweep on MiMo (all 54 evals, one process so a shared browser is reused).
# ~$0.30 in OpenRouter turns — run when the gate categories are green, not while iterating.
# Run the free reference-solution gate first — it costs nothing and catches a BROKEN EVAL before the
# sweep spends turns on it:
#   for c in vendoring vendoring-patterns reflection; do node run.mjs --oracle --category $c; done
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p results
node run.mjs --model "${MODEL:-xiaomi/mimo-v2.5-pro}" --timeout 180000 \
  --json "results/full-sweep-$(date +%Y%m%d-%H%M).json" "$@"
