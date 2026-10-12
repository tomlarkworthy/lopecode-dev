#!/bin/bash
# worktree.sh <name>                    a git worktree of lopecode-dev on branch bm/<name>, made at origin/main after a
#                                       fetch. Prints its path. One that is there is left where it is.
# worktree.sh --rebase <name>           fetch, then bring it up to origin/main. Prints the files that came in, one a line,
#                                       and nothing when origin/main had not moved. In place of `git rebase` there, which
#                                       stops on the submodule links. Exit 1: a conflict, or a change that is not committed.
# worktree.sh --fresh <name> [--for <token>]
#                                       what an orchestrator runs before it puts an agent in the worktree of a topic. With
#                                       none there it makes one. With one there it fetches and reads the five counts of
#                                       --list: all 0, it brings the worktree up to origin/main. Prints the path, exit 0.
#                                       Exit 3: a count is not 0 (a writer's unlanded work); the counts are on stderr and
#                                       nothing is touched. Exit 4: another token is in it (stderr names it), nothing
#                                       touched. --for writes the token's name in the file bm-occupant of the worktree's
#                                       git directory. An occupant whose token is gone (`issue-as.sh <token> get?id=…` is
#                                       exit 2, or answers 401) is taken over.
# worktree.sh --leave <name>            the agent has reported: bm-occupant is removed.
# worktree.sh --at <sha> <name>         a view: a detached worktree at <sha>, for a reader. One of that name that is there
#                                       and detached is put at <sha>, what was changed or added in it thrown away. A
#                                       worktree on a branch is a writer's and is refused, exit 1. Prints the path.
# worktree.sh --list                    every bm-* worktree, one a line: name, clean or not-clean, then
#                                       changed= (tracked files that differ from HEAD) untracked= ahead= (commits not on
#                                       origin/main) dev-changed= (in cloud-brain-dev, deploy/ left out) dev-ahead=
#                                       (commits there not on its origin/main), occupant=, branch=, head=.
# worktree.sh --push-dev <name> [--dry-run]
#                                       a change to cloud-brain-dev, under the landing lock and before the push of
#                                       lopecode-dev: the commits of the clone are rebased on its origin/main and pushed to
#                                       main with a write token of 60 s (git.token, as loop-git; never printed), and the
#                                       pointer is committed in the worktree. Prints the commit. Exit 1: a change in the
#                                       clone that is not committed, a conflict, or a push that was refused.
#                                       --dry-run asks for the token and sends `git push --dry-run` of what origin has
#                                       already: exit 0 says the token and the address are taken. Nothing is written.
# worktree.sh --remove <name> [--force] the worktree, its clone and its branch. Exit 3, the counts on stderr and nothing
#                                       removed, when it is not clean; --force removes it as it is.
# Exit 2: origin was not reached (a command that needs the fetch), or the arguments were not understood.
# <name> is an issue's or a topic's id, `rev-<id>` for a view, `<topic>.2` for a second worktree of a topic: a-z A-Z 0-9 . _ -
#
# Seeds are edited and built in the worktree. lopebooks, lopecode and lopecode-plugin are links to the main checkout's.
# cloud-brain-dev/ is a clone from the address .gitmodules names (the cluster's git), at the commit the worktree's HEAD
# names, with what the Brain runs read into deploy/ by sync.ts: `bun test.ts <worker> --with <built module>` there runs a
# service's tests with no browser. A branch may be made in the clone; none is made in the main checkout's copy.
# Spec plan/cloud-brain-worktree-per-topic.md, issue wt-2-worktree-sh, tests/tools/worktree.test.ts.
# WORKTREE_GIT_TOKEN=<program> prints the push token in place of the call to the Brain; only the tests set it.
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"
# The main checkout, also when the copy that runs is a worktree's own.
ROOT="$(dirname "$(git -C "$HERE" rev-parse --path-format=absolute --git-common-dir)")"
MODS="lopebooks lopecode lopecode-plugin"
OURS=(. ':!lopebooks' ':!lopecode' ':!lopecode-plugin' ':!cloud-brain-dev')
usage() { sed -n '2,35p' "$0" | sed 's/^# \{0,1\}//' >&2; exit 2; }
named() { case "$1" in ""|-*|*[!a-zA-Z0-9._-]*) usage ;; esac; ID="$1"; W="$ROOT/.claude/worktrees/bm-$ID"; C="$W/cloud-brain-dev"; }
there() { [ -d "$W" ] || { echo "worktree.sh: no worktree for '$ID'" >&2; exit 1; }; GD="$(git -C "$W" rev-parse --absolute-git-dir)"; }
mode() { git -C "$W" ls-tree "$1" "$2" 2>/dev/null | cut -c1-6; }
# origin/main as origin has it now. Asked twice: another agent's fetch may hold the ref for a moment.
fetch() {
  local in="$ROOT"; [ -d "$W" ] && in="$W"
  git -C "$in" fetch -q --no-recurse-submodules origin main 2>/dev/null || { sleep 1; git -C "$in" fetch -q --no-recurse-submodules origin main >&2; } || return 1
}
fetched() { fetch || { echo "worktree.sh: origin was not reached; nothing was changed" >&2; exit 2; }; }
# The submodules are empty in a worktree; the tools read notebooks from them. Linked, never written: build.ts refuses its default --out here.
link() {
  local m
  for m in $MODS; do
    if [ ! -L "$W/$m" ] && [ "$(mode HEAD "$m")" = 160000 ] && [ -e "$ROOT/$m" ]; then
      rmdir "$W/$m" 2>/dev/null || true
      [ -e "$W/$m" ] || ln -s "$ROOT/$m" "$W/$m"
    fi
  done
}
unlink() { local m; for m in $MODS; do if [ -L "$W/$m" ]; then rm "$W/$m"; fi; done; }
# cloud-brain-dev is a clone of its own, not a link: sync.ts makes deploy/ again from nothing, and a writer's test.ts
# must not read it while another writer's sync is half way. It is put at the commit this worktree's HEAD names; a clone
# that is there is fetched first when it lacks that commit. One with commits of its own is left where it is. A worktree
# made before 2026-10-12 has a `git worktree` of the main checkout's copy there, which is kept up the same way.
# $1 is -f for a view: what was changed in it is thrown away.
dev() {
  [ "$(mode HEAD cloud-brain-dev)" = 160000 ] || return 0
  local at made="" push
  at="$(git -C "$W" ls-tree HEAD cloud-brain-dev | awk '{print $3}')"
  if [ ! -e "$C/.git" ]; then
    rmdir "$C" 2>/dev/null || true
    git clone -q --no-checkout "$(git -C "$W" config -f .gitmodules submodule.cloud-brain-dev.url)" "$C" >&2 || { echo "worktree.sh: cloud-brain-dev was not cloned; $C is not there" >&2; return 0; }
    made=1
    # Where a push goes is the owner's to read (git.get); the main checkout's copy has it when it was set there.
    push="$(git -C "$ROOT/cloud-brain-dev" config remote.origin.pushurl 2>/dev/null || true)"
    if [ -n "$push" ]; then git -C "$C" config remote.origin.pushurl "$push"; fi
  fi
  if [ -z "$made" ] && [ -z "$1" ] && [ "$(devahead)" != 0 ]; then
    echo "worktree.sh: cloud-brain-dev in $W has commits of its own and is left at $(git -C "$C" rev-parse --short HEAD); the pointer names $(echo "$at" | cut -c1-7)" >&2
  elif [ -n "$made" ] || [ -n "$1" ] || [ "$(git -C "$C" rev-parse HEAD)" != "$at" ]; then
    git -C "$C" cat-file -e "$at^{commit}" 2>/dev/null || git -C "$C" fetch -q origin >&2 || true
    if [ -n "$1" ]; then git -C "$C" clean -fdq >&2 || true; fi
    git -C "$C" checkout -q --detach $1 "$at" >&2 || echo "worktree.sh: cloud-brain-dev in $W is not at $at; git said why above" >&2
  fi
  if [ -f "$C/sync.ts" ]; then
    (cd "$C" && bun sync.ts "https://${BRAIN_BASE:-cb4}.endpointservices.workers.dev" >&2) || echo "worktree.sh: sync.ts failed; run it in $C" >&2
  fi
}
# Commits of the clone that its origin does not have: on any branch of it. For a worktree of the main checkout's copy
# (before 2026-10-12) only those of HEAD, since that copy's branches are not this worktree's.
devahead() {
  if [ -d "$C/.git" ]; then git -C "$C" rev-list --count HEAD --branches --not --remotes=origin
  else git -C "$C" rev-list --count origin/main..HEAD; fi
}
stopped() { [ -d "$GD/rebase-merge" ] || [ -d "$GD/rebase-apply" ]; }
# The five counts. A file under deploy/ of the clone is a read of the Brain and is not counted.
counts() {
  CH="$(git -C "$W" diff --name-only HEAD -- "${OURS[@]}" | wc -l | tr -d ' ')"
  UN="$(git -C "$W" ls-files --others --exclude-standard -- "${OURS[@]}" | grep -vxc 'tools/node_modules' || true)"
  AH="$(git -C "$W" rev-list --count origin/main..HEAD)"
  DC=0; DA=0
  if [ -e "$C/.git" ]; then
    DC="$(git -C "$C" status --porcelain -- . ':!deploy' | wc -l | tr -d ' ')"
    DA="$(devahead)"
  fi
  COUNTS="changed=$CH untracked=$UN ahead=$AH dev-changed=$DC dev-ahead=$DA"
  if stopped; then COUNTS="$COUNTS rebase=stopped"; fi
}
clean() { [ "$COUNTS" = "changed=0 untracked=0 ahead=0 dev-changed=0 dev-ahead=0" ]; }
# A commit made with `git commit -a` or `git add -A` here records the link, or nothing, where the submodule was.
gitlinks() {
  local m
  for m in $MODS; do
    if [ "$(mode origin/main "$m")" = 160000 ] && [ "$(mode HEAD "$m")" != 160000 ]; then
      echo "worktree.sh: a commit of bm/$ID has $m as something other than the submodule; take that path out of the commit (git add the files by name, never -a or -A)" >&2
      return 1
    fi
  done
}
# The issue a name is of: rev- off the front, .N off the end.
issue() { local t="${ID#rev-}"; case "$t" in *.[0-9]*) t="${t%.*}";; esac; echo "$t"; }
# An occupant whose token the tracker no longer takes: issue-as.sh keeps none of that name (exit 2), or the read answers 401.
gone() {
  local err rc=0
  err="$("$HERE/issue-as.sh" "$1" "get?id=$(issue)" 2>&1 >/dev/null)" || rc=$?
  [ "$rc" = 2 ] && return 0
  case "$err" in *" [401]"*) return 0 ;; esac
  return 1
}
setup() {
  mkdir -p "$W/tools/cloud-brain/.emitted"
  if [ ! -e "$W/tools/node_modules" ] && [ -e "$ROOT/tools/node_modules" ]; then ln -s "$ROOT/tools/node_modules" "$W/tools/node_modules"; fi
}

