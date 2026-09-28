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
