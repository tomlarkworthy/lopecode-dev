#!/usr/bin/env bash
# PreToolUse hook: on a Fable session, reject an Agent/Task spawn that does not
# pin `model` — subagents inherit Fable otherwise. `fork` is exempt: it always
# inherits the parent model and ignores an override.
set -u

export LC_ALL=C

LIB="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib/learnings-match-string.sh"
# shellcheck source=lib/learnings-match-string.sh
. "$LIB" 2>/dev/null || exit 0

INPUT=$(cat)
lms_from_json "$INPUT"

case "${LMS_TOOL:-}" in
  Agent|Task) ;;
  *) exit 0 ;;
esac

case "${LMS_IN_AGENT_TYPE:-}" in
  [Ff][Oo][Rr][Kk]) exit 0 ;;
esac

[ -n "${LMS_IN_AGENT_MODEL:-}" ] && exit 0

SESSION_ID="${LMS_SESSION:-}"
[ -z "$SESSION_ID" ] && SESSION_ID="${CLAUDE_CODE_SESSION_ID:-default}"
LMS_SESSION="$SESSION_ID"

MODEL=$(lms_resolve_model)
case "$MODEL" in
  *[Ff][Aa][Bb][Ll][Ee]*) ;;
  *) exit 0 ;;
esac

{
  echo "BLOCKED (Fable session): Agent calls must set an explicit \`model\` — \`sonnet\` for mechanical work (corpus greps, notebook scans, rote edits), \`opus\` for code authoring/analysis, \`fable\` only when the task needs frontier judgment. Sonnet is the floor."
  echo "See knowledge/effective-use-of-fable.md. Retry the same call with model set."
} >&2
exit 2
