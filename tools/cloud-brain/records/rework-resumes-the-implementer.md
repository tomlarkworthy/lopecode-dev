# rework-resumes-the-implementer

The issue loop's orchestrator sends a rework round to the implementer that wrote the change, with
`SendMessage`, in place of a new agent. The owner, 2026-10-11: "resuming implementors is a good
idea, not always possible if they are done by different agents, but maybe we append session-id".
The numbers behind it are in the issue's body (10 of 36 issues with more than one implementer
round, 46% of 12.06 M tokens; they were not counted again here).

## Round 1, 2026-10-11

Written between 15:59:16 CEST (the `start`, event 868) and the landing. A change to the
procedure only: no seed, no deploy, no tool.

**No rework round has been run by a resumed implementer.** The issue's "done when" asks for
one; the move to `ready` (event 860) says the writer lands the procedure and the record names the
first resumed round when one has run. A section is added here then, with that round's count
beside the median of a new-agent rework round.

### What changed

- `.claude/skills/brain-maintenance/SKILL.md`, step 5: an implementer's `cost` comment has two
  more fields, `agent` (the `agentId` of the Agent result) and `session`, and a round that was
  sent and not spawned has `"resumed":true`.
- The same file, a new section "A rework round goes to the agent that wrote the change", which
  the `in-progress` row of step 3 names: read the last implementer `cost` comment; when it has an
  `agent` and its `session` is this session's, `SendMessage` to that id with the issue id and the
  seq of the `reviewed` event; anything else, spawn as before. The reviewer is never resumed.
- `.claude/skills/brain-maintenance/agents/implementer.md`: a section "A resumed round", and a
  line in step 1 that points at it.
- `tests/tools/rework-resumes-the-implementer.test.ts`: reads the two files.

### What was settled of the issue's "not known"

**How the orchestrator reads its own session id without the disk.** `echo $CLAUDE_CODE_SESSION_ID`
in Bash. Read in this agent (a subagent of the orchestrator, `CLAUDE_CODE_CHILD_SESSION=1`) at
15:59 CEST:

```
CLAUDE_CODE_SESSION_ID=f501a8e8-b922-4e11-a581-2b725efd6272
ls $CLAUDE_CONFIG_DIR/projects/-Users-tom-larkworthy-dev-lopecode-dev/$CLAUDE_CODE_SESSION_ID/subagents | wc -l   -> 102
  … agent-af49053b540d9c3f5.jsonl  agent-af49053b540d9c3f5.meta.json …
```

So the variable names the directory the agents' transcripts are under, which is the id the issue
asks for. It was read in a subagent's Bash, where it gave the parent's id. That the orchestrator's
own Bash gives the same value was not run: this agent is not the orchestrator.

**The agent is addressed by its raw id.** The Agent tool of this session has no `name` parameter
(its schema: `description`, `effort`, `isolation`, `model`, `prompt`, `subagent_type`). The
`SendMessage` tool's description says of `to`: "Use the raw `agentId` (format `a...-...`) from its
spawn result only when the agent has no name". The tool is deferred here: `ToolSearch` with
`select:SendMessage` loads it.

**Where the id is written.** In the `cost` comment, not in a comment at spawn. One write a run in
place of two, and the comment already exists. Against it: an agent that died before it reported
leaves no id unless the orchestrator still writes its `cost` line, which step 5 already asks
("A run that was stopped or died gets its comment too"). An id that is lost costs a spawn, which
is what happened before (`philosophy.md` line 2, the smaller side).

**What a resumed round's `tokens` means** is not settled. The issue's one observation (40,982
after the first turn, 41,056 after the second, an agent with no tool call) says the number holds
the earlier context. The procedure does not correct the number: the line carries what the run
reported and `"resumed":true`, and a reader takes off the `tokens` of the same agent's line before.
Whether that difference is what the round was charged is not known.

### What differs from the issue's text

The issue's point 4 has a resumed implementer "rebase its worktree". There is none: step 10 of the
brief removes the worktree and its branch at landing, before the review. The brief has the agent
make a new one (`worktree.sh <id>`), which is at `main` with the first round's change in it.

"Not trust what it read of files that may have changed" is given a command:
`git -C <root> diff --stat <sha of the submit's last commit ref> main` names the files changed
since, and the agent reads again the ones the round rests on. Run by this agent, not by a
resumed one, across the one commit that landed on `main` while this round was written
(`5d7eb7bf`, 2026-10-11 16:01:01 +0200):

