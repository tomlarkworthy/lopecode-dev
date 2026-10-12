# tmpdir-entries-slow-every-bun-start

2026-10-13. Changed: `tests/tools/suite.sh`, `tools/cloud-brain/knowledge-docs.ts`, two test files, three lines of
the writer's brief. No seed, no deploy. 107,394 directories were removed from the temporary directory of one
machine. Every run below was made on that machine (macOS, bun 1.4.0, 18 cores by `sysctl -n hw.ncpu`), in the worktree of this issue, while
other agents of the loop worked on it. Times are CEST, read from `date` around each command; a load is the first
number of `uptime` before the command. `T` is the directory `$TMPDIR` names there, under `/var/folders`. A count of
`T` is `ls -f T | wc -l`, which has `.` and `..` in it.

## What was wrong

A `bun` started with its working directory in `T`, or in a new directory of `T`, took 50 times as long as elsewhere.
01:04:37, load 8.63, `T` at 200,884 (counted 01:00:25), seven runs of `bun -e 1` in each, in ms:

```
T                          min 724  median 770  max 880
/private/tmp               min 13   median 13   max 14
the worktree               min 13   median 14   max 14
a new directory of T       min 708  median 743  max 840
```

The tests of `tests/tools` make their rigs with `mkdtemp(tmpdir())` and start `bun` in them:
`git grep -n mkdtemp -- tests/tools | wc -l` printed 107 lines, in 45 files (`git grep -l`), and 19 files of the
directory name `rmSync` or `rm(` (`git grep -l -E "rmSync|rm\("`), at the commit of this change.

**Who makes the names.** The orchestrator's comment 5373 names nine prefixes as tools that leave a directory at each
real call. `git grep -n -E "(mkdtemp|mktemp|tmpdir)[^\n]*<prefix>" -- tests tools cloud-brain-dev .claude` for each of
the fifteen prefixes of the issue, at the commit the worktree was made at (`3afef03f`): fourteen are made in a test
file and in no tool (`light-agent-` in `light-agent.test.ts`, `bm-lock-` and `bm-lock-docs-` in `lock.test.ts`,
`bm-worktree-` in `worktree.test.ts`, `agent-token-` in `agent-token.test.ts`, `brain-seen-` in `brain-seen.test.ts`,
`bm-papers-` in `summarize-papers.test.ts`, `bm-kdocs-` in `knowledge-docs.test.ts`, `issue-as-` in
`issue-as-time-check.test.ts`, `issue-as-file-` in `issue-as-body-file.test.ts`, `issue-wait-` in `issue-wait.test.ts`,
`verify-run-` in `verify-run.test.ts`, `brain-shell-` in `brain-shell-posts-both.test.ts`, `playwright-chrome-` in
`playwright-chrome.test.ts`). One is a tool's: `kdocs-`, line 127 of
`tools/cloud-brain/knowledge-docs.ts`, made at each start of the tool and removed in `end` of `summarize` alone
(line 398 then). `lock.sh` has a `trap 'rm -f "$OUT"' EXIT` for its one file. So the tools of item 2 of that comment
are one tool.

## What changed

**`tests/tools/suite.sh`.** The run has a `TMPDIR` of its own: `t` in a new directory `bm-suite-run.XXXXXX` of `/tmp`
(`SUITE_TMP_BASE` names another place, which the tests use). A trap removes the directory when bun ends and when the
script is sent INT or TERM. The script no longer ends in `exec`, since a trap does not outlive one; its exit is
bun's. It prints two more lines on stderr: the second names the directory, and the last is the count of entries of
the temporary directory it was called with, taken with `ls -f` in the background while bun runs. With no place for the
directory it runs nothing and exits 2.

**`tools/cloud-brain/knowledge-docs.ts`.** `process.on("exit", …)` removes the tool's directory, so every end does: a
`process.exit` and an error thrown.

**The brief**, `agents/implementer.md`, step 6: three lines after the script's flags, that the run has a `TMPDIR` of
its own and that one file run alone has not.

