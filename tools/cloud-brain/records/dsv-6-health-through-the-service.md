# Health reads its calls through the dashboard service (`dsv-6-health-through-the-service`)

Task 6 of `plan/cloud-brain-dashboard-service.md`. Built 2026-10-12 by a writer of the issue loop,
round 1. The seed commit's author time is 02:15:35 +0200 (`git log --format=%ai`).

Nothing here was seen on cb4 in the owner's tab: `core.calls` is read with the owner's own session
(`caller.session`), which the loop does not have. Every count below is from the commands named, on
the worktree's build, with `session` and `client` stood in where a tab is said.

## What changed

`tools/cloud-brain/cloud-brain.ojs`, under `## Health`. `git show --numstat` of the seed commit for
that file: 52 lines added, 69 removed.

| cell | before | now |
|---|---|---|
| `callsRead` | `client.procedure("logs.query", callsQuery(range))`, through `callsSeries` | `client.query("metric.query", { metric: "core.calls", since, until, by: "worker,method,status" })`, through `callsRows` |
| `callsQuery` | Cloudflare's body for the calls, written in the page | gone. `brain-dashboard` writes the body from the definition of `core.calls` (`metricBody`) |
| `callsSeries` | Cloudflare's `calculations` as rows | gone. `metricSeries` of `brain-dashboard` does that in the service |
| `callsRows` (new) | | The answer of `metric.query` as `{ since, until, step, groups, sampled, cached, series }`, each row with the metric's `sum` as `ms`, the name the three charts read |
| `callsGroupLimit` (new) | `callsQuery(data).parameters.limit` | `500`, the limit `metricBody` writes |
| `callsNote` | "logs.query failed: …"; the limit line | "metric.query failed: …"; the limit line; a line for an answer Cloudflare made from a sample (`sampled` above 1); "Answered from the service's memory." for `cost.cached` |
| `calls`, `healthView`, `healthPanels`, the charts, `span`, `asked`, `timeRange` | | not changed (one comment on `calls`) |

The compiled inputs, `grep '$def("_cloudbrain_calls'` on the module read out of the build with
`lope-reader.ts --get-module @tomlarkworthy/cloud-brain`:

```
$def("_cloudbrain_callsNote", "callsNote", ["callsGroupLimit","spanName"], …)
$def("_cloudbrain_callsRead", "callsRead", ["callsRows"], …)
$def("_cloudbrain_calls", "calls", ["assembled","callsRead","session","client","timeRange"], …)
$def("_cloudbrain_callsGroupLimit", "callsGroupLimit", [], …)
$def("_cloudbrain_callsRows", "callsRows", [], …)
```

The nine names `brain-dashboard.ojs` imports from the page (`session`, `client`, `timeRange`,
`spanName`, `dashboard`, `chartBase`, `requestsChart`, `healthStrip`, `methodTable`) are as they were.

Also: the paragraph of "Calls and faults" in `tools/cloud-brain/cloud-brain-docs.ojs`, one sentence of
`tools/cloud-brain/running-a-cloud-brain.md`, four "(As built …)" notes in the two specs, and two test
files under `tests/tools/` (below).

## What the spec asked and what was built

The spec's task 6: "`callsRead` sends `metric.query`, and the section "Health" draws the dashboard
`health`." The first half is built. The second is not, for two things that happened after the spec
was approved (event 1371):

- **The owner took the strip of faults off Health** (`fb-a2oogpkdjb`, 2026-10-11). The built-in
  dashboard `health` still has three panels, the strip among them
  (`brain-dashboard.ojs`, `dashboardDefinitions`). Drawing `health` under Health would put the strip
  back where he removed it.
- **The cells that draw a dashboard are in `brain-dashboard` and import from the page**
  (`fb-a2g3jyhecp`, whose record says "The page's module imports nothing from `brain-dashboard`").
  `healthView` drawing with `panelBody` would make each module import the other.

