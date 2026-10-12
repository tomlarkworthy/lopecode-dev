# summarize-papers-test-over-30s-in-suite

2026-10-13. One test file changed, `tests/tools/summarize-papers.test.ts`. No tool, no seed, no deploy.
Every run below was made on one machine (macOS, bun 1.4.0), in the worktree of this issue, while other
agents of the loop worked on the same machine. Times are CEST, read from `date` or `uptime` around each
command; a load is the first number of `uptime` before the command.

## What was wrong

The issue reads the fail as a test "near the timeout by itself". It is not the test. A `bun` whose
script or working directory is under the system's temporary directory took about 400 ms to start on
this machine, where it takes 10 to 48 ms elsewhere, and every rig of this file was a repository made in
that directory. The directory had 194,370 entries.

The file, before any change, at `736f3485`:

| Command | Started | Load | Result |
|---|---|---|---|
| `bun test --timeout=30000 ./tests/tools/summarize-papers.test.ts` | 00:26:14 | 11.25 | `31 pass, 1 fail, 1 error`, 235.40 s. The fail: "check: a summarized entry passes; …" `[30002.04ms]`, "this test timed out after 30000ms" |
| the same with `--timeout=120000` | 00:30 | 9.30 | `32 pass, 0 fail`, 187.92 s |
| the same with `--reporter=junit` | 00:33 | 9.21 | exit 0. The four slowest tests: 15.96 s (the `check` test), 12.23 s, 11.99 s, 10.14 s |

Where the time of the `check` test goes. A copy of the test file that wrote down the time of each
command it starts, and a copy of the tool that wrote down the time at each call of `brain.ts`, run for
that test alone (00:36, load 8.69; both copies were removed after). One of its ten starts of the tool:

```
    tool +0 main
    tool +16 stateDir
    tool +17 brain> knowledge.search?kind=paper&li
    tool +224 brain<
    tool +225 brain> knowledge.search?kind=paper&li
    tool +445 brain<
    tool +446 exit check
646 bun summarize-papers.ts check --delay=0 --ids arxiv:2603.06333
```

`check` of one id is 646 ms: 200 ms outside the tool's own 446, and in it 207 and 220 ms for each of
two calls of the fake `brain.ts`, which reads one file and prints it.

What a start costs, with a file that holds `1`:

```
the working directory is the worktree
476   bun <tmp>/e.ts              (also 622)
 48   bun <worktree>/tools/e.ts
the working directory is <tmp>, a new directory of the system's temporary directory
380   bun <tmp>/e.ts              (also 390)
364   bun <worktree>/tools/e.ts
417   bun -e 1
the working directory is a new directory of /private/tmp/claude-502, beside 147 entries
 10   bun <there>/e.ts            (three times, `time -p`: real 0.01)
```

