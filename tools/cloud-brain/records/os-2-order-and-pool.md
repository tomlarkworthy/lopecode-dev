# One order for a free place, no number for the pool (`os-2-order-and-pool`)

Task 2 of `plan/cloud-brain-loop-order-of-service.md` (approved for the owner at event 2611, taken
as A): parts 2 and 3 of its design and the orchestrator's half of part 4. Round 1, by a writer of
the issue loop on 2026-10-11, in a worktree made at `85880f72`. One file of the loop changed,
`.claude/skills/brain-maintenance/SKILL.md`, with a test file and three notes in the spec. No seed,
no tool, no deploy.

No orchestrator has run a pass from the new text. What follows is what the file says and what the
test reads in it, not what a pass did.

## What the spec did not have

The spec quotes the two texts of part 3 as "Keep up to 4 implementers and 2 reviewers running" and
"More than 4 writers or 2 reviewers at once". When the task was taken the file read 8 and 4:

```
$ git log -1 --format=%ci 2f86e573      2026-10-11 21:54:22 +0200   the spec
$ git log -1 --format=%ci e2efdd14      2026-10-11 22:01:45 +0200   ta-3-orchestrator-steps, which wrote 8 and 4
```

`ta-3` wrote in the owner's word of that day, "can we increase the parrallism twofold?" (comment
1533, by `oversight.md` line 439). That word is from before the spec was approved (event 2611),
and the spec's "What only the owner can do" says his approval replaces his numbers with the rule
of part 3. Taken: the rule replaces 8 and 4 as it would have replaced 4 and 2. The other side was
to stop and ask whether the doubling outlives the approval; the approval is the later word, and
his three sentences are kept in step 2 as what the rule replaces.

So the spec's check of R3 did not tell before from after. Run in the worktree at 23:21 CEST (`date` in the same call), on
the file of `85880f72` (`git show 85880f72:.claude/skills/brain-maintenance/SKILL.md`) and on the
file as changed:

```
grep -c                                                              before  after
"A place goes, in this order"                                             0      1    R2, the spec's
"up to 4 implementers\|More than 4 writers"                               0      0    R3, the spec's
"up to 8 implementers\|More than 8 writers\|one of the 8 implementers\|up to eight implementers"
                                                                          4      0    R3, as the file was
```

## What changed in `SKILL.md`

- **The `description` of the skill.** It read "keeps up to eight implementers (each in its own git
  worktree) and four reviewers running". It names no number now.
- **Step 1, a paragraph "Past 4 hours"** (part 4, the orchestrator's half). The orchestrator runs
  `issue-stats.ts --token=<your token>` and reads the line `past 4 h, not started, no reason: <n>`
  and the rows under it. A row that can be started goes before every younger start. One that
  cannot gets one comment, key `orch/<id>/held-1`, body beginning `held:`. What a row is and what
  a reason is are not said again there: the paragraph names the record of `os-3`.
- **Step 2.** The spec's five sentences of part 3, as written, in place of "Keep up to 8
  implementers and 4 reviewers running". The owner's three sentences on numbers (2026-10-10 twice,
  2026-10-11 once) are kept, as what is no longer in force. The counts of the landing lock's
  history that `ta-3` put there are kept. "Each pass, fill the free places from step 3; with none
  free, do the triage rows only" became "In a pass that starts nothing new, the rows of step 3
  that spawn no agent are still done, triage among them".
- **Step 3, the sentence.** "Finishing comes before starting. Among issues on the same row, one
  the owner opened or moved goes first, then the oldest." is replaced by the spec's sentence of
  part 2. Its "(below)" after "an issue past 4 hours" reads `(step 1, "Past 4 hours")`, since the
  list is read in step 1, above. The old sentence is quoted once, as what was.
- **Step 3, the rows.** Five rows moved and none was changed
  (`diff <(grep '^   | ' before | sort) <(grep '^   | ' after | sort)` printed nothing; 21 rows).
  The spec names two. The five, and why the other three:
  - the row of a writer sent back, and the row "A spec sent back": the spec's two;
  - "A dead writer": the row of a writer sent back ends "When it cannot be sent one, the next
    row", and means this one. It covers a writer that died with no `rework` too, which is then
    taken before a review. The other side was to keep it below and name the row in that sentence;
  - "A quick win of your own, sent back": it is an `in-progress` after a `rework`;
  - the row for `spec-review`, to stand under the row for `in-review`: both are "a review that
    waits", and the rows of the digest between them are starts.
