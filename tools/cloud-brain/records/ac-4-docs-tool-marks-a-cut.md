# ac-4-docs-tool-marks-a-cut

2026-10-12. Task 4 of `plan/cloud-brain-answers-cut-and-not-said.md` (R1, "The docs"): a doc whose
text is over 16,000 characters was entered as its first 16,000 with no sign of it. The cut was one
`.slice(0, TEXT)` in `tools/cloud-brain/knowledge-docs.ts`; the service refuses a longer text and
never cut one. No seed changed and nothing was deployed. Times are from `date`, CEST.

## What changed

`tools/cloud-brain/knowledge-docs.ts`:

- A text over `TEXT` (16000) is cut so that it and a last line are 16,000 characters together. Two
  entries as cb4 answered them at 20:28:36, through `knowledge.search?kind=doc&q=<id>` with
  `loop-knowledge` (each `text` 16,000 long, the end of it):

  ```
  …the root `<svg>`, `hit` was 0, and 

  [the first 15775 of 186433 characters of this entry's text. The whole is the file knowledge/svg-editor-architecture.md: https://raw.githubusercontent.com/tomlarkworthy/lopecode-dev/main/knowledge/svg-editor-architecture.md]

  …As long as the spirit of the argument is met that s

  [the first 15820 of 17835 characters of this entry's text. The whole is the file philosophy.md of the repository https://cb4.endpointservices.workers.dev/git/cloud-brain-dev.git]
  ```

  The second form is for the three files of `cloud-brain-dev`, which no address gives.
- The two numbers count the text the tool makes (the topics first, the heading taken out), not the
  file: `git show origin/main:knowledge/svg-editor-architecture.md | wc -c` is 188,337 bytes, the
  line says 186,433 characters. The line does not say that it is not an offset into the file.
- The first number is inside the line whose length it depends on. `marked` starts from the line
  with `0` in it and counts down until part and line fit.
- A doc's line of `status` ends with `cut N of M`, and `, unmarked` when the entry kept does not end
  with the line the tool would put. The last line of `status` gains `cut` and `unmarked`, that of
  `put` gains `cut` (of the docs it put).
- The header says all of this; `knowledge/calling-a-cloud-brain-from-this-checkout.md` calls the
  header the reference. That doc's own paragraph on the two shapes is task 5's and was not written.

Two readings of the spec's "`unmarked`, the cut docs whose entry does not end with the line", taken
by line 2 of `philosophy.md` (the smaller side):

- A cut doc with no entry is `missing` and not `unmarked`. A put enters it with the line.
- An entry that `knowledge.list` answers with no `text` counts as `unmarked`: the tool cannot say
  it ends with the line.

`unmarked` is no part of `--check` and of `put --stale`. An entry is fresh by its file's SHA-256
and `public`, so a later change to the line's words, or to `TEXT`, leaves every cut entry fresh and
unmarked until someone runs `put <name>…`; `status` shows the count and the names.

## Tests

`tests/tools/knowledge-docs.test.ts`. The case "a file over 16,000 characters is sent as its first
16,000" passed on the new tool as it stood (16,000 long, no `THE-END`), so it was replaced, by four
cases named `ac-4: …`:

- 16,001 characters are put as 16,000 that end with the line, the first number is what stands
  before the line, and 16,000 are put as they are;
- topics and a whole of six digits: the second number is the length of the tool's text, the part
  kept is the start of it;
- a cut `philosophy.md` of the submodule names the file and the repository;
- `status` with two entries of 16,000 and no line reads `cut: 2, unmarked: 2` and names both;
  `put --stale` prints `nothing to put`; `put over a` reads `put: 2, cut: 1`; with what was put as
  the entry, `unmarked: 1`; with no `text` in the entry, `unmarked: 1`; with no entry,
  `missing: 1` and not unmarked; a repository with no long doc reads `cut: 0, unmarked: 0`.

```
$ bun test ./tests/tools/knowledge-docs.test.ts                          the new tool
 15 pass  0 fail  117 expect() calls
$ KNOWLEDGE_DOCS_TS=<origin/main's copy> bun test ./tests/tools/knowledge-docs.test.ts
 11 pass  4 fail          the four are the four ac-4 cases
$ tests/tools/suite.sh                                                   after the last edit of tool and test, before 20:28
 660 pass  0 fail  Ran 660 tests across 66 files. [94.84s]
```

