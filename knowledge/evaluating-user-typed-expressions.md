---
scope: [local-development, in-notebook]
write-triggers:
  - "\\bFunction\\([^\\n]*(\\$\\{|[\"'`] *\\+|\\+ *[\"'`])"
  - "(?<![\\w.$])eval\\("
---

# Evaluating user-typed expressions: compile once, catch, and test what people type

A cell that turns text from an input into code (a formula box, a function plotter, a filter query,
a calculator) is only exercised by the default value the agent typed into it. `write_file` reports
"computes with no runtime error" for that one string. The strings a person types next are what
break it.

Observed (rc5-train w20, 2026-09-28, "type a function of x and plot it"): the data cell built
`Function("x", ...Object.getOwnPropertyNames(Math), `"use strict"; return (${fn})`)` per sample,
with no `try`. All six cells computed for `sin(x) * x`. Then:

- `x^2` plotted a flat line at 1 for x = 3: `^` is XOR in JavaScript (`3 ^ 2 === 1`), with no error.
- `sin(` (a half-typed expression) threw `SyntaxError` out of the data cell and the plot cell. A
  `Generators.input` value cell yields on every keystroke, so this happens while typing.
- An earlier attempt passed `...Object.values(Math)`, which is `[]`: `Math`'s members are
  non-enumerable. Use `Object.getOwnPropertyNames(Math)` or `with (Math)`.

## Compile in its own cell, inside try/catch

Compile once per input value, not once per sample, and return the error as a value:

```js
$def("_f", "f", ["expr"], (expr) => {
  const src = String(expr).replace(/\^/g, "**");          // users mean power
  try {
    const g = new Function("x", "with (Math) { return (" + src + "); }");
    g(0.5);                                                // unknown names throw here, not later
    return {fn: g};
  } catch (e) {
    return {error: e.message};
  }
});
```

`with (Math)` puts `sin`, `PI`, `sqrt` … in scope. It is a syntax error in strict mode, and a
`new Function` body is not strict unless it starts with `"use strict"`, so leave that out.

The cell that renders the result shows the message instead of the chart:

```js
if (f.error) return htl.html`<div style="color:#b00020">Can't plot: ${f.error}</div>`;
```

Precedent for the try/catch around a compiled user string:
`@observablehq/plot-exploration-penguins.renderSnippet` (embedded in lopebooks/notebooks/@tomlarkworthy_cloudevents-explorer.html)
and `@gampleman/table.parseQuery` (lopebooks/notebooks/@spond_revised-sars-cov-2-analytics-page.html).

`@tomlarkworthy/mathjs` (vendored in lopebooks/notebooks/@tomlarkworthy_mip.html) parses `^` as power
and has no access to page globals, but it is not in most notebooks: using it means importing it,
which the vendoring page covers.

## Keep bad samples as gaps

Evaluate each sample inside `try` and map a throw or a non-finite result to `NaN`. Do not filter
those points out: `Plot.line` leaves a gap at a `NaN`/`undefined` y, while a filtered array is joined
straight across, so `1/x` or `tan(x)` gets a vertical line through the asymptote.

## Test by typing

Before `task_complete`, set the input to a few strings and read the result with `eval_js`: the
default, a `^` expression, and a half-typed one. For an `Inputs.text` view:

```js
input.value = "x^2"; input.dispatchEvent(new Event("input", {bubbles: true}));
```

then read the value cell (not the element) and check a known point, e.g. `x^2` at x = 3 is 9.
