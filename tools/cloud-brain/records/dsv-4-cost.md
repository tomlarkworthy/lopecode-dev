# brain-x-dashboard: the minutes, the memory, `cost` (`dsv-4-cost`)

Task 4 of `plan/cloud-brain-dashboard-service.md`. Built 2026-10-11 by a writer of the issue loop,
round 1. The seed commit's author time is 20:49:29 +0200
(`git log --format=%ai -1 -- tools/cloud-brain/brain-dashboard.ojs`).

The task has two halves. The seed half is here. **The token half was not done**: it needs the
token `loop-dashboard`, which the owner makes (the spec, his list, item 2), and none is kept:

```
BRAIN_BASE=cb4 bun tools/cloud-brain/brain.ts curl "/xrpc/com.lopecode.brain.metric.query?metric=deploys.confirmed&by=target" --as loop-dashboard
no token "loop-dashboard" is kept; make one with: token loop-dashboard <method…>, …
```

What waited for it was done later the same day, by `dsv-4-cost-on-cb4`: "Measured on cb4" below.

## What changed

One file, `tools/cloud-brain/brain-dashboard.ojs` (`git show --stat` of the seed commit: 195
insertions, 14 deletions).

| cell | what changed |
|---|---|
| `metricAsk` | `since` and `until` are each cut to the minute they are in (`Math.floor(t / 60000) * 60000`), before the check that `since` is before `until`. With neither, `until` is the minute of now. |
| `metricMemoryDefaults` | new: `{ ms: 60000, characters: 4000000 }`. 60 s is the spec's. The 4 000 000 is the writer's. |
| `metricMemoryOf` | new: a memory of texts under keys, `read(key, now, ms)`, `keep(key, text, now, ms)`, `held()`. The time is the caller's, so a test gives it. |
| `metricMemory` | new: the memory of this instance, `metricMemoryOf()`. |
| `dashboard_service` | `metric.query` reads the memory after every refusal, asks Cloudflare when it has no answer, keeps the answer, and adds `cost` to what it answers. |
| `dashboardRig` | a second argument, settings for the rig's `config`. |
| first cell (the reference) | a section "What a query costs"; `cost` in the method table and in the example; the cut in "A query"; one more sentence in "Not known". |

The answer of `metric.query` is now `{ metric, since, until, step, groups, series, cost }`, with
`cost` `{ ms, queries, cached }`:

| | sent to Cloudflare | from the memory |
|---|---|---|
| `ms` | `Date.now()` after Cloudflare's answer was read, less `Date.now()` before the send | 0 |
| `queries` | 1 | 0 |
| `cached` | `false` | `true` |

## Prior art searched

`knowledge.search?semantic=true` with `--as loop-knowledge`, three searches:

| searched | top hits | used |
|---|---|---|
| "cache an answer in a Worker's memory for 60 seconds" | `doc:research-memento-3` 0.717, `brain-ai` 0.637 | Nothing. Both are about an agent's memory. |
| "cost of a logs telemetry query measured time" | `brain-logs` 1.0, `doc:cloud-brain-dashboards-share-series-and-controls` 0.398 | `brain-logs.ojs:114`, where Cloudflare's `result.run.statistics` is read. It was read there for `abr_level` only, so `cost.ms` is the Worker's own clock and no field of Cloudflare's. |
| "metric.query cost cached minutes" | `doc:effective-use-of-fable` 0.78 | Nothing. |

The two memories the seeds already have were found with `grep -n -i "memory" tools/cloud-brain/*.ojs`,
not by the search: `settings` (`cloudflare-iac.ojs:294`) and `gitRead` (`brain-git.ojs:85`). The
new cell has `gitRead`'s shape: a `Map` in a cell of the module, a time on each entry.

## What the spec left open, and what was decided

- **What "the query's text" is.** The spec: an answer is kept "under the query's text". Taken as
  the text of the body Cloudflare is sent (`JSON.stringify(metricBody(…))`). It holds the script
  of the definition's Worker, the `at`, the value, the filters, `by` with types and the two
  minutes, so a member's metric put again over another Worker is another key. Not chosen: the
  caller's query string, which has the caller's `since` before the cut. A consequence: `by=a,b`
  and `by=b,a`, and filters in another order, are two queries.
