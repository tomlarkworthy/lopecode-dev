#!/bin/bash
# worktree.sh <issue id>   a git worktree of lopecode-dev for one writer of the maintenance loop, on branch bm/<id>.
# worktree.sh --remove <issue id>
# Prints the worktree's path. Seeds are edited and built there; nothing is deployed or pushed from it.
set -e
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
if [ "$1" = "--remove" ]; then git -C "$ROOT" worktree remove --force "$ROOT/.claude/worktrees/bm-$2"; git -C "$ROOT" branch -D "bm/$2" >/dev/null; exit 0; fi
W="$ROOT/.claude/worktrees/bm-$1"
[ -d "$W" ] || git -C "$ROOT" worktree add -q "$W" -b "bm/$1" main
mkdir -p "$W/tools/cloud-brain/.emitted"
[ -e "$W/tools/node_modules" ] || ln -s "$ROOT/tools/node_modules" "$W/tools/node_modules"
# The submodules are empty in a worktree; the tools read notebooks from them. Linked, never written: build.ts refuses its default --out here.
for m in lopebooks lopecode; do [ -L "$W/$m" ] || { rmdir "$W/$m" 2>/dev/null; ln -s "$ROOT/$m" "$W/$m"; }; done
echo "$W"
