// Live eval suite for robocoop-4 — ORGANIC tasks, graded by OUTCOME.
//
// Design rules (so the suite measures real capability, not prompt-following):
//  1. Questions read like a user request: a GOAL plus the INTERFACE to grade against (cell name + where
//     it lives, and example I/O where a real user would give it). They NEVER contain the implementation
//     code, the module file format, or step-by-step instructions — that generic knowledge lives only in
//     the system prompt (@tomlarkworthy/robocoop-4-core systemPrompt). Do not move eval-specific hints
//     into the prompt, and do not move implementation into the question.
//  2. Grading is deterministic. Pure logic is checked by compiling+running the cell from the workspace
//     file (cell_evaluates / cell_fn_evaluates) — function-valued cells are exercised with MULTIPLE hidden
//     cases so a hardcoded answer fails. Library/UI work is checked against the LIVE runtime
//     (renders_svg / renders_element / module_source_contains / module_renders_contains). Editing an
//     existing module is checked at BOTH the file and the live-runtime source so a write that doesn't
//     actually apply is caught.
//  3. Sync is REALTIME: writing a module file applies it to the running notebook within ~1s; there is no
//     apply tool. setup.files seed fixtures BEFORE the turn.

const CORE = "@tomlarkworthy/robocoop-4-core";

