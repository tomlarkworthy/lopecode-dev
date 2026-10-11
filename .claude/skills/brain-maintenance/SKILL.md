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
   not needed; no `cb4.lock` or `land.lock` older than 20 minutes. If the cluster is not healthy, file or find
   the issue for it and do nothing else this pass. A stale lock is the owner's to remove: say so
   in step 7 each pass until it is gone.
2. **Count your running agents.** Keep up to 4 implementers and 2 reviewers running (4 since 19:28 2026-10-10, Tom: "maybe we do another 2 in parrallel"; they land one at a time, so past 4 they queue on `land.lock`), and at
   most one agent on any issue. Each pass, fill the free places from step 3; with none free, do
   the triage rows only. (Tom, 2026-10-10: "try to have 1-2 writers and 1-2 reviewers active at
   all times".) What makes that safe: a writer edits and builds in a worktree of its own and
   lands under `land.lock`; a reviewer tests the notebook of the commit, not the working file.
3. **List the open issues and take the first that matches**, in this order. Finishing comes
   before starting. Among issues on the same row, one the owner opened or moved goes first, then the oldest.

   | Issue is | Do |
   |---|---|
   | `hidden: true`, or kind or label `security` | Nothing. It is the owner's. |
   | at `awaiting-approval` | Nothing, unless the owner has said in this session that he approves that issue, after its passing review was shown to him: then you make the `approve` move for him (`rules.md`, Never, the `approve` line). |
   | labeled `needs-owner` | Read it again each pass: the events since the label was put on, and what the owner has said in this session. When he has answered (a comment of his on the issue, or his word to you, which you quote in a comment first), or `philosophy.md` now answers it (say what changed), comment with the event that put the label on and what ended its reason, take the label off (`rules.md`, Never, the `needs-owner` line), and take the issue again from this table. Otherwise nothing: it is the owner's, and it is named in step 7. |
   | `in-review`, and no review since it came into that state | Spawn the reviewer. |
   | `in-progress`, started by the implementer token, no agent running | Spawn the implementer: it was sent back, or an agent died. Do not, and instead comment with the open findings and label `needs-owner`, when the last implementer you spawned for it finished without a new `submit`, or when it has 3 `rework` moves and the rounds are not getting anywhere. At 3 you judge (Tom, 2026-10-10: "make a judgment call when the 3 retries is hit, has genuine progress been made?"): go on when each review closed what the one before found and the new findings are narrower; stop when a finding came back, or the rounds are trading one defect for another of the same size. Write the judgment and its reason in the journal and as a comment on the issue. |
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
5. **When an agent reports**, append the report to the journal, then read the issue again. The
   tracker says what happened, not the report: an implementer that says "submitted" with the
   issue still `in-progress` did not submit.
6. **Oversight.** Spawn the overseer, beside the others, when either 3 issues have
   reached `done`, `rejected` or `needs-owner` since the last entry of `oversight.md`, or one
   issue hit the rework cap. One overseer at a time; it commits under `land.lock`.
7. **Tell the user** in a few lines: what moved this pass, what is waiting for the owner and
   why, what is running. Nothing moved is one line.
8. **Schedule** (only under `/loop`): `ScheduleWakeup` 1800 s when an agent is running (its
   report wakes you first, and that wake is a pass), 1200 s when the tracker had nothing for you. A poll of the tracker
   is charged nothing; a wake of this session is not free, so do not poll faster.

## A quick win

> In force on cb4 since the owner installed the policy of 2026-10-11 (event 483).

Tom, 2026-10-11: "if an agent has spare context left and it already knows how to fix an issue it
should jsut do it as a quick win while it is there." That is said of every agent, you among them.
Triage has you read the issue and the code; sometimes you then hold the whole fix, and spawning a
writer to find it again was 167,000 tokens at the least on 2026-10-10. Take it yourself when the
fix is in a brief, a doc, a record or a local tool, is one change, and needs no seed built and no
deploy: `start` from `open` with the reason triage would have given, make the change in a worktree,
land it under `land.lock`, `submit` with the commit. The review is a reviewer's as for any issue.
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
to be better at doing their job". So it edits `agents/implementer.md`, `agents/reviewer.md` and
the procedure above directly, one commit an edit, each quoting the issue that showed the need.
`git log -- .claude/skills/brain-maintenance` is the list; `git revert` undoes one.

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
