# fly-1-by-hand: one Fly.io machine by hand

T1 of `plan/cloud-brain-worker-machine-on-fly.md`. Run 2026-10-12 from 20:08 to 20:22 and from 21:06 to 22:53 CEST by the
writer `impl-ebb0f2`, an agent of the orchestrating session on the owner's laptop, with his
`fly auth login` (`fly v0.4.115`). Every time below is from `date` on the laptop, from the machine's
`date -u`, or from Fly.io's own event list, and says which.

Two sittings. The first, 20:08 to 20:22 CEST, stopped at Fly.io's trial and is the part from here to
"What misled the writer". The second, from 21:06 CEST with a card on the account, is "The second
sitting" at the end; where it measured a thing the first could not, the first's "Not measured" says so.

**The first sitting did not finish T1.** The app's organisation had no card, and Fly.io stops such a machine 5 minutes
after each start. From `fly logs -a cloudbrain --no-tail`:

```
2026-10-12T18:16:54Z runner[8654e09b79e168] ams [warn]Trial machine stopping. To run for longer than 5m0s, add a credit card by visiting https://fly.io/trial.
```

The machine had been `started` at 20:11:54.081 CEST and was `stopped` at 20:17:00.326
(`exit_code=130,oom_killed=false,requested_stop=true`, `fly machine status`). So item 1 of "What only
the owner can do" (the account's billing) is open, and what needs a machine for more than 5 minutes
was not measured: the list is under "Not measured". Nothing is left running: both machines and the
volume were destroyed by 20:21:21 CEST ("What was made, and when it went").

## Measured

Two machines of `ubuntu:24.04` in `ams`: `t1-by-hand` (`8654e09b79e168`, shared-cpu-2x, 4096 MB, a
10 GB volume at `/data`, `init.cmd` `["sleep","infinity"]`, `restart.policy` `no`), started twice,
and `t1-exit0` (256 MB, no volume) for the exit alone.

