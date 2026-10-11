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

What waits for it is listed under "Waits for the token".

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

## Waits for the token

Each of these is a call on cb4 with `--as loop-dashboard`. None was made, and no `--owner` call was
made in their place: the spec's check is a token's, and the owner in a tab is another caller to
the rule.

- **R7, the five spans.** `metric.query?metric=deploys.confirmed&by=target` over 15 minutes, 1
  hour, 6 hours, 24 hours and 7 days. Cold: five asks, `until` moved back one minute for each.
  Warm: the last of those asked five more times. `cost.ms`, `cost.cached`, `groups` and the wall
  time of each.
- **How many warm asks were `cached`.** That is the count of asks that reached an instance with
  the answer. The reference says it is not counted yet.
- **R3, the comparison.** `n` summed over one hour and over 24 hours, against the lines
  `at: "deploy.confirmed"` of `logs.deploys` over the same span.
- **Whether a `calculations` answer over 7 days is sampled.**
- **The comment on `ds-ingestion-tail-to-analytics-engine`** with the logs side's measured times.
  There are no times to give, so no comment was written there.

## Not tried

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
