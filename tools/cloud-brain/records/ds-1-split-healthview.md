# Health: the query is a cell of its own (`ds-1-split-healthview`)

Task 1 of `plan/cloud-brain-dashboards-share-series-and-controls.md`. Built 2026-10-11 by a writer
of the issue loop, round 1. The page shows what it showed; what changed is which cell asks.

## Measured before the change

A QA tab (headless Chromium, 1280 by 800) on the notebook built from `main` at `e3b6a308` with no
edit, `#view=C100(S70(@tomlarkworthy/cloud-brain),S30(@tomlarkworthy/claude-code-pairing))`. No session.

**Errors under Health with no session: 0.** Counted as `.observablehq--error` elements that follow
the `h2` "Health" and precede the `h2` "Operator" in the document. The one `<i>` there read "Sign
in as the owner to see the calls of the last hour." (The whole page had 0 such elements then, and
5 after the stand-in below; none under Health either time.)

**`logs.query` for one resize: 1.** `session` and `client` were stood in from `eval_code`, in the
tab only, as the spec says:

```js
mod.redefine("session", { signedIn: true, owner: true });
mod.redefine("client", { procedure: async (name, body) => (window.seen.push([name, body]), fixture), query: async () => ({ services: [] }) });
// the count: window.seen.filter(([n, b]) => n === "logs.query" && b && b.view === "calculations").length
```

`fixture` is the answer built in `test_calls_from_the_logs_become_chart_rows`. `mod` is the module
of that test cell.

```
after the stand-in, read at 8 s and again at 14 s   3   3     width 960
qa_viewport 1000x800, read at 5 s and 8 s           4   4     width 952
qa_viewport 800x800,  read at 5 s and 8 s           5   5     width 752   (14:32:52 UTC)
```

So one resize sent one `logs.query`, twice of twice, and the stand-in alone sent 3 before any
resize. Which inputs made the second and third of those 3 was not looked into; `services` and
`brainModules` are inputs of the old cell and both settle after `client` changes.

## What changed

`tools/cloud-brain/cloud-brain.ojs`, under "## Health". Four cells where there was one, and one test.

| cell | what it is |
|---|---|
| `timeRange` | `{ since, until }`: the hour before the cell ran. One read of `Date.now()`, as the old cell made. It runs once when the page loads, so the hour does not move until a reload (review 931 note 3; task 2 adds the control that asks again). |
| `callsRead` | `async ({ client, range })`. No client: `null`, nothing sent. Else one `logs.query` of `callsQuery(range)` through `callsSeries`; a failure answers `{ ...range, step: 60000, series: [], error }`, the shape the old cell made. |
| `calls` | `callsRead({ client: session.owner ? client : null, range: timeRange })`, after `assembled`. `null` for a visitor. |
| `healthView` | `calls` null: the visitor's line, unchanged. Else the three panels and the note, drawn from `calls`. |

The compiled inputs, from `bun tools/lope-reader.ts tools/cloud-brain/.emitted/cloud-brain.html --get-module @tomlarkworthy/cloud-brain`
on the build of the committed seed (lines 1318 to 1321):

```
$def("_cloudbrain_healthView", "healthView", ["calls","htl","dashboard","requestsChart","width","healthStrip","methodTable","moduleLink","brainModules","services","d3"], …)
$def("_cloudbrain_timeRange", "timeRange", [], …)
$def("_cloudbrain_callsRead", "callsRead", ["callsQuery","callsSeries"], …)
$def("_cloudbrain_calls", "calls", ["assembled","callsRead","session","client","timeRange"], …)
```