| The spec asks | What was seen | With |
|---|---|---|
| Whether a deploy token makes volumes and machines | `POST /v1/apps/cloudbrain/volumes` answered 201 after 0.96 s; `POST …/machines` answered 200 after 2.27 s | a deploy token of 1 h, `Authorization: Bearer` with the value as `fly tokens create deploy` prints it (it begins `FlyV1 `) |
| Whether it sets secrets | `FLY_API_TOKEN=… fly secrets set --stage T1_PROBE=1 -a cloudbrain`: "Secrets have been staged". `GET /v1/apps/cloudbrain/secrets` answered 200 with each secret's name and digest, no value. A set through the Machines API itself was not tried | the same token |
| Create to `started` | 5.94 s from the POST to the answer of `GET …/machines/<id>/wait?state=started`. Fly.io's log: "Machine created and started in 3.059s". The image was "already prepared" on the host | the same token |
| A start from `stopped` | `fly machine start` returned after 2.37 s (20:20:01.26 to 20:20:03.63 on the laptop); the event list has `started` at 20:20:03.132. One start, of a machine stopped 3 minutes before | his login |
| Exit 0 of the first process under policy `no` | `t1-exit0` ran `sh -c 'sleep 5; exit 0'`: `started` 20:20:58.864, then `stopped`, `exit_code=0,oom_killed=false,requested_stop=false`, at 20:21:05.112. Still `stopped` at 20:21:15 on the laptop, when it was read once more and destroyed. Ten seconds; that nothing starts it later was not waited for | his login, `fly machine run --restart no` |
| How `files` with `secret_name` writes a file | `/root/.ssh/lopecode-dev.key`, 419 bytes, beginning `-----BEGIN OPENSSH PRIVATE KEY`: the secret is base64 and the file is its decoding. Mode `-rwxr-xr-x`, owner root. `ssh` refuses a key of that mode, so the first process makes it 600. Written again at the second start (the directory's time moved to 18:20) | the machine's create body |
| Whether a staged secret reaches a machine | The three secrets were `Staged`, never deployed, and the new machine's `env` had `CLAUDE_CODE_OAUTH_TOKEN` (names read, no value). `T1_PROBE`, staged after the create, was not in `env` after the stop and the second start | `fly machine exec`, `env \| cut -d= -f1` |
| A push of each repository with its own key | With a host alias a repository in `~/.ssh/config` (`IdentitiesOnly yes`): an empty commit pushed as `refs/heads/t1-by-hand-probe-20261012T182021`, read back with `ls-remote`, deleted, and 0 such refs after, for `lopecode-dev` and for `lopebooks`; each `push exit 0`, `delete exit 0`. With no alias, `git@github.com:` is refused. The key of `lopecode-dev` read `HEAD` of `lopebooks`; a write with it there was not tried | the machine, 18:20:21 to 18:20:37 UTC |
| The owner's shell (part 4) | `fly ssh console -a cloudbrain --machine <id> -C "uname -a"` answered in 10.2 s against the image with nothing added, from a session inside `safehouse` started through `metadev` with `--add-dirs=~/.fly`. It passes stdin: 12 bytes piped in were 12 bytes in a file there | his login |

**The root file system does not outlive a stop.** After the trial's stop and the second start,
`/root/.bun`, `/root/.local/bin/claude`, `/usr/bin/node`, `/usr/bin/jq` and `/usr/bin/pdftotext`
were each "No such file or directory", and `/data` had the clone (1.9 GB) and the log. So the tools
are in the image or they are installed at every start, which is what part 1 of the spec supposes.

**The Machines API has an `exec`.** The spec's "Read" says of the API's page "No `exec` endpoint is
on the page", and T1's text and part 4 rest on it. Tried:

```
POST /v1/apps/cloudbrain/machines/8654e09b79e168/exec   {"command":["uname","-a"],"timeout":10}
{"stdout":"Linux 8654e09b79e168 6.12.105-fly #1 SMP PREEMPT_DYNAMIC Thu Aug 27 01:16:44 UTC 2026 x86_64 x86_64 x86_64 GNU/Linux\n","stderr":"","exit_code":0,"exit_signal":0}
[200]
```

with the deploy token. So a caller of `fly.post` runs a command as root on the machine, and so does
whoever holds `FLY_API_TOKEN`. `fly.post` is the owner's own session in the design; this is what
that rule is worth. `fly machine exec` is the same call from the tool.

**The idle machine.** `free -m` on a 4096 MB machine with `sleep infinity` and one shell: 3916 total,
235 used. `nproc`: 2. `/` is 7.8 GB with 33 MB used before any install; `/data` 9.8 GB.

**The install, as far as it went** (`/data/install.log`, the machine's clock, UTC; the script is
below). From a bare `ubuntu:24.04`:

```
18:12:44 apt      git curl unzip jq python3 poppler-utils ca-certificates openssh-client procps xz-utils
18:12:59 bun      curl -fsSL https://bun.sh/install | bash
18:13:01 node     nodesource setup_current.x, then apt-get install nodejs
18:13:21 claude   curl -fsSL https://claude.ai/install.sh | bash     "Installation complete!"
18:14:18 clone    git clone git@github-lopecode-dev:tomlarkworthy/lopecode-dev.git   exit 0, 1.9G
18:16:02 submodules
18:16:05 cloud-brain-dev   exit 0   (the Brain's address, no token)
18:16:17 lopecode-plugin   exit 1   git@github.com: Permission denied (publickey).
18:16:18 lopecode          not finished: the machine was stopped at 18:16:54
```

- Versions it printed: node `v26.11.1`, git `2.43.0`, `jq-1.7`, Python `3.12.3`, pdftotext `24.02.0`.
  The laptop's are in the spec ("Tools on the laptop"); git and poppler are older here.
- `bun --version` and `claude --version` printed "command not found": the script linked them into
  `/usr/local/bin` before the line that read them, and the read is not explained. Neither tool was
  run on the machine.
- `.gitmodules` names `lopecode-plugin` by `git@github.com:`, not by `https` as part 3 of the spec
  has it ("`lopecode-plugin` is fetched by `https`"). Neither deploy key reads it. T2 sets its URL to
  `https://github.com/tomlarkworthy/lopecode-plugin` in the machine's checkout, if that repository
  is public; that was not tried.
- `lopebooks` was not cloned (its turn came after the stop), nor `bun install` in `tools/`, nor
  Playwright's Chromium.

## Not measured in the first sitting

Each needs a machine that runs more than 5 minutes, or a tool the stop took away. The second
sitting, at the end, has each of these but three: a set of a secret through the Machines API, the clone of
`lopecode`, and a start of a machine with the tools in its image (there is no image). What it left
is under "Not tried, both sittings".

- One pass of the loop under `claude -p`, and which permission mode lets it finish. `claude` runs as
  root there; whether `--permission-mode bypassPermissions` is refused to root was not tried.
- Whether a `Monitor` and a `ScheduleWakeup` run under `claude -p`.
- Which hooks of `.claude/settings.json` fail on Linux.
- One review with `cloud-brain-dev/agent.sh`.
- Memory while a writer runs its tests. The 235 MB above is an idle machine.
- That `CLAUDE_CODE_OAUTH_TOKEN` as set makes a model request. Its name was in `env`; nothing used it.
- The whole clone: `lopebooks` and `lopecode`, their time and size on the volume.
- A set of a secret through the Machines API (item 6 of the owner's list waits on it).
- A start from `stopped` of a machine with the tools in its image and the checkout on its volume.
- The token for the pass. None was copied to the machine. The writer has no `orch` token and makes
  none (`rules.md`, "Which token"); its plan was its own entry of `cb4-agent-tokens.json`, piped
  over `fly ssh console`. The next round needs the orchestrating session to say which token.

The orchestrating session asked, in a message that came during the second start, that the pass wait for its comment
`orch/fly-1-by-hand/clear-for-machine-pass`. The round did not reach the pass.

## What was made, and when it went

| What | Made | Gone |
|---|---|---|
| Deploy token `fly-1-by-hand`, 1 h, app `cloudbrain` | 20:11:47 CEST | revoked 18:12:05 UTC (`fly tokens list`, `REVOKED AT`). It was held in a shell variable of one command and was not printed or written to a file |
| Volume `vol_vden2j67g0172l14`, 10 GB, `ams`, encrypted | 18:11:48 UTC | destroyed, 20:21:21 CEST |
| Machine `8654e09b79e168` | 18:11:50 UTC | ran 20:11:54 to 20:17:00 and 20:20:03 to its destroy, 20:21:21 CEST |
| Machine `2879167ad91508` | 20:20:52 CEST | ran 6 s; destroyed 20:21:18 CEST |
| Secret `T1_PROBE`, staged | between 20:11:55 and 20:12:05 CEST (the script's `date` before it, the revoke after) | unset 20:21:22 CEST |
| Two branches `t1-by-hand-probe-20261012T182021` on GitHub | 18:20:21 UTC | deleted in the same script; 0 such refs after |

After it, 20:21:22 CEST: `fly machine list -a cloudbrain` "No machines are available",
`fly volumes list` no row, `fly secrets list` the owner's three, each `Staged`. The owner's deploy
token `flyctl deploy token` (to 2027-01-10) was not read or used.

## A choice the writer made

T1 says "with his deploy token in that shell". No session had it: it is on the Brain's page, and
reading it there is the owner's. Two ways were open with his login. Use `fly` alone, which leaves
"whether a deploy token makes machines and volumes and sets secrets" untried, and part 3 rests on
that. Or make a second deploy token for an hour and revoke it. The second was taken
(`philosophy.md`, the seven, 2: the smaller side that is easy to undo), and it lived 18 seconds.
The rows above say which calls were the token's and which his login's.

## The scripts

The create, in one command, with `T` the token:

```
curl -X POST -H "Authorization: Bearer $T" -H 'content-type: application/json' https://api.machines.dev/v1/apps/cloudbrain/volumes \
  -d '{"name":"data","region":"ams","size_gb":10}'
curl -X POST … /machines -d '{"name":"t1-by-hand","region":"ams","config":{"image":"ubuntu:24.04",
  "guest":{"cpu_kind":"shared","cpus":2,"memory_mb":4096},"init":{"cmd":["sleep","infinity"]},
  "restart":{"policy":"no"},"auto_destroy":false,"mounts":[{"volume":"<id>","path":"/data"}],
  "files":[{"guest_path":"/root/.ssh/lopecode-dev.key","secret_name":"DEPLOY_KEY_LOPECODE_DEV"},
           {"guest_path":"/root/.ssh/lopebooks.key","secret_name":"DEPLOY_KEY_LOPEBOOKS"}]}}'
```

With the image's own command the machine would exit at once; `sleep infinity` holds it for a shell.

The install, sent as base64 in a `fly machine exec` and run under `nohup`:

```
apt-get update -qq && apt-get install -y -qq git curl unzip jq python3 poppler-utils ca-certificates openssh-client procps xz-utils
curl -fsSL https://bun.sh/install | bash
curl -fsSL https://deb.nodesource.com/setup_current.x | bash - && apt-get install -y -qq nodejs
curl -fsSL https://claude.ai/install.sh | bash
chmod 600 /root/.ssh/*.key
# ~/.ssh/config: Host github-lopecode-dev / github-lopebooks, HostName github.com, User git, IdentityFile the key, IdentitiesOnly yes
ssh-keyscan github.com >> /root/.ssh/known_hosts
cd /data && git clone -q git@github-lopecode-dev:tomlarkworthy/lopecode-dev.git
git config submodule.lopebooks.url git@github-lopebooks:tomlarkworthy/lopebooks.git
git submodule update --init cloud-brain-dev lopecode-plugin lopecode lopebooks     # one at a time
(cd tools && bun install && bunx playwright install --with-deps chromium)          # not reached
```

## What misled the writer

- Comment 4167 of the issue reads the owner's "I did FLY_API_TOKEN" as items 1 to 5 done. The app
  and the secrets were checked there; billing was not, and `fly` shows nothing of it until a
  machine has run 5 minutes. `fly status` of an app with no machine does not say "trial".
- A `fly ssh console -C` that waits on a machine ends with "ssh shell: wait: remote command exited
  without exit status or exit signal" when the machine is stopped under it. The cause was in
  `fly logs`, not in that line.

## The second sitting, 2026-10-12 from 21:06 CEST

The owner's word that the card is there is comment 4335 of the issue. The machine `853145b4217618`
(`t1-by-hand-2`) was `started` at 21:07:28.485 CEST and was still `started` at 21:16:38: past the
trial's 5 minutes. Everything here was done with his login (`fly volumes create`, `fly machine run
… --file-secret PATH=NAME … -- sleep infinity`, `fly machine exec`); no deploy token was made.
A third key, `DEPLOY_KEY_LOPECODE_PLUGIN`, made by another session (comment 4336 of the project), was
written by `--file-secret` as the other two and cloned `lopecode-plugin` through its own host alias, exit 0.

### A shared CPU does not carry the clone

The machine began as the design's size, shared-cpu-2x with 4096 MB. The pack of `lopebooks`
(2,005,644,362 bytes) was down by 19:17 UTC, 5 minutes after its clone began, and `git index-pack` was
then still running at 19:35:55, with 3 min 39 s of CPU in 24 minutes. `top` on the machine, two
samples 5 s apart, 19:36 UTC:

```
%Cpu(s):  3.4 us,  0.0 sy,  0.0 ni,  0.0 id,  0.0 wa,  0.0 hi,  0.0 si, 96.6 st
%Cpu(s):  9.0 us,  0.0 sy,  0.0 ni,  0.6 id,  0.0 wa,  0.0 hi,  0.0 si, 90.5 st
```

90% and more of the time was taken by the host. The first 5 minutes of that machine (apt, bun, node,
Claude Code, the clone of `lopecode-dev`) ran at the speed the first sitting saw; what the allowance
of a shared CPU is, and how it comes back, was not read. The writer changed the size and did not wait:
`fly machine update --vm-size performance-2x --vm-memory 4096`, 21:36:35 to 21:36:49 CEST, which
restarts the machine (`started` 21:36:47.084) and so empties the root file system. Every number below
is of performance-2x, 2 CPUs and 4096 MB, and none is of the size part 1 of the spec names. Its price
is under "What the two sittings cost".

### The install, whole (`/data/install-b.log`, UTC)

```
19:36:50 apt        16 s
19:37:06 bun         2 s   1.4.3
19:37:08 node       16 s   v26.11.1
19:37:24 claude     19 s   2.1.296 (Claude Code)
19:37:44 clone      kept from the run before (1 min 50 s there, 19:09:11 to 19:11:01, on the shared CPU's first minutes)
19:37:44 lopebooks  3 min 40 s, exit 0: 862M checked out, 1.9G in .git/modules/lopebooks
19:41:24 lopecode   exit 128
19:41:27 bun install in tools/   64 packages, 0.5 s
```

- **`HOME` is `/` in a `fly machine exec`** (`echo HOME=$HOME` there). The first sitting's bun and
  Claude Code were installed under `/` and not found; that is its "not explained". A script run that
  way sets `HOME=/root`.
- **`lopecode` cannot be checked out.** `fatal: remote error: upload-pack: not our ref
  5045424a3954e5b32a59aa487fa5aeeef469b6f7`. The commit `lopecode-dev` records for it is on the laptop
  ("Merge main into rc5-foundation") and in no remote branch (`git -C lopecode branch -r --contains`
  printed nothing), and the loop does not push `lopecode` (`rules.md`, Never). The suite then skips
  5 tests (`atproto-publish.test.ts`). Nothing else run here read it.
- **Playwright's Chromium does not install under node 26.11.1.** `node node_modules/.bin/playwright
  install chromium` (1.57.0) printed "100% of 164.7 MiB" and went no further, twice: 12 minutes the
  first time, then `timeout 300`, exit 124, with 18M in `chromium-1200`. `bun node_modules/.bin/playwright
  install chromium` did it in 16 s (357M and 251M for the headless shell). `--with-deps` had installed
  the system packages in the first of those runs.
- **The root `package.json` needs `bun install` too** (49 packages, 57M): without it `build.ts` and
  `test.ts` end with "Cannot find package 'happy-dom'".
- Disk after all of it: `/` 2.5G of 7.8G, `/data` 4.9G of 9.8G.

### `claude -p` on the machine (2.1.296, root, in the checkout; each run's stream is in `/data/t1/`)

The staged `CLAUDE_CODE_OAUTH_TOKEN` makes model requests: every run below answered. The model a
session there starts with is `claude-sonnet-5-5` (`init` of each stream); the laptop's is the owner's
setting, which the machine does not have.

| Run | Result |
|---|---|
| No `METADEV` | The `SessionStart` hook exits 2 with its FATAL line and the process ends with 143: the `UserPromptSubmit` hook's `kill $PPID` |
| `METADEV=1`, `--permission-mode default` | `echo hi > /tmp/pm-default` refused: "Output redirection to '/tmp/pm-default' needs approval. The path is outside the working directories". No file |
| `acceptEdits` | the same refusal, no file |
| `dontAsk` | "Permission to use Bash has been denied because Claude Code is running in don't ask mode". No file |
| `bypassPermissions` | exit 1 before any request: "--dangerously-skip-permissions cannot be used with root/sudo privileges for security reasons" |
| `IS_SANDBOX=1`, `bypassPermissions` | the file was written, "done", no denial |

So the mode that let a command run with nobody to answer is `bypassPermissions`, which root is given
only with `IS_SANDBOX=1` (or the loop runs as another user, not tried). The three refused modes were
tried with one command that writes outside the checkout; a command inside it was not tried in them.

**Hooks on Linux.** With `--include-hook-events`, over the three runs below: `SessionStart:startup`
(4 commands), `UserPromptSubmit`, `PreToolUse:Bash`, `PostToolUse:Bash`, `PostToolUse:Read`,
`PostToolUse:Monitor`, `PostToolUse:ScheduleWakeup` and `PostToolUse:ToolSearch` each answered exit 0
and no stderr. Not run: `PreToolUse` for Edit, Write and Agent (`agent-model-gate.sh`), `SessionEnd`,
and `SessionStart` with `compact`. `bun tools/cloud-brain/brain.ts help` was not stopped by
`learnings-gate.sh`; the script given that command by hand exits 0 on the machine and on the laptop
alike, so that is not a difference of Linux. Of the two project MCP servers, `lopecode` was
`connected` and `mempalace` `failed` (it is not installed there).

**A `Monitor` runs under `claude -p`.** A monitor on `for i in 1 2 3; do date -u +%H:%M:%S; sleep 20; done`:
the process stayed, was woken once a line, and ended after the monitor's end. The line, then the
session's own `date` when it wrote it:

```
20:06:22 | 20:06:24
20:06:42 | 20:06:44
20:07:02 | 20:07:04
```

The stream has one `result` for each wake (five), so a reader of `claude -p --output-format
stream-json` takes the last, as `agent.sh` does.

**A `ScheduleWakeup` runs under `claude -p`.** `/loop` with a prompt that appends `date` and asks for
60 s: three lines, `20:07:28`, `20:09:02`, `20:11:03`, then the process returned 0 at 20:11:07 with
nothing scheduled. The 60 s asked for were 94 s and 121 s between lines; the session's own words:
"The runtime moved the 60-second delay to 88 seconds", then 115. `/loop` and `/brain-maintenance`
are both in the stream's `slash_commands`.

### A writer's tests, and memory

No writer ran. The commands of steps 7 and 8 of the writer's brief were run by hand for
`brain-issues`, with `free -m` read each second beside them (20:13 to 20:20 UTC):

| Command | Result | Time |
|---|---|---|
| `bun sync.ts https://cb4.endpointservices.workers.dev` | "24 services, 78 shared modules, 62 files" | 1.3 s |
| `bun tools/cloud-brain/build.ts --out …` | exit 0, 9,236,435 bytes | 9.2 s |
| `bun test.ts brain-x-issues --with …` | `"passed":38,"failed":0,"needsBrowser":15` | 4.9 s |
| `bun tools/cloud-brain/tab-tests.ts … @tomlarkworthy/brain-issues` | `"tests":53,"passed":6`, 47 failed, each `TIMEOUT` (the tool's 90 s). The same on a second run | 94.7 s, 94 s |
| `bun tools/cloud-brain/tab-tests.ts … @tomlarkworthy/brain-static` | `"tests":12,"passed":12,"failed":[]`, `"browser":"143.0.7499.4","ms":79851` | 81 s |
| `tests/tools/suite.sh` | 672 pass, 5 skip, 2 fail, "Ran 679 tests across 68 files. [74.68s]" | 75 s |

- **Memory.** Over the build, `test.ts` and the first tab run: most used 3030 MB, least available
  885 MB, of 3916. Over the second tab run of `brain-issues` alone: most used 3316 MB, least
  available 599 MB. Over the suite: 1271 MB used. One headless Chrome with the built notebook takes
  most of 4 GB; two at once were not tried.
- **The browser is slow there.** `brain-static` passed in 80 s; the brief gives 13 s for it on the
  laptop (2026-10-11). `brain-issues` did not finish its tests in 90 s; the brief gives 25 s. `top`
  during the second run had no `st` and 10 to 45% idle of 2 CPUs. Why was not looked for (Chromium
  ran as root from Playwright's own launch; no flag was added).
- **The suite's two failures**, both of the machine and not of a change: `topic-sql.test.ts`, "no module
  @tomlarkworthy/brain-topic in …/lopebooks/notebooks/@tomlarkworthy_cloud-brain.html" (the committed
  notebook is the day's backup, behind the seeds); and `lock.test.ts`, "take --wait leaves with exit 2
  when sleep refuses the seconds the check let through", 30 s, a timeout: not read further.

### One pass of the loop

Held until the orchestrating session's comment 4921 (22:43 CEST), which named the token: `orch-5e4a0f`,
made for this. Its one entry of `cb4-agent-tokens.json` was piped to the machine over `fly ssh
console` (`jq … | fly ssh console -C "sh -c 'cat > …'"`), not printed and in no local file. No other
token and no state file were there. Five writers and a reviewer of the laptop's loop were at work
(the same comment), so "no other loop running" did not hold; the pass made no move.

```
IS_SANDBOX=1 METADEV=1 claude -p "/brain-maintenance" --model opus --permission-mode bypassPermissions
```

in `/data/lopecode-dev`, 20:44:03 to 20:44:39 UTC, exit 0: 10 turns, 34 s, `usd` 0.76 in its result
line. It ended at step 1. Its own words: "I stopped the pass at step 1. This checkout can't reach the
tracker." What it ran: the two pulls (`cloud-brain-dev` refused, a detached HEAD), then `brain.ts
agent-token list`, which answered `No token "loop-agents" is kept`. It then read "If the state file
is missing, there is no access; ask Tom" in the knowledge page and stopped: "I also didn't use the
agent tokens left in `cb4-agent-tokens.json`, because none was made for this session." It asked for
the state file to be copied there or the loop run on the laptop, and picked the laptop.

- It wrote nothing to the tracker: `sync?after=4921` read after it has 0 events whose holder is
  `orch-5e4a0f`.
- So a session there does not know which token is its own unless its prompt says, and step 1 as
  written ends a pass with no state file. Both are T4's (the second form of the health step, and
  `run.sh` giving the name).
- Every hook of the run answered exit 0 (16 `PreToolUse:Bash`, 16 `PostToolUse:Bash`, 2
  `PostToolUse:Read`, `UserPromptSubmit`, `SessionStart`). The `lopecode` MCP server was `failed` in
  this run and `connected` in the seven before it; not looked into.
- Memory over it: most used 570 MB.
- This is `bypassPermissions` letting a pass finish that started nothing. A pass that spawns a
  writer was not run.

### One review with `agent.sh`

`CHECKOUT=/data/lopecode-dev ./agent.sh reviewer "review issue wt-3-land-by-push. …"` in
`cloud-brain-dev`, 20:44:39 to 20:52:38 UTC, exit 0. The issue is closed; the task told the reviewer
it had no token of its own and was to write nothing, and to read the issue with `orch-5e4a0f`. Its
JSON line: `"turns":53,"ms":478671,"usd":2.31,"context":131212,"legs":1,"mode":"default"`, 4 tools.
It fetched its brief, made a view with `worktree.sh --at`, ran the issue's tests there and gave a
verdict ("pass. Nothing holds the change", 557 pass, 5 skip and 2 fail of 564 at that commit). So
`agent.sh` runs as root in `default` mode with its four allowed tools, with no `IS_SANDBOX`.

What it said the machine changed, each in its words and none checked again by the writer:

- "`lock.sh --wait` doesn't work on Linux. It relies on `sleep` refusing a huge number of seconds.
  GNU `sleep` 9.4 here accepts `2147483648` and `99999999999999999999` and just sleeps, so a bad
  `--wait` value hangs instead of giving exit 2." Each run of the test leaves such a `sleep`. This is
  the `lock.test.ts` failure of the suite above.
- "`worktree.sh --at` took 25 s to make the view. The brief says 1 to 3 s."
- The `topic-sql.test.ts` failure went when it built the notebook in its view.

### The stop, and what it loses

The owner asked that the machine be used or stopped (comment 4916). `fly machine stop`, 22:52:52
CEST; `stopped` at 22:52:57.35. The token's file was still on the volume (the command that removed
it printed nothing after its first part; read as: its `pkill -f "sleep 2147483648"` matched its own shell), so the machine was
started once more, 22:53:06.557, the file removed and `ls` of `.emitted` read without it, and
asked to stop at 22:53:08.774 (`stopped` 22:53:10.637, Fly.io's event list). That start, with 4.9G on the volume: `fly machine start` returned in 2.76 s.

Read at that start: `/root/.claude`, `/root/.bun` and `/usr/bin/node` absent, `/` at 33M; `/data`
with the checkout (4.9G) and `/data/t1` (1.1M: the streams of every `claude` run above, the logs).
So a stop loses the tools, Playwright's Chromium and `~/.claude` (the transcripts and the session of
the review), and keeps the checkout, its `node_modules` and what was written under `/data`. Getting
the tools back by hand took 53 s to Claude Code (19:36:50 to 19:37:43 UTC), then the two `bun install` and 16 s of Chromium.

Left on Fly.io: the machine `853145b4217618`, `stopped`, performance-2x with 4096 MB, and the volume
`vol_vz8zplwz3eexegjv`, 10 GB. Neither is destroyed: T2 can start from the checkout. The four
secrets are `Staged` as before. No token of the Brain and no deploy token of this task is anywhere.

### What the two sittings cost

Fly.io's price page, read 2026-10-12 through a fetch that answers with a summary, prices of `iad`
(those of `ams` were not read): performance-2x with 4 GB $66.00 a month, shared-cpu-2x with 2 GB
$13.39, more memory $6 a GB a month, a volume and a stopped root file system $0.15 a GB a month.
Over 730 hours that is $0.090 and $0.035 an hour for the two sizes used. The writer's arithmetic
from the event times above, not Fly.io's invoice:

```
first sitting    shared-cpu-2x, 4 GB    5 min 6 s + 1 min 18 s      $0.004
second sitting   shared-cpu-2x, 4 GB    21:07:28 to 21:36:35        $0.017
                 performance-2x, 4 GB   21:36:47 to 22:52:57        $0.115
                 of which idle, waiting for comment 4921: 22:21 to 22:43
```

About $0.14 of machine time, and $1.50 a month for the volume while it is kept, with $0.15 a GB a
month for the stopped machine's root file system, whose billed size was not read. The `usd` that the
`claude` runs printed (0.76 the pass, 2.31 the review, 0.73 summed over the seven probes) is the
subscription's, not a bill.

### For the design, before T2

- Part 1's size. shared-cpu-2x lost 90% and more of its CPU to the host after 5 minutes of work.
  performance-2x with 4 GB ran one headless Chrome at 3.0 to 3.3 GB used and did not finish
  `brain-issues` in the tool's 90 s. A machine that runs a seed's browser tests needs more of both;
  the design gives those to the laptop (a seed's change ends in a deploy), and a reviewer's
  `tests/tools` suite ran in 75 s with 1.3 GB.
- Part 1's "what starts". `IS_SANDBOX=1` with `--permission-mode bypassPermissions`, or a user that
  is not root. `HOME` set. Chromium installed with bun, not node 26.
- The submodules. `lopecode` at the recorded commit is on no remote; `lopecode-plugin` needs its key
  and alias (done here); the root `package.json` and `tools/package.json` each need `bun install`.
- `lock.sh --wait` on GNU `sleep`.
- The first sitting's: the Machines API has `exec`, and `files` writes a key with mode 0755.

## Not tried, both sittings

- A pass that starts an agent, and a pass under `/loop` to its own end. `/loop` with a small prompt
  and a `Monitor` were each run apart from the skill.
- A review that is recorded, and one with a tab.
- Memory with a writer at work; the tests were run by hand, one at a time.
- A set of a secret through the Machines API. Item 6 of the owner's list stays his until it is.
- `shared-cpu-4x` and larger, and what a shared CPU gives after it has been idle.
- The loop as a user that is not root.
- Why Chromium is slow there, and why node 26.11.1 stops at the end of Playwright's download.
- The same key's write to the other repository.
