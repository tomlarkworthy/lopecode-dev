# apply-unchanged-keeps-no-newer-source: an apply that answers `unchanged` keeps the source of what runs, also over a row of the version before

2026-10-13. One helper, one condition and one new test cell, in `tools/cloud-brain/brain-deployer.ojs`.
**cb4 does not run the change.** The deployer is deployed by the owner (`rules.md`, Never): nothing was
emitted, applied or probed on cb4, and `seen.json` is not changed. Times are CEST, read from `date`.

## What was wrong

`tools/cloud-brain/records/ds-ingestion-tail-to-analytics-engine.md`, "The deploy", has the case as it was
met on cb4 that morning: a `redistil --apply` ended at the client's five minutes after `brain-x-logs` was
uploaded and before its source row was written. From then:

```
brain-x-logs       no source    ba1b7b925098 is running and the source kept is of 31972f15b7de
```

A plain `apply` of a record with the hash that ran answered `unchanged` and wrote nothing. `apply --force`
mended it there. None of this was run again on cb4 for this change.

Read in the seed before the change: the branch of `apply` that answers `unchanged` wrote `source/MODULE`
only when no such row was there,

```
if (typeof w.source === "string" && !(await rows.get("source/" + w.module))) await rows.put(…, prev: null });
```

so a row of an older hash stayed, and `redistil` answers `no source` for a Worker whose row has another hash
than the one that runs (`rec.hash !== s.hash`, in `redistil`).

## What changed

| Where in `brain-deployer.ojs` | Change |
|---|---|
| a new function `keepSource(w, logical, was)`, above `sourcePutBack` | The write of `source/MODULE` that the deploy branch had inline, moved with no change to what it writes: the row of `w`, with `prev` the row that stood when that row is this Worker's, not stale and of another hash, and that row's own `prev` otherwise. |
| the deploy branch of `apply` | Calls `keepSource` with the row that stands. |
| the `unchanged` branch of `apply` | Calls `keepSource` when there is no row, or the row is marked `stale`, or the row is this Worker's (`was.worker === logical`) and of another hash. Before: when there is no row, with `prev: null`. |
| a new cell, `test_apply_unchanged_keeps_the_source_of_what_runs_over_an_older_row` | Below. |

Three things in it are more than the issue's one line ("write the source also when the kept row's hash is not
`w.hash`"), and each is held by the test:

- **`prev` is kept.** A Worker in that branch may still be on probation: its record's `state` is `deployed`
  from the upload. `sourcePutBack` gives a put-back Worker its source again only from `prev`, and marks the row
  `stale` otherwise. So the mended row carries the row of the version before, as the row of a deploy that was
  not cut does.
- **A row marked `stale` is written over**, whatever its hash. `keptSources` leaves such a row out, so
  `redistil` reads the Worker as having no source: the same state by another road. No case of it on cb4 is
  known to this change.
- **A row that names another Worker is left.** The row's key is the module, and it has one `worker`. With
  the issue's condition alone, an `unchanged` apply of one Worker would write over the live row of another
  Worker of the same module. Whether cb4 has a module that two Workers are built from was not read.

## Tests

Each run in the worktree. The build is `bun tools/cloud-brain/build.ts --out tools/cloud-brain/.emitted/cloud-brain.html`,
the module `bun tools/lope-reader.ts <the build> --get-module @tomlarkworthy/brain-deployer`, and the run with
no browser `cd cloud-brain-dev && bun test.ts @tomlarkworthy/brain-deployer --with <the module>` (the
deployer is a Worker of two modules, so the module's name stands for the Worker's).

The test deploys two versions of the probe Worker in `deployerRig`, puts the first version's row back in
`source/MODULE` (the cut), and then:

1. `redistil` answers `no source`, with the two hashes in the reason as on cb4.
2. `apply` of the second version answers `unchanged`; the row is the second version's with `prev` the first;
   `redistil` answers `same`.
3. The same `apply` again changes nothing in the row, and no version was uploaded in any of this.
4. The row marked `stale`, of the hash that runs: `redistil` answers `no source`, `apply` answers
   `unchanged`, and the row is written with no `stale`.
5. The row given another Worker's name: `apply` answers `unchanged` and the row is as it was.
6. The cut again, mended, then the second version made unhealthy: after two runs of the schedule the first
   version runs and the row is the first version's.