case "$1" in
--list)
  [ $# = 1 ] || usage
  fetch || echo "worktree.sh: origin was not reached; ahead= is against origin/main as it was last read" >&2
  for W in "$ROOT"/.claude/worktrees/bm-*; do
    [ -d "$W" ] || continue
    ID="${W##*/bm-}"; C="$W/cloud-brain-dev"
    GD="$(git -C "$W" rev-parse --absolute-git-dir 2>/dev/null)" || { echo "$ID not-a-worktree"; continue; }
    counts
    if clean; then S=clean; else S=not-clean; fi
    echo "$ID $S $COUNTS occupant=$(cat "$GD/bm-occupant" 2>/dev/null || echo -) branch=$(git -C "$W" symbolic-ref -q --short HEAD || echo detached) head=$(git -C "$W" rev-parse --short HEAD)"
  done
  exit 0 ;;

--remove)
  named "$2"; there
  case "$3" in "") ;; --force) ;; *) usage ;; esac
  if [ -z "$3" ]; then
    fetch || true
    counts
    clean || { echo "worktree.sh: $W is not clean and was not removed: $COUNTS. --force removes it as it is." >&2; exit 3; }
  fi
  unlink
  if [ -f "$C/.git" ]; then git -C "$ROOT/cloud-brain-dev" worktree remove --force "$C" 2>/dev/null || true
  elif [ -d "$C/.git" ]; then rm -rf "$C"; fi
  git -C "$ROOT" worktree remove --force "$W"
  git -C "$ROOT" branch -D "bm/$ID" >/dev/null 2>&1 || true
  if [ -e "$ROOT/cloud-brain-dev/.git" ]; then git -C "$ROOT/cloud-brain-dev" worktree prune || true; fi
  exit 0 ;;

