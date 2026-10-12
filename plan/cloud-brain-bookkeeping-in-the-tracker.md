# Cloud Brain: the loop's bookkeeping in the tracker: an order as a link, what is next from a queue, a project finished by the service

Spec of the feature `bookkeeping-in-the-tracker` on cb4's tracker. Written 2026-10-12, begun 12:20
CEST (the `spec` move, event 3987), from `lopecode-dev` `5fe4ef8f` and the tracker at event 3990.
Round 1. Nothing here is built.

Three findings change what the issue asks for, and they come first:

- **Leaving feedback parts out of `issue.children.open` in the code breaks the record's check.**
  One past move, `decompose` of `worktree-per-topic` at event 3740, passed its guard
  (`issue.children.open > 0`) with three open parts that were all feedback. Judged again with
  feedback left out it is refused, and `issue.verify?guards=true` fails there. So part 4 of the
  issue is a new fact and a changed guard, and a guard is installed by the owner.
- **Nothing else here needs an install.** The order, the queue, the hold on a time and the finish
  made by the service are a deploy of `brain-x-issues`, which the loop makes.
- **A finish made under the Worker's own name is refused by the policy in force.** The guard of
  `finish` reads `caller.kind in ["owner", "token"] && issue.children.open == 0`. The service makes the move inside the call
  that ended the last part, as that call's caller, the way `issue.install` writes the swaps of a
  migration.

## What was asked

The owner, 2026-10-12, in chat, as the issue's body quotes him:

> Please file a ticket to move book keeping into the issue tracker as U suggested, the the goal of reducing cognitive burden of orchistrator

and before it, the same day:

> I think we need to let the orchistrators perhaps decide on prioritization, like task foo should be done after task bar. But otherwise what gets pulled from the queue next should be decided by code. The orchistrators can delay doing a task by last minute putting it after another task( or closing it), but the items are streamed to it, and the book keeping is in the issue service.

The six items under "What is asked" in the body are the orchestrating session's proposal to him.
His words give four things: an order between two tasks is the orchestrator's to set; what is next
is decided by code; the items are streamed; the bookkeeping is in the service.

## The reports gathered

The feature has no parts: `ia "list?parent=bookkeeping-in-the-tracker"` answered `{"issues":[]}`
before the `spec` move of 12:20 CEST. Its body carries six observations. Each was measured again here (next section).

| Observation of the body | What it becomes |
|---|---|
| 1. A hold is prose, and nothing reads it again | R1, R3 |
| 2. The order of a spec's tasks is not in the record | R1, R6 |
| 3. `finish` is a move someone has to make | R2 |
| 4. A feedback note that is a part keeps its project open | R4 |
| 5. A hold on a count | R5 |
| 6. When a task is free the loop is not slow | Left out: nothing to change. It is why this spec adds no pool rule and no timer |

`plan/cloud-brain-loop-order-of-service.md`, part 4, left this for later on 2026-10-11: "A link
that says one issue waits for another would let the tracker answer this itself. It is a change to
`brain-issues.ojs` and the policy, and is not in this design."

## Requirements

- **R1.** That an issue comes after another is a link in the record, written by whoever may link.
- **R2.** A project with no part that holds it is moved to `done` by the service, in the call that
  ended the last part.
- **R3.** One read answers what is next, in order, and what waits and for what. The order is
  computed by the service from the record.
- **R4.** An open feedback issue does not hold its parent project at `building`.
- **R5.** A wait that is not for another issue has a time, in the record, at which the issue is
  listed again.
- **R6.** Step 3 of `SKILL.md` is the queue's read and what a session does for each kind of entry.
  The order of a spec's tasks is written as links when the project is decomposed.
- **R7.** New arrivals in the queue are printed to the orchestrator by its watch.

## What exists today, measured

The record was read whole on 2026-10-12 at 12:21 CEST: `sync?after=` to event 3990, `snapshot` and
`policy`, with the token `spec-8717a9`. `issue-stats.ts` is the kept tool. A number that is not on
a line it prints is from one of two scripts of this writing, `measure.py` and `replay.py`. They
are attachments of the issue (events 4016 and 4017; `ia "attachment?id=bookkeeping-in-the-tracker&name=replay.py"`),
and each reads a directory that holds the answers of `snapshot` and of `sync?after=`. The
paragraph says what the script did.

`bun tools/cloud-brain/issue-stats.ts --token=spec-8717a9`, from the main checkout, 12:21 CEST:

```
record         3990 events, 339 issues
states         {"done":172,"rejected":22,"closed":70,"open":34,"building":11,"triaged":20,"ready":6,"awaiting-approval":3,"spec":1}
  triaged            183 stays  median    0.5 min  total 371.4 h  max 19.8 h
  ready              160 stays  median    2.8 min  total  51.6 h  max 17.7 h
  building            10 stays  median  143.7 min  total    57 h  max 15.7 h
past 4 h, not started, no reason: 0 (16 more are held)
```

### Holds

The script took each issue that is not feedback and is at `open`, `triaged` or `ready`, and read
its last move reason or `held:` comment for the id of another issue.

```
rows 28 held-in-words 20 of them naming an issue 17 of them every named issue closed 4
```

