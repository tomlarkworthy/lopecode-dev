# fly-4-loop-files: the loop's own files for the worker machine on Fly.io

2026-10-13. Task 4 of `plan/cloud-brain-worker-machine-on-fly.md`, as amended by part 6 of
`plan/cloud-brain-orchestrator-as-steps.md` (comments 5777 and 6493 of the issue). Local tools and texts: no
seed, no deploy. Labeled `major`: it changes the loop's procedure.

**Nothing here was run on the machine.** No machine of the loop exists yet (`fly-4b-first-run` makes it), and
the four tokens it would hold are not made. Every behaviour below was seen against stand-ins in `tests/tools/`,
and two commands were run on this laptop against cb4 and its own state, which is said where it is. The first
run of a driver with no state file is the owner's, in `fly-4b-first-run`.

The writer is a `claude` process with the token `impl-2db0ef`, on one laptop (macOS, bun 1.4.0), in the
worktree `…/.claude/worktrees/bm-worker-machine-on-fly`. Times are UTC, from `date`.

## What "a loop with no state file" is

The Fly spec says what the machine's loop does not do by one condition, "a loop with no state file". In the
program that is: `tools/cloud-brain/.emitted/` of the main checkout (or `BRAIN_STATE_DIR`) has no `cb4.json`.
`loop.ts` looks for the file and does not read it (`NO_STATE`). With the file, `step` and `run` do what they did
before this change; `tests/tools/loop-step.test.ts` and `loop-run.test.ts` now write an empty `cb4.json` into
their rigs for the cases that were there, and remove it for the new ones.

The cost of that choice: a laptop whose state file is gone would run as the machine does, and its driver
would end itself at an idle step. Each step's status says so under Health ("this loop has no state file (the
machine's): …") and its line has `machine: true`. A flag on `run` and `step` was the other way; it would have
to be passed to every step, to `run.sh` and to a pass by hand, and the spec's words name the file.

## What changed

| File | What |
|---|---|
| `tools/cloud-brain/loop.ts`, `step` | With no state file a whole step asks `brain.ts curl /xrpc/com.lopecode.brain.fly.status --as fly-status` in the place of `redistil` and `state`; anything but 200 with JSON is not healthy. It skips, each with a line in `skipped`: every entry of an issue labeled `laptop`, a digest's start, the digests the snapshot opened, an approver, an overseer. A `review` that needs a tab gets the act `laptop`: the label, key `orch/<id>/laptop-<seq of the submit>`, and a comment that says why |
| `loop.ts`, `step --for yield` | New. Health as a step for an event, the runs (item 2), then each token `ended` kept for a round to come is ended. The queue is not read, nothing is started, and a cluster that is not healthy is given to no judgment run |
| `loop.ts`, `run` | With no state file and not `--dry`: it ends itself, exit 0 with `loop` released and its token ended, after a step that had nothing to do while no run of the machine is left; and after each renew that was answered it reads `fly.status`, and with `yield` set makes no more step for a reason, one `step --for yield`, one more whenever a run has returned, and ends after such a step when none is left |
| `loop.ts`, `needsTab` | The three lines of `start` that decide `TAB=1`, as a function `step` also calls. `start` is not otherwise changed |
| `tools/cloud-brain/fly/run.sh` | Its last line starts the driver: `IS_SANDBOX=1 METADEV=1 BRAIN_URL="$BASE" bun tools/cloud-brain/loop.ts run`. `FLY_RUN_PROMPT` and `MODEL` are no longer read |
| `tools/cloud-brain/brain.ts` | `B()`, the Brain's address: with no `subdomain` in the state file it is `BRAIN_URL` (`https://HOST`, or `http://127.0.0.1:PORT`), and with neither the command prints `no address for cb4: …` and is exit 1. `agent-token --parent NAME`: the list, the revoke and the making are of the kept token NAME in the place of `loop-agents` |
| `tools/cloud-brain/fly/token-file.ts` | New. From `fly-agents`, `fly-knowledge`, `fly-docs` and `fly-status` of the laptop's `cb4-tokens.json` it writes the machine's file: `loop-agents`, `loop-knowledge`, `loop-docs` over the first three values, and `fly-status`. Mode 600; `--base64` writes the value of the app's secret `BRAIN_TOKENS`. It prints names and no value |
| `.claude/skills/brain-maintenance/SKILL.md`, step 1 | "With no state file": the second form of the health step, and what such a loop leaves to the laptop's |
| `…/agents/orchestrator.md`, "Triage" | The label `laptop` at triage: a body that says a Worker changes, or a check that names one of six tokens |
| `…/agents/implementer/ready-to-land.md` | A writer with no state file whose change needs `brain.ts apply` stops before the emit: no push, a comment, the label `laptop`, no submit |
| `plan/cloud-brain-worker-machine-on-fly.md` | A note "As built" at the head of part 2 and under T4 |
| `knowledge/calling-a-cloud-brain-from-this-checkout.md` | A section "With no state file" at its end; the line "If the state file is missing, there is no access; ask Tom" now points to it |

