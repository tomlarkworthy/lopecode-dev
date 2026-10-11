#!/bin/bash
# lock.sh take land|cb4 <who> [--wait [seconds]]   take the landing lock (land) or the deploy lock (cb4) as <who>, for 600 s.
#                                                  Exit 0: yours. Exit 1: held, and stderr names the holder and until when.
#                                                  Exit 2: cb4 was not reached, or refused the call. Nothing is taken here.
#                                                  --wait asks again every 20 s (or the seconds given), while it is held
#                                                  and while cb4 is not reached.
# lock.sh renew land|cb4 <who>                     600 s from now for a lock <who> holds. Exit 1, and nothing is taken,
#                                                  when <who> does not hold it. Exit 2 as for take.
# lock.sh release land|cb4 <who>                   give it back. Exit 1, and the lock stays, when <who> is not its holder.
#                                                  Exit 2: not reached, and not released. After a release of land it runs
#                                                  `knowledge-docs.ts put --stale --limit=30` and prints `docs (<brain>): <its
#                                                  last line>`, or `docs (<brain>): not entered (<why>)`; the exit is the
#                                                  release's, 0, either way.
# lock.sh show land|cb4                            the holder, since when and until when. Exit 1 when nobody holds it, also
#                                                  when the last holder's lock has ended. Exit 2: cb4 did not say.
# <who> is the issue id for a writer, or the role and the machine (overseer-$(hostname -s)): a-z A-Z 0-9 . _ -
# LOCK_TOKEN=<name> before the command is the token the call is made as; issues-implementer-2 with none.
#
# The lock is a row cb4 keeps: issue.lock and issue.locks of brain-x-issues (records/lk-1-issue-lock-methods.md). Nothing
# is made on this machine, so an agent in another checkout or on another machine meets the same lock. A lock ends at its
# `until` whoever holds it: nobody removes another's, and one left by an agent that died is taken by the next take.
# The holder is <who> with the token of the call. A release or a renew under another token is refused.
# Use it as `lock.sh take land <who> && { …; lock.sh release land <who>; }` or over several commands, never with a
# release after a `;` that follows a take which may have failed (the release is refused then, exit 1).
# The token is read from cb4-issues-tokens.json, then cb4-agent-tokens.json, in BRAIN_STATE_DIR or with none the main
# checkout's tools/cloud-brain/.emitted (also when the copy that runs is a worktree's own). It is never printed.
# LOCK_BASE is the address, https://cb4.endpointservices.workers.dev with none; only the tests set it.
# A plain take asks once. With --wait, an attempt that got no answer (curl's exit, a 5xx) may have taken the lock; when
# the next answers "held under your own name" the script sends one renew, and exit 0 from that is the take. A plain take
# that exits 2 does not know: `lock.sh renew` before taking again says whether the lock is this caller's.
# Spec plan/cloud-brain-locks-held-in-the-cluster.md, issue lk-3-lock-sh-over-the-cluster, tests/tools/lock.test.ts.
# The docs step (issue bd-2-release-land-enters-docs): <brain> is BRAIN_BASE, or cb4 when the caller set none.
# LOCK_DOCS=0 leaves the step out; LOCK_DOCS=<program> runs that program in the tool's place, with the same arguments.
usage() { sed -n '2,17p' "$0" | sed 's/^# \{0,1\}//' >&2; exit 2; }
CMD="$1"; NAME="$2"; WHO="$3"
case "$NAME" in land|cb4) ;; *) usage ;; esac
named() { case "$WHO" in ""|*[!a-zA-Z0-9._-]*) usage ;; esac; }
EVERY=""
case "$CMD" in
  take)
    named
    if [ "$4" = "--wait" ]; then EVERY="${5:-20}"; elif [ -n "$4" ]; then usage; fi
    # a number above 0 only: sleep refuses anything else, and the loop below would spin with no pause
    if [ -n "$EVERY" ] && ! printf '%s' "$EVERY" | grep -Eq '^([0-9]*[1-9][0-9]*(\.[0-9]+)?|0*\.[0-9]*[1-9][0-9]*)$'; then usage; fi
    ;;
  renew|release) named ;;
  show) ;;
  *) usage ;;
