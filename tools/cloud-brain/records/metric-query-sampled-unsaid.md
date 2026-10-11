# `metric.query` says a sample, and asks a sampled span of days a day at a time (`metric-query-sampled-unsaid`)

A bug of `brain-x-dashboard`, found by `dsv-4-cost-on-cb4`: a count over 4 or 7 days was made by
Cloudflare from a sample (160 over 7 targets where the lines were 173 over 22) and nothing in the
answer said so. Fixed 2026-10-11 by a writer of the issue loop, round 1. The seed commit's author
time is 21:24:27 +0200 (`git log --format=%ai -1 -- tools/cloud-brain/brain-dashboard.ojs`).

## What Cloudflare's answer carries

The issue left this unread, and the triage (event 2198) gave the choice to it: "either the answer
says it is sampled, or a span over 3 days is asked a day at a time; the writer chooses by what
Cloudflare's answer carries and says why".

No answer of a `calculations` query was read on cb4 before the change: `metric.query` passed on
neither number, and `logs.query` is the owner's. What was read is Cloudflare's API reference for
the telemetry query, on 2026-10-11
(<https://developers.cloudflare.com/api/resources/workers/subresources/observability/subresources/telemetry/methods/query/>,
its text from character 100000 to 200000, through a model that quotes the page; the page itself
was not read by eye):

| where | Cloudflare's words |
|---|---|
| `result.run.statistics`, "optional", and in it `abr_level`, "optional number" | "The level of Adaptive Bit Rate (ABR) sampling used for the query. If empty the ABR level is 1" |
| `sampleInterval` of each `calculations[].aggregates[]` and each `calculations[].series[].data[]` | "Average sample interval of the matched events." "A value above 1 means count and value are estimated from sampled data, not exact." "This is independent of statistics.abr_level." |
| `count` of the same rows | "Estimated number of matching events: the sum of the sample intervals of the stored events." |

So the answer carries the statement, in two places, and both arms of the triage's choice were
taken: the answer says it, and a sampled span is asked again in days. A fixed length of span was
not taken as the trigger, because the measurement does not give one (4 days short, 5 and 6 whole,
`records/dsv-4-cost.md`).

## What changed

One file, `tools/cloud-brain/brain-dashboard.ojs` (`git show --stat` of the seed commit: 180
insertions, 19 deletions).

| cell | what changed |
|---|---|
| `metricSeries` | also answers `sampled`: the highest of `run.statistics.abr_level` and every row's `sampleInterval`, and 1 when neither is there or is a number above 0. |
| `metricPieceDefaults` | new: `{ ms: 86400000, most: 8 }`. |
| `metricPieces` | new: the parts of a span, `ms` long, counted back from `until`, the first the short one; none for a span of `ms` or less, for more than `most` parts, for an `ms` under a minute. |
| `metricJoin` | new: the answers of the parts as one. Rows of the same time and group are added up (`n`, `sum`; `max` the higher). `step` is the longest of the parts', `groups` the most any part answered, `sampled` the highest. |
| `dashboard_service` | `metric.query` sends the span as before. When that answer has `sampled` above 1 and `metricPieces` gives parts, it sends each part, all at once, and answers the join. `cost.queries` is 1 and the parts. A refusal of any part is 502 and nothing is kept. The joined answer is kept under the text of the span's query. |
| first cell (the reference) | `sampled` in the method table and the example; two paragraphs in "A query" in place of "nothing in it says so"; the measured table stays, said to be of the service at `f8667794afd8`; one sentence each in "What a query costs", "Measured on cb4" and "No price"; two in "Not known". |
| `sampledAnswer` | new, for the tests: a stand-in for Cloudflare that answers a timeframe longer than a given length from every tenth line, each counted as ten. |

The answer of `metric.query` is now `{ metric, since, until, step, groups, sampled, series, cost }`.
`sampled` is the one field added. For a span that was asked again, `step`, `groups` and the rows are the parts', as the table says.

## What was decided, and by which line

