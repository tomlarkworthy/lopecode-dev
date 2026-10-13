# overseer-started-again-before-pull: where the last oversight ended is read from `origin/main` too

2026-10-13. Part of no project. `tools/cloud-brain/loop.ts`, two test files and one paragraph of
`plan/cloud-brain-orchestrator-as-steps.md`: a local tool, no seed, no deploy. Written by the implementer
`impl-2216c8` in the worktree `bm-overseer-started-again-before-pull`. Times are CEST from `date`.

## What was seen before the change

The issue has the run of 15:05: a step for an event started `over-0c3236` for a window whose entry
(`events 6231 to 6550`) was pushed, while the main checkout was 2 behind. I did not read `steps.jsonl` or the
files of `runs/`; that account is the overseer's. What I read is the code, at e195761d:

- `step` took the due check and the count of overseers started from
  `lastOversight(join(skill, "oversight.md"))`, the main checkout's file (line 951, the count at 964).
- `start` took an overseer's `after` and the note of its token from the same file (lines 378 and 382).
- `start` took the prompt's third line from the worktree's file first, then the main checkout's (line 400).

Two tests written before any change to `loop.ts`, each run and seen to fail:

```
loop-step.test.ts   step --for event, main checkout one entry behind origin/main
  acts      expected []   received ["start overseer"]
  self.log  expected []   received ["start --role overseer"]
loop.test.ts        start --role overseer, the same state
  after     expected "6010"   received "5646"
  note      expected "agent-token over oversight-after-6010"   received "…-5646"
```

## What changed

`lastOversight(root)` in `loop.ts` is now the one read. It takes the last heading `## … events N to M` of
two texts and returns the larger `M`:

- the main checkout's `.claude/skills/brain-maintenance/oversight.md`;
- `git -C <root> show origin/main:.claude/skills/brain-maintenance/oversight.md`, with no fetch.

`step` uses it for the events it reads (`sync?after=`), the due check and the count. `start` uses it for an
overseer's `after`, the note `oversight-after-<seq>` and the prompt, which now prints `run.after`. The
variable `skill` of `step` had no other use and is gone. The header of `loop.ts` (part 3 of `step`) and the
spec (`plan/cloud-brain-orchestrator-as-steps.md`, under "An overseer's file has `after`") say the same.

## Why `origin/main` of the repository and not the overseer's worktree

The triage (event 6600) took "the later heading of the overseer's worktree copy and of the main checkout"
and ruled out two others: a pull by the step that ends a run (changes an Always item of `rules.md`) and a
fetch in each step for an event (a network call a step). I took a fourth, which keeps both of its reasons:

| Read | Network call | Has the entry | Cost |
|---|---|---|---|
| The worktree's file (`bm-over-<host>`) | none | from the moment the overseer writes it, before the commit and the push | An overseer that dies after it writes the heading and before it lands moves `after` past events no entry on `main` covers: the owner's moves in that window are not read for a post mortem, and no overseer is due for them. Not there on a machine with no such worktree |
| `origin/main` after a fetch | one a step | once pushed, from any machine | what the triage ruled out |
| `origin/main` as the repository has it (taken) | none | once pushed from this machine: `git push origin HEAD:main` in a worktree moves `refs/remotes/origin/main`, which every worktree of the repository shares | An entry pushed from another machine is seen at the next fetch, which the step for the clock makes, as before |

The row of the worktree's file is reasoning from the code; no overseer was seen to die that way. That the
push moves the ref is in the test (below) and in the issue's own line, `## main...origin/main [behind 2]`,
read in the main checkout with no fetch named.

A step that starts an overseer whose worktree holds an unlanded entry now gives it the landed number in the
prompt, where the old line 400 gave the worktree's. `start` refuses a worktree that is ahead
(`loop.test.ts`, "An overseer's edit that was not landed: none is started"), so I did not see how that
prompt would be reached.

## Tests

`tests/tools/loop-step.test.ts`, one test added. A real worktree of the fixture's root commits a heading and
pushes `HEAD:main`; the test first holds that `HEAD` of the root is unchanged, that `origin/main` is the
pushed commit and that the root's file has no such heading. Then:

- `step --for event` and `step --for run`, one ended overseer run with the old `after`: no act, nothing
  skipped, `self.sh` not called, `HEAD` of the root unchanged.
- two issues ended after the entry: no act. A third: `start overseer`, with two run files of the old
  `after` present.
- two run files with the new `after`: skipped, and the reason names the new event.

`tests/tools/loop.test.ts`, one test added, through `start --role overseer`:

- the root one entry behind `origin/main`: the file's `after`, the token's note and the prompt's third line
  have 6010;
- the root's file ahead of `origin/main` (6020 against 5646): `after` is 6020;
- no ref `origin/main` at all: `after` is 6020, the file's.

Counts, each from a run after the last edit of `loop.ts` and of the tests:

```
cd $W && bun test --timeout=30000 ./tests/tools/loop-step.test.ts ./tests/tools/loop.test.ts
  53 pass, 0 fail, 549 expect() calls, 53 tests across 2 files (15:39)
$W/tests/tools/suite.sh
  1237 pass, 0 fail, 10165 expect() calls, 1237 tests across 127 files (begun after 15:30, ended before the run above began)
```

On this machine at 15:30 the two reads agreed, the main checkout 0 behind:

```
grep '^## .*events' <root>/…/oversight.md | tail -1               ## 2026-10-13 15:13 CEST, events 6550 to 6590
git -C <root> show origin/main:…/oversight.md | grep … | tail -1   ## 2026-10-13 15:13 CEST, events 6550 to 6590
```

## Not tried

- The driver was not run, with or without `--dry`: the change was seen in the two test files only. The
  first real case is the next overseer that lands while the main checkout is behind.
- An entry pushed from a second machine. By reading, a step for an event on the first does not see it until
  a step for the clock pulls, as before this change.
- A root that is no git repository, and an `origin/main` whose tree has no `oversight.md`. Both are the
  branch `o.code !== 0`, which the test of no ref enters.
- A heading on `origin/main` with a smaller number than the file's is covered (6020 against 5646); two
  equal numbers are every other test of the two files.
- The time one `git show` adds to a step was not measured.
