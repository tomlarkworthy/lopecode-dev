# Cloud Brain: a command on the Fly machine as a method, for the owner and for a Worker he has blessed

Spec of the feature `fly-exec-for-blessed-services` on cb4's tracker. Written 2026-10-13, begun
08:49 CEST (the `spec` move, event 6106), from `lopecode-dev` `3a159fbf`. Nothing here is built.
The method of "The design" was made once in the worktree as a trial, its tests were run, and the
edit was taken back; the counts under "How each requirement is known to be met" are that run's.
Round 2, 2026-10-13 09:03 CEST: the finding of review 6155 is answered under "Round 2: review 6155"
at the end, and the text it names is changed: a blessing is now a delegation and its id in a
setting of the service, and the trial was run again with that.

The design adds one method, `fly.exec`, and one setting, `blessed`, to the service `brain-x-fly`,
and nothing else that stays: no Worker, no token, no role. A blessing is a delegation, which the
core has had since 2026-10-10, whose id the owner has put in that setting.

## What was asked

Tom, 2026-10-13, before 08:47 CEST, to a session he was present in (token `out-5f56b2`), as the
body of the issue and comment 6096 of `worker-machine-on-fly` have it, whole:

> as long as the secret is only availible to the fly service I think that is ok. It seems like it might be useful functionality that we shoudl expose but only the owners of the fly machine are able to use it for services they have blessed.

He was answering that session's question about comment 4258 of `worker-machine-on-fly`: Fly.io's
Machines API has `POST …/machines/ID/exec`, so the holder of `FLY_API_TOKEN` runs a command on the
machine as root, which the spec of that project had supposed it could not.

His first sentence is a condition, and the session that asked read it as met (comment 6096). His
second sentence is this spec. He named no service that needs it, and none exists: no seed but
`brain-fly.ojs` names a `fly.` method (`grep -l "brain\.fly\." tools/cloud-brain/*.ojs`, one file).

Four things his words do not say. Each is decided below, and each decision is marked.

1. "the owners of the fly machine". The design's reading: the Brain's owner, of the one machine
   the setting `machine` of `brain-x-fly` names. A member with a machine of their own is not
   designed for; there is none.
2. "services they have blessed". The design's reading: a Worker of the Brain the owner deployed,
   which holds a delegation of his whose id he has put, in his own session, in the setting
   `blessed` of `brain-x-fly`. Not a token, and not a member's Worker.
3. Whether a blessing names commands. The design's reading: it does not. A blessed Worker runs any
   command, as root. This is the one choice he may want the other way ("One choice", below).
4. Whether a blessing ends by itself. The design's reading: the form that makes one gives it an
   end, 7 days when he types none.

## The reports gathered

`issue.list?parent=fly-exec-for-blessed-services` answered no issue at 08:49 CEST. The issue is
linked `related` to `worker-machine-on-fly`, whose comment 4258 is the finding.

| Report | Becomes |
|---|---|
| The issue's body, his second sentence | R1 to R4 |
| The issue's body, his first sentence ("the secret is only availible to the fly service") | R5 |
| `worker-machine-on-fly`, comment 4258: "the Brain's page could give the owner a command on the machine with no `flyctl`" | R2, and the Run box of task 2 |
| The issue's body: "A method of its own is one line of the log a call and a rule he can read" | R1, R6 |

## Requirements

- **R1.** A method of its own, `fly.exec`, runs one command on the machine the setting `machine`
  names, and on no other machine and no other path of Fly.io's API.
- **R2.** The owner calls it from his own session.
- **R3.** A Worker of the Brain that he has blessed calls it. No other Worker does, and no token,
  member or member's Worker.
- **R4.** He makes a blessing and takes it back in his own session, with no deploy; he can list
  them; a blessing taken back is refused within the 5 s a core instance keeps a row. A Worker that
  holds a delegation of his for another job, however wide its scope, is not blessed by it.
- **R5.** The secret stays the service's: the rule of `FLY_API_TOKEN` is not changed, and no
  answer and no log line of `fly.exec` has it.
