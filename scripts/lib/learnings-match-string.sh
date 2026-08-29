#!/usr/bin/env bash
# Shared derivation of the learnings-gate match string, sourced by
# scripts/learnings-gate.sh (live gating) and scripts/replay-learnings-triggers.sh
# (offline replay over transcripts). Both must agree on the exact string a
# trigger regex is tested against, and on which calls skip matching entirely.
#
# Contract:
#   caller sets  LMS_TOOL LMS_CWD LMS_IN_COMMAND LMS_IN_FILE_PATH
#                LMS_IN_NOTEBOOK_PATH LMS_IN_BODY LMS_IN_TITLE
#                LMS_IN_DESCRIPTION LMS_IN_CONTENT
#                LMS_IN_AGENT_MODEL LMS_IN_AGENT_TYPE
#   lms_build    sets LMS_CONTENT LMS_MATCH LMS_EXEMPT LMS_EXEMPT_WHY
#   lms_from_json  fills the LMS_IN_* fields plus LMS_SESSION LMS_TRANSCRIPT
#                  LMS_PROMPT_ID from hook stdin (one jq spawn) and then calls
#                  lms_build
#   lms_resolve_model  echoes the session's current model, or "" when unknown
#
# Replay drives lms_build directly from pre-parsed transcript fields: 17k jq
# spawns is minutes, the same fields through the same function is seconds.

: "${GREP:=${LEARNINGS_GATE_GREP:-/usr/bin/grep}}"

# Collapse to a single log-safe line, capped at 200 chars.
lms_one_line() { printf '%s' "$1" | tr '\t\n\r' '   ' | cut -c1-200; }

lms_extract_list() {
  # $1 = markdown file, $2 = frontmatter key holding a YAML list of EREs.
  # Values are passed to grep -E verbatim: quotes are stripped, nothing is
  # YAML-unescaped, so `\.` in the file stays `\.` in the regex.
  awk -v key="$2" '
    BEGIN { fm=0; in_t=0 }
    /^---[[:space:]]*$/ { fm++; if (fm>=2) exit; next }
    fm==1 && $0 ~ ("^" key ":[[:space:]]*$") { in_t=1; next }
    fm==1 && in_t && /^[[:space:]]+-[[:space:]]+/ {
      sub(/^[[:space:]]+-[[:space:]]+/, "")
      sub(/^"/, ""); sub(/"$/, "")
      sub(/^'\''/, ""); sub(/'\''$/, "")
      print
      next
    }
    fm==1 && in_t && !/^[[:space:]]/ { in_t=0 }
  ' "$1"
}

# ── current model ──────────────────────────────────────────────────────────
# UserPromptSubmit/PreToolUse stdin carries no model field and there is no
# env var, so the primary source is the transcript's assistant entries.
# Cached per prompt_id, which bounds it to one scan per turn and still picks
# up a mid-session /model switch on the following turn. On turn 1 of a fresh
# session no assistant entry exists yet; fall back to the model SessionStart
# delivered (cached by scripts/learnings-session-model.sh). Plain grep, not
# $GREP: the trigger-matching grep is overridable per test and this parse
# must not follow it.
lms_resolve_model() {
  local cache="${TMPDIR:-/tmp}/claude-learnings-model-${LMS_SESSION:-default}"
  local session_cache="${TMPDIR:-/tmp}/claude-learnings-session-model-${LMS_SESSION:-default}"
  local pid="${LMS_PROMPT_ID:--}" cached_pid cached_model model=""
  if [ -f "$cache" ]; then
    IFS=$'\t' read -r cached_pid cached_model < "$cache"
    if [ "$cached_pid" = "$pid" ]; then
      printf '%s' "$cached_model"
      return 0
    fi
  fi
  if [ -n "${LMS_TRANSCRIPT:-}" ] && [ -f "$LMS_TRANSCRIPT" ]; then
    # `<synthetic>` marks harness-generated turns, which carry no real model.
    model=$(tail -c 200000 "$LMS_TRANSCRIPT" 2>/dev/null \
              | grep -o '"model":"[^"]*"' \
              | sed -e 's/.*:"//' -e 's/"$//' \
              | grep -v '^<synthetic>$' \
              | tail -1)
  fi
  if [ -z "$model" ] && [ -f "$session_cache" ]; then
    model=$(head -1 "$session_cache" 2>/dev/null)
  fi
  printf '%s\t%s\n' "$pid" "$model" > "$cache" 2>/dev/null || true
  printf '%s' "$model"
}

