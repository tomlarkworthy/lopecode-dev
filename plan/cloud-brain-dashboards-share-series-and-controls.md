# Cloud Brain: the page's dashboards share one time range and one series

Spec of the project `dashboards-share-series-and-controls` on cb4's tracker. Written 2026-10-11
from the seeds at `lopecode-dev` `bd307d32` and from what cb4 served at 14:01 UTC that day. Nothing
here is built. The design in "The design" is a proposal: none of its cells was run.

## What was asked

Tom, 2026-10-11, a note on the Brain's page at the heading "Health" of `@tomlarkworthy/cloud-brain`
(issue `fb-a2kw99i9wy`, event 858), whole:

> we should have a better abstraction for dashbaords, a shared timeseries ad controls for changing the data. see dataflowTemplating

## The reports gathered

| id | what it says | becomes |
|---|---|---|
| `fb-a2kw99i9wy` | the note above | R1 to R4 below |

One report. It is the owner's own and names a module to read, so the spec is written from it and
from the code, not from a pattern across reports.

The requirements, as this spec reads the note. The split into four is the writer's, not his words.

- **R1, a shared time range.** One control sets the span of time. Every panel of the page that
  draws or lists things over time reads it.
- **R2, controls change the data.** A control is a `viewof` cell. Changing it asks for the data
  again, once, and every panel that reads the data follows. Nothing else asks: not a resize, not
  the Services table loading.
- **R3, a shared series.** The rows a panel draws are the value of a cell, in one shape, which any
  other cell or panel of the page can read.
- **R4, panels made with `@tomlarkworthy/dataflow-templating`.** A panel is a chain of cells written
  once and instanced as many times as the dashboard shows it. What is shared between the instances
  (the range, the series) is left out of the template.

## What exists today

Read from the seeds on 2026-10-11. `tools/cloud-brain/cloud-brain.ojs` is 1495 lines, with nine
sections: Health, Operator, Services, Library, Access, Spending, Logs, People, Clone.

**Charts.** `Plot` is called in two functions across the 29 seeds, both in `cloud-brain.ojs`:
`requestsChart` (line 98) and `healthStrip` (line 111). No service's own panel draws a chart
(`grep -n "Plot\." tools/cloud-brain/*.ojs`: 5 lines, all in those two functions).

**Health** (lines 30 to 170) is one cell, `healthView`, and seven functions it calls. The cell,
lines 32 to 43, with `…` where text is left out:

