# ds-1-rows-add-within

Task 1 of `plan/cloud-brain-day-spend-not-bounded-by-one-row.md` (approved by the owner at event
3710 of `day-spend-not-bounded-by-one-row`): `rows.addWithin(key, add, max)` in
`tools/cloud-brain/cloudflare-iac.ojs`, with its tests. Written 2026-10-12, started 07:16 CEST
(event 3723). The seed is on `main`. Nothing was deployed, emitted or applied, and `seen.json` was
not changed: the deployer's hash covers this file and the deployer is the owner's to deploy. No
Worker of cb4 has the operation, and nothing in any seed calls it yet (task 2 does).

## What it does

`add` and `max` are lists of whole numbers of one length, 1 or more. The row at `key` is such a
list, zeros when there is none. When every `row[j] + add[j] <= max[j]` the row becomes the sums and
is the answer. Otherwise nothing is written and the answer is `null`.

## What changed

`tools/cloud-brain/cloudflare-iac.ojs`, six places. The spec says five; it does not count
`platform.rows` of the wrapper, which is what a Worker's code calls.

| Place | What |
|---|---|
| `workerRuntime`, a new `within` | `check(add, max)` throws; `sql(n)` is the statement for `n` numbers; `next(row, add, max)` is the row after the add, or `null`. Returned beside `platform`, `fetch`, `serve`, `Rows` |
| `platform.rows.addWithin` | `within.check`, then `rowsCall("addWithin", key, { add, max })` |
| `sqlCall`, D1 | one statement, `within.sql(add.length)`, bound after the Worker's name and the key as add 0, max 0, add 1, max 1, …; the answer is `RETURNING v` parsed, or `null` when `.first()` gives no row. (Not so as round 1 landed it: the key was not bound. Round 2, below) |
| `Rows.fetch`, the deployer's Durable Object | `within.next` of what `storage.get` gave, then `storage.put` when it is not `null` |
| `simulate`, `rowsOp` | `rowsWithin.next` on the rig's Map |
| the `rows` cell and `backend.rowsAddWithin` | the notebook's own store: `rowsWithin.check`, then `rowsWithin.next` |

A new cell `rowsWithin = workerRuntime().within` is how the notebook, the rig and a test read the
statement. The statement is inside `workerRuntime` because a Worker gets the wrapper as
`String(workerRuntime)` (the line `const __rt = (${String(workerRuntime)})(__als)` of `emit`), so a
cell beside it would not be in the Worker. One decision in JavaScript and one in SQL, and each store
calls one of the two.

`within.sql(2)` is the spec's statement, character for character once its line breaks are spaces.
The test reads the statement from the spec's `sql` block and compares.

**A row that is not a list of numbers.** The function answers `null` and writes nothing when the row
is not a list, or a place it adds to is not a number. The statement does the same for a counter, an
object, text, a shorter list and a list with a `null` (`json_extract` gives NULL and the `WHERE` is
not true). They differ for a list that holds text, read 2026-10-12 on SQLite 3.54.0 with a row
`["a","7"]` and an add of `[1,1]` under `[9,9]`:

```
statement: [1,8]      function: null
```

SQLite reads text as a number when it adds. Not made the same: the spec's statement was kept as
approved, and a row at a key of `addWithin` is written by `addWithin` alone in the design. A longer
list is cut to the numbers added, and a number that is not whole is added to as it is, by both.

**What is thrown at.** `TypeError: rows.addWithin: add and max are lists of whole numbers, of one
length of 1 or more`, before any statement, for: lists of two lengths, empty lists, a missing list,
a number in a list's place, text, a fraction, a negative number in either list, `null`, `Infinity`,
`NaN`, a number past `Number.MAX_SAFE_INTEGER`. A negative `add` would lower a spend; the owner's
rule is no refunds. `[0, 0]` is taken: it answers the row when the row is inside the bounds.

**No bound** has no spelling of its own. The spec's third row ("`addWithin` with no bound") is a
`max` of `Number.MAX_SAFE_INTEGER`; the test adds twice under it. Not chosen: `null` in `max` for no
bound, which is a second meaning in the five stores for what a number already says.

## Tests

