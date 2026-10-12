# Cloud Brain: a dashboard service, with dashboards and metrics kept as data

Spec of the project `dashboard-service` on cb4's tracker. Written 2026-10-11 from the seeds at
`lopecode-dev` `9b5a97bc` and from what cb4 answered between 16:32 and 16:40 UTC that day. Nothing
here is built, and no cell or method named in "The design" was run. Names are proposals.
Round 2, the same day at 18:59 CEST: the four findings of review 1282 are answered at the end, and
the text they name is changed.

## What was asked

Tom, 2026-10-11, to a Claude Code session outside the loop, which filed the issue at 18:17 CEST
(event 1178). Whole:

> yes lets cover the standard producvity metrics, please file that. I do think we will need a more scalable dashboarding service, which can have multiple dashboards and this would be one of them, so this gets sequenced after building the dashboard service which should be driven by metrics.

The same day, in that session (event 1197), after asking whether Cloudflare has metrics as a
first-party concept:

> cost and performance is important.

and (event 1209):

> I think emitting logs by services is best done though logging, so a metric ingestion service would tail logs and upload to metrics. Metric querying is probably best done though CF via a proxy for multi tenancy.

Everything else in the issue's body and its two comments is that session's reading, and is treated
here as a report, not as his words.

## The reports gathered

`list?parent=dashboard-service` answers no parts. The project was filed from his words directly, so
what is gathered is the issue itself and the two issues it is linked to.

| id | what it says | becomes |
|---|---|---|
| `dashboard-service`, body | Six things to settle: what a metric is, where series come from, what a dashboard is, many dashboards, multi-tenant, what a read costs. Done when Health is one of the service's dashboards and a second is added as data. | R1, R3 to R7 |
| event 1197 | His "cost and performance is important", and a table of four sources with Cloudflare's stated prices, none measured on cb4. | R7. The table is checked in "Read". |
| event 1209 | His direction: emit by logging, an ingestion that tails logs into a metrics store, a query proxy. | R1, R2, R3 |
| `dashboards-share-series-and-controls` (building), event 1180 | Asks this spec to say which of `ds-2` to `ds-4` still hold. | "What happens to `ds-2` to `ds-4`" |
| `flow-metrics` (open) | The work metrics, as a dashboard of this service. Its source is the tracker's events, not a log. | R5 gives it a place to be shown. Its series are left to its own spec: see "Not chosen". |

The requirements. The numbering and the split are the writer's.

- **R1, a metric is emitted by logging.** A service gets no binding and no new call. A metric is
  named lines a Worker already writes, with a value and dimensions.
- **R2, an ingestion tails the logs into Cloudflare's metrics store** (his words of event 1209).
- **R3, a metric is read through a proxy of the Brain** that decides what a caller may read. The
  rule is CEL on the method, as everywhere else.
- **R4, a dashboard is data**: a list of panels over named metrics. One is added with no deploy.
- **R5, many dashboards**: listed, opened, linked to.
- **R6, multi-tenant**: a member reads the metrics of their own Workers and no other's, and keeps
  dashboards of their own.
- **R7, cost and speed are measured on cb4** for each source, and a panel that is drawn again does
  not ask Cloudflare again.
- **R8, Health is one of the dashboards.**

## What exists today

**Where a chart is drawn.** One place: Health, in `tools/cloud-brain/cloud-brain.ojs`. Since
`ds-1-split-healthview` (2026-10-11) it was four cells at `9b5a97bc`: `timeRange`, `callsRead`, `calls`,
`healthView`. `ds-2` has since added `span` (a select, an hour by default) and `callsQuery`. `callsRead` sends one `logs.query` with `view: "calculations"` (count, sum and max of
`ms`, grouped by `worker,method,status`, `limit` 500: lines 95 to 100) and `callsSeries`
turns the answer into `{ since, until, step, series, groups }` with rows
`{ t, worker, method, status, n, ms, max }` (line 120). Three functions draw those rows.

**Who may read.** `logs.query` is `allow: "caller.session"` (`brain-logs.ojs`, the service's method
table): the owner in his own tab. One read of the logs answers a token, `logs.deploys`
(`allow: 'caller.id == "owner"'`), made on his word of 2026-10-11, and it leaves a member's DID and
text out. So no agent of the loop can measure Health's query. What an agent can measure:

```
cb4, 2026-10-11 16:32 UTC, from Berlin, wall time of `brain.ts curl` (bun start included)
knowledge.search?q=x              --as loop-knowledge   0.45 s          the floor of one call
logs.deploys (24 h, 1 CF query)   --as loop-deploys     3.07 2.73 2.54 2.66 s   421 lines, 157 529 bytes
issue.sync?since=0                issues-implementer-2  0.59 s          200 of 1232 events, 254 100 bytes
```

`logs.deploys` is a logs query of `view: "events"` over a day, with `queries: 1` in its answer. It
took 2.1 to 2.6 s over the floor, four times of four. That is the one logs-backed read measured by
this writer. The 421 lines: `deploy.uploaded` 83, `deploy.reason` 68, `deploy.probation` 59,
`deploy.verify` 58, `deploy.confirmed` 52, `deploy.verified` 51, `deploy.deployed` 23,
`deploy.put-back` 9, others 18.

Measured by others, with their dates:

