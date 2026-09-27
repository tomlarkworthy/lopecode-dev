---
scope: [local-development, in-notebook]
write-triggers:
  - "(^|[^.\\w$])html`[^`]*\\bon[a-z]+=\\$\\{"
---

# Event handlers in cells: htl.html, not html

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

`Inputs.button` is the other working form when the button only needs to count clicks or emit a
value; it is a `viewof` and follows the viewof page (`writing-cells-in-module-source.md`).
