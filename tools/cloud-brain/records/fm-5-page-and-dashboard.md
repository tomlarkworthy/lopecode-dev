# fm-5-page-and-dashboard

Task 5 of `plan/cloud-brain-flow-metrics.md` (approved for the owner at event 3379): the page reads a
panel whose metric starts `flow.` from the tracker's `issue.flow`, two draws are added, and the
dashboard `flow` is put on cb4 as data. Written 2026-10-12 by a writer of the issue loop, round 1.
The seed's commit is `4bb4fda4`, 2026-10-12 05:11:55 +0200 (`git log --format='%h %ci'`); the deploy
and the commits are refs of the submit.

## What changed

`tools/cloud-brain/brain-dashboard.ojs`, 224 lines more and 29 fewer
(`git diff --numstat 4bcab152 4bb4fda4`):

- `panelMethod(metric)`: `issue.flow` for a name that starts `flow.`, `metric.query` for every other.
  `dashboardRead` sends each query to the method it names, with the parameters it sent before. Both
  kinds of answer go into the one Map.
- `dashboardDraws` has `points` and `share`, so `dashboard.put` keeps them. `panelNeeds` has
  `points: ["id"]` and `share: []`.
- `pointsChart`: a dot a row at its `t` and its `sum`, coloured by the dimensions of `by` other than
  `id`. For each of the answer's `summaries` a rule at `median`, a dashed rule at `p85`, and a line
  under the chart: `bug: n 2, median 1.5 h, 85th percentile 3.0 h, longest 3.0 h`. With no
  `summaries`: the dots, one line `n 3, longest 3.0 h`, no rule.
- `shareTable`: a row a group with `n`, `sum` and `share`, which is `sum / n` to two decimals.
- `groupTable`: an answer whose `unit` is `ms` is written in hours with one decimal, in columns
  `sum h` and `max h`. An answer with `summaries` has `median h` and `p85 h` (or `median`, `p85`)
  beside them when `by` has no `id`.
- `panelBody`: the two new draws; the lines said in a panel's place name the method that was asked
  (`issue.flow failed: …`, `issue.flow was not asked.`, `No rows in this span.`); the note of 500
  groups is written for an answer of `metric.query` only; `share` of a metric with no value says so.
- `barsChart` takes `label`, and a panel of a `flow.` metric is labelled `rows` where it said `lines`.
- `flowDashboardBody`: the ten panels of the spec's table, a cell the first new test puts through
  the service. The row on cb4 was put by hand with the same panels (below); no method reads the cell.
- The reference: three sentences amended (the text under the panels, "Dashboards", the paragraph on
  `draw`). The line `// one of …` of the example is written from `dashboardDraws`.
- Two test cells more and one changed (the literal list of draws in
  `test_dashboard_declares_one_cloudflare_permission_and_its_rows`).

The page computes no percentile: the median and the 85th percentile drawn are those of the
answer's `summaries`. From the rows it makes the hours (milliseconds divided by 3,600,000), `sum / n`
of `share`, and the `n`, `sum` and `max` of a group or a step, which `groupTable` and `barsChart`
added up before this change and `shareTable` and the line of an answer with no `summaries` now do too.

No rule, no definition of a metric, no method and no call from the service to the tracker changed.
`brain-x-page` did not move: `brain.ts redistil` after the apply read `same` for it at `595290468923`.

## Where the spec is silent or was not followed

Each by line 2 of `philosophy.md` (the smaller side). The spec has an "(As built …)" note for these.

| The spec | Built | Why |
|---|---|---|
| "`table` adds the median and the 85th of a group when the answer has `summaries`" | Not when `by` has `id` | A summary is of the dimensions other than `id`; with `id` a row is one issue and several rows share one summary |
| Nothing on a `flow.` panel that failed | The line names `issue.flow` | "metric.query failed" would be false of it |
| Nothing on `bars` of a `flow.` metric | The axis reads `rows` | "Done a day" counts issues, not lines of a log |
| "`share` takes any rows with a value" | A counted metric (every `sum` null) is said in the panel's place | `sum / n` of it is 0 for every group |
| `points` for a value that is not `ms` | Written as it is, and the last word of its line is `most` | `flow.submits` by `id` is a count |

## Tests

Each count is from the command beside it, run in the worktree after the last edit of the seed.

