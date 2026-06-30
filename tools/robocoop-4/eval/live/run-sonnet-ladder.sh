#!/usr/bin/env bash
# Efficiency-ladder sweep on sonnet-4.6 — mirrors the mimo ladder (long-store-to-checkout, N=3, 4 arms).
# Sequential (one Chromium at a time) to avoid resource contention; interleaved by cycle so a broken arm
# shows up in cycle 1 instead of after 9 runs. Writes results/strategy/<arm>_sonnet46-<n>.json.
set -u
cd "$(dirname "$0")"
MODEL="anthropic/claude-sonnet-4.6"
EVAL="long-store-to-checkout"
TO=180000
ROOT="../../../.."
DATA="$ROOT/scratch/blogs/llm_bash/data"
NB_CUR="$ROOT/lopebooks/notebooks/@tomlarkworthy_robocoop-4.html"
NB_SED="$DATA/robocoop-4_BEFORE_bash-only_9f7b205_sonnet46.html"
NB_NOBYTE="$DATA/robocoop-4_AFTER_claude-tools_01b31df_sonnet46.html"

run () { # arm  n  notebook  extra-flags...
  local arm="$1" n="$2" nb="$3"; shift 3
  local out="results/strategy/${arm}_sonnet46-${n}.json"
  echo "--- [$arm n=$n] start $(date +%H:%M:%S) ---"
  node run.mjs --ids "$EVAL" --model "$MODEL" --notebook "$nb" "$@" \
    --timeout "$TO" --json "$out" 2>&1 | grep -E "PASS|PART|FAIL |did not init|error|surface:" || true
}

for n in 1 2 3; do
  run A_sed              "$n" "$NB_SED"    --legacy-no-tool-gate
  run B_tools_nobytestab "$n" "$NB_NOBYTE"
  run C_tools_src        "$n" "$NB_CUR"
  run D_structured       "$n" "$NB_CUR"    --tool-surface structured
done
echo "=== SONNET LADDER DONE $(date +%H:%M:%S) ==="
