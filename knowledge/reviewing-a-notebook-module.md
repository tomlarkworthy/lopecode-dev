---
scope: [local-development, in-notebook]
---

# Reviewing code: read before answering "review my notebook", "find the problems", "what is wrong with my code"; the defect classes to check when every cell computes

A review request ("review my code", "list the problems", "what is wrong with this") is answered with
a list, not with edits. Do not `write_file` or `edit_file` until the user asks for a fix.

"All cells compute with no runtime error" is where a review starts, not its result. Every defect below
was found in modules that computed cleanly.

## Method

1. Read the whole module file, every cell. A problem is often in how two cells use the same value.
2. For each class below, search the source for its signature (`setInterval`, `addEventListener`,
   `innerHTML`, `.value`, `.sort()`, repeated numbers) and decide for each hit.
3. Report each problem as: the cell name, what the code does, and what the user sees because of it.
   Order by what the user sees: wrong or runaway behaviour first, then wrong values, then upkeep.
4. Run `try_control` with only `module`. It moves every control, including each slider's min and
   max and each select option, puts each back, and flags a cell that throws or shows NaN at any of
   them (`⚠ FAILS AT SOME SETTINGS`). A cell that fails only at some settings computes at the
   defaults, so reading the source and `list_values` do not show it: in run 20260928-0847-m40
   `topTweet` threw only with the slider at its max, where a filter returned no rows, and the review
   that read the source and ran `list_values` did not report it.
5. Check a few displayed values by hand against what their cells say they compute (eval_js). The classes below are not the whole list: in run 20260928-0847-m5
   the run that used this page found every seeded problem but missed that the module's starting
   values (PM2.5 50, AQI 250) contradict its own formula (137), which a run without the page caught.
6. Leave out advice that names no cell ("add comments", "split long cells"), and check a claim
   against the class's exceptions before reporting it.

## Serious: behaviour that grows or silently stops working

**A timer or outside listener with no invalidation cleanup.** `setInterval`, a `setTimeout` chain,
a `requestAnimationFrame` loop, or `addEventListener` on `window`, `document` or another cell's
element keeps running after its cell re-runs. A cell re-runs whenever a cell it lists changes, so
every change adds one more. The cell must list `invalidation` and stop the loop there.
`@tomlarkworthy/observablejs-reference` `invalidation_example`
(lopebooks/notebooks/@tomlarkworthy_observablejs-reference.html):

```js
const _invalidation_example = function _invalidation_example(htl,invalidation)
{
  const el = htl.html`<span>0s</span>`;
  let seconds = 0;
  const timer = setInterval(() => (el.textContent = `${++seconds}s`), 1000);
  invalidation.then(() => clearInterval(timer));
  return el;
};
```

On 2026-09-28, `invalidation.then(() => clearInterval(…))` appeared in 247 notebook files.
Not a leak: a listener on an element the cell itself creates and returns. The element is replaced
when the cell re-runs and the listener goes with it.

**A cell that throws or shows NaN at some control settings.** A filter a slider can empty followed by
`[0]`, `d3.greatest(…)[…]` or `.toFixed`; a select that offers a column whose values are text to a
cell that does arithmetic. Report the control, the setting and the cell (from `try_control`'s
`FAILS AT SOME SETTINGS` lines), not only the code.

**A cell that reads `viewof x.value` instead of listing `x`.** It reads the value once, when the cell
runs, and does not re-run when the input changes. Observed (20260928-0525-w28): `passCount` listed
`"viewof passMark"` and read `.value`; moving the slider changed nothing. The cell lists `x` (the
value cell) instead; see `writing-cells-in-module-source.md`.

**A handler inside the bare `html` template.** `onclick=${…}` in stdlib `html` is turned into text;
the button does nothing. See `event-handlers-in-cells.md`.

## Medium: wrong or unsafe values

**User text put into `innerHTML`.** `el.innerHTML = \`<b>${name}</b>\`` parses whatever the user typed
as markup: `<img src=x onerror=…>` in a text box runs. Interpolate into `htl.html` (a `${text}` hole
becomes a text node) or set `.textContent`, as `invalidation_example` above does. On 2026-09-28,
`.textContent =` appeared in 247 notebook files and `.innerHTML = \`…${…}` in 19.

**A handler that uses a value captured when the cell ran.** A click or timer function that reads a
value cell's variable sees the value from the cell's last run. To read the current value at click
time, list the input's `viewof` and read `.value` inside the handler (`@tomlarkworthy/editor-5` `up`,
in `event-handlers-in-cells.md`).

**`.sort()` on numbers with no comparator.** It compares as strings: `[9, 45, 88].sort()` gives
`[45, 88, 9]`. Observed (20260928-0525-w28): a median read 78 instead of 75.5. Use `(a, b) => a - b`.

## Minor: upkeep

**The same literal in two or more cells.** A threshold, size or limit written as a number in several
cells drifts when one copy is changed. Search the module for each number that appears in more than
one cell, and for a number that restates an entry of a table cell the module already has. Make it one
named cell that the others list. `@tomlarkworthy/liquid-timer` `particles`
(lopebooks/notebooks/@tomlarkworthy_liquid-timer.html) is `1500`, listed by `liquid` and the tests:

```js
const _t04 = function _particles(){return(
1500
)};
```

**A cell name that says something else than the value.** A name such as `total` on a cell that returns
an element, or `smoothed` on a raw reading, misleads the next edit.
