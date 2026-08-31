// robocoop-5 capability evals — two abilities the shared robocoop-4 suite does not exercise:
//
//  1. VENDORING (category "vendoring"). Pull a package off the network ONCE and bundle its bytes into
//     the notebook as a module FileAttachment, so the notebook keeps working with no network. This is
//     what makes a lopecode notebook a single self-contained file; a cell that imports from a CDN looks
//     identical in source and is not the same thing. Graded on snapshot.attachments (the inventory the
//     exporter serializes) plus the live values the vendored library produces.
//  2. REFLECTION (category "reflection"). Work out how a library behaves by RUNNING it — the returned
//     object's introspection API, an undocumented function's calling convention — instead of recalling
//     it. Ground truths are chosen so recall cannot supply them: Plot's scale RANGE falls out of its
//     default width/height/margins, and the planted @user/kiln library exists nowhere but this file.
//
// Every eval carries an `oracle`: a scripted reference solution the driver can run instead of a model
// (`run.mjs --oracle`). It costs nothing and proves the criteria are satisfiable — see the README.
//
// The network is stubbed by setup.routes, so no run depends on a live CDN.

import { TINY_CHUNK_URL, TINY_CHUNK_SRC, REPORT_SRC, KILN_SRC } from "./fixtures.mjs";

const ROUTE_TINY_CHUNK = {
  url: TINY_CHUNK_URL,
  contentType: "text/javascript",
  body: TINY_CHUNK_SRC,
};

// Reference-solution fragment: fetch the package and hang its bytes off a module's FileAttachment map.
// Scoped to @tomlarkworthy/fileattachments because that is where setFileAttachment is a cell; the
// second argument is the OWNING module (it defaults to the fileattachments module itself, which would
// silently attach the file to the wrong module).
const attachTinyChunk = (moduleId, fileName = "tiny-chunk.js") => ({
  tool: "eval_js",
  args: {
    module: "@tomlarkworthy/fileattachments",
    code:
      // Locals must not collide with a cell of @tomlarkworthy/fileattachments: eval_js binds every
      // referenced cell name as a parameter, and `file` IS a cell there ("Identifier 'file' has
      // already been declared").
      `const pkgText = await (await fetch(${JSON.stringify(TINY_CHUNK_URL)})).text();\n` +
      `const pkgFile = new File([pkgText], ${JSON.stringify(fileName)}, { type: "text/javascript" });\n` +
      `await setFileAttachment(pkgFile, window.__ojs_runtime.mains.get(${JSON.stringify(moduleId)}));\n` +
      `return "attached " + ${JSON.stringify(fileName)} + " to " + ${JSON.stringify(moduleId)};`,
  },
});

const CHUNKER_SKELETON = `const _intro = function intro(md){return( md\`# chunker\` )};
export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn).pid = pid;
  $def("_intro", "intro", ["md"], _intro);
  return main;
}
`;

const CHUNKER_SOLUTION = `const _intro = function intro(md){return( md\`# chunker — tiny-chunk, bundled\` )};
const _tinyChunk = async function tinyChunk(FileAttachment){
  return await import(await FileAttachment("tiny-chunk.js").url());
};
const _chunked = function chunked(tinyChunk){return( tinyChunk.chunk([1, 2, 3, 4, 5, 6, 7], 3) )};
const _libVersion = function libVersion(tinyChunk){return( tinyChunk.VERSION )};
export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn).pid = pid;
  $def("_intro", "intro", ["md"], _intro);
  $def("_tinyChunk", "tinyChunk", ["FileAttachment"], _tinyChunk);
  $def("_chunked", "chunked", ["tinyChunk"], _chunked);
  $def("_libVersion", "libVersion", ["tinyChunk"], _libVersion);
  return main;
}
`;

const PLOTINTRO_SOLUTION = `const _chart = function chart(Plot){return(
  Plot.plot({ marks: [Plot.dot([{a: 1, b: 10}, {a: 5, b: 50}], {x: "a", y: "b"})] })
)};
const _chartTag = function chartTag(chart){return( chart.tagName.toLowerCase() )};
const _yScaleType = function yScaleType(chart){return( chart.scale("y").type )};
const _yScaleDomain = function yScaleDomain(chart){return( chart.scale("y").domain )};
const _yScaleRange = function yScaleRange(chart){return( chart.scale("y").range )};
export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn).pid = pid;
  $def("_chart", "chart", ["Plot"], _chart);
  $def("_chartTag", "chartTag", ["chart"], _chartTag);
  $def("_yScaleType", "yScaleType", ["chart"], _yScaleType);
  $def("_yScaleDomain", "yScaleDomain", ["chart"], _yScaleDomain);
  $def("_yScaleRange", "yScaleRange", ["chart"], _yScaleRange);
  return main;
}
`;

