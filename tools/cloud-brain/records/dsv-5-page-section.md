# The page's section Dashboards (`dsv-5-page-section`)

Task 5 of `plan/cloud-brain-dashboard-service.md`. Built 2026-10-11 by a writer of the issue loop,
round 1. The seed commit's time is 21:19:34 +0200 (`git log --format=%ci -1`, after the rebase onto
`9c2e9db6`).

Nothing here was seen on cb4 in the owner's tab: the section asks with the owner's own session.
Every count below is from a local QA tab (headless Chromium, 1280 by 800) on the worktree's build
with `session` and `client` stood in, or from the commands named.

## What changed

`tools/cloud-brain/cloud-brain.ojs`: a section `## Dashboards` between the cells of Health and the
login link: the heading, 18 cells and 4 tests (`git show --format= SEED-COMMIT -- tools/cloud-brain/cloud-brain.ojs | grep -c '^+// %%'`: 23). No line of the seed was removed
(`git show --format= SEED-COMMIT -- tools/cloud-brain/cloud-brain.ojs | grep '^-' | grep -v '^---' | wc -l`: 0), so
the cells of Health are as they were.

| cell | what it is |
|---|---|
| `dashboardList` | `dashboard.list` for the owner's own session, `null` for anyone else (nothing sent), `{ error }` when the read failed. |
| `dashboardOf`, `dashboardHash` | The pair `dashboard=NAME` of a hash, read and written. The other pairs are kept as they are. |
| `dashboardPick` | The select. It opens on the name the address has, else on the first of the list. A choice is written with `go`; a change of the address is followed and not written. With nothing to choose it is a line and its value is `null`. |
| `viewof dashboardName` | `dashboardPick` with `location.hash`, `navigate` of `lopepage-urls`, and the `hashchange` and `popstate` events. |
| `dashboardGet`, `dashboardDef` | `dashboard.get?name=` of the choice. It does not name `timeRange`. |
| `panelQuery`, `dashboardQueries` | One query for each distinct metric, `by` and filter of the panels. A filter's names are put in order. |
| `dashboardRead`, `dashboardData` | One `metric.query` a query over `timeRange`, sent together. A query that fails is that query's `{ error }`. It does not name `width`. |
| `barsChart`, `groupTable` | The two draws for any metric: lines a step, stacked by the first of `by`; one row a group with `n`, and `sum` and `max` for a metric with a value. |
| `panelNeeds`, `panelBody` | A panel's body by its `draw`. `calls`, `faults` and `methods` hand the rows to `requestsChart`, `healthStrip` and `methodTable` with `sum` as `ms`; those three functions are not edited. |
| `dashboardGroupLimit`, `dashboardNote`, `dashboardView` | 500, the line above the panels, and the grid (`dashboard`, the function Health uses). |

The compiled inputs (`grep '$def("_cloudbrain_dashboard' ` on the module read out of the build with
`lope-reader.ts --get-module @tomlarkworthy/cloud-brain`):

```
$def("_cloudbrain_dashboardList", "dashboardList", ["session","client"]
$def("_cloudbrain_viewof_dashboardName", "viewof dashboardName", ["dashboardPick","dashboardList","location","navigate","addEventListener","invalidation","removeEventListener"]
$def("_cloudbrain_dashboardDef", "dashboardDef", ["dashboardGet","session","client","dashboardName"]
$def("_cloudbrain_dashboardData", "dashboardData", ["dashboardRead","session","client","dashboardDef","timeRange"]
$def("_cloudbrain_dashboardView", "dashboardView", ["dashboardData","htl","dashboard","panelBody","panelQuery","width","dashboardNote"]
```

Also: three places in `tools/cloud-brain/cloud-brain-docs.ojs` (a row of "What the owner can do", a
paragraph of "Calls and faults", a row of the modules table), `dashboard (…)` in the services line
of `knowledge/working-with-cloud-brain-remote-lopecode-cluster.md`, and
`tests/tools/dsv-5-docs-name-the-dashboard-service.test.ts`.

## Choices the spec left

- **Who is asked.** The owner's own session only, as `calls` is. A member is shown the visitor's
  line. A member reaches `dashboard.list` on cb4 only after the owner's grants (the spec, his
  list, item 3), and none exists. Smaller side, philosophy line 2.
