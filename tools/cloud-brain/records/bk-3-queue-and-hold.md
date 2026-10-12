# bk-3-queue-and-hold

Task 3 of `plan/cloud-brain-bookkeeping-in-the-tracker.md` (approved by the owner, events 4148 and
4149 of `bookkeeping-in-the-tracker`): part 2, a hold until a time, and part 3, the queue. Written
2026-10-12; the `start` move is event 4644 (22:00 CEST by `date`). A deploy of `brain-x-issues`. No
install and no `issue.rebuild`: cb4's policy is not changed by this task.

Commands below are run in the worktree `bm-bookkeeping-in-the-tracker` unless one says the main
checkout. `ia` is `tools/cloud-brain/issue-as.sh impl-77900c`.

## What changed

`tools/cloud-brain/brain-issues.ojs`:

| Place | What |
|---|---|
| `issuesLimits` | `holdDays: 30`, `queue: 200`, `lateHours: 4` |
| `issues_service` | two methods more, `issue.hold` (procedure) and `issue.queue` (query), under the rule the others have |
| `issueAct` | the body of a hold; a third argument `now`, the time `until` is held to, `Date.now()` when left out |
| `issueAllowed` | the act `hold`: the workflow's `hold` guard, and `label` where it has none; a remove of a hold the issue does not have is "no such hold", 404 |
| `issuePolicyAct` | a workflow's `hold` guard is parsed at the install, as `link`, `attach` and `cost` are |
| `issueEvent`, `issueReplay` | the event `held`, with `until` and `reason`, or with `remove: true` |
| `issueApply` | `hold: { until, reason, seq }` on the row; taken off by a `held` with `remove` and by a `moved` event |
| `issueAutoFrom` | a cell now. It was `autoFrom` inside `issuesApp` (bk-2), and the queue reads it too. The function is the same but for `issuesLimits.auto` where it read `L.auto` |
| `issueQueue` | new: `{ queue, waiting }` from a view, a caller and a time. No I/O |
| `issuesApp` | the route of `issue.hold` with the other writes; `issue.queue` |
| the panel's line of an event | a `held` event is drawn as `until <ISO time>: <reason>` or `hold taken off`. It was an empty line |
| the prose | the rows `issue.hold` and `issue.queue`; the section "The queue"; `held` among the types of event; `hold` among the guards a workflow may have; `issue.hold` in the row of `issue.get` |
| four new test cells | below |
| two test cells changed | `test_issues_declares_what_it_needs` lists the two methods; `test_issues_reference_states_each_value_and_has_no_hole` holds six sentences more to `issuesLimits` |

`plan/cloud-brain-bookkeeping-in-the-tracker.md` gained two "(As built …)" paragraphs, under part 2
and part 3, and is otherwise as it was.

## What differs from the spec, and why

- **Work that has begun is not held by `after`.** The body of the task, from review 4032: "an issue
  already `in-review` or sent back, put `after` an open issue, is listed as waiting, and its review
  would be parked. Give work already begun the exception that `owner` has". The row `after` now
  leaves out the four states the row `owner` leaves out: `in-progress`, `in-review`, `spec`,
  `spec-review`. An issue at `in-review` that is after an open one is a `review`, one sent back is a
  `round`, and one an agent has is `work`.
- **The row `until` has no such exception.** A hold put on an issue at `in-review` parks its review
  until the time. The body names `after` alone, and a hold on work that has begun is an act with a
  reason and an end. `philosophy.md`, line 2: the smaller side.
- **`until` is checked in the call, not by a guard.** "After the call and at most 30 days after it"
  needs a clock, and `issue.verify?guards=true` judges an event from the view before it with none.
  So the check is in `issueAct`, a 400 before the issue is looked for, and verify does not ask it
  again.
- **A feedback issue is tested as any other, up to the last row.** The spec says an open note that
  is not a `promote` "is in neither list". Read whole, that would drop a hold someone put on a note,
  and a note labeled `needs-owner`. As built: a note is tested against the rows of `waiting` and
  for a hold whose time has passed; it is in neither list when none of those holds it and it is no
  `promote`.