- **R6.** Each call writes one log line that says who called and which program, and no argument.
- **R7.** `fly.get` and `fly.post` are as they are: the owner's own session, a fixed rule.

## What exists today, measured

All read 2026-10-13 between 08:49 and 08:54 CEST.

**The machine on cb4 is not named, and is stopped.** `fly.status` with the token `loop-fly`:

```
{"app":"cloudbrain","machine":null,"machines":[{"id":"853145b4217618","name":"t1-by-hand-2","state":"stopped"}],"volume":null,"hoursToday":0.011,"maxHoursADay":8,"loop":null,"yield":null,"work":2} [200]
```

So the setting `machine` has no value. The task that makes the loop's machine, `fly-4b-first-run`,
is at `triaged`; `fly-4-loop-files` and `fly-5-docs` are at `ready`. A `fly.exec` deployed today
answers 409 until he names a machine.

**`exec` is reached by one method, for one caller.** `brain-fly.ojs` at `3a159fbf`, the service's
manifest: `fly.get` and `fly.post` are `allow: "caller.session", fixed: true`, and the service
refuses a caller whose headers are not the owner's tab (`x-brain-caller: owner`, `x-brain-tab: 1`).
Its test `test_fly_get_and_post_pass_a_path_of_the_app_and_no_other` sends
`post?path=machines/853145b4217618/exec` as a token, a Worker, nobody and a member, and reads 403
four times. On cb4 a token is refused before the rule is read:

```
fly.post?path=machines/x/exec --as loop-fly
{"error":"Forbidden","message":"this token does not name com.lopecode.brain.fly.post. …"} [403]
```

**No `fly.exec` exists.** `POST /xrpc/com.lopecode.brain.fly.exec` with no caller answered 501.

**The service's tests at the baseline**, built from the worktree and run with no browser:

```
brain-x-fly @tomlarkworthy/brain-fly no hash (--with): 12 passed, 0 failed, 1 need a browser
```

**What Fly.io's call is.** From `fly-1-by-hand` (2026-10-12), with a deploy token:

```
POST /v1/apps/cloudbrain/machines/8654e09b79e168/exec   {"command":["uname","-a"],"timeout":10}
{"stdout":"Linux 8654e09b79e168 6.12.105-fly …\n","stderr":"","exit_code":0,"exit_signal":0}   [200]
```

The same record: `HOME` is `/` in such a command, and a script run that way sets `HOME=/root`.

**What a command as root reaches there.** From the machine's create body (`flyBodies.machine` in
`brain-fly.ojs`) and the record of `fly-1-by-hand`: three deploy keys with write to `lopecode-dev`,
`lopebooks` and `lopecode-plugin`; `/root/cb4-tokens.json`, which is to hold `fly-agents`
(`issue.*` with the cap `delegate`), `fly-knowledge`, `fly-docs` and `fly-status`; the env
`CLAUDE_CODE_OAUTH_TOKEN`; and the checkout on `/data`. A push to `lopecode-dev` is code the
laptop's loop then runs. So a caller of `fly.exec` has, in effect, what the loop on the machine has.

**Not measured.** How often `fly.post` has been sent to an `exec` path: the core's line of a call
has the method and never a parameter, and `logs.query` answers the owner's session only. Which
delegations with a Worker holder exist on cb4: `delegation.list` is the owner's and a member's.

## Read

Searches of the Brain's knowledge base, `knowledge.search?semantic=true` with `loop-knowledge`,
08:50 CEST:

| Query | Found | Used |
|---|---|---|
| "run a command on the Fly machine exec as root" | `doc:pm-agent-request-not-seen-fly-idle` 0.939, `doc:cloud-brain-worker-machine-on-fly` 0.7, five `justbash` and `robocoop-4-bash` modules | The fly spec, part 4 and "Not chosen": a terminal through the Brain was left out for needing a port; `exec` needs none. The bash modules are a shell in a page's own file system and run nothing on a machine |
| "a Worker the owner has blessed to call a method rule.put caller.worker" | `module:brain-core` 0.77, `doc:cloud-brain-authority` 0.713, `module:brain-kernel`, `module:brain-secrets` | `plan/cloud-brain-authority.md` and the core's delegations: the blessing of this design |
| "remote command execution least privilege allow-list of commands capability" | `command-palette`, `unrolling-a-deploy-command`, bash modules, one Reddit post | Nothing |
| "delegation grant a Worker acting for the owner scope" | `doc:cloud-brain-authority` 1.0 | The same |

