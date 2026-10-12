# knowledge-docs-put-stale-skips-unmarked

2026-10-12. A local tool and its test file; no seed changed and nothing was deployed. Times are
from `date`, CEST.

## What was wrong

`knowledge-docs.ts put --stale` picked a doc by `state !== "fresh"`, and an entry is fresh by its
file's SHA-256 and `public`. A doc over 16,000 characters whose entry holds the first 16,000 with
no last line is therefore fresh, and `status` reads it `fresh … cut N of M, unmarked`. The release
of a landing runs `put --stale`, so nothing put such a doc again but its next change or a put by
name. The case that was seen is in `records/ac-4-docs-tool-marks-a-cut.md`, "Not tried, not done":
a release from a worktree with the tool of before `a3e883dc` entered
`plan/cloud-brain-answers-cut-and-not-said.md` with no line, and that writer put it by name at
20:33:56. Which release it was is still not known.

## What changed

`tools/cloud-brain/knowledge-docs.ts`:

- `put --stale` picks `state !== "fresh" || unmarked`. `unmarked` is what `status` counts, the
  same value of the same row: a cut doc that has an entry whose `text` is not a string that ends
  with the line the tool would put. So an entry answered with no `text` is put too.
- The last line of `put` gains `unmarked`, the unmarked among the docs it put, for all three ways
  to pick, counted as `status` counts them. It is not the count of the docs put for that reason
  alone: a cut doc whose file changed is stale and is counted too, since its entry ends with the
  line of the older text ("The first landing", below, where this was met).
- The header says both.

`put <name>…`, `put --all` and `status --check` pick and exit as before; `--check` does not exit 1
for an unmarked doc (the issue does not ask for it).

The other side, not taken: put an unmarked doc only when the entry's `text` is a string, so that
a `knowledge.list` with no `text` in its entries could not make every release put every cut doc.
Then `status` would count a doc that `put --stale` leaves, which is the defect of this issue
again in one case. What the side taken costs if `knowledge.list` ever answers no `text`: each
release puts every cut doc, 44 on cb4 today, and its line shows it (`"unmarked":44`). Whether the
service then makes 44 vectors for texts that did not change was not tried.

Docs: `knowledge/calling-a-cloud-brain-from-this-checkout.md` gains a paragraph under "By hand";
`plan/cloud-brain-answers-cut-and-not-said.md` ("The docs") keeps its sentence and gains "(As
built, …)".

## Tests

`tests/tools/knowledge-docs.test.ts`, four new cases. Each step is a run of the tool against the
fake `brain.ts` of that file:

- "put --stale also puts a fresh doc whose entry is unmarked, and its last line counts them": two
  entries of 16,000 characters and no line, six short docs fresh: `put --stale` reads
  `put: 2, cut: 2, unmarked: 2`, sends those two ids and no other, each text 16,000 long and
  ending with the line. With what was sent as the entries, `status` reads
  `fresh: 8, cut: 2, unmarked: 0`, and the next `put --stale` prints `nothing to put` and sends
  nothing.
- "put --stale: an entry with another line, with no text or with a text that is no string is put;
  a missing cut doc is not counted unmarked": an entry that ends with a line of other numbers, one
  with no `text`, one whose `text` is the number 7: each `put: 1, unmarked: 1`. A cut doc with no
  entry: `put: 1, cut: 1, unmarked: 0`.
- "put --stale puts a stale short doc beside an unmarked one; put <name> and put --all pick as
  before and count the same way": `put a` reads `unmarked: 0`, `put over` of an unmarked entry
  `unmarked: 1`, `put --stale` with a stale short doc and one unmarked `put: 2, cut: 1, unmarked: 1`,
  `put --all` `put: 8, cut: 2, unmarked: 1`.
- "a cut doc whose file changed is stale, its entry ends with the line of the older text, and put
  counts it unmarked too": added with the second commit ("The first landing", below).

The case of `ac-4` that held `put --stale` to `nothing to put` beside two unmarked entries lost
that one assertion; the rest of it is as it was.

```
$ bun test ./tests/tools/knowledge-docs.test.ts                                  three runs from 21:12:18, the new tool
 19 pass  0 fail  145 expect() calls                                             each of the three
$ KNOWLEDGE_DOCS_TS=<origin/main:tools/cloud-brain/knowledge-docs.ts at d463404e> bun test ./tests/tools/knowledge-docs.test.ts
 15 pass  4 fail      the four new cases
$ tests/tools/suite.sh                                                           21:15:12 to 21:18:00
 678 pass  0 fail  Ran 678 tests across 67 files. [168.80s]
```

