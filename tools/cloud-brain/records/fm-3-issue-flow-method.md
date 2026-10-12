# fm-3-issue-flow-method

Task 3 of `plan/cloud-brain-flow-metrics.md` (approved for the owner at event 3379): the method
`issue.flow` of `brain-x-issues`, which answers `issueFlow` (tasks 1 and 2) to a caller. Written
2026-10-12. The seed's commit was made at 04:43:35 CEST that day (`git log --format=%ci`), and the
deployer's line `deploy.verified` for the build is in `logs.deploys`; the commit and the deploy are
refs of the submit.

## What changed

`tools/cloud-brain/brain-issues.ojs`, 92 lines more and 5 fewer (`git diff --numstat 9531a420 1a550960`):

- `issues_service` declares `issue.flow`, a query, under the rule of the other reads:
  `caller.kind in ["owner", "token", "worker", "deployer"]`.
- The route, in `issuesApp`:

  ```
  GET issue.flow?metric=&since=MS&until=MS&by=dim,dim&DIM=value
  ```

  It reads every event with `walk` (pages of 500, the statement `issue.verify` reads with), then
  the view, and gives `issueFlow` each event as `issue.sync` would answer it to the caller. The
  answer is `issueFlow`'s with `cost.ms` replaced.
- `shownEvent(view, by)`: what `issue.sync` did inline to an event of an issue the caller may not
  read is now one function, which both methods call. `issue.sync` answers as before; its tests
  pass unchanged.
- The method table has a row `issue.flow`. The first sentence of "The flow of work" said "No
  method answers them yet" and now names the method.
- One test cell more, `test_issues_flow_method_answers_the_rows_a_caller_may_read`, and two
  changed: the list of methods in `test_issues_declares_what_it_needs` has `flow`, and the test of
  the reference holds two strings of the new row.

No table, no statement of SQL, no rule of another method and no setting changed.

## Where the spec is silent or was not followed, and what was taken

Each by line 2 of `philosophy.md` (the smaller side, said here).

| The spec | Built | Why |
|---|---|---|
| "the test of the count of methods (22 becomes 23)" | 24 becomes 25 | `issue.cost`, `issue.runs`, `issue.lock` and `issue.locks` were added after the spec counted. `test_issues_declares_what_it_needs` returned "24 methods" on what cb4 ran before and returns "25 methods" now |
| `since` and `until` left out | 0, and the `at` of the record's last event: what `issueFlow` takes for them. Left empty (`since=`) is left out | One default, the function's. The other reading, the time of the call for `until`, makes the age of open work a few minutes longer and an answer that no test can state. A caller that wants ages now sends `until` |
| A `since` or `until` that is not a number | 400 unless it is 1 to 15 digits. `1.5`, `-1`, `1e3`, a space and 16 digits are refused | `Number("")` and `Number(" ")` are 0, and a query's values are text |
| `cost: { ms, events }` | `ms` is the whole call in the Worker: the read, the view and the rows. `events` is `issueFlow`'s, how many events at or before `until` | The function alone took 1 to 4 ms in task 2's measurement, so its own `ms` could not show what the spec's limit of 1 s is about, the read |
| An ask that is wrong | Refused before the record is read: the handler first calls `issueFlow` over no events. A `since` after the record's last event with no `until` is the one refusal that needs the read | 4 MB is not read to answer 400 |
| Who may read an issue | Judged by the view at the call, as `issue.sync` judges it, whatever `until` is | "it leaves out the events `issue.sync` would answer `hidden` to that caller". An issue that became a security report after `until` is in no row of an earlier span |
| A filter left empty (`kind=`) | 400, `issueFlow`'s refusal | `issue.runs` reads an empty filter as none. Here every other parameter is a filter, and one with no value matches no row |
| "over 1000 the writer narrows the read" | Not narrowed | 374 to 716 ms in the 22 answers below |

## Tests

