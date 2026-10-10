---
name: brain-maintenance
description: Use when the user asks to "work the tracker", "run the issue loop", "/brain-maintenance", "/loop /brain-maintenance", or wants the issues of the Cloud Brain tracker on cb4 triaged, fixed, reviewed and closed without being asked for each one. Polls the tracker, keeps up to two implementers (each in its own git worktree) and two reviewers running, and after every few issues spawns an overseer that files cluster issues or edits the role briefs.
version: 0.1.0
---

# The issue loop of the Cloud Brain

The tracker (`brain-x-issues` on `cb4`, design in `plan/cloud-brain-issues.md`) holds the work.
This skill is the loop that does it. You, the session that runs the skill, are the orchestrator:
you read the tracker, decide what is next, spawn agents for it, and write down what each
reported. You fix nothing and review nothing yourself.

Written 2026-10-10. **Not yet run as a loop.** The briefs are written from that day's work by
hand: the review of three bug fixes (events 70 to 76) and the deploys before it. The fixes
themselves (events 55 to 69) skipped the seed and the tests, which the briefs now forbid.

## Run it

```
/loop /brain-maintenance        every wake does one pass, then schedules the next
/brain-maintenance              one pass, then a report
/brain-maintenance oversee      spawn the overseer now
```

Read `rules.md` in this directory before the first pass. It binds you as well as the agents.

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

1. **Health.** `brain.ts redistil` shows every Worker `same`; `lease.get` is held or the page is
   not needed; no `cb4.lock` or `land.lock` older than 20 minutes. If the cluster is not healthy, file or find
   the issue for it and do nothing else this pass. A stale lock is the owner's to remove: say so
   in step 7 each pass until it is gone.
2. **Count your running agents.** Keep up to 2 implementers and 2 reviewers running, and at
   most one agent on any issue. Each pass, fill the free places from step 3; with none free, do
   the triage rows only. (Tom, 2026-10-10: "try to have 1-2 writers and 1-2 reviewers active at
   all times".) What makes that safe: a writer edits and builds in a worktree of its own and
   lands under `land.lock`; a reviewer tests the notebook of the commit, not the working file.
3. **List the open issues and take the first that matches**, in this order. Finishing comes
   before starting. Among issues on the same row, one the owner opened or moved goes first, then the oldest.

   | Issue is | Do |
   |---|---|
   | `hidden: true`, or kind or label `security`, or labeled `needs-owner`, or at `awaiting-approval` | Nothing. It is the owner's. |
   | `in-review`, and no review since it came into that state | Spawn the reviewer. |
   | `in-progress`, started by the implementer token, no agent running | Spawn the implementer: it was sent back, or an agent died. Do not, and instead comment with the open findings and label `needs-owner`, when it has 2 `rework` moves already, or when the last implementer you spawned for it finished without a new `submit`. |
   | `ready` | Spawn the implementer. |
   | `triaged`, no open children | Move to `ready`. |
   | `open`, kind `task` or `bug` | Triage it yourself (below). |
   | `open`, kind `feedback` | `promote` it to a task when it asks for a change, `close` it with a comment when it does not. |
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

## Triage

Done by you with `issues-implementer-2`, every `open` issue in a pass, and also while an agent
runs: triage builds nothing. (Until 2026-10-10 18:43 it was one a pass and never beside an agent;
five issues then sat `open` for two hours behind three reviews of one.) Read the issue and enough of the
code to answer three questions, then write the answers as the `reason` of the move.

1. Is it real? A duplicate, test data, or something that is already so is `reject`ed with the
   reason and the id of what it duplicates.
2. Can an agent do it within the rules? A design choice, a policy install, a new secret, a
   change to the kernel, core, database or deployer: comment with the choice and what each side
   costs, `triage` it, add `needs-owner`, and leave it at `triaged`.
3. Is it one change? More than one becomes subtasks (`open` with `parent`), and the parent goes
   to `ready` when they are closed.

Anything else: `triage`, then `ready`. Add the labels `major` and `needs-owner` when the change
alters who may do what, deletes or rewrites kept data, or changes a method other callers use,
and comment with the plan. The owner takes `needs-owner` off to let it be built. The approval
after review is then of a change that is already deployed and pushed, since a submit needs its
refs; the plan is where the owner stops it. Add `security` and take the `escalate` swap when the body describes a
way past an access rule; the issue is then the owner's.

## What the loop does not do

- Anything owner-present: install a policy, approve, revert, rebuild. See `rules.md`.
- More than 2 writers or 2 reviewers at once, or two agents on one issue.
- Issues whose fix is outside `tools/cloud-brain/` and its docs. Comment and label `needs-owner`.
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
