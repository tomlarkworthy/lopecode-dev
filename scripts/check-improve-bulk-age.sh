#!/usr/bin/env bash
# SessionStart hook: warn when /improve-bulk hasn't run in $THRESHOLD_DAYS.
# Detection is heuristic — mtime of the most recent
# scratch/bulk-improve/<ts>/ directory the skill writes.

set -eu

ROOT="${CLAUDE_PROJECT_DIR:-$(pwd)}"
THRESHOLD_DAYS="${1:-7}"

LAST=$(ls -td "$ROOT"/scratch/bulk-improve/*/ 2>/dev/null | head -1 || true)

if [ -z "$LAST" ]; then
  echo
  echo "REMINDER: /improve-bulk has not been run in this checkout. Run it after significant sessions to keep CLAUDE.md, settings, and knowledge tuned to recent friction."
  exit 0
fi

if [ "$(uname)" = "Darwin" ]; then
  MTIME=$(stat -f %m "$LAST")
else
  MTIME=$(stat -c %Y "$LAST")
fi
NOW=$(date +%s)
AGE_DAYS=$(( (NOW - MTIME) / 86400 ))

if [ "$AGE_DAYS" -gt "$THRESHOLD_DAYS" ]; then
  echo
  echo "REMINDER: /improve-bulk last ran $AGE_DAYS days ago. Consider a fresh sweep to capture recent friction."
fi
