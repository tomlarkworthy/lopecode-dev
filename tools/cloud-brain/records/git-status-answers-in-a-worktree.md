# git-status-answers-in-a-worktree: the briefs give the form of `git status` that answers in a worktree

2026-10-13, writer `impl-7138a5`, in the worktree `bm-git-status-answers-in-a-worktree`. Three texts and a
test. No seed, no deploy.

## What was wrong

In a worktree made by `worktree.sh`, `lopebooks`, `lopecode` and `lopecode-plugin` are links to the main
checkout's submodules. `git status` stops on the first. `agents/implementer.md` and
`agents/implementer/start.md` said "`git status` fails in the worktree" and gave `git diff` and `git add <file>`,
with no form of `status`. `agents/orchestrator.md` had no line. The issue names three runs of 2026-10-13 that
met it, one of which wrote "I could not confirm with git that the worktree is unchanged".

Run in this worktree at 15:21 CEST (`date`), git 2.55.0, with one line added to `CLAUDE.md` and taken out after:

```
git status                                   -> error: expected submodule path 'lopebooks' not to be a symbolic link   exit 128
git status --short --ignore-submodules=all   ->  M CLAUDE.md / ?? tools/node_modules                                    exit 0
git status --ignore-submodules=all           -> the long form, the same two files                                       exit 0
git status --porcelain -- tools .claude      -> ?? tools/node_modules                                                   exit 0
git diff --stat HEAD                         -> its last lines: cloud-brain-dev | 0, lopebooks | 2 +-, lopecode | 2 +-, lopecode-plugin | 2 +-, "5 files changed"
git diff --stat --ignore-submodules=all HEAD -> CLAUDE.md, "1 file changed"
```

`tools/node_modules` was untracked in this worktree when I came to it; it is not of this change.

## What changed

- `agents/implementer.md`, "Where you work": "`git status` fails in the worktree (the submodules are links
  there)" is now "`git status` there is `git status --short --ignore-submodules=all` (the submodules are
  links)". The line was replaced and not added to: the file is 19,987 characters of the 20,000 that
  `tests/tools/implementer-brief-core.test.ts` allows (`wc -m`; 19,961 before).
- `agents/implementer/start.md`, the same item: the error and its exit, the form, and the two diffs above.
- `agents/orchestrator.md`, "Your prompt, and your token": three lines with the error and the form. They are
  in the brief's own part. The texts from "A quick win" on are held word for word by
  `tests/tools/orchestrator-brief.test.ts` and were not touched.
- `tests/tools/briefs-git-status-in-a-worktree.test.ts`, four tests. The first makes a repository with a
  submodule named `lopebooks` and a worktree of it in a temporary directory, puts a link in the submodule's
  place, changes one file and adds one, and holds: `git status --short` is exit 128 with that error and no
  output; with `--ignore-submodules=all` it is exit 0 and prints ` M kept` and `?? new`; `git diff --stat HEAD`
  names `lopebooks` and the same with the flag does not. The other three read the three briefs for the form.

The side taken is the triage's (event 6603): the text, and not a `diff.ignoreSubmodules` set by
`worktree.sh --fresh`. `git config --get extensions.worktreeConfig` in this worktree is exit 1, so a config
written there would be the one every checkout shares.

## Tests

- Before the briefs were edited: `bun test --timeout=30000 ./tests/tools/briefs-git-status-in-a-worktree.test.ts`,
  1 pass, 3 fail. The three that read the briefs failed on "Expected to contain" with the form; the one that
  runs git passed, since it holds git and no text.
- After: the same command, 4 pass, 0 fail.
- The whole suite, after the last edit: `tests/tools/suite.sh`, 1239 pass, 0 fail, "Ran 1239 tests across 128 files", ended
  15:31 CEST (`date`). No line of its output begins `skipped:` or `(fail)` (`grep -n` of the output kept in a file).

## Not changed, for the overseer

- The reviewer's brief on the Brain (kept copy `tests/tools/fixtures/reviewer-brief.md`, line 15: "`git status`
  fails on the links; `git diff`, `git show` and `git add <file>` work"). It is true and gives no form. The
  mend is the form after "fails on the links": "`git status --short --ignore-submodules=all` answers".
- `agents/overseer.md` has no line of `git status`. The triage left it and the reviewer's brief to the next
  oversight.

## Not tried

- No agent has read the three new texts and run the form from them. What is held is that git answers so and
  that the texts have the form.
- A git other than 2.55.0.
- What the form shows when a submodule's pointer is staged in a worktree. With `--ignore-submodules=all` a
  change of a submodule has no line, which is what is wanted of a link; a pointer staged by `git add -A` was
  not made to see.
- `git fetch`: its line in the two briefs is as it was.
- The config side (`status.submodule`, `diff.ignoreSubmodules`, `extensions.worktreeConfig`), beyond the one
  `git config --get` above.