- **A workflow is read by its hash.** "On the task workflow" is the workflow the policy in force
  names for the kind `task`, as `facts` of `issueAllowed` reads the feedback workflow. The other
  rows read the state's name. An issue at `open` on a workflow no policy names any more matches no
  row and is the spec's "a state no row names", a `look`.
- **`for`** reads `opener === "owner"` and the labels `owner` and `annotation`. `for` of
  `issue.flow` also asks that the owner's call came from a tab (`caller.present`), from the `opened`
  event; the row does not keep that event's `by`.
- **`limit` cuts `queue` alone**, and the answer has `more`. `waiting` is whole: bk-5 counts it.
- **`finish` in the queue is asked with a reason** ("by hand"): the entry is for a session, which
  has one. The service's own finish is asked with and without (bk-2).
- **`on` of `parts`** lists every part that is not closed. Under a policy whose `finish` reads
  `issue.children.work` (the default since bk-2; on cb4 after the install of bk-4) a note that is
  open is then listed beside the task that holds the project, though the note does not hold it: the
  cell does not read the guard to tell which part does.
- **A swap leaves a hold.** The spec has "at the issue's next move (`issueApply` takes `hold` off the
  row at a `moved` event)". A note that is held and then promoted is still held.

## The row with no `last`

`last` is on a row from the first move after bk-1's deploy. cb4, `ia "snapshot"` at event 4623,
before the `start` move of this task (event 4644, 22:00:33 CEST), counted by a script of this writing
over the answer: 396 issues, 78 not closed, 63 of those with no `last`, 37 of the 63 with a move in `by`.

`issue.queue` reads `S.of` for an issue that is not closed, has no `last`, and either has a move in
`by` or is not on the workflow the policy names for its kind (a note that was promoted). The
statements go in one `sql.batch`, 300 at most a batch. The events of an issue are folded with
`issueApply` over an empty view and `last` is taken from the row that makes, so there is one rule
for what a last move is. The read writes nothing: the row has no `last` until the issue moves.
An issue with no move in `by` on the workflow of its kind has made no move, and is not read; that
it could have been through a listed swap that leaves it on the same workflow is not excluded by
the code, and the default policy has no such swap.

## Tests

Four cells, each entered through calls of the service in the module's rig:

- `test_issues_hold_is_a_time_in_the_record`: 12 bodies refused with 400 on an issue that is not
  there; the two ends of the span at a given `now`; a Worker refused; the event and the row; the
  queue a millisecond before the time and at it (`issueQueue` with `now` given, so no test waits);
  a second hold; a remove; a move ends it; a swap does not; a closed issue; a key once; `rebuild`
  gives the same rows; `verify?guards=true`; a forged remove of no hold is found by it.
- `test_issues_hold_guard_is_the_policys_when_it_has_one`.
- `test_issues_queue_places_each_issue_by_its_row`: 42 issues, 34 of them open and read by token
  `a`. The whole answer of `issue.queue` is compared with a map of id to `do` or `why`, so an issue
  in the wrong list, in both, or missing fails it. Each row of the two tables has an issue, the
  three cases of work begun and put `after` among them. The same for token `b` (who may make a
  `finish` that `a` may not, and does not read a security report of `a`).
- `test_issues_queue_order_and_a_row_with_no_last`: 13 entries in the order of the groups and of
  group 4, over the service's view with the times written in; a row whose `last` the test takes
  off; a policy installed with no `migrate`.

Before any edit, 22:00 CEST: `bun test.ts brain-x-issues --with <build>` in `cloud-brain-dev`
answered `"passed":40,"failed":0,"needsBrowser":15`.

After the last change to the seed (22:10 to 22:12 CEST):

