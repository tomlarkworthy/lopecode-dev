# st-6-a-day-beside-the-session: `loop.ts compare`, 2 dry steps beside a session's moves, and two faults mended

2026-10-13. Task 6 of `plan/cloud-brain-orchestrator-as-steps.md`, as the owner re-scoped it that morning. A
local tool, its tests, a note "As built" in the spec. No seed, no deploy.

**This is not the day the task was written for.** The task asked for `loop.ts run --dry` beside the session's
loop for a day. The owner stopped that loop before the task began, and chose the re-scope (comment 6410 of
the issue, his words: "Re-scope is my wish this is a priority issue"): the dry driver beside the hand-made
moves of one session, for the hours of this task. What was compared is **2 lines of a dry driver over 3
minutes and 1 event**, with the acts of 3 more dry steps read from where they were written down. "What this
did not see", below, is the larger part of the R8 check.

Every run below was made on one laptop (macOS, bun 1.4.0) from Bash calls of the writer, a `claude` process
that `loop.ts start` began for the session `out-5bc2ed`, with the token `impl-d3a51d`. `$W` is the worktree
`…/.claude/worktrees/bm-orchestrator-as-steps`, `<root>` the main checkout. Times are CEST from `date` or
from an event's `at`.

## What changed

| File | Change |
|---|---|
| `tools/cloud-brain/loop.ts` | the command `compare`; `compare` and `compareText` exported; `alive` reads `pgrep -a -f`; the step leaves an issue at work that is labeled `needs-owner` |
| `tests/tools/loop-compare.test.ts` | new: 5 tests of `compare` and its text |
| `tests/tools/loop.test.ts` | 2 tests more (18): a run seen from inside itself; the pid as the first word of a line |
| `tests/tools/loop-step.test.ts` | 2 tests more (30): the issue at work labeled `needs-owner`; the command `compare` against the stand-in tracker |
| `plan/cloud-brain-orchestrator-as-steps.md` | the row of "A dead writer" has the label; part 3, "As built (`st-6`…)"; the R8 row has the command as built |

The counts of tests: `grep -c '^test(' tests/tools/loop-compare.test.ts tests/tools/loop.test.ts tests/tools/loop-step.test.ts`.

## The two rows that were wrong

### 1. A step made inside a run took that run for gone

Note 3 of review 6467 of `st-5-driver`: a dry step in the reviewer's sandbox named `ended` for the
reviewer's own live run, `pgrep` printed nothing there and `ps` was refused. It was read as a matter of the
sandbox. It is not. This writer's run, from inside itself (between 11:42:11 and 11:44:27):

```
$ pgrep -f 'loop-run-impl-d3a51d( |$)'        → nothing, exit 1
$ pgrep -a -f 'loop-run-impl-d3a51d( |$)'     → 10233, exit 0
```

10233 is the `pid` of `runs/impl-d3a51d.json`. On macOS `pgrep` leaves its own ancestors out unless it is
given `-a`, and a command an agent runs is a descendant of its run's wrapper. A dry step with this writer's
token before the change (11:44:27):

```
{"act":"ended","token":"impl-d3a51d","id":"st-6-a-day-beside-the-session","role":"implementer","why":"its process is gone and left no result"}
```

Read from `ended` in `loop.ts` and not run: a step that is not dry would then have written the run's `cost`
event with the outcome `stopped` and ended its token, and the step after it would have made `back`.

**Who was wrong in this way, and who was not.** A step whose process is under the wrapper it looks for: an
agent of a run that makes a step, as the reviewer did and this writer did. Not the driver: a wrapper it
starts is its descendant. The dry driver of `out-5bc2ed` (pid 9479, in the main checkout, with `loop.ts` of
before this change) named no `ended` for `impl-d3a51d` in either of its 2 lines, while that run lived.

**The mend.** `alive` reads `pgrep -a -f`. On Linux `-a` means another thing, the command line printed after
the pid, so the pid is taken as the first word of each line. The same dry step after the change (11:55:02)
names no `ended`.

**From one safehouse to another** (asked in comment 6470). `pgrep` here lists the processes of other
sandboxes. With `pgrep -a -P <pid>`, walked down from each of 7 `safehouse` processes (11:51:03): the dry
driver 9479 is under one of them (50059), and a first child of each of the 7 was found by its pid in
`pgrep -a -f .` run from this writer's sandbox. This writer's wrapper, 10233, is under none of the 7:
`start` detaches it. So a step in one sandbox reads
the command line of a wrapper begun in another. Seen for processes of other sandboxes, by pid; no wrapper
of a run begun in another sandbox ran at the time, so that case was not seen as such.

