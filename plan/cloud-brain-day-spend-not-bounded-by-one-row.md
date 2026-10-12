# Cloud Brain: a day's spend kept as one small row, and its charges as a row each

Spec of the feature `day-spend-not-bounded-by-one-row` on cb4's tracker. Written 2026-10-12, begun
03:52 CEST (the `spec` move, event 3557), from `lopecode-dev` `82e92c24`, `cloud-brain-dev` `3801492`
and `brain-core` `26486a49c85b` as cb4 runs it. Round 1. Nothing here is built.

Three things a reader should know before the rest:

- **The design needs one new operation of `rows`, in `cloudflare-iac.ojs`.** The deployer's hash
  covers that file, so this is a deploy of the deployer and of the core, both the owner's
  (`rules.md`, Never). The loop can write and test the seeds. It cannot put any of it on cb4.
- **What a priced call costs in time on cb4 was not measured, and no token of the loop can measure
  it.** The core's `ms` of each call is in the logs, which answer the owner's session. What was
  measured is under "What exists today".
- **"2 G" is still not a number.** The design makes the count a setting, so his number is one call
  of his and no deploy. The default stays 8000.

## What was asked

The owner, 2026-10-12, on `priced-calls-of-the-day-used-up`, as the issue's body quotes him:

> Let's increase the quota to 2 Gor priced-calls-of-the-day-used-up

He was told the day's count is bounded by how the core keeps it, and offered the constant raised
that day with "the counter redesign so the limit can go as high as you like" filed apart:

> Yes do those things

The constant went from 2000 to 8000 the same day (`tools/cloud-brain/records/priced-calls-of-the-day-used-up.md`).
This issue is the second thing. It carries the label `owner` (event 3555).

## The reports gathered

The feature has no parts: `issue-as.sh spec-7098cf "list?parent=day-spend-not-bounded-by-one-row"`
answered `{"issues":[]}` at 03:52 CEST. The issue itself is the one report. Its five lines "for the
spec to settle" become the requirements, one each, with one more from its "Wanted".

## Requirements

- **R1.** The charges of one account that count in a day are not bounded by the size of a row.
- **R2.** Calls made at once cannot spend past the allowance, and no call holds a lock.
- **R3.** Each charge that counted is still a line the owner reads with `quota.ledger`, and the
  lines of a day are deleted after `keepDays` as today.
- **R4.** A priced call costs no more statements than today, and its cost does not grow with the
  charges of the day. Both measured, before and after.
- **R5.** The limit by count stays, as a guard on storage, and is a setting of the owner's: a change
  to it is not a deploy.
- **R6.** The days kept in the old shape are still read by `quota.ledger` until they are deleted.

## What exists today, measured

`tools/cloud-brain/brain-core.ojs`, lines 675 to 867 at `82e92c24`. An account's day is the row
`spend/DAY/ACCOUNT`, a JSON list. `charge` (line 722) appends an entry (`rows.append`) and then reads
the row whole (`rows.get`) and folds it (line 713): an entry counts when fewer than `CHARGES` count
before it and `spent + e.u <= e.A`. `CHARGES` is a constant, 8000 (line 685). The same list answers
`quota.get`, `quota.list`, `quota.ledger` and, for a delegation with a daily amount, the row
`spend/DAY/delegation/ID` (lines 763, 767, 1038).

