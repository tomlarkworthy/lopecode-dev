# rc-1-record-test-reads-a-commit

2026-10-11. Task 1 of `plan/cloud-brain-record-checked-by-review-alone.md` (R1), approved by the
owner at event 2099. A test file, one line of a record and one sentence of the writer's brief. No
seed, no deploy. The change is one commit, the one before this record's; the submit names it.

## What was wrong

`tests/tools/ds-3-record.test.ts` holds two sentences of `records/ds-3-logs-reads-the-span.md`. It
read two other files as the checkout has them: the seed `tools/cloud-brain/cloud-brain.ojs`, for the
count of lines commit `eefc16a2` added to a test, and
`plan/cloud-brain-dashboards-share-series-and-controls.md`, for the spec's words "was not tried; they
may". A later line in either fails the test while the record is still true
(`seen-record-test-reads-the-live-seed`).

Made to fail in the worktree at `41e72b7e`, with the test as `main` has it and the two edits of R1's
check: one comment line put after the line of `cloud-brain.ojs` that holds
`// The panel's "Last" and a shared control are one value`, and "they may" changed to "they might" at
line 300 of the plan. Run at 21:12:52 CEST (`date`), the test and the ds-3 record put back to
`41e72b7e` with `git show 41e72b7e:<path> > <path>` for the run:

```
bun test ./tests/tools/ds-3-record.test.ts      with no edit         2 pass, 0 fail, 5 expects
bun test ./tests/tools/ds-3-record.test.ts      with the two edits   0 pass, 2 fail, 4 expects
grep -c "read(" tests/tools/ds-3-record.test.ts                      3
```

The two edits were then taken back with `git checkout --` of both files, and the test and the
record with `git checkout HEAD --`.

## What changed

- **The test.** A helper `show(commit, path)` runs `git show <commit>:<path>` in the checkout and
  throws with git's message when git exits nonzero. The seed is read with
  `show("eefc16a2", "tools/cloud-brain/cloud-brain.ojs")`, the plan with
  `show("1e6aabbc", "plan/cloud-brain-dashboards-share-series-and-controls.md")`. `read` is kept for
  the record alone.
- **The record of ds-3**, line 132: "(lines 299 to 300 of the plan)" is now "(lines 299 to 300 of
  the plan at `1e6aabbc`)". The seed's commit was already named, at line 127.
- **A third test**, which the spec does not ask for: the record holds both commit names, as the
  command `git show eefc16a2 -- tools/cloud-brain/cloud-brain.ojs` and as the words of line 132. It
  is there so the line added to the record has a test that fails without it. The spec's check says
  "2 pass"; the file now answers 3.
- **The brief**, `agents/implementer.md`, under "The tracker's write calls", after the paragraph "A
  change with no seed and no local tool": one sentence, that a test holding a sentence of a record
  reads the record and, for anything else, a file as a commit named in the record has it.

Why `1e6aabbc`: it is the newest of the plan's three commits, and it is older than the commit that
wrote the record's sentence.

```
git log --format='%h %ci' -- plan/cloud-brain-dashboards-share-series-and-controls.md
  1e6aabbc 2026-10-11 16:19:26 +0200
  2d9323fd 2026-10-11 16:08:16 +0200
  1357813c 2026-10-11 16:08:16 +0200
git log -1 --format='%h %ci' 211d3534       (round 2 of the ds-3 record)
  211d3534 2026-10-11 19:32:40 +0200
git show 1e6aabbc:plan/cloud-brain-dashboards-share-series-and-controls.md | sed -n 300p
    stand-in was not tried; they may, and it does not change the count. Task 1 runs it first on the
```

The seed at `eefc16a2` between the test's two marks: 14 lines, 4 of them with `expect(`
(`git show eefc16a2:tools/cloud-brain/cloud-brain.ojs | awk '/The panel.s "Last" and a shared control are one value/{f=1} f&&/return rows.length/{exit} f'`,
then `wc -l` and `grep -c "expect("`). The record says 14, 13 of code and 4.

## The count

In the worktree, on the test as the change's commit has it. The first five at 21:12:52 CEST (`date`); the
whole directory was run before the commit on the same three files, ending 21:10:50 CEST (`date`):

```
bun test ./tests/tools/ds-3-record.test.ts      with no edit                      3 pass, 0 fail, 7 expects
bun test ./tests/tools/ds-3-record.test.ts      with the two edits of the check   3 pass, 0 fail, 7 expects
bun test ./tests/tools/ds-3-record.test.ts      with line 132 of the record
                                                as main has it                    2 pass, 1 fail, 7 expects
grep -c "read(" tests/tools/ds-3-record.test.ts                                   1
grep -c 'show("' tests/tools/ds-3-record.test.ts                                  2
bun test ./tests/tools                                                            298 pass, 1 fail, 299 tests, 34 files
```

The one fail of the whole directory is `issue-lock-sql.test.ts`: it reads
`tools/cloud-brain/.emitted/cloud-brain.html`, which a worktree has only after a build, and this
task builds nothing ("Notebook not found"). In the main checkout, which has that file,
`bun test ./tests/tools/issue-lock-sql.test.ts` answered 7 pass, 0 fail at 21:14:32 CEST (`date`).

## Not tried

- A checkout that does not have the two commits (a shallow clone, or a history rewritten). What
  was run is a name no commit has: with `show("eefc16a3", …)` in the first test the file answered 2
  pass, 1 fail, the error `git show eefc16a3:tools/cloud-brain/cloud-brain.ojs: fatal: invalid object
  name 'eefc16a3'.` (21:14:55 CEST, `date`; taken back with `git checkout --`).
- A short name that stops being unique. `eefc16a2` and `1e6aabbc` each resolve to one commit today
  (`git rev-parse eefc16a2 1e6aabbc`); the test and the record carry eight characters, not forty.
- No test holds the new sentence of the brief. R1 leaves such a test free to read the brief as it
  is; none was written.
- The other tests under `tests/tools/` that hold a record's sentence were not read by me. The
  spec's round 2 names two (`redistil-record-statements.test.ts`,
  `rework-resumes-the-implementer.test.ts`) and says each reads a doc for that doc's own sentence.
- The last paragraph of the ds-3 record's round 2 says "After: 2 pass, 0 fail". It is of that round
  and was left; the file answers 3 since this change.
