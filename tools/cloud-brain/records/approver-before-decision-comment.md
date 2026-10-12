# The approver reads an issue before the session writes on it for the owner (`approver-before-decision-comment`)

An action of the post mortem `tools/cloud-brain/post-mortems/pm-approver-leaves-everything.md`
("1 beside the cause": "The loop puts letters on every approval, before the approver reads"). The
file names it `approver-runs-before-the-decision-comment`. Round 1, by a writer of the issue loop,
token `impl-b824fe`, on 2026-10-12; its `start` is event 5193. A text the orchestrating session
follows, a line of a local tool and two test files. No seed, no deploy, no install.

## The case, counted

`SKILL.md` had the approver started for an issue "at `awaiting-approval`" (step 3) and the session's
comment for the owner written "when a `major` issue has passed its review" (step 7). Nothing ordered
the two. The record at event 5210, by the line this change adds to `issue-stats.ts`:

```
$ bun tools/cloud-brain/issue-stats.ts --token impl-b824fe      (23:34 CEST, from the worktree)
record         5210 events, 422 issues
decision comment and verdict: 10 verdicts of an approver; the session's comment for the owner before the verdict 9 [4470,4622,4638,4642,4652,4797,4858,4863,4991], after it 0, none 1
```

The nine are the eight the post mortem counts and `dense-rule-says-what-project-is-for` (comment
4964, verdict 4991), which came after its file. Each of the nine verdicts is `approver: leave`. The
one verdict with no such comment on the issue, 5169 of `dense-rule-project-line-first`, is the one
`approver: approve` of the record, and the tool made the move (5170). That is one case and shows no
cause.

## What changed

- **`.claude/skills/brain-maintenance/SKILL.md`, step 3, the row at `awaiting-approval`.** A part
  headed "The approver reads before you write for him", after the conditions of the spawn. Until the
  round's verdict is there, or its run has reported with none, the session writes no comment keyed
  `orch/<id>/decision-<n>` and puts no `needs-owner` on the issue, also in a pass that starts no
  approver. Then, by what the run left:

  | The run left | The session writes |
  |---|---|
  | `approver: approve`, and the tool's `approve` move | nothing; step 7 tells him of it in the list of what was approved for him |
  | `approver: leave` | the comment, from the verdict's second line and its `why:`, in the form of `rules.md`, "What the owner is asked to decide"; letters only where the verdict names a choice that is his; then `needs-owner` |
  | `approver: approve`, and no move | a comment with no letters, from the verdict's second line and the tool's line; then `needs-owner` |
  | no verdict, or no approver in this round because one left the issue in an earlier round | the comment from the review and the record, with no letters when there is nothing to choose between; then `needs-owner` |

- **Step 2.** "nothing waits on it but the owner, who approves as before" was no longer so: the
  comment for him waits on the approver. The sentence says that, and that an issue whose approver was
  not started is named in step 7.
- **Step 4.** "Your decision comment on the issue is data there" is now "You have written no decision
  comment on the issue by then", with the round after the first as the exception.
- **Step 7.** The comment for him is written "at `awaiting-approval` after its approver's verdict and
  not before". An issue whose approver has not reported is one line of the list, with no letters and
  no pick.
- **`plan/cloud-brain-approver-persona.md`, part 4.** "the decision comment it wrote is on the issue
  as data" gains a note "As built".
- **`tools/cloud-brain/issue-stats.ts`.** `report` returns `decisionAndVerdict`, and the tool prints
  the line above, after `approve by the session`. A decision comment is a `commented` event keyed
  `orch/<id>/decision-<n>` on issue `<id>`, a verdict one keyed `approver/<id>/verdict-<n>`; the two
  are matched by issue and `<n>`. A `test-` issue is not counted. It is of the record up to `--until`.

## What was decided here and is not in the issue

