# Cloud Brain: the agentic parts, redesigned

Written 2026-10-21 19:30 to 20:40 UTC by the owner's session (Fable 5.1) from the owner's sketch of that evening,
quoted in §0. A plan, not built. Reviewed once by a fresh-context agent (10 findings, all taken) and once by the
session's advisor (5 points, all taken: the swap is written with the worker's token, a deploy wait ends on `confirmed`
or `put-back` and not `verified`, the owner's click takes `needs-owner` off, a deploy is matched by the wait's note,
and one watchdog invariant in place of three repairs), both the same evening. What it rests on: the four retro reports (`plan/cloud-brain-retro-2026-10-20.md`, and on
`origin/main`, which this checkout was behind, `plan/retros/2026-10-20.md`, `2026-10-21.md`, `2026-10-21-2.md`,
read with `git show`), `cloud-brain-dev/philosophy.md`, the live policy and
tracker of cb4 read at 19:29 UTC (`issue.policy`, `issue.list?limit=500`, `issue.queue`, `loop.status`), the deployed
`brain-issues.js` (`cloud-brain-dev/deploy/`, read for `issue.label`, `issue.wait`, `issue.wakes`, `caller.holder`),
and two read-only summaries of `cloud-brain-dev` (`drain.ts`, `run.ts`, `ship.ts`, `sandbox.ts`, `rollback.ts`,
`roles/*.md`, HEAD `aff660e`) and of `.claude/skills/brain-maintenance/` and `plan/cloud-brain-issues-policy-v8.json`.
Line numbers below are of those files at that commit. Nothing here was run.

## 0. The brief

The owner, 2026-10-21, as typed:

> Complete redesign of the issue tracking and task execution.
>
> Get rid of transitions in the issue, let agents route at will, perhaps a single pinch point at independent review.
> Let a single agent do all the work, but let them freeze during deploys and waiting on things. They will need their
> sessions stored. Any handover is a label (needs:spec, needs-reviewer, needs-token, needs-deploy). The agents can
> yield for a condition for the issue to hold on to. Maybe a single agent session can carry it through all stages, but
> stuff like review needs independence to award. The agent is free to deploy on the cluster and watch the rollout and
> fast fix until they are satisfied the task is complete or irrelevant. Maybe deploys and stuff write to a topic, so
> the issue tracker can be triggered on rollouts to unfreeze sessions. The single agent is encouraged to file new
> tickets for problems it encounters.
>
> The task draining is simpler. The machine polls for "needs-…" over its personas it has infront of it, gives them the
> issue reference and all the skills are loaded and the role it was called with. It immediately remove the label and
> replaces with "reviewer: processing", then event. I think only one agent should be active at a time to remove
> forking by construction.
> Knowing when to start the machine is tricker, the set of personas that are processable needs to be synced whenever
> the cloudbrain-dev is committed (prek?)
>
> Lets go back to Opus 5.5 medium by default.
> I hope we can do this without orphaning our existing issues.

The plan keeps every line of it that the evidence supports and says where it bends one: the poll (§3.8), the ticket
filing (§3.9), and what "independence" has to mean when one agent's token changes across days (§3.5).

## 1. What the retros measured

Each row is a failure the record shows, with its number, and the mechanism that allowed it. The design in §3 is
built against this list; §4 says which row each part removes.

| # | Failure | Measured | Mechanism |
|---|---|---|---|
| P1 | A handover is a fresh agent with no memory of the issue | A writer-plus-reviewer round cost 167,000 to 266,000 tokens on 2026-10-10, "the lowest for a one-line doc change" (`philosophy.md` line 65). 145 `changes` reviews in 7 d, 35 moves to `not-done` (retro 10-20 §2). A rework after one `run.ts` ended "starts a new writer, told so, as the writer's session is of the run that ended" (`run.ts:74-77`) | The task workflow has 12 states and 18 moves on cb4 (`issue.policy`, 19:29 UTC); each move is a role boundary, and each role is a new process with a brief and no transcript |
| P2 | Work stops between steps, and only a session restarts it | 370 of 452 `triaged`→`ready` moves in 7 d were a laptop session's by hand; the PDS chain waited 8.8 h overnight (retro 10-21 §2). Idle half-hours with doable work: 23 of 48 (10-20), 31 of 48 (10-21 05:21), 37 of 48 (10-21 18:35). Review pass to live, `brain-x-pds`: 1.1 h, 5.5 h, 5.7 h, 0.03 h (10-21-2 survey) | Three texts owned one step (`roles/triager.md`, `brain-x-loop` `owed()`, `drain.ts` `triable()`) and disagreed. `drain.ts` names states, moves and labels in about 30 places (summary §5: `drain.ts:498-524, 631-674, 1361-1479, 1796-1829`; `run.ts:166-219, 339-543`; `ship.ts:127-236`; `rollback.ts:115`) |
| P3 | "Done" is a pass on a stub, not a live result | Six fixes for "an approved deploy does not ship" (10-19 to 10-20) each carried stub tests; the real flow first ran by hand on 10-20 and found `apply.ts` rejecting the deployer's `waiting` answer (10-20 retro, friction 2). `i12867`'s renewal was tested with a stub clock and a temporary file; the token died at every stop for 26 starts in 7 d (10-21 §2, §3). 2 passes failed the deployer's tests (10-20, friction 4) | The agent that wrote the code never saw it run. The reviewer reads a patch in a detached clone (`SKILL.md:507-512`) and is never resumed; nobody is on the issue when the deployer answers |
| P4 | The owner clicks for the machine | 226 `approve` and `owner-reject` moves in 7 d, 214 on the loop's own machinery; 22 deploys held for his click, 8 never clicked (retro 10-20 §2). Two gestures per approval: the issue, then the deployer's link (10-20 retro, friction 5). The deploy token lasts 24 h at most (kernel; 10-21-2 §4) | Approval is a state (`awaiting-approval`) and a separate persona (approver, Opus high, 198 runs and 100.66 USD in 7 d); the deployer's hold is a second gate with its own clock |
| P5 | The factory works on itself | 360 of 418 `done`, 753 of 874 USD, 507 of 607 issues opened in 7 d were about the loop (retro 10-20 §3); the `out-*` sessions opened 373 of 607 | Briefs told roles to file; a rule made every machinery fault a ticket (changed 10-20 18:10 UTC) |
| P6 | State that matters lives outside the record and dies with the process | `drain.ts` keeps `seen`, `received`, `owed`, five hold maps, `given`, `lapsedGiven`, `tokenLapsed`, `requestsPending`, `perDay` in memory (summary §3; `drain.ts:809-995`); the token file was on the rootfs until `aff660e`. Two orphaned token requests at 06:26 on 10-21 belonged to drains a reboot had ended (10-21 §2) | The lease model: `brain-x-loop` holds claims, the drain holds the rest, the tracker holds the issue. Nothing survives a stop but `/data` |
| P7 | Retries with no bound, and refusals that cost | 588 of 642 run-stops in 3 d were two refusals on four issues (`landing-not-about` 446, `two-landings` 142); the latter starved the queue from 06:03 to 06:27 on 10-20 (10-20 retro, friction 3) | Overlap and landing rules in `brain-x-loop` and `push.ts` refused the same claim again and again; each refusal counted |
| P8 | A verdict that never came was read as a failure | 17 deployer runs in 7 d gave no verdict, 13 of them `ERR_CONNECTION_RESET`; 5 of 7 put-backs were "not confirmed in 10 minutes", 4 of those hashes re-confirmed unchanged; `rollback.ts` wrote 4 false `rolled-back` labels (10-21-2 §2). Fixed 10-21 (`brain-x-browser` `1a50544deaee`, `rollback.ts` `e7af016`) | Not a workflow fault, listed because the single-agent design depends on the deployer's verdicts reaching the agent |
| P9 | Nobody was told | `DRAIN_OWNER_DM` and `DRAIN_OWNER_ISSUE` were unset; `LOOP_BLUESKY_TOKEN` dead; stderr went to a Fly log the owner's session cannot read (`fly.logs` 401) (10-21 §2) | The owner's channel was a fallback chain in the drain, not a row in the record |

