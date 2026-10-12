# Cloud Brain: a wait as data in the tracker: who listens on an issue, for what condition, and one read that says when it is due

Spec of the feature `tracker-trigger-rules` on cb4's tracker. Written 2026-10-12, begun 21:46 CEST
(the `spec` move, event 4535), from `lopecode-dev` `48be7b03` and the tracker at event 4538.
Round 1. Nothing here is built, and no method or cell named in "The design" was run.

Three findings change what the issue asks for, and they come first:

- **Finding out that a review exists is not where the time goes.** From a submit to its review the
  median is 5.4 minutes (n=285: 241 of the 245 submits of a change and the 44 of a spec; 4 submits
  had no review before their next move). The reviewer's own run is 4.5 minutes of that at the median. What is
  left, the time until the orchestrator had started a reviewer, is 0.3 minutes at the median and 1.8
  at the 85th percentile (n=215). A trigger does not shorten a review. What this design changes is
  who knows that a writer waits, and which rounds reach a writer whose context is still cached.
- **The first example has no data yet.** The record has 0 `after` links (`bk-5-holds-become-links`
  is at `triaged`). A task that is released when the one before it ends is `issue.queue` of
  `bookkeeping-in-the-tracker` (`bk-3-queue-and-hold`, at `triaged`), and the line the orchestrator
  is printed is its `bk-6`. This spec builds neither again. It adds the case those leave: a taker
  that has started and waits.
- **A push reaches no agent of the loop.** A push subscription of a topic calls a method named
  `NAME.receive` of a Worker (`brain-topic.ojs`, the reference). An agent in a shell has no address:
  "A push does not reach an agent in a tab or in a shell: neither has an address. They read or
  take." (`plan/cloud-brain-topics.md`, line 93). So an agent on the laptop, or on the machine of
  `worker-machine-on-fly`, learns of a wake by asking. The design is the shortest thing to ask.

## What was asked

The owner, 2026-10-12, in chat, as the issue's body quotes him:

> I think we need something like trigger rules on the issue tracker so a take can automatically be woken when some other condition is met (e.g. blocked by) as writers seem to wait for reviewers and the orchistrator stuggles to juggle the dependancies. These kinds of features should be inbuilt into the board and not delegated to LLM judgment

Everything else in the body ("What is asked", "What is new here, for the spec to settle") is the
reading of the session that filed it, and is treated here as a report.

His words give four things: a condition on the record; someone who is woken when it is met; the
tracker holds both and decides when; no agent decides it by reading prose.

One reading here is this writer's and not his. "Trigger rules ... inbuilt into the board" is read
as: the mechanism is in the tracker, and each rule is data that a token writes on an issue, as a
link or a hold is. It is not read as rules in the installed policy, which only he can change
("Not chosen").

## The reports gathered

The feature has no parts: `ia "list?parent=tracker-trigger-rules"` answered `{"issues":[]}` before
the `spec` move. Its body carries four items under "What is new here". Each was measured or read
again here.

| Item of the body | What it becomes |
|---|---|
| The condition and the one to wake, as data in the record, in the way guards are data in the policy | R1, R2 |
| Who can wait: an orchestrating session, and one writer or reviewer for one issue | R3. A reviewer waits for the landing lock, which is a row of `issue.lock` and no event of the record: left out |
| How the wake is delivered: `issue.sync` with a wait, or a topic | R4. `issue.sync` has no wait of that kind: its `wait` is "the milliseconds the page waits before it asks again" (the reference in `brain-issues.ojs`), 5000 on cb4. A topic is under "Not chosen" |
| The tracker starts no agent and makes no model call | R5 |
| Example 1, blocked by | R2, for a taker that has started. For a task not yet started it is `bk-3` and `bk-6`, not built again |
| Example 2, a writer waiting for a reviewer, "up to 20 minutes" | R3, R6. Measured below |

## Requirements

- **R1.** That an actor waits on an issue, for what condition and until when, is an event of the
  record, written by that actor with its own token.
- **R2.** The condition is an expression over the issue's facts, the ones a guard reads, and the
  tracker evaluates it. It is true or false of the issue as it stands, so a waiter that registers
  after the thing it waits for has happened is due at once.
- **R3.** Any role waits the same way: a writer for its review, a spec writer for its spec's
  review, an orchestrating session for an approval, a taker for the issue it comes after.
- **R4.** One read answers the caller's waits that are due. The waiter reads no other issue's
  events to find out.
- **R5.** The tracker starts no agent, makes no model call and writes no event of its own for a wait.
- **R6.** The orchestrator reads from the queue which round a waiter will take itself. It keeps no
  list of who waits.
- **R7.** How long a wake took is read from the record: from the event that made the condition
  true to the waiter's next write.

## What exists today, measured

