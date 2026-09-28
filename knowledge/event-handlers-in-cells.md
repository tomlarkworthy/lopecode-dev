---
scope: [local-development, in-notebook]
write-triggers:
  - "(^|[^.\\w$])html`[^`]*\\bon[a-z]+=\\$\\{"
  - "\\bon(click|input|change|submit)=\\$\\{"
  - "addEventListener\\(\\s*[\"'](click|input|change|submit)[\"']"
  - "<button\\b"
  - "Inputs\\.button\\("
  - "Inputs\\.number\\(\\s*\\{[^}]*\\b(min|max)\\s*:"
---

# Event handlers and buttons in cells: htl.html, not html; a button that acts on another cell's input; a download button; two inputs that update each other; limiting a number box to a range

A cell that builds a clickable element and passes it a function (`onclick=${() => …}`) must build it
with `htl.html`. The bare `html` built-in in a Lopecode notebook is the legacy stdlib template: it
converts every interpolated value to a string, so the handler never becomes a listener.

## What `html` does with a function

Observed (robocoop-5, pomodoro prompt, 2026-09-27): the agent wrote

```js
const _toggleBtn = function toggleBtn(ru, mru, html){
  return html`<button onclick=${() => { mru.value = !mru.value; }}>${ru ? '⏸ Pause' : '▶ Start'}</button>`;
};
```

The arrow was stringified into the attribute; the `>` of `=>` ended the tag. The live button had
attributes `onclick="()"` and `==""`, `typeof button.onclick` was `"object"` (null), and its text was
`{ mru.value = !mru.value; }> ▶ Start`. Clicking it did nothing. The write still reported "all 18
cells compute with no runtime error".

## The form the corpus uses

`htl.html` binds a function-valued `on…` attribute as an event listener. `@tomlarkworthy/gallery`
`card` (lopebooks/notebooks/@tomlarkworthy_gallery.html) writes a mutable from a button this way:

```js
htl.html`<button class="card-star" onclick=${(e) => {
  e.stopPropagation();
  const current = new Map($edits.value);
  …
  $edits.value = current;
}}>${featured ? "★" : "☆"}</button>`
```

`$edits` is that cell's name for its `"mutable edits"` input. The same shape in a module file, for a
start/pause toggle:

```js
const _toggle = function toggle(htl, running, $running){return(
  htl.html`<button onclick=${() => { $running.value = !running; }}>${running ? "Pause" : "Start"}</button>`
)};
// in define():
$def("_toggle", "toggle", ["htl", "running", "mutable running"], _toggle);
```

`htl` is a built-in: list it as an input, as with `md` or `Inputs`. `@tomlarkworthy/lopecode-tour`
`ui_prose` (lopecode/notebooks/@tomlarkworthy_lopecode-tour.html) has a smaller example:
`htl.html\`<button onclick=${(e) => {e.target.innerHTML = "thanks"; e.stopPropagation()}}>click me!</button>\``.

On 2026-09-27 an `on…=${…}` handler appeared inside `htl.html` in 247 notebook files (modules
including `view`, `mermaid-lens`, `svg-lens`, `viewroutine`, `gallery`, `spreadsheet`,
`lopecode-tour`). The bare-`html` form appeared in 16 files across 10 modules (`@endpointservices/login`,
`animation`, `rate-estimation` and others), all written on observablehq.com, where `html` is htl. In
Lopecode those handlers render as text too.

## A button that acts on another cell's input

The action runs once per click and reads the other input's value at click time. The cell holding the
button lists the input's `viewof` and reads `.value` inside the click function.
`@tomlarkworthy/editor-5` `up` (in 224 notebook files, e.g. lopebooks/notebooks/@tomlarkworthy_robocoop-5.html)
reads `viewof editedCell` this way:

```js
const _14rfku9 = function _up(Inputs,moveCell,$0){return(
Inputs.button("⬆", {
  reduce: () => moveCell($0.value, -1)
})
)};
// in define():
$def("_14rfku9", "viewof up", ["Inputs","moveCell","viewof editedCell"], _14rfku9);
```

The same `$0.value` read works inside an `htl.html` `onclick=${…}` function. When other cells show the
result, `reduce` can return it (or a promise of it): the button's value cell then changes once per
click, and cells that list it recompute once per click.

Four forms that compile, report "all cells compute with no runtime error", and do not work. All four
were written by robocoop-5 for "a text box and a button that summarises it" (20260928-0300-w19):