Two readings the numbers do not support (10-20 retro): that the loop did little (244 writer submissions in 3 d), and
that the owner waited long on average (median `to-approval` to the next move 0.24 h). The cost is in what the work
was about, the tails, and the hours between steps.

## 2. The design on one page

```
                 the record (brain-x-issues: signed events, policy as data)      unchanged
                 ─────────────────────────────────────────────────────────
   issue        state: open ──────────────────────────────► done | closed | rejected
                labels: needs-worker │ needs-reviewer │ needs-owner │ needs-token │ worker-processing │ …
                waits:  { actor, when (CEL over issue), until }                 issue.wait, exists
                by:     who made each move;  + who put each label (new)

   needs-X put ─► brain-x-loop (rule: X in personas) ─► fly.up if stopped ─► drain
                                                                               │ one child at a time
   drain: label swap in ONE event  {remove: needs-X, add: X-processing}       │
          claude --resume <session on /data> "the issue is yours again: <what changed>"
                                                                               ▼
   the persona ends its turn in one of three ways, each ONE event on the issue:
     yield   issue.wait {when, until} + label needs-Y        (deploy, owner, token, another issue)
     hand    label needs-Y                                    (reviewer, spec, …)
     finish  move finish  ──guard──► an independent pass on the head ref, and a live ref

   wake:  deployer ─► topic deploys ─► issues.receive ─► the wait's `when` is true ─► label needs-worker
          owner answers / token made / review written  ─► same path, no deployer needed
```

Three things carry the design. The record is the only state (P6). A handover is a label, and the claim is one event
(P1, P7). One session is resumed, not replaced, until `finish` (P1, P3).

## 3. Parts

### 3.1 The workflow `flow`

A new workflow body in the policy, installed by the owner present (`issue.install`, as v2 to v8 were). For kinds
`task` and `bug`. `feedback` (2 states) and `project` (9 states, 5 open issues) are left as they are for now; §5.

```
states   open · done · closed · rejected · reverted
moves    finish   open → done        guard below (the pinch point)
         close    open → closed      caller.kind in [owner, token] && event.reason != ""
         reject   open → rejected    the same
         reopen   closed|rejected → open   as today's (owner present after an owner-reject)
         revert   done → reverted    caller.present && reason && refs
         owner-reject  open → rejected   caller.present
swaps    escalate → security at open, when the label security is on   (as today)
label    caller.kind in [owner, token] && (!("major" in event.remove) || caller.present)   (as today)
wait     caller.kind in [owner, token]
review   caller.kind in [owner, token] && caller.holder != issue.by["+worker-processing"].holder
```

Five states, six moves, where the task workflow has 12 and 18. Routing is not in the moves: it is the `needs-*`
labels, and the guards read labels and reviews, not states. `in-progress`, `in-review`, `awaiting-approval`,
`stopped`, `not-done`, `triaged` and `ready` go, with the moves `triage`, `ready`, `start`, `back`, `stop`, `retry`,
`submit`, `pass`, `to-approval`, `rework`, `approve`, `not-done`, `requeue`.

**Labels** (one family, the spelling of `needs-owner`, which the page's "For your attention" block already reads,
the `waits` function of the deployed `brain-issues.js`; the module has no seed since `88f03840`, it is changed as a
patch in `cloud-brain-dev` against what cb4 runs):

