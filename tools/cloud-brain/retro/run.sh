#!/bin/bash
# run.sh   the daily retro of the Cloud Brain factory, on the Fly app cloudbrain-retro (not the loop's app: its
# secrets include the owner's state file, and Fly gives an app's secrets to every machine of that app).
# Started by boot.sh after it pulled main. One agent, the brief beside this file, owner authority, no tracker
# workflow. The machine stops when this ends (restart policy no; schedule daily).
#
# Env: MODEL (claude-opus-5-5), EFFORT (high), BUDGET_USD (60), HOURS (4) — set at machine create to change them.
# Writes: /data/retro-logs/<date>.jsonl (the stream), the agent's own commits. Never prints a secret.
{
export HOME=/root
C=/data/lopecode-dev; cd "$C" || exit 1
say() { echo "retro $(date -u +%H:%M:%SZ) $*"; }
DAY=$(date -u +%F)

git config user.name "cloud-brain retro"; git config user.email "retro@cloudbrain.invalid"
git config submodule.lopebooks.url git@github-lopebooks:tomlarkworthy/lopebooks.git
git config submodule.lopecode-plugin.url git@github-lopecode-plugin:tomlarkworthy/lopecode-plugin.git
git config submodule.lopecode.url git@github-lopecode:tomlarkworthy/lopecode.git
for m in cloud-brain-dev lopebooks lopecode-plugin lopecode; do
  git submodule update -q --init "$m" 2>/dev/null && continue
  # a pointer that is on no remote (lopecode, seen-lopecode-pointer-on-no-remote): take the remote's main
  git submodule update -q --init --no-fetch "$m" 2>/dev/null
  git -C "$m" fetch -q origin main && git -C "$m" checkout -q -B main origin/main && say "$m: pointer not on the remote, at origin/main" || say "$m: not checked out"
done
# each submodule at its remote's main, so a change is made on the latest and pushes without a conflict
for m in cloud-brain-dev lopebooks lopecode-plugin lopecode; do
  git -C "$m" fetch -q origin main && git -C "$m" checkout -q -B main origin/main || say "$m: not at origin/main"
done
[ -n "$CB4_STATE_FILE" ] || CB4_STATE_FILE=/root/cb4.json
mkdir -p tools/cloud-brain/.emitted && install -m 600 "$CB4_STATE_FILE" tools/cloud-brain/.emitted/cb4.json || { say "no owner state file"; exit 1; }
[ -f /root/cf-token ] && install -m 600 /root/cf-token tools/cloud-brain/.cf-token
bun install --silent || say "bun install failed at the root"
(cd tools && bun install --silent) || say "bun install failed in tools/"
(cd cloud-brain-dev && bun sync.ts https://cb4.endpointservices.workers.dev >/dev/null 2>&1) || say "cloud-brain-dev sync.ts failed"

mkdir -p /data/retro-logs
PROMPT="Today is $DAY (UTC). You are the daily retro of the Cloud Brain factory. Read tools/cloud-brain/retro/brief.md whole and do what it says. Your report is plan/retros/$DAY.md."
say "starting the agent (${MODEL:-claude-opus-5-5}, effort ${EFFORT:-high}, budget \$${BUDGET_USD:-60})"
IS_SANDBOX=1 METADEV=1 BRAIN_BASE=cb4 CLAUDE_CONFIG_DIR=/data/claude timeout "${HOURS:-4}h" \
  claude -p "$PROMPT" --model "${MODEL:-claude-opus-5-5}" --fallback-model sonnet --effort "${EFFORT:-high}" \
  --max-budget-usd "${BUDGET_USD:-60}" --permission-mode bypassPermissions --output-format stream-json --verbose \
  < /dev/null > "/data/retro-logs/$DAY.jsonl" 2>&1
CODE=$?
say "the agent ended with $CODE; $(tail -1 "/data/retro-logs/$DAY.jsonl" | jq -r '"usd " + (.total_cost_usd|tostring) + ", turns " + (.num_turns|tostring)' 2>/dev/null)"
# A report written and not pushed is pushed here; nothing else is committed for the agent.
if [ -f "plan/retros/$DAY.md" ] && ! git ls-files --error-unmatch "plan/retros/$DAY.md" >/dev/null 2>&1; then
  git add "plan/retros/$DAY.md" && git commit -q -m "retro $DAY: report (committed by run.sh; the agent did not)"
fi
git pull -q --rebase origin main && git push -q origin HEAD:main || say "push failed"
exit $CODE
}
