#!/bin/bash
# land.sh <token> <id> --reason <text|@file> [--comment @file] [--test <command>]... [--wait <seconds>] [--seed-lands-undeployed]
# land.sh <token> <id> --no-submit [--test <command>]... [--wait <seconds>] [--seed-lands-undeployed]
#
# The landing of a change with no deploy, and its submit, as one command: what a writer of the issue loop made as six
# to ten calls (agents/implementer.md, step 10's five lines and step 12). Run the worktree's own copy, once the change
# is committed there. In order, each step's exit read before the next:
#   1. read      issue-as.sh <token> get?id=<id>: the issue is in-progress and its last start is this token's, or
#                nothing is sent (another token's submit is refused 403, and that would be after the push). The round
#                is the count of its rework moves plus one.
#   2. take      LOCK_TOKEN=<token> lock.sh take land <id>, asked again every 20 s while another holds it, for
#                --wait seconds at most (300 with none; 0 asks once).
#   3. rebase    worktree.sh --rebase <tree>, <tree> being what follows bm- in the worktree's name.
#   4. test      each --test command, in the order given, with bash -c at the root of the worktree: the commits tested
#                are the ones pushed. The lock is held meanwhile, for 600 s from the take: give the files of the change
#                (bun test --timeout=30000 ./tests/tools/<file>), not a run that takes minutes.
#   5. renew     lock.sh renew land <id>.
#   6. push      git push origin HEAD:main. Refused (a push of main with no lock since the rebase): steps 3 to 5 once
#                more, then one more push.
#   7. comment   with --comment: issue.comment, key impl/<id>/comment-<round>, the file's bytes as the body.
#   8. submit    issue.move to in-review, key impl/<id>/submit-<round>, the reason as given, one ref
#                lopecode-dev@<sha> for each commit the push added. --no-submit leaves 7 and 8 out.
#   9. release   lock.sh release land <id>, which also enters the docs (its line `docs (cb4): …`).
# It stops at the first step that fails, releases the lock when it holds it, and prints that step's output alone on
# stdout; stderr has one line that names the step and what stands. With every step made, stdout is a line a step.
#
# Exit 0   landed, and submitted unless --no-submit. The line `submitted … seq=<n>` has the seq issue-wait.sh takes.
# Exit 1   stopped before the push: nothing is on origin/main and nothing was written to the issue.
# Exit 5   pushed, and the comment or the submit was not written: stderr has the call to make by hand. Do not run
#          land.sh again for it: nothing is left to push.
# Exit 7   landed and submitted, and the release did not answer: the lock ends at its time; run the release again.
# Exit 64  the arguments, the worktree, or an issue that is not this token's to submit: no lock was taken and nothing
#          was written. Exit 2: the read of the issue got no answer; the same.
#
# Not for a landing with a deploy (the build, the apply and seen.json come between the rebase and the push: step 10 of
# the brief): a commit that changes a seed, tools/cloud-brain/*.ojs, is refused, exit 64. --seed-lands-undeployed is
# for a seed whose deploy is the owner's (the brief, step 3): the first line of the reason says cb4 does not run it.
# A --reason or a --comment that begins with @ names a file, whose bytes are the text. The text is sent as written:
# issue-as.sh still refuses one that names a time ahead of the clock (exit 3), which is exit 5 here.
# The tools are the ones beside this file; what they read (LOCK_BASE, ISSUE_AS_BASE, BRAIN_STATE_DIR, LOCK_DOCS) is
# read by them. LAND_EVERY is the seconds between two takes, 20 with none; only the tests set it.
# Issue landing-steps-in-one-script, tests/tools/land.test.ts, records/landing-steps-in-one-script.md.
HERE="$(cd "$(dirname "$0")" && pwd)"
usage() { sed -n '2,3p' "$0" | sed 's/^# \{0,1\}//' >&2; [ -z "$1" ] || echo "land.sh: $1; nothing was sent" >&2; exit 64; }
TOKEN="$1"; ID="$2"
case "$TOKEN" in ""|-*|*[!a-zA-Z0-9._-]*) usage ;; esac
case "$ID" in ""|-*|*[!a-zA-Z0-9._-]*) usage ;; esac
shift 2
REASON=""; COMMENT=""; SUBMIT=1; WAIT=300; SEED=""; TESTS=()
while [ $# -gt 0 ]; do
  case "$1" in
    --reason) [ $# -ge 2 ] || usage; REASON="$2"; shift 2 ;;
    --comment) [ $# -ge 2 ] || usage; COMMENT="$2"; shift 2 ;;
    --test) [ $# -ge 2 ] && [ -n "$2" ] || usage; TESTS+=("$2"); shift 2 ;;
    --wait) [[ "$2" =~ ^[0-9]+$ ]] || usage "--wait takes whole seconds"; WAIT="$2"; shift 2 ;;
    --no-submit) SUBMIT=""; shift ;;
    --seed-lands-undeployed) SEED=1; shift ;;
    *) usage "'$1' is not an argument" ;;
  esac
