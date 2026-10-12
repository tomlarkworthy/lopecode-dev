# dense-rule-project-line-first: the line of what the project is for stands first

2026-10-12. A change to `rules.md`, so `major`. No seed, no deploy: nothing on cb4 runs it.

## What was asked

`dense-rule-says-what-project-is-for` landed the item "What the project is for." in the section
"What the owner is asked to decide" of `rules.md`, after the item "What it is, first.". The
orchestrating session put that to the owner with three choices (comment 4964 of that issue), B being
"Approve, with the line first, before what the thing is." His answer, as comment 5025 there has it,
written by the session he said it to (token `out-5f56b2`):

> B but I am so fucking tired of tired of this endless set of approvals about basically the same thing

I did not hear it. The message and the choice are copied from comments 5025 and 4964, read with
`issue-as.sh impl-485778 "get?id=dense-rule-says-what-project-is-for"` on 2026-10-12. The `at` of
comment 5025 is 23:04:42 CEST, which is where "before 23:05 CEST" in the section is from; when he
said it is not in the record.

The issue says he is not asked again. No comment with letters was written on it.

## What changed

- `.claude/skills/brain-maintenance/rules.md`, the section:
  - The item "What the project is for." stands before the item of what the thing is. Its words
    "One line, after those sentences" are now "One line, first, before the sentences of what the
    thing is", and its last parenthesis names both of his Bs and both issues.
  - The other item's head was "What it is, first." and is "What it is.". Its text is as it was.
  - His answer and choice B of comment 4964 stand in the first paragraph, before the marker
    sentence.
  - The item "Beside `philosophy.md`": "the first sentences are the fit" is "the sentences of what
    it is are the fit", and the order of 2026-10-11 "puts the project first, as this section does
    since his second B, and is longer".
- The two places outside the section that list the parts in order, the item of "Always" in
  `rules.md` and the Triage line of `SKILL.md`: "what it is, what its project is for" is "what its
  project is for, what it is".
- `tests/tools/owner-decisions-written-dense.test.ts`: the list of heads in the new order, the new
  head, his answer and the choice before the marker, the item's new words and the absence of the
  old ones, and the two lists in the new order.

Readings of mine, each the smaller one I saw. The issue names the first two mends; the rest it
does not:

| What | Taken | The other side |
|---|---|---|
| The head of the other item | "What it is." | A head that says where it stands ("What it is, second."). The order of the items already says it |
| His answer in the section | Quoted in the first paragraph, in the prose | Left out, with the issue's body as the only place. The file's first lines say a change to it is his word "quoted here with its date" |
| The two lists of the parts | Put in the new order | Left as they were. Each recites the parts in the order a comment has them, so each would have said the old order |
| "Beside `philosophy.md`" | Two clauses mended | Left. "puts the project first" was written as a difference from this section, and is none now |
| An issue of no project | As before: no line, and "its first sentences say what it is for" | Not touched by his B |

## Tests

`bun test --timeout=30000 ./tests/tools/owner-decisions-written-dense.test.ts`, in the worktree,
2026-10-12:

| When | Result |
|---|---|
| The test edited, the two texts not | `7 pass`, `4 fail`, 64 `expect()` calls |
| After the edits | `11 pass`, `0 fail`, 100 `expect()` calls |

The four that failed before: "the reading says what such a comment has, in the order it has them",
"his two Bs: one line of what the project is for, and it stands first", "Always has an item that
names the section", "SKILL.md names the section where it says how a comment for him and the list
are written".

Five changes to `rules.md` as edited, each made, run and put back from a kept copy (`cmp` after the
last: the same bytes):

| Change | Result | The tests that failed |
|---|---|---|
| The two items in the order they had, with the new heads | `9 pass`, `2 fail` | "the reading says…", "his two Bs…" |
| "One line, after those sentences:" put back | `10 pass`, `1 fail` | "his two Bs…" |
| The head "What it is, first." put back | `9 pass`, `2 fail` | "the reading says…", "his two Bs…" |
| His answer of comment 5025 taken out of the first paragraph | `10 pass`, `1 fail` | "his two Bs…" |
| The item of "Always" in the old order | `10 pass`, `1 fail` | "Always has an item that names the section" |

The sentence of "Beside `philosophy.md`" was mended after those five; the test file was run again
after it: `11 pass`, `0 fail`.

The whole suite, `tests/tools/suite.sh` in the worktree after the rebase on `origin/main` (which
brought in 16 files, none of them one of the three changed here), started 23:09:36 CEST (`date`, load 8.92), with the
texts as committed and this file complete but for this sentence: `790 pass`, `0 fail`,
`Ran 790 tests across 84 files`, and no line that begins `skipped:`.

## Prior art

Two searches of `knowledge.search?semantic=true` with `loop-knowledge`: "decision comment for the
owner project line first" and "order of items in a needs-owner comment what the project is for".
Used: `doc:cloud-brain-dev-philosophy`, whose order of 2026-10-11 begins "what the project is for,
in plain words with its measured numbers". The other entries the two printed were not opened.

## Elsewhere

`git grep -n -F 'What the owner is asked to decide' -- knowledge 'plan/cloud-brain-*.md' .claude/skills/brain-maintenance 'tools/cloud-brain/*.md'`
printed 12 lines before this file was written. `git grep -n -F -e 'what its project is for' -e 'What it is, first' -e 'after those sentences' -e 'after the opening sentences' -e 'after the first sentences'`
over the same paths and `tests` printed 10: the two lists mended here, four of the test, and four
of the record of `dense-rule-says-what-project-is-for`. Left as they are:

- That record. It says what landed then, and its lines are true of that commit.
- `agents/overseer.md`, the row "A decision only the owner can take": it lists "a line a choice,
  and your pick" and neither of the two parts moved here.
- `agents/approver.md`: its `leave` has `the project:` before `this issue:`, the order this change
  gives the section.

## Not done, not tried

- **No comment has been written with the line first.** No agent has read the section as it now is
  and written one, and he has read none.
- **Nothing checks a comment against the section**, as before.
- **The three quoted items are not edited.** They are what he read before either B and none has a
  line of a project; the section still has no example of the line.
- **A list of several issues of one project**: whether each repeats the line is still not said.
- **`philosophy.md` is not changed.** His B is not added under "Clarifications" there: that edit
  and its push are the orchestrating session's.
- **The approval.** The issue is `major`; this change is on `main` when landed and the `approve`
  move is not mine.
