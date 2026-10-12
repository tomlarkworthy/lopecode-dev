# Cloud Brain: the flow of the Brain's work, read from the tracker's record and drawn as a dashboard

Spec of the project `flow-metrics` on cb4's tracker. Written 2026-10-11 between 22:51 and 23:10
CEST (the move to `spec` is event 2727, 22:51:51), from `lopecode-dev` `eac096ca`, from the
tracker's record up to event 2727 and from the deployer's lines of the 7 days before 22:53 CEST.
Nothing here is built. Names are proposals. Every count under "What exists today" that is not on a
line of a kept tool was made by two scripts that are not kept (`pull.ts`, `measure.py`, in the
session's scratch directory) over `issue.sync?after=0` read with the token `spec-4f825c` and
`logs.deploys` read with `loop-deploys`.

## What was asked

Tom, 2026-10-11, to a Claude Code session outside the loop, as the issue's body quotes him. First:

> how long does it take for work to go from feedback to live deploy? I think we should measure stuff like this as a metric. Do we have good metrics and emthods for displaying them.

and after that session's report, whole:

> yes lets cover the standard producvity metrics, please file that. I do think we will need a more scalable dashboarding service, which can have multiple dashboards and this would be one of them, so this gets sequenced after building the dashboard service which should be driven by metrics.

The same day, of the dashboard service (event 1197 of `dashboard-service`):

> cost and performance is important.

The list of metrics in the issue's body, its four parts and its "Done when" are that session's
reading. They are treated here as a report.

## The reports gathered

`list?parent=flow-metrics` answers `{"issues":[]}`. What is gathered is the issue and the two
issues linked with it.

| id | what it says | becomes |
|---|---|---|
| `flow-metrics`, body, "The metrics to cover" | Lead time to first response, to first deploy, to done, median and 85th percentile, by kind and by opener; deploys a day by Worker; failure rate (put-backs, submits sent back, a bug against a done change); time to restore; throughput, work in progress, age of open work, waiting against working, time waiting for the owner | R1 to R6. "A bug against a done change" is left out: see "Not chosen" |
| the same, part 1 | One written definition of each clock, of "live" for a change with no deploy, and of a project's | R1, "The clocks" |
| the same, part 2 | A deploy written into the record with its own time, since Cloudflare keeps the deployer's lines 7 days | Left out. The submit that carries a deploy ref is 0.7 to 6.7 minutes after the deploy (measured below) and is in the record for good |
| the same, part 3 | One tested function from events to the metrics, a cell of `@tomlarkworthy/brain-issues`, which `issue-stats.ts` reads in place of its own arithmetic | R7 |
| the same, part 4 | The dashboard, on `dashboard-service` | R8 |
| the same, "Caution" | A median over finished work alone leaves out what nobody took | R4 |
| `dashboard-service` (building), its spec, "Not chosen" | Leaves two ways to this spec: the tracker logs a line an issue, which makes it a metric of the service; or the dashboard is computed in the page | "The design", "Not chosen" |
| `loop-order-of-service` (building), its spec | 17.6 h of the 33.8 h the record spanned then were hours the loop ran; "the tool counts no stay that has not ended" | A limit said under R1, and R4 |

The requirements. The numbering is the writer's.

- **R1, lead time.** For an issue: from opened to its first response, to its first submit, to its
  first deploy and to done. For a feedback issue: to the first deploy of the work it went into.
  Each as a median and an 85th percentile, by kind and by who opened it.
- **R2, deploys a day, by Worker.**
- **R3, failure rate**: put-backs against deploys, and submits sent back against submits.
- **R4, open work is counted**: how many issues are in each state, how old each open issue is, and
  the hours spent before a start against the hours at work, with the stays that have not ended.
- **R5, time waiting for the owner**: at `awaiting-approval`, and with the label `needs-owner`.
- **R6, time to restore**: from a put-back to the next deploy of that Worker that stood.
- **R7, one function.** The page and `issue-stats.ts` print numbers made by the same code.
- **R8, a dashboard of the service**, kept as data, for a span he chooses.

## What exists today

**The record and the tool.** `bun tools/cloud-brain/issue-stats.ts --token=spec-4f825c`, 22:52 CEST:

```
record         2727 events, 276 issues
time in a state before the move out of it
  open               241 stays  median    0.9 min  total 147.4 h  max 9.7 h
  triaged            130 stays  median      0 min  total 180.9 h  max 16.8 h
  ready              115 stays  median    2.7 min  total  49.3 h  max 17.7 h
  in-progress        179 stays  median      8 min  total  62.5 h  max 15.2 h
  in-review          173 stays  median    5.8 min  total  25.9 h  max 2.1 h
  awaiting-approval   32 stays  median    5.6 min  total   7.9 h  max 2.6 h
done           120, median 0.7 h from opened; 84 with no rework; 15 started without triage
review         172 submits, 54 sent back; verdicts {"pass":133,"changes":70}
```

It prints no lead time to a deploy, no percentile, nothing of feedback's path, and it counts a stay
only when it ended. With the stays still running at event 2727 added, `open` is 426.2 h and not
147.4: 99 issues were not closed (58 `open`, 24 `triaged`, 10 `building`, 3 `spec`, 2
`awaiting-approval`, 2 `in-progress`), 51 of them feedback. The hours before a start (`open`,
`triaged`, `ready`) were 710.9 with those stays, against 129.8 at work.

**The clocks, as the scripts counted them at event 2727.** Percentiles are nearest rank
(the value at place `ceil(p * n)` of the sorted list).

| what | n | median | 85th | longest |
|---|---|---|---|---|
| bug, opened to first deploy ref | 14 of 60 | 0.52 h | 2.05 h | 21.26 h |
| task, opened to first deploy ref | 27 of 108 | 0.43 h | 2.41 h | 15.52 h |
| bug, opened to done | 36 | 0.60 h | 2.91 h | 21.54 h |
| task, opened to done | 74 | 0.61 h | 2.30 h | 20.24 h |
| bug, opened to its first move | 59 | 0.02 h | 1.41 h | 4.60 h |
| feedback, opened to the first deploy ref of work it went into | 25 of 86 | 1.47 h | 7.26 h | 10.00 h |
| age of the 48 open issues that are not feedback | 48 | 1.3 h | 4.6 h | 27.8 h |
| age of the 51 open feedback issues | 51 | 4.4 h | 11.4 h | 12.3 h |

72 of the 86 feedback issues had a parent or said a link; 5 were `open` with neither, the oldest
12.3 h. The issue's body gives 1.0 h for 11 feedback issues at event 1164; this is 25 at event 2727,
with the parts of a followed project counted. `needs-owner` was on an issue for 242.9 h in 54
intervals, 6 of them not ended. 202 submits (`submit` and `submit-spec`), 70 followed by a
`rework` or a `respec`.

**A deploy ref stands in for the deploy.** The question of part 2 was how far the submit is from
the deploy it names. 67 moves of issues that are not `test-` carry a ref of kind `deploy`
(`brain-x-issues@a465a1ae5970`; 37 with 12 hex digits, 30 with 64). 66 match a line of the
deployer by `target` and the start of `hash`; the one that does not is `cb4-deployer@4a25dc92cc07`,
an install by the owner.

```
submit minus the first deploy.confirmed or deploy.verified of that hash   n=43  median 2.5 min  85th 3.8  0.7 to 6.4
submit minus the first deploy.uploaded, deployed or probation             n=66  median 2.7 min  85th 4.3  1.0 to 6.7
```

So the ref's time is late by under 7 minutes, against lead times whose medians are 26 to 88
minutes. And 74 of the 120 done issues have no deploy ref; all 74 have a ref of kind `commit`.
The body's "by assumption, not checked" is checked to that extent: they landed a commit. What kind
of change each was, was not read.

**The deploys.** `logs.deploys` over 7 days, `--as loop-deploys`, 18.8 s, 5 queries, 1555 lines:
`deploy.confirmed` 187, `deploy.put-back` 29. The same two counts from the dashboard service,
`metric.query?metric=deploys.confirmed&by=target` and `deploys.put-back` over 7 days
`--as loop-dashboard`, 23:00 CEST: 187 over 22 targets and 29 over 12, `sampled: 1`, 8 queries
each, `cost.ms` 8792 and 11976. So R2 and half of R3 are metrics of the service today. No dashboard
shows them: `dashboard.list` answers `health` alone.

Time to restore, from the same lines: for each put-back, the next `deploy.confirmed` or
`deploy.verified` of that `target` whose hash is not the one put back to. 27 of 29 have one:
median 0.72 h, 85th 45.89 h, longest 49.63 h. The two without are scratch Workers. The long ones
are Workers put back on 2026-10-09 and not deployed again for two days. The deployer puts the
version before back inside the apply (22 s for a scratch Worker,
`brain-deployer.ojs`, "On cb4 since 2026-10-11"), so the service is restored by the put-back; what
this clock measures is how long the fix took to stand.

The deployer opens a bug when a deploy's tests fail (`fix-tests-WORKER-HASH8`,
`brain-deployer.ojs:995`). The record has one, event 381. 10 put-backs for failed tests are in the
lines since the record began, 9 of them before that code ran. A put-back for a failed health check
or for no confirmation opens nothing. So the record cannot give R6; the lines can, for 7 days.

