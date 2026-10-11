# Health: a span and a Refresh (`ds-2-span-and-refresh-controls`)

Task 2 of `plan/cloud-brain-dashboards-share-series-and-controls.md`, after
`ds-1-split-healthview`. Built 2026-10-11 by a writer of the issue loop, round 1. The seed commit's
author time is 18:04:57 +0200 (`git log --format=%ci`).

## What changed

`tools/cloud-brain/cloud-brain.ojs`, under "## Health". Six new cells, two changed, one test.

| cell | what it is |
|---|---|
| `spanOptions` (new) | The `Map` of the five spans, in minutes: 15 minutes, 1 hour, 6 hours, 24 hours, 7 days. The same five `logsView` has in a literal of its own; task 3 joins them. |
| `viewof span` (new) | `Inputs.select(spanOptions, { label: "Last", value: 60 })`. A cell before `healthView`, so it is above the panels. |
| `viewof asked` (new) | `Inputs.button("Refresh")`, the next cell. |
| `timeRange` (changed) | Names `asked`, then `rangeOf(span, Date.now())`. Still the one read of the clock. |
| `rangeOf` (new) | `(minutes, now) => ({ since, until })`. Split out so a test gives the clock. |
| `spanName` (new) | Minutes in words: the select's name with a leading "1 " dropped ("hour"), or "N minutes" for a span the select does not have. |
| `callsNote` (new) | The line under the panels, a string, from the answer alone. |
| `healthView` (changed) | The visitor's line names the chosen span; the note is `callsNote(calls)`. |

The note reads the span from the answer (`until - since`), not from the control, so it describes
the rows that are drawn. Its text, from the tab below:

```
The last 6 hours, from the core's log lines: 7 calls in 1 groups, one bar each 1 minute.
```

and, when `groups` is not below `callsQuery(...).parameters.limit` (500), it ends
"500 groups is the limit of one answer: some calls may be missing." A failed query reads
"logs.query failed: …" as before.

Both controls are cells of the page and show to a visitor too. A visitor who changes the span
changes the line he reads and sends nothing (`calls` stays `null`; below).

`tools/cloud-brain/cloud-brain-docs.ojs`, "## Calls and faults": "counts the last hour of them"
now names the five spans, the two things that ask again, and the line about 500 groups.

Not changed: `callsQuery`, `callsSeries`, `callsRead`, `calls`, the drawing functions, the two
existing tests of Health, `logsView`.

The compiled inputs, `grep` on the module read out of the build with `lope-reader.ts --get-module @tomlarkworthy/cloud-brain`:

```
$def("_cloudbrain_viewof_span", "viewof span", ["Inputs","spanOptions"], …)
$def("_cloudbrain_viewof_asked", "viewof asked", ["Inputs"], …)
$def("_cloudbrain_healthView", "healthView", ["calls","htl","spanName","span","dashboard","requestsChart","width","healthStrip","methodTable","moduleLink","brainModules","services","callsNote"], …)
$def("_cloudbrain_timeRange", "timeRange", ["asked","rangeOf","span"], …)
$def("_cloudbrain_calls", "calls", ["assembled","callsRead","session","client","timeRange"], …)
```

`calls` is as task 1 left it: no `width`, `services` or `brainModules`.

## The counts in a tab

A QA tab (headless Chromium, 1280 by 800) on the worktree's build,
`#view=C100(S70(@tomlarkworthy/cloud-brain),S30(@tomlarkworthy/claude-code-pairing))`, `r=8201`.

**With no session.** 0 `.observablehq--error` between the `h2` "Health" and the `h2` "Operator".
One select there with the options `15 minutes|1 hour|6 hours|24 hours|7 days`, "1 hour" chosen,
and one button "Refresh". The line read "Sign in as the owner to see the calls of the last hour."
After the select was set to 10080 from `eval_code` (`.value =`, then an `input` event) it read
"… of the last 7 days.", with `calls` still `null`; set back to 60, "… of the last hour."

**Stood in**, as the record of task 1 has it (`mod.redefine` of `session` and `client`, in the tab
only). The client here answers one row placed two minutes before the `timeframe.to` it is asked
for, with `n` the number of calls the stand-in had seen, so each answer's note differs. The count
is the `logs.query` with `view: "calculations"`.

