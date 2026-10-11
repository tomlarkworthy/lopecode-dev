#!/bin/bash
# lock.sh take land|cb4 <who> [--wait [seconds]]   take the landing lock (land) or the deploy lock (cb4) as <who>.
#                                                  Exit 0: yours. Exit 1: held, and stderr names the holder.
#                                                  --wait looks again every 20 s (or the seconds given) until it is taken.
# lock.sh release land|cb4 <who>                   give it back. Exit 1, and the lock stays, when <who> is not its holder.
#                                                  After a release of land it runs `knowledge-docs.ts put --stale --limit=30`
#                                                  and prints `docs (<brain>): <its last line>`, or `docs (<brain>): not
#                                                  entered (<why>)`; the exit is the release's, 0, either way.
# lock.sh show land|cb4                            the holder and since when. Exit 1 when nobody holds it.
# <who> is the issue id for a writer, or the role (overseer, orchestrator): a-z A-Z 0-9 . _ -
#
# The lock is the directory rules.md names, <main checkout>/tools/cloud-brain/.emitted/<land|cb4>.lock, with a
# file `holder` in it. So `mkdir` by a session that does not use this tool still fails while it is held, and a
# bare `rmdir` fails too (the directory is not empty): `take … && work; release …`, and the same with rmdir,
# leave another holder's lock where it is. A lock made with a bare mkdir has no holder; this tool takes it for
# held and does not release it. A lock left by an agent that died is the owner's to remove (`rm -r`).
# Use it as `lock.sh take land <who> && { …; lock.sh release land <who>; }` or over several commands; never
# `…; rmdir`. Issue land-lock-any-session-can-remove, tests/tools/lock.test.ts.
# The docs step (issue bd-2-release-land-enters-docs): <brain> is BRAIN_BASE, or cb4 when the caller set none.
# LOCK_DOCS=0 leaves the step out; LOCK_DOCS=<program> runs that program in the tool's place, with the same arguments.
usage() { sed -n '2,10p' "$0" | sed 's/^# \{0,1\}//' >&2; exit 2; }
CMD="$1"; NAME="$2"; WHO="$3"
case "$NAME" in land|cb4) ;; *) usage ;; esac
# The main checkout's state, also when the copy that runs is a worktree's own. BRAIN_STATE_DIR as brain.ts reads it.
DIR="${BRAIN_STATE_DIR:-$(dirname "$(git -C "$(dirname "$0")" rev-parse --path-format=absolute --git-common-dir)")/tools/cloud-brain/.emitted}"
LOCK="$DIR/$NAME.lock"
holder() { if [ -f "$LOCK/holder" ]; then cut -f1 "$LOCK/holder"; fi; }
since() { if [ -f "$LOCK/holder" ]; then cut -f2 "$LOCK/holder"; else echo "unknown"; fi; }
held() { local h; h="$(holder)"; echo "${h:-nobody this tool knows (a bare mkdir, or a take that has not written its name yet)}, since $(since)"; }
named() { case "$WHO" in ""|*[!a-zA-Z0-9._-]*) usage ;; esac; }
case "$CMD" in
  take)
    named
    EVERY=""; if [ "$4" = "--wait" ]; then EVERY="${5:-20}"; elif [ -n "$4" ]; then usage; fi
    # a number above 0 only: sleep refuses anything else, and the loop below would spin with no pause
    if [ -n "$EVERY" ] && ! printf '%s' "$EVERY" | grep -Eq '^([0-9]*[1-9][0-9]*(\.[0-9]+)?|0*\.[0-9]*[1-9][0-9]*)$'; then usage; fi
    until mkdir "$LOCK" 2>/dev/null; do
      [ -d "$LOCK" ] || { echo "lock.sh: cannot make $LOCK" >&2; exit 2; }
      [ -n "$EVERY" ] || { echo "lock.sh: $NAME.lock is held by $(held). Not taken; do not remove it." >&2; exit 1; }
      sleep "$EVERY" || { echo "lock.sh: sleep refused $EVERY seconds. Not taken." >&2; exit 2; }
    done
    printf '%s\t%s\n' "$WHO" "$(date '+%Y-%m-%d %H:%M:%S %Z')" > "$LOCK/holder"
    echo "$NAME.lock taken by $WHO at $(since)"
    ;;
  release)
    named
    [ -d "$LOCK" ] || { echo "lock.sh: $NAME.lock is not held; nothing released" >&2; exit 1; }
    [ "$(holder)" = "$WHO" ] || { echo "lock.sh: $NAME.lock is held by $(held), not by $WHO. Left where it is." >&2; exit 1; }
    TOOK="$(since)"
    rm "$LOCK/holder" && rmdir "$LOCK" || { echo "lock.sh: could not remove $LOCK" >&2; exit 2; }
    echo "$NAME.lock released by $WHO at $(date '+%Y-%m-%d %H:%M:%S %Z') (taken $TOOK)"
    # The docs of origin/main that are behind in the Brain's search are entered now, the lock already gone.
    if [ "$NAME" = land ] && [ "${LOCK_DOCS:-}" != 0 ]; then
      export BRAIN_BASE="${BRAIN_BASE:-cb4}"
      if [ -n "${LOCK_DOCS:-}" ]; then OUT="$("$LOCK_DOCS" put --stale --limit=30 2>&1)"; else OUT="$(bun "$(dirname "$0")/knowledge-docs.ts" put --stale --limit=30 2>&1)"; fi
      RC=$?
      if [ "$RC" = 0 ]; then echo "docs ($BRAIN_BASE): $(printf '%s\n' "$OUT" | grep -v '^[[:space:]]*$' | tail -1)"
      else
        WHY="$(printf '%s\n' "$OUT" | sed -n 's/^error: //p' | head -1)"
        [ -n "$WHY" ] || WHY="$(printf '%s\n' "$OUT" | grep -v '^[[:space:]]*$' | tail -1)"
        echo "docs ($BRAIN_BASE): not entered (${WHY:-exit $RC, and it printed nothing})" | cut -c1-400
      fi
    fi
    exit 0
    ;;
  show)
    [ -d "$LOCK" ] || { echo "$NAME.lock is not held"; exit 1; }
    echo "$NAME.lock is held by $(held)"
    ;;
  *) usage ;;
esac
