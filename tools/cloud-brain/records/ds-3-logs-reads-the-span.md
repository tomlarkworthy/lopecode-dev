# Logs reads the shared span (`ds-3-logs-reads-the-span`)

Task 3 of `plan/cloud-brain-dashboards-share-series-and-controls.md`, after
`ds-2-span-and-refresh-controls`. Built 2026-10-11 by a writer of the issue loop, round 1. The seed
commit's author time is 19:15:34 +0200 (`git log --format=%ci`).

## What changed

`tools/cloud-brain/cloud-brain.ojs`, under "## Logs". Two cells changed and one test.

| cell | what it is now |
|---|---|
| `logsView` | Takes `span` and `invalidation` beside `client` and `now`. Its "Last" select is made from `spanOptions` (the literal `Map` of five spans it had is gone), and with a `span` it is `Inputs.bind(last, span, invalidation)`. With no `span` it is a select of its own, as before. |
| `logsPanel` | `logsView({ client: brain ? client : null, span: viewof span, invalidation })`. |
| `test_logs_panel_asks_cloudflare_and_a_row_filters_by_its_trace` | 14 lines added at its end: one comment and 13 of code, 4 of them `expect`, for R1 (below). Its earlier assertions are as they were. |

`logsPanel` names the control and not its value, so a change of the span does not make the panel
again. The compiled inputs, `grep` on the module read out of the build with
`lope-reader.ts --get-module @tomlarkworthy/cloud-brain`:

```
$def("_cloudbrain_logsPanel", "logsPanel", ["logsView","brain","client","viewof span","invalidation"], …)
$def("_cloudbrain_logsView", "logsView", ["htl","Inputs","spanOptions","Event","logsRows","logsQuery","press"], …)
```

This is the first `Inputs.bind` in a seed of the Brain (`grep -n "Inputs.bind" tools/cloud-brain/*.ojs`: one line).
The spec left open whether a bind of two selects whose values come from a `Map` carries the choice
both ways. It does, in the test and in the tab below.

Not changed: `logsQuery`, `logsRows`, the "## Logs" text, `viewof span`, `timeRange`, `calls`,
`cloud-brain-docs.ojs`. Logs shares the control and not the series: it still asks on "Read" only.

## The test, failing first

The assertions were added before the change and the build run in a QA tab (headless Chromium,
the step-8 snippet of `agents/implementer.md`, each `test_*` of the module imported into a side module):

```
before the change   [22,["test_logs_panel_asks_cloudflare_and_a_row_filters_by_its_trace expect(received).toBe(expected) … Expected: 360 Received: 60"]]
after, r=9302       [22,[]]
after, r=9303       [22,[]]      (a fresh tab; the build that was emitted)
```

The failing line is the first that sets the stand-in: the panel's select stayed at 60.

What the added lines hold, with a stand-in `Inputs.select(spanOptions, …)` as `span` and a clock of 100000000:

- the panel's "Last" starts at the stand-in's 60;
- the stand-in set to 360 (`.value`, then an `input` event): the panel's reads 360;
- the panel's set to 1440 the same way: the stand-in reads 1440;
- "Read" then sends `timeframe: { from: 100000000 - 1440 * 60000, to: 100000000 }`.

The test gives `invalidation: new Promise(() => {})`. With none, `Inputs.bind` takes its own default,
which ends the bind when the select is seen off the page; the panel of the test is never put on a
page. Whether the default would have dropped the listener inside the test was not tried.

With no browser, in the worktree's `cloud-brain-dev/`: `bun test.ts brain-x-page --with …/ds-3.js`
gave `passed 10, failed 0, needsBrowser 12`. This test is among the 12 (`document is not defined`),
as it was before, so it cannot fail there; the tab is where it failed and passed.

`BRAIN_BASE=cb4 bun tools/cloud-brain/verify-run.ts brain-x-page --shell <the build> --times 20`,
17:15:08 to 17:15:28 UTC: `"runs":20,"passed":20,"failed":0,"none":0,"from":["document"],"byChance":[]`,
`mains` of the first line `["@tomlarkworthy/brain-shell","@tomlarkworthy/cloud-brain"]`, `tests` 22 a run.

