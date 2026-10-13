# ds-ingestion-tail-to-analytics-engine: cb4's Workers send their log lines to the dashboard's tail, which writes points to Analytics Engine

Issue `ds-ingestion-tail-to-analytics-engine`, stage 2 of `plan/cloud-brain-dashboard-service.md`. Written
2026-10-13 by the session that measured, built and deployed it, with the owner in it. Times are CEST from `date`
and from the deployer's own lines (`logs.deploys`), unless a line says UTC.

## The owner's word

In this session, 2026-10-13, of the issues that waited for him: "Yes do them all as recommended". Shown the first
measurement, which failed the design as specified: "Ok wait, is the CF docs on this?", then "yes do that per worker
indexing". The deploy of the deployer, the kernel, the core and the database is his; it was made here on that word
and for this issue only.

## What changed

Commit lopecode-dev@904e2a1b. `metric.query` reads Cloudflare's logs as before: the setting `engine` of
`brain-x-dashboard` is unset on cb4, and nothing reads the new store until the owner sets it.

- `cloudflare-iac.ojs`: the wrapper of every Worker has a `tail` handler; a platform cell `analytics` writes a point.
- `brain-dashboard.ojs`: a `tail` that writes one point a log line a metric counts, to the dataset `cb4_metrics`;
  `engineSql` and `engineSeries` for the read; the setting `engine`; the group `Account Analytics Read`.
- `brain-deployer.ojs`: `GROUPS` gains `Account Analytics Read`; the binding `METRICS` and the meta `tail` are
  allowed for `brain-x-dashboard` alone; `ensureLogs` sets `tail_consumers` on each script.
- `brain.ts`: `install-deployer` sets the deployer's own `tail_consumers`.

## What the measurement changed

The spec's index was the metric's name. Measured on scratch Workers before any build (comments 5872 and 5905 of the
issue, which are the kept copy; the scripts and their output are in `tools/scratch/cloud-brain-experiments/ae-measure/`
of the main checkout on this machine, not in git). The scripts kept 5 of the 20 Workers of each run, so each
cell below is of those 5:

```
index                          rate          sent   stored rows  counts by Worker (5 kept of 20)       sum of ms by Worker
the metric                     0.5 a second   240        73      all wrong: 27, 24, 2 where 12
the metric                     22 a second   3000       249      all wrong: 72 to 212 where 150
metric/worker                  22 a second   2990      1242      all right                            off by up to 9.2%
metric/worker/method/status    22 a second   3000      2147      all right (150 each)                 off by up to 4.2% (42,540 read, 44,400 sent)
```

Cloudflare samples at the write, index by index. So the index built is the name and every dimension, joined by "/"
and cut to 96 bytes. A sum is still an estimate. The row at 0.5 a second followed a load of 40,000 lines on the
same index by 13 minutes and more, so it may be worse than a quiet index would be; six single lines a minute apart,
before that load, were kept whole.

## A version upload does not set `tail_consumers`

The first build put `tail_consumers` in the upload's metadata, and the deployer's tests passed against a fake that
kept it. On two scratch Workers Cloudflare ignored the field on a version upload; `PATCH …/script-settings` set it,
and it stayed over later versions. `ensureLogs` now sends that PATCH when the script's list differs, and the fake
keeps the list only from the PATCH and from a whole PUT.

## The deploy

Under the deploy lock, 08:40:49 to 08:56:59. The deployer of before, `e4b02e4f4481`, is
`tools/cloud-brain/.emitted/deployer.before-ds-ingest.json` of the main checkout, a git-ignored file on this machine
and the only input of the way back.

```
08:41      install-deployer            updated cb4-deployer 14f0fb7dd89d; "no tail consumer" (the dashboard had no tail yet)
08:41:33   apply brain-x-dashboard     61d5d7475114 verified, 22 tests; token.mint at 08:41:45 with Account Analytics Read
08:41:48   redistil (no --apply)       ensureLogs set tail_consumers on each script: 22 lines deploy.tail, to 08:42:14
08:42:06   redistil --apply            16 Workers uploaded, 14 confirmed in it (not the kernel, not brain-x-logs); ended 08:46:54, the client's five minutes
08:47:40   redistil --apply            7 Workers uploaded and confirmed; ended 08:49:30
08:49:56   confirm brain               032d6d13c613
08:55      apply brain-x-logs --force  ba1b7b925098 verified, 8 tests
08:56:13   install-deployer            "its log lines go to the tail of cb4-x-dashboard"
```

`redistil` after it: 24 of 24 `same`, `distiller 14f0fb7dd89d`. The consumers were set before the sweep, by the
`redistil` that compares: it runs `ensureLogs` on every Worker, so it is not a read. The first point of the dataset
is of 08:42:01, before the first upload of the sweep.