Read in the repository, at `3a159fbf`:

- `plan/cloud-brain-authority.md`, "The record", "Who the call is by", "Making one", "Using one".
  A delegation held by a Worker is made by the owner in his own session
  (`delegation.create { name, holder: { worker }, scope, until, note }`), only for a Worker whose
  role is `recipe` or `system`, with no caps. The Worker sends `x-brain-as: <id>`; the call is then
  by the maker and not in his tab. "A Worker holder is a system Worker. A delegation names a Worker
  and not its code, so whoever can deploy that Worker gets what it holds".
- `tools/cloud-brain/brain-core.ojs`, `stands` and `asHolder` (lines 292 to 315): such a call
  arrives at a rule as `{ caller: "owner", via: "delegation:<id>", tab: false, holder: "worker:NAME" }`,
  is refused when the scope does not name the method or `until` has passed, and is not held to the
  Worker's own `calls`. The core then sends the service `x-brain-via`, `x-brain-tab` and
  `x-brain-holder` (lines 656 to 659). Its test
  `test_a_worker_calls_under_a_delegation_as_who_made_it_and_not_in_their_tab` holds this.
- `tools/cloud-brain/cloudflare-iac.ojs`, "Access rules" and `callerOf`: a rule reads
  `caller.session`, `caller.id`, `caller.delegation` and `caller.holder`.
- `tools/cloud-brain/brain-container.ojs`: `container.exec { cmd, timeout }`, `who: "workers"`,
  at most 64 texts and 20,000 characters, 30,000 ms.

Read outside:

- Fly.io's OpenAPI document of the Machines API, `https://docs.fly.io/api/machines/openapi.json`
  (158,672 bytes, read whole by a script, 08:51 CEST). It has the path
  `/v1/apps/{app_name}/machines/{machine_id}/exec`, "Execute a command on a specific Machine and
  return the raw command output bytes", a body `MachineExecRequest` of `command` (a list of texts),
  `cmd` ("Deprecated: use Command instead"), `container`, `machine`, `stdin` and `timeout` (an
  integer), and an answer `flydv1.ExecResponse` of `exit_code`, `exit_signal`, `stderr`, `stdout`.
  It gives no unit and no limit for `timeout`, no limit of the output, and no answer for a machine
  that is not started.
- `https://docs.fly.io/machines/api/machines-resource`, read through a summary of the page, not
  quoted: it lists no `exec` endpoint. The fly spec's "Read" said the same on 2026-10-11.

No search of the literature was made: the access question is answered by the delegation design,
which cites UCAN for its narrowing rule.

## The design

### The method (R1, R5, R6)

`POST fly.exec`, body `{ command, timeout }`.

- `command` is a list of 1 to 64 texts, 20,000 characters together at most, with no shell:
  `["id", "-u"]`, or `["sh", "-c", "…"]`. The two limits are those of `container.exec`.
- `timeout` is whole seconds, 1 to 60, and 30 when not given. Seconds is what the call of
  `fly-1-by-hand` suggests (`"timeout":10` for a command that answered at once); the unit and
  Fly.io's own limit are **not verified**, and 60 is this spec's number.
- The service sends `POST https://api.machines.dev/v1/apps/APP/machines/MACHINE/exec` with the body
  `{ command, timeout }`, where `MACHINE` is the setting `machine`. The caller gives no path and no
  id, so the method reaches one address. The answer is Fly.io's body and status, with the header
  `x-fly-upstream`, as `fly.post` answers.
