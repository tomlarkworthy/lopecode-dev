---
scope: [local-development, in-notebook]
write-triggers:
  - "tickRotate\\s*:|\\blineWidth\\s*:|Plot\\.axis(X|Y|Fx|Fy)\\("
---

# Chart labels that overlap: measure them, fix the chart cell, keep the data

Plot draws every tick label at its full width and does not move or drop labels that collide. Long
category names on a band or facet axis (`barY`'s `x`, `fx`) run into each other, and the last one can
run past the edge of the svg. Nothing errors and every cell computes. You have no screenshot, so the
only way to see the overlap, and to confirm a fix, is to measure the rendered labels.

Observed (robocoop-5, run 20260928-0847-m21 eval-base): asked to fix overlapping facet labels, the
agent renamed the four category values inside the user's data cell to short forms and added a cell
mapping them back. The write reported that `runs` had changed; the agent took that as expected. It
never measured the labels before or after.

## Measure first, and again after the fix

Run this with `eval_js` scoped to the module (cells are in scope; replace `chart` with the cell name).
It renders a copy of the chart, and returns the pairs of text elements whose boxes overlap and the labels
that fall outside the svg:

```js
const el = chart.cloneNode(true);
const host = document.body.appendChild(Object.assign(document.createElement("div"), {style: "position:fixed;left:0;top:0;width:1100px"}));
host.append(el);
const svg = [el, ...el.querySelectorAll("svg")].filter(n => n.matches("svg")).sort((a, b) => b.querySelectorAll("text").length - a.querySelectorAll("text").length)[0];
const s = svg.getBoundingClientRect();
const boxes = [...svg.querySelectorAll("text")].map(t => ({t: t.textContent, r: t.getBoundingClientRect()}));
const hit = (a, b) => a.left < b.right - 2 && b.left < a.right - 2 && a.top < b.bottom - 2 && b.top < a.bottom - 2;
const overlaps = boxes.flatMap((a, i) => boxes.slice(i + 1).filter(b => hit(a.r, b.r)).map(b => a.t + " x " + b.t));
const outside = boxes.filter(b => b.r.left < s.left - 1 || b.r.right > s.right + 1 || b.r.top < s.top - 1 || b.r.bottom > s.bottom + 1).map(b => b.t);
host.remove();
return {overlaps, outside};
```

Both lists empty means the labels are readable. `getBoundingClientRect` of rotated text is the
upright box around it, so neighbouring rotated labels can be listed as overlapping when they are not;
use unrotated fixes where you can.

## Fix it in the chart cell

The labels are the user's data. Leave the data cell as it is and change only the options of the
chart. In order of preference:

1. **Put the categories on the vertical axis** and give them room with `marginLeft`. Long names read
   left to right and do not compete for width. The corpus does this in `_19` of module
   `@mkfreeman/plot-tooltip` (lopebooks/notebooks/@tomlarkworthy_cloudevents-explorer.html): brand
   names on `y` of a `Plot.cell`, with `marginLeft: 100`. For bars, swap `barY`/`groupX`/`fx` for
   `barX`/`groupY`/`fy`, and `fy: {axis: "left"}` (a facet axis defaults to the right):
   ```js
   Plot.plot({
     marginLeft: 330,
     fy: { label: null, axis: "left" },
     y: { axis: null },
     x: { grid: true },
     marks: [Plot.barX(rows, Plot.groupY({ x: "mean" }, { fy: "group", y: "series", x: "value", fill: "series" }))]
   })
   ```
   Set `marginLeft` to about 6px per character of the longest label at the default 10px font.
2. **Wrap the labels onto several lines** with an axis mark: `Plot.axisFx({label: null, anchor: "bottom", lineWidth: 14})`
   (`lineWidth` is in ems), and raise `marginBottom` so the extra lines fit. No corpus cell does this yet.
3. **Rotate** with `tickRotate` on the scale, and raise the margin on that side by the rotated
   height of the longest label. A rotation without the margin moves the labels outside the svg, where
   they are cut off. No corpus cell does this yet.

Do not delete the axis (`axis: null`, `tickFormat: null`) or shrink the font below 9px: the labels
stop overlapping and can no longer be read.
