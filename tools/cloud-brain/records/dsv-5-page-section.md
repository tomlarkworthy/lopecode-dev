# The page's section Dashboards (`dsv-5-page-section`)

Task 5 of `plan/cloud-brain-dashboard-service.md`. Built 2026-10-11 by a writer of the issue loop,
round 1. Three commits of the seed, at 21:19:34, 21:28:03 and 21:36:44 +0200
(`git log --format=%ci`): the section, its move to before `## Operator`, and `dashboardGet`
answering no panels for an answer that has none. They are `96398e13`, `777f38fb` and `c6cfebf8`
on `main`, which was at `f7d03412` before them.

Nothing here was seen on cb4 in the owner's tab: the section asks with the owner's own session.
Every count below is from a local QA tab (headless Chromium, 1280 by 800) on the worktree's build
with `session` and `client` stood in, or from the commands named.

## What changed

`tools/cloud-brain/cloud-brain.ojs`: a section `## Dashboards` before `## Operator`: the heading, 18 cells and 4 tests (`git diff f7d03412 c6cfebf8 -- tools/cloud-brain/cloud-brain.ojs | grep -c '^+// %%'`: 23). No line of the seed was removed
(`git diff f7d03412 c6cfebf8 -- tools/cloud-brain/cloud-brain.ojs | grep '^-' | grep -v '^---' | wc -l`: 0), so
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
- **Where the section is.** Before `## Operator`, after the two sign-in buttons, which stay the
  last cells under Health. It was first written between the charts of Health and those buttons,
  which put the owner's buttons under the dashboard's panels; it was moved before the landing.

## The counts in a tab

Stood in as `records/ds-1-split-healthview.md` did: `mod.redefine("session", { signedIn: true,
owner: true })` and a `client` whose `query` answers `dashboard.list` (four names), `dashboard.get`
and `metric.query` from fixtures and pushes each call to `window.seen`. `three` is three panels
over `deploys.confirmed` by `target` (bars, table, bars); `deploys` is two panels over two metrics;
`health` is the three panels `dashboard.get?name=health` answers on cb4, over rows in the shape of
`core.calls`; `odd` is five panels that cannot be drawn as asked. One tab, `r=5507`, from 19:28 UTC,
on the build of the second commit: the seed as it landed but for `dashboardGet` and its test (the
third commit, below). Each row was written
by the tab to `.emitted/dsv-5-tab-log.json` and is copied from that file.

```
                                   dashboard.list  dashboard.get  metric.query   chosen   pair in the hash   panels
after the stand-in, read at 8 s          1              1             1          Three    none               3
read again at 14 s                       1              1             1          Three    none               3
"Refresh" (under Health) clicked, 3 s    1              1             2          Three    none               3
qa_viewport 1000x800, 5 s                1              1             2          Three    none               3     chart 920 -> 912 wide
select set to deploys, 3 s               1              2             4          Deploys  dashboard=deploys  2
history.back(), 3 s                      1              3             5          Three    none               3
history.forward(), 3 s                   1              4             7          Deploys  dashboard=deploys  2
span (under Health) set to 360, 3 s      1              4             9          Deploys  dashboard=deploys  2     note: The last 6 hours: 2 panels from 2 queries.
span set to 60, 3 s                      1              4            11          Deploys  dashboard=deploys  2
select set to odd, 3 s                   1              5            15          Odd      dashboard=odd      5     note: The last hour: 5 panels from 4 queries, 1 failed.
select set to health, 3 s                1              6            16          Health   dashboard=health   3     note: The last hour: 3 panels from 1 query.
```

So three panels over one metric and `by` sent 1 `metric.query`, "Refresh" added 1, a resize added
0, each once of once (R7). The select listed the names, a choice drew its panels and put
`dashboard=NAME` in the hash (R5). In every row the hash still had its `view=` and `cc=` pairs,
and there were 0 `.observablehq--error` between the `h2` "Health" and the `h2` "Operator".

- **The layout is not made again by a choice.** After "select set to deploys": the select was the
  same element, its `.lp2-pane` the same and connected, the select of the span connected,
  `history.length` 2 then 3.
- **`health`**: "Calls" 5 rect, "Health" 3 rect, "By method" 2 rows, from 1 `metric.query`.
- **`odd`**, a panel's place when it cannot be drawn:

  ```
  Refused: metric.query failed: not allowed by the rule for this
  Pie: This page has no draw "pie".
  Methods: The draw "methods" takes rows by worker, method, status, and this panel's by has no worker, method, status.
  Limit: (a table of 2 rows) 500 groups is the limit of one answer: some lines may be missing.
  Empty: No lines in this span.
  ```

**A choice made before an answer.** The stand-in was made to hold its `metric.query` answers.

```
                                          dashboard.get  metric.query sent  held   panels drawn
three chosen, read at 1.5 s                     7              17             1    health's
deploys chosen, read 1.5 s later                8              17             1    health's
the held answer let go, read at 2 s             8              19             2    health's
those two let go, read at 2 s                   8              19             0    deploys'
```

