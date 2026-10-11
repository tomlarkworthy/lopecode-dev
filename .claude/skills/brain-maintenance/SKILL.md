---
name: brain-maintenance
description: Use when the user asks to "work the tracker", "run the issue loop", "/brain-maintenance", "/loop /brain-maintenance", or wants the issues of the Cloud Brain tracker on cb4 triaged, fixed, reviewed and closed without being asked for each one. Polls the tracker, gives every review that waits a reviewer and every sent-back round its writer, starts new implementers (each in its own git worktree) when none of those waits, with no fixed number of either and a tracker token for each, and after every few issues spawns an overseer that files cluster issues or edits the role briefs.
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
| What is there to do | `issue-as.sh <your token> "list"` ("A token for each agent", below), the issues not `done`, `rejected`, `closed` or `reverted` |
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
  for a writer, `rev` for a reviewer, `spec` for a spec writer, `dig` for a digest writer and `over`
  for an overseer, whose second argument is `oversight-after-<seq>`. The name goes in the agent's
  prompt, and in the `token` field of its `cost` line (step 5). A round sent to an agent by message
  makes no token: the agent has the one of its first round.
- **Ended** by you, `agent-token revoke <name>`, when you write the run's `cost` comment. Not then
  for a writer's or a digest writer's run whose outcome is `in-review`, nor for a spec writer's that
  ended at `spec-review`: only the starter submits, and it may be sent a rework round. That token is
  ended when the issue leaves `in-review` for good (a `pass`, `to-approval`, a reject), a spec writer's when
  the project is `approved`, since the owner's `send-back` from `awaiting-approval` puts a project at
  `spec` again. One that is forgotten ends at its 48 hours. After a revoke `issue-as.sh <name>` is
  exit 2 here and sends nothing, and cb4 answers the value 401.
- **No agent makes itself a token**, and none calls with `loop-agents`. Nothing on cb4 refuses
  either: the parent is in a file every agent's shell reads (the spec, "What is not checked"). What
  shows it afterwards is a name that wrote an event and is the `token` of no `cost` line, so a `cost`
  line you write without its `token` hides it. A session outside the loop makes its own, `out-…`.
- **The three tokens of a role** (`issues-implementer-2`, `issues-reviewer-2`, `issues-overseer-1`)
  are kept until the owner revokes them, which the spec puts after the first check of
  `ta-6-checks-after-three-issues`. A brief names one only for an agent whose prompt names no token.
  At his revoke an issue then `in-progress`, or a project at `spec`, whose `start` or `spec` was made
  with one of them is started by a token no agent holds, and nobody can submit it: you make `back`,
  and a writer makes the second `start` or `spec` with its own (step 3, the row of a starter that
  cannot go on). Review 1273 of the spec has it under "For whoever builds it".

## One pass