- **Who asks is not in the key.** The memory is read at `brain-dashboard.ojs:417`, after the tenant
  (403), the definition (404), the kept row's Worker (500) and `metricAsk` (400). So a kept answer
  reaches a second caller only when the service would have asked Cloudflare for that caller.
  Line 1 of `philosophy.md` decided the order.
- **Text and no promise.** Two asks of one query at the same moment are each sent. Not chosen: a
  kept promise that the second ask awaits, because a Worker does not reliably settle, in one
  request, a promise made in another. This is the writer's knowledge of Workers and was not run
  here.
- **`cost.ms` from the memory is 0**, as `queries` is. The spec: "`cost.ms` and `cost.queries` are
  Cloudflare's part". Not chosen: the `ms` of the ask that was kept, which would count one query's
  time once for each answer.
- **A bound.** The spec names none. Without one, a caller that sends a filter with a new value
  each time fills the instance. The memory holds 4 000 000 characters of keys and texts, the
  oldest goes first, and a text that with its key is over that is not kept. A keep also takes out
  every entry past its time.
- **A setting, `memoryMs`.** `config.memoryMs ?? 60000`, as the other services name a time
  (`config.pollMs`, `config.settingsMs`). `0` keeps nothing. The spec names no setting. Taken by
  line 2: the owner turns the memory off with no deploy if a kept answer misleads him. It is also
  how the test shows the service with no memory.
- **`until` with no parameter is the minute of now**, so the minute that has not ended is left
  out, and "the last hour" asked twice in one minute is one query.
- **No price**, as tasks 2 and 3 left it. A declared price refuses a member with no credits
  (`brain-core.ojs:14`, and the 402 at `:751` and `:767`), which changes who may call: `major`, and the owner's `price.put`
  does it with no deploy. What one logs query costs Cloudflare's customer is still not known (the
  spec, "Read"). The reference's "No price" paragraph has one changed clause: a `metric.query`
  "that is not answered from the memory" is one query.

## The sentences of the reference about the core, and where each was read

| sentence | read at |
|---|---|
| "the core charges nothing for the call" | `brain-core.ojs:743`, `if (!expression) return forward(route, c)`: a method with no declared and no set price is forwarded with no charge. No method of the service declares one (`test_metric_rules_…` expects `price` `undefined`). |
| "An answer from the memory is still a call to the core: its line is written" | `brain-core.ojs:223` to 237: the line of a call is written by the core for each call it routes. The service is reached after it. |
| "a call sent by a member's Worker is counted against its author's calls for the day before this service is reached" | `brain-core.ojs:268`, `spend(person)` in `asAuthor`, which runs before the rule and the forward (line 382). |
| "`config.set { worker: "brain-x-dashboard", key: "memoryMs", value: 0 }`" | `brain-core.ojs:32` (the method), `:590` (the route), and `cloudflare-iac.ojs:524` to 553: the core sends a Worker's stored settings with each call, and `config.NAME` reads a stored value when the deployer bound none. |

None of the four was run on cb4.

## Tests

Nine `test_*` cells (`grep -c "^test_" tools/cloud-brain/brain-dashboard.ojs`: 9). Two are new and
two are changed.

| test | what |
|---|---|
| `test_metric_query_asked_again_within_the_memory_sends_cloudflare_one_body` | new. R7's test: the same query twice sends Cloudflare 1 body and the second answer has `cost` `{ ms: 0, queries: 0, cached: true }`. Then: a `since` and an `until` inside the same minutes are the same query; the owner in a tab is answered from the same memory; another minute, `by`, filter and metric are each one more body and are then kept; four callers the service refuses are 403 for a kept query; Cloudflare's 429 is not kept; a second rig has a memory of its own; `memoryMs: 0` sends both asks; a member's metric put again with another `at`, Worker, value or type of a dimension asked by is another body, with a dimension the query does not name it is not; deleted, it is 404. 12 bodies in the first rig. |
| `test_metric_memory_forgets_at_its_time_and_the_ask_is_cut_to_minutes` | new. `metricMemoryOf` with the time given: kept at `T`, read at `T + 59999` and not at `T + 60000`; a keep with 0, -1 or `NaN` keeps nothing; a keep takes out what is past its time; a memory of 30 characters drops the oldest first and does not keep a text over 30. `metricAsk` with `now` given: ten asks and the minutes each is cut to. |
| `test_metric_query_sends_cloudflare_one_body_written_from_the_definition` | changed: `cost` is taken off before the two compares of a whole answer, since `ms` is a clock's. One line added: with no span, `since` and `until` are whole minutes. |
| `test_dashboard_declares_one_cloudflare_permission_and_its_rows` | changed: six lines for the reference's new sentences. |