The first new case fails on the old tool at its first `put --stale`
(`SyntaxError: JSON Parse error: Unexpected identifier "nothing"`: the old tool printed
`nothing to put`), the other three at the first `unmarked` they read in a last line of `put`, which
the old tool does not print. So only the first fails for the pick itself; the three hold the count.
The suite was run after the last edit of the tool, the tests and the two docs; this file was edited
after it.

The four were one case at the first commit (16 pass, 138 expect() calls at 21:03:55; suite 675
pass, 0 fail, 21:02:06 to 21:03:55). With one more step it took over the 5 s that `bun test` gives a
case with no `--timeout` (the suite gives 30 s): at 21:05:48 and again at 21:09:57 the file read
`1 fail` with the case at `[5002.85ms]` and `[5003.01ms]`, a `put --stale` killed mid-run. It was
cut into four, each with a repository of its own.

## On cb4

From the worktree, with `loop-docs` through the changed tool:

```
21:00:35  $ BRAIN_BASE=cb4 bun tools/cloud-brain/knowledge-docs.ts status        (before the change to the tool)
          {"docs":86,"fresh":86,"stale":0,"missing":0,"cut":44,"unmarked":0,"entriesWithNoFile":[],"source":"origin/main@d463404e"}
21:01:57  $ BRAIN_BASE=cb4 bun tools/cloud-brain/knowledge-docs.ts put --stale   (the changed tool)   exit 0
          nothing to put
```

`unmarked: 0` with 44 cut docs says that `knowledge.list` answers `text` for those 44 entries, and
the second run says the changed `put --stale` puts none of them when none is unmarked.

## The first landing, and what its release printed

The first commit of this change was pushed under the lock (taken 21:04:53, released 21:05:09).
It changed two docs, both over 16,000 characters, and the release ran the changed tool:

```
21:05:09  docs (cb4): {"put":2,"public":0,"private":2,"cut":2,"unmarked":2,"entered":0,"changed":2,"vectors":2,"ms":2253,"source":"origin/main@73ad331f"}
21:05:40  $ BRAIN_BASE=cb4 bun tools/cloud-brain/knowledge-docs.ts status --check        exit 0
          fresh    private calling-a-cloud-brain-from-this-checkout cut 15742 of 17375
          fresh    private cloud-brain-answers-cut-and-not-said cut 15760 of 32875
          {"docs":86,"fresh":86,"stale":0,"missing":0,"cut":44,"unmarked":0,"entriesWithNoFile":[],"source":"origin/main@73ad331f"}
```

`"unmarked":2` there is of two stale docs, not of two fresh ones. The record as first landed said
that the count "says why a doc with no new commit was put", and the calling doc "how many of the
docs it put were such"; neither holds for a changed cut doc. Both sentences and the header were
mended in a second commit, with one more case of the test: `over.md` changed and pushed, its entry
ending with the older line, reads `stale: 1, unmarked: 1` in `status` and `put: 1, unmarked: 1` in
`put --stale`. A count of the docs put only for being unmarked (fresh and unmarked) was the other
side; it would give `put` an `unmarked` that differs from the one of `status` for the same rows.

## Not tried

- **The changed tool has put no fresh unmarked doc on cb4.** None was unmarked at 21:00:35, and
  the two of the release at 21:05:09 were stale. The put of a fresh unmarked entry is the fake's
  only; that cb4 changes an entry whose `sha256` is the one it has is seen in `ac-4`'s put by
  name (`"changed":1`), not in a run of this change.
- A `knowledge.list` on cb4 that answers no `text` (above).
- `lock.sh release land` was not run with an unmarked doc behind it; what a release prints then
  is the tool's last line, by `lock.sh` as read, not as seen.
- A worktree behind this change still runs the older `put --stale` at its release. It can still
  enter a doc unmarked when behind `a3e883dc`; the next release from a worktree that has this
  change puts it. Which copy of the tool a release runs is not changed (the issue: not asked).
- `plan/cloud-brain-docs-summarised-for-search.md`, "What `ac-4` left", says that after its task 4
  `unmarked` counts only the long docs with no summary yet. `put --stale` then puts by that
  count. Nothing of that design is built, and its text was not changed here.