export const EVALS = [
  // ───────────────────────── algorithms (function-valued cells, multi-case) ─────────────────────────
  {
    id: "algo-nth-prime",
    category: "algorithm",
    question:
      "In a new module @user/primes, add a cell `nthPrime` whose value is a function: nthPrime(n) returns " +
      "the n-th prime number, counting from nthPrime(1) === 2. I'll use it for a few values.",
    criteria: [
      { name: "does_compile", args: { file: "/notebook/@user/primes.js" }, weight: 1 },
      { name: "cell_fn_evaluates", args: { file: "/notebook/@user/primes.js", name: "nthPrime",
        cases: [{ args: [1], equals: 2 }, { args: [6], equals: 13 }, { args: [10], equals: 29 }, { args: [25], equals: 97 }] }, weight: 3 },
      { name: "module_exists", args: { id: "@user/primes" }, weight: 1 },
    ],
  },
  {
    id: "algo-roman",
    category: "algorithm",
    question:
      "Add a cell `toRoman` (a function) to a new module @user/roman that converts a positive integer to " +
      "its Roman numeral string, e.g. toRoman(4) is \"IV\" and toRoman(1990) is \"MCMXC\".",
    criteria: [
      { name: "does_compile", args: { file: "/notebook/@user/roman.js" }, weight: 1 },
      { name: "cell_fn_evaluates", args: { file: "/notebook/@user/roman.js", name: "toRoman",
        cases: [{ args: [4], equals: "IV" }, { args: [9], equals: "IX" }, { args: [58], equals: "LVIII" }, { args: [1994], equals: "MCMXCIV" }] }, weight: 3 },
    ],
  },
  {
    id: "algo-balanced-brackets",
    category: "algorithm",
    question:
      "Add a cell `balanced` (a function) to a new module @user/brackets: given a string containing only " +
      "the characters ()[]{}, it returns true when every bracket is closed by the matching type in the " +
      "right order, and false otherwise. The empty string is balanced.",
    criteria: [
      { name: "does_compile", args: { file: "/notebook/@user/brackets.js" }, weight: 1 },
      { name: "cell_fn_evaluates", args: { file: "/notebook/@user/brackets.js", name: "balanced",
        cases: [{ args: ["()[]{}"], equals: true }, { args: ["([{}])"], equals: true }, { args: ["([)]"], equals: false }, { args: ["((("], equals: false }, { args: [""], equals: true }] }, weight: 3 },
    ],
  },
  {
    id: "algo-word-count",
    category: "algorithm",
    question:
      "Add a cell `wordCount` (a function) to a new module @user/text: given a sentence, return an object " +
      "mapping each lower-cased word to how many times it appears. Split on whitespace; assume no punctuation.",
    criteria: [
      { name: "does_compile", args: { file: "/notebook/@user/text.js" }, weight: 1 },
      { name: "cell_fn_evaluates", args: { file: "/notebook/@user/text.js", name: "wordCount",
        cases: [{ args: ["the cat the dog the bird"], equals: { the: 3, cat: 1, dog: 1, bird: 1 } }, { args: ["Hello hello WORLD"], equals: { hello: 2, world: 1 } }] }, weight: 3 },
    ],
  },

  // ───────────────────────── data wrangling ─────────────────────────
  {
    id: "data-parse-csv",
    category: "data",
    question:
      "Add a cell `parseCSV` (a function) to a new module @user/csv: the first line is the header row, each " +
      "following line is a record. Return an array of objects keyed by the header columns (values stay as " +
      "strings). Lines are separated by \\n and fields by commas.",
    criteria: [
      { name: "does_compile", args: { file: "/notebook/@user/csv.js" }, weight: 1 },
      { name: "cell_fn_evaluates", args: { file: "/notebook/@user/csv.js", name: "parseCSV",
        cases: [
          { args: ["name,age\nAda,36\nAlan,41"], equals: [{ name: "Ada", age: "36" }, { name: "Alan", age: "41" }] },
          { args: ["a,b,c\n1,2,3"], equals: [{ a: "1", b: "2", c: "3" }] },
        ] }, weight: 3 },
    ],
  },
  {
    id: "data-top-three",
    category: "data",
    question:
      "Here are exam scores: [54, 91, 73, 88, 67, 99, 81, 45, 95]. In a new module @user/exam add a cell " +
      "`topThree` that is the three highest scores, highest first.",
    criteria: [
      { name: "does_compile", args: { file: "/notebook/@user/exam.js" }, weight: 1 },
      { name: "cell_evaluates", args: { file: "/notebook/@user/exam.js", name: "topThree", equals: [99, 95, 91] }, weight: 3 },
    ],
  },

  // ───────────────────────── reactive dataflow (real cell-to-cell wiring) ─────────────────────────
  {
    id: "dataflow-temperature",
    category: "dataflow",
    question:
      "In a new module @user/temp, add a cell `celsius` set to 25, and a cell `fahrenheit` that converts " +
      "celsius to Fahrenheit. fahrenheit must update if celsius changes — don't bake in the number.",
    criteria: [
      { name: "does_compile", args: { file: "/notebook/@user/temp.js" }, weight: 1 },
      { name: "uses_identifier", args: { file: "/notebook/@user/temp.js", ident: "celsius" }, weight: 1 },
      // two hidden inputs prove fahrenheit is computed from celsius, not a constant
      { name: "cell_evaluates", args: { file: "/notebook/@user/temp.js", name: "fahrenheit", inputs: { celsius: 25 }, equals: 77 }, weight: 2 },
      { name: "cell_evaluates", args: { file: "/notebook/@user/temp.js", name: "fahrenheit", inputs: { celsius: 100 }, equals: 212 }, weight: 2 },
    ],
  },

  // ───────────────────────── visualization (live, Observable Plot) ─────────────────────────
  {
    id: "viz-revenue-bars",
    category: "viz",
    question:
      "Visualize this monthly revenue as a bar chart in a new module @user/revenue, in a cell named `chart`: " +
      "January 30, February 45, March 25, April 60.",
    criteria: [
      { name: "module_exists", args: { id: "@user/revenue" }, weight: 1 },
      { name: "variable_no_error", args: { module: "@user/revenue", name: "chart" }, weight: 1 },
      { name: "renders_svg", args: { module: "@user/revenue", name: "chart" }, weight: 3 },
    ],
  },

  // ───────────────────────── UI (live, standard Inputs) ─────────────────────────
  {
    id: "ui-people-table",
    category: "ui",
    question:
      "Show these people as a sortable table in a new module @user/people, cell `peopleTable`: " +
      "Ada (age 36), Alan (age 41), Grace (age 45). Use the notebook's standard table widget rather than " +
      "hand-building HTML.",
    criteria: [
      { name: "variable_no_error", args: { module: "@user/people", name: "peopleTable" }, weight: 1 },
      { name: "renders_element", args: { module: "@user/people", name: "peopleTable" }, weight: 3 },
      { name: "not_contains_string", args: { file: "/notebook/@user/people.js", needle: "<table" }, weight: 1 },
    ],
  },
  {
    id: "ui-slider-square",
    category: "ui",
    question:
      "In a new module @user/playground I'd like an interactive slider `n` that ranges from 0 to 100, and a " +
      "cell `nSquared` that shows n squared and updates live as I drag the slider.",
    criteria: [
      { name: "renders_element", args: { module: "@user/playground", name: "viewof n" }, weight: 2 },
      { name: "uses_identifier", args: { file: "/notebook/@user/playground.js", ident: "n" }, weight: 1 },
      { name: "cell_evaluates", args: { file: "/notebook/@user/playground.js", name: "nSquared", inputs: { n: 9 }, equals: 81 }, weight: 2 },
      { name: "cell_evaluates", args: { file: "/notebook/@user/playground.js", name: "nSquared", inputs: { n: 12 }, equals: 144 }, weight: 1 },
    ],
  },

  // ───────────────────────── library use (live, d3) ─────────────────────────
  {
    id: "lib-d3-extent",
    category: "library",
    question:
      "Using the d3 library that's available in the notebook, add a cell `span` to a new module @user/dataviz " +
      "that gives the smallest and largest of [3, 1, 4, 1, 5, 9, 2, 6] as a two-element [min, max] array.",
    criteria: [
      { name: "does_compile", args: { file: "/notebook/@user/dataviz.js" }, weight: 1 },
      { name: "uses_identifier", args: { file: "/notebook/@user/dataviz.js", ident: "d3" }, weight: 1 },
      { name: "cell_evaluates", args: { file: "/notebook/@user/dataviz.js", name: "span", equals: [1, 9] }, weight: 2 },
      { name: "variable_no_error", args: { module: "@user/dataviz", name: "span" }, weight: 1 },
    ],
  },

  // ───────────────────────── network access (fetch, NOT curl) ─────────────────────────
  // The just-bash shell has no real network, so the only way to land the payload in a cell is eval_js/cell
  // fetch — curl/wget can't, and the token can't be guessed. setup.routes fulfills the sentinel URL.
  {
    id: "net-fetch-json",
    category: "network",
    question:
      "Add a cell `apiUser` to a new module @user/net whose value is the JSON object returned by " +
      "GET https://eval.test/user.json. I want the live parsed object as the cell value.",
    setup: { routes: [{ url: "https://eval.test/user.json", body: { user: "Grace Hopper", token: "qzx-7741" } }] },
    criteria: [
      { name: "does_compile", args: { file: "/notebook/@user/net.js" }, weight: 1 },
      { name: "module_exists", args: { id: "@user/net" }, weight: 1 },
      { name: "live_value_contains", args: { module: "@user/net", name: "apiUser", needle: "Grace Hopper" }, weight: 2 },
      { name: "live_value_contains", args: { module: "@user/net", name: "apiUser", needle: "qzx-7741" }, weight: 1 },
    ],
  },

  // ───────────────────────── imports (the point of self-reprogramming agents) ─────────────────────────
  // Two kinds the agent MUST be able to do to write functioning programs:
  //   1. cross-module imports — pull a cell from another notebook module it authored
  //   2. external ESM imports — pull a library off a CDN (CommonJS won't load; it must find the ESM form)
  // Graded on the LIVE value, so the import has to actually wire up in the runtime (apply path), and on the
  // FILE source, so the import has to be durable (survives re-export), not an ephemeral eval_js poke.
  {
    id: "import-cross-module",
    category: "imports",
    question:
      "Create two SEPARATE modules. First @user/mathlib with a cell `triple` that is the function n => n * 3. " +
      "Then @user/calc which IMPORTS triple from @user/mathlib (import it — do NOT redefine the function in " +
      "@user/calc) and uses it to define a cell `result` equal to triple(14). @user/calc.result must be 42, " +
      "computed through the imported function.",
    criteria: [
      { name: "module_exists", args: { id: "@user/mathlib" }, weight: 1 },
      { name: "module_exists", args: { id: "@user/calc" }, weight: 1 },
      // the @user/calc file must reference @user/mathlib — i.e. it genuinely imports rather than re-implements
      { name: "contains_string", args: { file: "/notebook/@user/calc.js", needle: "@user/mathlib" }, weight: 2 },
      { name: "variable_no_error", args: { module: "@user/calc", name: "result" }, weight: 1 },
      { name: "variable_equals", args: { module: "@user/calc", name: "result", equals: 42 }, weight: 3 },
    ],
  },
  {
    id: "import-esm-md5",
    category: "imports",
    question:
      "Add a cell `digest` to a new module @user/hashing whose value is the MD5 hex digest of the string " +
      '"abc". Use a third-party hashing library imported as an ES module from a CDN (e.g. esm.sh) — ' +
      "CommonJS-only packages do not load in the browser, so pick the ESM form. The value must be the " +
      "32-character lowercase hex string.",
    criteria: [
      { name: "module_exists", args: { id: "@user/hashing" }, weight: 1 },
      { name: "contains_string", args: { file: "/notebook/@user/hashing.js", needle: "import(" }, weight: 1 },
      { name: "variable_no_error", args: { module: "@user/hashing", name: "digest" }, weight: 1 },
      // md5("abc") — effectively impossible to hand-fake, so this proves the library actually loaded + ran
      { name: "variable_equals", args: { module: "@user/hashing", name: "digest", equals: "900150983cd24fb0d6963f7d28e17f72" }, weight: 3 },
    ],
  },
  {
    id: "import-esm-util",
    category: "imports",
    question:
      "Add a cell `kebab` to a new module @user/strutil whose value is the string 'Hello World FOO' converted " +
      "to kebab-case (lowercase words joined by hyphens). Use a general-purpose utility library imported as an " +
      "ES module from a CDN — do not hand-roll the conversion. Expected value: \"hello-world-foo\".",
    criteria: [
      { name: "module_exists", args: { id: "@user/strutil" }, weight: 1 },
      { name: "contains_string", args: { file: "/notebook/@user/strutil.js", needle: "import(" }, weight: 1 },
      { name: "variable_no_error", args: { module: "@user/strutil", name: "kebab" }, weight: 1 },
      { name: "variable_equals", args: { module: "@user/strutil", name: "kebab", equals: "hello-world-foo" }, weight: 2 },
    ],
  },

  // ───────────────────────── document editing (the everyday "notebook helper" job) ─────────────────────────
  // Simple prose/doc edits on a SEEDED module — the class where real use surfaces bugs that algo tasks miss.
  // Graded on file + LIVE runtime so a "looks right" file that doesn't apply still fails.
  {
    id: "doc-edit-typo",
    category: "doc-editing",
    question: "The heading in @user/welcome reads \"Welcom to Lopecode\" — fix the typo so it reads \"Welcome to Lopecode\". Change nothing else.",
    setup: {
      files: {
        "/notebook/@user/welcome.js":
          "const _heading = function heading(md){return( md`# Welcom to Lopecode` )};\n" +
          "export default function define(runtime, observer) {\n" +
          "  const main = runtime.module();\n" +
          "  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn).pid = pid;\n" +
          "  $def(\"_heading\", \"heading\", [\"md\"], _heading);\n  return main;\n}\n",
      },
    },
    criteria: [
      { name: "does_compile", args: { file: "/notebook/@user/welcome.js" }, weight: 1 },
      { name: "contains_string", args: { file: "/notebook/@user/welcome.js", needle: "Welcome to Lopecode" }, weight: 2 },
      { name: "not_contains_string", args: { file: "/notebook/@user/welcome.js", needle: "Welcom to" }, weight: 1 },
      { name: "variable_no_error", args: { module: "@user/welcome", name: "heading" }, weight: 1 },
      { name: "module_source_contains", args: { module: "@user/welcome", needle: "Welcome to Lopecode" }, weight: 2 },
    ],
  },
  {
    id: "doc-add-section",
    category: "doc-editing",
    question: "Add a new markdown cell `faq` to @user/guide with a \"## FAQ\" heading and one question-and-answer. Keep the existing intro and usage cells intact.",
    setup: {
      files: {
        "/notebook/@user/guide.js":
          "const _intro = function intro(md){return( md`# User Guide` )};\n" +
          "const _usage = function usage(md){return( md`## Usage\\nRun the thing.` )};\n" +
          "export default function define(runtime, observer) {\n" +
          "  const main = runtime.module();\n" +
          "  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn).pid = pid;\n" +
          "  $def(\"_intro\", \"intro\", [\"md\"], _intro);\n" +
          "  $def(\"_usage\", \"usage\", [\"md\"], _usage);\n  return main;\n}\n",
      },
    },
    criteria: [
      { name: "does_compile", args: { file: "/notebook/@user/guide.js" }, weight: 1 },
      { name: "contains_string", args: { file: "/notebook/@user/guide.js", needle: "## FAQ" }, weight: 2 },
      { name: "contains_string", args: { file: "/notebook/@user/guide.js", needle: "## Usage" }, weight: 1 },  // existing kept
      { name: "variable_no_error", args: { module: "@user/guide", name: "faq" }, weight: 2 },
      { name: "variable_no_error", args: { module: "@user/guide", name: "usage" }, weight: 1 },
    ],
  },
  {
    id: "doc-add-interactive",
    category: "doc-editing",
    question: "The @user/dashboard module has a `scores` cell = [30, 50, 70, 90]. Add an interactive slider `viewof cutoff` (Inputs.range from 0 to 100, default 50) and a cell `passing` whose value is how many scores are >= cutoff. With the default cutoff it should be 3.",
    setup: {
      files: {
        "/notebook/@user/dashboard.js":
          "const _title = function title(md){return( md`# Dashboard` )};\n" +
          "const _scores = function scores(){return( [30, 50, 70, 90] )};\n" +
          "export default function define(runtime, observer) {\n" +
          "  const main = runtime.module();\n" +
          "  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn).pid = pid;\n" +
          "  $def(\"_title\", \"title\", [\"md\"], _title);\n" +
          "  $def(\"_scores\", \"scores\", [], _scores);\n  return main;\n}\n",
      },
    },
    criteria: [
      { name: "does_compile", args: { file: "/notebook/@user/dashboard.js" }, weight: 1 },
      { name: "renders_element", args: { module: "@user/dashboard", name: "viewof cutoff" }, weight: 2 },
      { name: "variable_no_error", args: { module: "@user/dashboard", name: "passing" }, weight: 1 },
      { name: "variable_equals", args: { module: "@user/dashboard", name: "passing", equals: 3 }, weight: 3 },
    ],
  },

  {
    id: "doc-build-report",
    category: "doc-editing",
    question: "Make @user/sales into an interactive report. The `data` cell is [{month,revenue}]. Add: a `chart` " +
      "cell that is a Plot bar chart of revenue by month; a `viewof month` dropdown (Inputs.select of the month " +
      "names); a `monthRevenue` cell = the revenue for the selected month; and a `total` cell = the sum of all " +
      "revenue. Keep the existing title, data, and note cells.",
    setup: {
      files: {
        "/notebook/@user/sales.js":
          "const _title = function title(md){return( md`# Q1 Sales` )};\n" +
          "const _data = function data(){return( [{month:\"Jan\",revenue:120},{month:\"Feb\",revenue:150},{month:\"Mar\",revenue:90}] )};\n" +
          "const _note = function note(md){return( md`Revenue dipped in March.` )};\n" +
          "export default function define(runtime, observer) {\n" +
          "  const main = runtime.module();\n" +
          "  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn).pid = pid;\n" +
          "  $def(\"_title\", \"title\", [\"md\"], _title);\n" +
          "  $def(\"_data\", \"data\", [], _data);\n" +
          "  $def(\"_note\", \"note\", [\"md\"], _note);\n  return main;\n}\n",
      },
    },
    criteria: [
      { name: "does_compile", args: { file: "/notebook/@user/sales.js" }, weight: 1 },
      { name: "variable_no_error", args: { module: "@user/sales", name: "chart" }, weight: 1 },
      { name: "renders_svg", args: { module: "@user/sales", name: "chart" }, weight: 2 },
      { name: "renders_element", args: { module: "@user/sales", name: "viewof month" }, weight: 1 },
      { name: "variable_no_error", args: { module: "@user/sales", name: "monthRevenue" }, weight: 1 },
      { name: "variable_equals", args: { module: "@user/sales", name: "total", equals: 360 }, weight: 2 },
      { name: "variable_no_error", args: { module: "@user/sales", name: "note" }, weight: 1 },  // existing kept
    ],
  },

  // ───────────────────────── editing an EXISTING module (file + live runtime) ─────────────────────────
  {
    id: "edit-exporter-title",
    category: "edit-existing",
    question:
      "The exporter-3 module (@tomlarkworthy/exporter-3) shows the heading \"Exporter 3\" at the top. Change " +
      "that heading to read \"Lopecode Exporter\" instead. Leave everything else as-is.",
    criteria: [
      { name: "contains_string", args: { file: "/notebook/@tomlarkworthy/exporter-3.js", needle: "Lopecode Exporter" }, weight: 1 },
      { name: "not_contains_string", args: { file: "/notebook/@tomlarkworthy/exporter-3.js", needle: "# Exporter 3" }, weight: 1 },
      // the edit must reach the LIVE runtime, not just the file (jbApply rewrites _definition)
      { name: "module_source_contains", args: { module: "@tomlarkworthy/exporter-3", needle: "Lopecode Exporter" }, weight: 3 },
    ],
  },
  {
    id: "edit-add-doc-cell",
    category: "edit-existing",
    question:
      "The seeded module @user/inventory has no explanation. Add a short markdown cell at the top documenting " +
      "it — at least 15 words, and it must contain the exact phrase \"inventory tracker\". Keep the existing " +
      "cells working.",
    setup: {
      files: {
        "/notebook/@user/inventory.js":
          "const _count = function count(){return( 0 )};\n" +
          "const _items = function items(){return( [] )};\n" +
          "export default function define(runtime, observer){\n" +
          "  const main = runtime.module();\n" +
          "  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn).pid = pid;\n" +
          "  $def(\"_count\", \"count\", [], _count);\n" +
          "  $def(\"_items\", \"items\", [], _items);\n  return main;\n}\n",
      },
    },
    criteria: [
      { name: "does_compile", args: { file: "/notebook/@user/inventory.js" }, weight: 1 },
      { name: "has_doc_comment", args: { module: "@user/inventory" }, weight: 1 },
      { name: "contains_string", args: { file: "/notebook/@user/inventory.js", needle: "inventory tracker" }, weight: 2 },
      { name: "min_words", args: { file: "/notebook/@user/inventory.js", count: 15 }, weight: 1 },
      { name: "variable_no_error", args: { module: "@user/inventory", name: "count" }, weight: 1 },
    ],
  },

  // ───────────────────────── editor-lifecycle ─────────────────────────
  // The agent interacting with the Lopecode editor itself: create / modify / delete / rewire the
  // notebook's own cells and have the change take effect in the LIVE runtime (not just the file).
  // Each eval pins a historically-regressed editing operation (see qa/per-notebook/robocoop-4.md B26):
  // modify-and-recompute, delete-and-prune (F4), import-into-existing (F5), viewof-render (F6).
  {
    id: "el-modify-live",
    category: "editor-lifecycle",
    question:
      "The seeded module @user/counter has a cell `step` = 2 and a cell `total` = step * 10. Edit the `step` " +
      "cell so its value is 5. Keep `total` defined as step * 10 (do not hardcode total). After your edit " +
      "@user/counter.total must be 50 in the running notebook.",
    setup: {
      files: {
        "/notebook/@user/counter.js":
          "const _step = function step(){return( 2 )};\n" +
          "const _total = function total(step){return( step * 10 )};\n" +
          "export default function define(runtime, observer){\n" +
          "  const main = runtime.module();\n" +
          "  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn).pid = pid;\n" +
          "  $def(\"_step\", \"step\", [], _step);\n" +
          "  $def(\"_total\", \"total\", [\"step\"], _total);\n  return main;\n}\n",
      },
    },
    criteria: [
      { name: "variable_equals", args: { module: "@user/counter", name: "step", equals: 5 }, weight: 2 },
      // the downstream cell recomputed in the LIVE runtime — proves the edit reached the runtime, not just the file
      { name: "variable_equals", args: { module: "@user/counter", name: "total", equals: 50 }, weight: 3 },
      { name: "variable_no_error", args: { module: "@user/counter", name: "total" }, weight: 1 },
      // anti-hardcode: total is still step*10, so feeding a different step gives a different result
      { name: "cell_evaluates", args: { file: "/notebook/@user/counter.js", name: "total", inputs: { step: 3 }, equals: 30 }, weight: 1 },
    ],
  },
  {
    id: "el-delete-prune",
    category: "editor-lifecycle",
    question:
      "The seeded module @user/widget has two cells: `keep` and `obsolete`. Delete the `obsolete` cell " +
      "entirely so it no longer exists in the module, leaving `keep` working. The string \"REMOVE_ME\" must " +
      "not appear anywhere in the module afterwards.",
    setup: {
      files: {
        "/notebook/@user/widget.js":
          "const _keep = function keep(){return( 1 )};\n" +
          "const _obsolete = function obsolete(){return( \"REMOVE_ME\" )};\n" +
          "export default function define(runtime, observer){\n" +
          "  const main = runtime.module();\n" +
          "  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn).pid = pid;\n" +
          "  $def(\"_keep\", \"keep\", [], _keep);\n" +
          "  $def(\"_obsolete\", \"obsolete\", [], _obsolete);\n  return main;\n}\n",
      },
    },
    criteria: [
      { name: "module_exists", args: { id: "@user/widget" }, weight: 1 },
      // the deleted cell's live variable is gone — guards the F4 orphan-prune regression
      { name: "variable_absent", args: { module: "@user/widget", name: "obsolete" }, weight: 3 },
      { name: "variable_defined", args: { module: "@user/widget", name: "keep" }, weight: 1 },
      { name: "variable_no_error", args: { module: "@user/widget", name: "keep" }, weight: 1 },
      { name: "not_contains_string", args: { file: "/notebook/@user/widget.js", needle: "REMOVE_ME" }, weight: 1 },
    ],
  },
  {
    id: "el-import-into-existing",
    category: "editor-lifecycle",
    question:
      "@user/source defines a cell `base` = 21. In the EXISTING module @user/consumer (which currently only " +
      "has a doc cell), add an import of `base` from @user/source (import it — do NOT redefine the number), " +
      "then add a cell `out` = base * 2. @user/consumer.out must be 42, computed through the imported value.",
    setup: {
      files: {
        "/notebook/@user/source.js":
          "const _base = function base(){return( 21 )};\n" +
          "export default function define(runtime, observer){\n" +
          "  const main = runtime.module();\n" +
          "  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn).pid = pid;\n" +
          "  $def(\"_base\", \"base\", [], _base);\n  return main;\n}\n",
        "/notebook/@user/consumer.js":
          "const _note = function note(md){return( md`# consumer` )};\n" +
          "export default function define(runtime, observer){\n" +
          "  const main = runtime.module();\n" +
          "  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn).pid = pid;\n" +
          "  $def(\"_note\", \"note\", [\"md\"], _note);\n  return main;\n}\n",
      },
    },
    criteria: [
      { name: "module_exists", args: { id: "@user/consumer" }, weight: 1 },
      // genuinely imports rather than re-implements
      { name: "contains_string", args: { file: "/notebook/@user/consumer.js", needle: "@user/source" }, weight: 2 },
      { name: "variable_no_error", args: { module: "@user/consumer", name: "out" }, weight: 1 },
      // cross-module import added to an EXISTING module took effect live — guards the F5 import-apply regression
      { name: "variable_equals", args: { module: "@user/consumer", name: "out", equals: 42 }, weight: 3 },
    ],
  },
  {
    id: "el-viewof-live",
    category: "editor-lifecycle",
    question:
      "Create a module @user/ctrl with an interactive control `viewof n = Inputs.range([0, 100], {value: 7, " +
      "step: 1})` and a derived cell `doubled` = n * 2. The control must actually render, and `doubled` must " +
      "be 14 at the default value in the running notebook.",
    criteria: [
      { name: "module_exists", args: { id: "@user/ctrl" }, weight: 1 },
      // the viewof mounted as a real DOM element in the live runtime — guards the F6 viewof-render regression
      { name: "renders_element", args: { module: "@user/ctrl", name: "viewof n" }, weight: 2 },
      { name: "variable_no_error", args: { module: "@user/ctrl", name: "doubled" }, weight: 1 },
      // the derived cell reactively settled to the default-driven value in the live runtime
      { name: "variable_equals", args: { module: "@user/ctrl", name: "doubled", equals: 14 }, weight: 3 },
    ],
  },

  // ───────────────────────── debugging (diagnose + fix a seeded bug) ─────────────────────────
  {
    id: "debug-average",
    category: "debugging",
    question:
      "The `average` cell in @user/grades is supposed to give the mean of the scores but the number it shows " +
      "is way too big. Find the bug and fix it so it reports the correct average.",
    setup: {
      files: {
        "/notebook/@user/grades.js":
          // sums but never divides -> 270 instead of 90
          "const _average = function average(){ const scores = [80, 90, 100]; return scores.reduce((a, b) => a + b, 0); };\n" +
          "export default function define(runtime, observer){\n" +
          "  const main = runtime.module();\n" +
          "  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn).pid = pid;\n" +
          "  $def(\"_average\", \"average\", [], _average);\n  return main;\n}\n",
      },
    },
    criteria: [
      { name: "does_compile", args: { file: "/notebook/@user/grades.js" }, weight: 1 },
      { name: "cell_evaluates", args: { file: "/notebook/@user/grades.js", name: "average", equals: 90 }, weight: 3 },
    ],
  },
  {
    id: "debug-off-by-one",
    category: "debugging",
    question:
      "The `countTo` function in @user/counter should return [1, 2, …, n] but it's dropping the last number. " +
      "Fix it.",
    setup: {
      files: {
        "/notebook/@user/counter.js":
          // uses i < n -> misses n
          "const _countTo = function countTo(){ return (n) => { const out = []; for (let i = 1; i < n; i++) out.push(i); return out; }; };\n" +
          "export default function define(runtime, observer){\n" +
          "  const main = runtime.module();\n" +
          "  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn).pid = pid;\n" +
          "  $def(\"_countTo\", \"countTo\", [], _countTo);\n  return main;\n}\n",
      },
    },
    criteria: [
      { name: "does_compile", args: { file: "/notebook/@user/counter.js" }, weight: 1 },
      { name: "cell_fn_evaluates", args: { file: "/notebook/@user/counter.js", name: "countTo",
        cases: [{ args: [3], equals: [1, 2, 3] }, { args: [1], equals: [1] }, { args: [5], equals: [1, 2, 3, 4, 5] }] }, weight: 3 },
    ],
  },

  // ───────────────────────── comprehension (read, locate, report) ─────────────────────────
  {
    id: "comprehend-click-handler",
    category: "comprehension",
    question:
      "Read the module @user/app. Several cells make up a small UI. Which single cell defines the function " +
      "that runs when a cell is clicked? Write only that cell's name into /notebook/answer.txt.",
    setup: {
      files: {
        "/notebook/@user/app.js":
          "const _styles = function styles(){return( '.cell{cursor:pointer}' )};\n" +
          "const _renderToolbar = function renderToolbar(){return( 'toolbar' )};\n" +
          "const _openEditor = function openEditor(){return( (cell) => { /* opens the editor panel */ } )};\n" +
          "const _onCellClick = function onCellClick(openEditor){return( (cell) => openEditor(cell) )};\n" +
          "const _save = function save(){return( () => {} )};\n" +
          "export default function define(runtime, observer){\n" +
          "  const main = runtime.module();\n" +
          "  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn).pid = pid;\n" +
          "  $def(\"_styles\", \"styles\", [], _styles);\n" +
          "  $def(\"_renderToolbar\", \"renderToolbar\", [], _renderToolbar);\n" +
          "  $def(\"_openEditor\", \"openEditor\", [], _openEditor);\n" +
          "  $def(\"_onCellClick\", \"onCellClick\", [\"openEditor\"], _onCellClick);\n" +
          "  $def(\"_save\", \"save\", [], _save);\n  return main;\n}\n",
      },
    },
    criteria: [
      { name: "file_exists", args: { path: "/notebook/answer.txt" }, weight: 1 },
      { name: "answer_contains", args: { file: "/notebook/answer.txt", needle: "onCellClick" }, weight: 2 },
      { name: "not_contains_string", args: { file: "/notebook/answer.txt", needle: "openEditor" }, weight: 1 },
    ],
  },
  {
    id: "comprehend-which-module",
    category: "comprehension",
    question:
      "Which module in this notebook defines the function `exportModuleJS`? The live modules are mirrored as " +
      "files under /notebook — search them and write just the module id (e.g. @tomlarkworthy/something) into " +
      "/notebook/answer.txt.",
    criteria: [
      { name: "bash_command_matches", args: { pattern: "\\b(grep|rg)\\b" }, weight: 1 },
      { name: "file_exists", args: { path: "/notebook/answer.txt" }, weight: 1 },
      { name: "answer_contains", args: { file: "/notebook/answer.txt", needle: "exporter-3" }, weight: 2 },
    ],
  },

  // ───────────────────────── value inspection (REQUIRE the value tools) ─────────────────────────
  // These can't be answered from source alone (or only tediously), and the prompt asks for the LIVE
  // value/error — so a full score needs the agent to actually USE inspect_value / list_values.
  {
    id: "inspect-runtime-error",
    category: "value-inspection",
    question:
      "The cell `amount` in @user/invoice is showing nothing — it seems to be failing at runtime. Use your " +
      "tools to find the exact runtime error it produces, and write that error message into /notebook/answer.txt.",
    setup: {
      files: {
        "/notebook/@user/invoice.js":
          // basePrice is undefined at runtime -> ReferenceError, NOT visible by reading source alone
          "const _amount = function amount(){ return basePrice * 1.2; };\n" +
          "export default function define(runtime, observer){\n" +
          "  const main = runtime.module();\n" +
          "  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn).pid = pid;\n" +
          "  $def(\"_amount\", \"amount\", [], _amount);\n  return main;\n}\n",
      },
    },
    criteria: [
      { name: "tool_used", args: { name: "inspect_value" }, weight: 2 },
      { name: "file_exists", args: { path: "/notebook/answer.txt" }, weight: 1 },
      { name: "answer_contains", args: { file: "/notebook/answer.txt", needle: "basePrice" }, weight: 1 },
      { name: "answer_contains", args: { file: "/notebook/answer.txt", needle: "not defined" }, weight: 1 },
    ],
  },
  {
    id: "inspect-live-value",
    category: "value-inspection",
    question:
      "@user/report has a cell `total`. Use your tools to check what it currently evaluates to in the running " +
      "notebook, and write just that number into /notebook/answer.txt.",
    setup: {
      files: {
        "/notebook/@user/report.js":
          "const _data = function data(){ return Array.from({length: 100}, (_, i) => i + 1); };\n" +
          "const _total = function total(data){ return data.reduce((a, b) => a + b, 0); };\n" +
          "export default function define(runtime, observer){\n" +
          "  const main = runtime.module();\n" +
          "  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn).pid = pid;\n" +
          "  $def(\"_data\", \"data\", [], _data);\n  $def(\"_total\", \"total\", [\"data\"], _total);\n  return main;\n}\n",
      },
    },
    criteria: [
      { name: "tool_used", args: { name: "inspect_value" }, weight: 2 },
      { name: "answer_contains", args: { file: "/notebook/answer.txt", needle: "5050" }, weight: 2 },
    ],
  },
  {
    id: "inspect-survey-largest",
    category: "value-inspection",
    question:
      "Survey the live values of the cells in @user/dashboard and tell me which cell currently holds the " +
      "largest number. Write that cell's name into /notebook/answer.txt.",
    setup: {
      files: {
        "/notebook/@user/dashboard.js":
          "const _visitors = function visitors(){ return 1240; };\n" +
          "const _signups = function signups(){ return 318; };\n" +
          "const _revenue = function revenue(){ return 9875; };\n" +
          "const _bounce = function bounce(){ return 47; };\n" +
          "export default function define(runtime, observer){\n" +
          "  const main = runtime.module();\n" +
          "  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn).pid = pid;\n" +
          "  $def(\"_visitors\", \"visitors\", [], _visitors);\n  $def(\"_signups\", \"signups\", [], _signups);\n" +
          "  $def(\"_revenue\", \"revenue\", [], _revenue);\n  $def(\"_bounce\", \"bounce\", [], _bounce);\n  return main;\n}\n",
      },
    },
    criteria: [
      // either list_values or repeated inspect_value is a valid way to survey — reward the survey tool,
      // but the outcome (correct cell) is the main signal and works with either approach.
      { name: "tool_used", args: { name: "list_values" }, weight: 1 },
      { name: "answer_contains", args: { file: "/notebook/answer.txt", needle: "revenue" }, weight: 2 },
      { name: "not_contains_string", args: { file: "/notebook/answer.txt", needle: "visitors" }, weight: 1 },
    ],
  },

  {
    id: "inspect-anonymous-cell",
    category: "value-inspection",
    question:
      "@user/vault has an unnamed (anonymous) cell — its source declares `const _secret = …` and registers " +
      "it with no name. Find what that cell currently evaluates to and write just the number into " +
      "/notebook/answer.txt.",
    // The anonymous cell folds a rolling hash over 1..100 — opaque to read, so the agent must inspect the
    // live runtime value (by pid; it has no name to reference) rather than computing it from source.
    setup: {
      files: {
        "/notebook/@user/vault.js":
          "const _secret = function _secret(){ return Array.from({length: 100}, (_, i) => i + 1).reduce((a, b) => (a * 31 + b) % 1000000007, 7); };\n" +
          "const _label = function label(){ return 'the answer'; };\n" +
          "export default function define(runtime, observer){\n" +
          "  const main = runtime.module();\n" +
          "  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn).pid = pid;\n" +
          "  $def(\"_secret\", null, [], _secret);\n  $def(\"_label\", \"label\", [], _label);\n  return main;\n}\n",
      },
    },
    criteria: [
      { name: "tool_used", args: { name: "inspect_value" }, weight: 2 },
      { name: "answer_contains", args: { file: "/notebook/answer.txt", needle: "791704969" }, weight: 2 },
    ],
  },

  // ───────────────────────── self-knowledge (understand its own architecture) ─────────────────────────
  // The agent runs inside a lopecode microkernel notebook and is itself a set of modules. These check it can
  // INVESTIGATE and answer deep questions about how it and the notebook are built — via bash on its own
  // source (/notebook) and the raw content blocks mirrored to /content (bootconf, bootloader, libraries,
  // file-attachment bytes), and via eval_js to transform raw ingredients in userspace (decompress a gzipped
  // attachment with FileAttachment + DecompressionStream). No fact here is in the system prompt verbatim.
  {
    id: "self-modules-roles",
    category: "self-knowledge",
    question:
      "You are implemented as several Observable modules in this notebook, each with a documented role (read " +
      "their names and header/doc cells — don't reverse-engineer the internals). Write to /notebook/answer.txt: " +
      "(1) the module that is your agent core, (2) the module that provides your bash shell, and (3) where that " +
      "shell's code is actually loaded from.",
    criteria: [
      { name: "bash_command_matches", args: { pattern: "robocoop-4" }, weight: 1 },
      { name: "answer_contains", args: { file: "/notebook/answer.txt", needle: "robocoop-4-core" }, weight: 1 },
      { name: "answer_contains", args: { file: "/notebook/answer.txt", needle: "robocoop-4-bash" }, weight: 1 },
      { name: "answer_contains", args: { file: "/notebook/answer.txt", needle: "attach", ignoreCase: true }, weight: 1 },
    ],
  },
  {
    id: "self-boot-mains",
    category: "self-knowledge",
    // bootconf.json is a raw content block mirrored to /content (not an editable /notebook module).
    question:
      "Read this notebook's own boot configuration — it's a raw content block in your filesystem, not a module " +
      "you can edit — and write the exact list of modules it boots at startup (its `mains`), one per line, to " +
      "/notebook/answer.txt.",
    criteria: [
      { name: "bash_command_matches", args: { pattern: "/content/bootconf" }, weight: 2 },
      { name: "answer_contains", args: { file: "/notebook/answer.txt", needle: "@tomlarkworthy/lopepage" }, weight: 1 },
      { name: "answer_contains", args: { file: "/notebook/answer.txt", needle: "@tomlarkworthy/robocoop-4-engine" }, weight: 1 },
      { name: "answer_contains", args: { file: "/notebook/answer.txt", needle: "@tomlarkworthy/inputs-reference" }, weight: 1 },
    ],
  },
  {
    id: "self-decode-attachment",
    category: "self-knowledge",
    // The shell can't gunzip (browser build) — the agent must fashion code: eval_js with FileAttachment +
    // DecompressionStream. The exact decompressed size only comes from actually decoding it.
    question:
      "Your bash shell is loaded from a gzipped file attachment bundled in this notebook. Find that attachment " +
      "in your filesystem, decompress it (the shell can't gunzip — you'll need to run code in userspace), and " +
      "write to /notebook/answer.txt: the attachment's id, and the exact byte length (digits only) of the " +
      "DECOMPRESSED bundle.",
    criteria: [
      { name: "tool_used", args: { name: "eval_js" }, weight: 2 },
      { name: "answer_contains", args: { file: "/notebook/answer.txt", needle: "just-bash.browser.js.gz" }, weight: 1 },
      { name: "answer_contains", args: { file: "/notebook/answer.txt", needle: "1142930" }, weight: 2 },
    ],
  },
  {
    id: "self-runtime-version",
    category: "self-knowledge",
    // The Observable runtime is bundled as a content block (id "@observablehq/runtime@6.0.0") mirrored to
    // /content — finding its version proves the notebook is self-contained, runtime bundled not fetched.
    question:
      "Which version of the Observable runtime does this notebook bundle? It's a raw content block in your " +
      "filesystem, not an editable module. Find it and write just the version number to /notebook/answer.txt.",
    criteria: [
      { name: "bash_command_matches", args: { pattern: "/content" }, weight: 1 },
      { name: "answer_contains", args: { file: "/notebook/answer.txt", needle: "6.0.0" }, weight: 2 },
    ],
  },
  {
    id: "self-live-edit-mechanism",
    category: "self-knowledge",
    question:
      "Explain how a change you make to a file under /notebook/ becomes live in the running notebook. Investigate " +
      "your own source, identify the module responsible, and describe the mechanism in one or two sentences. " +
      "Write your answer to /notebook/answer.txt.",
    criteria: [
      { name: "bash_command_matches", args: { pattern: "hostbridge|filesync|file-sync" }, weight: 1 },
      { name: "answer_contains", args: { file: "/notebook/answer.txt", needle: "sync", ignoreCase: true }, weight: 2 },
      { name: "answer_contains", args: { file: "/notebook/answer.txt", needle: "live", ignoreCase: true }, weight: 1 },
    ],
  },

  // ───────────────────────── refusal / clarification (don't fabricate) ─────────────────────────
  {
    id: "clarify-missing-symbol",
    category: "hallucination",
    question:
      "Rename the function `processOrder` to `fulfilOrder` everywhere in @user/shop. Search first; if it " +
      "isn't there, don't guess — tell me what you found and ask how to proceed.",
    setup: {
      files: {
        "/notebook/@user/shop.js":
          "const _cart = function cart(){return( [] )};\n" +
          "const _total = function total(){return( 0 )};\n" +
          "export default function define(runtime, observer){\n" +
          "  const main = runtime.module();\n" +
          "  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn).pid = pid;\n" +
          "  $def(\"_cart\", \"cart\", [], _cart);\n  $def(\"_total\", \"total\", [], _total);\n  return main;\n}\n",
      },
    },
    criteria: [
      { name: "bash_command_matches", args: { pattern: "\\b(grep|rg)\\b" }, weight: 1 },
      { name: "asks_clarification", args: {}, weight: 2 },
      { name: "not_contains_string", args: { file: "/notebook/@user/shop.js", needle: "fulfilOrder" }, weight: 1 },
    ],
  },
];
