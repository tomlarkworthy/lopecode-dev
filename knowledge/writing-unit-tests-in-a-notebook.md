---
scope: [local-development, in-notebook]
write-triggers:
  - "\\$def\\(\\s*[\"'][^\"']*[\"']\\s*,\\s*[\"'](viewof )?([Tt]ests?\\b|tests?[A-Z_]|[A-Za-z0-9_]*(Tests?|_tests?)\\b|[A-Za-z0-9_]*Test[A-Z_])"
---

# Writing unit tests in a notebook

A unit test in a Lopecode module is a cell whose name starts with `test_`. It passes when it
returns a defined value and fails when it throws. `@tomlarkworthy/tests`, which is already loaded
in this notebook, finds every `test_*` cell in every module by reflection and reports each one as
passing, failing or pending. There is no suite object to register with and no runner to call.

## A test cell

Copied from `@tomlarkworthy/cell-map._test_recovers_this_notebooks_own_cells`
(`lopecode/notebooks/@tomlarkworthy_cell-map.html`), written here in module source:

```js
const _test_valid_hyphenated = function _test_valid_hyphenated(isValidISBN13){
  const got = isValidISBN13("978-0-306-40615-7");
  if (got !== true) throw Error("978-0-306-40615-7: expected true, got " + got);
  return got;
};
// inside define():
$def("_test_valid_hyphenated", "test_valid_hyphenated", ["isValidISBN13"], _test_valid_hyphenated);
```

With `expect` (`@tomlarkworthy/robocoop3-training._test_hello`,
`lopebooks/notebooks/@tomlarkworthy_robocoop3-training.html`):

```js
const _test_rejects_bad_check_digit = function _test_rejects_bad_check_digit(expect, isValidISBN13){
  expect(isValidISBN13("9780306406158")).toBe(false);
  return "rejected";
};
```

Rules:

- **Return a defined value.** A cell that asserts and falls off the end is `undefined`, which the
  headless runner (`lope-browser-runner.ts --run-tests`) reports as a timeout, not a pass.
  `expect(...).toBe(...)` itself returns `undefined`, so return something after it.
- **One case per cell** when the user wants to see which cases pass: each `test_*` cell is one row
  in the results. A single cell that loops over a table stops at the first failure and shows one row.
- **The expected value is a literal you worked out independently.** A test that compares the
  function with itself, or with a second copy of the same algorithm, cannot fail.
- **Cover both outcomes.** Include cases that must return `true` and cases that must return `false`
  (or throw). A suite of only valid inputs still passes when the function always returns `true`.
- **Tests live in the module they test**, next to the function, not in a separate `-tests` module.

A failing `test_*` cell is a cell in error, so a `write_file` or `edit_file` that breaks a case
reports it in the tool result as a `test_*` cell FAILING, with the assertion's message. A hand-built pass/fail table computes
without error whatever it contains: a failing case is visible only to someone reading the table.

## Tests over random inputs

For a claim over many generated inputs ("`unique(xs)` equals `[...new Set(xs)]`",
"`parse(format(x))` equals `x`"). `mulberry32` and `forAll` are copied from `@tomlarkworthy/svg-lens`
(`lopebooks/notebooks/tomlarkworthy_svg-lens.html`), whose `_test_child_laws` makes its rng the same
way. The one change: svg-lens's `forAll(runs, rng, gen, prop, label)` reports the run and the input
but not the seed, so this copy takes a `seed` argument and puts it in the message.