**Before the change.** The first new test alone, added to the seed with the service as it was
(the build's other cells are the deployed `8702e47fd338`'s):

```
cd $W && bun tools/cloud-brain/build.ts --out tools/cloud-brain/.emitted/cloud-brain.html && bun tools/lope-reader.ts tools/cloud-brain/.emitted/cloud-brain.html --get-module @tomlarkworthy/brain-dashboard > tools/cloud-brain/.emitted/dsv-4-cost.js && (cd cloud-brain-dev && bun test.ts brain-x-dashboard --with $W/tools/cloud-brain/.emitted/dsv-4-cost.js)
     -   1,
     +   2,
"passed":7,"failed":1,"needsBrowser":0
```

Two bodies where the test expects one.

**After**, the same command on the build of the seed commit:

```
"passed":9,"failed":0,"needsBrowser":0
```

**Five mutations of the seed**, each built to `mut.js`, run with the same command, and the seed
put back with `git checkout`:

| mutation | failed |
|---|---|
| `minute` cuts nothing | 3: both new tests and the changed first test |
| an entry is fresh whenever `ms > 0` | 1, the memory test |
| the memory is read under the metric and the two minutes, not the body | 1, the R7 test |
| an answer is kept before Cloudflare's refusal is looked at | 1, the R7 test |
| `keep` is given 60000 whatever `memoryMs` is | 0 |

The last is not seen by the tests: with `memoryMs: 0` the read finds nothing fresh, so what the
keep wrote is never answered. It would cost memory and no answer.

**In a browser**, the step-8 snippet of `agents/implementer.md`, one headless tab, `r=41001`,
`mod` found by `test_metric_query_asked_again_within_the_memory_sends_cloudflare_one_body`:

```
[9,[]]
```

**The deployer's run address, 20 times on the build** (this machine's Chrome 151, not the cluster's):

```
BRAIN_BASE=cb4 bun tools/cloud-brain/verify-run.ts brain-x-dashboard --shell $W/tools/cloud-brain/.emitted/cloud-brain.html --times 20
"mains":["@tomlarkworthy/brain-shell","@tomlarkworthy/brain-dashboard"]
{"worker":"brain-x-dashboard","runs":20,"passed":20,"failed":0,"none":0,"from":["document"],…,"byChance":[],…,"exit":0,"at":"2026-10-11T18:50:19.212Z"}
```

The first and the last run's lines have `"tests":9`.

The rebase after it brought in one file, `plan/cloud-brain-record-checked-by-review-alone.md`,
which the module is not built from, so the tests were not run again. The record emitted in the
tab, read from the file the receiver saved: hash `f8667794afd8…`, `meta.resources` `["rows"]`,
`meta.cloudflare` `["Workers Observability Read"]`, eight methods, a reference of 18122
characters, no `test_` in `parts[0].text`.

## Measured on cb4 (`dsv-4-cost-on-cb4`, 2026-10-11)

This section was "Waits for the token" until the token `loop-dashboard` was made (event 2024 of
`dsv-4-cost-on-cb4`). Its five items were measured by a second writer of the loop on 2026-10-11
between 19:01:00 and 19:06:20 UTC (the `at` of the first and last ask), against
`brain-x-dashboard` at `f8667794afd8` (`getSource?worker=brain-x-dashboard`, read at 19:03 UTC).

Every ask was `brain.ts curl` from the main checkout, one at a time unless said, with curl's own
clock for the whole call:

```
BRAIN_BASE=cb4 bun tools/cloud-brain/brain.ts curl "/xrpc/com.lopecode.brain.metric.query?metric=deploys.confirmed&by=target&since=SINCE&until=UNTIL" --as loop-dashboard -m 120 -w '%{stderr}%{time_total} [%{http_code}]\n'
BRAIN_BASE=cb4 bun tools/cloud-brain/brain.ts curl "/xrpc/com.lopecode.brain.logs.deploys?from=SINCE&to=UNTIL" --as loop-deploys -m 120 -w '%{stderr}%{time_total} [%{http_code}]\n'
```

