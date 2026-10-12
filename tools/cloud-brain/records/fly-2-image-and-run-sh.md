# fly-2-image-and-run-sh: the worker machine's image, and `run.sh`

T2 of `plan/cloud-brain-worker-machine-on-fly.md`, written 2026-10-12 (the builds and the starts
below are between 23:20 and 23:36 CEST) by the writer `impl-8a770b` from the commands of `tools/cloud-brain/records/fly-1-by-hand.md`. Times
are from `date` on the laptop, or from Fly.io's event list where it says so. Nothing was deployed to
cb4 and no seed changed.

## What was added

All in `tools/cloud-brain/fly/`:

| File | What |
|---|---|
| `Dockerfile` | `ubuntu:24.04` with git, curl, unzip, jq, python3, poppler-utils, openssh-client, bun 1.4.3, node from nodesource `setup_current.x`, Claude Code 2.1.296, and the Chromium of Playwright 1.57.0 under `/opt/ms-playwright`. It copies `ssh_config` and `run.sh`, and its `CMD` is the copy of `run.sh` |
| `ssh_config` | Three host aliases, one for each deploy key (`lopecode-dev`, `lopebooks`, `lopecode-plugin`) |
| `run.sh` | The machine's first process. Its header has the two halves and each variable it reads |
| `build.sh`, `fly.toml` | The build: `fly deploy --build-only --push --remote-only`, with this directory as the context |
| `machine.json` | The body of a machine for the Machines API: performance-2x with 4096 MB, restart policy `no`, the volume at `/data`, four `files`. Two values are left as `<label>` and `<volume id>` |

and `tests/tools/fly-run-sh.test.ts`.

## Where the image is built and kept

On Fly.io's own builder, from the laptop with the owner's `fly auth login`, and in the registry of the
app: `registry.fly.io/cloudbrain:<label>`. `tools/cloud-brain/fly/build.sh <label>` is the command.
The last lines of the build that stands (`fly-2-b`, 23:32:37 to 23:33:56 CEST, 79 s with the first
five layers from the builder's cache):

```
#15 pushing manifest for registry.fly.io/cloudbrain:fly-2-b@sha256:2ab4692596f4e0bcd8a026d5faa2929f9a2582326e358b0895529ff2480f07c9 0.2s done
image: registry.fly.io/cloudbrain:fly-2-b
image size: 632 MB
```

The steps that were not cached, from the first build's log: apt 31.8 s, bun 2.0 s, node 16.8 s,
Claude Code 13.4 s; and from the second, Chromium with its system packages 30.2 s and the push 43.8 s.
A build with nothing cached was not timed whole.

**What the build left on the owner's account** (comment 5107 of the project: an agent makes no
Fly.io credential). Read before the first build at 23:20:32 and again after the second:

```
fly apps list                   same: one app, cloudbrain
fly tokens list -a cloudbrain   same: one token, "flyctl deploy token", to 2027-01-10
shasum ~/.docker/config.json    same
```

So the build made no app (no builder app is listed) and no token of the app, and wrote no docker
login. Org tokens were not read: `fly tokens list --scope org` answered "org slug argument must be
specified when not running interactively". Whether the builder is billed was not read.

**Not built on the laptop's docker.** It is `aarch64` (`docker info`) and the machine is `x86_64`,
and a push from it needs `fly auth docker`, which writes his login into `~/.docker/config.json`.
Not tried.

**The first build hung, and why.** `bun x playwright@1.57.0 install --with-deps chromium` printed
"100% of 164.7 MiB" at 21.59 s of its step and nothing after; the build was started 23:20:40 and
killed at 23:32:25. That is the stop `fly-1-by-hand` saw under node 26.11.1: `bun x` runs a tool
under the `node` its first line names when node is installed. With `bun x --bun` the step ended in
30.2 s.

## One start of a machine with the image

`fly-1-by-hand` left "a start from `stopped` of a machine with the tools in its image and the
checkout on its volume" not measured. On its machine `853145b4217618` (stopped, performance-2x,
4096 MB, the volume with the checkout), `init.cmd` left as `sleep infinity`:

```
fly machine update … --image registry.fly.io/cloudbrain:fly-2-b --skip-start --yes     23:34:28, state after: stopped
fly machine start                                                                       23:34:53.125 to 23:34:55.874
```

2.75 s for the first start with the new image. Then, by `fly machine exec`:

```
HOME=/root   bun 1.4.3   node v26.11.1   2.1.296 (Claude Code)   git 2.43.0   jq-1.7   Python 3.12.3   pdftotext 24.02.0
/opt/ms-playwright: chromium-1200  chromium_headless_shell-1200  ffmpeg-1011
/root/.ssh: lopebooks.key  lopecode-dev.key  lopecode-plugin.key, each -rwxr-xr-x
```

`HOME` is `/root` there with the image's `ENV`; it was `/` on `ubuntu:24.04`. The names in `env`
begin `FLY_ALLOC_ID`, `FLY_APP_NAME`, `FLY_IMAGE_REF`, `FLY_MACHINE_ID`, `FLY_MACHINE_VERSION`,
`FLY_PRIVATE_IP`, `FLY_REGION`, `FLY_VM_MEMORY_MB`, and `CLAUDE_CODE_OAUTH_TOKEN`; none begins
`FLY_API` or `CF_`.

**The image's copy of `run.sh`, first half** (`/usr/local/bin/fly-run.sh`, run by hand there):

```
run.sh 21:35:00Z main is at c58f35c0
run.sh 21:35:00Z the checkout has no tools/cloud-brain/fly/run.sh; nothing is started
exit 1
```

The three keys were `-rw-------` after it, and the pull went through the image's alias with the
deploy key. `main` had no `run.sh` then: this change was not landed. So the hand-over to the
checkout's copy was not seen on the machine; the test has it.

