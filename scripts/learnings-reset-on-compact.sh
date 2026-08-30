#!/usr/bin/env bash
# SessionStart(compact) hook: clear the learnings read-tracking state.
# Compaction drops the *contents* of an already-Read learning from context, but
# the state file still lists it, so learnings-gate.sh stops firing and the
# guidance is silently lost. Clearing it makes the next gated call re-block.
set -u

INPUT=$(cat 2>/dev/null || true)
SID=$(echo "$INPUT" | jq -r '.session_id // empty' 2>/dev/null || true)

# This hook runs a few hundred ms AFTER the first Read of the new context
# window, so deleting the file outright discards a read that is still valid —
# and it is always the read the agent just did to satisfy a block. Keep
# entries inside the grace window; anything older belongs to the compacted-away
# context. Legacy untimestamped entries have no NF>1 field and are dropped.
GRACE=30

CLEARED=0
NOW=$(date +%s)
# The gate keys on $CLAUDE_CODE_SESSION_ID, which is absent before CC 2.1.132.
for sid in "$SID" "${CLAUDE_CODE_SESSION_ID:-}" default; do
  [ -z "$sid" ] && continue
  # Re-arm the model-policy injector: its injected text was compacted away
  # with the rest of the context, so it must fire again next prompt.
  rm -f "${TMPDIR:-/tmp}/claude-learnings-model-policy-$sid"
  f="${TMPDIR:-/tmp}/claude-learnings-read-$sid"
  [ -f "$f" ] || continue
  before=$(wc -l < "$f" | tr -d ' ')
  kept=$(awk -F'\t' -v now="$NOW" -v grace="$GRACE" 'NF>1 && ($1+0) >= now-grace' "$f")
  if [ -n "$kept" ]; then
    printf '%s\n' "$kept" > "$f"
    after=$(printf '%s\n' "$kept" | wc -l | tr -d ' ')
  else
    rm -f "$f"
    after=0
  fi
  [ "$before" != "$after" ] && CLEARED=1
done

if [ "$CLEARED" -eq 1 ]; then
  echo 'LEARNINGS GATE RESET: context was compacted, so knowledge/*.md you Read earlier are no longer in context. Read-tracking state has been cleared — gated tool calls will block again until you re-Read the relevant learning. Re-read rather than trusting the summary.'
fi
exit 0
