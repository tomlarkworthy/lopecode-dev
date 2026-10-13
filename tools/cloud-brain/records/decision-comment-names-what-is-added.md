# The comment that puts a spec to the owner names what it adds and what it reads into his words (`decision-comment-names-what-is-added`)

Written 2026-10-13 by the writer of the issue (token `impl-64848c`, `start` at event 5559). The issue is
a next action of the post mortem `tools/cloud-brain/post-mortems/pm-second-summarizer-role.md`: a spec
added a second summarizer role and marked that as its writer's reading of the owner's words, and the
comment he approved by had neither the role nor the reading.

Two texts are changed, `SKILL.md` and the spec writer's brief. A third the issue names,
`agents/approver.md`, is not, and why is below.

## What was read first

The issue's facts, each read again on 2026-10-13:

```
git show 619354c2:plan/cloud-brain-docs-summarised-for-search.md | wc -l                  -> 655
git show 619354c2:plan/cloud-brain-docs-summarised-for-search.md | grep -n -i "reading"   -> 2 lines, 30 and 632
```

Line 30 is the reading: "That is the writer's reading and not his words; his approval of this spec is
where he says otherwise." Line 632 is a row of a table, "a Worker that holds a token reading every log
line of the account". So the `grep` the issue gives prints the reading and one line that is none, on
the one spec it was run on. The brief says that such a line is left out.

Comment 4344 of `docs-summarised-for-search` (`issue.get`, the `body` of that event; by `orch-d97e0e`,
`at` 2026-10-12T18:53:02Z) has "One light agent a doc writes the summary, as for the papers" and
"It names a token for the orchestrator to make: `loop-doc-files`". The same file at 619354c2 has
`doc-summarizer` on 9 lines and `summarize-docs.ts` on 11 (`grep -c -F`). The comment's body, 1,945
characters, has `doc-summarizer` 0 times, `summarize-docs` 0, "role" 0, "brief" 0 and "reading" 0
(counted in Python over the `body` of the event).

Searched in the Brain (`knowledge.search?semantic=true`, token `loop-knowledge`), three times: "comment
that puts a spec to the owner for approval", "writer's reading and not his words", "spec writer report
names what the spec adds role tool token". The first six of each were read by title:
`doc:pm-second-summarizer-role`, `doc:cloud-brain-approver-persona` and
`doc:pm-approver-leaves-everything` bore on it, and no entry had a form for the two lines. Used: the
post mortem's row for this issue, and from the approver's spec that the orchestrator's comment waits on
the verdict (`SKILL.md`, step 3, the row).

The issue says: "Not known: whether the dense form he asked for the same evening ... has room for both
lines; the writer of this reads that issue first, if one was filed for it." It was filed,
`owner-decisions-written-dense`, and it landed as the section "What the owner is asked to decide" of
`rules.md`, with two later issues for the line of what the project is for. That section was read whole.
It lists the parts of a comment (the project, what it is, live and cost, the one flaw, the choices) and
has no part for a thing added or a reading. It forbids evidence before the choice (what the reviewer
ran, hashes, events, counts), and the two lines are none of those. So the lines are put in `SKILL.md`
as one line each, between what the thing is and the choices, and `rules.md` is not changed: it is the
owner's file. `SKILL.md` says there that the section has neither line and holds where the two differ.

## What changed

**`SKILL.md`, step 7**, a paragraph "A spec put to him", after the sentence that the comment for him is
written by the section of `rules.md`. The comment for an issue whose last submit is a `submit-spec`,
and its item of the list a session tells him, has two lines more:

- `Adds, to stay:` each role, brief, tool, token, Worker, method or store the spec adds, by its name,
  with what exists today of the same job in a clause.
- `Readings of your words:` each sentence the spec marks as its writer's reading and not his words.

Both are written for every spec, `nothing` and `none marked` when there is none. They are written from
the spec writer's comment keyed `spec/<id>/adds-<round>` and read against the file at the submit's
commit with the `grep` above. A spec with no such comment gets them from the file. The parts of the
writer's comment begin lower case (`adds, to stay:`) and the lines for the owner upper case: they are
two texts, and the second is written from the first, not copied. The sentence of a
token that the spec brief already asked for is the token's entry of the first line.

