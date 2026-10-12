# ds-2-core-spends-by-row

Task 2 of `plan/cloud-brain-day-spend-not-bounded-by-one-row.md` (approved by the owner at event
3710 of `day-spend-not-bounded-by-one-row`): the core keeps an account's day as one row of two
numbers and each charge that counted as a row of its own, and the most charges of a day is a
setting. Written 2026-10-12, started 09:18 CEST (event 3872). The seed `tools/cloud-brain/brain-core.ojs`
is on `main`. Nothing was emitted, applied or deployed, and `seen.json` was not changed: the core is
the owner's to deploy, after the deployer (`ds-1-rows-add-within`) and `redistil --apply`. cb4 runs
the core of hash `26486a49c85b`, which is the one from before this change.

The writer's brief keeps a change to a `test_*` cell of `brain-core.ojs` for the owner (step 3). This
task changes five and adds two. It was started because the spec says the seed lands and that its approval is his
word for that, and comment 3711 of the parent took it so.

## What changed

All in `brain-core.ojs`.

| Row | Holds | Written by |
|---|---|---|
| `spent/DAY/ACCOUNT` | `[u, n]`: micro-dollars and charges that count | `rows.addWithin(key, [u, 1], [A, charges])` |
| `spend/DAY/ACCOUNT/<t>-<i>` | `{ t, i, u, m, c, o, v }`, one charge that counted | `rows.put`, after the add answered |
| `spent/DAY/delegation/ID` | `[u, n]` of a delegation with a daily amount | `rows.addWithin` under `[MAX_SAFE_INTEGER, MAX_SAFE_INTEGER]`, after the account paid |

- **`charge`.** One `addWithin`. Answered: the instance keeps the row it answered, writes the line
  and the call goes on. `null`: one `get` of the row, kept, and the 402 says which bound it was
  (`n >= charges` is the count, otherwise the allowance).
- **`known`**, what an instance last read of an account's day, is now `{ day, u, n }` and is compared
  with the allowance and the count of the call in hand, so a setting that was raised is met by the
  next call. `learn` keeps the answer with the larger `n` when two arrive out of order.
- **`charges`** is a key of `PRICING` with the default 8000. `quota.setDefaults { charges }` takes a
  whole number from 1 to `Number.MAX_SAFE_INTEGER`, or `null`. `keepDays` is held to the same test
  (it took any whole number of 1 or more before, and now none past `MAX_SAFE_INTEGER`). The 400 for
  the two says "is a whole number, 1 or more, or null for N"; for `keepDays` it said "a number, 0 or
  more" before.
- **`quota.get`, `quota.put`'s answer, `delegation.list`** read one `spent/` row. **`quota.list`**
  reads `spent/DAY/` by prefix and its `charges` is `n`.
- **`quota.ledger`** reads `spend/DAY/` by prefix, or for `who` the row `spend/DAY/WHO` and the
  prefix `spend/DAY/WHO/`. A list is a day in the old shape and is folded as before, with the 8000 it
  was written under (`LISTED`). An object is a line. `limit` is at most the setting.
- **`prune`** deletes the same days under `spent/` as under `spend/`: each of its two loops runs for
  both names.
- The constants `CHARGES` and `KEEP` are gone, and `rows.append` is no longer called for money.
- The prose "Prices and credits" and the method table: `quota.list`, `quota.ledger`, `quota.put` and
  `quota.setDefaults` each have a row now, with what they answer.

Three things the spec's list does not have. They are in the spec as an "(As built …)" paragraph,
with a fourth, the upper bound of `charges`, which is above.

- **A refusal after this instance's own last charge costs no statement.** The add that takes the
  last charge answers the row, so the instance knows the day is at the count. The spec's "`null`: one
  `get`" is what a refusal costs an instance that had not read the day that far. The test has both.
- **A price over the whole allowance sends no `addWithin`**, one `get` for the message. Any day
  refuses it.
- **An allowance over `Number.MAX_SAFE_INTEGER` micro-dollars is bounded there.** `quota.put` takes
  any finite `daily`, and `addWithin` throws at a `max` past that number. With the bound and the
  guard above taken out of the built seed, the test below answered 500 for a call under an
  allowance of `1e13`:

  ```
  $ tab-tests.ts … @tomlarkworthy/brain-core      (charge without Math.min(…, MOST) and without u > A)
  37 36   test_a_day_holds_the_charges_the_owner_set_…   Expected 200, ["addWithin","put"]   Received 500, ["get"]
  ```