```
healthView = {
  assembled;
  if (!client || !session.owner) return htl.html`<i …>Sign in as the owner to see the calls of the last hour.</i>`;
  const until = Date.now(), ask = { since: until - 3600000, until };
  const data = await client.procedure("logs.query", callsQuery(ask)).then((answer) => callsSeries(answer, ask), …);
  return dashboard([
    { title: "Calls", body: requestsChart(data, { width: width - 40 }), wide: true },
    { title: "Health", body: healthStrip(data, { width: width - 40 }), wide: true },
    { title: "By method", body: methodTable(data, { link: … }), wide: true }
  ], { note: … `The last hour, from the core's log lines: …` });
}
```

- It has 0 controls. The span is the constant `3600000`, one hour.
- Each drawing function fixes its own grouping: `rollup(data.series, ["t", "worker"])` in
  `requestsChart` and `healthStrip` (lines 99, 112), `["worker", "method"]` in `methodTable` (line 126).
- The rows already have one shape: `callsSeries` answers `{ since, until, step, series, groups }`
  with `series` rows `{ t, worker, method, status, n, ms, max }`, and all three panels draw from
  that one value through `rollup(series, keys)`. So R3 is met inside the cell and nowhere else:
  the rows are a local `const`, and no other cell can read them.
- The query and the drawing are one cell. Its compiled inputs, from what cb4 runs
  (`cloud-brain-dev/deploy/@tomlarkworthy/cloud-brain.js` line 1295, hash `e45568e2…`):

  ```
  $def("_cloudbrain_healthView", "healthView", ["assembled","client","session","htl","callsQuery","callsSeries","dashboard","requestsChart","width","healthStrip","methodTable","moduleLink","brainModules","services","d3"], …)
  ```

  `width` is the standard library's generator of the page's width, and `services` is the value of
  the Services table. By the runtime's rule a new value of either runs the cell again, and the cell
  sends `logs.query` each time it runs. **Not observed in a browser**: the count of `logs.query`
  calls for one resize was not measured. Task 1 measures it before changing anything.
- There is no way to ask again but to reload the page.

**Logs** (lines 465 to 567) has five controls, among them its own span:
`Inputs.select(new Map([["15 minutes", 15], ["1 hour", 60], ["6 hours", 360], ["24 hours", 1440], ["7 days", 10080]]), { label: "Last", value: 60 })`.
The controls are built inside the function `logsView` and read when the button "Read" is pressed.
None is a cell, so nothing else on the page can read or set them.

So the page sends `logs.query` from two places with two spans that do not know of each other:
Health with `view: "calculations"` over a fixed hour, Logs with `view: "events"` over a chosen one.

**Spending** (lines 415 to 464) is three tables from `quota.list`, `price.list` and
`quota.ledger?limit=20`, for the current UTC day. It has no time axis.

**Tests.** `bun sync.ts https://cb4.endpointservices.workers.dev && bun test.ts brain-x-page` in a
worktree's `cloud-brain-dev/`, 2026-10-11 14:01 UTC: hash `e45568e2faf0…`, `passed 6, failed 0,
needsBrowser 10`. The one test of Health, `test_calls_from_the_logs_become_chart_rows`, is among
the 10 that need a browser (`document is not defined`). It covers `callsQuery`, `callsSeries`,
`rollup` and the three drawing functions with a fixture in Cloudflare's shape. It does not cover
`healthView`.

**`@tomlarkworthy/dataflow-templating`** is in the page's notebook already: `editor-5` and
`visualizer` import it (`lope-reader.ts --compute-imports` on
`lopebooks/notebooks/@tomlarkworthy_cloud-brain.html`, 103 modules). No seed under
`tools/cloud-brain/` imports it. Its text is in the shell the kernel serves (17 mentions in
`.emitted/shell.html` of the main checkout; the date of that build was not read).

## Read

Searches of the Brain's knowledge base (`knowledge.search?semantic=true`, token `loop-knowledge`,
2026-10-11), with the top hit and what was used:

| searched | top hits | used |
|---|---|---|
| "dataflow templating instantiate a chain of cells with different inputs" | `module:tomlarkworthy:dataflow-templating` 0.876, `compile-dataflow` 0.807 | The module, read whole from the page's notebook. Its worked example is titled "Example: A Dashboard Charting Widget". R4 and the design follow it. |
| "dashboard time series shared controls" | `module:tomlarkworthy:cw-share-auth` 0.942, `doc:time-series-from-a-web-api` 0.75 | The doc: a relative span is computed from the clock as two absolute instants, and both ends are filtered. `callsQuery` does this today. |
| "metrics monitoring dashboard design" | `module:tomlarkworthy:cw-metrics` 0.909 | Read `cwFetchWidget` and `cwPlotWidget` in `lopebooks/notebooks/@tomlarkworthy_aws-dashboard.html`. Each widget is fetched with a `start` and `end` the caller passes, and its rows are `{ time, series, value }`. Not reused: see "Not chosen". |
| "linked charts brushing time range control Plot" | `doc:drawing-charts-with-plot` 0.915 | A band axis sorts its categories unless given a `domain`. `healthStrip` sets one. Nothing else used. |
| "logs query health chart calls by worker" | `module:tomlarkworthy:brain-logs` 1.0 | The method reference of `brain-logs.ojs`: `logs.query` is the owner's own session only. |
| "reusable chart component viewof parameterised notebook" | `module:d3:example-components` 0.903, `module:tomlarkworthy:view` 0.537 | Nothing. |

Also read: `plan/dataflow-templating-2.md` (the record of `instantiateDataflow`, shipped
2026-08-09), its parts "Why not compileDataflow", "Whole-page render" and "The mutable write-back
was not a regression".

Outside, each read only as a summary made by a fetch tool, not the page itself:

- Grafana, <https://grafana.com/docs/grafana/latest/dashboards/use-dashboards/>. The summary: the
  time picker sets the span for the dashboard; the Refresh icon "immediately reruns every query on
  the dashboard"; "By default, Grafana does not automatically refresh the dashboard." Used: the
  range and a refresh are controls of the dashboard, not of a panel, and no timer by default.
  That page did not say whether a panel may override the range, and the page on variables
  (<https://grafana.com/docs/grafana/latest/dashboards/variables/add-template-variables/>) did not
  name `$__from` or `$__to`. Nothing here rests on either.
- Vega-Lite, <https://vega.github.io/vega-lite/docs/parameter.html>. The summary: a parameter with
  `bind` is set by an input element and "can be used throughout the remainder of the chart
  specification". Used: nothing beyond confirming the model. An Observable `viewof` cell is that
  already.

## The design

Everything is cells of `cloud-brain.ojs`. No new module, Worker, method, rule or permission.

The dataflow-templating notebook builds a dashboard in this order, and the design is that order
applied to Health. Its words on the shared part:

> The other cool thing to note is that we did not include the timerange when cloning. That variable was not templated so all the widgets share that reactive reference and so have aligned time ranges.

**Shared cells, one of each on the page.** Names are proposals.

```js
viewof span = Inputs.select(new Map([["15 minutes", 15], ["1 hour", 60], ["6 hours", 360], ["24 hours", 1440], ["7 days", 10080]]), { label: "Last", value: 60 })
viewof asked = Inputs.button("Refresh")
timeRange = (asked, { since: Date.now() - span * 60000, until: Date.now() })   // the one place the clock is read
callsRead = async ({ client, range }) => …   // a function. No client: null, nothing sent. Else one logs.query of callsQuery(range), through callsSeries; a failure answers { ...range, step, series: [], error } as today.
calls = (assembled, callsRead({ client: session.owner ? client : null, range: timeRange }))   // inputs: assembled, client, session, timeRange, callsRead
```

`callsRead` is what a test calls with a stand-in, as the Logs test calls `logsView({ client, now })`
(line 498): `callsRead({ client: { procedure: async (name, body) => (seen.push([name, body]), fixture) }, range })`.
The cell `calls` only passes the page's own client to it.

`calls` does not name `width`, `services` or `brainModules`, so R2's "nothing else asks" holds by
the cell's inputs. It keeps `assembled`, as `healthView` has today. Why `healthView` waits for
`assembled` is not written in the seed and was not found; task 1 keeps it and does not guess.
The compiled inputs of `assembled` are `client, brainJoined, session, verifyService, loadService`
(deploy line 1354): not `width`, not `services`. So `calls` asks again when the Workers' modules
are assembled again (a change of `brainJoined` or of the session), and for no other reason but its
own range.

`calls` keeps the owner check: with no client, or a caller who is not the owner, its value is
`null` and it sends nothing. `healthView` then answers the line a visitor reads today ("Sign in as
the owner to see the calls of …") and makes no panel.

**A panel, written once.** The prototype is ordinary cells, visible and editable on the page like
any other, as the pizza widget is in the module's notebook:

```js
panelStart = ({ draw: "calls", worker: "" })               // replaced in each instance
viewof panelDraw = Inputs.select(["calls", "faults", "table"], { label: "Show", value: panelStart.draw })
viewof panelWorker = Inputs.select(["", …the Workers named in calls.series], { label: "Worker", format: (w) => w || "all", value: panelStart.worker })
panelBody = …   // requestsChart, healthStrip or methodTable of { ...calls, series: the rows of panelWorker, or all }, at `width`
panel = htl.html`<div>${viewof panelDraw}${viewof panelWorker}${panelBody}</div>`
```

The per-panel control filters rows before they are drawn, so the three drawing functions and their
test stay as they are. A control that changes the grouping (by method, by status) would need each
function to take its keys; that is not in this design.

**With no owner** `calls` is `null`, and the prototype cells are cells of the page outside
`healthView`, so each says what it answers then:

- `viewof panelDraw`: as for the owner. It reads only `panelStart`.
- `viewof panelWorker`: a select with the one option "all" (`calls ? …its Workers : []`).
- `panelBody`: with `calls` null, the muted line "Sign in as the owner to see a panel.", and no
  drawing function is called.
- `panel`: the two controls and that line.
- `healthView` makes no instance (above), so nothing else reads a null.

The prototype is under a sub-heading of its own after the dashboard, "### One panel", with a line
saying the panels above are instances of it. It draws as one more live panel there, which is where
a panel is edited and tried.

**The dashboard, instanced.**

```js
import {instantiateDataflow} from "@tomlarkworthy/dataflow-templating"
import {Inspector} from "@tomlarkworthy/inspector"
import {runtime, createModule, lookupVariable, thisModule, onCodeChange} from "@tomlarkworthy/runtime-sdk"   // line 1488 today imports the first two

