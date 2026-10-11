# plain-worktree-tab-tests-no-node-modules

2026-10-11. Two files under `tests/tools/`. No seed, no deploy. The change is commit `bc393ebc`
(23:42 CEST by `git log --format=%ci`); the submit names it.

## What was wrong

`tests/tools/tab-tests.test.ts` imported the Observable runtime by path on its line 9,
`../../tools/node_modules/@observablehq/runtime`. `tools/node_modules` is not in git.
`tools/cloud-brain/worktree.sh` links it into the worktree it makes (its line 64); a plain
`git worktree add` has none, and the file stopped at the import.

Reproduced at `6577a442`, before any edit, in a plain worktree made as the issue's reviewer made
theirs: `git worktree add -q --detach .claude/worktrees/plain-twtnm 6577a442`, `lopebooks` replaced
by a link to the main checkout's, `cloud-brain-dev/` and `lopecode/` empty, no `tools/node_modules`
and no `node_modules` (`ls` of both: "No such file or directory").

```
bun test ./tests/tools/tab-tests.test.ts        23:41:07 CEST, exit 1
  error: Cannot find module '../../tools/node_modules/@observablehq/runtime' from '…/plain-twtnm/tests/tools/tab-tests.test.ts'
  0 pass  1 fail  1 error      Ran 1 test across 1 file

bun test ./tests/tools                          exit 1
  390 pass  32 skip  1 fail  1 error      Ran 423 tests across 48 files
```

The issue's counts were 351 pass, 32 skip, 1 fail, 1 error of 384 across 44 files at `5e7e04a1`;
they differ from these by the commit. The one error is the same line.

This run is the test that fails without the fix. No test file was added: a test inside the file
cannot report that the file does not load, and the run above does.

## What changed

- **`tests/tools/tab-tests.test.ts`** takes its `test` from `testNeeding("tab-tests.test.ts", [<the runtime's path>], …)`
  of `tests/tools/needs.ts`, and imports the runtime after that check, at the top level, only when
  the path exists (`await import(RUNTIME)`). `page()` stays synchronous. With no runtime every test
  of the file is skipped and one line is printed.
- **`tests/tools/needs.ts`**: `testNeeding` takes a third argument, `how`, the end of its line. Its
  default is the words the line had, `git submodule update --init cloud-brain-dev lopebooks lopecode`
  (now the constant `SUBMODULES`), which the four files of `tests-tools-fail-in-a-fresh-worktree`
  still print. A submodule does not give `tools/node_modules`, so this file passes
  `link the main checkout's: ln -s <main checkout>/tools/node_modules tools/node_modules`.

The whole file is skipped, as the issue and its triage asked and as `light-agent.test.ts` is. Not
taken: skipping only the four tests that make a `Runtime` and leaving the six others to run
(`address`, `parseArgs`, `report`, the two exits of the tool, `wakesOf`, the brief). It would keep
six tests in a checkout the loop does not use, for two kinds of `test` in one file.

## The runs after the change

All at `bc393ebc`. The plain worktree was moved to it with `git checkout --detach bm/plain-worktree-tab-tests-no-node-modules`.

| Where, command | Result |
|---|---|
| plain worktree, `bun test ./tests/tools/tab-tests.test.ts`, 23:42:51 | exit 0: 0 pass, 10 skip, 0 fail, 10 tests in 1 file |
| plain worktree, `bun test ./tests/tools`, 23:42:58 | exit 0: 390 pass, 42 skip, 0 fail, 432 tests across 48 files; 5 lines `skipped:` |
| the same worktree after `ln -s <main checkout>/tools/node_modules tools/node_modules`, `bun test ./tests/tools`, 23:44:19 | exit 0: 400 pass, 32 skip, 0 fail, 432 tests across 48 files; 4 lines `skipped:`, none of this file |
| the writer's worktree from `worktree.sh`, `bun test ./tests/tools/tab-tests.test.ts` | 10 pass, 0 fail |
| the writer's worktree, `bun test ./tests/tools`, with this record written | exit 0: 431 pass, 1 skip, 0 fail, 432 tests across 48 files; no line `skipped:` |

The line the plain worktree printed:

```
skipped: tab-tests.test.ts: no …/plain-twtnm/tools/node_modules/@observablehq/runtime. tools/cloud-brain/worktree.sh makes a worktree that has it; in another checkout, link the main checkout's: ln -s <main checkout>/tools/node_modules tools/node_modules
```

The third row is the issue's "Not tried: the same run with tools/node_modules linked", and is the
instruction of that line followed. 423 tests became 432: the file that did not load was counted as
1 test, and now its 10 are.

## Not tried

- `bun install` or `npm install` in `tools/` of a plain worktree, as another way to get the
  runtime. The line names the link only, which is what was run.
- A checkout with `tools/node_modules` present and `@observablehq/runtime` absent from it; the check
  is on the runtime's own directory, so it would print the same line, and no such checkout was made.
- A clone that is not a worktree of this checkout, where there is no "main checkout" to link from.
- `playwright-chrome.test.ts` and `worktree.test.ts`, which the issue says also name
  `tools/node_modules`: not changed. Neither failed in the plain worktree's runs above.
- The prior-art search of the brief, step 2: both calls of `knowledge.search?semantic=true`
  answered `ai.v1/embeddings answered 402 owner has made 2000 priced calls today`. The record
  `tests-tools-fail-in-a-fresh-worktree.md` and `tests/tools/needs.ts` were read in its place.