The record was read whole on 2026-10-12 at 21:48 CEST: 23 calls of `sync?after=`, to event 4538,
with the token `spec-472002`, 7,073,654 bytes. The numbers below are printed by `measure.py`, a
script of this writing that reads those answers and calls nothing. It is an attachment of the
issue (`ia "attachment?id=tracker-trigger-rules&name=measure.py"`). It reads 4,478 of the 4,538 events: the events of issues this
token may not read, and of issues whose id starts `test-`, are left out.

`bun tools/cloud-brain/issue-stats.ts --token=spec-472002`, from the main checkout, 21:47:59 CEST:

```
record         4538 events, 381 issues
  in-review          242 stays  median    5.7 min  total  33.1 h  max 2.1 h
  spec-review         44 stays  median    3.2 min  total   3.9 h  max 0.8 h
  awaiting-approval   62 stays  median   31.6 min  total 130.3 h  max 12.2 h
review         245 submits, 56 sent back; verdicts {"pass":211,"changes":75}
```

### A submit and its review

```
submit to the first review                                 n= 285 median     5.4 min  85th     9.3  90th    12.0  max   127.1  sum   36.4 h
    submits with no review before the next move: 4; reviews over 20 min after the submit: 12 of 285; over 4 min: 201
review to the reviewer's move                              n= 285 median     5.1 s  85th     7.1  90th     7.5  max   642.4  sum    0.5 h
submits with a review and a reviewer's cost event that names it or names none: 215
  the reviewer's run, seconds of its cost event            n= 215 median     4.5 min  85th     8.0  90th     8.6  max    24.3  sum   19.5 h
  submit to review less the run (0 when the run is longer) n= 215 median     0.3 min  85th     1.8  90th     2.6  max    67.6  sum    5.5 h
```

The last line is the first finding. It is an estimate: a reviewer's `cost` event has the seconds
of its run and not the time it began, so the run is taken to end at its review.

### The writer's wait, since it was added

`os-4-writer-waits` went to `done` at event 2873. A writer has since waited for its review with
`tools/cloud-brain/issue-wait.sh`, which reads `sync?after=` every 15 s for 240 s, up to 5 runs
(`agents/implementer.md`, step 13).

```
moves after it: {'submit-spec': 10, 'respec': 2, 'start': 71, 'submit': 65, 'rework': 2, 'back': 1}
implementer runs after it, by outcome: {'pass': 54, 'in-review': 2}
runs whose last submit is of a later round than the run's first (a round the writer took itself): 2 [('tp-1-topics-append-read', 1, 2, 3615), ('ds-1-rows-add-within', 1, 2, 3866)]
rework moves after it: 2 ; implementer runs after it that are resumed (a round sent by message): 3 ; fresh at round 2 or later: 0
  runs that ended on pass: their submit to the review      n=  54 median     4.9 min  85th     8.0  90th     8.6  max    20.0  sum    5.2 h
  runs that ended at in-review: their submit to the review n=   2 median    23.0 min  85th    24.8  90th    24.8  max    24.8  sum    0.8 h
```

- 56 runs of a writer name a submit made after that event. 54 ended on the review's `pass`: the
  writer was there when it came. Both `rework` moves of that time were taken by the writer that
  waited. So the second example is met today for a writer, by a script. The 3 runs printed as
  `resumed` are round 1 of `annotate-home-not-on-observable`, `tp-2-push-to-receive` and
  `ds-1-rows-add-within`: an agent that was continued in its first round, and no round sent by message.
- The 2 that ended at `in-review` are the two whose review came after 20 minutes (23.0 and 24.8).
  The cap is in the brief and nothing in the record says a writer has stopped listening.
- Nothing in the record says a writer waits at all. The orchestrator infers it: "an agent of yours
  that has not reported, whose issue is at `in-review`, or at `in-progress` with a `rework` after
  its last `submit`" (`SKILL.md`, step 2). `os-5-trial-read`, which keeps or removes the wait after
  five rounds a writer took, is at `triaged` with 2 of its 5.
- What a wait reads: five calls of `sync?after=4538` at 21:56 CEST, 79 events behind, took 0.36 to
  0.51 s each and answered about 134,000 bytes each (671,900 bytes for the five). A waiter reads
  every event of every issue and keeps one or two.
- What the script knows is one condition, written in Python: the first `reviewed` event of the
  issue, then the first `moved` after it. A second kind of wait is a second script.

### A spec writer does not wait

`agents/spec.md` has no wait: `grep -c "issue-wait.sh" .claude/skills/brain-maintenance/agents/spec.md`
is 0 (21:56 CEST; `agents/implementer.md` 3, `SKILL.md` 2, `agents/reviewer.md` 0). A spec writer
reports at its submit, and a round that is sent back comes to it later by message, or to a new agent.

