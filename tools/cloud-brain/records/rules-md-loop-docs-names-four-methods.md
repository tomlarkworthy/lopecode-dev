# rules-md-loop-docs-names-four-methods

Written 2026-10-13 by the writer of the issue. The item for `loop-docs` in `rules.md` of the issue
loop (`.claude/skills/brain-maintenance/rules.md`, "A token an approved spec names") said two
methods and entries only. It now says four methods, a file for each doc as well as its entry, and
the prefix `docs/`. A doc and its test; nothing was built, deployed or called with the token.

## What was wrong

The reviewer of `sd-1-doc-files` opened the issue (event 5140). The item read:

```
- `loop-docs` names `knowledge.put` and `knowledge.list`. It is used through
  `tools/cloud-brain/knowledge-docs.ts`, which the release of the landing lock runs, and for
  nothing else, and only for entries of kind `doc`: the token itself is not held to that kind, so
  this is an agreement. Spec: `plan/cloud-brain-brain-docs-entered-by-hand.md`, whose words these
  are. Made by the orchestrating session (comment 1952 of `bd-3-first-run-of-the-docs-step`).
```

What the tool has, read in the worktree on 2026-10-13 (`grep -n -E "METHODS|FILES" tools/cloud-brain/knowledge-docs.ts`):

```
114: … TOKEN = "loop-docs", METHODS = "knowledge.put knowledge.list static.put static.list";
117: const FILES = "docs/", FILE_TAG = "knowledge-doc";
```

Each thing the issue's body says was read from its source before it was written into the item
(`issue-as.sh impl-6eb493 "get?id=<issue>"`, 2026-10-13):

| Said | Where it was read |
|---|---|
| The owner's word for one token | comment 4734 of `docs-summarised-for-search`, written by the session he said it to (`out-5f56b2`): "1 A 2 A 3 B 4 A 5 B", with that issue as number 3 |
| What B was | comment 4633 there: "**B.** Approve, and widen `loop-docs` in place of a second token: one token for one job." |
| The approve | event 4735, made for him by that session |
| The token made again, and the first agreement | comment 4775 of `sd-1-doc-files`: a revoke and a make at 22:11:52 CEST on 2026-10-12, and "for files only under `knowledge-docs/`" |
| Why `docs/` | `tools/cloud-brain/records/sd-1-doc-files.md`: 53 docs had a file under `docs/`, and `static.list?prefix=knowledge-docs/` answered 0 files |
| What a token's `static.put` reaches | `tools/cloud-brain/brain-static.ojs`, line 41: "A token is the owner's and reaches the paths the owner does, bar \`shell/\` and \`library/\`.", and `KEPT` at line 148 |
| The first making | comment 1952 of `bd-3-first-run-of-the-docs-step` |

## What changed

- `rules.md`, the one item. In order: the four methods; that it named two until 2026-10-12; the
  owner's message whole with its comment, B of comment 4633 and the approve's event; the sentence
  "The rest of this item is the writer's reading, not his words."; the agreement, which now names
  entries of kind `doc` and files under `docs/` and says the token is held to neither; what the
  tool puts; what `static.put` by a token reaches; that the token names no `static.get` and no
  `static.delete`; the agreement of comment 4775 with its `knowledge-docs/`, and where the files
  are; the two specs; who made the token, both times. "whose words these are" is gone: the words
  of the item are no longer the first spec's.
- `plan/cloud-brain-brain-docs-entered-by-hand.md`, "What only the owner can do": the paragraph it
  proposed for `rules.md` is the old item. It stays, with a note "As built".
- `tests/tools/rules-md-loop-docs-names-four-methods.test.ts`, new, 7 tests. It reads the item and
  holds each part above, and reads `METHODS` and `FILES` in the tool so that the item and the tool
  are compared and not two strings of the test.

No choice was put to the owner: the orchestrating session's note on the issue (event 5330) says
the sentences say what is. The item is in `rules.md`, so the issue is `major` and its approval is his.

## Tests

Each run by the writer in the worktree, 2026-10-13.

```
bun test --timeout=30000 ./tests/tools/rules-md-loop-docs-names-four-methods.test.ts
  before the edit of rules.md:  2 pass, 5 fail   (the two that pass: the readers, and the three items beside it)
  after:                        7 pass, 0 fail
