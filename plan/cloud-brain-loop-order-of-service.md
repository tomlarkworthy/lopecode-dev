# Cloud Brain: the order the loop takes work in, and a pool with no number

Spec of the project `loop-order-of-service` on cb4's tracker. Written 2026-10-11, begun 21:36 CEST
(the `spec` move, event 2304), from `lopecode-dev` `943cf83d`, `cloud-brain-dev` `3801492` and the
tracker at event 2310. Round 1. Nothing here is built.

Two findings change what the issue asks for, and they come first:

- **No order of service can make a resumed writer read its context from the cache today.** A
  writer is a subagent, and a subagent's cache lasts 5 minutes. The 16 resumed rounds whose
  transcripts were found each wrote the whole earlier context again, 111,329 to 203,811 tokens.
  The shortest gap was 5.8 minutes. A review alone takes 5.2 minutes at the median.
- **`worker-machine-on-fly` waited because the record does not say it is the owner's.** It was
  opened with the implementer's token "on the owner's word", so the row of `SKILL.md` that takes
  a project "opened by the owner" did not match it, and the watch that wakes the orchestrator
  prints nothing for an issue opened with that token.

## What was asked

The owner, 2026-10-11, whole, after being told `worker-machine-on-fly` was at `open` 68 minutes
after it was filed while two issues filed later were at `building` and `spec`:

> Oh we should do some kind of optimal queing thoery thing here. What would be best to improve throughput. Maybe we let it manage its own pool size and not worry about optimality, but we do want to maximize cache, so resumptions should have priority I think