**`loop.sh` was not seen.** `LOOP_TOKEN=impl-d3a51d tools/cloud-brain/loop.sh --dry` from this writer's
sandbox (11:51:16) ended at once: `mkdir: /Users/tom.larkworthy/.fly: Operation not permitted`, then
`Path does not exist: ~/.fly`, and nothing on stdout. Whether a driver begun by `loop.sh` from a terminal
sees its wrappers is therefore read and not seen: its `safehouse` has the arguments the sessions' have, and
the sessions' sandbox runs `pgrep`.

### 2. An issue at work, labeled `needs-owner`, was to be sent `back`

`never-page-up-line-after-a-check`: its writer `impl-4f8cb6` asked for an act that is the owner's (comment
6402), ended with no submit (`cost`, `no-submit`, 6403), and the session of that time labeled the issue
`needs-owner` (6404). It was never sent back, so `issue.queue` has it in `waiting`, `why: work`, and not as
a `round`. Each dry step read named

```
{"act":"back","id":"never-page-up-line-after-a-check","role":"implementer","token":"impl-4f8cb6"}
```

and `st-5-driver`'s record has a `back` among the acts of its two steps, at events 6428 and 6431, after the
label. A step that is not dry would have ended the writer's token and moved the issue to `ready`; the step
after it would have started a second writer on a question that is the owner's, beside a commit of the first
that is not landed (`worktree.sh --list`: `never-page-up not-clean … ahead=1 … occupant=impl-4f8cb6`, before 11:41:39).

The pass by hand does nothing there: `SKILL.md`, step 3, the row "labeled `needs-owner`": "Otherwise
nothing: it is the owner's, and it is named in step 7". The spec's table had the label in the rows of
`waiting`, `owner` and of a `round`, and its words "the label leaves an issue at `in-progress` or `spec` in
the queue" hold for an issue that was sent back; the row of "A dead writer" had no word of the label.

**The mend.** In `waiting`, `work`, an issue labeled `needs-owner` is read as a `round` so labeled: no act,
a line of the status under "What waits for the owner", and given as `answer` when an event of his session
or of an `out-` token follows the label. The dry step after the change (11:55:02) names no `back`, and its
status has `- never-page-up-line-after-a-check (in-progress, at work, labeled needs-owner)`.

## The other acts the dry steps named, each against the pass by hand

The acts of the 2 lines of the dry driver, of the dry step this writer made before the change, and of the
one made by hand at event 6469 as comment 6470 lists it. Each was read against `SKILL.md` and the record at
event 6473.

