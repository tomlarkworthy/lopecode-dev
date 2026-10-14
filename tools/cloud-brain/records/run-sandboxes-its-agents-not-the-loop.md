# run-sandboxes-its-agents-not-the-loop

Issue opened 2026-10-14 07:20 UTC by `out-5bc2ed`, on Tom's word that day: sandbox the agents, not the loop. Written
by `impl-97be9e`.

## Why

At `cloud-brain-dev` 09f9113 `laptop.sh` ran `laptop.ts`, and so `drain.ts`, `run.ts` and `ship.ts`, inside
safehouse, so that the agents could not read `tools/cloud-brain/.emitted/cb4.json` (the recovery key) or
`cb4-tokens.json`. `ship.ts` needs the key, so each pass stopped in-review: `fly-tick-start-path-removed` passed at
event 7408 and waited for a `ship.ts` run by hand (7410).

## What changed

In `cloud-brain-dev`, one commit in the clone of this worktree (`$W/cloud-brain-dev`), not pushed to the cluster
(the issue's comment 7414: the session that opened it pushes after a pass):

- `sandbox.ts`, new. `sandbox(here, brain)` answers `safehouse` (with a `wrap` that builds the argv), `none`, or
  `refused` with why. The safehouse arguments are metadev's `SAFEHOUSE_ARGS`, read the way lopecode-dev
  `tools/cloud-brain/loop.sh` reads them (the `export` lines above `ENV_PASS=` and the lines to the `)`, run in zsh),
  from `LOPECODE_DEV/metadev`, default the directory above. What metadev's `export` lines set is returned as `env`,
  and `run.ts` puts it in the environment of the check and of each agent: at 09f9113 `laptop.sh` ran those lines in
  its own shell, and without them metadev's `--env-pass` of `CLAUDE_CONFIG_DIR` passes nothing. Read from this
  checkout's `metadev`, it gave 25 arguments and four exported names (`METADEV`, `CLAUDE_CONFIG_DIR`,
  `LOPECODE_LLM_RUNNER`, `METADEV_CORRELATION_ID`). Then `--env-pass=WORK,BRAIN,BRAIN_TOKEN,ISSUE_TOKEN,MODEL`,
  `--workdir=<the agent's clone>`, `--add-dirs-ro=<cloud-brain-dev, for agent.sh>[:<the reader's patch file>]`,
  `--enable=all-agents`, `--`. `keyFiles` lists `KEY_FILE` and each `<base>.json` and `<base>-*.json` of
  `BRAIN_STATE_DIR` and of `tools/cloud-brain/.emitted` under `LOPECODE_DEV`, the directory above and the main
  checkout. `check` runs a shell script in the sandbox: the directory is read and written, `ISSUE_TOKEN` and
  `BRAIN_TOKEN` are set, `AGENTS_TOKEN` is not, no key file is readable.
- `run.ts`. After the issue is read and before any token is made: with no safehouse and a key file in reach, or a
  check that fails, it prints `{ outcome: "sandbox-check", sandbox, why, check? }` and exits 2, with nothing made and
  nothing written to the tracker. Each agent is spawned through `wrap` when the sandbox is `safehouse`. The last line
  has `sandbox`.
- `drain.ts`. A run whose outcome is `sandbox-check` ends the drain with that outcome, exit 1.
- `laptop.ts`. A drain that ends at `sandbox-check` ends `laptop.ts`, as a limit does. Header follows.
- `laptop.sh`. No safehouse around the loop: it reads the two kept tokens, sets `LOPECODE_DEV` and `LAPTOP_SHIP=1`,
  starts `caffeinate`, and `exec bun laptop.ts`. It still refuses to start with no safehouse on the PATH.
- `README.md`, "On the owner's laptop: laptop.ts", says the above.

In `lopecode-dev`: `tests/tools/run-sandboxes-agents.test.ts`, and this record.

One departure from the issue's text: it lists `BRAIN_TOKEN` among what an agent is not given. The writer's brief
(`brain/roles/service-writer.md`, steps 3 and 7) runs `bun work.ts base`, `pull` and `push`, and `work.ts` asks the
Brain as `BRAIN_TOKEN` (`loop-work`, `git.work`). Without it the writer cannot push its work, so it is passed, and
the check requires it.

## Tests

`bun test --timeout=30000 ./tests/tools/run-sandboxes-agents.test.ts`: 8 pass, 0 fail. `safehouse` there is a stub on
the PATH that logs its arguments and passes only `PATH` and the `--env-pass` names into the command, and has no file
rule. The cases: the key-file list; `refused` and `none` with no safehouse; the agent's argv and metadev's exports,
which reach the command; a metadev with no
`SAFEHOUSE_ARGS`, and none; the check failing on a readable key file and on an empty `ISSUE_TOKEN`, and holding when the
key is mode 000 (with `AGENTS_TOKEN` in the caller's environment and not let in); `run.ts` stopping at
`sandbox-check` with a stub safehouse and with none, each with `issue.get` the one call made to a local fake Brain;
`drain.ts --laptop` with two ready issues ending after the first at `sandbox-check`.

With `run.ts` and `drain.ts` put back to 09f9113 the last three fail (5 pass, 3 fail). With `drain.ts` alone put back,
the drain test fails (7 pass, 1 fail). With `sandbox.ts` as it was before the exports were carried (the first commit
of this change, which the advisor's read found the defect in), the argv test and the check test fail (6 pass, 2 fail).

`tests/tools/suite.sh`, after the last code edit: 1361 pass, 1 fail, 1362 tests across 144 files. The fail is
`approver-brief.test.ts`, "the leave verdict of the brief is counted by `trial` …": it fails alone at this base too
(15 pass, 1 fail), and reads `agents/approver.md`, which this change does not touch.

The new test skips with a line when `cloud-brain-dev` has no `sandbox.ts`, as it does at the pointer `lopecode-dev`
records until the commit above is pushed.

## Not tried

- A real safehouse. This session runs inside safehouse, where a nested one is refused (comment 7414). Whether an agent
  under these arguments can start `claude` logged in, run `bun`, `git` and `curl`, and write its clone under the
  system temporary directory is not known. The owner's run on the laptop is the test.
- `laptop.sh` itself, and an issue taken from ready to done with no hand step, which the issue asks for.
- An agent started through `wrap`: no test reaches `started()` with the sandbox, as that needs `delegation.create`
  and `work.ts open` against a Brain.
- The line of `laptop.ts` that ends at `sandbox-check` (read from the code).
- What metadev's own `ENV_PASS` lets into an agent beside the five names: `ANTHROPIC_API_KEY`, `AWS_*` and the rest,
  when set in the owner's terminal. And metadev's `--add-dirs=~/.claude-personal`, `~/.ssh` (read-only) are in an
  agent's reach, as they are for any session metadev starts.