`test_rows_addWithin_adds_inside_its_bounds_and_writes_nothing_past_them`, a new cell, with a
fixture service `fx_within`. One script of eight adds is run four ways and must answer the same:
`fx_within` under `simulate` (a Worker's code through `platform.rows`, `rowsCall` and the rig), the
class `Rows` of `workerRuntime()` over a Map-backed `storage`, the notebook's `rows` cell, and
`rowsWithin.next` alone. It also sends six bad pairs through the service (400, the message above,
no row), and ten adds at once with a count of 3 (three answered, the row `[3, 3]`). The rig answers
each call in one step with no `await` inside, so those ten say that the rig refuses the fourth, not
that D1 does.

`tests/tools/rows-add-within-sql.test.ts`, new: 10 tests on `bun:sqlite` (SQLite 3.54.0,
`select sqlite_version()`). The statement is read from the seed of the checkout, compiled by
`seedModule` of `tests/tools/needs.ts`, and each add is sent to the statement and to `within.next`
on a Map, with the two answers and the two rows compared. It has the four results the spec quotes.
The spec's first, "50 charges of 1 to 297", was random there; here the charges are `1 + (37 i mod
297)`, of which 7 are taken.

Counts, each from a run after the last change to the seed and the tests:

| Command | Result |
|---|---|
| `bun test ./tests/tools/rows-add-within-sql.test.ts`, the seed as `main` had it (`git stash -- tools/cloud-brain/cloudflare-iac.ojs`) | 0 pass, 10 fail |
| the same with the change | 10 pass, 0 fail, 199 `expect()` calls |
| `cd cloud-brain-dev && bun test.ts @tomlarkworthy/cloudflare-iac --with …/.emitted/ds-1-rows-add-within.js` | `"passed":25,"failed":0,"needsBrowser":2` |
| `cd cloud-brain-dev && bun test.ts brain-deployer`, what cb4 runs, before the change | `"passed":24,"failed":0,"needsBrowser":2`, hash `4a25dc92cc07…` |
| `bun tools/cloud-brain/tab-tests.ts tools/cloud-brain/.emitted/cloud-brain.html @tomlarkworthy/cloudflare-iac`, three runs | `"tests":27,"passed":27,"failed":[]` each, Chrome 151.0.7922.34 |
| `bun test ./tests/tools`, after the rebase onto `main` and a build there | 509 pass, 3 skip, 0 fail, 512 tests across 56 files; one line `skipped: test-ts-cut.test.ts: … test.ts has no --whole` |

The rebase brought in a change to `brain-topic.ojs` and `tests/tools/topic-sql.test.ts`. The suite
run before the worktree was built again gave 506 pass, 3 fail, the three in `topic-sql.test.ts`,
which reads the worktree's build: it was the build from before the rebase. After
`build.ts --out` the run is the row above. The browser runs and the `test.ts` run are from before
the rebase; it changed nothing `cloudflare-iac` is built from (`worktree.sh --rebase` printed
`brain-topic.ojs`, a digest, a spec, a test, a record, `seen.json` and `spec-as-built.md`).

`verify-run.ts` was not run: the deployer gives no verdict for itself (the writer's brief, step 8),
so `tab-tests.ts` was run three times in its place. `test.ts` takes the module's name with the
`@tomlarkworthy/` before it; `cloudflare-iac` and `brain-deployer` are each answered "--with takes
a Worker of one module, or the module's name".

## `tests/tools/needs.ts`: one compiler a process

The first run of the whole suite with the new test gave 498 pass, 1 fail:

```
tests/tools/rows-add-within-sql.test.ts:
RequireError: invalid module
      at runAndNotify (…/tools/lope-runtime.js:296:63)