| label | put by | means |
|---|---|---|
| `needs-worker` | the opener (default on open), the tracker when a wait comes true, a reviewer that sends back | a worker session is wanted |
| `needs-reviewer` | the worker, when it believes the work is done | an independent review is wanted |
| `needs-owner` | anyone, with the decision comment of `philosophy.md` "What `needs-owner` means" | the owner's word or hand |
| `needs-token` | the drain or the worker | a token the machine cannot make; the body names it |
| `needs-spec` | the opener of a `project` | kept for projects; not used by `flow` |
| `<persona>-processing` | the drain, in the same event that removes `needs-<persona>` | a session is on it now; taken off by the session's yield, hand or finish, in that same event |
| `waiting-deploy`, `waiting-issue` | the worker, at a yield that asks nothing of a person | the issue waits for the cluster; the wait row says for what and until when |
| `major`, `security`, `owner`, `annotation`, `digest` | as today | as today |
| `laptop` | goes | it meant "the owner's hands", which is `needs-owner` now (`plan/cloud-brain-machine-does-everything.md` gate 1 retired it on 2026-10-17 for the same reason); the 3 open issues carrying it get `needs-owner` at migration |

`run-stopped`, `stranded`, `owner-deploy`, `rolled-back`, `triaged-by-triager` go. A stop is a comment and a
`needs-owner` or `needs-worker` label with the reason, not a label of its own.

**Reading an issue's place** is `issue.list?label=needs-X` and `issue.list?label=X-processing`. The queue of
`issue.queue` (its `do` field: round, review, triage, …, `SKILL.md:368-418`) is replaced by the label counts; its
`waiting` list, which reads `after`, holds and `needs-owner`, stays as it is.

### 3.2 The claim is one event

`issue.label { key, id, add: ["worker-processing"], remove: ["needs-worker"] }` is one `labelled` event with both
lists (`brain-issues.js:44, 1029`), so it has one `seq`. Two drains sending the same swap: the second one's `remove`
names a label that is no longer there. **Tracker change 1:** the service refuses a `labelled` event whose `remove`
names a label the issue does not have, 409, so the loser of the race writes nothing (today line 625 filters silently).
That is "no forking by construction": a persona runs on an issue only after its drain won the swap.

The swap carries the key `drain/<issue>/<persona>/<seq of the needs-X event>`, so a drain that restarts and
sees the same `needs-X` event writes nothing twice (keys are kept once).

**The swap is written with the persona's own token, not the drain's.** The drain mints `worker-<issue>` first and
sends the swap with it, so `by["+worker-processing"].holder` is `secret:worker-<issue>`. Written with the drain's
token it would be the drain's holder, and the independence guard of §3.5 would compare the reviewer with the drain
and let the worker pass its own work. This is the one line the pinch point rests on. `by["+<label>"]` keeps the
last put: a second round puts `needs-reviewer` again and the guard reads that round's seq.

### 3.3 One worker, one session

The worker is a Claude Code session (`agent.sh`, `claude -p`) with its transcript on the volume: `HOME` (and so
`~/.claude/projects/`) of the `agent` user would be `/data/agent`. That is new work: `ensureAgentUser` runs
`useradd --create-home` with no `-d` (`sandbox.ts:75`), so today the home is the system default on the rootfs, and
`agent.sh:46-47` reads it from `getent passwd`; the change is `useradd -d /data/agent` when `/data` is a mount, as
`TOKEN_PATH` already tests (`sandbox.ts:66-68`). One uid and home per persona (`agent-worker` at `/data/agent-worker`,
`agent-reviewer` at `/data/agent-reviewer`), and `claude` runs with `--setting-sources project`: the review of
2026-10-21 found that with one shared persisted home a worker under `bypassPermissions` could write a `SessionStart`
hook into `~/.claude/settings.json` that would run in the reviewer's session with the reviewer's token and write the
pass the §3.5 guard needs to be independent. Every process of the persona's uid is killed at session end. The
session id is already in the `cost` event (`run.ts:278`); the drain
reads the last `cost` event of the persona on the issue and starts `claude --resume <id>` with a message, as `run.ts`
does within one run today (`run.ts:393, 432, 442`). When no transcript is on disk for that id (a volume lost, a
first run), it starts fresh with the brief and says so in the `cost` event (`resumed: false`).

The message on a resume is what changed since the session yielded: the events of the issue after the yield's `seq`,
in the `said` form the page uses (`brain-issues.js:2080`), and the condition that woke it. The brief is read once,
at the first run; a resume carries no brief.

**Cost of a resume, and its bound.** A resumed session carries its whole transcript as input on every turn. At Opus
5.5 prices (`claude-api` skill table, 2026-06-24: $5 in, $0.50 cache read, $25 out per MTok; a cache write is 1.25×
input) a 200,000-token transcript is about $1.25 to write into the cache at a cold resume and then about $0.10 of
cache reads on each turn, so a resume of 10 turns is about $2.25 before output, and the same again at the next cold
resume. A fresh round today costs 167,000 to 266,000 tokens whole (P1), which is the same order; what a resume buys
is not tokens but the memory of what was tried, which is what P1 and P3 are about. The figure is from the price
table, not a measurement; §7 step 6 measures it.
Bounds, in `drain.ts` and tested with a stub: a persona on one issue is resumed at most `RESUMES_MAX` (20) times; a
transcript over `CONTEXT_MAX` (400,000 tokens, from the `context` field of the last `cost` event) is not resumed but
started fresh with the brief and the issue's record, and the event says `resumed: false, why: "context"`. Both are
settings with reasons, 0 for off.

**What the worker does**, in its brief (`roles/worker.md`, from `writer.md`): read the issue and its record; work in
the issue's fork (`work.ts open`, as today); test; deploy the service itself (§3.6) and read the deployer's verdict;
fix and deploy again; when satisfied, write the record comment and label `needs-reviewer`; when it needs something it
cannot get, yield (§3.4). It makes no move but `close` (the issue was wrong or irrelevant, with the reason). It
never writes a review.