```
git -C <root> diff --stat 5d7eb7bf~1 main
 .../skills/brain-maintenance/agents/implementer.md |  8 +++--
 .../records/dv-6-brief-step-8-runs-verify-run.md   | 35 ++++++++++++++++++++++
```

That is the case the line is for: a writer resumed after it would have step 8 of the brief in
its context as it was before `5d7eb7bf`.

### Tests

```
bun test ./tests/tools/rework-resumes-the-implementer.test.ts    in the worktree, 2026-10-11 16:01 CEST
  with SKILL.md and implementer.md as on main (git stash of the two)   0 pass, 5 fail
  with the change                                                      5 pass, 0 fail, 18 expect() calls
bun test ./tests/tools                                           135 pass, 0 fail, 16 files
```

The five read the docs: the `cost` examples of `SKILL.md` parse as JSON, each implementer's has
an `agent` and a `session` of the right form, one has `"resumed":true` with a round above 1; the
`in-progress` row names the resume; the section names `SendMessage`, `CLAUDE_CODE_SESSION_ID`
and the spawn; it says the reviewer is never resumed; the brief's section names the `reviewed`
event, `worktree.sh`, `rules.md` and the diff. They show the procedure is written, not that an
orchestrator follows it.

### Prior art

`knowledge.search?semantic=true` for "resume subagent SendMessage rework round" and "agent token
cost per issue context reuse" (before 15:59:16 CEST, the `date` of the command after them). The nearest entry to both was
`doc:effective-use-of-fable` (0.5 and 0.908); `grep -n -i "resum\|SendMessage"` on it finds
nothing. Nothing was used.

### Not tried

- A resume. This agent did not send a message to another: it would have been acting as the
  orchestrator. Everything below follows from that.
- A resumed agent that had used tools, one whose worktree was removed between its rounds, one
  resumed after the orchestrator's context was compacted, one after Claude Code was restarted.
- A refused send: what the tool answers for an agent the user stopped, or one of another session.
- The count a resumed run reports to the orchestrator, and whether it has `tools` and `seconds`.
- Whether a resumed writer passes its second review more often than a new one, and at what
  length of first round a new agent is cheaper. No threshold is in the procedure.
- `issue-stats.ts` does not read `cost` comments (`grep -n cost tools/cloud-brain/issue-stats.ts`
  finds nothing), so nothing there reads the new fields or `resumed`.

## The first resumed round, 2026-10-11

Written for `record-first-resumed-rework-round`, started 16:40 CEST (event 1017). Every count
below was run at 16:40 CEST on this machine, after the tracker's event 1017. `ia` is
`tools/cloud-brain/issue-as.sh issues-implementer-2` and is what the commands should be run with.
The tracker output quoted here is not from it: the 16:40 run read `sync` with the reviewer's token,
`issues-reviewer-2`, by the writer's mistake (comment 1027; a read). The same commands with `ia`
at 16:44 CEST gave 127 lines for the 126 below, one `cost` comment having been written between,
and every other number the same. `$A` is
`$CLAUDE_CONFIG_DIR/projects/-Users-tom-larkworthy-dev-lopecode-dev/$CLAUDE_CODE_SESSION_ID`, the
orchestrating session's transcript directory, read in a subagent's Bash. Those files are local
and are deleted after 30 days: the commands that read them cannot be run again after that.

### Which round

