# st-3-step: `loop.ts step` and `--dry`, one pass made by a program

2026-10-13. Task 3 of `plan/cloud-brain-orchestrator-as-steps.md`, its design part 3. A local tool,
`tools/cloud-brain/loop.ts`, its tests, and a note "As built" in the spec. No seed, no deploy.
Nothing of the issue loop calls the tool yet: the driver is `st-5`, the switch `st-7`. No model was
started by it, and no step that is not dry was run on cb4.

Every run below was made on one laptop (macOS, bun 1.4.0) from Bash calls of the writer, an `Agent`
of a `claude` session in its sandbox, with the token `impl-bf99c9`. `$W` is the worktree
`…/.claude/worktrees/bm-st-3-step`.

## What changed

| File | Change |
|---|---|
| `tools/cloud-brain/loop.ts` | the command `step [--dry]`; `judged`, `givenKey`, `verdictKey` exported; `start` writes `after` in an overseer's file |
| `tests/tools/loop-step.test.ts` | new: 23 tests |
| `plan/cloud-brain-orchestrator-as-steps.md` | part 3, "As built", after the line on `step --dry` |

The header of `loop.ts` is the reference: the six parts of a step in order, what `--dry` leaves
out, and the three environment variables that are new (`LOOP_LOCK`, `LOOP_UPTIME`, `LOOP_SELF`).
The step starts, resumes and ends a run by running `loop.ts start`, `resume` and `ended` as
commands, and reads the line each prints and its exit.

## The check on cb4: one dry step

The spec's second R2 row. `LOOP_TOKEN=impl-bf99c9 bun tools/cloud-brain/loop.ts step --dry`, run in
`$W` at 09:10:21 CEST (`date` before it), with the real `worktree.sh`, `brain.ts`, `lock.sh`,
`uptime` and `issue-as.sh`:

```
exit 0, 47.4 s (`time`), 57 lines: one line of JSON, then the status
{"at":1791875464347,"seq":6197,"dry":true,"health":{"ok":true},"acts":[…10…],"given":[],"skipped":[…4…]}
```

The seq of `queue?limit=1` before the step was 6190. `issue-as.sh impl-bf99c9 "sync?after=6190"`
after it: 7 events, none whose `by` names `impl-bf99c9`.

The 10 acts it named: 3 `worktree-remove` (`appr-tr-4`, `rev-cu-4-price-on-a-stored-write`,
`topics-service`), 4 `start` of a reviewer, 2 of an approver, 1 of an overseer. The 4 skipped
entries were issues in `waiting`, `work`, each with the reason `loop.ts started no implementer on it
and the token of its starter, impl-…, reads the tracker`; this issue was one of them. The status
named 3 issues under "What waits for the owner", each at `awaiting-approval`.

What that run shows of a day beside the session's loop, which is `st-6`'s to read:

- The session's agents are `Agent` calls with no `running` event, so the step named a reviewer for
  4 issues the session may have had a reviewer on. A `review` entry has no test of an agent the
  program did not start.
- `appr-tr-4` is a view whose name is not `appr-` and an id of the tracker (`get?id=tr-4` answered
  404, `no such issue`, at 09:29 CEST; an issue `tr-4-held-read` was at `awaiting-approval`). The step read it as a view of no
  running approver and named its removal. A step that is not dry would have removed it.

Where the 47.4 s went, each command run alone after the step, timed around the call:

```
worktree.sh --list (23 worktrees)   7.8 s
brain.ts redistil                  27.2 s
brain.ts state                      0.3 s
lock.sh show land                   0.3 s
issue-as.sh get?id=st-3-step        0.4 s
issue-as.sh sync?after=5646&limit=500   0.5 s
brain.ts agent-token list           0.3 s
```

The spec says of the driver "How long the health commands take was not measured". Those two are 35 s
of a whole step.

## What differs from the spec

Each is in the spec's part 3 now, under "As built". The ones a choice was made in:

- **`step --dry` writes no file.** The spec says both "prints the line and the status and does
  nothing else" and, in its R7 row, "after `step --dry`, the file names each entry". The first was
  taken: `philosophy.md`, line 2, the side that is smaller and easier to undo. A dry step beside a
  driver would else write over the driver's `status.md`. `st-6` keeps a dry run's output in a file
  of its own, as the spec has it.