viewof myModule = thisModule()
healthPanels = [{ draw: "calls", worker: "" }, { draw: "faults", worker: "" }, { draw: "table", worker: "" }]
healthView = …
  // for each entry: instantiateDataflow(template, { params: { panelStart: entry }, observers: (name) => name === "panel" ? new Inspector(box) : null, watch: onCodeChange })
  // dispose each on invalidation; lay the boxes out with dashboard()
```

`template` is `lookupVariable(["viewof panelDraw", "panelDraw", "viewof panelWorker", "panelWorker", "panelBody", "panel"], myModule)`.
Neither `Inspector` nor any of the three new runtime-sdk names is imported by `cloud-brain.ojs` today.
`calls`, `timeRange`, `width` and the drawing functions are not in it, so each instance reads the
page's own through a bridge (`instance.captures`). The three panels of today are the three entries
of `healthPanels`; a fourth panel is a fourth entry.

What the module's own notebook says of the cost, which applies here:

> A capture reaches the instance one tick after the origin settles it. That latency is the real cost of a bridge.

and of the instances: they live in a second `Runtime`, so the page's variables do not grow with the
number of panels (`plan/dataflow-templating-2.md`, "Building a second instance is now free":
parametric-svg 2692 to 2692 variables).

**Logs** reads the same span. Inside `logsView` the range select becomes
`Inputs.bind(Inputs.select(…same options…), viewof span)`: the control stays where it is, and it
and the one under Health are one value. This is how the module's notebook binds `startDay` and
`endDay` beside its widgets. Logs shares the control, not the series: its query is `view: "events"`
and Health's is `view: "calculations"`, two different answers. Logs still reads on "Read".

**Not known, and the task that finds it.**

- What Cloudflare answers for the longer spans. `callsQuery` asks for at most 500 groups and takes
  the step Cloudflare chooses (`granularity`, 60 s for an hour). For 24 hours and 7 days the step,
  the number of rows and the time the query takes were not measured, and no agent of the loop can
  measure them: `logs.query` is `allow: "caller.session"` (`brain-logs.ojs` line 225), the owner in
  his own tab. So no task waits for that number. The select offers the five spans Logs offers
  today, and the page says what it got: the note under the panels gives the span, the step and
  `groups`, and when `groups` is not below the query's own `limit` (500) it adds "500 groups is the
  limit of one answer: some calls may be missing." A query that fails shows its error there, as
  today. That `groups` (the length of the count's `aggregates`) reaches 500 when Cloudflare cuts
  an answer is a reading of `callsSeries`, not something seen. The owner reads the true numbers
  off the page the first time he picks 7 days; nothing asks him to.
- Whether a `viewof` in an instance, drawn through an `Inspector`, keeps its choice when `calls`
  changes. `viewof panelWorker` reads `calls` for its list of Workers, so as written it is made again
  on each answer and falls back to its start. Task 4 either keeps the choice across an answer (the
  select made once, its options set in place) or shows that losing it is what happens, and says which.
- Whether `Inputs.bind` of two selects whose values come from a `Map` carries the choice both
  ways. Not run. Task 3 tests it.
- Whether `test.ts` (no browser) can run a test that instances a dataflow. Today the Health test
  needs a browser already, so nothing is lost if it cannot.

## Not chosen

- **A new module `@tomlarkworthy/brain-dashboard`.** It would let a service's own panel
  (`brain-ai`, `brain-issues`) use the same parts, since a service's module cannot import from
  `cloud-brain`. No service's panel draws a chart today (0 `Plot` calls outside `cloud-brain.ojs`),
  so it has no second user. Reopen when a service's panel needs a chart: the shared cells and the
  prototype move to a module as they are.
- **Only the shared cells, with no templating** (tasks 1 to 3 and stop). This meets R1 to R3 and is
  smaller. It is not the whole design because the owner named the module. The tasks are ordered so
  that the page is better after each one, and task 4 can be dropped at approval without undoing 1 to 3.
- **`cloneDataflow`, `compileDataflow`.** `cloneDataflow` defines each instance into the page's own
  module; on editor-5 that was 862 of 3107 variables, and seven modules carried a filter for them
  (`plan/dataflow-templating-2.md`). `compileDataflow` was measured and rejected there for instances
  that must stay live ("Why not compileDataflow").
- **`@tomlarkworthy/cw-metrics`.** Its dashboard is CloudWatch's JSON and its fetch is CloudWatch's
  call. Its row shape `{ time, series, value }` has one measure a row; Health's rows carry three
  (`n`, `ms`, `max`) and `rollup` derives two more (`e4`, `e5`). Changing the shape would rewrite
  the three drawing functions and their test for no requirement.
- **A per-panel "By" (worker, method, status).** The first draft of this spec had it. Each drawing
  function fixes its grouping, so it needs the same rewrite. A filter by Worker does not.
- **A timer that asks again.** A press of "Refresh" asks once. The page was not measured for what
  a `logs.query` costs Cloudflare or how long it takes, and the outside reading is that a dashboard
  does not refresh by default.
- **Keeping the span in the address or in local storage.** Not asked.
- **Spending on the shared range.** It has no time axis; `quota.ledger` answers one UTC day. Left as it is.
- **A method that answers the calls to a token** (as `logs.deploys` does for deploys). It would
  widen who reads the core's lines. Not needed: the page is the owner's session.

## How each requirement is known to be met

No check needs cb4 or the owner's session. A check is one of three kinds:

- **test**: a `test_*` cell of `cloud-brain.ojs`, calling a function with a stand-in client.
- **source**: a line read in the compiled module after `build.ts`.
- **tab**: a local QA tab on the built notebook. It has no session, so `calls` is null there. For
  the counts, the tab's own `client` and `session` cells are stood in from `eval_code`, in the
  tab only and never exported: with `mod` the module `@tomlarkworthy/cloud-brain` of the page,
  `mod.redefine("session", { signedIn: true, owner: true })` and
  `mod.redefine("client", { procedure: async (name, body) => (seen.push([name, body]), fixture), query: async () => ({ services: [] }) })`,
  where `fixture` is the answer of `test_calls_from_the_logs_become_chart_rows` and `seen` is a
  list on `window`. A count is the entries of `seen` named `logs.query` with `view: "calculations"`
  added by one act. **Not run**: whether other cells of the page that read `client` throw on this
  stand-in was not tried; they may, and it does not change the count. Task 1 runs it first on the
  page as it is today, which gives the "before" of the resize.

| | check | before (2026-10-11) |
|---|---|---|
| R1 | test: `logsView({ client, now, span })` with a stand-in select as `span`. Setting the stand-in changes the value of the select inside the panel, and the reverse; a press of "Read" then sends `timeframe.from = now - span * 60000`. | Two selects, not linked; Health has none. |
| R2 | test: `callsRead` with a counting client sends 1 `logs.query` for one range, with that range as `timeframe`; with `client: null` it sends 0 and answers null. | No such function; the query is inside `healthView`. |
| R2 | tab, stood in as above: changing "Last" adds 1; "Refresh" adds 1; changing the viewport width (`qa_viewport`) adds 0. | 0 controls. Resize: `width` is an input of the cell that queries; the count was not measured (task 1 measures it first, the same way). |
| R2 | source: the `$def` line of `calls` names neither `width` nor `services` nor `brainModules`. | `healthView` names all three. |
| R2 | test: the note for an answer with `groups: 500` carries the line about the limit, and for `groups: 2` does not. | The note has no such line. |
| visitor | tab, with no stand-in (no session): under "## Health", 0 cells with an error (`.observablehq--error` inside the module's cells from the heading "Health" to "Operator"), and the visitor's line shows. After task 4 the same count includes the cells under "### One panel". | 0 errors expected today; task 1 counts it before. |
| R3 | A cell elsewhere on the page that names `calls` gets `{ since, until, step, series, groups }`. | The rows are a local of `healthView`. |
| R4 | A fourth entry in `healthPanels` draws a fourth panel with no other edit. With 3 and with 4 panels, `runtime._variables.size` of the page differs by 0 after the first instance (the module's own measure, `instancingCost`). | No templating. |
| all | `test_calls_from_the_logs_become_chart_rows` passes unchanged through tasks 1 to 3. `bun test.ts brain-x-page`: `failed 0`, and `passed` not below 6. | `passed 6, failed 0, needsBrowser 10`. |

## Tasks, in the order they land

Each is one writer and one review, and each deploys `brain-x-page` alone.

1. **Split `healthView`.** First, in a QA tab stood in as "How each requirement is known to be met"
   says, count the `logs.query` one resize sends today, and the errors under Health with no
   session; write both in the record. Then: `timeRange` (the constant hour), `callsRead`, `calls`,
   and `healthView` drawing from `calls`. No control, no new behaviour. The test of `callsRead`.
   Check R2's `$def` line and the two counts after.
2. **The two controls.** `viewof span` and `viewof asked` above the panels; `timeRange` reads them;
   the note under the panels (line 42) and the line a visitor reads (line 35) name the span
   instead of "the last hour". The select has the five spans of Logs. The note gives span, step and
   `groups`, with the line about the limit when `groups` is not below it, and its test. Nothing is
   measured on cb4: the writer cannot call `logs.query`.
   Update the line on Health in `cloud-brain-docs.ojs` (line 271, "counts the last hour"). No
   other seed says "last hour" (`grep -n "last hour" tools/cloud-brain/*.ojs`: that line and the two above).
3. **Logs reads the span.** `logsView` takes the shared control and binds its select to it. The
   existing test `test_logs_panel_asks_cloudflare_and_a_row_filters_by_its_trace` passes a stand-in
   and still passes; one new assertion for R1.
4. **Panels from a template.** The prototype cells, `healthPanels`, the instances, disposal on
   invalidation, under "### One panel". Checks of R4, and what a panel's "Worker" does across a "Refresh".
   The drawing functions are not changed.
   The first use of `instantiateDataflow` in a Brain seed: the writer reads
   `plan/dataflow-templating-2.md` first and checks that the shell cb4 serves carries the module.

Each task writes its own record, `tools/cloud-brain/records/<the task's id>.md`, as
`agents/implementer.md` step 10 says. Not `spec-as-built.md`.

## What only the owner can do

- Approve this spec, or send it back. One thing to say with it: whether R4 reads his "see
  dataflowTemplating" rightly (panels instanced with the module), or whether he meant only that the
  page should be built the way that notebook's example is, in which case task 4 is dropped.

Nothing else, and nothing to run or measure: the first draft had task 2 measure the five spans in
his tab, which no agent may do, and the page now reports those numbers itself. No task deploys the kernel, the core, the database or the deployer, installs a
policy, or adds a rule, a secret or a permission.

## Review, round 1 (event 918, 2026-10-11): changes, four findings

- **F1, task 2 rested on a measurement only the owner can make.** True: `logs.query` is
  `caller.session`. Taken the second way offered. The five spans ship, the note says `groups` and
  flags the limit, and no task waits for a number from cb4. See "Not known", the R2 rows, task 2
  and the owner's list.
- **F2, the prototype for a visitor.** True: as written `viewof panelWorker` and `panelBody` read
  a null. Each prototype cell now says what it answers with `calls` null, under "With no owner",
  and the row "visitor" checks 0 errors under Health with no session.
- **F3, the counting client had no way in.** True. The query moved into a function, `callsRead`,
  which the test calls with a stand-in; the counts in a tab are made by standing in `client` and
  `session` with `redefine` from `eval_code`. That stand-in was not run by this writer and the
  text says so.
- **F4, the record's place.** `records/<id>.md` a task. The line on `spec-as-built.md` is gone.
- **`assembled`.** The reviewer's reading of its inputs is in the design, read again at deploy line 1354.