```

Six files that read the same section or the token's lines elsewhere, after the edit:
`bun test --timeout=30000 ./tests/tools/briefs-name-the-prompts-token.test.ts ./tests/tools/rules-md-acts-on-the-owners-word.test.ts ./tests/tools/rules-md-owners-word-not-secrets.test.ts ./tests/tools/rules-md-philosophy-push-leave.test.ts ./tests/tools/sd-1-doc-files.test.ts ./tests/tools/docs-entered-by-the-landing.test.ts`:
46 pass, 0 fail. `briefs-name-the-prompts-token.test.ts` reads the item with a pattern that opens
`` - `loop-docs` names `` and wants `` `knowledge.put` `` and `` `knowledge.list` `` in it; the
item keeps that opening.

The whole suite, `tests/tools/suite.sh`, after the last edit: 905 pass, 0 fail, 93 files,
no `skipped:` line, 00:30:31 to 00:36:04 CEST (`date`), load 9.26 at its start (`uptime`).

## Elsewhere

`git grep -n -F '<words>' -- knowledge 'plan/cloud-brain-*.md' .claude/skills/brain-maintenance 'tools/cloud-brain/*.md'`,
after the edit and before this record was added to git: `loop-docs` 88 lines, `knowledge-docs/` 23,
``knowledge.put` and `knowledge.list` `` 3. The three of the last, none in `rules.md`:

- `plan/cloud-brain-brain-docs-entered-by-hand.md`, the proposed paragraph: noted, above.
- `plan/cloud-brain-docs-summarised-for-search.md` ("The token `loop-docs` names …") and
  `plan/cloud-brain-answers-cut-and-not-said.md` ("which today names …"): each is that spec's
  "today" before the token was widened. Not changed. The first has the note of `sd-1-doc-files`
  at its head.

Two lines quote the item: `plan/cloud-brain-docs-summarised-for-search.md` has `rules.md` with
`loop-docs` "used through `tools/cloud-brain/knowledge-docs.ts` … and for nothing else", and the
item still has both halves, with "which the release of the landing lock runs," between them as before.

## Not tried

- No call was made with `loop-docs`. That the token on cb4 names the four methods is from comment
  4775 and from the puts of `sd-1-doc-files` (its record); it was not read again.
- That `static.get` or `static.delete` is refused to the token. The item says it names neither,
  from the command of comment 4775.
- That `knowledge.put` with the token takes a kind other than `doc`. The item's "held to neither"
  is the old item's "not held to that kind" for the kind, and the seed's sentence for the path.
- Comment 4775 itself is not changed: an event of the record is not written again. The item says
  what it reads and what the tool does.
- The `fly-docs` row of `plan/cloud-brain-worker-machine-on-fly.md` and tasks 2 to 4 of the
  summaries spec, which the writer of `sd-1-doc-files` named beside this (event 5048): not this issue.

## Searched first

`knowledge.search?semantic=true&limit=5` with `loop-knowledge`, 2026-10-13:

| Words | Answered | Used |
|---|---|---|
| loop-docs token methods static.put agreement prefix docs | `doc:cloud-brain-brain-docs-entered-by-hand` 0.62, `doc:cloud-brain-docs-summarised-for-search` 0.61, `module:tomlarkworthy:brain-static` 0.57 | the two specs, named in the item; the seed, for what a token's put reaches |
| rules.md a token an approved spec names widened methods | `doc:cloud-brain-approver-persona` 0.92, `doc:cloud-brain-record-names-token-not-agent` 0.72 | nothing |