**What was in `T`.** One `find`, 01:11:12, of the directories directly in `T` whose name starts with one of twelve
names and a dash and that were last changed more than 6 hours before (`-mmin +360`: `kdocs`, `light-agent`,
`bm-lock`, `bm-worktree`, `agent-token`, `brain-seen`, `bm-papers`, `bm-kdocs`, `issue-as`, `issue-wait`,
`verify-run`, `brain-shell`), and of those named `playwright-chrome-*` and older than 24 hours (`-mmin +1440`). The
twelve patterns hold the fifteen names of the issue (`bm-lock-*` has `bm-lock-docs-`, `issue-as-*` has
`issue-as-file-`), and also these that start with one of them: `issue-as-status-`, `verify-run-chrome-`,
`verify-run-build-`, `bm-papers-keep-`, `bm-lock-empty-`. It printed 107,394 paths, of 203,498 in `T`:

```
15930 light-agent    13327 bm-lock     12372 kdocs        9237 agent-token   9220 bm-worktree
 8804 brain-seen      7599 issue-as     6779 bm-papers     5064 bm-kdocs      3231 verify-run
 3110 issue-wait      2916 brain-shell  2648 bm-lock-docs  2394 issue-as-file 1572 issue-as-status
 1331 playwright-chrome  553 verify-run-chrome  466 verify-run-build  425 bm-papers-keep  416 bm-lock-empty
```

Every line of the list was `T`, a slash and a name of letters, digits, `.`, `_` and `-`
(`grep -vc` of that pattern: 0). The list was given to `xargs -0 -n 500 rm -rf --` at 01:21:25, and from 01:24:14 to
three more from its other end. Both ended with exit 0 by 01:31:05. The count of `T` fell by about 53 a second with the first alone
(200,371 at 01:22:46, 195,197 at 01:24:24) and by about 210 a second with the four (183,812 at 01:25:18).

## What it measured

| | Before | After |
|---|---|---|
| `T`, lines of `ls -f` | 203,498 (01:11) | 100,322 (01:31:22); 0 of the 107,394 names are in it (`comm -12`) |
| `bun -e 1` in `T`, seven runs, ms | min 724, median 770, max 880 (01:04:37, load 8.63) | min 60, median 73, max 81 (01:31:22, load 9.33) |
| `bun -e 1` in `/private/tmp`, seven runs, ms | min 13, median 13, max 14 | min 9, median 11, max 11 |

The issue has the link between the count and the start as an inference. This is one measurement of it: half the
entries, a tenth of the time. It is two points on one machine, and the time is not in proportion to the count.

What is left is younger than 6 hours or of another name: at 01:35:06 `find T -mindepth 1 -maxdepth 1 -mmin -360`
printed 85,848 of 100,852. The largest at 01:31:22: `kdocs` 18,311,
`bm-worktree` 10,046, `light-agent` 8,793, `bm-lock` 6,340, `bm-kdocs` 6,203, `bm-papers` 4,479, `agent-token` 3,940,
`brain-seen` 3,216, `nbblocks` 2,936, `issue-as` 2,758, `issue-ask` 2,677, `issue-wait` 2,556, `cost-events` 2,332.

The suite, with the change, and `T` as it was:

