# The panels of Health are instances of a template (`ds-4-panels-from-a-template`)

Task 4 of `plan/cloud-brain-dashboards-share-series-and-controls.md`, after
`ds-3-logs-reads-the-span`. Built 2026-10-12 by a writer of the issue loop, round 1. Every run
quoted here was made that day between 10:28 and 11:10 UTC (`date -u` beside each command), on the
seed as it is committed.

## What changed

`tools/cloud-brain/cloud-brain.ojs`, under "## Health". Until this change `healthView` drew two
panels with `dashboard(healthPanels(calls, …))`, and `healthPanels` was a function.

| cell | what it is now |
|---|---|
| `healthNote` (new) | The line above the panels: `callsNote(calls)` for the owner, the visitor's line with no answer. It was inside `healthView`. |
| `healthView` | For the owner: `panelInstances(healthPanels, …)`, the boxes laid out by `dashboard`, and `invalidation.then(made.dispose)`. For a visitor an empty `div`. |
| `healthPanels` | A list, `[{ draw: "calls", worker: "" }, { draw: "table", worker: "" }]`. It was a function of the answer. |
| `panelInstances` (new) | One `instantiateDataflow(template, { params: { ...shared, panelStart: entry }, observers, watch })` for each entry. The observer of the cell `panel` is an `Inspector` on a box. Answers `{ live, boxes, dispose }`. |
| `panelTemplate` (new) | `lookupVariable` of the six variables `viewof panelDraw`, `panelDraw`, `viewof panelWorker`, `panelWorker`, `panelDrawing`, `panel` in this module. |
| "### One panel" (new) | The prototype: `panelStart`, `panelDraws`, `viewof panelDraw`, `viewof panelWorker`, `panelDrawing`, `panel`. Drawn on the page as one more panel. |
| `panelView`, `panelWorkers`, `workerLink` (new) | What a panel draws for a draw and a Worker; the Workers its select offers; the link of a Worker's name, which was an expression inside `healthView`. |
| `dashboard` | A panel with no `title` has no line for one. The panels of Health have none: "Show" says what each is. |
| `viewof myModule` (new) | `thisModule()` of runtime-sdk, for `panelTemplate`. |
| imports | `lookupVariable`, `thisModule`, `onCodeChange` from runtime-sdk; `instantiateDataflow` from dataflow-templating; `Inspector` from inspector. |

The compiled inputs, `grep` on the module read out of the build with
`lope-reader.ts --get-module @tomlarkworthy/cloud-brain`:

```
$def(…, "healthNote", ["htl","calls","callsNote","spanName","span"], …)
$def(…, "healthView", ["client","session","htl","panelInstances","healthPanels","panelTemplate","instantiateDataflow","Inspector","onCodeChange","invalidation","dashboard"], …)
$def(…, "viewof panelWorker", ["panelStart","Inputs","panelWorkers","calls"], …)
$def(…, "panelDrawing", ["panelView","calls","panelDraw","panelWorker","width","workerLink"], …)
$def(…, "calls", ["assembled","callsRead","session","client","timeRange"], …)
```

`healthView` names none of `calls`, `width`, `span`, `services`, `brainModules`. That is why the
note moved out of it: a cell that named `calls` or `span` would end its instances and make them
again on each answer, and what was chosen in a panel would be lost. `calls` is as it was.

Not changed: `callsRead`, `calls`, `timeRange`, the two controls, `requestsChart`, `healthStrip`,
`methodTable`, `callsNote`.

## The shell carries the modules

The task asks for this check. `curl -s --compressed https://cb4.endpointservices.workers.dev/`
at 10:28:19 UTC: 5,132,331 bytes. `grep -c 'id="@tomlarkworthy/NAME"'` on it gave 1 for each of
`dataflow-templating`, `inspector` and `runtime-sdk`, and the file has
`id="@tomlarkworthy/inspector/inspector-5%401.0.1.js.gz"`, the attachment `Inspector` is made from.

## The Worker select across a "Refresh"

The spec left this open ("Not known"). **It is kept.** `viewof panelWorker` reads `calls` for the
Workers it offers, so the runtime makes it again for each answer. The cell starts the new select at
the value of the one before it, which a cell reads as `this`:

```js
viewof panelWorker = {
  const chosen = this && typeof this.value === "string" ? this.value : panelStart.worker;
  return Inputs.select(panelWorkers(calls, chosen), { label: "Worker", format: (worker) => worker || "all", value: chosen });
}
```

`panelWorkers` offers the Workers of the answer and the chosen one, so a Worker with no call in the
new answer is still chosen and its table reads "No results." Not chosen: one select kept across
answers with its `<option>`s replaced in place. `Inputs.select` reads its value by the index of the
chosen option in the list it was made with, so that needs a select written by hand, and the seed
has the rule "Every control in this notebook is an Inputs control".

## Tests

Three `test_` cells: one rewritten, two new. The module has 32, where it had 30.

