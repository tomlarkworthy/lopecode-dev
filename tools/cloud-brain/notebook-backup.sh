#!/bin/bash
# notebook-backup.sh <built notebook>
#   Writes the build over notebooks/@tomlarkworthy_cloud-brain.html in lopebooks of the main checkout, and commits that
#   file there when its last commit is of an earlier day (local time). Run by a landing, under the landing lock,
#   from the landing's worktree (.claude/skills/brain-maintenance/agents/implementer.md, step 10). It does not push.
# Prints one line:
#   committed <sha> <day>            the day's backup was made: commit the lopebooks pointer in lopecode-dev, push both
#   not due: last committed <day>    the file is written and not committed; nothing to push in lopebooks
#   same: last committed <day>       a backup was due and the build is the committed file, byte for byte
# Exit 0 for those three. Exit 1: no build at the path, or it is empty; nothing is written. Exit 3: the commit was
# refused three times (a hook); the file is written, the hook's words are on stderr.
# A backup is run after the apply has answered, so that the build committed is one cb4 ran. A backup commit of this
# tool's that the branch's upstream does not have (a landing that stopped between the commit and the push, or one
# that made the backup before an apply that was put back) is taken back first, with `took back <sha>` on stderr:
# the commit is undone, the build of this run is the file, and the three lines above are of the commit before it.
# Taken back is a commit at HEAD with this tool's subject and no file but the notebook and its .json; anything else
# ahead of the upstream is left. Issue backup-committed-before-apply-answers.
# notebook-backup.sh --take-back
#   That alone, with no build: prints `took back <sha>` (one sha a commit) or `nothing to take back`, exit 0. The
#   notebook, and its .json when the commit before has one, are put back as that commit has them.
# The notebook is the build of the seeds of a lopecode-dev commit (`build.ts --out`; since 2026-10-14 with brain-git and
# brain-fly as cb4 runs them at the build, as they have no seed), so what is
# committed here is a backup and no landing waits on it. Issue notebook-commit-once-a-day; tests/tools/notebook-backup.test.ts.
# notebook-backup.sh --build
#   The same, with the notebook that notebook.ts of cloud-brain-dev makes from deploy/ as sync.ts reads it from the Brain
#   in place of a build given (R9 of i13287, issue i13812). Both run in a detached worktree of NOTEBOOK_DEV's HEAD, which
#   is removed after, so no checkout's deploy/ is written. Exit 1 when either fails; nothing is written. Not run by a
#   landing yet: notebook.ts writes no bootloader, so its file does not open in a browser as build.ts's does.
# NOTEBOOK_REPO is the repository, the main checkout's lopebooks with none. NOTEBOOK_TODAY is the day, `date +%F` with
# none. NOTEBOOK_DEV is the cloud-brain-dev clone, this checkout's with none; NOTEBOOK_BRAIN the Brain's address, cb4's
# with none. Only the tests set the first three.
BUILT="$1"
FROM="the seeds of lopecode-dev@$(git -C "$(dirname "$0")" rev-parse --short HEAD)"
if [ "$BUILT" = "--build" ]; then
  DEV="${NOTEBOOK_DEV:-$(git -C "$(dirname "$0")" rev-parse --show-toplevel)/cloud-brain-dev}"
  BRAIN="${NOTEBOOK_BRAIN:-https://cb4.endpointservices.workers.dev}"
  TMP="$(mktemp -d)"; WT="$TMP/dev"
  trap 'git -C "$DEV" worktree remove --force "$WT" >/dev/null 2>&1; rm -rf "$TMP"' EXIT
  git -C "$DEV" worktree add -q --detach "$WT" HEAD >&2 || { echo "notebook-backup.sh --build: no worktree of $DEV; nothing is written" >&2; exit 1; }
  ( cd "$WT" && bun sync.ts "$BRAIN" >&2 && bun notebook.ts --out "$TMP/cloud-brain.html" >&2 ) || { echo "notebook-backup.sh --build: sync.ts or notebook.ts failed in a worktree of $DEV; nothing is written" >&2; exit 1; }
  BUILT="$TMP/cloud-brain.html"
  FROM="deploy/ by notebook.ts of cloud-brain-dev@$(git -C "$WT" rev-parse --short HEAD), as sync.ts read it from $BRAIN"
