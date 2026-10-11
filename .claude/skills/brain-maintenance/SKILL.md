---
name: brain-maintenance
description: Use when the user asks to "work the tracker", "run the issue loop", "/brain-maintenance", "/loop /brain-maintenance", or wants the issues of the Cloud Brain tracker on cb4 triaged, fixed, reviewed and closed without being asked for each one. Polls the tracker, keeps up to four implementers (each in its own git worktree) and two reviewers running, and after every few issues spawns an overseer that files cluster issues or edits the role briefs.
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
| What is there to do | `issue-as.sh issues-implementer-2 "list"`, the issues not `done`, `rejected`, `closed` or `reverted` |
| Who has an issue | `issue.by.start` in `get?id=` |
| What a reviewer found | the `reviewed` events of the issue |
| How many times it bounced | the `moved` events with `move: "rework"` |
| Where oversight got to | the last heading of `oversight.md` |

Two files beside it, neither of them needed to resume:

- `tools/cloud-brain/.emitted/issue-loop/<id>.md` (git-ignored): the journal. After each agent
  finishes, append its role, the time from `date`, its token count and duration, and its final
  report whole. The overseer reads it. An overseer's own report goes in `_oversight.md` there.
- `oversight.md` in this directory: one entry per oversight, written by the overseer.

## One pass

1. **Health.** `brain.ts redistil` shows every Worker `same`; `brain.ts state` shows each `brain-x-*` Worker at the hash `tools/cloud-brain/seen.json` holds for it (`redistil` cannot show a put-back: the kept source goes back with the Worker, so it read `same` through the one of 19:32 on 2026-10-10); `lease.get` is held or the page is
   not needed; `tools/cloud-brain/lock.sh show land` and `show cb4` each answer exit 0 (the holder, since when and until when) or exit 1 (not held), and exit 2 is cb4 not saying: not healthy. If the cluster is not healthy, file or find
   the issue for it and do nothing else this pass. Since `lk-3-lock-sh-over-the-cluster` both locks are held in the cluster, for 600 s from the take or the last renew.
   A lock past its time is not held: `show` exits 1 and says whose lock ended and when, and the next take takes it. That holder died or overran:
   look at its issue (step 3). Nothing is the owner's to remove. A commit of your own in the main checkout is made between
   `tools/cloud-brain/lock.sh take land orchestrator-$(hostname -s)` and `lock.sh release land orchestrator-$(hostname -s)`.
   The name carries the machine, so an orchestrator on another machine is another holder. Two sessions under one role name on one machine are not
   told apart: the first's take refuses the second's, but a `renew` by either is answered as the holder's, and so is the renew `take --wait` sends
   after an attempt of its own that got no answer. One orchestrator and one overseer a machine.