`ls <the directory> | wc -l`, with the directory the one `mktemp -u` names its file in, gave 194,370 at
00:37, 198,775 at 00:52 and 200,189 at 00:58. By the start of the name, of the first count: `kdocs`
26,764, `light-agent` 23,734, `bm-lock` 18,997, `bm-worktree` 18,142, `agent-token` 12,737, `brain-seen`
11,572, `bm-papers` 10,838 (this file's rigs), `bm-kdocs` 10,248, `issue-as` 10,035. That the cost is the
number of entries is an inference from these runs: the count of a directory was not changed while a
start was timed.

The file with nothing changed but where its temporary directory is, at 00:38, load 8.75:
`TMPDIR=<an empty directory of the scratchpad> bun test --timeout=30000 ./tests/tools/summarize-papers.test.ts`
gave `32 pass, 0 fail`, 15.31 s, the `check` test 1.66 s, and left 24 directories there.

## What changed

- A directory `ROOT` for the file, made once under `tools/cloud-brain/.emitted/test-tmp/` of the checkout
  the test file is in (`git check-ignore -v` names `tools/cloud-brain/.gitignore:1:.emitted/`), and
  removed by `afterAll`.
- `fresh()` makes each rig under `ROOT`, and the rig's `stop()` removes it. The `keepEntry` test's
  directory is under `ROOT` too.
- Each command a rig starts has `TMPDIR` set to `ROOT`, so the directories the tool itself makes (the
  put's body, the one an agent is given to read) are there and not in the system's.
- One new test, "the rig: no directory of it, and none an agent is given, is under the system's
  temporary directory; stop removes it".

The test's own process still has the system's `TMPDIR`: nothing is assigned to `process.env`.

Not taken, of what the issue names: the `check` test cut into its cases (each case makes a rig, so the
file would start more processes), and a timeout of its own for that test (two tests of the file, both named `sd-2: …`, have
120000; it would leave the 188 s).

## The counts

After the last edit of the test file, in the worktree:

| Command | Times | Load | Result |
|---|---|---|---|
| `bun test --timeout=30000 ./tests/tools/summarize-papers.test.ts` | 00:54:33 to 00:54:43 | 5.00 | `33 pass, 0 fail, 310 expect() calls`, 10.59 s |
| `tests/tools/suite.sh` | 00:54:43 to 00:58:08 | 5.03 | `899 pass, 0 fail`, 899 tests in 92 files, 204.82 s; no line `skipped:` |

Earlier runs of the changed file, before a comment in it was reworded: 00:43, load 13.71, `33 pass, 0 fail`,
16.11 s; with `--reporter=junit`, `33 pass`, 15.80 s, the `check` test 1.68 s and no test over it.
With `TMPDIR` of the test's own process at an empty directory: `33 pass, 0 fail`, 15.36 s, and `ls -la`
of that directory showed nothing in it (24 before the change, above).
`ls tools/cloud-brain/.emitted/test-tmp | wc -l` after the runs of the table: 0.

The new test without the fix, each part taken out by itself (`-t "the rig:"`):

| Taken out | Result |
|---|---|
| all of it (the test added to the file as it was) | fail at the first `expect`: the rig's directory is under the system's |
| `TMPDIR: ROOT` of the commands | fail: `[true, true]` where `[false, false]`, the canary's directory and the paper's |
| `rmSync` in `stop()` | fail at the last `expect`: `Expected: false`, `Received: true` |

`rmSync` and the link `node_modules` of a rig, which names the directory `cheerio` resolves in:
`ls /Users/tom.larkworthy/dev/lopecode-dev/node_modules | wc -l` gave 54 before a run of the file and 54 after.

## The suite, which this does not mend

Runs of `tests/tools/suite.sh` with this change in:

| Command | Times | Load | Result |
|---|---|---|---|
| `tests/tools/suite.sh` | 00:44:58 to 00:51:13 | 13.51 | `898 pass, 1 fail`, 899 tests in 92 files, 374.87 s. The fail: `tests/tools/knowledge-docs.test.ts`, "put --stale: an entry with another line is put; …" `[30003.73ms]`, "this test timed out after 30000ms", "killed 1 dangling process" |
| `TMPDIR=<a new directory of /private/tmp> tests/tools/suite.sh` | 00:51:27 to 00:52:51 | 6.92 | `899 pass, 0 fail`, 84.43 s. 491 entries were left in that directory: `kdocs` 131, `bm-worktree` 50, `light-agent` 43, `issue-ask` 41, `bm-lock` 30, `bm-kdocs` 30, `agent-token` 20, `brain-seen` 16 |
| `tests/tools/suite.sh` (the run of the counts, above) | 00:54:43 to 00:58:08 | 5.03 | `899 pass, 0 fail`, 204.82 s |

The three were at three loads, so their times are not one comparison. The issue asked whether another
file is as near the timeout: `knowledge-docs.test.ts` failed at it in the first run. Filed as the bug
`tmpdir-entries-slow-every-bun-start` (event 5370), with these counts. The 42 other files of
`tests/tools` that call `mkdtemp` (`git grep -l mkdtemp -- tests/tools | wc -l`: 43), `suite.sh`, and
what is in the directory now are that issue's.

## Not done, not tried

- No other test file was changed, and nothing was removed from the system's temporary directory: other
  agents' rigs, locks and browsers may be in it.
- A run of this file by an agent at an older commit still adds `bm-papers-` directories there.
- A test that is stopped at its timeout does not reach `stop()`, and a test process that is killed does
  not reach `afterAll`: what is left is then under `tools/cloud-brain/.emitted/test-tmp/` of that checkout.
  Not made to happen.
- A checkout whose `tools/cloud-brain/.emitted` cannot be written to: the file would fail at its first
  line. Not tried.
- A checkout that is itself under the system's temporary directory: the new test's first `expect` would
  fail there. Not tried.
- The file on Linux, and with another version of bun.
- Under the four workers of the suite the `check` test's own time was not read, only that no test of the file
  failed in the three runs of the suite above.
