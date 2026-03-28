#!/bin/bash
# Incremental smoke test - tests notebooks one at a time and appends JSON lines to output
# Usage: bash tools/incremental-smoke-test.sh <dir> <output.jsonl> [timeout_ms]
DIR="${1:?Usage: $0 <dir> <output.jsonl> [timeout_ms]}"
OUTPUT="${2:?Usage: $0 <dir> <output.jsonl> [timeout_ms]}"
TIMEOUT="${3:-20000}"
WORKER="tools/bulk-smoke-test-worker.js"

count=0
total=$(ls "$DIR"/*.html 2>/dev/null | wc -l | tr -d ' ')

for f in "$DIR"/*.html; do
  count=$((count + 1))
  base=$(basename "$f")

  # Run worker, capture result from stderr __RESULT__ line
  result=$(node --experimental-vm-modules "$WORKER" "$f" "$TIMEOUT" 2>&1 | grep "^__RESULT__" | head -1 | sed 's/^__RESULT__//')

  if [ -z "$result" ]; then
    result="{\"file\":\"$base\",\"status\":\"crash\"}"
  fi

  echo "$result" >> "$OUTPUT"

  # Parse status for display
  status=$(echo "$result" | python3 -c "import sys,json; d=json.load(sys.stdin); tr=d.get('testResults',{}); print(f'{d.get(\"status\",\"?\"):15s} {tr.get(\"passed\",0):3d}/{tr.get(\"total\",0):3d}')" 2>/dev/null || echo "???")
  echo "[$count/$total] $status  $base" >&2
done

echo "Done: $count notebooks tested" >&2
