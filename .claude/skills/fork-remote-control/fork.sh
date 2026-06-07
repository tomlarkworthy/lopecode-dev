#!/usr/bin/env bash
# Spawn a NEW Remote Control-enabled Claude Code session, detached from this one.
#
# Two modes:
#   --fresh  (default) a brand-new session in the current directory, no history.
#   --fork             a fork of the CURRENT session: fresh session id, inherits
#                      this conversation's history up to now (this session is
#                      untouched).
#
# Prompts: the child runs with --dangerously-skip-permissions so it never blocks
# on permission prompts when driven remotely. This is safe because the child is a
# descendant of THIS session and therefore inherits its safehouse/metadev
# sandbox (a detached grandchild can't escape the Seatbelt jail) — and it keeps
# that sandbox after this session exits. We do NOT nest metadev/safehouse: a
# nested sandbox boots slowly and stalls on the PTY's unanswered terminal queries.
#
# The child runs detached behind a PTY (script(1), so the interactive TUI renders
# without a real terminal) and registers with Remote Control under the given name
# — at which point it appears in the claude.ai web app and the mobile app.
#
# Usage: fork.sh [--fresh|--fork] "<session name>"
set -euo pipefail

MODE="fresh"
case "${1:-}" in
  --fresh) MODE="fresh"; shift ;;
  --fork)  MODE="fork";  shift ;;
esac

NAME="${1:?usage: fork.sh [--fresh|--fork] \"<session name>\"}"
CFG="${CLAUDE_CONFIG_DIR:-$HOME/.claude}"

ARGS=(--dangerously-skip-permissions --remote-control "$NAME")
if [ "$MODE" = "fork" ]; then
  SID="${CLAUDE_CODE_SESSION_ID:?--fork needs CLAUDE_CODE_SESSION_ID (run from inside a Claude Code session)}"
  ARGS=(--resume "$SID" --fork-session "${ARGS[@]}")
fi

SLUG="$(printf '%s' "$NAME" | tr -c '[:alnum:]' '_' )"
LOG="/tmp/claude-rc-${SLUG}.log"

# script(1) gives the child a PTY (claude needs a TTY for its interactive UI).
# nohup + & detaches it so it outlives the spawning turn; </dev/null keeps
# script's own stdin off this turn's socket (which it can't tcgetattr).
CLAUDE_CONFIG_DIR="$CFG" nohup script -q /dev/null \
  claude "${ARGS[@]}" \
  >"$LOG" 2>&1 </dev/null &
PID=$!

# Wait until it reports "Remote Control active" (or give up after ~20s).
for _ in $(seq 1 40); do
  if ! kill -0 "$PID" 2>/dev/null; then
    echo "FAILED: session exited early. Log: $LOG" >&2
    exit 1
  fi
  if tr -d '\r' <"$LOG" | grep -qa "Remote Control active"; then
    echo "OK: '$NAME' ($MODE) is live on Remote Control (pid $PID)"
    echo "It now appears in the claude.ai / mobile session list."
    echo "Stop later with: kill $PID    Log: $LOG"
    exit 0
  fi
  sleep 0.5
done

echo "Spawned (pid $PID, $MODE) but did not confirm 'Remote Control active' within 20s." >&2
echo "It may still be connecting — check the session list. Log: $LOG" >&2
exit 0
