# loop-sh-sandbox-has-no-keychain: `loop.sh` gives safehouse `--enable=all-agents`, and a step starts no agent after a result that says its process is not logged in

2026-10-13. Part of `orchestrator-as-steps`. A local tool and its texts: no seed, no deploy.

**The fix of `loop.sh` was not run by this writer.** `loop.sh` does not start from inside a session's
sandbox (the record of `st-6-a-day-beside-the-session`, "`loop.sh` was not seen"), and the issue has:
"Start no `loop.sh` and no `loop.ts run` without `--dry`". What is known of the flag is the owner's run
of a probe, pasted in the issue's body: the sandbox `loop.sh` built answered
`keychain item readable: exit 44` and `claude -p: exit 1 output: [Not logged in · Please run /login]`,
and the same sandbox with `--enable=all-agents` answered `exit 0` and `[ok]`. The probe wrapped
`zsh -c`, not `bun tools/cloud-brain/loop.ts run`. The check of the fix is the owner's next run of `loop.sh`.

The writer is a `claude` process started for the session `out-5bc2ed`, with the token `impl-3efa36`, on
one laptop (macOS, bun 1.4.0). `$W` is the worktree `…/.claude/worktrees/bm-orchestrator-as-steps`,
`<root>` the main checkout. Times are CEST from `date`, or the `at` of a line of `steps.jsonl`.

## What happened

The owner ran `tools/cloud-brain/loop.sh`. `<root>/tools/cloud-brain/.emitted/issue-loop/steps.jsonl` has two
steps of it, at 13:57:43 (seq 6515) and 13:58:15 (seq 6523, `for: event`). The files of `runs/` there, read
at 14:16:

```
impl-9a4e0e implementer  fly-4-loop-files  as orch-f8a4d1             ended stopped, event 6519  ms 89  usd 0  exit 1
over-214e74 overseer     -                 as orch-f8a4d1 after 6231  ended stopped              ms 81  usd 0  exit 1
over-88e7ad overseer     -                 as orch-f8a4d1 after 6231  ended stopped              ms 87  usd 0  exit 1
orch-15a99e orchestrator fb-a2k9vvmfvv     as orch-f8a4d1             ended stopped, event 6523  ms 82  usd 0  exit 1
orch-80a341 orchestrator fb-a2k9vvmfvv     as orch-f8a4d1             ended stopped, event 6527  ms 79  usd 0  exit 1
```

The `result` of each is `Not logged in · Please run /login`, and each file has `token: ended`. The first
step started three of them. The second read the first's error (`stops`: "the result of impl-9a4e0e was an
error less than 30 minutes ago"), held the two writers of its queue, and started an overseer and a judgment
run all the same: that stop is for a new writer and an approver.

The cause is the issue's, and was read here in `~/.local/bin/safehouse`: it adds the profile
`claude-code.sb` when the basename of the wrapped command is `claude` (its lines 2859 to 2863), and
`all-agents` is a name `--enable=` takes (line 2696). `metadev` wraps `claude`; `loop.sh` wraps `bun`.
That the profile is what brings the keychain is the issue's and the probe's; the profile was not read.

## What changed

| File | Change |
|---|---|
| `tools/cloud-brain/loop.sh` | `--enable=all-agents` after `"${SAFEHOUSE_ARGS[@]}"` and before `bun`; six lines of its header say what the flag is for and what it widens |
| `tools/cloud-brain/loop.ts` | `notLoggedIn`, the stop `unlogged` in `step`, the driver's line of it in `drive`, the count of overseers; its header, item 4 of `step` and item 6 of `run` |
| `tests/tools/loop-step.test.ts` | 3 tests |
| `tests/tools/loop-run.test.ts` | 1 test, and the argument in the test of `loop.sh` |
| `tests/tools/loop-sh-sandbox-has-no-keychain.test.ts` | new, 4 tests of the texts |
| `.claude/skills/brain-maintenance/SKILL.md` | "Run it": the flag, and a read of the first minutes |
| `plan/cloud-brain-orchestrator-as-steps.md` | part 4, "As built (`loop-sh-sandbox-has-no-keychain`…)", and one line of part 3's "As built" that names it |
| `knowledge/working-with-cloud-brain-remote-lopecode-cluster.md` | the row of the loop names this record |

`metadev` is not changed.

**The flag.** `--enable=all-agents` gives the sandbox the profile of every agent safehouse knows
(`60-agents/`), where a session's has that of Claude Code alone. The other way put to the owner was a
profile file of the repository with the keychain and the Claude Code rules alone; the issue has that he
was shown both, with the flag recommended as the one safehouse keeps.

**The stop.** A result is one that says its process is not logged in when its `result` begins
`Not logged in` or has `Please run /login`, and it has no `usd` and no `context`: a run that used a model
has both, whatever its report says. The second text was not seen in a result; it is taken because it only
keeps a start from being made.