### 3.4 Yield and wake

A yield is two writes, in this order: first one `labelled` event that takes `worker-processing` off and puts the
label of what is waited for (`needs-owner`, `needs-token`, `waiting-deploy`, `waiting-issue`); then
`issue.wait { when, until, note }`. `issue.wait` exists (`brain-issues.js:49`): `when` is one CEL expression over
`issue`, `until` at most 30 days on, and the service checks the expression once at the call, so a wait written
before its label would be due at once ("A wait": a wait written after the thing it waits for is due at the first
read). `issue.wakes?id=&seconds=25` answers the caller's due waits and holds for up to 25 s; the drain does not use
it, since the wake is a label event (below) and the drain is not the wait's actor.

The wake is always the same event: the label `needs-worker` put back on the issue, with a comment saying why. So the
worker's wait has one `when`, `"needs-worker" in issue.labels`, and what differs is who puts the label and the
`note` of the wait, which is what the record and the owner read. The guard facts a `when` can read are the issue's
fields, `labels`, `by`, `reviews`, `links`, `children`, `closed`, `last` and `after` (`issueFacts`, `issueWaitFacts`,
`brain-issues.js:800-808`); a comment or a ref is not one, which is why a verdict arrives as a label and not as a row.

| the worker waits for | who puts `needs-worker` back, taking the wait's label off in the same event | the label put at the yield |
|---|---|---|
| a deploy's end: `confirmed` or `put-back` | `issues.receive`, from the topic (below); a `waiting` line (the owner's hold) is a comment with the link and `needs-owner` instead, and the later `approved` line takes `needs-owner` off again with no answer on the page needed | `waiting-deploy` |
| the owner's answer | the page's answer button | `needs-owner` |
| a token | the session that made it | `needs-token` |
| another issue, or its parts | the tracker, on the write that makes the wait's `when` true (change 2) | `waiting-issue`, and an `after` link |
| a review | the reviewer on `changes` or `block`; the drain on `pass` makes `finish` instead (§3.5) | `needs-reviewer` |

A review of a later round does not wait on `size(issue.reviews)`: `issue.reviews` is emptied by a move
(`brain-issues.js:163`) and `flow` has no move between rounds, so round 1's review would stay and the wait would be
due at once. The wake is the label, as for every row.

**Tracker change 2:** a wait may name a `when` other than the label (`issue.after.open == 0`, `issue.children.open ==
0`); when a write makes such a live wait's `when` true, the service appends one `labelled` event,
`add: ["needs-<persona of the wait's holder>"]`, keyed `wake/<issue>/<wait seq>`. The service evaluates waits on each
`issue.wakes` call today; this moves that evaluation to the write path, where the event that changed the issue is, so
no caller polls. `brain-x-loop` sees the `labelled` event as it sees every tracker event: the tracker appends its
events to a topic and `loop.receive` is that topic's subscriber (`brain-loop.js` lines 17, 215), and it already reads
label events (line 367, `e.remove.includes("run-stopped")`). It starts the machine when it is stopped (§3.8).

**Deploys reach the issue through a topic.** The deployer appends each `deploy.*` line it logs (`deploy.waiting`,
`approved`, `verified`, `confirmed`, `put-back`, `dry.none`, `verify.none`) to the topic `deploys`
(`brain-x-topic`, `topic.append`), and the tracker subscribes with `topic.subscribe { target: "issues.receive" }`.
`issues.receive` (**tracker change 3**) finds the open issue with a live wait whose `note` is
`deploy:<worker>@<hash12>` (the worker's yield writes that note; live waits are in the view with their notes, ten
an issue, line 324, where a comment is only a count), writes the line as a comment with the ref
`deployed:<worker>@<hash>`, and in the same call: on `confirmed` or `put-back` puts `needs-worker` and takes off
whichever of `waiting-deploy` and `needs-owner` the issue carries; on `waiting` puts `needs-owner` with the link; on
`approved` takes `needs-owner` off and puts `needs-worker`, because a held deploy was only dry-run: the worker
re-runs `deploy.ts` on the same patch, which now goes through (the review of 2026-10-21 found the first draft left
the patch unsent for ever). `verified` ends no wait: a verified deploy is on probation for 10 minutes and is
put back if nothing confirms it (P8), so the wait ends on the line that ends probation. The deployer is
one of the owner's four, so this append is the one change in §6. Until it is deployed, the fallback is what
`drain.ts` does today while a request pends: a 10 s read of `infra.getState` (`drain.ts:1106-1121`). That is a poll,
against the owner's rule of 2026-10-18; the topic is the fix, and the fallback is named so it is not forgotten.