An order of service and a rule for the pool were then put to him by the session that opened the
issue (the issue's body, "What was put to him"). Asked whether to file it, he wrote "yes". That
is a yes to filing. The order and the rule are that session's proposal, and this spec is where
they are decided.

## The reports gathered

The project has no parts (`issue-as.sh issues-implementer-2 "list?parent=loop-order-of-service"`
answered `{"issues":[]}` at 21:35). Two issues are linked `related`:

| Issue | What it says that bears here | What it becomes |
|---|---|---|
| `worker-machine-on-fly` (1628, `open`) | The case that prompted the owner: a project opened on his word and not taken | R1. Its own design (a machine on Fly.io) is not this spec's |
| `flow-metrics` (1179, `open`) | Lead time, waiting against working, age of open work, as a dashboard; "a median over finished work alone leaves out what was not picked up" | Left out. This spec measures with `issue-stats.ts` and the tracker; the dashboard is that project's. The age rule here (R4) counts stays that have not ended, which is its caution |

The issue's five questions "for the spec to settle" are answered under "The design", each by name.

## Requirements

- **R1.** An issue the owner asked for is marked as his in the record, where `issue.list` and the
  watch read it, whichever token opened it.
- **R2.** `SKILL.md` gives one order for a free place: a resumption, then a review, then a start;
  among starts, the owner's before the loop's own. (His: "resumptions should have priority".)
- **R3.** No number of writers or reviewers is set by hand. (His: "let it manage its own pool size
  and not worry about optimality".)
- **R4.** No task, bug, project or feature stays unstarted for 4 hours without a start or a
  written reason.
- **R5.** A writer whose work is sent back reads its earlier context from the cache. (His: "we do
  want to maximize cache".)
- **R6.** Each of R4 and R5 is read from the tracker by a command, with a number before.

## What exists today, measured

The record was read whole at event 2310 (`sync?after=`, 2310 events, 233 issues that are not
hidden). `issue-stats.ts` is the kept tool. Where a number below is not on a line it prints, it is
from a script of this writing, not kept, and the paragraph says what the script did.

### Where the time before a start is

`bun tools/cloud-brain/issue-stats.ts --token=issues-implementer-2 --until 2310`, run 21:53 CEST:

```
time in a state before the move out of it
  open               200 stays  median    1.7 min  total 125.1 h  max 9.3 h
  triaged            111 stays  median      0 min  total 174.5 h  max 16.8 h
  ready               96 stays  median    2.8 min  total  48.5 h  max 17.7 h
  in-progress        153 stays  median    7.2 min  total  54.6 h  max 15.2 h
  in-review          147 stays  median    6.3 min  total    24 h  max 2.1 h
review         146 submits, 54 sent back; verdicts {"pass":102,"changes":70}
```

Those lines count a stay when it ends. A script that also counted the stays not ended at event
2310, and split each stay at every label event, gave 671.3 h before a start, in these parts:

| Stays at | Issues | Hours | Of them not ended |
|---|---|---|---|
| `open`, kind `feedback` | 76 | 289.6 | 51 issues, 231.8 h |
| `triaged` or `ready`, labeled `needs-owner` | 28 and 6 | 167.9 | none |
| `open`, task or bug | 140 | 106.8 | 4 issues, 41.9 h |
| `triaged`, task or bug | 118 | 84.6 | 12 issues, 38.0 h |
| `ready`, task or bug | 91 | 10.6 | 1 issue |
| `open`, project or feature | 19 | 8.9 | 3 issues, 6.6 h |

So 457.5 of the 671.3 hours are feedback, which no writer takes (`SKILL.md`, step 3: "It is not
counted as work waiting"), and issues that waited for the owner. Of the 12 tasks at `triaged`,
10 have a triage reason that says what they wait for: 9 with the words "Held at triaged" or
"held until" (`ta-5`, `ta-6`, `dsv-6`, `ps-4` and others) and `dv-5-read-first-20-runs`, "It waits
for data": the tracker has no link that says one issue waits for
another, so a task of a spec that follows another task is kept at `triaged` with the reason in prose.

The loop does not run all the time. Taking a gap of 30 minutes with no event from a loop token as
a stop, the record has 8 running periods, 17.6 h of the 33.8 h it spans.

### What waits before each kind of service

From the `moved` and `reviewed` events and the `cost` comments (268 of 288 name the event their
run made; a run's start is taken as that event's time less the line's `seconds`):

| Wait | Rows | Median | 85th percentile | Longest |
|---|---|---|---|---|
| submit to the reviewer's first request | 127 | 0.3 min | 3.2 min | 119.8 min |
| `rework` to the round's first request | 29 | 0.4 min | 2.7 min | 58.9 min |
| `ready` to `start` | 93 | 2.7 min | 5.9 min | 922.7 min (231.5 while the loop ran) |
| opened to first start, the owner's (10) | | 7.0 min | 26.4 min | |
| opened to first start, the loop's own (92) | | 10.1 min | 100.4 min | |

"The owner's" here is an issue opened by his session (16 issues) or whose body says "on the
owner's word" (12): the record has no other mark, which is R1.

At the median nothing waits. The order of a free place moves the 85th percentile and the tail.

### Which pool binds

The last running period, 2026-10-11 14:09 to 21:42 CEST, 453 minutes, sampled every 10 s. Of its
123 reviews 118 have a `cost` line, of its 120 submits 90, so the writers' lines undercount.

```
a review waits, no reviewer on it            195 min
  of it, 2 or more reviewers running         100 min
  of it, under 2 reviewers running            95 min
a ready issue waits                           32 min
  of it, under 4 writers running              22 min
minutes with n reviewers running   0:108  1:122  2:176  3:35  4:12
minutes with n writers running     0:106  1:81   2:64   3:70  4:70  5:37  6:13  7:12
opened  83 tasks and bugs, 18 projects and features, 57 feedback;  closed 95;  96 submits, 35 sent back
```

The counts of 5 to 7 writers are not to be trusted: `SKILL.md` records that `seconds` of a resumed
round was a running total for two of the four first resumes.

The reviewers are the pool that binds. 123 reviews in 7.55 h is 16.3 an hour; a review took 327 s
at the mean (291 s median, the 118 lines). That is 1.48 reviewers' worth of work offered to 2.
As an M/M/c queue (the arrivals are in bursts, so this is a model and not a fit) the mean wait is
6.6 minutes with 2 reviewers and 0.8 with 3. Measured in the window: 4.4 minutes mean, 13 reviews
waited over 5 minutes. For 95 of the 195 minutes a review waited with a reviewer's place free:
that is the orchestrator not having been woken, and no order of service reaches it.

### The cache

`code.claude.com/docs/en/prompt-caching`, "Which TTL each request gets", read 2026-10-11: the main
conversation of a subscription gets one hour, and "everything else", which names subagents, gets
five minutes. The transcripts under the orchestrating session `f501a8e8` agree
(`cache_creation` of each request's `usage`):

```
orchestrating session       5m 0            1h 2,886,342   (1407 requests)
light reviewers, 86 runs    5m 0            1h 6,230,901   (agent.sh, a process of its own)
subagents, newest 60        5m 24,046,460   1h 0
```

In the 154 subagent transcripts, consecutive requests by the minutes between them, and how many
read at least 0.8 of the earlier prefix from the cache:

```
under 4     4223 / 4434
4 to 5        17 / 17
5 to 6         1 / 8
6 to 10        1 / 20
10 or more     0 / 10
```

The 16 resumed rounds found (20 `cost` lines have `"resumed":true` and an `agent`; a round is
found by the message "A resumed round" in the agent's transcript):

```
gap since the agent's last request   5.8 5.8 5.9 6.2 6.5 6.8 9.1 9.8 10.8 11.0 11.1 13.6 13.9 17.9 72.1 77.3 min
first request of the round wrote     111,329 to 203,811 tokens, 2,520,130 in all; read 6,267 (0 in one)
```

All 16 were cold. Between a writer's submit and the `rework` move the record has 54 stays: median
7.9 minutes, 13 under 5, 41 under 10, 50 under 20, 52 under 60. The gap a resume sees is that stay
and the time on either side of it, so none of the 16 fell under 5.

What the `cost` lines sum to, by role (a line's `usage`, or its `cost-usage` comment):

```
implementer            73 runs   cacheWrite 11,604,339   cacheRead 329,320,170
implementer resumed    17 runs   cacheWrite  3,166,280   cacheRead  37,575,664
spec-writer            21 runs   cacheWrite  3,831,200   cacheRead  75,708,059
```

## Read

- **The Brain, 21:47 CEST, five searches** with `loop-knowledge` (`knowledge.search?semantic=true`):
  "scheduling priority queue order of service agents", "prompt cache lifetime resume agent", "pool
  size concurrency limit workers throughput", "queueing theory shortest job first starvation
  aging", "multi-agent orchestration cost token efficiency". Nearest: `doc:cloud-brain-topics`
  (0.734, messages between agents, not their order), `module:tomlarkworthy:flow-queue` (0.628, a
  cell's computation as a promise), `arxiv:2610.12242` TokenRouter (0.797 on the pool search;
  the title only was read). Nothing was used.
- **`https://code.claude.com/docs/en/prompt-caching`**, read whole. Used: the two buckets and
  their lifetimes; `subagentPromptCacheTtl` and `CLAUDE_CODE_SUBAGENT_PROMPT_CACHE_TTL` (from
  v2.1.242; `claude --version` here is 2.1.296); "when Claude resumes a subagent, the resumed
  run's first request can read the cache the original run warmed"; each request that hits the
  cache resets the timer.
- **`https://platform.claude.com/docs/en/build-with-claude/prompt-caching`**, the first 100,000 of
  160,310 characters, through a summarising fetch. Used: a 5-minute write is 1.25 times the base
  input price, a 1-hour write 2 times, a read on Opus 5.5 0.05 times; "the cache is refreshed for
  no additional cost each time the cached content is used"; the lifetime runs from the start of
  the request.
- **Queueing, in a search summary only, no paper read.** Searched "SRPT scheduling optimal mean
  response time multiserver Harchol-Balter Gittins unknown job sizes aging starvation". The
  summary: shortest remaining time first is optimal on one server when sizes are known, the
  Gittins policy when they are not (Scully, Grosof, Harchol-Balter, "Optimal Multiserver Scheduling
  with Unknown Job Sizes", https://ziv.codes/pdf/mama2020-scully.pdf); with several servers a
  policy must also not leave a server idle (Grosof and others, https://www.alphaxiv.org/abs/2211.02762).
  Used for two things only: finishing what is nearest done before starting, which the present
  table already does, and the weight given under "Which pool binds" to places left idle. The
  M/M/c figures are this writer's arithmetic with the Erlang C formula, not from a source.

## The design

Four changes to texts and one small tool, then one change of how a writer ends, tried on five
rounds before it is kept.

### 1. The label `owner` (R1). Answers "what the owner opened"

An issue the owner asked for carries the label `owner`. A session that opens an issue on his word
puts it in `labels` at the open. The orchestrator adds it when he asks for an issue in the
session. An issue opened by his own session in the page needs none: `by.via` is `session`.

- `SKILL.md`, step 3: "the owner's" is defined once, as opened by his session or labeled `owner`,
  and the row for a project or feature at `open` reads "with three parts or more, or the owner's".
- `tools/cloud-brain/issue-watch.sh` prints an `opened` event that has the label, whatever token
  wrote it. Today it prints an open only when the holder is not the token it was started with, and
  an outside session writes with that same token.
- The eight issues that are open, not feedback, and say "on the owner's word" or were opened by
  his session get the label: `ai-tomarkdown-pass-through`, `dashboard-service`, `flow-metrics`,
  `i1842`, `loop-order-of-service`, `n39625a1a`, `paper-summarizer-persona`,
  `worker-machine-on-fly` (`writers-qa-tabs-wake-the-orchestrator` too if it is still open).
  (As built, `os-1-owner-label`, 2026-10-11: seven. `i1842` and
  `writers-qa-tabs-wake-the-orchestrator` were closed by then; the record.)
- `knowledge/calling-a-cloud-brain-from-this-checkout.md` gets one sentence for a session outside
  the loop. `ta-5-outside-session-doc` writes the paragraph it belongs in and is held; whichever
  lands second adds the sentence.
  (As built, `os-1-owner-label`, 2026-10-11: landed first, with `ta-5` at `triaged`, and added the
  sentence as a paragraph of its own after "No token of your own for the tracker"; the record.)

The label gives precedence and no authority: no guard of the workflow reads it. Anyone who may
call `issue.open` may write it, as with `digest`.

### 2. The order of a free place (R2). Answers "where this is written"

It is written in `SKILL.md`, step 3. What sets the order today is the order of the table's rows
and one sentence: "Finishing comes before starting. Among issues on the same row, one the owner
opened or moved goes first, then the oldest." The rows already put a review and a resumption
before a start, in that order. The sentence becomes:

> A place goes, in this order, to: a round that was sent back (a writer's or a spec's); a review
> that waits; a start. Among starts: the owner's before the loop's own; then an issue past 4 hours
> (below); then a bug or a task before a project or a feature; then the oldest.

and the rows for `in-progress` after a `rework` and for `spec` after a `respec` move above the
row for `in-review`. Since writers and reviewers are different agents, the first two do not take
each other's place; the order says which the orchestrator spawns first in a pass.
(As built, `os-2-order-and-pool`, 2026-10-11: four rows went above the row for `in-review`, not
two. The row "A dead writer" went with the row of a writer sent back, which ends "When it cannot be
sent one, the next row" and means that one; the row "A quick win of your own, sent back" is also
an `in-progress` after a `rework`. The row for `spec-review` went to stand under the row for
`in-review`, above the rows of the digest, which are starts. The row that spawns a spec writer for
a project at `open` went under the row for `ready`, for "a bug or a task before a project or a
feature"; the record.)

**"Smallest first" is not taken as asked.** Nothing in the record gives a size before the work:
the kind is the one thing known at triage. A bug or a task is one writer and one review by the
rule of Triage ("Is it one change?"); a project is a spec, a review, an approval and its tasks.
So kind stands for size. A size written at triage would be a guess that nothing checks, and he
said not to seek the optimum.

**The loop's own observations need no rate.** A `feedback` issue takes no writer and no reviewer
(the row "Nothing"), so the 51 open hold nothing back. What does compete with the owner's work
is the tasks and bugs the loop opens for itself: the reviewer's token opened 61 issues and the
overseer's 38, against 14 by his session. "The owner's before the loop's own" is the rule for those.

### 3. The pool (R3)

Step 2 of `SKILL.md` ("Keep up to 4 implementers and 2 reviewers running") and the line "More
than 4 writers or 2 reviewers at once" under "What the loop does not do" are replaced by:

> No number is set. Every review that waits gets a reviewer, and every round sent back goes to
> its writer, in the pass that sees it. A new writer is started only when, after that, no review
> waits without a reviewer and no sent-back round waits without a writer. Start nothing new in a
> pass in which an agent's report or your own session names a rate limit or a usage limit, or in
> which `lock.sh show land` has named the same holder for two passes. One agent on an issue, as before.

(As built, `os-2-order-and-pool`, 2026-10-11: the two texts read "8 implementers and 4 reviewers"
and "More than 8 writers or 4 reviewers" when the task was taken. `ta-3-orchestrator-steps`
(`e2efdd14`, 22:01) had written into `SKILL.md` the owner's word of comment 1533, "can we increase
the parrallism twofold?", 7 minutes after this spec was committed. Those were replaced, and the
number in the skill's `description` and in "one of the 8 implementers of step 2"; the record.)

The first sentence is the measured gain: a reviewer is a process of its own that lands nothing,
and the cap of 2 held a review back for 100 of 453 minutes. The second is what he was shown and
said yes to filing. The third is what stops growth: a limit of the account and the landing lock
are the two things more agents would wait on. Neither has been seen to bind (the landing lock: 38
holds, median 18.3 s, longest 234.5 s, the same `issue-stats.ts` run).

Not known: how many writers this machine carries. A writer of a seed opens a browser tab, and
`writers-qa-tabs-wake-the-orchestrator` (in progress) counts 1,038 channel rows in one session's
transcript from such tabs. If that or memory binds first, the rule above does not see it, and the
overseer adds the sign that would have (its brief lets it edit the procedure).

### 4. Past 4 hours (R4). Answers "N, and what the loop does with an issue past it"

N is 4, the default of `issue-stats.ts --idle`, which already prints "open and idle for 4 h or
more" (one row that is not feedback at event 2310: `annotate-home-not-on-observable`, `triaged`,
5.6 h). In step 1 of a pass the orchestrator reads that list. For each row that is not feedback,
not labeled `needs-owner`, and not at a state where an agent is on it:

- when it can be started, it goes before every younger start (the sentence of part 2);
- when it cannot, the orchestrator comments once why and what would start it, under the key
  `orch/<id>/held-1`, with the body beginning `held:`. A last triage reason with the word "held" in it, in either
  case, counts: 9 of the 12 tasks at `triaged` have one today.

`issue-stats.ts` marks such a row `held` and leaves it out of a count it prints on a new line,
`past 4 h, not started, no reason: <n>`. That count is R4's number. The tool's "idle" is time
since the issue's last event, so a comment resets it; the new line counts from the last move
instead, so a `held:` comment does not hide the issue for another 4 hours.
(As built, `os-3-stats-past-four-hours`, 2026-10-11: a row is an issue at `open`, `triaged` or
`ready`; a reason is read wherever it is in the issue's record; the line ends `(<m> more are
held)` when a row is, and its rows are printed under it; 3 at event 2683, where the 1 of the table
below was read from the list of the idle; the record.)

A link that says one issue waits for another would let the tracker answer this itself. It is a
change to `brain-issues.ojs` and the policy, and is not in this design.

### 5. A writer waits for its review (R5), on trial

The cache is kept by using it. A writer that has submitted makes one request every 4 minutes
until its review is in, and takes the next round itself:

- New, `tools/cloud-brain/issue-wait.sh <token> <id> <after seq> [seconds]`: reads `sync?after=`
  every 15 s and exits 0 with the first `reviewed` event of that issue as JSON, or exits 3 after
  the seconds (240 by default) with nothing. It writes nothing.
- `agents/implementer.md`, after step 12: run it with the Bash timeout at 280,000 ms, up to 5
  times (20 minutes). A `pass`: report. A `changes`, with the issue at `in-progress`: follow "A
  resumed round" from its first item, then submit and wait again, once. After a second `changes`,
  or 20 minutes with no review: report as today, and the orchestrator resumes or judges as
  today (the judgment at 3 reworks stays the orchestrator's).
- `issue-watch.sh` prints a `submit` and a `submit-spec` move of any token. Today the
  orchestrator learns of a submit from the writer's report; a writer that waits has not reported.
- `SKILL.md`, step 5: a run that made two submits gets one `cost` line with `"rounds":2` and
  `event` the last submit; `agent-usage.ts` needs no `--last-run` for it. A writer that waits is
  not counted as a writer at work in part 3.

What it would have cost and saved over this record, in units of one base input token, with the
multipliers under "Read" and a context of 157,500 (the mean of the 16 rewrites): a wait call
reads the context at 0.05, 7,900 a call. The 132 stays from a submit to its `pass` or `rework`
would have made 318 calls under the cap of 5, 2.5 M. 50 of the 54 sent-back stays ended inside 20
minutes; each would have read 157,500 at 0.05 in place of writing it at 1.25, 189,000 saved, 9.45
M in all. Net 6.9 M, against 23.3 M for all the writes of the Agent runs above (18.6 M tokens at
1.25). This is arithmetic, not a measurement: it assumes a request made while waiting hits the
cache as the 17 of 17 at 4 to 5 minutes did, and that the round's own writes do not change.

**The trial.** The first five sent-back rounds after the task lands. Kept when at least 4 of the 5
have a first request that read more than it wrote; otherwise the section is taken out of the
brief and the tool stays. The orchestrator reads that from the transcript on this machine
(`usage` of the first request after the `reviewed` event's time). From the tracker an agent reads
the weaker sign: the `cacheWrite` of a run of two rounds.

Not tried, and the trial is where it is found: whether a background Agent that sits in a
240-second Bash call five times is stopped by the harness (`CLAUDE_ASYNC_AGENT_STALL_TIMEOUT_MS`
is named in the environment variables page; its default was not read); what the worktree is at
when the writer takes the round itself (step 10 removed it; "A resumed round" already makes it again).

A spec writer is not in the trial: a sent-back spec is a new agent today (`SKILL.md`: "The spec
writer, the digest writer and the overseer are spawned as before"), though 2 `cost` lines of a
spec writer say `resumed`. Once the trial is kept the same section goes in `agents/spec.md`, as a
task the overseer opens.

### Not chosen

- **One hour for every subagent** (`"subagentPromptCacheTtl": "1h"` in `.claude/settings.json`,
  one line). With it 14 of the 16 resumes would have been warm. Every write of every subagent is
  then 2 times in place of 1.25: 18.6 M tokens of writes less the 2.2 M no longer rewritten is
  16.4 M at 2, 32.8 M units, against 23.3 M today. It costs 9.5 M units more than now over this
  record, where part 5 saves 6.9 M. The record has 38 gaps over 5 minutes inside a run, 36 of
  them cold, which one hour would also save and which this sum leaves out; their tokens were not
  counted. If the trial of part 5 fails this is the next thing to measure, for a writer alone
  (`cacheTtl` in a subagent's own frontmatter).
- **Run the writer as a process of its own, as the reviewer is**, for the main conversation's one
  hour. It is `agent.sh` grown to hold a writer's tools and a resume by session id: a larger
  change than part 5, and the same 2 times on writes.
- **A number for the pool chosen from the model** (3 reviewers). He said no number, and the
  offered load moves with the hour.
- **A size at triage**, and **a rate for feedback**: under part 2.
- **Changing how soon the orchestrator is woken.** 95 of the 195 minutes a review waited had a
  place free. Part 5 adds the submit to the watch, which is a wake at the moment a review is
  needed and may take most of that; it is counted in the check of R3 and not designed further here.

## How each requirement is known to be met

`ia` is `tools/cloud-brain/issue-as.sh issues-implementer-2`, run from the main checkout. Each
command is one an agent of the loop runs with its own token, except where it says the orchestrator's machine.

| | Command | Today | After |
|---|---|---|---|
| R1 | `ia "list?label=owner&limit=100"`, the count of `issues` | 0 (run 21:53 CEST) | 8 or 9 after os-1, each id in the list of part 1. Cannot be run before the task labels them. (As built, `os-1-owner-label`, 2026-10-11: 7, run 22:36 CEST; the record.) |
| R1 | `bun test tests/tools/issue-watch.test.ts` | no such file | passes; one test feeds the filter an `opened` event with the label and the watch's own holder and sees a line. Run in the task's worktree |
| R2 | `grep -c "A place goes, in this order" .claude/skills/brain-maintenance/SKILL.md` | 0 (run 21:53) | 1 |
| R3 | `grep -c "up to 4 implementers\|More than 4 writers" .claude/skills/brain-maintenance/SKILL.md` | 2 (run 21:53) | 0. (As built, `os-2-order-and-pool`, 2026-10-11: this was 0 before the task, at `85880f72`, since the file read 8 and 4 by then. The count that the task moved is `grep -c "up to 8 implementers\|More than 8 writers\|one of the 8 implementers\|up to eight implementers"`, 4 before and 0 after; the record.) |
| R3 | `issue-stats.ts --token=<own> --window <seq of the landing of os-2>`, the line `in-review`, once 40 stays are in the window | median 6.3 min, 147 stays, whole record | read by the overseer at its next oversight; no figure is a condition of a task landing. A median over 6.3 is a finding for it |
| R4 | `issue-stats.ts --token=<own>`, the line `past 4 h, not started, no reason` | no such line. By hand at event 2310: 1 (`annotate-home-not-on-observable`) | the line is printed (os-3, with `bun test tests/tools/issue-stats.test.ts`); 0 two passes after os-2. Cannot be run before os-3 |
| R5 | on this machine, the orchestrator: the first request after each of the five trial rounds' `reviewed` event, `cache_read_input_tokens` against `cache_creation_input_tokens` | 0 of 16 read more than they wrote | 4 of 5. Not a loop-token check: it is in the owner's list as the orchestrator's report to him |
| R5 | `ia "get?id=<id>"`, the `cost` line with `"rounds":2` | none | `usage.cacheWrite` under 1.5 times the `tokens` of the same line: a run writes each token of its context about once, and a cold second round writes the first round's again. A weaker sign than the row above, and no run has shown where the line between them is. Read after the trial |
| R6 | the rows of R3, R4 and R5 above | | |

Run before this submit: the two `grep`s and the `list?label=owner` (their "Today" column), and
`issue-stats.ts --until 2310` (21:53). No "After" figure here has a run behind it but the two `grep`
counts, which are what the replaced and added sentences give by reading.

## The tasks, in the order they land

1. **os-1-owner-label.** Part 1: the definition and the row in `SKILL.md`, the watch and its test,
   the labels on the open issues, the sentence in the knowledge doc. No seed.
2. **os-2-order-and-pool.** Parts 2, 3 and the orchestrator's half of part 4: the three texts of
   `SKILL.md`. No tool. Lands after os-1, which defines "the owner's".
3. **os-3-stats-past-four-hours.** `issue-stats.ts`: the `held` mark and the line of part 4, with
   tests. May land beside os-2.
4. **os-4-writer-waits.** Part 5: `issue-wait.sh` and its test, the section of
   `agents/implementer.md`, the watch's line for a submit, step 5 of `SKILL.md`. After os-2.
5. **os-5-trial-read.** After five sent-back rounds: the orchestrator's counts in a record
   (`tools/cloud-brain/records/os-5-trial-read.md`), and the section kept or taken out. Held at
   `triaged` until those rounds exist.

`run-cost-is-part-of-the-issue-model` is at `spec` and may change what a `cost` line is. os-4
writes `"rounds"` in whichever form is current when it lands.

## What only the owner can do

- Approve this spec. One choice, by letter: **A**, as written; **B**, without tasks 4 and 5, so
  that a resumed round stays cold and only the order, the label and the pool change. A is this
  writer's, by line 5 of the philosophy (cost is part of a decision) and his "maximize cache"; B
  is smaller. His approval is also what replaces his numbers of 2026-10-10 ("try to have 1-2
  writers and 1-2 reviewers", "maybe we do another 2 in parrallel") with the rule of part 3.
- Read the trial's result (os-5), which the orchestrator counts on this machine.

No deploy, no policy, no token and no rule of `rules.md` is in this design.

## What misled the writer of this spec

- The scratch directory of a session is shared by its agents. The first `get` of this issue was
  saved as `issue.json` there and read back as `run-cost-is-part-of-the-issue-model`: another spec
  writer had written the same name between the two commands. `agents/spec.md` and
  `agents/implementer.md` name no place for a scratch file.
- The issue's table of time in a state reads as work waiting in a queue. 457.5 of 671.3 hours
  are feedback and issues that waited for the owner, and the tool counts no stay that has not ended.
- `agents/spec.md` step 3 sends the writer to `issue-stats.ts`. It prints none of: a wait
  before a service, which pool was full, a cache read. Each took a script of its own here.
