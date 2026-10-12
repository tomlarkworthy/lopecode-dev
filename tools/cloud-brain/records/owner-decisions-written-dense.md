# owner-decisions-written-dense: a rule for what the owner is asked to decide

2026-10-12. A change to `rules.md`, so `major`: the approval is the owner's. No seed, no deploy.

## What was asked

The owner, 2026-10-12, as the body of the issue has it (event 4388, written by the session he said
it to, token `out-5f56b2`). 20:57 CEST, of ten comments the loop had written for him: "They are
unreadable." 21:02 CEST, of the one list that session gave him in their place: "This simple summary
is much better for making decisions so can we please add a rule to write human reviews more in this
dense style."

I did not hear either. Both are copied from the body of the issue, and so are the three items of
the list that the section quotes.

## What was there before

One of the ten comments, read with `issue-as.sh impl-069517 "get?id=tp-3-take-and-done"` on
2026-10-12: event 4060, key `orch/tp-3-take-and-done/decision-1`, a `body` of 2,318 characters
(`len()` of the field in Python; the issue's body says "about 2,600"). Before its choice stand a
hash, two event numbers, what the reviewer ran, five things not shown and what the check left on
cb4. Item 7 of the list he was given is the same decision in 392 characters.

The form that comment follows is in `philosophy.md`, "What `needs-owner` means", read from his words
of 2026-10-11 by the orchestrating session: the project "with its measured numbers", where the issue
fits, each choice "with what is for it and against it", the pick with "the line it takes it by",
"how to answer". `SKILL.md` (Triage) sent the orchestrator there: "The comment is in the form
`philosophy.md` gives."

## What changed

- `.claude/skills/brain-maintenance/rules.md`: a section "What the owner is asked to decide", before
  "Always". His two messages and where they are quoted, then the marker sentence the file uses
  ("The rest of this section is the writer's reading, not his words."), then items 5, 7 and 10 of
  the list as he read them, then ten items of reading: what it holds for, what comes first, live
  and cost, the one flaw, the choices, where the rest goes, the list, a comment a tool reads, beside
  `philosophy.md`, and what is not in his words. "Always" gains one item that names the section.
- `SKILL.md`: the Triage line names the section in place of `philosophy.md`; the line on a `major`
  change's plan names it; step 7 says that what waits for him is told as one list in that form.
- `agents/implementer.md`, step 3, and `agents/overseer.md`, the row "A decision only the owner can
  take": each names the section.
- `tests/tools/owner-decisions-written-dense.test.ts`: 10 tests that read those four files and
  `agents/approver.md`.

Three choices the issue left to the writer, each the smaller side:

| Choice | Taken | Why |
|---|---|---|
| The evidence follows the short part, or stays in the record | It stays in the review, the writer's comment and the record; the comment may end with one line that says where | The reading of line 4 in `philosophy.md`: what he is shown "is short and can be answered in a word". Comment 4060 had it before the choice, and he called that unreadable |
| A cap on the size | None. The section gives the sizes of the three items, 167, 392 and 331 characters, and the 2,318 of comment 4060 | He named no number. A cap would be the writer's |
| The approver's `leave` | Left as it is, and the section says so | `tools/cloud-brain/approver.ts` reads its first line (line 150) and its `why:` line (line 347), and its second line is one sentence already |

## Tests

`bun test ./tests/tools/owner-decisions-written-dense.test.ts`, in the worktree:

| When | Result |
|---|---|
| Before any edit of the four files | `1 pass`, `9 fail`, 18 `expect()` calls. The one that passed tests the file's own helpers |
| After the edits | `10 pass`, `0 fail`, 71 `expect()` calls |

Four changes to the section, each made, run and put back; each gave `9 pass`, `1 fail`:

| Change to `rules.md` | The test that failed |
|---|---|
| A hash put into item 7 | "three items of the list he was given are quoted, and each is a short part by the section's own items" |
| Choice C of item 7 written over two lines | the same |
| "no event number, commit, hash, file path or test count" replaced by "few numbers" | "the reading says what such a comment has, in the order he was given it" |
| The marker sentence taken out | "his words of 20:57 and of 21:02 stand before the one marker, with where they are quoted" |

The whole suite, `tests/tools/suite.sh` in the worktree, is under "The suite at the landing" below.

## Prior art

Three searches of `knowledge.search?semantic=true` with `loop-knowledge`: "comment for the owner to
decide short plain choices", "needs-owner comment form summary choices letter", "list of what waits
for the owner approval". Used: `doc:cloud-brain-dev-philosophy` (the form of 2026-10-11, which the
section stands beside) and `doc:cloud-brain-approver-persona` (the `leave`). Of
`doc:cloud-brain-owner-acts-on-what-waits-for-him` I read only the lines a `grep` for "comment"
printed; nothing of it is used.

## Not done, not tried

- **No comment has been written from the section.** No agent has read it and written a comment for
  the owner, and he has read none. Whether such a comment is one he finds readable is not known.
  Falsified by: a comment written after this landing that he calls unreadable.
- **Nothing checks a comment against the section.** The test holds the text of the rule and that
  the three quoted items meet it. It reads no comment of the tracker.
- **The test's pattern for evidence is crude**: an event number, any four digits, eight or more hex
  digits, a file suffix, a count of tests. A date with its year in a short part would fail it; none
  of the three items has one.
- **`philosophy.md` is not changed.** It is the owner's, and the one edit an agent makes there is
  the orchestrator's, a quote under "Clarifications". Its "What `needs-owner` means" still gives the
  longer order. The section says that it holds where the two differ.
- **`agents/approver.md` is not changed.** Its `leave` is still written "in the form `philosophy.md`
  gives", with "the project: … with its measured numbers" and "what stopped it: … with the event,
  file and line".
- **Four lines of three specs still name the form of `philosophy.md`**:
  `plan/cloud-brain-approver-persona.md` 374 and 806, `plan/cloud-brain-bookkeeping-in-the-tracker.md`
  499, `plan/cloud-brain-dashboard-service.md` 458 (`git grep -n -F 'philosophy.md` gives'`, 6 lines
  before the edit, the other two `SKILL.md` 699 and `agents/approver.md` 165). They are not this
  issue's specs.
- **The list given unasked.** Whether a session gives him the list at a count of waiting issues or
  at an hour is not in his words and is not built. Step 7 of `SKILL.md` already tells him what waits
  after each pass; it now says in what form. No orchestrating session has run that step as changed.
- **No tool of the orchestrator's that writes these comments was found.** `oversight.md` (the entry
  that names comments 3977 to 3983) speaks of "the tool that writes them";
  `git grep -n -F "was put on at event" -- tools .claude` printed that line of `oversight.md` and no
  other, so if there is one it is not tracked, and it is not changed.
