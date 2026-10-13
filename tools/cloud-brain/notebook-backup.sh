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
# The notebook is the build of the seeds of a lopecode-dev commit (`build.ts --out`, the same bytes), so what is
# committed here is a backup and no landing waits on it. Issue notebook-commit-once-a-day; tests/tools/notebook-backup.test.ts.
# NOTEBOOK_REPO is the repository, the main checkout's lopebooks with none. NOTEBOOK_TODAY is the day, `date +%F` with
# none. Only the tests set them.
BUILT="$1"
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
MSG="cloud-brain: the notebook of $TODAY, built from the seeds of lopecode-dev@$(git -C "$(dirname "$0")" rev-parse --short HEAD) (the day's backup; notebook-commit-once-a-day)"
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
