#!/usr/bin/env bash
# Resume recent claude sessions and run /improve on each, in parallel.
# Outputs each session's proposals as JSON under scratch/bulk-improve/<ts>/.
#
# Usage: scripts/bulk-improve.sh [--days N] [--parallel N] [--limit N] [--budget USD] [--keep-empty]
#
# Defaults: --days 7 --parallel 4 --budget 2
# --limit caps the number of sessions (smallest first, useful for prototyping).
# --keep-empty also replays sessions with no tool_use of their own (see below).

set -euo pipefail

DAYS=7
PARALLEL=4
LIMIT=0
BUDGET=2
KEEP_EMPTY=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --days) DAYS="$2"; shift 2 ;;
    --parallel) PARALLEL="$2"; shift 2 ;;
    --limit) LIMIT="$2"; shift 2 ;;
    --budget) BUDGET="$2"; shift 2 ;;
    --keep-empty) KEEP_EMPTY=true; shift ;;
    *) echo "unknown arg: $1" >&2; exit 2 ;;
  esac
done

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# Derive the claude project slug from the repo path. Claude Code encodes EVERY
# non-alphanumeric char as `-` (so `.` in usernames, `@` in scoped dirs, etc.).
# ./metadev sets CLAUDE_CONFIG_DIR=~/.claude-personal, so transcripts live there.
CONFIG_DIR="${CLAUDE_CONFIG_DIR:-$HOME/.claude}"
SESSIONS_DIR="${SESSIONS_DIR:-$CONFIG_DIR/projects/$(echo "$REPO_ROOT" | sed 's/[^a-zA-Z0-9]/-/g')}"
TS=$(date +%Y%m%d-%H%M%S)
OUT_DIR="$REPO_ROOT/scratch/bulk-improve/$TS"
mkdir -p "$OUT_DIR"

if [[ ! -d "$SESSIONS_DIR" ]]; then
  echo "no claude project dir at $SESSIONS_DIR" >&2
  exit 1
fi

# claude --resume resolves the project from cwd, so anchor here.
cd "$REPO_ROOT"

# Pick sessions modified within DAYS days, sorted ascending by size (smallest first
# so --limit favors cheap sessions for prototyping).
# Tab-separated size+path handles paths with spaces (awk '{$1=""}' would corrupt them).
# Never resume the session we're running inside — that's re-entrant (a single launch
# spawns nested sweeps) and resuming a live, locked session yields empty output.
# Skip transcripts with no tool_use, unless --keep-empty. The filter runs BEFORE
# --limit, so --limit selects the cheapest *non-empty* sessions.
# Not loss-free, so the skipped IDs are always printed: a session cleared with
# /clear has no tool_use of its own, but a worker resumed on it can still reach
# the pre-clear transcript and produce real proposals from it.
SELF="${CLAUDE_CODE_SESSION_ID:-}"
SESSIONS=()
SKIPPED_EMPTY=()
while IFS=$'\t' read -r _ path; do
  [[ -n "$path" ]] || continue
  id="$(basename "$path" .jsonl)"
  [[ -n "$SELF" && "$id" == "$SELF" ]] && continue
  if [[ "$KEEP_EMPTY" != "true" ]] && ! grep -q '"type":"tool_use"' "$path"; then
    SKIPPED_EMPTY+=("$id")
    continue
  fi
  SESSIONS+=("$id")
done < <(
  find "$SESSIONS_DIR" -maxdepth 1 -name "*.jsonl" -mtime -"$DAYS" -print0 \
    | while IFS= read -r -d '' p; do
        printf '%d\t%s\n' "$(wc -c < "$p")" "$p"
      done \
    | sort -n
)

if [[ "${#SESSIONS[@]}" -eq 0 ]]; then
  echo "No sessions found in $SESSIONS_DIR within the last $DAYS days. Exiting."
  exit 0
fi

if [[ "$LIMIT" -gt 0 && "${#SESSIONS[@]}" -gt "$LIMIT" ]]; then
  SESSIONS=("${SESSIONS[@]:0:$LIMIT}")
