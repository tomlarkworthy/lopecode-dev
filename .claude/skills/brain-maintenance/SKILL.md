---
name: brain-maintenance
description: Use when the user asks to "work the tracker", "run the issue loop", "/brain-maintenance", "/loop /brain-maintenance", or wants the issues of the Cloud Brain tracker on cb4 triaged, fixed, reviewed and closed without being asked for each one. Polls the tracker, gives every review that waits a reviewer and every sent-back round its writer, starts new implementers (each in a git worktree of its topic, made by the orchestrator) when none of those waits, with no fixed number of either and a tracker token for each, and after every few issues spawns an overseer that files cluster issues or edits the role briefs.
version: 0.1.0
---

# The issue loop of the Cloud Brain

The tracker (`brain-x-issues` on `cb4`, design in `plan/cloud-brain-issues.md`) holds the work.
This skill is the loop that does it. You, the session that runs the skill, are the orchestrator:
you read the tracker, decide what is next, spawn agents for it, and write down what each
reported. You review nothing yourself, and you fix only a quick win (below).

Written 2026-10-10 and run as a loop the same day, from about 16:00 to 21:25 CEST, when the owner
stopped it ("don't start any new work until we try to improve this process"). The line in Runs
has the counts.

## Run it

```
/loop /brain-maintenance        every wake does one pass, then schedules the next
/brain-maintenance              one pass, then a report
/brain-maintenance oversee      spawn the overseer now
```