- **`calls`, `faults`, `methods` are drawn**, not left for task 6. `dashboard.list` on cb4 answers
  `health` today (`brain.ts curl /xrpc/com.lopecode.brain.dashboard.list --as loop-dashboard`:
  `{"dashboards":[{"name":"health","title":"Health"}]}`), so the owner's select has it from the
  first day. The rows go to the three functions of Health unchanged. `methods` is drawn with no
  link on a Worker's name: the link is an expression inside `healthView`, which is not touched.
- **An address with no pair is the first of the list**, when the page opens and when the address
  changes to one (back, to before a choice). A name the list does not have leaves the choice.
- **The list is read when the page opens**, and when `session` or `client` change. "Refresh" does
  not read it again: a dashboard put while the page is open shows after a reload.
- **`navigate` and its `pushState`**: a choice is one entry of the history, so back returns to the
  dashboard before. `history.replaceState`, as the layout writes its own pair, would keep no entry.
- **A table of a counted metric has no `sum` and `max` columns.** The spec's "n, sum, max" is drawn
  for a metric with a value.
- **Where the section is.** After the cells of Health and before the two login buttons, which were
  the last cells under Health and are now the last under Dashboards. That is the order of the seed;
  the buttons draw for the owner and were not seen drawn.

## The counts in a tab

Stood in as `records/ds-1-split-healthview.md` did: `mod.redefine("session", { signedIn: true,
owner: true })` and a `client` whose `query` answers `dashboard.list` (two names, `three` and
`deploys`), `dashboard.get` and `metric.query` from fixtures and pushes each call to `window.seen`.
`three` is three panels over `deploys.confirmed` by `target` (bars, table, bars); `deploys` is two
panels over two metrics. The build is the one of the commit above; tab `r=5505`, 19:20 UTC.

```
                                   dashboard.list  dashboard.get  metric.query   chosen   pair in the hash   panels
after the stand-in, read at 8 s          1              1             1          Three    none               3
read again at 14 s                       1              1             1          Three    none               3
"Refresh" (under Health) clicked, 3 s    1              1             2          Three    none               3
qa_viewport 1000x800, 5 s                1              1             2          Three    none               3     chart 920 -> 912 wide
select set to deploys, 3 s               1              2             4          Deploys  dashboard=deploys  2     view= and cc= still in the hash
history.back(), 3 s                      1              3             5          Three    none               3
history.forward(), 3 s                   1              4             7          Deploys  dashboard=deploys  2
```

So three panels over one metric and `by` sent 1 `metric.query`, "Refresh" added 1, a resize added
0, each once of once (R7). The select listed 2 names, the second drew its panels and put
`dashboard=deploys` in the hash (R5). The one `metric.query` of the first row was
`{"metric":"deploys.confirmed","since":…,"until":…,"by":"target"}` (read on the build before the
rebase, `r=5502`).

**A tab opened with the pair** (`…&r=5506&dashboard=deploys`, the same build, stood in the same
way): chosen "Deploys", 1 `dashboard.list`, 1 `dashboard.get` with `{"name":"deploys"}`, 2
`metric.query`, 2 panels.

**With no session**, the same build (`r=5505`, before the stand-in): 0 `.observablehq--error`
between the `h2` "Health" and the `h2` "Operator"; one line, "Sign in as the owner to see the
dashboards."; no select.

### Seen on the build before the rebase

The rebase brought another writer's change to `cloud-brain.ojs` (`operator-tab-module`, the cells
under `## Operator`). These were read in tabs `r=5502` and `r=5503` on the build before it, with
the cells of this section the same text, and were not read again after it.

- **The layout is not made again by a choice.** After the select was set to `deploys`: the select
  was the same element, its `.lp2-pane` the same and connected, the select of the span connected,
  `history.length` 5 then 6.
- **A change of the span asks again**: the span set to 360, `metric.query` 7 then 9 for the two
  queries of `deploys`, note "The last 6 hours: 2 panels from 2 queries."
- **A second choice before the answer.** The stand-in held its `metric.query` answers. `three`
  chosen: 1 sent and held. `deploys` chosen 1.5 s later: nothing more was sent while the first
  was held, and the panels did not change. The first let go: the 2 queries of `deploys` were then
  sent, and held. Those let go: the panels of `deploys`. The panels of `three` were never drawn.
  So the page's runtime does not start a cell again until its last run has answered, and two
  answers of one cell do not arrive out of order. A `metric.query` that never answers would hold
  the section; that was not made to happen with a real request.
- **Two presses of "Refresh" before an answer**, 0.8 s apart, with 2 queries held: nothing sent
  until those were let go, then 2 more (one pair for the two presses), 12 then 14.