- 400 for a body that is not as above, with no request to Fly.io. 409 `no machine is named` when
  the setting has no value. 400 when the secret is not set, as the other methods.
- It starts nothing. A machine that is stopped is not started for a command, so a command cannot
  spend the day's hours; what Fly.io answers then is passed on. **Not verified**: that answer.
- A command does not hold the lock `loop`. The tick stops an idle machine after `idleMinutes`
  whether a command runs or not.
- `stdin`, `container`, `machine` and `cmd` of Fly.io's body are not passed. None was tried.
- No price, as the service's other methods.
- One log line a call: `{ at: "fly.exec", by, machine, program, texts, upstream, exit, ms }`. `by`
  is `session` or the holder, `worker:NAME`; `program` is the first text of the command, cut at 80
  characters; `texts` is how many there are. No other text of the command is written, since an
  argument can hold a secret. The core writes its own line of the call, with the delegation's id.

The secret is read as it is today, by `reach()`, and sent to `api.machines.dev` alone with
`redirect: "manual"`. Its rule, `caller.worker in ["brain-x-fly"]`, is not touched.

### Who calls it (R2, R3, R7)

The rule, fixed, so that `rule.put` cannot widen it:

```
caller.session || (caller.id == "owner" && caller.delegation != "" && caller.holder.startsWith("worker:"))
```

**The rule is not the whole decision, and the service's check is the narrower.** A rule reads the
caller and never a delegation's scope, and the core lets a delegated call through when
`matches(d.scope, nsid)` (`brain-core.ojs` line 297), where a scope of `*` or `fly.*` reaches
`fly.exec` (`matches` and `scoped`, `cloudflare-iac.ojs` lines 1819 and 1826; `neverHeld` keeps six
prefixes from every holder and `fly` is not one). So the rule is true for a Worker that holds any
delegation of his that is wide enough, made for another job (review 6155). The service therefore
reads the id of the delegation from the header the core sends, `x-brain-via: delegation:<id>`, and
lets a Worker through only when that id is in its setting `blessed`. A setting is a number, a
boolean or a text of at most 500 characters (`brain-core.ojs` line 32, the row of `config.set`),
so `blessed` is a text of ids with one space between them, 38 ids at most:

```
the owner's tab (x-brain-caller: owner, x-brain-tab: 1)
or  x-brain-caller: owner, x-brain-holder starts "worker:", x-brain-via is "delegation:<id>" with <id> one of config.blessed.split(" ") that is 12 hex digits
```

Anything else is 403. With the setting not set, or not such a text, no Worker passes.

Nine callers, by the trial's test (the rule through `decide` and `callerOf`, the service through
its rig with `blessed: "bbbbbbbbbbbb aaaaaaaaaaaa"`):

```
tab            owner, via session                                              rule true    200
blessed        owner, via delegation:aaaaaaaaaaaa, holder worker:brain-x-other  rule true    200
wide           owner, via delegation:cccccccccccc, holder worker:brain-x-other  rule true    403
token          owner, via delegation:d1, holder secret:loop-fly                 rule false   403
tokenNamed     owner, via delegation:aaaaaaaaaaaa, holder secret:loop-fly       rule false   403
worker         worker:brain-x-other, no delegation                             rule false   403
member         did:plc:ada, in their tab                                       rule false   403
membersWorker  did:plc:ada, via delegation:…, holder worker:…                  rule false   403
anonymous                                                                      rule false   403
```

`wide` is the caller of the review's finding: the rule passes it and the service refuses it. The
same test holds that with no setting, and with each of `""`, an id one digit short, an id one
character long, `"delegation:aaaaaaaaaaaa"`, `true` and `12`, the blessed caller is 403 and the tab 200.

A token is refused whatever it names, with one exception that exists today for every method of
the owner's session: a token made with the cap `session` and a scope that names `fly.exec` is the
owner's tab to the core (`asSecret`). That cap is his alone to give, in his own session.

`fly.get` and `fly.post` are not changed. `fly.post?path=machines/ID/exec` stays his.

### A blessing (R4)