## The put on cb4

From the worktree, with `loop-docs` through the tool (the spec: "the one put of the cut docs with
`loop-docs` through the tool"), before the landing, so that this file has what it printed. The tool
that put is the commit that lands unless the rebase changes it.

```
20:28:18  $ BRAIN_BASE=cb4 bun tools/cloud-brain/knowledge-docs.ts status
          {"docs":85,"fresh":85,"stale":0,"missing":0,"cut":43,"unmarked":43,"entriesWithNoFile":[],"source":"origin/main@1b0d0553"}
20:28:20  $ BRAIN_BASE=cb4 bun tools/cloud-brain/knowledge-docs.ts put <the 43 names of the lines that end ", unmarked">
          {"put":43,"public":7,"private":36,"cut":43,"entered":0,"changed":43,"vectors":43,"ms":5255,"source":"origin/main@1b0d0553"}
20:28:27  $ BRAIN_BASE=cb4 bun tools/cloud-brain/knowledge-docs.ts status --check        exit 0
          {"docs":85,"fresh":85,"stale":0,"missing":0,"cut":43,"unmarked":0,"entriesWithNoFile":[],"source":"origin/main@1b0d0553"}
```

43 and not the spec's 39: the spec counted at `5351e624` with 82 docs, this is `1b0d0553` with 85.
Which four are new was not looked at. The shortest whole of the 43 is
`calling-a-cloud-brain-from-this-checkout` (15,742 of 16,977 shown), the longest
`svg-editor-architecture` (15,775 of 186,433). 7 of the 43 are public.

## Not tried, not done

- **The address in a line was not fetched.** From this machine's sandbox `curl` and bun's `fetch`
  both failed on the certificate ("unable to get local issuer certificate", 20:28:42), for two of
  the addresses. The spec's writer fetched one such address the same day. Whether a page of the
  Brain's origin may read it (CORS) is untried, as in the spec.
- **A writer in a worktree behind this change unmarks a doc. Seen once, the same evening.** The
  release of a landing runs the `knowledge-docs.ts` beside its `lock.sh` (`lock.sh` line 171). An
  older copy puts a changed cut doc as its first 16,000 with no line. Between the put above and
  this change's own release, another landing's release entered
  `plan/cloud-brain-answers-cut-and-not-said.md`, changed by `c95a8c56` (on `origin/main`, of
  `ac-3-operator-tools-through-call-answer`); which release it was, was not read:

  ```
  20:33:37  the release of this landing:   docs (cb4): nothing to put
  20:33:46  $ … knowledge-docs.ts status --check
            fresh    private cloud-brain-answers-cut-and-not-said cut 15760 of 32715, unmarked
            {"docs":85,"fresh":85,"stale":0,"missing":0,"cut":43,"unmarked":1,…,"source":"origin/main@cd2f97e8"}
  20:33:56  $ … knowledge-docs.ts put cloud-brain-answers-cut-and-not-said
            {"put":1,"public":0,"private":1,"cut":1,"entered":0,"changed":1,"vectors":1,"ms":1895,…}
  20:33:59  $ … knowledge-docs.ts status --check        exit 0
            {"docs":85,"fresh":85,"stale":0,"missing":0,"cut":43,"unmarked":0,…,"source":"origin/main@cd2f97e8"}
  ```

  It can happen again while a worktree that lands is behind this change, and nothing then puts the
  doc but its next change or a `put <name>` by hand. `unmarked` is what shows it. Not mended here:
  `put --stale` could also pick the unmarked, which the spec does not ask for.
- `knowledge.get` was not called (`loop-docs` and `loop-knowledge` do not name it). The two entries
  above were read through `knowledge.search`.
- A whole so short that its part and line pass a digit boundary (the first number going from five
  digits to four) cannot happen at `TEXT = 16000` and has no test.
- A cut that falls inside a surrogate pair is as before this change: not looked at.
- The search by words now finds the line's words ("first", "characters", "whole", the path) in 43
  entries. No question set was run on it; the spec says the same.
- Whether the operator of the page, in a turn with a model, follows the line to the file.