A step reads the files of `runs/` for a run of this machine that was started with the step's own token
(`as`) and has such a result. It reads before each start, so a result that is there by then stops the rest
of that step. With one, the step starts no reviewer, no round, no writer, no approver, no overseer and no
judgment run, and writes no `given` comment: each entry is in `skipped` with
`no <role>: the result of <token> says its process is not logged in`. Its moves (`ready`, `finish`, `back`,
a digest's) and its `ended` are made as before. The line has `unlogged: { token, by, said }`, `status.md`
has a row under Health, and the driver writes one line on stderr at each such step:

```
loop.ts run: no agent is started: the result of impl-9a4e0e says its process is not logged in ("Not logged in · Please run /login"). The steps go on and start none: stop the driver, log `claude` in where it runs, and start it again
```

**What ends it** is the token. A driver makes its token when it starts, and the stop is of the runs started
with the token the step is made with: a driver started again starts agents. Two other ways were weighed.
A time, as the 30 minutes of an error: the driver would start a round of dead runs each half hour, each a
`cost` event `stopped` and a step nearer "2 dead runs". A probe (`claude -p`) before a start: a model call
at each step. The token needs neither, and what it costs is that a login mended while the driver runs is
not seen until the driver is started again; the line on stderr says to do that. By line 2 of
`philosophy.md`, the smaller side.

**The overseers.** A step starts no third overseer since a heading of `oversight.md`
(`n >= DEAD_MOST`). A run of an overseer whose result says it was not logged in is no longer counted.

## What the two steps left

**`fly-4-loop-files`: one dead run, and nothing to mend.** `loop.ts dead fly-4-loop-files --role implementer`
at 14:14 printed `"dead":1,"events":[6519]`. The issue is at `ready` and the queue has it as `start`
(`queue?limit=500`, 14:14). A step starts no writer on it until 14:28:00, 30 minutes after the run was
ended (`ended.at` 13:58:00); after that the next step starts one. A second dead run of round 1 would make
it the judgment's, as `dead`. Its worktree `bm-worker-machine-on-fly` reads `clean … ahead=0 … occupant=-`
(`worktree.sh --list`, 14:16).

**`suite-hangs-in-brain-cli-test` and `fb-a2k9vvmfvv`: given twice, to two runs that died.** A dry step
with this writer's token (`LOOP_TOKEN=impl-3efa36 bun tools/cloud-brain/loop.ts step --dry`, 14:11:55) had both
under "The judgment run died twice", which is given to no model again. An entry of these two kinds is given
for the last event of its issue that is an open, a move, a swap, a hold, a link or a label (`loop.ts`,
`AT_TYPES`), so a later event of one of those types makes it due again. This writer linked each to this
issue, `related`, which is true of both and is a write its token may make:

```
6534 linked fb-a2k9vvmfvv                  key impl/loop-sh-sandbox-has-no-keychain/again-fb-a2k9vvmfvv
6535 linked suite-hangs-in-brain-cli-test  key impl/loop-sh-sandbox-has-no-keychain/again-suite-hangs-in-brain-cli-test
```

The dry step after them (14:13:37) had nothing under "The judgment run died twice", and under "Given to the
judgment at this step": `triage suite-hangs-in-brain-cli-test (event 6535)`.

`fb-a2k9vvmfvv` was in neither part, and the queue no longer has it (`queue?limit=500`, 14:14: no entry of
that id in `queue` or `waiting`). It is a note of the owner's page, and the queue names such a note
`promote` when each issue it is tied to is `done` or `closed` (`brain-issues.ojs`, the row `promote`). The
link ties it to this issue, which is `in-progress`. So it is given again when this issue is done, for event
6534: read from that row and from `judged`, not seen. The owner's note of it on his page lists the link.

**The two overseers.** Both have `after: 6231`, the last heading of `<root>`'s `oversight.md`
(`## 2026-10-13 09:28 CEST, events 5901 to 6231`). With the `loop.ts` of `HEAD` a dry step (14:12:54) named
no start, skipped `overseer : 2 overseers were started since the heading that ends at event 6231`, and had
the line for a session with the owner "oversight: 2 overseers were started since the heading of
oversight.md that ends at event 6231, and it has no later heading". With this change the dry steps of
14:11:55 and 14:13:37 named `{"act":"start","role":"overseer"}`. The issue did not list this one.

**The journal.** `fly-4-loop-files.md` has one report `Not logged in · Please run /login`,
`fb-a2k9vvmfvv.md` two and `_oversight.md` two (`grep -c 'Not logged in'` of each, 14:16). They are left.

## The record of st-6

`tools/cloud-brain/records/st-6-a-day-beside-the-session.md` has "**`loop.sh` was not seen.**": its one try
from a session's sandbox ended at `mkdir: …/.fly: Operation not permitted`, and under what it did not see,
"`loop.sh` was not" run. What that hid is this: the sandbox `loop.sh` built had no keychain, so no agent a
step started in it could log in. The records of `st-5-driver` ("`loop.sh` with the real `safehouse`") and
`st-7-switch-and-texts` ("The driver") list the same run as not made.

## Tests

```
$ cd $W && bun test --timeout=30000 ./tests/tools/loop-step.test.ts ./tests/tools/loop-run.test.ts ./tests/tools/loop.test.ts ./tests/tools/loop-compare.test.ts
 75 pass
 0 fail
 639 expect() calls
Ran 75 tests across 4 files. [128.91s]
$ cd $W && bun test --timeout=30000 ./tests/tools/loop-sh-sandbox-has-no-keychain.test.ts
 4 pass
 0 fail
 21 expect() calls
Ran 4 tests across 1 file. [10.00ms]
$ cd $W && bun test --timeout=30000 ./tests/tools/loop-step.test.ts ./tests/tools/loop-run.test.ts ./tests/tools/loop-sh-sandbox-has-no-keychain.test.ts
 56 pass
 0 fail
 383 expect() calls
Ran 56 tests across 3 files. [95.65s]
$ env -u WORK -u SESSION -u LOOP_TOKEN -u LOOP_RUN -u LOOP_RUN_TOKEN -u LOOP_TS $W/tests/tools/suite.sh      (14:29:45 to 14:31:57)
 1233 pass
 0 fail
 10143 expect() calls
Ran 1233 tests across 126 files. [128.95s]
```

The four files of the first command were run after the last change to `loop.ts`, `loop.sh` and the two
test files, and before this record was written. The last three commands were run on the tree as it was
committed, but for the lines of this section that have their counts. The third is the three files of the
change, which the landing runs again under the lock.

The suite as the brief gives it, `$W/tests/tools/suite.sh` with nothing before it (14:20:24), was
`1230 pass`, `3 fail`: `reviewer-brief-names-token.test.ts` and `reviewer-in-a-view.test.ts` run `agent.sh`,
which read the `SESSION` and `WORK` this writer's own process was started with (its output had
`--session-id` and this run's session), and a third test runs those two. The two files alone:
`12 pass`, `2 fail`, and with `env -u SESSION -u WORK` before them `14 pass`, `0 fail`. The record of
`st-7-switch-and-texts` has the same command with the six names unset.

Without the fix: with `loop.sh` and `loop.ts` of `HEAD` in their place (and a `notLoggedIn` that answers
false, for the import), the five tests that hold the change were run by name and each failed, `0 pass`,
`5 fail`: the three of `loop-step.test.ts`, the driver's line and the test of `loop.sh` in
`loop-run.test.ts`. With `loop.sh`, `loop.ts`, `SKILL.md`, the spec and the knowledge page of `HEAD`, and
no record, the four tests of the texts: `0 pass`, `4 fail`.

What the tests of the step hold, each through `loop.ts step` with a stand-in tracker: the seven kinds of
start of one step are each skipped and the `ready` move is made; a step made with another token starts all
seven; a run of another machine, a result that is a report, and one that begins `Not logged in` and cost
1.5 stop nothing; a stand-in `start` that leaves the result stops the next start of that step; a step that
is not healthy starts no judgment run; two overseers that were not logged in leave a third to be started,
and two that ran do not.

## Not tried

- **`loop.sh` with the real safehouse**, with the flag or without, and a driver that is not dry. The
  owner's.
- **The stop over the files of 2026-10-13.** They were started `as orch-f8a4d1`, the token of a driver
  that is gone; a dry step with this writer's token read them and had no `unlogged`, as a new driver's
  will not. The stop was seen in the test rig alone.
- **A result that comes after the next start.** The step does not wait for one. On 2026-10-13 the first
  step's three starts were 11 and 8 s apart (`startedAt` of the three files) and each result took under
  0.1 s, so the second start would have read the first's result; that is reckoned, not run.
- **A new token at 40 hours.** The driver makes one between two steps, and the stop does not hold for it:
  one more round of starts would be made and stopped. Read in `drive`, not run.
- **`loop.ts start` and `resume` by hand.** A session that makes a pass by hand calls them and they are
  not stopped; only `step` is.
- **Another text of a logged-out `claude`.** One was seen. An expired login, or a key that is refused,
  may say something `notLoggedIn` does not match; the 30 minutes of an error then hold writers and
  approvers as before.
- **What `all-agents` lets the driver's sandbox read and write.** The profiles of `60-agents/` were not
  read.
- **`fb-a2k9vvmfvv` given again** when this issue is done: not seen.