```js
const _mulberry32 = function _mulberry32(){return(
(seed) => () => {
  seed = (seed + 0x6D2B79F5) | 0;
  let t = seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
)};
const _forAll = function _forAll(){return(
(runs, seed, rng, gen, prop, label = "property") => {
  for (let i = 0; i < runs; i++) {
    const args = gen(rng);
    let ok, err;
    try { ok = prop(...args); } catch (e) { ok = false; err = e; }
    if (!ok) throw new Error(label + " counterexample (seed " + seed + ", run " + i + "): " + JSON.stringify(args) + (err ? " — " + err.message : ""));
  }
  return runs + " runs, seed " + seed;
}
)};
const _test_unique_matches_set = function _test_unique_matches_set(forAll, mulberry32, unique){
  const seed = 0x5EED0001;
  const rng = mulberry32(seed);
  const int = (r, min, max) => min + Math.floor(r() * (max - min + 1));
  const gen = (r) => [Array.from({ length: int(r, 0, 12) }, () => int(r, -20, 20))];
  return forAll(200, seed, rng, gen, (xs) =>
    JSON.stringify(unique(xs)) === JSON.stringify([...new Set(xs)]), "unique vs Set");
};
```

Rules:

- **Seed the generator; never `Math.random`.** An unseeded test reports a different input on
  every run, and a failure cannot be replayed. Create the rng inside the test cell from a literal
  seed. An rng in a cell of its own is not rerun when the function under test changes, so the
  next run continues its sequence and tests different inputs.
- **The message carries the seed, the run and the input** as JSON, short enough to read, so the
  failing input can be pasted into a one-case test.
- **Check the reference before trusting it.** `Array.prototype.sort()` with no comparator
  compares strings: `[10, 9, -1].sort()` is `[-1, 10, 9]`. Pass `(a, b) => a - b` for numbers.
- **A property must hold for a correct implementation.** Before reporting a failure as a bug in
  the function, run the same property once with the reference in its place (`[...xs].sort(cmp)`
  for a sort, `[...new Set(xs)]` for `unique`). If it fails there too, the test is wrong.
- **Compare the whole result**, element by element (`JSON.stringify` both sides). Equal lengths
  or equal sums pass on most wrong answers.
- **Generate the inputs that break implementations:** empty arrays, duplicates, negative numbers,
  mixed signs, and lengths above 10. For a stability claim, use objects with repeated keys and an
  `id`, since equal numbers cannot show order.

## Testing what a chart or table shows

Read the element the cell returned, and take the expected value from the data the output is meant
to show, not from the array it was drawn from. Plot gives each mark's `<g>` an `aria-label` naming
the mark (`bar`, `dot`, `line`, `rule`, `frame`), so `g[aria-label='bar'] rect` is one rect per
bar; a bare `rect` also counts a `frame` or a `rect` mark.

```js
const _test_chart_one_bar_per_month = function _test_chart_one_bar_per_month(chart, sales, d3){
  const months = new Set(sales.map((d) => +d3.utcMonth(d.date))).size;
  const bars = chart.querySelectorAll("g[aria-label='bar'] rect").length;
  if (bars !== months) throw new Error("chart draws " + bars + " bars for " + months + " months in the data");
  return bars + " bars, " + months + " months";
};
```

Three tests that look equivalent and cannot fail on the defect they are named for:

| test | still passes when |
|---|---|
| `monthly.length` equals the distinct months in `sales` (never reads `chart`) | the chart drops a bar |
| bars equal `monthly.length`, where `monthly` is the array the chart plots | `monthly` drops or merges a month: both sides come from the same code |
| bars equal `3`, the count in today's data | never, once the data gains a month |

Before reporting the test, make it fail once: edit the output cell to show a wrong result (plot
`monthly.slice(1)`), check that the edit's result reports the `test_*` cell FAILING, then revert.
A test that was never seen failing may be unable to.

There is no corpus precedent for testing a rendered chart (below, under Corpus). The selector is
Plot's own output structure; the eval `rc5t-chart-bar-count-test` reads bars with it.

## Showing the results

Import `tests` from `@tomlarkworthy/tests` and render it filtered to this module. From
`@tomlarkworthy/cell-map` (`lopecode/notebooks/@tomlarkworthy_cell-map.html`):

