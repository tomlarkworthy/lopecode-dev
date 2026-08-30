#!/usr/bin/env bash
# UserPromptSubmit hook: once per session, if the session is running on Fable,
# inject knowledge/effective-use-of-fable.md into context and record it as read
# so the learnings gate's backstop does not also block on it.
set -u

export LC_ALL=C

LIB="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib/learnings-match-string.sh"
# shellcheck source=lib/learnings-match-string.sh
. "$LIB" 2>/dev/null || exit 0

INPUT=$(cat)
lms_from_json "$INPUT"

SESSION_ID="${LMS_SESSION:-}"
[ -z "$SESSION_ID" ] && SESSION_ID="${CLAUDE_CODE_SESSION_ID:-default}"
LMS_SESSION="$SESSION_ID"

SENTINEL="${TMPDIR:-/tmp}/claude-learnings-model-policy-${SESSION_ID}"
[ -f "$SENTINEL" ] && exit 0

MODEL=$(lms_resolve_model)
# Resolution can still fail when SessionStart delivered no model AND no
# assistant entry exists yet; retry next turn rather than burning the
# sentinel on an unknown model.
[ -z "$MODEL" ] && exit 0

case "$MODEL" in
  *[Ff][Aa][Bb][Ll][Ee]*) ;;
  *) exit 0 ;;
esac

LEARNING="${CLAUDE_PROJECT_DIR:-$(pwd)}/knowledge/effective-use-of-fable.md"
[ -f "$LEARNING" ] || exit 0

# Sentinel before output: an interrupt mid-injection must not re-run the
# whole body next turn and inject the policy twice.
: > "$SENTINEL"

echo "MODEL POLICY ($MODEL detected) — from knowledge/effective-use-of-fable.md:"
awk 'BEGIN { fm=0 }
     /^---[[:space:]]*$/ && fm<2 { fm++; next }
     /^<!-- injection-ends -->/ { exit }
     fm>=2 { print }' "$LEARNING"

STATE="${TMPDIR:-/tmp}/claude-learnings-read-${SESSION_ID}"
mkdir -p "$(dirname "$STATE")" 2>/dev/null || true
printf '%s\t%s\n' "$(date +%s)" "$LEARNING" >> "$STATE"

exit 0
