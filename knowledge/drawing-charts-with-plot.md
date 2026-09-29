---
scope: [local-development, in-notebook]
write-triggers:
  - "Plot\\.(barX|barY|cell|groupX|groupY)\\("
---

# Drawing charts with Plot: categories in the order they were given

Plot sorts the categories of a band or point axis (`barY`'s `x`, `barX`'s `y`, `cell`, `groupX`)
in ascending order: alphabetically for strings. It does not keep the order of the data. Months come out
`Apr, Feb, Jan, Mar`, weekdays `Fri, Mon, Sat, …`, and answers on a scale `Agree, Disagree, Neutral`.
Every cell computes and the chart draws. The only fault is the order of the bars.

Observed (robocoop-5, run 20260928-0847-w12-before): given four months in calendar order, the agent
wrote `Plot.barY(data, {x: "month", y: "sales"})` with no `domain`. The chart and its downloaded PNG
both showed Apr, Feb, Jan, Mar. The write reported "all 4 cells compute with no runtime error", and
the agent told the user the chart was done.

Set the axis `domain` to the categories in the order to show. When the rows are already in that
order, take the domain from them:

```js
const _answers = function answers(){return( [
  {answer: "Disagree", count: 12},
  {answer: "Neutral", count: 30},
  {answer: "Agree", count: 41}
] )};
const _chart = function chart(Plot, answers){return(
  Plot.plot({
    x: {domain: answers.map(d => d.answer)},
    marks: [Plot.barY(answers, {x: "answer", y: "count"}), Plot.ruleY([0])]
  })
)};
```

A fixed list works as well. The corpus does this in `_barX` of module `d/d2dffac0e42406e8`
(lopebooks/notebooks/@tomlarkworthy_cloudevents-explorer.html):
`y: { domain: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] }`.

Leave out `domain` only when ascending order is what the user wants (years as strings, names).
To order bars by value instead, use the mark's `sort` option: `Plot.barY(rows, {x: "name", y: "count", sort: {x: "-y"}})`.

## A `stroke` or `fill` string that is not a colour is a field name

Plot reads a constant `stroke` or `fill` string as a colour only when it parses as a CSS colour.
Any other string is taken as the name of a field in the data. When no row has that field, the mark
draws nothing and no error is raised. `Plot.line(pts, {stroke: "Alder"})` draws no line, although
a legend built from the same names lists "Alder".

Observed (run 20260929-0620-m57, eval-fixed): the agent drew five pump curves with
`Plot.line(pts, {x: "q", y: "h", stroke: name})`, with `name` one of "Alder", "Birch", …. The write
result said "✓ all cells compute", and the eval's plot check found 0 of 5 curves. The same module
with `stroke: d => d.pump` drew all five.

Measured 2026-09-29, Plot 0.6.17 in Playwright Chromium 151, one four-point `Plot.line`
(`tools/scratch/rc5-sessions/s87-plot-stroke-string.mjs`):

```
stroke "Alder"           paths 0   no console error
stroke "steelblue"       paths 1   <g stroke="steelblue">
stroke "#1f77b4"         paths 1   <g stroke="#1f77b4">
stroke d => "Alder"      paths 1   <path stroke="#4269d0">   (ordinal colour scale)
```

To colour one series per name, put the name in the rows and name that field, which also gives a
legend that matches the lines:

```js
Plot.line(rows, {x: "q", y: "h", stroke: "pump"})   // rows: {pump: "Alder", q, h}
```

To give a series a fixed colour, pass a CSS colour. To label it, use a `Plot.text` mark or the
colour scale's `domain`/`range`, not the `stroke` string. This is not gated by a write-trigger:
`stroke: <field>` is the ordinary form (24 corpus files use `Plot.line(…, {stroke: <field>})`,
count from m57's proposal, not re-measured).
