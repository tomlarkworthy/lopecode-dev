# The select and panels of Dashboards are in the dashboard service's module (`fb-a2g3jyhecp`)

The owner's note on his page, at the heading "Dashboards" of `@tomlarkworthy/cloud-brain`
(event 2333, 2026-10-11): "I would expect the dashboards section to live with the dashboard service
(at the top) Not in the shell." `dsv-5-page-section` had put the section in the page's module
because the spec said so (`plan/cloud-brain-dashboard-service.md`, "On the page").

Round 1, a writer of the issue loop. The commit of the seeds is `4c4849d6`, 2026-10-11 22:18:49 +0200
(`git log --format='%h %ci'`).

Nothing here was seen in the owner's tab on cb4: the select asks with the owner's own session.
What is said of the page below is from a local headless Chrome (151.0.7922.34, 1280 by 800) on the
worktree's build, with `session` and `client` of `cloud-brain` stood in.

## What changed

`tools/cloud-brain/cloud-brain.ojs`: the heading `## Dashboards`, its 18 cells and its 4 tests are
gone, and nothing else.

```
git diff 4c4849d6^ 4c4849d6 -- tools/cloud-brain/cloud-brain.ojs | grep -c '^-// %%'                  23
git diff 4c4849d6^ 4c4849d6 -- tools/cloud-brain/cloud-brain.ojs | grep '^+' | grep -vc '^+++'         0
```

`tools/cloud-brain/brain-dashboard.ojs`: 22 of those 23 cells, each as it was (compared cell by
cell, split on `// %%`, between the two commits: 23 left the page, 22 are in the service's seed
unchanged, and the one that is not is the heading with its paragraph). The seed went from 43 cells
to 69: the 22, two prose cells and two imports.

| where in the seed | what |
|---|---|
| cell 1 | `# brain-dashboard` and its paragraph. Its last sentence said the page that draws a dashboard "is a later task and is not here"; it now says the select and the panels are under it. |
| cells 2 and 3 | `viewof dashboardName`, `dashboardView` |
| cell 4 | New prose: who is shown the panels, the pair of the address, where the span and "Refresh" are, where the other cells are. |
| cell 5 | `## Methods`: the rest of what was the first cell, from the method table on, unchanged but for one sentence of "Not known" (below). |
| after `dashboard_announce` | the 16 other cells, `dashboardList` to `dashboardNote`, in the order they had |
| the end of `## Tests` | the 4 tests |
| the last two cells | `import {session, client, timeRange, spanName, dashboard, chartBase, requestsChart, healthStrip, methodTable} from "@tomlarkworthy/cloud-brain"` and `import {navigate} from "@tomlarkworthy/lopepage-urls"` |

Three lines of the seed were removed and written again (`git diff 4c4849d6^ 4c4849d6 -- tools/cloud-brain/brain-dashboard.ojs | grep '^-' | grep -vc '^---'`: 3):
the first paragraph, split as above; "How the page draws a panel: no page reads a dashboard yet" under
"Not known", which `dsv-5-page-section` had made untrue, now says the panels were not seen in the
owner's tab; and a comment of `test_dashboard_declares_one_cloudflare_permission_and_its_rows` that
said the reference "holds the first cell".

The compiled inputs of the moved cells, from the module read out of the build
(`bun tools/lope-reader.ts tools/cloud-brain/.emitted/cloud-brain.html --get-module @tomlarkworthy/brain-dashboard`, then `grep '$def("_braindashboard_'`):

```
$def("_braindashboard_viewof_dashboardName", "viewof dashboardName", ["dashboardPick","dashboardList","location","navigate","addEventListener","invalidation","removeEventListener"]
$def("_braindashboard_dashboardView", "dashboardView", ["dashboardData","htl","dashboard","panelBody","panelQuery","width","dashboardNote"]
$def("_braindashboard_dashboardList", "dashboardList", ["session","client"]
$def("_braindashboard_dashboardDef", "dashboardDef", ["dashboardGet","session","client","dashboardName"]
$def("_braindashboard_dashboardData", "dashboardData", ["dashboardRead","session","client","dashboardDef","timeRange"]
$def("_braindashboard_barsChart", "barsChart", ["Plot","chartBase"]
$def("_braindashboard_panelBody", "panelBody", ["htl","panelNeeds","barsChart","groupTable","requestsChart","healthStrip","methodTable","dashboardGroupLimit"]
$def("_braindashboard_dashboardNote", "dashboardNote", ["spanName"]
```

`records/dsv-5-page-section.md` has the lists of five of these in the page's module (`dashboardList`, `viewof dashboardName`,
`dashboardDef`, `dashboardData`, `dashboardView`), and they are the same.

