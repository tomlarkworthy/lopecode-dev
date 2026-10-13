# tr-4-held-read: `issue.wakes` holds a call until a wait is due

Task 4 of `plan/cloud-brain-tracker-trigger-rules.md`, part 4. Written 2026-10-13 by the writer `impl-404fc5`.
The plan left one thing open, "whether a call held 25 s passes the kernel and the core of cb4", and let the
task end without the held read if it did not. It passes:

```
08:40:02 CEST  ia "wakes?id=test-tr-4-a&seconds=25", a wait that is not due   -> 200, due: [], real 25.73 s
08:40:39 CEST  the same call, and from a second shell 5 s in a move that makes the wait due
               move's `at` 1791873639462, answer's `now` 1791873640406       -> 200, due: [the wait], real 6.34 s
```

So the answer was made 944 ms after the move, inside one pause of 2 s, and the tool now sends `seconds`.
Both are single runs, through `issue-as.sh` (`curl -m 30`), on the issue `test-tr-4-a`, which this task
opened for the probe and closed after it (five events of this token, the first 6071 and the last 6078).

## What changed

| File | Change |
|---|---|
| `tools/cloud-brain/brain-issues.ojs` | `issue.wakes` takes `seconds`. A cell `issueHeld(seconds)` gives the pauses of a call; `issuesLimits` gains `wakeSeconds: 25` and `wakeMs: 2000`; the row of the method and "A wait" in the reference say it; one test cell, `test_issues_wakes_with_seconds_is_held_until_a_wait_is_due`; four lines more in the test of the reference. |
| `tools/cloud-brain/issue-wait.sh` | A read is `wakes?id=<id>&seconds=<n>`, `n` 25 or what is left of the run. `ISSUE_WAIT_HOLD` names another number, 0 for none. |
| `tests/tools/issue-wait.test.ts` | Four tests of the held read. The 18 from before run with `ISSUE_WAIT_HOLD=0`. |
| `agents/implementer/submit-and-wait.md`, `agents/spec.md` | The line that said the tool reads "every 15 s". |
| `plan/cloud-brain-tracker-trigger-rules.md` | An "As built" note under part 4. |

Deployed: `brain-x-issues@42cf7073333b`, applied 2026-10-13 at 08:38 CEST under both locks, state `verified`,
68 tests run by the deployer.

## The method

With no `seconds` the call is as it was. With `seconds`, the service reads the issue as before; when the
caller has a wait there that is not due, it pauses, reads the head of the record (`S.head`, one row), reads
the issue again when the head's seq is not the one it read at, and sorts the waits again. It answers at the
first due entry, when the caller has no live wait left on the issue, or when the pauses are used up.

The pauses are counted, not timed: `issueHeld("25")` is twelve of 2000 ms and one of 1000 ms, so a call
makes 13 reads of the head at most after its first read, and one read of the issue more for each of them
that found the head moved. No deadline is read from the clock.

Four choices the plan did not make, each the smaller side (`philosophy.md`, line 2):

- **A call with no wait to wait for is not held.** A caller with no live wait on the issue, or with one that
  is due, is answered at once. Otherwise any token could hold 25 s of a Worker with nothing to learn.
- **`seconds` over 25, or not a number in digits, is 400**, `seconds: a number from 0 to 25, in digits`. The
  other way is to read a larger one as 25, as `limit` is read. A caller that asks for 60 and is answered in
  25 with nothing due cannot tell a cut from an answer; the 400 names the limit.
- **`seconds` with no `id` is 400.** With no `id` the service reads every row of the view, and a held call
  would read them again at each move of the head, up to 13 times. `issue-watch.sh` reads `wakes` with no
  `id` and is not changed.
- **No setting.** The 25 and the 2000 are `issuesLimits`, as the plan has it.

## The tool