2. **Count your running agents.** Keep up to 4 implementers and 2 reviewers running (4 since 19:28 2026-10-10, Tom: "maybe we do another 2 in parrallel"; they land one at a time, so past 4 they queue on the landing lock), and at
   most one agent on any issue. Each pass, fill the free places from step 3; with none free, do
   the triage rows only. (Tom, 2026-10-10: "try to have 1-2 writers and 1-2 reviewers active at
   all times".) What makes that safe: a writer edits and builds in a worktree of its own and
   lands under the landing lock; a reviewer tests the notebook of the commit, not the working file.
3. **List the open issues and take the first that matches**, in this order. Finishing comes
   before starting. Among issues on the same row, one the owner opened or moved goes first, then the oldest.

   | Issue is | Do |
   |---|---|
   | `hidden: true`, or kind or label `security` | Nothing. It is the owner's. |
   | at `awaiting-approval` | Nothing, unless the owner has said in this session that he approves that issue, after its passing review was shown to him: then you make the `approve` move for him (`rules.md`, Never, the `approve` line). |
   | labeled `needs-owner` | Read it again each pass: the events since the label was put on, and what the owner has said in this session. When he has answered (a comment of his on the issue, or his word to you, which you quote in a comment first), or `philosophy.md` now answers it (say what changed), comment with the event that put the label on and what ended its reason, take the label off (`rules.md`, Never, the `needs-owner` line), and take the issue again from this table. Otherwise nothing: it is the owner's, and it is named in step 7. |
   | `in-review`, and no review since it came into that state | Spawn the reviewer. |
   | `in-progress`, started by the implementer token, no agent running | Resume or spawn the implementer: it was sent back ("A rework round goes to the agent that wrote the change", below), or an agent died (spawn). Do not, and instead comment with the open findings and label `needs-owner`, when the last implementer you spawned for it finished without a new `submit`, or when it has 3 `rework` moves and the rounds are not getting anywhere. At 3 you judge (Tom, 2026-10-10: "make a judgment call when the 3 retries is hit, has genuine progress been made?"): go on when each review closed what the one before found and the new findings are narrower; stop when a finding came back, or the rounds are trading one defect for another of the same size. Write the judgment and its reason in the journal and as a comment on the issue. |
   | labeled `digest`, opened by `worker:brain-x-snapshot` (`opener` in `get?id=`), at `open` | When several are open, the newest is the one written: `reject` each older one with the reason `covered by digest-<newest day>`, and comment on the newest with the days it covers. Then `triage` and `ready` it, the reason "the day's digest, opened by the snapshot's run"; the three questions of Triage are not asked. |
   | labeled `digest`, at `ready` | Spawn the digest writer (role `digest`). |
   | kind `project` or `feature`, at `spec-review`, no review since it came there | Spawn the reviewer; it follows "A spec" in its brief. |
   | kind `project` or `feature`, at `spec`, no agent running | Spawn the spec writer (role `spec`): it was sent back, or an agent died. |
   | kind `project` or `feature`, at `approved` | Open each task the spec lists, with `parent` the project, and move it to `building` (`decompose`). Close each gathered report that is still open with the reason `in the spec of <id>`. |
   | kind `project` or `feature`, at `building`, no open part | Move it to `done` (`finish`). |
   | kind `project` or `feature`, at `open`, with three parts or more, or opened by the owner | Spawn the spec writer (role `spec`). With fewer it is still gathering: nothing. |
   | `ready` | Spawn the implementer. |
   | `triaged`, no open children | Move to `ready`. |
   | `open`, kind `task` or `bug` | Triage it yourself (below), or take it as a quick win. |
   | `open`, kind `feedback` | Nothing, unless it is the owner's and asks for a change: then `promote` it. Feedback is filed by agents for anything that seems off against `philosophy.md` (Tom, 2026-10-11: "only feedback so we can identify patterns and check before writing a solution"), and the overseer reads it together. It is not counted as work waiting. |
   | Anything else: `in-review` with a review and no move after it, `in-progress` started by another actor | Comment with what you see, label `needs-owner`, and say so in step 7. |

4. **Spawn** with the `Agent` tool: `subagent_type: general-purpose`, `model: opus`, never
   `fork`, and this prompt with nothing added. An agent that knows what you expect confirms it.
   ```
   Working directory: <absolute repo root>.
   Read <root>/.claude/skills/brain-maintenance/agents/<role>.md and follow it.
   Issue: <id>
   ```
   For the overseer the last line is `Last oversight ended at event <seq>. Journal: <root>/tools/cloud-brain/.emitted/issue-loop/`.

   **The reviewer is not an Agent call** (the owner, 2026-10-11: "the skill spawns a super light claude with a
   generic opening. role: reviewer task: ....", and of what was built for it: "ok please get that into production").
   It is a process of its own, started with Bash, `run_in_background: true`, `timeout: 3600000`:
   ```
   <root>/cloud-brain-dev/agent.sh reviewer "review issue <id>"
   ```
   with nothing added to the task. It has Bash, Read, Grep and Glob, no advisor (the owner, 2026-10-11:
   "ok lets disable the advisor for review"; `agent.sh` sees to it), and its brief is on
   the Brain (`cloud-brain-dev/README.md`, "A light agent for one role").
   Put `TAB=1 ` before the command, which adds the notebook tab tools, in three cases only (the owner,
   2026-10-11: "Yes remove TAB for non notebooks"): `<root>/tools/cloud-brain/review-needs-tab.sh <repo@sha>…`,
   run on every `commit` ref of the last `submit`, exits 0 (a seed, a notebook or a module; it prints the file)
   or 2 (a commit it could not read); the issue has a `url` ref; or the reviewer's report begins
   `needed a tab`, which is a review it did not write: start it once more with `TAB=1` and post both runs' costs.
   The tab tools are 8,342 tokens in every request (18,106 at the first request of review 3 of
   `light-reviewer-in-use` against 9,764 with none), and none of that issue's three reviews called one. Its stdout is one JSON line,
   `{ session, result, usd, usage, context, turns, ms }`: `result` is its report. In the `cost` comment
   `tokens` is `context`, `seconds` is `ms` over 1000, and the line has three more fields, `"usd"`, `"session"`
   (the `session` of that JSON, not yours) and `"light":true`; `tools` is left out. It is never sent
   `--resume`. When the command prints no JSON line, or exits 1 (the result was an error) or 2, spawn the reviewer once as an Agent, as above:
   the file `agents/reviewer.md` says where the brief is. Say so in the journal and in step 7.
   Measured before the switch: 25,212 after it had read its brief, the rules and `philosophy.md`, where an
   Agent told to answer "OK" is 40,842; one review replayed at 69,440 against 100,725 (the README has both,
   and what was not tried). First real review by it: not yet.
5. **When an agent reports**, append the report to the journal, then read the issue again. The
   tracker says what happened, not the report: an implementer that says "submitted" with the
   issue still `in-progress` did not submit.
   Then put what the run cost on the issue, so that cost per issue is read from the tracker and
   not parsed from the journal (the owner, 2026-10-11): one comment, with the token you triage
   with, whose body is the word `cost` and one line of JSON,
   `cost {"role":"implementer","round":1,"tokens":177525,"seconds":723,"tools":37,"outcome":"in-review","event":205,"agent":"af49053b540d9c3f5","session":"f501a8e8-b922-4e11-a581-2b725efd6272"}`,
   under the key `cost-<id>-<role>-<round>`, which a second post of the same run does not repeat.
   `role` is `implementer`, `reviewer`, `spec-writer`, `digest`, `overseer` or `triage`; `round`
   counts the runs of that role on that issue from 1; `tokens`, `seconds` and `tools` are the
   Agent result's numbers as integers, a missing one left out and none estimated; `outcome` is
   `in-review`, `pass`, `changes`, `stopped` or `no-submit`; `event` is the submit or the review
   the run made, when it made one. An implementer's line also has `agent`, the `agentId` of the
   Agent result as it is written there, and `session`, the output of `echo $CLAUDE_CODE_SESSION_ID`
   in your Bash: the two say where the agent can be sent its next round (below, "A rework round
   goes to the agent that wrote the change"). A round that was sent to an agent and not spawned
   has `"resumed":true` and the same `agent`:
   `cost {"role":"implementer","round":2,"resumed":true,"tokens":201310,"seconds":410,"tools":19,"outcome":"in-review","event":231,"agent":"af49053b540d9c3f5","session":"f501a8e8-b922-4e11-a581-2b725efd6272"}`.
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
   of day goes in the body. An overseer's run is on no issue: its line goes in `_oversight.md` in
   the same form, and yours for the pass, with the role `orchestrator`, in `_orchestrator.md`
   when the session shows a count. The journal is written as before. The runs before this
   (100 on 37 issues, read from the journal's headings) carry `"backfilled":true`.
6. **Oversight.** Spawn the overseer, beside the others, when either 3 issues have
   reached `done`, `rejected` or `needs-owner` since the last entry of `oversight.md`, or one
   issue hit the rework cap. One overseer at a time; it commits under the landing lock.
7. **Tell the user** in a few lines: what moved this pass, what is waiting for the owner and
   why, what is running. Nothing moved is one line.
8. **Watch, then schedule** (only under `/loop`). The tracker wakes you, not the clock (the
   owner, 2026-10-11: "The self pacing mechanism is quite slow, I think you need a background
   tasks notifying you of new issues as they come in"). Keep one `Monitor` armed, `timeout_ms`
   1800000, with the command
   `tools/cloud-brain/issue-watch.sh issues-implementer-2 <the last seq you have read>`.
   It reads `sync?after=` every 30 s and prints a line for each issue another caller opened and
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
2. When that line has an `agent`, and its `session` is the output of `echo $CLAUDE_CODE_SESSION_ID`
   in your Bash, send the round to that agent: `SendMessage` (load it with `ToolSearch`,
   `select:SendMessage`) with `to` the `agent` value and this message, with nothing added:
   ```
   Issue: <id>, sent back by the review at event <seq of the `reviewed` event>.
   A resumed round: read "A resumed round" in <root>/.claude/skills/brain-maintenance/agents/implementer.md and follow it.
   ```
   The answer to a send that was taken is `{"success":true,"message":"Resuming agent …"}`. The
   agent runs in the background and reports as a spawned one does; step 5 is the same, with
   `"resumed":true`. It is one of the 4 implementers of step 2 while it runs.
3. Anything else, spawn as step 4: no such comment, a line with no `agent` (every run before
   2026-10-11), another session's agent, or a send that is refused (an agent the user stopped
   refuses a message; a transcript is deleted after 30 days). A refused send is not tried twice.

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
resumed reviewer has. The spec writer, the digest writer and the overseer are spawned as before.

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
deploy: `start` from `open` with the reason triage would have given, make the change in a worktree,
write its record (`tools/cloud-brain/records/<id>.md`, as `agents/implementer.md` step 9 says; a
change to a doc alone has one too: reviews 642, 645 and 686 each sent a quick win of yours back
with "no record" among the findings),
land it under the landing lock (`lock.sh take land <who>`, `agents/implementer.md` step 10), `submit` with the commit. Any submit of your own, a quick win or work
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

Done by you with `issues-implementer-2`, every `open` issue in a pass, and also while an agent
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
     it is not in force.
3. Is it one change? More than one becomes subtasks (`open` with `parent`), and the parent goes
   to `ready` when they are closed. More than a handful, or a change of design: it is a `project`.

Anything else: `triage`, then `ready`. Add the labels `major` and `needs-owner` when the change
alters who may do what, deletes or rewrites kept data, or changes a method other callers use,
and comment with the plan. The owner takes `needs-owner` off to let it be built, or answers and you take it off (`rules.md`, Never, the `needs-owner` line). The approval
after review is then of a change that is already deployed and pushed, since a submit needs its
refs; the plan is where the owner stops it. Add `security` and take the `escalate` swap when the body describes a
way past an access rule; the issue is then the owner's.

## What the loop does not do

- Anything owner-present: install a policy, approve, revert, rebuild. See `rules.md`, which has one exception since 2026-10-11: the `approve` move on the owner's word of that issue in the session.
- More than 4 writers or 2 reviewers at once, or two agents on one issue.
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