**The second half**, this worktree's `run.sh` sent to the machine and run with `RUN_SH_PULLED=1`:

```
run.sh 21:35:01Z fly.work was not answered (status none): no token "fly-status" is kept; make one with: …; no loop is started
exit 1
```

That is bun, `brain.ts` and jq of the image run to the question. The machine has no token and cb4 has
no `fly.work` (T3), so no call was sent and no `claude` was started.

**Chromium**, in a second start (23:35:28.154 `starting`, 23:35:29.716 `started`, Fly.io's events):
`chromium.launch()` of the checkout's Playwright, a page and its title in 2,246 ms, version
`143.0.7499.4`, from `/opt/ms-playwright/chromium-1200/chrome-linux64/chrome`. One launch of an empty
page; no test of a seed was run there.

`sha256sum /usr/local/bin/fly-run.sh` there and `shasum -a 256 tools/cloud-brain/fly/run.sh` in the
worktree both gave `32a183b3…7fd47a87`: the image `fly-2-b` has the `run.sh` of this change.

The machine was `started` from 23:34:55 to 23:35:03 and from 23:35:29 to 23:35:35, about 14 s
(about $0.0004 at the $0.09 an hour of the record of `fly-1-by-hand`; my arithmetic). It is
`stopped` now, with the image `cloudbrain:fly-2-b` and `sleep infinity` still its command: a start of
it starts no loop.

## Choices that differ from the spec, each with an "As built" note there

- **The image starts `run.sh`, not `init.exec` of the volume's copy.** A new volume has no checkout,
  so there is nothing there to start. The image's copy clones when `$CHECKOUT` is absent, pulls `main`
  and then runs the checkout's copy in its own place, so a change to `run.sh` on `main` needs no new
  image. Cost: a change to the first half (the clone, the pull) does need one.
- **`fly.work` is asked after the pull**, not first: the question is asked by the checkout's
  `brain.ts`, which the pull may have changed. Cost: a start with no work pays for a pull; how long that
  is on the machine was not timed apart.
- **The call names the Brain's address whole.** `brain.ts` builds it from `subdomain` of the state
  file (`brain.ts`, `B()`), which the machine does not have; a path that begins `http` is taken as
  it is. So `brain.ts curl /xrpc/… --as NAME`, as the briefs write it, has no address on the machine.
  That is every `--as loop-knowledge` search of a writer there, and is T4's or T4b's to answer; it is
  not changed here.
- **An answer that is not 200 with a list ends with exit 1 and no loop.** The other way was to start
  the loop anyway. A machine that cannot ask the Brain cannot reach the tracker, and exit 1 under
  policy `no` is a stopped machine, which is the smaller thing to undo (`philosophy.md`, the seven, 2).
- **Three submodules.** `lopecode` is left out (`seen-lopecode-pointer-on-no-remote`).
- **performance-2x with 4096 MB** in `machine.json`, where part 1 has shared-cpu-2x.

## Tests

`bun test --timeout=30000 ./tests/tools/fly-run-sh.test.ts`: 13 pass, 0 fail (run after the last
edit of `run.sh` and of the test). `run.sh` is run as it is, with a `claude` of the test on `PATH`, a
Brain of the test at `FLY_RUN_BASE`, and real git, bun and jq. What the 13 hold: `{"work":[]}` is exit
0 with no `claude`; a list with an issue starts `claude` in the checkout with the prompt, the model,
the mode and both variables, and its exit is the script's; 403, 404, 200 with no list, 200 with no
JSON, a list beside a 500, an address not reached and no token are each exit 1 with no `claude`; the
first half against an origin of the test (a clone, a second start after `main` moved, an origin
gone); and that the keys of `machine.json` are the ones `ssh_config` names.

Three lines of `run.sh` were each taken out and the file run, then put back: the exit at an empty
list failed "fly.work empty"; the check of the status failed "a list beside a 500"; the hand-over
failed "the first half". One test failed each time, 12 passed.

`tests/tools/suite.sh`, the whole suite after the last edit: the count is in the comment of the
submit, from the run made then.

## Not tried

- `run.sh` as a machine's first process: no machine was given the image's `CMD`. So also: exit 0 of
  `run.sh` leaving the machine `stopped`, a `claude` started by it, and a pass of the loop. T4b.
- The second half past the question on the machine: the submodules through the aliases of the
  image, the two `bun install`, `CLAUDE_CONFIG_DIR=/data/claude` kept over a stop.
- A clone on an empty volume by the image's copy. The test clones from a directory.
- `machine.json` sent to the Machines API. Its fourth file names a secret `BRAIN_TOKENS` that is not
  set (item 6 of the owner's list); what a create answers with a `secret_name` that does not exist was
  not tried, and whether `files` may write under `/root` beside `.ssh` was not either.
- `HOME=/` becoming `/root` in `run.sh`: held as a line of text by the test, not run.
- What a session on the machine is told of its token. `FLY_RUN_PROMPT` is the place; T4 decides.
- A git identity for commits on the machine. Nothing sets `user.name` there.
- A build with no cache, the builder's price, and a second label in the registry beside the first
  (`fly-2-a` was never pushed: its build was killed).
- A Playwright newer than 1.57.0 in the checkout: `tools/package.json` has `^1.51.0` and no lock
  file, so a later `bun install` may name another Chromium than the image has.

## What misled the writer

- `bun x` runs a tool under node when node is installed. The record of `fly-1-by-hand` says "installs
  with bun", which was `bun node_modules/.bin/playwright` there; the first build stood 10 minutes on
  the difference.
- In zsh `echo ==` between two searches is "= not found", and the second and third searches of step 2
  did not run the first time.
