# `tab-tests.ts` gives a test one verdict (`tab-tests-lists-one-fail-several-times`)

The issue (event 2828, 2026-10-11): two writers saw `tab-tests.ts` list one failed test cell five
and six times, with each line taken from `passed` (`records/ow-2-panel-offers-what-it-shows.md`,
`records/ow-3-operator-shown-the-issue.md`). The cause was not known.

Round 1, a writer of the issue loop, 2026-10-11. The change is the commit that last touched the
tool: `git log -1 --format='%h %ci' -- tools/cloud-brain/tab-tests.ts`.

## The cause

`runTests` observes each `test_*` cell through a variable of a module of its own. The runtime calls
that observer's `rejected` on every run of the cell, not on the first alone, and a cell is run again
each time one of its inputs has a new value. Each call pushed a line to `bad`, and
`report` counts `passed` as the number of cells less the number of lines. Lines stopped only when
the last test of the module had its first verdict and `runTests` returned.

Seen with no browser, before the change, in a real `@observablehq/runtime` (a scratch script, not
kept): a module with `tick` (a generator of 5 values), `test_missing` with inputs `tick` and a name
no cell defines, `test_ok`, and `test_slow` (a promise of 400 ms, which keeps the run open):

```
"bad": 5 lines, each "test_missing nowhere is not defined"
report: {"tests":3,"passed":-2,…}
```

Five values of `tick`, five lines. The same script after the change: one line, `"passed":2`.

Seen in a browser, the case of the issue. A build of the seeds as the worktree had them before its
rebase, with one line of `brain-issues.ojs` changed and not committed (`issuesAttention = ` renamed,
so two test cells name a cell that is not there), one run of each tool, Chrome 151.0.7922.34,
between 23:21:28 and 23:26:40 CEST (a `date` before and after):

| tool | command | `tests` | `passed` | `failed` |
|---|---|---|---|---|
| as it was (`git show HEAD:tools/cloud-brain/tab-tests.ts`, before the commit) | `bun tools/cloud-brain/tab-tests-old.ts .emitted/broken.html @tomlarkworthy/brain-issues` | 35 | 31 | 4 lines: `test_issues_attention_is_offered_by_name` once, `test_issues_attention_part_says_what_is_shown` three times, each `issuesAttention is not defined`. Exit 1. |
| changed | `bun tools/cloud-brain/tab-tests.ts .emitted/broken.html @tomlarkworthy/brain-issues` | 35 | 33 | 2 lines, one a cell. Exit 1. |
| changed, on a build of the seeds as committed (before the rebase, which brought in no seed) | `bun tools/cloud-brain/tab-tests.ts tools/cloud-brain/.emitted/cloud-brain.html @tomlarkworthy/brain-issues` | 35 | 35 | `[]`. Exit 0. |

Which input of that cell had a new value twice more was not looked into.

## What changed

`tools/cloud-brain/tab-tests.ts`, `runTests`: a test has one verdict, its first, whichever of a
value, a throw or the timeout comes first. Later calls of the observer are not read. The header
says so.

One behaviour beside the count changes. A cell whose first run gives a value and whose later run
throws is now passed. Before, it was failed when the later run came while another test of the
module had no verdict yet, and passed otherwise. The first run is what the header already said the
tool reads, and what the page reads (below). A test that passes and fails on one build is what
`verify-run.ts --times` is for (`byChance`).

`report` is not changed.

## The issue's second question: does the owner's page count the same way

Read, not run. `verifyModule` (`tools/cloud-brain/brain-shell.ojs`, line 155 at `eb8eebb5`) awaits
`mod.value(name)` once for each test name with one `.catch` that pushes one entry: a promise
settles once, so a cell is one entry there. `judge` of `tools/cloud-brain/verify-run.ts` puts a
run's `failed` in a `Map` by name before it counts. Neither seed nor `verify-run.ts` was changed.

## Tests

`tests/tools/tab-tests.test.ts`, one test added: "a test_ cell that is computed again has one
verdict, its first: one line when it throws each time, none when it throws later". No browser; the
in-page function against a real runtime.

| command, in the worktree | result |
|---|---|
| `bun test ./tests/tools/tab-tests.test.ts`, the test added and the tool as it was | 9 pass, 1 fail: `bad` had 9 lines where 1 was expected (5 of `test_missing`, 4 of `test_flip`) |
| `bun test ./tests/tools/tab-tests.test.ts`, after the change and the rebase on `eb8eebb5` | 10 pass, 0 fail |
| `bun test ./tests/tools`, after the change and the rebase on `eb8eebb5` | 431 pass, 1 skip, 0 fail, 432 tests across 48 files. The output had no `skipped:` line; which test is the skip was not looked into. |

A run of the suite before the rebase gave 424 pass, 1 fail: `reviewer-brief-waits-on-show.test.ts`
reads the reviewer's brief from cb4 and had passed in a run some minutes before; `3731910a` on `main`
changed that test, and the fail was gone after the rebase.

## Not tried

- The two builds of the records, which listed a cell five and six times. The build made here listed
  one three times.
- A cell that times out and throws after: the same gate, no test of its own.
- `--emit` with the change. The emit is refused when `bad` has any line, as before; not run.
- The tool in a reviewer's hands, and `verifyModule` in a page.
- `git grep -n -F 'tab-tests' -- knowledge 'plan/cloud-brain-*.md' .claude/skills/brain-maintenance 'tools/cloud-brain/*.md'`
  printed 33 lines. None says how often a failed cell is listed; none was changed. The records of
  `ow-2` and `ow-3` say the cause "was not looked into", which was so when they were written.