So Health reads the metric that the dashboard `health` names, with the `by` its panels name, and
draws its own two panels, "Calls" and "By method", from that answer. It sends no `dashboard.get`.
Decided by line 2 of `philosophy.md` (the smaller side, easier to undo) and by the owner's later act
on the page. Not chosen: taking the faults panel out of the built-in `health`, which is a change to
the seed of another Worker (`brain-x-dashboard`) and to a test of `dsv-3`; the owner can still
choose `health` in the select of `brain-dashboard` and see the strip there.

## What changes for the owner, read in the service and not seen on cb4

Each is from `tools/cloud-brain/brain-dashboard.ojs` (`metricAsk`, `metricMemory`, `metricPieces`)
and its reference; none was seen with `core.calls`, which no token reads.

- **The span is cut to whole minutes.** `since` and `until` are each cut to the minute they are in,
  so the calls of the minute that has not ended are not in the answer. `logs.query` was asked up
  to the millisecond of the press. `callsRows` takes the answer's `since` and `until`, so the
  chart's axis and the note are of what was counted.
- **"Refresh" inside the same minute is answered from the service's memory** (60 s unless the
  setting `memoryMs` says other), and the note then ends "Answered from the service's memory."
- **A sampled span of more than a day is asked again a day at a time** by the service, and an
  answer that is still sampled says so in the note.
- **The lines counted are the definition's**: `brain-core`'s lines with `at: "call"`. The page's
  query was every line of the Brain's Workers that has a `method`. Whether the two counts differ on
  cb4 was not measured.
- **The rule is the same gate**: `core.calls` passes `caller.session` only, as `logs.query` does.

## The test, failing first

The three tests were changed before the cells (the seed with the tests alone, built, and run with
`cd $W/cloud-brain-dev && bun test.ts brain-x-page --with $W/tools/cloud-brain/.emitted/dsv-6.js`):

```
what cb4 runs (8028f6d28439)      passed 14  failed 0  needsBrowser 16
the tests alone                   passed 12  failed 3  needsBrowser 15
  test_calls_are_read_once_for_a_range_and_not_without_a_client
      Expected ["query", "metric.query", …]   Received ["procedure", "logs.query", { parameters: … }]
  test_calls_from_the_logs_become_chart_rows                         callsRows is not defined
  test_the_note_names_the_span_and_says_when_the_answer_is_at_the_limit   callsGroupLimit is not defined
with the cells changed            passed 14  failed 0  needsBrowser 16
```

The first is the defect of the issue: the read was a `logs.query`. Its client counts both kinds of
call, so the test holds that the read is one `metric.query` with those four parameters and that no
procedure is sent. The other two failed on a name that did not exist yet, which says nothing of
behaviour; what they hold now is under "Tests".

## Tests

Run after the rebase onto `main` at `ccf2b1af`, on a build made after it. The rebase brought in
`brain-issues.ojs`, a record, a spec and `seen.json`: nothing the page's module is built from.

| command | result |
|---|---|
| `cd $W/cloud-brain-dev && bun test.ts brain-x-page --with $W/tools/cloud-brain/.emitted/dsv-6.js` | `passed` 14, `failed` 0, `needsBrowser` 16 |
| `cd $W && bun tools/cloud-brain/tab-tests.ts tools/cloud-brain/.emitted/cloud-brain.html @tomlarkworthy/cloud-brain` | `tests` 30, `passed` 30, `failed` `[]`. 30 is 14 + 16. |
| the same for `@tomlarkworthy/brain-dashboard`, whose tests run the page's charts | `tests` 15, `passed` 15, `failed` `[]` |
| `cd $W/cloud-brain-dev && bun test.ts brain-x-dashboard` (as deployed, `567fadfef4db`) | `passed` 13, `failed` 0, `needsBrowser` 2 |
| `BRAIN_BASE=cb4 bun tools/cloud-brain/verify-run.ts brain-x-page --shell $W/tools/cloud-brain/.emitted/cloud-brain.html --times 20`, ended 00:26:56 UTC | `runs` 20, `passed` 20, `failed` 0, `none` 0, `byChance` `[]`, `from` `["document"]`, `mains` brain-shell and cloud-brain; `"tests":30` in the first and the last line |
| `cd $W && bun test ./tests/tools/health-docs-say-what-the-page-does.test.ts` | 4 pass, 0 fail. With the two seeds as `HEAD` had them before the change (copied to a scratch directory beside the new test): 2 pass, 2 fail. |
| `cd $W && bun test ./tests/tools` | 448 pass, 1 skip, 0 fail |