Two scripts made the asks and wrote one JSON line for each, 65 and 26 lines. The scripts and their
output are attached to the issue: `measure.py`, `measure.jsonl`, `measure2.py`, `measure2.jsonl`
(`issue-as.sh issues-implementer-2 "attachment?id=dsv-4-cost-on-cb4&name=measure.jsonl"`). Each
number below is read from those lines. `U` is 1791745260000 (19:01:00 UTC) and `E` is
1791744660000 (18:51:00 UTC). Every answer was 200.

### R7: the five spans

Cold: `until` is `U` less 1 to 5 minutes, `since` is `until` less the span. Warm: the fifth of
those asked five more times, starting under 0.1 s after its answer.

| span | cold `cost.ms` | cold whole call, s | `step` | `groups` | sum of `n` | warm `cached` | warm whole call, s |
|---|---|---|---|---|---|---|---|
| 15 minutes | 360 318 351 338 392 | 0.64 0.50 0.50 0.58 0.56 | 15000 | 1 | 1 | 5 of 5 | 0.14 to 0.24 |
| 1 hour | 379 410 363 471 363 | 0.57 0.58 0.56 0.65 0.54 | 60000 | 2 2 2 3 3 | 6 6 6 7 7 | 5 of 5 | 0.18 to 0.26 |
| 6 hours | 644 497 523 522 653 | 0.88 0.70 0.73 0.73 0.85 | 360000 | 4 | 19 | 5 of 5 | 0.16 to 0.20 |
| 24 hours | 1010 854 1095 857 894 | 1.28 1.17 1.35 1.04 1.09 | 1440000 | 22 | 63 | 5 of 5 | 0.16 to 0.25 |
| 7 days | 7378 6886 8302 1097 5949 | 7.54 7.14 8.56 1.30 6.18 | 10079000 10078000 10077000 10075000 10074000 | 7 7 7 1 7 | 160 160 160 100 160 | 5 of 5 | 0.16 to 0.25 |

Every cold answer had `cost` `{ queries: 1, cached: false }` and every warm one
`{ ms: 0, queries: 0, cached: true }`. The whole call less `cost.ms` was 0.15 to 0.32 s over the
25 cold asks, which is the kernel, the core and the network from this machine.

The 7-day row is not a count of the lines: see "Whether a 7-day answer is sampled".

### How many asks made again were `cached`

32 of 32, made up to 50 s after the answer:

- the 25 warm asks above;
- 1 more by chance: the last day of the seven below is the query of R3's 24 hours, asked 25 s
  after that answer;
- 6 of a second run. One 1-hour query not asked before (`until` = `E` less 17 minutes), then
  asked again every 10 s:

  ```
  0 s false 376 ms | 10 s true | 20 s true | 30 s true | 40 s true | 50 s true | 60 s false 491 ms | 70 s true
  ```

  The ask at 60 s was sent again, as the memory's time says, and the one at 70 s is 10 s after
  that answer.

No ask reached an instance without the answer. All were from one machine, one at a time, over
five minutes: how long an instance lives and how many run at once is still not counted.

