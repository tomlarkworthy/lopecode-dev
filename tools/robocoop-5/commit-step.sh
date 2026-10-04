#!/bin/sh
# commit-step.sh "<subject>" "<body>": commit the canonical notebook in lopebooks, then the gitlink and tools here.
cd "$(dirname "$0")/../.." || exit 1
# Refuses unless the quick verify passes; --full runs the oracle evals as well.
MODE=--quick; [ "$1" = "--full" ] && { MODE=; shift; }
node tools/robocoop-5/verify.mjs $MODE > tools/scratch/verify/last.txt 2>&1
V=$?
cut -c1-150 tools/scratch/verify/last.txt
[ $V -ne 0 ] && { echo "NOT COMMITTED: verify failed"; exit 1; }
MSG="$1

$2

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
if [ -n "$(git -C lopebooks status --short notebooks/@tomlarkworthy_robocoop-5.html notebooks/ratchet-code.html)" ]; then
  git -C lopebooks add notebooks/@tomlarkworthy_robocoop-5.html notebooks/ratchet-code.html
  # lope-sitemap: linux-claude.html is in the sitemap and untracked, so absent from a worktree
  SKIP=lope-sitemap git -C lopebooks commit -q -m "$MSG" > tools/scratch/verify/commit-lb.txt 2>&1
  git -C lopebooks add notebooks/@tomlarkworthy_robocoop-5.json
  [ -f lopebooks/notebooks/ratchet-code.json ] && git -C lopebooks add notebooks/ratchet-code.json
  SKIP=lope-sitemap git -C lopebooks commit -q -m "$MSG" >> tools/scratch/verify/commit-lb.txt 2>&1
  [ -n "$(git -C lopebooks status --short notebooks/@tomlarkworthy_robocoop-5.html notebooks/@tomlarkworthy_robocoop-5.json)" ] && { echo "lopebooks commit FAILED"; grep Failed tools/scratch/verify/commit-lb.txt; exit 1; }
fi
git add lopebooks tools/robocoop-5 tools/robocoop-eval tests/robocoop5 modules/canonical.json tools/preflight-baseline.json
git commit -q -m "$MSG" > tools/scratch/verify/commit.txt 2>&1 || { echo "outer commit FAILED"; tail -5 tools/scratch/verify/commit.txt; exit 1; }
echo "lopebooks $(git -C lopebooks log --oneline -1 | cut -c1-60)"; echo "outer     $(git log --oneline -1 | cut -c1-70)"