- **The count is in `issue-stats.ts`.** The issue left it to the writer ("that is the writer's to
  weigh"). It is 24 lines of the tool, its comments among them (`git diff --stat`), and one test. The overseer runs the tool at each oversight
  (`agents/overseer.md`, line 34), so a round in which the row was not followed is a seq in a line
  that is already read. The owner, comment 4980 of `pm-approver-leaves-everything`: "generally fixes
  are better as guards". This is no guard: it refuses nothing and is read after the fact.
- **`needs-owner` goes on after the comment, in every case but the approve that was made.** The issue
  says only that no label is put on before the verdict. The row labeled `needs-owner` of step 3 is
  what reads his answer, as before.
- **An `approve` verdict with no move.** The issue has "After `approver: approve` and the move". A
  verdict of `approve` whose move the tool did not send leaves the issue his with nothing written
  for him. That is every `approve` between the landing of an action that changes a file the policy
  pins and his next install (the post mortem, "Next actions": "once one lands no approver makes a
  move until he installs again").
- **A round with no verdict to come.** An issue an approver left gets no second approver after a
  send-back (the same row, since `ap-2-brief-and-shadow-step`), and a run may report with none. The
  comment is then written as before this change.
- **In a pass that starts no approver, the comment still waits.** The other side was to write it at
  once when a limit is named. The issue is at `awaiting-approval` and the page lists it for him with
  no label (`brain-issues.ojs`, line 20: "or is at `awaiting-approval`"), so he can approve before
  the approver runs.

## The tests

Run in the worktree on 2026-10-12 after its rebase on `c58f35c0` (`pm-4-stats-block`, which changed
`issue-stats.ts`, its test and `SKILL.md`; both sides of the two conflicts were kept). The single
files at 23:40 CEST, the suite from 23:40 to 23:43 (`uptime` before it: load 8.33):

```
$ bun test --timeout=30000 ./tests/tools/approver-before-decision-comment.test.ts
 9 pass  0 fail
$ SKILL=<SKILL.md of c58f35c0> SPEC=<the spec of c58f35c0> bun test --timeout=30000 ./tests/tools/approver-before-decision-comment.test.ts
 1 pass  8 fail
$ bun test --timeout=30000 ./tests/tools/issue-stats.test.ts
 36 pass  0 fail
$ ISSUE_STATS_TS=<issue-stats.ts of c58f35c0> bun test --timeout=30000 ./tests/tools/issue-stats.test.ts
 35 pass  1 fail      "decision comment and verdict: each verdict counted by where the session's comment of its round is"
$ tests/tools/suite.sh
 821 pass  0 fail     Ran 821 tests across 86 files. [214.72s]
```

`c58f35c0` is the commit of `origin/main` the change was on for these runs; the copies were made with
`git show c58f35c0:<path>`. The one test of the first file that passes on the old text holds that
the row is there, on one line. The tool on the record, after the rebase, at event 5235: the line
under "The case, counted", with the same ten verdicts.

Under the landing lock, at 23:44, a second rebase brought in `1f2978e7`, which changed `SKILL.md`
again (and `agents/implementer.md`, `issue-watch.sh` and its test, no file of this change's but
`SKILL.md`). The suite was not run again on it. Eight files were, one at a time, each 0 fail: the
two above with the same counts (9 and 36), the four below, `issue-watch.test.ts` (28 pass) and
`skill-step-2-advisor-rate-limit.test.ts` (3).

Four files that read the same steps were run one at a time after the rebase, each 0
fail: `approver-brief.test.ts` (12 pass), `owner-decisions-written-dense.test.ts` (11),
`pm-2-brief-and-procedure.test.ts` (7), `os-2-order-and-pool.test.ts` (6).

## Searched

`knowledge.search?semantic=true` with `loop-knowledge`, three questions: "approver started before
decision comment for the owner", "comment written from the verdict letters only where a choice",
"test that holds lines of SKILL.md order of steps". Read: `doc:pm-approver-leaves-everything` (0.99
for the first) and `doc:cloud-brain-approver-persona` (0.92), parts 3 and 4. Not used:
`doc:pm-second-summarizer-role`, whose action `decision-comment-names-what-is-added` is of what the
same comment says for a spec; it is at `triaged`, and this issue is linked to it as `related`.

## Not done, not tried

- **No pass of the orchestrating session has followed the row.** The session that runs now read
  `SKILL.md` before this landed. The first comment written after a verdict is not in the record.
- **The form of a comment written from a verdict was not tried on a verdict.** None of the nine
  leaves was written up again as the row has it, and nobody read one.
- **Whether fewer leaves follow.** The post mortem: "The three that do not give it left all the
  same." The change takes away one thing five verdicts name; the brief's test is the first action,
  `approver-brief-his-test`.
- **`agents/approver.md`, line 34**, speaks of "the orchestrator's decision comment" among the claims
  an approver reads. In a first round there is none now. The file is pinned by the installed policy
  and was not touched.
- **A writer's own comment for the owner** is on the issue before the verdict and is not this
  change's: event 4818 of `bk-3-queue-and-hold`, key `impl/…/for-owner-1`, "For the owner, short.
  … Nothing to choose between". It has no letters. No line of `agents/implementer.md` asks for it
  (`grep -c 'for-owner' agents/implementer.md`: 0).
- **The post mortem's file** still quotes step 7 as it was and names the action by the longer id. It
  is a record of that day and was left.
- **`--window` does not reach the new line**: it is of the whole record read, as `approve by the
  session` is. The seqs in it are what say when.
