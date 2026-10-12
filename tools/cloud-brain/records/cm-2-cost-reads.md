# cm-2-cost-reads

Task 2 of `plan/cloud-brain-run-cost-is-part-of-the-issue-model.md` (approved for the owner at
event 2610): the two reads of what a run cost, on `brain-x-issues`. `issue.get` answers `cost`, and
`issue.runs` is a new query. Written 2026-10-12 (the seed's commit is a ref of the submit). No
`cost` event is on cb4 yet (task 4 writes them), so on cb4 both reads answer totals of 0.

## What changed

`tools/cloud-brain/brain-issues.ojs`:

- A new cell, `issueCost(runs)`, with no I/O: `{ runs, seconds, billed, input, cacheWrite,
  cacheRead, output, requests, advisor: { calls, input, output }, usd, usdRuns }`. The token sums
  are of the runs that have a `usage`. `usd` and `usdRuns` are left out when no run has a `usd`.
- `issue.get`: `cost`, beside `issue`, `children` and `events`. It is `issueCost` of the row's
  `runs`, and `byRole`, the same for each role. The answer for a hidden issue is as it was.
- `issue.runs`, a query: `?id=&role=&how=&round=&after=<seq>&limit=500`, answering
  `{ runs, total, more }`. It reads the rows as `issue.list` does (`S.all`) and drops each issue
  that `shown` answers hidden before any run is taken from it.
- `issues_service`: the method `com.lopecode.brain.issue.runs`, a query, under the rule the other
  methods have.
- The method reference: the row of `issue.get`, and a row for `issue.runs`.
- Two new test cells, `test_issues_cost_totals_are_in_get_with_each_role` and
  `test_issues_runs_answers_what_a_caller_reads_a_page_at_a_time`. Two changed: the method list of
  `test_issues_declares_what_it_needs` (23 to 24), and three stated values more in
  `test_issues_reference_states_each_value_and_has_no_hole`.

`plan/cloud-brain-run-cost-is-part-of-the-issue-model.md` has an "As built" note under each of the
two reads. `tools/cloud-brain/running-a-cloud-brain.md` names the two in its line on issues.

## Where the spec is silent, and what was taken

Each by line 2 of `philosophy.md` ("take the side that is smaller and easier to undo").

| Open in the spec | Built | Why |
|---|---|---|
| What `how=warm`, `round=abc`, `round=0`, `after=-1`, `limit=0`, `limit=501`, `role=Implementer` answer | 400 `InvalidRequest` naming the field | Read as no filter, a misspelt value answers every run and their totals, and the caller takes a median of the wrong set. The spec refuses an unknown field of `issue.cost` for the same reason. `issue.list` clamps its `limit` and was not changed |
| A filter left empty (`role=`) | Asks for nothing | The spec writes the query as `?id=&role=&how=…` |
| A query name that is not one of the six (`rol=reviewer`) | Not read | Not refused: what names the core adds to a forwarded query was not read. So a misspelt name does answer every run |
| The order of `runs` | By `seq` of the event in force | `after=<seq>` needs one order over all issues |
| Whether `total` is of the page | Of every run that matches `id`, `role`, `how` and `round`; `after` and `limit` do not change it | The spec: "not of this page". The same on every page |
| `id` of an issue the caller may not read, or of none | `{ runs: [], total: { runs: 0, … }, more: false }` | The spec: "leaves out an issue the caller may not read". `issue.get` answers a stub for the first and 404 for the second |
| `usd` of 0.1 and 0.2 | 0.3: the sum is rounded to a millionth | A sum of floats is otherwise 0.30000000000000004 |
| The order of `byRole` | Each role's first run in the row's `runs` | The row's own order |
| A role named `constructor` | A key of `byRole` as any other | `Object.fromEntries`, with no lookup on an object |

A run written again between two pages gets a new `seq`, and a caller that pages with `after` reads
it again on a later page. The reference says so. Nothing in the answer marks it.

## Tests

Each count is from the command beside it, run in the worktree after the last edit of the seed.

| Command | Result |
|---|---|
| `cd cloud-brain-dev && bun test.ts brain-x-issues` (what cb4 runs, hash `42a5db1103f6`) | `passed` 24, `failed` 0, `needsBrowser` 14 |
| `bun test.ts brain-x-issues --with …/.emitted/cm-2-cost-reads.js` (the build) | `passed` 26, `failed` 0, `needsBrowser` 14 |
| `bun tools/cloud-brain/tab-tests.ts …/cloud-brain.html @tomlarkworthy/brain-issues` (Chrome 151.0.7922.34) | `tests` 40, `passed` 40, `failed` [] |
| `BRAIN_BASE=cb4 bun tools/cloud-brain/verify-run.ts brain-x-issues --shell …/cloud-brain.html --times 20` | `runs` 20, `passed` 20, `failed` 0, `none` 0, `byChance` [], `from` ["document"]; `mains` brain-shell and brain-issues; `"tests":40` in each of the 20 lines |

40 is 26 and 14: no count differs between the two runners.

**The tests fail without the change.** This task adds a read, so there was no defect to reproduce.
The seed with the test cells and no other change, then the seed as changed with one line altered,
each one build and one `bun test.ts brain-x-issues --with`:

| The seed | `failed` | Which |
|---|---|---|
| the four test cells and nothing else | 4 | the two new cells, `…declares_what_it_needs`, `…reference_states…` |
| `issue.runs` does not drop a hidden issue | 1 | `…runs_answers…` |
| `total` is of the page | 1 | `…runs_answers…` |
| `more` is `>=` the limit | 1 | `…runs_answers…` |
| `after` is not read | 1 | `…runs_answers…` |
| no sort by `seq` | 1 | `…runs_answers…` |
| a `how` that is none is no filter | 1 | `…runs_answers…` |
| `later` is round 1 or more | 1 | `…runs_answers…` |
| `issue.get` answers `cost` for a hidden issue | 1 | `test_issues_hidden_from_who_may_not_read`, a cell from before this task |
| no `byRole` | 1 | `…cost_totals…` |
| `usd` not rounded | 1 | `…cost_totals…` |
| a `usd` of 0 counted as none | 1 | `…cost_totals…` |
| `billed` counts every run | 2 | both new cells |

What the two cells hold, against the spec's "How each requirement is known to be met":

- R3, on a rig: an issue with five runs of three roles, three of them with a `usage` and three
  with a `usd`: `cost` whole, `byRole` whole. An issue with no run: every total 0, `byRole: {}`.
  The run without a `usage` written again with one: 5 runs still, 4 billed.
- R4, on a rig: six runs on three issues, one of them a security issue. 17 queries of `id`,
  `role`, `how` and `round`, alone and together, each with the runs it answers.
- The hidden issue: its run is in no answer and no `total` to another token or to a Worker of the
  Brain, with no filter, with `id=` its own id, and with a filter its run matches. Its opener and
  the owner present read it.
- The page past the limit: 5 runs with `limit=2` over four pages, `more` true, true, false,
  false, and `total.runs` 5 on each. `limit=5` of 5 is `more: false`.
- 15 bad values, each 400 with its message. The record has 11 events after all of the reads.

## Not tried

- `issue.runs` on cb4 with a run in the record: none is there until task 4. What cb4 answers
  after this deploy is in the issue's comment.
- The spec's checks of R3 and R4 on cb4 (`cost.runs` 8 of `record-first-resumed-rework-round`, 17
  resumed implementer runs): they are task 4's, after its `--post`.
- The size and the time of `issue.runs` over 288 runs or more. The rig has 6.
- More runs than 500 in one answer. The limit is tested at 1 to 5 and at its two bounds as values.
- A caller the method's rule refuses (a member). The rule is the one every other read of the
  service has, and the core judges it; the rig calls the service past the core.
- A query name sent twice (`role=a&role=b`).
- The page: nothing draws `cost` or calls `issue.runs`. That is task 6.
