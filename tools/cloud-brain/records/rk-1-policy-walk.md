# rk-1-policy-walk: the tracker's policy walked as a state machine

Issue `rk-1-policy-walk`, task 1 of 6 of `rules-checked-and-stale-knowledge-seen`. The design is section 1 of
`plan/cloud-brain-rules-checked-and-stale-knowledge-seen.md`, "The walk (R1, R2)", which the owner approved at
event 6994. Written 2026-10-13 by the writer with the token `impl-70a5a6`. A tool, a cell that is a test
fixture, a test, and one paragraph of `SKILL.md`. No seed was changed and nothing was deployed.

## What changed

| File | What it is |
|---|---|
| `tools/cloud-brain/policy-walk.ts` | The command. Its header is the reference |
| `tests/tools/fixtures/policy-walk.ojs` | The cell `test_policy_walk`: the walk and the seven properties |
| `tests/tools/fixtures/policy-walk-his.json` | The states only the owner present ends, which `loop-ends-it` does not count |
| `tests/tools/policy-walk.test.ts` | 11 tests |
| `.claude/skills/brain-maintenance/SKILL.md`, step 7 | "After an install": the run of `--in-force` |

The tool compiles this checkout's `brain-issues.ojs` with the cell at its end and no other test cell
(`seedModule` of `tests/tools/needs.ts`, into a directory of the temp directory that it removes), and runs it with
`cloud-brain-dev/test.ts brain-x-issues --with`. The cell calls `issuePolicyAct`, `issueAllowed`, `issueEvent` and
`issueApply` of the seed as they are.

## What it printed

`bun tools/cloud-brain/policy-walk.ts plan/cloud-brain-issues-policy-v6.json`, 21:40 CEST, exit 1. The lines are cut
here at the count; the nine paths are left out but for the first.

```
plan/cloud-brain-issues-policy-v6.json: 30144 states, 980128 acts allowed, 2362256 acts tried, 0 states left unvisited, 19.1 s in the cell
major-done-is-his: holds: 0 …
major-stays: holds: 0 …
project-done-was-approved: holds: 0 …
no-own-review: holds: 0 …
no-trap: holds: 0 …
loop-ends-it: holds: 0 … : the owner's, as listed: security/awaiting-approval, security/in-review
moves-are-his-or-a-token: fails: 9 … : project.respec project.review project.to-approval task.pass task.review task.rework task.start task.submit task.to-approval
  path: a opens x (project) > owner spec with a reason and a ref > owner submit-spec with a reason and a ref > a reviews changes > worker respec
```

The three counts of the first line are those the spec's prototype gave for the v5 file (30,144, 980,128 and
2,362,256, "The walk, run as a prototype"), and the nine acts are its nine. The v6 file has the policy of the v5
file: `python3 -c "import json;a=json.load(open('plan/cloud-brain-issues-policy-v5.json'));b=json.load(open('plan/cloud-brain-issues-policy-v6.json'));print(a['policy']==b['policy'])"` prints `True`.

`bun tools/cloud-brain/policy-walk.ts --default`, 21:41 CEST, exit 1: 30144 states, 977536 acts allowed, 2362256
acts tried, 17.7 s in the cell; the same six `holds` and the same nine, and `loop-ends-it` lists
`project/awaiting-approval` beside the two of `security`. 977,536 is the spec's count for the default policy.

`bun tools/cloud-brain/policy-walk.ts --in-force --token impl-70a5a6`, 21:36 CEST, against cb4, a read:

```
in force: v6
  the 4 workflow hashes of the policy of event 6510 are those of plan/cloud-brain-issues-policy-v6.json; the reason in force is the file's
```

## That the walk can fail

Three policies, each the v6 file with one guard changed, each walked with `--until <property>`. The test makes them;
the paths below are of runs by hand on the same three changes, at 21:32 CEST the first and 21:35 the other two. Each exit 1.

| Guard changed | Property | The path printed |
|---|---|---|
| `pass` of `task` without `!issue.major` | `major-done-is-his` | `a opens x (task) > owner start with a reason and a ref > owner submit with a reason and a ref > owner labels +major > a reviews pass > a pass` |
| `label` of every workflow without its `caller.present` clause | `major-stays` | `a opens x (task) > owner labels +major > a labels -major` |
| `review` of `task` without `caller.actor != issue.by.start` | `no-own-review` | `a opens x (task) > owner start with a reason and a ref > owner submit with a reason and a ref > owner reviews pass` |

In the third the caller that reviews its own work is the owner, who started the issue: the shortest path. The test
holds that the caller of `start`, of `submit` and of the review is one caller, not which.

A fourth, by hand and not in the test, for a property that is judged over the whole graph: `approve` of `project`
with the guard `caller.kind in ["owner", "token"]`, walked whole at 21:49 CEST. `project-done-was-approved: fails: 384`,
with the path `a opens x (project) > owner spec … > a reviews pass > a to-approval > a approve > a opens the part ct
(task) > owner decompose > a moves the part ct to closed > owner finish`; the five other properties that held, held.

That a test fails when the cell does not check: with `false &&` put before the body of `major-stays` in the cell,
`bun test --timeout=30000 ./tests/tools/policy-walk.test.ts -t "breaks major-stays"` gave `0 pass, 1 fail`
(`Expected: 1, Received: 0`, the exit). The cell was put back from a copy and `git diff --stat` of it printed nothing.

## Where this differs from the spec