With one answer of `three` held, the choice of `deploys` sent no `metric.query` until that answer
was let go; then its two were sent. The panels of `three` were not drawn at any of the four reads.
What the runtime would do with two answers of one cell out of order was not made to happen: the
second ask was never sent while the first was held. A `metric.query` that never answers was not
tried with a real request; by these rows the section would wait on it.

**Two presses of "Refresh"**, 0.8 s apart, with the answers held: 21 sent and 2 held at 1.5 s
(the first press); those let go, 23 sent and 2 held (the second press); those let go, 23 and 0.
So each press asked, one after the other.

**What else asks again.** `client` redefined: `dashboard.list` 1 to 2, `dashboard.get` 8 to 9,
`metric.query` 23 to 25, the choice still Deploys from the hash. `session` redefined to the same
value: 3, 10, 27. `session` to `{ signedIn: false }`: the line "Sign in as the owner to see the
dashboards.", no select, 0 panels, the three counts unchanged.

**A tab opened with the pair** (`…&r=5508&dashboard=deploys`, the same build, stood in with two
names): chosen "Deploys", 1 `dashboard.list`, 1 `dashboard.get` with `{"name":"deploys"}`, 2
`metric.query`, the first `{"metric":"deploys.confirmed","since":1791743595879,"until":1791747195879,"by":"target"}`,
2 panels. The select came before the note and the note before the first panel in the document.
The buttons between the `h2` "Health" and the `h2` "Dashboards" were "Refresh", "Copy Login Link"
and "Copy Guest Invite"; none was between "Dashboards" and "Operator".

**After the third commit** (`r=5509`, the build that landed, two names stood in, `three` and a
dashboard `bare` whose `dashboard.get` answer has no `panels`):

```
                              dashboard.list  dashboard.get  metric.query   chosen  panels  note
after the stand-in, 8 s             1              1             1          Three     3     The last hour: 3 panels from 1 query.
"Refresh" clicked, 3 s              1              1             2          Three     3
select set to bare, 3 s             1              2             2          Bare      0     The last hour: 0 panels from 0 queries.
```

0 `.observablehq--error` between "Health" and "Operator" in each row. Before that commit a
dashboard with no `panels` would have thrown in `dashboardNote`; that was read in the cell and
not made to happen in a tab.

**With no session**, the build of the second commit (`r=5507`, before the stand-in): 0 `.observablehq--error`
between the `h2` "Health" and the `h2` "Operator"; one line under "Dashboards", "Sign in as the
owner to see the dashboards."; no select. The `h2`s read Health, Dashboards, Operator.

**The docs**, on a build before the section was moved (`r=5504`, the docs tab in the layout; the
docs seed is the same text): the three new places each had a link titled
`@tomlarkworthy/brain-dashboard`. Whether the docs tab had an error element was asked in the same
call and its answer was cut; it was not asked again.

## Tests

| command | result |
|---|---|
| `cd $W/cloud-brain-dev && bun test.ts brain-x-page` (what cb4 runs, `2d5bfe692895`) | `passed` 10, `failed` 0, `needsBrowser` 13 |
| `… bun test.ts brain-x-page --with $W/tools/cloud-brain/.emitted/dsv-5.js` | `passed` 12, `failed` 0, `needsBrowser` 15. Two of the four new tests read no DOM and pass here; the other two make a select, a chart and a table. |
| the snippet of the brief's step 8, fresh QA tab on the build (`r=5509`, answered 19:37:14 UTC) | `[27,[]]`. 27 is 12 + 15. |
| `BRAIN_BASE=cb4 bun tools/cloud-brain/verify-run.ts brain-x-page --shell $W/tools/cloud-brain/.emitted/cloud-brain.html --times 20`, ended 19:37:42 UTC | `runs` 20, `passed` 20, `failed` 0, `none` 0, `byChance` `[]`, `from` `["document"]`, `mains` brain-shell and cloud-brain; `"tests":27` in each of the 20 lines. |
| `bun test ./tests/tools/dsv-5-docs-name-the-dashboard-service.test.ts`, in the worktree | 4 pass, 0 fail. With the three files it reads as `41e72b7e` had them (before the rebase): 0 pass, 4 fail. |
| `bun test ./tests/tools`, in the worktree | 321 pass, 0 fail |

Two earlier runs of `verify-run`, 20 each. On the build before the rebase: 19 passed and 1 failed,
run 19, "the Worker reports the hash that was loaded: loaded 1a3d5c8c9e93, running 2d5bfe692895".
Another writer deployed `brain-x-page` between two runs; no test of the module failed in it. On
the build after the rebase and before the section was moved, ended 19:21:36 UTC: 20 passed. On
the build of the second commit, ended 19:33:44 UTC: 20 passed. The row above is the fourth run,
after a second rebase brought in `brain-shell.ojs`, which this module imports.

The new tests read no clock, assign nothing to `console` or another global, and make their select
with stand-ins for the hash, `go` and `listen`.

## Not tried

- **Anything on cb4 as the owner**: the section in his tab, `health` chosen there and drawn
  through `metric.query?metric=core.calls`, a real answer in a panel, the time it takes.
- **A member's tab.** The section shows a member the visitor's line.
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
- **Two answers of one cell out of order**, and a request that never answers: above.