A blessing is two acts of the owner in his own session: a delegation, and its id put in the
setting `blessed` of `brain-x-fly`.

```
delegation.create { name: "fly-exec-<worker>", holder: { worker: "brain-x-NAME" }, scope: ["fly.exec"], until: <ms>, note: "<what for>" }   -> { id }
config.set { worker: "brain-x-fly", key: "blessed", value: "<the ids before> <id>" }
delegation.list
delegation.revoke { id }
```

The four are the core's and are not changed. The delegation gives the Worker the call, with an
end, a note and an id in the log; the setting is where he names that delegation for this method,
since a scope alone does not (above). Either taken back ends the blessing: a revoke, the end of
`until`, or the id taken out of the setting. An id in the setting whose delegation has ended
blesses nothing: the core refuses the call before the service sees it. `delegation.create` refuses a Worker whose role is
not `recipe` or `system`, so a member's Worker cannot be blessed; a Worker holder has no caps.
`stands` reads the row on each call through 5 s of memory, so a revoke or the end of `until` is a
refusal within 5 s.

The blessed Worker calls with the id, which the owner gives it as a setting
(`config.set { worker, key, value: <id> }`), as `brain-x-topic` sends a subscriber's push:

```js
xrpc.fetch("com.lopecode.brain.fly.exec", { method: "POST", headers: { "x-brain-as": id, "x-brain-hops": "0", "x-brain-context": "", "content-type": "application/json" }, body: JSON.stringify({ command: ["id", "-u"] }) })
```

It needs no `fly.exec` in its `calls`: the core does not hold a call under a delegation to that list.

**Who else can make one.** Nobody, while `config.set` is his own session's. A token of his with
the cap `delegate` makes delegations under itself, held by a Worker, each with a scope inside its
own (`plan/cloud-brain-authority.md`, "A delegation made under a delegation"), and a delegation he
made for another job may have a scope of `*`. Neither is blessed: its id is not in the setting.
`config.set` is a method of the core for the owner's own session
(`knowledge/working-with-cloud-brain-remote-lopecode-cluster.md`, "Settings"), which a token
reaches only with the cap `session` and a scope that names it by name or prefix; that cap is his
alone to give. The delegations and tokens on cb4 were not read, being the owner's to list.

Two limits of a blessing, which the comment for his approval says:

- **A blessing is of a name, not of code.** Whoever deploys the blessed Worker gets what it holds,
  and since 2026-10-11 the loop deploys services. A blessed Worker is one whose every later deploy
  he trusts, until the blessing ends.
- **A blessing is of every command.** What a command reaches is under "What exists today".

So the form of task 2 asks for the days a blessing stands, and puts 7 when he types none. That
default is this spec's reading and not his words.

### The panel (R2, R4), task 2

Three controls in `flyPanel`, the panel of `brain-fly.ojs`, for the owner signed in:

- **Run**: one line of text and a button. It sends `fly.exec { command: ["sh", "-c", <text>] }` and
  shows `exit N` with the first 4,000 characters of `stdout` and `stderr`, as the panel of
  `brain-container.ojs` does. One call at a time: the button is off until the answer.
- **Blessed**: a row for each id of the setting `blessed`, with its delegation from
  `delegation.list`: the Worker, the scope, the note, the end, and Revoke, which sends
  `delegation.revoke` and then `config.set` with the id taken out. An id with no live delegation
  is shown as ended, with a button that takes it out. Under the rows, one line that counts the
  other delegations of his that a Worker holds and whose scope reaches `fly.exec` by `matches`,
  and says that they are not blessed.
- **Bless**: a Worker's name, a note, days (7), and a button that sends `delegation.create` and
  then `config.set` with the id added, and shows the id with the `config.set` line he would give
  the Worker. When the second call fails the row says so, and the delegation stands unblessed.

### Not chosen

- **`fly.post` widened, in place of a method of its own.** It does the same job today for the
  owner. It reaches every path of the app: a machine deleted, an image changed, a volume made. A
  rule that reads `request.params.path` for the one path would hold root behind a text match of a
  path that the service decodes after the rule has read it. And the core's line of a call has the
  method and no parameter, so an `exec` would not be told from a volume made.