done
text() { case "$1" in @*) [ -s "${1#@}" ] || usage "the file ${1#@} is absent or empty"; cat "${1#@}" ;; *) printf '%s' "$1" ;; esac; }
if [ -n "$SUBMIT" ]; then
  [ -n "$REASON" ] || usage "a submit takes --reason"
  REASON_TEXT="$(text "$REASON")" || exit 64
  [ -n "$REASON_TEXT" ] || usage "the reason is empty"
  case "$COMMENT" in "") ;; @*) [ -s "${COMMENT#@}" ] || usage "the file ${COMMENT#@} is absent or empty" ;; *) usage "--comment takes @file" ;; esac
else
  [ -z "$REASON$COMMENT" ] || usage "--no-submit writes nothing to the issue and takes no --reason or --comment"
fi

W="$(git -C "$HERE" rev-parse --show-toplevel 2>/dev/null)"
case "$W" in */.claude/worktrees/bm-*) ;; *) usage "$HERE is in no worktree .claude/worktrees/bm-<tree>: run the worktree's own copy" ;; esac
TREE="${W##*/bm-}"
OURS=(. ':!lopebooks' ':!lopecode' ':!lopecode-plugin' ':!cloud-brain-dev')
CHANGED="$(git -C "$W" diff --name-only HEAD -- "${OURS[@]}" | tr '\n' ' ')"
[ -z "$CHANGED" ] || usage "not committed in $W: $CHANGED(commit each by name, or \`git checkout -- <file>\`)"
[ "$(git -C "$W" rev-list --count origin/main..HEAD)" != 0 ] || usage "no commit of $W is ahead of origin/main: nothing to land"
seeds() { git -C "$W" diff --name-only "$1" HEAD -- 'tools/cloud-brain/*.ojs' | tr '\n' ' '; }
if [ -z "$SEED" ]; then
  S="$(seeds "$(git -C "$W" merge-base origin/main HEAD)")"
  [ -z "$S" ] || usage "the commits change a seed ($S): that landing has a deploy, which this tool does not make (--seed-lands-undeployed when the deploy is the owner's)"
fi

TMP="$(mktemp -d "${TMPDIR:-/tmp}/land.XXXXXX")"
OUT="$TMP/out"; HELD=""; PUSHED=""
lock() { LOCK_TOKEN="$TOKEN" "$HERE/lock.sh" "$@"; }
say() { echo "land.sh: $*" >&2; }
release() {
  [ -n "$HELD" ] || return 0
  HELD=""
  lock release land "$ID" > "$TMP/release" 2>&1 || { sleep 1; lock release land "$ID" > "$TMP/release" 2>&1; }
}
# Whatever ends the run, a lock it holds is given back.
trap 'release; rm -rf "$TMP"' EXIT
trap 'exit 130' INT TERM
# The step that failed: its output alone on stdout, then what stands.
stop() {
  local step="$1" rc="$2" code=1
  cat "$OUT"
  [ -z "$PUSHED" ] || code=5
  if [ -n "$HELD" ]; then
    if release; then say "stopped at $step (exit $rc). $3 The landing lock is released."
    else say "stopped at $step (exit $rc). $3 The release did not answer: $(tail -1 "$TMP/release"). The lock ends at its time."; fi
  else say "stopped at $step (exit $rc). $3"; fi
  exit "$code"
}
NOTHING="Nothing was pushed and nothing was written to the issue."

