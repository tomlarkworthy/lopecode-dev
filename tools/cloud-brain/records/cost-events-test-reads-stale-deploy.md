# cost-events-test-reads-stale-deploy

2026-10-12. Three files under `tests/tools/`. No seed, no deploy. The change is commit `03575cb2`
(written 03:57:09 CEST as `c5638565`; `c0bb183c` after the worktree was brought up to `main` at
03:59:27, and `03575cb2` after it was again under the landing lock at 04:05:20, each by
`git log --format=%ci`); the submit names it and this record's.

## What was wrong

Three tests of `tests/tools/cost-events.test.ts` give calls to `issueAct` of the tracker. The file
took it from `cloud-brain-dev/deploy/@tomlarkworthy/brain-issues.js` of its checkout (its line 229).
That file is git-ignored and is written by `bun sync.ts`, so it is as old as the checkout's last
sync. The main checkout's is of 2026-10-11 08:20 (`ls -la`), from before `issue.cost`:

```
grep -c 'cost: \["role"' cloud-brain-dev/deploy/@tomlarkworthy/brain-issues.js     (main checkout)    0
```

In the main checkout at `82e92c24`, before the change, 03:57:12 CEST:

```
bun test ./tests/tools/cost-events.test.ts
(fail) the tracker's own shape check takes each call made from the fixed list
(fail) the tool as run with --check: a refused body is named, exit 1, and --post then sends nothing
(fail) and refuses, with the field named, a call made from a line of the wrong type
 13 pass  3 fail      Ran 16 tests across 1 file
```

Reproduced in the writer's worktree (from `worktree.sh`, at `93a1a6d0`, before any edit) by putting
the main checkout's copy in the worktree's `deploy/`:

| `deploy/@tomlarkworthy/brain-issues.js` of the worktree | `bun test ./tests/tools/cost-events.test.ts` |
|---|---|
| as `worktree.sh` read it from cb4 | 16 pass, 0 fail |
| the main checkout's copy of 2026-10-11 08:20 | 13 pass, 3 fail (the three above) |
| absent | 13 pass, 3 skip, 0 fail, one line `skipped:` |

The second row is the test that fails without the fix.

## What changed

- **`tests/tools/needs.ts`** has `seedModule(seed)`: it compiles a seed of `tools/cloud-brain/` of
  the checkout the test is in, with `compiler`, `splitSeed` and `moduleSource` of
  `tools/spec-notebook.ts` (the three `build.ts` compiles a module with), writes the module to
  `<temp directory>/seed-module-<12 hex of the checkout's path>/<seed>.js` and answers the path.
  One compile a seed a process: the promise is kept. `testNeedingSeed(file, seed)` answers
  `{ test, module }`. When the compile fails for want of the toolchain notebook (the message of
  `compiler()` that begins `no @tomlarkworthy_observablejs-toolchain.html`) it prints a `skipped:`
  line and answers `test.skip`. Any other failure of the compile is thrown.
- **`tests/tools/cost-events.test.ts`** takes `issueAct` from `seedModule("brain-issues.ojs")`, and
  gives the same path to `--check` of the tool. It reads nothing under `cloud-brain-dev/deploy/`.
- **`tests/tools/needs.test.ts`**: two tests. The built file is outside the checkout, a second call
  answers the same path, and the seed's list of the fields of `issue.cost` is in it. A build that
  throws the toolchain's message gives `test.skip` and the line; a build that throws another message
  is thrown. With `needs.ts` of `93a1a6d0` in place the file does not load:
  `SyntaxError: Export named 'seedModule' not found`, 0 pass, 1 fail.

So the three tests now ask the seed of their own commit, and no longer what cb4 runs. Whether a call
is one the deployed tracker takes is the tool's `--check MODULE.js` on a synced `deploy/`, as
`records/cm-4-enter-the-runs-again.md` has it (its 382 taken, 0 refused), and not this test file.