| Act | What the record has | By `SKILL.md` | |
|---|---|---|---|
| `worktree-remove topics-service` | `worktree.sh --list`: `clean`, `occupant=-`; the issue `topics-service` is `done` and closed | step 1: a worktree of a topic at `done`, `closed` or `rejected` is removed | the same |
| `token-ended impl-e88c70` | `st-5-driver` is `done` (pass, 6468); `ended` kept the token at `in-review` | "A token for each agent": ended when its issue has left review for good | the same |
| `ready st-6-a-day-beside-the-session` (6469 alone) | `triaged`, its two links at `done` | the row `ready` | the same; the session made it at 6471 |
| `back never-page-up-line-after-a-check` | labeled `needs-owner` at 6404 | the row "labeled `needs-owner`": nothing | **wrong**, 2 above |
| `ended impl-d3a51d` (this writer's step alone) | the run lived | no such act | **wrong**, 1 above |
| `start fly-4-loop-files`, implementer | `ready`, in `queue` as `start`; its links `after` (`fly-3-brain-fly-service`, `st-5-driver`) are both `done`; comment 5777 of the session that linked it: a writer "reads part 6 of that spec with the body" | the row `start` | the same |
| `start overseer` | the last heading of `oversight.md` ends at event 6231; after it `st-4-orchestrator-brief` (6412), `services-table-drawn-three-times-a-read` (6425), `undeployed-seeds-not-shown-to-owner` (6443) and `st-5-driver` (6468) passed | step 6: 3 issues at `done`, `rejected` or `needs-owner` since the last entry | the same; that no `over-` token lives is the step's read, which a writer does not make |
| `start orchestrator`: `promote fb-a2k9vvmfvv` (event 6372), `triage suite-hangs-in-brain-cli-test` (6465) | the first is the owner's `feedback`, `open`, in `queue` as `promote`; the second a `bug` opened at 6465, as `triage` | both are judgments of the session | the same |
| skipped: `start st-6-a-day-beside-the-session`, "a writer of it runs" | `cost` `running`, 6473 | one writer an issue | the same |

Of these the session `out-5bc2ed` made one, the `ready`, and started this task's writer. It made none of the
others: the owner had asked it for the tasks of this feature only (comment 6470). So "not done" in the list
below is no sign that a row is wrong.

## `loop.ts compare`

`LOOP_TOKEN=<own token> bun tools/cloud-brain/loop.ts compare [--since <hours>] [--steps <file>] [--by <names>]`.
The header of `loop.ts` says which event it takes for each act. Where it differs from the spec's row:

- **It reads a file of lines, `--steps <file>`.** The spec has it read `steps.jsonl`. A dry step writes no
  `steps.jsonl` (the "As built" note of `st-3`), and the lines of `run --dry` are its stdout, which the
  session sent to a file. With no `--steps` the file is `steps.jsonl`, for `st-8`.
- **A session's loop wrote no event when it started an agent**, only a `cost` event at its end. So for a
  `start` the event is the `cost` event of that role or the agent's own first event, whichever is first, and
  for a reviewer that is the review: the minutes are then to the review and not to the start.
- **The second list cannot say that a step would not have named an act.** A step reads the record as it is
  when it runs. What a session did before the next step read is named by no step. Each row has the seq the
  step before it read and the minutes since, for the reader to judge by.

### The two lists, of the dry driver of `out-5bc2ed`

`LOOP_TOKEN=out-5bc2ed bun tools/cloud-brain/loop.ts run --dry`, begun by that session in the main checkout
(comment 6470), its stdout to `<root>/tools/cloud-brain/.emitted/issue-loop/dry-run-st-6.log`. At 11:57:30
the file had 2 lines (`wc -l`):

| `at` | `seq` | begun for | `health` | acts |
|---|---|---|---|---|
| 11:41:47 | 6473 | the clock | `{"ok":true}` | `worktree-remove`, `token-ended`, `back`, `start` (`fly-4-loop-files`), `start` (overseer), `start` (orchestrator, 2 entries) |
| 11:44:57 | 6474 | an event | `{"ok":true}` | the same but `worktree-remove`, which a step for an event leaves out |

Event 6474 is this writer's `start` move, at 11:44:41: the second step was begun for it 16 s later.
`LOOP_TOKEN=impl-d3a51d bun tools/cloud-brain/loop.ts compare --steps <that file>`, 11:57:30, from its second line on:

```
# 2 dry steps, events 6473 to 6474 (09:41:47Z to 09:44:57Z): 1 whole, 0 not healthy; 1 events after the first

## Named by a dry step and done

Nothing.

## Named by a dry step and not done

- worktree-remove topics-service: named by 1 step, first at event 6473 (09:41:47Z)
- back implementer never-page-up-line-after-a-check: named by 2 steps, first at event 6473 (09:41:47Z), last at 6474 (09:44:57Z)
- start implementer fly-4-loop-files: named by 2 steps, first at event 6473 (09:41:47Z), last at 6474 (09:44:57Z)
- given promote fb-a2k9vvmfvv: named by 2 steps, first at event 6473 (09:41:47Z), last at 6474 (09:44:57Z)
- given triage suite-hangs-in-brain-cli-test: named by 2 steps, first at event 6473 (09:41:47Z), last at 6474 (09:44:57Z)

## Named by a dry step, of a kind the record has no event of

- token-ended st-5-driver: named by 2 steps, first at event 6473 (09:41:47Z), last at 6474 (09:44:57Z)
- start overseer: named by 2 steps, first at event 6473 (09:41:47Z), last at 6474 (09:44:57Z)

## Done with a session's token, or an agent's own start, and named by no dry step

Nothing.
```

The first list is empty: the session did nothing a step named in those 3 minutes. The last is empty too:
the one event, this writer's own `start`, is left out because a `running` event of its token (6473) names
it. No row of either list has an event beside it, so **`compare` on cb4 matched no act to an event**. That
it does is held by the tests alone.

### Three more dry steps, read where they were written down

Their lines were kept in no file, so `compare` did not read them.

- **The step by hand at event 6469**, 11:40:40 by comment 6470. It named `ready
  st-6-a-day-beside-the-session`. The session made that move at 6471, 11:41:07 (the event's `at`): 27 s. This
  is the one act of the check that a dry step named and the session then did.
- **The two steps of `st-5-driver`'s record**, at events 6428 (10:47:00) and 6431 (10:48:08), beside the
  session's loop of that time, `orch-d97e0e`. The second named `start`, a reviewer of
  `approver-policy-mark-takes-every-route`, for the submit at 6430. That loop's reviewer `rev-e14b0f` wrote
  its review at 6434. Both named a `back`.

## Tests

`cd $W && bun test --timeout=30000 ./tests/tools/loop-compare.test.ts ./tests/tools/loop.test.ts ./tests/tools/loop-step.test.ts ./tests/tools/loop-run.test.ts`,
after the last change to a program or a test (ended 12:01:27): **71 pass, 0 fail**.

**Without the change.** `loop.ts` as `git show HEAD:` has it put in place for the run and the new one put
back after (11:57:17), the test files as they are now:

- `loop-compare.test.ts`: `SyntaxError: Export named 'compare' not found in module … loop.ts`, 0 pass, 1 error.
- `loop.test.ts` and `loop-step.test.ts` together: 44 pass, 4 fail. The four are the four new tests.

The two tests of the mends were also run before each mend was written, and failed for what was seen on
cb4: `alive` answered `false` from under the wrapper, and the step named `back a implementer`.

The whole suite, `env -u WORK -u SESSION -u LOOP_TOKEN -u LOOP_RUN -u LOOP_RUN_TOKEN -u LOOP_TS $W/tests/tools/suite.sh`
(a writer that `loop.ts start` began has those six in its environment; `st-5-driver`'s record has why the
first two are taken out), three runs after the changes to the programs:

| Ended | | |
|---|---|---|
| 11:54:47 | 1215 pass, 0 fail, 124 files | before the last edit, the refusal of a directory given as `--steps` |
| 11:59:29 | 1214 pass, 1 fail | after it. The fail: `tests/tools/summarize-papers.test.ts`, "run skips and names…", `ENOENT` of a `.txt` under its own rig. This change touches nothing that file runs; alone, `env -u WORK -u SESSION bun test --timeout=30000 ./tests/tools/summarize-papers.test.ts`: 33 pass, 0 fail |
| 12:03:55 | **1215 pass, 0 fail**, 124 files | after it, the same tree |

## What this did not see, that the day would have

- **A `review`, a `round` with its `resume`, a `finish`, a digest, a `spec`, an approver.** No issue came to
  any of them while a dry step ran. Of the rows of the step's table, the dry steps of this check entered
  `ready` (once, by hand), `start`, the overseer's, the judgment's (`promote`, `triage`), "A dead writer",
  and the two removals of step 1 and of a token.
- **A session's loop.** The moves beside the dry driver were one session's, made by hand for one feature. It
  left alone what it was not asked for, so most acts a step named have nothing beside them.
- **An act matched to an event by `compare` on cb4**, and the minutes between the two: none.
- **An event of a session that no step named.** The list was empty; whether the step's table misses
  something a loop does was not put to it.
- **The steps for the clock.** One whole step in the file. A day has 48 of them or more, with `redistil`
  and `state` against whatever was deployed that day.
- **Load, a held `land`, a result that was an error**: none of what stops a start was so in a step read.
- **A step that is not dry.** As for `st-5-driver`: no `run` without `--dry` was made, and `loop.sh` was not
  run in a sandbox that would start it.
- **The dry driver with these mends.** It runs `loop.ts` of the main checkout, which has the change when
  that checkout is pulled. Its lines until then name the `back`.

## Not tried

- Linux: `pgrep -a -f` was run on macOS alone. The form Linux prints is a stand-in in a test.
- `compare` with `--since` on cb4 over more than the 2 lines, and with `steps.jsonl` of a step that is
  not dry on cb4: the tests have both against the stand-in.
- `compare` over more than one page of `sync` on cb4. The stand-in pages by 4.
- A `resume` matched by a submit, and the other kinds of act: each is a case of a test, none was seen on cb4.
- `loop.ts resume <id>` called by hand on an issue at work that is labeled `needs-owner`: it is "A dead
  writer" there as before. The step no longer calls it for such an issue.
