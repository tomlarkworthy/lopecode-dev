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
# The notebook is the build of the seeds of a lopecode-dev commit (`build.ts --out`, the same bytes), so what is
# committed here is a backup and no landing waits on it. Issue notebook-commit-once-a-day; tests/tools/notebook-backup.test.ts.
# NOTEBOOK_REPO is the repository, the main checkout's lopebooks with none. NOTEBOOK_TODAY is the day, `date +%F` with
# none. Only the tests set them.
BUILT="$1"
[ -n "$BUILT" ] && [ -s "$BUILT" ] || { echo "notebook-backup.sh <built notebook>: no file, or an empty one, at '${BUILT}'" >&2; exit 1; }
ROOT="$(dirname "$(git -C "$(dirname "$0")" rev-parse --path-format=absolute --git-common-dir)")"
REPO="${NOTEBOOK_REPO:-$ROOT/lopebooks}"
TODAY="${NOTEBOOK_TODAY:-$(date +%F)}"
HTML="notebooks/@tomlarkworthy_cloud-brain.html"; JSON="notebooks/@tomlarkworthy_cloud-brain.json"
[ -d "$REPO/notebooks" ] || { echo "notebook-backup.sh: no $REPO/notebooks" >&2; exit 1; }
cmp -s "$BUILT" "$REPO/$HTML" || cp "$BUILT" "$REPO/$HTML" || exit 1
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