--leave)
  named "$2"; there
  rm -f "$GD/bm-occupant"
  exit 0 ;;

--rebase)
  named "$2"; there
  KEPT="$GD/bm-rebase"
  if stopped; then
    [ -f "$KEPT" ] || { echo "worktree.sh: a rebase is stopped in $W that this script did not start; finish or abort it there" >&2; exit 1; }
    unlink
    GIT_EDITOR=true git -C "$W" rebase --continue >&2 || true
  else
    fetched
    gitlinks
    echo "$(git -C "$W" merge-base HEAD origin/main) $(git -C "$W" rev-parse origin/main)" > "$KEPT"
    unlink
    git -C "$W" rebase origin/main >&2 || true
  fi
  if stopped; then
    echo "worktree.sh: the rebase stopped. Unmerged: $(git -C "$W" diff --name-only --diff-filter=U | tr '\n' ' ')" >&2
    echo "worktree.sh: resolve in $W (the seed, never the notebook), git add each file by name, then run worktree.sh --rebase $ID again. The submodule links are out until then." >&2
    exit 1
  fi
  link
  read -r WAS ONTO < "$KEPT"; rm "$KEPT"
  [ "$(git -C "$W" merge-base HEAD "$ONTO")" = "$ONTO" ] || { echo "worktree.sh: bm/$ID is not on origin/main; git said why above" >&2; exit 1; }
  gitlinks
  dev
  # Step 10 of the writer's brief merges this branch into the main checkout's main, which git refuses then.
  N="$(git -C "$ROOT" rev-list --count origin/main..main 2>/dev/null || echo 0)"
  if [ "$N" != 0 ]; then echo "worktree.sh: the main checkout's main has $N commit(s) origin/main has not; \`merge --ff-only bm/$ID\` there is refused until they are pushed" >&2; fi
  git -C "$W" diff --name-only "$WAS" "$ONTO"
  exit 0 ;;

