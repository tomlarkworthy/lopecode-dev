#!/bin/bash
# Quick browser smoke test for all notebooks in a directory
# Usage: bash tools/bulk-browser-smoke.sh <dir>
DIR="${1:?Usage: bulk-browser-smoke.sh <dir>}"
TIMEOUT="${2:-60000}"

for f in "$DIR"/*.html; do
  name=$(basename "$f")
  result=$(node tools/lope-runner.js "$f" --run-tests --json --test-timeout "$TIMEOUT" 2>/dev/null)
  if [ $? -eq 2 ]; then
    echo "✗ $name [load-error]"
    continue
  fi
  total=$(echo "$result" | python3 -c "import json,sys; d=json.load(sys.stdin); print(len(d))" 2>/dev/null)
  passed=$(echo "$result" | python3 -c "import json,sys; d=json.load(sys.stdin); print(sum(1 for t in d if t.get('state')=='passed'))" 2>/dev/null)
  failed=$(echo "$result" | python3 -c "import json,sys; d=json.load(sys.stdin); print(sum(1 for t in d if t.get('state')=='failed'))" 2>/dev/null)

  if [ -z "$total" ] || [ "$total" = "0" ]; then
    echo "○ $name [no-tests]"
  elif [ "$failed" = "0" ]; then
    echo "✓ $name [${passed}/${total} pass]"
  else
    echo "✗ $name [${passed}/${total} pass, ${failed} fail]"
    # Show first 3 failures
    echo "$result" | python3 -c "
import json,sys
d=json.load(sys.stdin)
for t in d:
  if t.get('state')=='failed':
    print(f'    {t[\"name\"]}: {t.get(\"error\",\"?\")[:100]}')
" 2>/dev/null | head -3
  fi
done