## Tests

Two cells are new, one has a new name and body, four are changed, and `priceRig` counts the
operations the core sends on a row of the money (`rig.opsOf(account)`) and can make the `put` of a
line throw (`rig.faults.lines`).

| Requirement | Cell | What it holds |
|---|---|---|
| R1, R4 | `test_a_day_holds_the_charges_the_owner_set_and_a_charge_is_two_operations_whatever_the_day_holds` (was `test_a_day_holds_8000_charges_of_one_account_and_the_next_is_refused`) | `charges` 20000; a charge is `addWithin`, `put` with the day at 0 and at `[19999, 19999]`; the next is 402 naming 20000 with no operation; with another instance's charges in the row, `addWithin`, `get`, then none; raised by one, one more passes; no row under `spend/` is a list; the allowance of `1e13`; a price over the allowance |
| R2 | `test_calls_made_at_once_do_not_spend_past_the_allowance` | as before (33 of 50, 10 of 30), then ten at once under `charges` 3: three answer 200, the row is `[30000, 3]`, and 46 lines are kept for the 46 calls that passed |
| R3, R6 | `test_the_ledger_reads_a_day_of_lines_and_a_day_of_the_old_shape` | a day of the old shape with a refused entry and a delegation's list; a day of lines with method, origin and caller; `who` with an account whose name begins the same; `limit`; a day with both; a line whose `put` threw |
| R3 | `test_a_new_day_starts_at_nothing_and_old_days_are_dropped` | each old day is set three ways (list, sum, line), and the days left under `spent/` equal those under `spend/` at each step |
| R5 | `test_the_count_of_a_day_is_a_setting_of_the_owners` | 8000 with no setting; 3, then the fourth is 402 naming 3; seven bad values are 400; `null` is 8000 and the next call passes; 2 with 4 in the day refuses and takes nothing back; a turn and a member are 401 |
| | `test_a_priced_call_is_charged_to_the_day_of_its_origin`, `test_the_owner_sets_prices_and_allowances_in_their_own_session` | the row `[11000, 2]` and the keys of two lines; `charges: 8000` among the defaults |

The rig answers each operation in one step, so the ten at once say that the core refuses on the
row's answer, not that D1 does.

Counts, 2026-10-12, in the worktree, Chrome 151.0.7922.34. `tab-tests.ts` is
`bun tools/cloud-brain/tab-tests.ts tools/cloud-brain/.emitted/cloud-brain.html @tomlarkworthy/brain-core`
on a build of the seed named.

| Run | Result |
|---|---|
| `tab-tests.ts`, the seed as `main` had it | `"tests":35,"passed":35` |
| `tab-tests.ts`, the new and changed test cells with the core's code as `main` had it | 37 tests, 30 passed, 7 failed: the seven cells of the table above |
| `tab-tests.ts`, the change, three runs, then one more after the rebase onto `main` and a new build | `"tests":37,"passed":37,"failed":[]` each |
| `BRAIN_BASE=cb4 bun tools/cloud-brain/verify-run.ts brain-core --shell …/cloud-brain.html --times 20`, from the main checkout | `"runs":20,"passed":20,"failed":0,"none":0,"from":["document"],"byChance":[]`; `mains` was `["@tomlarkworthy/brain-shell","@tomlarkworthy/brain-core"]` and each run had `"tests":37` |
| `cd cloud-brain-dev && bun test.ts brain-core --with …/.emitted/ds-2-core-spends-by-row.js` | `"passed":22,"failed":15,"needsBrowser":0` |
| `bun test ./tests/tools`, after the rebase, first run | 543 pass, 11 fail, 554 tests across 58 files |
| the same, second run | 554 pass, 0 fail, 554 tests across 58 files |