## Where the program differs from the spec, and by which line

`philosophy.md`, the seven, line 2: "When there is more than one reasonable way, choose. Take the side that is
smaller and easier to undo". Each of these is in the "As built" note of the spec.

- **Off is the machine's alone.** Part 6 of the steps spec says the driver "releases `loop` and exits 0" at a
  step with no act and no `running` run, and names no machine. Part 4 of the same spec says the driver is
  "started by the owner and stopped with Ctrl-C". A laptop's driver that ended at every idle step would have
  to be started again by him each time, so the end is made only with no state file. What "no act" is: the
  line is healthy with no `error`, no act, nothing given to a judgment run, no `stops` and no `unlogged`. The
  Fly spec's "A pass that started nothing for another cause is not that pass" is the last three.
- **The writer puts the label `laptop`, not the orchestrator.** The Fly spec has "The orchestrator there makes
  `back` with the reason and adds the label". The orchestrator there is now a program, which cannot read why a
  writer stopped. So the writer labels and comments, and the `back` is the step's row "A dead writer", which
  was there. Read on cb4 that day with `issue-as.sh impl-2db0ef policy`: the `label` guard of each of the
  four workflows is `caller.kind in ["owner", "token"] && (!("major" in event.remove) || caller.present)`, so
  a writer's token may add it. No label was added to any issue for this.
- **No approver on the machine.** The spec's list does not have it: the approver is later than the spec.
  `approver.ts approve` sends its move with `loop-approver` (its header, line 37), which is not one of the
  four tokens of the machine's file. An approver started there would write its verdict and fail at the move.
  `fly.work` answers the ids of `queue` alone, and an issue at `awaiting-approval` is in `waiting`, so this
  starts no machine and stops none.
