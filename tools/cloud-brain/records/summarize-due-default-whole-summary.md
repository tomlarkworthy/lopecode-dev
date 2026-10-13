# summarize-due-default-whole-summary: `knowledge-docs.ts summarize` with no flag puts the first paragraph

**Changed in the tool and seen in its tests, where the agent is a stand-in. Not run on cb4: no agent was started and
no entry of a Brain was put.** Until this change `summarize --due` or `summarize <name>` typed without
`--first-paragraph` put a summary with its five sections, the form with which the search by words no longer found
passages it found before (`records/sd-3-pilot-ten.md`). The long docs of cb4 hold the other form by the owner's
choice (comment 6005 of `sd-4-the-rest-and-the-release-line`).

Written 2026-10-13 by the issue's writer, round 1, token `impl-524c40`, in the worktree `bm-summarize-default`.
No seed, no deploy.

## What changed

| File | Change |
|---|---|
| `tools/cloud-brain/knowledge-docs.ts` | `summarize` leaves the sections out of the entry unless `--whole-summary` is given. `--first-paragraph` is still taken and changes nothing. With both flags: one line on stderr, exit 2, before the state directory is made or an agent started. The header and the two usage lines name the new flag |
| `tests/tools/knowledge-docs-summaries.test.ts` | One test is new (below). Three calls that hold the whole form name `--whole-summary`: the helper `summarized`, the test `summarize <name> --whole-summary: …` and the call of the `--check-summaries` test whose entry then loses a heading |
| `tests/tools/summarize-due-default-whole-summary.test.ts` | New: the header, the usage, the guide, the spec's note and this record's headings |
| `tests/tools/sd-4-the-rest-and-the-release-line.test.ts` | It held the spec's sentence "`summarize --due` with no flag still puts a whole summary"; it holds the sentence as mended |
| `knowledge/calling-a-cloud-brain-from-this-checkout.md` | A line for `--whole-summary` among the commands, and a paragraph that says which form no flag puts and since when |
| `plan/cloud-brain-docs-summarised-for-search.md` | The note "As built, task 4": the sentence above says "put … until" this issue, and names the flag |

The journal's line of a doc has `firstParagraph: true` when the first paragraph was put, as before, and has no such
key for `--whole-summary`. A `--dry` run takes the same form as a run that puts.

`lock.sh` is not changed: the command a release prints keeps `--first-paragraph`, so the line says which form it puts.

## Tests

The new test of `knowledge-docs-summaries.test.ts`, "summarize with no flag puts the first paragraph alone, by --due,
by name and --dry; --whole-summary puts the five sections; the two flags together are exit 2 and start no agent":
with no flag the `--dry` file, the entry after `--due` and the entry after a name begin with the paragraph and the
summary's line and have none of the five headings; after `--whole-summary` the entry has the five; the journal's four
lines read `firstParagraph` true, true, absent, true; `status --check-summaries` exits 0; the two calls with both
flags exit 2 with nothing on stdout and no new start of the agent, call of the Brain or line of the journal.

Run against the tool as it was (`git show HEAD:tools/cloud-brain/knowledge-docs.ts` to a file, named with
`KNOWLEDGE_DOCS_TS`), the file was `13 pass, 1 fail`: the new test, at the `--dry` file, which had 5 headings where 0
were expected. With the change:

```
cd <worktree> && bun test --timeout=30000 ./tests/tools/knowledge-docs-summaries.test.ts ./tests/tools/summarize-due-default-whole-summary.test.ts ./tests/tools/sd-4-the-rest-and-the-release-line.test.ts ./tests/tools/sd-2-one-summarizer.test.ts ./tests/tools/sd-3b-first-paragraph-alone.test.ts ./tests/tools/lock.test.ts
 54 pass, 0 fail, 650 expect() calls, Ran 54 tests across 6 files. [62.98s]
tests/tools/suite.sh
 1156 pass, 0 fail, 9498 expect() calls, Ran 1156 tests across 119 files. [119.97s]
```

## Not tried

- **Nothing on cb4.** No `summarize` was run there with the changed tool, with or without a flag. The 52 long docs
  the issue counts were not read.
- A flag the tool does not know (`--whole`, `--whole-summary=1`, `--sections`): the tool reads no such flag and, as
  before this change, says nothing of it; the run then puts the first paragraph. Not held by a test.
- `--whole-summary` with `--due`, with `--dry` or with `--again`: the test gives it with one name and a run that puts.
- A doc refused twice under one form and run under the other: the refusal is by the file, not by the form, as before.
- `status --check-summaries` on a Brain that holds both forms: `records/sd-3b-first-paragraph-alone.md`, "Not tried", has it.
- Records of earlier issues (`sd-2-one-summarizer.md`, `sd-3-pilot-ten.md`, `sd-4-the-rest-and-the-release-line.md`)
  show `summarize <name>` with no flag as the whole form. They are what was run that day and are left as written.