**The 15 that fail in `test.ts` are expected, and it is not the gate here.** `test.ts --with` puts
one module in place and runs it against the `cloudflare-iac` cb4 runs, which has no `addWithin`. The
two failures whose output was read each had 500 where 200 was expected. The spec says so ("How each
requirement is known to be met"). The count of the submit is the browser's, 37 of 37, where the
build's own `cloudflare-iac` is loaded. So the brief's "`tests` of a run equals step 7's
`passed + needsBrowser`" does not hold here: 37 is 22 passed and 15 failed. The 15 are the seven of
the table and eight more that make a priced call:
`test_the_origin_pays_through_one_worker_and_through_two`, `test_out_of_credits_is_402_and_nothing_is_forwarded`,
`test_a_charge_is_not_returned`, `test_a_members_worker_spends_its_authors_credits`,
`test_the_log_line_of_a_priced_call_has_its_price` and the three delegation cells
(`test_a_token_is_a_delegation_…`, `test_a_delegation_with_the_cap_delegate_…`, `test_a_worker_calls_under_a_delegation_…`).

**The 11 that failed once in `./tests/tools`.** The tail of the first run printed two names, both
tests of `rows-add-within-sql.test.ts`, and
`error: Cannot find module '/private/var/folders/…/T/seed-module-a97959e57714/cloudflare-iac.js'`.
That file has 11 tests, and alone it gave 11 pass, 0 fail. The second run of the suite gave 0 fail.
The first run was started in the same command as a `tab-tests.ts` run, after it; what removed the
temporary directory was not looked for. This change touches neither that test nor `needs.ts`.

## What the owner's deploy will meet

- **The order.** The deployer with the new `cloudflare-iac`, then `redistil --apply`, then the core.
  The spec has why: a core that calls `rows.addWithin` on a wrapper without it answers a priced call
  500. The two failures of `test.ts` that were read above are that case.
- **The day of the deploy starts at nothing.** The new row has no spend of the hours before, so each
  account can spend up to one more allowance that day. The spec chose this.
- **That day's ledger has both shapes.** `quota.ledger` answers the list from before the deploy and
  the lines after it, and its total is their sum. `quota.get` and `quota.list` answer the new row
  alone.
- **Old `spend/DAY/delegation/ID` lists** are read by nothing now and are deleted with their day.

## Not tried

- **D1, and cb4.** No statement of this change was sent to D1 and no Worker runs it. Two priced
  calls at once with room for one, the spec's "falsified by", was not tried there. `rows.addWithin`
  on D1 has run on the stand-in of `tests/tools/rows-add-within-sql.test.ts` and nowhere else.
- **The time of a priced call on cb4**, before or after (R4's second half). It is the owner's to
  read; the test counts operations.
- **A `put` of a line that fails on D1.** The test makes the rig's `put` throw. What D1 throws, and
  whether the wrapper turns it into a rejected promise as the rig does, was not read.
- **Two answers of `addWithin` that arrive out of order in one instance.** `learn` is written for
  it; no test sends them so.
- **The 402 when the setting was lowered under what the day has.** The message is
  "`ACCOUNT` has made `N` priced calls today" with `N` the setting, not the day's count. The test
  reads the status and the row for that case and not the message.
- **A `limit` over the setting.** `quota.ledger` cuts at `Math.min(charges, limit)`; no test asks for
  more lines than the setting.
- **A day of 100,000 lines read by `quota.ledger`**, and a `limit` that is negative or not a number
  (as before this change: `Number(limit) || 200`, then `slice`).
- **A list of the old shape with an entry that is `null`.** `fold` would throw on it, as before.
- **The Spending panel of the page** (`cloud-brain.ojs`, `quota.list`, `price.list`,
  `quota.ledger?limit=20`). The fields it reads are answered as before by the tests; the panel was
  not opened on this build.
- **The deployer's own run of these tests** after a deploy of the core. `verify-run.ts` above served
  the build from this machine's Chrome 151; the cluster's browser is another.

## Read before the design

`knowledge.search?semantic=true` with `loop-knowledge`, three searches ("daily spend row per charge
conditional add allowance", "quota ledger charges setting setDefaults", "rows addWithin core spent
count"). Each answered the spec of this task first, at score 1. The next were
`simon-willison:…default-hard-budget-caps-` (0.53) and `module:tomlarkworthy:ledger` (0.47), which
the spec had read and not used. Nothing else bore on it.