esac
# The main checkout's state, also when the copy that runs is a worktree's own. BRAIN_STATE_DIR as brain.ts reads it.
DIR="${BRAIN_STATE_DIR:-$(dirname "$(git -C "$(dirname "$0")" rev-parse --path-format=absolute --git-common-dir)")/tools/cloud-brain/.emitted}"
AS="${LOCK_TOKEN:-issues-implementer-2}"
BASE="${LOCK_BASE:-https://cb4.endpointservices.workers.dev}"
TOK=$(python3 - "$AS" "$DIR" <<'PY'
import json, os, sys
for f in ("cb4-issues-tokens.json", "cb4-agent-tokens.json"):
    p = os.path.join(sys.argv[2], f)
    try: t = json.load(open(p)).get(sys.argv[1]) if os.path.exists(p) else None
    except (ValueError, AttributeError, OSError): t = None
    if isinstance(t, str) and t:
        print(t)
        sys.exit(0)
sys.exit(1)
PY
) || { echo "lock.sh: no token named $AS is kept in $DIR; nothing was sent" >&2; exit 2; }
OUT="$(mktemp)" || { echo "lock.sh: no temporary file; nothing was sent" >&2; exit 2; }
trap 'rm -f "$OUT"' EXIT
# call <json>: a POST to issue.lock; call "": a read of issue.locks. CODE is the status, 000 when curl got no answer.
# The token goes to curl on stdin, not in its arguments.
call() {
  : > "$OUT"
  if [ -n "$1" ]; then CODE="$(printf 'authorization: Bearer %s\n' "$TOK" | curl -s -m 30 -o "$OUT" -w '%{http_code}' -H @- -H 'content-type: application/json' -X POST -d "$1" "$BASE/xrpc/com.lopecode.brain.issue.lock")"
  else CODE="$(printf 'authorization: Bearer %s\n' "$TOK" | curl -s -m 30 -o "$OUT" -w '%{http_code}' -H @- "$BASE/xrpc/com.lopecode.brain.issue.locks")"; fi
  [ $? -eq 0 ] || CODE=000
}
# The answer as shell variables, each quoted. A_ the answer's own row, H_ its `holder`, O_ its `over`, S_ the row of
# NAME in issue.locks; a time as `date` prints it here. HELD 1; HOLDER named, null or none; SHOWN held, ended or nobody.
answer() {
  eval "$(python3 - "$OUT" "$NAME" <<'PY'
import json, shlex, sys, time
def at(ms):
    try: return time.strftime("%Y-%m-%d %H:%M:%S %Z", time.localtime(ms / 1000))
    except Exception: return ""
try: a = json.load(open(sys.argv[1]))
except Exception: a = None
if not isinstance(a, dict): a = {}
v = {}
def row(p, r):
    r = r if isinstance(r, dict) else {}
    v[p + "WHO"] = r.get("who") if isinstance(r.get("who"), str) else ""
    v[p + "N"] = r.get("n") if isinstance(r.get("n"), int) else ""
    for k in ("taken", "until", "ended"): v[p + k.upper()] = at(r[k]) if isinstance(r.get(k), (int, float)) else ""
row("A_", a); row("H_", a.get("holder")); row("O_", a.get("over"))
v["HELD"] = 1 if a.get("held") is True and v["A_WHO"] else ""
v["HOLDER"] = "named" if v["H_WHO"] else "null" if "holder" in a and a["holder"] is None else "none"
def find(key): return next((r for r in a.get(key) if isinstance(r, dict) and r.get("name") == sys.argv[2]), None) if isinstance(a.get(key), list) else None
held, ended = find("locks"), find("ended")
row("S_", held or ended)
v["SHOWN"] = "held" if held else "ended" if ended else "nobody" if isinstance(a.get("locks"), list) and isinstance(a.get("ended"), list) else ""
for k, x in v.items(): print("%s=%s" % (k, shlex.quote(str(x))))
PY
)"
}
gone() { [ "$CODE" = 000 ] || [ "${CODE#5}" != "$CODE" ]; }
refused() { echo "lock.sh: cb4 refused $1 [$CODE] $(head -c 400 "$OUT")" >&2; exit 2; }
other() { if [ "$H_WHO" = "$WHO" ]; then echo "$NAME is held under your name by another token; this call used $AS"; else echo "$NAME is held by $H_WHO since $H_TAKEN, until $H_UNTIL, not by $WHO"; fi; }
TAKE="{\"name\":\"$NAME\",\"who\":\"$WHO\"}"
RENEW="{\"name\":\"$NAME\",\"who\":\"$WHO\",\"renew\":true}"
case "$CMD" in
  take)
    LOST=""; SAID=""
    while :; do
      call "$TAKE"; answer; MINE=""
      # An attempt of this run got no answer and may have taken it: one renew says whether the lock is this caller's.
      if [ "$CODE" = 409 ] && [ -n "$LOST" ] && [ "$H_WHO" = "$WHO" ]; then call "$RENEW"; answer; MINE=1; fi
      if gone; then
        LOST=1; WHY="cb4 was not reached [$CODE]"
        [ -n "$EVERY" ] || { echo "lock.sh: $WHY. Not taken, as far as this run knows: if the call arrived $NAME is held under your name, and \`lock.sh renew $NAME $WHO\` says (exit 0: yours)." >&2; exit 2; }
      elif [ "$CODE" = 200 ] && [ "$HELD" = 1 ]; then
        if [ -n "$MINE" ]; then echo "an attempt of this run got no answer and had taken $NAME; renewed"
        elif [ -n "$O_WHO" ]; then echo "took over $O_WHO's lock, which ended at $O_UNTIL"; fi
        echo "$NAME taken by $WHO at $A_TAKEN, until $A_UNTIL"
        exit 0
      elif [ "$CODE" = 409 ]; then
        LOST=""
        if [ "$HOLDER" != named ]; then WHY="$NAME was let go while this run asked"
        elif [ "$H_WHO" = "$WHO" ]; then WHY="$NAME is held under your own name since $H_TAKEN, until $H_UNTIL"
        else WHY="$NAME is held by $H_WHO since $H_TAKEN, until $H_UNTIL"; fi
        [ -n "$EVERY" ] || { echo "lock.sh: $WHY. Not taken." >&2; exit 1; }
      else refused "the take"; fi
      [ "$WHY" = "$SAID" ] || { echo "lock.sh: $WHY; asking again every $EVERY s" >&2; SAID="$WHY"; }
      sleep "$EVERY" || { echo "lock.sh: sleep refused $EVERY seconds. Not taken." >&2; exit 2; }
    done
    ;;
  renew)
    call "$RENEW"; answer
    if gone; then echo "lock.sh: cb4 was not reached [$CODE]. Not renewed, as far as this run knows; ask again." >&2; exit 2; fi
    case "$CODE" in
      200)
        [ "$HELD" = 1 ] || refused "the renew"
        echo "$NAME renewed by $WHO, until $A_UNTIL (taken $A_TAKEN)"
        [ -z "$O_WHO" ] || echo "renewed after it had ended at $O_UNTIL; nobody held it between"
        ;;
      409)
        if [ "$HOLDER" = named ]; then echo "lock.sh: $(other); not yours to renew. Nothing taken." >&2
        else echo "lock.sh: $NAME is not held; not yours to renew. Nothing taken." >&2; fi
        exit 1
        ;;
      *) refused "the renew" ;;
    esac
    ;;
  release)
    call "{\"name\":\"$NAME\",\"who\":\"$WHO\",\"release\":true}"; answer
    if gone; then echo "lock.sh: cb4 was not reached [$CODE]. Not released, as far as this run knows; run the release again. A lock nobody releases ends at its time." >&2; exit 2; fi
    case "$CODE" in
      200) [ -n "$A_ENDED" ] || refused "the release" ;;
      409|403)
        if [ "$HOLDER" = named ]; then echo "lock.sh: $(other). Left where it is." >&2
        elif [ "$CODE" = 409 ]; then echo "lock.sh: $NAME is not held; nothing released" >&2
        else refused "the release"; fi
        exit 1
        ;;
      *) refused "the release" ;;
    esac
    echo "$NAME released by $WHO at $A_ENDED (taken $A_TAKEN)"
    # The docs of origin/main that are behind in the Brain's search are entered now, the lock already gone.
    if [ "$NAME" = land ] && [ "${LOCK_DOCS:-}" != 0 ]; then
      export BRAIN_BASE="${BRAIN_BASE:-cb4}"
      if [ -n "${LOCK_DOCS:-}" ]; then OUT2="$("$LOCK_DOCS" put --stale --limit=30 2>&1)"; else OUT2="$(bun "$(dirname "$0")/knowledge-docs.ts" put --stale --limit=30 2>&1)"; fi
      RC=$?
      if [ "$RC" = 0 ]; then echo "docs ($BRAIN_BASE): $(printf '%s\n' "$OUT2" | grep -v '^[[:space:]]*$' | tail -1)"
      else
        WHY="$(printf '%s\n' "$OUT2" | sed -n 's/^error: //p' | head -1)"
        [ -n "$WHY" ] || WHY="$(printf '%s\n' "$OUT2" | grep -v '^[[:space:]]*$' | tail -1)"
        echo "docs ($BRAIN_BASE): not entered (${WHY:-exit $RC, and it printed nothing})" | cut -c1-400
      fi
    fi
    exit 0
    ;;
  show)
    call ""; answer
    [ "$CODE" = 200 ] && [ -n "$SHOWN" ] || { echo "lock.sh: cb4 did not say who holds $NAME [$CODE] $(head -c 400 "$OUT")" >&2; exit 2; }
    case "$SHOWN" in
      held) echo "$NAME is held by $S_WHO since $S_TAKEN, until $S_UNTIL" ;;
      ended) echo "$NAME is not held; $S_WHO's lock ended at $S_UNTIL" >&2; exit 1 ;;
      *) echo "$NAME is not held"; exit 1 ;;
    esac
    ;;
esac