Round 3 of `annotations-file-feedback`: review 992 sent it back, the orchestrator sent it to
agent `a48b041e17dc6f265`, which had written round 2 as a new agent (round 1 was another
session's), the submit is event 1002 and the `cost` comment event 1003. It is the first
implementer's. Two spec writers were resumed before it and one after; the issue asks for an
implementer's round, so they are beside it here and not in its place.

```
costs() { for a in 0 500 1000; do ia "sync?after=$a&limit=500" 2>/dev/null; done | jq -s -c '[.[].events[] | select(.type=="commented" and (.body|startswith("cost {"))) | {seq, id} + (.body[5:]|fromjson)]'; }
costs | jq -c '{lines:length, resumed:[.[]|select(.resumed)|[.seq,.id,.role,.round,.tokens,.seconds,.tools,.agent]]}'

{"lines":126,"resumed":[
 [926,"dashboards-share-series-and-controls","spec-writer",2,193142,98,5,"a89422c60dbc48dc3"],
 [997,"lean-reviewer-persona","spec-writer",2,200150,395,8,"ab2bb0bbc2429cfcb"],
 [1003,"annotations-file-feedback","implementer",3,175404,283,14,"a48b041e17dc6f265"],
 [1015,"lean-reviewer-persona","spec-writer",3,216204,361,10,"ab2bb0bbc2429cfcb"]]}
```

### Its count beside a new agent's

```
costs | jq -c '[.[]|select(.agent=="a48b041e17dc6f265")|{seq,round,resumed,tokens,seconds,tools}]'
[{"seq":936,"round":2,"resumed":null,"tokens":150949,"seconds":645,"tools":35},
 {"seq":1003,"round":3,"resumed":true,"tokens":175404,"seconds":283,"tools":14}]

costs | jq -c '[.[]|select(.role=="implementer" and .round==2 and (.resumed|not))] | {n:length, backfilled:(map(select(.backfilled))|length), tokens:(map(.tokens)|sort|{median:.[length/2|floor],min:.[0],max:.[-1]}), seconds:(map(.seconds)|sort|.[length/2|floor]), tools:(map(.tools|select(.))|sort|{n:length,median:.[length/2|floor]})}'
{"n":11,"backfilled":10,"tokens":{"median":135293,"min":93203,"max":175360},"seconds":616,"tools":{"n":6,"median":35}}
```

```
                                  tokens     seconds   tools
resumed round 3, as reported      175,404    283       14
  less the agent's line before    24,455     (150,949 at the end of its round 2)
new-agent round 2, median of 11   135,293    616       35 (of the 6 lines that have it)
  the least and the most          93,203 .. 175,360
```

As reported, the resumed round is above the median and above every one of the 11. Less the line
before, it is below the least of them. Neither is what the round was charged; the next section is.

The issue names round 2 and the resumed round is a round 3. With every new-agent round of 2 or
more (`.round>=2` in the same command) there are 15 lines, the median is the same 135,293 and the
most is 177,525. 10 of the 11 are `backfilled` from the journal's headings, and one issue is on
both sides: the one line that is not backfilled is this agent's own round 2.

### What the round was charged

The record's first section left this as not known. Each request of an agent is in its transcript
with its `usage`. Summed over the requests before the send and after it:

```
usage() { jq -s -c --arg cut "$2" '[.[]|select(.type=="assistant")|{t:.timestamp,id:.message.id,u:.message.usage}]|group_by(.id)|map(.[-1])|sort_by(.t)|group_by(.t>=$cut)[]|{from:.[0].t,requests:length,cache_creation:(map(.u.cache_creation_input_tokens)|add),cache_read:(map(.u.cache_read_input_tokens)|add),output:(map(.u.output_tokens)|add),first:[.[0].u.cache_creation_input_tokens,.[0].u.cache_read_input_tokens]}' $A/subagents/agent-$1.jsonl; }
usage a48b041e17dc6f265 2026-10-11T14:31:35

{"from":"2026-10-11T14:14:01.558Z","requests":29,"cache_creation":142305,"cache_read":3711251,"output":28121,"first":[34790,6267]}
{"from":"2026-10-11T14:31:40.196Z","requests":13,"cache_creation":167146,"cache_read":1956246,"output":18576,"first":[144096,6267]}
```

The first line is round 2, a new agent; the second is the resumed round. **The resumed round
wrote more to the prompt cache than the round before it, 167,146 tokens against 142,305**,
because its first request wrote 144,096: the whole context of round 2, which it read from the
cache as 6,267. It then read about half as much from the cache (1.96 M against 3.71 M) in under
half the requests, and wrote two thirds of the output. So the 24,455 understates the round and
the 175,404 is nearer: the earlier context was paid for again once, as a cache write.

The agents this session had resumed before 14:32 UTC, by the time between the agent's last request
and its first after the send (the same `jq` over `.timestamp`, with `fromdate`). There are four.
Rounds 1 and 2 of this section said three: `a216c74` was left out, an implementer of
`snapshot-digest-test-fails-by-chance` whose run had stopped and which the orchestrator sent to at
12:03:03Z ("You stopped at about 12:35 CEST waiting on two probe arms"). That was not a rework
round and has no `cost` line with `resumed`, which is how the first count missed it; review 1122
found it. The list is from the answers to the sends, not from the `cost` lines. Each answer is
matched to its `SendMessage` call by the call's id, so a tool result that only quotes the words
"Resuming agent" is not counted (the command is review 1183's; run 18:27 CEST):

```
jq -c 'select(.type=="assistant")|.message.content[]?|select(type=="object" and .type=="tool_use" and .name=="SendMessage")|[.id,.input.to]' $A.jsonl > sends.json
jq -c --slurpfile s sends.json 'select(.type=="user")|.timestamp as $t|.message.content[]?|select(type=="object" and .type=="tool_result")|. as $r|($s[]|select(.[0]==$r.tool_use_id)) as $m|[$t,$m[1][0:7],($r.content|tostring|if test("Resuming agent") then "resumed" else "queued" end)]' $A.jsonl | grep -v '"queued"'

["2026-10-11T12:03:03.926Z","a216c74","resumed"]
["2026-10-11T14:18:14.386Z","a89422c","resumed"]
["2026-10-11T14:31:14.412Z","ab2bb0b","resumed"]
["2026-10-11T14:31:36.018Z","a48b041","resumed"]
["2026-10-11T14:37:27.231Z","ab2bb0b","resumed"]
["2026-10-11T15:52:12.278Z","a80fa84","resumed"]
["2026-10-11T15:57:22.249Z","a873aa0","resumed"]
["2026-10-11T16:05:11.999Z","a873aa0","resumed"]
["2026-10-11T16:09:06.100Z","a4b8bbd","resumed"]
["2026-10-11T16:15:09.339Z","a0be5db","resumed"]
["2026-10-11T16:26:51.440Z","a873aa0","resumed"]
```

The first four are the ones before 14:32Z. The seven after are to `ab2bb0b` again, `a80fa84`,
`a873aa0` three times, `a4b8bbd` and `a0be5db`; none of those is measured here. `a48b041` and
`a216c74` were not sent to again. Round 3 of this section said they were: its command tested every
tool result for the words, and two of the lines it found were the printed reports of the reviewers
of this issue (reviews 1090 and 1122), which quote them. Five other sends that day were answered
"Message queued for delivery", to an agent still running, and are not resumes.

```
agent     last request      first after the send   gap      first request: cache written / read
a216c74   10:23:50.912Z     12:03:08.236Z          5,958 s  114,548 / 6,267
a89422c   14:08:42.737Z     14:18:17.758Z          575 s    171,072 / 6,267
a48b041   14:24:45.302Z     14:31:37.649Z          412 s    144,096 / 6,267
ab2bb0b   14:26:57.682Z     14:31:17.805Z          260 s      2,084 / 178,464
```

The three that waited more than 5 minutes wrote their context again; the one that waited 260 s read
it. Four runs, one day, one model. That 5 minutes is the limit was not tested, and nothing here
says what a write and a read each cost in money. If it holds, a review that takes longer than
that (the two reviews of `annotations-file-feedback` took 659 s and 386 s) always ends with the
writer's cache gone, and a resumed round saves the reading and the tool calls, not the context.

### What the send answered, and what the run reported

The message was not the one `SKILL.md` gives. It had the first line in other words and no second
line:

```
Issue: annotations-file-feedback. The `reviewed` event is 992.
```

The agent's report still
speaks of "A resumed round" by name; that it read the section in this round and not in round 2 was
not checked.

```
jq -c 'select(.type=="user")|.timestamp as $t|.message.content[]?|select(type=="object" and .type=="tool_result")|(.content|tostring)|select(test("Resuming agent a48b041"))|[$t,.[0:140]]' $A.jsonl
["2026-10-11T14:31:36.018Z","[{\"type\":\"text\",\"text\":\"{\\\"success\\\":true,\\\"message\\\":\\\"Resuming agent a48b041\\\",\\\"resumedAgentId\\\":\\\"a48b041e17dc6f265\\\",\\\"pin\\\":{\\\"id\\\":\\\""]
```

The run reported all three numbers, in the notification of its end (14:36:19Z):
`<subagent_tokens>175404</subagent_tokens><tool_uses>14</tool_uses><duration_ms>283489</duration_ms>`.
What each counts differed between agents. `subagent_tokens` held the earlier rounds for all four.
`tool_uses` and `duration_ms` were the round's own for `a48b041` (14, 283 s after 35, 645 s) and
`a89422c` (5, 98 s after 35, 657 s), and running totals for `ab2bb0b` (55, 1,329 s after 47,
934 s). `ab2bb0b` had ended twice before its send, at 14:24:11Z and 14:26:57Z. Its transcript says why
(added in round 2, from review 1090):

```
jq -c 'select(.type=="user" and (.message.content|type=="string"))|[.timestamp,(.message.content|.[0:80])]' $A/subagents/agent-ab2bb0bbc2429cfcb.jsonl
["2026-10-11T14:11:24.049Z","Working directory: /Users/tom.larkworthy/dev/lopecode-dev.\nRead /Users/tom.larkw"]
["2026-10-11T14:24:47.717Z","[SYSTEM NOTIFICATION - NOT USER INPUT]\nThis is an automated background-task even"]
["2026-10-11T14:31:14.355Z","The coordinator sent a message while you were working:\nIssue: lean-reviewer-pers"]
["2026-10-11T14:37:27.158Z","The coordinator sent a message while you were working:\nIssue: lean-reviewer-pers"]
```

A background task of its own woke it 36 s after it first ended, with no send, and its `tool_uses`
and `duration_ms` ran on from there: 47 and 934 s at the end of that second run, 55 and 1,329 s
after the send. That does not explain the running totals. `a216c74` reported them too, and no
notification had woken it (round 3, from review 1122):

```
jq -c 'select(.type=="user" and (.message.content|type=="string"))|[.timestamp,(.message.content|.[0:80])]' $A/subagents/agent-a216c7469a0554062.jsonl
["2026-10-11T10:18:09.284Z","Working directory: /Users/tom.larkworthy/dev/lopecode-dev.\nRead /Users/tom.larkw"]
["2026-10-11T12:03:03.844Z","The coordinator sent a message while you were working:\nYou stopped at about 12:3"]

its two ends, from the notifications in $A.jsonl that name it and have subagent_tokens:
2026-10-11T10:23:50.929Z  <subagent_tokens>121385</subagent_tokens><tool_uses>31</tool_uses><duration_ms>341645</duration_ms>
2026-10-11T12:09:44.084Z  <subagent_tokens>145279</subagent_tokens><tool_uses>49</tool_uses><duration_ms>6694796</duration_ms>
```

6,695 s is the time from its spawn at 10:18:09Z. So of the four, two gave the round's own
(`a89422c`, `a48b041`) and two gave running totals (`a216c74`, `ab2bb0b`), and one of those two
had a notification and the other had not. What decides it is not known. Round 2 of this section
said the two with no notification gave the round's own; with `a216c74` that is false. Its `cost` comment 997 has the difference (8, 395), which step 5 of `SKILL.md`, "as they
are", does not ask for; it is left as written.

### What the resumed agent said of the brief

From the journal (`tools/cloud-brain/.emitted/issue-loop/annotations-file-feedback.md`, the entry
reported 16:36:33 CEST): used from round 2 without reading again, the seed, the rig and the
landing sequence; read again, the one-line change to `implementer.md`; stale, its saved copies of
the two issues, fetched again; "wrong in the brief: nothing in the resumed-round section".

### The session id after a restart

Not seen. The issue asks for the comparison "when a session has been restarted and resumed", and
this one was not, as far as its transcript shows:

```
jq -r '.sessionId|select(.)' $A.jsonl | sort | uniq -c      5123 f501a8e8-b922-4e11-a581-2b725efd6272
jq -r 'select(.subtype=="compact_boundary")|.timestamp' $A.jsonl
2026-10-11T10:50:41.342Z  2026-10-11T13:25:30.516Z  2026-10-11T14:22:31.004Z
```

One id on every line, the `session` of all four resumed `cost` lines and the value of
`$CLAUDE_CODE_SESSION_ID` in this agent's Bash. The transcript has no line that marks a restart,
so this shows no change of id and does not show that no restart happened. `SKILL.md` said a
restarted session "keeps its id" as a fact; it now says that has not been seen and what to
compare. What was seen is compaction: `a48b041` began at 14:14:00Z, the session compacted at
14:22:31Z and the send at 14:31:35Z was taken, so `SKILL.md` no longer lists that as not tried.

### Not tried

- A refused send, and a resume after a restart of Claude Code.
- Whether a resumed writer passes its next review more often. This one did: round 3's review had
  not been recorded at event 1017, and review 1036 then passed it (`ia "get?id=annotations-file-feedback"`
  at 17:57 CEST: `done`). One round is not a rate.
- The cost in money of either round, and a resume inside 5 minutes by an implementer.
- `agents/implementer.md` still says "No round had been run this way when this was written".
  It is true of when it was written and was left.
