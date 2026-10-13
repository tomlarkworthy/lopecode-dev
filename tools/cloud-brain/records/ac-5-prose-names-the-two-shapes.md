# ac-5-prose-names-the-two-shapes

2026-10-13. Task 5 of `plan/cloud-brain-answers-cut-and-not-said.md` (R3, "The prose"), the last of
the spec. Prose in three files and a test that reads them. No seed, no tool and no deploy. Times
are from `date`, CEST.

## What was wrong

`agents/overseer.md` gave `io "sync?after=<seq>"` as "every event since the last oversight". One
answer is 200 events. Read at 04:09:12 with `impl-f07089`, the record at 5676:

```
sync?after=5400             events 5401 to 5600   more: true
sync?after=5600             events 5601 to 5676   more: false
sync?after=5400&limit=500   events 5401 to 5676   more: false
sync?after=5676             no events             more: false
sync?after=999999           no events             more: false, reset: true
```

An overseer that read the first answer alone had 200 of 276 events and nothing in its brief to say
so. The same file and `SKILL.md` gave two calls of `list` with no word of `more`, and the knowledge
page did not say that an answer may be cut.

## What changed

| File | Change |
|---|---|
| `.claude/skills/brain-maintenance/agents/overseer.md`, "Evidence" | The read of `sync`: 200 events an answer, 500 with `&limit=500`, `more: true`, the next call with `after=` the `seq` of the last event, until `more` is `false`; the first two calls above are quoted there. |
| the same, the limits | The count of the overseer's own `opened` events is of "every page" of that read. |
| the same, before a project is opened | `list?kind=project`: 100 issues with no `limit`, `more: true`, `&limit=500`. |
| `.claude/skills/brain-maintenance/SKILL.md`, step 3, "The owner's" | `more: true` and `total` of a `list`; `limit=500` or a narrower filter. |
| `knowledge/calling-a-cloud-brain-from-this-checkout.md` | A section "An answer that was cut, and a list that is not whole": one paragraph on the two shapes, a block with the two lists and the three last lines, and where each was read. The topics of the frontmatter name it. |
| `plan/cloud-brain-answers-cut-and-not-said.md`, "The prose" | A note "As built". |

The lists as cb4 answered them at 04:08:04, the record at 5675, which the prose quotes:

```
list?limit=100               100 issues   total 460   more: true
list?limit=500               460 issues   total 460   more: false
list?label=owner&limit=100    33 issues   total 33    more: false
list?kind=project             13 issues   total 13    more: false
sync?after=0                 events 1 to 200   more: true
sync?after=0&limit=500       events 1 to 500   more: true
```

Two things the spec does not say, and what was taken:

- **Where the paragraph stands in the knowledge page.** The page is itself a cut doc. Its entry, read
  at 04:09:12 through `knowledge.search?kind=doc&q=doc:calling-a-cloud-brain-from-this-checkout` with
  `loop-knowledge`, ended `[the first 15727 of 26628 characters of this entry's text. The whole is the
  file docs/lopecode-dev/knowledge/calling-a-cloud-brain-from-this-checkout.md in this Brain's
  brain-static: static.get?path=…]`. A paragraph at the end of the page would not be in the entry.
  The section is before "Why did that happen: the logs", and the test holds it under 15,000
  characters of the file. The other place was inside "The knowledge docs in the Brain's search",
  beside the line of a cut doc; that section starts past the cut.
- **The other calls of `list` in `SKILL.md`** (`list?label=post-mortem&limit=100` three times,
  `list?label=asks-orchestrator`). The spec names step 3, "The owner's". The sentence there is of
  "the answer of a `list`", so it is not written again at the others.

## The test

`tests/tools/ac-5-prose-names-the-two-shapes.test.ts`, 7 tests. It reads the three files, and holds
the numbers they give to the two rows of the reference in `tools/cloud-brain/brain-issues.ojs`, the
mark to what `tools/cloud-brain/cut.ts` returns, and the two other last lines to
`cloud-brain.ojs` and `knowledge-docs.ts`. It calls nothing on cb4.

```
bun test --timeout=30000 ./tests/tools/ac-5-prose-names-the-two-shapes.test.ts     7 pass, 0 fail, 43 expect() calls
the same with OVERSEER=, SKILL= and CALLING= the three files of c4b9cfc6           1 pass, 6 fail
OVERSEER= alone   4 pass, 3 fail      SKILL= alone   6 pass, 1 fail      CALLING= alone   5 pass, 2 fail
tests/tools/suite.sh, ended 04:17:36                                                1026 pass, 0 fail, 105 files
bash scripts/check-learnings-triggers.sh                                            0 error(s)
```

The one that passes on the old files reads the seed alone. The spec's own check,
`grep -n "more" .claude/skills/brain-maintenance/agents/overseer.md`, printed lines 19 to 22 at the
read of `sync` and lines 91 and 92 at the list, with two lines where "more" is a word of the prose.

## Searches

- The Brain, before the edit, `knowledge.search?semantic=true` with `loop-knowledge`: "an answer
  that was cut says so more true next page" and "issue.sync 200 events limit 500 after seq". The
  first answered the spec itself and `doc:reading-a-list-from-a-paged-web-api`, which is of a web
  API read from a notebook and was not used. Nothing else bore on it.
- `git grep -n -F 'sync?after' -- knowledge 'plan/cloud-brain-*.md' .claude/skills/brain-maintenance 'tools/cloud-brain/*.md'`
  and the same for `"list?`. No behaviour changed, so no line was made untrue. Of the lines read,
  `SKILL.md` on the watch and `agents/implementer/submit-and-wait.md` on `issue-wait.sh` say that a
  tool reads `sync?after=`; the spec has both tools paging already, and neither file was changed.

## Not tried

- No overseer has run from the changed brief. That an agent pages when it reads the sentence is
  not shown.
- `issue.queue` and `issue.runs` were not called. The knowledge page says they have a `more` by
  their rows of the reference.
- The line of `callAnswer` is the one a test of the seed expects. It was not read in the page, and
  neither was a line of `cloud-brain-dev/test.ts`, of which the page says what its source has; `cut.ts` was run with a text of 1,421 characters.
- A cut doc's last line was read for two docs, this page and `doc:svg-editor-architecture`.
- The entry of the knowledge page as the landing's release puts it was not read before this file
  was written: that the new section is inside the entry's 16,000 characters is held by the test's
  bound on the file, and the tool makes the entry's text from the file with the topics first.
- The reviewer's brief and the spec writer's (`agents/spec.md`, step 2, `ia "list?parent=<id>"`)
  say nothing of `more`. The spec does not name them and they were not changed.