| Command | Started | Load | `T` | Result |
|---|---|---|---|---|
| `tests/tools/suite.sh`, the script with its own `TMPDIR` and before the count line was added | 01:09:06 | 8.96 | 203,074 | `927 pass, 0 fail`, 95 files, 92.90 s |
| `tests/tools/suite.sh`, as committed | 01:31:36 | 8.34 | 100,320 (the script's last line) | `928 pass, 0 fail`, 95 files, 84.88 s |

The first row is the fix alone, before anything was removed: the issue has 204.82 s and 374.87 s for the suite with
no `TMPDIR` given that night, and 84.43 s with one given by hand. After each run `ls -d /tmp/bm-suite-run.*` matched
nothing. `T` read 203,406 after the first run, 332 more than before it, while other agents ran their own tests; how
many of the 332 were this run's was not separated.

## Tests

Each run with `TMPDIR` a new directory of `/tmp`, removed after.

| Command | Result |
|---|---|
| `bun test --timeout=30000 ./tests/tools/tests-tools-suite-parallel.test.ts` | `14 pass, 0 fail`, 2.05 s |
| the same with `SUITE_SH=` the script and `BRIEF=` the brief of the commit before | `8 pass, 6 fail`: the five tests of the script's directory and its stderr, and the one of the brief |
| `bun test --timeout=30000 ./tests/tools/knowledge-docs.test.ts` | `30 pass, 0 fail`, 31.91 s (01:33; load 7.70 after it). The file left 31 `bm-kdocs-` rigs in its `TMPDIR` and no `kdocs-` |
| the same with `knowledge-docs.ts` of the commit before | `29 pass, 1 fail`, 33.21 s: the new test, at its first line, `status` left `kdocs-Jrp1BF`. Two such runs left 166 `kdocs-` directories |
| `tests/tools/suite.sh` | the second row of the table above |

The new tests of the script: for bun's exits 0, 1 and 70 the directory the stand-in for bun had as `TMPDIR` is gone,
the place it was made in is empty, and the caller's directory has its three entries and no more; the default place
is `/tmp`; a script sent TERM, and one sent INT, with its bun, leaves nothing; with no place it exits 2 and runs
nothing; with no `TMPDIR` given the last line counts some directory. The new test of the tool: `status`,
`put --stale` with nothing to put, an unknown command, `summarize` with no name, `status --check` at exit 1, no
token kept (exit 2), a refused `static.list` (an error thrown, exit 1) and a `put --stale` that puts one doc each
leave an empty `TMPDIR`.

`knowledge-docs.test.ts` alone took 128.46 s and 270.02 s for two reviewers that night with `T` as their `TMPDIR`
(comments 5356 and 5376 of `seen-tool-tests-time-out-under-load`), and 30.71, 33.93 and 31.91 s here in three runs with a
directory of `/tmp`.

## Not done, not tried

- **One file run alone**, `bun test ./tests/tools/<file>`, and the `--test` commands of `land.sh`, have the caller's
  `TMPDIR`: their rigs are made in `T` and those the test does not remove stay. No test file was changed to remove
  its rigs (45 files call `mkdtemp`). `T` will grow from these, and from the tools below; at what rate with the script changed was
  not measured.
- **Other tools that make a directory in `T`**, read with `git grep -n -E "mkdtemp|mktemp" -- tools cloud-brain-dev`
  and not changed: `summarize-papers.ts` (`papers-`, which five lines of it remove; `papers-canary-`, `papers-read-`,
  `docs-read-`: 549 `papers` and 584 `papers-canary` were in `T` at 01:00), `digests/keep.ts` (`keep-`), and outside
  `tools/cloud-brain`, `atproto-publish.ts` (`atpub-`, 707). `land.sh` (a directory) and `issue-watch.sh` (a file) each
  remove theirs in a trap on EXIT, as read in the two scripts; neither was changed or run for this.
- **Names the issue does not list** were not removed, whatever their age: `nbblocks` 2,936, `cost-events` 2,332,
  `issue-ask` 2,677, `syncmod` 2,205, `nbstage` 2,202, `atpub-test` 1,728, `brain-state` 1,538 and the rest. Which
  test or tool makes `nbblocks`, `syncmod`, `nbstage` and `brain-state` was not read.
- **Why the start is slow** in a directory of many entries, and in a new directory under it, was not found; whether
  `node` or `git` is slowed there was not timed.
- **The count line** says a number and no judgment of it. No line was added to `issue-stats.ts`.
- **A TERM sent to the script alone**, and not to its bun: bash runs the trap when bun ends. Not tried. The test
  sends the signal to both.
- The tool's `exit` handler does not run when the process is killed (KILL, or TERM with no handler). Not tried.
- The second removal was started while the first ran, on the same list from its other end. A name of the list that
  another agent made again in those minutes would have been removed with it; `mkdtemp` names are random, and none
  was looked for.
