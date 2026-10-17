# Cloud Brain: the Fly machine takes every kind of issue

Spec for tracker issue `spec-machine-does-everything` on cb4. Written 2026-10-17 by session `out-d6d8e2`'s writer.
Measured 2026-10-17 03:33 to 03:40 UTC. Nothing here is built, deployed or landed.

## What was asked

The owner, 2026-10-17, to `out-d6d8e2` (the issue's body, event 8655):

> right but I keep filing tickets about automating more without me, but we do not seem to be making progress. I want
> the clouddev machine to be able to do everything. So what can we do to stop issues being fixed and take all these
> kinds of stranded tasks?

The issue's gate 1 proposed a sparse clone of `lopecode-dev` on the machine. The owner reversed that the same day,
relayed to this writer by the coordinator:

> No this is not the issue, there should be no "laptop" or "lopecode-dev" tasks. Everything lives on the cluster, so
> why do we keep thinking about "(rules, briefs, skills, plans, seeds)" which live on the cluster.

So gate 1 below is a migration and a re-aim, not a clone. Gates 2 to 7 follow the issue's order.

## Where the issue's first version was wrong

Each is a measurement of 2026-10-17 against a sentence of the body.

| the body | measured | source |
|---|---|---|
| 52 rows, 05:27 | 56 rows, 03:33 UTC (05:33 CEST); the four new ones include this issue | `loop.work`, `--owner` read |
| 20 of 25 ready rows stranded by scope | 21 of 26 `write` rows (18 by `about`, 3 by `laptop`); the 21st is this issue | same |
| a sparse clone of `lopecode-dev` | reversed by the owner (above) | |
| "the approver's policy is not installed (B7)" | a policy for the approver has been in force since event 4668 (2026-10-12); the text is `brain-loop.js` line 245, a constant | `rules.md` "The approver"; `brain-loop.js:245` |
| the trial needs 20 verdicts | the record has 41 approver verdicts (16 approve, 25 leave), 10-12 19:17 to 10-14 19:04 UTC | `issue.sync`, 8660 events, bodies starting `approver:` |
| "the machine at 4 CPUs" | `shared`, 2 CPUs, 2048 MB, image `fly-2-b` | `fly.status` |
| "15 issues at `open` with no triager" | `drain.ts` has triaged since 2026-10-16 (`roles/triage.md`), but only `task`/`bug` issues it could do at `ready`; of the 15, 7 are `feedback`, 3 `digest`, 1 `project`, 1 `feature`, 3 out of scope | rows against `issue.list` |

The main error in the first version: most of the stranded `loop` and `issue-loop` rows are not about files the machine
cannot reach. They are about the laptop loop that the machine has replaced. That loop's driver last wrote
`.emitted/issue-loop/status.md` on 2026-10-13 22:02 local, and the last `loop` lock held from a laptop was `drain-Mac`
at 10-14 17:50 UTC (`issue.locks?history=500`). Since then every `loop` hold has been `drain-d896915f316098`.

## Read

- `knowledge.search?semantic=true`, `--as loop-knowledge`, three queries. "loop briefs and rules moved into
  cloud-brain-dev": `doc:cloud-brain-dev-philosophy` 0.97, `doc:cloud-brain-worktree-per-topic` 0.84. "records to
  the tracker instead of files": `doc:cloud-brain-bookkeeping-in-the-tracker` 0.96. "approver policy pins brief and
  tool": `doc:pm-approver-leaves-everything` 0.92, `doc:cloud-brain-approver-persona` 0.83. Used: the last two, for
  gate 3. I read only the titles of the others.
- `cloud-brain-dev` at `origin/main` `0105720`: `README.md`, `AGENTS.md`, `accept.ts`, `roles/writer.md`,
  `roles/triage.md`, and the headers of `work.ts`, `patch.ts`, `push.ts`, `ship.ts`, `drain.ts`.
- `deploy/@tomlarkworthy/brain-loop.js` and `brain-issues.js`, from `bun sync.ts` at 03:3x UTC.
- Issues, whole: those the coordinator named, the 21 stranded `write` rows, the 4 old submits, and the 2 `run-stopped`.

## What exists today, measured

**What stops the machine.** `owed()` in `brain-loop.js:226` returns
`"about " + about + ", which a machine does not change"` for any `about` that is not a service, one of the owner's four,
or `cloud-brain-dev`. The same classes are in `accept.ts` (`aboutClass`: `service`, `owners`, `dev`). The cause is the
`about` and nothing else: no row says a file is missing. The tracker cannot change an issue's `about` after it is
opened. `about` is set only in the open (`brain-issues.js:1109`), and a grep for a method that edits it found none. The
precedent is a twin: `reader-clone-keeps-writer-claude-hooks` (about `brain`) was answered by
`reader-clone-drops-writer-claude` (about `cloud-brain-dev`, now `done`).

**The rows, by reason** (`loop.work`, 2026-10-17 03:33 UTC, 56 rows, `machineDoable` false on all):

```
21  write   about loop 7, issue-loop 5, brain 4, knowledge 2; labelled laptop 3
15  triage  "not triaged; no triager yet"
 6  go      "triaged, to be made ready"
 5  write   "waits in issue.queue (a link, a hold or its parts)"
 4  decide  "submitted with no patch ref to review"
 3  approve "the approver's policy is not installed (B7)"
 2  decide  "labelled run-stopped"
```

**What lives where** (lopecode-dev `origin/main` `e1a62b6c`, 2026-10-16 23:25 +02:00; `git ls-files | wc`):

| class | in lopecode-dev | on the cluster today |
|---|---|---|
| laptop loop briefs | `.claude/skills/brain-maintenance/agents/` 18 files, 218 KB; `SKILL.md` 114 KB; `oversight.md` 399 KB | none of these; the machine loop has `roles/writer.md`, `reviewer.md`, `triage.md` in `cloud-brain-dev` |
| rules | `rules.md` 51 KB | `AGENTS.md` "Rules, the owner's", 7 lines |
| approver | `agents/approver.md` (222 lines), `tools/cloud-brain/approver.ts`, `tests/tools/approver*.test.ts` | the policy in force pins the blobs of the first two on lopecode-dev `origin/main` (`rules.md`) |
| plans, specs | `plan/cloud-brain-*.md` 38 files, 1.5 MB | a `doc:` entry each and a file in `static` (`docs/lopecode-dev/…`), put at each landing by `loop-docs` |
| records | `tools/cloud-brain/records/` 313 files, 2.9 MB | for `cloud-brain-dev`, the record is the issue's comments (`dev-records-to-tracker`, 2026-10-15) |
| post mortems, digests | 3 files 42 KB; 9 files 127 KB | post mortems as `doc:pm-*`; digests as library notebooks |
| seeds | 18 `.ojs`, 1.4 MB: kernel, core, db, deployer, the page and its modules, iac, 4 digests | the running modules (`deploy/services.json`, 27 entries, the four and `brain-x-page` among them) |
| tools and tests of the laptop loop | 51 `.ts`/`.sh`/`.py`, 711 KB; `tests/tools` 168 files, 2.3 MB | `cloud-brain-dev` has its own: `issue.ts`, `run.ts`, `drain.ts`, 23 test files |
| summarizer brief | `knowledge-docs.ts`, `summarize-papers.ts` | `brain/roles/summarizer.md` on the Brain, 6656 bytes |

`brain/roles/` on the Brain still lists `service-writer.md` and `service-reviewer.md`. The README says they are to be
deleted, which means one brief is kept in two places (`curl …/static/cloud-brain-dev/index.md`, 03:3x UTC).

**The machine.** `fly.status`: machine `d896915f316098`, `stopped`, `shared` 2 CPUs, 2048 MB, `maxHoursADay` 8.
Hours it held `loop` (`issue.locks?history=500`, holder `drain-d896915f316098`): 10-14 0.43 h, 10-15 4.97 h,
10-16 5.50 h. The cap is 56 h a week. The price an hour was not read (see "Not measured").

**Who moved issues to `done`** (`issue.sync`, moves `to: done`, UTC): 10-14 12, 10-15 17, 10-16 26. Of the 26 on
10-16, 17 were the owner's `approve` in his session, 8 were `pass` by `out-*` session tokens, and 1 was by
`drain-agents`. Events with the owner present (`tab` or `via: session`): 10, 61 and 18 on those three days.

**Browser.** None of the 21 needs one, going by their bodies. `suite-fails-on-the-fly-machine` fails on `zsh` missing
and git 2.43, not on a DOM. Browser tests stay with `test-ts-remote-in-the-deployer`.

## Gate 1: migrate, then re-aim

Each stranded `write` row is in one class below. A class's home is the place the machine already reads, and no new store
is added. Reading, not his words: "lives on the cluster" means `cloud-brain-dev` (the Brain's git), the tracker
(comments and attachments), and the Brain's `static`/`knowledge`.

| class | rows | home | how a row goes |
|---|---|---|---|
| A. retired laptop loop | `rk-4-issue-as-sends-as-of` (its twin `dev-issue-ts-sends-as-of` is `done`), `rk-6-read-after-three-days`, `st-8-read-after-three-days`, `wt-6-check-after-a-day`, `suite-fails-on-the-fly-machine`, `approver-test-names-deleted-seeds`, `reader-clone-keeps-writer-claude-hooks` (twin done), `port-seed-era-service-issues` (its comment 7436: nothing stranded) | none: the tool they change does not run | closed, with the reason and the twin |
| B. briefs and rules | `seen-briefs-fixes-of-four`, `rules-never-other-company-credential`, `approver-brief-lines-of-the-approvers`, `approver-also-readies`, `approver-brief-test-leave-reasons-fail` | `cloud-brain-dev/roles/*.md` and one `rules.md` there (`dev-rules-of-the-loop`) | a twin about `cloud-brain-dev`, with the lopecode-dev text attached |
| C. reads and records | `ap-3-trial` | a comment on its issue | the persona of gate 6 |
| D. docs, specs, post mortems | `fly-5-docs`, `pm-digests-not-automated`, `pm-repeat-instructions`, `spec-notebook-summarizer-persona`, this issue | an attachment on the issue and a `doc:` entry | the persona of gate 6, or a `docs/` directory (pick 1) |
| E. labelled `laptop`, really a service | `rk-2-moves-are-his-or-a-token`, `rk-5-made-from` (both `brain-x-issues`, `major`) | the running `brain-x-issues` (no seed since 2026-10-14) | label off; `rk-5`'s `loop.ts`/`SKILL.md` part goes with class A |

Total 20, plus this issue. Of the 6 `go` rows, by title only (not each body read): `bk-7-read-after-two-days`,
`tr-5-read-after-three-days`, `os-5-trial-read` and `fly-6-after-seven-days` are reads (class C);
`plain-worktree-outside-checkout-fails` is a bug of lopecode-dev's `tests/tools` (class A);
`never-core-and-db-deployed-by-the-loop` is a rule (gate 5).

**Why a twin needs the text attached.** `dev-rules-of-the-loop` (about `cloud-brain-dev`) is `run-stopped` for exactly
this reason. Its writer's comment 8511 says the lines it was to copy are in lopecode-dev's `rules.md`, and "that file is
not on this" machine. A migration task therefore carries its source. The session that opens the task attaches the
lopecode-dev file at the commit it read (`issue.attachment`, as `agents/spec.md` step 7 does), and the machine's writer
reads it from the tracker. This is the only act of the migration that needs a checkout of lopecode-dev, and it is done
once per class.

**The order.** Class A first. It strands the most rows (8 `write`, 1 `go`) and moves zero bytes. Then B, which strands
5 rows and unblocks `dev-rules-of-the-loop`. Then E (2 rows: one label each). C and D wait for gate 6.

**The label `laptop`.** It is in `labels-not` of `roles/writer.md`, `reviewer.md` and `triage.md`, and in `LABEL` of
`accept.ts`. Reading: after class E it means "the owner's hands" (a login, a device). `needs-owner` already says that, so
the label is retired, not redefined. Each issue labelled `laptop` today: `rk-2` and `rk-5` (a service patch; label
off), `wt-6` (class A, closed), `fly-machine-per-run-tokens` (a `brain-x-fly` method and an image `USER`; its Fly-side
steps are the owner's, `needs-owner`), and `rk-3-as-of` and `fly-tools-from-reviewed-ref` (gate 7).

**Seeds.** No stranded row changes one of the 18 `.ojs`. Making the running module the source of truth for the page
and the owner's four is the step `no-stale-seeds` took for `brain-git`, `brain-fly` and `brain-issues` on 2026-10-14.
It is listed as a later move (task `mde-6`), not a gate.

**Not chosen.** A sparse clone of lopecode-dev on the machine, reversed by the owner. A new store for briefs: `roles/`
in `cloud-brain-dev` already does that job and `run.ts` reads it. A second loop for laptop work: the label is retired
instead.

## Gate 2: shipping

`deploy-token-capped-to-services` is at `awaiting-approval` (about `brain-x-deployer`, `major`). Its review 8616 passed
patch `40accdf3…` ("kernel gives the unattended token infra.apply alone; deployer caps its apply to services"). It is
one of the owner's four, so `ship.ts` refuses it ("An issue about one of the owner's four services … stops it, approved
or not", README). `drain-ships-with-a-capped-token` (about `brain-x-loop`) is `after` it and waits in the queue. On a
machine with no safehouse, `run.ts` refuses `DEPLOY_TOKEN` in the environment (`sandbox.ts`, README "Until none is
left"). The issue's body therefore has the token minted per ship step by `brain-x-loop`, not set as an app secret.

## Gate 3: approving

In force: the `approve` guard is `caller.present || caller.actor == "delegation:eb3db9d0c6a5"` (`loop-approver`), by
the policies of events 4668 and 5689. That delegation made 13 `approve` moves; the owner's session made 120. The policy
pins `agents/approver.md` and `approver.ts` by blob on lopecode-dev `origin/main`, and the tool makes no move when
either blob differs (`rules.md`, "Its own files"). Nothing on the machine runs an approver: `brain-loop.js:245` returns
the `approve` row with `machineDoable: false` as a constant, and no `roles/approver.md` exists. `accept.ts` already
lists `approve` among `STEPS`.

Moving the approver to `roles/approver.md` and a tool in `cloud-brain-dev` changes what the policy must pin. A
policy that pins the new blobs is his to install. What installing it lets the approver do is what it does today:
`approve` one issue at `awaiting-approval` whose `asked:` line quotes his words. What stays his (`rules.md`, "The
approver", and the issue): a change to the owner's four, to the approver's own files or the policy cells, a credential,
a deploy key, a Cloudflare permission, and an issue an approver left.

`ap-3-trial` waited "until `approver.ts trial` prints 20 verdicts" (comment 4478), with the six `test-approver-*` rig
issues kept apart (review 4118, finding 7). The record has 41, and none is on an issue whose id starts
`test-approver`. So the trial is a read of the record (class C) and needs no more runs.

The three rows today: `deploy-token-capped-to-services` (the four: stays his), `triager-build` (`cloud-brain-dev`,
`major`; an approver could take it), `dev-sandbox-args-of-its-own` (he said "yes lets leave it", comment 8375).

## Gate 4: triage

`triager-build` (`awaiting-approval`, review 8603 pass) adds `roles/triager.md` and candidate lists to the drain.
`owner-feedback-acted-on-at-once` is `after` it. Two gaps remain after it is pushed:

- `brain-loop.js:232` returns the `open` row as "not triaged; no triager yet", a constant, whatever `roles/` declares.
- `roles/triage.md` takes `about: [service, dev]` and kind `task`/`bug`. 7 of the 15 are `feedback`, which stays
  `open` until gate 4's second task promotes it.

## Gate 5: readying

Of the 6 `triaged` rows, 4 are reads (`bk-7`, `tr-5`, `os-5`, `fly-6`: class C, gate 6), 1 is a class-A bug
(`plain-worktree-outside-checkout-fails`), and 1 is `never-core-and-db-deployed-by-the-loop` (`major`, a rule
that is his). `roles/triage.md` already moves an issue it triages to `ready`. `approver-also-readies` asks the approver
to do the same for issues triaged by someone else. Not chosen by me; this is pick 5.

## Gate 6: writing as a persona

`spec-notebook-summarizer-persona` is ready, and `digest-on-the-loop` is `after` it. `brain/roles/summarizer.md` exists
on the Brain. The post mortem `pm-second-summarizer-role` records the owner's ruling against a second role for the same
job (2026-10-12: "we just make the summarizer more general"). Reading, not his words: classes C and D of gate 1 are the
same job (text whose product is a comment, an attachment or a library page, not a patch), so this one persona takes
reads, records, post mortems and digests. `STEPS` of `accept.ts` has no step whose product is text with no patch, and
the `decide` row "submitted with no patch ref to review" is what a text submit becomes today. The spec of that issue
defines the step.

## Gate 7: old submits with no patch

All four are `in-review`, have no review, and refer only to lopecode-dev commits. `git merge-base --is-ancestor` on
each ref against `origin/main`: all 10 are on main, dated 2026-10-13 or 2026-10-14. `rk-3-as-of` also has
`deploy brain-x-issues@cdadff0b3560`. Port-seed-era comment 7436 says its change is in what cb4 runs.

Rule: a submit whose every ref is on main (and, for a service, in what runs) is closed with the reason
"landed unreviewed under the retired laptop loop at <shas>", by the triager or the session that runs gate 1. A submit
with a ref that is not on main is sent back to `ready` as a twin about its class. The other way (one review of each
after the fact) is pick 7.

## Stops and size

`run-stopped`: `dev-rules-of-the-loop` (gate 1 B: its source file was not on the machine) and
`deployer-keeps-whole-test-failure` (comment 8597: writer killed at 2701 s; the deployer suite took 2212 to 2701 s on
the machine, `test-ts-remote-in-the-deployer`'s body). A resize is pick 8: the target of 4 CPUs is the issue's, and
`fly machine clone` to a new host is its way.

## How each is known to be met

`issue.sync` and `issue.locks` were run with the token `out-d6d8e2`; an agent's tracker token does the same.
`loop.work` and `fly.status` were read with `--owner` for this spec; whether a loop token is answered by either was
not tried, so those two are the owner's read until a task shows a token that does.

```
loop.work                       rows by `why`: the table above, again                  today 56: 21/15/6/5/4/3/2
issue.sync, moves to done       per UTC day, split owner-session / token               today 12, 17, 26
issue.sync, tab or via session  per UTC day                                            today 10, 61, 18
issue.locks?history=500         hours of drain-d896915f316098 per day                  today 0.43, 4.97, 5.50
```

## The tasks, in the order they land

Each is one writer and one review. Ids are ≤ 40 characters. "The owner's" lines are labelled `needs-owner`.
`SAFE` of `patch.ts` is `README.md` alone, so every `cloud-brain-dev` task below is `major` and waits for an approve:
his, until `mde-4` and its policy put an approver on the machine. This is why `mde-4` cannot come first: it is itself
`major`, and his install follows it. `mde-1` and `mde-7`'s first run make moves and no patch, so no `run.ts` writer
runs them (the gap of gate 6); they are the session's of pick 2.

| id | gate | about | after | what |
|---|---|---|---|---|
| `mde-1-close-retired-loop-rows` | 1 A | `cloud-brain-dev` | nothing | close the 8 class-A `write` rows and `plain-worktree-outside-checkout-fails`, each with the reason and twin; pick 2 says who |
| `mde-2-rules-and-briefs-to-dev` | 1 B | `cloud-brain-dev` | nothing | `rules.md` in `cloud-brain-dev` (takes `dev-rules-of-the-loop`'s place); the 5 class-B rows as twins, each with its lopecode-dev text attached |
| `mde-3-retire-laptop-label` | 1 E | `cloud-brain-dev` | mde-1 | `laptop` out of `labels-not` and `LABEL`; then the `brain-x-loop` patch of the cell `loopAccepts` (`bun accept.ts --cell`); `laptop` taken off `rk-2`, `rk-5` |
| `mde-4-approver-role-in-dev` | 3 | `cloud-brain-dev` | mde-2 | `roles/approver.md` (`step: approve`) and the tool, from lopecode-dev's text attached; `major` |
| The owner's: install the policy that pins `mde-4`'s blobs | 3 | | mde-4 | pick 3 |
| `mde-5-owed-reads-personas` | 3, 4 | `brain-x-loop` | mde-4, `triager-build` | `owed()` lines 232 and 245 read `loopAccepts` for `triage` and `approve`, not constants |
| `ap-3-trial` (re-aimed) | 3 | per gate 6 | `spec-notebook-summarizer-persona` | the read of the 41 verdicts as a comment |
| `mde-6-page-build-from-deploy` | 1 seeds | `cloud-brain-dev` | mde-1 | a build of the page from `deploy/` in `cloud-brain-dev` (README "Not here yet": nothing does that today); `major` |
| The owner's: delete the 18 seeds and `build.ts`'s reads of them in lopecode-dev, after `mde-6` | 1 seeds | | mde-6 | the one lopecode-dev act left; a session does it |
| `mde-7-close-landed-submits` | 7 | `cloud-brain-dev` | mde-1 | applied to the 4 by the session of pick 2 (`roles/triage.md` takes `states: [open]` only, and these are `in-review`); the rule for later submits is a line of the reviewer's brief |

Gate 2, 4, 5 and 6 tasks exist already: `deploy-token-capped-to-services` → `drain-ships-with-a-capped-token`;
`triager-build` → `owner-feedback-acted-on-at-once`; `approver-also-readies`; `spec-notebook-summarizer-persona` →
`digest-on-the-loop`.

## What the owner does: numbered picks

1. Docs (class D): **A** the gate-6 persona attaches them to the issue and puts the `doc:` entry; **B** a `docs/` directory in `cloud-brain-dev`, added to `SAFE` of `patch.ts`. Recommended A (no new store).
2. Who closes class A: **A** this coordinator session once, with its `out-` token; **B** the triager after `triager-build`. Recommended A (9 rows now).
3. Approver: **A** install a policy that pins `roles/approver.md` and its tool in `cloud-brain-dev` after `mde-4`; **B** keep it on the laptop. Yours either way.
4. Shipping: **A** approve and deploy `deploy-token-capped-to-services` (kernel and deployer); **B** leave the ships to a session.
5. Readying: **A** close `approver-also-readies` as covered by the triager; **B** keep it for issues others triage.
6. `triager-build`: **A** approve (push.ts pushes it); **B** leave it.
7. Old submits: **A** the gate 7 rule (closed with the shas); **B** one review each after the fact.
8. Size: **A** `fly machine clone` to 4 CPUs (yours, a Fly change); **B** stay at 2 and move the deployer suite with `test-ts-remote-in-the-deployer`.
9. `rules.md` lines that are yours (`rules-never-other-company-credential`): approve the line as `mde-2` writes it, or strike it.

Nothing in this spec makes a deploy key, a token, a policy, or a Cloudflare or Fly permission.

## What the orchestrator makes

Nothing. Each task uses the tokens the machine holds (`AGENTS_TOKEN`, `BRAIN_TOKEN`, `GIT_TOKEN`, `LOOP_TOKEN`). `mde-1`
on pick 2A uses `out-d6d8e2`.

## The read after seven days

On 2026-10-24, with the commands of "How each is known to be met":

| gate | stranded rows, by reason (today → wanted) | rows done a day (today 12/17/26) | owner acts a day (today 10/61/18) |
|---|---|---|---|
| 1 | 21 `write` by scope or `laptop` → 0 with that `why` | machine's share of `done` rises | — |
| 2 | passes waiting a hand ship → 0 | ships by `drain-agents`, not `out-*` | — |
| 3 | 3 `approve` → those of the four and the approver's own files only | approves by the delegation | approves in his session: only the four, the approver's files and the `mde-*` tasks |
| 4 | 15 `triage` → `feedback` only, each under a day | | |
| 5 | 6 `go` → 1 (`never-core-…`) | | |
| 6 | the reads and post mortems submitted with text | | |
| 7 | 4 `decide` (no patch) → 0 | | |

Machine hours, from the `loop` lock, against the cap of 56 a week.

## Not measured

- The price of the machine an hour: no Fly bill read. Hours are from the `loop` lock, not from Fly.
- Owner acts that are words in a chat: the record shows his session's events and the `out-*` moves made on his word,
  not his messages. "Owner acts a day" here is events with him present.
- The 4 `go` rows and 15 `open` rows: read by title and kind, not each body.
- Whether `loop.work` or `fly.status` answers a loop token: not tried.
