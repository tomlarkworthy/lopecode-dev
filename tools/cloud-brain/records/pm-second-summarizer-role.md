# The first post mortem (`pm-second-summarizer-role`)

Round 1, 2026-10-12, by a writer of the issue loop (token `impl-58df50`). No seed, no deploy, no
brief changed.

## What changed

- **New, `tools/cloud-brain/post-mortems/pm-second-summarizer-role.md`.** The post mortem the owner
  asked for (the issue's body has his words): the trace of `docs-summarised-for-search` from his
  sentence to his send-back, the root cause, what is not known, and the next actions. The
  directory is new; the orchestrating session named it in comment 4485, "Until
  `post-mortems-declared-and-kept` says where".
- **New, `tests/tools/pm-second-summarizer-role.test.ts`.** It holds each sentence the post mortem
  quotes of the spec, the count of "Not chosen" and the three brief lines, each read with
  `git show 619354c2:<path>`.
- **Three issues opened**, kind `task`, each linked `related` to this one: `spec-names-what-exists-of-the-job`
  (event 4497), `decision-comment-names-what-is-added` (4499), `philosophy-one-role-for-one-job` (4501).

The cause it gives, in one sentence: no text a spec's writer or reviewer follows asks, of a thing a
design adds, what exists that does the same job, so the choice of one role or two was never
written as a choice and each later check read what was written.

## Tests

`bun test ./tests/tools/pm-second-summarizer-role.test.ts`: 4 pass, 0 fail, 31 `expect()` calls.
With the post mortem moved aside the same command gave 0 pass, 1 fail, 1 error. `tests/tools/suite.sh`, run twice after the three files were written, 2026-10-12, the second ended
21:37 CEST: 691 pass, 4 fail of 695 tests in 70 files in 297 s, then 692 pass, 3 fail in 294 s. Every
fail of the second run is a test of `tests/tools/summarize-papers.test.ts` stopped at 30 s
(`--usd-max`, `refused once`, `check`), a file this change does not touch, with the machine's load at
15.92 (`uptime`, 21:37) and the suite at three times the 93 to 95 s the writer's brief gives.
`bun test --timeout=120000 ./tests/tools/summarize-papers.test.ts` alone, after it: 26 pass, 0 fail
in 146 s. The fourth fail of the first run was not read by name.

## Read before the design

Three searches of the Brain (`knowledge.search?semantic=true`, `loop-knowledge`): "post mortem
root cause of a bad decision", "a new role made where one exists reuse duplicate", "spec review
misses a design choice not chosen". Nothing found on a post mortem. The third answered
`doc:cloud-brain-record-checked-by-review-alone` first; it was not used.

## Not tried

- No brief was changed, so nothing shows that the line of the first issue would have caught it.
- The spec writer was not asked: it was at work on round 2. Its transcript keeps no reasoning (the
  post mortem, "What is not known").
- The chats of the owner with the two sessions were not read; only what those sessions quoted on
  the tracker.
- The fresh reviewer's own report of its eleven findings was not read.
- No row for the new directory was added to `knowledge/working-with-cloud-brain-remote-lopecode-cluster.md`,
  "Where the documents are": where post mortems are kept is `post-mortems-declared-and-kept`'s to say.
