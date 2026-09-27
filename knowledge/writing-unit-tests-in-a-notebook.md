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
reports it in the tool result as a cell ERRORING at runtime. A hand-built pass/fail table computes
without error whatever it contains: a failing case is visible only to someone reading the table.

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
