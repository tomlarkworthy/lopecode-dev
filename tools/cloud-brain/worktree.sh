#!/bin/bash
# worktree.sh <issue id>   a git worktree of lopecode-dev for one writer of the maintenance loop, on branch bm/<id>.
# worktree.sh --rebase <issue id>   bring it up to main. Prints the files that came in from main, one a line, and
#                                   nothing when main had not moved. In place of `git rebase main` there, which
#                                   stops on the submodule links, and of ORIG_HEAD, which a rebase that did nothing leaves as it was.
# worktree.sh --remove <issue id>
# Prints the worktree's path. Seeds are edited and built there; nothing is deployed or pushed from it.
set -e
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
if [ "$1" = "--remove" ]; then git -C "$ROOT" worktree remove --force "$ROOT/.claude/worktrees/bm-$2"; git -C "$ROOT" branch -D "bm/$2" >/dev/null; exit 0; fi
MODS="lopebooks lopecode"
# The submodules are empty in a worktree; the tools read notebooks from them. Linked, never written: build.ts refuses its default --out here.
link() { for m in $MODS; do [ -L "$W/$m" ] || { rmdir "$W/$m" 2>/dev/null || true; ln -s "$ROOT/$m" "$W/$m"; }; done; }
stopped() { [ -d "$GD/rebase-merge" ] || [ -d "$GD/rebase-apply" ]; }
# A commit made with `git commit -a` or `git add -A` here records the link, or nothing, where the submodule was.
gitlinks() { for m in $MODS; do [ "$(git -C "$W" ls-tree HEAD "$m" | cut -c1-6)" = 160000 ] || { echo "worktree.sh: a commit of bm/$ID has $m as something other than the submodule; take that path out of the commit (git add the files by name, never -a or -A)" >&2; return 1; }; done; }
if [ "$1" = "--rebase" ]; then
  ID="$2"; W="$ROOT/.claude/worktrees/bm-$ID"
  [ -n "$ID" ] && [ -d "$W" ] || { echo "worktree.sh: no worktree for '$ID'" >&2; exit 1; }
  GD="$(git -C "$W" rev-parse --absolute-git-dir)"; KEPT="$GD/bm-rebase"
  if stopped; then
    [ -f "$KEPT" ] || { echo "worktree.sh: a rebase is stopped in $W that this script did not start; finish or abort it there" >&2; exit 1; }
    for m in $MODS; do [ -L "$W/$m" ] && rm "$W/$m"; done
    GIT_EDITOR=true git -C "$W" rebase --continue >&2 || true
  else
    gitlinks
    echo "$(git -C "$W" merge-base HEAD main) $(git -C "$ROOT" rev-parse main)" > "$KEPT"
    for m in $MODS; do [ -L "$W/$m" ] && rm "$W/$m"; done
    git -C "$W" rebase main >&2 || true
  fi
  if stopped; then
    echo "worktree.sh: the rebase stopped. Unmerged: $(git -C "$W" diff --name-only --diff-filter=U | tr '\n' ' ')" >&2
    echo "worktree.sh: resolve in $W (the seed, never the notebook), git add each file by name, then run worktree.sh --rebase $ID again. The submodule links are out until then." >&2
    exit 1
  fi
  link
  read -r WAS ONTO < "$KEPT"; rm "$KEPT"
  [ "$(git -C "$W" merge-base HEAD "$ONTO")" = "$ONTO" ] || { echo "worktree.sh: bm/$ID is not on main; git said why above" >&2; exit 1; }
  gitlinks
  git -C "$W" diff --name-only "$WAS" "$ONTO"
  exit 0
fi
ID="$1"; W="$ROOT/.claude/worktrees/bm-$ID"
[ -d "$W" ] || git -C "$ROOT" worktree add -q "$W" -b "bm/$ID" main
mkdir -p "$W/tools/cloud-brain/.emitted"
[ -e "$W/tools/node_modules" ] || ln -s "$ROOT/tools/node_modules" "$W/tools/node_modules"
GD="$(git -C "$W" rev-parse --absolute-git-dir)"
# While a rebase is stopped the links stay out: `git rebase --continue` fails on them.
stopped || link
echo "$W"
