# overseer-md-git-status-form: the overseer's brief gives the form of `git status` that answers in its worktree

2026-10-13, writer `impl-21ec42`, in the worktree `bm-overseer-md-git-status-form`. One sentence of a brief
and a test. No seed, no deploy. The issue has the label `major`: `agents/overseer.md` is not the overseer's
to edit, so the overseer `over-572862` filed the text and a writer made the edit.

## What was wrong

`git-status-answers-in-a-worktree` put the form in `agents/implementer.md`, `agents/implementer/start.md` and
`agents/orchestrator.md`, and its triage left `agents/overseer.md` to the next oversight
(`tools/cloud-brain/records/git-status-answers-in-a-worktree.md`, "Not changed, for the overseer"). The
overseer commits in a worktree, `bm-over-<host>`, where the submodules are links as in a writer's. Its brief
had no line of `git status`: `grep -c -F 'git status' .claude/skills/brain-maintenance/agents/overseer.md`
printed 0 in the issue's body and in the triage (event 6802). The issue's body names two overseers that met
the error with no line for it, `over-608b7a` and `over-0c3236`; I did not read their runs.

Run in this worktree at 19:44:29 CEST (`date`, in the same command), git 2.55.0, after the two edits:

```
git status --short                           -> error: expected submodule path 'lopebooks' not to be a symbolic link   exit 128
git status --short --ignore-submodules=all   ->  M .claude/skills/brain-maintenance/agents/overseer.md
                                                 M tests/tools/briefs-git-status-in-a-worktree.test.ts
                                                ?? tools/node_modules                                                   exit 0
```

`tools/node_modules` was untracked in this worktree when I came to it; it is not of this change.

## What changed

- `agents/overseer.md`, "What you may do", in the item "An edit needs evidence from at least one issue",
  after "The briefs and `oversight.md` you edit are the files of `$W`.", the sentence of the issue's body,
  word for word:

  > `git status` in `$W` is `git status --short --ignore-submodules=all` (the submodules are links there, and
  > the plain command ends `error: expected submodule path 'lopebooks' not to be a symbolic link`, exit 128);
  > stage each file by its name.

  The file is 14,302 characters after it (`wc -m`).
- `tests/tools/briefs-git-status-in-a-worktree.test.ts`, a fifth test, and two lines of its header. It reads
  the part of `agents/overseer.md` from "## What you may do" to "## Finish" and holds that the form follows
  that sentence, and that the error, "exit 128" and "stage each file by its name" stand before "Each commit,
  or several, is landed by a push from it". `OVERSEER=<file>` reads another copy of the brief.

The side taken is the triage's (event 6802): the sentence of the body, at the place the body names.

## Tests

- Before the brief was edited, with the fifth test added:
  `bun test --timeout=30000 ./tests/tools/briefs-git-status-in-a-worktree.test.ts`, 4 pass, 1 fail. The one
  that failed is the new one, on `expect(at).toBeGreaterThan(-1)`, "Received: -1".
- After: the same command, 5 pass, 0 fail, 31 expect() calls.
- The whole suite, after the last edit of the brief or the test: `tests/tools/suite.sh`, run twice.
  The first, ended 19:47:31 CEST (`date`): 1274 pass, 1 fail, "Ran 1275 tests across 132 files", exit 1. The
  fail is `tests/tools/atproto-publish.test.ts`, "new bundle: publication, then document, then bundle carrying
  stdDocUri", "this test timed out after 30000ms"; that file reads no brief, and alone, straight after
  (`bun test --timeout=30000 ./tests/tools/atproto-publish.test.ts`), it was 5 pass, 0 fail. The second, ended
  19:50:34 CEST (`date`), with `uptime` then at a load of 9.83: 1275 pass, 0 fail, "Ran 1275 tests across 132
  files", exit 0, and no line of its output begins `(fail)` or `skipped:` (`grep -n` of the output kept in a
  file). This file was written after both runs. Why the one test timed out in the first was not looked for.

## Searched

- The Brain, `knowledge.search?semantic=true`, two searches: "git status in a worktree submodule symbolic link
  exit 128" and "overseer brief worktree stage each file by name". Of the first eight ids of each, the one
  that is of worktrees is the spec `doc:cloud-brain-worktree-per-topic`; nothing was used from them. What was
  used is the record and the test of `git-status-answers-in-a-worktree`.
- `git grep -n -F 'git status' -- knowledge 'plan/cloud-brain-*.md' .claude/skills/brain-maintenance 'tools/cloud-brain/*.md'`
  printed 41 lines, two of them the new sentence. The others are the three briefs that have the form, dated
  entries of `oversight.md`, dated records, a line of a spec, and lines of `git status` in `lopebooks`. Those
  that say the overseer's brief has no such line are dated entries (`oversight.md`, lines 1110 and 1234; the
  record of `git-status-answers-in-a-worktree`, line 65), true of their day, and were not changed.

## Not tried

- No overseer has read the sentence and run the form from it. What is held is that the brief has the text,
  and, by the first test of the file, what git does with a link in a submodule's place.
- A git other than 2.55.0.
- "stage each file by its name" beside the commit the same item gives,
  `git -C $W commit -m "…" -- <the file>`, which names the file and needs no `git add`. The sentence is the
  issue's and was kept whole; whether an overseer reads the two as one way or as two was not seen.
- The reviewer's brief on the Brain was not read. The issue's body says it has the form since (its line 15).
- Whether an edit of `agents/overseer.md` by a writer is `major` when the overseer did not file it: the
  question of `seen-overseer-brief-edit-not-major`, which this does not answer.