`issue-wait.sh` kept its loop. A read is sent with `seconds`, the smaller of 25 and what is left of the
run. The next read begins 15 s or more after the one before began, so a read that was held 25 s is followed
at once, and a tracker that answers at once is read every 15 s as before. After a held read that gave no
answer that was read (no status, a 502), the reads of that run are sent with no `seconds` and stderr says
so once; the next run holds again. That is the plan's "when a held call is cut", taken by the tool for one
run and not by a landing.

One run against cb4 after the change, 08:43:31 to 08:44:02 CEST, on the closed issue `test-tr-4-a`:
`issue-wait.sh impl-404fc5 test-tr-4-a 6078 --when 'issue.state == "open"' 30 --last` was exit 3 after
30.93 s with nothing on stderr, and the record has its wait (event 6085) and its remove (6086). How many
reads it made was not seen: nothing prints them.

## Tests

Each line is a command run in the worktree, the last five after the rebase that brought in `cloudflare-iac.ojs`.

| Command | Result |
|---|---|
| `bun test.ts brain-x-issues --with <the build's module>` in `cloud-brain-dev`, with `for (const ms of [])` in the place of `for (const ms of pauses)` | 50 passed, 1 failed: the new cell, `2` reads expected and `1` made |
| `verify-run.ts brain-x-issues --shell <build> --times 20`, before the rebase | 20 passed of 20 runs, `byChance: []`, `from: ["document"]`, 68 tests each |
| `bun test.ts brain-x-issues --with <the build's module>` | 51 passed, 0 failed, 17 need a browser |
| `bun tools/cloud-brain/tab-tests.ts <build> @tomlarkworthy/brain-issues --emit …` | 68 tests, 68 passed |
| `bun test.ts brain-x-issues` after `sync.ts`, what cb4 runs | `42cf7073333b`: 51 passed, 0 failed, 17 need a browser |
| `bun test --timeout=30000 ./tests/tools/issue-wait.test.ts` | 22 pass, 0 fail |
| the same with `ISSUE_WAIT_SH=` the tool of `origin/main` | 18 pass, 4 fail: the four new tests |

The count of the whole suite, `tests/tools/suite.sh`, is in the comment of the submit: it is run after this file's last edit.

The seed's test holds each call 0.05 s, one pause. What another caller does in the pause is a hook of the
fake database, run ahead of the service's read of the head, so the test measures no time. It asserts the
count of reads of the head a call made: 2 with nothing written, 3 with a comment, with the reviewer's
rework (the due entry, equal to the one a call after the move gets), and with the wait taken off; 1 for a
call that is not held; 0 for one refused.

On cb4, beside the probe: `seconds=26` answered 400 `seconds: a number from 0 to 25, in digits`,
`wakes?seconds=5` answered 400 `seconds: a call is held with an id, for the waits of one issue`, and
`ia "verify?guards=true"` answered `ok: true`, 6086 checked, after the probe's events.

## Not tried, not known

- **A call of more than one pause in the rig.** A second pause is 2 s of a test, and the page runs the
  cells at each opening. The loop over 13 pauses ran on cb4 in the probe, where its count was not seen:
  only that the call took 25.73 s.
- **More than one held call at a time.** Four writers that wait are four calls held at once, each with a
  read of the head every 2 s. Not run.
- **What a held call costs.** A run of the tool for 240 s made 16 reads of `wakes` at one every 15 s. Held, it
  is about ten calls, and up to 13 reads of the head in each. By arithmetic, not measured; `usage.account`
  was not read before and after.
- **The time of a call in the logs.** The core's line of a held call has its 25 s. Whether a panel or a
  metric of the dashboard reads the time of `issue.wakes` was not looked at.
- **A cut.** No held call was cut in this task, so the tool's line for one was seen only against the
  stand-in, which answered 502. A call that `curl -m 30` stops gives no status; that branch is the same
  line of the tool and was not run.
- **A value sent twice.** `wakes?id=…&seconds=5&seconds=6` is read as one of the two by the router; the
  rig answered it 200.
- **The wake the plan measures.** How long a writer's wake takes with the held read is task 5's line of
  `issue-stats.ts`. The first round a writer takes with it is this task's own review, after this file.