Each count is from the command beside it, run in the worktree after the last edit of the seed (on
`main` as `1a550960`). The two rebases before the landing brought nothing in. One after it, before
this record was written, brought in eight files of `ps-4-the-rest` (a tool, its tests, a record,
two docs, the loop's `SKILL.md`, `seen.json`), none of which this module is built from.

| Command | Result |
|---|---|
| `cd cloud-brain-dev && bun test.ts brain-x-issues` (what cb4 ran before, hash `556d47216d31`) | `passed` 35, `failed` 0, `needsBrowser` 15 |
| `bun test.ts brain-x-issues --with …/.emitted/fm-3.js` (the build) | `passed` 36, `failed` 0, `needsBrowser` 15 |
| `bun tools/cloud-brain/tab-tests.ts …/cloud-brain.html @tomlarkworthy/brain-issues --emit issues_service=…` (Chrome 151.0.7922.34) | `tests` 51, `passed` 51, `failed` []; emitted hash `d53d1c8d7e47` |
| `BRAIN_BASE=cb4 bun tools/cloud-brain/verify-run.ts brain-x-issues --shell …/cloud-brain.html --times 20` | `runs` 20, `passed` 20, `failed` 0, `none` 0, `byChance` [], `from` ["document"]; `"tests":51` in each of the 20 lines (`grep -c`) |
| `brain.ts apply` under the deploy lock | `"state":"verified"`, `"tests":51`, 25487 ms |
| After the landing: `bun sync.ts https://cb4.endpointservices.workers.dev && bun test.ts brain-x-issues` | hash `d53d1c8d7e47…`, `passed` 36, `failed` 0, `needsBrowser` 15 |

Ten changes of one line each were made to a copy of the built module, and `test.ts --with` was run
on each. Every one failed the new test:

| The line changed | Failed |
|---|---|
| `flow` not in the service's methods | the new test and `test_issues_declares_what_it_needs` (`passed` 34, `failed` 2) |
| No route (the path renamed) | the new test alone, as the nine below (`passed` 35, `failed` 1) |
| The events given to `issueFlow` as the record has them, none hidden | |
| No refusal before the read | |
| The filter not passed | |
| `until` not passed | |
| `since` not passed | |
| `by` not passed | |
| Any text `Number` reads taken as a time | |
| An empty `since` or `until` read as text | |

The new test holds `cost` to its two keys, to `events`, and to `ms` being a number of 0 or more.
It does not hold that `ms` covers the read: a line that left `issueFlow`'s own `ms` in the answer
would pass it.

## On cb4

Each call with the writer's own tracker token, `tools/cloud-brain/issue-as.sh impl-ad5280 "flow?…"`,
from 04:46 CEST on 2026-10-12 (`date`), against hash `d53d1c8d7e47`. Before the deploy, at 04:39,
the first of them answered 501 `MethodNotImplemented`.

The four checks of the spec, with `until=1791751911704`, the `at` of event 2727:

```
flow.lead  by=id kind=feedback to=deploy since=0   31 rows; n 31, median 1.01 h, p85 7.26 h, max 10.00 h   cost.ms 716, events 2727
flow.open  by=state                                open 58, triaged 24, building 10, spec 3, awaiting-approval 2, in-progress 2   cost.ms 519
flow.stays by=state waits=owner since=0            awaiting-approval 34 stays 8.54 h; needs-owner 61 waits 192.50 h   cost.ms 477
flow.submits since=0                               n 202, sum 70   cost.ms 407
```

- **R4** is the spec's six counts.
- **R3** is the spec's 202 and 70. By `move`: `submit` 172 with 54 sent back, `submit-spec` 30 with 16.
- **R5**: 8.54 h at `awaiting-approval` against the spec's 8.5 h. `needs-owner` is 192.50 h and not
  the spec's 242.9 h; by `ended`, 55 waits that ended (190.22 h) and 6 that had not (2.27 h). The
  record of `fm-2-open-stays-submits` has the same 61, 6 and 192.49 h from the function run on
  this machine, and what it tried to reproduce 242.9 h with. The spec's scripts are not kept.
- **R1**: 31 rows, 1.01 h and 7.26 h, against the spec's 25, 1.47 h and 7.26 h. The record of
  `fm-1-lead-times` has the same 31 and 1.01 h from the function run on this machine; it did not
  find what the spec's script left out.

So the method on cb4 answers what the function answered on this machine over the events
`issue.sync` gave a token. The writer's token is answered hidden events (7 among the first 500 of
`sync?after=0`), so these counts are of what a token reads, as the spec's were.

`cost.ms`, the five asks of `flow.lead` over the whole record (no `until`; `events` 3634, an
answer of 396 bytes):

```
404  467  380  401  374
```

The wall time of each from this machine, through `issue-as.sh`: 0.77 to 0.89 s.
Four asks with every dimension in `by`, the largest answer 126,130 bytes (`flow.lead`, 728 rows):
375, 380, 446, 394. Of the 22 answers with a `cost` read for this record the lowest was 374 and
the highest 716, the first call after the deploy. None was over 1000, so the read is not narrowed
and nothing is kept between calls, as the spec orders.

Also tried there: the same ask twice, with `since=&until=` and with `since=0&until=` the record's
last `at`, gave one answer but for `cost` (a SHA-256 of the rest, four times `d3a0d7d03a1e`);
`until=0` answered no rows and `events` 0; `metric=flow.nope`, no metric, `since=abc`, `until=1.5`,
`since=-1`, `until=` 16 nines, `by=id,id`, `bogus=1`, `kind=`, `since=2&until=1` and a `since`
after the last event each answered 400 `InvalidRequest`; a POST answered 405, "com.lopecode.brain.issue.flow is a query"; a call
with no token answered 401 `AuthRequired`.

## Not tried

- A caller that reads every issue (the owner present) on cb4, and so whether a hidden issue of
  cb4's record is in a row for him and in none for a token. The test does this on a record of its own.
- A member's Worker and the deployer as callers on cb4. The rule is the test's, by `decide`.
- A write that lands between the read of the events and the read of the view. The events are read
  first so that the view has every issue they name; no test stops a write in between.
- A record larger than 3634 events. `cost.ms` was near 400 for it; what it is at twice that was not measured.
- Two asks at once, and the page's 11 panels asking together (task 5).
- What `cost.ms` leaves out. It is `Date.now()` at the end of the handler less the one at its start.
  Whether a Worker's clock moves while it computes was not checked; if it does not, `cost.ms` is the
  waits for the database, without the parse and the rows. The wall times above are 0.38 to 0.49 s
  more than `cost.ms`, and hold this machine's network and the core.
- `issue-stats.ts` and the dashboard over the method: tasks 4 and 5.
