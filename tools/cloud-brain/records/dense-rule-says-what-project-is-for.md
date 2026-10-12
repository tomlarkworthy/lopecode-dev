# dense-rule-says-what-project-is-for: the section gains the line of what the project is for

2026-10-12. A change to `rules.md`, so `major`: the approval is the owner's. No seed, no deploy.

## What was asked

`owner-decisions-written-dense` landed a section of `rules.md`, "What the owner is asked to decide".
It left out what the project is for, which his words of 2026-10-11 in `philosophy.md` ask for
("a summary of the overall project goals, and how the decision fits in with pros and cons"). The
orchestrating session put that to him as three choices (comment 4784 of that issue), B being
"Approve, and add one line: what the project is for." His answer, as comment 4884 there has it,
written by the session he said it to (token `out-5f56b2`):

> 1 A 2 B 3 What suggestion is being made? 0.3 minutes is not fast anyway, but whats the extra task 5 has?

I did not hear it. The message, the "before 22:34 CEST" and "this issue was number 2" are copied
from comment 4884, and the choice from comment 4784, both read with
`issue-as.sh impl-11a58b "get?id=owner-decisions-written-dense"` on 2026-10-12.

## What changed

- `.claude/skills/brain-maintenance/rules.md`, the section:
  - His answer and choice B stand in the first paragraph, before the marker sentence ("The rest of
    this section is the writer's reading, not his words.").
  - A new item, "What the project is for.", after "What it is, first." and before "Live, and what
    it costs.".
  - The item "Beside `philosophy.md`" said "The first sentences are that summary and the fit". It
    now says the line of the project is the summary and the first sentences are the fit, and that
    the order of 2026-10-11 puts the project first and is still longer.
  - The item of "Always" that names the section lists the part: "what it is, what its project is for,
    whether it is live, …".
- `.claude/skills/brain-maintenance/SKILL.md`, the Triage line that lists the parts: the same four words.
- `tests/tools/owner-decisions-written-dense.test.ts`: one test more, and one assertion more in
  three others.

Four choices his B does not make, each the writer's:

| Choice | Taken | The other side |
|---|---|---|
| Where the line stands | After the first sentences | First, as the order in `philosophy.md` has it. The head of the item before it is "What it is, first.", and each of the three items he called "much better" opens with the thing |
| What "the project" is | The issue's parent, or the spec it is a task of | A topic of the tracker, or the Cloud Brain as a whole. Neither is in his words |
| An issue of no project | No line; its first sentences say what it is for | A line that says "an issue of its own". This issue is one: it has no parent and no spec |
| What the line may name | The project by its id or title; no path, no number of an event, a commit or a test | "with its measured numbers", as `philosophy.md` has it. The section keeps event numbers and counts out of the short part |

## Tests

`bun test --timeout=30000 ./tests/tools/owner-decisions-written-dense.test.ts`, in the worktree, 2026-10-12:

| When | Result |
|---|---|
| The test edited, the two texts not | `7 pass`, `4 fail`, 67 `expect()` calls |
| After the edits | `11 pass`, `0 fail`, 92 `expect()` calls |

The four that failed before: "the reading says what such a comment has, in the order he was given
it", "his B: one line of what the project is for, after the first sentences", "Always has an item
that names the section", "SKILL.md names the section where it says how a comment for him and the
list are written".

Four changes to the section, each made, run and put back:

| Change to `rules.md` | Result | The test that failed |
|---|---|---|
| The new item moved after "Live, and what it costs." | `10 pass`, `1 fail` | "the reading says what such a comment has…" |
| His answer taken out of the first paragraph | `10 pass`, `1 fail` | "his B: one line of what the project is for…" |
| The sentence of the issue with no project taken out | `10 pass`, `1 fail` | the same |
| "of the project" written into quoted item 5 | `9 pass`, `2 fail` | "three items of the list he was given are quoted…" (the size the section gives), and "his B…" |

The whole suite, `tests/tools/suite.sh` in the worktree after the rebase on `origin/main`: SUITE_LINE

## Prior art

Two searches of `knowledge.search?semantic=true` with `loop-knowledge`: "what the project is for
summary of overall project goals in a decision comment" and "one line saying what a project is for
topic parent spec title". Used: `doc:cloud-brain-dev-philosophy` (the order of 2026-10-11). The
other entries the two printed were not opened.

## Elsewhere

`git grep -n -F 'What the owner is asked to decide' -- knowledge 'plan/cloud-brain-*.md' .claude/skills/brain-maintenance 'tools/cloud-brain/*.md'`
printed 8 lines. Two list the parts of the form and were mended: the "Always" item and the Triage
line of `SKILL.md` (`git grep -n -F 'the one flaw, a line a choice'` outside the records prints
those two). Left as they are:

- `agents/overseer.md`, the row "A decision only the owner can take": "a line a choice, and your
  pick". It names the section and lists two of its parts.
- `agents/implementer.md`, step 3: it names the section and lists none. Where it and the section
  differ on the evidence (review 4777, note 1) is the overseer's, as the issue says.
- `SKILL.md`, step 7: it describes the list and names the section.
- `agents/approver.md`: its `leave` has had a line `the project: <what it is for, in plain words,
  with its measured numbers>` since before this change.

## Not done, not tried

- **No comment has been written with the line.** No agent has read the item and written one, and
  he has read none.
- **Nothing checks a comment against the section**, as before.
- **The three quoted items have no such line.** They are what he read on 2026-10-12, before his B,
  and are not edited; the item says so. The section has no example of the line.
- **A list of several issues of one project.** Whether each repeats the line or the group has it
  once is not said in the section.
- **`philosophy.md` is not changed.** His B is not added under "Clarifications" there: that edit
  and its push are the orchestrating session's.
