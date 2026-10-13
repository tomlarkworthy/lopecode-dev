# Cloud Brain: the orchestrator as steps: a program makes the pass, each agent is a process of its own, and a model is started for one entry that needs judgment

Spec of the feature `orchestrator-as-steps` on cb4's tracker. Written 2026-10-12, begun 23:03 CEST
(the `spec` move, event 5021), from `lopecode-dev` `56ea28e4` and the tracker at event 5126.
Nothing here is built. Three probes were run for it and are in "What exists today".
Round 2, 2026-10-12 23:32 CEST: the two findings of review 5194 and its three notes are answered
at the end, and the text they name is changed in parts 2, 3 and 4, in the table of what is used,
in the checks and in the tasks `st-2`, `st-3` and `st-8`. A fresh reader of that change had 10
findings more, answered in the section after it.
Round 3, 2026-10-12 23:49 CEST: the one finding of review 5247 and its notes are answered in the
last section; the condition above the step's table is read by role.

Three findings change what the issue asks for, and they come first:

- **A fresh model process for every wake bounds the context and costs about what a wake costs
  today.** The session was woken 263 times by a notification on 2026-10-12 and read 764,862 tokens
  from the cache in the median such turn. The one pass ever run as a fresh process (`fly-1-by-hand`,
  the same evening) took 10 turns and $0.76 to reach the end of step 1 and do nothing. So the
  design is not "the same pass in a new process each time". Most of a pass needs no model.
- **A third of what the orchestrator writes is already decided by code or by a fixed rule.** Of
  the 1,015 events written with an `orch-` token, 180 are `cost` events copied from a report, 102
  are the move to `ready`, 33 are worktree comments and 7 are `finish`. `issue.queue` (bk-3, on
  cb4) already says what is next and in what order. What is left for a model is triage, a spec's
  decomposition, a comment for the owner and a few judgments.
- **Nothing of the harness stands in the way of an agent that outlives what started it.** A
  `claude -p` run returned in 5 s with a child it had started still running, and a session begun
  by one process was continued by another from another directory (both run 23:09 CEST, below). The
  reviewer has been such a process since 2026-10-11 (`cloud-brain-dev/agent.sh`).

## What was asked

