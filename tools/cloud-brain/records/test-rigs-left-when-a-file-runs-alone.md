# test-rigs-left-when-a-file-runs-alone

2026-10-13. Added: `bunfig.toml` at the root, `tests/tools/own-tmpdir.ts`, `tests/tools/own-tmpdir.test.ts`. Changed:
`tests/tools/suite.sh` (one variable and its header), one test of `tests/tools/tests-tools-suite-parallel.test.ts`,
five lines of the page `agents/implementer/seed-tests.md` of the writer's brief. No seed, no deploy, and no test file
changed to remove its rigs. Every run below was made on one machine (macOS, bun 1.4.0), in the worktree of this issue,
while other agents of the loop worked on it. Times are CEST, read from `date` before each command; a load is the three
numbers of `uptime` then.

## What was wrong

`tests/tools/suite.sh` has given its run a `TMPDIR` of its own since `tmpdir-entries-slow-every-bun-start`. One file
run alone, `bun test --timeout=30000 ./tests/tools/<file>`, had the `TMPDIR` of its caller, and what its tests made
with `mkdtemp(tmpdir())` and did not remove stayed there.

Counted with a script of the scratchpad, `each.sh <file>`: a new directory of `/tmp` as `TMPDIR`, the file run alone
at the root of the worktree, 2 s of sleep, then `ls -A | wc -l` of that directory and bun's exit. All the files of
`ls tests/tools/*.test.ts`, four at a time (`xargs -P 4 -n 1`). For the first row `bunfig.toml` was moved out of the
worktree for the run, which is the checkout as it was before this change, with this change's test file in it.

| | Started | Load | Files | Entries left in the callers' `TMPDIR` | Files that left some | Exit not 0 |
|---|---|---|---|---|---|---|
| without `bunfig.toml` | 02:03:48 | 5.59 9.58 10.92 | 100 | 397 | 36 | 1 |
| as committed | 02:07:16 | 10.41 10.36 10.98 | 100 | 0 | 0 | 0 |

The one exit of the first row is `own-tmpdir.test.ts` itself, which copies `bunfig.toml` and left 7. The other 99:
390 entries from 35 files, each with exit 0 (`grep -v own-tmpdir before.txt | awk …`). The most: `worktree.test.ts` 51,
`light-agent.test.ts` 45, `issue-ask.test.ts` 42, `lock.test.ts` 40, `knowledge-docs.test.ts` 31 (the 31 `bm-kdocs-`
of the issue), `agent-token.test.ts` 20. After the second row `ls /tmp | grep -c bm-test-run` printed 0 and
`pgrep -f 'kill -0' | wc -l` printed 0.

The same two runs at 01:51:37 and 01:55:13, before `own-tmpdir.test.ts` was written and before the rebase, over the
97 files there were then: 387 entries from 34 files with exit 0 for all, then 0 from 0 with exit 0 for all.

## What changed

**`bunfig.toml`**, three lines: `[test]` and `preload = ["./tests/tools/own-tmpdir.ts"]`. bun reads it for a
`bun test` started at the root, which is where the command of the writer's brief is run (`cd $W && bun test …`) and
where `land.sh` runs a `--test` (the brief, step 10: "a command run at the root of the worktree").

**`tests/tools/own-tmpdir.ts`**, the preload. It makes a directory `bm-test-run.XXXXXX` of `/tmp` (`SUITE_TMP_BASE`
names another place, as for `suite.sh`), sets `TMPDIR` to it in `process.env`, and removes it in an `afterAll`. It
also starts one `/bin/sh` that waits for the process to end (`kill -0`, once a second) and removes the directory
then; the `afterAll` kills that `sh`. With `BM_TEST_TMPDIR` set it does nothing, and it sets that name itself.
`KEEP_TEST_TMP=1` leaves the directory and prints `+ TMPDIR=<dir>, kept (KEEP_TEST_TMP=1)` on stderr: until this
change a rig stayed where a failed test left it, and a writer could look at it.

**`tests/tools/suite.sh`** gives bun `BM_TEST_TMPDIR="$D"` beside `TMPDIR="$D"`, so the preload makes nothing under
it, and its header says so. Its last line on stderr, the count of the caller's directory, is as it was.

**The brief.** While this was written `writer-brief-and-tool-output-smaller` cut `agents/implementer.md` into a
core and eleven pages; the sentence "One file run alone makes its rigs in that directory, and what a test does not
remove stays." is on the page `seed-tests.md`, and is replaced there by three sentences: the preload and its directory,
`KEEP_TEST_TMP=1`, and that a `bun test` started in another directory has the `TMPDIR` of its caller. The core,
step 6, has the command with `cd $W` before it and was not changed.

### Why a preload and not the issue's two ways

The issue names two: the test files remove what they make, or a runner for one file that the briefs name in place
of the bare `bun test`. The first is 35 files to change and a rule each new test has to keep. The second leaves the
bare command working and wrong, in every text and every habit that has it. A preload is taken by the command as it
is already written, and a test file needs to know nothing of it. Its cost is that every `bun test` at the root has
it, the files outside `tests/tools` among them ("Not done, not tried").

### What was tried first and did not hold

Each in a scratch checkout of the scratchpad with a preload that logged to a file, before the first commit:

- `process.on("exit", …)` in the preload was not run by `bun test`: after a passing file, a failing file and a
  `--parallel=2` run the log had the line of the directory made and no line of the handler, and the
  directories stood, four of them. `knowledge-docs.ts` removes its directory that way, as a tool; under `bun test` it did not run.