- **`BRAIN_URL`.** The record of `fly-2-image-and-run-sh` left it to this task: "`brain.ts curl /xrpc/… --as
  NAME`, as the briefs write it, has no address on the machine". The driver's first act is `brain.ts
  agent-token orch driver:<host>`, which had none either. Before this change, with no state file:

  ```
  $ BRAIN_URL= BRAIN_BASE=cb4 BRAIN_STATE_DIR=<a directory with one token file> bun brain.ts curl /xrpc/com.lopecode.brain.fly.status --as a
   [000]
  ```

  and with it, `no address for cb4: <dir>/cb4.json has no subdomain, and BRAIN_URL is not set`, exit 1. Both
  were run that day, the first with the file of commit `633099c9`. The variable is read only when the state
  file gives no `subdomain`, so no laptop call can be sent elsewhere by it.
- **The driver's note.** The check of R1 and R6 looks for a token with the note `orch; fly:<machine id>`.
  The driver makes `orch; driver:<host>` on every machine (`rules.md`, "Which token"), and that is kept:
  `fly-4b-first-run` reads `agent-token --parent fly-agents list` for the note that is there.

## How it was seen

Each count is the last line of `cd $W && bun test --timeout=30000 ./tests/tools/<file>`, run after 13:17 UTC
and before the commit of 13:21, after the last change to the programs.

| File | Passed | What of this change it holds |
|---|---|---|
| `fly-4-loop-files.test.ts` (new) | 9 of 9 | `token-file.ts` as a process: the file, mode 600, `--base64`, `--out`, each refusal, no value printed. `brain.ts` with no state file against a local stand-in: `BRAIN_URL` for `curl --as` and `agent-token list`, and four values that are refused with nothing sent. The texts |
| `loop-run.test.ts` | 26 of 26 | 6 new cases of `drive` and one of `loop.ts run` as a process with no state file: the end at an idle step; not with a run left, not after a step that is not healthy or has `stops`; no end and no read of `fly.status` with a state file or `--dry`; the yield, its steps and its notes; `fly.status` not read |
| `loop-step.test.ts` | 37 of 37 | 4 new cases, each with the same world run again with the state file: the health form (200, 403, no status, 200 with no JSON, a step for an event); what is skipped; the tab review, its label, its comment, the second step, a `url` ref, a dry step; `step --for yield` |
| `agent-token.test.ts` | 22 of 22 | 2 new cases: `--parent fly-agents` for `list`, `revoke` and a made token, beside the same commands with no flag; a parent not kept and three malformed forms |
| `fly-run-sh.test.ts` | 13 of 13 | The checkout of the test has a `loop.ts` in the driver's place, which records its arguments and environment and calls the checkout's real `brain.ts` with a path: the Brain of the test was asked `fly.status` with the machine's token, with no `cb4.json` there. No `claude` is started |
| `st-7-switch-and-texts.test.ts` | 10 of 10 | It held that `loop.ts` had no yield and that `run.sh` started `claude -p`. Both lines are turned over. The first read `loop.split("\nimport ")[1]`, which is the first import statement alone, so it would not have failed |

**Each new behaviour was taken out and a test failed.** 15 edits, one at a time, each put back after:
the idle end; the read of `fly.status` at a renew; the yield's reason; the health form; the skip of `laptop`;
the tab label; the skip of a digest's start; of an approver; of an overseer; of the snapshot's digests; the
kept tokens at a yield; the judgment not given at a yield; `NO_STATE` made always true (an old case of health
fails); `BRAIN_URL` out of `run.sh`; `--parent` ignored. Three of them were first run with a filter that
matched one test and read as passing; they were run again with the filter passed whole.

The whole suite, `$W/tests/tools/suite.sh`, first run at 13:12 UTC on the tree rebased on `7bc70a1b`: 1255
passed and 2 failed of 1257 in 128 files. Both were this change's: `ta-5-outside-session-doc.test.ts` reads
the line `PARENT = "loop-agents", HOURS = 48;` of `brain.ts`, which is put back as it was (the flag's value is
a second name, `OF`); and `ac-5-prose-names-the-two-shapes.test.ts` holds a section of the knowledge page
inside its first 15,000 characters, which eight new lines above it had pushed to 15,687, so the lines are a
section at the page's end and the old sentence is shorter by four characters.

Two commands on this laptop, 13:11 UTC:

```
$ bun tools/cloud-brain/fly/token-file.ts
token-file.ts: not kept in <root>/tools/cloud-brain/.emitted/cb4-tokens.json: fly-agents, fly-knowledge, fly-docs, fly-status. Each is made with the owner's session, …. Nothing was written
$ BRAIN_STATE_DIR=<root>/tools/cloud-brain/.emitted BRAIN_BASE=cb4 bun tools/cloud-brain/brain.ts agent-token --parent fly-agents list
no token "fly-agents" is kept. The owner makes it once: token fly-agents 'issue.*' --delegate
```

and `agent-token list` with no flag printed 13 lines there, so the path with a state file still reaches cb4.

The suite again on the tree as committed, with the record and the two mends, begun 13:21 UTC and ended by
13:24:54: `$W/tests/tools/suite.sh` printed `1257 pass`, `0 fail`, `Ran 1257 tests across 128 files`, exit 0,
and no line `skipped:`.

## For the session that makes the tokens, and for `fly-4b-first-run`

- None of `fly-agents`, `fly-knowledge`, `fly-docs` and `fly-status` is kept on this laptop (above). The
  commands are in the spec, "What the orchestrator makes"; `loop-fly` is kept. They are a session's with the
  owner present (`rules.md`, "A token an approved spec names"), and no label is asked for this.
- Then `bun tools/cloud-brain/fly/token-file.ts --base64` writes
  `<root>/tools/cloud-brain/.emitted/fly-machine-tokens.json`, whose one line is the value of the app's
  secret `BRAIN_TOKENS` (item 6 of the owner's list).
- `agent.sh` starts each agent of the machine. Whether its `--permission-mode` and the image's `claude` let a
  writer finish there as root was seen for one reviewer in `fly-1-by-hand` and for no writer.

## Not tried

- A driver, a step, a writer or `run.sh` on a machine of Fly.io. So also: that exit 0 of the driver stops the
  machine, that the tick's stop at 30 minutes after a yield is not met first, and how long a step takes there.
- `fly.status` asked by `loop.ts` of cb4: the laptop has no `fly-status`. The answer's shape is the service's
  method table and one answer quoted in `plan/cloud-brain-fly-exec-for-blessed-services.md` (`"yield":null`).
- A writer that stops with the label `laptop`. The page of the brief has the steps; the `back` after it is the
  row "A dead writer", which has its own cases in `loop-step.test.ts` and none with this label.
- The label `laptop` at triage: a text of the judgment run's brief, read by no test of behaviour.
- `review-needs-tab.sh` itself on the machine. The step's test has a stand-in that exits 0 or 1; exit 2 (it
  could not tell) is taken as a tab, as in `start`, by the same function, and has no case of its own here.
- A yield while a writer holds `land`: the driver waits for every run of the machine, which is the same wait.
- Two branches of `brain.ts` `B()` with a state file: `brainUrl` is what the tests of `agent-token` use, and
  `subdomain` was run once against cb4 (the 13 lines above). That `BRAIN_URL` is not read with a `subdomain`
  is held as the order of two lines of the function.
- A token ended by `agent-token --parent … revoke` on cb4: there is no such child yet.

## What slowed the writer

- The brief's core is at 19,971 of 20,000 characters, so the writer's rule for the label is on a page and not
  in a step.
- `knowledge/calling-a-cloud-brain-from-this-checkout.md` has 20 characters left before the size
  `ac-5-prose-names-the-two-shapes.test.ts` holds for one of its sections.
- The hook that asks for the knowledge pages is on `Edit` and `Write`: an edit made with a script from the
  shell was not asked for the page of "changing and deploying".
