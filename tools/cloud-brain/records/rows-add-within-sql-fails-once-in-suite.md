# rows-add-within-sql-fails-once-in-suite

2026-10-12. Two files under `tests/tools/` (`needs.ts`, `needs.test.ts`). No seed, no deploy.

## What was seen

The issue: every test of `tests/tools/rows-add-within-sql.test.ts` failed in the first run of
`bun test ./tests/tools` in a worktree and passed in each later run, and alone. The message was not kept.

Met again in the writer's worktree, fresh from `worktree.sh` at `92f3d259`, before any edit. Its
directory of compiled seeds, `<temp directory>/seed-module-7edb3cbfaaa5`, was absent (`ls`).

```
bun test ./tests/tools          started 09:16:24 CEST (date)
error: Cannot find module '/private/var/folders/4y/1ft5y13x1jv5gl0976lt3dn40000gp/T/seed-module-7edb3cbfaaa5/cloudflare-iac.js' from ''
(fail) a Worker's rows.addWithin on its SQL binding sends the key and each number in its place [0.34ms]
 … the same error line before each of the file's tests …
 514 pass  11 fail      Ran 525 tests across 58 files. [105.75s]
```

Eleven tests and not the issue's ten: `92f3d259` added one to the file. After the run the directory
held `brain-issues.js` (09:16, `ls -la`) and `cloudflare-iac.js` (09:17): the file named in the
error was there, written by the same run.

## The cause, as far as it was shown

A probe, one process of bun 1.4.0, as `bun test` and as `bun`: write a file, `import()` it, then
write more files and `import()` each. Its one line, the same both ways:

```
{"first":"a","sameDir":"ERR Cannot find module '/private/var/folders","sameDirAgain":"ERR Cannot find module '/private/var/folders","subDir":"c","siblingDir":"f","newTopDir":"g","sameDirRequire":"ERR Cannot find module '/private/var/folders"}
```

`first` is `d/a.js`. `sameDir` is `d/b.js`, written after `d/a.js` was imported: not found, and not
on a second ask, nor by `require`. A file in a directory made after that import was found: `d/sub/`,
a sibling `e/`, and a new directory of the temp directory.

`seedModule` of `needs.ts` wrote every seed of a checkout into one directory. In the suite
`cost-events.test.ts` imports `brain-issues.js` from it, and `rows-add-within-sql.test.ts` then has
`cloudflare-iac.js` written beside it and imports that. In a later run both files are there before
the process starts, which is the case the probe's `first` shows for one file. That the two test
files run in that order was read from the two times above, not from bun.

Why bun does this was not looked into. One web search (`bun import() "Cannot find module" file
created at runtime in directory already imported from`) found no report of it. Three searches of
the Brain (`knowledge.search`, in the words of the failure, of `needs.ts` and of an atomic write)
gave nothing that bore on it.

## What changed

- **`tests/tools/needs.ts`**: `seedModule(seed, into = SEEDS)` writes
  `<into>/<name>/<name>.js`, a directory for each seed, where it wrote `<into>/<name>.js`. `SEEDS` is
  the checkout's directory as before, `<temp directory>/seed-module-<12 hex of the checkout's path>`.
  `into` is new, for the test; the kept promise is by `into` and seed.
- **`tests/tools/needs.test.ts`**: one test more. In a directory from `mkdtemp`, new to the process
  as a checkout's is in its first run: compile `xrpc-client.ojs`, import it, compile
  `brain-operator.ojs`, import it.

Not taken: reading the module some way other than `import()` in `tools/notebook-import.ts`. Every
caller of that tool would change for one of bun's habits met in one helper. Nor a retry or a second
run in the test file: `philosophy.md`, Clarifications, 2026-10-10, a check that depends on what
runs beside it "is moved to where it runs alone; it is not made tolerant of the company".

## The runs

All in the writer's worktree, bun 1.4.0.

| What | Command | Result |
|---|---|---|
| `needs.ts` with `into` and the layout as before (`dir = into`), the new test | `bun test ./tests/tools/needs.test.ts` | 8 pass, 1 fail: `Cannot find module '…/seed-module-test-DWW6Zq/brain-operator.js'`, the new test |
| the change | the same | 9 pass, 0 fail |
| the change, the checkout's directory removed first (`rm -rf`, then `ls`: absent) | `bun test ./tests/tools`, 09:22:37 to 09:24:32 CEST | 526 pass, 0 fail, 526 tests across 58 files; no line `skipped:` |
| the change, right after | `bun test ./tests/tools`, to 09:26:19 CEST | 526 pass, 0 fail, 526 tests across 58 files |
| the change, after `worktree.sh --rebase` brought in five files (`worktree.sh`, `issue-as.sh`, `tests/tools/worktree.test.ts`, a plan, a record) | `bun test ./tests/tools`, 09:27:07 to 09:30:04 CEST | 555 pass, 0 fail, 555 tests across 58 files; no line `skipped:` |

The 29 tests more of the last row are of the files the rebase brought in. After the third row the directory held `brain-issues/brain-issues.js` and
`cloudflare-iac/cloudflare-iac.js` (`find -type f`).

The first row is not `needs.ts` of `92f3d259`: that one takes no `into`, so the test would write
into the checkout's own directory. The failure of `92f3d259` itself is the run of 09:16:24 above.

## What was not tried

- A bun other than 1.4.0.
- Two runs of the suite at once in one checkout.
- A first run in a second fresh worktree. One worktree gave one failing first run before the
  change and one passing first run after it, the second with the directory removed by hand.
- The other files of `tests/tools` that write a file and import it were not searched for.
- A directory left by the old layout (`<into>/<name>.js`) is not removed by anything.
