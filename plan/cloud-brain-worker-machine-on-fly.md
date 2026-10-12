# Cloud Brain: a worker machine on Fly.io for the issue loop, started by the Brain and stopped by itself

Spec of the project `worker-machine-on-fly` (tracker of cb4, event 1628). Written 2026-10-11 22:20 to
22:45 UTC (2026-10-12 00:20 to 00:45 CEST, from `date`) by the spec writer `spec-29ad08`. Round 1 was
sent back by review 2886 (event 2887); round 2, written 2026-10-11 22:45 to 22:57 UTC (the first writing committed 22:50:48, the fresh
reader's findings taken by 22:57, from `date`), answers it under "Round 2" below, and the passages
where the design moved are marked (round 2). In round 1 a fresh agent with the file alone read it before the landing (`/review-notebook`: FIX, 9
findings and 7 minor, all taken; the last part says which changed the design).
Nothing is built. No Fly.io account exists that the writer knows of, and no call to Fly.io was made:
every statement about Fly.io below is from its documents, read through a tool that answers with a
model's summary of the page ("Read", below, says which).

Three things in it are findings of the reading and change what the issue's body supposed:

- **A deploy is signed with the recovery key** (`tools/cloud-brain/brain.ts`, line 6: "`infra.apply`
  with the recovery key"; the key is in `.emitted/cb4.json`). So are `brain.ts state` and `redistil`,
  which step 1 of every pass of the loop runs (`SKILL.md`, "One pass"; `brain.ts` lines 128 and 343).
  The machine does not get that file. So a loop there cannot deploy and cannot run its health step as
  written. The kept lock history has 21 holds of the deploy lock beside 96 of the landing
  lock (`issue-stats.ts`, below). The two are not joined: a landing with two deploys counts twice,
  and the 96 include landings that needed an act of the owner's.
- **The machine needs no Fly.io credential to turn itself off.** A machine whose first process exits
  is not started again under restart policy `no` (Fly.io's page on restart policy). The loop is that
  process. Only the start needs Fly.io's API, and only the Brain makes it.
- **`proxy.fetch` cannot be the proxy.** A caller of it with `secret: true` reaches every host of
  `proxyHosts` (`tools/cloud-brain/brain-proxy.ojs`, lines 16 to 19): a token given the method to
  start the machine would also spend the OpenRouter key.

## What was asked

The owner, 2026-10-11, to a session outside the loop, whole and in order (the issue's body has them):

> I think we need ssh access into the cluster so we can also run workers in a claude inside that self contained (with poppler and everything else we need). Start simple with a very basic image that we can use to build a bigger image if there is not CF service we can use. OR maybe a harzner box would be wiser for cost?

> Well we would not have work for the loop all the time, so we would be switching it off when the issue queue is finished with. Can Hezner be automated via API, digital ocean or something would be another option, we want a service proxy to be here and for us to be able to nearly set it up and manage it without going to another page, maybe jsut for initial billing setup?

> oh fly.io is interesting as well. Thats much more on and off on demand.

Asked whether to file Fly.io with a proxy service in the Brain as a project: "yes do it."

Beside it, 2026-10-07: "Don't build the serverside loop, we want to reuse notebooks and I think we will
end up using CloudFlare containers but that will be its own workstream." This project runs Claude Code
on a machine, as his laptop does. It runs no agent loop in a Worker. He has not said that it is part
of that workstream; the session that opened the issue read it so, and so does this spec.

## The reports gathered

`ia "list?parent=worker-machine-on-fly"` answered `{"issues":[]}` at 22:19 UTC: the project has no
parts. Its body is the one report. Three issues are linked to it:

| Issue | What it is here |
|---|---|
| `worker-machine-on-fly` (1628), the body's four readings and eight questions | R1 to R8 below; each question is answered under "The design" |
| `loop-order-of-service` (`building`), related | Not a requirement. Its order of a free place (`SKILL.md`, step 3) is what the loop on the machine runs, unchanged |
| `paper-summarizer-persona`, related: a subagent that needs poppler | R1 (poppler in the image). The laptop has it: `pdftotext -v` answered `pdftotext version 26.10.0` |
| `ai-tomarkdown-pass-through`, related | Left out: a way to read a PDF with no poppler, which the machine does not need |

## Requirements

| | Requirement | From |
|---|---|---|
| R1 | A machine that is not the owner's laptop runs the issue loop in Claude Code, with git, bun, poppler and a headless Chrome | "run workers in a claude inside that self contained (with poppler and everything else we need)" |
| R2 | It is running while the tracker has work the loop can take, and stopped when it has none | "switching it off when the issue queue is finished with" |
| R3 | A service of the Brain passes calls to Fly.io, and the machine is started, stopped and read from the Brain's page | "we want a service proxy to be here" |
| R4 | The owner goes to Fly.io's own page or tool once: the account, the billing, and what cannot be made without his login | "nearly set it up and manage it without going to another page, maybe jsut for initial billing setup" |
| R5 | The owner opens a shell on the machine | "ssh access" |
| R6 | The first machine is a plain image set up by hand; the image the loop runs in is made from what worked | "Start simple with a very basic image that we can use to build a bigger image" |
| R7 | The machine holds no recovery key, no deployer key, no Cloudflare token and no session of the owner | `philosophy.md`, the seven, 1; `rules.md`, Never ("Print, copy or log a secret"); the issue's body: "never the owner's state file" |
| R8 | The loop on the machine and a loop on the laptop do not take the same work, and what the machine costs in a day has a limit | The issue's questions "how the loop on that machine and a loop on the owner's laptop keep apart", "a cap on hours a day"; `philosophy.md`, the seven, 5 |

## What exists today, measured

**The queue** (`bun tools/cloud-brain/issue-stats.ts --token=spec-29ad08`, 2026-10-12 00:27 CEST):

```
record         2876 events, 280 issues
states         {"done":127,"rejected":22,"closed":62,"triaged":21,"open":30,"building":10,"awaiting-approval":6,"spec":2}
  open               273 stays  median    1.7 min  total 309.7 h  max 11.4 h
  ready              121 stays  median    2.7 min  total  49.6 h  max 17.7 h
  in-progress        187 stays  median    8.1 min  total  64.7 h  max 15.2 h
  in-review          181 stays  median    5.8 min  total  26.6 h  max 2.1 h
locks          122 holds in the history (the newest 500 are kept)
  land      96 released  median 20.3 s
  cb4       21 released  median 20 s
```

The medians are minutes and the totals are hours: an issue waits when no loop runs, which is when
the laptop is shut or the owner's session has stopped. The record begins 2026-10-10 and does not say for how many hours since a loop ran; nothing in the tracker marks a loop's start or stop (R8's lock, below, is
the first thing that would).

**What a loop needs from a machine.** Read from `SKILL.md`, `rules.md` and the tools; the last column
is whether it is in `.emitted/cb4.json`, the owner's state.

| Step | Command | Reads | Owner's state |
|---|---|---|---|
| Health, each pass | `brain.ts redistil`, `brain.ts state`, `lease.get` | recovery key, a session | yes |
| A token for an agent | `brain.ts agent-token` | `loop-agents` in `cb4-tokens.json` | no |
| Every tracker call, both locks | `issue-as.sh`, `lock.sh` | `cb4-agent-tokens.json` | no |
| Prior art | `knowledge.search --as loop-knowledge` | `cb4-tokens.json` | no |
| Docs at a landing | `knowledge-docs.ts`, by `lock.sh release land` | `loop-docs` in `cb4-tokens.json` | no |
| A seed's tests | `cloud-brain-dev/test.ts`, `tab-tests.ts` | nothing; a headless Chrome | no |
| A deploy | `brain.ts apply` | recovery key | yes |
| `approve` for the owner, a token a spec names, the shell, his quotes pushed | `--owner`, `brain.ts token`, `brain.ts shell` | a session, recovery key | yes |
| A push of `lopecode-dev` and `lopebooks` | `git push`; `.gitmodules` names `lopebooks` and `lopecode` by `https://github.com/…`, and the laptop's `lopebooks` remote was set to SSH by hand | an SSH key of GitHub | not in that file, his all the same |
| A digest: publish, and a message | `--as loop-library`, `--as loop-bluesky` (`agents/digest.md`) | `cb4-tokens.json` | no |
| A brief changed by the overseer | `cloud-brain-dev/put.sh`, `--as loop-roles` | `cb4-tokens.json` | no |
| A deploy's lines, the paper tool, a dashboard check | `--as loop-deploys`, `loop-papers`, `loop-dashboard` | `cb4-tokens.json` | no |

**The hooks expect the laptop.** `.claude/settings.json` line 18 ends a session that has no
`METADEV=1` ("Claude must be launched via metadev (safehouse sandbox)"), and `metadev` runs
`safehouse`, a sandbox of macOS installed with `brew`. Whether the other hooks (`scripts/*.sh`) run
on Linux was not tried.

**The size of a checkout** (`du -sh`, 2026-10-12 00:27 CEST, this laptop):

```
456.47 MiB  lopecode-dev pack (git count-objects -vH)
1.1G  .git/modules/lopebooks      863M  lopebooks (checked out)
345M  .git/modules/lopecode       131M  lopecode
3.2M  .git/modules/cloud-brain-dev  8.1M  cloud-brain-dev
3.2M  .git/modules/lopecode-plugin   92M  lopecode-plugin
301M  tools/node_modules
9.8G  vendor   (14 of the 21 submodules; no file under tools/cloud-brain/ or the skill names vendor/: grep, no match)
```

Without `vendor`, `lopecode-videos`, `lopecode.com` and `tomlarkworthy.github.io` that is about 3.3 GB
before worktrees. A worktree links `lopebooks` and `lopecode` and does not copy them
(`tools/cloud-brain/worktree.sh`, `link()`).

**Tools on the laptop**, for the image to match: `bun 1.4.0`, `node v26.7.0`, `git 2.55.0`,
`claude 2.1.296`, `jq 1.7.1`, `python3 3.14.7`, poppler 26.10.0, Playwright 1.57 with Chromium build
1200. `fly` and `flyctl`: absent.

**The Brain today.** `getSource?worker=brain-x-fly&part=reference` answers 404 and `fly.status` with a
token answers 403 "this token does not name com.lopecode.brain.fly.status" (both run 22:35 UTC).
`brain-x-container` leases Cloudflare containers of one image, `node:22-alpine`, 256 MiB, `exec` of
120 s at most, a lease of 6 hours at most, the disk gone at a stop (`tools/cloud-brain/brain-container.ojs`,
"Methods" and "Images").

## Read

**The Brain, by words.** The search by meaning the brief asks for was refused each of six times at
22:25 UTC: `{"error":"UpstreamFailed","message":"ai.v1/embeddings answered 402 owner has made 2000
priced calls today, which is the most for one day. The count is new at 00:00 UTC"}`. The same call
without `semantic=true` stood in, nine searches:

| Words | Entries | Used |
|---|---|---|
| `fly.io` | 1: `doc:cloud-brain-loop-order-of-service` | It names this project as the case that prompted it; nothing of Fly.io |
| `ssh` | 1: `doc:corepox-extracted-design` | Nothing |
| `container lease image` | 20; first `module:tomlarkworthy:brain-container` | The service's limits, above, and its `get`/`post` to a port as the shape of a pass-through |
| `secret third party token proxy` | 20; `module:tomlarkworthy:brain-proxy` second | Read whole: how a service names a secret, and the finding about `proxyHosts` |
| `claude code worker machine`, `orchestrator pool second machine` | 20 each; docs of the loop, and papers | `doc:cloud-brain-locks-held-in-the-cluster`: both locks are rows of cb4 so that "an agent in another checkout or on another machine meets the same lock" (`lock.sh`, header) |
| `scale to zero`, `poppler`, `hetzner` | 20 (retrieval papers), 1, 0 | Nothing |

A word search scores every entry 0 and orders by nothing the answer shows, so "first" above is the
answer's order.

**In the checkout, whole:** `brain-proxy.ojs`; the first four prose cells of `brain-container.ojs`;
`containers.md` to its price table; `brain-secrets.ojs` lines 7 to 16 (a secret is put by the owner's
own session, read by a Worker a rule names, held 5 s); `brain-snapshot.ojs` lines 369 to 371 (a
service with `crons` and `calls`); the three knowledge pages of the Brain; `brain.ts`, header.

**Fly.io's documents**, each read 2026-10-11 between 22:26 and 22:40 UTC through a fetch that
returns a summary and quotes. No page was read as its own text, so every line here is a claim read
in a summary; T1 is where each one that the design rests on is tried.

| Page | What it gave |
|---|---|
| https://docs.fly.io/machines/api/machines-resource/ | Under `/v1/apps/{app}/machines`: list, create (`skip_launch`), get, update, `DELETE`, `/start`, `/stop`, `/suspend`, `/wait?state=` (60 s by default), `/lease`, `/metadata`. `config`: `image` (required), `guest`, `mounts`, `init` (`exec`, `entrypoint`, `cmd`), `files` (`guest_path`, and `raw_value` or `secret_name`, base64), `env`, `auto_destroy`, `restart`, `metadata`. No `exec` endpoint is on the page (As built, `fly-1-by-hand`, 2026-10-12: `POST /v1/apps/{app}/machines/{id}/exec` answered 200 with a command's output; the record.) |
| https://docs.fly.io/machines/api/working-with-machines-api/ | `https://api.machines.dev` from outside, `Authorization: Bearer`. 1 request a second an action, 3 in a burst; get a machine 5 and 10. Its example makes the token with `fly tokens deploy` |
| https://docs.fly.io/machines/api/volumes-resource/ | Create: `name`, `region`, `size_gb` (3 by default), `encrypted` (true), `snapshot_retention` (5), `auto_backup_enabled` (true). "you can't make a volume smaller." One `attached_machine_id` |
| https://docs.fly.io/machines/api/apps-resource/ | `POST /v1/apps` with `app_name` and `org_slug`. Which token may: not said |
| https://docs.fly.io/machines/guides-examples/machine-restart-policy/ | `no`: "Never try to restart a Machine automatically when its main process exits, whether that's on purpose or on a crash." `on-fail`: started again on a code that is not 0, 10 times at most. The page does not use the word `stopped` for what follows an exit under `no` |
| https://docs.fly.io/reference/suspend-resume/ | Suspend is for "≤ 2 GB memory"; "Snapshots aren't guaranteed to persist"; a resume is "a few hundred ms", a cold start "~2+ seconds for common apps" |
| https://docs.fly.io/about/pricing/ | "Machines are billed by the second while they're running". "For stopped Machines we charge only for the root file system", $0.15 a GB a month. A volume $0.15 a GB a month. shared-cpu-2x with 2 GB $13.39 a month, more memory $6 a GB a month (the prices of `iad` and `ewr`; other regions differ and were not read). No free allowance for a new organisation; a trial of 2 hours of machine time or 7 days |
| https://docs.fly.io/security/tokens/ | A deploy token is for "managing a single app and its resources"; an org token for every app of an organisation; an SSH token for SSH to one app; `--expiry`, and "Tokens are valid for 20 years (175200h0m0s) by default"; `fly tokens revoke` |
| https://docs.fly.io/apps/secrets/ | "The API servers can only encrypt; they cannot decrypt secret values." Secrets reach a machine "as environment variables at boot time". Setting one restarts the machines unless `--stage` |
| https://docs.fly.io/flyctl/ssh-console/ | `fly ssh console`, `-C`, `--machine`, `--pty`. How it connects is not on the page |
| https://docs.fly.io/machines/api/secrets-resource/ | 404. Whether the Machines API sets an app's secrets was not read |

**Claude Code's documents**, the pages' own text: https://code.claude.com/docs/en/authentication
("generate a one-year OAuth token with `claude setup-token`"; it is read from
`CLAUDE_CODE_OAUTH_TOKEN`; "It can only make model requests"; "Bare mode does not read
`CLAUDE_CODE_OAUTH_TOKEN`") and https://code.claude.com/docs/en/headless (`claude -p` runs a
`/skill` named in the prompt, and "the run waits for each wakeup to fire and runs its iteration until
the loop ends" for a `/loop`).

**Not read:** Hetzner's and DigitalOcean's documents (the issue's body gives them from memory, and
the owner's third message turned to Fly.io); what a subscription's limits do to two loops at once.

## The design

Four parts. Each answers questions of the issue's body, named in its heading.

### 1. The machine (R1, R6, R7). Answers "where the loop's state lives", "size and region", "the first step small"

One Fly.io app, one machine, one volume.

- **Image**: a Dockerfile in `tools/cloud-brain/fly/`, written in T2 from the commands T1 ran by
  hand on `ubuntu:24.04`: git, bun, node, poppler-utils, jq, python3, Claude Code, and the Chromium
  that Playwright 1.57 names. The tools are in the image because a stopped machine starts again from
  its image (the issue's body, from Fly.io's page). Where the image is built is T2's to measure: the
  body's "Fly builds a Dockerfile on its own builders" is from memory.
- **Volume**: 10 GB at `/data`, $1.50 a month whether the machine runs or not. A stopped machine is
  billed for its root file system as well, $0.15 a GB a month; the image's size is not known before
  T2. It holds the checkout
  (3.3 GB above), worktrees, `~/.claude` (transcripts, memory) and
  `tools/cloud-brain/.emitted/issue-loop/` (the journal). 3 GB, Fly.io's default, is under the
  checkout alone.
- **Size**: shared-cpu-2x with 4 GB to begin: $13.39 + 2 x $6 = $25.39 a month running, $0.035 an
  hour (my arithmetic from the listed prices, over 730 hours). A pass runs writers, reviewers and a
  headless Chrome for a seed's tests; what that takes in memory was not measured on the laptop, and
  T1 reads it on the machine (`free -m` while one writer runs its tests). The body's shared-cpu-4x with 8 GB at $0.0706 an
  hour is the next size.
- **Stop, not suspend**: suspend is for 2 GB or less, and the checkout and the transcripts are on
  the volume, so a cold start loses nothing the loop kept.
- **Region**: `ams`. The owner is in CEST and cb4's containers are in `WEUR`. Not measured.
- **What starts**: `init.exec` is `tools/cloud-brain/fly/run.sh` on the volume, with
  `restart.policy: "no"`. It pulls `main`, updates four submodules (`lopebooks`, `lopecode`, `cloud-brain-dev`,
  `lopecode-plugin`), and runs
  `METADEV=1 claude -p "/loop /brain-maintenance" --permission-mode <mode>`. The machine is the
  sandbox in `safehouse`'s place: it holds what part 3 lists and nothing else of the owner's.
  `METADEV=1` is set because the hook asks for it, and the knowledge page that names `metadev` gets a
  line saying so (T5). `<mode>` is what T1 finds lets a pass finish with nobody to answer a prompt.
  Not `--bare`: bare mode reads no `CLAUDE_CODE_OAUTH_TOKEN` and no skill.

### 2. The loop there, and its end (R2, R8). Answers "who turns it on and off", "how the two loops keep apart"

**What the machine's loop does not do.** Everything in the table above with "yes" in the last column.

- *Health.* `SKILL.md` step 1 gets a second form for a session with no state file: both `lock.sh
  show`, and `GET /xrpc/com.lopecode.brain.fly.status` answering 200 in place of `redistil` and
  `state`. It is weaker: it does not see a Worker put back. A loop on the laptop still runs the whole
  step when it runs.
- *A deploy.* A writer there whose change needs `brain.ts apply` stops before step 10 of its brief:
  it pushes nothing, comments with what is built and tested in its worktree, and reports. The
  orchestrator there makes `back` with the reason and adds the label `laptop`. A loop with no state
  file starts no issue labeled `laptop`; the loop on the laptop takes it as any other. The label is
  also put at triage when the body already says a Worker changes.
- *The owner's acts.* None: no `--owner`, no `brain.ts token`, no `shell`. An issue that waits on
  one waits for the laptop's session, as today.
- *A digest, and oversight.* The machine holds no `loop-library`, `loop-bluesky`, `loop-roles`,
  `loop-deploys`, `loop-papers` or `loop-dashboard`. A loop with no state file starts no issue
  `digest-<day>` and spawns no overseer; an issue whose check names one of those tokens gets the
  label `laptop` as a deploy does. Each of the six can be given to the machine later by a line in
  "What the orchestrator makes"; none is in this round, to keep what the machine holds short.
- *A review that needs a tab (round 2).* `review-needs-tab.sh` exits 0 for a commit that touches a
  seed, a notebook or a module, and such a review needs the channel server and a paired tab, which
  the machine does not have in this spec. Its orchestrator spawns no reviewer for it and labels the
  issue `laptop`, as for a deploy. Such a submit is a laptop writer's in any case: a seed's change
  ends in a deploy, which the machine's writers do not make. `fly.work` counts it once at most,
  before the label.

The lock history gives the size of it and no more: 21 holds of `cb4` beside 96 of `land`, not joined.
T6 counts the issues labeled `laptop`, which is the number.

**One orchestrator at a time.** Nothing in the tracker says which session has a review in hand: an
orchestrator counts its own agents (`SKILL.md`, step 2), so two would each give a waiting review a
reviewer. A third lock of the cluster, `loop`, is held by the orchestrator that runs: taken before
its first pass as `orchestrator-<host>`, for 600 s as `land` and `cb4` are, and kept by its watch and
not by its passes (round 2, below) (`issue.lock`; the history has other names taken that way, `probe-lk-1-issue-lock-methods`.
`lock.sh` refuses a third name today, line 36: `case "$NAME" in land|cb4) ;; *) usage ;; esac`; T4
adds `loop` there). A session that finds it held does no pass.

**What keeps `loop` held (round 2).** Not a pass. A pass is not every 600 s: `SKILL.md` step 8 wakes
the orchestrator on a line of the watch or an agent's report, and its fallback is `ScheduleWakeup`
1800 s, so a live loop whose one writer works for 20 minutes makes no call in that time. What does
run all the while is the watch of that step: `issue-watch.sh`, armed as a `Monitor` with the
orchestrator's token, reads the tracker every 30 s (`issue-watch.sh`, line 33, `sleep "$every"`).
The script itself never exits (its line 4; lines 35 and 5 since `asks-orchestrator-label-and-watch`,
2026-10-12, which added a line to the header and a line to the filter); the `Monitor`'s `timeout_ms` ends it after 30 minutes,
and the orchestrator arms it again "in the same turn".

T4 gives the watch a flag, `--hold <who>` (its second and third arguments are taken: `<token>
[after-seq] [seconds]`). With it, every fourth read (120 s) it sends `lock.sh renew loop <who>` under
its token, which is the holder's. So `loop` is held while a watch of that orchestrator runs, and ends
600 s after the last renew of a watch that died, was not armed again, or whose session was closed or
slept. A session open on the laptop whose `/loop` the owner stopped arms no watch, so it holds
nothing 10 minutes later and the machine may start. 600 s is kept and not the method's 1800: it is
how soon the cluster learns that a loop is gone.

**When the hold lapses and the loop is still there.** A turn that takes more than 8 minutes to arm
the watch again, or a laptop that slept and woke. A renew of a lock that ended and that nobody took
is not refused: `lock.sh` answers exit 0 and "renewed after it had ended … nobody held it between"
(its lines 141 and 142), and the loop goes on. The hazard is the time not held, in which the tick's
"not held" is true. If the machine started in it and took `loop`, the laptop's renew is refused
(exit 1). The watch then prints a line, `LOOP <holder> holds it`, which is a wake, and the rule for
the orchestrator is: on any wake, whole pass or not, it starts nothing, resumes nothing and makes no
move while it does not hold `loop`. Agents it already started finish and report. The laptop's then
asks the machine to yield (below) and takes `loop` when it is released; the machine's, refused the
same way, ends as at a yield. Two orchestrators at once are then bounded by one read of the watch
after the wake of the laptop, 120 s, plus what the machine's agents had in hand.

With that, the three rules that read the lock read a live watch. The tick's "not held" (On) is no
orchestrator with a watch anywhere. A laptop session started between two passes of the machine finds
`loop` held. The tick's stop reads: the machine is `started`, and `loop` has not been held for 20
minutes counted from the later of the machine's last start (the service's row) and the lock's last
`until`. So a machine just started has 20 minutes to boot, pull and take the lock, and the stop fires
only for a machine whose watch is gone: a `claude` that died without `run.sh` ending, or one that
hung, whose `Monitor` ends at its 30 minutes with no turn to arm it again, so about an hour after
the hang at the longest.

Whether `claude -p` keeps a `Monitor` running with no terminal is T1's to see. If it does not, the
keeper is `run.sh`, on the machine only. A renew under another token than the holder's is refused
(`lock.sh`, line 22), so in that form `run.sh` makes the session's `orch` token itself before it
starts `claude` (`agent-token orch fly:<machine id>`), gives the name to the session in its prompt,
and renews with it every 120 s while two things hold: the `claude` process lives, and the session's
transcript under `~/.claude` was written in the last 45 minutes. The second is what a hung `claude`
fails, so the tick's stop still finds it. The laptop is not changed by this form.

The
laptop's loop, started by the owner, asks the machine's to yield with `fly.down`, which stops
nothing at once: it sets a row, `yield`. The machine's watch is armed with a second flag, `--yield-as fly-status`, which the
laptop's call leaves out (it holds no such token): with it the watch reads `fly.status` with each
renew and prints a line when `yield` is set, which is a wake (round 2: a pass may be 30 minutes off); with `yield` set the orchestrator starts nothing, waits for its running agents to report, ends
their tokens, releases `loop` and ends. A writer between `take land` and its push finishes its
landing first. The laptop's loop takes `loop` when it is released. If the machine is still `started`
30 minutes after the yield, the tick stops it with `POST …/stop`; what that leaves is an issue at
`in-progress` whose writer is gone, which is the row "a starter that cannot go on" of `SKILL.md`
step 3, and the machine's agent tokens, which the laptop's session ends by name with `brain.ts
agent-token --parent fly-agents revoke <name>` (round 2: the command reads `PARENT = "loop-agents"`
today, `brain.ts` line 514, so from the laptop it neither lists nor ends a child of `fly-agents`; T4
adds the flag. The laptop made `fly-agents` and keeps its value). His session has the state file and
his attention, so it is the one that goes on. The owner's Stop button is `fly.down?now=true`: the
stop at once. The service clears `yield` when it sees the machine `stopped`, and `fly.up` and the
tick's start clear it too, so a later start does not meet an old one.

**On.** `brain-x-fly` (part 3) has a cron of 5 minutes. A tick starts the machine when all hold: the
machine is `stopped`; the lock `loop` is not held; the day's hours are under the limit; and
`fly.work` is not empty. `fly.work` is the table of `SKILL.md` step 3 as a function: an issue is
work when its row there spawns an agent or makes a move, and it is not labeled `needs-owner` or
`laptop` and is no digest. So it leaves out what that table answers "Nothing" for (`hidden` or
`security`, `awaiting-approval`, `open` of kind `feedback`, a project at `open` with fewer than three
parts) and takes in a round sent back at `in-progress` or `spec`. T3 writes it from the table as it
is that day, with one test for each row. Whether `issue.list` answers enough for every row (a
`held:` comment is read from comments by `issue-stats.ts`) was not checked; `calls` grows by what
T3 finds it needs. The same function is the first thing `run.sh` asks, so the tick and the machine
cannot disagree.

The function can still be wrong about what a loop does. So the service keeps the ids of `fly.work`
at each start: when the machine stops with that set unchanged, the tick does not start it for the
same set again for 4 hours (`config.sameSetHours`). One wasted start a set each 4 hours, not one
each 5 minutes until the day's limit. (Round 2: the 4 hours. With no end, a stop for any other cause
with the set unchanged left those issues to the laptop for good.)

**Off (round 2: one pass, not three).** The loop ends itself: after one whole pass in
which the table of step 3 had no row to act on, with no agent running. A pass that started nothing
for another cause is not that pass: one that names a usage limit (`SKILL.md`, step 2), or one whose
health step failed. The loop then waits for its next wake, and the machine idles at $0.035 an hour
under the day's limit. Three such passes are three fallback wakes, 90 minutes of a
machine doing nothing, and the tick asks the same `fly.work` 5 minutes after any stop, so the second
and third bought nothing. At that pass (whether `claude -p` keeps the wakeups and the watch of `SKILL.md` step 8 going with
no terminal is T1's to see) the orchestrator releases `loop` and ends its `/loop`. `claude -p` returns, `run.sh`
exits 0, and under policy `no` Fly.io does not start the machine again. No token of Fly.io is on the
machine. Two things stand behind it, both in the service: `fly.down`, above, and the tick,
which stops a machine that is `started` while `loop` has not been held for 20 minutes (no watch for
20 minutes: a loop that died with its process still up) or when the day's limit is reached. The
machine's own end is at a pass, so it comes within one fallback wake, 30 minutes, of the last work;
the tick's stop cannot come first while the watch runs.

**The limit.** `config.maxHoursADay`, 8 when not set, changed with `config.set` and no deploy. The
service keeps each start and stop it saw as a row and sums the day in UTC. At $0.035 an hour, 8 hours
is $0.28 a day. What the loop spends on the model in those hours is the subscription's and is not
counted here; a pass that names a usage limit already starts nothing new (`SKILL.md`, step 2), and does not end
the loop (above).

### 3. The service `brain-x-fly` (R3, R7). Answers "the proxy", "the secrets"

A new seed, `tools/cloud-brain/brain-fly.ojs`, module `@tomlarkworthy/brain-fly`. It names one
secret, `FLY_API_TOKEN`, and one host, `api.machines.dev`. The app's name is `config.app`.

| Method | Who | What |
|---|---|---|
| `fly.get` | the owner's own session (`allow: "caller.session"`, fixed) | query, `?path=`. A GET to `https://api.machines.dev/v1/apps/<app>/<path>`, the answer as it is |
| `fly.post` | the same | procedure, `?path=&method=`. The body as it is; POST, PUT or DELETE. The path cannot leave `/v1/apps/<app>/` |
| `fly.status` | `workers` | query. `{ app, machine: { id, state, region, image, guest }, volume, hoursToday, maxHoursADay, loop: <holder or null>, yield: <since or null>, work: <n> }` |
| `fly.work` | `workers` | query. `{ work: [ids] }`: the issues the test of part 2 counts. Built in T3, with the service (round 2) |
| `fly.up` | `workers` | procedure. Starts the machine when it is stopped and the day is under its limit. `{ started, state }`; 409 with the reason otherwise |
| `fly.down` | `workers` | procedure. Sets `yield`; the tick stops the machine 30 minutes later if it still runs. `?now=true`, the owner's own session: `POST …/stop` at once. `{ state, yield }` |
| cron `*/5 * * * *` | | the tick of part 2 |

`calls`: `issue.list`, `issue.locks`. `resources`: `rows`. Each method is free: the cost is Fly.io's
bill to the owner and the limit is hours, not a price a call (nothing here spends the Brain's
money).

`fly.get` and `fly.post` are Fly.io's own shapes with the host and the app fixed ("No abstractions
over Cloudflare's own API where a pass-through will do",
`knowledge/working-with-cloud-brain-remote-lopecode-cluster.md`, "Standing rules from Tom"; said of
Cloudflare and taken as said of a provider). They are the owner's alone because `post` makes a machine of any size and any `env`, and
`get` of a machine answers its `env`. Making the machine and the volume, changing the image and
deleting are done with them. `up`, `down`, `status` and `work` add what Fly.io's API has no word
for: the one machine of this Brain, the day's limit, and the queue.

A panel in the module (`viewof flyView`, as `containerView` in `brain-container.ojs`): the state, the
hours of the day against the limit, who holds `loop`, the count of work, and two buttons, Start and
Stop. Setting the machine up from the page is a form over `fly.post` with the three bodies of T3
filled in (the volume, the machine, a change of image), shown to the owner signed in.

**Where each secret is.**

| Secret | Where | Who puts it |
|---|---|---|
| Fly.io deploy token, one app, 90 days | the Brain's secret `FLY_API_TOKEN`, rule `caller.worker in ["brain-x-fly"]` | the owner, on the Brain's page |
| `CLAUDE_CODE_OAUTH_TOKEN` (one year, model requests only) | a secret of the Fly.io app, an environment variable at boot | the owner |
| Two GitHub deploy keys with write, `lopecode-dev` and `lopebooks` | secrets of the Fly.io app, written to `~/.ssh` by `files` with `secret_name`. GitHub takes the first key SSH offers, so each repository has a host alias in `~/.ssh/config` and its remote names the alias (T2); `lopecode-plugin` is fetched by `https` (As built, `fly-1-by-hand`, 2026-10-12: `.gitmodules` names it by `git@github.com:`, and it was cloned with a third, read-only key, `DEPLOY_KEY_LOPECODE_PLUGIN`, and its own alias; the record.) | the owner |
| The Brain's tokens for the machine (below) | one secret of the Fly.io app, written as `.emitted/cb4-tokens.json` by `files` | the orchestrating session on the laptop makes the file; how it is set is under "What only the owner can do" |

An agent on the machine can read all of the last three: they are in its environment and its files,
as the laptop's are in the laptop's. What a page it reads could make it send out is a Claude login
that makes model requests, two keys that push two repositories, and tokens for `issue.*`,
`knowledge.search` and `knowledge.put`. What the key of `lopecode-dev` is worth (round 2): a push to
`main` carries `.claude/settings.json`, the hooks and the briefs, which the laptop's sessions then
run beside the recovery key. An agent on the laptop can make that push today, so it is no new reach;
it is the most that the machine holds. On the laptop the same agent's shell reads the recovery key.

### 4. A shell for the owner (R5). Answers "SSH for the owner without another page"

`fly ssh console -a <app>`, with `flyctl` on his laptop and his Fly.io login. No `sshd` and no key
in the image, and no port open to the internet: the machine has no public address and no `services`.
This is a second tool and not the Brain's page; it is taken because the other two ways each open
something (below). Whether it works against an image with nothing added is T1's first check.

### Not chosen

- **A row in `proxyHosts` for `api.machines.dev`.** Two lines. Then a token that names `proxy.fetch`
  starts the machine and also calls OpenRouter and Anthropic with the Brain's keys, and any path of
  Fly.io's API with the token's reach. The start has to be callable by a token (the cron is a Worker,
  and the laptop's loop yields with `fly.down`), so the host is fixed in a service of its own.
- **An org token, so that the Brain makes the app.** It manages one organisation and its resources,
  apps among them (the tokens page, in the summary's words): every app the owner ever puts there. A deploy token for one app, with the app made
  once at the billing visit, is the narrower (the seven, 1).
- **A Fly.io token on the machine, so that it stops itself through the API.** The exit does it.
- **The recovery key on the machine, so that it deploys.** It signs every deploy of every Worker,
  the kernel among them. What needs a deploy waits for the laptop in exchange.
- **A terminal served through the Brain** (a WebSocket of the service to the machine). It is the
  page he asked for. It needs the machine reachable from a Worker, so a public port or a WireGuard
  peer in a Worker, and a login in front of a root shell. A later project if `fly ssh` is not enough.
- **`sshd`, a key and a dedicated IPv4.** $2 a month (the pricing page) and a port on the internet.
- **Cloudflare Containers** (`brain-x-container`): 256 MiB, 120 s a command, 6 hours, the disk gone
  at a stop, and a custom image needs a registry push that nothing here does yet. Its measured record
  is `containers.md`. The owner's "if there is not CF service we can use" is answered by those four.
- **Hetzner, DigitalOcean.** Not read. The body, from memory: a server powered off is still billed.
- **Two orchestrators at once, apart by a label an issue.** More throughput when both run. It needs
  a claim on every review and every resumed round; the lock is one row. Worth a spec of its own when
  the record shows both wanting to run.
- **Starting the machine from the tracker at the move to `ready`.** At once and not within 5
  minutes. It puts a call to another service inside `issue.move`; the median stay at `ready` is 2.7
  minutes with a loop running and hours with none, so 5 minutes is not what an issue waits for.

## How each requirement is known to be met

Each command is run from the main checkout with a token of the loop. `loop-fly` is under "What the
orchestrator makes". **None of the checks of R1 to R6 and R8 can be run before its task is built:
there is no account, no app and no service.** The two that could be run today were, at 22:35 UTC, and
answered what "before" says.

| | Check | Before (run) | After |
|---|---|---|---|
| R3 | `curl -s -o /dev/null -w "%{http_code}" "https://cb4.endpointservices.workers.dev/xrpc/com.lopecode.brain.getSource?worker=brain-x-fly&part=reference"` | `404` | `200`, after T3. Not run |
| R3 | `BRAIN_BASE=cb4 bun tools/cloud-brain/brain.ts curl /xrpc/com.lopecode.brain.fly.status --as loop-fly` | with `loop-knowledge`, there being no `loop-fly`: 403 "this token does not name com.lopecode.brain.fly.status" | 200 with `machine.state`, after T3 and the owner's secret. Not run |
| R3, R7 | `bun test.ts brain-x-fly --with <built module>` in the worktree's `cloud-brain-dev/`: the tests of T3, among them that `fly.post?path=../../other` is refused with no upstream request, that a token is refused `fly.get`, that `meta.secrets` is `["FLY_API_TOKEN"]` and `meta.calls` the two of part 3 | no seed | every test passes; the writer of T3 gives the count its run gave |
| R1, R6 | `fly.status` answers `machine.image` as the image T2 pushed, `fly.status` answers `loop` as `orchestrator-<the machine's host>`, and the tracker has a `moved` event whose `by.holder` is the name of a line with the note `orch; fly:<machine id>` in `brain.ts agent-token --parent fly-agents list` (round 2: without the flag the list is of `loop-agents` and has no such line) | no such token, no such flag | after T4b. Not run |
| R2, on | With `loop` not held and one issue at `ready` and not labeled: `fly.status` twice, 6 minutes apart; `machine.state` goes `stopped` to `started` | | after T4b. Not run |
| R2, off | With `fly.work` answering `{"work":[]}`: `fly.status` each 5 minutes; `started` to `stopped` within 35 minutes of the last move of a token of the machine (one fallback wake and one tick), with `loop` held until the pass that ends it and no `fly.down` in the core's lines of that span (`metric.query` over `method: "fly.down"`, with `loop-dashboard`, if T3 defines the metric; else the rows `fly.status` sums) | | after T4b. Not run. If the machine does not reach `stopped` on the exit, the restart-policy page was read wrong and the tick's stop is what ends it: the check then says which |
| R7 | On the machine, by the machine's own loop as a step of T4b's record: `ls tools/cloud-brain/.emitted/` holds `cb4-tokens.json`, `cb4-agent-tokens.json` and `issue-loop`, and no `cb4.json`; `env` has no name beginning `FLY_API` or `CF_` | | after T4b. Not run |
| R8, apart (round 2) | `LOCK_TOKEN=<token> tools/cloud-brain/lock.sh show loop`, asked each 5 minutes for the 25 minutes after a whole pass, while one writer of the machine works and before the next fallback wake: exit 0 and `orchestrator-<the machine>` each time, the `until` later each time (the watch's renews); a `take loop` under another name exits 1. And in `tests/tools/`: the watch against a stand-in sends a renew at its fourth read and none without `--hold`, and prints the `LOOP` line on a renew that exits 1 | `LOCK_TOKEN=spec-29ad08 lock.sh show land`, run 22:49 UTC: `land is not held`, exit 1. `show loop`: refused by line 36, not run | the test with T4; the 25 minutes after T4b. Not run |
| R8, limit | `test_fly_up_refused_past_the_day` in the seed: with rows summing 8 hours, `fly.up` answers 409 and makes no upstream request | no seed | passes, T3 |
| R4, R5 | Not an agent's: the owner's list | | |

What only the owner can measure, and no condition of a task landing: that Start and Stop on the page
do what they say with his session, that `fly ssh console` opens for him, and Fly.io's invoice against
`hoursToday`.

## The tasks, in the order they land

Each is one writer and one review, but T4b, which is the owner's act and a record of it. T1 cannot start before the owner's list, items 1 to 5.

1. **T1, by hand, a record and no code** (`tools/cloud-brain/records/fly-1-by-hand.md`). It is run
   in a session on the owner's laptop that he starts after `fly auth login`, with no other loop
   running (the lock `loop` does not exist before T4). With his deploy token in that shell and `curl`
   against `api.machines.dev`: a volume and a machine of `ubuntu:24.04`. The shell on it is `fly ssh
   console -C`, with his login: the Machines API page has no `exec`. (As built, `fly-1-by-hand`, 2026-10-12: the API has one, and `fly machine exec` was the shell used most; the record.) Install the tools, clone, run
   one pass of the loop with one `orch` token copied there for the hour and no state file, and one
   review with `cloud-brain-dev/agent.sh` (round 2; its brief is fetched with no token). A review
   that needs a tab is not tried there (part 2, the fifth thing the machine's loop does not do). It measures, each with its
   time from `date`: create to `started`; a start from `stopped`; whether exit 0 of the first process
   under policy `no` leaves the machine `stopped`; memory while a writer runs its tests; which
   permission mode lets a pass finish; whether a `Monitor` and a `ScheduleWakeup` run under `claude -p`; which hooks fail on Linux; whether a deploy token makes
   machines and volumes and sets secrets; how `files` with `secret_name` writes a file; a push of
   each of the two repositories with its own key. Every line of
   "Read" that came from a summary and that parts 1 to 3 rest on is tried here. A result that breaks
   a part of this design is a comment on the project before T2.
2. **T2, the image and `run.sh`**: `tools/cloud-brain/fly/Dockerfile`, `run.sh`, and where the image
   is built and kept, from T1's commands. Tests: `run.sh` against a stub `claude` exits 0 when
   `fly.work` is empty, without starting it.
3. **T3, `brain-fly.ojs`**: the service of part 3 with its tests, `fly.work` from the table of
   step 3 with a test for each row (round 2: it was in T4, with a deploy of its own), the panel, the
   metric of its calls; deployed by the loop on the laptop. It declares a secret and no Cloudflare permission.
   `brain.ts confirm` if on probation. Before the owner's secret is put, `fly.status` answers 400
   "the secret FLY_API_TOKEN is not set", and that is what its writer's check reads.
4. **T4, the loop's own files, no seed and no deploy** (round 2: cut at the deploy): `loop` in
   `lock.sh`; `--hold` and `--yield-as` in `issue-watch.sh` (the renew, the `LOOP` line, the line for `yield`),
   with their tests; no move without `loop` on any wake; `SKILL.md`
   steps 1 and 8 (the take, the second form of the health step, the one empty pass that ends a
   loop); the label `laptop` in the writer's brief and at triage; no digest, no overseer and no tab
   review with no state file; `agent-token --parent`; the tool that writes the machine's token file.
5. **T4b, the first run**: the owner makes the volume and the machine from the page's form and
   presses Start. A record, `tools/cloud-brain/records/fly-4b-first-run.md`, with the first issue a
   token of the machine moved and the R1, R2, R7 and R8 checks run there.
6. **T5, the docs**: `knowledge/` gets a page for the machine (start, stop, the shell, a new image,
   the limit, what it cannot do), linked from the Brain's index page, with the line about `METADEV`;
   `spec-as-built.md` and the backlog.
7. **T6, after 7 days of it**: `issue-stats.ts` again beside the numbers above (the totals of `open`
   and `ready`), `hoursToday` summed, the count of issues labeled `laptop` and how long each waited.
   It says whether the size, the limit and the one-orchestrator rule stay, and gives the longest
   stretch `loop` was not held while a loop ran (the lock's history, `issue.locks?history=`).

## What the orchestrator makes

| Name | Methods | Command | Needed by | What holds it to its use |
|---|---|---|---|---|
| `loop-fly` | `fly.status fly.work fly.up fly.down` | `brain.ts token loop-fly fly.status fly.work fly.up fly.down` | T3's checks; the laptop's loop, to yield | The methods reach no further: `fly.get` and `fly.post` are refused to every token |
| `fly-agents` | `issue.*`, `--delegate` | `brain.ts token fly-agents 'issue.*' --delegate` | T4b: the machine's `agent-token` | It is the parent of the machine's agents and of nothing on the laptop, so the machine's are told from the laptop's |
| `fly-knowledge` | `knowledge.search` | `brain.ts token fly-knowledge knowledge.search` | T4b | One read |
| `fly-docs` | `knowledge.put knowledge.list` | `brain.ts token fly-docs knowledge.put knowledge.list` | T4b: the docs step of a landing there | As `loop-docs`: not held to kind `doc`, an agreement (`rules.md`). (Since `sd-1-doc-files`, 2026-10-12, the docs step also puts each doc's file: `knowledge-docs.ts` calls `static.put` and `static.list` too, and `loop-docs` names the four. A token of two methods is exit 2 at the step; `tools/cloud-brain/records/sd-1-doc-files.md`.) |
| `fly-status` | `fly.status fly.work` | `brain.ts token fly-status fly.status fly.work` | T4b: `run.sh`, the watch and the health step on the machine | Two reads. The machine gets no `fly.up` and no `fly.down` |

The last four are what the machine holds. The briefs and the tools read three names literally:
`loop-knowledge` (`agents/implementer.md`, `agents/spec.md`), `loop-docs` (`knowledge-docs.ts`,
`TOKEN = "loop-docs"`) and `loop-agents` (`brain.ts agent-token`). So the machine's
`cb4-tokens.json` is written with those three names over the values of `fly-knowledge`, `fly-docs`
and `fly-agents`, and `fly-status` under its own. No brief changes. On the Brain the names are the
`fly-…` ones, which is what `token list` and a revoke show. The values the laptop's loop uses do not
leave it. T4 has a tool that writes that file from the four, without printing a value.

## What only the owner can do

1. A Fly.io account and its billing, on Fly.io's page.
2. `brew install flyctl`, `fly auth login`, `fly apps create <app>`, and
   `fly tokens create deploy -a <app> --expiry 2160h`. Whether Fly.io's page makes an empty app and a
   token without `flyctl` was not read.
3. Put that token on the Brain's page as the secret `FLY_API_TOKEN` with the rule
   `caller.worker in ["brain-x-fly"]`. For T1 it is also in the shell of the session he runs T1 in.
4. `claude setup-token`, and its value as the app's secret:
   `fly secrets set --stage CLAUDE_CODE_OAUTH_TOKEN=… -a <app>`.
5. Two deploy keys with write, one a repository (`ssh-keygen`, then GitHub's page of each
   repository, or `gh repo deploy-key add --allow-write`), and each private key as a secret of the
   app.
6. The machine's token file as a secret of the app. The orchestrating session makes the file; the
   value is set by him with `fly secrets set --stage`, or by the session through `fly.post` in his
   tab if T1 finds the Machines API sets secrets. Until T1 says which, it is his.
7. Make the volume and the machine from the page's form (T4b), and press Start the first time.
8. Approve the label `laptop` and the lock `loop` as changes to the loop's procedure, and the new
   Worker `brain-x-fly` with its secret (`agents/implementer.md`, step 3, puts a new Worker and a new
   secret to him). His approval of this spec is read as that
   word, and as his word that a session on the machine sets `METADEV=1` with no `safehouse` under
   it: the hook that asks for the variable is there to keep a session inside that sandbox, and on
   the machine the machine is the wall (round 2, note 2 of the review).

Items 1, 2, 4 and 5 are another page or another tool, once. He asked for "maybe jsut for initial
billing setup"; items 2, 4 and 5 are more than billing, and each is a credential that only his login
makes.

## One choice of this spec that the owner may want the other way

The machine cannot deploy, because the recovery key stays on the laptop. That is this spec's choice
by the first of the seven, and the second (self-healing without him) pulls the other way: every
change that needs a deploy waits for a session on his laptop, and how many that is is not known
before T6. A is as written. B is a deployer method that takes a deploy of a
`brain-x-*` service from a token, which is a change to the deployer and his to make. The spec takes
A, and T6 counts what A cost.

## Round 2: review 2886

The review (event 2886, by `rev-0f04ca`, verdict `changes`) answered its four questions yes and
held the change on one finding, quoted:

> The lock `loop` does not stay held between the passes of the loop that holds it, and three rules of part 2 read it as though it did.

Read again before answering, each as the review gives it: `SKILL.md` step 8 (lines 304 to 318: the
watch reads every 30 s, ends after 30 minutes, and "`ScheduleWakeup` 1800 s as the fallback");
`lock.sh` lines 2 and 7 (600 s for a take and for a renew); `brain-issues.ojs` (`lockMax`, 1800);
`brain.ts` line 514 (`PARENT = "loop-agents"`). All four are as the review says. Since the submit
`origin/main` has one more commit, `8b4d5245`, the writer's own line in the Runs of `/review-notebook`.

| The review | What changed, and where |
|---|---|
| Finding 1: `loop` ends between passes; the tick starts a machine beside a live laptop loop, a laptop session takes the lock beside the machine, the tick stops a machine at work, and the check "R8, apart" reads exit 1 | Part 2, "What keeps `loop` held": the watch renews it every 120 s, not the pass. The three rules are each said again there. "Off" is one empty pass and not three, so the tick's stop is not what ends an idle machine. The checks "R8, apart" and "R2, off" are rewritten |
| Note 1: `agent-token list` and `revoke` read the parent `loop-agents` | `--parent fly-agents`, in T4; the R1/R6 check and the yield use it |
| Note 2: item 8 of the owner's list does not name `METADEV=1` | Named there |
| Note 3: what the push key is worth | Part 3, under the table of secrets |
| Note 4: T4 is seven things and has a deploy in it | `fly.work` is in T3 with the service; T4 is the loop's files with no deploy; the owner's making of the machine and the checks are T4b |
| Note 5: T1 measures no review; a review with a tab needs the channel server | T1 runs one review with `agent.sh`; a review that needs a tab gets the label `laptop` (part 2) |

Not chosen for finding 1: a row of the service that the orchestrator writes at each wake, read stale
after 45 minutes. It needs no change to the watch. It rests on the longest gap between two wakes,
which is 1800 s and the length of the turn after it, and a turn has no bound; and a loop that died
would be read as live for 45 minutes. And a renew of 1800 s at each pass: the fallback's own length,
so it ends at the moment the next pass begins. A second fresh reader read the diff of this round before its landing (`/review-notebook`, changes
since `728e3f11`: FIX, 12 findings and 6 minor, 119,461 tokens, 4m41s; all taken). What it found
that the first writing of this round had wrong: a renew after the lock ended is not refused, so the
orchestrator had no signal; a laptop that woke beside a started machine went on acting on wakes
until its next whole pass; the watch's second argument is taken; `run.sh` could not renew a lock
taken under the session's token, and would have hidden a hung `claude` if it could; one empty pass
with a usage limit stopped the machine and the unchanged-set rule kept it stopped; the tick's 20
minutes had no start; nothing cleared `yield`; and the tab-review rule was in T1's text only.

## What the fresh reader changed

Run 2026-10-11 about 22:35 to 22:41 UTC, 114,587 tokens. Four of its findings changed the design:
the machine's token file used names no brief reads (now the names the tools read, over the machine's
own values); the test for "on" was not the loop's own table and could start the machine for nothing
each 5 minutes (now `SKILL.md` step 3 as a function, and no second start for an unchanged set);
`fly.down` stopped a loop in the middle of a landing (now a yield read at a pass, with the stop 30
minutes behind it); T1 needed a Claude login, a key and a shell that its prerequisites did not give.
It also found "21 of 96 landings" to be two counts side by side and not a join.

## What misled the writer of this spec

- Step 4 of the brief gives one search command, with `semantic=true`. It answered 402 six times
  (the owner's 2000 priced calls of the day were used by 22:25 UTC) and the brief has no second form.
  The first script took the answer for an empty list and printed a `KeyError`.
- The issue's body asks "which Brain tokens the worker holds" as though tokens were the whole of it.
  The recovery key behind `apply`, `state` and `redistil` is in no brief's list of what a loop needs;
  it was found by reading `brain.ts`.
- `pdftotext --version` on the laptop prints "I/O Error: Couldn't open file '--version'", which reads
  as absent. `pdftotext -v` is the form.
- The brief says a command a check names is run before the submit. For a project whose first task
  is an account that does not exist, two of ten checks could be run. The table says so in each row.