## On the page, in a tab

The same build, `#view=C100(S70(@tomlarkworthy/cloud-brain),S30(@tomlarkworthy/claude-code-pairing))`,
1280 by 800, `r=9302`.

**With no session** (`r=9303`): the Logs panel reads "Sign in as the owner to read the logs.", and the
page has 0 `.observablehq--error`. A visitor's panel makes no select and binds nothing.

**Stood in**, as the record of task 1 has it (`mod.redefine` of `session` and `client`, in the tab
only; the client answers no rows and keeps each call in a list). Each select was set as a person
sets it: `selectedIndex` of the native `select`, then an `input` event. Columns: the value of the
control under Health, of "Last" in Logs, the cell `span`, and the count of `logs.query` with
`view: "calculations"` (Health's).

```
after the stand-in, at 8 s            60     60            1
Health's select to "6 hours", 3 s     360    360    360    2      Logs shows "6 hours"
Logs' select to "24 hours", 3 s       1440   1440   1440   3      Health shows "24 hours"
"Read" in Logs, 0.5 s                                      3      1 logs.query with view "events", over 1440 minutes
```

So the two are one value each way. A change made in Logs asks for Health's calls again, once, as a
change made under Health does: that follows from one value, and the spec does not say it. "Read"
adds none to Health's count.

"brain-core" was typed in the panel's "Worker" box before the two changes. After them the cell
`logsPanel` gave the same element and the box still read "brain-core".

Where they are: two labels "Last" on the page. The one of Health is at 126 px from the top, under
the `h2` "Health" (92). The one of Logs is at 2697 px, under the `h2` "Logs" (2596) and its line of
text, the first control of the panel, where it was.

In the stood-in tab the page had 5 `.observablehq--error`. They were not read, so which cells they
are is not known. The spec says of this stand-in that "whether other cells of the page that read `client` throw on this
stand-in was not tried; they may". The tab with no session has none.

## Not chosen

A hidden `Inputs.input` that both selects bind to, the usual shape here for two controls of one
quantity. `viewof span` is already a cell and a control, and the spec names the bind to it; a third
cell would hold the same number.

## Not tried

- Anything on cb4 with the owner's session. `logs.query` answers only that, so the panel past the
  sign-in line was seen with a stand-in and not against Cloudflare.
- A span change while a "Read" is under way. "Read" takes the select's value when pressed; the
  answer of an earlier press is drawn when it arrives, whatever the select then says. This was so
  before the change and no test holds it.
- A second press of "Read" before the answer, and two answers out of order. Not changed here.
- Whether the bind's listener is removed when `logsPanel` runs again (a sign-in or sign-out). The
  cell passes its `invalidation`; no count of listeners was made.
- The page in two panes, or with the Logs section scrolled out of view when Health's select changes.

## Round 2, 2026-10-11

Review 1424 (19:26:08 +0200, the event's `at`) held the code, the deploy and the tests, and found two
sentences of this record untrue. Both are changed above, in place. No seed changed, nothing was built or deployed.

1. The table under "What changed" said "Seven lines added" to the test. The commit adds 14:

   ```
   git show eefc16a2 -- tools/cloud-brain/cloud-brain.ojs | awk '/^@@ -636/{f=1} f&&/^\+/' | wc -l      14
   ```

   Seven was not counted; it was written from memory of the test.
2. "On the page, in a tab" said the spec expected other cells to throw on the stand-in. The spec says
   they may and that it was not tried (lines 299 to 300 of the plan). The sentence now quotes it.

The review also ran what round 1 listed as not tried, whether the bind is ended when `logsPanel` runs
again: with the panel made again, a change under Health reached the new panel's select and not the
old one's. That is the reviewer's run, not the writer's.

`tests/tools/ds-3-record.test.ts` holds both sentences: the three numbers of the table's line against
the lines of the seed's test, and the spec's own words in the record. `bun test ./tests/tools/ds-3-record.test.ts`
before the edit: 0 pass, 2 fail. After: 2 pass, 0 fail.