| Command | Result |
|---|---|
| `cd cloud-brain-dev && bun test.ts brain-x-dashboard` (what cb4 ran before, hash `567fadfef4db`) | `passed` 13, `failed` 0, `needsBrowser` 2 |
| The build with the two new tests and no other change: `bun test.ts brain-x-dashboard --with …/.emitted/fm-5.js` | `passed` 13, `failed` 1 (`panelMethod is not defined`), `needsBrowser` 3 |
| `bun test.ts brain-x-dashboard --with …/.emitted/fm-5.js` (the build) | `passed` 14, `failed` 0, `needsBrowser` 3 |
| `bun tools/cloud-brain/tab-tests.ts …/cloud-brain.html @tomlarkworthy/brain-dashboard --emit dashboard_service=…` (Chrome 151.0.7922.34) | `tests` 17, `passed` 17, `failed` []; emitted hash `7ce3ae629c3f` |
| `BRAIN_BASE=cb4 bun tools/cloud-brain/verify-run.ts brain-x-dashboard --shell …/cloud-brain.html --times 20` | `runs` 20, `passed` 20, `failed` 0, `none` 0, `byChance` [], `from` ["document"]; `"tests":17` in 20 lines (`grep -c`) |
| `brain.ts apply` under the deploy lock | `"state":"verified"`, `"tests":17`, 20383 ms |
| After the landing: `bun sync.ts https://cb4.endpointservices.workers.dev && bun test.ts brain-x-dashboard` | hash `7ce3ae629c3f…`, `passed` 14, `failed` 0, `needsBrowser` 3 |
| `bun test ./tests/tools`, in the worktree at `8f8cb858` | 492 pass, 0 fail |

Eleven changes of one line each were made to the seed, each built and run with `tab-tests.ts`. Ten
failed a test:

| The line changed | Failed |
|---|---|
| `panelMethod` reads `flowx.` | both new tests |
| `dashboardRead` sends every query to `metric.query` | the first new test |
| `share` not in `dashboardDraws` | the first new test and the test of the reference |
| `points` needs no `id` | both new tests |
| No rule at `p85` | the second new test, as the six below |
| `share` is `n / sum` | |
| The note of 500 groups under a `flow.` panel | |
| No `median` and `p85` columns | |
| A table's values not in hours | |
| The columns kept with `id` in `by` | |
| A dot at its value in ms, not in hours | none: 17 of 17 passed |

For the last, one line was added to the second test (the `title` of each dot, `a\n1.5 h`), and the
same change then failed it, 16 of 17. The ten before it were run without that line.

## The dashboard on cb4

`brain-x-dashboard` at `7ce3ae629c3f`, each call with `brain.ts curl … --as loop-dashboard` from the
main checkout, 2026-10-12 03:15:40 to 03:15:42 UTC (`date -u` before and after), in this order:

| call | answer |
|---|---|
| `dashboard.list` | `health`, `deploys` |
| `dashboard.get?name=flow` | `NotFound`, "no dashboard flow is kept: dashboard.list names them" |
| `POST dashboard.put`, the body below | the dashboard as kept: each panel has a `filter`, `{}` where none was sent |
| `dashboard.get?name=flow` | the same object as the put's answer; 10 panels, each with the `title`, `metric`, `by`, `filter` and `draw` sent |
| `dashboard.list` | `health`, `deploys`, `flow` |

The count of the put: **10 panels of 10**. The body is the spec's table without its last row:

```json
{"name":"flow","title":"Flow","panels":[
 {"title":"Feedback to deploy","metric":"flow.lead","by":["id","for"],"filter":{"kind":"feedback","to":"deploy"},"draw":"points"},
 {"title":"Opened to deploy","metric":"flow.lead","by":["id","kind"],"filter":{"to":"deploy"},"draw":"points"},
 {"title":"Opened to done","metric":"flow.lead","by":["id","kind"],"filter":{"to":"done"},"draw":"points"},
 {"title":"Done a day","metric":"flow.lead","by":["kind"],"filter":{"to":"done"},"draw":"bars"},
 {"title":"Open work, by state","metric":"flow.open","by":["state","waits"],"draw":"table"},
 {"title":"Open work, by age","metric":"flow.open","by":["waits","kind"],"draw":"table"},
 {"title":"Hours by state","metric":"flow.stays","by":["waits","state"],"draw":"table"},
 {"title":"Sent back at review","metric":"flow.submits","by":["move"],"draw":"share"},
 {"title":"Deploys, by Worker","metric":"deploys.confirmed","by":["target"],"draw":"bars"},
 {"title":"Put back, by Worker","metric":"deploys.put-back","by":["target"],"draw":"table"}]}
```

**No deploy for the put.** `deploy/services.json` of the worktree's `cloud-brain-dev`, read by
`sync.ts` after the apply and copied aside before the first call above, and read again after the
last: `cmp` identical, `shasum -a 256` `57396bb442e1…` for both. The spec's check says the file "is
the same before and after"; that holds of the put, not of the task, which deployed
`brain-x-dashboard` first.

