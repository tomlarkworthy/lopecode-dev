#!/usr/bin/env bash
# Retry cycles 2 & 3 of the sonnet-4.6 ladder (cycle 1 already landed). Gentle spacing between runs to
# avoid the transient OpenRouter "Provider returned error" 400s that killed the first attempt's later runs.
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
    --timeout "$TO" --json "$out" 2>&1 | grep -E "PASS|PART|FAIL |did not init|Provider returned" | head -3 || true
  sleep 20
}

for n in 2 3; do
  run A_sed              "$n" "$NB_SED"    --legacy-no-tool-gate
  run B_tools_nobytestab "$n" "$NB_NOBYTE"
  run C_tools_src        "$n" "$NB_CUR"
  run D_structured       "$n" "$NB_CUR"    --tool-surface structured
done
echo "=== SONNET LADDER RETRY DONE $(date +%H:%M:%S) ==="