- `test_health_draws_calls_and_methods_and_no_strip_of_faults` (rewritten for the list): the list
  is the two entries, the two bodies drawn by `panelView` have no legend of the strip, the table's
  rows and link, a panel with no title has no title line and one with a title has.
- `test_a_panel_draws_one_of_three_for_one_worker_or_all`: `panelView` for each draw, an unknown
  draw, one Worker, a Worker with no row, no answer; `panelWorkers`; `panelDraws`.
- `test_health_panels_are_instances_of_one_template`: enters `panelInstances` with the page's own
  `panelTemplate`, `instantiateDataflow` and `Inspector`, and gives `calls`, `width` and
  `workerLink` as `shared`. Three instances; the second and third add 0 to `runtime._variables.size`
  and no `dynamic bridge` variable (read with no `await` between); a choice in one box leaves the
  other as it was; two new answers handed to one instance through a generator, after a choice that
  is not its entry's; `dispose`.

Failing first, each a build of a changed seed run with
`bun tools/cloud-brain/tab-tests.ts FILE @tomlarkworthy/cloud-brain --timeout 40`, 11:06:45 to
11:07:53 UTC:

```
a  the seed of origin/main with the three tests        32 tests, 29 passed   panelWorkers / panelView / panelInstances is not defined
b  chosen = panelStart.worker (no `this`)              32, 31   test_health_panels_are_instances…: Expected "brain-x-inbox", Received "brain-core"
c  healthPanels with { draw: "faults" } in the middle  32, 31   test_health_draws_calls_and_methods_and_no_strip_of_faults
d  dispose: () => {}                                   32, 31   test_health_panels_are_instances…: bridges of calls, width, workerLink left
```

**The first form of the instances test passed on b.** Its box started at `brain-core` and was never
changed, so a select that fell back to its entry read the same. The test now picks `brain-x-inbox`
before the new answer.

On the committed seed:

```
cd cloud-brain-dev && bun test.ts brain-x-page --with …/ds-4.js          passed 14, failed 0, needsBrowser 18      (before: 14, 0, 16)
bun tools/cloud-brain/tab-tests.ts …/cloud-brain.html @tomlarkworthy/cloud-brain    "tests":32,"passed":32,"failed":[]     11:05:06 UTC
BRAIN_BASE=cb4 bun tools/cloud-brain/verify-run.ts brain-x-page --shell …/cloud-brain.html --times 20
    "runs":20,"passed":20,"failed":0,"none":0,"from":["document"],"byChance":[]      11:05:22 to 11:05:40 UTC
    first line: "mains":["@tomlarkworthy/brain-shell","@tomlarkworthy/cloud-brain"]; "tests":32 in 20 of 20 run lines
```

`tests/tools/suite.sh` in the worktree, 11:07:53 to 11:09:28 UTC: `612 pass`, `0 fail`, `Ran 612 tests across 63 files`.

32 is 14 + 18. The two new tests and the rewritten one are among the 18: each reads `document`.
The instances test takes its `MutationObserver` from `document.defaultView`, because `test.ts`
counts "document is not defined" as needing a browser and "MutationObserver is not defined" as a
failure (1 failed there before that line was changed).

## On the page, in a tab

`bun tools/scratch/ds4-tab-check.ts tools/cloud-brain/.emitted/cloud-brain.html`, 11:05:40 to
11:06:32 UTC, exit 0. The script is committed. It opens the build in a local headless Chrome at
1280 by 800, reads the page with no session, then redefines `session` and `client` of the module in
the tab. The stand-in `client.query` answers `metric.query` with three rows inside the span asked
and keeps every call. Each select is set as a person sets it (`selectedIndex`, then an `input`
event), "Refresh" is clicked. A step waits 1.5 or 2.5 s and reads once. Columns: `metric.query`
sent so far, boxes under Health, `runtime._variables.size`, `dynamic bridge` variables in the
module's scope, what each box has chosen.

```
no session                                  0   0   5869   0    note: "Sign in as the owner to see the calls of the last hour."; 0 .observablehq--error on the page
stood in                                    1   2   5866   9    [Calls, all] [By method, all]      chart, table
box 2 Worker brain-core, box 1 Show faults  1   2   5861   9    [Faults by Worker, all] [By method, brain-core]      strip, table
Refresh                                     2   2   5861   9    the same two choices
Last: 6 hours                               3   2   5861   9    the same; note "The last 6 hours, …"
viewport 1280 to 900                        3   2   5861   9    the same; the chart's svg width 920 to 812
panelDrawing redefined in place                3   2   5861   9    the boxes end "edited: faults of all", "edited: table of brain-core"
panelDrawing put back                          3   2   5861   9    strip, table
healthPanels of 3                           3   3   5861   9    made 3; second dispose() of the 2 before: false, false
healthPanels of 4                           3   4   5861   9    made 4; of the 3 before: false ×3
Refresh with 4 panels                       4   4   5861   9
healthPanels of 2                           4   2   5861   9    of the 4 before: false ×4
healthPanels of 0                           4   0   5852   0
healthPanels of 1, draw "other", worker "brain-x-none"   4   1   5861   9    [Calls, brain-x-none], a chart
session { signedIn: false }                 4   0   5852   0    of the 2 before: false, false; 0 errors
session of the owner again                  5   2   5861   9
```