Then, from 03:15:54 UTC:

| call | answer |
|---|---|
| `POST dashboard.put` of one panel with `draw: "pie"` | 400 `panel 1: draw is one of calls, faults, methods, bars, table, points, share` |
| `POST dashboard.put`, the body again | 200, the same dashboard |
| `dashboard.list` | 200, the same three names, each once |
| `metric.query?metric=flow.lead&by=id` | 401 `not allowed by the rule for this`: the rule of `metric.query` gives a token the `deploys.` metrics |
| `issue.flow?metric=flow.submits&by=move` | 403 `this token does not name com.lopecode.brain.issue.flow` |

So `loop-dashboard` reads the dashboard and draws its two `deploys.` panels. It does not read the
eight `flow.` panels: `issue.flow` is read by the owner's session, or by a token that names it.

## What was drawn, and from what

The owner's tab on cb4 was not opened. The ten panels were drawn once in a local headless Chrome
from the built notebook, before the landing, by a script that is not kept: `dashboardRead` with a
stand-in client that handed back ten answers read from cb4 before it, over the 7 days to
05:05 CEST. The eight `flow.` answers were read with the writer's tracker token and the parameters
the page sends (`issue-as.sh impl-b1b76c "flow?kind=feedback&to=deploy&metric=flow.lead&by=id,for&since=…&until=…"`),
`cost.ms` 384 to 678 at 3653 events; the two `deploys.` answers with `--as loop-dashboard`.

```
seen   issue.flow ×8 (flow.lead ×4, flow.open ×2, flow.stays, flow.submits), metric.query ×2
note   The last 7 days: 10 panels from 10 queries.
Feedback to deploy   loop: n 26, median 1.0 h, 85th percentile 7.3 h, longest 10.0 h
                     owner: n 8, median 0.7 h, 85th percentile 1.5 h, longest 1.9 h
Opened to deploy     task: n 38, median 0.5 h, 85th percentile 2.9 h, longest 15.5 h   (five lines, a kind each)
Sent back at review  submit 202, 55, 0.27;  submit-spec 40, 19, 0.47
```

In the screenshot each `points` panel had its dots, a legend and a pair of rules a group; "Done a
day" had three stacked bars; the three tables had the columns `n`, `sum h`, `max h`, `median h`,
`p85 h`. With five kinds, "Opened to deploy" has ten rules close together near the bottom of the
chart, since one issue of 21 h sets the scale.

## Prior art searched

`knowledge.search?semantic=true` with `--as loop-knowledge`, three searches:

| searched | top hits | used |
|---|---|---|
| "dashboard panel draw points percentile rule median" | `doc:cloud-brain-flow-metrics` 0.891, `doc:cloud-brain-dashboards-share-series-and-controls` 0.851 | The spec, read whole |
| "page reads issue.flow for flow panels dashboardRead" | `doc:cloud-brain-flow-metrics` 0.931 | The same |
| "scatter plot dots svg hours lead time" | `doc:svg-particle-performance` 0.975, `module:d3:scatterplot` 0.613 | Nothing: the module already draws with Plot, and `Plot.dot` is one mark |

Also read: the records of `fm-3-issue-flow-method` (the shape of an answer, `cost.ms`) and
`dsv-7-second-dashboard-as-data` (the put and its check).

## Not tried

- The dashboard `flow` in the owner's tab on cb4, at `#dashboard=flow`: the select naming it, the
  page's own client sending `issue.flow` with his session, and the panels under his theme. The loop
  has no session of his. The spec leaves this to him.
- The page asking eight `issue.flow` at once. Each reads the whole record (384 to 678 ms one at a
  time here). The record of `fm-3-issue-flow-method` lists the same under its "Not tried".
- A span of 15 minutes or an hour, where most `flow.` panels have few rows or none. The tests draw
  an answer with no row ("No rows in this span."); no such answer of cb4 was drawn.
- `points` over more rows than the 198 of "Opened to done" in the drawing above.
- A `flow.` answer with `summaries` whose groups are not those of the rows. The tests give a table a
  summary short by one group, and its cells are empty.
- `deploys.restore` and the row "Time to restore": task 6. `pointsChart` draws an answer with no
  `summaries` in a test; nothing sends such an answer yet.
- A member's dashboard with a `flow.` panel. The page would ask `issue.flow` as the member, and
  that method's rule answers it or not; not run.
- `dashboard.delete` of `flow`. It is left on cb4 as the task's result.
- The Worker's hash read between the put and the get: read before the first call and after the
  last, 2 s apart.
