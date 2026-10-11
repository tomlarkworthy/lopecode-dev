# A panel says when Cloudflare answered from a sample (`dashboard-panel-does-not-say-sampled`)

Filed by the reviewer of `dsv-5-page-section` on 2026-10-11: `metric.query` answers `sampled`
(`records/metric-query-sampled-unsaid.md`), and the cells that draw a panel read `groups` and
`cost.cached` of an answer and not `sampled`. So a panel over a span Cloudflare answered from a sample
was drawn as a whole count.

A quick win of the writer of `fb-a2g3jyhecp`, who was moving `panelBody` to `brain-dashboard.ojs`.
One commit, `64db274b`, 2026-10-11 22:18:49 +0200 (`git log --format='%h %ci'`), on `4c4849d6`.

## What changed

`tools/cloud-brain/brain-dashboard.ojs`, `panelBody`: an answer whose `sampled` is above 1 gets a
line under the panel's body, after the line of the 500 groups when both hold:

```
Cloudflare answered this from a sample of the lines (sampled 10): each number is its estimate, and a group with few lines may be missing.
```

An answer with no row and `sampled` above 1 reads `No lines in this span.` followed by that sentence
in the one line: the reference says of a sample that "a group with few lines can be left out whole"
(`brain-dashboard.ojs`, A query), so no line is not no lines. The number shown is the answer's
`sampled` as it came.

Not changed: `dashboardNote`, the line above the panels. The issue named either place. Under the
panel is where the limit of groups is said, and two panels of one dashboard can have answers of
which one is sampled.

## Tests

`test_bars_and_a_table_draw_any_metric_and_a_panel_says_what_it_cannot_draw` has six more
`expect` calls (`git diff 4c4849d6 64db274b -- tools/cloud-brain/brain-dashboard.ojs | grep -c '^+  expect('`): `sampled` of 1, undefined, null and 0 say nothing; 10 says the sentence under a table
and under bars, whose marks are still drawn; an empty answer with 10 reads the two sentences; 500
groups and `sampled` 2 give two lines, the limit first.

| command | result |
|---|---|
| the build with the test as changed and `panelBody` as `4c4849d6` has it: `cd $W && bun tools/cloud-brain/tab-tests.ts tools/cloud-brain/.emitted/nofix.html @tomlarkworthy/brain-dashboard` | `tests` 15, `passed` 14, `failed` that test: `expect(string).toContain(value)`, expected the sentence, received the table's text |
| the same on a build with the seed as `64db274b` has it, at 20:16 UTC | `tests` 15, `passed` 15, `failed` `[]` |
| `cd $W/cloud-brain-dev && bun test.ts brain-x-dashboard --with $W/tools/cloud-brain/.emitted/fb-dash.js` | `passed` 13, `failed` 0, `needsBrowser` 2. The changed test is one of the 2: it makes a chart and a table. |
| `cd <root> && BRAIN_BASE=cb4 bun tools/cloud-brain/verify-run.ts brain-x-dashboard --shell $W/tools/cloud-brain/.emitted/cloud-brain.html --times 20`, ended 20:17:34 UTC | `runs` 20, `passed` 20, `failed` 0, `none` 0, `byChance` `[]`, `from` `["document"]`; `"tests":15` in each of the 20 lines |

The first row was run before the first rebase, on a build that was then removed; the others on the
build of 20:16 UTC, after the last rebase that changed a seed.

In a local headless Chrome, with `session` and `client` stood in (`records/fb-a2g3jyhecp.md`, "Seen
in a tab"; the stand-in answers `deploys.put-back` with `sampled: 10` and every other metric with 1):
the dashboard `deploys` drew two panels and one such line, "sampled 10", in both layouts; `health`
drew three panels and none.

## Not tried

- **A sampled answer from Cloudflare in a panel.** No call was made to cb4's `metric.query` for
  this; `records/metric-query-sampled-unsaid.md` has which spans it sampled.
- **The owner's tab on cb4.**
- **`sampled` as text** (`"10"`), or a number between 0 and 1. The test gives `panelBody` 0, 1, 2 and 10,
  undefined and null.
- **The three draws of `health`** (`calls`, `faults`, `methods`) with a sampled answer: the line is
  added after the body whatever the draw, and the test holds it for `bars` and `table`.