--fresh)
  named "$2"; FOR=""
  case "$3" in
    "") [ $# = 2 ] || usage ;;
    --for) case "$4" in ""|*[!a-zA-Z0-9._-]*) usage ;; esac; [ $# = 4 ] || usage; FOR="$4" ;;
    *) usage ;;
  esac
  fetched
  if [ ! -d "$W" ]; then
    git -C "$ROOT" worktree add -q --no-track "$W" -b "bm/$ID" origin/main >&2
    there
  else
    there
    WAS="$(cat "$GD/bm-occupant" 2>/dev/null || true)"
    if [ -n "$WAS" ] && [ "$WAS" != "$FOR" ]; then
      gone "$WAS" || { echo "worktree.sh: $W is occupied by $WAS; nothing was touched" >&2; exit 4; }
      echo "worktree.sh: the occupant $WAS is gone (its token is not taken); taken over" >&2
    fi
    counts
    clean || { echo "worktree.sh: $W holds work that is not landed and was not touched: $COUNTS" >&2; exit 3; }
    if [ -n "$WAS" ] && [ "$WAS" != "$FOR" ]; then rm -f "$GD/bm-occupant"; fi
  fi
  if [ -n "$FOR" ]; then
    # noclobber: of two sessions that found it free, one writes the file.
    (set -C; echo "$FOR" > "$GD/bm-occupant") 2>/dev/null || true
    NOW="$(cat "$GD/bm-occupant")"
    [ "$NOW" = "$FOR" ] || { echo "worktree.sh: $W is occupied by $NOW; nothing was touched" >&2; exit 4; }
  fi
  if [ "$(git -C "$W" rev-parse HEAD)" != "$(git -C "$W" rev-parse origin/main)" ]; then
    unlink
    git -C "$W" rebase -q origin/main >&2
  fi
  setup; dev; link
  echo "$W"
  exit 0 ;;

