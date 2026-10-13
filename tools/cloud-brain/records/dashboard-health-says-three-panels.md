# dashboard-health-says-three-panels

## Round 1, 2026-10-13

The built-in dashboard `health` of `tools/cloud-brain/brain-dashboard.ojs` had three panels, drawn
`calls`, `faults` and `methods`, and two comments of the seed said they were "the three panels the
page draws today". The page draws two under Health since `fb-a2oogpkdjb` (2026-10-11):
`healthPanels = [{ draw: "calls", worker: "" }, { draw: "table", worker: "" }]` in
`tools/cloud-brain/cloud-brain.ojs`, read 2026-10-13. The built-in value is now those two, and the
comments say two.

### The choice: `faults` leaves the built-in dashboard

The issue left it open whether the panel `faults` (titled "Health", the strip with one row a Worker)
stays in the built-in dashboard. It was not put to the owner. Taken out, by `philosophy.md` line 2
(choose, the side easier to undo) and line 4 (he is not asked twice).

What was read for it:

- The owner's two notes, both anchored in the cell `healthView` at the text "Health", the title of
  that panel: "the successful calls dashboard is not very useful and should be removed from the main
  page" (`fb-a2oogpkdjb`) and "the health chart is not very useful please remove it"
  (`health-chart-not-useful-remove`, the issue's body). Both say the chart is not useful. The first
  names the main page; the second names no place.
- The spec, `plan/cloud-brain-dashboard-service.md`: "`health` is built in: three panels over
  `core.calls`, the ones of today." The built-in was defined as what the page draws, and the page
  changed.
- `health` cannot be written: `dashboard.put` and `dashboard.delete` of that name answer 403 for
  the owner too (the test `test_a_dashboard_is_kept_as_data_and_health_is_built_in`).

The two sides, and what each costs to undo:

| | The owner undoes it by |
|---|---|
| `faults` stays in `health` | a change of the seed and a deploy: he cannot take a panel off a built-in dashboard |
| `faults` leaves `health` (taken) | one `dashboard.put` of a dashboard of his own with a panel `draw: "faults"`, no deploy |

The draw `faults` is kept: `dashboardDraws`, `panelNeeds` and `panelBody` are not changed, and the
test now puts a dashboard with such a panel and reads 200. That the owner's two notes reach the
dashboard under Dashboards as well as the page is the writer's reading, not his word.

### What changed

In `tools/cloud-brain/brain-dashboard.ojs`:

- `dashboardDefinitions`: `health` has the panels `calls` ("Calls") and `methods` ("By method").
  The comment above it says two panels, names `healthPanels` of `cloud-brain.ojs`, and says where
  the strip went.
- `test_a_dashboard_is_kept_as_data_and_health_is_built_in`: the comment of R8 says two panels; the
  expected `health` has two; a new line holds the draws to `["calls", "methods"]`; and four new
  lines put a dashboard `faults` of one panel drawn `faults` and read `{ status: 200 }` with the
  dashboard as sent.
- Four comments reworded: "the three draws of the dashboard `health`" is "the three draws made for
  Health" (above `panelNeeds`, and in the test of the draws); "as the three of `health` are" is "as
  the two of `health` are"; "drawn one of the five ways" is "drawn one of dashboardDraws" (the list
  has seven).

The method reference of the service has a table with a row for each panel of a built-in dashboard,
written from `dashboardDefinitions` by the cell `dashboardTable`, so it loses the row of `faults`
with no edit of the prose. A test holds the reference to the value
(`test_dashboard_declares_one_cloudflare_permission_and_its_rows`, the loop over `dashboardDefinitions`; not changed).

In `plan/cloud-brain-dashboard-service.md`: two "As built" notes, under "A dashboard" and in the
row R8 of the table of checks.

### The test failed before the change

The test was edited first, with `dashboardDefinitions` as it was, built, and run:

```
cd cloud-brain-dev && bun test.ts brain-x-dashboard --with …/.emitted/dashboard-health-says-three-panels.js

FAIL test_a_dashboard_is_kept_as_data_and_health_is_built_in
       Array [
         "calls",
     +   "faults",
         "methods",
       ]
"passed":13,"failed":1,"needsBrowser":4
```

### Counts

Each from a run after the last edit of the seed, on 2026-10-13.

| command | result |
|---|---|
| `cd cloud-brain-dev && bun test.ts brain-x-dashboard --with …/.emitted/dashboard-health-says-three-panels.js` (in the worktree) | `"passed":14,"failed":0,"needsBrowser":4` |
| `bun tools/cloud-brain/tab-tests.ts tools/cloud-brain/.emitted/cloud-brain.html @tomlarkworthy/brain-dashboard --emit dashboard_service=…` (02:05 CEST) | `"tests":18,"passed":18,"failed":[]` |
| `BRAIN_BASE=cb4 bun tools/cloud-brain/verify-run.ts brain-x-dashboard --shell …/.emitted/cloud-brain.html --times 20` (its `at`: 00:03:45Z) | `"runs":20,"passed":20,"failed":0,"none":0,"from":["document"],"byChance":[]` |

The count of `tests/tools/suite.sh` is in the issue's comment: this change has no file under
`tests/`.

### Not tried, not changed

- The page. No tab was opened on `#dashboard=health`, with a session or with a stand-in: that the
  select and the panels of the module draw two panels for it was not seen. What the tests hold is
  the value, the answer of `dashboard.get?name=health` in the rig, and the reference's table.
- A `dashboard.put` with a panel `draw: "faults"` on cb4. It was made in the test's rig only.
- A tab of the owner's that was open over the deploy: what it draws until it is loaded again was
  not looked at.
- The records of earlier issues that say `health` has three panels (`dsv-3-dashboards.md`,
  `dsv-5-page-section.md`, `dsv-6-health-through-the-service.md`, `fb-a2g3jyhecp.md`,
  `fb-a2oogpkdjb.md`) are of their dates and are not changed. Neither is `spec-as-built.md`.
- `plan/cloud-brain-dashboards-share-series-and-controls.md` says "The three panels of today" of
  the page before `fb-a2oogpkdjb`; it is another spec, of its date, and is not changed.
- What cb4 answers after the deploy is in the issue's comment, not here: the record is committed
  before the landing.