**What the page can draw.** `brain-dashboard.ojs` at `eac096ca`: a dashboard is a row, a panel
names a metric, and `dashboardRead` (line 622) sends one `metric.query` for each distinct metric,
`by` and filter. A row of an answer is `{ t, …dims, n, sum, max }`. Five draws: `calls`, `faults`,
`methods`, `bars`, `table`. The service keeps a panel whose metric it does not define: the test at
line 1002 puts one named `flow.lead-time`. The span is the page's, 15 minutes to 7 days
(`cloud-brain.ojs:33`).

**What this decides.** A metric of the service is a count, a sum and a max of log lines, grouped.
A median, an 85th percentile and "an issue as a point" are none of those, and the age of open work
is a state at a moment, not a line. So the tracker logging a line an issue, the first way
`dashboard-service` left open, cannot carry R1 or R4. The lead times come from the events, one row
an issue.

## Read

**The Brain.** `knowledge.search?semantic=true` answered 502 to each of six searches at 22:57 CEST:
`ai.v1/embeddings answered 402 owner has made 2000 priced calls today`. That is filed
(`seen-priced-calls-day-limit-reached`). Searched by words instead, `--as loop-knowledge`:

| searched | found | used |
|---|---|---|
| "lead time deploy", "DORA", "dashboard metric" | `doc:cloud-brain-dashboard-service` first in each | Read whole. Its "Not chosen" (the tracker's events as a second source) and the shape of a row |
| "throughput", "percentile", "issue-stats" | `doc:cloud-brain-loop-order-of-service` | Its table of waits with a median and an 85th percentile, the 17.6 h of 33.8 h, and "the tool counts no stay that has not ended" |
| "issue-stats" | `doc:cloud-brain-run-cost-is-part-of-the-issue-model` | Its head only. Tokens an issue are that project's; see "Not chosen" |
| "dashboard metric" | `doc:time-series-from-a-web-api` | Lines 8 to 40: a span is computed from the clock and both ends are sent as instants. `issue.flow` takes `since` and `until` in milliseconds |
| "flow metrics" | `module:tomlarkworthy:flow-queue`, `code-metrics`, `cw-metrics` | Nothing: none is about work items |
| "cycle time", "time in state", "kanban" | papers and modules that share a word; nothing for "kanban" | Nothing |

Also read: `brain-dashboard.ojs` (the method reference, lines 205 to 240 and 556 to 700),
`brain-issues.ojs` (the method table, the default policy, `S`), `brain-feedback.ojs:56`
(`feedbackFollows`), `brain-logs.ojs` ("The deploys of a span"), `issue-stats.ts` whole.

**Outside**, 2026-10-11. Both pages were read only as a summary made by a fetch tool:

| page | what the summary says | used |
|---|---|---|
| <https://dora.dev/guides/dora-metrics-four-keys/> | Five metrics. Change lead time: "from committed to version control to deployed in production". Deployment frequency. Failed deployment recovery time. Change fail rate: "the ratio of deployments that require immediate intervention". Deployment rework rate | R2, R3, R6 are its last four. Its lead time starts at the commit; the owner's question starts at the feedback, so R1 starts at opened and the row also carries the first `start` |
| <https://kanbanguides.org/english/> | WIP: "started but not finished". Throughput: finished a unit of time. Work item age: "between when a work item started and the current date". Cycle time. A service level expectation is "a period of elapsed time and a probability", with the example "85% of work items will be finished in eight days or less" | R4 is its WIP and work item age. The 85th percentile of the issue's body is its example |

No paper was searched for: these are definitions of counts, and the two pages are where the
"standard" ones of his words are written down.

## The design

One function in the tracker's module turns events into rows. The tracker answers it as a method,
`issue.flow`. The page draws a panel whose metric starts `flow.` from that method, and
`issue-stats.ts` prints from it. The deploys stay where they are, as metrics of the dashboard
service. One dashboard, `flow`, is put as data.

### The clocks (R1, and part 1 of the issue)

These are the definitions. They go, as they are built, into the reference cell of
`brain-issues.ojs`, which is what a reader of a number is sent to.

- **Opened** is the `at` of the issue's `opened` event. Every lead time starts there.
- **A move** is a `moved` or a `swapped` event. The names of moves and states below are those of
  the policies in the record at event 2727 (cb4 runs an installed policy, not the default of the
  seed): the function takes the closed states of an issue from its workflow in the record, and the
  names `submit`, `submit-spec`, `rework`, `respec`, `send-back`, `pass`, `to-approval` as they are.
- **Response** is the issue's first move of any name. For a feedback issue that is its close,
  which is when the loop gathered it or answered it.
- **Submit** is the first `submit` move. The policy refuses one with no ref
  (`brain-issues.ojs:218`), so it is the first time the change was on `main` or deployed. This is
  "live" for a change with no deploy.
- **Deploy** is the first `submit` move of the issue that carries a ref of kind `deploy` (69 of
  the record's 70 such refs are on a `submit`; a `revert` also takes refs and is not a deploy of
  the change). It is 1 to 7 minutes after the deploy itself (above). An issue with no such ref has no row for this clock.
- **Done** is the first move into the state `done`. `rejected` and `closed` are not done.
- **A project or a feature** has no deploy of its own. Its deploy is the first deploy of any of
  its parts; its done is its own move to `done`, which the loop makes when no part is open.
  (As built, `fm-1-lead-times`, 2026-10-12: the first deploy made after the project was opened, of
  its parts and of theirs in turn; a project is an issue of kind `project` or `feature`; the record.)
- **A feedback issue** follows the work it went into: its parent and each issue it says a link of,
  as `feedbackFollows` reads them but whether or not it is closed, and the parts of those. Its deploy is the first deploy among
  them after it was opened; its done is the first `done` after it was opened among the issues it follows. A feedback issue
  that became a task (`promote`) is counted as the kind it has at `until`, by its own clocks.
- **Who opened** is the role in the name of the token (`impl`, `rev`, `orch`, `over`, `spec`,
  `out`, or the name whole, as `role` of `issue-stats.ts`), `owner` for his session, `deployer`,
  `worker:NAME`. (As built, `fm-1-lead-times`, 2026-10-12: `dig` is a role too, as in that tool, and
  a delegation whose holder has no name is `token`; the record.) **For whom** is `owner` when he opened it in his tab or it has the label `owner`
  or `annotation`, else `loop`.
- **A stay** is the time between two moves of an issue, or from the last move to `until` when it
  has not ended. A state is **before a start** (`open`, `triaged`, `ready`), **the owner's**
  (`awaiting-approval`) or **at work** (every other state that is not closed). A stay in a closed state
  (before a `reopen` or a `revert`) is in no row. `needs-owner` is
  counted beside the states, from the event that put the label on (the `opened` event when it was
  opened with it) to the one that took it off, to the close, or to `until`.
  (As built, `fm-2-open-stays-submits`, 2026-10-12: a swap that leaves the state's name ends a stay and
  begins another, as `issue-stats.ts` counts; an issue opened again with the label still on waits
  again from that move; a stay that was over by `since` is no row and one that began in the span is,
  whatever its length; the record.)
- **A percentile** is nearest rank: the value at place `ceil(p * n)` of the sorted list. The
  median is `p = 0.5`. (`issue-stats.ts` takes `l[n >> 1]` for its own medians, which is the upper
  of two for an even `n`.)
- **The clock is the wall's.** The loop does not run all the time, and a lead time holds the hours
  it was stopped. Nothing here takes them out.
- **An issue the caller may not read** (a `security` report, to anyone but its opener and the
  owner present) is in no row. `test-` issues are in none.

### The rows (R1, R3, R4, R5)

`issueFlow(events, { metric, since, until, by, filter })`, a cell of `brain-issues.ojs` that reads
no other cell but the helpers it is given. (As built, `fm-1-lead-times`, 2026-10-12: it is given
nothing and reads seven cells, `issueApply` among them, so the view at `until` is made by the code
the service makes it with; the record.) It replays the events up to `until` and answers the
shape `metric.query` answers, so the page's draws take it:

```js
{ metric, since, until, step, groups, sampled: 1, unit,
  series: [{ t, …the dims asked, n, sum, max }],
  summaries: [{ …the dims asked but id, n, median, p85, max }],
  cost: { ms, events } }
```

| metric | a row is | `t` | value (`sum`, `max`), `unit` | dimensions |
|---|---|---|---|---|
| `flow.lead` | an issue that reached a clock inside the span | when it reached it | ms since opened, `ms` | `to` (`response`, `submit`, `deploy`, `done`), `id`, `kind`, `opener`, `for` |
| `flow.open` | an issue not closed at `until` | when it was opened | its age in ms, `ms` | `id`, `kind`, `state`, `waits` (`start`, `owner`, `work`), `for` |
| `flow.stays` | the part of a stay that is inside the span | the end of that part | its ms, `ms` | `state`, `waits`, `kind`, `ended` (`yes`, `no`) |
| `flow.submits` | a `submit` or `submit-spec` inside the span | the move | 1 when the next of `rework`, `respec`, `send-back`, `pass`, `to-approval` was a sending back, else 0; `count` | `move`, `kind`, `id` |

`flow.stays` has one more value of `state`, `needs-owner`, with `waits: "owner"`.
(As built, `fm-2-open-stays-submits`, 2026-10-12: a row of `flow.submits` is 1 when the first of the
five moves after it and before the issue's next submit was a sending back, and 0 with none yet; the
record.)

`flow.open` is of the moment `until`. It does not read `since`: an issue opened before the span
and still open is a row, which is what R4 asks. Its check sends `until` alone.
(As built, `fm-2-open-stays-submits`, 2026-10-12: `since` decides the step, as for the other
metrics, and one after `until` is 400; the record.) Once the rows of a
step are added (no `id` in `by`), `t` is the start of the step.

`by` and a filter name dimensions of the metric, as for `metric.query`; any other name is 400.
With `by=id` a row is one issue, which is what a point and a percentile are made from. Without it
the rows of a step are added: `n` the issues, `sum` and `max` of the value. So throughput a day is
`flow.lead` with `to=done`, counted by step; the share sent back is `sum / n` of `flow.submits`;
work in progress is `n` of `flow.open` by `state`. `step` is an hour for a span of up to 48 hours
and a day (UTC) beyond it.

`flowSummary(values)` answers `{ n, median, p85, max }`. `issueFlow` calls it for `summaries`:
one for each group of the dimensions asked other than `id`, over the value of each row before the
rows of a step are added. It is the one place a percentile is computed. The page and the tool read
`summaries` from the answer and compute none, so neither imports the tracker's module. `groups` is
the count of `summaries`; no row is left out of an answer.

### The method

`GET issue.flow?metric=&since=MS&until=MS&by=&DIM=value` on `brain-x-issues`. It reads the record
and answers `issueFlow`. Its rule is the one of every other read of the tracker,
`caller.kind in ["owner", "token", "worker", "deployer"]` (`brain-issues.ojs:182`), and it leaves
out the events `issue.sync` would answer `hidden` to that caller. A caller that reads it could
already read every event it is made from, so it opens nothing: the task is not `major`.

It reads every event at each call. At event 2727 the record is 4.38 MB as `issue.sync` answers it
(6 calls of 500, 3.5 s from this machine with a `bun` start for each) and 0.76 MB with the titles,
bodies and reasons left out. Task 3 measures `cost.ms` on cb4. If it is over 1 s the writer reads
the fields it needs with `json_extract` in place of the whole `event`, and says in the record what
that gave. Not built until it is measured: an answer kept between calls.
(As built, `fm-3-issue-flow-method`, 2026-10-12: `since` and `until` left out or empty are 0 and the
`at` of the record's last event; `cost.ms` is the whole call in the Worker and was 374 to 716 on cb4
at 3634 events, so the read is not narrowed; who may read an issue is judged at the call; the record.)

### The page (R8)

In `brain-dashboard.ojs`:

- `dashboardRead` sends a query whose metric starts `flow.` to `issue.flow` and every other to
  `metric.query`, with the same parameters. The answer goes into the same Map.
- Two draws are added to `dashboardDraws` and to `panelNeeds`. `points` needs `id` in `by`: a dot
  for each row at `t` and its value, a rule at the median and at the 85th percentile of each of the
  answer's `summaries`, and one line of text under it for each with `n`, both and the longest.
  `share` takes any rows with a value: one line a group, `n`, `sum` and `sum / n`.
- `table` and `points` write a value whose `unit` is `ms` in hours with one decimal, and `table`
  adds the median and the 85th of a group when the answer has `summaries`.
- The note "500 groups is the limit of one answer" of `panelBody` is written for an answer of
  `metric.query` only.

The service takes `points` and `share` in a `dashboard.put` once `dashboardDraws` has them, which
is a deploy of `brain-x-dashboard`. Nothing else of the service changes: no definition, no rule, no
call from it to the tracker.
(As built, `fm-5-page-and-dashboard`, 2026-10-12: `table` adds the median and the 85th only when `by`
has no `id`, since a row is then a group of the summaries; a panel of a `flow.` metric that failed or
has no row says `issue.flow` and "No rows in this span."; `bars` of one is labelled `rows`; `share` of
a counted metric says so in the panel's place; the record.)

### The dashboard, as data

Put with `dashboard.put --as loop-dashboard`, no commit and no deploy:

| panel | metric | by | filter | draw |
|---|---|---|---|---|
| Feedback to deploy | `flow.lead` | `id`, `for` | `kind=feedback`, `to=deploy` | `points` |
| Opened to deploy | `flow.lead` | `id`, `kind` | `to=deploy` | `points` |
| Opened to done | `flow.lead` | `id`, `kind` | `to=done` | `points` |
| Done a day | `flow.lead` | `kind` | `to=done` | `bars` |
| Open work, by state | `flow.open` | `state`, `waits` | | `table` |
| Open work, by age | `flow.open` | `waits`, `kind` | | `table` |
| Hours by state | `flow.stays` | `waits`, `state` | | `table` |
| Sent back at review | `flow.submits` | `move` | | `share` |
| Deploys, by Worker | `deploys.confirmed` | `target` | | `bars` |
| Put back, by Worker | `deploys.put-back` | `target` | | `table` |
| Time to restore | `deploys.restore` | `id`, `target` | | `points` |

The last row is task 6, which puts the dashboard again with it.

### Time to restore (R6)

`deploys.restore`, a metric the page reads from `logs.deploys`. That method already reads the
deployer's lines whole for a span and already answers a token that names it. Task 6 adds to its
answer `restores: [{ target, hash, putBack, restored, ms }]`, one for each put-back in the span:
`restored` is the first `deploy.confirmed` or `deploy.verified` of that target after it whose hash
is not the one put back to, `null` when there is none in the lines. `dashboardRead` has a second
branch: a query whose metric is `deploys.restore` is sent as `logs.deploys?from=&to=` with the
range, and a function `restoreRows` makes the answer the page's draws take from `restores`: a row
`{ t: restored, id: target + "@" + the first 8 of hash, target, n: 1, sum: ms, max: ms }` for each
that has a `restored`, with `unit: "ms"` and no `summaries`. `points` draws an answer with no
`summaries` as dots, with `n` and the longest under them and no rule: a percentile is computed
in the tracker's module alone, and 27 points in 7 days do not pay for a second place. A put-back near the start of the 7 days Cloudflare keeps is whole; one whose fix is later than
`until` has no row, and the panel says how many those are.
(As built, `fm-6-restores`, 2026-10-12: `hash` of a row is the hash that was put back; a restore may be at that same hash; `logs.deploys` is sent once for a dashboard, and a panel's `filter` is taken on the rows by `target` or `id`; the answer `restoreRows` makes has `unrestored`, the count the panel says; an answer with no `restores` is that query's error; the record.)

This is the last task (6), and the one to drop if it costs more than it gives (line 5 of the
philosophy): on cb4 it would have drawn 27 points.

### The tool (R7)

`issue-stats.ts` asks `issue.flow` through `issue-as.sh`, as it asks `issue.sync` and
`issue.locks`, and prints a block `flow`: for each `to` of `flow.lead` by kind, `n`, the median
and the 85th; the open issues by `waits` with the median and the longest age; the hours of
`flow.stays` by `waits`. `--until SEQ` sends the `at` of that event as `until`. The numbers are the
answer's `summaries`; the tool computes none of them. One line more: `flow.lead` to `deploy` by
`for`, which is his question for what he asked for himself.
(As built, `fm-4-stats-flow-block`, 2026-10-12: four asks, one for each list; the times are printed
in hours to two places; the hours of the stays are the `sum` of the answer's `series` rows, added by
the tool for each `waits`, since a row of `summaries` has no sum; with no `--until` no `until` is
sent; an ask that is refused is a line `not read` in its place; the record.)

Its lines `time in a state` and `done … median` stay as they are. They answer another question
(each ended stay as one number, the whole record) and three specs quote them.

## Not chosen

- **`flow.*` as metrics of the dashboard service**: a definition that names a method, and
  `metric.query` asks the tracker. For it: `metric.list` would name them, and one method would
  answer every panel. Against: a rule of `metric.query` that lets a token read `flow.` (a change of
  who reads what, so `major`), a call from one service to another on every panel, and a second
  kind of definition in a service whose first was approved a day ago. The page's branch on a name
  is one line and is undone by deleting it. Reopen when something other than the page draws
  dashboards, or a member wants a metric of their own from a service's method.
- **The tracker logs a line when an issue reaches a clock**, and the lines are a metric. No
  percentile and no point (see "What this decides"), 7 days, and a span Cloudflare may answer from
  a sample.
- **The page computes the rows from `issue.sync`.** No method. Against: 4.38 MB in 6 calls on each
  opening of the dashboard after two days of record, growing with it, and his "cost and
  performance is important".
- **`issue-stats.ts` imports `issueFlow` and feeds it the events it already reads**, as part 3 of
  the issue has it. The module in the main checkout is the one `sync.ts` last wrote: at 23:00 CEST
  the file was of 08:20 that morning, and `brain-x-issues` had been deployed since. A call runs
  what cb4 runs, and the answer carries its own percentiles, so nothing is imported.
- **A deploy as an event of the record** (part 2). It needs the deployer to call the tracker, and
  the loop does not deploy the deployer. It would move a clock by under 7 minutes.
- **A bug opened against a change after it was done.** The record has 3 links of `rel: "cause"`
  in 163, and one bug the deployer opened. There is nothing to count yet. Reopen when a bug names
  the change it is against.
- **Hours the loop was stopped taken out of a lead time.** The record has no event for a stop;
  `loop-order-of-service` inferred 8 running periods from gaps of 30 minutes.
- **Tokens and dollars an issue.** `run-cost-is-part-of-the-issue-model` makes a run's cost an
  event. A `flow.cost` metric over those events is a row of the table above when they exist.
- **A span longer than 7 days on the page.** The span is one control for every dashboard, and the
  logs keep 7 days. `issue.flow` itself takes any span, and the tool asks for the whole record.
- **`issue-stats.ts` loses its own `time in a state`.** See "The tool".

## How each requirement is known to be met

Each check is a call with the agent's own tracker token, a call `--as loop-dashboard` or
`--as loop-deploys`, a test, or a local tab with a stand-in client. None needs the owner's tab.
"Before" was run for this spec, 2026-10-11, at the time given. An "after" is what the design asks
for: none has a run behind it, since each needs its task built, and the place it is run is said.

| | check | before | after, and where it is run |
|---|---|---|---|
| R1, R4, R5, R3 | test: `test_issues_flow_*` cells of `brain-issues.ojs` over a record written in the test: each clock of "The clocks" for an issue, a project with two parts, a feedback issue that follows a project; a stay cut at `until`; a swap, a `reopen` and a `revert`; `needs-owner` from the open; rows by `opener` and by `for`; a hidden issue in no row; `flowSummary` of 1, 2 and 20 values. `cd cloud-brain-dev && bun test.ts brain-x-issues --with FILE` | `grep -c "issueFlow\|flowSummary" tools/cloud-brain/brain-issues.ojs`: 0. `bun test.ts brain-x-issues`: 21 passed, 0 failed, at hash `e3b34e862cd1` | `failed` 0, `passed` above 21. Tasks 1 and 2, each in its worktree |
| R1 | `ia "flow?metric=flow.lead&by=id&kind=feedback&to=deploy&since=0&until=1791751911704"` | 501 `MethodNotImplemented`, 23:00 CEST | 200; the rows' count and `flowSummary` against 25, 1.47 h and 7.26 h of the scripts. A difference is said in the task's record with its cause and is not a failed check: the scripts are not the definition. Task 3, on cb4. (As built, `fm-3-issue-flow-method`, 2026-10-12: 31 rows, 1.01 h and 7.26 h on cb4, as `fm-1-lead-times` had from the function; the cause was not found; the record.) |
| R4 | `ia "flow?metric=flow.open&by=state&until=1791751911704"` | 501 | `n` by state: 58 `open`, 24 `triaged`, 10 `building`, 3 `spec`, 2 `awaiting-approval`, 2 `in-progress`, which is the line `states` of `issue-stats.ts --until 2727` less the closed. Task 3, on cb4 |
| R5 | `ia "flow?metric=flow.stays&by=state&waits=owner&since=0&until=1791751911704"` | 501 | `sum` near 242.9 h for `needs-owner` and 8.5 h for `awaiting-approval` (the scripts, with the stays not ended). Task 3, on cb4. (As built, `fm-2-open-stays-submits`, 2026-10-12: over the record read with a token the function gave 192.49 h in 61 waits for `needs-owner`, 6 not ended, and 8.54 h for `awaiting-approval`; the 242.9 h was not reproduced; the record.) |
| R3 | `ia "flow?metric=flow.submits&since=0&until=1791751911704"` | 501 | `n` near 202 and `sum` near 70. Task 3, on cb4 |
| the method's cost | `cost.ms` of five asks of `flow.lead` over the whole record | not built | written in the task's record; over 1000 the writer narrows the read. Task 3, on cb4 |
| R7 | `bun test tests/tools/issue-stats.test.ts`; `bun tools/cloud-brain/issue-stats.ts --token=<own> --until 2727` | 21 pass, 0 fail; no block `flow` | the tests pass with one more for the block; its line for feedback to deploy has the `n`, median and 85th of the R1 call, and it has a line by `for`. Task 4, main checkout for the run. (As built, `fm-4-stats-flow-block`, 2026-10-12: 27 pass before, the file having grown since the count, and 32 after, five more; the line read `deploy    feedback    31  median    1.01 h  85th    7.26 h`; the record.) |
| R8 | test: `test_*` cells of `brain-dashboard.ojs`: `dashboardRead` with a stand-in client sends `issue.flow` for `flow.lead` and `metric.query` for `deploys.confirmed`; `points` draws one dot a row and two rules for each of the `summaries`; a panel `points` with no `id` in `by` says so; `share` writes `sum / n`; `dashboard.put` keeps `draw: "points"`. `bun test.ts brain-x-dashboard --with FILE`, then `tab-tests.ts` | 13 passed, 2 need a browser | `failed` 0, `passed` above 13. Task 5 |
| R8, R2, R3 | `brain.ts curl /xrpc/com.lopecode.brain.dashboard.list --as loop-dashboard`, then `dashboard.get?name=flow` | `{"dashboards":[{"name":"health","title":"Health"}]}` | `flow` is listed and answers the panels of the table. `deploy/services.json` is the same before and after. Task 5 |
| R2, R3 | `metric.query?metric=deploys.confirmed&by=target` and `deploys.put-back` over 7 days `--as loop-dashboard` | 187 over 22 targets, 29 over 12 | nothing to build; the panels name them |
| R6 | `brain.ts curl "/xrpc/com.lopecode.brain.logs.deploys?from=MS&to=MS" --as loop-deploys` | no `restores` in the answer (its keys: `from`, `to`, `queries`, `lines`, `workers`, `tests`) | `restores` has a row for each `deploy.put-back` of `lines`; a test of `brain-logs.ojs` on its fixture, and a test of `brain-dashboard.ojs` that `dashboardRead` sends `logs.deploys` for `deploys.restore` and `restoreRows` makes one row for each restore that has an end. Task 6 |

What only the owner can see: the dashboard `flow` drawn in his tab on cb4, with the span he
chooses. It is no condition of a task landing.

## Tasks, in the order they land

Each is one writer and one review, and writes `tools/cloud-brain/records/<its id>.md`.

1. **fm-1-lead-times.** `issueFlow` for `flow.lead`, `flowSummary`, their tests, and "The
   clocks" in the reference cell. No method yet; a deploy of `brain-x-issues` with no change of
   what it answers.
2. **fm-2-open-stays-submits.** `flow.open`, `flow.stays` and `flow.submits` in `issueFlow`, with
   their tests.
3. **fm-3-issue-flow-method.** `issue.flow`, its line in the method table, the test of the count
   of methods (22 becomes 23), the four calls on cb4 and `cost.ms`.
   (As built, `fm-3-issue-flow-method`, 2026-10-12: 24 becomes 25, four methods having been added
   since the count; the record.)
4. **fm-4-stats-flow-block.** The block `flow` of `issue-stats.ts` and its test.
5. **fm-5-page-and-dashboard.** The branch in `dashboardRead`, `points`, `share`, hours for `ms`,
   the note of `panelBody`. A deploy of `brain-x-dashboard`, and of `brain-x-page` if the build
   moves it. Then `dashboard.put` of `flow` without its last row, with `loop-dashboard`, and a line
   for it in `knowledge/working-with-cloud-brain-remote-lopecode-cluster.md`.
6. **fm-6-restores.** `restores` in `logs.deploys` (a deploy of `brain-x-logs`), the second branch
   and `restoreRows` in the page, and `dashboard.put` of `flow` again with the row "Time to
   restore".
   (As built, `fm-6-restores`, 2026-10-12: two deploys, `brain-x-logs` and then `brain-x-dashboard`; the record.)

Tasks 1 to 4 need nothing of `dashboard-service`. Task 5 changes the module that
`dsv-6-health-through-the-service` (triaged) also reads; whichever lands second rebases. Task 5
does what `dsv-7-second-dashboard-as-data` (triaged) asks to be shown possible, and does not wait
for it.

## What only the owner can do

1. **Approve this spec, or send it back.** There is one choice in it that he may want otherwise:
   the `flow.` panels are read from the tracker by the page, and are not metrics that
   `metric.query` answers ("Not chosen", first item). Answer "A" for the spec as written, or "B"
   for metrics of the service, which adds a rule that lets a token read them.
2. **Open the dashboard** when task 5 is done, at `#dashboard=flow`, and say what is missing.

No task installs a policy, makes a secret, changes a rule of a method, or deploys the kernel, the
core, the database or the deployer.

## What the orchestrator makes

Nothing. `issue.flow` is read with each agent's own tracker token, `dashboard.put` with
`loop-dashboard` and `logs.deploys` with `loop-deploys`, which are kept.

## The fresh review before submitting (2026-10-11, answered by 23:09 CEST)

One reader with no context read the draft against the seeds: 10 findings, all taken.

- **`deploys.restore` had no route and no draw**: the page sent it to `metric.query`, and `points`
  asked for `id`. It now has a branch of its own and rows with an `id`, and a test.
- **The restore row was put a task before the dashboard existed.** The dashboard is task 5 and the
  restores task 6, which puts it again.
- **The clocks were silent** on a swap, a `revert` with refs, `promote`, a feedback's done before
  it was opened, a stay in a closed state and a label on the open. Each is now said.
- **The page would have imported the tracker's module** for `flowSummary`. The answer carries
  `summaries`, and nothing imports.
- **`groups` was not defined**, and the page's note of 500 would have shown. Both said.
- **Open work by age as points** put every dot at `until`. It is a table.
- **Thin checks**: `opener` and `for`, the submits, `awaiting-approval`, `send-back`.
- **The policy cited was the seed's default.** The function reads the workflows of the record.
- **Task 1 was too large.** Two tasks.
- **A module file without `flowSummary`** was not covered. Gone with the import.
