# rules-md-own-files-says-policy-cell

Written 2026-10-13 by the writer of the issue (token `impl-5529a8`). The item "Its own files" of
"The approver" in `.claude/skills/brain-maintenance/rules.md` said the tool refuses a commit that
touches a policy cell of `brain-issues.ojs`. Since `approver-policy-mark-takes-every-route`
(2026-10-13) the tool reads two of those cells, `issuesApp` and `issuesLimits`, by their policy
parts. The item now says which parts. A doc and its test: `approver.ts` and the approver's brief
were read and not changed, and nothing was built, deployed or called on cb4 but the tracker.

## What was wrong

The overseer opened the issue (event 6774). The item read:

```
- **Its own files.** The approver approves no change to `agents/approver.md`,
  `tools/cloud-brain/approver.ts`, `tests/tools/approver.test.ts`, a
  `plan/cloud-brain-issues-policy-*.json` or a policy cell of `brain-issues.ojs`: the tool refuses
  an issue of which a commit touches one, and such an issue is the owner's.
```

A reader of that sentence expects a commit that changes `issuesApp` anywhere to be refused. The
tool's own test has the counter case on the seed of the checkout
(`tests/tools/approver.test.ts`, "issuesApp and issuesLimits are marked by their policy parts"): a
read route changed beside its guard answers `[]` from `policyCells`.

## The issue's text against the tool

The issue proposed a sentence and said its words were "from the writer's comment 6449 and the
record, not from the code". The triage (event 6785) asked that they be checked against
`policyCells` before they were written. Read in `tools/cloud-brain/approver.ts` of the worktree,
the comment above `appParts` (lines 212 to 227) and `policyCells` with its comment (lines 271 to
316):

| The proposed text | The tool | Taken |
|---|---|---|
| "every declaration and every route that takes a POST, the routes `policy` and `sync`" | the same three, each whole | as proposed |
| "a statement that asks a guard, names `app` or sets a declaration" | the same, and only "in the routes that are left, each a GET" | with "in a route that is left, each a GET" |
| nothing | "each statement that is no declaration and no route, whole" (`return app`, an `app.use`, the loop that makes the write routes, a route whose path has a pattern) | added |
| "the limits those read" | the entries "that a policy cell or a policy part of issuesApp reads": the other policy cells too (`issueAllowed` reads `reason`) | "the entries that a policy cell or such a part reads" |
| "either cell whole where the tool cannot cut it" | each is "named whole, as every other cell is, where it is not cut on both sides" | as proposed |
| "A read route changed beside those carries no mark" | the same; and an entry of `issuesLimits` no policy reads carries none | both said |

So two things the tool marks were not in the proposed text: a statement that is no declaration
and no route, and a limit that a policy cell other than `issuesApp` reads.

## What changed

- `rules.md`, the item. Its first sentence stands as it was. Three sentences follow it: the two
  cells and the parts of each, with the issue and the date; that either cell is taken whole where
  the tool cannot cut it; and what carries no mark, with where the approver's brief says to read
  the diff (`agents/approver.md`, step 6). The rest of the item, from "The reason of the policy in
  force", is as it was. `git diff --numstat` of the file before the commit: 11 lines added, 1
  removed.
- `tests/tools/rules-md-own-files-policy-parts.test.ts`, new, 7 tests. It reads the item and holds
  each sentence beside the tool, in two ways. The parts: it cuts `issuesApp` of the checkout's
  seed with the tool's `appParts` and asks that every route that is a part whole is `policy`,
  `sync` or written `app.post(` in the seed, and that the names the tool gives its kinds of
  statement are three and each is in the item, so a fourth kind in the tool fails the test. The
  sentences: each is a case of `policyCells` on that seed with one thing changed. 18 lines of the
  test call it, 4 of them for an answer of `[]`
  (`grep -c 'expect(diff\|expect(policyCells'` and `grep -c 'toEqual(\[\])'` of the file). The
  changes are those of `tests/tools/approver.test.ts`, which is the approver's own file and was
  not edited.

No choice is put to the owner: the sentences say what the tool does since a change he was asked
of (`approver-policy-mark-takes-every-route`). The item is in `rules.md`, so the issue is `major`.

## Counts

Each is the output of the command beside it, run in the worktree on 2026-10-13 after the edit of
`rules.md`.

- `bun test --timeout=30000 ./tests/tools/rules-md-own-files-policy-parts.test.ts`: 7 pass, 0 fail.
  Before the edit of `rules.md`, the same command: 2 pass, 5 fail, each fail a sentence the item
  did not have. The two that passed ask nothing new of the item: that it is found with its files,
  and the cases of each part of `issuesApp`.
- `bun test --timeout=30000 ./tests/tools/rules-md-own-files-policy-parts.test.ts ./tests/tools/rules-md-the-approver.test.ts ./tests/tools/rules-md-reading-note.test.ts`:
  26 pass, 0 fail, 3 files. The second and third read this section and the note on the file's length.
- `tests/tools/suite.sh`: 1281 pass, 0 fail, 133 files, 140.12 s. No line `skipped:`.
- `git grep -n -F 'policy cell' -- knowledge 'plan/cloud-brain-*.md' .claude/skills/brain-maintenance 'tools/cloud-brain/*.md'`,
  before this record was written: 36 lines in 9 files, 3 of them the item. Of the other 33, one
  says what the tool marks today, `agents/approver.md` line 134, with the parts three lines below
  it. The rest are 2 lines of the approver's spec (the proposal and its note of what was built), 2
  of `oversight.md`, 2 of a post mortem and 26 of four records of earlier changes.

## Not tried

- `approver.ts facts` or `approve` on an issue. The test calls `policyCells` and `appParts`, which
  those call; no run of the tool against the record was made.
- That an agent reads the item as meant. It is 18 lines (205 to 222 of the file); no agent was
  given it.
- The words "asks a guard" are the tool's name of the part. What the tool takes as asking (a name
  of `JUDGE`, `issueCaller`, `judge`, or a declaration that names one, however far) is in the
  comment above `appParts` and not in the item.
- What the record of `approver-policy-mark-takes-every-route` lists under "What the mark does not
  take" beside the two the item names: a statement added before a guard statement of the same
  route, and a comment between two statements. The item does not have them.
- The seed at another commit. The test reads the seed as the checkout has it, as the tool's own
  test does: a change of the seed that leaves `issuesApp` uncut, or moves one of the texts the
  test changes, fails both.