# ── read-only Bash allowlist ───────────────────────────────────────────────
# Local text processing only. Deliberately excludes every network and cloud
# client (aws, gh, curl, docker, kubectl, ...): learnings that gate on
# investigation commands must keep firing on investigation.
_LMS_RO_CMDS=" cat head tail less wc ls find file stat sort uniq cut tr column\
 comm diff grep rg egrep fgrep sed awk jq yq echo printf basename dirname\
 realpath type which xxd strings "
_LMS_RO_GIT_SUBS=" log show diff status blame branch remote rev-parse ls-files describe "

lms_is_readonly_bash() {
  # 0 when every segment of the command is a read-only text tool and nothing
  # in the command writes. Errs toward "not read-only" whenever the shape is
  # anything but a plain pipeline of plain words.
  # Pure parameter expansion, no subprocess: this runs on every Bash call.
  local cmd="$1" seg word rest flat
  case "$cmd" in
    # redirection, tee, in-place edits, find actions, and xargs all write;
    # command substitution and subshells hide arbitrary commands.
    *'>'*|*'`'*|*'$('*|*'tee '*|*'-exec'*|*'-delete'*|*'xargs'*) return 1 ;;
  esac
  flat="${cmd//;/$'\n'}"; flat="${flat//|/$'\n'}"; flat="${flat//&/$'\n'}"
  while IFS= read -r seg; do
    seg="${seg#"${seg%%[![:space:]]*}"}"
    [ -z "$seg" ] && continue
    word="${seg%%[[:space:]]*}"
    case "$word" in
      git)
        rest="${seg#*[[:space:]]}"
        case "$_LMS_RO_GIT_SUBS" in *" ${rest%%[[:space:]]*} "*) ;; *) return 1 ;; esac
        ;;
      sed)
        case " $seg " in *' -i '*|*' -i.'*|*'--in-place'*) return 1 ;; esac
        ;;
      *)
        case "$_LMS_RO_CMDS" in *" $word "*) ;; *) return 1 ;; esac
        ;;
    esac
  done <<< "$flat"
  return 0
}

lms_exempt_write_path() {
  # 0 when a file write targets machine-owned scratch rather than something a
  # reader or reviewer ever sees, so comms/style learnings should not gate it.
  case "$1" in
    # throwaway working space
    */scratch/*|scratch/*|*/scratchpad/*) return 0 ;;
    # agent transcripts and per-project auto-memory
    */.claude/projects/*) return 0 ;;
    # auto-memory index, written by the harness convention not by a human
    */memory/MEMORY.md) return 0 ;;
    # machine descriptors handed to the metadev wrapper
    */metadev-restart-*.json) return 0 ;;
  esac
  return 1
}

