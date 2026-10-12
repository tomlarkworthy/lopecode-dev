# fly-1-by-hand: one Fly.io machine by hand. Round 1 stopped at the trial's 5 minutes

T1 of `plan/cloud-brain-worker-machine-on-fly.md`. Run 2026-10-12 from 20:08 to 20:22 CEST by the
writer `impl-ebb0f2`, an agent of the orchestrating session on the owner's laptop, with his
`fly auth login` (`fly v0.4.115`). Every time below is from `date` on the laptop, from the machine's
`date -u`, or from Fly.io's own event list, and says which.

**T1 is not done.** The app's organisation has no card, and Fly.io stops such a machine 5 minutes
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

## Not measured

Each needs a machine that runs more than 5 minutes, or a tool the stop took away.

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