```
(cd cloud-brain-dev && bun test.ts brain-x-issues --with $W/tools/cloud-brain/.emitted/bk-3-queue-and-hold.js)
  "passed":44,"failed":0,"needsBrowser":15
bun tools/cloud-brain/tab-tests.ts tools/cloud-brain/.emitted/cloud-brain.html @tomlarkworthy/brain-issues
  "tests":59,"passed":59,"failed":[]        browser 151.0.7922.34
cd <main checkout> && BRAIN_BASE=cb4 bun tools/cloud-brain/verify-run.ts brain-x-issues --shell $W/tools/cloud-brain/.emitted/cloud-brain.html --times 20
  "mains":["@tomlarkworthy/brain-shell","@tomlarkworthy/brain-issues"]
  "runs":20,"passed":20,"failed":0,"none":0,"from":["document"],"byChance":[]
```

The count submitted is 59 of 59. The 20 runs were made before the rebase of 22:12, which brought in
no file this module is built from (`worktree.sh --rebase` printed `brain-topic.ojs`, briefs, records,
tests and `seen.json`); the 59 were run again after it, with the emit.

**The tests fail without the fix.** Eleven changes to the seed, one at a time, each followed by the
build and `test.ts` (a script of this writing, between two `date` lines of 22:06:08 and 22:08:00 CEST, before the last two small edits: the
prose of `limit` and the case of a closed issue). Each failed at least one test:

```
the after row holds work begun            1 failed  queue_places_each_issue_by_its_row
held not in issueReplay                   3 failed  hold_is_a_time, hold_guard, queue_places
a move leaves the hold                    1 failed  hold_is_a_time_in_the_record
last not taken from the events            1 failed  queue_order_and_a_row_with_no_last
the hold guard not read (label alone)     1 failed  hold_guard_is_the_policys_when_it_has_one
no owner first in group 4                 1 failed  queue_order_and_a_row_with_no_last
no late in group 4                        1 failed  queue_order_and_a_row_with_no_last
until <= now taken (< for <=)             1 failed  hold_is_a_time_in_the_record
the owner row holds work begun            1 failed  queue_places_each_issue_by_its_row
a related link to an open note is a tie   1 failed  queue_places_each_issue_by_its_row
a remove of no hold allowed               1 failed  hold_is_a_time_in_the_record
```

`tests/tools/suite.sh`, 22:12 to 22:14 CEST, after the last edit of the seed and of the spec and before
this file was written: `724 pass`, `0 fail`, `Ran 724 tests across 74 files. [89.16s]`, no `skipped:` line.

## On cb4

When this file was committed the Worker was not deployed: the record lands with the seed, under one
take of the landing lock. The "After" column of the spec for bk-3 (R1, R2, R3 and R5: two issues
`test-bk-3-a-…` and `test-bk-3-b-…` linked and closed, a hold of 40 s, each issue at `ready` against
the queue, the `finish` entries, the time of a call) is run after the deploy, and its output is in
the writer's comment of this round on the issue, with the deploy's hash. A `finish` entry seen
there is named in that comment, not here.

## Read before designing

The Brain, three searches with `loop-knowledge` (`knowledge.search?semantic=true`), before the
`start` move: "issue queue what is next hold until a time", "issueFlow states moves read as the record has
them for owner", "after link waiting queue order of service". Each answered the spec of this task
first (score 1, 0.95, 0.92), then `doc:cloud-brain-loop-order-of-service` and
`doc:cloud-brain-issues`. Nothing beside the spec was used. Read for the rows: the table of step 3
of `SKILL.md` as it is today, `tools/cloud-brain/issue-stats.ts` for what a tie of a note is
(`owners-feedback-held-by-related-links`), and the records of bk-1 and bk-2.

## Not tried

- The panel's line for a `held` event. No test runs it and it was not looked at in a page.
- `issue.queue` called every 30 s by a watch (bk-6), and what it costs then.
- A batch of more than 300 `S.of` statements: cb4 would have sent 37 at event 4623.
- A hold on an issue of the security workflow, and `issue.queue` asked by a member (the core lets
  none in).
- A `limit` other than 2 and `abc`.
- A note tied to an issue the caller may not read.
- An `until` judged against a Worker whose clock differs from the caller's by more than the span
  the caller left.
- Whether a session, with the queue, starts work sooner. bk-7 reads it.