- **What else asks again.** `client` redefined: `dashboard.list` +1, `dashboard.get` +1,
  `metric.query` +2, the choice still `deploys` from the hash. `session` redefined to the same
  value: the same three. `session` to `{ signedIn: false }`: the visitor's line, no select, 0
  panels, nothing sent.
- **What is said in a panel's place**, a dashboard of 7 panels (`r=5503`): 5 queries for 7 panels,
  note "The last hour: 7 panels from 5 queries, 1 answered from the service's memory, 1 failed.";
  a refused metric read "metric.query failed: not allowed by the rule for this"; a draw `pie`
  read `This page has no draw "pie".`; `methods` over rows by `target` said which names its `by`
  lacks. The select came before the note and the note before the first panel in the document.
- **The docs** (`r=5504`, the docs tab in the layout): the three new places each had a link titled
  `@tomlarkworthy/brain-dashboard`. Whether the docs tab had an error element was asked in the same
  call and its answer was cut; it was not asked again.

## Tests

| command | result |
|---|---|
| `cd $W/cloud-brain-dev && bun test.ts brain-x-page` (what cb4 runs, `2d5bfe692895`) | `passed` 10, `failed` 0, `needsBrowser` 13 |
| `… bun test.ts brain-x-page --with $W/tools/cloud-brain/.emitted/dsv-5.js` | `passed` 12, `failed` 0, `needsBrowser` 15. Two of the four new tests read no DOM and pass here; the other two make a select, a chart and a table. |
| the snippet of the brief's step 8, fresh QA tab on the build (`r=5505`, 19:20:09 UTC) | `[27,[]]`. 27 is 12 + 15. |
| `BRAIN_BASE=cb4 bun tools/cloud-brain/verify-run.ts brain-x-page --shell $W/tools/cloud-brain/.emitted/cloud-brain.html --times 20`, ended 19:21:36 UTC | `runs` 20, `passed` 20, `failed` 0, `none` 0, `byChance` `[]`, `from` `["document"]`, `mains` brain-shell and cloud-brain; `"tests":27` in each of the 20 lines. |
| `bun test ./tests/tools/dsv-5-docs-name-the-dashboard-service.test.ts`, in the worktree | 4 pass, 0 fail. With the three files it reads as `41e72b7e` had them (before the rebase): 0 pass, 4 fail. |
| `bun test ./tests/tools`, in the worktree | 320 pass, 0 fail |

A first `verify-run` of 20, on the build before the rebase, gave 19 passed and 1 failed: run 19
failed "the Worker reports the hash that was loaded: loaded 1a3d5c8c9e93, running 2d5bfe692895".
Another writer deployed `brain-x-page` between two runs. No test of the module failed in it.

The new tests read no clock, assign nothing to `console` or another global, and make their select
with stand-ins for the hash, `go` and `listen`.

## Not tried

- **Anything on cb4 as the owner**: the section in his tab, `health` chosen there and drawn
  through `metric.query?metric=core.calls`, a real answer in a panel, the time it takes.
- **A member's tab.** The section shows a member the visitor's line.
- **`calls`, `faults` and `methods` in a tab.** They are drawn in a test
  (`test_bars_and_a_table_draw_any_metric_and_a_panel_says_what_it_cannot_draw`), from rows in the
  shape `metric.query` answers; no stood-in dashboard had such a panel that drew.
- **An answer with 500 groups, and a span with no line, in a tab on the final build.** Both lines
  were in the 7-panel dashboard of `r=5503`; that tool answer was cut before them, and they are held by the test.
- **A dashboard with 20 panels over 20 queries.** They are sent together; what 20 logs queries at
  once cost on cb4 is not known.
- **A span of days.** `records/dsv-4-cost.md` found a 7-day answer made from a sample (160 where
  the lines were 173) with nothing in it that says so. A panel over 7 days draws what it is given
  and says nothing of it.
- **A fork of the page (`blob:`)**, where `navigate` takes its other path.
- **The link from a Worker's name in a `methods` panel**, left for task 6.
- **The docs on cb4.** `cloud-brain-docs` is a module of the shell, which reaches cb4 by
  `brain.ts shell`, the owner's. Whether the knowledge page's new line is in the Brain's search was
  not looked at.
- **A second press, a refused write, another caller's event on a row with the caret**: the
  section sends no write and has no text box. The second press is above.