What the three tests of the seed hold now:

- `test_calls_are_read_once_…`: one `metric.query` with `{ metric: "core.calls", since, until, by: "worker,method,status" }`, no procedure; nothing with no client; a failed query is the range, no rows and the error.
- `test_calls_from_the_logs_become_chart_rows`: an answer of three rows becomes three rows with `ms`; the span is the answer's and not the one asked; `cached` and `sampled` are carried; `null` and `{}` are the range asked and no rows; `rollup`, `requestsChart`, `healthStrip`, `methodTable` and `dashboard` draw from the rows, the assertions as they were.
- `test_the_note_…`: the three new lines word for word (sampled, from the memory, neither), "metric.query failed: AuthRequired", and the limit from `callsGroupLimit`.

They read no clock, assign nothing to a global and make no control.

**A test of another task that this change broke.** `tests/tools/tx-1-six-lines.test.ts` held
`count(spec, "As built")` to be 1 over the whole of `plan/cloud-brain-dashboard-service.md`. The
three notes of this task made it 4 (`bun test ./tests/tools`: 447 pass, 1 fail). It now counts
``(As built, `dsv-3-dashboards` ``, the sentence it is about.

## The tab check of R8

A script of this task, `tools/cloud-brain/.emitted/dsv-6-tab.ts` (not committed; `.emitted/` is
ignored), opens the build in a local headless Chrome (151.0.7922.34, 1280 by 800) as `tab-tests.ts`
does, with the page's module in the one pane and no pairing. It then stands in
`mod.redefine("session", { signedIn: true, owner: true })` and a `client` whose `query` answers
`metric.query` from a fixture of four rows and pushes every call, `procedure` too, to `window.seen`.
One run, ended 00:17:05 UTC, on the build of the seed commit before the rebase (the page's seed is the
same after it); each row is a line of
`.emitted/dsv-6-tab-log.jsonl`.

```
                                           metric.query  logs.query  dashboard.get  errors*  panels (rect, rows)          the note ends
no session, as the file opens                    0           0            0           0      none      "Sign in as the owner to see the calls of the last hour."
owner and client stood in, 8 s                   1           0            0           0      Calls 7, By method 3 rows    … 8 calls in 3 groups, one bar each 1 minute.
read again, 5 s later                            1           0            0           0      the same
"Refresh" clicked, 3 s                           2           0            0           0      the same
viewport 1000x800, 4 s                           2           0            0           0      the same
span set to 6 hours (selectOption), 3 s          4           0            0           0      the same                     The last 6 hours, …
span set to 1 hour (selectOption), 3 s           6           0            0           0      the same
"Refresh", the stand-in answering cached         7           0            0           0      the same                     … Answered from the service's memory.
"Refresh", answering sampled 10                  8           0            0           0      the same                     … from a sample of the lines (sampled 10): …
"Refresh", answering 500 groups                  9           0            0           0      the same                     … 500 groups is the limit of one answer: some calls may be missing.
"Refresh", answering no rows                    10           0            0           0      Calls 0, By method 1 row     … 0 calls in 3 groups, …
"Refresh", the query refused                    11           0            0           0      Calls 0, By method 1 row     metric.query failed: not allowed by the rule for this
session set to { signedIn: false }              13           0            0           0      none      "Sign in as the owner to see the calls of the last hour."
```

`errors*` is `.observablehq--error` between the `h2` "Health" and the `h2` "Operator". The `h2`s
in every row were Health, Services, Operator. The first `metric.query` was
`{"metric":"core.calls","since":…,"until":…,"by":"worker,method,status"}`. No `logs.query` was
sent in the run; the Logs panel sends one on its "Read", which was not pressed. The three links in
"By method" are the Workers' names, as before. The one row of "By method" with no rows is the
table's own empty row.

So for R8: under Health the stand-in saw `metric.query` with `metric=core.calls` and no
`logs.query`; the two panels drew; with no session there was no error element between the two
headings. "Refresh" added 1 and a resize 0, each once of once.

**Two presses of "Refresh" before an answer**, 0.8 s apart, the answers held: 12 sent and 1 held
at 1.5 s; that one let go, 13 sent. One at a time, as `records/ds-2-span-and-refresh-controls.md`
found for `logs.query`.

**A change of the span sent 2, not 1.** Looked at with a second script (`.emitted/dsv-6-span.ts`),
one run:

```
value set and one input event           sent 1
value set and one change event          sent 1
selectOption of Playwright              sent 2      (an input event and a change event)
the select focused, ArrowDown pressed   sent 0      (the value did not change in headless Chrome)
```

The select asks once for each of the two events, and Playwright's `selectOption` sends both.
`viewof span` and `timeRange` are not changed by this task, so by reading this is as it was since
`ds-2`, whose record counted 1 with one `input` event; it was not run on the build before this
change, and a choice made by a person's hand was not made. Filed as
`span-change-asks-twice`. What this task adds to it: the second ask is in the same minute as the
first, so on cb4 the service would answer it from its memory, and the note after a change of the
span would end "Answered from the service's memory." Not seen on cb4.

## Prior art searched

`knowledge.search?semantic=true` on cb4 with `--as loop-knowledge`, three questions: "health calls
read through metric.query core.calls", "page section draws a built-in dashboard panels", "answer cut
to the minute memory refresh stale". Used: `doc:cloud-brain-dashboard-service` (the spec) and
`doc:cloud-brain-dashboards-share-series-and-controls`. Nothing else bore on it. From the records:
`fb-a2oogpkdjb`, `fb-a2g3jyhecp`, `dsv-5-page-section`, `ds-2-span-and-refresh-controls`.

## Elsewhere

`git grep -n -F` for `callsRead`, `callsQuery`, `callsSeries` and `callsNote` over `knowledge`,
`plan/cloud-brain-*.md`, `.claude/skills/brain-maintenance` and `tools/cloud-brain/*.md`.

- Mended in this landing: `cloud-brain-docs.ojs` ("with one `logs.query`"), `running-a-cloud-brain.md`
  line 28 (it also said "the last hour" and "the share that were faults"), the two specs (notes
  beside the approved sentences), `tests/tools/health-docs-say-what-the-page-does.test.ts`.
- Left: the records of `ds-1` and `ds-2` and `spec-as-built.md` line 2917, which say what was built
  on their day.
- `cloud-brain-docs` is a module of the shell. The paragraph reaches cb4 with `brain.ts shell`,
  which is the orchestrating session's (`rules.md`, "Two standing leaves").

For the overseer: `tools/cloud-brain/brain-dashboard.ojs` line 236, a comment in a seed whose Worker
this task does not deploy, says "health is the three panels the page draws today from the core's
calls (healthView of cloud-brain.ojs)". The page draws two since `fb-a2oogpkdjb`. A mend: "health
is the three panels the page drew under Health until 2026-10-11; the page draws the first and the
third since (healthPanels of cloud-brain.ojs)."

## Not tried

- **Anything on cb4 as the owner**: Health in his tab drawn through `metric.query`, the time the
  query takes over each span, whether the counts equal those `logs.query` gave, a 7-day span of
  `core.calls` (40 148 lines a day on 2026-10-09, `spec-as-built.md`) asked a day at a time.
- **A real answer in the charts.** The fixture has the shape the reference of `brain-dashboard`
  gives; no answer of cb4 for `core.calls` was read.
- **A choice of the span by hand**, and the count of asks it sends: above.
- **Two answers of `calls` out of order**: the second ask was never out while the first was held.
- **A refused write, another caller's event on a row with the caret**: Health sends no write and
  has no text box.
- **A fork of the page (`blob:`)** and a member's tab.
- **The docs paragraph on cb4**: the shell was not posted by this task.