- **The tests are a file of their own**, `tests/tools/loop-step.test.ts`. `loop.test.ts` took 22.4 s
  alone before this change (`time bun test …`, before the first edit); the new file takes 72.2 s alone.
- **The runs are read from `get?id=`** of the entries the step acts on. `runs?limit=500` answered
  500 runs and `more: true` at 08:53 CEST, so reading every run is two pages or more a step.
- **An agent the program did not start is known by the starter's token** having no run of the role
  in the record, for an issue in `waiting`, `work`, and for a `round`. The spec has it for `work`
  and "no run of its current round". Read as the spec has it, a writer a session started after a
  `back` (the dead writer's run is of the same round) would get a second `back`.
- **A writer's token that was kept** is ended from the file of `runs/` when its issue is closed, not
  from `agent-token list`: the files are what this machine started, and a session's agents have a
  token the session ends.
- **Not healthy** follows `SKILL.md` step 1 to the letter: a `brain-x-*` Worker that `state` shows
  at another hash than `seen.json` of `origin/main`. A deploy that is applied and not yet landed
  reads so. Not seen: no deploy was under way in the one run on cb4.
- **A dry step names less than a step does, where one act reads what another wrote.** A `running`
  run whose process is gone is named `stopped`, and the `back` of its issue is not named: that row
  reads the outcome the step would have written, and a dry step writes none. The same for a run of
  `runs/` that is to be `ended`. The test "a `running` run of this machine…" has both lists. `st-6`
  compares what dry steps named with what the session did, and will not find such a `back` there.
- **A step for an event**, which leaves out the pulls, `redistil`, `state` and the removals, is part
  4 of the spec and `st-5`. `step` has the whole step alone.

## The tests

`cd $W && bun test --timeout=30000 ./tests/tools/loop-step.test.ts`: 23 pass, 0 fail, 177 expect()
calls, 72.2 s, at 09:17 CEST after the last change to the tool and to the file.
`$W/tests/tools/suite.sh`, 09:22:10 to 09:24:41 CEST, after that: 1119 pass, 0 fail, 113 files,
144.5 s; `uptime`'s first number before it was 8.99. And once more after the rebase on `origin/main`
that brought in 28 files, none of them `loop.ts` or a test of it, ended 09:32:02 CEST: 1133 pass,
0 fail, 114 files, 114.6 s.

The tracker is a stand-in served by the test file and called through the real `issue-as.sh`. Its
queue is what a test puts there: it does not make `queue` from the issues. `worktree.sh`,
`brain.ts`, `lock.sh` and `uptime` are stand-ins. `loop.ts start`, `resume` and `ended` are a
stand-in that logs its arguments, and in the last test the real commands. `git` is the real
one on scratch repositories, for the pulls.

With `loop.ts` changed and the file run again, then the change taken back (`git diff --stat` after:
the same as before):

```
loop.ts of HEAD (no step)                              0 pass, 1 fail: the file does not load
an entry is given whatever comment it has              6 tests fail, or more: the list was cut at 12 lines
no test of a running reviewer                          2 of 23 fail
a dry step makes its acts                              6 tests fail, or more: the list was cut at 12 lines
no bound of 2 dead runs                                4 of 23 fail
```

The rows of the step's table, and the test that holds each (by the start of its name):

| Row | Test |
|---|---|
| `review` | "`review`: a reviewer is started…" |
| `round`, fewer than 3 `rework` moves; a `waiter` | "`round`: `resume` for the role…" |
| `round`, 3 `rework` moves, or a run with no submit | "`round` at 3 `rework` moves…", "`round` whose last run ended `no-submit`…" |
| `round`, labeled `needs-owner`, no word of his | "labeled `needs-owner`…" |
| `ready`, `finish` | "`ready` and `finish`…" |
| `start`, `spec` | "`start` and `spec`…" |
| in `waiting`, `owner`, at `awaiting-approval` | "in `waiting` for the owner at `awaiting-approval`…" |
| in `waiting`, `work`: "A dead writer" | "in `waiting`, `work`…" |
| 2 dead runs | the tests of `review`, `round`, `start` and `spec`, and the approver's |
| a digest the snapshot opened | "a digest the snapshot opened…" |
| an overseer | "an overseer is started at 3 issues ended…" |
| `triage`, `decompose`, `promote`, `look`; `asks-orchestrator`; his move with no post mortem | "`triage`, `decompose`, `promote`, `look`, an agent's ask…" |
| labeled `needs-owner`, with an event of his | "labeled `needs-owner`…" |
| the cluster is not healthy | "health: a Worker that is not `same`…" |

The spec's R rows for this task: R2, the same line twice, and R7, "step --dry twice over the same
answers…"; R6, a judgment that leaves the entry, the tests of the two `round` rows, "labeled
`needs-owner`…", "`triage`, `decompose`…" and "a given entry whose judgment run ended `stopped`…";
R6, an agent that dies before its first move, and a `review` entry beside a `running` writer, the
tests of `review`, `round`, `start` and `spec`; R6, the dead run, "a `running` run of this
machine…".

One clause of an R6 row is held in another form than it is written. "An entry of each row marked
yes is given at one step and not at the next": the row "the cluster is not healthy" has no issue
and no comment, and is given at every step that finds it so (the spec, part 3, item 5: "it is given
in a whole step only"). The test of health has two such steps and reads the entry in both.

## Not built, not tried

- **A step that is not dry, on cb4.** It would start agents on the issues of the loop that runs
  there. Every act but the reads was made against stand-ins.
- **No run with a model**, as in `st-2`.
- **The judgment run** is `st-4`. The step writes the `given` comment with `to no run`, and reads a
  comment of the later form, `to <token>, its run on <issue>`, in tests whose comment and `cost`
  event the test wrote. The spec has "ended `stopped`, or with `is_error` in its result" as the
  run that is given once more. The step reads the outcome `stopped` alone: what outcome `ended`
  gives a judgment run whose result is an error is `st-4`'s to set.
- **`resume` through the step with the real command.** The last test runs the real `start` of a
  reviewer and the real `ended`. `resume`, and a `start` of a writer, an approver and an overseer,
  were run by the step as the stand-in.
- **No number of writers is set**, as `SKILL.md` step 2 has it: the step starts a writer for every
  `start` and `spec` entry of the queue that nothing stops. On cb4 at 08:53 CEST the queue had 2.
  What a step does with 20 was not tried.
- **Whether an open issue names what failed** when the cluster is not healthy is not read: the entry
  `unhealthy` is given with what failed, and the judgment is to find the issue.
- **`lease.get`, and `issue-stats.ts` with "Past 4 hours"**, of `SKILL.md` step 1, are not run by
  the step. The spec's list of the health commands does not have them.
- **A comment that begins `held:`** on a `ready` entry (`SKILL.md`, the row `ready`: "Read first")
  is not read: the move is made.
- **A quick win of a session's own that was sent back**, and "A submit made for a writer", have no
  row in the spec's table. The first is a `round` whose starter is an `orch-` token with no run: it
  is left while that token reads the tracker.
- **A refused pull of the main checkout** was seen in a test with a commit on each side. `index.lock`
  and a changed file that the pull would write over were not tried. `sync.ts` after `deploy/` is put
  back was a one-line stand-in in the scratch repository; the real one was not run by the step.
- **What `brain.ts redistil` and `state` print when a Worker is not `same`** was written in the
  stand-in from `brain.ts` (the line of `redistil`, `brief()` of `state`). The real output was read
  by the step once, healthy, in the run on cb4.
- **`uptime` at 15, `land` held at two steps, a result that was an error**: each in a test, none
  seen on this machine in a step. `uptime` read 6.89 at 08:53 CEST.
- **A `running` run on an issue the queue does not list** is not seen by the step (the runs are read
  from the entries). A closed issue with such a run was not looked for.
- **Two steps at once.** The driver runs one at a time (`st-5`). Two by hand would each start a
  reviewer for one `review` entry when both read the issue before either wrote its event.
- **Two machines.** `LOOP_HOST` was `testhost` in the tests, and a run of `otherhost` is left and
  named. Nothing was run on two.
- **The new test file is not in `tests/tools/timings.json`**, which the suite reads to start the
  slowest files first. The file was left as it is (`agents/implementer.md`, step 6).