# 1. read
"$HERE/issue-as.sh" "$TOKEN" "get?id=$ID" > "$TMP/issue" 2> "$TMP/status"; RC=$?
if [ "$RC" != 0 ] || ! grep -q '\[200\]' "$TMP/status"; then
  { cat "$TMP/status"; head -c 400 "$TMP/issue"; echo; } > "$OUT"; cat "$OUT"
  say "stopped at read (exit $RC): the issue was not read. No lock was taken. $NOTHING"
  [ "$RC" = 2 ] && exit 64
  exit 2
fi
ROUND="$(python3 -I - "$TMP/issue" "$TOKEN" "$SUBMIT" 2> "$TMP/why" <<'PY'
import json, sys
try: a = json.load(open(sys.argv[1], encoding="utf-8"))
except ValueError: sys.exit("the read gave no JSON")
issue, events = a.get("issue") or {}, a.get("events") or []
moves = [e for e in events if e.get("type") == "moved"]
if sys.argv[3]:
    if issue.get("state") != "in-progress": sys.exit("the issue is %s, not in-progress: it is not submitted from there" % issue.get("state"))
    starts = [e for e in moves if e.get("move") == "start"]
    holder = ((starts[-1].get("by") or {}).get("holder") if starts else None)
    if holder != "secret:" + sys.argv[2]: sys.exit("the last start of the issue is %s's, and only that token submits it" % (holder or "nobody"))
print(sum(1 for e in moves if e.get("move") == "rework") + 1)
PY
)" || { say "$(cat "$TMP/why"). No lock was taken. $NOTHING"; exit 64; }

# 2. take
EVERY="${LAND_EVERY:-20}"; END=$(( $(date +%s) + WAIT ))
while :; do
  lock take land "$ID" > "$OUT" 2>&1; RC=$?
  # A take that got no answer may have arrived: the renew says whether the lock is this caller's.
  if [ "$RC" = 2 ] && lock renew land "$ID" > "$TMP/renew" 2>&1; then cat "$TMP/renew" >> "$OUT"; RC=0; fi
  [ "$RC" = 0 ] && break
  [ "$(date +%s)" -lt "$END" ] || stop take "$RC" "The lock was not taken in $WAIT s. $NOTHING"
  sleep "$EVERY"
done
HELD=1
TAKEN="$(tail -1 "$OUT")"

# 3 to 5, then the push; once more when the push is refused.
landing() {
  "$HERE/worktree.sh" --rebase "$TREE" > "$OUT" 2> "$TMP/err"; RC=$?
  if [ "$RC" != 0 ]; then cat "$TMP/err" >> "$OUT"; stop rebase "$RC" "$NOTHING"; fi
  CAME="$(grep -c . "$OUT")"
  BASE="$(git -C "$W" rev-parse origin/main)"
  local t
  for t in "${TESTS[@]}"; do
    (cd "$W" && bash -c "$t") > "$OUT" 2>&1; RC=$?
    [ "$RC" = 0 ] || stop "test \`$t\`" "$RC" "$NOTHING"
  done
  lock renew land "$ID" > "$OUT" 2>&1; RC=$?
  # Exit 1: the 600 s ended and another writer has, or has had, the lock. It is not this run's to release.
  if [ "$RC" = 1 ]; then HELD=""; fi
  [ "$RC" = 0 ] || stop renew "$RC" "$NOTHING"
  git -C "$W" push origin HEAD:main > "$OUT" 2>&1
}
landing; RC=$?
if [ "$RC" != 0 ]; then
  cp "$OUT" "$TMP/push-1"
  landing; RC=$?
  if [ "$RC" != 0 ]; then { echo "the first push:"; cat "$TMP/push-1"; echo "the second, after a rebase:"; cat "$OUT"; } > "$TMP/both"; mv "$TMP/both" "$OUT"; stop push "$RC" "$NOTHING"; fi