- **The newest file is v6, and it is not `rk-2`'s.** The spec names `plan/cloud-brain-issues-policy-v6.json` as the
  file `rk-2` will make. A v6 file is on `main` since `approver-policy-mark-takes-every-route`: the v5 policy under a
  key of its own, for the approver's pins. The test walks the newest file as `policy-pins.ts` finds it, so it walks
  v6 today, and `rk-2`'s file is the next number. The spec's sentence "after `rk-2`'s install … prints `in force: v6`"
  is true today for another reason, as the run above shows.
- **The list of the owner's states has two lists**, `file` and `default`. The spec has one file that "lists" the
  states and says of the default policy that `project/awaiting-approval` is among the states only the owner ends,
  "since the default names no approver". With one list `--default` would fail `loop-ends-it` on a state the spec
  says is his. The writer's reading, not the spec's words.
- **The approver is one of the two who may end a `major` issue only where the `approve` guard of that workflow
  names its delegation.** The prototype counted the approver for every workflow. Under v6 `security`'s `approve` is
  `caller.present`, and an approver that ended a `security` issue would now be a break.
- **`no-own-review` reads the names from the guards.** The review states are those the workflow's `review` guard
  names (`issue.state == "…"`), the actor is the field of `by` that the guard of a move into one compares the caller
  with (`submit`: `caller.actor == issue.by.start`), and the moves out are those from such a state whose guard reads
  `issue.reviews`. The prototype had `in-review`, `spec-review` and the four move names written in. A workflow whose
  `review` guard names no state, or with no such move into it, is not asked.
- **`major-stays` is any edge of the issue that leaves it without `major`**, not a label act alone.
- **Two flags the spec's usage line does not have**: `--until <property>`, by which the three weakened walks stop at
  their first broken edge, and `--json`. Exit 2 is also the arguments, a file that is no policy, and an
  `issue.policy` that was not read.
- **A view is copied by its issues alone at each act**, where the prototype copied the whole view. `issueApply`
  writes `seq`, `head` and `issues` for an event that is no policy (read in the seed, lines 612 to 677). The counts
  are the same and the walk of the v6 file went from 98.7 s in the cell (21:31 CEST, `uptime` load 32 on 18 cores) to
  19.1 s (21:40 CEST, load 35).
- **What the compiler prints is not shown.** The toolchain notebook, loaded with no browser, wrote 34,767 lines
  before the walk's first line in the first run of the tool, saved with both streams in one file; `console.*` is put aside while the seed is compiled.

## Tests

- `bun test --timeout=30000 ./tests/tools/policy-walk.test.ts`: 11 pass, 0 fail, 107 expect() calls, 29.47 s
  (21:43 CEST, the run before the commit of the change). The file was 33.30 s, 86.32 s and 147.72 s in three
  earlier runs, the last two before the copy was made lighter. Each test names 200 s.
- `tests/tools/suite.sh`, four runs after the last edit of the change, each of 1312 tests in 137 files:

  | Began (CEST) | `uptime` load at the start | Result | Time |
  |---|---|---|---|
  | 21:43 | 30 (read at 21:41) | 1307 pass, 5 fail: all in `light-agent.test.ts` | 265.27 s |
  | 21:48 | 44 (read at 21:53, its end) | 1306 pass, 6 fail, 2 errors: `summarize-papers.test.ts` 1, `issue-wait.test.ts` 3, `loop-step.test.ts` 2 | 309.93 s |
  | 21:57 | 10.87 | no end: 3 lines of output by 22:17, when the harness stopped it | |
  | 22:17 | 4.10 | 1312 pass, 0 fail, 10906 expect() calls | 137.65 s |

  No test of `policy-walk.test.ts` failed in the two runs that had failures. Each of the four files that did was
  then run alone, `bun test --timeout=30000 ./tests/tools/<file>`, before 21:57: `summarize-papers` 33 pass,
  `issue-wait` 22 pass, `loop-step` 40 pass (119.60 s), `light-agent` 30 pass, and none failed. What held the third
  run was not found. Its temp directory, `/tmp/bm-suite-run.2Vy8ys/t`, had nothing newer than 22:00, the directory of
  this test's stand-ins was there with 27 entries, and no directory of the tool (`policy-walk-…`) was left, so each
  process of the tool had ended. The other writers of the loop were at work on the machine through the first three.
  Whether this file makes the suite longer was not measured: no run of the suite without it was made, and 137.65 s
  at a load of 4 is over the 80 to 94 s that `suite.sh` gives for 2026-10-12.

The file is one whole walk and four short ones, each a process of the tool, started together at the first test,
and then the processes of `--in-force` and of the refusals. Alone it was 24.77 s at 21:57 CEST.

## Not tried

- `no-trap` and `loop-ends-it` failing on a walk. Their `fails` line is held for `no-trap` by a test of `lines()`
  with a made-up answer, and no policy was made that traps a state or strands one.
- A walk the cap of 400,000 states stops: `lines()` is tested with a made-up answer, and no walk reached it.
- A policy with a workflow that lacks the names a property reads: the line "asked of no workflow" is tested with a
  made-up answer.
- `--in-force` when cb4 is not reached. The refusal is tested with a stand-in of `issue-as.sh` that exits 3.
- `--in-force` answering `not v<n>` against cb4: every such answer is of the stand-in.
- The paragraph of `SKILL.md` step 7 followed by an orchestrator after an install.
- The time of a walk on a machine at rest: each walk timed here was at a load of 30 or more.
- Why the third run of the suite did not end, and the suite's time without this file.
- What the spec lists under "What the walk does not show": `issue.narrow`, the owner's own swap, holds and waits,
  links `after`, a second level of parts. A property that holds here holds for one issue with two parts, five
  callers and three labels.
- A Worker that opens an issue or a part: the parts are opened by a token, as in the prototype.
