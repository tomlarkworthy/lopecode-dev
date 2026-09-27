---
scope: [local-development, in-notebook]
write-triggers:
  - "viewof[ _]"
  - "mutable[ _]"
  - "main\\.define\\(\"module "
---

# Writing viewof, mutable and import cells in module source

A module file under `/src` is the compiled `define()` form, not Observable source. Three Observable
constructs expand into more than one variable there, and each must be written out in full. The
robocoop-5 agent got every one of these wrong at least once on 2026-09-27; the failures are quoted
under each.

## viewof — two variables

```js
$def("_k1", "viewof knob", ["Inputs"], (Inputs) => Inputs.range([0, 100], {value: 10}));
$def("_k2", "knob", ["Generators", "viewof knob"], (G, v) => G.input(v));
```

`knob` is the value; other cells list `"knob"` as an input and recompute when the slider moves.
`Generators.input` is what connects the two: it yields the element's `value` on every `input`
event.

Observed (e6, game-theory prompt): the value cell was written as `(viewof_marketSize) =>
viewof_marketSize`, so `marketSize` was the element, and every payoff came out `NaN`. The fix the
agent chose, `+viewof_marketSize.value`, reads the slider once when the cell first runs and never
again: the model stopped responding to its own inputs. Both compile and both report "computes
with no runtime error", so the apply result does not catch either.

## mutable — three variables

```js
$def("_m1", "initial count", [], () => 0);
$def("_m2", "mutable count", ["Mutable", "initial count"], (M, _) => new M(_));
$def("_m3", "count", ["mutable count"], _ => _.generator);
```

Read `count` to react to it. Assign through `"mutable count"` (`m.value = 5`). Copied from the
`item` cell of `@spond/revised-sars-cov-2-analytics-page` in lopebooks.

## import — a loader and a binding per name

```js
main.define("module @user/other", async () => runtime.module((await import("/@user/other.js?v=4")).default));
main.define("x", ["module @user/other", "@variable"], (_, v) => v.import("x", _));
```

Both lines go inside `define()`, after the `$def` lines. The same two lines load a notebook
published on observablehq.com that this page does not embed; after the write applies, its source
is readable at `/src/@user/other.js`. To read a published notebook's API before importing it, fetch
`https://api.observablehq.com/@user/other.js?v=4`. `?v=3`, `/d/…` and the observablehq.com page URL
were all tried in runs on 2026-09-27 and none returned the module.

Observed: before lopebooks `dd9a6f7f` the apply bound an import of a notebook not in the page to an
empty module of the same name, so every imported name was "not defined" although the file was
correct. If an import still reports a name as not defined, check the loader line's path before
rewriting the binding.