Not taken: a skip when `deploy/` is from before `issue.cost`, as
`tests/tools/rework-resumes-the-implementer.test.ts` does for the half of one test (its line 57,
a search for `cost: ["role"`). It is the smaller change. It leaves the three tests not run in the
main checkout until someone syncs there, and the search names one method: the next change to
`issueAct` makes a synced copy stale again with nothing to find it by. `philosophy.md`,
Clarifications, 2026-10-10: a check whose result depends on what runs beside it "is moved to where
it runs alone; it is not made tolerant of the company".

The cost: the test file took 1.3 s to 1.8 s before and 3.3 s to 3.5 s after (three runs of each, bun's
own `Ran … [N s]`). A probe before the change measured the compile of `brain-issues.ojs` at 1,641 ms.

## The runs after the change

In the writer's worktree, at `c5638565`, before it was brought up to `main`.

| `deploy/@tomlarkworthy/brain-issues.js` of the worktree, command | Result |
|---|---|
| the main checkout's stale copy, `bun test ./tests/tools/cost-events.test.ts` | 16 pass, 0 fail |
| absent, the same | 16 pass, 0 fail, no line `skipped:` |
| as cb4 runs it, the same | 16 pass, 0 fail |
| the stale copy, `bun test ./tests/tools/needs.test.ts ./tests/tools/cost-events.test.ts`, twice | 24 pass, 0 fail, each; one file in the temp directory after both |
| the stale copy, `bun test ./tests/tools`, 03:57:10 to 03:58:48 CEST | 479 pass, 1 skip, 0 fail, 480 tests across 52 files |

That last run printed one `skipped:` line, of `rework-resumes-the-implementer.test.ts`, for the
stale copy it was given; that test returns early and is counted a pass.

After `worktree.sh --rebase`, which brought in a changed `brain-issues.ojs` among 13 files, at `c0bb183c`:

| `deploy/@tomlarkworthy/brain-issues.js` of the worktree, command | Result |
|---|---|
| the stale copy, `bun test ./tests/tools/cost-events.test.ts` | 16 pass, 0 fail |
| as cb4 runs it, `bun test ./tests/tools`, 03:59:40 to 04:01:16 CEST | 483 pass, 1 skip, 0 fail, 484 tests across 52 files; no line `skipped:` |

The four tests more than the run before are of the files the rebase brought in.

The second rebase, under the landing lock, brought in six files, none of them one the module is
built from (`brain-topic.ojs`, `build.ts`, `tests/tools/topic-sql.test.ts`, a plan, a record,
`seen.json`). At `03575cb2`, `bun test ./tests/tools/needs.test.ts ./tests/tools/cost-events.test.ts`:
24 pass, 0 fail. The whole suite was not run again there, so its count above is without
`topic-sql.test.ts`.

## What was not tried

- A checkout with no toolchain notebook (`lopecode/` and `lopebooks/` both empty). The `skipped:`
  line of that case was read from a build made to throw the message, in `needs.test.ts`, and not
  from such a checkout.
- Two runs of the suite at once in one checkout. Both write the same file; each writes
  `<file>.<pid>` and renames it.
- A second load of the toolchain in one `bun test` process. An earlier draft of the new test asked
  `seedModule` for a seed that does not exist, which loads the toolchain again; in the same process
  as the first load that run ended with `RequireError: invalid module` from
  `tools/lope-runtime.js:296`, in 2 runs of 2. Run alone it passed. The line was removed, and a
  process compiles one seed only so far. A test file that asks for a second seed will load it
  again and may meet this. A script outside `bun test` that loaded it three times in a row, each
  disposed, printed no error.
  (Ended 2026-10-12, `ds-1-rows-add-within`: `rows-add-within-sql.test.ts` asked for a second seed and met it; `seedModule`
  now keeps one compiler a process. `tools/cloud-brain/records/ds-1-rows-add-within.md`.)
- `rework-resumes-the-implementer.test.ts` and `issue-lock-sql.test.ts` read modules from
  `deploy/` too and were not changed.
- `bun sync.ts` in the main checkout. Its `deploy/` is as it was.