- **`container.exec` made more general, to take the Fly machine as a second kind of machine.** It
  is the nearest thing of the same job: one command, one answer. It is for another purpose: a
  leased container of the caller's own, with a price a second, open to every Worker
  (`who: "workers"`). The Fly machine is one machine with the loop's keys on it, for which the
  whole point is who may call. One method with both rules would have the wider one a `rule.put`
  away from the narrower.
- **The body and answer of `container.exec`** (`cmd`, milliseconds, `exitCode`). Fly.io's own
  names are kept: Tom's standing rule is a pass-through where one will do
  (`knowledge/working-with-cloud-brain-remote-lopecode-cluster.md`).
- **The blessing as a rule the owner sets**: `rule.put { target: fly.exec, allow: 'caller.session || caller.worker in ["brain-x-NAME"]' }`,
  with `fly.exec` in the Worker's `calls`. It is how a secret names its readers. It needs the rule
  not fixed, and then one `rule.put` opens root on the machine to tokens; a rule has no end, no
  note and no id in the log. A delegation has the three and leaves the rule fixed.
- **The delegation alone, with no setting.** Round 1 of this spec. A delegation of his with a
  scope of `*` or `fly.*`, made for another job, then runs commands as root (review 6155), and no
  rule can read a scope to keep it out.
- **`*` kept from `fly.exec` in the core**, as `asSecret` keeps `*` from the methods of his own
  session for a token. It is the general answer. It is a change to `brain-core`, which the loop
  does not deploy (`rules.md`, Never), for one method.
- **A setting that lists the blessed Workers by name, with no delegation.** The Worker would call
  as itself, with `fly.exec` in its `calls`. No end, no note, and no id in the log; and the rule
  could not then be told from `who: "workers"` without the service's check.
- **A setting of names beside the delegation.** A Worker with two delegations of his, one wide
  and one for this, would be blessed through either. An id is one delegation.
- **A token that names `fly.exec`.** His words are "services". A token is whoever sends it, and
  the loop's tokens are in a file on the laptop.
- **Named commands only** (a setting `commands: { name: [texts] }`, and a blessed Worker sends a
  name). Narrower by far: a blessed Worker runs what he wrote and nothing else. It adds a store of
  commands and a second shape of the body, with no caller yet to say what the commands are. It is
  choice B below, and can be added later without changing choice A's callers.
- **A blessing bound to the Worker's hash.** It answers "of a name, not of code". The authority
  design left it "for the day a member's Worker must act for someone else"; it is a change to the
  core, which is his to deploy.
- **A terminal** (a stream, `stdin`, a command that stays). The fly spec left it out for needing a
  port; this is one command and one answer.
- **Starting the machine for a command.** A blessed Worker would then spend the day's hours.
  `fly.up` exists, with its limit.
- **A machine of a member's.** There is none.

