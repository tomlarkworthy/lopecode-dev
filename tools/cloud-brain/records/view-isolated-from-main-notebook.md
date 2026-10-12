# view-isolated-from-main-notebook

2026-10-12. Four files under `tests/tools/` (`needs.ts`, `needs.test.ts`, `topic-sql.test.ts`,
`issue-lock-sql.test.ts`). No seed, no deploy. Written in the worktree
`bm-view-isolated-from-main-notebook`, made at `1d545375`.

## What was wrong

`tests/tools/topic-sql.test.ts` and `tests/tools/issue-lock-sql.test.ts` took the module they test
from a notebook, with `lope-reader.ts --get-module`. `notebookOf` of `tests/tools/needs.ts` chose
which: in a worktree with no `tools/cloud-brain/.emitted/cloud-brain.html`, and in the main
checkout always, `lopebooks/notebooks/@tomlarkworthy_cloud-brain.html`. In a worktree `lopebooks`
is a link to the main checkout's (`tools/cloud-brain/worktree.sh`, `link`, lines 60 to 68), and
that file there is written by each landing that builds (`notebook-backup.sh`). So the tests of one
commit ran on the statements of whatever build was last landed. A reviewer's view had 3 fails of
`topic-sql.test.ts` that way at 12:55 CEST (`seen-view-suite-reads-linked-notebook`, item 1).

The issue left open whether a writer's worktree has the same fault. It has: `link` is run for
every worktree, a view (`--at`, line 260) and a writer's (`--fresh`, line 241, and the plain form,
line 327), and `notebookOf` asked only whether the checkout is a worktree with a build.

Reproduced in this worktree before any other edit, 21:18 CEST, with no build in it and
`git -C <root>/lopebooks status --short` reading ` M notebooks/@tomlarkworthy_cloud-brain.html`.
One statement was added to `topicSchema` in `tools/cloud-brain/brain-topic.ojs`, not committed:

| `tests/tools` | `brain-topic.ojs` | `bun test ./tests/tools/topic-sql.test.ts` |
|---|---|---|
| as `1d545375` has it | as committed | 7 pass, 0 fail |
| as `1d545375` has it | one statement more in `topicSchema` | 7 pass, 0 fail: the seed of the checkout is not what was tested |
| this change | one statement more in `topicSchema` | 6 pass, 1 fail: `expect(schema.length).toBe(7)`, received 8 |
| this change | as committed | 7 pass, 0 fail |

The seed was put back with `git checkout --` and compared with a copy taken before the edit (`cmp`).

## What changed

- **The two test files** take their module from `seedModule` of `needs.ts`: the seed of the
  checkout (`brain-topic.ojs`, `brain-issues.ojs`), compiled as `build.ts` compiles it, into a
  directory of the temp directory named for the checkout. It is what `cost-events.test.ts` and
  `rows-add-within-sql.test.ts` do since `cost-events-test-reads-stale-deploy`. No file of
  `tests/tools` reads the built notebook now, in a view, a writer's worktree or the main checkout.
- **`needs.ts`**: `notebookOf`, `BUILT` and `COMMITTED` are gone, so a test that asks for the
  notebook that way does not load. New: `testNeedingSeedAnd(file, seed, paths)`, which is
  `testNeeding` for the files and then `testNeedingSeed` for the seed.
- **`BRAIN_NOTEBOOK` is read by nothing.** It named another notebook for the two files. With it
  set, the tests of a checkout could be run on another build's statements, which is the fault.
  `git grep -n BRAIN_NOTEBOOK -- . ':!tools/cloud-brain/records'` at `1d545375` printed 4 lines,
  all in the three test files.
- **`needs.test.ts`**: the test of `notebookOf` and the run of `issue-lock-sql.test.ts` with a
  notebook that is not there are replaced by two tests. One gives `testNeedingSeedAnd` a path that
  is not there (skipped, the line names the path, nothing compiled), paths that are there, and a
  build that finds no toolchain notebook. The other reads the two files and `needs.ts`: the three
  names are not exported, each file asks for its seed, and no `.ts` file of `tests/tools` but
  `needs.test.ts` has the string `lopebooks/notebooks/@tomlarkworthy_cloud-brain.html`.

Not taken: a build made by `worktree.sh --at` for each view (a view made for a change with no seed
would pay for a build it does not read, and a writer's worktree before its first build would still
read the link), and no `lopebooks` link at all (the toolchain notebook and the other tools read
through it; `plan/cloud-brain-worktree-per-topic.md` has why the links are there).