```
after the stand-in, read at 8 s and at 14 s          1   1    note: The last hour, … one bar each 1 minute.
select set to 360, read at 3 s                       2        timeframe of the query: 360 minutes; note: The last 6 hours, …
"Refresh" clicked, read at 3 s                       3        note: The last 6 hours, … (a new count of calls)
qa_viewport 1000x800, read at 5 s                    3        width 952
```

So a change of "Last" adds 1, a press of "Refresh" adds 1, a resize adds 0, each once of once.

**A second press before the answer.** The stand-in was made to hold its answers. "Refresh" was
clicked twice, 0.8 s apart:

```
after both clicks      sent +1, 1 held      note unchanged
first answer let go    sent +1 (2 in all), 1 held; its timeframe.to is the time of the second click      note unchanged
second answer let go   sent +0              note is of the second answer
```

Two presses sent two queries, one at a time: the second is sent when the first has answered, for
the range of the last press, and the first answer is not drawn. Two answers were never out at
once, so they cannot arrive out of order. Why the runtime holds the second until the first
settles was not looked into; `timeRange` had its new value (`until` of the second click) while
the first query was still held.

## Tests

One cell added, `test_the_note_names_the_span_and_says_when_the_answer_is_at_the_limit`: the five
entries of `spanOptions`; `spanName` of each and of 90; `callsNote` word for word for 2, 499 and
500 groups (the limit line at 500 only, and the limit read from `callsQuery`), for a step of an
hour and of 90 s, and for an error; `rangeOf(360, now)`. It reads no `document`, no clock, no
control. Before the change, with the test alone added to the seed, it failed in the second command below
(`passed` 7, `failed` 1, `needsBrowser` 10).

| command | result |
|---|---|
| `cd $W/cloud-brain-dev && bun test.ts brain-x-page` (what cb4 ran, hash `6edb3a422a9d…`) | `passed` 7, `failed` 0, `needsBrowser` 10 |
| `… bun test.ts brain-x-page --with $W/tools/cloud-brain/.emitted/ds-2.js` | `passed` 8, `failed` 0, `needsBrowser` 10. The new test is among the 8. |
| the snippet of the brief's step 8 in a QA tab on `$W/tools/cloud-brain/.emitted/cloud-brain.html`, two fresh loads (`r=8201`, `r=8202`, the second at 16:05:35 UTC) | `[18,[]]` twice. 18 is 8 + 10. |
| `BRAIN_BASE=cb4 bun tools/cloud-brain/verify-run.ts brain-x-page --shell $W/tools/cloud-brain/.emitted/cloud-brain.html --times 20`, from the main checkout, ended 16:09:43 UTC | `runs` 20, `passed` 20, `failed` 0, `none` 0, `byChance` `[]`. Runs 19 and 20 read `"tests":18` and `"@tomlarkworthy/cloud-brain":18`: the build's module ran, not the deployed one (17). The other 18 lines were cut from what was kept and not read. |

`worktree.sh --rebase` after those runs brought in `.claude/skills/brain-maintenance/SKILL.md` and
`agents/implementer.md` and no seed, so they were not run again.

## Not tried

- **Anything on cb4 as the owner.** `logs.query` answers the owner's own session. No real answer
  was drawn for any span. For 24 hours and 7 days the step Cloudflare chooses, the number of
  groups and how long the query takes are not known; the note reports the first two when the
  owner picks one.
- **That `groups` reaches 500 when Cloudflare cuts an answer.** It is the length of the count's
  `aggregates`, a reading of `callsSeries` (the spec says the same). If Cloudflare answers fewer
  aggregates than the limit when it cuts, the line never shows.
- **A query that is refused, in a tab.** `callsRead` answers the error (task 1's test) and
  `callsNote` gives "logs.query failed: …" (this test); the two were not seen together on the page.
- **More than two presses before an answer**, and a change of span while a query is held.
- **Another caller's event on a row while its box has the caret**: Health has no row that is
  written and no text box.
- **The docs line on cb4.** `cloud-brain-docs` is a module of the shell, which reaches cb4 by
  `brain.ts shell`, the owner's. Until then cb4's docs say "counts the last hour".
- **The step's wording for a step that is not whole seconds.** `callsNote` would print a fraction.