fi
[ "$BUILT" = "--take-back" ] || { [ -n "$BUILT" ] && [ -s "$BUILT" ]; } || { echo "notebook-backup.sh <built notebook>: no file, or an empty one, at '${BUILT}'" >&2; exit 1; }
ROOT="$(dirname "$(git -C "$(dirname "$0")" rev-parse --path-format=absolute --git-common-dir)")"
REPO="${NOTEBOOK_REPO:-$ROOT/lopebooks}"
TODAY="${NOTEBOOK_TODAY:-$(date +%F)}"
HTML="notebooks/@tomlarkworthy_cloud-brain.html"; JSON="notebooks/@tomlarkworthy_cloud-brain.json"
[ -d "$REPO/notebooks" ] || { echo "notebook-backup.sh: no $REPO/notebooks" >&2; exit 1; }
# Undoes backup commits of this tool at HEAD that the upstream does not have; TOOK is their shas. The index keeps
# what else is staged, and the working files are not touched.
TOOK=""
take_back() {
  local up f n=0
  while [ $n -lt 10 ]; do
    n=$((n + 1))
    up="$(git -C "$REPO" rev-parse -q --verify '@{upstream}' 2>/dev/null)"; [ -n "$up" ] || return 0
    git -C "$REPO" merge-base --is-ancestor HEAD "$up" && return 0
    git -C "$REPO" rev-parse -q --verify 'HEAD~1' >/dev/null 2>&1 || return 0
    case "$(git -C "$REPO" log -1 --format=%s)" in "cloud-brain: the notebook of "*) ;; *) return 0 ;; esac
    while IFS= read -r f; do [ "$f" = "$HTML" ] || [ "$f" = "$JSON" ] || return 0; done < <(git -C "$REPO" diff-tree --no-commit-id --name-only -r HEAD)
    f="$(git -C "$REPO" rev-parse --short=8 HEAD)"
    git -C "$REPO" reset -q --soft 'HEAD~1' || return 1
    git -C "$REPO" reset -q -- "$HTML" "$JSON" 2>/dev/null || git -C "$REPO" reset -q -- "$HTML" || return 1
    TOOK="${TOOK:+$TOOK }$f"
  done
}
if [ "$BUILT" = "--take-back" ]; then
  take_back || { echo "notebook-backup.sh: a commit in $REPO was not taken back${TOOK:+ (taken back: $TOOK)}" >&2; exit 1; }
  [ -n "$TOOK" ] || { echo "nothing to take back"; exit 0; }
  for f in "$HTML" "$JSON"; do
    git -C "$REPO" cat-file -e "HEAD:$f" 2>/dev/null && git -C "$REPO" checkout -q HEAD -- "$f"
  done
  echo "took back $TOOK"; exit 0
fi
cmp -s "$BUILT" "$REPO/$HTML" || cp "$BUILT" "$REPO/$HTML" || exit 1
take_back || { echo "notebook-backup.sh: a commit in $REPO that origin does not have was not taken back; the file is written and not committed" >&2; exit 3; }
[ -z "$TOOK" ] || echo "took back $TOOK: a backup commit the upstream of $REPO does not have" >&2
LAST="$(git -C "$REPO" log -1 --format=%cd --date=format-local:%F -- "$HTML")"
if [ "$LAST" = "$TODAY" ]; then echo "not due: last committed $LAST"; exit 0; fi
if [ -n "$LAST" ] && git -C "$REPO" diff --quiet HEAD -- "$HTML"; then echo "same: last committed $LAST"; exit 0; fi
# The commit named is the HEAD of the checkout this copy is in: a landing runs its worktree's, where the seeds of the
# build are committed and the main checkout's HEAD is behind (wt-3-land-by-push).
MSG="cloud-brain: the notebook of $TODAY, built from $FROM (the day's backup; notebook-commit-once-a-day)"
# The spec-sync hook of lopebooks may write the .json beside the notebook and refuse the commit: the next try has it.
n=0; made=""
while [ $n -lt 3 ]; do
  n=$((n + 1))
  PATHS=("$HTML"); [ -f "$REPO/$JSON" ] && git -C "$REPO" add -- "$JSON" && PATHS+=("$JSON")
  git -C "$REPO" add -- "$HTML"
  if git -C "$REPO" commit -q -m "$MSG" -- "${PATHS[@]}" >&2; then
    made=1
    { [ ! -f "$REPO/$JSON" ] || git -C "$REPO" diff --quiet -- "$JSON"; } && break
  fi
done
[ -n "$made" ] && git -C "$REPO" diff --quiet HEAD -- "$HTML" || { echo "notebook-backup.sh: the commit in $REPO was refused; the file is written and not committed" >&2; exit 3; }
echo "committed $(git -C "$REPO" rev-parse --short=8 HEAD) $TODAY"
