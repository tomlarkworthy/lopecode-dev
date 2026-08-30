#!/usr/bin/env bash
# PostToolUse(Bash) hook: credit learnings consumed via shell commands
# (cat, sed, grep, ...) in the same per-session index that the Read tracker
# feeds, so the learnings gate accepts either read path. Any executed command
# naming a specific knowledge/*.md file counts; blocked calls never execute,
# so they earn no credit.
set -u

INPUT=$(cat)
CMD=$(echo "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null || true)
[ -z "$CMD" ] && exit 0
case "$CMD" in *knowledge/*) ;; *) exit 0 ;; esac

LEARN_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}/knowledge"
[ -d "$LEARN_DIR" ] || exit 0
STATE="${TMPDIR:-/tmp}/claude-learnings-read-${CLAUDE_CODE_SESSION_ID:-default}"
mkdir -p "$(dirname "$STATE")" 2>/dev/null || true

# All learnings live flat in learnings/, so the basename identifies the file
# regardless of how the command spelled the path (relative, absolute, $VAR).
echo "$CMD" | grep -oE 'knowledge/[A-Za-z0-9._-]+\.md' | sort -u | \
while IFS= read -r rel; do
  FP="$LEARN_DIR/$(basename "$rel")"
  [ -f "$FP" ] || continue
  printf '%s\t%s\n' "$(date +%s)" "$FP" >> "$STATE"
done
exit 0