## What was run

All in the worktree, 2026-10-12, times from `date`.

The cells the tests read are the same from the seed and from a build. `build.ts --out` in the
worktree, the two modules taken from it with `lope-reader.ts --get-module`, and each cell's value
compared with the same cell of `seedModule`'s file (functions by their text):

```
brain-topic.ojs topicSql same            brain-issues.ojs issuesSql same
brain-topic.ojs topicSchema same         brain-issues.ojs issuesLimits same
brain-topic.ojs topicFakeSql same        brain-issues.ojs issuesLockSchema same
                                         brain-issues.ojs issueLocking same
```

The two module files are not the same bytes as the build's; which bytes differ was not read. The
build was then removed, so the runs below had none.

| What | Command | Result |
|---|---|---|
| The two files, before the change | `bun test ./tests/tools/topic-sql.test.ts ./tests/tools/issue-lock-sql.test.ts` | 14 pass, 0 fail, 1.34 s |
| The two files, after | the same | 14 pass, 0 fail, 2.06 s |
| The two files with `cloud-brain-dev/deploy/@tomlarkworthy/brain-db.js` moved away | the same | 0 pass, 14 skip, 0 fail, and a line `skipped: <file>: no <path>` for each file |
| `needs.test.ts` with the other three files as `1d545375` has them | `bun test ./tests/tools/needs.test.ts` | 0 pass, 1 fail, 1 error: `Export named 'testNeedingSeedAnd' not found` |
| `needs.test.ts`, after | the same | 9 pass, 0 fail |
| The suite, with no build in the worktree, 21:19:34 to 21:22:09 CEST | `tests/tools/suite.sh` | 685 pass, 0 fail, 68 files, 154.73 s |

After the worktree was brought up to `origin/main` (seven files came in, two of them tests), with
no build in it:

| When (CEST) | `uptime`, load of 1 minute | `tests/tools/suite.sh` |
|---|---|---|
| 21:23:42 to 21:28:27 | 27.33 at 21:28:32 | 690 pass, 1 fail, 69 files, 284.83 s. The one: `summarize-papers.test.ts`, "check: a summarized entry passes…", timed out at 30 s |
| 21:36:14 to 21:39:46 | 16.51 before, 10.26 after | 691 pass, 0 fail, 69 files, 211.38 s |

`summarize-papers.test.ts` imports nothing of `needs.ts` (`git grep -n -e needs.ts -e seedModule
tests/tools/summarize-papers.test.ts` prints nothing). Alone at 21:31:31, with `--timeout=30000`: 23
pass, 3 fail, each a timeout at 30 s, 271.17 s for a file of 26 tests. What else ran on the machine
was not read (`ps` is refused here). A count of a later run, when a rebase under the landing lock
brings more in, is in the comment of the submit.

## Not changed, not tried

- **A file another agent can write is still read through a link**: the toolchain notebook that
  `seedModule` compiles with (`tools/spec-notebook.ts`, `TOOLCHAIN_CANDIDATES`: under `lopecode/`,
  then `lopebooks/`), and `lopecode/notebooks/atproto.html` for `atproto-publish.test.ts`. No
  landing of the loop writes either. The issue's "no file another agent can write" is met for the
  built notebook and not for these.
- **`seedModule`'s directory is one a checkout**, so two suites run at once in one checkout write
  the same files, each by a rename. Two at once were not run.
- **The other tools that name the built notebook** are as they were: `build.ts` (its default
  `--out`, refused in a worktree), `library-homes.ts` (line 57). Neither is run by the suite.
- **In the main checkout** the two files now test the seeds there as they are on disk, committed
  or not. The suite was not run in the main checkout.
- **A view** was not made for this: the runs are of a writer's worktree, which has the same links.
  The reproduction is of the mechanism (a seed and a notebook of different commits), not of a
  landing that wrote the file during a run.
- **With no toolchain notebook** the two files were not run; the helper was given a build that
  throws that message.
- The suite took 154.73 s, 284.83 s and 211.38 s where the writer's brief has 93 to 95 s. The two
  files took 0.7 s more together; the rest was not looked for beyond the load above.
- The reviewer's brief on the Brain, step 4, still says a test that reads the notebook reads the
  main checkout's in a view with no build, and to run it again after a build. No test of the suite
  does now. The brief is the overseer's; the comment of the submit has the lines.