| what | number | where |
|---|---|---|
| a `calculations` query, from Berlin | 420 to 550 ms | `tools/cloud-brain/logging-research.md`, 2026-10-08, on a scratch Worker |
| rows Cloudflare read for 30 minutes of the whole account | 4.2 million | the same |
| the core's lines in 24 hours | 40 148, in 239 groups; at most 179 groups in an hour | `spec-as-built.md`, 2026-10-09 |
| invocations of cb4 in 24 hours | 173 612 | `rpc-performance.md:326`, 2026-10-08, a development day |
| `logs.query` sent by one resize of the page | 1 before `ds-1`, 0 after | `records/ds-1-split-healthview.md`, 2026-10-11 |
| `db.sql` writes by the old `brain-x-metrics` | 48 in 10 minutes | `spec-as-built.md`, 2026-10-09, the day it was removed |

**What the deployer can give a service** (`cloudflare-iac.ojs` lines 1047 to 1056, `brain-deployer.ojs`
lines 245 and 389 to 411, read 2026-10-11):

- Bindings: `rows`, an own D1 database, a Vectorize index, R2, the core, the deployer, assets, the
  browser, containers. No Analytics Engine dataset.
- A Cloudflare token for a service that declares its groups, from
  `GROUPS = ["Workers Observability Read", "Workers AI Read", "Artifacts Write"]`. No analytics group.
- A cron and a `scheduled` function (`brain-snapshot.ojs` lines 369 to 371). No `tail` handler in
  the wrapper, and `grep -n tail_consumers` over the two seeds finds nothing.

**What this decides.** His direction of event 1209 needs three things the deployer does not do: an
Analytics Engine binding to write, the group `Account Analytics Read` to read
(Cloudflare's SQL API page), and `tail_consumers` on every script with a `tail` handler in the
wrapper. Each is a change to `brain-deployer.ojs` or `cloudflare-iac.ojs`. `rules.md`, Never: the
loop does not deploy the deployer, and a fix that needs it "is written up on the issue … and is
not started". So R2 cannot be built by the loop. R1 and R3 to R8 can.

## Read

Searches of the Brain's knowledge base (`knowledge.search?semantic=true`, token `loop-knowledge`,
2026-10-11):

