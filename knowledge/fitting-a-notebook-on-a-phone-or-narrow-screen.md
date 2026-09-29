---
scope: [local-development, in-notebook]
write-triggers:
  - "@media ?\\((max|min)-width"
---

# A notebook that breaks on a phone or narrow screen: fix the user's cells, not the page layout

When a user says their notebook "looks broken on my phone", the cause is almost always in their own
module: a cell with a hard-coded pixel width. A fixed `grid-template-columns: 420px 420px`, a
`min-width: 420px`, an `<svg width="900">` or `Plot.plot({width: 900})` stays that wide at 375px, and
the page scrolls sideways with part of the content off-screen.

The notebook's layout engine, `@tomlarkworthy/lopepage-2`, and every other `@tomlarkworthy/*` module
(the chat, the file tools, the wiki) are shared by every notebook. Do not edit them to fix one user's
notebook. The user's module is the one under `/src/@user/…`, or the module open in a pane that is not
tooling.

Observed (robocoop-5, run 20260928-0847-m15 eval-base): asked to fix a notebook whose `dashboard`
cell used `grid-template-columns: 420px 420px`, the agent edited `lopepage-2` instead: a class on its
split containers and an `@media(max-width:768px)` rule that stacks the panes. The user's cell was not
changed, the dashboard stayed 854px wide, and the agent told the user the mobile layout was fixed. Its
check was that the new class name existed on a split.

## Find the fixed widths

```
grep  pattern "[0-9]{3,}px|width: ?[0-9]{3,}|min-width|grid-template-columns"  path /src/@user/<name>.js
```

## Make each one follow the available width

`width` is a reactive builtin: the width of the pane the module renders in, in pixels. A cell that
lists it recomputes when the pane or the window is resized. On a phone it is about 360. Add
`"width"` to the cell's `$def` inputs as well as to its function's parameters; with only the
parameter, `width` is `undefined` and `Math.min(width, 420)` is `NaN` (seen twice in run
20260928-0847-m15 eval-fixed).

- A chart or SVG: size it from `width`, capped at its designed size. From
  `@tomlarkworthy/switch-dataflow._2` (lopebooks/notebooks/@tomlarkworthy_switch-dataflow.html):
  ```js
  htl.html`<svg width="${Math.min(width, 640)}px" viewBox="0 0 1184 750" …>`
  ```
  `Plot.plot` sets `max-width: 100%` on its SVG, so a Plot chart shrinks inside a narrow container
  by itself; it overflows only when its container is fixed wider than the screen. Pass
  `width: Math.min(width, 420)` when the text in it must stay legible.
- A row or grid of panels: let the columns wrap. From `@tomlarkworthy/suminagashi.params`
  (lopebooks/notebooks/@tomlarkworthy_suminagashi.html):
  ```js
  html`<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(330px, 1fr)); gap: 0 1.5em">`
  ```
  Write the minimum as `minmax(min(100%, 330px), 1fr)` so a single column still fits a screen
  narrower than 330px, and give grid and flex children `min-width: 0`: the default `min-width: auto`
  keeps a child at its content's width. For a flex row, `flex-wrap: wrap`.
  A main column beside a fixed sidebar is `minmax(0, 1fr) 280px`; the `.lg-skelrow` rule in
  `@tomlarkworthy/ledger.ledgerStyle` (lopecode/notebooks/ledger.html) uses `minmax(0,1fr) 110px 70px`.
  Do not build pixel columns from `width`: in `${width < 640 ? "1fr" : Math.min(width, 900) + "px 280px"}`
  each column is capped separately, so from 640px up to 900 + 24 + 280 = 1204px (24px gap) the row is
  wider than the pane and the sidebar is off the right edge (run 20260929-0620-m73 eval-base).
- A wide table: wrap it in `<div style="overflow-x: auto">`. This is for tables only. A chart in
  a sideways scroller, or behind `overflow: hidden`, hides its marks off the edge.

Keep the desktop layout: the same cells should still show side by side on a wide screen.

## Check it at 375px before reporting

The apply report ("all cells compute") says nothing about layout. Measure the cell's element in a
box as wide as a phone's content area, with `eval_js` scoped to the user's module:

```js
const box = document.createElement("div");
box.style.cssText = "position:absolute;left:0;top:0;width:359px;visibility:hidden";
document.body.append(box);
box.append(dashboard.cloneNode(true));
const over = [...box.querySelectorAll("*")].filter(e => e.getBoundingClientRect().right > box.getBoundingClientRect().right + 1)
  .map(e => e.tagName + " " + Math.round(e.getBoundingClientRect().width));
const result = { scrollWidth: box.scrollWidth, overflowing: over.slice(0, 5) };
box.remove();
return result;
```

`scrollWidth` above 359 means the cell still overflows on a phone. Replace `dashboard` with each cell
that renders UI. The clone is laid out by CSS only: a cell sized from `width` is measured at the
current pane width, so check those by reading the code (`Math.min(width, …)`).
