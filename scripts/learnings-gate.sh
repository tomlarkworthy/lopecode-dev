#!/usr/bin/env bash
# PreToolUse hook: block the tool call if its match string matches a
# `triggers:` regex in any knowledge/*.md frontmatter that hasn't been Read
# this session. Exit 2 with a message → Claude Code surfaces the message and
# rejects the call.
#
# ── The match string ──────────────────────────────────────────────────────
# Built by scripts/lib/learnings-match-string.sh, shared with the replay tool
# so offline replays reproduce live gating exactly. It is "<TOOL> <target>":
#
#   Bash                              `Bash <command>`
#   Edit/Write/MultiEdit              `Edit <file_path>`
#   NotebookEdit                      `NotebookEdit <notebook_path>`
#   Agent/Task                        `Agent model=<model|inherit> type=<subagent_type|-> <description>`
#   mcp__*                            `<tool name> <body/title/description/content>`
#
# ── Writing a `triggers:` regex ────────────────────────────────────────────
# Rules, all learned from measured false positives. scripts/check-learnings-triggers.sh
# enforces them; run it after editing any frontmatter.
#
#   1. Anchor command-name triggers with `(^Bash |^|[;&|] )`. Matching is per
#      physical line, so the three alternatives cover the three places a real
#      invocation starts: the first line (`Bash sam deploy`), a continuation
#      line of a multi-line command, and after a `;`, `&&` or `|`. Prose that
#      names the command mid-sentence — commit message, PR body, JSON payload,
#      grep pattern — does not match. What still slips through is a command
#      word at the start of a heredoc body line; stripping heredoc bodies to
#      close that costs more true positives than it saves, because a body is
#      as often executed (`python3 - <<PY`) as it is written to a file.
#   2. Anchor MCP-tool triggers with `^mcp__` and the full tool name. A bare
#      `save_comment` also matches the word appearing in any Bash command.
#   3. End a command token with `( |$)`, never `\b`. The resolved grep may be
#      ugrep, where `\b` is not POSIX ERE.
#   4. Escape literal dots: `\.py` not `.py`.
#   5. No optional prefix groups (`(cd .*foo.*&& *)?just run`). They collapse
#      to the bare tail and match everything the tail matches.
#   6. Escape exactly once. Triggers are passed to grep -E verbatim with no
#      YAML unescaping, so write `\.` not `\\.` — a doubled backslash matches
#      a literal backslash and the trigger is dead.
#   7. Bare file paths are not triggers. They fire on read-only investigation
#      far more often than on the edit the learning is about. Anchor them to
#      the write instead: `^(Edit|Write|MultiEdit) .*modules/history/sql/`.
#
# ── `when-cwd:` ───────────────────────────────────────────────────────────
# Optional frontmatter key, an ERE list parsed exactly like `triggers:`. When
# present, the learning gates a call only if at least one of its regexes
# matches "<cwd> <target>", ANDed with the `triggers:` match. Use it to scope
# a learning to the repo it is about, e.g. `when-cwd: ["workspace-services"]`
# on a learning whose `just local` trigger also names another repo's recipe.
# Matching against cwd *and* target is deliberately leaky: a command naming
# `taktile-services-postgres-1` from the meta-repo root still satisfies
# `taktile-services`, which is the intended behaviour.
#
# ── `when-model:` ─────────────────────────────────────────────────────────
# Optional frontmatter key, an ERE list parsed exactly like `triggers:`. When
# present, the learning gates a call only if at least one of its regexes
# matches the model the session is running on, case-insensitively, ANDed with
# the `triggers:` (and any `when-cwd:`) match. Use it for a learning that only
# applies to one model, e.g. `when-model: ["fable"]` on cost policy for the
# most expensive model. An unresolvable model is the empty string and
# satisfies no regex, so such a learning fails open.
#
# Both keys are narrowing conditions, never triggers: a learning with
# `when-cwd`/`when-model` and no `triggers:` gates nothing.
#
# ── Calls that skip trigger matching entirely ─────────────────────────────
# (implemented in the shared lib, reasons recorded there)
#   read-only            every segment of the Bash command is a local
#                        text-processing tool and nothing writes. Network and
#                        cloud clients are deliberately absent from the
#                        allowlist so investigation learnings keep firing.
#   transcript-forensics Bash commands touching .claude/projects
#   feedback-reporter    scripts/learnings-feedback.sh
#   write-path           writes to scratch/, scratchpad/, .claude/projects/,
#                        memory/MEMORY.md, metadev-restart-*.json
#   mcp-metadata-only    MCP write with no prose fields
#
# ── Environment overrides ─────────────────────────────────────────────────
#   LEARNINGS_GATE_GREP  grep binary used for trigger matching (default
#                        /usr/bin/grep; set to a stub in tests).
#   LEARNINGS_FIRE_LOG   fire-log path (default
#                        $HOME/.claude/learnings-fires.tsv). Tests point this
#                        at a temp file so they don't pollute the real log.
#   LEARNINGS_FIRE_TAG   free-text label written to the log's 9th column,
#                        for attributing rows to an experiment (default `-`).
#                        A `when-model` fire appends `model=<resolved>` there.
set -u

export LC_ALL=C

LIB="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib/learnings-match-string.sh"
# Fail open: a gate that cannot load its own lib must not block every call.
# shellcheck source=lib/learnings-match-string.sh
. "$LIB" 2>/dev/null || { echo "learnings-gate: cannot load $LIB" >&2; exit 0; }

INPUT=$(cat)
lms_from_json "$INPUT"