- 13 of the 20 wait for one open issue and nothing else. Each is one link:
  `tp-4-docs` after `tp-3-take-and-done`; `cu-2-usage-service` after
  `cu-1-deployer-gains-billing-read`; `cu-3` after `cu-2`; `cu-4` after `cu-3`;
  `fly-2-image-and-run-sh` and `fly-3-brain-fly-service` after `fly-1-by-hand`; `fly-4-loop-files`
  after `fly-3`; `fly-4b-first-run` after `fly-4`; `fly-5-docs` and `fly-6-after-seven-days` after
  `fly-4b`; `wt-5-docs` after `wt-4-reviewer-in-a-view`; `wt-6-check-after-a-day` after `wt-5`;
  `ta-1c-parent-revoke-on-cb4` after `ta-6-checks-after-three-issues`.
- 5 wait for the owner's act and say so in words, 3 of them without the label `needs-owner`:
  `cu-1-deployer-gains-billing-read`, `ds-ingestion-tail-to-analytics-engine`, and `fly-4b-first-run`
  once it is free.
- 4 wait for a count or a time: `dv-5-read-first-20-runs` (20 deploy runs), `os-5-trial-read` (five
  rounds), and after their link ends `fly-6` (7 days) and `wt-6` (one day of the loop).
- The three the body names (`ta-5-outside-session-doc`, `ds-4-panels-from-a-template`,
  `skill-md-447-lacks-the-two-leaves`) were moved to `ready` by the session that filed this issue,
  each with the reason "Late by 13 hours", "by 16 hours", "by 8 hours". `ta-6-checks-after-three-issues`
  went with them: its count was met at 37 starts and no pass read it.

This answers the first "Not known" of the body. Of the tasks of `worker-machine-on-fly`,
`cloudflare-usage-read` and `topics-service`, 12 were at `triaged` at event 3990 (the body counted
13 two hours before; `tp-3-take-and-done` has gone to `ready` since). Two are roots and the
owner's, `fly-1-by-hand` and `cu-1-deployer-gains-billing-read`. `fly-2` to `fly-6` (six) are
behind the first and `cu-2` to `cu-4` (three) behind the second. `tp-4` is behind `tp-3`. None of
the 12 can be started by the loop today.

### Finishes

For each `finish` move, the minutes since its last part ended:

```
brain-docs-entered-by-hand            seq 2075   0.7 min
locks-held-in-the-cluster             seq 2122   1.1 min
record-checked-by-review-alone        seq 2247   0.0 min
i1842                                 seq 2336   0.5 min
owner-acts-on-what-waits-for-him      seq 3409   0.0 min
ai-tomarkdown-pass-through            seq 3627   0.4 min
flow-metrics                          seq 3694   0.7 min
run-cost-is-part-of-the-issue-model   seq 3963   512.0 min
texts-not-read-again-after-a-change   seq 3964   829.5 min
paper-summarizer-persona              seq 3965   235.5 min
```

The last three were made in the three events after this issue was opened (3962). Seven of ten were
made within 1.1 minutes: the move is not hard, it is forgotten when the session is elsewhere.

### Feedback parts

