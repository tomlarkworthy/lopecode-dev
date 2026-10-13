# test-ts-output-floods-the-reader

2026-10-13. A local tool of the repository `cloud-brain-dev` (`test.ts`, and `all.ts`, which read its
output), the documents there, two pages of the writer's brief, one row of the cluster guide and three test
files in `lopecode-dev`. No seed, no deploy, no call on cb4 but the searches and the tracker's.

## The defect, measured

`bun test.ts <worker>` in the worktree's `cloud-brain-dev`, at its commit `c22b8bc`, on what `deploy/` held
there, 02:51 CEST on this machine's clock (`stat` of the files the output was written to):

| run | stdout, characters | its last line, the JSON | `tail -15` of it |
|---|---|---|---|
| `brain-x-static` | 2,463 | (15 lines in all) | 2,463 |
| `brain-x-issues` | 15,151 | 11,056 | 11,829 |
| `brain-deployer` | 247,405 in 8,145 lines, and 2,245 on stderr | 3,514, and 7,165 for the Worker's other module | 4,201 |

The issue has "14 KB" for the JSON line of `brain-x-issues`, from a writer's journal; 11,056 is what this
clone printed, and which module that writer ran with `--with` was not looked up. The reviewer's "469 KB"
with `--with` was not made again either: the 247,405 above is with no `--with`, so the flag is not what
prints them. They are the lines the modules print with `console.*` while their tests run. The deployer logs
an object a call, and bun prints an object over several lines:

```
{
  at: "deploy.reason",
  reason: "a test",
  ...
```

`test.ts` printed its own lines with the same `console.log`, so both were one stream. Nothing in its header
or in `README.md` said the modules' lines were meant to be there.

## What changed

In `test.ts` (`cloud-brain-dev`):

- **The JSON is a file.** `reports/<worker>.json` beside `test.ts` (the name as asked, with `_` for a
  character that is not a letter, a digit, `.`, `-` or `_`; the directory is git-ignored), or the file given
  with `--report FILE`. One line of JSON a module, the line stdout had. The file is removed when the run
  starts, after the check of `--report` and before every other check that can stop it, and written when
  the tests have run.
- **What the modules print is a file**: the same name with `.log` for `.json`. `console.log`, `info`,
  `warn`, `error` and `debug` are a function that writes there (`util.format` of the arguments) from before
  the first module is loaded. A test that wraps `console.log` wraps that function. With nothing printed the
  file is removed and no `log:` line is printed.
- **A line a test is its name**: `ok   <name>`, `FAIL <name>`, `skip <name> (<error, 100 characters>)`. A
  failed test's error is no longer under its line.
- **The last lines are the result**, 13 at most for a Worker of two modules: a line for each of the first 8
  failed tests with its error on one line (` ⏎ ` for a line end), `… and N more failed` when there are more,
  the `log:` line with its count of lines, the `report:` line, and a line a module with the hash's first 12
  characters and the three counts. The 8 share 480 characters of error, 60 each at least; one failed test
  alone has 600. A cut says so with both lengths.
- `--whole` prints every failed test's error whole and on its own lines, as many as failed, and writes the
  report with nothing cut. The 2,000 characters are not held with it.
- `--report` with nothing after it, with a flag after it, or naming a directory: exit 2, nothing run.

`all.ts` gives each run `--report reports/all/<worker>.json` and reads the file when the run has ended; a
run that left none is "no report", as a run that printed no line was.

The same three runs after the change, 03:00 CEST by the same `stat`, and one with `--with`:

| run | all it prints, stdout and stderr | `2>&1 \| tail -15` |
|---|---|---|
| `brain-x-static` | 1,061 | 1,061 |
| `brain-x-issues` | 4,353 | 995 |
| `brain-deployer` | 4,992 | 955 |
| `@tomlarkworthy/brain-deployer --with <a copy of the deployed module>` | 3,593 | not counted |

The end of `brain-x-issues`:

```
ok   test_issues_flow_method_answers_the_rows_a_caller_may_read 
log: reports/brain-x-issues.log (2 lines the modules printed with console.*)
report: reports/brain-x-issues.json (a line of JSON a module: each test's state, and its value or error cut at 120 and 600 characters; --whole prints all)
brain-x-issues @tomlarkworthy/brain-issues 414601bb9170: 48 passed, 0 failed, 17 need a browser
```

`reports/brain-x-issues.json` was 11,056 characters, the length of the line before, and the names and states
of its tests were those of that line (a `diff` of the two lists, made before the tests of this change were
written; the errors and values were not compared). `reports/brain-deployer.log` was 233,175 characters in
8,088 lines: fewer characters than the 247,405, since `util.format` and bun's `console.log` do not write an
object alike. `bun all.ts` after the change: `total 412 passed, 0 failed, 49 need a browser`, exit 0.

No run of these had a failed test. What the last lines are with one is from the test file's modules, below.

### The other ways

- **A flag, `--json`, that prints the line.** Three lines of code, and no file. A reader who has run 65
  tests and wants one test's whole error then runs them again; with the file it is a `grep`. A caller that
  parses needs a flag either way.
