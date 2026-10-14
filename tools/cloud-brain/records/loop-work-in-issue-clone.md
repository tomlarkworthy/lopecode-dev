# loop-work-in-issue-clone

The owner, 2026-10-14, to a session, after the approver left `run-ts-commits-to-cloud-brain-dev` (event 7502) and
he approved it (event 7505), as the issue's body quotes him: "If they are doing loop work that should still be done
in an issue clone and not literally the thing they are standing on. In this case it is benign so lets ignore it but
create an update of instructions to avoid this in the future."

The writer of `run-ts-commits-to-cloud-brain-dev` had landed changes to `run.ts`, `drain.ts`, `laptop.ts`, `patch.ts`
and `push.ts` of `cloud-brain-dev` with `worktree.sh --push-dev` at its submit (comment 7465), before review 7480 asked
for changes. `laptop.ts` takes `cloud-brain-dev`'s `main` before each drain, so a change landed that way runs outside
the sandbox at the laptop's next wake, with no review.

## What changed

The instructions, in `lopecode-dev`. No tool's behaviour changed.

| File | Before | After |
|---|---|---|
| `.claude/skills/brain-maintenance/rules.md`, "Always", the item "Work on `main`" | a change to `cloud-brain-dev` is pushed by `worktree.sh --push-dev` | `--push-dev` is for `README.md` and `records/*.md` (`SAFE` of `patch.ts`); any other file is loop work: an issue `about` `cloud-brain-dev`, run by `run.ts` in an issue clone, read by its reviewer, pushed by `push.ts`. A writer never lands it with `--push-dev`; a `lopecode-dev` issue that needs one opens that issue, linked `related`. The owner's words, quoted with the date. The push of his quotes in `philosophy.md` is left to "Two standing leaves" |
| `agents/implementer.md`, step 6 | nothing | one bullet: a file of `cloud-brain-dev` but those two is not the writer's to land; open the issue |
| `agents/implementer/start.md`, "`$W/cloud-brain-dev` is where you test" | "landed by `worktree.sh --push-dev`" | the same for the two `SAFE` kinds; the rest "is not yours to land", and the issue to open |
| `agents/implementer/landing.md`, step 10, the bullet of `cloud-brain-dev` | "A change to `cloud-brain-dev`" | "A change to `README.md` and `records/*.md` of `cloud-brain-dev`", and the rest is not landed by this command or any other |
| `knowledge/changing-and-deploying-a-cloud-brain-worker.md`, step 7 | a change to `cloud-brain-dev` is pushed by `--push-dev` | the two `SAFE` kinds; any other file is an issue pushed by `push.ts`; "Until 2026-10-14" for the old reading |
| `knowledge/working-with-cloud-brain-remote-lopecode-cluster.md`, the row of `cloud-brain-dev/` | `--push-dev` for a change to it | the same, and since 2026-10-14 for those two alone |

`agents/implementer.md` is held to 20,000 characters by `tests/tools/implementer-brief-core.test.ts`. It was at
20,000 before; the bullet took 174, and two sentences of "What a tool prints" were cut to make room: the long form of
an event (what `--short` leaves out) and "Its first key, `short`, says what was left out". The answer of `--short`
says the latter itself. After: 19,973 (`bun -e` of `[...text].length`).

The dev briefs (`roles/dev-writer.md`, `roles/dev-reviewer.md`) and `cloud-brain-dev/README.md`, "A change from a
worktree of lopecode-dev", are files of `cloud-brain-dev`. By this issue's own rule (comment 7509) they were not
changed here: issue `dev-briefs-loop-work-in-issue-clone` (event 7513, `about` `cloud-brain-dev`, linked `related`
at 7514) asks for them, the reviewer's finding among them. It was opened and not triaged.

## Tests

`tests/tools/loop-work-in-issue-clone.test.ts`, 4 tests: each of the six docs names `README.md` and `records/*.md` and
an issue `about` `cloud-brain-dev`; `rules.md` has "never lands it with `worktree.sh --push-dev`", `push.ts`, "linked
`related`" and the owner's words; the two pages say "is not yours to land"; `SAFE` of `cloud-brain-dev/patch.ts` is
still the two kinds (skipped with a line when the clone is absent).

```
bun test --timeout=30000 ./tests/tools/loop-work-in-issue-clone.test.ts    before the edits: 1 pass, 3 fail
bun test --timeout=30000 ./tests/tools/loop-work-in-issue-clone.test.ts    after:            4 pass, 0 fail
tests/tools/suite.sh                                                       after: 1378 pass, 1 fail, 1379 tests, 146 files
```

The one fail is `tests/tools/approver-brief.test.ts`, "the leave verdict of the brief is counted by `trial` …": it
reads `agents/approver.md` alone, which this change does not touch, and finds `why: the approver's own files` twice
(lines 131 and 136 of that file, last changed by `no-stale-seeds`). It is not this change's, and the approver's
brief is not the loop's to edit (`rules.md`, "The approver").

## Not tried

- No agent was run on the new text, a writer or a reviewer.
- Nothing checks that a writer obeys it: `worktree.sh --push-dev` still pushes any file. A guard there, refusing a
  file outside `SAFE`, was not asked for; it is named for the owner in the issue's comment.
- The reviewer's brief is on the Brain (`roles/reviewer.md`, `agents/reviewer.md`); it was not changed. The line it
  wants is in the issue's comment, for the overseer.
- The specs and records that name `--push-dev` (`plan/cloud-brain-worktree-per-topic.md`,
  `plan/cloud-brain-post-mortems-declared-and-kept.md`, records of `wt-*` and others) are history and were left.
