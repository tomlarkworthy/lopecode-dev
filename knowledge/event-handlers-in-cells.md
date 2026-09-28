---
scope: [local-development, in-notebook]
write-triggers:
  - "(^|[^.\\w$])html`[^`]*\\bon[a-z]+=\\$\\{"
  - "\\bon(click|input|change|submit)=\\$\\{"
  - "addEventListener\\(\\s*[\"'](click|input|change|submit)[\"']"
  - "<button\\b"
  - "Inputs\\.button\\("
---

# Event handlers and buttons in cells: htl.html, not html; a button that acts on another cell's input

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

`Inputs.button` is the other working form when the button only needs to count clicks or emit a
value; it is a `viewof` and follows the viewof page (`writing-cells-in-module-source.md`).