Read `philosophy.md` and then `rules.md` in this directory before the first pass.
(`philosophy.md` is a link into the submodule `cloud-brain-dev`, where it is kept since 2026-10-10
beside `AGENTS.md`; a quote added to it is a commit there, pushed as `cloud-brain-dev/README.md`
says, and then the submodule's pointer here.) Both bind you
as well as the agents. `philosophy.md` is what you decide by; `rules.md` is what no decision
may cross.

## State

There is no state file. What is true is in the tracker:

| Question | Where |
|---|---|
| What is there to do, in order, and what waits and for what | `issue-as.sh <your token> "queue"` ("A token for each agent", below; step 3). `"list"` has every issue: the ones not `done`, `rejected`, `closed` or `reverted` are open |
| Who has an issue | `issue.by.start` in `get?id=`, and the `by.holder` of its last `start` event: `secret:` and the starter's token |
| What a reviewer found | the `reviewed` events of the issue |
| How many times it bounced | the `moved` events with `move: "rework"` |
| Where oversight got to | the last heading of `oversight.md` |

Two files beside it, neither of them needed to resume:

- `tools/cloud-brain/.emitted/issue-loop/<id>.md` (git-ignored): the journal. After each agent
  finishes, append its role, the time from `date`, its token count and duration, and its final
  report whole. The overseer reads it. An overseer's own report goes in `_oversight.md` there.
- `oversight.md` in this directory: one entry per oversight, written by the overseer.

## A token for each agent

Since 2026-10-11 (`ta-3-orchestrator-steps`, task 3 of `plan/cloud-brain-record-names-token-not-agent.md`,
which the owner approved at event 1285) each agent and each session writes to the tracker with a
token of its own. An event's `by.holder` then names the one agent that wrote it, and the first part
of the name is its role. Before it three tokens, one a role, wrote 1047 of the first 1158 events, and
you, every writer and every spec writer were one actor (the spec, "What exists today").

Each token is a child of the token `loop-agents`, for `issue.*`, for 48 hours. The three commands
are run from the main checkout, and none prints a token's value:

```
BRAIN_BASE=cb4 bun tools/cloud-brain/brain.ts agent-token <role> <what for>   # stdout is the name alone, <role>-<6 hex>
BRAIN_BASE=cb4 bun tools/cloud-brain/brain.ts agent-token list                # a JSON line a live child: name, note, made, until, kept
BRAIN_BASE=cb4 bun tools/cloud-brain/brain.ts agent-token revoke <name>       # prints `401: …` and exits 0 when the name is refused from then
```

- **Yours.** Before the first tracker call of a session: `agent-token orch "$CLAUDE_CODE_SESSION_ID"`.
  The name it prints, `orch-` and six hex digits, is `<your token>` wherever this file says so: every
  `issue-as.sh` of yours, the `--token=` of `issue-stats.ts`, the first argument of `issue-watch.sh`,
  and `LOCK_TOKEN=` before every `lock.sh`. Write it out in each command: no shell state lasts
  between calls. After a compaction `agent-token list` has it, in the line whose `note` is
  `orch; <your session id>`. It ends 48 hours after it was made; a call with it is then refused, and
  you make another.
- **An agent's.** Before each spawn (step 4): `agent-token <role> <issue id>`, with the role `impl`
  for a writer, `rev` for a reviewer, `spec` for a spec writer, `dig` for a digest writer, `appr` for an approver (step 4, "The approver") and `over`
  for an overseer, whose second argument is `oversight-after-<seq>`. The name goes in the agent's
  prompt, and in the `token` field of its run's `cost` event (step 5). A round sent to an agent by message
  makes no token: the agent has the one of its first round.
- **Ended** by you, `agent-token revoke <name>`, when you write the run's `cost` event (step 5). Not then
  for a writer's or a digest writer's run whose outcome is `in-review`, nor for a spec writer's that
  ended at `spec-review`: only the starter submits, and it may be sent a rework round. That token is
  ended when the issue leaves `in-review` for good (a `pass`, `to-approval`, a reject), a spec writer's when
  the project is `approved`, since the owner's `send-back` from `awaiting-approval` puts a project at
  `spec` again. One that is forgotten ends at its 48 hours. After a revoke `issue-as.sh <name>` is
  exit 2 here and sends nothing, and cb4 answers the value 401.
- **No agent makes itself a token**, and none calls with `loop-agents`. Nothing on cb4 refuses
  either: the parent is in a file every agent's shell reads (the spec, "What is not checked"). What
  shows it afterwards is a name that wrote an event and is the `token` of no `cost` event, so a `cost`
  event you write without its `token` hides it. A session outside the loop makes its own, `out-…`.
- **The three tokens of a role** (`issues-implementer-2`, `issues-reviewer-2`, `issues-overseer-1`)
  are kept until the owner revokes them, which the spec puts after the first check of
  `ta-6-checks-after-three-issues`. A brief names one only for an agent whose prompt names no token.
  At his revoke an issue then `in-progress`, or a project at `spec`, whose `start` or `spec` was made
  with one of them is started by a token no agent holds, and nobody can submit it: you make `back`,
  and a writer makes the second `start` or `spec` with its own (step 3, the row of a starter that
  cannot go on). Review 1273 of the spec has it under "For whoever builds it".

## One pass

1. **Health.** First the main checkout, `<root>`, which nothing else brings up. Since `wt-3-land-by-push`
   (2026-10-12; `plan/cloud-brain-worktree-per-topic.md`, part 1) no landing pulls, merges or commits there, and no
   agent of yours writes a tracked file there. Two pulls, each on a line of its own, its exit read:
   ```
   git -C <root> pull --ff-only
   git -C <root>/cloud-brain-dev pull --ff-only
   ```
   The first is for what you read here: this skill, and what an issue names. The second because the first moves the
   submodule's pointer and not its files, and three things are read from that copy: `philosophy.md` of this skill (a
   link into it), `put.sh` and `summarize-papers.ts` (it starts `agent.sh` there). (Until `wt-4-reviewer-in-a-view`,
   2026-10-12, a reviewer was started with that copy's `agent.sh` too; it is started with its view's, step 4.)
   Git refuses the first when it would write over a file that is changed there (another session's edit), when `main`
   there has a commit `origin/main` has not (a session committed and did not push), or while another git process
   holds `index.lock`. Nothing is lost in any of them and the pass goes on: say which in step 7, and the next pass
   tries again. The main checkout then stays behind until that session or the owner acts. No agent you spawn is
   held up by it: each reads its brief and runs its tools in a worktree at `origin/main` (step 4). You are: this
   file is then the one of the commit the main checkout is at.
   Git refuses the second when it would write over a file `sync.ts` wrote under `deploy/`, one that is tracked or
   one that a landing has added since. `deploy/` is a read of cb4 and nothing of it is kept, so then:
   ```
   git -C <root>/cloud-brain-dev checkout -- deploy
   git -C <root>/cloud-brain-dev clean -fd deploy
   git -C <root>/cloud-brain-dev pull --ff-only
   (cd <root>/cloud-brain-dev && bun sync.ts https://cb4.endpointservices.workers.dev)
   ```
   Refused for anything else (a commit there that is not pushed, `index.lock`): step 7, and the next pass.
   Then two reads, check 9 of the spec:
   ```
   git -C <root>/cloud-brain-dev rev-list --count HEAD..origin/main
   git -C <root>/cloud-brain-dev merge-base --is-ancestor $(git -C <root> ls-tree origin/main cloud-brain-dev | awk '{print $3}') HEAD
   ```
   `0`, and exit 0: the copy is at what the cluster has, and it has the commit that `origin/main` of `lopecode-dev`
   records. Anything else is said in step 7. Each of the three blocks was run as written here on scratch
   repositories, with the refusals (`tests/tools/worktree.test.ts`, the tests named `SKILL.md step 1`). On the main
   checkout the two reads gave `0` and exit 0 on 2026-10-12 at 09:58 CEST, with no pull before them (the cluster's
   `main`, the pointer and the copy were each `06a4a2b`); the pulls and the four commands were not run there by the
   writer of this step, being yours.
   **You write nothing else there.** A commit of your own (a brief, this file, a record, a quick win) is made in a
   worktree of your own, `tools/cloud-brain/worktree.sh --fresh orch-$(hostname -s)`, which prints its path, at
   `origin/main`, and is landed from it by a push as `agents/implementer.md` step 10 lands a change with no deploy
   (the five lines by hand, on its page `agents/implementer/landing.md`),
   the lock taken as `orchestrator-$(hostname -s)`. Exit 3 from that `--fresh`: a commit or an edit of yours stands
   there unlanded; land it or take it back, the loop removes nothing of it.
   **The worktrees of the loop.** `tools/cloud-brain/worktree.sh --list` prints a line for each `bm-*` worktree: its
   name, `clean` or `not-clean`, five counts, `occupant=`, `branch=`, `head=`. `orch-*`, `over-*` and `out-*` are of
   no issue and are left. `appr-<id>` is an approver's view (step 4, "The approver"): left while an approver of yours
   runs on that issue, and otherwise removed as step 5 removes one, with no comment. For each other line that reads `clean` and `occupant=-`, the issue is the name with `rev-`
   taken off the front and `.2` (or a higher number) off the end: read its state,
   `issue-as.sh <your token> "get?id=<that id>"`.
   A worktree of a topic or of an issue, at `done`, `closed` or `rejected`: `tools/cloud-brain/worktree.sh --remove <tree>`,
   with `<tree>` the name in the line, then one comment on that issue, key `orch/<topic>/worktree-removed-<n>`, body
   `worktree removed {"topic":"<topic>","machine":"<hostname -s>","path":"<the path it had>"}`.
   A view (`rev-<id>`, made for a review) whose issue is not at `spec-review` or `in-review`: removed the same way,
   whoever made it, with no comment. A line that reads `not-clean` is somebody's unlanded work: you never remove
   it (`--remove` refuses it, exit 3) and you name it in step 7 with its counts. One case is not that: a view
   whose issue is not under review and whose line has `ahead=0` and `dev-ahead=0` holds a file a reviewer copied in for a test, and
   goes with `--remove <tree> --force` (step 5). So is one whose id the tracker
   does not have. (Before this, each writer removed its own at its landing, and a worktree of a `done` issue still
   stood on 2026-10-12: `seen-worktree-left-after-landing`.)
   Then the cluster. `brain.ts redistil` shows every Worker `same`; `brain.ts state` shows each `brain-x-*` Worker at the hash that `seen.json` of `origin/main` holds for it, read with `git -C <root> show origin/main:tools/cloud-brain/seen.json` after the pull above, or after `git -C <root> fetch origin main` when it was refused: a landing commits that file in its worktree and pushes it, so the main checkout's own copy is behind whenever its pull was refused (`redistil` cannot show a put-back: the kept source goes back with the Worker, so it read `same` through the one of 19:32 on 2026-10-10); `lease.get` is held or the page is
   not needed; `LOCK_TOKEN=<your token> tools/cloud-brain/lock.sh show land` and `show cb4` each answer exit 0 (the holder, since when and until when) or exit 1 (not held), and exit 2 is cb4 not saying: not healthy. If the cluster is not healthy, file or find
   the issue for it and do nothing else this pass. Since `lk-3-lock-sh-over-the-cluster` both locks are held in the cluster, for 600 s from the take or the last renew.
   A lock past its time is not held: `show` exits 1 and says whose lock ended and when, and the next take takes it. That holder died or overran:
   look at its issue (step 3). Nothing is the owner's to remove. A landing of your own, from your worktree `bm-orch-<host>` (above), is made between
   `LOCK_TOKEN=<your token> tools/cloud-brain/lock.sh take land orchestrator-$(hostname -s)` and `LOCK_TOKEN=<your token> tools/cloud-brain/lock.sh release land orchestrator-$(hostname -s)`.
   Every `lock.sh` of yours has `LOCK_TOKEN=<your token> ` before it, `show` among them: with none the script sends nothing and is exit 2, with its usage (since `lock-sh-default-token-r4`; until then such a call was made with a role's token),
   and the holder of a lock is the name with the token of the call.
   The name carries the machine, so an orchestrator on another machine is another holder. It is that name and no other: on 2026-10-11 `land` was held as
   `orch2-adv` and as `i1842`, which `lock.sh show` and the history trace to no issue and no role (`seen-land-held-under-other-names`).
   Two sessions under one role name on one machine are not
   told apart: the first's take refuses the second's, but a `renew` by either is answered as the holder's, and so is the renew `take --wait` sends
   after an attempt of its own that got no answer. One orchestrator and one overseer a machine. (That was written when both called with one token.
   With a token each, a renew or a release under the other's token is refused in `tests/tools/lock.test.ts`, against a stand-in; not tried on cb4.)
   **Past 4 hours.** Then `bun tools/cloud-brain/issue-stats.ts --token=<your token>` and its last line,
   `past 4 h, not started, no reason: <n>`, with one row under it for each issue counted. Since `bk-6-skill-watch-and-stats`
   (2026-10-13) the tool counts it from the queue of step 3 and not from the record: a row is an entry of `queue` that is
   `late` (its last move, or its open when it never moved, is 4 hours or more ago by the service's clock) and whose `do` is
   `start`, `spec`, `triage` or `ready`, and the row ends with that `do`. Each is taken in step 3 where the queue has it:
   among starts the service puts a late one before every younger one of the same `for`. One that cannot be started or made
   ready gets its reason in a form the queue reads, and no comment: a link `after` when it waits for an issue, a hold when it
   waits for a time or a count, `needs-owner` with its comment when it waits for him (step 3 has the three calls). It is then
   in `waiting` and off the count, and the line ends `(<m> more are held)` with the entries whose `why` is `after` or `until`.
   The line reads `not read: …` when `issue.queue` did not answer: say so in step 7.
   A comment whose body begins `held:` is no longer written for this, and the tool no longer reads one as a reason, nor the
   word `held` in a triage reason. (Until that change the count was made from the record, from each issue's last move, and
   such a comment took an issue off it: `tools/cloud-brain/records/os-3-stats-past-four-hours.md`. `bk-5-holds-become-links`
   wrote the holds of that kind that still stood as links and holds, 2026-10-12. On cb4 at 00:00 CEST on 2026-10-13 the tool
   as it was printed `0` and the tool as it is `3 (21 more are held)`: `ta-1c-parent-revoke-on-cb4`, 26.8 h, and
   `ap-5-panel-approved-for-you` and `ap-6-rules-and-live-step`, 5.3 h each; `tools/cloud-brain/records/bk-6-skill-watch-and-stats.md`
   says why the two differ. R4 of `plan/cloud-brain-loop-order-of-service.md`, part 4: no task, bug, project or feature
   stays unstarted for 4 hours without a start or a written reason.)
2. **Count your running agents. No number is set.** Every review that waits gets a reviewer, and every round sent back goes to
   its writer, in the pass that sees it. A new writer is started only when, after that, no review
   waits without a reviewer and no sent-back round waits without a writer. Start nothing new in a
   pass in which an agent's report or your own session names a rate limit or a usage limit, or in
   which `lock.sh show land` has named the same holder for two passes. One agent on an issue, as before.
   An approver (step 3, the row for `awaiting-approval`) is started after the reviewers and the rounds sent back and
   before a new writer, and not in a pass that names a limit: the owner approves as before, and since
   `approver-before-decision-comment` (2026-10-12) your comment for him waits on it (step 3, the row), so an issue whose
   approver was not started is named in step 7.
   In a pass that starts nothing new, the rows of step 3 that spawn no agent are still done, triage among them.
   **A writer that waits.** Since `os-4-writer-waits` (2026-10-11) a writer does not report at its submit: it waits up to
   20 minutes for its review with `tools/cloud-brain/issue-wait.sh` and takes the first round of changes itself
   (`agents/implementer.md`, step 13). You read which writer waits from the tracker: an agent of yours that has not
   reported, whose issue is at `in-review`, or at `in-progress` with a `rework` after its last `submit`. At `in-review`
   it is not counted as a writer at work; after the `rework` it is at work again. In both it is still the agent on
   its issue: after the `rework` you send it nothing, the round is its own. Its submit reaches you as a line of the watch (step 8), and the review is then yours to start.
   On trial: `plan/cloud-brain-loop-order-of-service.md`, part 5, kept or taken out by `os-5-trial-read` after five
   rounds a writer took this way. First writer seen to wait: not yet, when this was written.
   (`plan/cloud-brain-loop-order-of-service.md`, part 3, approved for the owner at event 2611. His words, of the
   proposal that became it: "Maybe we let it manage its own pool size and not worry about optimality". Measured there,
   over 453 minutes of 2026-10-11: a review waited with no reviewer on it for 195 minutes, 100 of
   them with 2 or more reviewers running.)
   The numbers this replaces, each the owner's word and none in force since `os-2-order-and-pool`: 1 to 2 of each
   (2026-10-10: "try to have 1-2 writers and 1-2 reviewers active at all times"); 4 writers and 2 reviewers from 19:28 that day
   ("maybe we do another 2 in parrallel"); 8 and 4 on 2026-10-11 ("can we increase the parrallism twofold?").
   What stops growth is the two things more agents would wait on: a limit of the account, and the landing lock,
   since writers land one at a time. The spec had seen neither bind. Seen of the lock's queue on 2026-10-11, after his word of that day:
   the cluster has kept the lock's history since 20:37 CEST that day, and in the 44 minutes from then to 21:22 `land` was taken 25 times (the holds numbered 1 to 25 of `issue.locks?history=200`) and held 731 s in all,
   2.5 to 141 s a hold; 9 of the 24 takes after the first came less than 20 s after the release before, and 20 s is how often `take --wait` asks.
   The history has the holds, not who waited or for how long, and how many writers ran in those minutes was not counted
   (`tools/cloud-brain/records/ta-3-orchestrator-steps.md` has the command).
   Not known: how many writers this machine carries. If memory or the browser tabs of writers bind before a limit or the lock does,
   this rule does not see it; the overseer adds the sign that would have.
   **The first sign seen is the processor, not memory or a tab** (the overseer, events 4252 to 4526, 2026-10-12 21:15 to 21:45 CEST,
   with seven writers started at 21:15 after the owner's "double pool size", each of them and each reviewer running `tests/tools/suite.sh`).
   `uptime` read 15 to 25 as its first number on 18 cores (`sysctl -n hw.ncpu`); the suite took 154 to 318 s in six runs where it
   takes 93 to 95 s; tests that pass alone with a longer timeout failed at the suite's 30 s (`summarize-papers.test.ts`,
   `knowledge-docs.test.ts`: 3, 4 and 3 fails in the first run of two reviewers and a writer, 0 in the second run of each reviewer);
   two reviews took 1,457 and 1,168 s where the eight before them took 202 to 405 s (`seen-tool-tests-time-out-under-load`, event 4517,
   and `seen-suite-times-out-under-load`, 4518, each with its `uptime`; the submit of `pm-second-summarizer-role`, 4525). So no new writer is
   started in a pass in which `uptime`'s first number is 15 or more on this machine, the lowest at which such a fail was seen, or
   in which a report names a test of `tests/tools` that failed at its timeout and passed in the next run. A review that waits and
   a round sent back are started as before. Not known: the number on another machine, and what a suite costs beside a build.
   What makes several at once safe: a writer edits and builds in a worktree no other agent is in (step 4) and
   lands from it by a push under the landing lock; a reviewer tests the notebook of the commit, not the working file.
3. **Read the queue and take its entries in order.** `issue-as.sh <your token> "queue"` answers `queue`, what the
   record says is next, and `waiting`, what is not next and why: `{ seq, now, queue: [{ id, do, kind, state, title, labels,
   for, since, late, hold }], waiting: [{ id, kind, state, why, on, until }], more }`. The order is the service's
   (`issueQueue` of `tools/cloud-brain/brain-issues.ojs`, whose prose "The queue" says what each row reads): a round that was
   sent back (a writer's or a spec's), a review that waits, your own acts, a start; among starts the owner's, then one past
   4 hours (`late`; step 1, "Past 4 hours"), then a bug or a task before a project or a feature (a `start` before a `spec`),
   then the oldest. You do not order anything, and you match no issue against a table: an entry says what it wants in `do`.
   Your two levers: `issue-as.sh <your token> link '{"key":"orch/<id>/after-<other>","id":"<id>","to":"<other>","rel":"after"}'`
   puts an issue after another, and `close` ends one. A wait that is not for an issue is a time:
   `issue-as.sh <your token> hold '{"key":"orch/<id>/hold-<n>","id":"<id>","until":<ms>,"reason":"<what to read when it comes back>"}'`,
   with `until` in milliseconds since 1970 and 30 days on at most (`echo $(( ($(date +%s) + 86400) * 1000 ))` is a day from now).
   A wait for the owner is the label `needs-owner`, after its comment (the row below). A wait is written in one of those three,
   which the queue reads, and never in a comment alone: a comment that begins `held:` is no longer written.
   The record does not know which agents run: skip an entry an agent of yours is on (step 2).
   A writer and a reviewer are different agents and do not take each other's place: the order says which you spawn
   or send first in a pass. Kind stands for size, since nothing in the record gives a size before the work.
   `more: true` says `queue` was cut, at 200 entries when no `limit` is asked (`"queue?limit=500"` is the most): what is
   listed is first in the order, and `waiting` is whole.
   (Until `bk-6-skill-watch-and-stats`, 2026-10-13, this step was a paragraph of the order and a table of 20 rows that each
   open issue was matched against: `plan/cloud-brain-loop-order-of-service.md`, part 2, since `os-2-order-and-pool`, which
   took the place of "Finishing comes before starting. Among issues on the same row, one the owner opened or moved goes
   first, then the oldest". The queue is part 3 of `plan/cloud-brain-bookkeeping-in-the-tracker.md`, on cb4 since
   `bk-3-queue-and-hold`. First pass made from the queue by this step: not yet, when this was written.)
   **The owner's**, in these tables and wherever the procedure says it of an issue: opened by his
   session (`by.via` of its `opened` event is `session`), or labeled `owner`. A session that opens
   an issue on his word puts `owner` in `labels` at the open, and you add it when he asks for an
   issue in this session (`issue-as.sh <your token> label '{"key":"orch/<id>/owner","id":"<id>","add":["owner"]}'`).
   The label gives precedence and no authority: no guard of the workflow reads it, and whoever may
   call `issue.open` may write it. `issue-as.sh <your token> "list?label=owner&limit=100"` lists the labeled ones.
   (Until 2026-10-11 the record had no such mark: `worker-machine-on-fly`, opened with a loop token
   "on the owner's word", was at `open` 68 minutes while two issues filed later were taken.
   `plan/cloud-brain-loop-order-of-service.md`, part 1.)
   The queue has its own reading of it, which is what orders the starts: `for` of an entry is `owner` for an issue he opened himself or one labeled `owner` or
   `annotation`, and such a start is before every start of the loop's own.

   | `do` | Do |
   |---|---|
   | `round` | Send the round to the agent that started it, a spec's to its spec writer: the row of an issue sent back, or "A spec sent back", below. A writer that waits for its review takes this round itself and is sent nothing (step 2, "A writer that waits"). When it cannot be sent one: "A dead writer". Started by you: "A quick win of your own, sent back". At 3 `rework` moves you judge first. |
   | `review` | Spawn the reviewer (step 4). For a project or feature at `spec-review` it follows "A spec" in its brief. |
   | `triage` | Triage it yourself (Triage, below), or take it as a quick win. With the label `digest` or `post-mortem`: its row below. |
   | `ready` | Move it to `ready`. Read first a comment of it that begins `held:` (they were written until `bk-6-skill-watch-and-stats`): what it still waits for is written as a link `after`, a hold or `needs-owner`, as above, and the issue is then in `waiting`. |
   | `decompose` | Open each task the spec lists, with `parent` the project. A task has the labels the spec gives it: `major` on each task of a spec that says its tasks are (bd-2 and bd-3 were opened with none from a spec approved as `major`, and a reviewer's `pass` of bd-2 would have gone to `done` with no approval; `seen-bd-2-opened-without-major`). Then, for each task the spec says is after another, one link, `issue-as.sh <your token> link '{"key":"orch/<task>/after-<other>","id":"<task>","to":"<other>","rel":"after"}'`, written before any task is moved: the order of a spec's tasks is in the record and in no comment. Then `triage` and `ready` each task, but one the spec leaves to the owner (`needs-owner`, with its comment) or holds for a time that can be said now (a hold). Then move the project to `building` (`decompose`). Open every task of a spec before the last of them can end: a task opened as a part after the project is `done` is a part of a project that stays `done`. Close each gathered report that is still open with the reason `in the spec of <id>`. |
   | `finish` | Move it to `done` (`finish`). Since `bk-2-finish-by-the-service` (2026-10-12) the service makes this move itself, in the call that ends the last open part, so an entry here is one it did not make. |
   | `promote` | A feedback issue of the owner's with no tie, or with each tie at `done` or `closed`: the row `open`, kind `feedback`, below, which says when it is promoted and when it is closed. |
   | `look` | A hold whose time has come (`hold.reason` of the entry says what to read), an issue at `in-review` or `spec-review` with a review and no move after it, or a state the service has no row for. Read it. One that was held: take it on as its `state` asks (its next move takes the hold off), hold it again, or comment and label `needs-owner`. A hold stays on the issue until its next move or a `hold` with `"remove":true`, so one you leave as it is stays a `look` at every read. Any other: the row "Anything else", below. |
   | `start` | Spawn the implementer. With the label `digest`, the digest writer (role `digest`). With the label `post-mortem`: its row below. |
   | `spec` | Spawn the spec writer (role `spec`). The entry is a project or a feature at `open` that is the owner's or has three parts or more; with fewer it is still gathering, and is in `waiting`. |

   | In `waiting`, `why` | Do |
   |---|---|
   | `owner` | Read it again each pass. At `awaiting-approval`, and labeled `needs-owner`: its row below. On the security workflow: nothing, it is the owner's. |
   | `work`, and no agent of yours is on it | "A dead writer", "A submit made for a writer" or "A quick win of your own, sent back", below. With an agent of yours on it: nothing. |
   | `after`, `until`, `parts`, `gathering` | Nothing. The service lists it in `queue` when the wait ends: an `after` when each issue under `on` is closed, an `until` at its time (as a `look`), `parts` when no part holds it. |

   **What the two tables name, and what the queue does not read.** The rows below stood in the table this step had
   until `bk-6-skill-watch-and-stats`, and are as they were, but for the queue's name in the row of `needs-owner`. Each is
   reached from an entry: by the row of its `do` or its `why` above, by a label of the entry (`digest`, `post-mortem`), or
   by its `state`. Two things are in neither list. An issue hidden from your token (`hidden: true`): nothing, it is the
   owner's. And the label `asks-orchestrator`, which the queue does not read at any state: the watch prints it (step 8), and
   a whole pass reads its list before the queue, as its row says.

   | Issue is | Do |
   |---|---|
   | at `awaiting-approval` | **Spawn the approver** (step 4, "The approver"), when all three hold: the issue has no comment keyed `approver/<id>/verdict-<n>`, with `<n>` the count of its moves to `awaiting-approval`; no comment of the issue, of any round, begins `approver: leave`; and `issue-as.sh <your token> "runs?id=<id>&role=approver&round=<n>"` has no run. `bun tools/cloud-brain/approver.ts facts <id> --token <your token>` prints the key with its `<n>`, the verdicts the issue has, and `left to the owner at <seq>` when one stands. An issue an approver left is the owner's from then on: after his send-back and a new pass no second approver is started, which the tool would refuse (review 4118 of the spec; the rule of its part 4 read the round's verdict alone). A run that reported with no verdict is not started again in that round: it is said in step 7. Until the owner installs a policy whose `approve` guard names the approver's delegation, its tool sends no move and the verdict is all a run leaves; he approves as before. (Since `ap-2-brief-and-shadow-step`, 2026-10-12; `plan/cloud-brain-approver-persona.md`. First approver started by this row: not yet, when this was written.) **The approver reads before you write for him.** Until the round's verdict is there, or its run has reported with none, you write no comment for the owner on the issue (none keyed `orch/<id>/decision-<n>`, `<n>` as in the verdict's key) and put no `needs-owner` on it (`orch/<id>/needs-owner-<n>`), also in a pass that starts no approver (step 2, a limit; step 4, no view): the issue waits for its approver, and step 7 names it so. What you write then is by what the run left. After `approver: approve` and the tool's `approve` move, nothing: no decision comment and no label; step 7 tells him of it in the list of what was approved for him. After `approver: leave`, the comment, keyed `orch/<id>/decision-<n>`, written from the verdict's second line and its `why:`, in the form of `rules.md`, "What the owner is asked to decide", with letters only where the verdict names a choice that is his (its `what stopped it:` says which answers the record puts to him), and then your pick as that section has it; for a spec, with the two lines of step 7 as well ("A spec put to him"). With none it has no letters: it says that the change is built and reviewed and what stopped the approver, and his answer is his approve or his send-back. Then `needs-owner`. After `approver: approve` and no move (the tool's exit was not 0: no guard of the policy in force names a delegation, or the brief or the tool is not the one it names), the comment has no letters and says, from the verdict's second line and the tool's line, that the approver found for it and why no move was made; then `needs-owner`. After a run that reported with no verdict, and in a round that gets no approver because one left the issue in an earlier round, there is no verdict to write from: the comment is written from the review and the record, in the form of that section, with no letters when there is nothing to choose between; then `needs-owner`. (Since `approver-before-decision-comment`, 2026-10-12, an action of `tools/cloud-brain/post-mortems/pm-approver-leaves-everything.md`. Until then nothing ordered the two: each of the eight issues the post mortem counts had your comment keyed `orch/<id>/decision-<n>` on it before its verdict, with letters and a pick, and five of the eight verdicts give that comment as a thing that stopped them, as the post mortem has it ("The eight verdicts"). The cases of an approve with no move, of no verdict and of a later round are the writer's reading and not the issue's words. `bun tools/cloud-brain/issue-stats.ts --token <your token>` has the line `decision comment and verdict`, with the seq of each verdict whose round had your comment before it: 9 of the 10 verdicts at event 5210, each from before this change; one with a later seq is a round this row was not followed in. First comment written after a verdict by this row: not yet, when this was written.) You make no `approve` yourself, unless the owner has said in this session that he approves that issue, or several issues he was shown by title: then you make the `approve` move for him, one move an issue, each for an issue with a passing review and each with a reason that quotes his word, names that review's event and says what he was shown (`rules.md`, Never, the `approve` line, and "An act of Never, on the owner's word"). |
   | labeled `needs-owner` | Read it again each pass: the events since the label was put on, and what the owner has said in this session. When he has answered (a comment of his on the issue, or his word to you, which you quote in a comment first), or `philosophy.md` now answers it (say what changed), comment with the event that put the label on and what ended its reason, take the label off (`rules.md`, Never, the `needs-owner` line), and take the issue again from the queue. Otherwise nothing: it is the owner's, and it is named in step 7. |
   | labeled `asks-orchestrator`, at any state | **An agent that still runs asks you.** It put the label on and waits, and what it started may be billed while it does (`agents/implementer.md`, "When you need the orchestrating session"). Its ask is the first line of its last comment keyed `…/ask-<n>`; under it, written by `tools/cloud-brain/issue-ask.sh`, are the time until which it waits and what it started that is billed while it does, with the time it stops that itself. Answer in this wake, before any row below: a comment, `issue-as.sh <your token> comment '{"key":"orch/<id>/answer-<n>","id":"<id>","body":"…"}'`, whose first line is yes, no, or "stop what runs and report", which is the answer when you cannot say now: an answer that waits for something else to become so is none. Then take the label off, `issue-as.sh <your token> label '{"key":"orch/<id>/answered-<n>","id":"<id>","remove":["asks-orchestrator"]}'`, after the comment: the agent reads the label gone as "answered" and then reads the comment. Nothing else of the issue is yours while its agent runs; with no agent running it is then taken from the rows below. The watch prints the label as it is put on (step 8), and a whole pass reads `issue-as.sh <your token> "list?label=asks-orchestrator&limit=100"` before the table, for a line the watch did not print (it was armed before this row was written, or it died). A line `asks-still` of the watch names an issue of this row that has had the label and no event for 5 minutes (none that moves its `updated_at`; a `cost` event does not): it is this row once more, late. (Since `asks-orchestrator-label-and-watch`, 2026-10-12; the tool and the line `asks-still` since `wait-says-what-runs-and-until-when`, that day. Until then such a request had no form a tool or this table read: comment 4816 of `fly-1-by-hand` asked for a go-ahead at 22:21:06 CEST that day with a Fly machine running, and the answer, 4921, came at 22:43:04, after the owner asked; `tools/cloud-brain/post-mortems/pm-agent-request-not-seen-fly-idle.md`. First ask answered by this row: not yet, when this was written.) |
   | `in-progress`, started by a writer or a digest writer (the `by.holder` of its last `start` event is `secret:impl-…` or `secret:dig-…`, or a role's token, for a start made before each agent had its own), sent back, no agent running | Send the round to the agent that started it ("A rework round goes to the agent that wrote the change", below): its token is still kept, and only the starter submits (`caller.actor == issue.by.start`). When it cannot be sent one, the next row. Do not, and instead comment with the open findings and label `needs-owner`, when the last implementer you spawned for it finished without a new `submit`, or when it has 3 `rework` moves and the rounds are not getting anywhere. At 3 you judge (Tom, 2026-10-10: "make a judgment call when the 3 retries is hit, has genuine progress been made?"): go on when each review closed what the one before found and the new findings are narrower; stop when a finding came back, or the rounds are trading one defect for another of the same size. Write the judgment and its reason in the journal and as a comment on the issue. |
   | `in-progress`, no agent running, and its starter cannot go on: the writer died or cannot be sent a message, its token has ended (`agent-token list` has no line for it), or the `start` was made with a role's token and its writer cannot be sent one (after the owner's revoke of those: every such issue) | **A dead writer.** You end its token (`agent-token revoke <name>`; a role's token is the owner's to end), then you make `back` to `ready` with the reason. The issue is then `ready`: the writer you spawn makes the second `start` with its own token, which replaces `issue.by.start`, and it alone submits. Two more moves. A submit by any token but the last starter's is refused 403. |
   | `in-progress`, started by you (`secret:orch-…`: a quick win, or work on the owner's word), sent back | **A quick win of your own, sent back.** Do the round yourself and submit: no more moves. Or hand it over: you make `back`, the writer you spawn makes `start` and then submits. Two more moves. Your own token is not ended, so after the `back` the policy no longer refuses you a review of that issue: "You review nothing yourself" is what holds. (Submits 622, 935 and 1002 were a writer's on an issue you had started; each answered 200 because both were one token.) |
   | kind `project` or `feature`, at `spec`, no agent running | **A spec sent back.** Send the round to the spec writer by message, as a writer of a task is sent one (the `agent` and `session` of its last run, `issue-as.sh <your token> "runs?id=<id>&role=spec-writer"`; `agents/spec.md`, "A resumed round"). When it cannot be sent one, or it died: you end its token and make `back` from `spec` to `open`; the spec writer you spawn makes `spec` with its own token (key `spec/<id>/spec-<round>`), which replaces `issue.by.spec`, and then `submit-spec`. Two more moves. |
   | `in-progress`, the change is landed, and its writer finished with no `submit` | **A submit made for a writer.** Ask the writer to submit, by message, when it can be sent one. Else you end its token, make `back`, make `start` with your own token, and submit with the refs: the starter is then you, and the review is a reviewer's. Two more moves. (Submit 516 was yours for a writer's start.) |
   | labeled `digest`, opened by `worker:brain-x-snapshot` (`opener` in `get?id=`), at `open` | When several are open, the newest is the one written: `reject` each older one with the reason `covered by digest-<newest day>`, and comment on the newest with the days it covers. Then `triage` and `ready` it, the reason "the day's digest, opened by the snapshot's run"; the three questions of Triage are not asked. |
   | labeled `post-mortem`, at `open` | Triage it by its one question ("A post mortem", below): `issue-as.sh <your token> "list?label=post-mortem&limit=100"`, and when another of that list is of the same thing, link this one to it as `duplicate` and `close` it. Else `triage`, then `ready`. Never a quick win of yours: your open, your spawn and your comment for him are steps of its trace (in the first, events 4246 and 4344). |
   | labeled `post-mortem`, at `ready` | Spawn the implementer, with the prompt of step 4 and nothing added: no line of what you think went wrong. It follows "A post mortem" in `agents/implementer.md`. When it has passed its review and its writer has reported, see that its actions are filed ("A post mortem", below). |
   | `open`, kind `feedback` | Nothing, but for one case: it is the owner's ("The owner's", above), asks for a change, and has no tie, or each of its ties is at `done` or `closed`, and none of that finished work made the change. Its ties are its parent and its links either way, but for a `related` link whose other end is itself a feedback issue at `open`: that link says two reports are of one thing, and no work is under way for either. Then `promote` it, `issue-as.sh <your token> swap '{"key":"orch/<id>/promote","id":"<id>","swap":"promote","reason":"…"}'`, and triage it in the same pass. When a finished tie did make the change, close it with the commit or the line of the record that did in the reason: `issue-as.sh <your token> move '{"key":"orch/<id>/close-done","id":"<id>","to":"closed","reason":"…"}'`. A promoted issue keeps the kind `feedback` and is on the task workflow from then on (`workflow` in `get?id=` is the task's): it is taken by the rows for a task, this row no longer. One of his with a tie at any other state is not promoted, since the work it is tied to is already under way and a second task would do it twice (`philosophy.md`, line 2: the smaller side); it comes to this row when that work has ended. Who closes the ones that are not his: the overseer, each oversight, closes such a feedback issue when it has a tie and every tie is at `done` or `closed` (`agents/overseer.md`, "Feedback that is due"). `bun tools/cloud-brain/issue-stats.ts --token=<your token>` prints both lists, `feedback due to be closed, not the owner's` and `feedback of the owner's with no tie, or each tie done or closed, to promote or to close`, each row with its ties and their states; the second is this row's. Feedback is filed by agents for anything that seems off against `philosophy.md` (Tom, 2026-10-11: "only feedback so we can identify patterns and check before writing a solution"), and the overseer reads it together. It is not counted as work waiting. (Until `feedback-closed-or-promoted`, 2026-10-11, nothing closed one: 51 were at `open` at event 2745, 25 of them tied only to work that was `done` or `closed`. The owner: "Why are the feedback ones not being done?" Until `owners-feedback-held-by-related-links`, 2026-10-12, one of his was promoted only when it "has no parent and no link either way", and one whose ties had ended was the overseer's, to close or to leave with a comment. At event 4295 two of his had waited at `open` 21 hours so: `health-chart-not-useful-remove`, with a `related` link to a project that was `done` and had not removed the chart, and two `related` links from notes at `open`; and `services-chart-near-the-top`, whose one tie was its own `related` link to that note. `tools/cloud-brain/records/owners-feedback-held-by-related-links.md`.) |
   | Anything else: `in-review` with a review and no move after it, a state or a starter no row above names | Comment with what you see, label `needs-owner`, and say so in step 7. |

4. **Spawn.** First make the agent's token, from the main checkout ("A token for each agent"):
   `BRAIN_BASE=cb4 bun tools/cloud-brain/brain.ts agent-token <impl|spec|dig|over|rev|appr> <id>`. Its stdout is the name.
   On exit 1 what it printed is not a name: no agent is spawned, and it is said in step 7.
   **Then a worktree for it** (since `wt-3-land-by-push`, 2026-10-12; `plan/cloud-brain-worktree-per-topic.md`,
   part 3; a reviewer is put in a view, below). The topic of an issue is its `parent` when it has one, and
   otherwise the issue itself: a task's is its project, a project's or a digest's is itself. From the main checkout:
   ```
   tools/cloud-brain/worktree.sh --fresh <topic> --for <the agent's token>
   ```
   - Exit 0: stdout is the path, `<W>`, and `<tree>` is `<topic>`. With none there it made one at `origin/main`;
     one that stood with nothing unlanded it brought up to `origin/main`. The token is written in it as its
     occupant, so that a second session of yours, or you after a compaction, does not put another agent there.
   - Exit 3: work stands there that is not landed (its counts are on stderr), and nothing was touched. Whose it is:
     the `for` of the last comment of the topic that names this path (below). When it is of the issue you are
     starting (a round sent back, a `back`, a writer that died), the writer is put in it as it is: `<W>` is
     `<root>/.claude/worktrees/bm-<topic>`, and the prompt gets a fifth line,
     `The worktree holds unlanded work of this issue.` Otherwise take the next name, as for exit 4, and say so in a
     comment on the issue whose work stands there. You delete nothing of a writer's.
   - Exit 4: another agent is in it (stderr names its token), nothing was touched. Run the command again with
     `<topic>.2` in place of `<topic>`, then `<topic>.3`, and take the first that answers 0: `<tree>` is that name.
     (On 2026-10-11 two tasks of one project were written at once in 21 of 64 spans; the spec, "What exists today".)
   - Exit 2: origin was not reached. No agent is spawned, and it is said in step 7.
   Then one comment on the topic's issue, with your token, so that where the topic's work stands is read from the
   tracker and not from your memory. The body has quotes in it, so it goes in a file of the scratchpad and is sent
   with `@` (`agents/implementer.md`, "The tracker's write calls"): `issue-as.sh <your token> comment @<file>`, the
   file `{"key":"orch/<topic>/worktree-<n>","id":"<topic>","body":"…"}` with `<n>` one more than the topic's
   comments of that key so far, and the body, its quotes escaped in the file:
   ```
   worktree {"topic":"<topic>","branch":"bm/<tree>","machine":"<hostname -s>","path":"<W>","at":"<sha of origin/main>","for":"<id>"}
   ```
   `at` is `git -C <W> rev-parse origin/main`. The branch is local and is not pushed: what reaches another machine
   is `origin/main`, and the comment tells an orchestrator there that unlanded work may stand on the machine it
   names. The next agent of the topic, and you, read these with `issue-as.sh <token> "get?id=<topic>"`: the
   `commented` events whose key begins `orch/<topic>/worktree-`.
   When the agent has reported (step 5): `tools/cloud-brain/worktree.sh --leave <tree>`, which takes the occupant
   out. Not for a writer that waits for its review (step 2): it has not reported.
   Then the `Agent` tool: `subagent_type: general-purpose`, `model: opus`, never
   `fork`, and this prompt with nothing added but the fifth line of exit 3. An agent that knows what you expect confirms it.
   ```
   Working directory: <W>.
   Read <W>/.claude/skills/brain-maintenance/agents/<role>.md and follow it.
   Issue: <id>
   Your token is <name>.
   ```
   The brief is the worktree's copy, at `origin/main` as it was when the worktree was brought up: it does not
   change under the agent, where the main checkout's did (`seen-briefs-change-under-a-writer`, eight cases).
   For the overseer the worktree is `tools/cloud-brain/worktree.sh --fresh over-$(hostname -s) --for <its token>`,
   with no comment (it is of no topic), the third line is `Last oversight ended at event <seq>. Journal: <root>/tools/cloud-brain/.emitted/issue-loop/`,
   and the token's line follows it. Exit 3 there is an overseer's edit that was not landed: named in step 7, and
   no overseer is spawned until it is landed or taken back.
   (First spawn made this way: not yet, when this was written. `--fresh`, `--leave`, the exits and the occupant are
   the tests of `tests/tools/worktree.test.ts`; check 7 of the spec is the first topic's comment.)

   **The reviewer is not an Agent call**, and is started in a view (the owner, 2026-10-11: "the skill spawns a super light claude with a
   generic opening. role: reviewer task: ....", and of what was built for it: "ok please get that into production").
   Since `wt-4-reviewer-in-a-view` (2026-10-12; `plan/cloud-brain-worktree-per-topic.md`, part 4) you first make
   the view, from the main checkout: a detached worktree at the commit under review, named for the issue, so that
   the reviewer reads and builds where nobody writes, and two reviews of one topic share none.
   ```
   V=$(tools/cloud-brain/worktree.sh --at <sha> rev-<id>)
   ```
   `<sha>` is the last `commit` ref of the issue's last `submit` or `submit-spec` that is of `lopecode-dev`: what
   follows `lopecode-dev@` in its value, or the whole value when it names no repository (a spec's ref is the sha
   alone). When that move has no such ref (an act on cb4, a change to `cloud-brain-dev` alone):
   `git -C <root> fetch --no-recurse-submodules origin main`, and `origin/main` in its place.
   - Exit 0: stdout is the path, `<root>/.claude/worktrees/bm-rev-<id>` (4.5 s for a new one, 0.9 s for one that
     stood, 2026-10-12). It has the links to the main checkout's `lopebooks`, `lopecode` and `lopecode-plugin`, and a
     clone of `cloud-brain-dev` at the commit `<sha>` names with what cb4 runs read into its `deploy/`. A view of
     that name that stood (the round before, a session that ended) is put at `<sha>`, and what was changed in it
     is thrown away, a commit of a reviewer's that was not pushed among it (step 5 names one before that).
   - Exit 1, and stderr says `no commit`: the ref names a commit that is neither here nor on `origin`. That is
     the review's finding to make, so the view is made at `origin/main`, as for a move with no ref.
   - Exit 1 for anything else (a rebase stopped there: a reviewer's mend that did not end; a worktree of that
     name on a branch), or exit 2: no view and no reviewer this pass, and stderr goes in step 7.
   Then the reviewer, a process of its own, started with Bash, `run_in_background: true`, `timeout: 3600000`, with
   the path the first command printed written out for `$V` (no shell state lasts between your calls):
   ```
   CHECKOUT=$V $V/cloud-brain-dev/agent.sh reviewer "review issue <id>; your token is <name>"
   ```
   The launcher is the one of the view's clone, at the commit `<sha>` names, which no pull writes over;
   `CHECKOUT` is the `checkout:` line of the reviewer's prompt, and its default (the directory above the
   launcher) is the view too. The tools the reviewer runs are the view's, of the commit `<sha>`: a submit is
   rebased on `origin/main` at its landing, so they are current, and its brief has the line for a view at an older commit.
   Run by the writer of `wt-4-reviewer-in-a-view` on 2026-10-12, as two trials on issues already `done`, each
   told to write nothing: one plain (266 s, $1.23) and one with `TAB=1` (441 s, $2.46, 30 `mcp__lopecode__` tools
   in its `toolset`, a QA tab opened and closed by name). First review of an issue at `in-review` started this way: not yet,
   when this was written (`tools/cloud-brain/records/wt-4-reviewer-in-a-view.md`).
   `<name>` is the `rev-` token you made for it, and nothing else is added to the task. Its brief reads the name from that line
   (`tests/tools/reviewer-brief-names-token.test.ts`). It has Bash, Read, Grep and Glob, no advisor (the owner, 2026-10-11:
   "ok lets disable the advisor for review"; `agent.sh` sees to it), and its brief is on
   the Brain (`cloud-brain-dev/README.md`, "A light agent for one role").
   Put `TAB=1 ` before the command (`TAB=1 CHECKOUT=$V $V/cloud-brain-dev/agent.sh …`), which adds the notebook tab tools
   by starting the channel server in the view, through its link `lopecode-plugin`, in three cases only (the owner,
   2026-10-11: "Yes remove TAB for non notebooks"): `<root>/tools/cloud-brain/review-needs-tab.sh <repo@sha>…`,
   run on every `commit` ref of the last `submit`, exits 0 (a seed, a notebook or a module; it prints the file)
   or 2 (a commit it could not read); the issue has a `url` ref; or the reviewer's report begins
   `needed a tab`, which is a review it did not write: start it once more with `TAB=1`, the view made again with the same `--at` line, and post both runs' costs.
   The tab tools are 8,342 tokens in every request (18,106 at the first request of review 3 of
   `light-reviewer-in-use` against 9,764 with none), and none of that issue's three reviews called one. Its stdout is one JSON line,
   `{ session, result, usd, usage, context, turns, ms, legs }`: `result` is its report, of its last leg when it
   waited on a background command (`legs` over 1; until 2026-10-11 the line was of the first leg, and a reviewer
   that waited for the landing lock read as having stopped at "Still held"). In its `cost` event (step 5)
   `context` is `context`, `seconds` is `ms` over 1000 as a whole number, `how` is `light`, and the call has `usd` and `session`
   (the `session` of that JSON, not yours); `tools` and `agent` are left out. It is never sent
   `--resume`. When the command prints no JSON line (a view whose clone was not made has no `agent.sh`: exit 127), or exits 1 (the result was an error) or 2, spawn the reviewer once as an Agent, as above, with the view as its `Working directory:` and the same token in its prompt:
   the file `agents/reviewer.md` there says where the brief is. Say so in the journal and in step 7.
   A JSON line and exit 2 together are not that case: the line is printed only when the run gave a result, so the
   exit is from the script after it (three reviews on 2026-10-11, when `agent.sh` was written over during the run;
   `tools/cloud-brain/records/agent-sh-read-whole-before-run.md`). Read the issue: when the review is recorded
   there it stands, its cost is posted from the line, and no second reviewer is spawned.
   Measured before the switch: 25,212 after it had read its brief, the rules and `philosophy.md`, where an
   Agent told to answer "OK" is 40,842; one review replayed at 69,440 against 100,725 (the README has both,
   and what was not tried). First real review by it: not yet.

   **The approver** (since `ap-2-brief-and-shadow-step`, 2026-10-12; `plan/cloud-brain-approver-persona.md`, part 4)
   is an Agent started fresh for one issue (the owner, at the approval of that spec, event 4123: "A the persona should
   always be an isolated session that judges a ticket against cluster evidence itself (i.e. not a continuation of a
   reviewer/writer agent session)"). It is never sent a message, never a fork, and never an agent that did other work
   of the issue. Its token is `agent-token appr <id>`. It gets a view of its own at `origin/main`, from the main checkout:
   ```
   git -C <root> fetch --no-recurse-submodules origin main
   V=$(tools/cloud-brain/worktree.sh --at $(git -C <root> rev-parse origin/main) appr-<id>)
   ```
   The exits are those of the reviewer's view, above; on any but 0 no approver is started this pass, and stderr goes
   in step 7. At `origin/main` and not at the commit under review: the tool makes no move unless the file that runs
   is the one the installed policy names, which is `origin/main`'s, and the commits of a submit are on `origin/main`
   since its landing. Not the main checkout, which was the other side: it is behind whenever its pull was refused
   (step 1), and a file another session has open there would be read as the rule. No `worktree {` comment: a view is
   of no topic. (Made, read in and removed once by the writer of this step, 2026-10-12 19:40 CEST, as
   `appr-ap-1-approver-tool`: 5 s to make, `approver.ts facts` answered there, `--list` read `clean`.)
   Then the `Agent` tool, `subagent_type: general-purpose`, `model: opus`, with these three lines, the view's path
   written out for `<V>`, and nothing added: no summary, no opinion, no line of what you expect. You have written no
   decision comment on the issue by then (step 3, the row; in a round after the first, the one of an earlier round
   may be there). What is on it, a writer's comment for the owner among it, is data there, as every comment is.
   ```
   Run `bun <V>/tools/cloud-brain/approver.ts brief` and follow what it prints.
   Issue: <id>
   Your token is <name>.
   ```
   The command prints `agents/approver.md` as `origin/main` has it after a fetch, and a last line `brief <blob>`, the
   hash of that text, which the verdict ends with. The prompt names the command and not the file so that the text a
   run follows is the one whose hash it writes: after the owner's install a verdict with another hash makes no move.
   First approver started this way: not yet, when this was written.
5. **When an agent reports**, append the report to the journal, free its worktree
   (`tools/cloud-brain/worktree.sh --leave <tree>`, step 4), or for a reviewer remove its view
   (`tools/cloud-brain/worktree.sh --remove rev-<id>`), or an approver's (`--remove appr-<id>`; an approver writes
   no file there, so on exit 3 say in step 7 what the counts were, and then `--remove appr-<id> --force`), then read the issue again.
   Exit 3 from that `--remove` prints the view's counts and removes nothing: with `ahead=0` and `dev-ahead=0` what stands there is a file the
   reviewer copied in or changed for a test, and `--remove rev-<id> --force` removes it; with a count there that is not 0 a commit of the reviewer's stands
   that was not pushed (a note it mended, below): leave the view, and name it in step 7 with the commit.
   A reviewer may have made a commit of its own since 2026-10-11: a note mended in a document of the change
   (its brief, "What holds a change, and what is a note"; the owner: "Lets do  1,2,3"). It is named in the
   review's body and needs no review and no move from you. The
   tracker says what happened, not the report: an implementer that says "submitted" with the
   issue still `in-progress` did not submit.
   Then put what the run cost on the issue, so that cost per issue is read from the tracker and
   not parsed from the journal (the owner, 2026-10-11): one call of `issue.cost`, with your own token
   (`orch-…`), which writes an event of the type `cost`:
   ```
   issue-as.sh <your token> cost '{"key":"cost/<id>/implementer/1","id":"<id>","role":"implementer","round":1,"how":"fresh","outcome":"in-review","seconds":723,"context":177525,"tools":37,"event":205,"agent":"af49053b540d9c3f5","session":"f501a8e8-b922-4e11-a581-2b725efd6272","token":"impl-3fa2c1","usage":{"input":61,"cacheWrite":141873,"cacheRead":3561349,"output":17885,"requests":29,"advisor":{"calls":2,"input":254047,"output":13751}}}'
   ```
   The key is `cost/<id>/<role>/<round>`, which a second call for the same run does not repeat (`duplicate: true`).
   (Since `cm-5-the-loop-writes-the-event`, 2026-10-12. Until then the run was a comment whose body was the word
   `cost` and a line of JSON, and its usage, when found later, a second comment. Those comments stay in the record
   and nothing reads them: `tools/cloud-brain/cost-events.ts` entered each as an event that names it in `of`.
   The owner, 2026-10-11: "we should make them 1st class citizens of the model and not a JSON blob appended as a string".
   `plan/cloud-brain-run-cost-is-part-of-the-issue-model.md`.)
   The service checks the call (`getSource?worker=brain-x-issues&part=reference`, the row `issue.cost`): a field it
   does not list, a required one that is missing, or one of another type is 400 `InvalidRequest` naming the field, and
   nothing is written. Read the answer: `seq` is the event's.
   Required: `role`, `round`, `how`, `outcome`, `seconds`, `context`.
   `role` is `implementer`, `reviewer`, `spec-writer`, `digest`, `overseer`, `approver`, `triage` or `paper-summarizer` (a name, a-z 0-9 -; the service keeps no list); `round`
   counts the runs of that role on that issue from 1 (a writer's is the round it wrote, the `rework` moves before it
   plus one, as in its keys `comment-N` and `submit-N`; for a run of two rounds, below, the first of them);
   `how` is `fresh` for an agent you spawned, `resumed` for a round you sent to an agent that was there, `light` for the
   reviewer run by `agent.sh`; `outcome` is
   `in-review`, `pass`, `changes`, `stopped` or `no-submit`; `seconds` and `context` are the Agent result's numbers as whole
   numbers, `context` its count of tokens: the size of the agent's last request, which says how full the agent was, not what
   it was billed (the field was `tokens` in the comments). Neither is estimated. An Agent result that lacks one has 0 for
   it, said in the journal, since the service refuses a run without them and a run with no event is in no total (each of the 389
   runs written as comments by event 3358 had both: `cost-events.ts` left none out).
   Optional, a missing one left out and never sent as `null`: `tools`, the Agent result's count; `event`, the submit or the review
   the run made, when it made one; `token`, the name of the token the agent wrote with, the one you made for it and put in its
   prompt (a triage of your own has none). It is what joins a
   `by.holder` of the record to a transcript. `agent`, the `agentId` of the
   Agent result as it is written there, and `session`, the output of `echo $CLAUDE_CODE_SESSION_ID`
   in your Bash, are in the event of every Agent run: the two say where a transcript is, and where a writer can be sent its next round (below, "A rework round
   goes to the agent that wrote the change"). A round that was sent to an agent and not spawned
   has `"how":"resumed"` and the same `agent`:
   ```
   issue-as.sh <your token> cost '{"key":"cost/<id>/implementer/2","id":"<id>","role":"implementer","round":2,"how":"resumed","outcome":"in-review","seconds":410,"context":201310,"tools":19,"event":231,"agent":"af49053b540d9c3f5","session":"f501a8e8-b922-4e11-a581-2b725efd6272","token":"impl-3fa2c1"}'
   ```
   Its numbers are the ones the resumed run reported, as they are; what `context` counts there is
   said in that section. (This example is written without its `usage`, for length.)
   A run in which the writer waited and took a round itself (step 2, "A writer that waits") made two submits and
   gets one event, when it reports: `round` the number of the first of the two, `event` the last submit,
   `outcome` what the issue was at when it reported, `how` `fresh`, and the key `cost/<id>/<role>/<round>` with
   that first number. No field says it was two: `issue.cost` refuses a field it does not list, `rounds` among them, and the
   comment's `"rounds":2` (os-4) is not carried. That a run was of two is read from the record: the submit its `event` names
   is the issue's second after the `start`, with a `rework` between them. (No such run was in the record at event 3358: no comment had `rounds`.) The round after it is counted from the tracker as every round is (the `rework` moves plus one),
   so its event is two on from this one. `usage` is `agent-usage.ts --session <session> --agent <agentId>` with no
   `--last-run`: the agent was given one prompt, and both rounds are its run. `seconds` of such a run has the waits in it.
   Every event also has `usage`, what the run was billed (the owner, 2026-10-11: "yes lets post  billed tokens
   (input, cache reads, output) per run for subagents too"): the one line that
   `bun tools/cloud-brain/agent-usage.ts --session <session> --agent <agentId>` prints, as it is, all eight numbers of it.
   For a round that was sent
   to an agent add `--last-run`, which counts that round and not the ones before it (run it when the round
   reports: once a later round is sent, `--last-run` is that one, and an earlier one is `--run N`, the agent's Nth). For the light reviewer it is
   `--session <the session of its JSON line>` with no `--agent`. When the command exits 1 (no transcript) leave
   `usage` out. When the transcript is found later, or a number of an event was wrong, send the whole run again with
   what is now known, under the key `cost/<id>/<role>/<round>/2` (then `/3`): the later event of an issue, role and round
   takes the earlier one's place in the issue's totals and names it in `replaced`, and both stay in the record. A run that was stopped or died gets its event too. No time
   of day goes in it. `issue-as.sh <your token> "get?id=<id>"` then answers the issue's totals in `cost`, and
   `"runs?id=<id>"` each run (`&role=`, `&how=`, `&round=<n>|first|later` narrow it; with no `id`, the runs of every issue).
   With the event written, end the run's token unless it is one of those kept for a rework round
   ("A token for each agent", Ended); and when the issue has just left `in-review` for good, end its writer's, once that writer has reported
   (one that waits reads the tracker with it until then, and `issue-wait.sh` exits 2 at a read that is refused). An overseer's run is on no issue, and an event needs one: its line goes in `_oversight.md`,
   the JSON of the call without `key` and `id`, and yours for the pass, with the role `orchestrator`, in `_orchestrator.md`
   when the session shows a count. The journal is written as before. A run entered from a comment by `cost-events.ts`
   has `of`, the comment's seq; of those, the 100 read from the journal's headings on 2026-10-11 carry `"backfilled":true`.
   **The role `paper-summarizer`** (since `ps-4-the-rest`, 2026-10-12; `plan/cloud-brain-paper-summarizer-persona.md`, task 4).
   A task whose writer ran `summarize-papers.ts run` started one light agent a paper, and those agents are no run of
   yours: nothing reports them but `<root>/tools/cloud-brain/.emitted/papers/journal.jsonl`, one line an agent with its
   `usd`, `ms`, `context` and `session`. They get one event a task, beside the writer's own, under the key
   `cost/<id>/paper-summarizer/1`: `role` `paper-summarizer`, `round` 1, `how` `light`, `outcome` the writer's,
   `usd` the sum of `usd` of the task's lines (the canaries among them), `seconds` the sum of their `ms` over 1000 as
   a whole number, `context` the largest `context` of them (the fullest of the agents; the field is one request's size
   and a sum of 53 would say nothing). No `session`, `agent`, `tools` or `usage`: there are as many sessions as papers
   and they are in the journal. The task's lines are those with `at` from the first canary of the task's first `run`;
   the writer's comment gives that `at` and the three numbers, with the command that printed them. Check the sum
   yourself before the call (`tools/cloud-brain/records/ps-4-the-rest.md` has the command).
   **The role `approver`** (since `ap-2-brief-and-shadow-step`, 2026-10-12; `plan/cloud-brain-approver-persona.md`, part 5).
   One event a run of an approver, written as for any Agent run, with four things of its own:
   ```
   issue-as.sh <your token> cost '{"key":"cost/<id>/approver/1","id":"<id>","role":"approver","round":1,"how":"fresh","outcome":"leave","seconds":277,"context":98211,"tools":21,"event":4301,"agent":"a1c9e07d2b6f4d3a8","session":"f501a8e8-b922-4e11-a581-2b725efd6272","token":"appr-7c20fe"}'
   ```
   `round` is the `<n>` of the verdict's key, the count of the issue's moves to `awaiting-approval`, and not a count
   of approvers: step 3 asks for the run of that round, so that a round gets one. `outcome` is `approve` or `leave`,
   as the verdict begins, and `stopped` for a run that wrote none; it is the verdict and not the move, which is an
   `approve` event `via delegation:…` in the record when the tool made one. `event` is the verdict's seq. `token` is
   the `appr-` name and is never left out: `approver.ts check` holds an approval made by the approver to stand only
   when its verdict's token is the `token` of a `cost` event of role `approver` that an `orch-` holder wrote. The
   numbers of the example are made up, and its `usage` is left out for length. Then end the token
   (`agent-token revoke <name>`): an approver is sent no second round.
6. **Oversight.** Spawn the overseer (its token: `agent-token over oversight-after-<seq>`), beside the others, when either 3 issues have
   reached `done`, `rejected` or `needs-owner` since the last entry of `oversight.md`, or one
   issue hit the rework cap. One overseer at a time; it commits in its own worktree, `bm-over-<host>` (step 4), and
   lands from it by a push under the landing lock.
7. **Tell the user** in a few lines: what moved this pass, what is waiting for the owner and
   why, what is running. Nothing moved is one line.
   What waits for him is told as one list, in the form of `rules.md`, "What the owner is asked to decide": numbered, those
   that need no thought first as one group with the answer you would give, then each real choice with a line a
   letter and your pick, so that he can answer all of it in one message. So is the list he asks for. The comment you
   write on an issue for him to decide by (with `needs-owner`, or at `awaiting-approval` after its approver's verdict
   and not before, as the row of step 3 has it) is written by the same section. (The owner, 2026-10-12, of such a list: "This simple summary is much better for
   making decisions".)
   **A spec put to him.** The comment for an issue whose last submit is a `submit-spec` (a `project` or a `feature` at
   `awaiting-approval`), and its item of the list, has two lines more, after the sentences of what it is and before
   the choices. Both are there for every spec, also with nothing to say, so that a line left out is not read as nothing added:
   - `Adds, to stay:` each role, brief, tool, token, Worker, method or store the spec adds, by its name, and for each
     in a clause what exists today of the same job ("a role `doc-summarizer` with a brief and a tool of its own,
     beside `paper-summarizer`, which summarizes the papers"). With none: `Adds, to stay: nothing.`
   - `Readings of your words:` each sentence the spec marks as its writer's reading and not his words, in one line
     each. With none: `Readings of your words: none marked.`

   They are written from the spec writer's comment keyed `spec/<id>/adds-<round>`, `<round>` that of the submit
   (`agents/spec.md`, step 7), which is a claim as every comment is: read it against the file at the commit the
   submit names, `git show <sha>:plan/cloud-brain-<id>.md | grep -n -i "reading"`, and a reading that prints and
   the comment does not have goes in the line. A spec with no such comment (one submitted before 2026-10-13, or one whose writer
   did not write it): the two lines are then written from the file, that `grep` and its part of what was not chosen. The line of a token
   (`agents/spec.md`, step 5, "say in the comment for his approval that the spec names a token, and which") is the
   token's entry of the first line and is not said twice. After an `approver: leave` the comment is written from the verdict
   (step 3, the row) and has the two lines as well. (Since `decision-comment-names-what-is-added`, 2026-10-13, an
   action of `tools/cloud-brain/post-mortems/pm-second-summarizer-role.md`: comment 4344 of
   `docs-summarised-for-search` put a spec to him with "One light agent a doc writes the summary, as for the
   papers"; the spec added a role, a brief and a tool for that agent and marked the role as its writer's reading.
   His first answer, 21:02 CEST (comment 4382), was of the cost; the role came up at 21:14 (4458). `rules.md`, "What the owner is
   asked to decide", lists the parts of such a comment and has neither line: they are this step's, each one line,
   and where that section and this differ that section holds. First comment written with the two lines by this
   step: not yet, when this was written.)
   Then what was approved for him since you last told him: the lines of
   `bun tools/cloud-brain/approver.ts list --since=<hours since you last told him> --token <your token>`, as they
   are (the hours a number above 0, as `24` or `0.5`; the tool is exit 2 for any other). Each is one `approve` the approver made: the time, the issue, the words of his it rests on (`on your words
   of event N`, `on the spec you approved`, `on your words in <file>`, `on words a session quoted at event N`), the
   verdict's one sentence, and `reverted` when he has undone it. Nothing printed is none, which is every pass until
   he installs a policy that lets the approver approve. An issue that waits for him at `awaiting-approval` with an
   approver's verdict is named with the verdict's first two lines (`plan/cloud-brain-approver-persona.md`, part 5).
   One whose approver has not reported is named in one line, as waiting for its approver, with no letters and no pick:
   it is not put to him as a choice before the verdict (step 3, the row), and he may approve it as before.
   Then the post mortems ("A post mortem", below), each said once, in the pass that first reads it so: one that has
   reached `done`, with its cause in the sentence its file has under `## The root cause` and its actions by id, or its
   "None"; one that a later post mortem names again; one with an action at `rejected`; and, when you have declared
   more post mortems than the record has events of the one case you declare for, that, with both numbers.
8. **Watch, then schedule** (only under `/loop`). The tracker wakes you, not the clock (the
   owner, 2026-10-11: "The self pacing mechanism is quite slow, I think you need a background
   tasks notifying you of new issues as they come in"). Keep one `Monitor` armed, `timeout_ms`
   1800000, with the command
   `tools/cloud-brain/issue-watch.sh <your token> <the last seq you have read>`.
   Every 30 s it reads `queue` and `sync?after=`, and prints
   `QUEUE <do> <id> <for> <title>` for each entry of the queue that is new: one whose id and `do` were not in the answer before. An entry is
   printed once while it stays, and again when it comes back after an answer without it; the first answer of an arm is printed whole, so
   arming the watch again prints every entry again (since `bk-6-skill-watch-and-stats`, 2026-10-13: an open and a submit are no line
   of their own any more, being the entries `triage`, `spec` or `promote`, and `review`; a writer that waits has not reported
   (`os-4-writer-waits`), so the line `QUEUE review` is how you learn its review is wanted; an entry an agent of yours is on is printed too,
   since the record does not know which agents run; a watch armed before that change prints the lines of before until it is armed again),
   for each label `asks-orchestrator` put on an issue, whatever token put it on (step 3, the row of that label: an agent that still runs asks you; the comment with the ask is no line, and neither is the label taken off; a watch armed before `asks-orchestrator-label-and-watch` prints none until it is armed again),
   a line `<seq> asks-still <id> <N> min …` for each issue that has that label and has had no event for 5 minutes, once at each 5 minutes, from a read of `list?label=asks-orchestrator` it makes with each read of `sync` (an ask you did not answer; what it reads is the issue's `updated_at`, which a `cost` event does not move; since `wait-says-what-runs-and-until-when`),
   for each comment written with a token `out-` and six hex digits, but the one the watch is given (since `watch-prints-an-outside-sessions-comment`: a session outside the loop, which the owner may be in, `rules.md`, "Which token"; read the comment, which may have his words or a line for you, and until that change it was no line: comment 4916 of `fly-1-by-hand`; that token's moves and labels are no line, and a watch armed before that change prints none until it is armed again), and
   for each event made with the owner's session (a comment, a label, a move, an approval in the
   panel). A `QUEUE` line names its row of step 3: its `do`.
   A line is a wake: read that issue and take it from the table of step 3, without a
   whole pass. A write of an agent's that makes no entry of the queue new prints nothing; its report wakes you as before. The monitor
   ends after 30 minutes and says so: arm it again from the last seq, in the same turn. Then
   `ScheduleWakeup` 1800 s as the fallback, for a monitor that died or a session that slept; that
   wake is a whole pass, health first, with the read of `list?label=asks-orchestrator` in its step 3. A poll of the tracker is charged nothing; a wake of this
   session is not free, so the watch prints only what you would act on.

## A message that asks an agent to wait

Since `wait-says-what-runs-and-until-when` (2026-10-12). The case: at 20:20:37 CEST that day this
procedure's session told the writer of `fly-1-by-hand` to "stop and wait for me" until a comment
"I post it when no other agent of the laptop's loop runs.". The pool was doubled at 21:15, the writer
asked at 22:21:06 with a billed Fly machine running, and the answer came at 22:43:04, after the owner
asked. The session, of its condition: "that time was never coming, and I had not said so to the
writer or to him" (`tools/cloud-brain/post-mortems/pm-agent-request-not-seen-fly-idle.md`, "The root cause", 1).

A prompt or a message of yours that tells an agent to wait for you names a time, not a condition:

- **The time by which you answer**, read from `date` and written as a time of day, 10 minutes at
  most from the moment the agent begins to wait. Never a condition of the pool ("when no other agent
  runs", "when the lock is free", "after the next pass"): a condition has no end the agent can read,
  and you cannot know that it comes.
- **What the agent does at that time with no answer**: it stops what it started that is billed and
  ends its run with a report, and you resume it by message when you can answer.
- **How it asks**: `tools/cloud-brain/issue-ask.sh` (`agents/implementer.md`, "When you need the
  orchestrating session"), so that the ask is a line of your watch and a row of step 3, with its
  time and what is billed in the comment. Not a comment with a key you made up and a poll for another.
- When you cannot name a time, do not ask the agent to wait: have it stop what is billed and report.

Nothing refuses such a message: `SendMessage` and the prompt of an `Agent` call are the harness's, and
no tool of the loop reads either. `tests/tools/issue-ask.test.ts` holds that this section is here.
The agent's half is held by a tool: `issue-ask.sh` writes no ask without its minutes.

## A rework round goes to the agent that wrote the change

Tom, 2026-10-11: "resuming implementors is a good idea, not always possible if they are done by
different agents, but maybe we append session-id". Until then a rework round was a new agent,
which read the brief, the issue and the code again: 10 of 36 issues had more than one implementer
round, 46% of 12.06 M tokens (the journal of 2026-10-10 and 10-11, counted in the body of
`rework-resumes-the-implementer`). Written 2026-10-11. The first implementer round run this way
was round 3 of `annotations-file-feedback` the same day (cost comment 1003); its counts are in
`tools/cloud-brain/records/rework-resumes-the-implementer.md`, "The first resumed round".

For an issue at `in-progress` whose last move is `rework`, with no agent running. A writer that
waits for its review (step 2, "A writer that waits") is running: it takes that round itself and is
sent no message. What follows is for a writer that has reported: after its second `changes`, after
20 minutes with no review, or one spawned before `os-4-writer-waits`.

1. Read its runs, `issue-as.sh <your token> "runs?id=<id>&role=implementer"`, and take the one of the highest `round`.
2. When that run has an `agent`, its `session` is the output of `echo $CLAUDE_CODE_SESSION_ID`
   in your Bash, and the agent's token is live, send the round to that agent (live: the run's `token` is a
   `name` of `agent-token list`; a run with no `token` is of a writer that wrote with a role's
   token, which is live until the owner's revoke): first put it in a worktree again, as step 4 does, with the
   name of the topic's last `worktree {` comment whose `for` is this issue:
   `tools/cloud-brain/worktree.sh --fresh <tree> --for <the agent's token>`. Exit 4 (a later task of the topic is
   being written there) or exit 3 with another issue's work: the next free name, and the comment of step 4.
   Then `SendMessage` (load it with `ToolSearch`,
   `select:SendMessage`) with `to` the `agent` value and this message, with nothing added:
   ```
   Issue: <id>, sent back by the review at event <seq of the `reviewed` event>.
   Working directory: <W>.
   A resumed round: read <W>/.claude/skills/brain-maintenance/agents/implementer/resumed-round.md, "A resumed round", and follow it.
   ```
   The answer to a send that was taken is `{"success":true,"message":"Resuming agent …"}`. The
   agent runs in the background and reports as a spawned one does; step 5 is the same, with
   `"how":"resumed"`. While it runs it is the agent on that issue, and a writer at work for step 2.
3. Anything else, spawn as step 4, after the two moves of "A dead writer" in step 3's table (you end
   the starter's token and make `back`; the writer you spawn makes `start`): no such run, a run
   with no `agent`, another session's agent, a token that has ended,
   or a send that is refused (an agent the user stopped refuses a message; a transcript is deleted
   after 30 days). A refused send is not tried twice. Until 2026-10-11 the new writer submitted with
   no move between, being the same actor as the one that started.

An agent's transcript is kept under the session that spawned it
(`$CLAUDE_CONFIG_DIR/projects/<project>/<session>/subagents/agent-<agentId>.jsonl`), which is why
the session is compared: the id alone, read in another session, names nothing there. The id is on
the issue and not in your memory because your context is compacted and the transcripts are not.
A new session has another id, and spawns. Whether a session resumed after a restart of Claude Code
keeps its id has not been seen: the one session that has sent rounds (`f501a8e8`, 2026-10-11) was
not restarted between the first run it wrote and the last, and its transcript has one `sessionId`.
After a restart, compare the variable with the `session` of a run written before it and
write here what it was.
That the variable gives that directory's name was read in a subagent's Bash on 2026-10-11, not in
an orchestrator's. Before the first send of a session, `ls` that `subagents/` directory with the
variable in the path and see the `agent-<agentId>.jsonl` of an agent you spawned; when it is not
there, every round of the session is a spawn, and say so in step 7.

The reviewer is never resumed: a review is by an agent that has not read the work before, and a
resumed reviewer has. The overseer is spawned as before. A spec writer and a digest writer are
sent their round as a writer is, from their own last run (`role=spec-writer`, `role=digest`),
and when they cannot be it is `back` and a spawn (step 3's rows). Three spec writers had been sent a
round by 2026-10-11 (`cost` comments 926, 997 and 1015, as the spec counts them); no digest writer.

What `context` is for a resumed round (`tokens`, when a run was a comment): on the one resume tried (2026-10-11, an agent that had
answered "OK" with no tool call) the count was 40,982 after the first turn and 41,056 after the
second, so the number held the first turn's context. A resumed round's `context` is therefore not
set beside a new agent's as it stands. `"how":"resumed"` marks it, and the `context` of the same
agent's run before it is what to take off. That difference is not what the round was charged.
This session's transcript has `Resuming agent` answered for 4 agents on 2026-10-11 before 14:32 UTC:
3 for a rework round and, before them, one whose run had stopped. On the first send to each (one
was sent a second), the 3 sent more than 5 minutes after the agent's last request wrote the whole
earlier context to the prompt cache again on their first request (114,548, 171,072 and 144,096
tokens of cache creation; for the last two the differences were 15,833 and 24,455); the one sent
4 min 20 s after read it from the cache (2,084 written, 178,464 read). The record has the requests.
`seconds` and `tools` were the round's own for two of the four and running totals for the other
two; what decides which has not been found.

Tried on 2026-10-11, in that round: an agent that had used tools (35), whose worktree was removed
at its landing, sent to after this session had compacted (14:22:31 UTC; the send was 14:31:35).
Not tried: a resume after a restart, and a send that is refused.
Not decided: when a long first round makes a resume dearer than a new agent, and whether a
resumed writer passes its second review more often than a new one (7 of the 9 round-2 reviews
readable in the journal on 2026-10-11 asked for changes again). The overseer compares the
resumed runs with the later rounds that are not (`runs?role=implementer&how=resumed&round=later`, and `how=fresh`) once there are some.

## A quick win

> In force on cb4 since the owner installed the policy of 2026-10-11 (event 483).

Tom, 2026-10-11: "if an agent has spare context left and it already knows how to fix an issue it
should jsut do it as a quick win while it is there." That is said of every agent, you among them.
Triage has you read the issue and the code; sometimes you then hold the whole fix, and spawning a
writer to find it again was 167,000 tokens at the least on 2026-10-10. Take it yourself when the
fix is in a brief, a doc, a record or a local tool, is one change, and needs no seed built and no
deploy: `start` from `open` with your own token and the reason triage would have given, make the change in your own worktree (`bm-orch-<host>`, step 1),
write its record (`tools/cloud-brain/records/<id>.md`, as `agents/implementer.md` step 9 says; a
change to a doc alone has one too: reviews 642, 645 and 686 each sent a quick win of yours back
with "no record" among the findings),
land it by a push from that worktree under the landing lock (`LOCK_TOKEN=<your token> lock.sh take land <who>`, `agents/implementer.md` step 10), `submit` with the commit. Any submit of your own, a quick win or work
a session did on the owner's word, is sent after the push and after the lock is released: one
`commit` ref for each commit the landing added, read then with `git log`, and a `deploy` ref
(`<worker>@<hash>`) for each thing put on cb4; and it has its record first, as above. (Submit 1042
named another issue's HEAD, sent while the lock was held; reviews 1032 and 1052 of
`dv-4-owner-install-and-shell` each sent back a submit with no deploy ref, the first with no
record.) It has a test count from a run of your own too, as a writer's submit has (`rules.md`, Never, the last
item): a change to a doc alone, your edit of `philosophy.md` on the standing leave among them, gets a test file
under `tests/tools` that reads the doc and fails on the text of before, and the submit gives the count and the
command. (Review 4830 sent `philosophy-one-role-for-one-job` back for this alone: your submit 4814 said "No
deploy, no test run (prose in one file", the text was right, and the round cost a second review and the bug
`philosophy-test-no-skip-without-clone` of the test written for round 2, which failed where `cloud-brain-dev` is
empty: a test that reads a file of the submodule skips there, with a `skipped:` line.)
The review is a reviewer's as for any issue.
Anything in a seed goes to a writer. A writer does the same for what it meets beside its issue
(`agents/implementer.md`, "A quick win"); a reviewer does not (it would be the writer).

## Links, and projects

> In force on cb4 since the owner installed the policy of 2026-10-11 (event 483).

Since 2026-10-11 (`plan/cloud-brain-issues.md`, "Amended 2026-10-11"): `issue.link { key, id, to, rel }`
with `rel` one of `duplicate`, `cause`, `related`, `part-of`, and since `bk-1-after-link` (2026-10-12) `after`: `id` comes
after `to`, an order that no guard reads (`plan/cloud-brain-bookkeeping-in-the-tracker.md`, part 1). Use it at triage instead of an id in
prose: a duplicate is linked and then `close`d (`reject` is for what is not real); an issue that
exists because of another names it as its `cause`. `part-of` makes an issue a part of another after
it was opened, and `{ id, rel: "part-of", remove: true }` takes it off. That lets the parent be
submitted without that part, and it is the loop's to do (Tom, 2026-10-11: "its fine"): say why in
a comment on the parent.

A `project` gathers reports that share a cause: the overseer opens one when three or more do
(`agents/overseer.md`), and the owner opens one for a feature. Its path is spec, review of the
spec, the owner's approval, tasks as its parts, done when none is open; the rows above are that
path. You do not decide a project's design at triage: the spec is where it is decided, and the
approval is where the owner stops it.

An issue the owner answered in the session, with nothing left to build: `close` it with his words
and the date as the reason. `back` (in-progress to ready) gives back work that stopped.

## The daily digest

Since 2026-10-11 `brain-x-snapshot` opens one task after its daily run (06:00 UTC), `digest-<day>`,
labeled `digest` (Tom, 2026-10-11: "we should automatically file a task in the issues to run the
research summary. Then our claude can process it automatically"). The label says which brief: a
digest is written, not fixed, so `agents/implementer.md` does not fit it. The opener is checked
because anyone who may call `issue.open` may write that label. An issue labeled `digest` with
another opener is triaged as any task. The writer publishes with the token `loop-library`, sends
the owner one Bluesky message and submits (`agents/digest.md`, step 8). A reviewer for a digest
follows "A digest" in `agents/reviewer.md`. First pass over one: 2026-10-11, `digest-2026-10-11`,
whose writer stopped before publishing under the rules of that morning; the reviewer's section
has not been run.

## A post mortem

Since `pm-2-brief-and-procedure` (2026-10-12; task 2 of `plan/cloud-brain-post-mortems-declared-and-kept.md`, which
was approved for the owner at event 4737 on his "4 A" of comment 4736). The owner, 2026-10-12, of a spec he had
sent back after its review had passed it: "We need this to be a general mechnism, declare a post mortem to prevent
someting from never happening again", and in his next message: "no you don;t do it, file
issues to create a post mortem task, the loop itself should do the post mortem and decide next actions. These
post mortems should be files for future reference somewhere."

**What one is.** An issue of kind `task`, id `pm-<short>`, labeled `post-mortem`, with one link
`{id: pm-<short>, to: <the issue it is of>, rel: "cause"}`. Its body has what is examined (the issue, the events,
the commit), the words of whoever asked, and pointers to where the trace starts. It names no cause: the writer
finds it, and one that was told what to find confirms it. The label says which part of the brief, as `digest`
says which brief: a writer follows "A post mortem" in `agents/implementer.md`, and writes
`tools/cloud-brain/post-mortems/<id>.md`, which the Brain's search answers as `doc:<id>`. Two exist as this is
written: `pm-second-summarizer-role`, `done`, written before this section and not labeled yet (you label it when
this task is done: the body of `pm-2-brief-and-procedure`), and `pm-approver-leaves-everything`, declared by the
owner through a session at event 4906, labeled, and at `open`.

**Who declares one.** Two, and nobody else.

- **The owner**, through any session on his word. The session puts `owner` beside `post-mortem` in `labels` and
  quotes him, whole, in the body.
- **You, with no word of his, in one case: he undid work that had passed a review.** That is one of three moves
  made with his session (`by.via` is `session`; the watch of step 8 prints the line with `OWNER`): his `send-back`
  of a spec; his `owner-reject` of an issue that has a `reviewed` event with the verdict `pass`; his `revert`.
  You open it in the pass that reads the event, with your own token and without the label `owner`, after
  `list?label=post-mortem&limit=100` has shown none of the same thing. The open's body is a file of the scratchpad
  (`agents/implementer.md`, "The tracker's write calls"),
  `{"key":"orch/pm-<short>/open","id":"pm-<short>","kind":"task","labels":["post-mortem"],"title":"Post mortem: …","body":"…"}`:
  ```
  issue-as.sh <your token> open @<file>
  issue-as.sh <your token> link '{"key":"orch/pm-<short>/cause","id":"pm-<short>","to":"<the issue it is of>","rel":"cause"}'
  ```
  The body quotes his reason for the move with its event, and says "I give no cause here", as the body of
  `pm-second-summarizer-role` does. The record had 1 such move in its first 2.4 days (the
  `send-back` of event 4434; no `owner-reject` and no `revert`, as the spec counted its first 4,493 events).
  First post mortem declared by you: not yet, when this was written.

An agent that sees something off files feedback, as before (`philosophy.md`, "If You See Something, Say
Something"), the overseer among them. Not a case: a reviewer's `changes` (75 `rework` and `respec` moves in those
2.4 days, which is the review working), a failed test, a put-back by the deployer (it opens its `fix-tests-…`
issue), a line of Never crossed (filed as feedback, as `seen-never-crossed-on-chat-word` was). When you have
declared more than the record has such moves, step 7 says so to him.

**Triage of one** asks one question in place of the three of "Triage": does a post mortem of the same thing exist
(`issue-as.sh <your token> "list?label=post-mortem&limit=100"`, each with its `cause` link)? Then
`issue-as.sh <your token> link '{"key":"orch/<id>/duplicate","id":"<id>","to":"<the one that exists>","rel":"duplicate"}'`
and `close` it with that id as the reason. Else `triage`, then `ready`, and step 3 gives it a writer.

**Its writer and its review.** An implementer, spawned as step 4 has it: the four lines, and nothing of what you
think went wrong. Never you, as a quick win or otherwise. It lands one file with no deploy, attaches it to the
issue, and submits. The review is a reviewer's as for any issue at `in-review`; the part "A post mortem" of its
brief is task 3 of the spec (`pm-3-reviewer-brief`) and was not on the Brain when this was written; it is since
2026-10-12 23:02 CEST, the put of that task.

**The actions are filed at `done`.** The file lists them under `## Next actions`, 3 at most, or says "None". The
writer waits for its review (`agents/implementer.md`, step 13) and after the `pass` opens each as an issue of its
own, linked `{id: <action>, to: pm-<short>, rel: "cause"}`, and gives the ids in its report. So a post mortem at
`done` whose writer has reported has as many `cause` links to it (`linked` of `get?id=pm-<short>`, the entries
with `"rel":"cause"`) as its file has actions, before step 7 tells the owner of it. When it has fewer (the
writer's run ended, or it reported with no `pass` read), you open the ones that lack from the file, as written
there: the title, the kind, a body that quotes the file's cause and names the file, `"labels":["major"]` on one
that changes `rules.md`, `philosophy.md` or who may do what, then the `cause` link; each is then triaged as any
issue. You do not choose between them and you add none. Since `post-mortem-actions-prefer-guards` (2026-10-12; the
owner: "generally fixes are better as guards") the file's table has a column `Held by` for each action, one of
`guard`, `workflow`, `refusal`, `test`, `observability`, `text`, which `tests/tools/post-mortems.test.ts` holds:
a `guard` or a `workflow` row changes the installed policy, so it is opened `major` and is his to install, and
the body you write for it has that row whole. A file whose cause is "Not found" has an `observability` action
and no "None". (`pm-second-summarizer-role` filed its three before its
review, linked `related`; their `cause` links are events 4909 to 4911, made by the writer of this section, and
`linked` there has three with `"rel":"cause"`.)

**Known later.** `issue-stats.ts` prints one block, `post mortems`, with a row for each: its state, the issue
it is of, its actions with their states, and `named again by`, each later post mortem with a `related` link to it.
Its first line is `post mortems   <n>: <done> done, <open> not done`, and its last has the two numbers step 7 asks
for: the post mortems with no label `owner`, which are the ones you declared, and the events of the one case you
declare for (each `send-back`, each `owner-reject` of an issue a review had passed, each `revert`), with their seqs.
(Since `pm-4-stats-block`, 2026-10-12, task 4 of the spec; until then the same was read from
`list?label=post-mortem&limit=100` and `get?id=` of each.) Step 7 says what of it the owner is told.

**The read after three.** When three post mortems are at `done` (the block's first line) and no issue `pm-read-after-three` exists, open it: a `task`, linked `related` to
`post-mortems-declared-and-kept`, no part of that project. A read, no build. For each of the three: did the review
send it back, and for which of its four questions; what became of its actions; was it answered to a later search
(the comments of later writers name what they searched and used); did the overseer act on the block. What it
finds is a comment on `post-mortems-declared-and-kept` and, where a brief is at fault, a task, `major` when the
brief is the overseer's.

## Triage

Done by you with your own token, every `open` issue in a pass, and also while an agent
runs: triage builds nothing. (Until 2026-10-10 18:43 it was one a pass and never beside an agent;
five issues then sat `open` for two hours behind three reviews of one.) Read the issue and enough of the
code to answer three questions, then write the answers as the `reason` of the move.
A time you write in an issue's body, a comment or a reason is read from `date` or an event's
`at`, never estimated (2026-10-10: a body said "23:30" and a comment "23:33", written at 23:24:45 and 23:25:04).

1. Is it real? A duplicate, test data, or something that is already so is `reject`ed with the
   reason and the id of what it duplicates. So is a defect nobody has met: found by reading the
   code, never reproduced, with no case where it cost anything. The owner rejected two of those
   on 2026-10-10 ("Need more evidence this is a problem before fixing", "wait until real issue").
   Say in the reason what evidence would reopen it.
2. What does `philosophy.md` say to do? **Decide it.** Choose the side that is smaller and
   easier to undo, name the line of the seven you decided by in the move's reason with what the
   other side was, and send it to `ready`. The owner reads the reason and can reject. This
   holds for a choice about the loop's own rules and tools as much as for a choice inside a
   service. (At the stop on 2026-10-10, 12 of 14 open issues waited for the owner, and he said
   the label "should really be about changing or clarifying philosophy".)
   - An issue that is one of several with a common cause is not sent to `ready` alone: link it,
     and leave the gathering to the overseer (below, "Links, and projects").
   - `needs-owner`, left at `triaged`: only when the seven do not answer it, when two of them
     pull apart with a real cost on each side, or when the issue proposes to change one of them
     or a line of `rules.md`. The comment is written as `rules.md`, "What the owner is asked to decide", has it: what its project is for, what it is, whether it is live, the one flaw, a line a choice, the pick. (Until `owner-decisions-written-dense`, 2026-10-12: "in the form `philosophy.md` gives", the longer order of 2026-10-11.)
   - Also `needs-owner`, until the owner changes `rules.md`: the change needs something only he
     may do (a policy install, a new secret, a deploy of the kernel, core, database or deployer,
     a deletion of kept data). Decide from the seven whether it should be done, and comment
     with the plan and the one command or word he would give. Do not ask him which side.
     `philosophy.md` has a proposal to build such a change first, under a label of its own;
     it is not in force. A token that an approved spec names is not such a secret: you make it
     ("A token an approved spec names", below).
3. Is it one change? More than one becomes subtasks (`open` with `parent`), and the parent goes
   to `ready` when they are closed. More than a handful, or a change of design: it is a `project`.

An issue labeled `post-mortem` is asked one question in place of the three: whether a post mortem of the same
thing exists ("A post mortem", above).

Anything else: `triage`, then `ready`. Add the labels `major` and `needs-owner` when the change
alters who may do what, deletes or rewrites kept data, or changes a method other callers use,
and comment with the plan, written as `rules.md`, "What the owner is asked to decide", has it. The owner takes `needs-owner` off to let it be built, or answers and you take it off (`rules.md`, Never, the `needs-owner` line). The approval
after review is then of a change that is already deployed and pushed, since a submit needs its
refs; the plan is where the owner stops it. Add `security` and take the `escalate` swap when the body describes a
way past an access rule; the issue is then the owner's.

## A token an approved spec names

Until 2026-10-11 a token a task needed was put to the owner as `needs-owner`, with the command.
Four were that day (`loop-agents`, `loop-dashboard`, `loop-docs`, `loop-papers`), each named with
its methods under "What only the owner can do" of a spec he had approved. He made one and said of
the rest, in the session: "I did not do the others, can you jsut do it", and then: "Why do I need to
even do it? It seems like common sense to issue scoped tokens that follow a spec." (Comment 1961 of
`ta-3-orchestrator-steps` has both; `rules.md`, "A token an approved spec names", is the rule.)

So, when the task that needs such a token is next: you make it, with the owner's session, from the
main checkout, `BRAIN_BASE=cb4 bun tools/cloud-brain/brain.ts token NAME METHODS`, with the name
and the methods the spec gives and no more. Then one comment on that task with the command as
run, the spec's line that names the token, and what the command answered (`made "NAME" for …`).
The token is never printed or read. It is not put to the owner, and the task does not get
`needs-owner` for it. His approval of the spec is his word for it.

Still his alone: a token no approved spec names, a method or a scope the spec does not give, and
every other act with his session but the `approve` move, the two standing leaves, and an act he
gives his word for in this session, which a secret printed, copied or logged never is (`rules.md`, Never, "Two standing leaves of the orchestrating
session" and "An act of Never, on the owner's word").

## What the loop does not do

- Anything owner-present: install a policy, approve, revert, rebuild. See `rules.md` for what you do of these on his word: the `approve` move since 2026-10-11, and since 2026-10-12 an act of its Never list that he gives his word for in this session, quoted on the issue with its date, but a secret printed, copied or logged, which no word of his in a session gives leave for ("An act of Never, on the owner's word"). An agent you spawn does none of them; an approver makes the `approve` move through `approver.ts` alone, which sends none until the owner has installed a policy that names its delegation (step 3, the row for `awaiting-approval`).
- Two agents on one issue. (No number of writers or reviewers is set: step 2.)
- Issues whose fix is in `exporter-3`, `robocoop-5`, the channel server or `lopecode`. Comment with the change wanted and label `needs-owner`.
- Carry on past a cluster that is not healthy.

## Why the overseer may edit briefs and not rules

Tom, 2026-10-10: the overseer "either files issues to improve the cluster OR tweaks the skills
to be better at doing their job". So it edits `agents/implementer.md`, the reviewer's brief (on the Brain
since 2026-10-11, changed with `cloud-brain-dev/put.sh`, which keeps the copy before) and
the procedure above directly, one commit an edit, each quoting the issue that showed the need.
`git log -- .claude/skills/brain-maintenance` is the list; `git revert` undoes one. For the reviewer's brief the
list is `cloud-brain-dev/put.sh --history roles/reviewer.md`, and `put.sh --restore roles/reviewer.md <name>` then
`put.sh roles/reviewer.md` undoes one.

It does not edit `rules.md` or its own brief, and it may not remove a check from any brief.
Those go to the tracker as `major`, which lands at `awaiting-approval` for the owner. The cost of
letting it edit everything: an agent judged by its own account of itself tends to drop the steps
that slow it, and the next pass runs the edited brief with nobody having read it. The cost of
gating everything (as `lopeteam-reflect` does): no brief improves while the owner is away, which
is when the loop runs.

## Runs

Append one line per `/loop` session: date, passes, issues closed, issues left for the owner,
oversights.

- 2026-10-10, about 16:00 to 21:25 CEST, passes not counted. Tracker at the stop: 21 `done`,
  8 `rejected`, 13 open, of which 10 labeled `needs-owner`, 2 held behind those and 1 `ready`
  and unstarted, and 1 unlabeled in the security workflow. 7 oversights. A round of one writer
  and one reviewer was 167,000 to 266,000 tokens; three issues took three rounds (800,386,
  792,862 and 624,066, summed from the journal). The landing lock was held
  2 to 17 s for a change with no deploy and 85 to 203 s for one with a deploy; one writer waited
  about 3 minutes behind another. Stopped by the owner, who then gave `philosophy.md`.