Also: `tools/cloud-brain/cloud-brain-docs.ojs` (the row "See a dashboard." of "What the owner can
do", the paragraph of "Calls and faults", the row of the modules table), the services line of
`knowledge/working-with-cloud-brain-remote-lopecode-cluster.md`, and
`tests/tools/dsv-5-docs-name-the-dashboard-service.test.ts`, which now holds where the cells are.

## Choices

- **What the cells read of the page is imported from it**, nine names, as `brain-issues.ojs` imports
  `client`, `session` and `fromBrain` from `@tomlarkworthy/cloud-brain`. The page's module imports
  nothing from `brain-dashboard`. Not taken: moving `requestsChart`, `methodTable`, `dashboard` and
  `chartBase` to the service's module and importing them into the page for Health
  (`plan/cloud-brain-dashboards-share-series-and-controls.md`, "Not chosen", says the shared cells
  would move when a service's panel needs a chart). Health uses them and `timeRange` is the page's, so
  each module would then import from the other. Smaller side, `philosophy.md` line 2. What it costs:
  two tests of `brain-x-dashboard` (`test_bars_and_a_table_…`, and through `dashboardNote` the test of
  the queries) now run functions of the page's module, so a change to `requestsChart`, `healthStrip`,
  `methodTable`, `chartBase` or `spanName` in `cloud-brain.ojs` can fail a test of the other Worker.
- **`healthStrip` stays in `cloud-brain.ojs`** and is imported. The orchestrator's note (event 2420)
  left it to the writer. Since `fb-a2oogpkdjb` no cell of the page draws it;
  `test_calls_from_the_logs_become_chart_rows` there still calls it. Moving it would take `rollup` with it or import that back.
- **One span, and it is the page's.** The module has no span and no "Refresh" of its own; `timeRange`
  is imported. "The span, "Refresh" and `timeRange` are what every dashboard here reads" (the spec,
  "What happens to `ds-2` to `ds-4`"). The cost is under "Seen in a tab": in a layout without the
  page's module the two controls are not on the page.
- **No heading over the select.** The title of the module is above it, and `## Dashboards` is
  already the heading of the dashboard methods further down.
- **The method tables are under a new heading, `## Methods`**, as in `brain-issues.ojs`. The
  reference a Worker serves is its prose cells joined (`cloudflare-iac.ojs`, `source.reference = prose.join("\n\n")`),
  so `getSource?worker=brain-x-dashboard&part=reference` gains the new prose cell and that heading
  and still starts with `# brain-dashboard`
  (`test_dashboard_declares_one_cloudflare_permission_and_its_rows` holds the start).

## Prior art searched

`knowledge.search?semantic=true` on cb4 with `--as loop-knowledge`, two questions: "dashboard section
of the page moved into a service module panel" and "service module imports client session from
cloud-brain panel in its own tab". Used: `doc:cloud-brain-dashboards-share-series-and-controls` (its
"Not chosen", above) and `doc:cloud-brain-dashboard-service`. From the code: the imports of
`brain-issues.ojs` and its first three cells.

## Seen in a tab

`tools/cloud-brain/.emitted/fb-probe.ts` (a scratch script of the worktree, not committed) opens the
build, reads, stands in `session` (`{ signedIn: true, owner: true }`) and `client` by `redefine` in
the page's module, and reads after each act. The stand-in answers `dashboard.list` with two names,
`health` (the three panels of `dashboardDefinitions`) and `deploys` (bars and a table over two metrics), and
counts each call. Run at 20:10 UTC (`date -u` before it) on a build of the worktree with `brain-dashboard.ojs` and
`cloud-brain.ojs` as `64db274b` has them: this change and the next commit
(`records/dashboard-panel-does-not-say-sampled.md`).

Layout `C100(S50(@tomlarkworthy/cloud-brain),S50(@tomlarkworthy/brain-dashboard))`:

```
                                    dashboard.list  dashboard.get  metric.query  chosen   panels  note
as opened, no session                     -              -             -         (none)     0     line: Sign in as the owner to see the dashboards.
stood in, read at 6 s                     1              1             1         Health     3     The last hour: 3 panels from 1 query.
"Refresh" of Health clicked, 3 s          1              1             2         Health     3     The last hour: 3 panels from 1 query.
span of Health set to 360, 3 s            1              1             3         Health     3     The last 6 hours: 3 panels from 1 query.
select set to its second option, 3 s      1              2             5         Deploys    2     The last 6 hours: 2 panels from 2 queries.
viewport 1000 wide, 3 s                   1              2             5         Deploys    2
session set to { signedIn: false }, 3 s   1              2             5         (none)     0     line: Sign in as the owner to see the dashboards.
```

In each row with panels the select came after the `h1` "brain-dashboard" and before the `h2`
"Methods", the first panel after the select, and the new prose cell after the last panel and before
"Methods". 0 `.observablehq--error` between that `h1` and that `h2` in every row. After the choice the
hash ended `&dashboard=deploys` and still had its `view=` pair. `health` drew "Calls" 5 rect,
"Health" 3 rect, "By method" 2 rows. The page's errors: none (`pageerror`).

Layout `C100(S100(@tomlarkworthy/brain-dashboard))`, the page's module in no pane: the seven rows
gave the same counts, choices, panels and notes. The elements of `viewof asked` and `viewof span`
were not connected to the document there; the script pressed and set them through the runtime. So
with the dashboard's module alone a reader has no control for the span on the page, and the panels
read the hour the page's `span` opens with.

## Tests

Every row but the first two and the last is of one build of the worktree, made at 20:16 UTC after the
last rebase that changed a seed (`brain-kernel.ojs`, which the page's module imports), with
`brain-dashboard.ojs` and `cloud-brain.ojs` as `64db274b` has them. So each count of `brain-dashboard`
includes the assertions of the next commit; the number of tests is the same with and without it.

| command | result |
|---|---|
| `cd $W/cloud-brain-dev && bun test.ts brain-x-dashboard` (what cb4 ran, `41a68d588088`), before any edit | `passed` 11, `failed` 0, `needsBrowser` 0 |
| `… bun test.ts brain-x-page` (what cb4 ran, `f6639d5906c7`), before any edit | `passed` 14, `failed` 0, `needsBrowser` 16 |
| `… bun test.ts brain-x-dashboard --with $W/tools/cloud-brain/.emitted/fb-dash.js` | `passed` 13, `failed` 0, `needsBrowser` 2: the two of the four that make a select, a chart and a table |
| `… bun test.ts brain-x-page --with $W/tools/cloud-brain/.emitted/fb-page.js` | `passed` 12, `failed` 0, `needsBrowser` 14 |
| `cd $W && bun tools/cloud-brain/tab-tests.ts tools/cloud-brain/.emitted/cloud-brain.html @tomlarkworthy/brain-dashboard` | `tests` 15, `passed` 15, `failed` `[]`. 15 is 13 + 2. |
| `… tab-tests.ts … @tomlarkworthy/cloud-brain` | `tests` 26, `passed` 26, `failed` `[]`. 26 is 12 + 14. |
| `cd <root> && BRAIN_BASE=cb4 bun tools/cloud-brain/verify-run.ts brain-x-dashboard --shell $W/tools/cloud-brain/.emitted/cloud-brain.html --times 20`, ended 20:17:34 UTC | `runs` 20, `passed` 20, `failed` 0, `none` 0, `byChance` `[]`, `from` `["document"]`, `mains` brain-shell and brain-dashboard; `"tests":15` in each of the 20 lines. |
| the same for `brain-x-page`, ended 20:17:56 UTC | `runs` 20, `passed` 20, `failed` 0, `none` 0, `byChance` `[]`, `from` `["document"]`, `mains` brain-shell and cloud-brain; `"tests":26` in each of the 20 lines. |
| `bun test ./tests/tools/dsv-5-docs-name-the-dashboard-service.test.ts`, in the worktree | 5 pass, 0 fail. The same file in a directory with the four files it reads as `bf4762e2` had them (`git show bf4762e2:<path>`, before the change): 0 pass, 5 fail. |
| `bun test ./tests/tools`, in the worktree, ended 20:15:20 UTC, before that rebase | 368 pass, 1 skip, 0 fail |

So 4 tests left `brain-x-page` and 4 came to `brain-x-dashboard`, by `test.ts`: 14 + 16 = 30 before and 12 + 14 = 26 after; 11 before and 13 + 2 = 15 after. The reproduction
of the brief's step 5 is the docs test: it holds that `viewof dashboardName` and `dashboardView` are
cells 2 and 3 of `brain-dashboard.ojs`, that `## Methods` is cell 5, and that the page's seed has
none of the 22 names and no heading `## Dashboards`.

The four tests are as `dsv-5-page-section` wrote them: they read no clock, assign nothing to a
global and make their select with stand-ins for the hash, `go` and `listen`.

## Not tried

- **Anything on cb4 as the owner**: the select in his tab under the title of `brain-dashboard`,
  `health` chosen and drawn through `metric.query?metric=core.calls`, "Refresh" of Health pressed
  from the other pane.
- **The owner's note.** Its anchor is a cell of `@tomlarkworthy/cloud-brain` that is gone. Where
  `brain-feedback` now draws the note of this issue was not looked at.
- **The deployer's own run in the cluster's browser (Chrome 128) before the deploy.** `verify-run.ts`
  reads the page's module from the build it is given; in the deployer's run the shell reads it from
  `brain-x-page` as deployed. Both Workers' states after the apply are in the comment on the issue.
- **A change of one of the page's five functions made to see a test of `brain-x-dashboard`
  fail.** It follows from the imports and was not made to happen.
- **A member's tab, a fork of the page (`blob:`), a dashboard of 20 panels, a span of days against
  Cloudflare**: as `records/dsv-5-page-section.md`, "Not tried", none of which this change touches.
- **The docs on cb4.** `cloud-brain-docs` is a module of the shell, which reaches cb4 with
  `brain.ts shell`, the owner's. Until then the docs tab on cb4 says the section is under Health.
- **A span and a "Refresh" in the dashboard's module.** Not built. If the owner reads dashboards
  with that module alone in the layout, it is the next thing to ask for.
- **A second press, a refused write, two answers out of order**: the cells are unchanged, and
  `records/dsv-5-page-section.md` has what was tried of them in the page's module.