```js
const _test_results = function _test_results(tests){return(
  tests({ filter: (t) => t.name.includes("@user/isbn") })
)};
// inside define():
$def("_test_results", null, ["tests"], _test_results);
main.define("module @tomlarkworthy/tests", async () => runtime.module((await import("/@tomlarkworthy/tests.js?v=4")).default));
main.define("tests", ["module @tomlarkworthy/tests", "@variable"], (_, v) => v.import("tests", _));
```

`t.name` is `<module id>#<cell name>`, so filter on your module id. `expect` is imported the same way
from `@tomlarkworthy/jest-expect-standalone`:

```js
main.define("module @tomlarkworthy/jest-expect-standalone", async () => runtime.module((await import("/@tomlarkworthy/jest-expect-standalone.js?v=4")).default));
main.define("expect", ["module @tomlarkworthy/jest-expect-standalone", "@variable"], (_, v) => v.import("expect", _));
```

Do not use `@tomlarkworthy/testing`. It is an older harness that is still embedded in a few
notebooks; new tests use `@tomlarkworthy/tests`.

## Corpus

On 2026-09-28, `test_*` cells occur in 247 notebook files of `lopecode/notebooks` and
`lopebooks/notebooks` (738 distinct cell names); `@tomlarkworthy/tests` is embedded in 247 files and
`@tomlarkworthy/testing` in 10.

Observed (robocoop-5, ISBN-13 prompt, run `20260928-0225-w16-before`): asked for "unit tests in the
notebook that show which cases pass", the agent wrote a `tests` array of `[input, expected, desc]`,
a `testResults` cell and an HTML table reading "17 / 17 tests passed". It read no wiki page. The
table was correct, but the notebook had no `test_*` cell, so the test runner found nothing, and a
case that later failed would not have been reported by any tool.

Observed (robocoop-5, property-test prompt for a `sortBy` with a planted bug, 2026-09-29, eval
`rc5t-sortby-property-test`): the agent read this page, which then had no section on random
inputs, and wrote a test that called `Math.random()` inside its loop. The eval redefined the buggy
function three times and got three different failures:

```
trial 0 index 0: got id 1, want id 0
trial 0 index 0: got id 17, want id 12
trial 1 index 0: got id 20, want id 32
```

None names an input, so none can be replayed. With the section above, one run wrote a stability
test that failed on a correct `sortBy` (it checked ids ascending across the whole output, not within
each key); that is the source of the "must hold for a correct implementation" rule. The next run
scored 1.00 with the message
`sortBy integer keys vs Array.sort failed at run 0, seed 1001: [[{"key":-47},{"key":-78}],"key"]`.
One run before, two after; not a rate. The corpus count behind "never `Math.random`" (0 `test_*` cells
calling it, seeded rngs in 3 modules: svg-lens, mermaid-lens, mip) was taken by the worker that
wrote this section and not rechecked.

Observed (robocoop-5, bar-chart test prompt, run `20260929-0620-m71-before`): asked for "a test
that the bar chart renders one bar per month in the data", the agent wrote
`chart.querySelectorAll("rect").length === monthly.length` and told the user `monthly.length` was
"the number of distinct months in the data". `monthly` is the chart's own input, so a grouping bug
that loses a month removes a bar and a row together, and the test still passes. The eval run on an
unfixed copy wrote the same comparison (2 of 2 unfixed runs). With the chart section above, one
run compared rects with the distinct `d3.utcMonth` values of `sales` and scored 1.00 (base 0.90).
One run per side; not a rate. That run did not perform the "make it fail once" step (no
`slice(1)` edit in its transcript), so that advice is unexercised, and it still used a bare `rect`
selector, which passed only because the fixture chart has no `frame`. On 2026-09-29 the worker
counted `aria-label=…bar` in 0 notebook files (rechecked at merge: 0) and `querySelectorAll('rect` in 1 (robocoop-5
itself): no notebook in `lopecode/notebooks` or `lopebooks/notebooks` tests a rendered chart.
