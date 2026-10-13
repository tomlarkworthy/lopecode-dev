# st-2-loop-start-and-end: `loop.ts start`, `ended`, `resume` and `dead`

2026-10-13. Task 2 of `plan/cloud-brain-orchestrator-as-steps.md`, its design part 2. A local tool,
`tools/cloud-brain/loop.ts`, its tests, and a note "As built" in the spec. No seed, no deploy.
Nothing of the issue loop calls the tool yet: `SKILL.md` steps 4 and 5 are as they were, and the
spec changes them in `st-7`. No model was started by it: every run below had a stand-in for
`agent.sh`.

Every run below was made on one laptop (macOS, bun 1.4.0) from Bash calls of the writer, which is an
`Agent` of a `claude` session in its sandbox. `$W` is the worktree `…/.claude/worktrees/bm-st-2-loop-start`.

## What changed

| File | Change |
|---|---|
| `tools/cloud-brain/loop.ts` | new: the four commands, and the functions they read the record with |
| `tests/tools/loop.test.ts` | new: 14 tests |
| `plan/cloud-brain-orchestrator-as-steps.md` | part 2, "As built", after the four items of `start` |

The header of `loop.ts` is the reference for each command, with the order of what `start` does and
each exit.

## The check on cb4

The spec's R4 rows for this task, on the issue `test-st-2-a`, which the writer opened (event 5906)
and closed (5931). `LOOP_TOKEN` was the writer's own token, `impl-357b9d`. The two tokens given to
`--token`, `impl-5231ca` and `impl-397944`, were made by the orchestrating session on the writer's
ask (comment 5908, answered by 5910 in 33 s by the events' `at`). The stand-in for `agent.sh`
(`LOOP_AGENT`) waits while a file is there, prints no line and exits 2. `worktree.sh` was the real
one: `start` made the worktree `bm-test-st-2-a`, and the writer removed it after the check. Run
between 06:54:55 and 06:55:33 CEST (`date` before and after).

`issue-as.sh impl-357b9d "runs?id=test-st-2-a"`, the keys `role`, `round`, `outcome`, `token`,
`session` and `seq` of its one run, at four moments, and `loop.ts dead test-st-2-a --role implementer`:

```
after start --token impl-5231ca   implementer 1 running impl-5231ca 1d5f7ca3-…  seq 5915
after its agent returned          implementer 1 stopped impl-5231ca 1d5f7ca3-…  seq 5917   dead 1
after start --token impl-397944   implementer 1 running impl-397944 359f931e-…  seq 5921   dead 1
after its agent returned          implementer 1 stopped impl-397944 359f931e-…  seq 5922   dead 2
```

The events of the issue, from `get?id=test-st-2-a` (seq, type, key, outcome, `replaced`), each by
`secret:impl-357b9d`:

```
5914 commented orch/test-st-2-a/worktree-1
5915 cost      cost/test-st-2-a/implementer/1/impl-5231ca      running
5917 cost      cost/test-st-2-a/implementer/1/impl-5231ca/end  stopped  replaced=5915
5920 commented orch/test-st-2-a/worktree-2
5921 cost      cost/test-st-2-a/implementer/1/impl-397944      running  replaced=5917
5922 cost      cost/test-st-2-a/implementer/1/impl-397944/end  stopped  replaced=5921
```

`issue-as.sh impl-357b9d "verify?guards=true"` after them: `{"ok":true,"seq":5923,…,"checked":5923,"guards":true}`.

Seen in the same run: `ended impl-5231ca` while the stand-in waited was exit 3 with
`impl-5231ca still runs: Mac:48875` and wrote nothing; `ended impl-397944` a second time printed
`{"already":"impl-397944",…,"token":"given, not ended"}`; the stand-in's log has `WORK` as the
worktree's path and `SESSION` as the session of each run's event; the journal
`.emitted/issue-loop/test-st-2-a.md` got one heading a run, each with
`(no report: the process gave no result line, exit 2)`. Both tokens still answered a read of the issue after the check
(`issue-as.sh <each> "get?id=test-st-2-a"`, exit 0): `ended` ran no `agent-token`. The writer asked the orchestrating session to end them (comment 5933).

The spec's row reads "after `ended`, one run, another outcome". The outcome on cb4 was `stopped`
both times. `no-submit`, `in-review`, `pass` and `changes` were seen in the tests alone.

## What differs from the spec

Each is in the spec's part 2 now, under "As built".

- **`ps` does not run in a session's sandbox.** `ps -o lstart= -p $$` in the writer's Bash:
  `operation not permitted: ps`, exit 127 (`/bin/ps` is setuid root). The spec has the time a
  process began as the test that a pid is still the run's. `began` is `""` in both files of the
  check. What stands in its place: the wrapper is started as `bash -c … loop-run-<token> …`, and a
  run lives when `pgrep -f 'loop-run-<token>( |$)'` prints the file's pid. The time is compared too
  when the file has one and `ps` gives one; that branch ran in no run of the writer's, since `ps`
  ran in none. `pgrep` ran in the sandbox.
- **The caller's token** is `LOOP_TOKEN=<name>`. The spec says whose token writes and not how it
  is named.
- **`ended` keeps a writer's token at `changes` and `no-submit`** as well as `in-review`. `resume`
  sends the next round to that token, and a token that was ended makes the round "A dead writer":
  a `back` and a new writer that reads everything again. The other reading, `in-review` alone, is
  the letter of `SKILL.md`, "A token for each agent". A kept token ends at its 48 hours.
- **A live token** in `resume` is one whose read of the issue answers 200, as `worktree.sh` tests
  an occupant. The spec has `agent-token list`.
- **`hostname -s` answered `Mac`** in the writer's Bash; the orchestrating session's comment 5871
  has `"machine": "MacBook-Pro-3"` for the same laptop. `agent` of a run is `<host>:<pid>` and
  `resume` compares the host, so a driver started where the name differs takes this machine's runs
  for another's. `LOOP_HOST` sets it. Not looked into further.

## The tests

`cd $W && bun test --timeout=30000 ./tests/tools/loop.test.ts`: 14 pass, 0 fail, 216 expect() calls,
after the last change to either file. `tests/tools/suite.sh`, run 06:57:06 to 06:59:04 CEST after
the last change to the tool and its test: 1084 pass, 0 fail, 109 files.

The tracker in the tests is a stand-in served by the test file and called through the real
`issue-as.sh`; `agent.sh`, `worktree.sh`, `brain.ts`, `agent-usage.ts` and `review-needs-tab.sh` are
stand-ins that log what they were given.

Two changes to the tool that the tests fail on, each tried and taken back:

```
the key without the token (cost/<id>/<role>/<round>)        6 of 14 fail
start waits for the wrapper (no detach)                     "start returns before the agent does" fails at its 30 s
```

The spec's rows for this task and the test that holds each:

| Row | Test |
|---|---|
| R3: `start` returns before the stand-in does, and `ended` is run when it has | "start returns before the agent does…" |
| R4, in `loop.test.ts`: the two keys differ, and two resumes of one token in one round have two keys | "the round, the keys, the dead runs…", and "resume sends --resume…" |
| R5: `resume` sends `--resume` with the `session` of the last run | "resume sends --resume…" |

## Not built, not tried

- No run with a model. A writer, a reviewer, an approver and an overseer were each started with
  the stand-in alone, and what a real `agent.sh` prints was not read by `ended`.
- `agent-usage.ts` was a stand-in in every test, and was not called on cb4 (a run with no result
  asks for no usage). Whether it finds the transcript of a `WORK` process by `--session` alone was
  not tried here.
- `start` does not refuse an issue that has a `running` run of the role. The spec puts that
  condition in the step (`st-3`). Two `start` calls for one issue start two agents.
- `resume` on cb4, and `resume` of a spec writer or a digest writer that is sent a round: the
  tests have a writer of a task sent one, and a spec writer's `back`.
- A `running` event of this host with no file of `runs/`: `resume` exits 1 there. The step's row
  for a dead run is `st-3`.
- A `start` that died between the file and the event; the count of an overseer's files since a
  heading of `oversight.md`; a `running` run of another host named after 4 hours. Each is the
  step's.
- Two `ended` of one token at the same moment. The journal's line is held by a file made with
  `wx`; the two `cost` calls have one key. Not run.
- The key's length: `start` refuses an id whose longest key would pass 100 characters, the
  service's limit. The longest id of the record was 40 that day (`list?limit=500`, 472 issues),
  and a test holds that the longest key of such an id is within the limit. The refusal ran in no test.
- A reviewer whose report begins `needed a tab` is started with `TAB=1` the next time, from the
  file of the run before. Its first run is then `stopped` and counts as a dead run.
- Linux: `pgrep -f` and `ps -o lstart=` were run on macOS alone.

## What misled the writer

- The spec's `ps -o lstart=` was written from a shell where it ran. The first run of the tests
  here failed on it.
- A wait written as an `until … sleep 30` loop in a background Bash call ended after one read with
  no word; the `Monitor` tool held the same loop.