--at)
  SHA="$2"; named "$3"; [ $# = 3 ] || usage
  git -C "$ROOT" cat-file -e "$SHA^{commit}" 2>/dev/null || fetch || true
  FULL="$(git -C "$ROOT" rev-parse --verify -q "$SHA^{commit}")" || { echo "worktree.sh: no commit '$SHA' here or on origin/main" >&2; exit 1; }
  if [ ! -d "$W" ]; then
    git -C "$ROOT" worktree add -q --detach "$W" "$FULL" >&2
    there
  else
    there
    if git -C "$W" symbolic-ref -q HEAD >/dev/null; then echo "worktree.sh: $W is on the branch $(git -C "$W" symbolic-ref --short HEAD), a writer's, and is not a view; nothing was touched" >&2; exit 1; fi
    if stopped; then echo "worktree.sh: a rebase is stopped in $W; nothing was touched" >&2; exit 1; fi
    unlink
    git -C "$W" checkout -q --detach -f "$FULL" >&2
    git -C "$W" clean -fdq -e tools/node_modules -e cloud-brain-dev >&2
  fi
  setup; dev -f; link
  echo "$W"
  exit 0 ;;

--push-dev)
  named "$2"; there
  DRY=""; case "$3" in "") ;; --dry-run) DRY=--dry-run ;; *) usage ;; esac
  [ -e "$C/.git" ] || { echo "worktree.sh: no cloud-brain-dev in $W" >&2; exit 1; }
  if [ -d "$(git -C "$C" rev-parse --absolute-git-dir)/rebase-merge" ]; then echo "worktree.sh: a rebase is stopped in $C; resolve it there, \`git rebase --continue\`, and run this again" >&2; exit 1; fi
  N="$(git -C "$C" status --porcelain -- . ':!deploy' | wc -l | tr -d ' ')"
  [ "$N" = 0 ] || { echo "worktree.sh: $N file(s) of $C are changed or new and not committed; nothing was pushed" >&2; exit 1; }
  git -C "$C" fetch -q origin main >&2 || { echo "worktree.sh: the origin of cloud-brain-dev was not reached; nothing was pushed" >&2; exit 2; }
  AHEAD="$(git -C "$C" rev-list --count origin/main..HEAD)"
  if [ "$AHEAD" != 0 ] || [ -n "$DRY" ]; then
    if [ -z "$DRY" ]; then
      # deploy/ is a read of the Brain, written over by sync.ts; nothing of it is kept, and it is read again below.
      git -C "$C" checkout -q -- deploy 2>/dev/null || true
      git -C "$C" clean -fdq deploy 2>/dev/null || true
      git -C "$C" rebase -q origin/main >&2 || { echo "worktree.sh: the rebase of $C on its origin/main stopped; resolve it there, \`git rebase --continue\`, and run this again. Nothing was pushed." >&2; exit 1; }
    fi
    if [ -z "$(git -C "$C" config remote.origin.pushurl || true)" ]; then
      P="$(git -C "$ROOT/cloud-brain-dev" config remote.origin.pushurl 2>/dev/null || true)"
      if [ -n "$P" ]; then git -C "$C" config remote.origin.pushurl "$P"; fi
    fi
    if [ -n "$WORKTREE_GIT_TOKEN" ]; then T="$("$WORKTREE_GIT_TOKEN")" || T=""
    else
      T="$(BRAIN_BASE="${BRAIN_BASE:-cb4}" BRAIN_STATE_DIR="${BRAIN_STATE_DIR:-$ROOT/tools/cloud-brain/.emitted}" bun "$HERE/brain.ts" curl "/xrpc/com.lopecode.brain.git.token?name=cloud-brain-dev&scope=write&seconds=60" --as loop-git -X POST 2>/dev/null \
        | python3 -c 'import json,sys
