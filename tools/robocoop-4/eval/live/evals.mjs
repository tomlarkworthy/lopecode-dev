// Eval definitions for the robocoop-4 live harness. Each eval sends `question` to the real agent,
// then scores the resulting WorldSnapshot with the criteria below. setup.files seed fixtures into the
// workspace fs BEFORE the turn. Criterion names/args must exist in criteria.mjs (see CONTRACT catalog).
//
// Workspace vs live: the agent's bash/host_sync operate on the workspace fs (/notebook/<id>.js);
// host_apply pushes an EDITED workspace file back into an EXISTING live module. There is no create-live
// path, so module-lifecycle deliberately checks BOTH file-level and live-level so the gap surfaces as a
// partial score. Runtime criteria (variable_equals/renders_svg) require a successful host_apply into a
// live module, so coding/plot/code-quality evals are ALSO checkable at the workspace-file level to keep
// signal even when live apply is unavailable.

const CORE = "@tomlarkworthy/robocoop-4-core";

export const EVALS = [
  // ───────────────────────── module-lifecycle ─────────────────────────
  {
    id: "module-create-and-remove",
    category: "module-lifecycle",
    question:
      "Two tasks in the /notebook workspace. (1) Create a new module file at " +
      "/notebook/@user/greet.js containing a single cell that returns the string \"hi\": " +
      "const _greeting = function _greeting(){return( \"hi\" )};\n " +
      "(2) The seeded module /notebook/@user/legacy.js is obsolete — delete that file entirely. " +
      "Use bash in the workspace. If you can also register the new module live and remove the legacy " +
      "live module, do so with host_apply, but the file operations are the priority.",
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
      "Build a bar chart with Observable Plot. Edit the LIVE core module file " +
      "/notebook/" + CORE + ".js: append a cell named `chart` that returns " +
      "Plot.barY([{x:'a',y:1},{x:'b',y:3},{x:'c',y:2}], {x:'x', y:'y'}).plot() — " +
      "i.e. const chart = function chart(Plot){return( Plot.barY([...]).plot() )};. " +
      "Then run host_apply on /notebook/" + CORE + ".js so the chart renders in the live runtime. " +
      "The cell MUST reference Plot and produce an SVG.",
    criteria: [
      { name: "uses_plot", args: { file: "/notebook/" + CORE + ".js" }, weight: 1 },
      { name: "does_compile", args: { file: "/notebook/" + CORE + ".js" }, weight: 1 },
      // live render — needs successful host_apply
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
      "The live core module /notebook/" + CORE + ".js has seeded cells a (=17) and b (=25). " +
      "Add a cell named `sum` that returns a + b — i.e. " +
      "const sum = function sum(a,b){return( a + b )};. Append it to /notebook/" + CORE + ".js, " +
      "then run host_apply so sum is evaluated live. sum must equal 42.",
    setup: {
      files: {
        // seeded into the workspace; the agent appends `sum` and host_applies the whole file.
        "/notebook/seed-coding.txt":
          "Append these to " + CORE + ".js if not already present:\n" +
          "const a = function a(){return( 17 )};\n" +
          "const b = function b(){return( 25 )};\n",
      },
    },
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
      "If possible also host_apply it, but the file is what is scored.",
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
      "workspace with bash. If the module is also live, remove it from the live runtime with the host " +
      "tools. Do not touch any other files.",
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
      "Then host_apply it if you can. Be efficient: complete this in as few steps as possible.",
    criteria: [
      { name: "file_exists", args: { path: "/notebook/@user/rev.js" }, weight: 1 },
      { name: "does_compile", args: { file: "/notebook/@user/rev.js" }, weight: 1 },
      { name: "contains_string", args: { file: "/notebook/@user/rev.js", needle: "reverse" }, weight: 1 },
      { name: "variable_equals", args: { module: "@user/rev", name: "reversed", equals: "poocobor" }, weight: 1 },
      { name: "max_steps", args: { n: 8 }, weight: 1 },
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

  {
    id: "clarify-ambiguous-request",
    category: "hallucination",
    question:
      "Update the timeout to the new value in the config so it matches what we agreed.",
    criteria: [
      { name: "asks_clarification", args: {}, weight: 2 },
      { name: "max_steps", args: { n: 8 }, weight: 1 },
    ],
  },
];