| searched | top hits | used |
|---|---|---|
| "metrics ingestion from logs tail worker" | `module:tomlarkworthy:brain-logs` 0.811, `cw-metrics` 0.612 | `brain-logs.ojs`, read: `logsScope` puts a caller's filters inside the Brain's own filter on the script name, and `?worker=` narrows it to one Worker. The proxy of R3 reuses that. |
| "dashboard defined as data panels over named metrics" | `doc:cloud-brain-dashboards-share-series-and-controls` 1.0 | Read whole. Its `healthPanels` list and its rejected `brain-dashboard` module ("Reopen when a service's panel needs a chart"). |
| "time series metrics store rollup retention" | the same doc 0.74, `unaggregating-cloudwatch-metrics` 0.704 | Nothing. |
| "multi-tenant query proxy access control per tenant" | `fetchp` 0.753, `brain-proxy` 0.663 | Nothing: both pass a URL on, neither holds a caller to a tenant. `brain-git.ojs` does (a member's repository is `m-ID-NAME`), found by grep, and is the model for R6. |
| "Analytics Engine writeDataPoint SQL" | `brain-db` 0.868 | Nothing on Analytics Engine is in the Brain. |
| "lead time deploy frequency DORA metrics" | `doc:cloud-brain-deploy-verdict-from-a-shared-page` 0.883 | Nothing. |
| "Grafana dashboard JSON model panels datasource" | the dashboards doc 0.909 | Nothing new. |

Also read: `tools/cloud-brain/logging-research.md` whole (the Tail Worker and Analytics Engine rows
of its options table, and the token the deployer mints), and the removal of `brain-x-metrics` in
`spec-as-built.md` (line 2911).

Outside, 2026-10-11. Each was read only as a summary made by a fetch tool, not the page itself:

| page | what the summary says | used |
|---|---|---|
| <https://developers.cloudflare.com/analytics/analytics-engine/limits/> | 20 blobs, 20 doubles, one index of 96 bytes, 16 KB of blobs a point, 250 points an invocation, kept three months. Sampling is not on that page. | Stage 2. Agrees with event 1209. |
| <https://developers.cloudflare.com/analytics/analytics-engine/pricing/> | Paid: 10 million points and 1 million read queries a month included, then $0.25 and $1.00 a million. "Currently, you will not be billed". | R7. Agrees with event 1197. |
| <https://developers.cloudflare.com/analytics/analytics-engine/sql-api/> | `POST /accounts/ID/analytics_engine/sql`, a token with `Account Analytics Read`. High-volume indexes are sampled; a count is `SUM(_sample_interval)`. No way to hold a token to one dataset is named. | Stage 2: the proxy writes the SQL and never passes a caller's. |
| <https://developers.cloudflare.com/workers/observability/logs/tail-workers/> | Set in `tail_consumers` of the producer. "invoked every time the producer Worker … is invoked". Paid; "billed by CPU time". No limit on consumers is stated. | Stage 2 and its estimate. |
| <https://developers.cloudflare.com/workers/platform/pricing/> | Workers Logs: 20 million events a month, then $0.60 a million, 7 days. From 2026-12-01 "Cloudflare Observability pricing"; the numbers are not on that page. | R7: the price of a logs query after 2026-12-01 is still not known. |

No literature was searched. The problem is one of fitting Cloudflare's two stores to the Brain's
rules, and the systems that met it (Grafana's dashboard as JSON over named queries) were read for
the spec before this one.

## The design

Two stages. Stage 1 is built by the loop and meets R1 and R3 to R8 over the logs, which keep 7
days. Stage 2 is his ingestion (R2): it puts Cloudflare's metrics store behind the same method, and
every part of it needs the deployer, so it is in the owner's list, kept open as task 8, and built by no writer of the loop.

The order is the writer's choice, by line 2 of the philosophy (the smaller side, easier to undo):
a caller of stage 1 sends a query as data, not Cloudflare's body, so the store behind it changes
with no change to a dashboard. It also gives R7 its numbers: stage 1 answers a token, so an agent
can time a logs-backed metric on cb4 before anything is spent on the other store.

### One new Worker

`brain-x-dashboard`, module `@tomlarkworthy/brain-dashboard`, seed `tools/cloud-brain/brain-dashboard.ojs`.
It declares `cloudflare: ["Workers Observability Read"]`, a group the deployer already mints, and
uses `rows`. No service has both `rows` and a Cloudflare
token today (`brain-logs` has no rows); the code allows it (`cloudflare-iac.ojs:1048`,
`brain-deployer.ojs:393`) and it is untried.

**Nothing in the deployer stops the loop's deploy of it.** Round 1 of this spec said the deployer
holds it for the owner. That was false (review 1282, F1). A writer deploys with
`brain.ts apply`, which is "infra.apply with the recovery key" (`brain.ts` line 6), and:

```
brain-deployer.ojs:666   const free = recovery || !!by;
brain-deployer.ojs:710   else if ((approval || (w.meta.cloudflare || []).length) && !free && !(await approvedOver(w.hash, rec))) {
```

The hold of line 710 is for a caller that is not `free`: the owner's session from the page. It was
the same for `brain-x-git`: "deployed in 12.1 s (the token minted, not held for approval)"
(`records/brain-git.md` line 24). So when the writer of task 1 applies, a Worker that holds a token
reading every log line of the account is live, before that task's review (a submit needs the
deploy as its ref, `SKILL.md`, Triage). Probation is for "every Worker with a version before it"
(`knowledge/changing-and-deploying-a-cloud-brain-worker.md` line 43), so a Worker's first version
is, as read there and not tried, not put back by a failed test either.

The gate there is, is the owner's approval of this spec, and it is the only one. What stands
between the token and a caller after that is the method's rule and the service's own code, which
is what tasks 1 and 2 test in the worktree before the apply
(`cd cloud-brain-dev && bun test.ts brain-x-dashboard --with <the emitted .js>`, as `agents/implementer.md` runs it).
His clarification of 2026-10-11 allows such a deploy by the loop "if its behind a multi tenant
interface and thoroughly designed acording to the principles"; the group is one the deployer
already mints, not a new permission. If he wants a second gate he says so with his letter (his
list, item 1), and task 1 keeps `needs-owner` until he takes it off.

Not `brain-x-logs` with more methods: that service "keeps nothing and has no query language of its
own" (its first cell), and this one keeps definitions and dashboards and writes the query.

### A metric (R1)

A metric is a definition. It points at lines a Worker already writes with `log`:

```js
{ name: "deploys.confirmed",
  worker: "brain-deployer",       // whose lines. Read from Cloudflare's $workers.scriptName, never from the line
  at: "deploy.confirmed",         // the line's `at`
  value: null,                    // a numeric field of the line (summed, and its max kept), or null: the lines are counted
  dims: [{ key: "target" }] }     // fields of the line a query may group or filter by, 8 at most; { key, type: "number" } for a number
```

Its time is Cloudflare's timestamp of the line. Nothing is added to any service.

**Two kinds, and line 1 is why.**

- **Built in**: a definition over a Worker of the Brain itself is a value in the seed and nowhere
  else. Adding one is a change to the seed, with a review. No method writes one, for any caller:
  a token is `caller.id == "owner"` (`brain-logs.ojs:313`), so a `metric.put` open to the owner
  would let a token define `{ worker: "brain-core", at: "call" }` under a name of its own and read
  the core's lines by it (found by the fresh review of this spec). The built-in ones:
  - `core.calls`: `brain-core`, `at: "call"`, `value: "ms"`, dims `worker`, `method`, `status`
    (a number). The fields are at `brain-core.ojs:234` to 238, beside `caller`, `holder`,
    `delegation` and `by`, which are not dimensions.
  - `deploys.confirmed`, `deploys.put-back`, `deploys.failed`: `brain-deployer`, counted, dim
    `target`. The Worker deployed is `target` (`brain-deployer.ojs:534`, `brain-logs.ojs:151`);
    `worker` on such a line is the writer, always `brain-deployer`. `target` can be a member's
    `brain-m-ID-NAME`, which `logs.deploys` already shows the owner and his tokens.
- **A member's**: `metric.put` by a member, kept as a row, named `m.<id>.<name>`, over a Worker
  `brain-m-<id>-…` and no other. `id` is the first 10 characters of the SHA-256 of the DID in
  `x-brain-caller`, computed in the service as `brain-git.ojs:67` and `:133` do (`memberId` in the
  deployer is not importable).

### Reading a metric (R3, R6, R7)

`metric.query?metric=NAME&since=MS&until=MS&by=dim,dim&dim=value` answers the shape Health has today:

```js
{ metric, since, until, step, groups,
  series: [{ t, …the dims asked, n, sum, max }],
  cost: { ms, queries, cached } }
```

- **The query is data.** The service writes Cloudflare's body from it: `calculations` of count,
  and of sum and max of `value`; a filter on the script name and on `at`; `groupBys` of `by`;
  `limit` 500. A caller sends no filter of Cloudflare's and no SQL. `by` and a filter name `dims`
  of the definition only.
- **The rule is on the method**, and reads the name:
  `caller.session || (caller.id == "owner" && request.params.metric.startsWith("deploys.")) || (caller.kind == "did" && request.params.metric.startsWith("m."))`.
  So `core.*` stays with the owner's own tab, as `logs.query` is today; a token reads `deploys.*`,
  which is what `logs.deploys` gives it today, with fewer fields; nothing is opened that the
  clarification of 2026-10-11 on deploy logs kept for him. The owner changes it with `rule.put`
  and no deploy. `request.params` is the query string (`cloudflare-iac.ojs:1636`); a rule that
  reads a parameter refuses when it is absent (line 2255), so a test passes `{ metric }`. This
  rule was not run.
- **The tenant is held in the service**, as `brain-git` holds a repository: a member's call
  reaches metrics named `m.<their id>.…` and is answered 403 for any other, the built-in ones included.
- **`since` and `until` are cut to whole minutes**, and an answer is kept in the Worker's memory
  for 60 s under the query's text. `step` is not chosen by the service: it is Cloudflare's
  `result.run.granularity`, as `callsSeries` reads it (`cloud-brain.ojs:120`). `cost.cached` says
  which it was; `cost.ms` and `cost.queries` are Cloudflare's part. A second isolate asks again:
  how often that happens on cb4 is not known, and the cost task counts it.
- **Whether a `calculations` answer is sampled is not known.** A wide `events` query is
  (`abr_level`, `brain-logs.ojs:61` and `:115`, which is why `deployLines` reads in pieces). For
  `calculations` the one observation is of 2026-10-09: a 24-hour count agreed with 24 one-hour
  counts, 40 148 lines (`spec-as-built.md`). Nothing was read for 7 days. The cost task compares.
  Compared 2026-10-11: a 7-day answer is made from a sample and does not say so (160 where the
  lines were 173); 1 hour and 24 hours were whole (`tools/cloud-brain/records/dsv-4-cost.md`,
  "Measured on cb4"). Since `metric-query-sampled-unsaid`, the same day, the answer
  says it (`sampled`) and a sampled span of days is asked again a day at a time: 7 days then
  equalled the lines, 175 (`tools/cloud-brain/records/metric-query-sampled-unsaid.md`, "On cb4").
- **`groups` not below 500** means Cloudflare cut the answer, as the page's note says for Health
  since `ds-2`.
- A span older than 7 days answers what the logs have. Stage 2 is the way past it.

`metric.list` answers names and definitions, no data. Its rule is
`caller.session || caller.id == "owner" || caller.kind == "did"`. Which names it answers is decided
in the service and not by the rule of `metric.query`: a DID is answered `m.<their id>.…` and no
other, the owner and his tokens every definition. It does not follow a `rule.put` on
`metric.query`, since a service cannot read another method's rule: a name listed is not a metric
the caller may query. A token is listed `core.calls` and refused it. That is the same as a
dashboard, which holds names only. `metric.put` and `metric.delete` write a
member's own; their rule is `caller.kind == "did"`.

**A member reaches none of this on cb4 without the owner.** The kernel refuses a DID before the
rule runs unless the method is in the `MEMBER` list of `cloudflare-iac.ojs` (line 1738), is
`com.lopecode.brain.m.*`, or the owner granted it to that DID (`brain-kernel.ojs:354` to 357, 820
to 825). So `caller.kind == "did"` in a rule means a DID he granted the method. R6 is built and
tested in the service; on cb4 it holds for a member after his `grant.put` of the eight methods (four `metric.*`, four `dashboard.*`), which
is in his list. Adding them to `MEMBER` would move every Worker's hash and is not proposed.

### A dashboard (R4, R5, R8)

```js
{ name: "deploys", title: "Deploys",
  panels: [{ title: "Confirmed, by Worker", metric: "deploys.confirmed", by: ["target"], draw: "bars" },
           { title: "Put back",             metric: "deploys.put-back",  by: ["target"], draw: "table" }] }
```

`dashboard.put`, `dashboard.get?name=`, `dashboard.list`, `dashboard.delete`, rows of the service,
rule `caller.id == "owner" || caller.kind == "did"`. A member's is named `m-<id>-<name>`; a member
lists, reads and writes their own and no other, held in the service. The owner and his tokens
reach every one. (As built, `dsv-3-dashboards`, 2026-10-11: they read every one and write no member's and no built-in name; `tools/cloud-brain/records/dsv-3-dashboards.md`.) A dashboard holds names only: the data is refused or answered by `metric.query`
for each panel, so a token that reads the dashboard `health` draws nothing from it.

`draw` is one of five. `calls`, `faults` and `methods` are the three drawing functions Health has,
which need the rows of `core.calls`. `bars` (the count over time, coloured by the first of `by`)
and `table` (one row a group: n, sum, max) draw any metric.
(As built, `fm-5-page-and-dashboard`, 2026-10-12: seven, with `points` and `share` of
`plan/cloud-brain-flow-metrics.md`, "The page"; the record.)

`health` is built in: three panels over `core.calls`, the ones of today.

**On the page.** A section "Dashboards" of `cloud-brain.ojs`: a select filled from `dashboard.list`,
and the panels of the chosen one, drawn from one `metric.query` for each distinct
`(metric, by, filter)` over `timeRange`, the range `ds-2` gave the page. (As built, `fm-5-page-and-dashboard`,
2026-10-12: a metric whose name starts `flow.` is asked of `issue.flow` of the tracker in its place; the record.) The choice is kept in the
address as `dashboard=NAME`, one more pair of the hash that `notebookHtml` already splits on `&`
(line 1391 at `9b5a97bc`, 1422 at `2edceb8e`), so a dashboard has a link. Health stays where it is and is that same cell drawing
`health`: `callsRead` sends `metric.query?metric=core.calls&by=worker,method,status` in place of
`logs.query`. A visitor reads the line a visitor reads today. (As built, `dsv-6-health-through-the-service`, 2026-10-12: `callsRead` sends that `metric.query`, and Health draws its own two panels from the answer, not the panels of the dashboard `health`. The owner took the strip of faults off Health on 2026-10-11, `fb-a2oogpkdjb`, and the select and panels of a dashboard are since `fb-a2g3jyhecp` cells of `brain-dashboard`, which imports from the page; `tools/cloud-brain/records/dsv-6-health-through-the-service.md`.)

### What happens to `ds-2` to `ds-4`

- `ds-2` (`done`, read 2026-10-11 18:55 CEST) and `ds-3` (`triaged`) stand as written. The span, "Refresh" and
  `timeRange` are what every dashboard here reads.
- `ds-4` (triaged) waits for task 5 below and is then built on it. Its `healthPanels` entries
  `{ draw, worker }` become panels of this spec, and its question (instances made with
  `instantiateDataflow`) is how `dashboardView` makes a panel. Task 5 draws with a plain loop over
  the panels, which `ds-4` replaces. It is not dropped here: the owner approved it at event 946.
  (As built, `ds-4-panels-from-a-template`, 2026-10-12: neither. The panels instanced are the two of Health in
  `cloud-brain.ojs`, as the issue and task 4 of its own spec say. Their entries are `{ draw, worker }` and are no
  panels of a dashboard, and `dashboardView`, since `fb-a2g3jyhecp` a cell of `brain-dashboard.ojs`, still draws
  with its loop; `tools/cloud-brain/records/ds-4-panels-from-a-template.md`, "Not chosen".)

### Stage 2, his ingestion (R2): designed, not built by the loop

- **Write.** The Worker gets a `tail` function and an Analytics Engine dataset named for the Brain.
  For each line of a tail event whose script and `at` match a definition it writes one point:
  the index is the metric's name, the blobs are the `dims` in order, the doubles are `[n, sum, max]`.
  More than 250 matching lines in one event are added up by their dimensions first.
- **Read.** `metric.query` writes SQL from the same query
  (`SUM(_sample_interval * double1)` by `intDiv(toUInt32(timestamp), step)` and the blobs asked,
  `WHERE index1 = NAME`), for a span or a metric the setting `engine` names. Callers and dashboards
  do not change. The token reads every dataset of the account, which is why no caller's SQL is passed.
- **Not known.** The CPU of a tail invocation, how long a point takes to be readable, the time of
  a SQL read, and whether the 16 KB and 96 byte limits meet a real line. Estimate, not a count:
  173 612 invocations a day gives as many tail invocations, and 40 148 core lines a day is about
  1.2 million points a month against 10 million included.

## Not chosen

- **Everything on Analytics Engine from the start.** It is his direction whole. Nothing would land
  until the deployer carries three changes, Health would move stores before either was timed on
  cb4, and no agent could check a task. Stage 1 is the same method with the store he did not name.
- **Rolled-up rows in the service's own D1, written by a cron that reads the logs.** It needs no
  change to the deployer (a cron, an own database and the logs group all exist) and keeps more
  than 7 days. Against it: he named Cloudflare's store, and these are the tables of the
  `brain-x-metrics` he had removed on 2026-10-09. Reopen if stage 2's numbers are bad.
- **A cron that reads the logs into Analytics Engine**, in place of a Tail Worker. It saves
  `tail_consumers` on every script and one invocation for each invocation, and costs a logs query
  a minute. It still needs the binding and the analytics group. Which is cheaper is what the
  owner's measurement in stage 2 says; his word was "tail".
- **A dataset a tenant.** The other shape event 1209 offers. It exists only on Analytics Engine;
  a query as data holds a tenant on both stores.
- **A new line for metrics** (`log({ metric, value })`). A definition over the lines there are
  needs no service to change and makes Health a metric today.
- **A second kind of source, the tracker's events**, for `flow-metrics`. 1232 events are seven
  reads of `issue.sync` (200 an answer, 0.59 s for the first), and a lead time is a join of two
  events, not a count of lines. Two ways are left to that project's spec: the tracker logs one
  line when an issue reaches a deploy or `done`, with the lead time as its value, which makes it a
  metric here with no change to this service; or its dashboard is computed in the page. Its
  deploys a day and its put-backs are `deploys.confirmed` and `deploys.put-back` of this spec.
- **A rule kept with each metric.** "All access control is CEL rules on methods"
  (`knowledge/working-with-cloud-brain-remote-lopecode-cluster.md`). The method's rule reads the name.
- **`metric.put` for the owner**, so that a metric over a Worker of the Brain is added with no
  deploy. A token is the owner to a rule, so it would open every service's own lines to a token
  (see "Two kinds"). Reopen as `caller.session` only, if he wants to add one from his tab.
- **`core.calls` for a token.** It would let an agent time Health's own query. The counts name no
  caller, but the clarification of 2026-10-11 keeps "the core's line of each call" for his
  session, and the dashboards spec refused the same method. The rule above is one `rule.put` from
  it if he wants it.
- **A dashboard anyone reads with no session.** Not asked.

## How each requirement is known to be met

A check is one of four kinds. None calls `logs.query`, needs the owner's tab, or reads a count
from a cell that reads the page's own client.

- **test**: a `test_*` cell of `brain-dashboard.ojs`, on `simulate(dashboard_service, …)` with a
  stand-in for Cloudflare's answer, as `logsRig` is in `brain-logs.ojs`. Run with
  `bun test.ts brain-x-dashboard --with FILE` and then in a tab.
- **token**: a call on cb4 with `--as loop-dashboard`, a token the owner makes once (his list, item 2).
  Until it exists a task lands on its tests and says "not run on cb4".
- **source**: a line read in the built module.
- **tab**: a local QA tab on the built notebook with `client` and `session` stood in by
  `mod.redefine`, as `records/ds-1-split-healthview.md` did. The stand-in `client` answers
  `dashboard.list`, `dashboard.get` and `metric.query` from fixtures and counts them.

| | check | before (2026-10-11) |
|---|---|---|
| R1 | test: `metric.query` of a built-in definition sends Cloudflare one body whose filters are the script name and `at`, whose `groupBys` are the `by` asked with their types, and whose calculations are count, and sum and max of `value`. source: tasks 1 to 7 change no seed but `brain-dashboard.ojs`, `cloud-brain.ojs` and `cloud-brain-docs.ojs` (`git diff --stat`). | No definition. Health's query is written in the page. |
| R3 | test of the rule, five callers as `brain-logs.ojs:313` has them, each with `params: { metric }`: `core.calls` passes the owner in a tab only; `deploys.confirmed` passes the owner in a tab and a token; `m.x.y` passes the owner in a tab and a DID; no `metric` refuses all but the owner in a tab. | `logs.query`: the owner's tab only. |
| R3 | test: `by=caller` on `core.calls` is 400; the service has no route `metric.put` that writes a definition for `x-brain-caller: owner` (it is refused). | |
| R3 | token: `metric.query?metric=deploys.confirmed&by=target` over one hour and over 24 hours, `n` summed, against the lines `at: "deploy.confirmed"` of `logs.deploys` over the same span. Equal, or the record says by how much and the answer carries the difference as a known limit. | 52 in the 24 hours to 16:32 UTC. |
| R4 | token: `dashboard.put` of `deploys`, then `dashboard.get?name=deploys` answers it and `dashboard.list` names it, with no commit and no deploy between (`deploy/services.json` hashes the same before and after). (As built, `dsv-7-second-dashboard-as-data`, 2026-10-12: put on cb4 with `loop-dashboard`; `dashboard.get` answers its 2 panels and `dashboard.list` names `health` and `deploys`; `services.json` read before the put and 16 s after the last list, the same; the record.) | No dashboard is data. |
| R5 | tab: the select lists 2 names from the stand-in; choosing the second draws its panels and puts `dashboard=NAME` in the hash; a tab opened with that hash shows it chosen. | One chart section, no link. |
| R6 | test, in `simulate` with `x-brain-caller` a DID: `metric.put` over `brain-m-<another id>-x` is 403 and over their own is 200; `metric.query` of their own metric is 200, of another member's 403, of `deploys.confirmed` 403; `dashboard.put` is kept as `m-<id>-NAME`; another member's `get` and `delete` of it are 403. Not checked on cb4: a member there needs the owner's grants. | Members read no logs. |
| R7 | test: the same query twice within 60 s sends Cloudflare 1 body, and the second answer has `cost.cached: true`. tab: a dashboard of 3 panels over one `(metric, by)` sends 1 `metric.query`; "Refresh" adds 1; a resize adds 0. | Health: 1 `logs.query` a load, 0 a resize, since `ds-1`. |
| R7 | token: `deploys.confirmed` by `target` over 15 minutes, 1 hour, 6 hours, 24 hours and 7 days. Cold is a span not asked before: `until` moved back one minute for each of 5 asks. Warm is the last of those asked 5 more times. `cost.ms`, `cost.cached`, `groups` and the wall time of each, in the task's record. | `logs.deploys`, 24 hours: 2.5 to 3.1 s wall, 0.45 s the floor. |
| R8 | test: `dashboard.get?name=health` with no row answers three panels over `core.calls`. tab: under "Health", the stand-in sees `metric.query` with `metric=core.calls` and no `logs.query`; the three panels draw; with no session, 0 `.observablehq--error` between the headings "Health" and "Operator". (As built, `dsv-6-health-through-the-service`, 2026-10-12: the two panels Health has since `fb-a2oogpkdjb` draw; the record.) | `callsRead` sends `logs.query`. |
| all | `bun test.ts brain-x-page`: `failed 0`, `passed` not below what `main` gives then. `test_calls_from_the_logs_become_chart_rows` passes with the drawing functions unchanged. | 7 passed, 10 need a browser, after `ds-1`. |
| R2 | Not checked by the loop. Task 8 is open with `needs-owner` until he answers: `get?id=ds-ingestion-tail-to-analytics-engine`. | Nothing tails. |

What only the owner can see: Health on cb4 drawn through `metric.query` in his tab, and the time
its query takes. Neither is a condition of a task landing.

## Tasks, in the order they land

Each is one writer and one review. Tasks 1 to 4 change `brain-dashboard.ojs` and deploy
`brain-x-dashboard`; tasks 5 and 6 deploy `brain-x-page`.

A writer's brief says to stop at a new Worker and at a `major` change
(`agents/implementer.md` step 3). Task 1 is a new Worker, and tasks 1 and 2 are `major`: they add
methods and let a member read counts of their own Workers' lines. The owner's approval of this
spec is his word for both, and it is the one gate before the deploy ("One new Worker"). An
approval follows the deploy and stops nothing: a `major` task that passes review goes to
`awaiting-approval` and not to `done` (`brain-issues.ojs:216`, `pass` has the guard `!issue.major`),
with its change live and pushed, and waits there for his `approve` (his list, item 6). His approval
of the spec is not that word: `rules.md` lets a session make the move "not on a word given for
another issue". The project does not finish while either is there. The orchestrator opens tasks 1 and 2 with `major` and quotes the approval event in a
comment on each, so that `needs-owner` is not put on, or comes off by `rules.md`. If his approval
asks for a second gate, task 1 is opened with `needs-owner` and no such comment, and waits for him.

1. **The service and the built-in metrics.** The seed, the service with its Cloudflare group, the
   built-in definitions, `metric.list`, `metric.query` over the logs, the method's rule. The tests
   of R1 and R3. Its apply is not held: the Worker and its token are live when it lands.
2. **A member's metrics.** `metric.put` and `metric.delete`, the member's id, the tenancy in
   `metric.query` and `metric.list`. The metric half of R6's test. Whether a member's
   `metric.query` carries a `price`, as a method of `brain-ai.ojs` does, is the writer's: each new
   minute and span is one paid logs query on the owner's account (a note of review 1282).
3. **Dashboards.** `dashboard.put`, `get`, `list`, `delete`, the built-in `health`, a member's
   names. The tests of R4 and R8 for the service, and the dashboard half of R6's.
4. **Cost.** The minutes, the 60 s of memory, `cost` in the answer. The test of R7; then, with
   the token, the five spans, how many warm asks were `cached`, and the comparison with
   `logs.deploys` of R3.
5. **The page's section.** "Dashboards", the hash, `dashboardView`, the two
   generic draws. The tab checks of R5 and R7. Health is not touched. It reads `timeRange`, which
   `ds-2` gave the page and is done; it does not wait for `ds-3`, which changes what `callsRead`
   sends and is met again in task 6, whichever lands second. A line for the service in
   `cloud-brain-docs.ojs` and in `knowledge/working-with-cloud-brain-remote-lopecode-cluster.md`.
6. **Health through the service.** `callsRead` sends `metric.query`, and the section "Health"
   draws the dashboard `health`. The tab check of R8. Alone because it moves a section the owner
   reads onto a path only his tab can try on cb4: one commit to put back.
   (As built, `dsv-6-health-through-the-service`, 2026-10-12: the first half; Health keeps its own
   two panels and reads no dashboard; the record.)
7. **A second dashboard, as data.** `dashboard.put` of `deploys` with the token. No commit to a
   seed and no deploy; the check of R4 is the test, and its count is what `dashboard.get` answers.
   (As built, `dsv-7-second-dashboard-as-data`, 2026-10-12: `deploys` is a row on cb4, 2 panels; the
   commit of the task holds its record and these notes, no seed;
   `tools/cloud-brain/records/dsv-7-second-dashboard-as-data.md`.)

8. **His ingestion, kept open** (`ds-ingestion-tail-to-analytics-engine`, a part of this project,
   opened with the others). It is built by no writer of the loop. It holds stage 2 of this spec
   and items 4 and 5 of his list. The orchestrator opens it with `needs-owner`, since it asks an
   act of him from its first day (item 4 needs nothing of stage 1), and with a comment in the
   order `philosophy.md` gives for that label: what the project is for with its numbers, where
   this fits, the choice as letters (measure and then deploy the deployer; or leave the logs as
   the store and close), what the writer would take, how to answer. Task 4's writer adds the
   logs side's measured times to it as a comment. It is closed by his answer, or by the deploy.

After task 7 the issue's "Done when" holds: that is stage 1. `ds-4` and `flow-metrics` can start.
The project does not go to `done` then. `SKILL.md` moves a project at `building` to `done` when
no part is open, and task 8 is open until he has said yes or no to R2. Round 1 left R2 in this
file alone, which nobody reads after a project closes (review 1282, F3). Not chosen: a second
project for stage 2, which would let this one close with his direction of event 1209 unmet and
no line saying so on it.

Each task writes `tools/cloud-brain/records/<its id>.md`.

## What only the owner can do

For a reader with none of this: the Brain draws one chart section, Health, from a span of its own
logs that you choose (an hour by default). This project makes dashboards a service: a dashboard is a list of panels, a panel
names a metric, a metric is lines a Worker already logs. You said metrics should be tailed from
the logs into Cloudflare's metrics store and read through a proxy.

1. **Approve this spec, or send it back, with one letter.** The store you named needs three
   changes to the deployer, which the loop may not deploy.
   - **A.** As written. The loop builds the proxy, the dashboards and Health over the logs
     (7 days kept, about 2.5 s for a day of deploy lines today). Your ingestion follows as items 4
     and 5, behind the same method. For: tasks 1 to 6 are built, deployed and reviewed on
     their tests with nothing more from you, and the logs side is measured first. What of A
     still waits for you: tasks 1 and 2 are `major`, so each stops at "To approve" after its
     review, already live, until you approve it (item 6); no check on cb4
     runs, and task 7 cannot be done at all, until you make the token of item 2 after task 1;
     no member reaches any of it until item 3. Against: until item 5 a metric is counted from log
     lines each time it is asked. And your "A" is the only stop before a new Worker that holds a
     token reading every log line of the account is live: the loop's apply is not held by the
     deployer, and task 1 deploys before its review. To have a second stop, answer "A, hold task
     1": task 1 then waits with `needs-owner` until you take it off.
   - **B.** Analytics Engine first. Nothing of this project lands until items 4 and 5 are done by
     you or a session with you. For: one store, the one you named. Against: no agent can build or
     check it, and Health changes store with no number from cb4.
   - The writer takes A, by line 2 (the smaller side, easier to undo). Answer "A", "A, hold task
     1" or "B". Approval is taken as your word for two things the loop does not do on its own: a
     new Worker, and a member reading counts of their own Workers' lines (tasks 1 and 2,
     `major`). Nothing asks you again before the deploy; item 6 comes after it.
2. **Make the token** the checks use, once, after task 1:
   `BRAIN_BASE=cb4 bun tools/cloud-brain/brain.ts token loop-dashboard metric.query metric.list 'dashboard.*'`.
   By the rule it reads `deploys.*` and no other metric.
3. **Grant a member the methods**, when you want one to use it: `grant.put` of the eight
   (`metric.query`, `metric.list`, `metric.put`, `metric.delete`, `dashboard.put`, `dashboard.get`,
   `dashboard.list`, `dashboard.delete`) for that DID, in your session. Each is named whole:
   `grant.put` refuses `dashboard.*` (`brain-kernel.ojs:824`). Until then R6 is tests only.
4. **Measure the other store, outside the Brain**, as `logging-research.md` did with a scratch
   Worker: the CPU of a tail invocation, the seconds until a written point is read, and the time
   of a SQL read over an hour, a day and 30 days. A session with you runs it; the loop holds no
   Cloudflare token.
5. **Deploy the deployer with three changes**, written by a session with you: a binding for an
   Analytics Engine dataset, `Account Analytics Read` in `GROUPS` (a new permission), and
   `tail_consumers` with a `tail` handler in the wrapper. The wrapper is in every Worker's hash,
   so every Worker is deployed once, as for `observability` on 2026-10-08.
6. **Approve tasks 1 and 2**, each when it shows under "To approve" on the tracker after its
   review, or say so of each to a session. By then the change is deployed. The project stays at
   `building` until both are approved.

Items 4 and 5 are your direction of event 1209. They are kept in front of you by task 8, an issue
labeled `needs-owner` that stays open, and holds the project open, until you say yes or no.

No task of the loop installs a policy, adds a rule to `rules.md` or a secret, or deploys the
kernel, the core, the database or the deployer.

## The fresh review before submitting (2026-10-11)

One reader with no context read the first draft against the seeds: 8 findings, all taken.

- **A token could read the core's lines under another name**: `metric.put` was open to the owner,
  and a token is the owner to a rule. Definitions over the Brain's Workers are now values of the
  seed; the rule names what a token reads (`deploys.`).
- **`deploys.*` by `worker` gave one group**: the Worker deployed is `target`. Settled in the text.
- **A member was both refused and answered `deploys.confirmed`**, and could read another member's
  dashboard. Refused, and own dashboards only.
- **A DID reaches no method without a grant.** Said under "Reading a metric" and in the owner's list.
- **Task 1 was a new Worker with no word for it.** Said above the tasks and in the owner's list.
- **Tasks 1 and 4 were each too large.** Seven tasks where there were five.
- **Left to guess**: sampling of `calculations`, dimension types, where `step` comes from, the
  member's id, the rule test's parameters, what "cold" is. Each is now in the text.
- **Line numbers** of `request.params`, `limit` and the five callers.

## Review 1282, round 2 (2026-10-11)

The reviewer's four findings, each read against the source before it was taken.

- **F1, the deployer does not hold the loop's deploy.** True: lines 666 and 710 of
  `brain-deployer.ojs` and line 6 of `brain.ts`, quoted under "One new Worker". Every sentence that
  said it was held is gone (that section, task 1, his item 2, which is removed). The gate named is
  his approval of the spec, with "A, hold task 1" for a second. "First deploy" is gone too: on the
  held path the hold is of each new hash. Added on reading, not asked: a first version has no
  probation, by the knowledge page's line 43; not tried.
- **F2, letter A said "lands without you".** A now says what lands without him (tasks 1 to 6, on
  tests), what waits for the token and when, what waits for grants, and that A is the one stop
  before the deploy.
- **F3, nothing carried R2.** Task 8, a part labeled `needs-owner` that holds the project at
  `building`. `issue.open` takes `labels` (`brain-issues.ojs:37`), so the
  orchestrator opens it labeled in one call; that call was not made.
- **F4.** (a) Eight methods, in both places. (b) `ds-2` is `done`; task 5 no longer waits for it
  and says why it does not wait for `ds-3`. (c) `metric.list` has a rule, and the text says it
  does not follow a `rule.put` on `metric.query`.

His notes: a `price` for a member's query is left to task 2's writer; line 1391 is given at both commits.

The fresh read of this round (one agent with the file only, 2026-10-11): 5 findings, all taken.
The first was F2 again in the new text: A said tasks 1 to 6 need nothing more of him, and a
`major` task waits at `awaiting-approval` for his `approve` (`brain-issues.ojs:216`). It is now in
A, above the tasks and item 6 of his list. The others: the test command named no directory; his
summary said "the last hour" of a page that has had a span since `ds-2`; `dashboard.*` in a grant
is refused; the label on `issue.open` read from source.