fi
PUSHED=1
SHAS="$(git -C "$W" rev-list --reverse "$BASE..HEAD" | tr '\n' ' ')"
LANDED="pushed ${SHAS}to origin/main; $CAME file(s) came in at the rebase; ${#TESTS[@]} test command(s) passed"

# 7 and 8. A write that answered is 200 and not a key used before.
written() {
  local rc
  "$HERE/issue-as.sh" "$TOKEN" "$1" "@$2" > "$TMP/answer" 2> "$TMP/status"; rc=$?
  { cat "$TMP/status"; head -c 600 "$TMP/answer"; echo; } > "$OUT"
  [ "$rc" = 0 ] || return "$rc"
  grep -q '\[200\]' "$TMP/status" || return 1
  python3 -I -c 'import json,sys; a=json.load(open(sys.argv[1],encoding="utf-8")); sys.exit(9 if a.get("duplicate") else 0)' "$TMP/answer" 2>/dev/null
}
if [ -n "$SUBMIT" ]; then
  HAND="By hand: issue-as.sh $TOKEN move with the key impl/$ID/submit-$ROUND, to in-review, and the refs$(for s in $SHAS; do printf ' lopecode-dev@%s' "$s"; done)."
  if [ -n "$COMMENT" ]; then
    python3 -I -c 'import json,sys; a=sys.argv; json.dump({"key":"impl/%s/comment-%s"%(a[1],a[2]),"id":a[1],"body":open(a[3],encoding="utf-8",newline="").read()},open(a[4],"w"))' "$ID" "$ROUND" "${COMMENT#@}" "$TMP/comment.json"
    written comment "$TMP/comment.json"; RC=$?
    [ "$RC" = 0 ] || stop comment "$RC" "$LANDED. The comment was not written (exit 9: its key was used before) and the submit was not sent. $HAND"
  fi
  printf '%s' "$REASON_TEXT" > "$TMP/reason"
  python3 -I -c 'import json,sys; a=sys.argv; json.dump({"key":"impl/%s/submit-%s"%(a[1],a[2]),"id":a[1],"to":"in-review","reason":open(a[3],encoding="utf-8",newline="").read(),"refs":[{"kind":"commit","value":"lopecode-dev@"+s} for s in a[5:]]},open(a[4],"w"))' "$ID" "$ROUND" "$TMP/reason" "$TMP/submit.json" $SHAS
  written move "$TMP/submit.json"; RC=$?
  [ "$RC" = 0 ] || stop submit "$RC" "$LANDED. The submit was not written (exit 9: its key was used before, and nothing moved). $HAND"
  SEQ="$(python3 -I -c 'import json,sys; print(json.load(open(sys.argv[1],encoding="utf-8")).get("seq",""))' "$TMP/answer" 2>/dev/null)"
fi

# 9. release
echo "$TAKEN"
echo "$LANDED"
[ -z "$SUBMIT" ] || echo "submitted impl/$ID/submit-$ROUND${COMMENT:+, after the comment impl/$ID/comment-$ROUND} seq=$SEQ"
if release; then cat "$TMP/release"; exit 0; fi
cat "$TMP/release"
say "landed${SUBMIT:+ and submitted}; the release did not answer. The lock ends at its time; run: LOCK_TOKEN=$TOKEN $HERE/lock.sh release land $ID"
exit 7
