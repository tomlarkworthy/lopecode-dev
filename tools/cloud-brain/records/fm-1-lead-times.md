# fm-1-lead-times

Task 1 of `plan/cloud-brain-flow-metrics.md` (approved for the owner at event 3379): the lead times
of an issue, as two cells of `@tomlarkworthy/brain-issues`. No method answers them yet; that is
task 3. Written 2026-10-12, with the seed's commit of 03:49 CEST that day (`git log --format=%ci`;
the commit and the deploy are refs of the submit).

## What changed

`tools/cloud-brain/brain-issues.ojs`, 433 lines more (`git diff main --stat`):

- `flowSummary(values)`: `{ n, median, p85, max }`, nearest rank. The place is `ceil(n * 85 / 100)`,
  counted in whole numbers, so no product of floats decides it.
- `issueFlowMetrics`: one entry, `flow.lead`, with its unit and its five dimensions. Task 2 adds three.
- `issueFlow(events, { metric, since, until, by, filter })`. It makes the view at `until` with
  `issueApply`, the function the service makes it with, and keeps beside it what the view does not:
  the `opened` event of each issue, its moves, and every workflow a policy named for the kind
  `feedback`. It reads seven cells: `issueAt`, `issueFlowMetrics`, `issueView`, `issueApply`,
  `callerOf`, `issueCaller`, `flowSummary`.
- A prose cell, "The flow of work", with "The clocks" as built. It is part of
  `getSource?worker=brain-x-issues&part=reference`.
- Five test cells and a helper, `issuesFlowRecord`, which sets the `at` of event n to a fixed day
  plus n hours. The records of the tests are written through the service (`issuesRig`), so each
  event has the fields a real one has and was let through by the default policy's guards; a lead
  time is then a difference of two seqs, and no test reads the clock.
- `test_issues_reference_states_each_value_and_has_no_hole` holds four more texts: the two headings
  and the row of `flow.lead` with its unit and dimensions from `issueFlowMetrics`.

`plan/cloud-brain-flow-metrics.md` has three "As built" notes, at the lines the list below differs from.

No method, no rule and no table changed. The one thing a caller of cb4 can see is the reference text.

## Where the spec is silent or was not followed, and what was taken

Each by line 2 of `philosophy.md` (the smaller side, said here).

| The spec | Built | Why |
|---|---|---|
| `issueFlow` "reads no other cell but the helpers it is given" | It is given none and reads seven cells | A second replay of the record beside `issueApply` would be a copy that drifts. `issue-stats.ts` has one |
| A project's deploy is "the first deploy of any of its parts" | The first made after the project was opened, of its parts and of theirs in turn | A report gathered into a project may have been deployed before the project existed: a lead time under 0. "After it was opened" is the spec's own rule for feedback |
| What a project is | An issue of kind `project` or `feature` | The spec's words. The kinds `feedback`, `project`, `feature`, the move `submit` and the state `done` are read as names |
| "A feedback issue that became a task is counted as the kind it has at `until`" | Its `kind` stays `feedback`, and it has its own clocks | No event changes an issue's kind (`issueApply`). What changes is its workflow: an issue of kind `feedback` that is on no workflow a policy named for that kind follows nothing |
| Feedback's deploy, "the first deploy among them after it was opened" | The first submit with a deploy ref after the feedback was opened, whether or not it is that issue's first | A followed task deployed before the feedback and again after it did deploy the feedback's change the second time. 3 of the 31 rows on cb4's record are of this kind (below) |
| Feedback's done, "among the issues it follows" | The issues it follows, not their parts | As written |
| Who opened: the roles `impl`, `rev`, `orch`, `over`, `spec`, `out` | `dig` too, as `role` of `issue-stats.ts` has it. The pattern is written again in the cell: a seed cannot import a tool | |
| A delegation whose holder has no name | `opener: "token"` | The spec has no word for it. `owner` would be read as his session. 0 of the 312 `opened` events on cb4 are of this kind today (below); the tracker's tests make such callers |
| `since`, `until` left out | 0, and the `at` of the last event | The function reads no clock for its answer. The method of task 3 can send its own |
| An unknown metric, a name that is no dimension, a filter value that is empty or not text, `since` after `until` | An error with `status: 400` and `code: "InvalidRequest"` | The spec: "any other name is 400". The method maps it |
| `for: "owner"`, "when he opened it in his tab" | `caller.present` of a guard for the `opened` event's `by` | A session made from a Brain's state file is present too (`brain-issues.ojs`, "Who is present"), so an issue a session opened with `--owner` reads as his |

## Tests

Each count is from the command beside it, run in the worktree after the last edit of the seed and
after `worktree.sh --rebase` (which brought in no file the module is built from).

