#!/usr/bin/env bash
# PostToolUse(Read) hook: append Read file paths to a per-session index so the
# learnings gate can tell which learnings have already been consulted.
set -u

INPUT=$(cat)
FP=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty' 2>/dev/null || true)
[ -z "$FP" ] && exit 0

# Track learnings/ Reads, plus any CLAUDE.md under the project — the
# submodule-claudemd-gate keys on those. Anything else is noise.
case "$FP" in
  "$CLAUDE_PROJECT_DIR"/knowledge/*) ;;
  "$CLAUDE_PROJECT_DIR"/*/CLAUDE.md) ;;
  *) exit 0 ;;
esac

STATE="${TMPDIR:-/tmp}/claude-learnings-read-${CLAUDE_CODE_SESSION_ID:-default}"
mkdir -p "$(dirname "$STATE")" 2>/dev/null || true
# Timestamped so learnings-reset-on-compact.sh can keep entries it raced.
printf '%s\t%s\n' "$(date +%s)" "$FP" >> "$STATE"
exit 0
