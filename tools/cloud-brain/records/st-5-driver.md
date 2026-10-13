# st-5-driver: `loop.ts run` and `--dry`, the lock `loop`, `loop.sh`

2026-10-13. Task 5 of `plan/cloud-brain-orchestrator-as-steps.md`, its design part 4. A local tool, a
script, tests, and a note "As built" in the spec. No seed, no deploy.

**`loop.ts run` was not run without `--dry` on cb4, and `loop.sh` was not run with the real `safehouse`.**
A driver that is not dry makes a token (`agent-token`, which is not a writer's to run) and makes real
steps, which start agents. So the token, the take and the renews of `loop` by the driver, a step that
makes a move, the new token at 40 hours and the stop were seen against stand-ins only. What was seen on
cb4 is under "On cb4".

Every run below was made on one laptop (macOS, bun 1.4.0) from Bash calls of the writer, a `claude`
process started by `loop.ts start` in its sandbox, with the token `impl-e88c70`. `$W` is the worktree
`…/.claude/worktrees/bm-orchestrator-as-steps`.

## What changed

| File | Change |
|---|---|
| `tools/cloud-brain/loop.ts` | the command `run [--dry]`; `drive`, `madeMove` and the five constants exported; `step` takes `--for clock\|event\|run`; `runFiles` moved out of `step` |
| `tools/cloud-brain/lock.sh` | the name `loop` beside `land` and `cb4`; one line of the usage, which is 18 lines now (`sed -n '2,19p' lock.sh | wc -l`) |
| `tools/cloud-brain/loop.sh` | new, 22 lines, zsh: `safehouse` with the arguments `metadev` gives it, then the driver |
| `tests/tools/loop-run.test.ts` | new: 18 tests |
| `tests/tools/loop-step.test.ts` | 1 test more (28), and the usage line in one expectation |
| `tests/tools/lock.test.ts` | 1 test more (31, with 2 that came in at the rebase), and the usage line in one expectation |
| `plan/cloud-brain-orchestrator-as-steps.md` | part 4, "As built (`st-5-driver`…)": seven lines where the program chooses or differs |

What `run` does, in order, is the header of `loop.ts` under `run`. `step --for event` and `--for run`
leave out the two pulls, `worktree.sh --list` with its removals, `redistil` and `state`; they read the two
locks, so a lock cb4 did not say is still not healthy.

## The driver's loop has a stand-in clock

`drive(d, given)` in `loop.ts` is the loop, and asks everything of an object `d`: the time, a sleep, the
token, the lock, a step, the events after a seq, the runs that returned. `run` gives it the machine and
cb4. The tests give it a stand-in whose sleep returns when the stand-in's time has passed it, so 40 hours
of the driver are a few milliseconds and no test waits.

The lock is renewed while a step runs: `drive` waits for the step and a sleep of 30 s together, and asks
for a renew when 120 s have passed. In the test a step of 400 s has 3 renews or more before it ends, and
no two renews are more than 150 s apart.

## Choices the spec does not make

Each is in the spec's "As built" note too.

- **How a step knows what it was begun for.** `--for`. The line of a step that is not whole has `for`.
- **From when the 1,800 s are counted.** From the beginning of the last step for the clock. Counted from
  the last step of any kind, a record with an event every 20 minutes would never have a whole step.
- **After a step that was not healthy.** The next reason is taken as the clock's. A step for an event
  reads no Worker: without this it would start agents on a cluster the last whole step found unhealthy.
  The same after a step with an `error` or with no line, of which the health is not known.
- **`reject`** (an older digest, covered) is a move and is followed by a step, as the digest's is.
- **20 steps one after another at most.** A move has a key, so a step cannot make one twice, and no run
  of steps without end was seen. The limit is there for a step that is wrong in a way not thought of.
- **The token at 40 hours is made before the release**, where the spec has the release first. With no
  new token the driver keeps the lock and its old token and asks again in 30 s. The spec's order would
  leave it with no lock.
- **`run --dry` makes no token** and needs `LOOP_TOKEN`. Every event is a reason: it is to run beside a
  session's loop with that session's token (`st-6`), and the session's events are what it is to answer.
- **The token at a stop.** `ended`, which a run's wrapper calls when the agent returns, is made with the
  token that started the run (`as` in its file). So at a stop the driver ends its token only when no run
  it started is still open, and else says on stderr which command ends it. At 40 hours the old token is
  ended whatever runs it started: their wrappers' `ended` is then refused, and the driver's next step
  for a run that returned makes it with the new token.

## `loop.sh` and `metadev`

`loop.sh` does not copy the arguments. It reads the main checkout's `metadev` each time and runs its
lines from `ENV_PASS=` to the `)` that ends `SAFEHOUSE_ARGS=(`, in a function whose `$0` is `metadev`
(the file names `tools/safehouse-adb.sb` beside itself with `${0:A:h}`). Those lines have a `mkdir -p`
of the directories the sandbox mounts, which is run. No other line of `metadev` is run.

With a stand-in `safehouse` that prints its arguments, on the `PATH` before the real one, 10:45 CEST
(`date` after it was 10:46:13):

```
$ PATH=<stand-in>:$PATH tools/cloud-brain/loop.sh --dry | wc -l
30
$ … | tail -5
--append-profile=/Users/tom.larkworthy/dev/lopecode-dev/tools/safehouse-adb.sb
bun
tools/cloud-brain/loop.ts
run
--dry
$ sed -n '/^SAFEHOUSE_ARGS=(/,/^)/p' <main checkout>/metadev | grep -c -- '--'
26
```

26 arguments of `metadev` and 4 of the driver. That `metadev` has an uncommitted change in the main
checkout (`git diff --stat -- metadev`: 3 lines), which adds `~/.fly` to its `mkdir -p`; in the writer's
sandbox that `mkdir` printed `Operation not permitted` on stderr and the script went on.

zsh leaves the `~` after a `=` as it is (`--add-dirs-ro=~/.ssh`), in `metadev` and in `loop.sh` alike:
`safehouse` is given the same text by both. The test has that case.

`LINES` is a number in zsh (the height of the terminal): a variable of that name took the text of
`metadev` as arithmetic and the script stopped at `METADEV: parameter not set`. It is `TEXT` now.

## On cb4

**The lock.** R8's row of the spec, with the writer's token and the name `st-5-driver` in the driver's
place, 10:46:13 to 10:46:24 CEST:

```
$ LOCK_TOKEN=impl-e88c70 tools/cloud-brain/lock.sh show loop        → loop is not held                (exit 1)
$ … lock.sh take loop st-5-driver      → loop taken by st-5-driver at 2026-10-13 10:46:22 CEST, until 2026-10-13 10:56:22 CEST
$ … lock.sh show loop                  → loop is held by st-5-driver since 2026-10-13 10:46:22 CEST, until …     (exit 0)
$ … lock.sh renew loop st-5-driver     → loop renewed by st-5-driver, until 2026-10-13 10:56:23 CEST (taken …)
$ … lock.sh release loop st-5-driver   → loop released by st-5-driver at 2026-10-13 10:46:23 CEST (taken …)
$ … lock.sh show loop                  → loop is not held                (exit 1)
```

The service takes the name with no change to it. Before this change `show loop` was exit 2 and the usage
(the spec, line 205).

**The dry driver**, `LOOP_TOKEN=impl-e88c70 bun tools/cloud-brain/loop.ts run --dry`, in the background
from 10:46:24, its stdout to a file, stopped with `kill -INT` at about 10:48:11 (`date` after: 10:48:14).
Two lines on stdout, nothing on stderr, and the process was gone 3 s after the signal:

| `at` of the line | `seq` | `for` | `health` | acts named |
|---|---|---|---|---|
| 10:47:00 CEST | 6428 | (none: the clock) | `{"ok":true}` | `worktree-remove`, `back`, `start` (overseer), `start` (orchestrator) |
| 10:48:08 CEST | 6431 | `event` | `{"ok":true}` | `start` (reviewer of `approver-policy-mark-takes-every-route`), `back`, `start`, `start` |

Events 6429 to 6431 (`sync?after=6428`) were a comment, the `submit` and a `waits` of that issue by
`impl-669077`: the second step was begun for them and named the reviewer the submit asks for.
`lock.sh show loop` at 10:47:06, while it ran: `loop is not held`, exit 1. So `run --dry` took none.

**How long a step is**, which the spec had as not measured. One dry step of each kind, with
`/usr/bin/time -p`, 10:56:09 to 10:56:52 CEST, 5 files in `runs/` of the main checkout:

| | `real` |
|---|---|
| `step --dry --for event` | 5.31 s |
| `step --dry --for clock` | 37.48 s |

A dry step makes no pull, so a whole step that is not dry is longer than 37 s by its two pulls. One run each.

## Tests

`cd $W && bun test --timeout=30000 ./tests/tools/loop-run.test.ts ./tests/tools/lock.test.ts ./tests/tools/loop-step.test.ts`,
after the rebase (11:05 CEST): **77 pass, 0 fail**.

The whole suite, `env -u WORK -u SESSION $W/tests/tools/suite.sh`, after the rebase and the last change to a
program or a test (11:04 CEST): **1206 pass, 0 fail**, 123 files. Before the rebase it was 1184 pass, 0 fail, 121 files.

Without `env -u WORK -u SESSION` the suite before the rebase was 1181 pass and 3 fail (10:50 CEST): `agent.sh` tests
of `reviewer-brief-names-token`, `reviewer-brief-kept-copy` and `reviewer-in-a-view`. They start
`agent.sh` with the caller's environment, and this writer was started by `loop.ts start`, which sets
`WORK` and `SESSION`: `agent.sh` then takes the test's reviewer for a run in a worktree. The three files
alone under `env -u WORK -u SESSION`: 20 pass, 0 fail. Filed as `seen-st5-work-env`.

**Without the change.** `loop.ts` and `lock.sh` as `git show HEAD:` has them, put in place for the run
and the new files put back after, the three test files as they are now:

- `loop-run.test.ts`: `SyntaxError: Export named 'drive' not found in module … loop.ts`, 0 pass, 1 error.
- `lock.test.ts` and `loop-step.test.ts` together, before the rebase: 53 pass, 4 fail. The four are the two new tests (the
  name `loop`; `step --for event`) and the two whose expectation has the new usage line.

## The rebase

`worktree.sh --rebase` stopped on `lock.sh`: `undeployed-seeds-not-shown-to-owner` had added a line to its
usage and a paragraph to its header. Both are kept, the usage is one line longer for each change
(`sed -n '2,19p'`), and the suite above was run after it. The take, show, renew and release of `loop` on
cb4 under "On cb4" were made with the `lock.sh` of before the rebase.

## Not tried

- `loop.ts run` with no `--dry`, anywhere but against stand-ins: the token, the take, a renew by the
  driver, a move followed by a step, the 40 hours, the stop with a run still open.
- `loop.sh` with the real `safehouse`: whether the sandbox lets the driver run `git pull`, `pgrep`, `ps`
  and the agents it starts. The sessions run those in it; the driver was not seen to.
- A laptop that sleeps. `metadev` runs `caffeinate`; `loop.sh` does not (the spec gives it `safehouse`
  and the driver and nothing else). A driver that sleeps more than 600 s has lost `loop`, and at its next
  renew it either renews after the end (`lock.sh`: "renewed after it had ended") or is refused and
  exits 1 when another took it. Not seen.
- A second signal while a step runs. The driver waits for the step it began; from a terminal the step
  gets the Ctrl-C too. With `kill -TERM` of the driver alone the step runs to its end first. Seen
  only with the stand-in step, which returns at once.
- A whole step longer than 600 s with cb4 not answering the renews: the lock would end under it.
- `sync` with more than one page (500 events between two reads): the pages are read, 20 at most. The
  stand-in `issue-as.sh` of the test answers one empty page.
- The "off" of the Fly spec (a step with no act and no running run ends the driver): it is `st-7`'s
  amendment and `fly-4`'s to build.
