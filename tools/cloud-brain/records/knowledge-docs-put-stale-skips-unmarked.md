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
  to pick. A release that prints `docs (cb4): {"put":1,…,"unmarked":1,…}` then says why a doc
  with no new commit was put.
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

`tests/tools/knowledge-docs.test.ts`, one new case, "put --stale also puts a fresh doc whose entry
is unmarked, and its last line counts them". Each step is a run of the tool against the fake
`brain.ts` of that file:

- two entries of 16,000 characters and no line, six short docs fresh: `put --stale` reads
  `put: 2, cut: 2, unmarked: 2`, sends those two ids and no other, each text 16,000 long and
  ending with the line;
- with what was sent as the entries: `status` reads `fresh: 8, cut: 2, unmarked: 0`, the next
  `put --stale` prints `nothing to put` and sends nothing;
- an entry that ends with a line of other numbers, one with no `text`, one whose `text` is the
  number 7: each is put, `put: 1, unmarked: 1`;
- a stale short doc beside an unmarked one: `put: 2, cut: 1, unmarked: 1`; a cut doc with no
  entry: `put: 1, cut: 1, unmarked: 0`;
- `put a` reads `unmarked: 0` and `put --all` reads `put: 8, cut: 2, unmarked: 1`.

The case of `ac-4` that held `put --stale` to `nothing to put` beside two unmarked entries lost
that one assertion; the rest of it is as it was.

```
$ bun test ./tests/tools/knowledge-docs.test.ts                                  21:03:55, the new tool
 16 pass  0 fail  138 expect() calls
$ KNOWLEDGE_DOCS_TS=<origin/main:tools/cloud-brain/knowledge-docs.ts, d463404e> bun test ./tests/tools/knowledge-docs.test.ts
 15 pass  1 fail      the new case: SyntaxError: JSON Parse error: Unexpected identifier "nothing"
$ tests/tools/suite.sh                                                           21:02:06 to 21:03:55
 675 pass  0 fail  Ran 675 tests across 67 files. [109.14s]
```

The fail of the second run is the first `put --stale` of the case: the old tool printed
`nothing to put`, which is no JSON. The suite was run after the last edit of the tool, the test and
the two docs, and before this file was written.

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

## Not tried

- **The changed tool has put no unmarked doc on cb4.** None was unmarked at 21:00:35. The put of
  an unmarked entry is the fake's only; that cb4 changes an entry whose `sha256` is the one it
  has is seen in `ac-4`'s put by name (`"changed":1`), not in a run of this change.
- A `knowledge.list` on cb4 that answers no `text` (above).
- `lock.sh release land` was not run with an unmarked doc behind it; what a release prints then
  is the tool's last line, by `lock.sh` as read, not as seen.
- A worktree behind this change still runs the older `put --stale` at its release. It can still
  enter a doc unmarked when behind `a3e883dc`; the next release from a worktree that has this
  change puts it. Which copy of the tool a release runs is not changed (the issue: not asked).
- `plan/cloud-brain-docs-summarised-for-search.md`, "What `ac-4` left", says that after its task 4
  `unmarked` counts only the long docs with no summary yet. `put --stale` then puts by that
  count. Nothing of that design is built, and its text was not changed here.