```
submit-spec to the next move of the issue: {'to-approval': 25, 'respec': 19}
  submit-spec to that move                                 n=  44 median     3.2 min  85th     7.0  90th     9.2  max    45.3  sum    3.9 h
  respec or send-back to the next submit-spec              n=  17 median     8.2 min  85th    12.0  90th    16.9  max    20.8  sum    2.3 h
  spec-writer runs, round 2 or later, fresh: 11; with a usage 11; median cacheWrite 138141, cacheRead 2640333, output 19911, requests 25; median seconds 480
  spec-writer runs, round 2 or later, resumed: 6; with a usage 5; median cacheWrite 28838, cacheRead 2280928, output 11849, requests 12; median seconds 378
```

19 of 44 spec submits were sent back, and the verdict came 3.2 minutes after the submit at the
median, inside the 5 minutes a prompt cache lasts. 11 of the 17 later rounds were a new agent that
wrote 138,141 tokens to the cache at the median, against 28,838 for one that was resumed. This is
the largest thing the design buys, and it is the one role that has no wait today.

### What the tracker has

- `issue.sync` holds no call: it answers at once, and `wait` tells the page when to ask again.
- The tracker's Worker keeps its rows in D1 (`cloudflare-iac.ojs`, the bindings: `{ type: "d1", name: "SQL" }`
  for every Worker but the deployer). It has no Durable Object and no timer.
- A guard is a CEL expression that `issueAllowed` evaluates with `decide({ allow: guard }, { caller, issue, event })`,
  and `checkedRule` checks one at an install. `issue` is `facts(i)`: `id`, `kind`, `about`, `state`,
  `labels`, `parent`, `opener`, `major`, `by`, `reviews`, `links`, `children: { total, open, work }`.
- `issueReplay` answers "no such type of event" for a type its table lacks, so a new type of event
  joins that table or `issue.verify?guards=true` fails at the first one.
- `append` already acts after a write: the `finish` of `bk-2-finish-by-the-service`, as the call's
  caller, with `auto`. `bk-2` is `in-review`; its code is on `main` at `48be7b03`.
- `ia "verify?guards=true"` at 21:56 CEST: `{"ok":true,"seq":4617,…,"checked":4617,"guards":true}`.
- `bun test.ts brain-x-issues` in the worktree's `cloud-brain-dev` (`ca5299a`), 21:56 CEST:
  `"hash":"8e9dc07f…","passed":39,"failed":0,"needsBrowser":15`.
- `bun test ./tests/tools/issue-wait.test.ts`: 13 pass, 0 fail. `issue-watch.test.ts`: 13 pass, 0 fail.

## Read

