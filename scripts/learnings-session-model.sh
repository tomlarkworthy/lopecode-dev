#!/usr/bin/env bash
# SessionStart hook: cache the `model` field from hook stdin so
# lms_resolve_model can answer on turn 1, before the transcript has any
# assistant entry. The field is optional (absent after /clear and on some
# resumes); when absent, keep any earlier cache rather than clearing it.
# Prints nothing: SessionStart stdout is injected into context.
set -u

INPUT=$(cat 2>/dev/null || true)
IFS=$'\037' read -r SID MODEL <<<"$(printf '%s' "$INPUT" \
  | jq -r '[(.session_id // ""), (.model // "")] | join("\u001f")' 2>/dev/null || true)"
[ -z "${SID:-}" ] && SID="${CLAUDE_CODE_SESSION_ID:-default}"
[ -z "${MODEL:-}" ] && exit 0
printf '%s\n' "$MODEL" > "${TMPDIR:-/tmp}/claude-learnings-session-model-${SID}" 2>/dev/null || true
exit 0