The owner, in the orchestrating session, 2026-10-12, before 23:03 CEST, whole (the issue's body):

> does your context grow unbounded? If so we should figure out a way of making the loop orchistrator step based

The rest of the body is the orchestrating session's account, "for the spec writer to check, not
findings", and what it asks for in his name: "started by an event or a clock, it reads what is
true from the tracker and the machine, does what one pass does, writes what it did, and ends. No
step depends on what an earlier step remembers."

Two more of his sentences of the same evening bind the design, both quoted on the tracker:

> would this cover deterministic rule changes or workflow changes, not jsut agent prmpt tweaking, generally fixes are better as guards.

(comment 4981 of `pm-agent-request-not-seen-fly-idle`), and of `tracker-trigger-rules`:

> These kinds of features should be inbuilt into the board and not delegated to LLM judgment

And of 2026-10-12, of `bookkeeping-in-the-tracker`: "what gets pulled from the queue next should
be decided by code ... the items are streamed to it, and the book keeping is in the issue service."

One reading here is this writer's and not his. "Step based" is read as two things: no process of
the loop has a context that grows with the hours the loop runs, and no step needs what an earlier
step held. He asked about the first. The second is the body's, and is what makes the first safe.

## The reports gathered

`ia "list?parent=orchestrator-as-steps"` answered `{"issues":[]}` at 23:03 CEST: the feature has
no parts. Its body carries the session's account in three lists, and three issues are linked to it
as `related`. Each line was checked here.

| Item | What was found | What it becomes |
|---|---|---|
| "Its context grows with every report and is cut by compaction" | True, and the cut does not shrink it for long: 17 compactions in 36 hours, each at 323,340 to 353,190 tokens, the median request of a day at 236,756 and 252,466 | R1 |
| "compacted at least twice on 2026-10-12" | 7 times that day (UTC) | R1 |
| Holds: "which agents run, by the id the harness gave them" | The `cost` event has `agent` and `session` once a run has reported, and nothing before that | R4, R5 |
| Holds: "which background reviewer process is whose" | Nothing in the record until the reviewer's `cost` event | R4 |
| Holds: "which tokens are kept past a report and why, and which are to be ended at a time" | The rule is in `SKILL.md` ("A token for each agent", Ended) and reads the issue's state; "at a time" is a line of the journal (`REVOKE when the Fly writer reports or by 23:30`) | R6 |
| Holds: "holds written as comments, and one writer at a time in this file" | 66 `held:` comments by an `orch-` token. `issue.hold` and the link `after` are on cb4 (bk-1, bk-3); the comments become those in `bk-5-holds-become-links`, which is at `in-progress` | Left to `bk-5`. "One writer at a time in this file" is a link `after` between the two tasks |
| Holds: "which approver token and view were made and not started" | `agent-token list` and `worktree.sh --list` show both; nothing joins them to "not started" | R4 |
| Holds: "what the owner said in chat that is not yet a comment" | Not in any store. A step cannot hear him | R7 |
| "writers ... do not outlive it and their reports land in its context" | True of an `Agent` call: the headless page says a `-p` run "stays open until that work completes". Not true of a process (probe 1) | R3 |
| "the journal and the cost event of a run are written by the session from the report" | 180 `cost` events by an `orch-` token | R4 |
| "a rework round is sent to an agent by an id only that session can use" | True of `SendMessage`. `claude --resume <session id>` is taken from any process (probe 2) | R5 |
| `pm-agent-request-not-seen-fly-idle` (related; its file is on `main`) | Its cause: a request to the orchestrating session "has no form that a tool or a table of the loop reads", and the session's half was a note that a compaction shortened. Its first action is the label `asks-orchestrator` | R2, and one row of the step's table. The label is that post mortem's task, landed as `ae5423a2` (the watch prints it), and is not built again |
| `bookkeeping-in-the-tracker` (related, `building`) | `issue.queue` answered 200 in 0.44 to 0.70 s, 10,258 bytes, 29 entries in `queue` and 30 in `waiting` (23:12 CEST) | The step reads it. Not built again |
| `tracker-trigger-rules` (related, `building`, five tasks at `triaged`) | `issue.wait` is not built. Its `waiter` in the queue says that a starter listens or is at work | The step reads `waiter` when it is there. Not built again |

`worker-machine-on-fly` is not linked and bears on this more than the three that are: its part 2
runs `claude -p "/loop /brain-maintenance"` as one session on the machine, with the lock `loop`
kept by that session's watch. That is the thing this issue takes apart. Its tasks `fly-2` to
`fly-6` are at `triaged`, behind `fly-1-by-hand`. Part 6 below says what of them changes.

## Requirements

- **R1.** No process of the loop that runs a model has a context that grows with the time the loop
  has run. A model is started for one piece of work and ends with it.
- **R2.** What a pass does is decided from what the tracker and the machine answer at that pass. A
  pass that is killed and started again does the same thing, and a wake names no work: it is a
  reason to read.
- **R3.** An agent (a writer, a spec writer, a digest writer, a reviewer, an approver, an overseer)
  outlives what started it.
- **R4.** That a run was started, for which issue, by which token, in which session of the harness
  and on which machine, is in the record from its start. Its journal entry and its `cost` event are
  written when it ends, by a program.
- **R5.** A round that was sent back reaches the agent that wrote the change, from any process on
  the machine that has its transcript.
- **R6.** What can be decided without judgment is decided by the program: what is next, a review
  started, a move to `ready` or `done`, a token ended, a worktree freed, a writer found dead.
- **R7.** The owner's words reach the loop as events of the tracker, and what waits for him is
  read from the tracker. Neither needs a session that has been running since morning.
- **R8.** The loop is run as it is today until the new way has been seen to decide the same things,
  and going back is one command.

## What exists today, measured

### The orchestrating session

`f501a8e8-b922-4e11-a581-2b725efd6272`, the session whose token is `orch-d97e0e` (`agent-token list`,
the line with the note `orch; f501a8e8…`). `measure.py`, a script of this writing, reads its
transcript and calls nothing; it is an attachment of the issue
(`ia "attachment?id=orchestrator-as-steps&name=measure.py"`, event 5138). Run 2026-10-12 23:13 CEST, while
the session was at work:

```
first 2026-10-11T08:52:13.753Z last 2026-10-12T21:12:30.299Z requests 2898 compactions 17
context of the last request before each compaction: [328225, 353190, 326922, 324583, 330174, 323340, 329368, 328205, 337476, 328213, 333846, 332638, 326269, 324872, 328780, 325541, 328137]
2026-10-11 requests 1772 cacheWrite 3673512 cacheRead 417582280 output 877420 context median 236756 max 366830
2026-10-12 requests 1126 cacheWrite 2314605 cacheRead 279724205 output 660731 context median 252466 max 366988
2026-10-11 prompt rows {'human': 26, 'meta': 10, 'task-notification': 359, 'channel': 1135, 'plain': 5, 'compact': 10} | task-notifications: lines of a monitor 83 the end of an agent or a command 276
2026-10-12 prompt rows {'task-notification': 266, 'plain': 32, 'meta': 32, 'compact': 7, 'channel': 8, 'human': 10} | task-notifications: lines of a monitor 160 the end of an agent or a command 106
    task-notification turns 263 requests 922 cacheRead 234608652 median cacheRead a turn 764862
    human turns 9 requests 44 cacheRead 9921600 median cacheRead a turn 791983
tool calls [('Bash', 1532), ('Agent', 291), ('ScheduleWakeup', 95), ('Monitor', 64), ('Read', 42), ('SendMessage', 40), ('ToolSearch', 22), ('TaskStop', 8)]
```

- One session, 36 hours 20 minutes, 2,898 requests, 697 M tokens read from the cache.
- **The context is at its ceiling most of the time.** A compaction comes at about 328,000 tokens,
  and the median request of each day is three quarters of that. Compaction keeps the session
  alive. It does not make a wake cheap.
- **A wake is 3.5 requests and 764,862 cache-read tokens at the median** (2026-10-12: 263 turns
  begun by a notification, 922 requests). 160 of those notifications were lines of the watch and 106
  the end of an agent or of a background command. The owner typed 10 times.
- The 2026-10-11 line of channel rows (1,135) is the paired tabs of writers, mended that evening
  (`tools/cloud-brain/records/writers-qa-tabs-wake-the-orchestrator.md`); 8 rows on 2026-10-12.
- Dates are UTC days of the transcript's timestamps.

### What the orchestrator writes

`sync?after=` from 0 to event 5075, read 23:11 CEST with `spec-302503`; `measure.py` over it:

```
events by an orch- token: 1015 of 5075
   128 moved triage        105 labelled          102 moved ready       89 opened
    87 cost reviewer        73 cost implementer   66 commented held    38 commented decision
    22 linked               22 + 21 commented needs-owner-off, -ended  21 commented worktree-removed
    15 moved decompose      12 commented worktree 11 cost spec-writer   9 cost approver
     7 moved finish          6 moved close
```

The `orch-` tokens exist since 2026-10-11 20:30 UTC; before that a role's token wrote for the
session and its writers alike, and those events are not classed. Copied from a report or fixed by
a rule with no reading: the 180 `cost` events, 102 `ready`, 33 worktree comments, 7 `finish`: 322
of 1,015. The 66 `held:` comments are what `bk-5` turns into links and holds.

### A step run as a fresh process, once

`tools/cloud-brain/records/fly-1-by-hand.md`, "One pass of the loop", 2026-10-12 20:44 UTC, on the
Fly machine: `claude -p "/brain-maintenance" --model opus --permission-mode bypassPermissions`,
"10 turns, 34 s, `usd` 0.76 in its result line. It ended at step 1." It did not know which token
was its own and wrote nothing. The same record: "A `Monitor` runs under `claude -p`" and "A
`ScheduleWakeup` runs under `claude -p`", each tried apart from the skill. "Not tried": "A pass
that starts an agent."

The two costs are not in one unit: the session's wake is counted in tokens from its transcript,
the fresh pass in the harness's own estimate of dollars. `st-1` measures both the same way.

### The reviewer is already a process

`cloud-brain-dev/agent.sh ROLE "task"` starts `claude -p` with four tools and prints one JSON line:
`session`, `result`, `usd`, `usage`, `context`, `turns`, `ms`, `legs`, `toolset`, `mode`. `--resume SESSION "message"`
continues it. `SKILL.md` step 4 starts it with Bash in the background of the session, which is
what ties it to the session today: the session waits for its line. Measured in its README: 25,212
tokens after it had read its brief, the rules and `philosophy.md`, where an `Agent` told to answer
"OK" is 40,842. `DRY=1 CHECKOUT=<W> agent.sh implementer "Issue: x"`, run 23:12 CEST, prints
`--tools Bash,Read,Grep,Glob` and `--settings {"advisorModel":""}`: the launcher gives every role
the reviewer's four tools and no advisor.

`tools/cloud-brain/summarize-papers.ts run` starts one `agent.sh` a paper and writes one line a
run to `.emitted/papers/journal.jsonl`: a second place where a program starts light agents and
keeps their costs.

### Three probes, 2026-10-12, `claude` 2.1.296, this laptop, inside the session's sandbox

1. **A `-p` run ends while a child it started lives.** 23:09:26 CEST:
   `claude -p 'Run exactly this one Bash command …: nohup sleep 150 >/dev/null 2>&1 & echo started $!' --allowedTools Bash --model haiku --output-format json`:
   exit 0 after 5 s, `num_turns` 2; `pgrep -fl "sleep 150"` then printed `62074 sleep 150`.
2. **A session is continued by another process, under an id chosen before it began.** 23:09:41 CEST:
   `claude -p 'Remember the word heron. …' --session-id <uuid>`, exit 0, `session_id` the uuid
   given; then from another directory `claude -p 'Which word …' --resume <uuid>`: `result` `heron`,
   the same `session_id`.
3. **A run can be in the record before it ends, with no change to the service.** Read, not run
   (`brain-issues.ojs`, the `cost` branch of the body's check): `outcome` is "a name, a-z 0-9 -, 30
   at most", `seconds` and `context` are whole numbers "0 or more", and `issueRunOf` finds the run
   of the same issue, role and round, which a later event replaces and names in `replaced`. So an
   event with the outcome `running` is taken, and the run's last event takes its place.
   `ia "runs?id=orchestrator-as-steps"`, 23:12 CEST: `{"runs":[], …}`.

Not probed: a writer with the whole toolset as a `-p` process (the reviewer's four tools are what
has been run); the detach on Linux, where `nohup … &` under `claude -p` was not tried.

### The machine

`uptime`, 23:12 CEST: load 10.76 on 18 cores, with seven writers and a reviewer at work.
`LOCK_TOKEN=spec-302503 tools/cloud-brain/lock.sh show loop`: exit 2 and the usage (`take land|cb4`):
the lock `loop` of the Fly spec is not built. `ls tools/cloud-brain/loop.ts tools/cloud-brain/fly`:
neither is there.

## Read

- **The Brain, 23:07 CEST, seven searches** with `loop-knowledge` (`knowledge.search?semantic=true`):
  "orchestrator context grows compaction step based stateless process reads state from the
  tracker", "agent started as a process of its own outlives the session that started it", "event
  driven wake of an agent reconcile loop controller level triggered", "long running agent context
  window harness fresh context each iteration", "resume an agent by session id from another
  session", "durable execution workflow replay event sourcing orchestrator", "which agents run
  lease heartbeat dead writer".
  Used, each read whole: `doc:cloud-brain-worker-machine-on-fly` (part 2: the lock `loop`, what
  keeps it, the yield; "Not chosen": two orchestrators); `doc:cloud-brain-bookkeeping-in-the-tracker`
  (the queue's two tables, "What the record does not know is which agents run"); `doc:cloud-brain-tracker-trigger-rules`
  (the wait as a lease, `waiter`, "A push reaches no agent of the loop");
  `doc:pm-agent-request-not-seen-fly-idle` (the cause and the three actions);
  `doc:cloud-brain-dev-readme` ("A light agent for one role");
  `doc:cloud-brain-record-names-token-not-agent` (through `SKILL.md`, "A token for each agent").
  Read in part: `doc:cloud-brain-loop-order-of-service` (through `SKILL.md` steps 2 and 3).
  Not used: the papers of four of the searches (SoL-Pi, Agentic Context Engineering, MemoHarness,
  EvoAgentX and others: titles and snippets only; they are about a harness that changes itself, not
  about where an orchestrator keeps state), `web:weng-harness-engineering` (the snippet names "file
  system as persistent memory, sub-agents"; the article was not read),
  `module:tomlarkworthy:robocoop-5-sessions` and `justbash-session` (sessions of the in-notebook agent).
- **In the checkout, whole:** `SKILL.md`, `rules.md`, `philosophy.md`, `agents/spec.md`; the three
  specs above; `cloud-brain-dev/agent.sh`; `tools/cloud-brain/issue-watch.sh`;
  `records/fly-1-by-hand.md` from "`claude -p` on the machine" to the end;
  `records/writers-qa-tabs-wake-the-orchestrator.md` to "What changed". In part: the headers of
  `issue-wait.sh`, `worktree.sh`, `agent-usage.ts`, `channel-wakes.ts`; the `cost` code of
  `brain-issues.ojs`; `agents/implementer.md` to step 1.
- **Outside.**
  - Claude Code, "Run Claude Code programmatically" (https://code.claude.com/docs/en/headless),
    the page's own text. Used: "Background subagents and workflows: the run stays open until that
    work completes, because its result is part of the final output" (an `Agent` call pins a step
    open); "You can run the two commands from different directories: Claude Code finds the session
    by its ID in any project on this machine" (probe 2); a `Monitor` watch is waited for until "the
    10-minute cap ends the wait" and "By default, a watch times out five minutes after Claude
    starts it" (a watch inside a `-p` run is not a driver); SIGTERM "leaves the turn that was in
    progress unfinished and records no result for it".
    `claude --help` on this laptop: `--session-id <uuid>`, and `--bg` with `claude agents`,
    `logs`, `stop`, `respawn` (background sessions kept by the harness; "Not chosen").
  - Anthropic, "Effective harnesses for long-running agents"
    (https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents), **read in
    a summary** with quotes: "each new session begins with no memory of what came before";
    "compaction isn't sufficient", since it "doesn't always pass perfectly clear instructions to
    the next agent"; the state between sessions is a progress file, git and a list of features
    with a `passes` field. Used: the state a next session reads is structured and outside the
    model, and here that is the tracker.
  - Temporal, Continue-As-New (https://docs.temporal.io/workflow-execution/continue-as-new),
    **read in a summary**: a workflow passes its "latest relevant state" to a new run "with a
    fresh Event History", because a long history "may bog down". Used as the name of what a
    compaction is not: the state carried over is chosen by the program, not summarised by the run.
  - Kubernetes controllers, **a search's summary of third-party pages; no page read**: a
    controller is level-triggered, its reconcile request "contains a NamespacedName ... not the
    object or the triggering event", and it reads the current state by that key; one page says
    this is why it survives missed events and restarts. Used as the rule of R2: a wake is at most
    a key. Under it the watch dropping comment 4816 would not have mattered, had the request been
    a fact the read shows.
  None of the three systems was run.

## The design

Six parts. The loop becomes a program, `tools/cloud-brain/loop.ts`, with a model started in two
places only: as an agent on an issue, as today, and as the orchestrator's judgment on entries the
program cannot decide.

### 1. Every agent is a process (R3, R5)

`cloud-brain-dev/agent.sh` starts every role, not the reviewer and the summarizer alone. Three
things are added to it, each an environment variable beside `TAB`, `READS` and `MODEL`:

- `WORK=<dir>`: the run is started in that directory with the prompt as the caller gives it and
  the tools a session there has (no `--tools`, no `--strict-mcp-config`, the advisor left on,
  `--permission-mode bypassPermissions`). This is what a writer, a spec writer, a digest writer, an
  approver and an overseer are given today by the `Agent` call, less the session's MCP servers.
  As built: `st-1` built the flags of that parenthesis, and a process so started had every MCP
  server of the user's and the project's settings (93 tools of four servers, with nothing asked).
  Since `st-1b-work-process-without-mcp` (2026-10-13) `WORK` gives `--strict-mcp-config` with no
  `--mcp-config`, on a start and on `--resume`, and the process has none
  (`tools/cloud-brain/records/st-1b-work-process-without-mcp.md`).
  The prompt is the four lines of `SKILL.md` step 4, unchanged, so the briefs are read as they are.
  As built (since `loop-started-run-is-told-no-scratchpad`, 2026-10-13): five lines for a run `loop.ts start` begins. The fourth is
  `scratch: <dir>`, a directory of the run alone that `start` makes and `ended` removes, since such a process has
  no session's scratchpad and the briefs send the files of a landing there
  (`tools/cloud-brain/records/loop-started-run-is-told-no-scratchpad.md`). An approver's prompt is its three lines.
- `SESSION=<uuid>`: passed as `--session-id`, so the id is known, and written, before the run.
- `--resume SESSION "message"` as today, from any process. `WORK` holds for it too: the resume
  branch of the script gives the four tools today (`GIVE=(--tools "Bash,Read,Grep,Glob" …)`), and a
  writer's round needs the tools its first run had.

`TAB` and `READS` stay as they are: the reviewer and the summarizer are not changed.

What an `Agent` call has that such a process has not: the session's MCP servers. A writer has not
used a paired tab since 2026-10-11 (`tab-tests.ts`). The memory palace is the other; whether a
writer calls it was not counted, and `st-1` reads it from the transcripts before the switch.

### 2. A run is started and ended by a program, and is in the record between (R4, R6)

`loop.ts start <id> [--role <role>] [--token <t>]` is steps 4 and 5 of `SKILL.md` as code. With the role taken
from the issue as the queue's `do` gives it:

1. `brain.ts agent-token <role> <id>`, or with `--token <t>` a token made before (the check of
   `st-2`): the program then ends no token, in `ended` or for a dead run, since it made none.
   Its own writes (the `worktree {…}` comment, the `cost` events) are with the token it was
   started under: the driver's in a step, the caller's in that check; the worktree or the view (`worktree.sh --fresh … --for`,
   `--at <sha> rev-<id>`, `--at origin/main appr-<id>`) with each exit handled as step 4 says; the
   `worktree {…}` comment; `review-needs-tab.sh` for a reviewer.
2. The file `.emitted/issue-loop/runs/<token>.json`: `{ id, role, round, session: <a uuid it chose> }`.
3. The run, detached: a wrapper that runs `agent.sh`, its one line of JSON to
   `runs/<token>.result.json`, and then `loop.ts ended <token>`. The wrapper's pid and the time the
   process began (`ps -o lstart= -p <pid>`) are added to the file of 2.
4. One `cost` event, key `cost/<id>/<role>/<round>/<token>`:
   `{ role, round, how: "fresh", outcome: "running", seconds: 0, context: 0, token, session, agent: "<hostname -s>:<pid of the wrapper>" }`.

As built (`st-2-loop-start-and-end`, 2026-10-13; `tools/cloud-brain/records/st-2-loop-start-and-end.md`),
where it differs from the four items or adds to them:

- The token the program was started under is named before the command, `LOOP_TOKEN=<name>`, as
  `LOCK_TOKEN` is for `lock.sh`. With none it exits 2 and reads nothing.
- `ps` is setuid and the sandbox of a session refuses it (`operation not permitted: ps`, that
  day), so the time a process began is `""` in a file written there. A run is known to live by
  its wrapper's command line, which has `loop-run-<token>` and is read with `pgrep -f`; the time
  is compared as well where the file has one and `ps` gives one.
- The file has more keys than the four: `token`, `how`, `made` (false under `--token`), `as`,
  `host`, `tree`, `path`, `pid`, `began`, `agent`, `running` (the seq of the event) and, once
  ended, `ended`. Beside `runs/<token>.result.json` the wrapper writes `runs/<token>.exit`, the
  exit of `agent.sh`: 1 is a result that was an error, which the JSON line does not say.
- A reviewer's run is `how: "light"` and is started with `CHECKOUT`, as `SKILL.md` step 4 has it,
  and not with `WORK`.
- `ended` keeps the token of a writer whose outcome is `in-review`, `changes` or `no-submit`: each
  may be sent the round by `resume`. The rule of "A token for each agent" names `in-review` alone.
- `resume` takes a token for live when a read of the issue sent with it answers 200, the test
  `worktree.sh` makes of an occupant, and runs no `agent-token list`.
- The count of dead runs is `loop.ts dead <id> --role <role> [--round <n>]`.

The role in a file, in a `cost` event and in `runs?role=` is the name `SKILL.md` gives a run; the
prefix of a token is another word. Side by side, token and role: `impl` `implementer`, `dig`
`digest`, `spec` `spec-writer`, `rev` `reviewer`, `appr` `approver`, `over` `overseer`, `orch`
`orchestrator`.

A `start` that died between 2 and 4 left a file with no event (of a role that is not `overseer`,
below): the next step writes the event when
the process of the file lives, and treats it as a run that died when it does not. A pid alone is
not the test of "lives": after a restart of the machine another process may have it, so the time
the process began is compared with the file's.

**An overseer is on no issue**: `loop.ts start --role overseer` takes no id, and the file's `id`
is empty. A `cost` event needs one (`SKILL.md`, step 5: "its line goes in
`_oversight.md`"). Its run has the file and no event, so R4 does not hold for it. That one runs is
read from `agent-token list`: a live token whose note begins `over;`. `ended` writes its line to
`_oversight.md` and ends the token.
An overseer that died (round 3) is read from its file, since no `cost` event says it: the pid of
the file is gone and there is no result. The step ends its token and writes `stopped` in the
file. One that returned with no new heading in `oversight.md` (a result with `is_error`) is as
bad: its token is ended and the row would hold again. So the row that starts one counts the
overseer files since the last heading of `oversight.md`, however they ended, and at 2 starts no
third: `status.md` names it. This count is of the files of one machine and cannot be
made again from the record; with the files lost, two more are started at most.

`loop.ts ended <token>`, when the run has returned: the report appended to the journal
(`.emitted/issue-loop/<id>.md`, as today); the `cost` event sent again under `…/<round>/<token>/end` with
the JSON line's `ms`, `context`, `usd` and the usage `agent-usage.ts --session` prints, and the
outcome read from the issue (`in-review`, `pass`, `changes`, `stopped`, `no-submit`), which the
service puts in the first one's place; `worktree.sh --leave` or `--remove`; the token ended by
the rule of "A token for each agent" (not for a run that ended at `in-review` or `spec-review`).
It is safe to run twice: each write has a key.

**The key has the token in it (round 2).** A round is the `rework` moves plus one, so `back` does
not move it: the writer started after "A dead writer", a reviewer started after one that died and
a `resume` that falls back to a `start` are each a second run of one role and round. Under the key
`cost/<id>/<role>/<round>` the second `running` event would be the first key again, and the service
writes nothing for a key it has (`duplicate: true`): the run would stay `stopped` in `runs`, a
second agent would be started beside it, and a live writer would get `back`. A token is made for
one run, so no two runs share a key. The service finds the run by role and round and not by key
(`issueRunOf`), so the second run's `running` event takes the dead run's place in `runs`, which is
what the rows read. The cost of that: the dead run's event stays in the record with its usage and
is no longer in the issue's `total`, as today when a run's event is sent again. `st-8` counts
those. A round sent by `resume` to the same token has the key
`…/<round>/<token>/resumed-<at>`, and its end that key and `/end`. `<at>` is the seq of the event
the resume is made for: the `rework` or `respec` move, or the `go-on` verdict of part 3 when it is
the later. One token can be resumed twice in one round (a run with no submit, then `go-on`), and
the seq keeps the two keys apart. For a writer the round is the `rework` moves plus one; for a
spec writer the `respec` moves plus one.

**How many runs of a role and round died** is not in `runs`, which keeps one run a role and
round. It is counted in the events of `get?id=`: the `cost` events of that role and round whose
outcome is `stopped` or `no-submit`. Each run that died has one such event, the one its `running`
event was replaced with, and it stays in the record when the next run's event takes its place in
`runs`. Part 3 names this count "the dead runs".

`loop.ts resume <id>` is "A rework round goes to the agent that wrote the change": the last run of
the role from `runs?id=`, its token live, its `agent` naming this machine: `agent.sh --resume
<session>` with the three lines of that section (since `loop-started-run-is-told-no-scratchpad`, 2026-10-13 a fourth, `scratch: <dir>`, the
run's directory made again), a `running` event for the round with
`how: "resumed"`, under the key above. Anything else is the row "A dead writer": the token ended, `back`, and the
issue is a `start` at the next read.

So the questions the session answered from memory are a read:

| Question | Read |
|---|---|
| Which agents run | `runs` with the outcome `running` |
| Whose process is it, and is it alive | `agent` of that run: this host, and the pid of `runs/<token>.json` with the time it began |
| Where is a writer sent its next round | `session` of its last run |
| Which token is to be ended | a live token of `agent-token list` whose issue has left `in-review` or `spec-review` for good and has no `running` run |
| Which approver view was made and not started | `worktree.sh --list`, a view `appr-<id>` with no `running` run of that issue |

`agent` carries `<host>:<pid>` where it carried the harness's `agentId`. Both say where to reach
the run, and a process has no `agentId`. `how` stays `light` for a run with the four tools.

**A run that died.** A `running` event whose `agent` names this host and whose process is gone:
when `runs/<token>.result.json` is there, `ended` was not run (the machine slept, the wrapper
was killed) and is run now. With none the run is dead: the event is replaced with the
outcome `stopped`, and the issue is taken as "A dead writer". No judgment, and no 20 minutes.
A `running` event that names another host is left, and is named in the status after 4 hours.

**An agent the program did not start.** A session that runs a pass by hand, or the session's loop
on the day of the switch, has writers that are `Agent` calls with no `running` event. The step
does not take those for dead. An issue in `work` with no run of its current round in the record
is left while its starter's token is live (`agent-token list`), and is named in the status after
4 hours; it is "A dead writer" when that token has ended. From `st-7` a pass by hand starts its
agents with `loop.ts start`, so the case is the day of the switch and no later.

### 3. The step (R2, R6)

`loop.ts step` is one pass. It holds nothing between runs but the files of part 2, which it can
make again from the record. In order:

1. **Health**, the commands of `SKILL.md` step 1 as they stand: the two pulls, the two reads of
   `cloud-brain-dev`, `worktree.sh --list` with its removals, `redistil`, `state` against
   `seen.json` of `origin/main`, both locks. Not healthy: nothing is started; see the last row
   of the table.
2. **Runs**, as part 2: `ended` for each run that returned, the dead ones marked.
3. **The queue.** `issue.queue`, and for each entry, in the service's order. One condition holds
   for every row that starts or resumes an agent and is not written in each, and it is read by
   the role the row starts (round 3): the issue has no `running` run of that role (`runs?id=&role=<role>`, the outcome `running`).
   No round is in it: a run of an earlier round that still runs stops the start as well, and a
   run that ended, whatever its outcome, does not. The roles of a writer are one for this:
   `implementer`, `digest` and `spec-writer`. So a `review` entry beside a
   `running` writer gets its reviewer. A writer does not end at its submit: it waits up to 20
   minutes for its review (`agents/implementer.md`, step 13), its process has not returned and
   its event is `running`, and `SKILL.md`, step 2, has that it "is not counted as a writer at
   work … and the review is then yours to start". The `round` row is the other way: a `running`
   writer takes the round itself, and the step sends it nothing. A reviewer's issue stays a
   `review` entry until its review lands and a writer's stays a `start` until the writer's own
   `start` move, and the driver steps at every event, so without the condition a second agent of
   one role is started. A second condition
   holds for the same rows: fewer than 2 dead runs of that role and round (part 2), or the verdict
   `go-on` for the last of them (below). A reviewer, a
   spec writer or a writer that dies before its first move leaves the entry as it was, and with
   no bound the step would start one at every read. With 2 or more and no such verdict the entry is
   the row "2 dead runs" and no agent is started by rule.

| The entry | The step does | A model |
|---|---|---|
| `review` | `start`, role reviewer | no |
| `round`, fewer than 3 `rework` moves; or with the verdict `go-on` for this `<at>` (below) | `resume`; with a `waiter` (tr-3), nothing | no |
| `round`, 3 `rework` moves or more, or the last run of the role ended with the outcome `no-submit`; no verdict for this `<at>`, and no label `needs-owner` | the judgment of `SKILL.md` step 3: the verdict `go-on`, or the open findings in a comment and the label `needs-owner` | yes |
| `round`, labeled `needs-owner`, with no event of his session or of an `out-` token after the label | nothing: it is the owner's, and is in `status.md` | no |
| `ready` | the move, reason `waits for nothing, by the queue at <seq>` | no |
| `finish` | the move | no |
| `start` | `start`, role implementer, or digest with the label `digest` | no |
| `spec` | `start`, role spec-writer | no |
| in `waiting`, `owner`, at `awaiting-approval`, and `approver.ts facts` says no verdict of this round and no `leave` | `start`, role approver | no |
| in `waiting`, `work`, with no `running` run of a writer, no `waiter`, and no label `needs-owner` (the label: `st-6`, below) | "A dead writer": the token ended, `back`, whatever the count of dead runs: the bound holds at the `start` entry the `back` leaves | no |
| 2 dead runs: an entry of a row that starts or resumes an agent, with 2 dead runs or more of that role and round, and no verdict `go-on` for this `<at>`. A `round` whose last run ended `no-submit` is the `round` row's and not this one's | given to the judgment: `go-on` for one run more, or the label `needs-owner` with what the two runs left | yes |
| a digest opened by `worker:brain-x-snapshot`, at `open` | the older ones rejected, `triage`, `ready` | no |
| 3 issues at `done`, `rejected` or `needs-owner` since the last heading of `oversight.md`, or one issue at 3 `rework` moves since then; no live token `over-…`; and fewer than 2 files of `runs/` of the role `overseer` since that heading, however they ended | `start`, role overseer | no |
| `triage`, `decompose`, `promote`, `look` | given to the orchestrator's judgment | yes |
| labeled `needs-owner`, in `waiting`, `owner` or a `round` of the queue (the label leaves an issue at `in-progress` or `spec` in the queue), with an event of his session or of an `out-` token after the label | the same: has he answered | yes |
| labeled `asks-orchestrator` (the first action of `pm-agent-request-not-seen-fly-idle`, landed as `ae5423a2`) | the same: answer it | yes |
| a move made with his session that is a `send-back`, an `owner-reject` of a passed issue or a `revert`, with no post mortem of it | the same: declare it | yes |
| the cluster is not healthy, and no open issue names what failed | the same: file it | yes |

4. **What stops a start.** `SKILL.md`, step 2, has four things, and the program reads three. No
   new writer and no approver is started in a step in which `uptime`'s first number is 15 or more,
   or `land` has named one holder at two steps 30 s or more apart. A review and a round are started
   as before. The third, "an agent's report or your own session names a rate limit or a usage
   limit", is a sentence of a report: the program reads `is_error` of a run's result line in its
   place, and starts no new writer for 30 minutes after one. The 30 minutes and the reading are
   this spec's and are not measured: what a result line says at a limit was not seen. The fourth,
   a report that names a test of `tests/tools` that failed at its timeout and passed in the next
   run, is not read by the program; the `uptime` rule was written for the same load.
5. **The judgment.** The entries of the rows marked "yes", 5 at most a step, are the task of one
   process: `WORK=<the worktree bm-orch-<host>> agent.sh orchestrator "<do> <id>; …"`, with a token
   `orch-…` made for it and a `running` event on the first of its issues, with the role
   `orchestrator` and the round one more than the runs of that role the issue has (`runs?id=&role=orchestrator`: a
   run's two events are one run; 1 to 1,000, the service's limit), so no judgment run takes another's place in `runs` or in `total`. Its brief is
   `agents/orchestrator.md`: "Triage", "A quick win", the `decompose` row, "A post mortem" (who
   declares one), the 3-rework judgment, and the comment for the owner, moved there from
   `SKILL.md` as they are written. It does those entries and ends. It starts no agent: it makes
   its moves, and the next step reads the queue they left. A second such process is not started
   while one runs.

   **An entry is given to a model once (round 2).** Each row marked "yes" is due because of one
   event of its issue. That event's seq is `<at>`, and the row has one word, `<do>`:

   | The row | `<do>` | `<at>`, the seq of |
   |---|---|---|
   | `round` at 3 `rework` moves, or after a run with no submit | `round` | the last `rework` or `respec` move, or the `cost` event of the run that ended `no-submit`, the later |
   | 2 dead runs | `dead` | the last `cost` event of that role and round with the outcome `stopped` or `no-submit` |
   | `triage`, `decompose`, `promote`, `look` | the queue's `do` | the issue's last `opened`, `moved`, `swapped`, `held`, `linked` or `labelled` event |
   | labeled `needs-owner`, with an event of his | `answer` | his last event after the label |
   | labeled `asks-orchestrator` | `asks` | the `labelled` event |
   | his move with no post mortem | `pm` | the move |

   The event names of the third row are the types the seed writes (`brain-issues.ojs`); a link
   `after` and a label are among them because a judgment's answer can be either, and an issue that
   comes back to `triage` after one is a new entry.

   Before the run is started the program writes one comment on each issue it gives, key
   `orch/<id>/given-<do>-<at>`, body `given <do> at <at> to <token>, its run on <the issue that
   has the run's cost event>`. A row marked "yes" is given only when the issue has no comment of
   that key. So the same unchanged fact starts a model once, whatever the model did. The
   judgment's answer is a fact a row reads:
   - a move, a swap, a link `after`, a hold (`issue.hold`) or the label `needs-owner`, each of
     which the queue answers differently at the next read. A triage that is not ready to go on
     ends in one of these and never in a comment alone (`bk-6`: "The `held:` comment is no longer
     written"). An `open` task with a hold is in `waiting`, `until`, and comes back as a `look`,
     which has a new `<at>`;
   - or one comment, key `orch/<id>/verdict-<do>-<at>`, whose first line is one word: `go-on`
     (for `round`: the `resume` row then takes it, for this `<at>` and no later one; for `dead`:
     the row that starts or resumes takes it for one run more, and when that run dies the count
     has a later `<at>` and the entry is given again), `not-answered` (for `answer`: nothing more
     until an event of his with a later seq), or `left` with the reason.

   An entry that was given, whose run has ended, and that has neither changed in the queue nor a
   verdict, is read by how the run ended. The run is the `cost` event of the token the `given`
   comment names, on the issue it names. Ended `stopped`, or with `is_error` in its result: the
   model did not judge it, and it is given once more, key `orch/<id>/given-<do>-<at>-2`. Ended
   another way, or after that second give: it is given to no model again and is in `status.md`
   under "judged and left as it was", or "the judgment run died twice", for a session with the
   owner. The step reads these comments with `get?id=` of an entry of a row marked "yes"; it
   reads no other comment.
   The cluster not healthy is of no issue: it is given in a whole step only, so once in 1,800 s.
6. **What it did.** Every act is an event of the tracker with a reason. One line of JSON a step is
   appended to `.emitted/issue-loop/steps.jsonl` (`at`, `seq`, the acts, what was skipped and
   why), and `.emitted/issue-loop/status.md` is written again: what runs, what waits for the
   owner, what a session with him is asked to do (part 5).

`loop.ts step --dry` prints the line and the status and does nothing else.

As built (`st-3-step`, 2026-10-13; `tools/cloud-brain/records/st-3-step.md`), where it differs from
the six items or adds to them. The header of `loop.ts` is the reference.

- `step --dry` writes neither `steps.jsonl` nor `status.md`: the status is printed after the line.
  The R7 check reads the printed status, and the file after a step that is not dry.
  A dry step does not name an act that reads what another act of the step would have written: for
  a `running` run whose process is gone it names `stopped` and not the `back` after it.
- The tests are `tests/tools/loop-step.test.ts`, a file of their own beside `loop.test.ts`.
- The first read is `queue?limit=1`, before health: a token cb4 refuses ends the step with `error`
  in its line and is not taken for a cluster that is not healthy.
- The runs of an issue are read from `get?id=` of each entry the step acts on (`issue.runs`), and
  `runs?` is not called. So a `running` run is seen on an issue the queue lists, in `queue` or in
  `waiting` with `owner` or `work`, and on no other.
- "An agent the program did not start" is read by the starter: an issue at work, in `waiting` or as
  a `round`, whose last `start` (or `spec`) was made by a token that has no run of the role in the
  record, is left while that token reads the tracker. A `review` entry has no such test: beside a
  reviewer a session started, the step starts a second.
- Health as `SKILL.md` step 1 has it took 47.4 s in one dry step on cb4, 27.2 s of it
  `brain.ts redistil` and 7.8 s `worktree.sh --list` with 23 worktrees (09:10 CEST). A Worker that
  is deployed and whose `seen.json` is not yet on `origin/main` reads as not healthy for that step.
- No new writer and no approver is started either in a step in which a `start` of a reviewer or a
  `resume` exited with an error.
- `land` "at two steps" is this step's line and the last line of `steps.jsonl`, 30 s or more apart
  by the queue's `now`. The result that was an error is `runs/<token>.exit` holding 1 for a run
  ended less than 30 minutes ago by this machine's clock.
- Since `loop-sh-sandbox-has-no-keychain` (2026-10-13) one thing more stops a start, and of every role: a
  result that says its process is not logged in (part 4, the "As built" of that issue).
- A `round` is given at 3 `respec` moves for a spec writer, as at 3 `rework` moves for a writer.
- The `given` comment of this task names no run: `given <do> at <at> to no run: …`. An entry so
  given is in the status and is given to no model when `st-4` lands; the form `to <token>, its run
  on <issue>` is read as the paragraph above has it.
- The events since the last heading of `oversight.md` (`sync?after=`) are what the overseer's row
  and the row of his move with no post mortem read. A move of his from before that heading is not read.
- An overseer's file has `after`, the event that heading ends at: the count "since that heading".
- A writer's token that `ended` kept is ended by the step when its issue is `done`, `rejected` or
  closed, from the file of `runs/`. `agent-token list` is read for the overseer's row alone.
- The keys of the step's own moves: `orch/<id>/ready-<since>` and `orch/<id>/finish-<since>`, with
  `since` of the entry; `orch/<id>/covered`, `orch/<id>/covers`, `orch/<id>/triage-<since>` for a
  digest; `orch/<id>/back/<token>/<seq>` as `resume` has it.

As built (`st-4-orchestrator-brief`, 2026-10-13; `tools/cloud-brain/records/st-4-orchestrator-brief.md`),
where it differs from item 5 or adds to it. No judgment run had been started with a model when this was
written.

- The step makes the run's token (`agent-token orch judgment:<issue>`) and writes the `given` comments,
  then runs `loop.ts start [<issue>] --role orchestrator --token <token> --give "<do> <id> (event <at>); …"`,
  with `<issue>` the first entry's. The prompt is the four lines of the other roles, its third
  `Entries: <do> <id> (event <at>); …`: the run needs `<at>` for the key of its verdict. since `loop-started-run-is-told-no-scratchpad`, 2026-10-13 it has
  the line `scratch: <dir>` before the token's, as a writer's has.
- The entries of a step are one run's, started at the step's end. "A second such process is not started
  while one runs" is read from the files of `runs/` of this machine: a run of the role `orchestrator`
  that is not ended and whose process lives. The entries of that step are then in `skipped`, with no
  comment, and are due at the next step.
- A start that failed after the comments were written (no worktree, origin not reached) is written as a
  run that died: a `cost` event `stopped` with the token, which is ended. So the entry is given once
  more, and after a second such start it is under "The judgment run died twice".
- `ended` gives a judgment run the outcome `done`, or `stopped` with no result or with a result that
  was an error (`runs/<token>.exit` is 1): the second is the spec's "with `is_error` in its result".
- The cluster not healthy, given alone, is a run on no issue: it has the file and no `cost` event, as
  an overseer's, and its report is in `_judgment.md` of the journal. One is started at each step that
  finds the cluster so and no judgment run running.
- A verdict `left` is in `status.md` with its first line, under "What a session with the owner is asked
  to do": it is how a judgment run says that an act with the owner's session is due (part 5).
- The brief. Three sections were moved whole ("Triage", "A quick win", "A post mortem"), and two texts
  out of rows of step 3, under headings the brief gives them: what the row `decompose` does, and of the
  row of an issue sent back, from "Do not" to its end, which has the judgment at 3 `rework` moves.
  "The comment for the owner" is no section of `SKILL.md`: its form is `rules.md`, "What the owner is
  asked to decide", the sentences that send to it are in "Triage", and step 7 is a session's (part 5)
  and stays. The rows of `promote`, `look`, `answer` and `asks` were not named by this part and stay in
  `SKILL.md`: the brief names each by its first cell, to be read with `grep`. `dead` and the cluster not
  healthy had no text in `SKILL.md`; the brief has a section for each, written from the table above.

As built (`st-6-a-day-beside-the-session`, 2026-10-13; `tools/cloud-brain/records/st-6-a-day-beside-the-session.md`):
one row of the table was wrong and is mended, and one test of part 2.

- **An issue at work that is labeled `needs-owner` is the owner's.** The row of "A dead writer" had no word of
  the label, and the rows of the label named `waiting`, `owner` and a `round`: "the label leaves an issue at
  `in-progress` or `spec` in the queue" holds for one that was sent back. A writer that asks for an act of his and
  ends with no submit leaves its issue in `waiting`, `work`, and the dry steps of 2026-10-13 named a `back` for
  `never-page-up-line-after-a-check` at each of them. Such an issue is now read as a `round` so labeled: nothing,
  its line under "What waits for the owner" of the status, and given as `answer` at an event of his after the label.
- **A run is alive to a step made inside it** (part 2, "its wrapper's command line … is read with `pgrep -f`").
  On macOS `pgrep` leaves out its own ancestors, and a step made by an agent of a run is a descendant of that
  run's wrapper: it named `ended` for its own live run. The read is `pgrep -a -f` now. The driver is no descendant
  of a wrapper it starts, so its steps were not wrong in this way.
- `loop.ts compare` reads `steps.jsonl`, and with `--steps <file>` the output of `run --dry`: a dry step writes no
  `steps.jsonl` (the note of `st-3`). The header of `loop.ts` says which event it takes for each act.

**Why a wake cannot be lost.** The step does not act on a wake. It acts on the queue and the runs.
A note such as "EACH WAKE: read fly-1-by-hand" has no place to be kept and no place to be lost:
a thing a step must see is a row of this table over a fact of the record, or it is not seen by
any step, which a reader of the table can tell.

### 4. The driver (R2, R8)

`loop.ts run` is the loop: no model, one process, started by the owner and stopped with Ctrl-C.

- It makes its token (`agent-token orch driver:<host>`), takes the lock `loop` as
  `orchestrator-<host>` and renews it every 120 s. A token ends at 48 hours (`brain.ts`, `HOURS = 48`)
  and a renew under another token is refused, so at 40 hours, between two steps, the driver
  releases `loop`, makes a new token, takes `loop` with it and ends the old one. A take that is refused names the holder and the
  driver exits 1: one loop a cluster, as `worker-machine-on-fly` has it.
- A step begun for the clock is whole. One begun for an event or a run that ended leaves out the
  pulls, `redistil`, `state` and the removal of worktrees, as a line of the watch is taken today
  "without a whole pass" (`SKILL.md`, step 8). How long the health commands take was not measured.
- It runs a step when any of three is so: `sync?after=<the last seq it read>` has an event (asked
  every 30 s; 0.31 to 0.39 s and 49 bytes when there is none, 23:12 CEST), a file of `runs/` has a
  result it has not ended, or 1,800 s have passed. One step at a time. An event whose
  `by.holder` is the driver's own token is no reason by itself. In its place: a step that made a
  move (`ready`, `finish`, `back`, a digest's) is followed at once by one more step for an event,
  and so on until a step makes no move. A `ready` leaves a `start` entry and a `back` leaves one
  too, and without the step after it they would wait for another's event, up to 1,800 s. A step
  that wrote only comments and `cost` events is followed by none. The token of a judgment run is
  another's, and its writes are a reason.
- A step that fails (cb4 not reached, a command of health that exits 2) writes its line and the
  driver goes on at the next reason.
- `loop.ts run --dry` runs `step --dry` at each reason and takes no lock: it can run beside the
  session's loop.

`lock.sh` gains the name `loop` (its line `case "$NAME" in land|cb4)`), which `fly-4-loop-files`
was to add.

On the laptop the driver is started in the sandbox the sessions run in:
`tools/cloud-brain/loop.sh`, which runs `safehouse` with the arguments `metadev` gives it and
`METADEV=1`, then `bun tools/cloud-brain/loop.ts run`. Not tried: `metadev` is the owner's file and
has an uncommitted change in the main checkout; the task reads it and adds nothing to it.

**As built (`st-5-driver`, 2026-10-13).** `tools/cloud-brain/records/st-5-driver.md` has the runs. Where
the text above names no choice, or the program differs from it:

- A step is told what it was begun for with `step --for clock|event|run`; `--for clock`, or none, is whole.
- The 1,800 s are counted from the beginning of the last step for the clock, so a step for an event does not
  put the whole step off. After a step that was not healthy, had an `error` or printed no line, the next
  reason is taken as the clock's: a step for an event reads no Worker and would start agents on a cluster
  the last whole step found unhealthy.
- A `reject` of a digest is counted with the moves that are followed by a step. At most 20 steps follow one
  another this way; then the driver waits for a reason and says so.
- At 40 hours the new token is made before `loop` is released, not after: with no new token the lock is
  kept and the old token goes on.
- `run --dry` makes no token. It reads with `LOOP_TOKEN`, the caller's, and every event is a reason, the
  caller's own too: a dry step writes nothing, so no event is its own.
- At Ctrl-C the driver ends its token only when no run it started is still not ended: a run's `ended` is
  made with the token that started it ("or left to end itself", under "Going back").
- `loop.sh` runs the lines of `metadev` from `ENV_PASS=` to the end of `SAFEHOUSE_ARGS=(`, which have the
  `mkdir -p` of the directories the sandbox mounts, and the `export` lines above them (`CLAUDE_CONFIG_DIR`
  among them, not `METADEV=1` alone). It does not run `caffeinate`, which `metadev` does.

**As built (`loop-sh-sandbox-has-no-keychain`, 2026-10-13).** The owner's first run of `loop.sh` was two steps
whose five agents each answered `Not logged in · Please run /login`;
`tools/cloud-brain/records/loop-sh-sandbox-has-no-keychain.md` has it.

- `loop.sh` gives `safehouse` one argument more than `metadev` has, `--enable=all-agents`. `safehouse` picks
  the profile of Claude Code, and the keychain with it, by the name of the command it wraps; `metadev` wraps
  `claude` and `loop.sh` wraps `bun`. The flag gives the file rules of every agent `safehouse` knows, which is
  more than a session's sandbox has.
- A fifth thing stops a start, and it stops every role's, the judgment run's among them (part 3, item 4,
  has four, for a new writer and an approver): a run started with the step's own token whose result says its
  process is not logged in. The step's line has `unlogged`, the status says it under Health, and the driver
  says it on stderr at each such step. It ends with the driver: one started again has a new token.

### 5. The owner, and a session he is in (R7)

A step cannot hear him and has no one to tell. Three things follow.

- **His words.** He types to a session, as he does today to "a session outside the loop"
  (`rules.md`, "Which token": `out-…`). That session quotes him in a comment or makes the move,
  and the next step reads it. `out-5f56b2` wrote 53 events that way on 2026-10-12 (the record to event 5075).
- **What waits for him.** `status.md`, and the list of `rules.md`, "What the owner is asked to
  decide", made by a session he asks, from `queue` (`waiting`, `why: owner`). The Brain's page has
  the same list ("For your attention"). Step 7 of `SKILL.md` is a session's, when he asks.
- **Acts with what is his.** The `approve` move on his word, a token an approved spec names, the
  post of the shell and the push of his quotes are made today by the orchestrating session with
  his session or his key. The step makes none of them. `status.md` lists each that is due ("make
  `loop-x` for `<task>`: the command"), and a session he is in makes it. See "One choice".

`SKILL.md` becomes the text of that session: how the driver is started and stopped, how the status
is read, his-word acts, and `/brain-maintenance` as it is today for a pass by hand. `rules.md`
says "the orchestrating session" of the two standing leaves and of a token an approved spec names;
that it now reads "a session the owner is in" is a change to `rules.md`, his to approve (`st-7`).

**As built (`st-7-switch-and-texts`, 2026-10-13).** `tools/cloud-brain/records/st-7-switch-and-texts.md`
has what was changed. Where the text above names no choice, or the texts differ from it:

- `rules.md` has a section of its own, "A session the owner is in", with choice A as the owner was
  shown it and his word. It takes the narrower of two readings: such a session makes one of the three
  acts in a turn a message of his began, and not at a wake. So a `/loop /brain-maintenance` he went
  back to makes none while he is away, which it did before the switch.
- The section "Two standing leaves of the orchestrating session" is "Two standing leaves of a
  session the owner is in". The choices he answered are quoted as they were written, with "the
  orchestrating session" in them.
- `SKILL.md`, "Run it", says that a pass by hand starts its agents with `loop.ts start` (part 2, "An
  agent the program did not start"). Steps 4 and 5 there are still written for the `Agent` call:
  the task names "Run it" and "Runs" alone.
- "Run it" gives `loop.ts run --dry` for a dry driver and not `loop.sh --dry`: a dry driver reads with
  `LOOP_TOKEN`, which `metadev`'s `ENV_PASS` does not name.
- A pass by hand reads `lock.sh show loop` first and makes no pass while it is held. It takes no
  `loop` itself: that take is `fly-4-loop-files`'.
- The body of an issue cannot be changed, so the "As amended" notes of `fly-2` and `fly-4` are a
  comment on each (6493 on `fly-4-loop-files`, 6494 on `fly-2-image-and-run-sh`), and the notes of the
  Fly spec are in four places of that file.
- The switch was not made by this task. No `loop.sh` and no `loop.ts run` without `--dry` was run.

### 6. What changes in specs that are approved

- **`worker-machine-on-fly`**, part 2 and tasks `fly-2`, `fly-4`: `run.sh` execs `loop.ts run` in
  the place of `claude -p "/loop /brain-maintenance"`. The lock `loop` is renewed by the driver,
  so `issue-watch.sh --hold` is not built, and the yield (`--yield-as fly-status`) is a read of
  the driver at each renew. "Off" is a step with no act and no `running` run, at which the driver
  releases `loop` and exits 0. The second form of the health step, the label `laptop` and the
  tokens are as that spec has them. `st-7` writes these as "As amended" notes in that file and in
  the bodies of the two tasks. What it removes from that design: a `Monitor` that ends after 30
  minutes and has to be armed again by a turn, and the rule "no move without `loop` on any wake".
- **`bookkeeping-in-the-tracker`**, `bk-6-skill-watch-and-stats`: it rewrites step 3 of
  `SKILL.md` as the read of the queue, and gives `issue-watch.sh` a `QUEUE` line. Both stand: a
  session that runs a pass by hand uses them. `st-4` moves the rewritten rows, so it is after `bk-6`.
- **`tracker-trigger-rules`**: unchanged. Its `waiter` is read by two rows of the step's table.
  Until `tr-3` an agent that waits for its review is seen as a `running` run, which is enough for
  the step to send it nothing.
- **`os-4-writer-waits`** (a writer waits 20 minutes for its review): unchanged. A writer that is
  a process waits as one that is an `Agent` does.

## What exists today for the same job, and why it is not extended

Looked for in the seven searches, in `ls .claude/skills/brain-maintenance/agents/` (six files:
approver, digest, implementer, overseer, reviewer, spec, and no orchestrator), in the Brain's roles
(`curl -s https://cb4.endpointservices.workers.dev/static/cloud-brain-dev/index.md`, 23:06 CEST:
`paper-summarizer` and `reviewer`) and in `ls tools/cloud-brain`.

| Added | What exists for the same job | Extended, or why not |
|---|---|---|
| Writers and the other roles as processes | `cloud-brain-dev/agent.sh` | Extended (`WORK`, `SESSION`). No second launcher |
| `loop.ts start`, `ended`, `resume` | Steps 4 and 5 of `SKILL.md`, done by a session; `summarize-papers.ts run`, which starts `agent.sh` a paper and journals each | The steps are moved into it, not kept beside it. `summarize-papers.ts` has the same shape for another purpose: its runs are of no issue, hold `loop-papers`, and have canaries. It is not made to start writers, and `loop.ts` does not start summarizers. One sentence each: one tool for a run on an issue, one for a run on a paper |
| `loop.ts step` | `issue.queue` (what is next, on cb4); the tables of `SKILL.md` step 3 (what to do for each) | The queue is read, not built again. The table is moved from prose a model follows into code, for the rows that need no judgment |
| `loop.ts run` | `issue-watch.sh` under a `Monitor` and `ScheduleWakeup` of a session (`SKILL.md` step 8); `run.sh` of the Fly spec, not built | The watch is kept for a session. The driver does not use it: it wants every event as a reason to read, and the watch's filter exists to keep wakes off a session's context. `run.sh` becomes the two lines that start the driver |
| The role `orchestrator` and `agents/orchestrator.md` | `SKILL.md`, which is that role's brief for a session | Not a second role: the same role's text, cut in two by who reads it. The judgment sections move, and are not written twice |
| The `running` event | The `cost` event; `issue.wait` of `tracker-trigger-rules` (approved, not built) | The `cost` event is used as it is, with one more outcome. A wait is written by the agent itself and has no session: a process that died before its first call wrote none |
| `runs/<token>.json`, `steps.jsonl`, `status.md` under `.emitted/issue-loop/` | The journal there (`<id>.md`, `_orchestrator.md`) | The same directory, not tracked. `steps.jsonl` takes the place of `_orchestrator.md`, which a session wrote in words |
| The lock `loop` | `land` and `cb4` in `lock.sh`; `loop` in the Fly spec, approved | The Fly spec's lock, built here first |
| A token for the driver, and one for each judgment run | `agent-token orch` | The same command and role. No new parent and no new method |
| `loop.sh`, which starts the driver in the sandbox | `metadev`, which starts `claude` in `safehouse` | Not extended: it is the owner's file, it passes its arguments to `claude`, and it has a change of his that is not committed. `loop.sh` reads the arguments it gives `safehouse` and adds nothing to it |
| `status.md` | `issue.queue`, `waiting` with `why: owner`, and the page's "For your attention" | Not extended: both are of the record, and the file is one read of them with the health of the last step, which is in no record. The rest of it (what runs and where, the entries judged and left, what waits for the owner) is copied from the record at each step and not kept |
| `loop.ts compare` | `issue-stats.ts`, which reads the record's moves | Not extended: it reads `steps.jsonl`, a file of one machine, beside the record, for `st-6` and `st-8`. It is a subcommand and no tool of its own |
| The comments `given-…` and `verdict-…` | The comment with a key that says what it is (`orch/<topic>/worktree-<n>`, `approver/<id>/verdict-<n>`, which `approver.ts` reads) | The same form. No label: a label stands until it is taken off, so it would stand for the next round too |

No Worker, no method, no event type, no policy and no store on cb4 is added.

## Not chosen

- **Every wake a fresh `claude -p "/brain-maintenance"`, the skill unchanged but for where it
  reads.** No new tool. It meets R1. It pays the reading of `SKILL.md` (89,947 bytes at `56ea28e4`), `rules.md`
  and `philosophy.md` at each of some 260 wakes a day, where the one pass run this way took 10
  turns to finish step 1; an agent it starts with the `Agent` tool holds it open until the agent
  ends, by the harness's own page; and every row of step 3 stays a sentence a model follows. His
  words on guards and on the board are against the last.
- **The session kept, with a compaction forced at each wake, or its notes written to a file it
  reads at each wake.** The smallest change. The post mortem weighed it: "a note the session kept
  whole would still be read only if it chose to". The context stays at its ceiling between cuts.
- **A step that waits for the agents it started** (one `-p` process an agent, alive until the
  agent reports). No detached process and no `ended`. It is a model kept running to wait: the
  reviewer's median run is 4.5 minutes (`plan/cloud-brain-tracker-trigger-rules.md`, n=215) and round 2 of
  `fly-1-by-hand` was 7,233 s (`runs?id=fly-1-by-hand`).
- **The harness's own background sessions** (`claude --bg`, `claude agents`, `logs`, `stop`,
  `respawn`). They keep a session running with nobody attached and list it. Not tried. `--bg` is
  refused with `-p` (the headless page), so the one JSON line `agent.sh` reads at the end of a run
  would have to come from `claude logs`; and whether it runs on the Fly machine was not read. It is
  the launcher to look at again if detached processes prove fragile.
- **Which agents run as a comment `run {…}`**, as `worktree {…}` is kept. A comment is not read
  by `issue.runs`, and the run's last event would not take its place.
- **A new event type `started`.** A deploy of the tracker, `major`, and a row of `issueReplay`,
  for what the `cost` event carries today.
- **The step inside the tracker's Worker**, on a cron. The service cannot start a process on a
  machine, and "No agent loop in a Worker" (`knowledge/working-with-cloud-brain-remote-lopecode-cluster.md`,
  "Standing rules from Tom"). What it can decide alone it does already (`finish`, bk-2).
- **The orchestrator's judgment as one process an entry.** The smallest context. Four triages
  would read the brief four times; 5 entries a process bounds it as well. `st-6` reads the
  `context` of those runs and changes the 5 if it is wrong.
- **Two drivers, one a machine, apart by a claim on each entry.** As the Fly spec's "Not chosen"
  says of two orchestrators: worth a spec of its own when both want to run.

## One choice of this spec that the owner may want the other way

The step makes no act with the owner's session or key. Today the orchestrating session makes
three with no word of his at the time: a token an approved spec names, the post of the shell and
the push of his quotes. (The `approve` move needs his word in the session, so he is there.) **A**, as written: each waits in `status.md` for a session he is in.
The cost is a task that waits for him to open one; the record has 5 comments of a token made (keys `token`,
`token-made`) and 5 `shell-posted` by an `orch-` token in two days. **B**: the orchestrator's judgment run
makes them, as the session does now. Then a process nobody watches, started by a program, acts
with his session. This spec takes A by the first of the seven, and `st-8` counts what waited and
for how long.

## How each requirement is known to be met

`ia` is `tools/cloud-brain/issue-as.sh <own token>`. Every command is one an agent of the loop
runs with its own token and the files of its machine. "Today" was run 2026-10-12 between 23:09 and
23:13 CEST with `spec-302503`. An "After" cannot be run before its task is built: the table says
which task runs it, and gives no count a run would have to match.

| | Command | Today | After |
|---|---|---|---|
| R1 | `grep -c '"isCompactSummary":true' <transcript>` of the session that orchestrates | 17, of `f501a8e8…` | st-8: 0 for every transcript of an `orchestrator` run of the three days (`runs?role=orchestrator`, each `session`), and the largest `context` of them, read |
| R1 | `bun tools/cloud-brain/agent-usage.ts --session <session>`, `requests` and `cacheRead` | `"requests":2908`, `"cacheRead":699010332`, `"cacheWrite":5995213` (23:16 CEST, 36 h of one session) | st-8: the sums over the `orchestrator` runs of a day, beside 1,126 and 279,724,205 of 2026-10-12 |
| R2 | `bun test ./tests/tools/loop.test.ts` | no such file | st-3: one test for each row of the step's table against a stand-in for `issue-as.sh`, and one that runs `step --dry` twice over the same answers and reads the same line twice |
| R2 | `bun tools/cloud-brain/loop.ts step --dry` | `error: Module not found "tools/cloud-brain/loop.ts"` | st-3: one line of JSON, and `ia "sync?after=<seq before>"` has no event of the caller's token |
| R3 | `claude -p '… nohup sleep 150 … &'`, then `pgrep -fl "sleep 150"` | exit 0 in 5 s, `62074 sleep 150` (probe 1) | st-2, in `tests/tools`: `loop.ts start` against a stand-in `agent.sh` that sleeps returns before the stand-in does, and `ended` is run when it has |
| R3 | `DRY=1 CHECKOUT=<W> cloud-brain-dev/agent.sh implementer "Issue: x"`, the line after `--tools` | `Bash,Read,Grep,Glob` | st-1: with `WORK=<W>` no `--tools` line is printed, and `--session-id` is followed by the `SESSION` given |
| R4 | `ia "runs?id=<id>"` while an agent runs on it | `{"runs":[], …}` for this issue, whose spec writer was at work (23:12 CEST) | st-2, on cb4, an issue `test-st-2-a` the writer opens: after `start` with a stand-in agent, one run with the outcome `running`, the `token` and the `session`; after `ended`, one run, another outcome, `replaced` in its event. The issue closed after |
| R4 | `ia "verify?guards=true"` | `"ok":true,"seq":5137, … "checked":5137,"guards":true` (23:16 CEST) | st-2: `ok: true` after those two events |
| R4 | the same issue, a second run of one role and round | no such test | st-2, on cb4, `test-st-2-a`: after the first run is ended with the outcome `stopped`, a second `start` of the same role with another token; `ia "runs?id=test-st-2-a"` has one run of that role, its outcome `running` and its `token` the second. The dead runs counted from `get?id=test-st-2-a` are 1, and 2 after the second is ended `stopped`. And in `loop.test.ts`: the two keys differ, and two resumes of one token in one round have two keys |
| R5 | `claude -p … --session-id <uuid>`, then from another directory `claude -p … --resume <uuid>` | `heron`, the same `session_id` (probe 2) | st-1: `agent.sh --resume` of a run begun with `WORK` and `SESSION`, from another directory, answers from the first run. st-2: `loop.ts resume` against the stand-in sends `--resume` with the `session` of the last run |
| R6 | `python3 measure.py <transcript> <sync>`, the events by an `orch-` token | 1,015, of them 180 `cost`, 102 `ready`, 7 `finish` | st-8: of the three days after the switch, those three kinds by the driver's token and none by a judgment run's |
| R6 | a judgment that leaves the entry: `loop.test.ts` | no such test | st-3, against the stand-in: an entry of each row marked "yes" is given at one step and not at the next with the same answers; a `round` at 3 `rework` moves with the comment `verdict-round-<at>` `go-on` is a `resume`, and after one more `rework` it is given again; a `round` whose run ended `no-submit` is given, with `go-on` it is a `resume`, and after a second `no-submit` of that round it is given again; a `needs-owner` entry with `not-answered` is given again only for an event of his with a later seq, and a `round` labeled `needs-owner` is given when he has written after the label; an entry whose judgment run ended `stopped` is given once more and not a third time; a `triage` that got a link `after` and came back is given again |
| R6 | an agent that dies before its first move: `loop.test.ts` | no such test | st-3: a `review`, a `spec` and a `start` entry each with 2 dead runs of the role and round start no agent and are given as `dead`; with 1 they start one |
| R6 | a `review` entry beside a `running` writer: `loop.test.ts` | no such test | st-3: an issue at `in-review` whose `runs` has an implementer `running` and no reviewer of that round starts a reviewer; with a `running` reviewer of that round it starts none; a `round` entry with a `running` writer is sent nothing |
| R6 | the dead run: `loop.test.ts` | no such test | st-3: a `running` run of this host whose pid is not alive and has no result is replaced with `stopped` and the issue gets `back`; one of another host is left |
| R7 | `cat tools/cloud-brain/.emitted/issue-loop/status.md` | no such file | st-3: after `step --dry`, the file names each entry of `waiting` with `why: owner` that `ia "queue"` has at that seq |
| R8 | `LOCK_TOKEN=<token> tools/cloud-brain/lock.sh show loop` | exit 2, the usage | st-5: exit 1 `loop is not held`; while `loop.ts run` runs, exit 0 and `orchestrator-<host>`; `run --dry` beside it takes none |
| R8 | `bun tools/cloud-brain/loop.ts compare --since <hours>` (as built: with `LOOP_TOKEN=<own token>` before it and `--steps <the file of run --dry>` after) | no such command | st-6: for each act a dry step named (`start`, `review`, `ready`, `resume`), the event of the session's loop that did the same and the minutes between; and each of the session's that no dry step named. The record gives the two lists |

What only the owner can measure, and no condition of a task landing: that a day with the driver is
less work for him than a day with the session.

## The tasks, in the order they land

Ids begin `st-`. None is `major` but `st-7`. No seed changes and nothing is deployed.

1. **st-1-agent-sh-any-role.** `WORK` and `SESSION` in `cloud-brain-dev/agent.sh`, the README, the
   DRY tests. A record: one writer and one spec writer run as processes on issues that are `done`,
   each told to write nothing (as `wt-4-reviewer-in-a-view` tried the reviewer), with `toolset`,
   `context`, `usd` and the usage beside an `Agent` run of the same role; one `--resume` of each;
   the detach of probe 1 from a shell that is not `claude`; which MCP tools writers called in the
   transcripts of 2026-10-12. After nothing.
2. **st-2-loop-start-and-end.** `loop.ts start`, `ended`, `resume`, the `running` event with its
   keys, the count of dead runs, the files of `runs/`; `tests/tools/loop.test.ts`; the check on
   cb4. That check is run with `loop.ts start --token <t>`, which takes a token already made:
   `rules.md`, "Which token", gives `agent-token` to the orchestrating session, which makes the
   two tokens for `test-st-2-a` when the writer asks with the label `asks-orchestrator`, and ends
   them after the check. No writer runs `agent-token`, and under `--token` the program runs none.
   After st-1.
3. **st-3-step.** `loop.ts step` and `--dry`: health, runs, the table, what stops a start,
   `steps.jsonl`, `status.md`; the `given` comments and the reading of a verdict; a test a row
   and the R6 tests of the checks. The judgment rows write `given`, print their entries and
   start no run until st-4. After st-2.
4. **st-4-orchestrator-brief.** `agents/orchestrator.md` from the sections of `SKILL.md` named in
   part 3, moved and not rewritten; the step starts the run; `SKILL.md` keeps a pass by hand. A
   test that each moved heading is in one file and not the other. After st-3 and after
   `bk-6-skill-watch-and-stats`.
5. **st-5-driver.** `loop.ts run` and `--dry`, `loop` in `lock.sh`, `loop.sh`; tests with a
   stand-in clock. After st-3.
6. **st-6-a-day-beside-the-session.** No code but `loop.ts compare`. The orchestrating session
   starts `loop.ts run --dry` in the background once, with its output to a file, and the loop runs
   as today for a day. A record: the two lists of the R8 check, and each row of the table that was
   wrong. A row that was wrong is mended in this task. After st-4 and st-5.
7. **st-7-switch-and-texts.** `major`. `rules.md` ("a session the owner is in" for the standing
   leaves and the spec's tokens; "Which token", the driver's line; the item of "Always" on the two pulls, which are the
   driver's too); `SKILL.md`, "Run it" and
   "Runs"; the knowledge page of the loop; the "As amended" notes of part 6 in
   `plan/cloud-brain-worker-machine-on-fly.md` and in `fly-2` and `fly-4`. Then the switch, which
   is the owner's (below). After st-6.
8. **st-8-read-after-three-days.** A record: the R1 and R6 rows; the minutes from an event to the
   step that acted on it; each thing that waited in `status.md` for a session with him, and how
   long; each run found dead and whether it was; the dead runs whose usage left an issue's `total`;
   each entry under "judged and left as it was". After st-7, held with `issue.hold` for three days.

**The switch itself.** The owner stops the session's `/loop`; its writers go on as `Agent` calls
only while that session is open, so he leaves it open until they have reported, or closes it and
the step finds their tokens live and leaves them 4 hours (part 2, "An agent the program did not
start"), after which he or a session ends the tokens and the step makes `back`.

Going back, at any time after the switch: Ctrl-C, and `/loop /brain-maintenance` in a session.
The skill's pass by hand is kept for that, and a `running` run a session did not start is ended by
`loop.ts ended`, or left to end itself.

## What only the owner can do

- Approve this spec. The comment for his approval says: that it adds no Worker, token kind or
  policy; that it changes two tasks of the Fly spec he approved; the one choice above; and that the
  role `orchestrator` gets a brief of its own cut from `SKILL.md`.
- Approve `st-7`, which changes `rules.md`.
- The switch: stop the `/loop` of the session, and run `tools/cloud-brain/loop.sh`. Not before
  `st-6` has its record.

No deploy of the kernel, the core, the database or the deployer. No `issue.install`.

## What the orchestrator makes

Two tokens for the check of `st-2` on cb4, when its writer asks. Else nothing. The driver's token and each judgment run's are `brain.ts agent-token orch …`, children of
`loop-agents`, as a session's is today.

## Not tried, not known

- A writer as a `-p` process with the whole toolset, to its submit. The reviewer is the one role
  that has run so. st-1.
- Whether `safehouse` lets a process started in it outlive the shell that started it, and whether
  a detached run survives the laptop's sleep. Probe 1 ran inside the session's sandbox and the
  child lived for the 150 s; nothing longer was tried.
- What a judgment run costs. The estimate from bytes: the moved sections, `rules.md` and
  `philosophy.md` are under 100,000 bytes together. Not measured.
- How often a step has nothing to do, and what one costs then: 0.3 to 0.7 s for each of the two
  reads, and the health commands of a whole step, not timed.
- Whether 5 entries a judgment run is right.
- A usage limit of the account: today a report names it. A process's result line has `is_error`;
  what it says at a limit was not seen.
- Two machines: a `running` run of another host is left alone, and after a yield the other
  machine's agents end by themselves. Nothing here was run on two.
- The numbers of "What exists today" are of one session on two days, the second with the pool
  doubled from 21:15 CEST.

## What misled the writer of this spec

- `agents/spec.md` step 2 expects parts; this feature has none, as the two specs before it said.
  The related issues are where the reports were, and the one that bears most
  (`worker-machine-on-fly`) was not linked.
- The body says the session "was compacted at least twice on 2026-10-12". The transcript has 7 that
  day. The session cannot count its own compactions.
- `echo =====` in zsh is an error (`==== not found`), and cut two reads short.
- `issue-as.sh` prints the status (` [200]`) on stderr; a script that splits stdout on it breaks on
  a body that contains ` [`.
- Step 5 of the brief asks that each check's result be from a run. For a design whose every tool
  is new, the "Today" column is mostly "no such file", and the three probes are what could be run.

## The fresh review before submitting (2026-10-12, answered by 23:25 CEST)

One agent with the file and nothing else (`/review-notebook`): FIX, 11 findings (7 confirmed, 4
plausible), all taken. 129,699 tokens, 6m54s. It read the `cost` check, `issueRunOf` and
`issueQueue` of the seed and found the `running` event and every `do` and `why` of the step's
table to hold; it had no token and ran no probe.

- An overseer is on no issue, so it could have no `running` event and a second could be started:
  its run is a file and a live `over-` token, said in part 2 and in its row.
- The rows that start an agent did not say "and none runs on it": said once above the table.
- A round resumed again and again after a run with no submit: that outcome goes to the judgment row.
- "As it stands" of what stops a start was not as `SKILL.md` has it: the four conditions are
  named, with the two the program does not read as written.
- The `running` event had the pid of a process not yet started: the order is file, spawn, event,
  with the time the process began against a pid used again.
- The switch would have taken the session's `Agent` writers for dead: part 2, "An agent the
  program did not start", and "The switch itself".
- The driver's token ends at 48 hours: a new one at 40, with `loop` released and taken.
- A step's cost left out the health commands: a step for an event leaves most of them out, and
  they are not timed.
- `--resume` gives the four tools: `WORK` holds for it.
- Three numbers: the bytes of `SKILL.md`, the line the 1,135 is from, the keys of the JSON line.
- `measure.py` was not named as an attachment: named.

## Round 2: review 5194 (2026-10-12, 23:32 CEST)

The review was `changes`, with two findings and three notes. A resumed round: the writer of round
1, with the same token. `worktree.sh --rebase` left the worktree where it was: nothing on `main`
had changed since `1904d03d`.

- **Finding 1, a second run of one role and round had the first run's key.** The key of the
  `running` event has the run's token in it, and its end is that key and `/end` (part 2, "The key
  has the token in it"). The row asked for is the second R4 row. What it costs is said there: the
  dead run's usage leaves the issue's `total`.
- **Finding 2, an entry a judgment leaves is given to a model at every step, and "go on" resumed
  nobody.** The program writes a comment `given-<do>-<at>` before it starts the run and gives an
  entry only when none stands for that event; the judgment answers with a fact the queue reads or
  with a comment `verdict-<do>-<at>`; the `resume` row takes a `round` with the verdict `go-on`;
  a `round` labeled `needs-owner` is a row of its own; a triage ends in a move, a link, a hold or
  the label (part 3, "An entry is given to a model once"). The reviewer's case
  `ta-1c-parent-revoke-on-cb4`, at `triage` for 26.3 hours on a `held:` comment, would be given
  once and come back as a `look` at its hold's time. The row asked for is the second R6 row.
- **Note 1.** `loop.sh` has its row in the table of what exists.
- **Note 2, nothing bounded the writers started on one issue after `no-submit`.** The dead-writer
  row makes `back` while fewer than 2 runs of that role and round ended `stopped` or `no-submit`;
  after that it is the judgment's.
- **Note 3.** An event by the driver's own token is no reason for a step (part 4).

### The fresh review of round 2 (run 23:35 CEST on `eb4784e0`, answered by 23:41 CEST)

One agent with the diff since `1904d03d` and the file (`/review-notebook`): FIX, 10 findings and 4
smaller ones, all taken. 118,280 tokens, 4m28s. Two of its claims were read in the seed before
they were acted on: `runs` keeps one run a role and round (`brain-issues.ojs:590`), and a label
`needs-owner` leaves an issue at `in-progress`, `in-review`, `spec` or `spec-review` in the queue
(`:895`).

- The bound of note 2 counted runs `runs` does not hold: the count is of `cost` events in
  `get?id=` (part 2, "How many runs of a role and round died"), with a check on cb4.
- Two resumes of one token in one round had one key: the key has the seq the resume is made for.
  How a spec writer's round is counted is said there.
- A `round` labeled `needs-owner` never came back when the owner answered: the row of his answer
  takes an issue in `waiting` or in the queue.
- An agent that dies before its first move was started again at every step, for a `review`, a
  `spec` and a `start` entry: the bound is a condition of every row that starts an agent, and the
  row "2 dead runs" takes the rest.
- A `ready` or a `back` by the driver waited for another's event before its `start`: a step that
  made a move is followed by one more (part 4).
- A judgment run that died left its entries as judged: given once more, then named apart.
- `<at>` for `triage` did not move for a link or a label, `<do>` had no word for four rows, and
  `go-on` was "for this round" in the table: the table of `<do>` and `<at>`.
- What `go-on` does for the row of dead runs: one run more.
- "Not run again for this round" was false and is gone.
- Smaller: the wording about a label; the tasks `st-2`, `st-3` and `st-8` name the new tests and
  counts; the second R4 check row is beside the first; the header names all that changed.

Not read by a third fresh reader: the text of this last answer. The tracker's review reads it next.

## Round 3: review 5247 (2026-10-12, 23:49 CEST)

The review was `changes`: the two findings of review 5194 hold against the seed, one thing of part
3 held the change, and there were four notes. A resumed round, the same writer and token.

- **The finding: no reviewer while the writer waits for its review.** The condition above the
  table is read by the role the row starts. A `review` entry beside a `running` writer starts its
  reviewer; a `round` beside one is left to the writer (part 3, item 3). The test row asked for is
  the R6 row "a `review` entry beside a `running` writer".
- **A dead overseer had no rule.** Part 2, "An overseer that died", and the count in its row.
- **`loop.ts compare` and `status.md`** have their rows in the table of what is used.
- **The round of a judgment run's `cost` event** is one more than the events of that role on the
  issue (part 3, item 5).
- **Who runs the check of `st-2` on cb4**: the writer, with two tokens the orchestrating session
  makes and ends; `start` takes `--token` and then ends none. The pulls of "Always" are in the list of `st-7`.

### The fresh review of round 3 (answered by 23:56 CEST)

One agent with the diff since `41d44c77` and the file (`/review-notebook`), on `6ff3ad66`: FIX, 7
findings (4 confirmed, 3 plausible) and 2 smaller, all taken. 123,933 tokens, 4m19s. It had no
token and did not read `issueQueue`.

- The role of a spec writer's run is `spec-writer` and an overseer's `overseer`; `spec` and `over`
  are prefixes of tokens. As written a second spec writer was started beside one that ran. The
  names are side by side in part 2.
- "For a reviewer and an approver none of that round" had two readings: the condition is no
  `running` run of the role, with no round in it.
- Under `--token` the program would have ended tokens a writer may not end: it ends none, and
  what it writes with is said.
- The writer of `st-2` asked "in a comment", which nothing reads: the label `asks-orchestrator`,
  which is built (`ae5423a2`); the two lines that said it was not are mended.
- An overseer that returns with no heading was started at every step: the count is of its files
  however they ended.
- `start` for an overseer takes no id, and the rule of a file with no event leaves that role out.
- The round of a judgment run counted two events a run: it counts runs.
- Smaller: the `status.md` row claimed two things the record has; "9 passages" is gone.

Not read by a fresh reader: the answers to this review, 15 replacements. The tracker's review
reads them next.
