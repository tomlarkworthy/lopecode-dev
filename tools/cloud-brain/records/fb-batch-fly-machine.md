# fb-batch-fly-machine: the set-up form's change of image sends the whole config, and `loop.sh` starts `caffeinate`

2026-10-13. The batch of the two open feedback entries about the worker machine, triaged in comment 6963 of
the issue. One row an entry:

| Entry | What triage left | What was done |
|---|---|---|
| `seen-fly-image-form-partial-config` | mend | `flyBodies.image` of `tools/cloud-brain/brain-fly.ojs` holds the whole config of the `machine` body, and the form shows a note with it. Deployed as `brain-x-fly`. No update was sent to Fly.io |
| `seen-machine-slept-under-five-writers` | mend one thing, leave two | `tools/cloud-brain/loop.sh` starts `caffeinate -is -w $$` before `safehouse`. The seconds of the five cost events and the sign of load are left, as triage has it (below). Why the machine slept on 2026-10-13 is still not known |

The writer is a `claude` process with the token `impl-f3a3aa`, on one laptop (macOS, bun 1.4.0), in the
worktree `…/.claude/worktrees/bm-fb-batch-fly-machine`. Times are CEST from `date`.

## 1. The change of image

**What Fly.io's page says.** `https://docs.fly.io/machines/api/machines-resource`, "Update a Machine", read
with `curl` at 21:17:

> Note: You need to specify the entire Machine config to update a Machine; we don’t support partial updates. You can get the Machine you want to update, copy and modify the config and include it in the body of the update request.

The page does not say what a machine is left with when a body leaves fields out. The body of before was
`{ "config": { "image": "registry.fly.io/cloudbrain:<label>" } }`: by that sentence not a body the call
supports. Nobody had sent it (`fly-4b-first-run`, where the owner makes the machine, is at `ready`).

**What changed in the seed.**

- `flyBodies` is a block with one `config` object. `machine.body.config` and `image.body.config` are that
  object, so the two cannot differ: `guest`, `restart`, `auto_destroy`, `mounts`, `files` and the image.
  Nothing in the seed writes to it.
- `flyBodies.image` has a `note`, and the panel shows the note of the body chosen, between the select and
  the path: "Fly.io takes the whole config of a machine at an update and no part of one. This is the config
  of the machine body: write the label in, the volume id as for machine, and whatever was changed on the
  machine since it was made (fly.get?path=machines/ID answers its config)." The other two bodies have none.
- The body is the config the machine is made with, not the config the machine has. A machine changed since
  (an `env`, another size) loses that change at an update unless the owner writes it in, which is what the
  last clause of the note is for. The panel does not read the machine's config into the body.

**Tests.**

- `tests/tools/fly-service.test.ts`, the first test: the `image` body is `{ config }` of
  `tools/cloud-brain/fly/machine.json` and nothing else, at `machines/<machine id>` by `POST`.
  `bun test --timeout=30000 ./tests/tools/fly-service.test.ts`: 3 pass, 0 fail. With the seed of `c58fb733`
  in its place: 2 pass, 1 fail, that test.
- `test_fly_panel_shows_the_machine_and_sends_one_call_at_a_time` of the seed: with `image` chosen the
  textarea parses to the whole config, the note is in the panel (and is not while `machine` is chosen), and
  Send calls `fly.post` with that body.
  `bun tools/cloud-brain/tab-tests.ts tools/cloud-brain/.emitted/cloud-brain.html @tomlarkworthy/brain-fly`:
  13 tests, 13 passed. A build of the seed of `c58fb733` with that test alone taken from this change: 13
  tests, 12 passed, that one failing on the `config`.
- `bun test.ts brain-x-fly --with <the built module>` in `cloud-brain-dev`: 12 passed, 0 failed, 1 need a
  browser (the panel test).
- `BRAIN_BASE=cb4 bun tools/cloud-brain/verify-run.ts brain-x-fly --shell <the build> --times 20`: 20 passed
  of 20 runs, `from` `["document"]`, `byChance` `[]`.

## 2. The sleep