**Two asks at one moment** (the first record's "Not tried"). Three 1-hour queries not asked
before, each sent twice together from two threads: all six answers had `cached: false`,
`queries: 1` (`cost.ms` 356 and 494, 382 and 464, 371 and 436). Each is sent, as the service was
read to do.

### R3: `n` against the lines of `logs.deploys`

The same `since` and `until` to both. `logs.deploys` side: the lines whose `at` is
`deploy.confirmed`, counted from `lines`, and by `target`.

| span, ending at `E` | `metric.query`, sum of `n` | `logs.deploys`, lines confirmed | by target | `metric.query` call, s | `logs.deploys` call, s (its `queries`, all its lines) |
|---|---|---|---|---|---|
| 1 hour | 6 | 6 | equal, 3 targets | 0.63 | 0.82 (1, 36) |
| 24 hours | 62 | 62 | equal, 22 targets | 1.10 | 1.98 (1, 448) |
| 2 days | 136 | 136 | equal | 2.96 | 5.33 (1, 989) |
| 3 days | 171 | 171 | equal | 3.36 | 10.67 (3, 1459) |
| 4 days | **160**, 7 targets | 173, 22 targets | not equal | 6.49 | 12.17 (3, 1466) |
| 5 days | 173 | 173 | equal | 4.44 | 11.01 (3, 1466) |
| 6 days | 173 | 173 | equal | 4.65 | 18.81 (5, 1466) |
| 7 days | **160**, 7 targets | 173, 22 targets | not equal | 8.12 | 17.52 (5, 1466) |

R3 asked for one hour and 24 hours: equal, so the spec's "known limit" is not needed for them.
The other rows were added to find where the 7-day difference starts. The spec's "52 in the 24
hours to 16:32 UTC" was not checked: these 24 hours end at 18:51 UTC.

### Whether a 7-day answer is sampled

It is, and the answer does not say so.

```
one 7-day ask, E - 7 days to E     n 160   {"brain":20,"brain-core":40,"brain-x-dashboard":10,"brain-x-issues":50,"brain-x-knowledge":10,"brain-x-logs":10,"brain-x-page":20}
seven 1-day asks of the same days  n 0 0 0 2 35 74 62 = 173
logs.deploys of the same 7 days    173 lines deploy.confirmed, 22 targets, the first at 2026-10-08 18:50:55 UTC
```

- The seven days summed by target equal the lines by target (22 targets). The 7-day answer has 7
  targets, each `n` a multiple of 10: `brain` 20 where the lines are 45, `brain-x-issues` 50 where
  they are 12, `brain-db` absent where they are 10.
- Six 7-day asks were made (the five cold ones and this one). Their spans differ by up to 9
  minutes at each end and hold the same 173 lines (the first and last confirmed line are inside
  all six). Five answered the 160 above. The sixth (`until` = `U` less 4 minutes) answered
  `{"brain-x-issues":100}` in 1097 ms where the others took 5949 to 8302.
- The 4-day ask answered the same 160. Its `groups` was 22 and its `series` held 7 targets, so
  `groups` does not show a sample.
- 5 and 6 days were whole, one ask each. So the span does not decide it, and what does was not
  found. Not read: Cloudflare's own word on the answer (`result.run.statistics`, which
  `brain-logs.ojs` reads for `abr_level` on an `events` query). `metric.query` does not pass it
  on, and `logs.query` is the owner's.
- The first three of the seven days have no line (the first `deploy.confirmed` is of 2026-10-08).
  Their asks took 3.60, 3.12 and 2.28 s for `n` 0; the three after took 3.21, 1.48 and 1.39 s.

What follows from it is not built here. `metric-query-sampled-unsaid` is opened for it: a count
over days that `metric.query` gives as whole can be 13 of 173 short and name 7 targets of 22.

### What was changed with these numbers

- The reference of `brain-dashboard.ojs` (the last commit of that file, author time 21:09:17 +0200):
  a paragraph and table in "A query" on the sample; a table "Measured on cb4" in "What a query
  costs"; the counts in "Another instance has its own memory" and "Two asks at the same moment";
  three sentences of "Not known" replaced. That is a deploy of `brain-x-dashboard`; its counts
  are in `records/dsv-4-cost-on-cb4.md`.
- A comment on `ds-ingestion-tail-to-analytics-engine` with the logs side's times.

## Not tried

- (Tried since, the first, second and third of this list as far as "Measured on cb4" says: `metric.query` on cb4 with a token, two asks at one moment, and `cost.ms` in a Worker.)
- `metric.query` on cb4 by any caller, after the deploy. What the landing checks there, the Worker's tests as deployed and the reference it serves, is in the comment of the submit on the issue, since it follows this file's commit.
- Two asks of one query at the same moment. Read in the service: the memory is read at line 417,
  before Cloudflare is asked, and written at line 424, after it answered, so each is sent.
  `simulate` in a browser holds one call at a time (`cloudflare-iac.ojs:1089`, the comment on `simulate`), so a test of it
  there would show one body and say nothing of a Worker.
- `Date.now()` before and after the send, in a Worker. In the tests `cost.ms` is a whole number
  of 0 or more. What it reads on cb4 is the token half's.
- The setting `memoryMs` as `config.set` stores it and the core sends it. The test binds it in
  the rig's `BRAIN_CONFIG`, which `configOf` reads before a stored value.
- How long an instance of the Worker lives, and how many there are at once.
- An answer near 4 000 000 characters, and the memory an instance has left with that much kept.
  The bound was run at 30 characters.
- `rows.list` has no LIMIT (`cloudflare-iac.ojs:475`), as the note on the issue says. Not changed:
  the deployer's hash covers that module.
- The tests run together on the owner's page.
