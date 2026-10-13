# fb-batch-role-briefs: ten feedback notes about the role briefs, in one pass

Issue `fb-batch-role-briefs`, opened 2026-10-13 by a session the owner was in, on his words: "please look at
all our feedbacks. I think nearly all of them are valid and should be considered for triage, but grouped by
service perhaps so they can be batched effeciently?" Triage (comment 6916, a judgment run) read the ten notes
and said of each whether it is mended here, closed, or taken out to an issue of its own. This record is what
the writer (token `impl-449d80`) did of each, 2026-10-13.

## The ten

| # | Note | Done | What |
|---|---|---|---|
| 1 | `seen-ninth-item-grep-refuses-a-flag` | mended | `-e` before the name in the search of step 11 |
| 2 | `seen-narrowing-change-not-major` | mended | Triage says a narrowing change is `major`; a writer whose design is one stops |
| 3 | `seen-overseer-brief-edit-not-major` | mended | The same two texts: a step that gives a role a new act is `major` |
| 4 | `seen-briefs-change-under-a-writer` | mended in part | A resumed writer has a command for what its brief gained; no lock on the briefs |
| 5 | `seen-pm-brief-three-is-his-word` | mended | The form test fails a cell of two kinds and a table of four actions |
| 6 | `seen-submodule-landing-unsaid` | closed, already mended | `worktree.sh --push-dev` and the page `landing` |
| 7 | `seen-reviewer-brief-spec-section-gaps` | taken out | `reviewer-brief-put-of-fb-batch`, with the new text as a file |
| 8 | `seen-reviewer-bug-rejected-in-seconds` | taken out | The same issue |
| 9 | `seen-browser-all-403-to-a-reviewer` | taken out | The same issue |
| 10 | `seen-approver-brief-gaps-of-nine-runs` | taken out | `approver-brief-lines-of-the-approvers`, `major` |

### 1. The search of step 11 takes a flag

The item names "command, method, flag or step" and its command was `git grep -n -F '<name>' -- …`. Run with a
flag as the name, before the change:

```
$ git grep -n -F '--owner' -- knowledge 'plan/cloud-brain-*.md' .claude/skills/brain-maintenance 'tools/cloud-brain/*.md'
error: unknown option `owner'      (exit 129, no line)
$ git grep -n -F -e '--owner' -- knowledge 'plan/cloud-brain-*.md' .claude/skills/brain-maintenance 'tools/cloud-brain/*.md' | wc -l
101
```

`-e` is now in `agents/implementer.md` (step 11) and in `agents/implementer/submit-and-wait.md`. The spec's copy
(`plan/cloud-brain-texts-not-read-again-after-a-change.md`, R5) is words the owner approved: it stays as
written and gains an "(As built, …)" line under it. `tests/tools/tx-2-writer-searches-before-the-submit.test.ts`
holds the command with `-e`, runs it with `--owner` as a third name (exit 0, more than one line, each with the
flag) and runs it with the `-e` taken out (exit 129, nothing printed). `tests/tools/implementer-brief-core.test.ts`
holds the same string.

`agents/implementer.md` was at 19,997 of its 20,000 characters, and this change adds 3 here, a line for entry 2
and that entry's section in the table "The pages". Four phrases were cut to pay for them: "; no writer had done
so when this was written" (of a change written from the brief alone: an entry of `oversight.md` says a writer
since did, "Pages read: none of the eleven"), "Each of these is a minute now and a round later:" (step 11),
"on 2026-10-12: give the Bash call a" of the suite's time, and ", in the order the brief had them" of the pages.
The file is 19,989 characters and 19,999 bytes
(`python3 -c "t=open('.claude/skills/brain-maintenance/agents/implementer.md').read(); print(len(t), len(t.encode()))"`).

### 2 and 3. A change of who may do what, built on an issue with no `major`

In both notes the label was judged at triage from what the issue expected, and the writer built another thing:
a refusal in the tracker's code where a policy file was expected, and a step of `agents/overseer.md` that gives
the overseer a commit. Two texts:

- `agents/orchestrator.md`, "Triage", a paragraph after the one that names the three kinds of `major` change: a
  change that only narrows is one, a step that gives a role an act it did not have is one, and the label is for
  what may be built, whatever the issue expects of an install. The paragraph before it is held by
  `tests/tools/never-list-three-reductions.test.ts` and, as one line, by
  `tests/tools/owner-decisions-written-dense.test.ts`, and is not changed: put inside that line, the new text
  failed the second (1 fail of 1,299 in a run of the suite).
- `agents/implementer/asking-and-waiting.md`, a section "A design that changes who may do what, on an issue with
  no `major`": stop before the deploy, or before the landing when there is no deploy, comment, and ask as that
  page has it. `agents/implementer.md`, step 3, has one line that sends a writer there, and the page's second
  line names the case.

Neither changes a rule: `philosophy.md`, "In force until the owner changes them", has "a change that only
narrows what a caller may do is `major` too". That a step added to a role's brief is a change of "who may do
what" is triage's reading (comment 6916), taken here.

### 4. A brief that changed under a writer

About 25 cases in two days by the note's comments; the harm named in them is one refused call, twice (comment
6272). A lock on the briefs while a writer works was not built: it would stop the landing of every brief. What
would reopen it: a report of work lost, or of a wrong landing, from a brief that changed.

The one case with a text to mend is a resumed writer, who keeps the brief it read at its start. The page
`agents/implementer/resumed-round.md` already had a diff of `.claude/skills/brain-maintenance` from the
submit's commit; a brief that changed between the start and the submit is not in it. Both it and "A resumed
round" of `agents/spec.md` now give

```
git -C $W log --since=<the at of your start move> --format='%h %s' origin/main -- .claude/skills/brain-maintenance/agents
```

(`spec` for `start` in `agents/spec.md`). Run in this worktree with the `at` of this issue's `start`,
`2026-10-13T19:01:20Z`, before the landing: no line, exit 0. With `2026-10-13T07:00:00Z`: 24 lines, each a
commit.

### 5. The form of a post mortem's actions

The line of the brief was mended on 2026-10-12 (lopecode-dev d040b48a, comment 5244 of the note). What stayed:
`tests/tools/post-mortems.test.ts` passed a `Held by` cell "guard and text" and a table of four actions. It now
fails both:

- a second kind joined to the first by `and`, `or`, `,`, `/`, `+` or `&`: "`Held by` names more than one kind".
  A kind's word later in a cell passes ("text: … so no guard reads it"), and so does "test, in the suite".
- more than 3 rows in the first table under `## Next actions`, in every file, the three written before
  `Held by` too: "the table of `## Next actions` has 4 actions, over 3". The three files of
  `tools/cloud-brain/post-mortems/` have 3 rows each.

With the two rules switched off in a copy of the file (`else if (false)`, `return false ?`) the two new tests
fail and the other six pass. `agents/implementer/post-mortem.md` says the form test holds both.

### 6. Landing a commit of `cloud-brain-dev`