**One invariant, kept by one watchdog.** Every open `flow` issue carries exactly one routing label: a `needs-*`, a
`*-processing`, or a `waiting-*`. Three cases would otherwise each need a repair of its own: an opener that puts no
label (the page, `brain-x-snapshot`'s digest issues), a machine stopped with `*-processing` on, and a wait past its
`until` with no wake. The last is the lease case of 2026-10-19 (`philosophy.md`): the thing waited for may never
announce itself, the service writes nothing at `until`, every read leaves the wait out from then on
(`brain-issues.js:324`), and `issue.wakes` answers only the caller's own waits (line 50), so neither the drain nor
the worker is there to see it. The watchdog is the tick `brain-x-loop` already has, `scheduled` every 5 minutes
(`brain-loop.js` line 215): an open `flow` issue with no routing label, or with a `waiting-*` or `needs-token` label
and no live wait, or with a `*-processing` label and no machine running, gets `needs-worker` with a note naming the
case ("no label at open", "machine stopped", "wait ended: <the wait's note>"), keyed on the issue's seq. It is a
watchdog on a lease in the form the owner allowed (named, a setting, acts by writing a fault to the record), not a
wait: no calendar hold gates work. `needs-owner` with no live wait is left alone: his answer is awaited however
long, and the wait's `until` is the record's bound, not his.

### 3.5 The pinch point: an independent review, in code

`finish` is the one move with a guard that matters:

```
finish:  issue.reviews.exists(r, r.verdict == "pass"
                                 && r.holder != issue.by["+worker-processing"].holder
                                 && r.seq > issue.by["+needs-reviewer"].seq)
         && !issue.reviews.exists(r, r.verdict == "block" && r.seq > issue.by["+needs-reviewer"].seq)
         && (!issue.major || caller.present || caller.actor == "<the approver delegation>")
```

The third line says the pass is on the work as handed over, not on an earlier round: the worker's hand-over is the
`needs-reviewer` label, and a pass written before it does not count. The fourth keeps v8's rule that a `block` stops
a pass (policy v8 line 103); it is needed here more than there, since `issue.reviews` keeps every round's reviews
under `flow` (no move empties it, §3.4). The reviewer's pass carries refs, as a review
may today (`brain-issues.js:1036`: `reviewed` events have `refs`): `patch:<sha256>` of what it read and
`deployed:<worker>@<hash>` of what it saw live, the two refs `ship.ts` puts on a `done` move today. For a service
issue the reviewer passes only a hash the deployer answered `verified` for; that is in its brief and read from the
record, not a guard, since a ref is not a guard fact (§3.4). The hash it passes is one the deployer answered
`confirmed` for, not `verified`: a verified hash is on probation and can still be put back (P8).

Independence has to be a holder, not a delegation. The kernel caps a token at 24 h, so a session frozen for two days
is resumed under a new child token, and `caller.actor` is `delegation:<id>`, new each time. `caller.holder` is
`secret:<name>` and is a guard fact (`brain-issues.js:157, 555`). The drain names the worker's token
`worker-<issue>` at every mint, so its holder is `secret:worker-<issue>` for the life of the issue, and the reviewer's
`reviewer-<issue>-<n>`, one name a round. **Tracker change 4:** the view folds a review to `{ actor, verdict }` today
(line 627) and `by` keeps the actor of each move and nothing of a label (lines 608, 625); after the change a folded
review is `{ actor, holder, verdict, refs, seq }` (`waits` already keep `holder`, line 324), `by["+<label>"]` records
`{ actor, holder, seq }` of each label put, and the guards above read them. Today's guards compare `r.actor != issue.by.start` (policy v8 line 103), which a
resumed worker would pass. Without change 4 the single-session design has a hole, so it comes first in §7.

The reviewer is a fresh session, Opus 5.5 medium, in a detached clone at the fork's head commit (as `run.ts:448` makes one),
with the record, the patch and the live hash. It writes one `reviewed` event (`pass`, `changes`, `block`) and one
label: `needs-worker` on `changes` or `block` (with what to change), nothing on `pass` (the drain makes `finish`
when the guard holds, or labels `needs-owner` when `major`). It is never resumed; a second review is a new session.
What it reviews is the result: the live hash and its tests, the record, and the patch. The owner's reading of what a
review is for stands (`philosophy.md`, 2026-10-11: functional quality, not world measurements).

`major` stays a label and keeps the owner's hand: the `finish` of a `major` issue is his (the guard's approver
delegation clause is kept as today's policy has it; whether to strike it with the persona is his, decision 1 of §9). The approver persona is dropped as a step; its brief becomes the decision-comment form the
drain writes on a `major` issue when the review passes, so the owner reads one comment and clicks once.

### 3.6 Deploys by the worker

The worker deploys with the machine's deploy token (`/data/deploy-token`, `aff660e`) through `apply.ts --patch`
under the `cb4` lock, as `ship.ts` does in steps 4 to 9 (summary §4), but from inside the session, so the verdict
comes back to the agent that can act on it. `ship.ts` becomes a tool the worker calls (`deploy.ts <issue>`), not a
step the drain runs after a pass. Its checks that read the workflow (`ship.ts:112-136`: `in-review`, `major`,
`to-approval`, `approve`) go; what stays is: the patch's SHA-256 equals the one on the issue's head ref, the dry run,
the hold, the lock, the sweep.

The deployer's hold on `brain-x-*` deploys (the owner's, 2026-10-19) stays as it is: the worker yields on the
deploy, a `deploy.waiting` reaches the issue through the topic as `needs-owner` with the link, his click on that
link is the `approved` line, which takes `needs-owner` off and wakes the worker to send the patch (§3.4), and
`confirmed` or `put-back` wakes it again. One click per deploy, nothing to answer on the page. The owner's four are never deployed by the loop: a change to them ends with
the worker's comment of the commands and `needs-owner`, as `ship.ts:153-187` writes today.

A put-back is an end of the wait like a confirm: the worker reads `put-back` and the deployer's log of the failed
tests, fixes, deploys again. No `rolled-back` label, no `not-done` move: `rollback.ts` goes, since the
agent that deployed is the one that reads the answer (P8's false labels were a sweep reading a log it did not write).

### 3.7 The drain, rewritten

What the drain does, whole:

1. At boot: clone `main`, publish its personas (§3.8), list `issue.list?label=needs-X` for each X it has, oldest
   first. An `X-processing` row left by a stop mid-run is the watchdog's (§3.4), not the drain's.
2. Hold one stream of tracker events (today `loop.assign` from `brain-x-loop`; the rule moves to §3.8) and act on
   `labelled` events that add `needs-X` for an X it has.
3. For one issue at a time: mint the persona's token (`agent-token`, name `worker-<issue>` for the worker at every
   resume, `reviewer-<issue>-<n>` for the reviewer of round n, §3.5), make the swap with that token (§3.2), resume or start the session,
   wait for it to end, write the `cost` event, and revoke the token when the session ends (its yield, hand or
   finish). The next resume mints `worker-<issue>` again: the holder name is the same, the delegation id new. Today's
   children carry a hex suffix each (`impl-cdf92d`), so whether the kernel takes a name again while a delegation of
   that name lives was never met; revoking at the end leaves no such case.