- A `bun test` sent TERM, and one sent KILL, 2 s into a test: `ls` of the base right after the process ended had
  the directory, so no `afterAll` had removed it, and 1.5 s later it was gone, by the watcher.
- Under `--parallel=2` with four files the preload ran once a file, twice in each worker's pid, and made a
  directory each time though the first run had set `BM_TEST_TMPDIR` in `process.env`. Read as: a worker starts each
  file with the environment it was started with; why was not looked for. So without the `kill` in `afterAll` a worker would keep one `sh` a file
  until it ended.
- `Bun.spawnSync(["bash","-c","echo $TMPDIR"])`, with no `env`, printed the caller's `TMPDIR`; with
  `env: { ...process.env }`, and by `execSync` of `node:child_process`, the preload's. The header of the preload
  says so. Of the 100 files none left anything in the caller's directory (the table), so no test of today starts a
  tool that way and leaves what it makes.

## Tests

| Command | Started | Result |
|---|---|---|
| `bun test --timeout=30000 ./tests/tools/own-tmpdir.test.ts` | after the rebase | `9 pass, 0 fail`, 46 expect() calls, 2.68 s |
| the same with `OWN_TMPDIR_TS=` a file of one comment, `BRIEF=` the page `seed-tests.md` of `origin/main` and `SUITE_SH=` the script of `origin/main` | after the rebase | `2 pass, 7 fail`: the five tests of what a run leaves, the one of `suite.sh` and the one of the brief. The two that pass: `bunfig.toml` names the file, and with `BM_TEST_TMPDIR` set nothing is made, which an empty preload also meets |
| `bun test --timeout=30000 ./tests/tools/tests-tools-suite-parallel.test.ts` | after the rebase | `14 pass, 0 fail`, 2.23 s |
| `tests/tools/suite.sh`, after the last edit of a test | 02:18:25, load 12.87 9.45 10.17 | `980 pass, 0 fail`, 100 files, 102.34 s; no line `skipped:`; its last line: 103,379 entries in the caller's directory. The run before that edit, 02:11:03: the same counts in 91.30 s |

The nine tests run `bun test` in a scratch checkout that has the root's `bunfig.toml`, the preload and two test
files, each of which makes a rig with `mkdtemp(tmpdir())`, a file in it and a directory made by a child process.
They hold: one file, passing and failing (exit 0 and 1), makes its rigs under `bm-test-run.XXXXXX` of the base and
leaves nothing there or in the caller's directory; two files in one process and with `--parallel=2` the same; a run
sent KILL, and one sent TERM, after its rig was made leaves nothing within 10 s; with `BM_TEST_TMPDIR` set the rigs
are in the caller's directory; `suite.sh` gives a stand-in for bun `BM_TEST_TMPDIR` equal to its `TMPDIR`;
`KEEP_TEST_TMP=1` leaves the directory with both rigs and names it, and `0` and the empty value do not; with no
place for the directory the run is exit 1 with `0 pass`; and the three sentences of the brief.

Run by hand before the rebase, each once, with a new directory of `/tmp` as `TMPDIR`:

- `bun test --timeout=30000 ./tests/tools/knowledge-docs.test.ts`, the issue's case, 02:00:23: `30 pass, 0 fail`,
  42.65 s, 0 entries left.
- `KEEP_TEST_TMP=1 … ./tests/tools/issue-as-body-file.test.ts`: `7 pass`, the line on stderr, and 6 `issue-as-file-`
  directories in the directory it named.
- `cd tests/tools && bun test --timeout=30000 ./issue-as-body-file.test.ts`: `7 pass`, and 6 entries left in the
  caller's directory. bun did not take the root's `bunfig.toml` from there, which is the brief's third sentence.
- `bun test --timeout=30000 ./lopecode-plugin/tests/lopecode-channel.test.ts` at the root: `19 pass, 0 fail`, 0 left.

After the rebase, three of the test files under `tools/`, each at the root with a new `TMPDIR`:
`tools/code-facts/core-fixtures.test.ts`, `8 pass, 0 fail`, 0 left; `tools/merge-forks/editor-5-merge-D.test.ts` and
`tools/js-toolchain/runtime/display-differential.test.ts`, each `0 pass, 1 fail` with `Cannot find module` of a path
under `vendor/notebook-kit`, and each the same with `bunfig.toml` moved out: the worktree has no such submodule.

## Not done, not tried

- **A `bun test` started in another directory than the root** has the caller's `TMPDIR` (seen for `tests/tools`,
  above). A `bunfig.toml` there was not added.
- **The other test files of the repository that import `bun:test`**, under `tools/`, take the preload when run at
  the root. Four were run, above, two of which the worktree cannot load. Whether one of the others rests on a file it leaves in the temporary
  directory for a later run was not read.
- **The directories already in the caller's temporary directory** were not removed: 103,379 entries by the last line of the suite started 02:18:25. At
  what rate it grows now was not measured, and the tools the record of `tmpdir-entries-slow-every-bun-start` names
  as writing there (`summarize-papers.ts`, `digests/keep.ts`, `atproto-publish.ts`) were not changed.
- **A process a test starts with no `env`** has the caller's `TMPDIR`. No file of today leaves anything that way;
  nothing holds that for a new test.
- **The watcher**: a pid given to another process after bun ended would keep it waiting; a machine that stops, or
  a watcher that is itself killed, leaves the directory in `/tmp`. None tried. A `--parallel` run whose first
  process is killed while its workers go on was not tried.
- **A process that a test started and that still writes to the directory after the file's last test**: not tried.
- `node --test tests/notebooks/*.test.js` is not bun's and is as it was.
- Only macOS was run. The preload names `/tmp` and `/bin/sh`.