error: Cannot call test() after the test run has completed
```

The test passed alone. `seedModule` made a compiler (`compiler()` of `tools/spec-notebook.ts`, the
toolchain notebook loaded headless) for each seed and disposed it. `cost-events.test.ts` compiles
`brain-issues.ojs`; this test was the first to ask for a second seed in one process, and the second
load threw between tests, so the file registered none. The record of
`cost-events-test-reads-stale-deploy` had met the same error and written "A test file that asks for
a second seed will load it again and may meet this".

`seedModule` now keeps one compiler for the process, never disposed, and compiles one seed after
another. With `needs.ts` as it was: `bun test ./tests/tools/cost-events.test.ts
./tests/tools/rows-add-within-sql.test.ts` gave 16 pass, 1 fail; with the change those two and
`needs.test.ts` gave 34 pass, 0 fail, and the process ended by itself. Why a second load throws was
not looked for.

## What other writers will see until the owner deploys

`brain.ts apply` compares the hash of the emitted record with the one the deployer answers and
prints, when they differ, `the deployer distilled … ; the browser emitted …` (`brain.ts`, the
`apply` command). A record emitted from a build of `main` now holds this wrapper and the deployer on
cb4 distils with the one before it. So that line is expected on every apply from `main` until
`brain.ts install-deployer`. This was read in the code and not seen in an apply: this task made
none. The apply is not refused for it, by the same reading.

## Not tried

- **D1.** No statement of this change was sent to D1. Not known there: what `.first()` answers for
  an upsert whose `DO UPDATE` became a no-op (the code takes it for `null`, as `bun:sqlite`'s `.get`
  gave); whether D1 binds a whole JavaScript number as INTEGER or REAL (with REAL the row would be
  written `[900.0,1.0]`, which `JSON.parse` reads as the same numbers; not run); two calls at once
  with room for one, the spec's own "falsified by".
- **The Durable Object on Cloudflare.** `Rows` was run over a Map. Two calls of it at once were not
  sent, and what the object does between its `get` and its `put` was not read.
- **A deployed Worker calling `rows.addWithin`.** None has the wrapper.
- **Sums past `Number.MAX_SAFE_INTEGER`.** The check bounds `add` and `max`, not the row.
- **The time of the statement.** The spec measured its own script; the kept test measures nothing.
- **An apply from `main` by another writer**, as the section above says.

## Round 2, 2026-10-12: the D1 place did not bind the key

Review 3837 found it, with a probe. As landed in round 1 the D1 branch of `sqlCall` was

```
q(within.sql(value.add.length), ...value.add.flatMap((a, j) => [a, value.max[j]]))
```

and `q` binds the Worker's name and then what it is given. So the statement got the name and the
numbers, the first number in the key's place, one value short. Every other operation gives `q` the
key first. On `bun:sqlite` the call threw (the table below). What D1 does with it was not read; the
key was not among the values whatever it does. The row for `sqlCall` in the table above ("bound after the Worker's name and the key") was not
true of round 1. It is true of the seed now: the line has `key` after the statement.

No test of round 1 ran that line. The bun test bound the statement itself, in the order the line
should have had, under a comment that said "As sqlCall binds it". The test cell reaches `sqlCall`
only under `simulate`, where `ENV.SQL.sim` answers before any statement. The four stores the cell
runs are the rig, the Durable Object's class, the notebook's store and the function: the D1 branch
was the one place of the six that nothing ran.

**The test that holds it.** `tests/tools/rows-add-within-sql.test.ts` has an eleventh test, the
first in the file. It makes the wrapper (`workerRuntime()` of the compiled seed), gives it an `env`
whose `SQL` has D1's shape (`prepare`, `bind`, `first`, `run`, `all`) over `bun:sqlite`, and calls
`platform.rows.addWithin`, so the call goes through `rowsCall` and `sqlCall`. It reads what was
bound, `["w", "spent", 900, 1000, 1, 7]`, the answers, and the rows under the Worker's name. A put,
a get, an append and a list go through the same stand-in first. The stand-in is mine, written from
the calls `sqlCall` makes; it is not D1.

| Command, 2026-10-12 | Result |
|---|---|
| `bun test ./tests/tools/rows-add-within-sql.test.ts`, the seed as round 1 landed it | 10 pass, 1 fail: `SQLite query expected 6 values, received 5`, the new test |
| the same with `key` on the line | 11 pass, 0 fail, 214 `expect()` calls |
| `cd cloud-brain-dev && bun test.ts @tomlarkworthy/cloudflare-iac --with …/.emitted/ds-1-rows-add-within.js` | `"passed":25,"failed":0,"needsBrowser":2` |
| `bun test ./tests/tools` | 525 pass, 0 fail, 525 tests across 58 files, no `skipped:` line |
| `bun tools/cloud-brain/tab-tests.ts …/cloud-brain.html @tomlarkworthy/cloudflare-iac`, nine runs | six gave `"tests":27,"passed":27`; three gave `"passed":26`, each failing `test_the_wrapper_passes_the_origin_reference_on` |

**A test of this module that fails by chance, and is not this change's.** The three failures are one
expectation of a cell from before this issue: after two asks, a third from the first origin is
expected to send no `secret.get`, because the wrapper holds a secret for 5 s. In each failure
`secret.get` was sent again. Six of the nine runs were interleaved with six of a build of the seed
as it was before round 1 (`61f74c22^`, 26 tests): those six gave 26 of 26. To see the clock, a
build of each seed with that expectation made to print the time since the cell's first ask, four
runs each, interleaved:

```
before this issue   6583 held   6461 held   6796 asked again   6487 held
with this change    6955 asked again   6362 held   6758 asked again   6525 held
```

Milliseconds from before the first ask to after the third, on the page while every other test cell
computes. The hold begins inside the first ask, so the edge is somewhere between 6583 and 6758 on
this scale. The cell is at that edge with and without this change, and failed once without it. Whether the new
cell makes it fail more often is not shown: 3 of 9 against 0 of 6 plain runs, and 2 of 4 against
1 of 4 with the clock printed, are too few to say. Round 1's three runs and the reviewer's one were
27 of 27. `test.ts`, which runs one cell at a time, passed it in each run.

Not fixed here. It is a `test_*` cell of `cloudflare-iac.ojs` that the approved spec does not name,
and the brief's step 3 keeps such a change for the owner. Filed as
`iac-origin-test-secret-held-by-clock`, with these numbers.

**Not tried in round 2.** D1 still: no statement was sent to it, and `sqlCall`'s line for
`addWithin` has run on the stand-in above and nowhere else. What D1 answers for a value short of
the parameters (round 1's defect) was not read. The rest of "Not tried" above stands.

**What round 1 got wrong in its own account.** It listed six places and ran four stores, and
the D1 branch was in none of the four.