The core has no SQL of its own. Its rows are one D1 table, `kv (t, k, v)`, reached through the
operations of `rows` in `cloudflare-iac.ojs` (line 455 on): `get`, `put`, `delete`, `list`,
`putIfAbsent`, `increment`, `append`, `deletePrefix`, one statement each. `spec-as-built.md` line
2208 gives that as why the list was built on 2026-10-08: "`rows` has no compare-and-set and the core
cannot send its own SQL", and under it, not chosen: "a SQL statement of the core's own
(`cloudflare-iac.ojs` was another session's file that hour)".

**The limit of a row.** Cloudflare's page of D1's limits, read 2026-10-12
(<https://developers.cloudflare.com/d1/platform/limits/>): "Maximum string, BLOB, or table row size:
2,000,000 bytes (2 MB)". The record of 2026-10-12 had this figure from memory; it is now read. The
page does not say what a statement answers past it, and that was not tried.

**The statements, on a local SQLite.** The two statements of a priced call as `cloudflare-iac.ojs`
sends them, with the fold, against the two of the design below, run 2026-10-12 with `bun:sqlite`
(SQLite 3.54.0) in memory. Entries of 174 bytes; the day of 2026-10-11 on cb4 had 163 on average.
The script was written for this spec and is not kept; task 1 writes the kept test.

```
day of      row          now: append + read whole + fold    design: addWithin + put
   100      17,501 B     0.069 ms                           0.013 ms
 2,000     350,001 B     0.931 ms                           0.010 ms
 8,000   1,400,001 B     3.690 ms                           0.010 ms
10,000   1,750,001 B     4.491 ms                           0.010 ms
```

This is the cost inside SQLite and of the parse, on this machine. It is not D1: it leaves out the
row's way from the database to the Worker, which at 8000 charges is 1.4 MB for each priced call.

**On cb4.** No token of the loop reads the core's time of a call. `metric.query?metric=core.calls`
with `loop-dashboard` answered `{"error":"AuthRequired","message":"not allowed by the rule for this"}`
(401) at 03:56 CEST, as the dashboard's reference says it does for a token. From this machine, at
03:58 CEST (01:58 UTC, so a day about two hours old), with `loop-knowledge`, ten calls each:

```
knowledge.search?semantic=true   0.445 to 1.056 s, median 0.517 s   (makes one priced call inside: ai.v1/embeddings)
knowledge.search                 0.210 to 0.258 s, median 0.234 s   (no priced call)
```

The 0.28 s between them is the model, the vector query and the charge together, and nothing here
separates them. No answer carried `x-brain-price`: the priced call is the one the knowledge service
makes, not the caller's. So R4's time on cb4 is in the owner's list, and the number of statements is
what an agent checks. This writing made 14 searches by meaning; what they cost was not read
(`loop-knowledge` does not name `quota.get`).

**The core's tests as deployed.** `(cd cloud-brain-dev && bun test.ts brain-core)` in the worktree,
04:00 CEST: `"passed":35,"failed":0,"needsBrowser":0`, hash `26486a49c85b…`.

## The design

A day's spend becomes one small row that one statement adds to under a condition. The lines of the
ledger become a row each.

### One new operation: `rows.addWithin(key, add, max)`

`add` and `max` are lists of whole numbers of one length. The row at `key` is a list of that
length, zeros when there is no row. When every `row[j] + add[j] <= max[j]`, the row becomes the sums
and the operation answers it. Otherwise nothing is written and it answers `null`. For D1 it is one
statement; for two numbers:

```sql
INSERT INTO kv (t, k, v) SELECT ?1, ?2, json_array(?3,?5) WHERE ?3 <= ?4 AND ?5 <= ?6
ON CONFLICT (t, k) DO UPDATE SET v = json_array(json_extract(v, '$[0]') + ?3, json_extract(v, '$[1]') + ?5)
WHERE json_extract(v, '$[0]') + ?3 <= ?4 AND json_extract(v, '$[1]') + ?5 <= ?6 RETURNING v
```

Run on SQLite 3.54.0, 2026-10-12, with allowance 1000 and count 7:

```
50 charges of 1 to 297, one after another   row [784, 7], 7 accepted, their sum 784
a first charge of 2000                      null, and no row is made
three charges under a count of 2            [1,1]  [2,2]  null
900, then 200 under 1000, then 200 under 2000   [900,1]  null  [1100,2]
```

The last line is today's "inside the allowance it was made under": each call brings its own
allowance, so one raised during the day is met by the next call.

Why this gives R2. D1 runs one statement at a time against one database, and the condition and the
write are one statement, so no other call's write falls between them. This is the property the
list has today, and it rests on the same ground: `append` is already an upsert with `RETURNING`.
SQLite's page on it (<https://www.sqlite.org/lang_upsert.html>, read 2026-10-12): "The only use for
the WHERE clause at the end of the DO UPDATE is to optionally change the DO UPDATE into a no-op",
and an insert from a `SELECT` needs a `WHERE` before `ON CONFLICT`, which this one has. That page
says nothing of `RETURNING` for an update that became a no-op; the run above answered no row.
*Falsified by:* two calls at once on cb4 that both pass where the allowance has room for one. It was
not tried on D1.

The operation is written in the five places the others are: the `rows` cell and the local store
(`cloudflare-iac.ojs` lines 200 and 243), the D1 path (469), the deployer's Durable Object (761,
read then write, as `increment` is there) and the test rig (1099).

### The core

| Row | Holds | Written by |
|---|---|---|
| `spent/DAY/ACCOUNT` | `[u, n]`: micro-dollars that count, charges that count | `addWithin(key, [u, 1], [A, charges])` |
| `spend/DAY/ACCOUNT/<t>-<i>` | one line `{ t, i, u, m, c, o, v }` of a charge that counted | `rows.put`, after the add answered |
| `spent/DAY/delegation/ID` | `[u, n]` of a delegation with a daily amount | `addWithin` with no bound, after the account paid |

- `charge`: one `addWithin`. Answered: one `put` of the line, and the call goes on. `null`: one
  `get` of the row, to say whether the count or the allowance refused it, and the instance keeps
  `[u, n]` so the next refusal costs no statement (`known`, as today, now compared with the
  setting as it is at that call).
- `charges` joins `PRICING` with the default 8000 and is set with `quota.setDefaults { charges }`,
  a whole number of 1 or more, `null` for the default (R5). The 402 names the number in force.
- `quota.get` and `delegation.list` read one `spent/` row. `quota.list` reads `spent/DAY/` by
  prefix; its `charges` is `n`.
- `quota.ledger` reads `spend/DAY/` by prefix (or `spend/DAY/WHO` and `spend/DAY/WHO/`). A value
  that is a list is a day in the old shape and is folded as today; a value that is an object is a
  line, counted. A line's account is its key without the last `/` part: an account's name has no
  `/` (`isAccount`, line 786), and a delegation's count, the one name with one, has no lines. That is R6 with no migration. `limit` is at most the setting.
- `prune` deletes the same days under `spent/` as under `spend/`.
- A refusal writes no line. `spec-as-built.md` line 2349 records that this was asked for on
  2026-10-08 and not done, "an entry that loses a race is the mechanism". It no longer is.
- A delegation's daily amount keeps the race its comment names (line 756): read, then written after
  the account paid. Making it exact needs an order of two adds with nothing to take the first back,
  and no refunds is the owner's rule.

An accepted priced call is two statements, as today, and each touches one row of under 200 bytes
whatever the day holds (R1, R4).

### What it costs

- **The day of the deploy starts at zero.** The new row has no spend of the hours before, so an
  account can spend up to one more allowance that day, once: $1.00 for the owner on cb4. Not
  chosen: seeding `spent/` from the old list at an instance's first charge, which is two statements
  for every new instance and code that is dead the next day. The owner said of data this young
  "jsut resign everything and move on, we don;t need a key migration stratergy" (`philosophy.md`,
  2026-10-10).
- **A line can be missing.** The add and the line are two statements. When the `put` fails after
  the add, the money is counted and the ledger is one line short; `quota.list` has the true sum.
  The call is forwarded all the same: the charge stands.
- **`quota.ledger` reads a day whole.** 8000 rows by prefix with the parse took 2.42 ms on the local
  SQLite. A day of 100,000 lines is about 17 MB in one answer of D1. Not measured, and the first
  remedy is a `limit` on `rows.list`, which is not in this spec.
- **Storage.** A charge is one row of about 170 bytes for `keepDays` (30). At the 2000 a day of
  2026-10-11 that is 10 MB kept; at 100,000 a day, 510 MB. D1 holds 10 GB on the paid plan (the
  limits page). This is what the count guards now.

### Not chosen

- **Pages of the list, with the existing operations.** `append` answers the entry's place, so a
  page can close at 500 entries and the fold of the pages before it never changes. It needs no
  change to `cloudflare-iac.ojs`, so one deploy and not two. Against it: a charge that lands past
  the end of a page counts for nothing and is sent again to the next; each new instance must learn
  the sum of the closed pages; a priced call still reads up to 90 kB. That is more code in the path
  that counts money, to save one deploy that the owner makes either way.
- **`rows.increment` for the count** (the issue names it). It adds 1 and knows no bound, so it
  cannot refuse.
- **No limit by count.** The allowance alone bounds a day at one charge a micro-dollar: 1,000,000
  rows for $1.00. The count costs nothing more in the statement, so it stays.
- **A default above 8000.** It would let every account make more priced calls on the day of the
  deploy with no word of his for the number. He sets it.

## How each requirement is known to be met

None of these can be run before its task is built. The statement's test is run with `bun test
./tests/tools`. The core's tests are run on a whole build, in the task's worktree:
`bun tools/cloud-brain/build.ts --out tools/cloud-brain/.emitted/cloud-brain.html`, then
`bun tools/cloud-brain/tab-tests.ts tools/cloud-brain/.emitted/cloud-brain.html @tomlarkworthy/brain-core`.
Not `cloud-brain-dev/test.ts brain-core --with FILE`: it takes one file (`test.ts` line 24, "--with
takes a Worker of one module") and runs it against the `cloudflare-iac` cb4 runs, whose rig has no
`addWithin`, so every test of a priced call would fail there until the owner's deploy.

| | Check |
|---|---|
| R1 | A test of the core: the owner's `spent/` row set to `[19999, 19999]` and `charges` set to 20000; one more priced call is 200, the next 402 naming 20000; no row of the rig is a list. The test `test_a_day_holds_8000_charges_of_one_account_and_the_next_is_refused` is rewritten on the new row |
| R2 | `tests/tools/rows-add-within-sql.test.ts`: the statement the seed sends, read from the seed with `tools/notebook-import.ts` and run on `bun:sqlite`, gives the four results quoted above. A test of the core: ten priced calls sent at once with room for three, three answer 200 |
| R3 | A test of the core: after two charges `quota.ledger` answers two lines with their method and origin, and after `prune` no row of a day older than `keepDays` is left under `spend/` or `spent/` |
| R4 | A test of the core counts the operations of `rows` an accepted priced call makes: `addWithin` and `put`, with the day at 0 and at 19999 charges. The time on cb4 is the owner's to read (below) |
| R5 | A test of the core: `quota.setDefaults { charges: 3 }`, three priced calls pass and the fourth is 402 naming 3; `{ charges: null }` answers 8000; `{ charges: 0 }` is 400 |
| R6 | A test of the core: a day of the old shape (a list at `spend/DAY/owner`) and a day of lines are each read by `quota.ledger?day=` with their totals |

After the owner's deploys, on cb4, with the token `loop-quota` (below), in task 3:
`brain.ts curl /xrpc/com.lopecode.brain.quota.get --as loop-quota`, then
`brain.ts curl "/xrpc/com.lopecode.brain.knowledge.search?semantic=true&q=spend" --as loop-quota`,
then `quota.get` again. The search answers 200 and `spent` of the second read is above the first by
the price of one embedding: the new row counts. A token the owner made spends the owner's account
(`accountOf`, line 689; the 2000 charges of 2026-10-11 were "all of the account owner", 1830 of them
from two delegations, one of which `token list` names `loop-knowledge`), and `quota.get` answers a token its own account (the core's test at line 1922).
Not run for this spec: the token does not exist yet. The search alone, with `loop-knowledge`,
answered 200 at 03:58 CEST before any change; a 500 after would say the core met a `rows` with no
`addWithin`.

## The tasks

1. **`ds-1-rows-add-within`**: the operation in `cloudflare-iac.ojs`, in its five places, with the
   statement as a function a test can read; a `test_*` cell over the rig; the test on `bun:sqlite`;
   the sentence of `spec-as-built.md` that lists the operations. Lands the seed. Deploys nothing.
2. **`ds-2-core-spends-by-row`**: the core as "The core" above, its tests, the prose "Prices and
   credits" and the method table (`quota.setDefaults`, `quota.ledger`). Lands the seed. Deploys nothing.
3. **`ds-3-record-and-after`**: after the owner's deploys, the check above, `redistil | grep -c same`,
   and the record `tools/cloud-brain/records/day-spend-not-bounded-by-one-row.md` with what cb4 answered.

Between the landing of task 1 and the owner's deploy, `main` is ahead of what cb4 runs for the
deployer and the core. `tests-replace-console-log` was stopped on a branch for that reason on
2026-10-10 (`philosophy.md`, "Not settled"). Here the issue is his own ask, so the seeds land, and
the approval of this spec is his word for it. If he would sooner have them wait on a branch, tasks 1
and 2 end at a passing test in the worktree.

## What only the owner can do

1. Deploy the deployer with the new `cloudflare-iac` (`brain.ts install-deployer`), then
   `brain.ts redistil --apply`, then apply `brain-core`. The order matters: a core that calls
   `rows.addWithin` on a wrapper without it answers every priced call 500. That a change to the
   wrapper reaches the Workers this way is from `knowledge/changing-and-deploying-a-cloud-brain-worker.md`
   ("`install-deployer`, which is how a change to the wrapper … reaches the Workers"); this writing
   did not build the deployer or run `redistil`.
2. Set his number: `brain.ts curl /xrpc/com.lopecode.brain.quota.setDefaults --owner -X POST -H 'content-type: application/json' -d '{"charges": N}'`.
3. If he wants the time before and after: the core's `ms` for `ai.v1/embeddings` on 2026-10-11 by
   hour, from the logs, which Cloudflare keeps 7 days. Hour 06 UTC began at 5 charges and hour 20
   at about 1800. No task waits on it.

## What the orchestrator makes

One token, when task 3 is next: `BRAIN_BASE=cb4 bun tools/cloud-brain/brain.ts token loop-quota quota.get knowledge.search`.
Those two methods and no more. Task 3 needs it for the check after the deploys. `quota.get` by this
token reads the owner's day and no other account's (another `who` is 401 to anyone but the owner,
line 821); `knowledge.search` is what `loop-knowledge` already reads. Each search by meaning with it
spends one embedding of the owner's allowance, so it is used for that check and for nothing else,
which is an agreement and not a wall.

## Read

In the Brain, `knowledge.search?semantic=true` with `loop-knowledge`, 2026-10-12 03:53 CEST:

| Searched | Found | Used |
|---|---|---|
| daily spend allowance charge counted concurrent calls no lock | `doc:cloud-brain-locks-held-in-the-cluster` 0.92, `doc:cloud-brain-authority` 0.86 | Neither: the lock is a row of the tracker, and the authority doc is about who may call |
| D1 row size limit json list appended | `web:cf-vectorize-limits` 0.68 | No: Vectorize's limits, not D1's |
| atomic conditional increment counter quota ledger | `module:tomlarkworthy:ledger` 0.72 | No: a notebook of accounts, not a store |
| rate limiting budget counter concurrency | `simon-willison:…default-hard-budget-caps-` 0.83, and the digest's finding on it: "the Brain has one" | As ground for R2: a hard cap that refuses, read in the entry's text and not at its address |

No entry of the Brain holds D1's limits or the reason the list was built. That reason was found by
`grep` in `spec-as-built.md` (line 2208).

Outside, each read at its address on 2026-10-12: D1's limits (above); SQLite's UPSERT (above); D1's
prices, <https://developers.cloudflare.com/d1/platform/pricing/>: a row written is $1.00 a million
past 50 million a month, a row read $0.001 a million, "regardless of the size of each row". So a
charge is two rows written before and after, and the page does not say what an upsert counts as.
All three pages were read through a summary a small model made of them, not whole.

## What misled

- `agents/spec.md` step 3 says to read "the logs or the service's tests when it is about a
  service". The logs answer the owner's session, and the one metric over the core's lines refuses a
  token; the brief does not say so, and the 401 was met by trying.
- The issue asks for time "measured on cb4 with a day of some thousands of charges". A day reaches
  that only by spending the owner's allowance, which is not a spec writer's to do.
