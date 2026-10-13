# loop-started-run-is-told-no-scratchpad: `loop.ts start` makes a directory for the run and names it in the prompt, and `ended` removes it

2026-10-13. A local tool, its tests and two lines of the briefs: no seed, no deploy.

**No run was started with the changed `loop.ts`.** What is known is from `tests/tools/loop.test.ts` and
`loop-step.test.ts`, where `agent.sh`, `worktree.sh`, `brain.ts` and the tracker are stand-ins. The first
run a step of the driver starts after this landing is the first to have the line in its prompt.

The writer is a `claude` process `loop.ts start` began, token `impl-000b4c`, on one laptop (macOS, bun
1.4.0). `$W` is the worktree `…/.claude/worktrees/bm-loop-started-run-is-told-no-scratchpad`, `<root>`
the main checkout. Times are CEST from `date`.

## What was seen

The issue's body has the reports of four writers `loop.ts start` began, each of which wrote the files of
`land.sh` or a scratch script in `/tmp`, `/tmp/claude` or `$TMPDIR`. This run was the same: its prompt was
four lines (the worktree, the brief, the issue, the token), and `agents/implementer.md` sends the reason and
the comment of a landing to `<scratchpad>`. The cause is the issue's and was read here: `cloud-brain-dev/agent.sh`
makes a directory with `mktemp -d` and a prompt line `scratch: $SCRATCH` for a run with no `WORK`, and for
`WORK=DIR` passes the prompt as given; `loop.ts` gave every writer `WORK` and no directory.

## What changed

| File | Change |
|---|---|
| `tools/cloud-brain/loop.ts` | `scratch(run)`: makes `runs/<token>.scratch` beside the run's file, writes the path in the file as `scratch`, and gives the prompt line. `start` puts the line fourth in the prompt of a writer, an overseer and a judgment run; `resume` makes the directory again and adds the line as the fourth of its message; `ended` removes the directory the file names. The header: items 2 and 3 of `start`, `ended`, `resume` |
| `tests/tools/loop.test.ts` | 2 tests added; 4 that pin the prompt have the line |
| `tests/tools/loop-step.test.ts` | the test that pins a judgment run's prompt has the line |
| `.claude/skills/brain-maintenance/agents/orchestrator.md` | "Your prompt, and your token": five lines, and what `<dir>` is |
| `.claude/skills/brain-maintenance/agents/implementer.md` | "Where you work": the scratchpad is the prompt's `scratch:` line, else the session's |
| `plan/cloud-brain-orchestrator-as-steps.md` | three notes, where part 2 and part 3 say the prompt is four lines and the message three |

The triage (event 6579) has "the briefs are the overseer's", and of the sentence of `implementer.md`, that it
"is then the overseer's to change". The two brief lines were changed here all the same: step 11 of
`agents/implementer.md` has a line the change made untrue mended in its landing, and `orchestrator.md` would
tell the next judgment run its prompt has four lines. `implementer.md` is 19,961 characters before and after
(`wc -m`), of the 20,000 its test allows.

The prompt of a writer since this change, as the test reads it from the stand-in's log:

```
Working directory: <W>.
Read <W>/.claude/skills/brain-maintenance/agents/implementer.md and follow it.
Issue: task-a
scratch: <state>/issue-loop/runs/impl-000001.scratch
Your token is impl-000001.
```

**The line is before the token's.** `agents/implementer.md` and its page `start.md` say the token is in the
last line of the prompt; the line of unlanded work was already after it and is now the sixth.

**Where the directory is.** Under `.emitted/issue-loop/runs/`, named by the token. The triage (event 6579)
decided the side: `loop.ts` makes the directory, as against a place under the worktree that git ignores and
the briefs name. Within that side the other place was a `mktemp -d` under `$TMPDIR`, as `agent.sh` does. A
path that the token gives is the same path when the round is sent back, so a resumed session finds the
directory it knew made again, and it stands beside the run's other files (`<token>.json`, `.log`,
`.result.json`), which `ended` and a reader already know. At 15:21 this run made a directory
`impl-000b4c.probe` there, wrote a file in it and removed it. Whether the driver's sandbox (`loop.sh`) was
what this run ran in was not read.