- **Step 3, the rows that start.** Step 3 says "take the first that matches", and the row for a
  project at `open` stands above the row for `ready`, where the sentence has "a bug or a task
  before a project or a feature". No place in a table gives the sentence's order: with the
  project's row below `ready`, a project of the owner's at `open` (`worker-machine-on-fly`, the
  case the spec was written for) would be taken after a task of the loop's. That move was made
  here and taken back. In its place three lines after the order say that the rows which start an
  agent (a digest writer, a spec writer, an implementer) are one group, ordered by the sentence
  and not by the table.
- **"A rework round goes to the agent that wrote the change", item 2.** "It is one of the 8
  implementers of step 2 while it runs" reads "While it runs it is the agent on that issue, and a
  writer at work for step 2".
- **"What the loop does not do".** "More than 8 writers or 4 reviewers at once, or two agents on
  one issue" reads "Two agents on one issue. (No number of writers or reviewers is set: step 2.)".

The spec has three notes "(As built, `os-2-order-and-pool`, …)": the rows, the texts replaced, and
the `grep` of R3.

## The tests

`tests/tools/os-2-order-and-pool.test.ts`, 6 tests. Five read `SKILL.md`: the sentence once and in
step 3; the order of the rows by their index in the table; no number as a limit in the procedure
or the description; the five sentences of the pool and the owner's four quotes in step 2; the
paragraph of step 1. The sixth reads `issue-stats.ts` for the two pieces of the line step 1 names.
`SKILL=<file>` reads another copy.

```
$ bun test ./tests/tools/os-2-order-and-pool.test.ts                              6 pass  0 fail
$ SKILL=<SKILL.md of 85880f72> bun test ./tests/tools/os-2-order-and-pool.test.ts   1 pass  5 fail
```

The one that passes on the old file is the sixth, which does not read it.

`tests/tools/briefs-name-the-prompts-token.test.ts` had a test "the limits are 8 and 4, with the
owner's words", of `ta-3`. It held the two texts this task replaces. It now holds that his
sentence is kept and that no limit of that form is stated. With the old `SKILL.md` in place and
the new test file (`git stash` of the one file, before the first commit): 13 pass, 1 fail, the
changed test. As committed: 14 pass, 0 fail.

The count of the whole directory, run after the last edit, is in the issue's comment.

## Prior art

Three searches of the Brain with `semantic=true`, made before the design and again at 23:23 CEST ("order of service free place
resumption review start", "pool size number of writers reviewers rate limit", "issue past 4 hours
held reason") each answered 402, "owner has made 2000 priced calls today, which is the most for
one day", both times. Three by words (`order of service`, `pool writers reviewers`, `held past 4 hours`; `date` after them printed 23:11:18) each
answered the spec itself, `doc:cloud-brain-loop-order-of-service`, and nothing else that bears on
an order or a pool. Used: the spec, and the records of `os-1` and `os-3`.

## Not tried

- **A pass by an orchestrator from the new text.** None was run. Whether an orchestrator reads the
  sentence and the rows as one order, and what it starts when a review and a sent-back round both
  wait, is first seen in the loop's next pass.
- **The `held:` comment on cb4.** No comment was written with the key `orch/<id>/held-1`. The line
  was read once from the main checkout, `bun tools/cloud-brain/issue-stats.ts --token=impl-6cabee`
  at 23:23 CEST (`date` before and after it): `past 4 h, not started, no reason: 0 (8 more are held)`. That a `held:` comment
  moves an issue from the count to the held is `os-3`'s test, not run again as a call here.
- **The two signs that stop a start.** No pass has met a rate limit named in a report, or `lock.sh
  show land` naming one holder for two passes. The text says nothing of how a pass remembers the
  holder of the pass before; an orchestrator has the earlier answer in its context, and after a
  compaction it may not.
- **How many agents the rule gives.** Not measured. The spec's check is the `in-review` line of
  `issue-stats.ts --window <seq of this landing>` once 40 stays are in the window, read by the
  overseer.
- **`agents/overseer.md`.** The spec gives the overseer two things (the median of `in-review`
  after this landing, and a sign for a machine that carries no more writers). Its brief was not
  changed: the task is the three texts of `SKILL.md`.
- **`knowledge/working-with-cloud-brain-remote-lopecode-cluster.md`, line 41**, "triage, one
  implementer, one separate reviewer, an overseer": left. It names the roles on an issue, not a
  size of the pool.