1. **Health.** `brain.ts redistil` shows every Worker `same`; `brain.ts state` shows each `brain-x-*` Worker at the hash `tools/cloud-brain/seen.json` holds for it (`redistil` cannot show a put-back: the kept source goes back with the Worker, so it read `same` through the one of 19:32 on 2026-10-10); `lease.get` is held or the page is
   not needed; `tools/cloud-brain/lock.sh show land` and `show cb4` each answer exit 0 (the holder, since when and until when) or exit 1 (not held), and exit 2 is cb4 not saying: not healthy. If the cluster is not healthy, file or find
   the issue for it and do nothing else this pass. Since `lk-3-lock-sh-over-the-cluster` both locks are held in the cluster, for 600 s from the take or the last renew.
   A lock past its time is not held: `show` exits 1 and says whose lock ended and when, and the next take takes it. That holder died or overran:
   look at its issue (step 3). Nothing is the owner's to remove. A commit of your own in the main checkout is made between
   `LOCK_TOKEN=<your token> tools/cloud-brain/lock.sh take land orchestrator-$(hostname -s)` and `LOCK_TOKEN=<your token> tools/cloud-brain/lock.sh release land orchestrator-$(hostname -s)`.
   Every `lock.sh` of yours has `LOCK_TOKEN=<your token> ` before it, `show` among them: with none the call is made with a role's token (`lock.sh`, line 52),
   and the holder of a lock is the name with the token of the call.
   The name carries the machine, so an orchestrator on another machine is another holder. It is that name and no other: on 2026-10-11 `land` was held as
   `orch2-adv` and as `i1842`, which `lock.sh show` and the history trace to no issue and no role (`seen-land-held-under-other-names`).
   Two sessions under one role name on one machine are not
   told apart: the first's take refuses the second's, but a `renew` by either is answered as the holder's, and so is the renew `take --wait` sends
   after an attempt of its own that got no answer. One orchestrator and one overseer a machine. (That was written when both called with one token.
   With a token each, a renew or a release under the other's token is refused in `tests/tools/lock.test.ts`, against a stand-in; not tried on cb4.)
   **Past 4 hours.** Then `bun tools/cloud-brain/issue-stats.ts --token=<your token>` and its line
   `past 4 h, not started, no reason: <n>`, with one row under it for each issue counted: a task, bug, project or
   feature that is not labeled `needs-owner`, is at `open`, `triaged` or `ready`, and has had no move for 4 hours
   (`tools/cloud-brain/records/os-3-stats-past-four-hours.md` says what a row is and what a reason is). For each row:
   when it can be started, it goes before every younger start of this pass (step 3, the order of a free place);
   when it cannot, comment once with why and what would start it, the body beginning `held:`:
   `issue-as.sh <your token> comment '{"key":"orch/<id>/held-1","id":"<id>","body":"held: …"}'`. The tool then
   leaves the issue out of the count and prints `(<m> more are held)` at the end of the line. The count is from the issue's
   last move and not its last event: a comment or a label does not take an issue off it, and a `held:` reason does. (`plan/cloud-brain-loop-order-of-service.md`, part 4, R4: no task, bug, project or
   feature stays unstarted for 4 hours without a start or a written reason. First read by an orchestrator: not yet, when this was written.)
2. **Count your running agents. No number is set.** Every review that waits gets a reviewer, and every round sent back goes to
   its writer, in the pass that sees it. A new writer is started only when, after that, no review
   waits without a reviewer and no sent-back round waits without a writer. Start nothing new in a
   pass in which an agent's report or your own session names a rate limit or a usage limit, or in
   which `lock.sh show land` has named the same holder for two passes. One agent on an issue, as before.
   In a pass that starts nothing new, the rows of step 3 that spawn no agent are still done, triage among them.
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
   What makes several at once safe: a writer edits and builds in a worktree of its own and
   lands under the landing lock; a reviewer tests the notebook of the commit, not the working file.
3. **List the open issues and take the first that matches**, in this order.
   A place goes, in this order, to: a round that was sent back (a writer's or a spec's); a review
   that waits; a start. Among starts: the owner's before the loop's own; then an issue past 4 hours
   (step 1, "Past 4 hours"); then a bug or a task before a project or a feature; then the oldest.
   A writer and a reviewer are different agents and do not take each other's place: the order says which you spawn
   or send first in a pass. Kind stands for size, since nothing in the record gives a size before the work.
   (Until `os-2-order-and-pool`, 2026-10-11: "Finishing comes before starting. Among issues on the same row, one the
   owner opened or moved goes first, then the oldest", and the row for a review stood above the rows for a round sent back, the row for a project at `open` above the row for `ready`.
   `plan/cloud-brain-loop-order-of-service.md`, part 2.)
   **The owner's**, in this table and wherever the procedure says it of an issue: opened by his
   session (`by.via` of its `opened` event is `session`), or labeled `owner`. A session that opens
   an issue on his word puts `owner` in `labels` at the open, and you add it when he asks for an
   issue in this session (`issue-as.sh <your token> label '{"key":"orch/<id>/owner","id":"<id>","add":["owner"]}'`).
   The label gives precedence and no authority: no guard of the workflow reads it, and whoever may
   call `issue.open` may write it. `issue-as.sh <your token> "list?label=owner&limit=100"` lists the labeled ones.
   (Until 2026-10-11 the record had no such mark: `worker-machine-on-fly`, opened with a loop token
   "on the owner's word", was at `open` 68 minutes while two issues filed later were taken.
   `plan/cloud-brain-loop-order-of-service.md`, part 1.)

   | Issue is | Do |
   |---|---|
   | `hidden: true`, or kind or label `security` | Nothing. It is the owner's. |
   | at `awaiting-approval` | Nothing, unless the owner has said in this session that he approves that issue, after its passing review was shown to him: then you make the `approve` move for him (`rules.md`, Never, the `approve` line). |
   | labeled `needs-owner` | Read it again each pass: the events since the label was put on, and what the owner has said in this session. When he has answered (a comment of his on the issue, or his word to you, which you quote in a comment first), or `philosophy.md` now answers it (say what changed), comment with the event that put the label on and what ended its reason, take the label off (`rules.md`, Never, the `needs-owner` line), and take the issue again from this table. Otherwise nothing: it is the owner's, and it is named in step 7. |
   | `in-progress`, started by a writer or a digest writer (the `by.holder` of its last `start` event is `secret:impl-…` or `secret:dig-…`, or a role's token, for a start made before each agent had its own), sent back, no agent running | Send the round to the agent that started it ("A rework round goes to the agent that wrote the change", below): its token is still kept, and only the starter submits (`caller.actor == issue.by.start`). When it cannot be sent one, the next row. Do not, and instead comment with the open findings and label `needs-owner`, when the last implementer you spawned for it finished without a new `submit`, or when it has 3 `rework` moves and the rounds are not getting anywhere. At 3 you judge (Tom, 2026-10-10: "make a judgment call when the 3 retries is hit, has genuine progress been made?"): go on when each review closed what the one before found and the new findings are narrower; stop when a finding came back, or the rounds are trading one defect for another of the same size. Write the judgment and its reason in the journal and as a comment on the issue. |
   | `in-progress`, no agent running, and its starter cannot go on: the writer died or cannot be sent a message, its token has ended (`agent-token list` has no line for it), or the `start` was made with a role's token and its writer cannot be sent one (after the owner's revoke of those: every such issue) | **A dead writer.** You end its token (`agent-token revoke <name>`; a role's token is the owner's to end), then you make `back` to `ready` with the reason. The issue is then `ready`: the writer you spawn makes the second `start` with its own token, which replaces `issue.by.start`, and it alone submits. Two more moves. A submit by any token but the last starter's is refused 403. |
   | `in-progress`, started by you (`secret:orch-…`: a quick win, or work on the owner's word), sent back | **A quick win of your own, sent back.** Do the round yourself and submit: no more moves. Or hand it over: you make `back`, the writer you spawn makes `start` and then submits. Two more moves. Your own token is not ended, so after the `back` the policy no longer refuses you a review of that issue: "You review nothing yourself" is what holds. (Submits 622, 935 and 1002 were a writer's on an issue you had started; each answered 200 because both were one token.) |
   | kind `project` or `feature`, at `spec`, no agent running | **A spec sent back.** Send the round to the spec writer by message, as a writer of a task is sent one (the `agent` and `session` of its last `cost` line; `agents/spec.md`, "A resumed round"). When it cannot be sent one, or it died: you end its token and make `back` from `spec` to `open`; the spec writer you spawn makes `spec` with its own token (key `spec/<id>/spec-<round>`), which replaces `issue.by.spec`, and then `submit-spec`. Two more moves. |
   | `in-review`, and no review since it came into that state | Spawn the reviewer. |
   | kind `project` or `feature`, at `spec-review`, no review since it came there | Spawn the reviewer; it follows "A spec" in its brief. |
   | `in-progress`, the change is landed, and its writer finished with no `submit` | **A submit made for a writer.** Ask the writer to submit, by message, when it can be sent one. Else you end its token, make `back`, make `start` with your own token, and submit with the refs: the starter is then you, and the review is a reviewer's. Two more moves. (Submit 516 was yours for a writer's start.) |
   | labeled `digest`, opened by `worker:brain-x-snapshot` (`opener` in `get?id=`), at `open` | When several are open, the newest is the one written: `reject` each older one with the reason `covered by digest-<newest day>`, and comment on the newest with the days it covers. Then `triage` and `ready` it, the reason "the day's digest, opened by the snapshot's run"; the three questions of Triage are not asked. |
   | labeled `digest`, at `ready` | Spawn the digest writer (role `digest`). |
   | kind `project` or `feature`, at `approved` | Open each task the spec lists, with `parent` the project, and move it to `building` (`decompose`). A task has the labels the spec gives it: `major` on each task of a spec that says its tasks are (bd-2 and bd-3 were opened with none from a spec approved as `major`, and a reviewer's `pass` of bd-2 would have gone to `done` with no approval; `seen-bd-2-opened-without-major`). Close each gathered report that is still open with the reason `in the spec of <id>`. |
   | kind `project` or `feature`, at `building`, no open part | Move it to `done` (`finish`). |
   | `ready` | Spawn the implementer. |
   | kind `project` or `feature`, at `open`, with three parts or more, or the owner's | Spawn the spec writer (role `spec`). With fewer it is still gathering: nothing. |
   | `triaged`, no open children | Move to `ready`. |
   | `open`, kind `task` or `bug` | Triage it yourself (below), or take it as a quick win. |
   | `open`, kind `feedback` | Nothing, but for one case: it is the owner's ("The owner's", above), asks for a change, and has no parent and no link either way. Then `promote` it, `issue-as.sh <your token> swap '{"key":"orch/<id>/promote","id":"<id>","swap":"promote","reason":"…"}'`, and triage it in the same pass. A promoted issue keeps the kind `feedback` and is on the task workflow from then on (`workflow` in `get?id=` is the task's): it is taken by the rows for a task, this row no longer. One of his that has a parent or a link is not promoted, since the work it is tied to is already under way and a second task would do it twice (`philosophy.md`, line 2: the smaller side); it is closed with that work. Who closes: the overseer, each oversight, closes a feedback issue when every issue it is tied to is at `done` or `closed` (`agents/overseer.md`, "Feedback that is due"). `bun tools/cloud-brain/issue-stats.ts --token=<your token>` prints both lists, `feedback due to be closed` and `feedback of the owner's with no tie, to promote`; the second is this row's. Feedback is filed by agents for anything that seems off against `philosophy.md` (Tom, 2026-10-11: "only feedback so we can identify patterns and check before writing a solution"), and the overseer reads it together. It is not counted as work waiting. (Until `feedback-closed-or-promoted`, 2026-10-11, nothing closed one: 51 were at `open` at event 2745, 25 of them tied only to work that was `done` or `closed`. The owner: "Why are the feedback ones not being done?") |
   | Anything else: `in-review` with a review and no move after it, a state or a starter no row above names | Comment with what you see, label `needs-owner`, and say so in step 7. |

4. **Spawn.** First make the agent's token, from the main checkout ("A token for each agent"):
   `BRAIN_BASE=cb4 bun tools/cloud-brain/brain.ts agent-token <impl|spec|dig|over|rev> <id>`. Its stdout is the name.
   On exit 1 what it printed is not a name: no agent is spawned, and it is said in step 7.
   Then the `Agent` tool: `subagent_type: general-purpose`, `model: opus`, never
   `fork`, and this prompt with nothing added. An agent that knows what you expect confirms it.
   ```
   Working directory: <absolute repo root>.
   Read <root>/.claude/skills/brain-maintenance/agents/<role>.md and follow it.
   Issue: <id>
   Your token is <name>.
   ```
   For the overseer the third line is `Last oversight ended at event <seq>. Journal: <root>/tools/cloud-brain/.emitted/issue-loop/`,
   and the token's line follows it.

   **The reviewer is not an Agent call** (the owner, 2026-10-11: "the skill spawns a super light claude with a
   generic opening. role: reviewer task: ....", and of what was built for it: "ok please get that into production").
   It is a process of its own, started with Bash, `run_in_background: true`, `timeout: 3600000`:
   ```
   <root>/cloud-brain-dev/agent.sh reviewer "review issue <id>; your token is <name>"
   ```
   with `<name>` the `rev-` token you made for it, and nothing else added to the task. Its brief reads the name from that line
   (`tests/tools/reviewer-brief-names-token.test.ts`). It has Bash, Read, Grep and Glob, no advisor (the owner, 2026-10-11:
   "ok lets disable the advisor for review"; `agent.sh` sees to it), and its brief is on
   the Brain (`cloud-brain-dev/README.md`, "A light agent for one role").
   Put `TAB=1 ` before the command, which adds the notebook tab tools, in three cases only (the owner,
   2026-10-11: "Yes remove TAB for non notebooks"): `<root>/tools/cloud-brain/review-needs-tab.sh <repo@sha>…`,
   run on every `commit` ref of the last `submit`, exits 0 (a seed, a notebook or a module; it prints the file)
   or 2 (a commit it could not read); the issue has a `url` ref; or the reviewer's report begins
   `needed a tab`, which is a review it did not write: start it once more with `TAB=1` and post both runs' costs.
   The tab tools are 8,342 tokens in every request (18,106 at the first request of review 3 of
   `light-reviewer-in-use` against 9,764 with none), and none of that issue's three reviews called one. Its stdout is one JSON line,
   `{ session, result, usd, usage, context, turns, ms, legs }`: `result` is its report, of its last leg when it
   waited on a background command (`legs` over 1; until 2026-10-11 the line was of the first leg, and a reviewer
   that waited for the landing lock read as having stopped at "Still held"). In the `cost` comment
   `tokens` is `context`, `seconds` is `ms` over 1000, and the line has three more fields, `"usd"`, `"session"`
   (the `session` of that JSON, not yours) and `"light":true`; `tools` is left out. It is never sent
   `--resume`. When the command prints no JSON line, or exits 1 (the result was an error) or 2, spawn the reviewer once as an Agent, as above, with the same token in its prompt:
   the file `agents/reviewer.md` says where the brief is. Say so in the journal and in step 7.
   A JSON line and exit 2 together are not that case: the line is printed only when the run gave a result, so the
   exit is from the script after it (three reviews on 2026-10-11, when `agent.sh` was written over during the run;
   `tools/cloud-brain/records/agent-sh-read-whole-before-run.md`). Read the issue: when the review is recorded
   there it stands, its cost is posted from the line, and no second reviewer is spawned.
   Measured before the switch: 25,212 after it had read its brief, the rules and `philosophy.md`, where an
   Agent told to answer "OK" is 40,842; one review replayed at 69,440 against 100,725 (the README has both,
   and what was not tried). First real review by it: not yet.
5. **When an agent reports**, append the report to the journal, then read the issue again.
   A reviewer may have made a commit of its own since 2026-10-11: a note mended in a document of the change
   (its brief, "What holds a change, and what is a note"; the owner: "Lets do  1,2,3"). It is named in the
   review's body and needs no review and no move from you. The
   tracker says what happened, not the report: an implementer that says "submitted" with the
   issue still `in-progress` did not submit.
   Then put what the run cost on the issue, so that cost per issue is read from the tracker and
   not parsed from the journal (the owner, 2026-10-11): one comment, with your own token
   (`orch-…`), whose body is the word `cost` and one line of JSON,
   `cost {"role":"implementer","round":1,"tokens":177525,"seconds":723,"tools":37,"outcome":"in-review","event":205,"agent":"af49053b540d9c3f5","session":"f501a8e8-b922-4e11-a581-2b725efd6272","token":"impl-3fa2c1"}`,
   under the key `cost-<id>-<role>-<round>`, which a second post of the same run does not repeat.
   `role` is `implementer`, `reviewer`, `spec-writer`, `digest`, `overseer` or `triage`; `round`
   counts the runs of that role on that issue from 1; `tokens`, `seconds` and `tools` are the
   Agent result's numbers as integers, a missing one left out and none estimated; `outcome` is
   `in-review`, `pass`, `changes`, `stopped` or `no-submit`; `event` is the submit or the review
   the run made, when it made one. `token` is the name of the token the agent wrote with, the one you made for it and put in its
   prompt; a run that had none (a prompt from before this field, a triage of your own) leaves it out. It is what joins a
   `by.holder` of the record to a transcript. An implementer's line also has `agent`, the `agentId` of the
   Agent result as it is written there, and `session`, the output of `echo $CLAUDE_CODE_SESSION_ID`
   in your Bash: the two say where the agent can be sent its next round (below, "A rework round
   goes to the agent that wrote the change"). A round that was sent to an agent and not spawned
   has `"resumed":true` and the same `agent`:
   `cost {"role":"implementer","round":2,"resumed":true,"tokens":201310,"seconds":410,"tools":19,"outcome":"in-review","event":231,"agent":"af49053b540d9c3f5","session":"f501a8e8-b922-4e11-a581-2b725efd6272","token":"impl-3fa2c1"}`.
   Its numbers are the ones the resumed run reported, as they are; what `tokens` counts there is
   said in that section.
   Every line also has `usage`, what the run was billed (the owner, 2026-10-11: "yes lets post  billed tokens
   (input, cache reads, output) per run for subagents too"): the one line that
   `bun tools/cloud-brain/agent-usage.ts --session <session> --agent <agentId>` prints, as it is,
   `"usage":{"input":61,"cacheWrite":141873,"cacheRead":3561349,"output":17885,"requests":29,"advisor":{"calls":2,"input":254047,"output":13751}}`.
   So every Agent run's line has `agent` and `session`, not the implementer's alone. For a round that was sent
   to an agent add `--last-run`, which counts that round and not the ones before it (run it when the round
   reports: once a later round is sent, `--last-run` is that one, and an earlier one is `--run N`, the agent's Nth). For the light reviewer it is
   `--session <the session of its JSON line>` with no `--agent`. When the command exits 1 (no transcript) leave
   `usage` out. A comment from before 2026-10-11 has its `usage` in a second comment, `cost-usage {"of":<its seq>,…}`
   (`tools/cloud-brain/records/cost-comment-has-billed-usage.md`, "The backfill"). `tokens` stays: it is the size of the last request, which says how full the agent was, not what
   it was billed. A run that was stopped or died gets its comment too. No time
   of day goes in the body. With the comment written, end the run's token unless it is one of those kept for a rework round
   ("A token for each agent", Ended); and when the issue has just left `in-review` for good, end its writer's. An overseer's run is on no issue: its line goes in `_oversight.md` in
   the same form, and yours for the pass, with the role `orchestrator`, in `_orchestrator.md`
   when the session shows a count. The journal is written as before. The runs before this
   (100 on 37 issues, read from the journal's headings) carry `"backfilled":true`.
6. **Oversight.** Spawn the overseer (its token: `agent-token over oversight-after-<seq>`), beside the others, when either 3 issues have
   reached `done`, `rejected` or `needs-owner` since the last entry of `oversight.md`, or one
   issue hit the rework cap. One overseer at a time; it commits under the landing lock.
7. **Tell the user** in a few lines: what moved this pass, what is waiting for the owner and
   why, what is running. Nothing moved is one line.
8. **Watch, then schedule** (only under `/loop`). The tracker wakes you, not the clock (the
   owner, 2026-10-11: "The self pacing mechanism is quite slow, I think you need a background
   tasks notifying you of new issues as they come in"). Keep one `Monitor` armed, `timeout_ms`
   1800000, with the command
   `tools/cloud-brain/issue-watch.sh <your token> <the last seq you have read>`.
   It reads `sync?after=` every 30 s and prints a line for each issue another caller opened (any holder but the one token it is given:
   with a token an agent, an issue a writer or an overseer of yours opens is such a line too, where it printed nothing when all wrote with one),
   for each issue opened with the label `owner`, whatever token opened it (step 3, "The owner's"; a label a token puts on after the open is no line), and
   for each event made with the owner's session (a comment, a label, a move, an approval in the
   panel). A line is a wake: read that issue and take it from the table of step 3, without a
   whole pass. An agent's own writes print nothing; its report wakes you as before. The monitor
   ends after 30 minutes and says so: arm it again from the last seq, in the same turn. Then
   `ScheduleWakeup` 1800 s as the fallback, for a monitor that died or a session that slept; that
   wake is a whole pass, health first. A poll of the tracker is charged nothing; a wake of this
   session is not free, so the watch prints only what you would act on.

## A rework round goes to the agent that wrote the change

Tom, 2026-10-11: "resuming implementors is a good idea, not always possible if they are done by
different agents, but maybe we append session-id". Until then a rework round was a new agent,
which read the brief, the issue and the code again: 10 of 36 issues had more than one implementer
round, 46% of 12.06 M tokens (the journal of 2026-10-10 and 10-11, counted in the body of
`rework-resumes-the-implementer`). Written 2026-10-11. The first implementer round run this way
was round 3 of `annotations-file-feedback` the same day (cost comment 1003); its counts are in
`tools/cloud-brain/records/rework-resumes-the-implementer.md`, "The first resumed round".

For an issue at `in-progress` whose last move is `rework`, with no agent running:

1. Read its last comment whose body starts `cost {"role":"implementer"`.
2. When that line has an `agent`, its `session` is the output of `echo $CLAUDE_CODE_SESSION_ID`
   in your Bash, and the agent's token is live, send the round to that agent (live: the line's `token` is a
   `name` of `agent-token list`; a line with no `token` is of a writer that wrote with a role's
   token, which is live until the owner's revoke): `SendMessage` (load it with `ToolSearch`,
   `select:SendMessage`) with `to` the `agent` value and this message, with nothing added:
   ```
   Issue: <id>, sent back by the review at event <seq of the `reviewed` event>.
   A resumed round: read "A resumed round" in <root>/.claude/skills/brain-maintenance/agents/implementer.md and follow it.
   ```
   The answer to a send that was taken is `{"success":true,"message":"Resuming agent …"}`. The
   agent runs in the background and reports as a spawned one does; step 5 is the same, with
   `"resumed":true`. While it runs it is the agent on that issue, and a writer at work for step 2.
3. Anything else, spawn as step 4, after the two moves of "A dead writer" in step 3's table (you end
   the starter's token and make `back`; the writer you spawn makes `start`): no such comment, a line
   with no `agent` (every run before 2026-10-11), another session's agent, a token that has ended,
   or a send that is refused (an agent the user stopped refuses a message; a transcript is deleted
   after 30 days). A refused send is not tried twice. Until 2026-10-11 the new writer submitted with
   no move between, being the same actor as the one that started.

An agent's transcript is kept under the session that spawned it
(`$CLAUDE_CONFIG_DIR/projects/<project>/<session>/subagents/agent-<agentId>.jsonl`), which is why
the session is compared: the id alone, read in another session, names nothing there. The id is on
the issue and not in your memory because your context is compacted and the transcripts are not.
A new session has another id, and spawns. Whether a session resumed after a restart of Claude Code
keeps its id has not been seen: the one session that has sent rounds (`f501a8e8`, 2026-10-11) was
not restarted between its first `cost` line and its last, and its transcript has one `sessionId`.
After a restart, compare the variable with the `session` of a `cost` line written before it and
write here what it was.
That the variable gives that directory's name was read in a subagent's Bash on 2026-10-11, not in
an orchestrator's. Before the first send of a session, `ls` that `subagents/` directory with the
variable in the path and see the `agent-<agentId>.jsonl` of an agent you spawned; when it is not
there, every round of the session is a spawn, and say so in step 7.

The reviewer is never resumed: a review is by an agent that has not read the work before, and a
resumed reviewer has. The overseer is spawned as before. A spec writer and a digest writer are
sent their round as a writer is, from their own `cost` line (`"role":"spec-writer"`, `"role":"digest"`),
and when they cannot be it is `back` and a spawn (step 3's rows). Three spec writers had been sent a
round by 2026-10-11 (`cost` comments 926, 997 and 1015, as the spec counts them); no digest writer.

What `tokens` is for a resumed round: on the one resume tried (2026-10-11, an agent that had
answered "OK" with no tool call) the count was 40,982 after the first turn and 41,056 after the
second, so the number held the first turn's context. A resumed round's `tokens` is therefore not
set beside a new agent's as it stands. `"resumed":true` marks it, and the `tokens` of the same
agent's comment before it is what to take off. That difference is not what the round was charged.
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
`"resumed":true` lines with the round-2 lines without it once there are some.

## A quick win

> In force on cb4 since the owner installed the policy of 2026-10-11 (event 483).

Tom, 2026-10-11: "if an agent has spare context left and it already knows how to fix an issue it
should jsut do it as a quick win while it is there." That is said of every agent, you among them.
Triage has you read the issue and the code; sometimes you then hold the whole fix, and spawning a
writer to find it again was 167,000 tokens at the least on 2026-10-10. Take it yourself when the
fix is in a brief, a doc, a record or a local tool, is one change, and needs no seed built and no
deploy: `start` from `open` with your own token and the reason triage would have given, make the change in a worktree,
write its record (`tools/cloud-brain/records/<id>.md`, as `agents/implementer.md` step 9 says; a
change to a doc alone has one too: reviews 642, 645 and 686 each sent a quick win of yours back
with "no record" among the findings),
land it under the landing lock (`LOCK_TOKEN=<your token> lock.sh take land <who>`, `agents/implementer.md` step 10), `submit` with the commit. Any submit of your own, a quick win or work
a session did on the owner's word, is sent after the push and after the lock is released: one
`commit` ref for each commit the landing added, read then with `git log`, and a `deploy` ref
(`<worker>@<hash>`) for each thing put on cb4; and it has its record first, as above. (Submit 1042
named another issue's HEAD, sent while the lock was held; reviews 1032 and 1052 of
`dv-4-owner-install-and-shell` each sent back a submit with no deploy ref, the first with no
record.) The review is a reviewer's as for any issue.
Anything in a seed goes to a writer. A writer does the same for what it meets beside its issue
(`agents/implementer.md`, "A quick win"); a reviewer does not (it would be the writer).

## Links, and projects

> In force on cb4 since the owner installed the policy of 2026-10-11 (event 483).

Since 2026-10-11 (`plan/cloud-brain-issues.md`, "Amended 2026-10-11"): `issue.link { key, id, to, rel }`
with `rel` one of `duplicate`, `cause`, `related`, `part-of`. Use it at triage instead of an id in
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
     or a line of `rules.md`. The comment is in the form `philosophy.md` gives.
   - Also `needs-owner`, until the owner changes `rules.md`: the change needs something only he
     may do (a policy install, a new secret, a deploy of the kernel, core, database or deployer,
     a deletion of kept data). Decide from the seven whether it should be done, and comment
     with the plan and the one command or word he would give. Do not ask him which side.
     `philosophy.md` has a proposal to build such a change first, under a label of its own;
     it is not in force. A token that an approved spec names is not such a secret: you make it
     ("A token an approved spec names", below).
3. Is it one change? More than one becomes subtasks (`open` with `parent`), and the parent goes
   to `ready` when they are closed. More than a handful, or a change of design: it is a `project`.

Anything else: `triage`, then `ready`. Add the labels `major` and `needs-owner` when the change
alters who may do what, deletes or rewrites kept data, or changes a method other callers use,
and comment with the plan. The owner takes `needs-owner` off to let it be built, or answers and you take it off (`rules.md`, Never, the `needs-owner` line). The approval
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
every other act with his session but the `approve` move (`rules.md`, Never).

## What the loop does not do

- Anything owner-present: install a policy, approve, revert, rebuild. See `rules.md`, which has one exception since 2026-10-11: the `approve` move on the owner's word of that issue in the session.
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