**`ended` removes what the file names, not what the token gives.** A run file written before this change
has no `scratch`, and nothing is removed for it. A second `ended` returns at `already` and removes nothing.
The directory goes at every outcome, a writer's `in-review` among them: the files of a submit are sent
before the process returns, and a round sent back gets an empty directory at the same path.

## What was left as it is

- **An approver's prompt.** `agents/approver.md` opens "Your prompt has three lines", and its step 9 sends
  the verdict's body to "a file of the scratchpad". An approver `start` began is told none, as before.
  The brief is changed by an issue labeled `major` (`rules.md`, first paragraph and "The approver"), and
  the policy in force names the brief by its blob (`approver.ts`, R7), so a fourth line was not added here.
  It is said on the issue for the overseer.
- **A reviewer.** Its run has no `WORK`, so `agent.sh` makes its directory and its `scratch:` line. Not changed.
- **A run a session spawns with the `Agent` tool** (`SKILL.md`, step 4): the four lines, and the session's
  scratchpad.
- **`spec.md` line 143 and the page `tracker-calls.md` lines 18 to 20**: each says the scratchpad is the
  session's. Said on the issue. The page `resumed-round.md` has no word of the message's lines or of a
  scratchpad (`grep -n -i 'three lines\|scratch'` of it printed nothing).

## Tests

The two files were run after the last edit of `loop.ts` and of the tests, and before the rebase; no `date` was
read at them. The suite ended at 15:25, after the rebase on `origin/main`, with nothing edited since but this
file and three notes of the plan.

```
bun test --timeout=30000 ./tests/tools/loop.test.ts        20 pass, 0 fail
bun test --timeout=30000 ./tests/tools/loop-step.test.ts   33 pass, 0 fail
tests/tools/suite.sh                                       1237 pass, 0 fail, 127 files
```

The two new tests were run before `loop.ts` was changed: `0 pass, 2 fail`
(`bun test --timeout=30000 ./tests/tools/loop.test.ts -t "directory"`).

**Before the rebase the suite had 3 fails in this run, and none of them was of the change.** A run
`loop.ts start` began has `WORK` and `SESSION` set, and a test that ran the real `agent.sh` passed them on:
`1232 pass, 3 fail` as the run was, `1235 pass, 0 fail` with `env -u WORK -u SESSION`. It was filed as
`seen-000b4c` (event 6611). The rebase then brought in `suite-fails-under-a-loop-started-run`, another writer's
fix of the same thing, and the run above is with no `env -u`.

What the two new tests hold:

- a writer's prompt has `scratch: <dir>` fourth and the token last; the directory is there and empty while
  the stand-in agent is held; the run file has the path;
- after `ended` the directory and a file written in it are gone, and `<token>.json` and `.result.json` stand;
- a second `ended` leaves a directory made later at that path;
- `resume` names the same path in a fourth line, the directory is there and empty, and is gone after;
- a run file with no `scratch`: `ended` removes no directory;
- an overseer and a judgment run (with `--token`) have the line and the directory; a reviewer and an
  approver have neither, and no `scratch` in the file.

## Not tried

- A run started by the changed `loop.ts` with the real `agent.sh` and `claude`. `WORK=$W DRY=1 agent.sh
  implementer "<four lines with a scratch: line>"` printed the prompt whole after `-p`; that is all of it
  that ran.
- `loop.sh`, and whether its sandbox lets an agent write in `runs/<token>.scratch`.
- A run that is killed: its directory stands until a step runs `ended` for it. The test has no such case.
- A `--token` whose name is not one of `[a-z]+-[0-9a-f]{6}`: the path is made from the name as given.
- A digest writer and a spec writer: they take the same line of `start` as an implementer, and no test
  started one here.