**`SKILL.md`, step 3, the row for `awaiting-approval`**: the comment written after `approver: leave`
has the two lines for a spec, by one clause that names step 7.

**`agents/spec.md`, step 5**, the item of what was asked: a sentence where the design rests on more
than his words say is marked as the writer's reading, with the word `reading` in it. Until now the
brief did not ask for the mark; the writer of `docs-summarised-for-search` made it unasked.

**`agents/spec.md`, step 7**: after the attach and before the move, one comment keyed
`spec/<id>/adds-<round>` with the two parts, a line a thing, and the same two parts in the writer's
report. A round after a review writes it again, whole. The issue asks for the report alone. A comment
is added because a report is read by the session that spawned the writer, and the comment for the owner
is written after a review and an approver's verdict, which may be another session's.

## What did not change

`agents/approver.md`. The issue names "the approver's verdict, `agents/approver.md`, where it
summarizes a spec". The policy in force names that file by its git blob: `tools/cloud-brain/approver.ts`
reads `approver brief <blob> tool <blob>` from the policy's reason and refuses a move when
`origin/main` has another blob (lines 317 to 322 of the tool). A change to the brief therefore needs a
policy installed by the owner, which step 3 of the implementer's brief does not start. The verdict's
second line is also held to 180 characters, and its form has a line `beyond his words:` already. The
issue's "Done when" names `SKILL.md` and the spec writer's brief and not the approver's.

What that leaves: a spec an approver approves gets no comment for the owner at all (`SKILL.md`, step 3,
"After `approver: approve` and the tool's `approve` move, nothing"), so neither line is shown to him for
it. He reads of it in the list of what was approved for him, which is the tool's line.

## The test

`tests/tools/decision-comment-names-what-is-added.test.ts`, 11 tests. It reads `SKILL.md`,
`agents/spec.md` and `rules.md` as they are: the two lines and their order, each kind of standing
thing, the empty forms, the key (the same in both texts), the `grep`, the row's clause, the order
attach, comment, move in step 7 of the spec brief, the form of the comment, and the case. One test
holds that the section of `rules.md` has neither line, so that the sentence of `SKILL.md` that says so
is taken out when it gets them.

```
bun test --timeout=30000 ./tests/tools/decision-comment-names-what-is-added.test.ts
  with the change                                   11 pass   0 fail
  SKILL.md and agents/spec.md as HEAD had them       0 pass  11 fail
tests/tools/suite.sh, 2026-10-13 02:05 CEST         982 pass   0 fail, 100 files
```

The run without the change was made by `git checkout --` of the two files, with the change kept as a
patch and applied again after it. The suite was run after the last edit to the two texts and the test.
Four neighbouring files that read the same steps (`owner-decisions-written-dense`,
`approver-before-decision-comment`, `spec-brief-names-what-exists`, `spec-brief-attaches-the-spec`)
were run alone after the first edit, 27 pass, and are in the suite's count.

## Not tried

- No comment has been written by either step. No spec writer has run with the new step 7, and no
  orchestrating session has written a comment with the two lines from one. What a session does with
  them is not known.
- Nothing checks a written comment for the two lines; the test holds the texts. The section of
  `rules.md` says the same of itself.
- Whether the owner finds the comment still short enough with two lines more. He was not asked.
- The `grep` was run on one spec. A spec that marks a reading in other words ("this is my
  interpretation") is not found by it; step 5 now asks for the word, which no spec has been written
  under.
- The orchestrator's interim practice (comment 4554 of this issue: it names each standing thing and
  each reading until this lands) was not looked for in the comments written since.

## For the overseer

- `rules.md`, "What the owner is asked to decide", lists the parts of a comment for him and has neither
  line. A mend, for the owner: one item after "What it is", that a spec's comment has the two lines of
  `SKILL.md` step 7.
- `agents/approver.md`, step 9, the form of an approval: a spec the approver approves is shown to the
  owner by the verdict's one sentence alone. A mend, with the next policy that pins a new blob: for a
  spec, the line `beyond his words:` names each standing thing the spec adds and each sentence it marks
  as a reading.