- **The action cell lists the text's value cell** (`"inputText"`). It re-runs on every keystroke, so
  the request is sent while the user types, and the button does nothing the text had not already done.
- **A cell body that waits for a click** (`await new Promise(r => btn.addEventListener('click', r, {once: true}))`
  in a `while (true)` loop). The cell's value never settles. In a replay of that module, text was typed,
  the button clicked, and no request was sent.
- **Finding the input through the DOM** (`btn.closest('.observablehq').querySelector('textarea')`,
  `document.querySelector(…)`). Each cell renders into its own element, so the search from the
  button's cell finds nothing; the handler read `''` and every click showed "Please paste some text first".
- **Adding a listener to another cell's element from a cell that re-runs** (`summarizeButton.addEventListener('click', …)`
  in a cell that also lists `model`). Each run adds one more listener and none is removed, so after the
  model changed one click sent two requests, one with the old model.

- **A click count that gates an action cell** (`viewof save = Inputs.button("Save")`, then a cell that
  lists `save` and the form's value cells, `save > 0 && (() => { …; a.click(); })()`). After the
  first click the count stays above 0, so the cell runs again whenever any listed value changes.
  Observed (robocoop-5, a form with a download button, 20260928-0847-w10): after one click, editing
  one text field twice offered two more downloads with no click.

`Inputs.button` is the other working form when the button only needs to count clicks or emit a
value; it is a `viewof` and follows the viewof page (`writing-cells-in-module-source.md`).

## A button that downloads a file

The cell's value is the button. The file is built and saved inside its click handler, so nothing is
saved until it is clicked. The cell may list the values the file is made from; when they change the
cell returns a new button and saves nothing. `@tomlarkworthy/suminagashi` `_download`
(lopebooks/notebooks/@tomlarkworthy_suminagashi.html) saves a PNG this way. The same shape for a CSV:

```js
const _saveCsv = function saveCsv(htl, d3, rows){return(
  htl.html`<button onclick=${() => {
    const blob = new Blob([d3.csvFormat(rows)], {type: "text/csv"});
    const link = htl.html`<a download="rows.csv" href=${URL.createObjectURL(blob)}>`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  }}>Download CSV</button>`
)};
// in define():
$def("_saveCsv", "saveCsv", ["htl", "d3", "rows"], _saveCsv);
```

An async builder (a zip, a PDF) goes inside the handler: `onclick=${async () => { const blob = await build(rows); … }}`.
The stdlib `DOM.download(blob, name, label)` returns a ready control too
(`@tomlarkworthy/fileattachments` `_download_selected`, lopecode/notebooks/@tomlarkworthy_atlas.html);
its first click builds the file and relabels the button "Download"; a second click saves it
(`download.js` in the stdlib awaits the value before it sets `href`).

## Listening on an Inputs view; two inputs that update each other

An `Inputs.*` view (`Inputs.number`, `Inputs.text`, `Inputs.range`, …) is a `<form>` that wraps a
label and the control. It is not the `<input>`. The view has `value` (read and write), and `input`
events from the control bubble up to it. `document.activeElement` is never the view, because focus is
on the `<input>` inside it, and the view has no `valueAsNumber`. The inner element is
`view.querySelector("input")`.

Observed (robocoop-5, temperature converter, 20260928-0510-w25): the agent guarded each listener with
`document.activeElement === viewof_celsius` and read `viewof_celsius.valueAsNumber`. The guard was
always false, so typing in either box changed nothing. The write reported "all 10 cells compute with
no runtime error", and the agent told the user the converter worked. With the guard changed to
`viewof_celsius.contains(document.activeElement)` and `.valueAsNumber` changed to `.value`, the same
module passed.

Two controls that show one quantity: keep the quantity in one hidden state cell,
`viewof celsius = Inputs.input(20)`, and bind each control to it. `Inputs.bind(target, source)` copies
`source.value` into the control, and on the control's `input` event writes the value back to the state
and dispatches `input` on it, so the `celsius` value cell and every other bound control update. The
corpus binds a second control to an existing view this way: `@tomlarkworthy/dataflow-templating` `_dtv2j`
(lopecode/notebooks/@tomlarkworthy_atlas.html) is `Inputs.bind(Inputs.range([1, 4], { label: "widgets",
step: 1 }), $0)` on `viewof widgetCount`. `Inputs.bind` copies values unchanged, so a control that
shows a converted value needs a bind with a function each way:

```js
const _celsius = function celsius(Inputs){return( Inputs.input(20) )};
const _bindVia = function bindVia(){return(
(target, source, to, from, invalidation) => {
  let fromTarget = false;
  const onSource = () => { if (!fromTarget) target.value = to(source.value); };
  const onTarget = () => {
    if (!Number.isFinite(target.value)) return;
    fromTarget = true;
    source.value = from(target.value);
    source.dispatchEvent(new Event("input", {bubbles: true}));
    fromTarget = false;
  };
  onSource();
  target.addEventListener("input", onTarget);
  source.addEventListener("input", onSource);
  invalidation?.then(() => source.removeEventListener("input", onSource));
  return target;
}
)};
const _cBox = function cBox(Inputs, $celsius, invalidation){return(
  Inputs.bind(Inputs.number({label: "Celsius (°C)"}), $celsius, invalidation)
)};
const _fBox = function fBox(Inputs, bindVia, $celsius, invalidation){return(
  bindVia(Inputs.number({label: "Fahrenheit (°F)"}), $celsius,
    c => Math.round((c * 9 / 5 + 32) * 100) / 100, f => (f - 32) * 5 / 9, invalidation)
)};
// in define():
$def("_celsius", "viewof celsius", ["Inputs"], _celsius);
main.variable(observer("celsius")).define("celsius", ["Generators", "viewof celsius"], (G, _) => G.input(_));
$def("_bindVia", "bindVia", [], _bindVia);
$def("_cBox", "cBox", ["Inputs", "viewof celsius", "invalidation"], _cBox);
$def("_fBox", "fBox", ["Inputs", "bindVia", "viewof celsius", "invalidation"], _fBox);
```

The control cells list `viewof celsius`, not `celsius`, so they are not rebuilt on each keystroke.
Setting `.value` dispatches no event, so writes do not echo. `fromTarget` stops the state's `input`
event from rewriting the box being typed in: without it, typing `98.60` in °F was reformatted to `98.6`
under the cursor (probe `tools/scratch/rc5-sessions/s37-shared-state-bind.mjs`, 2026-09-28). With it,
typing °F=212, °C=-40, °F=98.6 gave `celsius` 100, -40, 37, the other box 100, -40, 37, and the typed
text kept each time.

A listener cell that writes each box's converted value into the other box's `.value` also passes the
converter eval, and this page recommended it until 2026-09-28. It leaves no single value to depend
on: the `fahrenheit` value cell does not update when °C is typed, because setting `.value` dispatches
nothing (follows from the no-echo behaviour above; not measured separately).

## Limiting a number box: the range is the first argument

`Inputs.number([min, max], options)` and `Inputs.range([min, max], options)` take the limits as the
first argument. There is no `min` or `max` option: `Inputs.number({min: 0, max: 500})` ignores both
without an error (`createRange` in `vendor/observable-inputs/src/range.js` destructures `extent:
[min, max]` from the first argument and never reads `options.min`). `Inputs.range({min, max})`
throws `object is not iterable`.

Typed into the box the way a user does (probe `tools/scratch/rc5-train/20260928-0847/m31/inputs-behaviour.mjs`,
2026-09-28, the Inputs shipped in robocoop-5):

```
typed   Inputs.number({min: 0, max: 500, value: 100})   Inputs.number([0, 500], {value: 100})
-5      value -5, box valid                             value stays 100, box :invalid
600     value 600, box valid                            value stays 100, box :invalid
""      value unchanged, box :invalid                   value stays 100, box :invalid
250     value 250                                       value 250
```

With the extent, an out-of-range, empty or non-numeric entry keeps the last good value and
dispatches nothing, so dependent cells do not recompute; the box shows the entry the value does not
have. A cell that should say what is wrong has to read the box itself
(`viewof x.querySelector("input")`) or take `Inputs.text` and parse it.

Observed (rc5-train m26, 2026-09-28, "make the AQI converter handle bad input"): in 3 of 3 runs the
agent wrote `Inputs.number({ label: "AQI", value: 100, step: 1, min: 0, max: 500 })` and told the
user the box now refuses values outside 0–500. It accepted -5 and 600.

The corpus form, `@tomlarkworthy/inputs-reference._number_example`
(lopebooks/notebooks/@tomlarkworthy_inputs-reference.html):

```js
Inputs.number([0, 10000], { label: 'price', value: 99, step: 0.01 })
```

A one-sided limit is `Inputs.number([0, Infinity], …)`: a non-finite or `null` end is no limit
(`range.js`, `if (max == null || isNaN(max = +max)) max = Infinity`).
