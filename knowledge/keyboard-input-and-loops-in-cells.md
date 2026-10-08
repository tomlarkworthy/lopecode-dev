---
scope: [local-development, in-notebook]
write-triggers:
  - "location\\.reload\\("
  - "(^|[^.\\w$]|\\b(document|window)\\.)addEventListener\\(\\s*[\"'`]key(down|up|press)"
  - "requestAnimationFrame\\("
  - "setInterval\\("
---

# Keyboard input, timers and restart in cells

A game, simulation or animation in a cell has three parts that each go wrong in a Lopecode notebook:
where it listens for keys, how its loop stops, and how it restarts. The notebook page also holds the
chat, the code editor and other modules, and a cell re-runs every time it or an input is edited.

Observed (robocoop-5, "Make a playable snake game controlled with the arrow keys, with a score and a
restart button", 2026-09-28): the agent put a `keydown` listener on `document` with no
`preventDefault`, started the loop at once, and wired Restart to `location.reload()`. The write
reported "all 10 cells compute with no runtime error". In the page, the arrow keys also scrolled
the page and turned the snake while the user typed in the chat, the snake hit the wall about 1.2 s
after the write, before anyone pressed a key, and Restart reloaded the notebook file. The module had
not been saved, so the reload deleted it.

## Listen on the element, not the document

Give the game's root element `tabIndex = 0`, listen for keys on that element, and call
`preventDefault()` only for the keys the game handles. Keys then reach the game only while it has
focus (after a click on it), the arrow keys do not scroll the page, and the chat and editors keep
their keys. `@tomlarkworthy/daw` `keys` (lopebooks/notebooks/tomlarkworthy_daw.html) is a keyboard
widget built this way:

```js
const el = document.createElement('div');
el.tabIndex = 0;
…
el.addEventListener('keydown', e => {
  if (e.repeat) return;
  const off = keymap[e.code];
  if (off != null) {
    e.preventDefault();
    noteon(base + oct * 12 + off);
    return;
  }
  …
});
el.addEventListener('focus', () => { status.textContent = '⌨ armed (z/x octave)'; });
el.addEventListener('blur', () => { allOff(); status.textContent = 'click to arm ⌨'; });
```

Show the user that the element must be clicked first ("click to arm"), and do not start a game
until the first key press: a loop that starts on write has usually finished before anyone looks.

A listener on the element is removed with the element when the cell re-runs. A listener on
`window` or `document` stays on the page after the cell re-runs, so every edit adds another one;
if one is unavoidable, remove it on `invalidation`.

## Shortcuts with a modifier: match `e.code` or the lower-cased `e.key`

A page-wide shortcut (Cmd+Shift+L, Cmd+Z) is the exception to listening on an element: it goes on
`document` and is removed on `invalidation`. Holding Shift makes `e.key` the capital letter.
Measured 2026-09-29 in Playwright's Chromium 151 with `page.keyboard.press`:

```
Meta+Shift+L     key=L code=KeyL
Control+Shift+L  key=L code=KeyL
Shift+KeyL       key=L code=KeyL   (a textarea receives "L")
Meta+KeyL        key=l code=KeyL
```

A test written as `e.key === 'l' && e.shiftKey` therefore never fires. Compare `e.code` (`'KeyL'`,
the physical key) or `e.key.toLowerCase()`; both hold whatever the case. Not measured: Firefox and
WebKit (not installed for Playwright here), and a physical keypress on macOS, where `key` is set by
the OS rather than by Playwright. `@tomlarkworthy/svg-lens` `toolbar`
(lopebooks/notebooks/tomlarkworthy_svg-lens.html) reads undo and redo from one comparison, with
Shift choosing between them:

```js
if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z' && !typing) {
  e.preventDefault();
  return void (e.shiftKey ? drawing.redo() : drawing.undo());
}
```

Observed (robocoop-5, "Add a keyboard shortcut, Cmd+Shift+L, that clears this chat and starts a
fresh conversation", 20260929-0620-m56): the agent wrote `ev.key === 'l' && ev.metaKey &&
ev.shiftKey`, reported "The shortcut is live", and the shortcut did nothing when pressed. Until
2026-09-29 `try_control`'s `keys` sent `"Meta+Shift+l"` as key `"l"` and so confirmed that handler;
it now sends the capital letter, as Chromium does.

A chord with Cmd or Ctrl types no text, so it can also fire while the focus is in a text field. A
shortcut with no modifier, or with Shift alone, must not: a user typing a capital L in a text field
would trigger it. `svg-lens` `toolbar` checks `/^(INPUT|TEXTAREA)$/.test(e.target.tagName) ||
e.target.isContentEditable` for that.

## Stop the loop on invalidation

`setInterval`, `setTimeout` chains and `requestAnimationFrame` loops keep running after their cell
re-runs. Each re-run then starts one more loop and the game speeds up. A cell re-runs when any input
changes, so a loop cell that lists a slider value gains a loop on every slider move. Cancel the loop
when the cell is invalidated. `@tomlarkworthy/matrix-background` `_6`
(lopebooks/notebooks/@tomlarkworthy_matrix-background.html) keeps the frame id in a local and ends with:

```js
invalidation.then(() => {
  if (raf != null) cancelAnimationFrame(raf);
  window.removeEventListener("resize", resize);
});
```

`@tomlarkworthy/liquid-timer` `mainLoop` did the same with `cancelAnimationFrame(frame)` (notebook
deleted 2026-10-08; last at lopebooks `5198bb80`).
`invalidation` is a built-in: list it as an input of the cell. A generator cell needs no cleanup: the
runtime pulls one value per frame and stops pulling when the cell re-runs (`@tomlarkworthy/lazer-light`
`spring`: `while (true) { …draw…; yield ctx.canvas }`).

Do not keep the frame id on the cell's function (`_1w4tlk2._id`), on `window`, or on another cell's
object, and do not use a "running" flag. Observed (robocoop-5, 20260928-0847-m29, "the animation gets
faster and jerkier every time I move the slider"): the agent stored the id on the cell's compiled
function and cancelled it at the top of the cell. Slider moves then kept one loop, but when the cell was
re-created from its source, as an edit does, the old loop kept running and the new cell produced no
value. A flag on the canvas stopped the extra loops but kept the speed the first loop captured, so the
slider no longer did anything.

A fix does not stop loops the old code already started: they were never registered on `invalidation`,
so they run until the page is reloaded. Tell the user to save and reopen the notebook to see the fix.

## Restart by re-running the cell, never by reloading the page

`location.reload()` reloads the notebook file from disk. Everything not yet saved is lost, including
modules and edits made in this session. To restart, make the cell that holds the game state depend
on a button, so a click re-runs it: the old loop is cancelled on invalidation and the cell builds a
fresh state. `@tomlarkworthy/liquid-timer` (deleted 2026-10-08, lopebooks `5198bb80`) did this:

```js
const _t06 = function _viewof_reset(Inputs){return(
Inputs.button("restart")
)};
const _t07 = (G, _) => G.input(_);
const _t11 = function _liquid(createLiquid,particles,reset)
{
  void reset; // the button rebuilds it
  return createLiquid(particles);
};
// in define():
$def("_t06", "viewof reset", ["Inputs"], _t06);
$def("_t07", "reset", ["Generators","viewof reset"], _t07);
$def("_t11", "liquid", ["createLiquid","particles","reset"], _t11);
```

`viewof` cells follow `writing-cells-in-module-source.md`.

