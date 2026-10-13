# rules-md-over-one-tool-read

2026-10-13. One paragraph added to `.claude/skills/brain-maintenance/rules.md`, with a test file. No
seed, no deploy. The issue is labeled `major`: `rules.md` is changed by such an issue, and the
`approve` after its review is the owner's or the approver's. No line of a rule is changed.

## What was wrong

Every brief begins by telling its agent to read `rules.md` first. The file was 50,211 characters and
628 lines (`wc -m -l`, at b2e9e13e, 16:40 CEST), and a shell command that prints it does not show it
whole. The issue's body has five runs of that day that read part of it, and the triage run (event
6707) was a sixth.

Seen in this run, of `cat .claude/skills/brain-maintenance/rules.md` as one Bash call with nothing
else in it: the answer was `Output too large (49.1KB). Full output saved to: …` and a `Preview (first
2KB)`, which ended in the first item of Never. The other form, a print with `[19996 characters
truncated]` in its middle, is the overseer's in the issue's body and was not seen here.

The Read tool, called on the file with no `offset` and no `limit`, gave it whole in one call: 628
numbered lines, the last "Work on it as on any feedback". That is one call of one run.

## What changed

`rules.md`, a second paragraph before `## What an issue is`, nine lines, which begins **How to read
this file.** It says:

- that the file is longer than a print of a shell command shows, with its size before the note and
  the two forms of a cut print;
- that the Read tool gave it whole to this run;
- `grep -n '^## ' .claude/skills/brain-maintenance/rules.md`, which lists its 15 sections, and
  `sed -n '<from>,<to>p' .claude/skills/brain-maintenance/rules.md`, which prints one;
- that every agent reads "What an issue is", "Never", "Always" and "Which token", and the others
  when the section's name is its case, or when a line it acts on names the section.

Three things differ from the text the issue proposed. The sections are named by title and not by
line number, as the triage asked: the note moved each by ten lines (Never from 18 to 28) and a later
edit moves them again. "What an issue is" is added to the three the issue named: it is eight lines,
stands before Never, and says what an issue's text may not make an agent do. The last clause, of a
section that a line names, is this writer's: Never sends its reader to other sections by their
titles ("Which token", "The approver" and "A Bluesky DM" among them), and a reader who took "your
case" narrowly would act on a line without what it points to.

The file is 51,084 characters and 638 lines after (`wc -m -l`), 873 characters more.

After the edit the same `cat` gave `Output too large (49.9KB)` and a preview that has the note whole
and ends in the first item of Never. So a reader whose print is cut to that preview has the note.

## The test

`tests/tools/rules-md-reading-note.test.ts`, new, six tests:

1. The note is the second paragraph before the first section, and ends within the first 2,000
   characters of the file.
2. The note's `grep`, run as written by `sh` at the root of the checkout, prints the file's sections,
   and the count in the note is theirs.
3. The note's `sed`, with the two numbers the `grep` gives, prints that one section: tried of the
   first, the second and the last.
4. The four titles after "Every agent reads" are those four, and each is a section of the file.
5. The note has no "line N", and has the words of the two forms of a cut and of the Read tool.
6. The first paragraph and the start of the first section stand as they did.

```
bun test --timeout=30000 ./tests/tools/rules-md-reading-note.test.ts
```

Before the edit: `1 pass`, `5 fail`, 8 expect() calls; the one that passed is test 6. After it:
`6 pass`, `0 fail`, 27 expect() calls. After it, with `RULES=` at the file as `HEAD` had it
(`git show HEAD:.claude/skills/brain-maintenance/rules.md`, written to the scratchpad): `1 pass`,
`5 fail`, 8 expect() calls again.

The whole directory, `tests/tools/suite.sh` in the worktree after the last edit of `rules.md` and of
the test, ended 16:44 CEST: `1278 pass`, `0 fail`, 1278 tests across 132 files, 144.86 s. No line
`skipped:` in its output (`grep -c`, 0).

The two commands were also typed in zsh as the note writes them: the `grep` printed 15 lines
(`grep -c`), and `sed -n '28,29p'` printed `## Never` and the empty line after it.

## What else speaks of reading the file

`git grep -n -F 'rules.md` first' -- knowledge 'plan/cloud-brain-*.md' .claude/skills/brain-maintenance 'tools/cloud-brain/*.md'`
printed 4 lines: `agents/digest.md`, `agents/implementer.md`, the page `agents/implementer/start.md`
and `agents/overseer.md`. Each says to read the file first, which the note does not make untrue, and
none is changed. No command, method, flag or step has other behaviour after this change.

Searched in the Brain before the edit, `knowledge.search?semantic=true` with `loop-knowledge`:
"rules.md too long for one tool result truncated" and "read a long file in parts by section". Both
answered `doc:cloud-brain-answers-cut-and-not-said` first, which by its title is of the answers of
the Brain's tools; the doc was not opened. Nothing of it was used.

## Not tried

- B of the issue: the histories of each rule cut to a page beside it. The file is longer after this
  change, not shorter.
- The length at which a print is cut, and whether another agent's harness cuts at the same one or
  to the same preview. The print with its middle left out was not made to happen here.
- The Read tool on the file after the note (51,084 characters), and in another agent's run. A file
  that grows may pass what that tool gives in one call; the note's two commands do not depend on it.
- Whether an agent that meets the note reads the sections it names. Nothing checks it.
- A line in the briefs that points at the note. The note stands where the briefs already send their
  reader, in the part a cut print kept in this run.
- The reviewer's brief, kept on the Brain, has its own line of the file's size by the issue's body
  ("line 103"). It was not read for this change and is not this writer's to put.