- **Days, and not halves.** `deployLines` of `brain-logs` halves a sampled window. A `calculations`
  answer is rows a step, and the step is the span's sixtieth (2 days 2880000, 4 days 5760000,
  `measure2.jsonl` of `dsv-4-cost-on-cb4`), so halves of unequal depth would give rows of several
  steps. Seven asks of one day summed to the 173 lines on cb4, target by target, so day parts that
  abut are what was measured. With a span that is not whole days the first part is shorter and
  has a smaller step; `step` is the longest.
- **A part that is still sampled is answered, with `sampled` above 1, and not refused.**
  `logs.deploys` refuses (502) a span it cannot read whole. Not taken here: Cloudflare says
  `sampleInterval` is "independent of statistics.abr_level", so a sample can be one no asking
  again undoes, and `core.calls` holds many more lines than the deploys (40148 in 24 hours on
  2026-10-09, `spec-as-built.md:2971`); a refusal would take the Health panels away over a span
  where a marked estimate can be drawn. The issue's defect is the silence. Line 2 of
  `philosophy.md`: the smaller side, and the easier to undo.
- **A span of a day or less, or of more than 8 parts, is not asked again.** 8 is 7 days, which is
  what Cloudflare keeps, and one short part. A `since` of years ago would otherwise be hundreds of
  queries on the owner's account.
- **A setting, `pieceMs`**, as `memoryMs` is: `0` asks nothing again, so the owner undoes the
  second half of this change with no deploy.
- **No price and no rule changed.** A member's `metric.query` over a span of days can now be up to
  9 queries of Cloudflare's where it was 1. The reference's "No price" paragraph says so.

## Prior art searched

`knowledge.search?semantic=true` with `--as loop-knowledge`, three searches:

| searched | top hits | used |
|---|---|---|
| "telemetry query sampled answer abr_level" | `module:tomlarkworthy:brain-logs` 0.98, `doc:knowledge-reranking` 0.521 | `brain-logs.ojs`, `deployLines`: where `abr_level` is read, and the shape "ask, and ask the parts of what was sampled". |
| "metric count over days is wrong sampling" | `doc:time-series-from-a-web-api` 0.974, `doc:calendar-days-in-the-users-time-zone` 0.947, `doc:cloud-brain-dashboard-service` 0.928 | The spec, "Whether a `calculations` answer is sampled is not known". The other two were not read. |
| "ask a long span in pieces and merge the counts" | `doc:reading-csv-and-delimited-text` 0.868, `doc:cloud-brain-dashboards-share-series-and-controls` 0.684 | Nothing. |

Outside (line 7): Cloudflare's API reference, above.

## Tests

11 `test_*` cells (`grep -c "^test_" tools/cloud-brain/brain-dashboard.ojs`: 11). Two are new and
three are changed.

| test | what |
|---|---|
| `test_metric_query_says_a_sample_and_asks_a_sampled_span_of_days_a_day_at_a_time` | new. 173 lines over the last four of seven days, three targets, and a stand-in that samples a timeframe over 3 days. A 7-day ask: 8 bodies (the span, then seven days that abut), `sampled` 1, `n` by target equal to the lines, `cost.queries` 8; asked again, from the memory. 1 hour and 3 days: one body each. 5 days and 30 minutes: 7 bodies, the first part 30 minutes. With `pieceMs: 0`: one body, `sampled` 10, every `n` a multiple of 10 and not the lines. The level alone and the interval alone are each read. Every timeframe sampled: the 7-day answer is 200 with `sampled` 10 after 8 bodies; a day, 12 hours: one body; a day and a minute: 3; 8 days and a minute: 1; 8 days: 9. A part refused with 429: 502, and the next ask sends 8 again. |
| `test_metric_parts_abut_and_their_rows_are_joined` | new. `metricPieces`, `metricJoin` and `sampled` of `metricSeries` with values given, no service. |
| `test_metric_query_sends_cloudflare_one_body_written_from_the_definition` | changed: `sampled: 1` in the two whole answers it compares. |
| `test_metric_query_asked_again_within_the_memory_sends_cloudflare_one_body` | changed: `sampled: 1` in the one whole answer it compares. |
| `test_dashboard_declares_one_cloudflare_permission_and_its_rows` | changed: the reference's new sentences are there with the module's values (24 hours, 8 parts, up to 9), and three old ones are gone. |

