#!/bin/bash
# run.sh   the daily retro of the Cloud Brain factory, on the Fly app cloudbrain-retro (not the loop's app: its
# secrets include the owner's state file, and Fly gives an app's secrets to every machine of that app).
# Started by boot.sh after it pulled main. One agent, the brief beside this file, owner authority, no tracker
# workflow. The machine stops when this ends (restart policy no; schedule hourly, and boot.sh lets one boot a day through, from 03:00 Paris time).
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
  # -f: sync.ts below rewrites tracked files of cloud-brain-dev/deploy, and without it the next run stayed on the old main (2026-10-24: 4f4213c, 1.5 days behind)
  git -C "$m" fetch -q origin main && git -C "$m" checkout -q -f -B main origin/main || say "$m: not at origin/main"
done
[ -n "$CB4_STATE_FILE" ] || CB4_STATE_FILE=/root/cb4.json
mkdir -p tools/cloud-brain/.emitted && install -m 600 "$CB4_STATE_FILE" tools/cloud-brain/.emitted/cb4.json || { say "no owner state file"; exit 1; }
# the secret's session ends 7 days after it was minted (10-22 and 10-24 runs read AuthRequired until they minted one)
BRAIN_BASE=cb4 bun tools/cloud-brain/brain.ts session >/dev/null || say "no owner session was minted"
# the Cloudflare token, when the owner has given one, stays under the git-ignored .emitted/
[ -f /root/cf-token ] && install -m 600 /root/cf-token tools/cloud-brain/.emitted/cf-token && export CF_TOKEN_FILE="$C/tools/cloud-brain/.emitted/cf-token"
# retro-agents: the retro's own delegate for issue.*, made once with the owner's session and kept on the volume;
# the agent makes its tracker and lock tokens as its children (agent-token --parent retro-agents)
grep -q '"retro-agents"' tools/cloud-brain/.emitted/cb4-tokens.json 2>/dev/null || \
  BRAIN_BASE=cb4 bun tools/cloud-brain/brain.ts token retro-agents 'issue.*' --delegate >/dev/null || say "retro-agents was not made"
