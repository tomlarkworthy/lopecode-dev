# priced-calls-of-the-day-used-up

2026-10-12. One constant of the core, `CHARGES`, from 2000 to 8000, with a test and the sentence of the
core's prose that names it. A deploy of the core, made by a session outside the loop on the owner's word.

## What was met

On 2026-10-11 cb4 refused every priced call from about 22:31 CEST to the end of the UTC day:
`owner has made 2000 priced calls today, which is the most for one day. The count is new at 00:00 UTC` (402).
Searches by meaning, a put that makes a vector, and the deployer's lease of its browser are priced calls, so
three deploys of that evening had no test run in the cluster and were confirmed by hand (the issue's comments).

## What made the 2000

`quota.ledger?day=2026-10-11&limit=2000`, read 2026-10-12 with the owner's session:

```
2000 charges, all of the account owner, all counted, $0.370113

by method     ai.run 970   ai.v1/embeddings 931   browser.extend 82   git.token 17
by origin     delegation 3d10d34f71a5 1362   delegation 69197623c0c5 468   deployer 81   five others 57
by UTC hour   h05 5   h06 959   h07 445   h08 5   h09 24   h10 9   h12 9   h13 17   h14 26   h15 8
              h16 48   h17 68   h18 85   h19 94   h20 198
```

1409 of the 2000 were made in the UTC hours 05 to 07, the morning, and 591 after. So the evening's writers
did not use the day up alone; they met what the morning had left. `token list` names 69197623c0c5 as
`loop-knowledge`. It does not name 3d10d34f71a5, and what made those 1362 calls is not known.

## Why 8000 and not more

The limit was not a setting: `const MICRO = 1e6, CHARGES = 2000, KEEP = 100000;` in `brain-core.ojs`, and
`config.get?worker=brain-core` answers 404 "no Worker brain-core takes settings".

An account's day is one row of D1, a JSON list that each charge is appended to
(`cloudflare-iac.ojs`, `op === "append"`: `json_insert(v, '$[#]', json(?3))`), and `charge` reads the row
whole and folds it at every priced call. The 2000 entries of 2026-10-11, written again from the ledger's
answer in the form the row keeps (`t i u A m c o v`), are 163 bytes each on average and 179 at most,
325,958 bytes in all. The row itself was not read.

```
entries   at 163 bytes   at 179 bytes
 2000      0.33 MB        0.36 MB
 8000      1.30 MB        1.43 MB
10000      1.63 MB        1.79 MB
```

Cloudflare's limit for a row of D1 is 2,000,000 bytes. That figure is from its documentation as this
session knows it: not read on 2026-10-12 and not tried against cb4. The list also takes charges that do
not count (one that lost to another made at the same moment, and one refusal from each instance of the core
that had not yet read the day as full), so it can be longer than `CHARGES`. A row past the limit would fail
the append, and a priced call would then answer an error and not the 402. The owner was offered 10,000 and
said "Yes do those things"; 8000 leaves about 0.57 MB, 3000 entries at 179 bytes, and he was told.

Not chosen: a count kept apart from the list (`rows.increment`, as the member's `mcalls` is). The list is
what stops calls made at once from spending past the allowance with no lock (the comment above `PRICING`),
and it is the ledger. That is a design of the core and is filed as an issue of its own.

Not measured: what a priced call costs in time with a row of 1.3 MB. Each one reads and parses it.

## What changed

`tools/cloud-brain/brain-core.ojs`:

- `CHARGES = 8000`, with a comment that says what bounds it.
- `quota.ledger` answered at most 2000 charges whatever `limit` asked; it answers at most `CHARGES`.
- The prose, "Prices and credits": "A day holds 8000 charges that count for one account".
- `test_a_day_holds_8000_charges_of_one_account_and_the_next_is_refused`: with 7999 charges in the owner's
  day one more priced call passes and the next is 402 with the message above, and the row has 8000.

`QUOTA.calls: 2000` (line 247) is another count, a member's calls of a day (429), and is as it was.

## Tests

In the worktree, on a build of the seeds at the commit of this change:

```
$ (cd cloud-brain-dev && bun test.ts brain-core --with <the built module>)
"passed":35,"failed":0,"needsBrowser":0
$ the same with CHARGES = 2000 put back in the built module (sed)
passed 34, failed 1: test_a_day_holds_8000_charges_of_one_account_and_the_next_is_refused
  expected [200, 402], received [402, 402]
$ bun test ./tests/tools
Ran 475 tests across 51 files. 0 fail, 1 skip
```

## Not tried

- 8000 priced calls on cb4. The test puts 7999 entries of about 70 bytes in the rig's rows, which have no
  size limit.
- The size of a real row at 8000, and D1's answer past its limit.
- `spec-as-built.md` line 2249 ("At 2000 charges that is about 300 kB") is a dated line and is left.