No role does this job. The loop's roles are the files of `.claude/skills/brain-maintenance/agents/`
(approver, digest, implementer, overseer, reviewer, spec, and the implementer's pages), and the
Brain's own are three, by `https://cb4.endpointservices.workers.dev/static/cloud-brain-dev/index.md`
read at 08:51 CEST: `paper-summarizer`, `reviewer`, `summarizer`. None runs a command on a machine,
and the design adds no role. No tool of `tools/cloud-brain/` calls an `exec` of Fly.io
(`grep -l "machines/.*exec" tools/cloud-brain/*.ts tools/cloud-brain/fly/*` printed nothing).

## One choice of this spec that the owner may want the other way

- **A.** As written: a blessed Worker runs any command as root, until the blessing ends.
- **B.** A blessed Worker runs only commands he has named in a setting; any command stays his own
  session's. One more task, and the first blessed Worker waits for its commands to be named.

The spec takes A by line 2 of the philosophy as the smaller, and because a blessing is his own
act, of one Worker, with an end. B is what line 1 would take if a Worker he does not write himself
is to be blessed.

## How each requirement is known to be met

Each command is run in the worktree, `$W`. The first was run for this spec at 08:53 CEST with
round 1's edit in place, and again at 09:07 CEST with round 2's (135 lines of diff to
`brain-fly.ojs`, since taken back); both runs printed the line below:

```
cd $W && bun tools/cloud-brain/build.ts --out tools/cloud-brain/.emitted/cloud-brain.html \
  && bun tools/lope-reader.ts tools/cloud-brain/.emitted/cloud-brain.html --get-module @tomlarkworthy/brain-fly > tools/cloud-brain/.emitted/brain-fly.js \
  && (cd cloud-brain-dev && bun test.ts brain-x-fly --with $W/tools/cloud-brain/.emitted/brain-fly.js 2>&1 | tail -4)

brain-x-fly @tomlarkworthy/brain-fly no hash (--with): 13 passed, 0 failed, 1 need a browser
```

One test more than the baseline's 12. With the new method and the two older tests not yet mended
the same command gave `11 passed, 2 failed`: `test_fly_declares_one_secret_one_cron_and_two_calls`
lists the manifest's rules, and `test_fly_get_and_post_pass_a_path_of_the_app_and_no_other` expects
404 of the name `exec`. Task 1 changes both.

| | Known by |
|---|---|
| R1 | The new test, `test_fly_exec_is_the_owners_tab_and_a_worker_the_owner_blessed`: the two requests Fly.io was sent are `POST …/machines/853145b4217618/exec` with the body as given; with no `machine` set the answer is 409 and nothing is sent; seven bodies are 400 and nothing is sent |
| R2, R3 | The same test: the table of nine callers above, each through the rule and through the service. `wide`, a Worker under a delegation of the owner's that is not in the setting, is 403 |
| R4 | The same test for the setting: with none, and with six values that are not a text of ids, the blessed caller is 403. The rest is not this change's: `delegation.create`, `list` and `revoke` are the core's. `test_a_delegation_is_made_in_a_persons_own_session_for_a_worker_the_owner_deployed` and `test_a_worker_calls_under_a_delegation_as_who_made_it_and_not_in_their_tab` of `brain-core.ojs` hold them; neither was run for this spec. Task 2's test holds that the panel sends those calls |
| R5 | The new test reads `authorization` of each request and its host; `test_fly_declares_one_secret_one_cron_and_two_calls` holds `meta.secrets` and that the source names `api.machines.dev` once. `git diff` of task 1 touches no line of `reach` or `send` |
| R6 | The new test: one line `fly.exec` with `by: "worker:brain-x-other"`, `program: "sh"`, `texts: 3` for `["sh","-c","echo s3cret"]`, and `s3cret` in no line |
| R7 | `test_fly_get_and_post_pass_a_path_of_the_app_and_no_other`, whose four 403s of `post?path=machines/…/exec` stand |

On cb4 after task 1's deploy, with the loop's own tokens:

```
curl -s -o /dev/null -w "%{http_code}\n" -X POST https://cb4.endpointservices.workers.dev/xrpc/com.lopecode.brain.fly.exec     # not 501; 401 or 403 (today 501; which of the two was not run)
curl -s "https://cb4.endpointservices.workers.dev/xrpc/com.lopecode.brain.getSource?worker=brain-x-fly&part=reference" | grep -c "fly.exec"   # 1 or more (today 0 by the text read at 08:52)
brain.ts curl /xrpc/com.lopecode.brain.fly.status --as loop-fly          # 200, as today
```

No token of the loop can show on cb4 that the rule refuses a token: one would have to name
`fly.exec`, and none is made for that. The rule is held by the test, which runs the functions the
core runs.

Task 2's test is `test_fly_panel_shows_the_machine_and_sends_one_call_at_a_time`, extended: it
needs a browser (`document is not defined` with none), so it is run with `tab-tests.ts` as the
page `seed-tests` of the writer's brief has it, with a client the test holds. Its count cannot be
given before the task is built.

What only he can measure is in his list below and is no condition of a task landing.

## The tasks, in the order they land

1. **`fx-1-exec-method`**: `fly.exec` in `brain-fly.ojs` as "The method" and "Who calls it" have
   it, with the setting `blessed` in the table of settings; the new test; the two older tests changed; the method table and the paragraph under it in
   the seed's reference (`test_fly_reference_says_each_default_and_has_no_hole` passed in the
   trial without the four new defaults in the table: the writer adds them and sees whether the
   test reads them); a deploy of `brain-x-fly`; the record. Label `major`: it changes who may do
   what. After nothing.