**The first sweep ended between the upload of `brain-x-logs` and the write of its source.** The Worker ran
`ba1b7b925098`, the deployer's row said so, and the source kept was of `31972f15b7de`:

```
brain-x-logs       no source    ba1b7b925098 is running and the source kept is of 31972f15b7de
```

The second sweep left it for that reason, and it was not put back after ten minutes. A record emitted from the same
build had the hash that ran. Its first `apply`, 08:53:08, was refused ("you saw 31972f15b7de, your view is stale"):
the entry of `seen.json` was of the hash before, and `saw brain-x-logs` moved it. The next `apply` answered `unchanged` and kept no source: that branch keeps the source
only when no row is there (`brain-deployer.ojs`, the comment "Deployed before the deployer kept source"). `apply
--force` deployed it again and kept the source. Not fixed in the deployer; a sweep longer than the client's five
minutes can leave one Worker this way again.

`seen.json`: the first sweep's client did not live to move its entries. 17 were moved with `saw` in a worktree and
landed as lopecode-dev@862f1a9e. `brain-x-static` and `brain-x-blob` were deployed again by another session at
08:58 to 08:59 (`cu-4-price-on-a-stored-write`); their entries are that session's, in bd1314d4.

## What was seen after it

`script-settings` read from Cloudflare at 08:57: `cb4`, `cb4-core`, `cb4-db`, `cb4-x-issues`, `cb4-x-logs` and
`cb4-deployer` each `tail_consumers: [{service: "cb4-x-dashboard"}]`; `cb4-x-dashboard` none. The other scripts
were not read; the deployer logged `deploy.tail` for 22 targets, `brain-core` not among them though its list was read set.

Points in `cb4_metrics` at 06:57:05 UTC: 2691 rows of `core.calls`, the first at 06:42:01 UTC.

Calls by Worker for 06:57:00 to 07:02:00 UTC, read at 07:04:41 UTC, from the logs (`metric.query?metric=core.calls
&by=worker`, which answered `sampled: 4`, so an estimate too) and from the dataset
(`sum(_sample_interval)` by `blob2`):

```
                     logs n   dataset n   dataset rows
all 23 Workers        1559       1552
brain-db               340        331        158
brain-core             320        315        217
brain-x-issues         230        225        214
brain-x-static          74         83         74
11 Workers                 the same count on both sides
8 others                   apart by 1 or 2
```

Neither side counted every line, and a point's time is that of its write, not of the line. No line with `at`
starting `tail.` (`tail.failed`, `tail.dropped`, `tail.throw`) from 06:42 to 07:04 UTC (`logs.query`, count by `at`).

## Not tried, not known

- `engine` is unset, so `engineSql` and `engineSeries` have run in tests and not on cb4. The first
  `metric.query` with it set is the first read with the dashboard's token. That token was minted at the apply
  (`token.mint`, 08:41:45, groups `Account Analytics Read, Workers Observability Read`, read with `logs.query`), so
  the deployer's own token holds the group.
- A count exact by Worker was not shown on cb4: the logs side was sampled. `brain-x-static` had 74 rows that read 83.
- A read of days of real points. The dataset began at 06:42 UTC on 2026-10-13.
- What the points cost. `usage.account` will show it at the next read of a period.
- The way back was not run: `deployer.before-ds-ingest.json` over `.emitted/deployer.json`, `install-deployer`,
  `redistil --apply`. The older `ensureLogs` does not clear `tail_consumers`, so each script would keep its list
  until a PATCH with an empty one.
- The scratch dataset `cb_scratch_metrics` is left on the account; the scratch Workers are deleted.

## Round 2, 2026-10-13: the test holds the prose's sentence

Written by a writer of the loop (`impl-37b8db`), who was not in the session above, after review 6248. Times are
CEST from `date` and from `logs.deploys`.

**What the review held.** lopecode-dev@6cb3f2f8 changed the sentence of the measurement in "The metrics store" of
`brain-dashboard.ojs` (4.2% for the 5 of 20 Workers kept, where it had said 3% of every breakdown) and not the test
that holds it. At `origin/main` 5130491d, before any edit, after this round's start (event 6253) and before 09:23:01:

```
bun tools/cloud-brain/build.ts --out …, then in cloud-brain-dev: bun test.ts brain-x-dashboard --with <the built module>
17 passed, 1 failed, 4 need a browser    FAIL test_dashboard_declares_two_cloudflare_permissions_its_rows_and_its_tail
```