| Command | Result |
|---|---|
| `cd cloud-brain-dev && bun test.ts brain-x-issues` (what cb4 ran, hash `0f7eb7a35b38`) | `passed` 27, `failed` 0, `needsBrowser` 15 |
| The same `--with` a build of the seed with the five test cells and without the three new cells | `passed` 27, `failed` 5: `flowSummary is not defined` twice, `issueFlow is not defined` three times |
| `bun test.ts brain-x-issues --with …/.emitted/fm-1-lead-times.js` (the build) | `passed` 32, `failed` 0, `needsBrowser` 15 |
| `bun tools/cloud-brain/tab-tests.ts …/cloud-brain.html @tomlarkworthy/brain-issues --emit issues_service=…` (Chrome 151.0.7922.34) | `tests` 47, `passed` 47, `failed` []; emitted hash `d0529566c96d` |
| `BRAIN_BASE=cb4 bun tools/cloud-brain/verify-run.ts brain-x-issues --shell …/cloud-brain.html --times 20`, before the rebase, on the same seed | `runs` 20, `passed` 20, `failed` 0, `none` 0, `byChance` [], `from` ["document"]; `"tests":47` in each of the 20 lines |

Six changes of one line each were made to a copy of the built module, and `test.ts --with` was run on
each. Each failed one of the new tests and no other:

| The line changed | The test that failed |
|---|---|
| A followed deploy counted whenever it was made | `test_issues_flow_lead_of_a_project_and_of_feedback` |
| The place of a percentile as `floor(n * p / 100)` | `test_issues_flow_summary_is_nearest_rank` |
| A hidden event read as an `opened` one | `test_issues_flow_leaves_out_what_the_caller_may_not_read` |
| Any move with a deploy ref counted as a deploy (a `revert`) | `test_issues_flow_lead_has_the_four_clocks_of_an_issue` |
| A promoted feedback issue made to follow | `test_issues_flow_lead_of_a_project_and_of_feedback` |
| The parts of what feedback follows not read | `test_issues_flow_lead_of_a_project_and_of_feedback` |

## Over cb4's record

Not a test and not kept: a script in the session's scratch directory loaded the built module as
`cloud-brain-dev/test.ts` does and gave `issueFlow` the 3523 events `issue.sync` answered the
writer's token at 03:45 CEST (12 of them hidden). With `until` the `at` of event 2727, which the
spec's checks name:

```
by kind, to=deploy   task n=27 median 0.43 h p85 2.41 max 15.52   bug n=14 0.52 2.05 21.26
by kind, to=done     task n=74 0.61 2.30 20.24                    bug n=36 0.60 2.91 21.54
bug, to=response     n=59 0.02 1.41 4.60
feedback, to=deploy  n=31 median 1.01 h p85 7.26 max 10.00
```

The first three lines are the spec's table to the digit. The fourth is not: the spec has 25, 1.47 h
and 7.26 h. Its scripts are not kept, so the cause was not found. Of the 31 rows, 5 are feedback
issues that were promoted and deployed as themselves, and 3 are of a followed issue's second or
third deploy; whether those 8 hold the 6 was not shown. The spec says of this check, which is
task 3's on cb4, that "the scripts are not the definition".

Over the whole record the same ask also answered 31 rows. Checked by hand from the events: 5 submits
with a deploy ref are after event 2727, and the two feedback issues that follow one of them had a
row from an earlier deploy.

`cost.ms` of five asks of `flow.lead` by `id` and `to` over the 3523 events, on this machine under
bun: 2, 3, 3, 2, 2. That is the function alone, with the events already parsed; the read of the
record and a Worker's clock are task 3's to measure.

Who opened, over the 312 `opened` events the token read: 293 by a token with a name, 17 by the
owner's session in a tab, 1 by a Worker, 1 by the deployer.

## Not tried

- `issueFlow` in a Worker. Nothing on cb4 calls it until task 3. What the deploy changed there is
  the Worker's hash and its reference text.
- A record with more than one policy in a test: every flow test runs under the default policy. A
  feedback issue moved by an install's `migrate` to a new feedback workflow is followed on cb4's
  record (the rows above), and no test cell has that case.
- Two events with one `at`. A followed deploy counts when its `at` is greater than the feedback's
  own, so one in the same millisecond does not.
- An event whose `at` is lower than that of the event before it. Events are cut by `at` and read in
  the order given.
- The rows of `flow.open`, `flow.stays` and `flow.submits`, a stay cut at `until`, and
  `needs-owner`: task 2.
- A record of a size cb4 does not have yet. 3523 events were read in 2 to 3 ms.
