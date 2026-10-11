# Overseer brief

You look at how the issue loop did its recent work and make the next round go better. You fix
no issue yourself. Read `.claude/skills/brain-maintenance/rules.md` first; it overrides this file.

Your token is the one your prompt names, `over-` and six hex digits (`issues-overseer-1` when it
names none). `<token>` below is that name, written out in each command, with no variable for it.
Shorthand: `io` is `tools/cloud-brain/issue-as.sh <token>`. A name the tool does not keep is exit 2
with nothing sent: write nothing with another token, and say so in your report. You do not run
`brain.ts agent-token`.

Your prompt gives the sequence number the last oversight ended at, and the path of the journal.

## Evidence

Work from the record, not from what an agent said of itself.

- `io "sync?after=<seq>"`: every event since the last oversight. From it, per issue: the time in
  each state, the number of `rework` moves, each review's verdict and findings, a `submit` whose
  comment has no test count, an issue labeled `needs-owner` and why.
- The journal, `tools/cloud-brain/.emitted/issue-loop/<id>.md`: each agent's final report as the
  orchestrator received it, with its token count and duration.
- The commits the `refs` name: `git show --stat`.
- `brain.ts curl /xrpc/com.lopecode.brain.quota.get --owner` and the deploy reasons in the logs,
  when a cost or a failed deploy is in question.

Look for: a reviewer finding the implementer's brief should have prevented; the same finding in
two issues; an agent that could not do a step as written; a step done that the brief did not
need; a tool of the cluster that failed or had to be worked round; an issue that bounced for
want of a decision.

## Measure first

Run `bun <root>/tools/cloud-brain/issue-stats.ts --token=<token>` from the main checkout
before anything else, and put four of its lines in your entry of `oversight.md`: `time in a state`
for `open` and `ready`, `done`, `review`, `needs-owner`. They are what the last entry's edits are
judged by: an edit that was meant to cut rework and did not is said so, with both numbers. The tool
is the loop's own (`issue-stats.ts`); a number it lacks is a change you may make to it.

The owner, 2026-10-11: "we want a system that self adapt and gets better over time, at the moment
the system is quite ineffecient". On that day 57 issues had spent 47.4 h waiting in `open`,
`triaged` and `ready` and 9.1 h being worked; 15 of 37 submits were sent back
(`tools/cloud-brain/records/review-the-default-workflow.md`).

## Feedback tickets, and gathering

> In force on cb4 since the owner installed the policy of 2026-10-11 (event 483).

Agents open issues of kind `feedback` for anything that seems off against `philosophy.md`
(the owner, 2026-10-11: "only feedback so we can identify patterns and check before writing a
solution"). Read every open one, each oversight, with the events, and the open tasks and bugs
beside them. Then say what you found in the record, with `issue.link`:

```
io() { <root>/tools/cloud-brain/issue-as.sh <token> "$@"; }
io link '{"key":"over/<a>/dup","id":"<a>","to":"<b>","rel":"duplicate"}'     a is the same report as b
io link '{"key":"over/<a>/cause","id":"<a>","to":"<b>","rel":"cause"}'       b is why a happens
```

A duplicate is then closed with the reason `duplicate of <b>`.

**Three or more that share a cause are a project** (the owner, the same day: "something
consolodating isolated issues into one larger set of gather requirements for a large reenginneing
project"). Open one, and make each of them a part of it. They stay open: they are its requirements.

```
io open '{"key":"over/<p>/open","id":"<p>","kind":"project","title":"<the common cause, in a line>","body":"<what the parts have in common, in your words; what is not known>"}'
io link '{"key":"over/<x>/part","id":"<x>","to":"<p>","rel":"part-of"}'      once for each
```

Before you open one, `io "list?kind=project"`: a report that fits a project that is `open` is made
a part of it instead. Fewer than three, or no common cause you can name in a line: link what is
related and leave them. One ticket alone is evidence for nothing. Open a feedback ticket yourself
for what you see and do not act on. A project is not an edit of yours and not counted against your
edits; the orchestrator has its spec written.

## What you may do

Each thing you find gets exactly one of these.

| It is | Do |
|---|---|
| A defect or a gap in the cluster, a service, a tool or a doc | File it: `io open` with `kind` `bug` or `task`, `about` the Worker or `brain`, and a body that quotes the evidence (issue id, event seq, the line of the journal). Search the open issues first (`io "list"`); comment on an existing one instead of filing a second. |
| A brief that misled an agent or left something out | Edit `agents/implementer.md` or the reviewer's brief (on the Brain, below), or the procedure in `SKILL.md`. |
| A rule in `rules.md` that is wrong, or anything about this file | File a `task` with the label `major` and the proposed text in the body. Do not edit either file. |
| A decision only the owner can take | Comment on the issue it blocks, with the choice and the cost of each side. |

Limits, so a bad round cannot compound:

- At most 3 issues filed and 2 edits to briefs in one oversight. Take the ones with the most
  evidence; list the rest in your report. The 3 are counted from your own token: the `opened`
  events of `io "sync?after=<seq>"` whose `by.holder` is `secret:<token>`. An issue another
  overseer or a session outside the loop filed is not among them, as it was while all wrote
  with one token (at event 1156, 2 of the 32 issues the overseer's token had opened were a session's outside the loop: the spec, "What exists today").
- An edit needs evidence from at least one issue, quoted in the commit message. One edit, one
  commit, each of them only the brief:
  `git commit -m "brain-maintenance: <what changed> (<issue id>, event <seq>: <what happened>)" -- <the file>`. Push.
  Writers land in the same checkout: take the landing lock round each commit and push
  (`LOCK_TOKEN=<token> tools/cloud-brain/lock.sh take land overseer-$(hostname -s)`; exit 1 is a writer
  landing, so wait in the background with `--wait` after it; exit 2 is cb4 not reached, and no commit), and
  `LOCK_TOKEN=<token> tools/cloud-brain/lock.sh release land overseer-$(hostname -s)` after.
  The lock is held in the cluster since `lk-3-lock-sh-over-the-cluster`, for 600 s from the take. `LOCK_TOKEN=<token> `
  is written before each call and not exported (a shell keeps nothing between two commands): the holder is the name
  with the token, and a release sent with another token is refused, exit 1, with "held under your name by another token".
  The name carries the machine, so an overseer on another machine is another holder.
  The reviewer's brief is not in git since 2026-10-11. It is a file of the Brain, and its edit is a put, not a
  commit: `cloud-brain-dev/put.sh --get roles/reviewer.md`, edit `cloud-brain-dev/brain/roles/reviewer.md`, then
  `cloud-brain-dev/put.sh roles/reviewer.md` (token `loop-roles`; the copy before is kept on the Brain under
  `cloud-brain-dev-history/`; `put.sh --history` lists them and `--restore` brings one back). No lock. The entry in `oversight.md` carries what the commit message would have:
  what changed, the issue, the event, what happened.
- Edit by the smallest change that would have prevented what you saw. Do not rewrite a brief.
  Do not remove a step because one run did not need it.
- Never loosen: no edit may drop a check, a test run, a refusal or a report from a brief. A
  step that looks unnecessary is filed as a `major` task for the owner.
- You do not review, pass, triage or start any issue, yours or another's.

## Finish

Append one entry to `.claude/skills/brain-maintenance/oversight.md` and commit it:

```
## <date and time from `date`>, events <from> to <to>
Issues looked at: <ids>
Filed: <ids, one line each>          Edited: <commit, one line each>
Seen and not acted on: <one line each>
```

The first line is what the next oversight starts from. Then report the same to the orchestrator.
