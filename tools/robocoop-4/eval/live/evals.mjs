// Eval definitions for the robocoop-4 live harness. Each eval sends `question` to the real agent,
// then scores the resulting WorldSnapshot with the criteria below. setup.files seed fixtures into the
// workspace fs BEFORE the turn. Criterion names/args must exist in criteria.mjs (see CONTRACT catalog).
//
// Sync is REALTIME: /notebook/<id>.js files are kept in sync with the running notebook by the mounted
// jbFileSync watch loop (~600ms). The agent just reads/writes module files with bash — writing a full
// module file creates/updates a LIVE module automatically; there is no host_sync/host_apply tool.
// Runtime criteria (variable_equals/renders_svg/renders_element) read the live runtime after the watch
// loop applies; pure-compute criteria (cell_evaluates) read the workspace file and are independent of it.

const CORE = "@tomlarkworthy/robocoop-4-core";

export const EVALS = [
  // ───────────────────────── module-lifecycle ─────────────────────────
  {
    id: "module-create-and-remove",
    category: "module-lifecycle",
    question:
      "Create a new LIVE module @user/greet with a single cell named `greeting` that returns the string " +
      "\"hi\". Modules use the standard Observable format. Existing live modules are already projected to " +
      "/notebook/<id>.js — cat one (e.g. /notebook/" + CORE + ".js) to see the format, then " +
      "write /notebook/@user/greet.js as a full module file in exactly that format:\n" +
      "const _greeting = function greeting(){return( \"hi\" )};\n" +
      "export default function define(runtime, observer){\n" +
      "  const main = runtime.module();\n" +
      "  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn).pid = pid;\n" +
      "  $def(\"_greeting\", \"greeting\", [], _greeting);\n" +
      "  return main;\n" +
      "}\n" +
      "Writing the file registers the module live automatically within ~1s — no extra step. Also: the " +
      "seeded file /notebook/@user/legacy.js is obsolete — delete it with bash.",
    setup: {
      files: {
        "/notebook/@user/legacy.js":
          "const _old = function _old(){return( 'remove me' )};\n",
      },
    },
    criteria: [
      // workspace-file level (always checkable)
      { name: "file_exists", args: { path: "/notebook/@user/greet.js" }, weight: 1 },
      { name: "does_compile", args: { file: "/notebook/@user/greet.js" }, weight: 1 },
      { name: "contains_string", args: { file: "/notebook/@user/greet.js", needle: "\"hi\"" }, weight: 1 },
      { name: "file_absent", args: { path: "/notebook/@user/legacy.js" }, weight: 1 },
      // live level — likely surfaces the create-live gap as a WANTED finding
      { name: "module_exists", args: { id: "@user/greet" }, weight: 1 },
      { name: "module_absent", args: { id: "@user/legacy" }, weight: 1 },
      // efficiency
      { name: "tool_used", args: { name: "bash" }, weight: 1 },
    ],
  },

  // ───────────────────────── documentation ─────────────────────────
  {
    id: "document-seeded-module",
    category: "documentation",
    question:
      "Read the seeded module /notebook/@user/limiter.js. Then ADD a leading markdown documentation " +
      "cell to that same file describing what the module does. The doc MUST be at least 30 words and " +
      "MUST state the exact phrase \"rate limit is 7 requests per second\". Use a cell of the form " +
      "const _docs = function _docs(md){return( md`...your docs...` )}; and write it back into " +
      "/notebook/@user/limiter.js with bash. Keep the file parsing.",
    setup: {
      files: {
        "/notebook/@user/limiter.js":
          "const _limit = function _limit(){return( 7 )};\n" +
          "const _windowMs = function _windowMs(){return( 1000 )};\n",
      },
    },
    criteria: [
      { name: "file_exists", args: { path: "/notebook/@user/limiter.js" }, weight: 1 },
      { name: "min_words", args: { file: "/notebook/@user/limiter.js", count: 30 }, weight: 1 },
      { name: "contains_string", args: { file: "/notebook/@user/limiter.js", needle: "rate limit is 7 requests per second" }, weight: 2 },
      { name: "has_doc_comment", args: { module: "@user/limiter" }, weight: 1 },
      { name: "does_compile", args: { file: "/notebook/@user/limiter.js" }, weight: 1 },
    ],
  },

  // ───────────────────────── doc-comprehension ─────────────────────────
  {
    id: "doc-comprehension-rate-limit",
    category: "doc-comprehension",
    question:
      "Read the documentation in the seeded module /notebook/@user/config.js carefully. According to " +
      "its docs, what is the maximum batch size? Write ONLY your answer (the number) into a new file " +
      "/notebook/answer.txt using bash. Do not add any other text to that file.",
    setup: {
      files: {
        "/notebook/@user/config.js":
          "const _docs = function _docs(md){return( md`# Config\\n" +
          "This service processes records in batches. The maximum batch size is 42 records per call. " +
          "Exceeding it returns HTTP 413.` )};\n" +
          "const _maxBatch = function _maxBatch(){return( 42 )};\n",
      },
    },
    criteria: [
      { name: "file_exists", args: { path: "/notebook/answer.txt" }, weight: 1 },
      { name: "answer_contains", args: { file: "/notebook/answer.txt", needle: "42" }, weight: 2 },
    ],
  },

  // ───────────────────────── plot ─────────────────────────
  {
    id: "plot-bar-chart",
    category: "plot",
    question:
      "Build a bar chart with Observable Plot in the LIVE core module. EDIT " +
      "/notebook/" + CORE + ".js to add a cell named `chart`: add the declaration " +
      "`const _chart = function chart(Plot){return( Plot.barY([{x:'a',y:1},{x:'b',y:3},{x:'c',y:2}], " +
      "{x:'x', y:'y'}).plot() )};` AND register it inside define() with " +
      "`$def(\"_chart\", \"chart\", [\"Plot\"], _chart);`. Saving the file applies it live within ~1s, so " +
      "the chart renders automatically. The cell MUST reference Plot and produce an SVG.",
    criteria: [
      { name: "uses_plot", args: { file: "/notebook/" + CORE + ".js" }, weight: 1 },
      { name: "does_compile", args: { file: "/notebook/" + CORE + ".js" }, weight: 1 },
      // live render — applied by the watch loop
      { name: "variable_defined", args: { module: CORE, name: "chart" }, weight: 1 },
      { name: "renders_svg", args: { module: CORE, name: "chart" }, weight: 2 },
      { name: "variable_no_error", args: { module: CORE, name: "chart" }, weight: 1 },
    ],
  },

  // ───────────────────────── coding ─────────────────────────
  {
    id: "coding-sum",
    category: "coding",
    question:
      "Add a cell to the LIVE core module. EDIT /notebook/" + CORE + ".js to add a " +
      "cell named `sum` whose value is 42: add the declaration `const _sum = function sum(){return( 17 + 25 )};` " +
      "near the other top-level declarations AND register it inside the define() body with a line " +
      "`$def(\"_sum\", \"sum\", [], _sum);`. Saving the file applies it live within ~1s. sum must equal 42.",
    criteria: [
      { name: "contains_string", args: { file: "/notebook/" + CORE + ".js", needle: "sum" }, weight: 1 },
      { name: "does_compile", args: { file: "/notebook/" + CORE + ".js" }, weight: 1 },
      { name: "variable_defined", args: { module: CORE, name: "sum" }, weight: 1 },
      { name: "variable_equals", args: { module: CORE, name: "sum", equals: 42 }, weight: 2 },
      { name: "variable_no_error", args: { module: CORE, name: "sum" }, weight: 1 },
    ],
  },

  // ───────────────────────── code-quality ─────────────────────────
  {
    id: "code-quality-fizzbuzz",
    category: "code-quality",
    question:
      "Create a new workspace module file /notebook/@user/fizz.js with a single cell named " +
      "`fizzbuzz` that returns the FizzBuzz string for the numbers 1..15 joined by spaces " +
      "(e.g. \"1 2 Fizz 4 Buzz ...\"). Write CLEAN code: do NOT use the `var` keyword (use const/let), " +
      "keep all braces/brackets balanced, and prepend a markdown doc cell explaining what it does. " +
      "Writing the file applies it live automatically; the file content is what is scored.",
    criteria: [
      { name: "file_exists", args: { path: "/notebook/@user/fizz.js" }, weight: 1 },
      { name: "does_compile", args: { file: "/notebook/@user/fizz.js" }, weight: 1 },
      { name: "no_var_keyword", args: { file: "/notebook/@user/fizz.js" }, weight: 1 },
      { name: "balanced_braces", args: { file: "/notebook/@user/fizz.js" }, weight: 1 },
      { name: "has_doc_comment", args: { module: "@user/fizz" }, weight: 1 },
      { name: "contains_string", args: { file: "/notebook/@user/fizz.js", needle: "Fizz", ignoreCase: true }, weight: 1 },
    ],
  },

  // ───────────────────────── module-lifecycle (remove-only) ─────────────────────────
  {
    id: "module-remove-deprecated",
    category: "module-lifecycle",
    question:
      "The seeded module /notebook/@user/deprecated.js is no longer needed. Remove that file from the " +
      "workspace with bash. Do not touch any other files.",
    setup: {
      files: {
        "/notebook/@user/deprecated.js":
          "const _gone = function _gone(){return( 'delete me' )};\n",
      },
    },
    criteria: [
      { name: "file_absent", args: { path: "/notebook/@user/deprecated.js" }, weight: 2 },
      { name: "module_absent", args: { id: "@user/deprecated" }, weight: 1 },
      { name: "tool_used", args: { name: "bash" }, weight: 1 },
    ],
  },

  // ───────────────────────── coding (efficiency) ─────────────────────────
  {
    id: "coding-reverse-string",
    category: "coding",
    question:
      "Create a workspace module file /notebook/@user/rev.js with a single cell named `reversed` that " +
      "returns the string \"robocoop\" reversed (i.e. \"poocobor\") — " +
      "const reversed = function reversed(){return( 'robocoop'.split('').reverse().join('') )};. " +
      "Writing the file applies it live automatically. Be efficient: complete this in as few steps as possible.",
    criteria: [
      { name: "file_exists", args: { path: "/notebook/@user/rev.js" }, weight: 1 },
      { name: "does_compile", args: { file: "/notebook/@user/rev.js" }, weight: 1 },
      { name: "contains_string", args: { file: "/notebook/@user/rev.js", needle: "reverse" }, weight: 1 },
      { name: "cell_evaluates", args: { file: "/notebook/@user/rev.js", name: "reversed", equals: "poocobor" }, weight: 1 },
      { name: "max_steps", args: { n: 15 }, weight: 1 },
    ],
  },

  // ───────────────────────── documentation (README) ─────────────────────────
  {
    id: "document-write-readme",
    category: "documentation",
    question:
      "Write a README for the robocoop-4 notebook. Create /notebook/README.md (at least 40 words) that " +
      "explains that robocoop-4 is an embedded coding agent, and MUST include the exact phrase " +
      "\"just-bash workspace\". Use bash to write the file.",
    criteria: [
      { name: "file_exists", args: { path: "/notebook/README.md" }, weight: 1 },
      { name: "min_words", args: { file: "/notebook/README.md", count: 40 }, weight: 1 },
      { name: "contains_string", args: { file: "/notebook/README.md", needle: "just-bash workspace" }, weight: 2 },
      { name: "contains_string", args: { file: "/notebook/README.md", needle: "agent", ignoreCase: true }, weight: 1 },
    ],
  },

  // --- bash-tools: assert the right shell capability was actually used (the tool is always `bash`,
  // so we match the command text via bash_command_matches) ---------------------------------------
  {
    id: "bash-rename-sed",
    category: "bash-tools",
    question:
      "In /notebook/@user/widget.js, replace every occurrence of the word `alpha` with `omega` using " +
      "sed (edit the file in place). Keep the file valid JavaScript.",
    // `alpha` appears only as the literal target (never as a substring of another token), so a clean
    // rename leaves zero `alpha` — avoids the _foo/useFoo substring trap.
    setup: {
      files: {
        "/notebook/@user/widget.js":
          "const _label = function _label(){return( 'alpha' )};\n" +
          "const _phrase = function _phrase(){return( 'the alpha value' )};\n",
      },
    },
    criteria: [
      { name: "bash_command_matches", args: { pattern: "\\bsed\\b" }, weight: 2 },
      { name: "contains_string", args: { file: "/notebook/@user/widget.js", needle: "omega" }, weight: 1 },
      { name: "not_contains_string", args: { file: "/notebook/@user/widget.js", needle: "alpha" }, weight: 1 },
      { name: "does_compile", args: { file: "/notebook/@user/widget.js" }, weight: 1 },
    ],
  },

  {
    id: "bash-search-grep",
    category: "bash-tools",
    question:
      "Several files exist under /notebook/proj/. Exactly one of them contains the string " +
      "\"SENTINEL_TOKEN\". Find which file using grep, then write ONLY that file's path into " +
      "/notebook/found.txt using bash. Do not add any other text.",
    setup: {
      files: {
        "/notebook/proj/alpha.js": "const _a = function _a(){return( 'nothing here' )};\n",
        "/notebook/proj/beta.js": "const _b = function _b(){return( 'has SENTINEL_TOKEN inside' )};\n",
        "/notebook/proj/gamma.js": "const _c = function _c(){return( 'also nothing' )};\n",
      },
    },
    criteria: [
      { name: "bash_command_matches", args: { pattern: "\\b(grep|rg)\\b" }, weight: 2 },
      { name: "file_exists", args: { path: "/notebook/found.txt" }, weight: 1 },
      { name: "answer_contains", args: { file: "/notebook/found.txt", needle: "beta.js" }, weight: 2 },
      { name: "not_contains_string", args: { file: "/notebook/found.txt", needle: "alpha" }, weight: 1 },
    ],
  },

  // --- hallucination: impossible / under-specified requests. The right behaviour is to investigate
  // and then ASK a clarifying question ("?") rather than fabricate an answer or edit -----------------
  {
    id: "clarify-missing-target",
    category: "hallucination",
    question:
      "Rename the function `processPayment` to `handlePayment` everywhere in the project under " +
      "/notebook/proj/. Search first, and if you cannot find it, do not guess — tell me what you found " +
      "and ask me how to proceed.",
    setup: {
      files: {
        "/notebook/proj/util.js": "const _add = function _add(a, b){return( a + b )};\n",
        "/notebook/proj/main.js": "const _run = function _run(add){return( add(2, 3) )};\n",
      },
    },
    criteria: [
      { name: "bash_command_matches", args: { pattern: "\\b(grep|rg)\\b" }, weight: 1 },
      { name: "asks_clarification", args: {}, weight: 2 },
      { name: "not_contains_string", args: { file: "/notebook/proj/util.js", needle: "handlePayment" }, weight: 1 },
      { name: "not_contains_string", args: { file: "/notebook/proj/main.js", needle: "handlePayment" }, weight: 1 },
    ],
  },

  // ───────────────────────── ui (construction with standard Inputs/htl blocks) ─────────────────────
  // The point: prefer the idiomatic standard building block over a hand-rolled DOM/HTML string. We
  // assert the standard block is used AND (for the live one) that it actually renders an element.
  {
    id: "ui-inputs-table-live",
    category: "ui",
    question:
      "Build a data table UI in the LIVE core module. EDIT /notebook/" + CORE + ".js " +
      "to add a cell named `peopleTable` using the STANDARD Observable Inputs table (Inputs.table) — do " +
      "NOT hand-build an HTML <table>. Add the declaration `const _peopleTable = function peopleTable(Inputs)" +
      "{return( Inputs.table([{name:'Ada',age:36},{name:'Alan',age:41}]) )};` AND register it inside " +
      "define() with `$def(\"_peopleTable\", \"peopleTable\", [\"Inputs\"], _peopleTable);`. Saving the " +
      "file applies it live within ~1s so it renders automatically.",
    criteria: [
      { name: "contains_string", args: { file: "/notebook/" + CORE + ".js", needle: "Inputs.table" }, weight: 2 },
      { name: "not_contains_string", args: { file: "/notebook/" + CORE + ".js", needle: "<table" }, weight: 1 },
      { name: "does_compile", args: { file: "/notebook/" + CORE + ".js" }, weight: 1 },
      { name: "variable_no_error", args: { module: CORE, name: "peopleTable" }, weight: 1 },
      { name: "renders_element", args: { module: CORE, name: "peopleTable" }, weight: 2 },
    ],
  },

  {
    id: "htl-template-card",
    category: "ui",
    question:
      "Create a workspace module file /notebook/@user/card.js with a single cell named `card` that " +
      "builds a small card using an htl HTML template (the html`` tagged template) — NOT string " +
      "concatenation. The card must contain an <h2> with the text \"Hello\" and a <p>. Use exactly the " +
      "form: const card = function card(html){return( html`<div class=\"card\"><h2>Hello</h2>" +
      "<p>world</p></div>` )};.",
    criteria: [
      { name: "file_exists", args: { path: "/notebook/@user/card.js" }, weight: 1 },
      { name: "contains_string", args: { file: "/notebook/@user/card.js", needle: "html`" }, weight: 2 },
      { name: "contains_string", args: { file: "/notebook/@user/card.js", needle: "<h2>Hello" }, weight: 1 },
      { name: "not_contains_string", args: { file: "/notebook/@user/card.js", needle: "createElement" }, weight: 1 },
      { name: "does_compile", args: { file: "/notebook/@user/card.js" }, weight: 1 },
    ],
  },

  {
    id: "ui-prefer-inputs-password",
    category: "ui",
    question:
      "Create a workspace module file /notebook/@user/login.js with a single cell named `apiKeyField` " +
      "that is a masked password input. Use the STANDARD Observable Inputs.password component — do NOT " +
      "hand-roll an <input type=\"password\">. Use exactly: const apiKeyField = function apiKeyField(Inputs)" +
      "{return( Inputs.password({label: 'API key', placeholder: 'sk-…'}) )};.",
    criteria: [
      { name: "file_exists", args: { path: "/notebook/@user/login.js" }, weight: 1 },
      { name: "contains_string", args: { file: "/notebook/@user/login.js", needle: "Inputs.password" }, weight: 2 },
      { name: "not_contains_string", args: { file: "/notebook/@user/login.js", needle: "type=\"password\"" }, weight: 1 },
      { name: "does_compile", args: { file: "/notebook/@user/login.js" }, weight: 1 },
    ],
  },

  // ───────────────────────── dataflow (reactive array state) ─────────────────────────
  {
    id: "dataflow-inputs-input",
    category: "dataflow",
    question:
      "We need a settable, reactive ARRAY of plugins that other cells can read and that downstream cells " +
      "recompute from when it changes. Create a workspace module file /notebook/@user/registry.js with " +
      "the idiomatic Observable pattern for reactive array state: a viewof cell backed by Inputs.input " +
      "seeded with an empty array. Use exactly: const _registry = function _registry(Inputs){return( " +
      "Inputs.input([]) )};. Do NOT use a `mutable` cell or a hand-rolled object with .value/dispatchEvent.",
    criteria: [
      { name: "file_exists", args: { path: "/notebook/@user/registry.js" }, weight: 1 },
      { name: "contains_string", args: { file: "/notebook/@user/registry.js", needle: "Inputs.input" }, weight: 2 },
      { name: "contains_string", args: { file: "/notebook/@user/registry.js", needle: "[]" }, weight: 1 },
      { name: "not_contains_string", args: { file: "/notebook/@user/registry.js", needle: "mutable" }, weight: 1 },
      { name: "not_contains_string", args: { file: "/notebook/@user/registry.js", needle: "dispatchEvent" }, weight: 1 },
      { name: "does_compile", args: { file: "/notebook/@user/registry.js" }, weight: 1 },
    ],
  },

  // ───────────────────────── doc-lookup (use the bundled Inputs reference) ─────────────────────────
  // The @tomlarkworthy/inputs-reference module is booted in the bundle, so the watch loop auto-projects
  // it to /notebook/@tomlarkworthy/inputs-reference.js on mount. The agent must consult it (grep/cat) to
  // answer rather than guess. The toggle docs list the options: label, value, values, disabled.
  {
    id: "doc-lookup-toggle-options",
    category: "doc-lookup",
    question:
      "I want to know every option you can pass to Inputs.toggle. This notebook bundles a reference " +
      "module whose source is already projected to /notebook/@tomlarkworthy/inputs-reference.js. Use " +
      "bash (grep/cat) on that file to find the documented Inputs.toggle options. Do NOT " +
      "guess from memory. Write the list of option names, one per line, into /notebook/answer.txt.",
    criteria: [
      { name: "bash_command_matches", args: { pattern: "\\b(grep|rg|cat|less|head|tail|sed|awk)\\b" }, weight: 1 },
      { name: "file_exists", args: { path: "/notebook/answer.txt" }, weight: 1 },
      { name: "answer_contains", args: { file: "/notebook/answer.txt", needle: "label" }, weight: 1 },
      { name: "answer_contains", args: { file: "/notebook/answer.txt", needle: "value" }, weight: 1 },
      { name: "answer_contains", args: { file: "/notebook/answer.txt", needle: "values" }, weight: 1 },
      { name: "answer_contains", args: { file: "/notebook/answer.txt", needle: "disabled" }, weight: 1 },
    ],
  },

  // doc-lookup + anti-hallucination: Inputs.tabbedPane does NOT exist. The agent must consult the
  // bundled reference, find nothing, and REFUSE to invent arguments — report the absence and ask,
  // rather than fabricating a plausible-looking option list from memory.
  {
    id: "doc-lookup-nonexistent-tabbedpane",
    category: "hallucination",
    question:
      "What are all the arguments to Inputs.tabbedPane? Look it up in the bundled reference (already " +
      "projected to /notebook/@tomlarkworthy/inputs-reference.js): do a SINGLE focused grep for " +
      "\"tabbedPane\" in that file. If that grep finds nothing, STOP searching " +
      "immediately — do NOT try other spellings, and do NOT invent arguments. In that case your final " +
      "reply must say you could not find Inputs.tabbedPane documented and ask me how I would like to " +
      "proceed (end with a question).",
    criteria: [
      { name: "bash_command_matches", args: { pattern: "\\b(grep|rg|cat|less|head|tail|sed|awk)\\b" }, weight: 1 },
      { name: "asks_clarification", args: {}, weight: 2 },
      // It must not have manufactured a workspace answer file full of fabricated options.
      { name: "file_absent", args: { path: "/notebook/answer.txt" }, weight: 1 },
    ],
  },

  // ───────────────────────── dataflow (reactive wiring between cells) ─────────────────────────
  // robocoop-2's create_dataflow_svg tests THE core Observable concept our suite was missing: a cell
  // that DEPENDS ON an upstream cell and recomputes from it. We check the dependent value is correct
  // AND that its source actually references the upstream identifier (not a hard-coded constant).
  {
    id: "dataflow-reactive-wire",
    category: "dataflow",
    question:
      "Create a workspace module file /notebook/@user/wire.js with TWO cells: an upstream cell " +
      "const factor = function factor(){return( 6 )}; and a DOWNSTREAM cell `scaled` that depends on " +
      "factor and returns factor multiplied by 7 — i.e. const scaled = function scaled(factor)" +
      "{return( factor * 7 )};. The downstream cell MUST read `factor` as an input, not hard-code 42. " +
      "Writing the file applies it live automatically; scaled must equal 42.",
    criteria: [
      { name: "file_exists", args: { path: "/notebook/@user/wire.js" }, weight: 1 },
      { name: "does_compile", args: { file: "/notebook/@user/wire.js" }, weight: 1 },
      { name: "uses_identifier", args: { file: "/notebook/@user/wire.js", ident: "factor" }, weight: 1 },
      // deterministic wiring proof: TWO inputs give TWO correct outputs, so scaled can't be a constant.
      { name: "cell_evaluates", args: { file: "/notebook/@user/wire.js", name: "scaled", inputs: { factor: 6 }, equals: 42 }, weight: 2 },
      { name: "cell_evaluates", args: { file: "/notebook/@user/wire.js", name: "scaled", inputs: { factor: 10 }, equals: 70 }, weight: 2 },
    ],
  },

  // ───────────────────────── library (builtin stdlib usage + dependency) ─────────────────────────
  {
    id: "library-d3-usage",
    category: "library",
    question:
      "Use the d3 library (it is available in the runtime — declare it as a cell input, do NOT import a " +
      "URL). Create a workspace module file /notebook/@user/stat.js with a single cell " +
      "const total = function total(d3){return( d3.sum([1,2,3,4,5]) )};. Writing the file applies it " +
      "live automatically. total must equal 15 and the cell must use d3.sum (not a hand-written loop).",
    criteria: [
      { name: "file_exists", args: { path: "/notebook/@user/stat.js" }, weight: 1 },
      { name: "contains_string", args: { file: "/notebook/@user/stat.js", needle: "d3.sum" }, weight: 2 },
      { name: "does_compile", args: { file: "/notebook/@user/stat.js" }, weight: 1 },
      { name: "cell_evaluates", args: { file: "/notebook/@user/stat.js", name: "total", equals: 15 }, weight: 2 },
    ],
  },

  // ───────────────────────── library (external ESM import + correct API use) ─────────────────────────
  {
    id: "library-import-esm",
    category: "library",
    question:
      "Create a new LIVE module @user/dates that imports the date-fns library from a CDN and formats a " +
      "date. Write /notebook/@user/dates.js as a full module with TWO cells:\n" +
      "const _dateFns = function dateFns(){return( import('https://cdn.jsdelivr.net/npm/date-fns@4.1.0/+esm') )};\n" +
      "const _formatted = function formatted(dateFns){return( dateFns.format(new Date(2020, 0, 1), 'yyyy-MM-dd') )};\n" +
      "export default function define(runtime, observer){\n" +
      "  const main = runtime.module();\n" +
      "  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn).pid = pid;\n" +
      "  $def(\"_dateFns\", \"dateFns\", [], _dateFns);\n" +
      "  $def(\"_formatted\", \"formatted\", [\"dateFns\"], _formatted);\n" +
      "  return main;\n" +
      "}\n" +
      "Writing the file applies it live automatically. formatted must equal the string \"2020-01-01\", " +
      "produced by dateFns.format (do not hard-code the string).",
    criteria: [
      // deterministic file checks (always scorable); the live value is the end-to-end ESM-import proof.
      { name: "file_exists", args: { path: "/notebook/@user/dates.js" }, weight: 1 },
      { name: "contains_string", args: { file: "/notebook/@user/dates.js", needle: "date-fns" }, weight: 1 },
      { name: "contains_string", args: { file: "/notebook/@user/dates.js", needle: "dateFns.format" }, weight: 1 },
      { name: "does_compile", args: { file: "/notebook/@user/dates.js" }, weight: 1 },
      { name: "variable_equals", args: { module: "@user/dates", name: "formatted", equals: "2020-01-01" }, weight: 2 },
    ],
  },

  // ───────────────────────── coding (real algorithm, verified by value) ─────────────────────────
  // robocoop-2's matrix_eig verifies an algorithm over multiple inputs; ours were trivial (sum=42).
  {
    id: "coding-algorithm-fib",
    category: "coding",
    question:
      "Create a workspace module file /notebook/@user/fib.js with a single cell named `fib15` whose " +
      "value is the 15th Fibonacci number, where F(1)=1 and F(2)=1 (so the sequence is " +
      "1,1,2,3,5,8,...). Compute it with a loop or recursion — do NOT just write the literal, and do " +
      "NOT write the number 610 anywhere in the file (not even in a comment). Writing the file applies " +
      "it live automatically. fib15 must equal 610.",
    criteria: [
      { name: "file_exists", args: { path: "/notebook/@user/fib.js" }, weight: 1 },
      { name: "does_compile", args: { file: "/notebook/@user/fib.js" }, weight: 1 },
      { name: "not_contains_string", args: { file: "/notebook/@user/fib.js", needle: "610" }, weight: 1 },
      { name: "cell_evaluates", args: { file: "/notebook/@user/fib.js", name: "fib15", equals: 610 }, weight: 2 },
    ],
  },

  // ───────────────────────── debugging (fix broken code so it computes the right value) ──────────
  {
    id: "debug-fix-reduce",
    category: "debugging",
    question:
      "The cell `sumWrong` in the seeded file /notebook/@user/buggy.js is meant to compute the SUM of " +
      "[1,2,3] (which is 6) but it returns the wrong value. Read the file, find the bug, fix it in " +
      "place. Writing the file applies it live automatically. sumWrong must equal 6.",
    setup: {
      files: {
        // reduce uses * with seed 0 → always 0; correct fix is + (or seed 1 for product semantics, but
        // the spec says SUM). A multiplicative bug the agent must diagnose, not a syntax error.
        "/notebook/@user/buggy.js":
          "const _sumWrong = function _sumWrong(){return( [1,2,3].reduce((acc, n) => acc * n, 0) )};\n",
      },
    },
    criteria: [
      { name: "file_exists", args: { path: "/notebook/@user/buggy.js" }, weight: 1 },
      { name: "contains_string", args: { file: "/notebook/@user/buggy.js", needle: "reduce" }, weight: 1 },
      { name: "does_compile", args: { file: "/notebook/@user/buggy.js" }, weight: 1 },
      { name: "cell_evaluates", args: { file: "/notebook/@user/buggy.js", name: "sumWrong", equals: 6 }, weight: 2 },
    ],
  },

  // ───────────────────────── comprehension (needle in haystack: locate the responsible cell) ─────
  // robocoop-2 flagged this as a TODO ("Which cell is responsible for opening the code editor on
  // click?"). Names don't contain "editor", so the agent must read the bodies, not grep the names.
  {
    id: "comprehension-locate-cell",
    category: "comprehension",
    question:
      "Read the seeded module /notebook/@user/app.js. Several cells make up a small app. Which single " +
      "cell defines the function that runs WHEN a cell is clicked (the click handler)? Write ONLY that " +
      "cell's name (no quotes, no other text) into /notebook/answer.txt using bash.",
    setup: {
      files: {
        "/notebook/@user/app.js":
          "const _styles = function _styles(){return( '.cell{cursor:pointer}' )};\n" +
          "const _renderToolbar = function _renderToolbar(){return( 'toolbar markup' )};\n" +
          "const _launchPanel = function _launchPanel(){return( (cell) => { /* opens the code editor */ } )};\n" +
          "const _handleCellClick = function _handleCellClick(launchPanel){return( (cell) => launchPanel(cell) )};\n" +
          "const _saveAll = function _saveAll(){return( () => {} )};\n",
      },
    },
    criteria: [
      { name: "file_exists", args: { path: "/notebook/answer.txt" }, weight: 1 },
      { name: "answer_contains", args: { file: "/notebook/answer.txt", needle: "handleCellClick" }, weight: 2 },
      { name: "not_contains_string", args: { file: "/notebook/answer.txt", needle: "saveAll" }, weight: 1 },
    ],
  },

  // ───────────────────────── ui (composite form, not a single input) ─────────────────────────
  {
    id: "ui-composite-form",
    category: "ui",
    question:
      "Create a new LIVE module @user/rect with a COMPOSITE form cell (multiple fields in one cell) using " +
      "the standard Inputs.form combinator. Write /notebook/@user/rect.js as a full module:\n" +
      "const _rectForm = function rectForm(Inputs){return( Inputs.form({width: Inputs.range([1,200]," +
      "{label:'width',step:1}), height: Inputs.range([1,200],{label:'height',step:1})}) )};\n" +
      "export default function define(runtime, observer){\n" +
      "  const main = runtime.module();\n" +
      "  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn).pid = pid;\n" +
      "  $def(\"_rectForm\", \"rectForm\", [\"Inputs\"], _rectForm);\n" +
      "  return main;\n" +
      "}\n" +
      "Writing the file registers and renders the module live automatically within ~1s.",
    criteria: [
      { name: "file_exists", args: { path: "/notebook/@user/rect.js" }, weight: 1 },
      { name: "contains_string", args: { module: "@user/rect", var: "rectForm", needle: "Inputs.form" }, weight: 2 },
      { name: "does_compile", args: { file: "/notebook/@user/rect.js" }, weight: 1 },
      { name: "variable_no_error", args: { module: "@user/rect", name: "rectForm" }, weight: 1 },
      { name: "renders_element", args: { module: "@user/rect", name: "rectForm" }, weight: 2 },
    ],
  },
];
