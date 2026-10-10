#!/bin/bash
# worktree.sh <issue id>   a git worktree of lopecode-dev for one writer of the maintenance loop, on branch bm/<id>.
# worktree.sh --rebase <issue id>   bring it up to main. Prints the files that came in from main, one a line, and
#                                   nothing when main had not moved. In place of `git rebase main` there, which
#                                   stops on the submodule links, and of ORIG_HEAD, which a rebase that did nothing leaves as it was.
# worktree.sh --remove <issue id>
# Prints the worktree's path. Seeds are edited and built there; nothing is deployed or pushed from it.
# cloud-brain-dev/ in it is a worktree of that repository with what the Brain runs synced into deploy/:
# `bun test.ts <worker> --with <built module>` there runs a service's tests with no browser.
set -e
# The main checkout, also when the copy that runs is a worktree's own.
ROOT="$(dirname "$(git -C "$(dirname "$0")" rev-parse --path-format=absolute --git-common-dir)")"
if [ "$1" = "--remove" ]; then git -C "$ROOT" worktree remove --force "$ROOT/.claude/worktrees/bm-$2"; git -C "$ROOT" branch -D "bm/$2" >/dev/null; [ -e "$ROOT/cloud-brain-dev/.git" ] && git -C "$ROOT/cloud-brain-dev" worktree prune; exit 0; fi
MODS="lopebooks lopecode"
# The submodules are empty in a worktree; the tools read notebooks from them. Linked, never written: build.ts refuses its default --out here.
link() { for m in $MODS; do [ -L "$W/$m" ] || { rmdir "$W/$m" 2>/dev/null || true; ln -s "$ROOT/$m" "$W/$m"; }; done; }
# cloud-brain-dev is a worktree of its own, not a link: sync.ts makes deploy/ again from nothing, and a writer's
# test.ts must not read it while another writer's sync is half way. It is put at the commit this worktree's HEAD
# names, and what the Brain runs is read into it (about 1 s). Also after a rebase, and for a worktree made before this.
dev() {
  [ -e "$ROOT/cloud-brain-dev/.git" ] || return 0
  local at; at="$(git -C "$W" ls-tree HEAD cloud-brain-dev | awk '{print $3}')"
  if [ ! -e "$W/cloud-brain-dev/.git" ]; then
    git -C "$ROOT/cloud-brain-dev" worktree prune
    git -C "$ROOT/cloud-brain-dev" worktree add -q --detach "$W/cloud-brain-dev" "$at" >&2
  elif [ "$(git -C "$W/cloud-brain-dev" rev-parse HEAD)" != "$at" ]; then
    git -C "$W/cloud-brain-dev" checkout -q --detach "$at" >&2
  fi
  (cd "$W/cloud-brain-dev" && bun sync.ts "https://${BRAIN_BASE:-cb4}.endpointservices.workers.dev" >&2) || echo "worktree.sh: sync.ts failed; run it in $W/cloud-brain-dev" >&2
}
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
  dev
  git -C "$W" diff --name-only "$WAS" "$ONTO"
  exit 0
fi
ID="$1"; W="$ROOT/.claude/worktrees/bm-$ID"
[ -d "$W" ] || git -C "$ROOT" worktree add -q "$W" -b "bm/$ID" main
mkdir -p "$W/tools/cloud-brain/.emitted"
[ -e "$W/tools/node_modules" ] || ln -s "$ROOT/tools/node_modules" "$W/tools/node_modules"
dev
GD="$(git -C "$W" rev-parse --absolute-git-dir)"
# While a rebase is stopped the links stay out: `git rebase --continue` fails on them.
stopped || link
echo "$W"