TOOL="${LMS_TOOL:-}"
CWD="${LMS_CWD:-}"
CONTENT="${LMS_CONTENT:-}"
CMD="${LMS_MATCH:-}"
SESSION_ID="${LMS_SESSION:-}"
[ -z "$SESSION_ID" ] && SESSION_ID="${CLAUDE_CODE_SESSION_ID:-default}"
LMS_SESSION="$SESSION_ID"

[ "${LMS_EXEMPT:-0}" -eq 1 ] && exit 0

STATE="${TMPDIR:-/tmp}/claude-learnings-read-${CLAUDE_CODE_SESSION_ID:-default}"
LEARN_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}/knowledge"
[ -d "$LEARN_DIR" ] || exit 0

FIRE_LOG=${LEARNINGS_FIRE_LOG:-$HOME/.claude/learnings-fires.tsv}
FIRE_TAG=${LEARNINGS_FIRE_TAG:--}

SNIPPET=$(lms_one_line "$CMD")
CWD_MATCH="$CWD $CONTENT"

MODEL=""
MODEL_RESOLVED=0
resolve_model_once() {
  [ "$MODEL_RESOLVED" -eq 1 ] && return 0
  MODEL=$(lms_resolve_model)
  MODEL_RESOLVED=1
}

BLOCKED=()
BLOCKED_WHY=()
FIRE_ROWS=""
for f in "$LEARN_DIR"/*.md; do
  [ -f "$f" ] || continue
  triggers=$(lms_extract_list "$f" triggers)
  [ -z "$triggers" ] && continue

  matched_pat=""
  while IFS= read -r pat; do
    [ -z "$pat" ] && continue
    if echo "$CMD" | $GREP -qE -- "$pat"; then
      matched_pat="$pat"
      break
    fi
  done <<< "$triggers"
  [ -z "$matched_pat" ] && continue

  when_cwd=$(lms_extract_list "$f" when-cwd)
  if [ -n "$when_cwd" ]; then
    scoped=""
    while IFS= read -r pat; do
      [ -z "$pat" ] && continue
      if echo "$CWD_MATCH" | $GREP -qE -- "$pat"; then
        scoped="$pat"
        break
      fi
    done <<< "$when_cwd"
    [ -z "$scoped" ] && continue
  fi

  row_tag="$FIRE_TAG"
  when_model=$(lms_extract_list "$f" when-model)
  if [ -n "$when_model" ]; then
    resolve_model_once
    on_model=""
    if [ -n "$MODEL" ]; then
      while IFS= read -r pat; do
        [ -z "$pat" ] && continue
        if echo "$MODEL" | $GREP -qiE -- "$pat"; then
          on_model="$pat"
          break
        fi
      done <<< "$when_model"
    fi
    [ -z "$on_model" ] && continue
    if [ "$FIRE_TAG" = "-" ]; then
      row_tag="model=${MODEL}"
    else
      row_tag="${FIRE_TAG} model=${MODEL}"
    fi
  fi

  # Entries are `<epoch>\t<path>`; bare paths are the pre-timestamp format.
  if [ -f "$STATE" ] && awk -F'\t' -v want="$f" \
      '{ p = (NF > 1 ? $2 : $1); if (p == want) { found = 1; exit } }
       END { exit !found }' "$STATE"; then
    decision="allowed"
  else
    decision="block"
    BLOCKED+=("knowledge/$(basename "$f")")
    BLOCKED_WHY+=("$matched_pat")
  fi
  FIRE_ROWS="${FIRE_ROWS}$(date +%s)	${SESSION_ID}	${decision}	${TOOL:-Bash}	knowledge/$(basename "$f")	$(lms_one_line "$matched_pat")	${CWD}	${SNIPPET}	${row_tag}
"
done

# Fire log: one row per (call, learning-with-matching-trigger). Never allowed
# to fail the hook.
if [ -n "$FIRE_ROWS" ]; then
  {
    mkdir -p "$(dirname "$FIRE_LOG")" 2>/dev/null
    # First write of the session also records the hook stdin's top-level keys,
    # which is how we confirm whether `cwd` is actually delivered.
    if ! { [ -f "$FIRE_LOG" ] && $GREP -qF "	${SESSION_ID}	meta	" "$FIRE_LOG"; }; then
      keys=$(echo "$INPUT" | jq -r 'keys_unsorted | join(",")' 2>/dev/null || echo "unparsed")
      printf '%s\t%s\tmeta\t%s\t-\thook_stdin_keys\t%s\t%s\t%s\n' \
        "$(date +%s)" "$SESSION_ID" "${TOOL:-Bash}" "$CWD" "$(lms_one_line "$keys")" "$FIRE_TAG" \
        >> "$FIRE_LOG"
    fi
    printf '%s' "$FIRE_ROWS" >> "$FIRE_LOG"
  } 2>/dev/null || true
fi

if [ ${#BLOCKED[@]} -gt 0 ]; then
  {
    echo "BLOCKED: this ${TOOL:-Bash} call matches triggers in learnings you have not Read in this session."
    echo "Required reading before this call will succeed:"
    i=0
    while [ $i -lt ${#BLOCKED[@]} ]; do
      echo "  - ${BLOCKED[$i]}"
      echo "      matched regex: ${BLOCKED_WHY[$i]}"
      i=$((i+1))
    done
    echo "  matched text: $SNIPPET"
    echo "After Reading, retry the same call. The ENTIRE call was rejected: if it bundled earlier steps (e.g. a heredoc file-write before the gated command), those did not run either — re-run them too."
  } >&2
  exit 2
fi
exit 0
