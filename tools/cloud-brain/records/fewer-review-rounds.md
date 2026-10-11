# fewer-review-rounds: what holds a change, a note the reviewer mends, a list the implementer reads

2026-10-11. The owner: "Seems like the real performance improvement would be reduce review rounds, and less
pendantic reviewers (I put this in an issue)". Of six suggestions made to him: "Lets do  1,2,3". The issue he
means is `record-checked-by-review-alone`; his words on its approve move, event 2099: "Reviewers should not be
padenatic about world measurements, only functional quality, not background information."

## What was counted first

From `issue.sync`, every event to 2026-10-11 about 21:00 CEST, with a script in the session's scratchpad that is
not kept:

```
94 issues with a pass     reviews to the pass: 1 for 51, 2 for 26, 3 for 14, 4 for 2, 5 for 1; mean 1.68
68 reviews of `changes`   144 numbered findings, median 2 a review
spend of the 198 cost comments with a usage, at fitted prices: $846, of which $254 on a role's later runs
```

The findings were sorted by keyword in their first 400 characters, not read: about 76 name a record, a README,
a sentence or a source; 28 an empty value, an exit or a refusal; 6 a wrong behaviour. One finding can be in
more than one, and most of the 144 were not read by anyone for this. The four issues of the session that wrote
this had 13 findings, read: 3 were of behaviour (a merge commit read as no file, a Skill row and a task's
notification each taken for a prompt).

## What changed

1. **The reviewer's brief** on the Brain (`/static/cloud-brain-dev/roles/reviewer.md`, sha256 `6df0e7e0af96…`,
   18,263 bytes; the one before is kept by `put.sh --history`). A new section, "What holds a change, and what is
   a note": six things hold a change (`changes`); anything else is a note, and a review with notes alone is
   `pass`. It replaces "A defect you would fix yourself in a minute is still `changes`".
2. **The same section**: a note in a document of the change (a record, a README, a `knowledge/` or `plan/`
   file) the reviewer mends itself, under the landing lock, in a commit of its own named in the review. Not
   code, a test, a seed, a brief or `rules.md`; not a file another is changing; not `cloud-brain-dev`, which it
   has no token to push. "You change no source" became "no code, no test and no seed".
3. **The implementer's brief**, before step 12: eight things to read the change for before the submit, taken
   from what reviews sent back.
4. `SKILL.md` step 5: a reviewer's commit needs no review and no move.

## Not done, not tried

- No review has been made under the new brief; the review of this issue is the first. Whether rounds fall is
  to be read from the tracker later (reviews to the pass, as counted above), and one issue will not say.
- No reviewer has mended a note. The reviewer's token reached `lock.sh take land` (exit 1, held by
  `dsv-4-cost-on-cb4`, 21:12 CEST); a take that it won, a commit and a push by it were not run.
- What a note costs when it is wrong and nobody mends it was not weighed. What to watch: tickets `seen-…` and
  bugs opened against an issue after its pass.
- `rc-3-record-only-count` carries text for step 7 of the same brief (a number of the world, background). It
  was not merged with this; its writer was told on that issue that the brief changed.
- There is no test: the change is the wording of two briefs. `bun test ./tests/tools` after it: 304 pass, 0 fail.
- The spec writer's brief has no such list. Suggestions 4 to 6 (a later round that reads the delta, a cap on
  rounds, changes that skip review) were not asked for.