`calls` names none of `width`, `services`, `brainModules` (R2's source check). `healthView` still
names all three: it draws again on a resize, from the value it has.

Not changed: `callsQuery`, `callsSeries`, `rollup`, the drawing functions,
`test_calls_from_the_logs_become_chart_rows`, the text of the note and of the visitor's line, and
`cloud-brain-docs.ojs` (task 2's).

**Why `calls` waits for `assembled`** is still not known. The old cell did, the spec says keep it
and not guess, and it is kept.

## Measured after the change

The same tab procedure on the build of the changed seed.

```
after the stand-in, read at 8 s and again at 14 s   1   1     width 960
qa_viewport 1000x800, read at 6 s                   1         width 952, the two charts 912 wide
qa_viewport 800x800,  read at 6 s                   1         width 752, the two charts 712 wide   (14:34:29 UTC)
```

One resize sends 0, twice of twice, and the charts were drawn again at the new width each time
(`width - 40`). The stand-in alone now sends 1 where it sent 3. `calls` in that tab had the keys
`since, until, step, series, groups` and 3 rows (R3: another cell can read it).

Errors under Health with no session, same count as before the change, in the three tabs of the
tests below: 0 each time, with the visitor's line showing and `calls` null.

## Tests

One cell added: `test_calls_are_read_once_for_a_range_and_not_without_a_client`. A counting
stand-in gets 1 `logs.query` whose body is `callsQuery(range)` with the range as `timeframe` and
`view: "calculations"`; `client: null` sends 0 and answers `null`; a stand-in that throws answers
the range, no rows and the error. It reads no `document`, no clock and no cell of the page but
`callsRead` and `callsQuery`.

Counts, each from the command beside it. `main` moved twice while this was built, so each was run
three times: on the first build, after `worktree.sh --rebase` at 16:38 CEST, and after the rebase
under the landing lock at 16:44 CEST, which brought in `brain-deployer.ojs` (a seed this module
imports `deployer_service` from; the lock was released for it). The last run of each is the count.
The emitted record's hash was `6edb3a422a9d…` at the second and the third build: the deployer's
change did not move this Worker.

| command | result, last run |
|---|---|
| `cd $W/cloud-brain-dev && bun test.ts brain-x-page` (what cb4 ran, hash `e45568e2faf0…`) | `passed` 6, `failed` 0, `needsBrowser` 10 |
| `… bun test.ts brain-x-page --with $W/tools/cloud-brain/.emitted/ds-1-split-healthview.js` | `passed` 7, `failed` 0, `needsBrowser` 10, three times of three. The new test is among the 7. |
| the snippet of step 8 in a QA tab on `$W/tools/cloud-brain/.emitted/cloud-brain.html`, three fresh loads (`r=7102`, `7104`, `7105`), the last at 14:44:37 UTC | `[17,[]]` three times. 17 is 7 + 10. |
| `BRAIN_BASE=cb4 bun tools/cloud-brain/verify-run.ts brain-x-page --shell $W/tools/cloud-brain/.emitted/cloud-brain.html --times 20`, from the main checkout, three times (ended 14:38:12, 14:43:15 and 14:48:59 UTC) | `runs` 20, `passed` 20, `failed` 0, `none` 0, `byChance` `[]`, each time |

Of `verify-run --shell` on a build not yet deployed: the feedback ticket
`seen-verify-run-shell-own-module` reports 0 of 20 for a changed `brain-issues`. Here each run's
line of the first 20 read `"tests":17` and `"@tomlarkworthy/cloud-brain":17`, and the deployed module has 16 tests,
so the build's own module, with the new test, is what ran. The page Worker's module is the
document's main module; whether that is why the two cases differ was not looked into.

## Not tried

- The page on cb4 as the owner. `logs.query` answers the owner's own session only, so no agent of
  the loop saw a real answer drawn by the new cells. The counts above are with a stand-in client.
- Whether the other cells of the page that read `client` throw on the stand-in. The page had 5
  `.observablehq--error` elements after it, before and after the change, none under Health. Which
  cells they were was not read.
- A change of `brainJoined` or of the session after load, which runs `assembled` and so `calls`
  again. By the inputs it asks again once; not counted in a tab.
- The clock at the edge: a page left open shows the hour before it loaded. That is the old
  behaviour for a page that is not resized, and new for one that is (the old cell read the clock
  on each resize). Task 2's "Refresh" is the way to ask again.