t = sys.stdin.read()
try: print(json.loads(t[:t.rindex("}") + 1])["result"]["plaintext"])
except (ValueError, KeyError, TypeError): sys.exit(1)')" || T=""
    fi
    [ -n "$T" ] || { echo "worktree.sh: no write token (git.token as loop-git); nothing was pushed" >&2; exit 1; }
    # A dry run sends what origin has, so git's answer is of the token and the address and not of the rebase it did not make.
    SEND=HEAD; if [ -n "$DRY" ]; then SEND=origin/main; fi
    # In the environment, not in the arguments: `ps` shows a command's arguments.
    GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=http.extraHeader GIT_CONFIG_VALUE_0="Authorization: Bearer $T" \
      git -C "$C" push -q $DRY origin "$SEND:refs/heads/main" >&2 || { echo "worktree.sh: the push of cloud-brain-dev was refused; git said why above (with no remote.origin.pushurl in the clone the push goes to the address it was cloned from: cloud-brain-dev/README.md)" >&2; exit 1; }
    T=""
    if [ -n "$DRY" ]; then echo "worktree.sh: dry run: the token and the address were taken; $AHEAD commit(s) of the clone are not on its origin/main; nothing was written" >&2; exit 0; fi
    if [ -f "$C/sync.ts" ]; then
      (cd "$C" && bun sync.ts "https://${BRAIN_BASE:-cb4}.endpointservices.workers.dev" >&2) || echo "worktree.sh: sync.ts failed; run it in $C" >&2
    fi
  fi
  SHA="$(git -C "$C" rev-parse HEAD)"
  AT="$(git -C "$W" ls-tree HEAD cloud-brain-dev | awk '{print $3}')"
  # The pointer only goes forward, to a commit origin has.
  if [ "$AT" != "$SHA" ] && git -C "$C" merge-base --is-ancestor "$AT" "$SHA" 2>/dev/null && git -C "$C" merge-base --is-ancestor "$SHA" origin/main; then
    git -C "$W" update-index --cacheinfo "160000,$SHA,cloud-brain-dev"
    git -C "$W" commit -q -m "cloud-brain-dev: the pointer at $(echo "$SHA" | cut -c1-7), pushed by worktree.sh --push-dev" -- cloud-brain-dev >&2
  fi
  echo "$SHA"
  exit 0 ;;

-*) usage ;;
esac

[ $# = 1 ] || usage
named "$1"
if [ ! -d "$W" ]; then
  fetched
  git -C "$ROOT" worktree add -q --no-track "$W" -b "bm/$ID" origin/main >&2
fi
there
setup
dev
# While a rebase is stopped the links stay out: `git rebase --continue` fails on them.
stopped || link
echo "$W"
