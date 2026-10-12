# post-mortem-actions-prefer-guards: a post mortem's action names what holds it, and a guard is taken before a sentence

Written 2026-10-12 by a writer of the loop (`impl-7517b8`, `start` at event 5004). No deploy: two
texts the loop follows, a note in the spec, and two test files.

## What was asked

The owner, 2026-10-12, as the issue's body (event 4978) and its comment 4983 quote him, each whole:

> would this cover deterministic rule changes or workflow changes, not jsut agent prmpt tweaking, generally fixes are better as guards.

> Also if the cause cannot be determined the action would be to increase observability in the problem area

Both came to this writer through a session's quote, not from him. What is built is a reading of them.

## What changed

- `.claude/skills/brain-maintenance/agents/implementer.md`, "A post mortem":
  - The trace has two more items. One names a guard of the installed policy, a state or a move of a
    workflow, a refusal of a service or a tool, and a test as things a change can be made to. The
    other: a trace that reaches no cause writes "Not found" under `## The root cause`, with the step
    where it stopped.
  - "The next actions" has two more items. "A guard before a sentence": the actions are one table
    with a column `Held by`, whose cell starts with `guard`, `workflow`, `refusal`, `test`,
    `observability` or `text`; the first that can hold the cause is taken; a `text` cell goes on
    with why none of the first four can. And: a trace that reached no cause has an `observability`
    action and no "None".
  - A paragraph after the four questions, for the writer's own read of its table.
- `SKILL.md`, "A post mortem", "The actions are filed at `done`": the column, and that a `guard` or
  a `workflow` row is opened `major`.
- `plan/cloud-brain-post-mortems-declared-and-kept.md`: two "As built" notes, in parts 2 and 5. The
  approved sentences stand, the four questions of part 6 among them.
- `tests/tools/post-mortems.test.ts`: the form test of every post mortem now reads the first table
  under `## Next actions`. This is the part of the change that is not a sentence.
- `tests/tools/post-mortem-actions-prefer-guards.test.ts`: the lines of the three texts, and that
  the form test's list of kinds is the brief's, in its order.

## What the form test refuses, and what it does not

```
the table of `## Next actions` has no column `Held by`
`## Next actions` has no table of actions and no "None"
the table of `## Next actions` has no action
<action>: `Held by` starts with none of guard, workflow, refusal, test, observability, text
<action>: `Held by` is text and does not say why no guard, workflow, refusal or test can hold the cause
```

Run on the two post mortems of the directory under other names (`POST_MORTEMS_DIR`, copies named
`pm-first-as-a-later-one.md` and `pm-second-as-a-later-one.md`), it gave the first line for each:
neither has the column. Under their own names they pass, because the test does not ask the column
of three files, by name: the two on `main`, and `pm-agent-request-not-seen-fly-idle.md`, which the
issue's body says was being written under the instructions as they were. That third file was not
on `origin/main` when this was written, and was not read.

Not held by the test, and left to the reviewer of a post mortem:

- That the kind named is the kind the action is.
- That a `text` cell's reason is true. The test asks only that a letter or a digit follows the word.
- That a file with "Not found" has an `observability` row. The test does not read `## The root cause`.
- A file with no table passes when the word "None" stands anywhere under the heading, so "None of
  these is done here" over a list of actions in prose would pass.

## Choices made, and by what

- **An observability action counts among the 3.** Comment 4983: "Whether an observability action
  counts among the three is not in his words." Taken by `philosophy.md`, line 2 (the smaller side,
  easier to undo): the overseer's limit is not changed.
- **The three earlier files are not rewritten and not asked.** Two are records of what was filed; a
  third had a writer. The cost: the list in the test is three names that stay.
- **The four questions are not changed.** `tests/tools/pm-2-brief-and-procedure.test.ts` reads them
  from the approved spec and asks the brief for the same lines. What question 3 should read of the
  column is comment 5009 on `pm-3-reviewer-brief`, whose writer puts the reviewer's brief.
- **A guard's cost is written in its row and is not a reason for text.** A change to the installed
  policy is the owner's install, so such an action is `major`. The issue's body: "a cost of a guard
  the spec should weigh, not a reason against it."
- **A column, held by a test, and not only a paragraph.** The issue asks that an action be a thing
  that decides without an agent's judgment where one can hold the cause. A test of the file's form
  can hold that each action names its kind and that a sentence is argued. Nothing in a file or the
  record says whether a guard could have held a cause, so that part is a sentence and a question
  for the reviewer.

## Counts

Each run in the worktree on 2026-10-12, after the last edit of a file a test reads.

| Command | Result |
|---|---|
| `bun test --timeout=30000 ./tests/tools/post-mortem-actions-prefer-guards.test.ts ./tests/tools/post-mortems.test.ts ./tests/tools/pm-2-brief-and-procedure.test.ts ./tests/tools/pm-1-file-and-search.test.ts` | 20 pass, 0 fail, 4 files |
| The first of those files with `BRIEF`, `SKILL`, `SPEC` and `FORM` as `git show 9109a9d9:<path>` wrote them | 0 pass, 4 fail |
| `tests/tools/suite.sh`, started 23:02 CEST at load 8.09 (`uptime`) | 773 pass, 0 fail, 82 files, 187.67 s |

`post-mortems.test.ts` had 4 tests before and has 6.

## Not tried

- No post mortem was written under the new section. The first to be will show whether a writer
  finds a guard where the first two found texts, and whether the table's six words are enough.
- The reviewer's brief was not changed, so no review yet reads a `text` cell's reason.
- Whether this holds for every fix of the loop and not only a post mortem's actions: the issue's
  body marks that as not his words, and nothing here reaches it.
- `tools/cloud-brain/issue-stats.ts` and the page do not read the column.