Already mended by `worktree-per-topic`: the token `loop-git`, `worktree.sh --push-dev`, the item of `rules.md`,
Always ("A change to `cloud-brain-dev` is committed in the worktree's clone and pushed by
`tools/cloud-brain/worktree.sh --push-dev <name>`"), and `agents/implementer/landing.md`, which the table "The
pages" of the brief has read when a landing "changes `cloud-brain-dev`"
(`git grep -n -F -e '--push-dev' -- .claude/skills/brain-maintenance/agents/implementer/landing.md` prints 2
lines). Nothing changed here. Not seen: a writer from the short brief landing such a change.

### 7, 8 and 9. The reviewer's brief on the Brain

Each is real in the brief as cb4 served it on 2026-10-13 at 21:07:47 CEST (`curl`, sha256 `b0449bebbab3`, equal
to `tests/tools/fixtures/reviewer-brief.md` at lopecode-dev c58fb733). This writer may not put that brief
(`rules.md`, "The files of the Brain an agent reads"). So the new text is a file here,
`tools/cloud-brain/records/fb-batch-role-briefs.reviewer-brief.md` (sha256 `9ebd44394557`), and the put is asked
of the owner in `reviewer-brief-put-of-fb-batch`, whose body has the two commands. The file is that copy with
30 lines more: five additions, and one line that goes on.

| Addition | Where | Note |
|---|---|---|
| Two rows for a spec at `spec-review` | the table of step 7 | 7 |
| How far a spec's numbers are checked | "A spec" | 7 |
| A defect read and not met is a feedback ticket, not a `bug` | after "kind bug" | 8 |
| "No fix in it" beside "with the fix in one line", as one rule; a thing seen that has a ticket | "If you see something" | 7 |
| "Before finishing": `browser.all` and `container.all` | after "If you see something" | 9 |

What was checked of the new text, each by a call of this writer on 2026-10-13: the three bugs it names were
rejected 49 s, 20 s and 45 s after their open (`get?id=` of each: events 599 and 602, 886 and 889, 941 and
953); `list?kind=feedback&state=open` answers a list, 30 issues of that kind and state; `browser.all` and
`container.all` answer 403 to `--as loop-dashboard` and `{"browsers":[]}`, `{"containers":[]}` to `--owner`; the
reviewer's sentence on a spec's measurements is line 42 of the journal of `owner-acts-on-what-waits-for-him`.
`browser.all` answers 403 to this run's own token too (`--as impl-449d80`), which is made as a reviewer's is,
for `issue.*`; no `rev-` token was tried. Not checked: that the tracker names the move of a spec's `pass`
`to-approval` (the note's words, from one reviewer's report).

Five calls of these were not made through `issue-as.sh`: `browser.all` with `--as loop-dashboard`, with
`--as impl-449d80` and with `--owner`, and `container.all` with `--as loop-dashboard` and with `--owner`. Each
is a read of a service that is not the tracker. `rules.md`, Never, keeps `--owner` from a write to the tracker,
and `knowledge/calling-a-cloud-brain-from-this-checkout.md` gives the two `--owner` reads as its health check.

What of note 7 is not in the file is listed in the new issue's body. Each is one reviewer's line.

### 10. The approver's brief

`agents/approver.md` is pinned by its blob in the policy: a landed change stops every approve until the owner
installs a policy that names it (`rules.md`, "The approver"). So nothing of it is changed here. The lines of
the note and of its comments 5727, 5732, 6270, 6678 and 6758 are gathered, 21 of them, in
`approver-brief-lines-of-the-approvers`, opened with `major` and `needs-owner`. The 21 are as the note quotes
each approver's report: the journals were not read, and no line was read against `agents/approver.md` but one
(its line 38 has "the orchestrator's decision comment", which the note gives as line 34).

## What was written to the tracker

All with `impl-449d80`, 2026-10-13, before the landing. `reviewer-brief-put-of-fb-batch` was opened at event
7073 and `approver-brief-lines-of-the-approvers` at 7074, each with a comment for the owner (7075, 7076) and
its `related` links (7077 to 7082). Each of the ten notes has a comment that names its row and a `close` move
whose reason has the same words: events 7083 to 7103. The first close was sent alone, to see that the policy
takes it from a writer's token; it did. After the last, `list?kind=feedback&state=open` answered 20 issues and
none of the ten.

`SKILL.md` has nobody close a feedback issue that is not the owner's since `overseer-runs-too-often`; these ten
are closed because the issue asks it of this writer ("Each feedback issue is closed with a comment that names
the row").

## The tests

Each run in this worktree after the last edit of a file it reads.

| Command | Result |
|---|---|
| `bun test --timeout=30000 ./tests/tools/fb-batch-role-briefs.test.ts` | 5 pass, 0 fail |
| `bun test --timeout=30000 ./tests/tools/post-mortems.test.ts` | 8 pass, 0 fail |
| `bun test --timeout=30000 ./tests/tools/tx-2-writer-searches-before-the-submit.test.ts ./tests/tools/implementer-brief-core.test.ts` | 11 pass, 0 fail |
| `BRIEF=$W/tools/cloud-brain/records/fb-batch-role-briefs.reviewer-brief.md bun test --timeout=30000` of the 7 files that `grep -l briefOf tests/tools/*.test.ts` names | 70 pass, 0 fail |
| `tests/tools/suite.sh` | 1299 pass, 0 fail, 136 files; no `skipped:` line |

`tests/tools/fb-batch-role-briefs.test.ts` is new: without the change it has no record and no file of the new
text to read, which fails its last two tests. Its first three hold sentences that the files of lopecode-dev
c58fb733, the commit this worktree was made at, do not have: `git grep -c -F -e '<sentence>' c58fb733 -- <file>`
names no file for "A change that only narrows what a caller may do alters who may do what"
(`agents/orchestrator.md`), "A design that changes who may do what" (`agents/implementer.md` and its page
`asking-and-waiting`), "log --since=<the at of your start move>" (`resumed-round`) and "log --since=<the at of
your spec move>" (`agents/spec.md`). They were not run against those files. The test of the search was run
against the brief with `-e` before the test was changed: 1 fail, its expected string.

## The searches

Before the design, `knowledge.search?semantic=true` for "feedback issue closed with a comment batch of
feedback", "major label triage narrowing change who may do what" and "resumed writer brief changed while at
work": the entries were specs and post mortems of the loop, and none had a text to reuse.

For step 11, `git grep -n -F -e "<words>" -- knowledge 'plan/cloud-brain-*.md' .claude/skills/brain-maintenance 'tools/cloud-brain/*.md'`:
run after the last edit and before this record was committed, so its own lines are not in the counts.

| Words | Lines | What was read |
|---|---|---|
| `git grep -n -F` | 44 | 5 in the two briefs and the spec: the 2 of the briefs mended, the spec's 2 left as written, and its new line; 39 in records, each a command a writer ran, left |
| `post-mortems.test.ts` | 16 | `agents/orchestrator.md` line 246, `knowledge/working-with-cloud-brain-remote-lopecode-cluster.md` line 40 and the spec's four lines say what the test holds and are still true; none says it holds nothing else |
| `asking-and-waiting` | 4 | the row of the table "The pages" named two sections of the page: the third is added |
| `alters who may do what` | 4 | `agents/orchestrator.md` alone, 2 of them the new paragraph |
| `A resumed round` | 41 | `SKILL.md` and the plans name the section and say nothing of the diff it gives |
| `no writer had done` | 1 | `oversight.md`, the entry quoted under entry 1 |

No line of `rules.md`, `philosophy.md` or a seed was made untrue. The reviewer's brief on the Brain is entries
7 to 9.

## Not tried

- No writer has stopped by the new section of `asking-and-waiting`, and no judgment run has answered such an
  ask. Whether the driver's step gives it to a judgment run was not read.
- No resumed writer has run the new `git log` line. It lists commits; a writer still has to `git show` each.
- The new text of the reviewer's brief is not on the Brain and no reviewer has followed it. A put made since
  21:07:47 CEST of 2026-10-13 would be undone by a put of the file whole; the new issue says how to see that.
- The form test's rule of one kind reads the joining word alone: "text, guard cannot hold it" would fail, and
  "guard. Also text" would pass. The limit of 3 is of the rows of one table, not of the issues a post mortem
  opened over its rounds.
- The four phrases cut from `agents/implementer.md` are gone from what a writer reads; they are in this
  record and in `git log`.
- Nothing was deployed and nothing of cb4 changed but the tracker's events.