Read from it:

- **R2 holds with panels instanced.** A "Refresh" is one `metric.query` with 2 panels and with 4. A
  change of span is one. A resize, a choice in a panel, a longer or shorter list are none.
- **R4.** A third and a fourth entry draw a third and a fourth box with no other edit, and
  `runtime._variables.size` is 5861 at 1, 2, 3 and 4 panels. With none it is 5852: the first
  instance adds the 9 bridges, one for each name its cells read from the page, and no later one
  adds any.
- **The instances are not made again** by an answer, a change of span or a resize: the element of
  `healthView` was the same one at each of those steps (`sameView` in the script's lines), and both
  choices stood.
- **They are ended** when the list or the session changes. From the step "instantiateDataflow
  wrapped" on, the script keeps each instance `healthView` makes; after the next run a second
  `dispose()` of each answered `false`, which is what an instance that was ended answers.
- **An instance follows a cell of the template defined again**, seen for `mod.redefine("panelDrawing", …)`.
- With no session: no box, the visitor's line in `healthNote`, the prototype with "all" as its one
  Worker and "Sign in as the owner to see a panel.", and 0 error cells on the whole page.

`instantiateDataflow.stats().modules` was read and is not used as a count: it is the page's whole
second runtime, the editors' instances among them, and it moved by 0 to 4 between steps that made
no panel.

In the stood-in tab the page has 5 error cells, none under Health: `statusLine`, `probation`,
`accessPanel`, `spendingPanel`, `peoplePanel`, each reading the stand-in client. With 3 or 4
entries there is a sixth, `test_health_draws_calls_and_methods_and_no_strip_of_faults`, which holds
the list to its two entries. The record of `ds-3-logs-reads-the-span` counted 5 and did not read them.

**Seen and not explained.** Two screenshots of the step at 900 px wide had the words "id title
state kind about labels parent changed", as a table's header, painted over the legend of the strip
in the first box. No element of the page or of an open shadow root held that text
(`getByText("changed", { exact: true })`: 0), `document.elementsFromPoint` there gave the strip's
`figure`, and the page's two tables were at 466 and 1066 px. Not there at 1280 px, in the
screenshots of the steps before it. A screenshot of the page of `origin/main` under the same
stand-in at 900 px, after other steps, did not have it.

## Not chosen

- **The panels of a dashboard instanced.** `plan/cloud-brain-dashboard-service.md` says `ds-4` is
  "built on" its task 5: the entries "become panels of this spec" and the instances replace the
  loop of `dashboardView`. Since then `dashboardView` is a cell of `brain-dashboard.ojs`
  (`fb-a2g3jyhecp`), Health draws its own two panels (`dsv-6-health-through-the-service`), and the
  issue asks for task 4 of its own spec. Built: that. It deploys `brain-x-page` alone and leaves
  `brain-x-dashboard` as it runs. That spec has an as-built note. `brain-dashboard` imports from the
  page, so `panelInstances` is there for it to import; its panels have a query each, which the
  template here does not.
- **"faults" as an entry.** The spec's list has three. The owner took the strip off Health on
  2026-10-11 (`fb-a2oogpkdjb`). The list has two, and "Show" offers the strip in any panel.
- **A title on each box.** The select "Show" changes what the box draws, so a title from the entry
  would be wrong after one choice.
- **The name `panelBody`**, which the spec gives the cell that draws. `brain-dashboard.ojs` has a
  function of that name, and `tests/tools/dsv-5-docs-name-the-dashboard-service.test.ts` holds that
  the page's module has no cell so named (1 fail of 612 in `tests/tools/suite.sh` with it). The
  cell is `panelDrawing`.
- **`myModule` as a cell that `panelTemplate` names.** `thisModule()` has no value until it has
  searched the runtime, so the value cell is first `undefined` and `lookupVariable(names, undefined)`
  throws. `panelTemplate` names the control and waits for its `input` event.

## Not tried

- The owner's own tab on cb4. `core.calls` answers his session only: the panels past the visitor's
  line were seen with the stand-in and not against Cloudflare.
- An edit of a template cell in the page's editor. Only `mod.redefine` from the script was run.
  An edit that makes a cell read a name the instances have no bridge for was not tried.
- A cell of the template deleted and defined as a new variable. `panelTemplate` holds the
  variables it found and does not run again.
- The page with the module loaded from the Worker (`loadService`, cell by cell), which is how the
  owner's page gets it. The tab and `verify-run.ts --shell` had the module in the document.
- A choice in a panel while an answer is on its way, and two answers out of order: `calls` is one
  cell and the panels draw what it has.
- More than 4 panels; the page in two panes; a list changed while a select has the caret.
- `cloud-brain-docs.ojs` has one more sentence on the two selects. It is a module of the shell and
  reaches cb4 with `brain.ts shell`, which is the orchestrating session's.