bun install --silent || say "bun install failed at the root"
(cd tools && bun install --silent) || say "bun install failed in tools/"
(cd cloud-brain-dev && bun sync.ts https://cb4.endpointservices.workers.dev >/dev/null 2>&1) || say "cloud-brain-dev sync.ts failed"

mkdir -p /data/retro-logs
# The run's own issue, retro-<date>: opened and held now so no loop role takes it, closed below with a `cost` event of
# role `retro`, so the run is counted with the loop's roles (issue.runs?role=retro, issue-stats.ts).
# A second start on one date (2026-10-21: 05:21 and 06:24 UTC, the second not asked for by anyone seen) gets its own suffix: with the
# same issue, cost key and log, its cost event was a duplicate key and dropped, its stream overwrote the first's, and its report the first's.
SUF=""; git fetch -q origin main 2>/dev/null || say "fetch of main failed: the run's suffix is read from the last fetch"
for n in 2 3 4 5 6 7 8 9; do git cat-file -e "origin/main:plan/retros/$DAY$SUF.md" 2>/dev/null || break; SUF="-$n"; done
[ -n "$SUF" ] && say "a report of $DAY is on main already: this run is $DAY$SUF"
RUN="$DAY$SUF"
IA=tools/cloud-brain/issue-as.sh; ISSUE="retro-$RUN"; START=$(date +%s)
RT=$(BRAIN_BASE=cb4 bun tools/cloud-brain/brain.ts agent-token --parent retro-agents out "retro run.sh $DAY" 2>/dev/null | tail -1)
if [ -n "$RT" ]; then
  $IA "$RT" open "{\"key\":\"$ISSUE/open\",\"id\":\"$ISSUE\",\"kind\":\"task\",\"about\":\"cloud-brain-dev\",\"title\":\"Retro $RUN\",\"body\":\"The daily retro's run of $RUN (tools/cloud-brain/retro/). Its report is plan/retros/$RUN.md; run.sh closes this issue with the run's cost.\"}" >/dev/null 2>&1
  $IA "$RT" hold "{\"key\":\"$ISSUE/hold\",\"id\":\"$ISSUE\",\"until\":$(( (START + 6*3600) * 1000 )),\"reason\":\"the daily retro runs; run.sh closes it with its cost\"}" >/dev/null 2>&1
else say "no run token: $ISSUE not opened, no cost event"; fi
PROMPT="Today is $DAY (UTC). You are the daily retro of the Cloud Brain. Read tools/cloud-brain/retro/brief.md whole and do what it says. Your report is plan/retros/$RUN.md; your run's tracker issue is $ISSUE.${SUF:+ A report of today is on main already (plan/retros/$DAY.md): this is a further run of the same date, so read that report as the last one.}"
say "starting the agent (${MODEL:-claude-opus-5-5}, effort ${EFFORT:-high}, budget \$${BUDGET_USD:-60})"
IS_SANDBOX=1 METADEV=1 BRAIN_BASE=cb4 CLAUDE_CONFIG_DIR=/data/claude timeout "${HOURS:-4}h" \
  claude -p "$PROMPT" --model "${MODEL:-claude-opus-5-5}" --fallback-model sonnet --effort "${EFFORT:-high}" \
  --max-budget-usd "${BUDGET_USD:-60}" --permission-mode bypassPermissions --output-format stream-json --verbose \
  < /dev/null > "/data/retro-logs/$RUN.jsonl" 2>&1
CODE=$?
say "the agent ended with $CODE; $(tail -1 "/data/retro-logs/$RUN.jsonl" | jq -r '"usd " + (.total_cost_usd|tostring) + ", turns " + (.num_turns|tostring)' 2>/dev/null)"
# A report written and not pushed is pushed here; nothing else is committed for the agent.
if [ -f "plan/retros/$RUN.md" ] && ! git ls-files --error-unmatch "plan/retros/$RUN.md" >/dev/null 2>&1; then
  git add "plan/retros/$RUN.md" && git commit -q -m "retro $RUN: report (committed by run.sh; the agent did not)"
fi
if ! { git pull -q --rebase origin main && git push -q origin HEAD:main; }; then
  git rebase --abort 2>/dev/null
  git push -q origin "HEAD:refs/heads/retro/$RUN" && say "main did not take the push; the work is on the branch retro/$RUN" || say "push failed"
fi
if [ -n "$RT" ]; then
  L="/data/retro-logs/$RUN.jsonl"
  OUTCOME=reported; [ "$CODE" = 124 ] && OUTCOME=timeout
  git cat-file -e "origin/main:plan/retros/$RUN.md" 2>/dev/null || OUTCOME="${OUTCOME/reported/no-report}"
  BODY=$(jq -s -c --arg id "$ISSUE" --arg tok "$RT" --arg out "$OUTCOME" --argjson secs $(( $(date +%s) - START )) '
    (map(select(.type=="result")) | last) as $r | (map(select(.type=="assistant")) | last | .message.usage // {}) as $a |
    { key: ("cost/" + $id + "/retro/1"), id: $id, role: "retro", round: 1, how: "light", outcome: $out, seconds: $secs,
      context: (($a.input_tokens // 0) + ($a.cache_read_input_tokens // 0) + ($a.cache_creation_input_tokens // 0)), token: $tok,
      usage: { input: ($r.usage.input_tokens // 0), cacheWrite: ($r.usage.cache_creation_input_tokens // 0),
               cacheRead: ($r.usage.cache_read_input_tokens // 0), output: ($r.usage.output_tokens // 0),
               requests: ($r.num_turns // 0), advisor: { calls: 0, input: 0, output: 0 } },
      usd: ($r.total_cost_usd // 0) }' "$L" 2>/dev/null)
  [ -n "$BODY" ] && $IA "$RT" cost "$BODY" >/dev/null 2>&1 || say "the cost event was not written"
  $IA "$RT" move "{\"key\":\"$ISSUE/close\",\"id\":\"$ISSUE\",\"to\":\"closed\",\"reason\":\"retro $RUN ended ($OUTCOME): https://github.com/tomlarkworthy/lopecode-dev/blob/main/plan/retros/$RUN.md\"}" >/dev/null 2>&1 || say "$ISSUE was not closed"
  BRAIN_BASE=cb4 bun tools/cloud-brain/brain.ts agent-token --parent retro-agents revoke "$RT" >/dev/null 2>&1
fi
exit $CODE
}
