# fb-a2oogpkdjb

## Round 1, 2026-10-11

The owner, in a note on the Brain's page: "the successful calls dashboard is not very useful and
should be removed from the main page". The change is in `tools/cloud-brain/cloud-brain.ojs`: the
second of the three panels under Health, the strip titled "Health", is no longer drawn there.
"Calls" and "By method" are.

### Which panel the note is on

The note's anchor (the issue's body, event 2206) is in the cell `healthView`:

```
prefix "08:458:508:559:009:059:10\n      "   exact "Health"   suffix ":where(.plot-d6a7b5-ramp) {\n  di"
```

The prefix is the end of a time axis and the suffix is the style of a colour ramp. In `healthView`
as it was, the panel "Calls" (`requestsChart`, a time axis) was followed by the panel titled
"Health" (`healthStrip`), whose plot is the only one of the three with a ramp legend
(`color: { domain: [0, 1], range: ["#2e9e5b", "#e5484d"], legend: true, label: "share of calls that were faults" }`).
So the text the note is on is the title of the strip: one row a Worker, a bar a step, green to red
by the share of that Worker's calls that were faults. The reading that the owner's "successful
calls" is this strip (green where calls did not fail) is the writer's; the whole section was not
taken off, and the heading "## Health" with its two controls stays. `philosophy.md` line 2 (the
smaller side, easier to undo) decided it.

### What changed

One commit of the seed, `759325a8` (2026-10-11 21:50:18 +0200).

- `healthPanels = (data, { width, link })` is a new cell: the list of panels under Health, "Calls"
  then "By method". `healthView` draws `dashboard(healthPanels(calls, …), { note: callsNote(calls) })`.
  Before, the list was a literal inside `healthView`, which no test could read: the cell answers the
  visitor's line whenever `calls` is null.
- The entry `{ title: "Health", body: healthStrip(…) }` is not in that list.
- `healthStrip` is kept. `panelBody` draws it for a dashboard's panel with `draw: "faults"`, and the
  built-in dashboard `health` of `brain-dashboard.ojs` has such a panel, so the strip can still be
  read under Dashboards. That was not looked at on cb4 in this round.
- Three comments that said "the three charts of Health" now name the dashboard `health`.
- A new test, `test_health_draws_calls_and_methods_and_no_strip_of_faults`.

### The test failed before the change

The cell and the test were written first with the strip still in the list, built, and the module's
tests run in a QA tab (headless Chromium, the snippet of the implementer's brief, step 8):

```
[28, ["test_health_draws_calls_and_methods_and_no_strip_of_faults expect(received).toEqual(expected) …
  Array [ "Calls", true ],
+ Array [ "Health", true ],
  Array [ "By method", true ] …"]]
```

With the entry removed, a new build, a new tab: `[28, []]`.

### Counts

Each from a run after the last edit of the seed.

| command | result |
|---|---|
| `cd cloud-brain-dev && bun test.ts brain-x-page --with …/.emitted/fb-a2oogpkdjb.js` (in the worktree) | `passed` 12, `failed` 0, `needsBrowser` 16. The new test is one of the 16: `healthPanels` draws with Plot, which reads `document`. |
| the snippet of step 8 in a QA tab on the worktree's build | `[28, []]` |
| `BRAIN_BASE=cb4 bun tools/cloud-brain/verify-run.ts brain-x-page --shell …/.emitted/cloud-brain.html --times 20` (19:48:25Z to 19:48:48Z) | `runs` 20, `passed` 20, `failed` 0, `none` 0, `byChance` `[]`, `from` `["document"]`, `mains` `["@tomlarkworthy/brain-shell","@tomlarkworthy/cloud-brain"]`, `tests` 28 in the first and the last two runs printed |

### Seen drawn

In that QA tab, with no session, the page had the line "Sign in as the owner to see the calls of
the last hour." and no panel. Then, from `eval_code` and in the tab only, `calls` was stood in with
three rows (`mod.redefine("calls", { since, until, step: 60000, groups: 2, series: [3 rows] })`), and
3 s later the element that holds the note was read:

```
titles ["Calls","By method"]   note "The last hour, from the core's log lines: 4 calls in 2 groups, one bar each 1 minute."
"share of calls that were faults" in its text: false   rows of the table: 2   .observablehq--error on the page: 0
```

That tab was closed and the emit was made in another, so the stood-in `calls` is in no record.

### Not tried, not changed

- The page on cb4 with the owner's session: the loop has none. What cb4 serves after the deploy
  was read as source (see the issue's comment), not looked at drawn.
- A resize, a change of the span and "Refresh" with the two panels: `healthView` names the same
  inputs but for `requestsChart`, `healthStrip` and `methodTable`, which `healthPanels` now names; no run was made of them.
- `brain-dashboard.ojs` lines 212 and 778 say the built-in dashboard `health` is "the three panels
  the page draws today". The page draws two of them under Health now. Not changed: it is another
  Worker's source, and a change of it is a deploy of `brain-x-dashboard`.
- Whether the owner wants the panel `faults` out of the dashboard `health` too. It is a row or the
  built-in default of `brain-x-dashboard`, not of the page; his note names the main page.
- `cloud-brain-docs.ojs`, "Calls and faults", says "The line above the charts": there is one chart
  and one table under it now. Not changed: that module is in the shell, and posting the shell is the owner's.
- `spec-as-built.md` line 489 names the panels "Calls, Health, By method" as of its date. Not changed.