- **The Brain, 21:52 CEST, six searches** with `loop-knowledge` (`knowledge.search?semantic=true`):
  "trigger rule wake a waiting agent when a condition on the record becomes true", "long poll held
  request wait for event Worker D1", "writer waits for its review polling issue.sync", "topic push
  subscription take deliver wake", "blocked by dependency released when blocker closes notify",
  "event condition action rules workflow automation agents".
  Used, each read in the part named: `doc:cloud-brain-bookkeeping-in-the-tracker` (whole: the link,
  the queue, the hold, "Who wakes", and why the queue's rows are not policy data);
  `doc:cloud-brain-loop-order-of-service` (part 5, the writer's wait, and its "As built" notes);
  `doc:cloud-brain-topics` (lines 80 to 150: what a push can reach, Cloudflare Queues, a Durable
  Object for each topic "kept for the day a reader needs to be woken in under a second");
  `doc:cloud-brain-topics-service` (the head) with the reference of `brain-topic.ojs` ("`topic.read`
  does not wait: a reader polls"). Not used: `doc:cloud-brain-locks-held-in-the-cluster` (score
  0.98 for the second search; its wait is `lock.sh take --wait`, which asks every 20 s),
  `doc:cloud-brain-approver-persona`, `module:tomlarkworthy:async-lambda-sqs-eventbridge-benchmark`,
  and the eight papers of the sixth search (EvoAgentX, AutoManual and others: titles only).
- **`tools/cloud-brain/brain-issues.ojs`**, read: the method reference, `issuesLimits`, `issuesSql`,
  `issueAfterWalk`, `issueAllowed`, `issueEvent`, `issueReplay`, `issuesApp` from `load` to `append`
  and `sync`. **`issue-wait.sh`**, **`issue-watch.sh`** and `agent.sh` of `cloud-brain-dev`, whole.
  `tools/cloud-brain/records/os-4-writer-waits.md`, to "Exit 2".
- **Outside, three pages read through a fetch that answers a question of the page; no search.**
  - Cloudflare, Workers limits (https://developers.cloudflare.com/workers/platform/limits/): "There
    is no hard limit on duration for HTTP-triggered Workers"; "Waiting on network requests (such as
    `fetch()` calls, KV reads, or database queries) does not count toward CPU time"; 10,000
    subrequests a request on the paid plan. The page does not name `setTimeout`. Used for part 4:
    a held call is allowed by the platform. Whether it passes this Brain's kernel and core was not tried.
  - Amazon SQS, short and long polling (https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-short-and-long-polling.html):
    "The maximum long polling wait time is 20 seconds"; "An empty response is sent only if the
    polling wait time expires." Used: the held read has a bound under half a minute and answers
    empty at it, and the caller asks again.
  - AWS Step Functions, the callback with a task token (https://docs.aws.amazon.com/step-functions/latest/dg/connect-to-resource.html):
    a task waits until its token is returned; "To avoid stuck executions you can configure a
    heartbeat timeout interval". Used: a wait has a required time at which it ends, and a waiter
    that goes on writes it again.
  Neither system was run. Nothing was read on rule engines of other trackers (Jira's automation,
  GitHub's): the design has no rule that acts, so the comparison was not made.

## The design

Two additions to `brain-issues.ojs`, one tool changed, three texts.

### 1. A wait is an event (R1, R2, R3, R5)

```
issue.wait { key, id, when, until, note }      →  the event `waits`
issue.wait { key, id, remove: true }           →  the event `waits` with remove: true
```

- `when`: a CEL expression over `issue`, 500 characters at most. `issue` is what a guard reads
  (`facts`, above) and three more: `issue.closed` (true at a state its workflow lists as closed),
  `issue.last` (`{ move, at }`, the row's field since `bk-1`, `{ move: "", at: 0 }` when it has
  none) and `issue.after` (`{ total, open }`: the issues this one is after by a link, and those of
  them that are not closed). It is checked as a guard is at an install (`checkedRule`) and
  evaluated once at the write with `issue` alone in scope, by `decide`, which answers an `error`
  for a name that is not there: one that does not parse or answers an error is 400. `checkedRule`
  parses and no more (`cloudflare-iac.ojs`, the cell), so the evaluation is what refuses `caller`
  and `event`: a wait is about the issue as it stands. For that evaluation the write loads the
  issues this one is after, as `issue.wakes` does (part 2), 20 at most. A `when` that answers an
  error at a later read, on a branch the write did not take, is not due and is listed in `waiting`
  with `error`.
- `until`: milliseconds since 1970, after the call and at most 30 days after it. Required.
- `note`: text of 200 characters at most, for a reader of the record. Optional.
- The issue's row gains `waits: [{ actor, holder, when, until, note, seq, at }]`. `actor` is
  `issueActor` of the caller, the name the policy knows an agent by; `holder` is the token's name
  as events have it. An actor has one wait on an issue: a second replaces the first. The row keeps
  the waits of 10 actors: the wait of an eleventh takes the place of the oldest, live or not. No
  write is refused for the count, so the judgment of a write reads no clock. `issue.get`, `issue.list` and `issue.snapshot`
  show `waits` with the row.
- A wait **is live** from its event until `until`, its `remove`, or the same actor's next
  `issue.wait` on that issue. Nothing is written when it ends. `issueApply` keeps a wait until its `remove` or its replacement, and reads no clock: the view is
  the same whenever it is made, by the service, by `issue.verify` or by the page. A read leaves out
  the ones past `until`.
- Guard: the workflow's `wait`, and `label` where a workflow has none, as `cost` falls to `label`.
  In the default policy that is `caller.kind in ["owner", "token"] && (!("major" in event.remove) || caller.present)`
  (`issuesDefaultPolicy`, `acts.label`); `issueAllowed` makes `event.remove` `[]` when it is not a
  list, so `remove: true` of a wait passes its second half. Which policy cb4 has in force was not
  read again here. No guard reads a wait, and a wait refuses nobody anything. `waits` joins the table of `issueReplay`.
- The three names a `when` adds are made for this read alone and are not added to `facts`. A guard
  is judged again by `issue.verify` from every issue of the record, and the service judges a write
  from the few it loaded; `issue.after` needs issues a write does not load.

The conditions the loop uses, each one line:

| Who waits | `when` |
|---|---|
| a writer, for its review | `issue.state != "in-review"` |
| a spec writer, for its spec's review | `issue.state != "spec-review"` |
| a writer at work on a round, saying it has it | `issue.state != "in-progress"` |
| a session, for the owner's approval of a spec | `issue.state != "awaiting-approval"` |
| a taker, for what its issue comes after | `issue.after.open == 0` |
| a session, for a project's parts | `issue.children.work == 0` |

**True of the issue, not of an event.** `issue-wait.sh` today waits for an event after a seq, and
needed a second line for the move that follows a review (`os-4`, "A second line"): the review and
its `rework` are two events 0.5 s apart at the median. A condition on the state has neither
problem. A writer that registers after its review was given is due at its first read. The verdict
and its text are read from the issue, which the answer carries (part 2).

**The tracker writes nothing.** No event says a wait became due: it is due when its `when` is true
at a read. So "in the call that ends the one it waited for" is met in this sense: from that call's
answer on, every read says the wait is due, and no agent has to act for that to be so. The
alternative, an event `woke` that the service appends as it appends a `finish`, is under "Not chosen".

### 2. One read: `issue.wakes` (R4, R7)

```
issue.wakes?id=<id>      →  { seq, now, due: [{ id, when, until, note, seq, since, issue }], waiting: [{ id, when, until, note, seq }] }
```

A query, allowed as `issue.list` is. It answers the live waits of the caller's actor: in `due` the
ones whose `when` is true now, in `waiting` the others. With `id`, that issue's alone; with none,
every issue's. An issue the caller may no longer read is in neither.

- `issue` of a due entry is `{ state, closed, last, labels, review }`, with `review` the last
  `reviewed` entry of `issue.reviews` when there is one. It is what the waiter acts on.
- `since` is `issue.last.at` when the issue has moved since the wait was written, else the wait's
  own time: when the condition became true, as near as the row knows it.
- One cell makes the answer, `issueWakes(view, actor, now, id)`, with no I/O. With `id` the service
  loads that issue, its parts and the issues it is after (`S.near` for each, 20 at most; an issue
  after more is answered 400 with the count). With none it loads the view whole, as `issue.list` does.

**How long a wake took (R7)** is read from the record with no new field: from the event that made
`when` true to the waiter's next `waits` event of that issue, which is its `remove` or the wait it
writes for the round (part 3). `issue-stats.ts` gains one line for it (task 5). It is timed for a condition on the issue's own
state, where that event is the issue's next move after the wait. A wait on `issue.after` or
`issue.children` is counted in the line and not timed: the event is another issue's, and the tool
has no CEL to find it with.

### 3. The tool and the briefs (R3, R6)

**`tools/cloud-brain/issue-wait.sh <token> <id> --when '<CEL>' [seconds] [--until <minutes>]`.**
At its first run for a key it writes the wait (`key` `<role of the token>/<id>/wait-<the issue's last seq>`,
`until` the minutes from now, 25 by default; a run that is repeated writes nothing new). Then it
reads `wakes?id=<id>` every 15 s for the seconds, 240 by default.

- Exit 0: the due entry, one line of JSON. The tool has then written what the waiter does next:
  with `--then-work` and an issue at `in-progress` or `spec`, a new wait
  `{ when: 'issue.state != "<that state>"', until: 60 minutes on, note: "at work on the round" }`;
  otherwise the `remove`.
- Exit 3: not due in the seconds. Run it again. With `--last`, the tool writes the `remove` before
  this exit: the waiter stops listening, and the queue stops saying it listens. Exit 5: the wait
  has ended (past `until`): report.
- Exit 2 and 64 as today. `--filter` and the three arguments of today (`<token> <id> <after seq>`)
  stay until task 3 has changed the brief, and are then removed.
- `--left` is short for the `when` of the state the issue is in at the first run.

**`agents/implementer.md`, step 13** runs `issue-wait.sh <token> <id> --left --then-work`. The rest
of the step stands: the Bash timeout, 5 runs, one round, the judgment at 3 `rework` moves. The
fifth run has `--last`. The two
cases "one line" and "a second line" go: the state is the condition.

**`agents/spec.md`, step 7** gains the same wait after `submit-spec`, with the same bounds: up to 5
runs, and one round taken by the writer itself ("A resumed round" from its first item). A spec
writer whose review comes after that reports as today.

**`issue.queue` (`bk-3`).** An entry of `queue` or `waiting` gains `waiter: { actor, holder, until }`
when the actor that started the issue (`issue.by.start`, or `issue.by.spec`) has a live wait on it.
No row of the two tables changes. `SKILL.md`, step 3, the row `round`: with `waiter`, nothing, the
round is that agent's; without, as today. The row `work` in `waiting`: with `waiter`, nothing.
Step 2, "A writer that waits", loses its inference and reads: a writer or a spec writer that waits
has a wait on its issue, and the queue says so.

This is a narrow lease: an agent says it listens, or is at work, until a time. A dead agent is
believed until that time, 25 minutes for a listener and 60 for a round. The row "A dead writer" of
`SKILL.md` then applies as it does today.

**`issue-watch.sh`** asks `wakes` with each read and prints `WAKE <id> <when>` once for each due
wait of its token. An orchestrating session that wants to look at an issue again when something is
true of it writes a wait (`issue-as.sh <token> wait '{…}'`) where it would have kept a note. The
row `owner` of the queue's `waiting` is not replaced by this: no fact says that the owner has
commented.

### 4. A held read, after a probe (R4)

`issue.wakes?id=<id>&seconds=<n>`, `n` 25 at most: with nothing due, the service waits 2 s, reads
the head (`S.head`, one row), and evaluates again when the seq has moved; it answers at the first
due entry or at `n` seconds with `due: []`. At most 13 reads of one row in a call. The 25 is
`issuesLimits.wakeSeconds`. It is no setting of the core: `config.set` is "the owner's own session"
(`brain-core.ojs`, the reference), and this design asks nothing of him. A caller that sends no
`seconds` is answered at once, as in part 2, so the held read is turned off by the tool not sending it.

The tool then asks every 25 s with a held call and learns of a wake within about 2 s, where it
learns within 15 s without. Against a review of 4.5 minutes that is small, and it is why this part
is last and apart: parts 1 to 3 do not need it.

Not tried: whether a call held 25 s passes the kernel and the core of cb4. Nothing deployed there
waits, and the fixture that does (`fx_chain` of `cloudflare-iac.ojs`, `?wait=`) is a test's. The
task's first act on cb4 after its deploy is that probe. When a held call is cut, the tool is
landed without `seconds` and the record says what cut it.

## What exists today for the same job, and why it is not extended

`agents/spec.md` gained this item while this spec was written (it came with the rebase of the
landing, 22:08 CEST). The design adds two methods and one field of a row. It adds no role, no
brief, no tool, no token, no Worker and no store: `ls .claude/skills/brain-maintenance/agents/`
(six briefs) and the Brain's list of roles (`curl -s https://cb4.endpointservices.workers.dev/static/cloud-brain-dev/index.md`:
`paper-summarizer` and `reviewer`) were read at 22:09 CEST, and none is a role that waits or wakes.
`ls tools/cloud-brain` has four tools of this kind, `issue-wait.sh`, `issue-watch.sh`, `lock.sh`
and `channel-wakes.ts`; the first two are changed and none is added.

| Added | What exists for the same job | Why that is not extended |
|---|---|---|
| `issue.wait`, the event `waits` | `issue.hold` of `bk-3` (specified, not built: `grep -c "issue.hold\|issueQueue" tools/cloud-brain/brain-issues.ojs` is 0): a time at which an issue is listed again, with a reason | A hold is of the issue, one at a time, ended by the issue's next move, and it has a time and no condition. A wait is of an actor, several an issue, and has a condition. One method for both would give `hold` an actor and a `when` it does not use, and `bk-3` is approved as it is. They share the shape `{ key, id, until, … }` and the guard's fallback |
| the same | the link `after` (`bk-1`, built) | It is the dependency, and `issue.after` of a `when` reads it. It names no one who listens |
| `issue.wakes` | `issue.sync` with `issue-wait.sh` over it | "Not chosen", the fourth |
| the same | `issue.queue` of `bk-3` | It answers what is next for an orchestrator, by rows in the service's code. It is extended, by `waiter` (part 3). A due wait is not a row of it: a writer would read every entry to find its own |
| the same | `topic.take` of `brain-x-topic` | "Not chosen", the third |
| `waits` of an issue's row | `issue.by.start`, the actor that started an issue | It says who may submit, and not whether that agent still runs. The orchestrator's inference of step 2 is made from it today |

## Not chosen

- **Rules in the policy**, a list `triggers` a workflow carries, each `{ on, when, wake }`. It is
  the nearest to "the way guards are data in the policy". Each rule would be the owner's install,
  and an install of the task workflow swaps every open issue on it and empties its `reviews`
  (`plan/cloud-brain-bookkeeping-in-the-tracker.md`, "Not chosen", counted 28 such issues). The
  conditions here are written by the agent that waits, with a token, and changed with no install.
  If he wants the rules to be his alone, this is the other design, and it is one choice for him.
- **An event `woke`, written by the service** in the call that made a condition true, as `finish`
  is. The record would then hold the moment of each wake. It costs a second event a wait, a key
  prefix of the service's own, a rule for `issue.verify` (was the wait there, was `when` true), and
  an evaluation of other issues' waits inside every write: the write of a part would load the waits
  of its parent and of each issue after it. `since` of part 2 gives the same moment from the row.
- **A topic.** The tracker appends each wake to a topic and the waiter takes from it. A take does
  not wait either ("a reader polls"), so the waiter still asks. The tracker would need `topic.append`
  in its `calls`, the waiter a token for `topic.take` (an agent's token names `issue.*` alone), and
  a wake would be in two stores. It becomes the design when a Worker has a `receive` method that
  starts an agent; `brain-x-fly` of `worker-machine-on-fly` is the candidate and is not built.
- **`issue.sync` with a filter and a held call**, and the condition left in the script. No new event.
  The condition is then code in a client and nothing in the record says who waits: R1 and R6 unmet.
- **Named conditions in place of CEL** (`review`, `free`, `closed`). Easier to list in a brief. A
  fourth condition is then a deploy, and the six of part 1 are already one line each with the
  engine the guards use.
- **A Durable Object that holds a socket** for each waiter, woken by the write. Under a second.
  The wrapper writes Durable Objects for the deployer's rows and for containers only, and the
  topics proposal kept it "for the day a reader needs to be woken in under a second". A review
  takes minutes.
- **The service ends a wait when the waiter next moves the issue.** No `remove` to write. A wait
  would then end by an act that is not about it, and the wait a writer holds for its round would
  end at a comment. The tool writes the `remove`.
- **A longer cap in the brief and nothing else.** 2 of 56 reviews came after the cap. It mends
  those two and leaves the spec writer, the inference of step 2 and the 134,000-byte reads.

## How each requirement is known to be met

`ia` is `tools/cloud-brain/issue-as.sh <own token>`. Every command is one an agent of the loop runs
with its own token. "Today" was run on 2026-10-12 between 21:56 and 21:58 CEST with `spec-472002`.
An "After" on cb4 cannot be run before its task is deployed: it is run then, by the task's writer
in step 11 of its brief, and the table says which task. Each such row says what is seen and has no
count that a run would have to match.

| | Command | Today | After |
|---|---|---|---|
| R1 | `ia wait '{"key":"…","id":"<id>","when":"issue.state != \"spec\"","until":1}'` | 501 `MethodNotImplemented` `com.lopecode.brain.issue.wait` (run on this issue; nothing written) | tr-1: 400 for an `until` in the past; with a time 10 minutes on, 200 on an issue `test-tr-1-a` the writer opens, and `ia "get?id=test-tr-1-a"` has the wait in `issue.waits` with `holder` the writer's token |
| R1 | `ia "verify?guards=true"` | `ok: true`, 4617 checked | tr-1: `ok: true` after the first `waits` event on cb4, and after tr-4 |
| R2 | `ia wait` with `when` `issue.nope == 1`, and with `caller.kind == "owner"` | 501 | tr-1: 400 for each, naming `when` |
| R2 | `ia "wakes?id=test-tr-1-a"` | 501 `MethodNotImplemented` `com.lopecode.brain.issue.wakes` | tr-1: with `when` `issue.state != "open"` the wait is in `waiting`; after the writer's `triage` move of that issue it is in `due`, with `issue.state` `triaged`. A wait written after the move, with the same `when`, is in `due` at the first read |
| R2 | the same, with `when` `issue.after.open == 0` on `test-tr-1-a` after a link `after` to `test-tr-1-b` | 501 | tr-1: `waiting` while b is open, `due` after `close` of b. Both issues closed after |
| R3 | `grep -c "issue-wait.sh" .claude/skills/brain-maintenance/agents/spec.md` | 0 | 1 with one line of the wait in the file (run 21:57 CEST with a draft line, then taken back). The task's count is the lines it writes that name the tool |
| R3 | `bun test ./tests/tools/issue-wait.test.ts` | 13 pass, 0 fail | tr-2: passes with tests of `--when` against a stand-in for `issue-as.sh`: exit 0 with the due entry and the `remove` sent, `--then-work` with the second wait sent, exit 3, exit 3 with `--last` and the `remove` sent, exit 5 |
| R4 | `/usr/bin/time -p` of one read a waiter makes, and its bytes | `sync?after=4538`, 79 events behind: 0.36 to 0.51 s, about 134,000 bytes | tr-2: `wakes?id=<id>` with one wait: the time and the bytes, in the task's record. Not run: the method is not there |
| R5 | `ia "sync?after=<seq before>"` after the `close` of `test-tr-1-b` above | not run: the two test issues and their wait are tr-1's to make | tr-1: the events after that seq are the writer's own; none has `by.caller` `worker:brain-x-issues` and none has `auto` |
| R6 | `ia "queue"`, the entry of an issue whose starter waits | 501 (`bk-3` is not built) | tr-3, in the module's rig: an issue at `in-progress` after a `rework`, whose starter has a live wait, is a `round` with `waiter`; past `until` it has none. On cb4: the entry of the task's own issue while its writer waits for the review, read by the reviewer |
| R7 | `bun tools/cloud-brain/issue-stats.ts --token=<own token>`, the line of wakes | no such line | tr-5: a line `wakes <n> median <s> s`, from the `waits` events of the record |
| part 4 | `/usr/bin/time -p ia "wakes?id=<id>&seconds=25"` with a wait that is not due | 501 | tr-4: about 25 s and 200 with `due: []`; and with the condition made true by a second shell 5 s in, an answer under 10 s. A call that is cut before 25 s: the tool sends no `seconds` and the record says what cut it |

## The tasks, in the order they land

Each seed task is labeled `major`: it changes a method other callers use.

1. **tr-1-wait-in-the-record.** Parts 1 and 2: `issue.wait`, the event `waits`, `waits` in the row
   and the three reads, the type in `issueReplay`, `issueWakes`, `issue.wakes` with no `seconds`,
   the method reference in the seed's prose. Tests of each refusal, of each row of the table of
   conditions, of a wait written after its condition, and of `issue.verify?guards=true` over a
   record with waits. A deploy of `brain-x-issues`. After `bk-3-queue-and-hold` (the same seed).
2. **tr-2-issue-wait-over-wakes.** `issue-wait.sh` with `--when`, `--left`, `--then-work`, and
   `issue-watch.sh` with its `WAKE` line; their tests. No deploy. After tr-1.
3. **tr-3-briefs-and-queue.** `waiter` in `issueQueue` (a deploy, `major`), step 13 of
   `agents/implementer.md`, step 7 of `agents/spec.md`, steps 2 and 3 of `SKILL.md`; the three
   arguments of the old wait removed from the tool. After tr-2 and after `bk-6-skill-watch-and-stats`,
   which rewrites step 3.
4. **tr-4-held-read.** Part 4, `major`: `seconds`, the probe on cb4, the tool's use of it. After
   tr-2. It may end with the tool as tr-2 left it and a record of why.
5. **tr-5-read-after-three-days.** A record, and the line in `issue-stats.ts`: the waits written,
   by role; how long each wake took; the rounds a spec writer took itself and the tokens each wrote
   to the cache, against the 138,141 and 28,838 above; each round the orchestrator sent while a
   wait was live. After tr-3, and held with `issue.hold` for three days.

`os-5-trial-read` reads the same rounds for a writer. It is not changed here: when it is read, the
writer's wait is this one.

## What only the owner can do

- Approve this spec. The comment for his approval says that it has no install, no token and no
  rule for him, and one choice he may want the other way: rules in the policy, which are his alone
  to change, in place of waits a token writes ("Not chosen", the first).
- Approve each of tr-1, tr-3 and tr-4 after its review, as for any `major` task.

No deploy of the kernel, the core, the database or the deployer. No `issue.install` and no
`issue.rebuild`: a row written before the deploy has no `waits` and is read as having none. No
line of `rules.md` changes.

## What the orchestrator makes

Nothing. Every call of this design is `issue.*`, which each agent's token already names.

## Not tried, not known

- A held call through the kernel and the core (part 4).
- Whether `decide` answers an error for every name that is not in scope, as its `catch` suggests.
  Read, not run: tr-1's test of `caller.kind == "owner"` as a `when` finds out.
- The time `issue.wakes` takes with no `id` on cb4: it loads every row, 381 today.
- Whether a writer whose wait says "at work" for 60 minutes is ever sent its own round by an
  orchestrator after that hour. The longest stretch from a `rework` or a `respec` to the next submit in the
  record is 60.8 minutes (n=72, 85th percentile 15.5).
- What the page's panel shows of `waits`: not looked at.
- The topic methods were not called: `issue-as.sh` sends `issue.*` alone, and this writer does not
  read the token file to call another.
- How many of the 19 spec rounds a waiting spec writer would have taken. The median verdict came in
  3.2 minutes and the 90th percentile in 9.2, inside 5 runs; which of the 19 were which was not counted.

## What misled the writer of this spec

- The issue's body says "The tracker has `issue.sync` with a wait". The `wait` of its answer is
  the pause the page takes between two asks. No call of the tracker waits.
- The body's second example gives the submit-to-pass time as the time a writer is held "doing
  nothing". Most of it is the review itself; the part a trigger could remove is 0.3 minutes at the median.
- `cost` events were written after the runs they describe, 100 of them backfilled, so a run cannot
  be dated by its event's seq. The first count of "runs since os-4" here was wrong for that reason
  (90 at `in-review`); a run is dated by the submit its `event` names.
- The brief changed under the writing: the item of step 5 on what exists for the same job landed
  between the read of the brief (21:45 CEST) and the landing, and was seen only in the list of files
  the rebase printed. The section above was written after the first push (`8bf41ee9`), before the submit.
- `agents/spec.md` step 2 expects parts, and step 5 a line for each gathered report. A feature of
  the owner's is given with none. The bookkeeping spec said the same.
- The brief of a spec writer has no line on `issue-as.sh` sending `issue.*` only, so a probe of
  another service's method with the agent's token is not possible, though step 5 asks that a token
  the design needs be weighed.

## The fresh review before submitting (2026-10-12, answered by 22:05 CEST)

One agent with the file and nothing else (`/review-notebook`): FIX, 8 findings (2 confirmed, 6
plausible), all taken. It ran the four `grep -c` counts and the three test commands again and they
held; it had no token and read nothing from the tracker.

- The held read was to be turned off with `config.set`, which is the owner's own session, while
  the spec said nothing was asked of him: the bound is now a limit of the seed, and the tool turns
  the held read off by not sending `seconds`.
- `when` was evaluated at the write, which does not load what `issue.after` reads: the write now
  loads them.
- R7 named "the event that made `when` true" with no way to find it for a wait on another issue:
  such a wait is counted and not timed.
- n=285 beside "245 submits": it is 241 submits and 44 spec submits, now said.
- A writer that gave up after its fifth run left a live wait: `--last` writes the `remove`.
- "4,478 events of the 4,538" read as the count left out: reworded.
- The fallback guard was quoted without its second half: quoted whole.
- The three `resumed` runs printed were not accounted for: named.