const KILNUSE_SOLUTION = `const _numbers = function numbers(){return( [4, 8, 15, 16, 23, 42] )};
const _kilnSteps = function kilnSteps(kiln){return( [...kiln.steps].sort() )};
const _kilnResult = function kilnResult(kiln, numbers, kilnSteps){return(
  kiln({ source: numbers, recipe: kilnSteps })
)};
export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn).pid = pid;
  $def("_numbers", "numbers", [], _numbers);
  $def("_kilnSteps", "kilnSteps", ["kiln"], _kilnSteps);
  $def("_kilnResult", "kilnResult", ["kiln", "numbers", "kilnSteps"], _kilnResult);
  main.define("module @user/kiln", async () => runtime.module((await import("@user/kiln")).default));
  main.define("kiln", ["module @user/kiln", "@variable"], (_, v) => v.import("kiln", _));
  return main;
}
`;

export const CAPABILITY_EVALS = [
  // ───────────────────────── vendoring an npm package as a FileAttachment ─────────────────────────
  {
    id: "vendor-npm-attachment",
    category: "vendoring",
    question:
      "I want to use a small npm package, tiny-chunk 3.1.4. Its ES module build is at " +
      TINY_CHUNK_URL + " and it exports chunk(array, size) and VERSION. Bundle the package INTO this " +
      "notebook so the notebook still works with the network unplugged: the module that uses it must " +
      "not fetch or import anything over the network when it runs, and must not contain a copy of the " +
      "library's code. Then in a new module @user/chunker add a cell `chunked` = chunk([1,2,3,4,5,6,7], 3) " +
      "and a cell `libVersion` = the library's VERSION, both computed by the bundled library.",
    setup: { routes: [ROUTE_TINY_CHUNK] },
    criteria: [
      { name: "module_exists", args: { id: "@user/chunker" }, weight: 1 },
      // the package's bytes are in the notebook's attachment store — the surface the exporter writes out
      { name: "attachment_contains", args: { needle: "export function chunk" }, weight: 3 },
      // …and the module reads them from there, durably (a cell, not a one-off eval_js poke)
      { name: "contains_string", args: { file: "/src/@user/chunker.js", needle: "FileAttachment" }, weight: 2 },
      // no runtime network dependency
      { name: "not_contains_string", args: { file: "/src/@user/chunker.js", needle: "eval.test" }, weight: 2 },
      // `__tcOut` is internal to tiny-chunk: it can only appear here if the library was pasted in
      { name: "not_contains_string", args: { file: "/src/@user/chunker.js", needle: "__tcOut" }, weight: 2 },
      { name: "live_value_contains", args: { module: "@user/chunker", name: "chunked", needle: "[[1,2,3],[4,5,6],[7]]" }, weight: 3 },
      { name: "variable_equals", args: { module: "@user/chunker", name: "libVersion", equals: "3.1.4" }, weight: 2 },
      { name: "variable_no_error", args: { module: "@user/chunker" }, weight: 1 },
    ],
    oracle: [
      { tool: "write_file", args: { file_path: "/src/@user/chunker.js", content: CHUNKER_SKELETON } },
      attachTinyChunk("@user/chunker"),
      { tool: "write_file", args: { file_path: "/src/@user/chunker.js", content: CHUNKER_SOLUTION }, settleMs: 500 },
    ],
  },

  // ───────────────────── the same capability as MAINTENANCE: make an existing module offline ─────────
  {
    id: "vendor-offline-report",
    category: "vendoring",
    question:
      "@user/report downloads the tiny-chunk library from the internet every time it runs, so it breaks " +
      "offline. Bundle that library into the notebook and rewire @user/report to use the bundled copy — " +
      "no network access at run time, and don't paste the library's source into the module. `pages` must " +
      "keep the value it has now.",
    setup: { routes: [ROUTE_TINY_CHUNK], files: { "/src/@user/report.js": REPORT_SRC } },
    criteria: [
      { name: "attachment_contains", args: { needle: "export function chunk" }, weight: 3 },
      { name: "contains_string", args: { file: "/src/@user/report.js", needle: "FileAttachment" }, weight: 2 },
      { name: "not_contains_string", args: { file: "/src/@user/report.js", needle: "eval.test" }, weight: 3 },
      { name: "not_contains_string", args: { file: "/src/@user/report.js", needle: "__tcOut" }, weight: 2 },
      { name: "live_value_contains", args: { module: "@user/report", name: "pages", needle: "[[1,2,3,4],[5,6,7,8],[9,10]]" }, weight: 3 },
      { name: "variable_no_error", args: { module: "@user/report" }, weight: 1 },
    ],
    oracle: [
      attachTinyChunk("@user/report"),
      { tool: "edit_file", args: {
        file_path: "/src/@user/report.js",
        old_string: `const _tinyChunk = async function tinyChunk(){
  const src = await (await fetch("${TINY_CHUNK_URL}")).text();
  return await import(URL.createObjectURL(new Blob([src], { type: "text/javascript" })));
};`,
        new_string: `const _tinyChunk = async function tinyChunk(FileAttachment){
  return await import(await FileAttachment("tiny-chunk.js").url());
};`,
      } },
      { tool: "edit_file", args: {
        file_path: "/src/@user/report.js",
        old_string: `$def("_tinyChunk", "tinyChunk", [], _tinyChunk);`,
        new_string: `$def("_tinyChunk", "tinyChunk", ["FileAttachment"], _tinyChunk);`,
      }, settleMs: 500 },
    ],
  },

  // ───────────────────── reflection: work out a real library's model by running it ─────────────────
  // Anti-recall anchor: yScaleRange. Plot derives it from the default width/height/margins of the
  // bundled build, so it cannot be answered from memory of the API — only by rendering the chart.
  {
    id: "reflect-plot-scales",
    category: "reflection",
    question:
      "I want to know what Observable Plot hands back, not what the docs say. Take exactly this chart: " +
      "Plot.plot({marks: [Plot.dot([{a: 1, b: 10}, {a: 5, b: 50}], {x: \"a\", y: \"b\"})]}). Run it in this " +
      "notebook and find the API on the value it returns that reports how a scale was configured. Then in " +
      "a new module @user/plotintro record what you measured: a cell `chartTag` = the returned element's " +
      "tag name in lower case, and cells `yScaleType`, `yScaleDomain` and `yScaleRange` = the y scale's " +
      "type, domain and range as that API reports them.",
    criteria: [
      // the facts had to be MEASURED — a run that never executed Plot is guessing
      { name: "tool_used", args: { name: "eval_js" }, weight: 2 },
      { name: "variable_equals", args: { module: "@user/plotintro", name: "chartTag", equals: "svg" }, weight: 2 },
      { name: "variable_equals", args: { module: "@user/plotintro", name: "yScaleType", equals: "linear" }, weight: 2 },
      { name: "live_value_contains", args: { module: "@user/plotintro", name: "yScaleDomain", needle: "[10,50]" }, weight: 2 },
      // range comes from Plot's default height/margins — unrecallable, only measurable
      { name: "live_value_contains", args: { module: "@user/plotintro", name: "yScaleRange", needle: "[370,20]" }, weight: 3 },
      { name: "variable_no_error", args: { module: "@user/plotintro" }, weight: 1 },
    ],
    oracle: [
      { tool: "eval_js", args: {
        module: "@tomlarkworthy/robocoop-5-srctools",
        code: `const f = Plot.plot({marks: [Plot.dot([{a: 1, b: 10}, {a: 5, b: 50}], {x: "a", y: "b"})]});
return JSON.stringify({tag: f.tagName, keys: Object.keys(f), y: f.scale("y")});`,
      } },
      { tool: "write_file", args: { file_path: "/src/@user/plotintro.js", content: PLOTINTRO_SOLUTION }, settleMs: 500 },
    ],
  },

  // ───────────────────── reflection: an undocumented library, discoverable only by running it ───────
  {
    id: "reflect-blackbox-kiln",
    category: "reflection",
    question:
      "The module @user/kiln exposes one cell, `kiln` — a compiled library with no documentation and no " +
      "readable source. Work out how to call it by experimenting with it at run time. Then create a module " +
      "@user/kilnuse that IMPORTS kiln from @user/kiln and adds: a cell `kilnSteps` = the names of the " +
      "operations the library supports, sorted alphabetically; and a cell `kilnResult` = what the library " +
      "returns for the numbers [4, 8, 15, 16, 23, 42] with all of those operations applied. Don't " +
      "reimplement the library and don't write its answers in by hand.",
    setup: { files: { "/src/@user/kiln.js": KILN_SRC } },
    criteria: [
      { name: "tool_used", args: { name: "eval_js" }, weight: 2 },
      { name: "module_exists", args: { id: "@user/kilnuse" }, weight: 1 },
      // wired to the real library, not a reimplementation
      { name: "contains_string", args: { file: "/src/@user/kilnuse.js", needle: "@user/kiln" }, weight: 2 },
      { name: "live_value_contains", args: { module: "@user/kilnuse", name: "kilnSteps", needle: '["fold","spread","tally"]' }, weight: 3 },
      { name: "live_value_contains", args: { module: "@user/kilnuse", name: "kilnResult", needle: '"fold":108' }, weight: 2 },
      { name: "live_value_contains", args: { module: "@user/kilnuse", name: "kilnResult", needle: '"spread":38' }, weight: 1 },
      { name: "live_value_contains", args: { module: "@user/kilnuse", name: "kilnResult", needle: '"tally":6' }, weight: 1 },
      // the results must be COMPUTED: a transcribed answer puts the digits in the file
      { name: "not_contains_string", args: { file: "/src/@user/kilnuse.js", needle: "108" }, weight: 2 },
      { name: "variable_no_error", args: { module: "@user/kilnuse" }, weight: 1 },
    ],
    oracle: [
      { tool: "eval_js", args: { module: "@user/kiln", code: "return JSON.stringify({steps: kiln.steps, probe: (() => { try { kiln(); } catch (e) { return e.message; } })()});" } },
      { tool: "write_file", args: { file_path: "/src/@user/kilnuse.js", content: KILNUSE_SOLUTION }, settleMs: 500 },
    ],
  },
];