2. **`fx-2-panel`**: Run, Blessed and Bless in `flyPanel`, with the panel's test extended for a
   second press before the answer, a refused `delegation.create`, a `config.set` refused after a
   `delegation.create` that was not, a revoke, an id with no live delegation, and the count of
   wide delegations that are not blessed; a deploy; a paragraph in the
   knowledge page of the machine when `fly-5-docs` has made it, else in the seed's reference
   alone. After `fx-1-exec-method`.

Neither waits for `fly-4b-first-run`: with no machine named the method answers 409 and the panel
says so.

## What the orchestrator makes

Nothing. The design names no token.

## What only the owner can do

- Approve this spec, with A or B.
- Approve `fx-1-exec-method` when it is reviewed: it is `major`.
- Once he has named a machine (`fly-4b-first-run`) and it runs: type `id -u` in Run and read
  `exit 0` and `0`. This is the first call of `fly.exec` on a real machine, and it settles the two
  things marked not verified: the unit of `timeout` (`sleep 5` with the default) and, with the
  machine stopped, what Fly.io answers.
- Bless a Worker, when one is written that needs it. None is.

No read of `delegation.list` is asked of him before the deploy of task 1: a delegation that exists
then is in no setting, and is refused.

## Round 2: review 6155

One finding, and it held: a Worker he did not bless for this calls `fly.exec`. The rule reads no
scope, and a Worker-held delegation of his with a scope of `*`, `fly.*` or `com.lopecode.brain.*`
passes both the rule and round 1's check of the headers. The reviewer named two answers: say the
limit and show such delegations in the panel, or "a design in which a wide scope does not reach
it". The second is taken, since the first leaves root on the machine open to a delegation he made
for something else.

- **Changed:** "Who calls it" (the service reads the delegation's id against the setting
  `blessed`; nine callers, `wide` among them, 403), "A blessing" (two acts; "Who else can make
  one" rewritten, since a `delegate` token's child is in no setting), "The panel" (Bless and Revoke
  send both calls; Blessed is the setting's ids; the wide ones are counted and said not to be
  blessed), R4, "Not chosen" (round 1's design, the core's `*`, and two shapes of the setting),
  the checks and task 2's cases.
- **Run again:** the trial, with the setting and the two new callers:
  `13 passed, 0 failed, 1 need a browser` at 09:07 CEST. A run at 09:06 had the setting as a
  list, which `config.set` does not take; the row of `config.set` was read after it and the
  setting became a text.
- **Not done:** the rule is as round 1 had it. It cannot be made narrower (no rule reads a setting
  or a scope), and it still keeps out every token, Worker and member with no delegation of the
  owner's held by a Worker.
- **What the setting adds that stays:** one key of `brain-x-fly`'s settings. The round-1 spec
  left a setting out as "a second place for what `delegation.list` already answers"; the finding
  is that `delegation.list` does not answer it.

## What misled the writer of this spec

- The brief's step 4 gives the search line with `brain.ts` at `<root>`; from a worktree it finds
  no state. It ran with `BRAIN_STATE_DIR=<root>/tools/cloud-brain/.emitted` before it, which
  `agents/implementer.md`, "Where you work", says and `agents/spec.md` does not.
- `https://fly.io/docs/machines/api/machines-resource/` has no `exec`, as the fly spec found. The
  OpenAPI document has it. Two addresses for that document from memory were 404 before the docs
  page named the third.