- **The modules' lines on stderr.** `2>&1 | tail -15` would cut them, and a run with no `tail` would still be
  the 247 KB the harness saves to a file and the reader then searches.
- **Errors left under each test's line, the counts added last.** With two failed tests among the last 15
  lines, two errors of 600 characters and the three closing lines are over 2,000.

Two runs for one Worker in one clone at once write the same file. `--report` is the way out, `all.ts` and
the two test files that parse use it, and nothing stops a third caller that does not.

## Who read the JSON line

`git grep -n -E 'test\.ts' -- tools tests` and `git -C cloud-brain-dev grep -n 'test\.ts'`, read for a
caller that parses:

| caller | read | now |
|---|---|---|
| `cloud-brain-dev/all.ts` | lines of stdout that start `{"worker"` | the file it names with `--report` |
| `tests/tools/test-ts-cut.test.ts` | the first such line | `--report`, and the line of stdout when no file was written (a `test.ts` from before) |
| `tests/tools/issues-policy-v4.test.ts` | the last line of stdout | the same |

`land.sh` and `verify-run.ts`, which the issue names as not known, do not run `test.ts`: the grep has no line
of either.

## Tests

`tests/tools/test-ts-output.test.ts`, new, 10 tests. Eight copy `test.ts` and `all.ts` beside a `deploy/` of
modules made in the test and run `sh -c "bun test.ts <worker> 2>&1 | tail -15"` there:

- 40 tests that pass with a value of 5,000 characters and log an object each: under 2,000 characters, the
  counts last, no JSON and no logged object in what is printed, 40 objects in the log, the report as it was.
- 2 failed of 42, 1 failed, 40 failed of 40 (errors of 5,000 characters on two lines): under 2,000, each
  named, or 8 named and "32 more".
- A test that reads `document`, one that never answers (`--seconds 1`), a module that is not JavaScript.
- A Worker of two modules with `--report`; a report of the run before, gone after a run that stops at
  `--with` with no file; the three refusals of `--report`; `all.ts` over two Workers.

Two read the texts: the two pages, the guide's row, and the clone's `README.md`, `AGENTS.md` and `.gitignore`.

```
bun test --timeout=30000 ./tests/tools/test-ts-output.test.ts ./tests/tools/test-ts-cut.test.ts ./tests/tools/issues-policy-v4.test.ts
```

printed `21 pass`, `0 fail`, `Ran 21 tests across 3 files` at 03:02 CEST. The whole suite,
`tests/tools/suite.sh`, after the rebase and with this record written but for this sentence, 03:09 to 03:10
CEST: `1019 pass`, `0 fail`, `Ran 1019 tests across 104 files. [73.45s]`, and no line `skipped:`.

Without the fix: `test.ts`, `all.ts`, `README.md`, `AGENTS.md` and `.gitignore` of `c22b8bc` in a directory
beside a link to `deploy/`, and
`CLOUD_BRAIN_DEV=<it> TEST_TS_HAS_A_REPORT=1 bun test --timeout=30000 ./tests/tools/test-ts-output.test.ts`,
03:09 CEST: `2 pass`, `8 fail`. The two that passed are the test of `all.ts`, which printed the same three
lines before, and the test of the two pages and the guide's row, which reads this checkout and not the
clone. With no `TEST_TS_HAS_A_REPORT` the file skips its tests of the clone on such a directory and prints
a line `skipped: test-ts-output.test.ts: … has no --report`; that run was made when the file had its first 7
tests (0 pass, 7 skip) and not again.

## The texts

- `cloud-brain-dev`: the header of `test.ts` and of `all.ts`, `README.md` ("Tests, a service at a time"),
  `AGENTS.md` ("The loop of a change"), `.gitignore`.
- `agents/implementer/seed-tests.md`, step 7, and `agents/implementer/landing.md`, the line after a deploy:
  each said the JSON was a line of the output.
- `knowledge/working-with-cloud-brain-remote-lopecode-cluster.md`, the row of `cloud-brain-dev/`.
- `agents/implementer.md`, "A test run is read by its end (`2>&1 | tail -15`)", is not changed: it now
  holds for `test.ts`. The file had 19,900 of its 20,000 characters (`wc -c`).

Not mine to change, and so for the overseer: the reviewer's brief on the Brain, step 4, has "The JSON
line's `hash` is the deploy ref's" and "A probe cell's answer is the `value` of its test in the JSON line"
(`tests/tools/fixtures/reviewer-brief.md`, lines 157 and 162, the copy of the commit). Since this change
the hash is in the last line of the run and the value in `reports/<worker>.json`, under `--whole` whole.

## Not tried

- A reviewer in a view: its clone is at the commit of the view, and one from before this change prints the
  JSON line as before.
- `test.ts` on a real module with a failed test. Each failed test of this change is a cell of a module the
  test file writes.
- Two runs for one Worker at once in one clone.
- A module that writes to `process.stdout` itself, with no `console`: it would still be printed. No module
  of `deploy/` was searched for one.
- A test name long enough to take the last 15 lines over 2,000 characters: the 40 failing tests of the test
  file have names of 47 characters, and a name is not cut.
- `--whole` with many failed tests: the last lines are then as long as the errors.