**Which side was mended.** The test. The prose's sentence was read against the output it is of,
`measure-5.jsonl` of `tools/scratch/cloud-brain-experiments/ae-measure/` in the main checkout: 5 Workers in its
`compare` line, each `n` 150 where 150 were sent, and the sum furthest off is `brain-x-w6`, 42,540 read of 44,400
sent, which is 4.2%. The test now expects that sentence, and expects "the count of every breakdown was exact" and
"within 3%" to be gone.

**Five sentences said stage 2 ran on no Brain.** The review named three and left them for this round. Before the
edits, `git grep -n -F -e 'on no Brain' -e 'not on a Brain' -e 'not minted by any'` over `knowledge`,
`plan/cloud-brain-*.md`, the loop's skill, `tools/cloud-brain/*.md`, the records and the seeds printed 7 lines: the
three, two in the dashboard's own prose, and two of other changes that are left as they are
(`brain-deployer.ojs`, of `shell/verify.html`, "not on a Brain until its owner installs this deployer";
`spec-as-built.md`, of a self-test).

| Text | It said | It says |
|---|---|---|
| `plan/cloud-brain-dashboard-service.md`, "Stage 2" | "on no Brain that day" | deployed on cb4 by that session from 08:41 CEST, the read not switched |
| `records/cu-1-deployer-gains-billing-read.md` | the fifth group is "in the seed and not on a Brain" | in the seed and in the deployer cb4 runs, `14f0fb7dd89d` |
| `running-a-cloud-brain.md`, the line of the groups | "not minted by any deployer" | cb4's deployer has the group and minted the dashboard's token with it, as this record has it |
| `brain-dashboard.ojs`, "The metrics store" | "When this was written it ran on no Brain" | the same, then "Since 2026-10-13 08:41 CEST cb4 runs it, with the setting `engine` left unset at that deploy", and where this record is |
| `brain-dashboard.ojs`, its first paragraph | "in the seed, on no Brain when written" | "cb4 runs the function since 2026-10-13 08:41 CEST" |

What of these was seen in this round, and where: `logs.deploys` (token `loop-deploys`, read 09:23) has
`deploy.reason` of the dashboard by the deployer `14f0fb7d…` at 06:41:33 UTC, `deploy.uploaded` of `61d5d747…` at
06:41:40 UTC and `deploy.verified` with `tests: 22` at 06:41:53 UTC, and 22 lines `deploy.tail`;
`cloud-brain-dev/deploy/@tomlarkworthy/brain-deployer.js`, read from cb4 by the worktree's rebase before that run, has
`GROUPS` with `Account Analytics Read` as its fifth; `metric.query?metric=deploys.confirmed&by=target` with
`loop-dashboard` answered with no `store`, which an `engine` that names other metrics would also give.
That the setting was unset at the deploy, the mint (`token.mint`, 08:41:45) and the points of `cb4_metrics` are the
first section's and comment 6164's, and were not read in this round.

**Tests.** After the last edit of the seed:

```
bun test.ts brain-x-dashboard --with <the built module>      18 passed, 0 failed, 4 need a browser
bun tools/cloud-brain/tab-tests.ts … @tomlarkworthy/brain-dashboard      22 tests, 22 passed
bun tools/cloud-brain/verify-run.ts brain-x-dashboard --shell <the build> --times 20      runs 20, passed 20, byChance [], from ["document"]
bun test --timeout=30000 ./tests/tools/ds-ingestion-texts.test.ts      3 pass, 0 fail; with the four files as they were at 5130491d: 0 pass, 3 fail
tests/tools/suite.sh      1113 pass, 0 fail, 114 files (ended 09:29:44, before this line was written)
```

`tests/tools/ds-ingestion-texts.test.ts` is new: the sentence the dashboard's test expects stands twice in the seed
(the test and the prose), the three phrases the review named are gone from their files, each of the three files
names this record, and the seed has no "on no Brain when written".

**The deploy.** A changed `test_*` cell moves the Worker's hash, so this round's landing deploys
`brain-x-dashboard`: the test, the two sentences changed in the prose, and the prose of 6cb3f2f8, which was on `main` and
not deployed. No function of the service is changed. The hash and what the deployer answered are in the submit and
its comment.

**Not tried, not known.**

- Nothing under "Not tried, not known" above was run in this round: `engine` is still unset, and no read was made
  from the dataset.
- No test enters the branch of `brain.ts` `install-deployer` that sets the deployer's own `tail_consumers` (a note
  of review 6248). None was added: it is a call to Cloudflare with the deployer's key, and `brain.ts` has no fake
  for it.
- The new test file reads sentences. It does not show that a text is true, only that these phrases are gone and
  the new ones stand.
