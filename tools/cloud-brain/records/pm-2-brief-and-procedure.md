# A post mortem in the writer's brief and in the procedure (`pm-2-brief-and-procedure`)

Task 2 of `plan/cloud-brain-post-mortems-declared-and-kept.md`. Written 2026-10-12 by a writer of the loop
(token `impl-8da9e9`, `start` at event 4904), begun at 22:36 CEST by the `date` of its first search. Two texts the loop follows were
changed, with a test that holds the lines. Nothing was built or deployed, and no post mortem was written under
the new text.

## What was there

`git show origin/main:.claude/skills/brain-maintenance/SKILL.md | grep -c -i "post.mortem"` printed 0, and the
same for `agents/implementer.md` printed 1, a line of step 6 with the name of the project in a note on a
timeout. So a session that met an issue labeled `post-mortem` had the row for a task at `open`, with its three
questions, and its writer had a brief whose steps 5 to 9 ask for a reproduction, a build and a record.

While this was written a second post mortem was declared: `pm-approver-leaves-everything`, opened by the session
`out-5f56b2` on the owner's word at event 4906, labels `owner` and `post-mortem`, a `cause` link to
`approver-persona`, at `open` when read at 22:41 (`ia "list?label=post-mortem&limit=100"`: that one issue).

## What changed

- **`agents/implementer.md`.** One line in step 1 sends the writer of a labeled issue to a new section,
  `## A post mortem`, between "A resumed round" and "A quick win". The section has: a table of what each step of
  the brief is for a post mortem (the spec, part 2); the trace, in the spec's words, with a table of where each
  source is; the file, its seven headings, the limit, the count of the submit and the attachment (part 3); the
  next actions, filed after the `pass` (part 5); the four questions of the review (part 6).
- **`SKILL.md`.** Two rows of step 3, for a post mortem at `open` and at `ready`, above the rows any task is
  taken by. A section `## A post mortem` between "The daily digest" and "Triage": what one is, the two who
  declare, the one case the session declares for, the triage, the writer, the actions at `done`, the block of
  task 4, the read after three. One sentence in "Triage". Five lines at the end of step 7.
- **`tests/tools/pm-2-brief-and-procedure.test.ts`**, new, 7 tests.
- **`knowledge/working-with-cloud-brain-remote-lopecode-cluster.md`**, the row of the directory: it said who
  declares and writes one is in the spec, and now names the two sections too.
- **The spec**, two notes "As built" (part 5 and task 4), for the links below.

Three things the spec's text does not have, each added to the section of the brief:

1. The Never line on secrets is named beside the line on not quoting a transcript (note 4 of review 4602,
   comment 4621).
2. What the writer does when its own token is a `token` of the runs it traces: it comments and stops before the
   `start`. The spec says only that this is read from the record.
3. Where each source of a trace is. Read for `docs-summarised-for-search` at 22:41: `runs?id=` answered five
   runs (two of role `spec-writer`, two `reviewer`, one `approver`), the reviewers' with `agent` null;
   `ls -la` of the spec writer's transcript under `$CLAUDE_CONFIG_DIR/projects/…/subagents/` printed 2,639,232
   bytes; the journal file of that issue is there. The transcript was not opened.

One sentence of the spec is not carried as written. Part 1 says the body's example is "comment 4485 and the
body of `pm-second-summarizer-role`" for the words "I give no cause here". The body has them and comment 4485
does not (`get?id=pm-second-summarizer-role`, a search of both, between 22:41 and 22:44), so `SKILL.md` names the body alone.

## The three `cause` links of the first

The spec gives them to task 4. Note 1 of review 4602, which comment 4621 passed on for the decompose, says why
they are wanted here: the line this task puts in `SKILL.md` (a post mortem at `done` has as many `cause` links
as its file has actions, and the session opens the ones that lack) would read the first as lacking three, and a
session that followed it would open events 4497, 4499 and 4501 a second time. Neither is in this issue's body.
Taken, as the smaller side (`philosophy.md`, line 2): a link opens nothing and the other side was a line of the
procedure that is wrong for the one post mortem that is `done`. Sent at 22:40:23 with this task's token:

```
ia link '{"key":"impl/pm-2-brief-and-procedure/cause-1","id":"spec-names-what-exists-of-the-job","to":"pm-second-summarizer-role","rel":"cause"}'      200, seq 4909
ia link '{…"cause-2","id":"decision-comment-names-what-is-added",…}'                                                                               200, seq 4910
ia link '{…"cause-3","id":"philosophy-one-role-for-one-job",…}'                                                                                    200, seq 4911
```

`linked` of `get?id=pm-second-summarizer-role` then has six entries: the three `related` of events 4497 to 4501
and three `"rel":"cause"`, one for each row of the file's table. A second rel on a pair that had `related` was
taken. The label `post-mortem` is not on that issue: the issue's body makes it the orchestrating session's act,
after this task.

## The tests

```
bun test --timeout=30000 ./tests/tools/pm-2-brief-and-procedure.test.ts                          before 22:44    7 pass, 0 fail, 39 expect() calls
SKILL=<origin/main's SKILL.md> BRIEF=<origin/main's implementer.md> the same command             before 22:44    0 pass, 7 fail
tests/tools/suite.sh                                                                             22:44:39 to 22:46:28    751 pass, 0 fail, 79 files, 108.69 s
```

The two files of the second line are `git show origin/main:<path>` of each, written to the scratchpad.
`uptime` read 5.79 before the suite and 7.98 after. The suite was run after every edit of this change but this record's own; what the landing's rebase brought in, and the
runs after it, are in the comment of the submit.

What the test holds: the sentences. For the trace, each of nine sentences is in the spec and in the section, so
the two do not drift apart unseen. The headings of the file in the brief are compared with `PARTS` of
`tests/tools/post-mortems.test.ts`, in its order. The four questions are read from part 6 of the spec. The rows
of step 3 stand above the row for an issue at `ready` and above the row for a task at `open`. The three moves the session
declares for are names in `tools/cloud-brain/brain-issues.ojs`.

## Prior art

Three searches of the Brain (`knowledge.search?semantic=true`, `loop-knowledge`, 22:36): "post mortem declared
by the loop root cause trace", "implementer brief section for a kind of task a label says which brief", "test
that holds lines of SKILL.md and a brief". The first two answered the spec first (score 1) and
`doc:pm-second-summarizer-role` second and fourth; the third answered the spec, a paper and two specs on
records. Used: the spec, and the first post mortem as the example of the form. Nothing else bore on it. The
shape of the test is that of `tests/tools/os-2-order-and-pool.test.ts`, and the attachment's two lines are those
of `agents/spec.md` step 7.

## Not tried

- **No post mortem was written under the section, and no session followed the lines of `SKILL.md`.**
  `pm-approver-leaves-everything` is the first that can be.
- **The filing after a `pass`.** No writer has opened actions from step 13. Whether its token still writes then
  rests on `SKILL.md`, step 5: a writer's token is ended once that writer has reported.
- **The session's own calls.** The `open` with `"labels":["post-mortem"]` and the `duplicate` link were not sent.
  Event 4906 is an open with that label by another token; a `cause` link was answered 200 three times, above.
- **The attachment of a post mortem by the new two lines.** The first line was run on the first's file with the
  section's names at 22:46 and wrote a body of 12,664 bytes whose `text` has the file's SHA-256 (`59032dcd…`).
  It was not sent: that issue has the name already (event 4803).
- **A review of a post mortem under today's reviewer's brief.** That brief has no part "A post mortem" until
  task 3 (`pm-3-reviewer-brief`), and it asks for a record under `records/`, which the section says a post
  mortem has none of. A post mortem reviewed before task 3 lands may be sent back for it.
- **The block of `issue-stats.ts`.** `grep -c "post mortem" tools/cloud-brain/issue-stats.ts` printed 0. The
  section says so, and gives `list?label=post-mortem` as the read until task 4. The two numbers step 7 asks for
  have no tool until then.
- **That an owner's `owner-reject` or `revert` prints a line of the watch.** Read for the `send-back` alone:
  event 4434 has `by.via` `session`, which `issue-watch.sh` prints with `OWNER`. The record has no
  `owner-reject` after a pass and no `revert` (the spec's count).
- **The test reads words.** It does not show that an agent which follows them reaches a cause.