4. When no `needs-X` is listed and no session runs: exit. `brain-x-fly` stops the machine as today.

Width is 1 by the owner's sketch (decision 2 of §9 asks it). Runs were active in 25 of 48 half-hours on 10-20 with width up to 8 and one issue
per `about`, so the width was not what bound throughput; the waits between steps were (P2). What width 1 deletes,
with the claim-as-event: `brain-x-loop`'s `loopAssign` overlap by files and by `about`, the `owed` list, the
`approveFails`, `approveDone`, `patchMoved`, `notAbout`, `sameStop` hold maps and the circuit breaker (`drain.ts:
905-916, 1814-1889`), the `two-landings` and `landing-not-about` refusals (588 of 642 run-stops in 3 d, P7), the
`landing` promise chain and `given` (`drain.ts:816, 1122`), `run.ts`'s round machinery (`run.ts:393-442`), the
unsticker, the merger as a step (a conflict is the worker's to resolve in its session; `push.ts` tells it), the
stranded and after-cycle sweeps. Kept: `agent.sh`, `sandbox.ts`, `work.ts`, `apply.ts`, `patch.ts`, `push.ts`,
`request-token.ts` and the token renewer, the disk and load gates, `deadSecrets`.

What stays outside the record after this: the session transcripts on `/data`, the deploy token file, the day's spend
(read back from `cost` events at boot instead of `DRAIN_DAY_USD`, so a restart does not reset it).

### 3.8 Starting the machine, and the personas it has

The owner's sketch has the machine poll for `needs-*`. His rule of 2026-10-18 has no polls, and the machine is
stopped most of the day (`hoursToday` 4 to 12 h), so a poll from the machine cannot start the machine. The wake is
where it is today: `brain-x-loop` is sent each tracker event by a topic subscription (`loop.receive`, `brain-loop.js`
line 17; a decision "at each event of the tracker", line 215) and calls `fly.up` when a row is doable and the machine
is stopped (line 892 is where it declined to for `ready` rows, P2). Its rule becomes one line: a
`labelled` event that adds `needs-X`, and X is in the set `personas` the loop keeps, and no `X-processing` is on the
issue. `owed()` and `machineDoable` go.

`personas` is the set of `roles/*.md` the machine's checkout has. `config.set` is the owner's session only
(`working-with-cloud-brain…` "Settings"), so the set is a row the loop keeps, written by a method of its own,
`loop.personas { list }`, callable with `LOOP_TOKEN`. Two writers keep it fresh: the drain at every boot (its clone
is `main`), and a `prek` pre-push hook in `cloud-brain-dev` that runs `bun personas.ts` with the laptop's `loop-*`
token, so a persona added on the laptop is startable before the machine next boots. `cloud-brain-dev` has no hook
config today (no `.pre-commit-config.yaml`; checked 19:33 UTC); the hook is new. A persona named in a label and not
in the set is listed by `loop.status` as `unknown` with the issue, so a typo is seen and does not wait silently.

### 3.9 Filing tickets, bounded

The worker files what it meets, as the sketch asks, under the owner's rule of 2026-10-20 18:10 UTC (retro 10-20 §4,
change 1): a defect in the loop's machinery is fixed directly by a session, not ticketed. So: a ticket a worker opens
about `cloud-brain-dev`, `brain-x-loop` or `brain-x-issues` is `kind: feedback` (two states, nothing runs on it); the
retro or the owner promotes it. A ticket about anything else is a `task` and gets `needs-worker` like any other. The
worker's brief says both and quotes his line. The measure is the 10-20 split: 507 of 607 opened in 7 d were about
the loop; the retro reports the share each day.

### 3.10 Models

Opus 5.5 at medium effort for every persona, as the default in `agent.sh` (`MODEL` unset falls to `opus` today,
`agent.sh:83`) and in each `roles/*.md` `accepts` block. Today's table (`run.ts:182-186`; `roles/*.md`):

```
writer     claude-sonnet-5-5  medium   ->  worker    claude-opus-5-5  medium
reviewer   claude-opus-5-5    low      ->  reviewer  claude-opus-5-5  medium
approver   claude-opus-5-5    high     ->  (no persona; the owner's click)
triager, spec, overseer, unsticker, merger, summarizer, digest   sonnet medium  ->  opus medium, or dropped (§3.7)
```