| Run | Result |
|---|---|
| the new cell as first written (parts 1 to 3, 5 and 6 as above, part 4 with a stale row of the first hash), the seed otherwise as it was | `58 passed, 1 failed`: the new cell, at the `toMatchObject` of part 2 |
| the seed as committed | `59 passed, 0 failed, 0 need a browser` |
| the cell as committed, the condition put back to `(!was)` | `58 passed, 1 failed`: the new cell, at the `toMatchObject` of part 2 |
| the same, the condition without `was.stale` | `58 passed, 1 failed`: the new cell, `stale` is `true` where none was expected (part 4) |
| the same, the condition without `was.worker === logical` | `58 passed, 1 failed`: the new cell, the row differs (part 5) |
| the same, `keepSource(w, logical, null)` in the `unchanged` branch | `58 passed, 1 failed`: the new cell, at the `toMatchObject` of part 2 (`prev`) |
| `bun tools/cloud-brain/tab-tests.ts tools/cloud-brain/.emitted/cloud-brain.html @tomlarkworthy/brain-deployer`, three runs | `"tests":59,"passed":59,"failed":[]` in each, Chrome 151.0.7922.34 |
| `bun test.ts @tomlarkworthy/cloudflare-iac`, what cb4 runs | `14f0fb7dd89d: 26 passed, 0 failed, 2 need a browser` |
| `tests/tools/suite.sh`, ended 09:29:45, after the rebase | `1110 pass`, `0 fail`, `Ran 1110 tests across 113 files` |

The four runs with a part of the fix taken out were made on a copy of the seed changed by a script, and the
seed was copied back after them; the rows after them are of the seed as committed. Each of the four fails
in the new cell and nowhere else. `verify-run.ts` does not apply to the deployer (the implementer's page
`seed-tests`: "the Worker did not say what it runs"), so `tab-tests.ts` was run three times in its place.
The rebase on `origin/main` brought in `brain-feedback.ojs`, `feedback-away-check.ts` and a record. After
it the build was made again: the run with no browser gave `59 passed, 0 failed` again, and the suite's row is
of that state. The three runs of `tab-tests.ts` and the run of `cloudflare-iac` are of the seed as committed,
before the rebase.

## For the owner: the deploy

Not run here, and not run by any agent of the loop. The steps are those of
`tools/cloud-brain/records/deployer-binds-no-method-list.md`, "The owner's deploy", as they are written there; they were not run for this change. In the main checkout, on `main` with this change, under the deploy lock:

```
bun tools/cloud-brain/build.ts
bun tools/cloud-brain/tab-tests.ts <the notebook build.ts wrote> @tomlarkworthy/brain-deployer --emit deployer_service=tools/cloud-brain/.emitted/apply-unchanged-deployer.json
cp tools/cloud-brain/.emitted/deployer.json tools/cloud-brain/.emitted/deployer.before-apply-unchanged.json
cp tools/cloud-brain/.emitted/apply-unchanged-deployer.json tools/cloud-brain/.emitted/deployer.json
BRAIN_BASE=cb4 bun tools/cloud-brain/brain.ts install-deployer
```

The deploy carries every change to `brain-deployer.ojs` and `cloudflare-iac.ojs` that is on `main` and not
on cb4 by then, not this one alone. The way back is the copy made in the third line over `deployer.json`, and
`install-deployer`.

What his deploy changes for him: nothing at the install. After it, a Worker that `redistil` lists as
`no source` with "is running and the source kept is of" is mended by a plain `apply` of a record with the
hash that runs, with no `--force` and no new upload. `redistil --apply` does not mend it: it goes on to the next source at
such a row (read in the seed, the `continue` under that reason), as before.

## Not tried

- Anything on cb4: the install, an `apply` over a row of an older hash there, `redistil` after it. Whether a
  Worker of cb4 is in that state today was not read (`infra.redistil` is the owner's call).
- The cut itself. The test puts the older row in place by hand; it does not stop an `apply` between the
  upload and the write. The cause, a sweep that outlasts its client's call, is not changed
  (`seen-sweep-outlasts-its-call`, closed).
- A row of an older hash whose version is not the one before the running one (two cuts in a row). `prev`
  is then a version that a put back does not go to, and `sourcePutBack` marks the row `stale`, as it does
  after a deploy in the same state.
- A stale row of another Worker under the module's key, and a member's Worker (`msource/`, another branch).
- The owner's page, where the tests of every module run together.
- `spec-as-built.md`, line 1145, says: "An apply that finds the code unchanged now stores the
  source if no row has it." It is a dated entry of that file and was left as written.
