#!/bin/bash
# review-needs-tab.sh REPO@SHA…   does a review of these commits need the tools of a notebook tab?
# Exit 0 and the first such file on stdout when a commit touches a seed (*.ojs), a notebook (*.html) or a
# module (modules/, deploy/); exit 1 when none does; exit 2 when a commit cannot be read (start with the tab).
# A merge is read against each of its parents (a plain `git show` of one names no file), so it asks for a tab
# when either side brought a seed: main merged into a branch does, for what main held. REPO is lopecode-dev or a submodule of it by directory name. The loop's SKILL.md step 4 runs it on a submit's commit refs.
ROOT="${CHECKOUT:-$(cd "$(dirname "$0")/../.." && pwd)}"
[ $# -gt 0 ] || { echo "review-needs-tab.sh REPO@SHA…" >&2; exit 2; }
for ref in "$@"; do
  repo="${ref%@*}"; sha="${ref##*@}"
  [ "$repo" != "$ref" ] && [ -n "$sha" ] || { echo "review-needs-tab.sh: $ref is not REPO@SHA" >&2; exit 2; }
  dir="$ROOT"; [ "$repo" = "lopecode-dev" ] || dir="$ROOT/$repo"
  files=$(git -C "$dir" show -m --name-only --format= "$sha" -- 2>/dev/null) || { echo "review-needs-tab.sh: $ref cannot be read" >&2; exit 2; }
  hit=$(printf '%s\n' "$files" | grep -E '\.ojs$|\.html$|(^|/)modules/|(^|/)deploy/' | head -1)
  [ -n "$hit" ] && { echo "$repo: $hit"; exit 0; }
done
exit 1