**What is known.** No event of this machine from event 6050 to event 6052 of the tracker, 59 minutes by
their `at`, with five writers and a spec writer at work (the entry's body, and its two mends). Triage found
that `metadev` starts `caffeinate -is -w $$` (its line under "Prevent macOS sleep") and that `loop.sh`,
which starts the driver, did not: it reads `metadev` from `ENV_PASS=` to the end of `SAFEHOUSE_ARGS=(`, and
that line is below them.

**What changed.** `loop.sh`, before its `exec safehouse …`:

```
setopt no_bg_nice
command -v caffeinate >/dev/null && caffeinate -is -w $$ </dev/null >/dev/null 2>&1 &!
```

- `exec` keeps the pid, so `-w $$` waits for the process that becomes `safehouse`.
- It is gated on `caffeinate` being on the PATH and not on the system's name. The worker machine (Linux)
  has none and starts nothing for it.
- `setopt no_bg_nice`: without it zsh lowers a background job with `nice(5)`, which a session's sandbox
  refuses, and the script then prints `nice(5) failed: operation not permitted` on stderr (seen in the
  first run of the test).
- It is started outside the sandbox on purpose. Inside a session's sandbox `caffeinate -is -w <pid>` ended
  at once with `Failed to create PreventUserIdleSystemSleep assertion` (run at 21:11; the record of
  `sd-4-the-rest-and-the-release-line` has the same words of `caffeinate -i`).

**This may not be what happened on 2026-10-13.** That morning the loop was a session, not the driver. If
it ran under `metadev` it had this hold already and slept all the same; if not, it had none. Neither was
read. `caffeinate -i` does not hold a machine whose lid is closed, and `-s` holds only on mains power.

**Tests.** `bun test --timeout=30000 ./tests/tools/loop-run.test.ts`: 27 pass, 0 fail. Two are of this change:

- The test of `loop.sh` with a stand-in `safehouse` gets a stand-in `caffeinate` on the PATH, which writes
  its arguments: one line, `-is -w <pid>`, with the pid the stand-in `safehouse` has. With a `metadev` that
  has no `SAFEHOUSE_ARGS` (exit 2) the stand-in is not run. With `loop.sh` of `c58fb733` in its place: 26
  pass, 1 fail, that test.
- A new test runs `loop.sh` with a PATH of five tools and no `caffeinate`: exit 0, nothing on stderr, and
  `safehouse` is given the same arguments. It passes on the script of before too; it holds the branch a
  machine with no `caffeinate` takes.

**Left, as triage has it.**

- The `seconds` of the cost events 6095, 6108, 6195, 6197 and 6205 have about 3,540 s of sleep in them
  (the entry's figure, not counted again here). A cost event is not rewritten, and `issue-stats.ts` gets no
  rule that takes a sleep out. A reader of the stats of 2026-10-13 finds the five here. Opened again by a
  second sleep under running agents with the hold in `loop.sh`.
- The sign of load of `SKILL.md`, step 2, is not changed.

## The whole suite

`tests/tools/suite.sh`, at 21:16 after the last edit of a file it reads: 1293 pass, 0 fail, in 135 files,
192.77 s, with a load of 12.44 (`uptime`).

## Texts

`git grep -n -F 'loop.sh' -- knowledge 'plan/cloud-brain-*.md' .claude/skills/brain-maintenance 'tools/cloud-brain/*.md'`
printed 60 lines; `caffeinate` 3; `flyBodies` 2; `change of image` 1. One was made untrue:
`plan/cloud-brain-orchestrator-as-steps.md`, "It does not run `caffeinate`, which `metadev` does", which
gains "(As built, `fb-batch-fly-machine`, …)". The same words in `tools/cloud-brain/records/st-5-driver.md`
("Not tried") are of that record's day and stay.

## Not tried

- No call to Fly.io: the writer holds no credential for one, and no machine is made yet. That the update
  call takes this body, and what the machine is after it, is the owner's to see at his first change of
  image (`fly.get?path=machines/ID` before and after).
- `loop.sh` with the real `caffeinate`: in the test it is a stand-in, and in a session's sandbox the real
  one ends at once (above). `loop.sh` is the owner's to start. At his next start, `pgrep -fl caffeinate`
  in another terminal shows a line `caffeinate -is -w <pid of the driver>`, and `pmset -g assertions` names it.
- That the hold ends with the driver, with the real `caffeinate`. It rests on `-w` and on `exec` keeping
  the pid, which the test shows by the pid alone.
- A closed lid, battery power, and whether the hold would have kept the machine awake on 2026-10-13.
- The panel in the owner's tab. The note and the body were read by the test in headless Chrome 151.
