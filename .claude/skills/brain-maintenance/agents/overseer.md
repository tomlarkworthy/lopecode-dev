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

Since `os-2-order-and-pool` (submitted at event 2844, `done` at 2849, 2026-10-11) the loop has no
fixed pool and gives a place to a review before a new start
(`plan/cloud-brain-loop-order-of-service.md`, R3, and its row in the table of checks). Put a fifth
line in your entry: the median stay at `in-review` of the stays that began after event 2849, with
the number of stays. The spec's figure to read it against is 6.3 min over 147 stays, the whole
record when the spec was written on 2026-10-11. Once 40 stays are in the window, a median over 6.3
is a finding. The line is the tool's: with `--window=2849` it prints
`time in a state, of the stays that began after 2849`, and the row `in-review` under that heading
has the stays and the median (since `stats-window-time-in-a-state`, 2026-10-12; until then it was
made by hand from `sync`). At event 3367 it read 10 stays, median 4.8 min; of an even number of
stays the tool's median is the upper of the two middle ones. When a report or the journal shows a
machine that carried no more writers (memory,
the channel rows of QA tabs, a tab that did not open), name the sign in your entry and add it to
`SKILL.md` step 2 as one of your two edits (the spec, part 3, "Not known").

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

## Feedback that is due

> Since `feedback-closed-or-promoted`, 2026-10-11. The owner, shown 51 feedback issues at `open`: "Why are the feedback
> ones not being done?" Nothing closed one until then: 25 of the 51 were tied only to work that was `done` or `closed`
> (`issue-stats.ts` at event 2745).

A feedback issue is **due** when it has a tie and every tie is at `done` or `closed`. Its ties are the issues it
links to, the issues that link to it, and its parent. `issue-stats.ts`, which you ran first, lists them under
`feedback due to be closed`, each with its ties and their states. Close each one in this oversight:

```
io move '{"key":"over/<id>/close-due","id":"<id>","to":"closed","reason":"<each tie and its state>: <what became of the report>"}'
```

The reason names each tie with its state and says what you know of what became of the report: the commit or the
record that changed what it reports, or "seen during <tie>; whether it still holds was not looked at" when the
finished work was only where it was seen. You have read it (the section above), so this is no new reading. What the
close does not need: that the finished work did what the note asks. A report that was closed and is seen again is
filed again, and three make a project; `reopen` is there for a close that was wrong.

**One you still need is held, not closed.** A note you are adding cases to, or that carries an edit of a brief you
had no place for in an oversight ("for the next put"), is kept with a comment that begins `held:` and says for what:
`io comment '{"key":"over/<id>/held","id":"<id>","body":"held: <for what, and until when>"}'`. The tool then leaves
it out of the list. Seven of the first 25 were of this kind: each had a comment of an overseer with a second case or
a proposed edit, and was left at `open` for the next oversight to close or hold.

Not due, and not closed by this rule:

- One with a tie at `rejected` or `reverted`: nobody answered it. It is read as one with no tie.
- One labeled `needs-owner`: it is the owner's to answer.
- One with no tie. When it is the owner's (labeled `owner`, or opened by his session) the orchestrator promotes it
  (`SKILL.md`, the row for `open`, kind `feedback`); `issue-stats.ts` lists those too.
- One on the task workflow: it was promoted and is a task.

**One that is the owner's** has "the owner's" on its line. He asked for something, so its close does need the check:
close it only when you can name what the finished work did for his ask (the commit, the line of the record). When
it did not, or you cannot tell, do not close it: comment with what you read, and it is a decision for him
("What you may do", the last row).

A close is not an issue filed and not an edit: it is not counted against the limits below.

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
  `git -C $W commit -m "brain-maintenance: <what changed> (<issue id>, event <seq>: <what happened>)" -- <the file>`.
  Since `wt-3-land-by-push` (2026-10-12) you commit in a worktree of your own and nothing in the main checkout:
  `$W` is the directory the first line of your prompt names, `…/.claude/worktrees/bm-over-<host>`, which the
  orchestrator brought up to `origin/main` before it spawned you (a prompt that names the main checkout is from a
  session of before that day: `W=$(tools/cloud-brain/worktree.sh --fresh over-$(hostname -s))`). The briefs and
  `oversight.md` you edit are the files of `$W`. Each commit, or several, is landed by a push from it, as
  `agents/implementer.md` step 10 lands a change with no deploy:
  `LOCK_TOKEN=<token> $W/tools/cloud-brain/lock.sh take land overseer-$(hostname -s)` (exit 1 is a writer
  landing, so wait in the background with `--wait` after it; exit 2 is cb4 not reached, and no push),
  `$W/tools/cloud-brain/worktree.sh --rebase over-$(hostname -s)`,
  `LOCK_TOKEN=<token> $W/tools/cloud-brain/lock.sh renew land overseer-$(hostname -s)`,
  `git -C $W push origin HEAD:main`, and
  `LOCK_TOKEN=<token> $W/tools/cloud-brain/lock.sh release land overseer-$(hostname -s)` after.
  (Until that day: a commit in the main checkout, where writers landed too, with the lock round it.)
  The lock is held in the cluster since `lk-3-lock-sh-over-the-cluster`, for 600 s from the take. `LOCK_TOKEN=<token> `
  is written before each call and not exported (a shell keeps nothing between two commands): the holder is the name
  with the token, and a release sent with another token is refused, exit 1, with "held under your name by another token".
  The name carries the machine, so an overseer on another machine is another holder.
  The reviewer's brief is not in git since 2026-10-11. It is a file of the Brain, and its edit is a put, not a
  commit: `cloud-brain-dev/put.sh --get roles/reviewer.md`, edit `cloud-brain-dev/brain/roles/reviewer.md`, then
  `cloud-brain-dev/put.sh roles/reviewer.md` (token `loop-roles`; the copy before is kept on the Brain under
  `cloud-brain-dev-history/`; `put.sh --history` lists them and `--restore` brings one back). No lock.
  Before the put, the tests that hold lines of the brief are run on the edited file:
  `BRIEF=$W/cloud-brain-dev/brain/roles/reviewer.md bun test ./tests/tools/reviewer-brief-waits-on-show.test.ts ./tests/tools/reviewer-in-a-view.test.ts ./tests/tools/reviewer-brief-names-token.test.ts ./tests/tools/lock.test.ts`,
  0 fail, with the count in the entry. Since `suite-tests-read-the-live-brief` (2026-10-12) the suite reads a copy kept in
  the repository, `tests/tools/fixtures/reviewer-brief.md`, and not the Brain, so this run is the one that shows a put
  took out a line a test holds: with a fail, the line stays, or the test and the kept copy change in a commit a writer lands
  (`tests/tools/reviewer-brief.ts`). The entry in `oversight.md` carries what the commit message would have:
  what changed, the issue, the event, what happened.
- Edit by the smallest change that would have prevented what you saw. Do not rewrite a brief.
  Do not remove a step because one run did not need it.
- Never loosen: no edit may drop a check, a test run, a refusal or a report from a brief. A
  step that looks unnecessary is filed as a `major` task for the owner.
- You do not review, pass, triage or start any issue, yours or another's. The one move you make is the close of a
  feedback issue: a duplicate, and one that is due.

## Finish

Append one entry to `.claude/skills/brain-maintenance/oversight.md` in `$W`, commit it there and land it as above:

```
## <date and time from `date`>, events <from> to <to>
Issues looked at: <ids>
Filed: <ids, one line each>          Edited: <commit, one line each>
Seen and not acted on: <one line each>
```

The first line is what the next oversight starts from. Then report the same to the orchestrator.