**This reproduces the silence, not Cloudflare's sample.** The stand-in is written from what cb4
answered (every `n` a multiple of 10, a target left out) and from Cloudflare's reference. What
Cloudflare's own answer holds was first read through the deployed service: "On cb4" below.

**Before the change.** The first new test alone, added to the seed with the service as it was
(the build's other cells are the deployed `cf18462d03b6`'s):

```
cd $W && bun tools/cloud-brain/build.ts --out tools/cloud-brain/.emitted/cloud-brain.html && bun tools/lope-reader.ts tools/cloud-brain/.emitted/cloud-brain.html --get-module @tomlarkworthy/brain-dashboard > tools/cloud-brain/.emitted/mq.js && (cd cloud-brain-dev && bun test.ts brain-x-dashboard --with $W/tools/cloud-brain/.emitted/mq.js)
       Array [
         200,
     +   undefined,
         1,
     -   8,
       ]
"passed":9,"failed":1,"needsBrowser":0
```

No `sampled`, and one body where the test expects 8.

**After**, the same command on the build of the seed commit:

```
"passed":11,"failed":0,"needsBrowser":0
```

**Six mutations of the seed**, each built to `mut.js`, run with the same command, and the seed put
back with `git checkout`:

| mutation | failed |
|---|---|
| `sampled` reads the level and no row's interval | 2, both new tests |
| no part is ever asked | 1, the first new test |
| the parts are asked whatever the first answer says | 1, the first new test |
| a refused part is left out of the join | 1, the first new test |
| `sampled` of a join is the first part's | 1, the second new test |
| `cost.queries` stays 1 | 1, the first new test |

**In a browser**, the step-8 snippet of `agents/implementer.md`, one headless tab, `r=52117`, `mod`
found by the first new test:

```
[11,[]]
```

**The deployer's run address, 20 times on the build** (this machine's Chrome, not the cluster's):

```
BRAIN_BASE=cb4 bun tools/cloud-brain/verify-run.ts brain-x-dashboard --shell $W/tools/cloud-brain/.emitted/cloud-brain.html --times 20
"mains":["@tomlarkworthy/brain-shell","@tomlarkworthy/brain-dashboard"]
{"worker":"brain-x-dashboard","runs":20,"passed":20,"failed":0,"none":0,"from":["document"],…,"byChance":[],…,"exit":0,"at":"2026-10-11T19:25:31.370Z"}
```

Each of the 20 runs' lines has `"tests":11` (`grep -o '"tests":[0-9]*' verify.out | sort | uniq -c`: 20).

The rebase after it brought in eight files (three of `.claude/skills/brain-maintenance/`, the
`cloud-brain-dev` pointer, one test file under `tests/tools/` and three records), none of which
the module is built from, so the tests were not run again. The record emitted in the tab, read
from the file the receiver saved: hash `41a68d588088…`, `meta.resources` `["rows"]`,
`meta.cloudflare` `["Workers Observability Read"]`, eight methods, a reference of 23482
characters, no `test_` and no `sampledAnswer` in `parts[0].text`.

## On cb4, after the deploy

