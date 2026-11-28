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
# retro-docs: the retro's token for the knowledge docs (knowledge-docs.ts DOCS_TOKEN); loop-docs is another machine's (retro 2026-10-28)
grep -q '"retro-docs"' tools/cloud-brain/.emitted/cb4-tokens.json 2>/dev/null || \
  BRAIN_BASE=cb4 bun tools/cloud-brain/brain.ts token retro-docs knowledge.put knowledge.list static.put static.list >/dev/null || say "retro-docs was not made"
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
L="/data/retro-logs/$RUN.jsonl"
# the agent's last tool call, cut to 140 characters, with anything long enough to be a secret blanked
lasttool() { tail -n 400 "$L" 2>/dev/null | jq -r 'select(.type=="assistant") | .message.content[]? | select(.type=="tool_use")
  | .name + (if .input.run_in_background then " (bg)" else "" end) + " " + ((.input.command // .input.file_path // .input.description // "") | tostring | gsub("\\s+"; " ") | .[0:140])' 2>/dev/null \
  | tail -1 | sed -E 's/[A-Za-z0-9_+\/=.-]{32,}/…/g; s/(Bearer|token=|key=)[^ ]*/\1…/Ig'; }
# a line in fly logs every 10 min: what the run is on, how long the stream has been quiet, and memory.
# 2026-11-21 ran 11 h with nothing in fly logs after 02:57 until a bun of 3.5 GB was OOM-killed at 13:27.
beat() { while sleep 600; do
  say "beat $(( ($(date +%s) - START) / 60 )) min; stream $(wc -l < "$L" 2>/dev/null) lines, quiet $(( $(date +%s) - $(stat -c %Y "$L" 2>/dev/null || date +%s) )) s;" \
    "avail $(free -m | awk '/^Mem/{print $7}') MB; top $(ps -eo rss=,etimes=,comm= --sort=-rss | head -1 | awk '{printf "%s %d MB %d s", $3, $1/1024, $2}'); last: $(lasttool)"
done; }
beat & BEAT=$!
say "starting the agent (${MODEL:-claude-opus-5-5}, effort ${EFFORT:-high}, budget \$${BUDGET_USD:-60})"
# -k: on 2026-11-21 the agent outlived timeout's SIGTERM at 4 h by 7 h 21 min
IS_SANDBOX=1 METADEV=1 BRAIN_BASE=cb4 CLAUDE_CONFIG_DIR=/data/claude timeout -k 5m "${HOURS:-4}h" \
  claude -p "$PROMPT" --model "${MODEL:-claude-opus-5-5}" --fallback-model sonnet --effort "${EFFORT:-high}" \
  --max-budget-usd "${BUDGET_USD:-60}" --permission-mode bypassPermissions --output-format stream-json --verbose \
  < /dev/null > "$L" 2>&1
CODE=$?
kill "$BEAT" 2>/dev/null
say "the agent ended with $CODE; $(tail -1 "$L" | jq -r '"usd " + (.total_cost_usd|tostring) + ", turns " + (.num_turns|tostring)' 2>/dev/null); last: $(lasttool)"
# children the agent left (a test run it waited on) would hold memory and the volume while the rest runs
LEFT=$(ps -eo pid=,rss=,etimes=,args= --sort=-rss | awk -v me=$$ '$1!=me && $4 ~ /^(bun|node|claude)/ {printf "%s %d MB %d s %s; ", $1, $2/1024, $3, substr($4,1,40)}')
[ -n "$LEFT" ] && { say "left running: $LEFT"; pkill -KILL -f '^(bun|node|claude)( |$)' 2>/dev/null; }
# A report written and not pushed is pushed here; nothing else is committed for the agent.
if [ -f "plan/retros/$RUN.md" ] && ! git ls-files --error-unmatch "plan/retros/$RUN.md" >/dev/null 2>&1; then
  git add "plan/retros/$RUN.md" && git commit -q -m "retro $RUN: report (committed by run.sh; the agent did not)"
fi
# Each run's scratch holds a whole copy of the record (73 MB on 11-24); on 11-25 32 of them filled the 7.8 GB volume.
find /data/retro-scratch -name events.json -mtime +2 -delete 2>/dev/null; say "volume: $(df -m --output=avail /data | tail -1 | tr -d ' ') MB free"
# The summary a long doc's entry starts with: made only after a laptop landing, so none since 2026-10-13 (9 due 5 to 45 d
# on 11-28). Here, outside the agent's session, claude has its login. Each doc's row is in .emitted/docs/journal.jsonl.
SUMS=$(BRAIN_BASE=cb4 DOCS_TOKEN=retro-docs timeout 1200 bun tools/cloud-brain/knowledge-docs.ts summarize --due --first-paragraph --usd-max 1 2>&1 | tail -1)
say "knowledge docs: summarize --due: ${SUMS:0:600}"
# its agents' spend as one cost event of the role summarizer on the run's issue, as the laptop's orchestrator wrote it
SUSD=$(echo "$SUMS" | jq -r '.usd // 0' 2>/dev/null)
[ -n "$RT" ] && [ "${SUSD:-0}" != 0 ] && { $IA "$RT" cost "$(jq -n -c --arg id "$ISSUE" --arg tok "$RT" --argjson usd "$SUSD" '{key: ("cost/" + $id + "/summarizer/1"), id: $id, role: "summarizer", round: 1, how: "light", outcome: "ended", seconds: 0, context: 0, token: $tok, usage: {input: 0, cacheWrite: 0, cacheRead: 0, output: 0, requests: 0, advisor: {calls: 0, input: 0, output: 0}}, usd: $usd}')" >/dev/null 2>&1 || say "the summarizer's cost event was not written"; }
# What the agent left uncommitted is named, and kept out of the way: on 2026-11-21 it made the pull refuse, and the report went to a branch.
DIRTY=$(git status --porcelain --untracked-files=no | awk '{print $2}' | tr '\n' ' ')
[ -n "$DIRTY" ] && say "left uncommitted by the agent, not pushed: $DIRTY"
WHERE="main"
if ! { git pull -q --rebase --autostash origin main && git push -q origin HEAD:main; }; then
  git rebase --abort 2>/dev/null
  if git push -q origin "HEAD:refs/heads/retro/$RUN"; then WHERE="retro/$RUN"; say "main did not take the push; the work is on the branch retro/$RUN"; else WHERE=""; say "push failed"; fi
fi
# the docs as main has them now, into the Brain's search (two were stale 10-23 to 10-28: no machine of the retro entered them)
BRAIN_BASE=cb4 DOCS_TOKEN=retro-docs timeout 600 bun tools/cloud-brain/knowledge-docs.ts put --stale --limit=30 >/dev/null 2>&1 || say "knowledge docs: put --stale did not end with 0"
if [ -n "$RT" ]; then
  L="/data/retro-logs/$RUN.jsonl"
  OUTCOME=reported; { [ "$CODE" = 124 ] || [ "$CODE" = 137 ]; } && OUTCOME=timeout
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
  if [ "$OUTCOME" != reported ]; then
    $IA "$RT" comment "$(jq -n -c --arg k "$ISSUE/ended" --arg id "$ISSUE" --arg b "run.sh: the agent ended with $CODE ($OUTCOME) after $(( ($(date +%s) - START) / 60 )) min. Its last tool call: $(lasttool). Left running at its end: ${LEFT:-none}. Left uncommitted: ${DIRTY:-none}. The stream is /data/retro-logs/$RUN.jsonl on the volume of cloudbrain-retro; the beat lines are in fly logs." '{key:$k,id:$id,body:$b}')" >/dev/null 2>&1 || say "the end comment was not written"
  fi
  URL="https://github.com/tomlarkworthy/lopecode-dev/blob/${WHERE:-main}/plan/retros/$RUN.md"; [ -z "$WHERE" ] && URL="no push: the report is only on the volume"
  $IA "$RT" move "$(jq -n -c --arg k "$ISSUE/close" --arg id "$ISSUE" --arg r "retro $RUN ended ($OUTCOME): $URL" '{key:$k,id:$id,to:"closed",reason:$r}')" >/dev/null 2>&1 || say "$ISSUE was not closed"
  BRAIN_BASE=cb4 bun tools/cloud-brain/brain.ts agent-token --parent retro-agents revoke "$RT" >/dev/null 2>&1
fi
exit $CODE
}