Of the 11 projects at `building`, `group-invites` has one open part and it is feedback
(`fb-a24kt7jw3q`, an annotation of the owner's); its two tasks are `done`.
`ia "get?id=group-invites"` at 12:26 CEST: `building`. Six open feedback issues are parts of a
project at `building` (`group-invites` 1, `dashboard-service` 1, `record-names-token-not-agent` 1,
`worktree-per-topic` 3). The overseer closes a feedback issue "when every issue it is tied to is at
`done` or `closed`" (`SKILL.md`, step 3), and the project is not `done` while the part is open:
each waits for the other.

### What the guards read, and what leaving feedback out would do

`issue.children.open` is made in the code (`facts` in `issueAllowed`): the issues whose `parent`
this is and that are not closed. `issue.verify?guards=true` judges every event again with the code
that runs now. The second script replayed the 590 moves whose guard reads it (`ready` 165, `start`
171, `submit` 223, `decompose` 21, `finish` 10) with feedback parts left out:

```
moves whose guard reads children.open: 590 ; verdict would differ with feedback parts left out: [(3740, 'worktree-per-topic', 'decompose', 3, 0)]
```

`ia "verify?guards=true"` at 12:26 CEST: `{"ok":true,"seq":3997,…,"checked":3997,"guards":true}`.
With the meaning of `.open` changed it would answer `ok: false` at 3740.

The policy in force is the one of event 483, the same as the cell `issuesDefaultPolicy`. In it
`finish` reads `caller.kind in ["owner", "token"] && issue.children.open == 0`, and so does every
move that closes an issue or ends a part but `pass` and `to-approval` (the reviewer's, by a token)
and `approve`, `owner-reject` and `revert` (`caller.present`). `start` from `ready` is open to any
caller. Of the 3990 events, 12 are of issues this token may not read; `by.caller` of the other
3978: `owner` 3974, `worker:brain-x-snapshot` 2,
`worker:brain-x-issues` 1 (the default policy), `deployer` 1.

### Step 3

`awk` over `SKILL.md` from "3. **List the open issues" to "4. **Spawn": 45 lines, 9,994 bytes, a
table of 20 rows. The order is one paragraph above it.

### The service's tests

`bun test.ts brain-x-issues` in the worktree's `cloud-brain-dev`, between 12:26 and 12:30 CEST:
`"hash":"d53d1c8d…","passed":36,"failed":0,"needsBrowser":15`.

## Read

- **The Brain, 12:21 CEST, four searches** with `loop-knowledge` (`knowledge.search?semantic=true`):
  "issue tracker queue order dependencies between tasks blocked by", "work queue priority
  scheduling dependency graph ready set", "orchestrator cognitive load multi-agent task
  allocation", "service finishes project when all parts closed automatic state transition".
  Used: `doc:cloud-brain-loop-order-of-service` (score 1 and 0.84), read whole: the order of a free
  place, the label `owner`, past 4 hours, and the sentence quoted above that left the link for
  later. `doc:cloud-brain-flow-metrics` and `doc:cloud-brain-issues` for how `issueFlow` reads the
  names of states and for the policy. Not used: `module:tomlarkworthy:dijkstra`,
  `module:tomlarkworthy:flow-queue` (a cell's computation as a promise), and the papers of the third
  search (AgentFactory, EvoAgent, MemoHarness: titles only).
- **`tools/cloud-brain/brain-issues.ojs`**, read: the prose cells, `issuesDefaultPolicy`,
  `issueApply`, `issueAllowed`, `issueEvent`, `issueReplay`, `issueAct`, `issuesApp`.
- **Outside, in a search summary only; no page was read.** Two searches. Beads (`bd`), an issue
  tracker for coding agents: four kinds of dependency, of which only `blocks` holds work back, and
  `bd ready` lists the open issues with no open blocker; it has a command that finds a ring
  (https://beads.gascity.com/, https://github.com/steveyegge/beads). Taskwarrior: `depends:` puts a
  task on the `blocked` report, and a `wait` date hides a task until that date
  (https://taskwarrior.org/docs/using_dates/, https://taskwarrior.org/docs/report/). Used for three
  choices: one kind of link that orders and the others that do not; a ring refused at the write; a
  date for a wait that is not for a task. Neither system was run.

## The design

Four changes to `brain-issues.ojs`, one policy, three texts and two tools.

### 1. The link `after` (R1)

`issue.link { key, id, to, rel: "after" }`: issue `id` comes after issue `to`. `remove: true` takes
it off. It is kept as `duplicate`, `cause` and `related` are: `links` on the one, `linked` on the
other, between two issues read by the same rule. The guard is the workflow's `link`, which a token
passes today.

Refused at the write, 403:

- a ring: `to` is after `id`, through any number of `after` links;
- `to` is what `id` is part of, however far up: the parent waits for its part.

The walk reads at most 50 issues and refuses past that.

An issue **waits** while an issue it is after is not closed (`closed` of the view: `done`, `closed`,
`rejected` or `reverted`, by its workflow). Nothing is written when the wait ends: it is read at
each call of the queue. A task that is `done` and then reverted makes its followers wait again
only if the revert leaves it not closed; `reverted` is closed.

**Not enforced.** No guard reads the link. `issue.move` to `in-progress` of an issue that waits is
allowed, as it is today for one held in prose. The link gives an order and no refusal, as the
label `owner` gives precedence and no authority. A guard would be `issue.after.open == 0` on
`start`, with a new fact and an install that swaps every open task; it is under "Not chosen".

### 2. A hold until a time (R5)

`issue.hold { key, id, until, reason }`: `until` is milliseconds since 1970, after the call and at
most 30 days after it; `reason`, required, says what to read when the issue comes back.
`{ key, id, remove: true }` takes it off. The event is `held`; the issue's row has
`hold: { until, reason, seq }`. Guard: the workflow's `hold`, and `label` where a workflow has none
(as `attach` falls to `comment`). No guard reads the hold. `held` joins the table of event types
in `issueReplay`, which answers "no such type of event" for one it does not have, and
`issue.verify?guards=true` would fail at the first hold without it.

Until `until` the issue is in `waiting`. After it the issue is in the queue again, as `look`, with
its reason. A hold ends at `remove` or at the issue's next move (`issueApply` takes `hold` off the
row at a `moved` event), so an issue that was started is not a `look`. The time is judged against the Worker's clock at the read; a Worker has no timer and
none is added.

(As built, `bk-3-queue-and-hold`, 2026-10-12: `until` is held to the Worker's clock in the call, 400 before the
issue is looked for, and `issue.verify?guards=true` does not judge it again; a swap leaves a hold, a move alone
takes it off; a hold whose time has passed makes a `look` only of an issue no row of `waiting` holds; a closed
issue can be given one; the record.)

This is the answer to part 5 of the issue: a time, not "no such holds". A writer spawned to find
that 20 runs do not exist yet is 167,000 tokens at the least (`philosophy.md`, line 5). A count
is read by the orchestrator when the time comes, with the command the reason names, and it starts
the task or holds it again.

### 3. The queue (R3)

`issue.queue?limit=200`, a query, allowed as `issue.list` is. It answers what one cell makes of the
view, `issueQueue(view, by, now)`, with no I/O of its own:

```
{ seq, now,
  queue:   [{ id, do, kind, state, title, labels, for, since, late, hold }],
  waiting: [{ id, kind, state, why, on, until }] }
```

`do` is what the entry wants. The names of states and moves are read as the record has them, as
`issueFlow` reads them. An issue is tested against the rows of `waiting` first, in their order; one
that none of them holds is tested against the rows of `do`, in the order of this table, and has the
first that matches. So "waits for nothing" below is: no row of `waiting` holds it.

| `do` | The issue is | Group |
|---|---|---|
| `round` | at `in-progress` and its last move is `rework`; at `spec` and its last move is `respec` or `send-back` | 1 |
| `review` | at `in-review` or `spec-review` with no review since it came there | 2 |
| `triage` | on the task workflow, at `open` | 3 |
| `ready` | at `triaged` and waits for nothing | 3 |
| `decompose` | at `approved` | 3 |
| `finish` | at `building`, and the guard of `finish` passes for this caller (part 4 did not make it) | 3 |
| `promote` | on the feedback workflow, at `open`, the owner's, with no parent and no link either way (As built, `owners-feedback-held-by-related-links`, 2026-10-12: the owner's, with no tie or with each tie at `done` or `closed`, where a `related` link whose other end is a feedback issue at `open` is no tie; the record.) | 3 |
| `look` | a hold whose time has passed; `in-review` or `spec-review` with a review and no move after it; a state no row names. Tested before every other row of this table | 3 |
| `start` | at `ready` and waits for nothing | 4 |
| `spec` | a project or feature at `open`, the owner's or with three parts or more | 4 |

The groups are in the order of `SKILL.md` since `os-2-order-and-pool`: a round sent back, a review,
the orchestrator's own acts, a start. Inside groups 1 to 3 the oldest `since` is first. Inside
group 4: `for` `owner` first; then `late`; then `start` before `spec`; then the oldest `opened_at`.
`for` is `owner` when the opener is the owner's session or the issue has the label `owner` or
`annotation`, as `for` of `issue.flow`. `since` is the time of the issue's last move, and `late` is
true when that is 4 hours or more before `now`.

`waiting`, with one `why` an issue, the first that holds:

| `why` | The issue |
|---|---|
| `owner` | has the label `needs-owner` and is not at `in-progress`, `in-review`, `spec` or `spec-review`; or is at `awaiting-approval`; or is on the security workflow |
| `until` | has a hold whose time has not come; `until` is the time |
| `after` | is after an issue that is not closed; `on` lists those |
| `parts` | is on the task workflow at `open`, `triaged` or `ready` with an open part, or is a project at `building` whose `finish` guard refuses; `on` lists the open parts |
| `work` | is at `in-progress` or `spec` and its last move is not one of `round`'s: an agent has it, or had |
| `gathering` | is a project at `open` that is not the owner's and has fewer than three parts |

An open issue on the feedback workflow that is not a `promote` is in neither list, and `waiting`
is every other issue that is not closed and not in `queue`. A feedback issue that was promoted is
on the task workflow and is listed as a task. An issue the caller may not
read is in neither.

(As built, `bk-3-queue-and-hold`, 2026-10-12, each in the record. The row `after` does not hold an issue at
`in-progress`, `in-review`, `spec` or `spec-review`, as the row `owner` does not: review 4032, and the body of
the task. An issue on the feedback workflow is tested against the rows of `waiting` and for a hold whose time has
passed as any other is, so one with the label `needs-owner` is in `waiting` and one that was held comes back as a
`look`; it is in neither list when none of those and no `promote`. "On the task workflow" is read by the hash the
policy in force names for the kind, so an issue left on a workflow no policy names any more, at `open`, is the
"state no row names". `for` reads the row's `opener` and the two labels, and not whether the owner's call came
from a tab, which the row does not keep. `limit` cuts `queue` alone and the answer has `more`. A row of
`waiting` has no `since`.)

**The last move.** The row of an issue has no time of its last move and no name of it. `issueApply`
gains `last: { move, at }`, set by a `moved` event and by a swap the workflow lists, and left by a
swap of an install's `migrate`. A row written before the deploy has none until its issue moves: for
those the method reads the issue's events (`S.of`), so no `issue.rebuild` is needed.

**What the record does not know** is which agents run. `round`, `review` and `work` are of the
record: the orchestrator sets them beside the agents it has (step 2 of `SKILL.md`). A lease of an
issue by an agent would close that; it is not in this design.

### 4. A finish made by the service (R2)

`issuesLimits.auto` is `["finish"]`. After `append` has written an event of an issue, it looks at
the issue's parent as it was before the event and as it is after. For each, when the parent's
workflow has a move named in `auto` from the parent's state, and `issueAllowed` lets this call's
caller make it, the service appends that move in the same call:

```
key     auto/<seq of the event that caused it>/<parent id>
by      this call's caller, as the core named it
reason  no part holds it after event <seq>
auto    <seq>
```

`auto` is a field of the event and is in its hash. A key that starts `auto/` is the service's and
is refused to a caller, as `policy/` is. `issue.by.finish` is then the actor of the call that ended
the last part: a reviewer's `pass`, the owner's `approve`. The event says so with `auto`, and
nothing reads `issue.by.finish`.

`issue.verify?guards=true` judges the event as any move of that caller: it checks that the move was
allowed, not that it was due. The move a session makes by hand stays allowed.

When the second write fails (the Worker ends between the two, or six writers race), the project
stays at `building`, and the queue lists it as `finish` at its next read. That entry is also how
the projects that are due on the day of the deploy are finished: no event of theirs is coming.

(As built, `bk-2-finish-by-the-service`, 2026-10-12: the service also looks at the issue of the event itself, which
is what part 5 says of "the first event of `group-invites`"; it asks the guard with the reason above and with none,
and makes the move only when both pass, so a `finish` that wants a reason is not made; a move it made is looked at
in turn, 20 deep at most; the write's answer names what was made, `auto: [{ id, seq, move }]`; the record.)

**Who wakes.** A follower that becomes free is a property of the read and needs no one awake. A
finish needs the call that ended the last part and no session. The third "Not known" of the body
(the session asleep, 53 minutes with no event) is mended for those two and for nothing else.

### 5. Feedback does not hold a project (R4)

`facts` gains `issue.children.work`: the open parts that are not on the workflow the policy in
force names for the kind `feedback`. A feedback issue that was promoted is on the task workflow
and counts. `issue.children.open` and `.total` are as they were, so every event of the record is
judged as it was.

`issuesDefaultPolicy`, the workflow `project`: `decompose` reads `issue.children.work > 0` and
`finish` reads `issue.children.work == 0`. No other workflow changes. On cb4 this is an install by
the owner with a `migrate` of the project workflow (`39d9f385…`) to the new one: one swap for each
open project or feature, 13 at event 4008 on 2026-10-12 (11 `building`, 1 `awaiting-approval`, 1 `spec`;
`snapshot`, counted by workflow). A swap
empties `issue.reviews`, so the install is made when no project is at `spec-review`.

Until the install, parts 1 to 4 work and a feedback part still holds its project. After it, the
first event of `group-invites` or of its parts makes the finish, or the queue lists it.

(As built, `bk-4-install-the-project-workflow`, 2026-10-12: the body is `plan/cloud-brain-issues-policy-v4.json`. It
is made from the policy in force that day, the one of event 4668, and not from the cell alone, so the two `approve`
guards of that install stay; its `migrate` names `9011113c…`, the hash of the project workflow since event 4668, where
`39d9f385…` was. In the rig the swap of `group-invites` is that first event: the finish is made in the install's own
call, as the owner present, and the queue has no `finish` to list. Not installed on cb4 when this was written; the
record.)

The overseer then closes the feedback issue as it does today: its tie is `done`. (As built,
`owners-feedback-held-by-related-links`, 2026-10-12: one that is the owner's is then a `promote` of the queue, the
orchestrator's to promote or to close; the record.)

### 6. The texts and the tools (R6, R7)

**`SKILL.md`, step 3.** The paragraph of the order and the table of 20 rows become the read of the
queue and two tables. This draft was put in the file, counted and taken out again (12:32 CEST);
the task's writer finishes its wording and moves the rows named "below the table" (a dead writer,
a submit made for a writer, a quick win sent back, the judgment at 3 reworks, `needs-owner`) under
it as they stand.

```
3. **Read the queue and take its entries in order.** `issue-as.sh <your token> "queue"` answers `queue`, what the
   record says is next, and `waiting`, what is not next and why. The order is the service's (`issueQueue` of
   `brain-issues.ojs`): a round that was sent back, a review that waits, your own acts, a start; among starts the
   owner's, then one past 4 hours, then a bug or a task before a project or a feature, then the oldest. You do not
   order anything. Your two levers: `issue-as.sh <your token> link '{"key":"…","id":"<id>","to":"<other>","rel":"after"}'`
   puts an issue after another, and `close` ends one. A wait that is not for an issue is a time:
   `issue-as.sh <your token> hold '{"key":"…","id":"<id>","until":<ms>,"reason":"<what to read when it comes back>"}'`.
   The record does not know which agents run: skip an entry an agent of yours is on (step 2).

   | `do` | Do |
   |---|---|
   | `round` | Send the round to the agent that started it; a spec's to its spec writer. When it cannot be sent one: "A dead writer", below the table. At 3 `rework` moves you judge first. |
   | `review` | Spawn the reviewer. |
   | `triage` | Triage it yourself, or take it as a quick win. A digest opened by `worker:brain-x-snapshot`: "The daily digest". |
   | `ready` | Move it to `ready`. |
   | `decompose` | Open each task the spec lists, with `parent` the project and the labels the spec gives it, `triage` and `ready` each, write one `after` link for each "after" the spec gives a task, and move the project to `building`. Close each gathered report that is still open. |
   | `finish` | Move it to `done`. The service makes this move in the call that ends the last part; an entry here is one it did not make. |
   | `promote` | A feedback issue of the owner's with no tie. When it asks for a change, `promote` it and triage it. (As built, `owners-feedback-held-by-related-links`, 2026-10-12: or with each tie at `done` or `closed`; then it is promoted when none of that work made the change, and closed when one did; the record.) |
   | `look` | A hold whose time has come, or a state the service has no row for. Read it, then start it, hold it again, or comment and label `needs-owner`. |
   | `start` | Spawn the implementer; with the label `digest`, the digest writer. |
   | `spec` | Spawn the spec writer. |

   | In `waiting`, `why` | Do |
   |---|---|
   | `owner` | Read it again each pass: `awaiting-approval` on his word, `needs-owner` when he has answered. |
   | `work`, and no agent of yours is on it | "A dead writer", "A submit made for a writer" or "A quick win of your own, sent back". |
   | `after`, `until`, `parts`, `gathering` | Nothing. The service lists it in `queue` when the wait ends. |
```

Step 1's "Past 4 hours" reads `late` of the queue. The `held:` comment is no longer written: a
wait is a link, a hold or the label `needs-owner`.

(As built, `bk-6-skill-watch-and-stats`, 2026-10-13: the two tables are in the file as drafted here, with the wording
finished. Under them is a third, of 13 rows: the rows of the old table that the two name or that the queue does not
read, as they stood. Five are the ones this part lists. Four were added to the old table after this draft, or added to (the approver at
`awaiting-approval`, the label `asks-orchestrator`, the two of a post mortem). Four have text the draft's rows name
and do not carry (a spec sent back, a digest at `open`, the owner's feedback, "Anything else"). The old row for a
digest at `ready` is in the row `start`. The count of R6 is 26 where the draft gave 13, and the step is longer than it was; the record.)

**`agents/spec.md`, step 5.** "the tasks, in the order they land" gains: each task names the tasks
it is after, by id; a task that names none can be started at once.

**`tools/cloud-brain/issue-watch.sh`.** At each read it also asks `queue` and prints one line,
`QUEUE <do> <id> <for> <title>`, for an entry whose id and `do` it has not printed since the entry
was last absent. It keeps the line for an event made with the owner's session. The lines for an
open and a submit go: `triage` and `review` are those. At its start it prints the whole queue.

(As built, `bk-6-skill-watch-and-stats`, 2026-10-13: "last absent" is absent from the answer before, which is all the
script keeps, in a file of its own for one run. The two lines landed after this spec stay too: the label
`asks-orchestrator` and a comment of an `out-` token. `issue-watch.sh --queue <file>` reads one answer from stdin, for
the test. A watch that is armed again prints the whole queue again; the record.)

**`tools/cloud-brain/issue-stats.ts`.** The line `past 4 h, not started, no reason` counts the
`late` entries of `queue` whose `do` is `start`, `spec`, `triage` or `ready`; `(<m> more are held)`
counts `waiting` with `why` `after` or `until`.

(As built, `bk-6-skill-watch-and-stats`, 2026-10-13: the tool asks `queue` once and reads the record for this line no
more, so `--idle`, `--until` and `--after` do not reach it, and with no answer it prints `not read:` and why. The mark
`held` in the list of the idle is the same entries of `waiting`. A `held:` comment is still read for one thing, a
feedback issue the overseer keeps (`agents/overseer.md`), which is in neither list of the queue; the record.)

**The method reference** is the prose of the seed, with each seed task. `knowledge/` has one line
for `issue.queue` in the shape's list (`working-with-cloud-brain-remote-lopecode-cluster.md`).

## Not chosen

- **The watch script makes the moves** (the body weighed it). No deploy. It is a client that can be
  asleep, and a second orchestrator on another machine would run a second copy. His words: "the
  book keeping is in the issue service".
- **The queue computed by a local tool from `snapshot`**, as `issue-stats.ts` computes. The same
  cost, and each machine then has its own copy of the order.
- **The queue's rows as policy data**, a list of CEL rules a workflow carries. It fits "guards as
  data". Each change of a row would then be the owner's install, and a row is then changed by
  him alone, where a deploy of the service is the loop's.
- **`after` in the guard of `start`.** Enforced, and a start of a held issue would answer 403 with
  the guard. It needs the fact `issue.after.open`, and an install that swaps every open issue of
  the task workflow (28 at event 4008, each swap emptying `issue.reviews`). The cost
  of not having it: a writer's quick win can start an issue that waits. No such start is in the
  record, since no link exists yet. It is one guard in a later install if one is seen.
- **Feedback left out of `issue.children.open` itself.** No install. Breaks `issue.verify` at
  event 3740 (above).
- **Feedback tied to a project by `related`, never `part-of`, by a rule in the briefs.** No code
  and no install. A rule in prose that nothing reads again is what this issue is about, and six
  such parts exist.
- **The finish written under the Worker's name.** The record would name the service as the writer.
  The guard of `finish` refuses a Worker, so it needs the install before any finish is made, where the
  design above works from the deploy.
- **`ready` made by the service too.** With holds as links and times, a session makes `triage` and
  `ready` together and nothing stays at `triaged` but what waits for the owner or a part. The
  queue lists the rest as `ready`.
- **A hold as a label with a date in its name**, parsed by the queue. No new event. The reason
  would be a comment the queue cannot answer, and a date in a name is not obvious to an agent
  (`philosophy.md`, line 3).
- **The link holds until the other issue is landed, not until it is closed.** A `major` task sits
  at `awaiting-approval` after it is deployed: 48 stays, median 15 min, longest 5 h. The record
  shows the orchestrator waiting for the approval before the next task (`wt-4` "wt-3-land-by-push
  is approved", `tp-3` "tp-2-push-to-receive is approved"), so closed is what is meant today.

## How each requirement is known to be met

`ia` is `tools/cloud-brain/issue-as.sh <own token>`. Every command is one an agent of the loop runs
with its own token. "Today" was run on 2026-10-12 between 12:21 and 12:34 CEST with `spec-8717a9`.
An "After" on cb4 cannot be run before its task is deployed; it is run then, by the task's writer
in step 11 of its brief, and the table says which task.

| | Command | Today | After |
|---|---|---|---|
| R1 | `ia link '{"key":"…","id":"A","to":"B","rel":"after"}'` | 400 `rel: part-of, duplicate, cause, related` (run on this issue and `worker-machine-on-fly`; nothing written) | bk-1: 200 on two issues `test-bk-1-a`, `test-bk-1-b` the writer opens; the second link, B after A, 403; both closed after |
| R1 | `ia "queue"`, `waiting` | 501 `MethodNotImplemented` | bk-3: `test-bk-1-a` has `why` `after` and `on` `["test-bk-1-b"]`; after `close` of b, a is in `queue` |
| R1 | `ia "list?link=fly-1-by-hand"`, the ids | `[]` (12:34 CEST) | bk-5: `fly-2-image-and-run-sh` and `fly-3-brain-fly-service` among them |
| R2 | `bun test.ts brain-x-issues --with <build>` in the worktree's `cloud-brain-dev` | 36 passed, 0 failed, 15 need a browser, at `d53d1c8d` | bk-2: more passed, 0 failed; a new test closes the last part of a project in the rig and reads the project `done`, the event's `auto`, and `issue.verify?guards=true` `ok` |
| R2 | `ia "verify?guards=true"` | `ok: true`, 3997 checked | `ok: true` after each of bk-1, bk-2, bk-3 and after the install |
| R2 | `ia "queue"`, the entries with `do` `finish` | 501 | bk-3: none two passes after the deploy. A `finish` entry seen later is a follow-on that failed: its id goes in the task's record |
| R3 | `ia "queue"` | 501 | bk-3: 200. Placement, read by the writer against `ia "list?state=ready"`: an issue there with no label `needs-owner`, no hold, no open part and no link `after` to an open issue is in `queue` with `do` `start`, and each other one is in `waiting` with the `why` its row gives. Order: of two `start` entries, one with the label `owner` is before one without. In the rig, a test of each row of the two tables and of the order of group 4 |
| R4 | `ia "get?id=group-invites"`, `issue.state` | `building`, one open part, `fb-a24kt7jw3q` | bk-4, after the owner's install: `done`. Cannot be run before he installs |
| R5 | `ia hold '{"key":"…","id":"…","until":1,"reason":"probe"}'` | 501 | bk-3: 400 for an `until` in the past; with a time 60 s on, the issue is in `waiting` with `why` `until`, and in `queue` as `look` after it; `ia "verify?guards=true"` then `ok: true` |
| R6 | the rows of step 3's tables: `awk '/^3\. \*\*/{on=1} /^4\. \*\*Spawn/{on=0} on && /^   \| /' .claude/skills/brain-maintenance/SKILL.md \| grep -v -c -E '^   \| (\`do\`\|In \`waiting\`\|Issue is\|---)'` | 20 | 13, with the draft of part 6 in the file (run 12:32 CEST, then taken back). The task's count may differ by the rows it adds. (As built, `bk-6-skill-watch-and-stats`, 2026-10-13: 26, the 13 and 13 rows of the old table kept under them; the record.) |
| R6 | `grep -c "A place goes, in this order" .claude/skills/brain-maintenance/SKILL.md` | 1 | 0 (the same run) |
| R6 | `ia "queue"`, `waiting` with `why` `after` | 501 | bk-5: 13 entries, the links of "Holds" above, less any whose issue has ended by then. (As built, 2026-10-12: 21 entries, 11 of them of the 13 links bk-5 wrote; `fly-1-by-hand` passed 49 s after the links of `fly-2` and `fly-3`, which were then `start` entries; the record.) |
| R7 | `bun test ./tests/tools/issue-watch.test.ts` | 13 pass, 0 fail (12:34 CEST) | bk-6: passes with a test that feeds two answers of `queue` and sees one `QUEUE` line for the entry that is new. (As built, `bk-6-skill-watch-and-stats`, 2026-10-13: 37 pass, 0 fail, that test among them; the record.) |

No "After" figure has a run behind it but the two of R6.

## The tasks, in the order they land

Each seed task is labeled `major`: it changes a method other callers use.

1. **bk-1-after-link.** Part 1: the rel, the two refusals, the walk, tests. `last` in `issueApply`
   (part 3). A deploy of `brain-x-issues`. After nothing.
2. **bk-2-finish-by-the-service.** Part 4, and the fact `issue.children.work` with the two guards
   of `issuesDefaultPolicy` (part 5; the cell changes, cb4's policy does not). A deploy. After bk-1
   (the same seed).
3. **bk-3-queue-and-hold.** Parts 2 and 3: `issue.hold`, `issueQueue`, `issue.queue`, tests of each
   row of the two tables. A deploy. After bk-2.
4. **bk-4-install-the-project-workflow.** The writer makes the body of the install from the built
   cell (`{ key, policy, migrate: { "39d9f385…": { workflow: "project" } }, reason }`), installs it
   in the module's rig over a copy of cb4's open projects and reads `moved`, and writes the one
   command in a comment in the form `philosophy.md` gives. Then it is the owner's: label
   `needs-owner`. After bk-2. (As built, 2026-10-12: the body is made from the policy of event 4668 with the cell's
   two guards, `migrate` from `9011113c…`, in `plan/cloud-brain-issues-policy-v4.json`; the rig is run by
   `tests/tools/issues-policy-v4.test.ts`, with no cell added to the seed and no deploy; the comment is in the form of
   `rules.md`, "What the owner is asked to decide", which is later than the spec; the record.)
5. **bk-5-holds-become-links.** An act on cb4, no seed: the 13 links of "Holds"; a hold with a time
   and the command to read for `dv-5-read-first-20-runs` and `os-5-trial-read`; `needs-owner`, with
   the comment its form asks for, on `cu-1-deployer-gains-billing-read` and
   `ds-ingestion-tail-to-analytics-engine`; `ready` for each task that then waits by a link alone.
   Its count is the confirmation: `waiting` of the queue. After bk-3.
   (As built, `bk-5-holds-become-links`, 2026-10-12: 13 links, 9 of them of "Holds" and 4 of tasks opened since;
   the other 4 of "Holds" had ended, their issue or the one it waited for closed. Holds with a time on
   `os-5-trial-read`, and on three this line does not name: `ap-3-trial`, `wt-6-check-after-a-day` and
   `plain-worktree-outside-checkout-fails`. None on `dv-5-read-first-20-runs`: its 20 runs were there, and it went
   to `ready`. `ready` for 9 that wait by a link alone; 4 that wait for more than their link stay at `triaged`.
   `waiting` after it: `after` 21, 11 of them this task's, `until` 4, `owner` 2; the record.)
6. **bk-6-skill-watch-and-stats.** Part 6: step 3 and step 1 of `SKILL.md`, the decompose row,
   `agents/spec.md`, `issue-watch.sh` and `issue-stats.ts` with their tests, the line in
   `knowledge/`. After bk-5: until then the table of 20 rows is what a session runs.
7. **bk-7-read-after-two-days.** A record: the finishes since bk-2 with the minutes each took and
   whether it has `auto`; the `finish` entries seen in the queue; each issue that left `waiting`
   and the minutes until its start. After bk-6, and held with `issue.hold` for two days.

## What only the owner can do

- Approve this spec. The comment for his approval says that it has one install for him and no token.
- **The install of bk-4**, once, with his session, when `ia "list?state=spec-review"` is empty:
  `issue.install` with the body the task writes. `rules.md`, Never: `issue.install` is his.
- Approve each of bk-1, bk-2 and bk-3 after its review, as for any `major` task.

No deploy of the kernel, the core, the database or the deployer. No `issue.rebuild`. No rule of
`rules.md` changes.

## What the orchestrator makes

Nothing. Every call of this design is `issue.*`, which each agent's token already names.

## Not tried, not known

- Whether `brain.ts curl … -d @file` sends a file as the body: bk-4 finds out before it writes the
  command. (As built, `bk-4-install-the-project-workflow`, 2026-10-12: it does. The install of event 4668 was sent that
  way, `-d @plan/cloud-brain-issues-policy-v3.json`, and answered 200: comment 4725 of `ap-4-policy-v3`.)
- The time `issue.queue` takes on cb4. It reads every row of the view, as `issue.list` does (339
  issues today), and the watch asks every 30 s.
- A follow-on that fails. The design says what then lists the project; no such failure was made.
- Whether the orchestrator, with the queue, starts work sooner. bk-7 reads it. The 13 links of
  today end at two tasks of the owner's and two that are `ready`, so the first days may show little.
- What the page's panel shows of a link `after` or of a `held` event: it draws `links` as it does
  the other rels; not looked at.

## What misled the writer of this spec

- `agents/spec.md` step 2 expects parts. A feature of the owner's is given with none, and its
  body is the report. The step has no line for that.
- The issue's part 4 reads as a change of how parts are counted. That change breaks
  `issue.verify` at one event of the record, which only a replay showed.
- Six times of day in the first writing of this file were written from memory and not from
  `date`. They were found on a second read and replaced with the clock of the command, a file's
  time or a commit's author date. The brief says it of a record; a writer needs a `date` in each
  command it will quote.
- `git diff --stat` in the worktree lists `lopebooks`, `lopecode` and `lopecode-plugin` as changed
  after a clean checkout: they are the links. The brief says so of `git status`, not of `diff`.

## The fresh review before submitting (2026-10-12, answered by 12:43 CEST)

One agent with the file and nothing else (`/review-notebook`): FIX, 6 findings, all taken.

- The rows of `do` had no order between them and "waits for nothing" meant the link alone: the
  rows of `waiting` are now tested first, the rows of `do` in the table's order, `look` first, and
  a hold ends at the issue's next move.
- The check of R3 could not fail (`waiting` was defined as what is not in `queue`): it now names
  where an issue is placed and one case of the order.
- The two scripts were not kept: they are attachments of the issue.
- "Every guard of a move reads `caller.kind`" was false (`start` from `ready`, the moves of the
  owner present): the sentences now speak of `finish`.
- `held` was not said to join `issueReplay`: said, and in the check of R5.
- "13 tasks" named 10, and 3978 events stood beside 3990: both explained.