`brain-x-dashboard` at `41a68d588088` (the apply's answer: `"state":"verified"`, `"tests":11`;
`brain.ts redistil`: `brain-x-dashboard  same  41a68d588088`). Asked on 2026-10-11 between
19:28:40 and 19:30:16 UTC (the `at` of the script's first and last line), one ask at a time from
one machine, `metric.query?metric=deploys.confirmed&by=target` with `--as loop-dashboard` and
`logs.deploys` with `--as loop-deploys`, the same `since` and `until` to both. `U` is
1791746820000 (19:27:00 UTC). The script and its 17 lines are attached to the issue as
`after.py` and `after.jsonl`; each number below is read from those lines.

| span, ending at `U` | `sampled` | `cost.queries` | `cost.ms` | `step` | `groups` | sum of `n`, targets | `logs.deploys`, lines confirmed, targets | by target |
|---|---|---|---|---|---|---|---|---|
| 1 hour | 1 | 1 | 346 | 60000 | 2 | 3, 2 | not asked | |
| 24 hours | 1 | 1 | 787 | 1440000 | 22 | 64, 22 | not asked | |
| 4 days | 1 | 5 | 9703 | 1440000 | 22 | 175, 22 | 175, 22 | equal |
| 7 days | 1 | 8 | 11232 | 1440000 | 22 | 175, 22 | 175, 22 | equal |
| 6 days and 30 minutes | 1 | 8 | 8881 | 1440000 | 22 | 175, 22 | 175, 22 | equal |
| 7 days, asked again after the asks of the row above | 1 | 0, `cached` | 0 | 1440000 | 22 | 175, 22 | | |
| 7 days, ending a minute earlier | 1 | 8 | 10391 | 1440000 | 22 | 175, 22 | not asked | |
| 7 days, ending two minutes earlier | 1 | 8 | 10007 | 1440000 | 22 | 175, 22 | not asked | |
| 8 days and a minute | **10** | 1 | 7968 | 10078000 | 22 | 160, 7 | not asked | |

What these show, and no more:

- **Cloudflare's `calculations` answer does carry the statement.** The 8-day ask is more than 8
  parts, so it is the one answer as Cloudflare gave it: `sampled` 10, and the same 160 over the
  same 7 targets that `dsv-4-cost-on-cb4` counted (`brain` 20, `brain-core` 40,
  `brain-x-dashboard` 10, `brain-x-issues` 50, `brain-x-knowledge` 10, `brain-x-logs` 10,
  `brain-x-page` 20). Which of the two numbers said 10 is not seen through the service.
- **A sampled span is asked again and comes back whole.** `cost.queries` above 1 says the first
  answer of that span had `sampled` above 1. Five such asks (4 days, three of 7 days, 6 days and
  30 minutes): each answered `sampled` 1, and the three that were compared with the lines were
  equal to them target by target, 175 over 22 targets.
- **It costs time.** A 7-day ask sent to Cloudflare took 10007 to 11232 ms of `cost.ms`, three
  asks, where the one query took 5949 to 8302 ms before the change (`records/dsv-4-cost.md`, five
  asks, with one of 1097). The 4-day ask: 9703 ms where the one query took 6273 (`measure2.jsonl` of `dsv-4-cost-on-cb4`, one ask).
- 5 days was not asked, so a span of days that Cloudflare answers whole in one query was not seen
  after the deploy; 24 hours was, with one query.

## Not tried

- An answer of Cloudflare's read raw: which of the two numbers it carries for a sampled
  `calculations` query. Through the service only the highest of them is seen (10, "On cb4"), and
  for a span that was asked again the first answer's is not seen at all.
- A line at the millisecond where one part ends and the next starts. The stand-in counts it in
  the later part only. Whether Cloudflare counts it in both was not read; the seven 1-day asks of
  `dsv-4-cost-on-cb4` that summed to 173 held no such line that is known of.
- `core.calls` over days, which only the owner's tab reads: how many of its parts stay sampled,
  and the time of 8 queries at once over that many lines.
- More than 500 groups in a part. `groups` of a joined answer is the most any part answered, so
  500 or more still says a part was cut; the distinct groups over the parts are not counted.
- The setting `pieceMs` as `config.set` stores it and the core sends it. The test binds it in the
  rig, as `memoryMs` was tested.
- A sample taken when a line is written (a Worker's `head_sampling_rate`). No Worker of cb4 is
  known to set one; it was not looked for.
- Cloudflare's rate limit with 8 queries sent at once. The general limit read on 2026-10-08 is
  1200 requests in 5 minutes (`logging-research.md:171`).
- A member's call, and the tests run together on the owner's page.