fi

echo "output dir: $OUT_DIR"
echo "sessions:   ${#SESSIONS[@]} (last $DAYS days, limit=$LIMIT)"
if [[ "${#SKIPPED_EMPTY[@]}" -gt 0 ]]; then
  echo "skipped:    ${#SKIPPED_EMPTY[@]} with no tool_use — ${SKIPPED_EMPTY[*]}"
  echo "            (re-run these with --keep-empty if one was a /clear of real work)"
fi
echo "parallel:   $PARALLEL"
echo "budget:     \$$BUDGET per session"
echo

run_one() {
  local id="$1" out_dir="$2" budget="$3"
  local out="$out_dir/$id.json" err="$out_dir/$id.err"
  local started ended
  started=$(date +%s)
  echo "[$id] start"
  # Unset CLAUDECODE so the subprocess doesn't think it's nested.
  # --no-session-persistence: don't write a new .jsonl for the replay.
  # --disallowedTools Edit/Write: belt-and-braces against /improve applying anything.
  # LEARNINGS_FIRE_TAG: sweep workers run Bash against replayed transcripts, so
  # their learnings-gate fires are tagged and the trigger report excludes them.
  # METADEV=1: the SessionStart hook refuses to run outside the sandbox; the
  # worker inherits this process's sandbox.
  run_claude() {
    env -u CLAUDECODE LEARNINGS_FIRE_TAG=bulk METADEV=1 claude \
        --resume "$id" \
        --print "/improve" \
        --output-format json \
        --no-session-persistence \
        --max-budget-usd "$1" \
        --disallowedTools Edit Write NotebookEdit \
        --dangerously-skip-permissions \
        > "$out" 2> "$err"
  }
  local rc=0
  run_claude "$budget" || rc=$?
  if [[ "$rc" -eq 0 ]]; then
    ended=$(date +%s)
    echo "[$id] done in $((ended - started))s ($(wc -c < "$out" | tr -d ' ') bytes)"
    return
  fi
  # --max-budget-usd counts the resumed session's historical cost, so any session
  # that originally cost more than the budget dies instantly with
  # error_max_budget_usd. Retry once with historical + budget so the cap is
  # incremental spend.
  local subtype hist newb
  subtype=$(jq -r '.subtype // empty' "$out" 2>/dev/null || true)
  if [[ "$subtype" == "error_max_budget_usd" ]]; then
    hist=$(jq -r '.total_cost_usd // 0' "$out" 2>/dev/null || echo 0)
    newb=$(awk -v a="$hist" -v b="$budget" 'BEGIN{printf "%.2f", a + b}')
    echo "[$id] budget cap hit at historical \$$hist; retrying with \$$newb"
    rc=0
    run_claude "$newb" || rc=$?
    if [[ "$rc" -eq 0 ]]; then
      ended=$(date +%s)
      echo "[$id] done in $((ended - started))s ($(wc -c < "$out" | tr -d ' ') bytes)"
      return
    fi
  fi
  echo "[$id] FAILED (exit $rc), see $err"
}
export -f run_one

printf '%s\n' "${SESSIONS[@]}" \
  | xargs -I{} -P "$PARALLEL" bash -c 'run_one "$@"' _ {} "$OUT_DIR" "$BUDGET"

echo
echo "aggregating..."
{
  echo "# Bulk-improve aggregated proposals"
  echo "Generated: $(date)"
  echo "Sessions: ${#SESSIONS[@]}"
  echo
  for f in "$OUT_DIR"/*.json; do
    [[ -s "$f" ]] || continue
    id=$(basename "$f" .json)
    result=$(jq -r '.result // empty' "$f" 2>/dev/null || true)
    [[ -n "$result" ]] || continue
    echo "## Session $id"
    echo
    echo "$result"
    echo
  done
} > "$OUT_DIR/aggregated.md"

echo "wrote: $OUT_DIR/aggregated.md"