The retro machine stays Opus 5.5 high (`run.sh`, the owner's `2ce77c73`). A role file may override, with a reason.

### 3.11 The owner's inbox

One list: `issue.list?label=needs-owner`, which the page's block draws today. Each such issue has the decision
comment in the form of `philosophy.md` "What `needs-owner` means" (project, where this fits, lettered choices, the
agent's pick, how to answer). His answer is a comment and the label taken off; the tracker wakes the worker (§3.4).
A deploy that waits for his click is the same row with the link. P9: the channel is the record; a DM is a courtesy
on top of it, sent when `LOOP_BLUESKY_TOKEN` is alive and not otherwise relied on.

## 4. What each part removes, and what it does not

| # | removed by | not removed |
|---|---|---|
| P1 | §3.3 one session resumed; §3.1 no state per role | a review still starts a fresh session (by design) |
| P2 | §3.4 the tracker wakes the worker; §3.8 one wake rule in one place; §3.1 no `triaged`/`ready` step | a stopped machine still needs `fly.up`; the first start of a day is a Fly boot (about 60 s) |
| P3 | §3.6 the worker deploys and reads the verdict; §3.5 the review reads the live hash | a worker that is "satisfied" too early; the reviewer is the check |
| P4 | §3.5 one click on a `major` issue, in the record; §3.6 one click on a held deploy, no second gesture | the deployer's hold itself (his choice); the 24 h token (kernel) |
| P5 | §3.9 machinery tickets are feedback | the `out-*` sessions filing; only a measure |
| P6 | §3.2, §3.4 claim and wait are events; §3.7 the hold maps go | transcripts on `/data`; a lost volume loses sessions, not work (the fork and the record remain) |
| P7 | §3.7 width 1, claim by event: nothing to refuse twice | a worker that loops on a failing deploy: `RESUMES_MAX` bounds it |
| P8 | §3.6 the verdict goes to the agent, `rollback.ts` goes | the deployer's own no-verdict policy (his, 10-21-2 §4) |
| P9 | §3.11 the record is the channel | a DM still needs a live token |

## 5. Migration without orphans

At 19:29 UTC cb4 held 1,149 issues, 27 open: `ready` 11, `triaged` 4, `in-review` 3, `building` 3, `open` 2,
`stopped` 2, `spec` 2; labels on the open ones `needs-owner` 10, `major` 7, `stranded` 6, `owner` 6, `run-stopped`
5, `digest` 3, `laptop` 3. Six workflow hashes are in use across the 500 most recent issues.

`issue.install` with `migrate` swaps open issues one at a time to a named state of the new workflow (as event 483 did
for 27 issues on 2026-10-11). Closed issues are not migrated and keep their workflow: the 1,122 closed issues stay
readable and verifiable as they are, which is what "no orphaning" needs. The map for the task workflow:

| old state | new state | label put | note |
|---|---|---|---|
| `open`, `triaged`, `ready` | `open` | `needs-worker`, unless `needs-owner` is on | triage is the worker's first step |
| `in-progress` | `open` | `needs-worker` | the fork keeps the work; the session is new (no transcript yet) |
| `in-review` | `open` | `needs-worker` | a swap empties `issue.reviews`, and the `finish` guard reads `by["+worker-processing"]`, which a migrated issue lacks (review of 2026-10-21): the worker's first turn re-sends; a landed no-patch submit is closed by hand before the install (4 on 2026-10-17, `plan/cloud-brain-machine-does-everything.md` gate 7) |
| `awaiting-approval` | `open` | `needs-worker`, `major` | the same guard: no pass after `+needs-reviewer` means no path to `done` from `needs-owner` (0 such issues on 2026-10-21) |
| `stopped`, `not-done` | `open` | `needs-worker` with the stop reason quoted | `run-stopped` taken off |
| `done`, `closed`, `rejected`, `reverted` | not migrated | | |

The `project` workflow (5 open: 2 `spec`, 3 `building`) and `feedback` are not touched by this install. A project's
parts are tasks and migrate with the table. A later install can fold `spec`/`spec-review` into `needs-spec` and
`needs-reviewer` the same way; not in this plan.

The order of the owner's acts, each one click or one command with his session:

1. Deploy `brain-x-issues` with tracker changes 1 to 4 (§3.2, §3.4, §3.5): a service deploy, under his hold; then
   `issue.rebuild`, so rows written before it carry `holder` and `seq`.
2. Deploy `brain-x-topic` with its method rule widened to the deployer's caller kind (`deployer` is not in
   `[owner, token, did, worker]`; found 2026-10-21 building §6), `topic.create deploys` (write: the deployer; read:
   the owner), `delegation.create deploys-push` for `brain-x-topic` over `issue.receive`, and
   `topic.subscribe deploys → issue.receive` with it. The delegation of §10 is the subscriber's, made in his session.
3. Deploy `brain-x-loop` with the wake rule, `loop.personas` and the watchdog (§3.4, §3.8); make the `loop-personas`
   token; remake `loop-reconcile` with `issue.comment` in scope (the watchdog's notes are comments).
4. Merge the three `cloud-brain-dev` branches, set the machine's command to `drain2.ts` and move `flow/*` to
   `roles/` in the same commit; the persona users' homes are made on the volume at boot.
5. Install the policy with `flow` and the map above (`issue.install`, owner present), then
   `migrate-labels.ts --write` with a session token.
6. Deploy the deployer with the `topic.append` (§6) by `deploy-deployer.ts`, then `confirm` it.
7. Deploy one service whose issue waits on `deploy:<worker>@<hash12>`: `topic.subs` shows `dropped` 0 and the issue
   a `deployed:` comment and `needs-worker`. The live `issues → loop` subscription showed 392 dropped entries on
   2026-10-21, a defect of today's loop outside this plan.

## 6. The one change to the owner's four

The deployer appends each `deploy.*` log line to the topic `deploys` (`topic.append { topic: "deploys", key: <ray>,
body: <the line> }`), under a delegation for `brain-x-topic` as `topic.subscribe` asks. About ten lines in
`brain-deployer.ojs`, beside the existing log write. The owner deploys it with the recovery key as he deploys the
four. Without it, §3.4's fallback poll stands and the plan still works; with it, no poll is left in the loop.

## 7. Order of work

Each step has a check that is a number or a live event, so the retro can say whether it worked.

| step | what | check |
|---|---|---|
| 1 | Tracker changes 1 to 4 as a patch to `brain-issues` in `cloud-brain-dev` (no seed since `88f03840`; `build.ts` reads what cb4 runs), tests in the module | a resumed worker under a second token is refused `finish` on its own pass (test); a losing swap answers 409 (test); a wait wakes on the write path (test); deployed and `verified` |
| 2 | The `flow` policy body, `plan/cloud-brain-issues-policy-v10.json` (v9, written 2026-10-17, is the one in force: its `stopped`, `retry`, `not-done` and `requeue` are in `issue.policy`), with `migrate`; `policy-pins.ts check` | installed; `issue.verify?guards=true` ok; the 27 open issues each carry one `needs-*` label |
| 3 | `drain2.ts` beside `drain.ts` (§3.7), `flow/worker.md`, `flow/reviewer.md` (in `flow/`, not `roles/`, so `main`'s drain keeps its reviewer until the cutover commit moves them), `deploy.ts` from `ship.ts`; sessions on `/data/agent-<persona>` | one issue carried from `needs-worker` to `done` with one worker session resumed at least once across a deploy wait, read from its `cost` events (`resumed: true`) |
| 4 | `brain-x-loop`: the wake rule and `loop.personas`; the `prek` hook | a `needs-worker` label put while the machine is stopped starts it within one `fly.up` (core log) |
| 5 | The deployer's `topic.append` (§6) | a `deploy.verified` line reaches the issue as a comment with its `deployed:` ref, and `needs-worker` with it, with no `infra.getState` read in the drain's log |
| 6 | The retro brief: measure the share of issues whose worker session was resumed, resumes per issue, idle half-hours with a `needs-*` label, owner clicks per `done` | the next retro's survey has the four rows |

Steps 1 and 3 can be built together on a stand-in Brain; nothing lands on cb4 before step 2's install.

## 8. Not chosen

- **Keep the state machine and add resumable sessions to it.** Keeps every `drain.ts` line that names a state (P2)
  and the three-text disagreements. The sessions alone would fix P1 and not P2.
- **One state per persona (`working`, `reviewing`) instead of labels.** The same routing, with moves and guards to
  write for each pair, and a migration for each new persona. Labels add a persona with one role file.
- **Width above 1.** The measured idle time is between steps, not for want of parallel runs (P2); width brings back
  overlap rules and the refusals of P7. Revisit when idle half-hours with a `needs-*` label fall under 4 of 48.
- **The worker reviews its own work with a second session of the same persona.** No independence; the holder rule
  (§3.5) is what makes the review mean something.
- **Review before deploy, as today.** The reviewer would read a patch and not a live hash, and the worker would wait
  for a session that is not on the issue. The deployer's tests, the probation and the owner's hold are the gates while
  the worker iterates; the review at the end reads what is live. Cost: unreviewed code of a `brain-x-*` service is
  live between a worker's deploy and the review, behind the owner's click.
- **A machine that polls the tracker.** Cannot start itself; against the 2026-10-18 rule.
- **Transcripts in the record.** The record is signed and kept; a transcript is 100 to 400 k tokens and private to
  the session. `/data` holds them; the record holds the session id.

## 9. Decisions

Answered by the owner 2026-10-21 about 20:50 UTC, as typed: "a A 2 A 3 A 4 A 5 A 6 A". So: review at the end over
a confirmed hash; width 1; the deployer appends to the topic (his deploy, §6); projects left for now; 20 resumes and
400,000 tokens per issue; this file is the plan. The approver-delegation clause of the `finish` guard (§3.5) was not
asked separately and is kept until he strikes it.

1. **Review at the end, over the live result, or before each deploy?**
   A. At the end (§3.5, recommended): one independent review per issue, of the live hash; the deployer and the hold
   gate the loop. B. Before each deploy, as today: a review per round, no unreviewed service code live, more sessions.
2. **Width.** A. One session at a time (your sketch; recommended for the first month, with the idle measure).
   B. One per `about`, as `brain-x-loop` does today, keeping the overlap rule.
3. **The deployer's topic append (§6).** A. You deploy it in step 5 (recommended). B. Leave the 10 s poll as the
   standing fallback. C. The tracker reads `logs.deploys` on each `issue.wakes` call instead (no deployer change; a
   read on every wake).
4. **Projects.** A. Leave the `project` workflow for now (recommended; 5 open). B. Migrate it in the same install
   with `needs-spec` and `needs-reviewer` (one more table, the same mechanism).
5. **Resume bounds.** A. 20 resumes and 400,000 tokens per issue, then a fresh session (recommended). B. No bound.
6. **The plan's form.** A. This file (recommended; it is a design of services and a migration, not a notebook).
   B. A spec notebook (`/spec`) you annotate.

## 10. Not verified

- Whether `claude --resume` works for the `agent` user under `setpriv` with `HOME` on `/data`, and whether a
  transcript survives a Fly stop there (the volume does; the file layout of `~/.claude/projects/` is the CLI's).
- ~~Whether `topic.subscribe` needs a delegation the deployer does not hold~~: settled 2026-10-21 by reading the
  topic service; the delegation is the subscriber's (`deploys-push`, held by `brain-x-topic`), made in the owner's
  session (§5 step 2). The deployer declares no `calls` and the core checks none.
- The cost figure per resume is from the price table, not a measurement.
- Whether `issue.install`'s `migrate` can put a label beside the state it maps to (event 483 mapped states only).
  If not, the label column of §5 is a script run right after the install with a session's `out-` token, one
  `labelled` event an issue, keyed `migrate/<issue>/flow`; the watchdog of §3.4 would put `needs-worker` on any it
  missed, with the note "no label", so nothing is orphaned either way.
- `issue.list?label=` takes one label; "has `needs-X` and not `X-processing`" is two reads or a tracker change.

## 11. The plan of 2026-10-17

`plan/cloud-brain-machine-does-everything.md` (on `origin/main`, 2026-10-17) set seven gates for the machine taking
every kind of issue. Read against this plan on 2026-10-21: gates 3 (an approver persona on the machine), 4 (the
triager) and 5 (readying) are superseded, since the approver, `triaged` and `ready` go (§3.1, §3.5); gate 2 (a
capped deploy token) is kept by §3.6 without its per-ship minted token; gate 1's `laptop` retirement and gate 7's
closing of landed no-patch submits are taken into §3.1 and §5 above; gate 6 (a text-product persona) and its
classes A–E of stranded rows are not in this plan. The §3.4 watchdog puts `needs-worker` on any open `flow` issue
the migration left without a routing label, which is how the 6 `stranded` rows are reached.