lms_build() {
  LMS_CONTENT=""
  LMS_EXEMPT=0
  LMS_EXEMPT_WHY=""
  [ -z "${LMS_CWD:-}" ] && LMS_CWD="-"

  case "${LMS_TOOL:-}" in
    ""|Bash)
      LMS_CONTENT="${LMS_IN_COMMAND:-}"
      # Transcript forensics (/improve, "find the session") greps session JSONL
      # under .claude/projects, which holds full command histories — trigger
      # literals there are DATA being searched, not actions to perform.
      case "$LMS_CONTENT" in
        *.claude/projects*) LMS_EXEMPT=1; LMS_EXEMPT_WHY="transcript-forensics" ;;
      esac
      # Reporting a false positive must not itself be gated: the report text
      # quotes the trigger that fired.
      case "$LMS_CONTENT" in
        *scripts/learnings-feedback.sh*) LMS_EXEMPT=1; LMS_EXEMPT_WHY="feedback-reporter" ;;
      esac
      if [ "$LMS_EXEMPT" -eq 0 ] && [ -n "$LMS_CONTENT" ] \
         && lms_is_readonly_bash "$LMS_CONTENT"; then
        LMS_EXEMPT=1; LMS_EXEMPT_WHY="read-only"
      fi
      ;;
    Edit|Write|MultiEdit)
      LMS_CONTENT="${LMS_IN_FILE_PATH:-}"
      lms_exempt_write_path "$LMS_CONTENT" && { LMS_EXEMPT=1; LMS_EXEMPT_WHY="write-path"; }
      ;;
    NotebookEdit)
      LMS_CONTENT="${LMS_IN_NOTEBOOK_PATH:-${LMS_IN_FILE_PATH:-}}"
      lms_exempt_write_path "$LMS_CONTENT" && { LMS_EXEMPT=1; LMS_EXEMPT_WHY="write-path"; }
      ;;
    Agent|Task)
      # `model=inherit` marks a spawn with no model override, so a trigger can
      # gate exactly those (ERE has no negative lookahead).
      LMS_CONTENT="model=${LMS_IN_AGENT_MODEL:-inherit} type=${LMS_IN_AGENT_TYPE:--} ${LMS_IN_DESCRIPTION:-}"
      ;;
    mcp__*)
      # Short user-content fields only. A whitelist keeps file_path-like
      # arguments out of the search string.
      LMS_CONTENT=""
      local part
      for part in "${LMS_IN_BODY:-}" "${LMS_IN_TITLE:-}" "${LMS_IN_DESCRIPTION:-}" "${LMS_IN_CONTENT:-}"; do
        [ -z "$part" ] && continue
        if [ -z "$LMS_CONTENT" ]; then LMS_CONTENT="$part"; else LMS_CONTENT="$LMS_CONTENT $part"; fi
      done
      # Metadata-only writes (assignee/team/state/labels) carry no
      # reader-facing text. Reads never carry prose at all, so exempting them
      # on emptiness would make every read-tool trigger dead.
      case "${LMS_TOOL}" in
        *__list_*|*__get_*|*__search_*) ;;
        *) [ -z "${LMS_CONTENT// /}" ] \
             && { LMS_EXEMPT=1; LMS_EXEMPT_WHY="mcp-metadata-only"; } ;;
      esac
      ;;
  esac

  LMS_MATCH="${LMS_TOOL:-} $LMS_CONTENT"
  if [ "$LMS_EXEMPT" -eq 0 ] && [ -z "${LMS_MATCH// /}" ]; then
    LMS_EXEMPT=1; LMS_EXEMPT_WHY="empty"
  fi
}

lms_from_json() {
  # Two jq spawns, no more: this runs on every Bash/Edit/Write call. Content
  # fields cannot ride the joined row — a multi-line command legitimately
  # contains tabs and newlines. \037 rather than tab, because tab is IFS
  # whitespace and `read` would collapse an empty field away.
  local input="$1"
  IFS=$'\037' read -r LMS_TOOL LMS_CWD LMS_SESSION LMS_TRANSCRIPT LMS_PROMPT_ID <<<"$(printf '%s' "$input" \
    | jq -r '[(.tool_name // ""), (.cwd // ""), (.session_id // ""), (.transcript_path // ""), (.prompt_id // "")] | join("\u001f")' 2>/dev/null || true)"
  LMS_IN_COMMAND=""; LMS_IN_FILE_PATH=""; LMS_IN_NOTEBOOK_PATH=""
  LMS_IN_BODY=""; LMS_IN_TITLE=""; LMS_IN_DESCRIPTION=""; LMS_IN_CONTENT=""
  LMS_IN_AGENT_MODEL=""; LMS_IN_AGENT_TYPE=""
  case "${LMS_TOOL:-}" in
    ""|Bash)
      LMS_IN_COMMAND=$(printf '%s' "$input" | jq -r '.tool_input.command // empty' 2>/dev/null || true)
      ;;
    Edit|Write|MultiEdit|NotebookEdit)
      IFS=$'\037' read -r LMS_IN_FILE_PATH LMS_IN_NOTEBOOK_PATH <<<"$(printf '%s' "$input" \
        | jq -r '[(.tool_input.file_path // ""), (.tool_input.notebook_path // "")] | join("\u001f")' 2>/dev/null || true)"
      ;;
    Agent|Task)
      IFS=$'\037' read -r LMS_IN_AGENT_MODEL LMS_IN_AGENT_TYPE LMS_IN_DESCRIPTION <<<"$(printf '%s' "$input" \
        | jq -r '[(.tool_input.model // ""), (.tool_input.subagent_type // ""), (.tool_input.description // "")] | join("\u001f")' 2>/dev/null || true)"
      ;;
    mcp__*)
      LMS_IN_BODY=$(printf '%s' "$input" | jq -r '[.tool_input.body // empty, .tool_input.title // empty, .tool_input.description // empty, .tool_input.content // empty] | join(" ")' 2>/dev/null || true)
      ;;
  esac
  lms_build
}
