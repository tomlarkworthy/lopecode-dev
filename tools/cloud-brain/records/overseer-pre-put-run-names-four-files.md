# The overseer's run before a put of the reviewer's brief takes its files from a grep (`overseer-pre-put-run-names-four-files`)

Written 2026-10-13 by the writer of the issue (token `impl-c4c83f`, `start` at event 5556). The issue was filed
by the overseer `over-f051f0` with a proposed text, and is labelled `major`: `agents/overseer.md` is not the
overseer's to edit. No seed, no deploy, nothing put on the Brain. Every run below was made in the worktree of this
issue (bun 1.4.0, macOS, the shell zsh), between 02:03 and 02:11 CEST by `date`, and those under "The runs" after
the rebase of step 9.

## What was wrong, seen

The line of `agents/overseer.md`, "What you may do", named four test files and no timeout. A brief with one
sentence of question 3 of "A spec" taken out passed it:

```
$ diff <the kept copy> <edited> | wc -l        4   (one line changed: " A thing the design adds with no such sentence is a `no` to this question." removed)
$ BRIEF=<edited> bun test ./tests/tools/reviewer-brief-waits-on-show.test.ts ./tests/tools/reviewer-in-a-view.test.ts ./tests/tools/reviewer-brief-names-token.test.ts ./tests/tools/lock.test.ts
 45 pass
 0 fail
Ran 45 tests across 4 files. [18.75s]
```

`<the kept copy>` is a copy of `tests/tools/fixtures/reviewer-brief.md` (`cmp`: the same). The edited brief of
the Brain, `cloud-brain-dev/brain/roles/reviewer.md`, is not in this worktree and was not used.

## What changed

Two files.

- `.claude/skills/brain-maintenance/agents/overseer.md`: the command and the sentence after it, nothing else.
  The command is the issue's, letter for letter:

  ```
  BRIEF=$W/cloud-brain-dev/brain/roles/reviewer.md bun test --timeout=30000 $(cd $W && grep -l -E 'briefOf|reviewer-brief' tests/tools/*.test.ts | sed 's|^|./|')
  ```

  The sentence after it differs from the issue's in two places. It says "run in `$W`": from another directory
  the command finds no file (below). And it gives the count of the day of this change, ten, in place of the
  issue's nine of 2026-10-12, because the test of this line is itself in the list. The issue's "had named four
  since `suite-tests-read-the-live-brief`" was checked and is so: `git show d50230bd` (2026-10-12 13:39:46 +0200,
  that issue's commit) adds the line with the four names, and it is not in the brief before it.
- `tests/tools/overseer-pre-put-run.test.ts`, new, 4 tests. It takes the command out of `overseer.md`, runs its
  `$( … )` with `sh` and `W` this checkout, and holds that the list has every test file that imports
  `./reviewer-brief.ts` (found by the import, not by the line's grep), that each name is a file under
  `./tests/tools/`, that the command has `--timeout=30000` and names no test file, and the two sentences of the
  entry. It runs no `bun test` of its own. `OVERSEER=<file>` reads another copy of `overseer.md`; not `BRIEF=`,
  which the overseer's run sets to the reviewer's brief.

## The grep takes three files that do not read the brief

```
$ grep -l -E 'briefOf|reviewer-brief' tests/tools/*.test.ts | wc -l                                              10
$ grep -l -F 'from "./reviewer-brief.ts"' tests/tools/*.test.ts | grep -v overseer-pre-put-run | wc -l           7
```

The three others: `needs.test.ts` (names `reviewer-brief-names-token.test.ts` and runs one test of it),
`pm-second-summarizer-role.test.ts` (reads the kept copy at commit 619354c2), and the test of this change. A grep
for the import would give the seven. The issue's pattern was kept: it is the text the owner is asked to approve,
it leaves out none of the seven, and the three pass with `BRIEF` set (the run below). Its cost is a count in the
overseer's entry that has 3 files and, on this day, 18 tests that are not of the brief: the seven alone, with
`BRIEF=<the kept copy>`, are `64 pass, 0 fail, Ran 64 tests across 7 files`, and the ten are 82.

## The runs

The test of the line, after the change and with `overseer.md` of the commit before it:

```
$ bun test --timeout=30000 ./tests/tools/overseer-pre-put-run.test.ts                         4 pass, 0 fail
$ OVERSEER=<overseer.md of HEAD before> bun test --timeout=30000 ./tests/tools/overseer-pre-put-run.test.ts    0 pass, 4 fail
$ OVERSEER=/dev/null …                                                                        0 pass, 4 fail
$ OVERSEER=<the reviewer's brief> …                                                           0 pass, 4 fail
$ BRIEF=<the kept copy> bun test --timeout=30000 ./tests/tools/overseer-pre-put-run.test.ts   4 pass, 0 fail
```

The command, cut out of `overseer.md` as it now stands and run by `zsh -c` with `W` the worktree, its `BRIEF`
path changed to the two files of the scratchpad:

```
BRIEF=<the kept copy>   82 pass, 0 fail    Ran 82 tests across 10 files. [21.59s]
BRIEF=<edited>          81 pass, 1 fail    Ran 82 tests across 10 files. [21.12s]
                        (fail) a thing the design adds with no such sentence is a `no`
```

The same command from `/private/tmp` ran no test: bun answered `Tests need ".test", "_test_", ".spec" or "_spec_"
in the filename`. The four-file line had the same need, with relative paths; the brief now says it.

`reviewer-brief-kept-copy.test.ts`, which the issue did not know of: alone with `BRIEF=<edited>`, 5 pass, 0 fail.
It gives `briefOf` an environment of its own and takes `BRIEF` out of the one it spawns with.

The whole suite, after the rebase and the last edit:

```
$ tests/tools/suite.sh     (02:07:52 CEST)
 982 pass
 0 fail
Ran 982 tests across 101 files. [90.84s]
```

No line `skipped:` in its output (`grep -c 'skipped:'`: 0).

## Not tried

- The command with the Brain's edited brief at `$W/cloud-brain-dev/brain/roles/reviewer.md`, or in an overseer's
  worktree: both runs here set `BRIEF` to a file of the scratchpad.
- A sentence taken out of "A post mortem": the one edit tried is of question 3.
- A file name with a space, which the `$( … )` would split: `tests/tools` has none.
- bash: the command was run by zsh, and its inner part by `sh` in the test.
- `reviewer-brief-kept-copy.test.ts` still has a list of four, `HOLDERS`, and its last test runs "the four files
  that hold the brief" where `fetch` throws; the two files added since are not in it. Not changed: it is not
  this issue's line.
- The entries of `oversight.md` and the records that quote the four-file command are of their day and were left.
