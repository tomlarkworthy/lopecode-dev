// Vendoring PATTERN evals (category "vendoring-patterns") — one per package shape that cannot simply be
// attached and imported. The shapes, their verbatim failure, and the trick that fixes each are recorded
// in knowledge/vendoring-npm-dependencies.md, which ships inside the notebook as a markdown-wiki block
// at /content/@tomlarkworthy/markdown-wiki/vendoring-npm-dependencies.md.
//
// These are the DOC-ASSISTED arm. Every eval here:
//   (a) tells the agent the wiki exists and asserts it was actually read
//       — `tool_call_matches {pattern: "vendoring-npm-dependencies"}` matches read_file/glob/grep alike;
//   (b) asserts the read led to a WORKING dependency — the package's bytes in the module's attachment
//       map (the surface exporter-3 serializes) plus a live cell value only the real library produces.
// (a) alone is worthless — an agent can read the doc and still fail — and (b) alone does not answer the
// question the doc was written for. Both, weighted, is the measurement.
//
// The two evals in evals-capability.mjs (category "vendoring") stay UNAIDED on purpose: they say nothing
// about the wiki and carry no read criterion, so they remain the cold-capability control that the
// 2026-08-30 baseline was measured against. The delta between the two categories is what says whether
// writing the doc bought anything.
//
// Anti-paste: each library's internal accumulator (`__msOut`, `__dfOut`, `__pbOut`, `__spOut`, `__prOut`)
// appears nowhere in its public API, so its presence in a module file proves the source was pasted
// rather than attached.

import {
  MINI_STATS_ENTRY_URL, MINI_STATS_BUNDLE_URL, MINI_STATS_ENTRY_SRC, MINI_STATS_BUNDLE_SRC,
  DUO_FMT_ENTRY_URL, DUO_FMT_PAD_URL, DUO_FMT_ENTRY_SRC, DUO_FMT_PAD_SRC,
  PAINTBOX_URL, PAINTBOX_SRC,
  SLUGPRESS_URL, SLUGPRESS_SRC,
  PACKRAT_URL, PACKRAT_GZ_B64,
} from "./fixtures.mjs";

const WIKI_DOC = "/content/@tomlarkworthy/markdown-wiki/vendoring-npm-dependencies.md";

// Appended to every question: names the doc without naming the trick, so the eval measures
// "found it, read it, applied it" rather than "was told what to type".
const WIKI_HINT =
  " This notebook carries its own knowledge base as markdown blocks under " +
  "/content/@tomlarkworthy/markdown-wiki/ — one of them is about vendoring npm dependencies and the " +
  "package shapes that will not import. Read it before you start.";

const readWiki = { tool: "read_file", args: { file_path: WIKI_DOC } };

// The doc's § 1 storage move, as a reference step. Scoped to @tomlarkworthy/fileattachments because
// setFileAttachment is a cell there; the second argument is the OWNING module (it defaults to the
// fileattachments module itself, which attaches the file to the wrong place, silently).
// `pkgFile`/`pkgText`, never `file` — eval_js binds referenced cell names as parameters and `file` IS a
// cell of that module ("Identifier 'file' has already been declared").
const attachText = (moduleId, url, fileName, mime = "text/javascript") => ({
  tool: "eval_js",
  args: {
    module: "@tomlarkworthy/fileattachments",
    code:
      `const pkgText = await (await fetch(${JSON.stringify(url)})).text();\n` +
      `const pkgFile = new File([pkgText], ${JSON.stringify(fileName)}, { type: ${JSON.stringify(mime)} });\n` +
      `await setFileAttachment(pkgFile, window.__ojs_runtime.mains.get(${JSON.stringify(moduleId)}));\n` +
      `return "attached " + ${JSON.stringify(fileName)};`,
  },
});

// Same, for a payload that must stay BYTES (the gzipped bundle). arrayBuffer, not text: round-tripping
// gzip through a string corrupts it.
const attachBytes = (moduleId, url, fileName, mime) => ({
  tool: "eval_js",
  args: {
    module: "@tomlarkworthy/fileattachments",
    code:
      `const pkgBytes = await (await fetch(${JSON.stringify(url)})).arrayBuffer();\n` +
      `const pkgFile = new File([pkgBytes], ${JSON.stringify(fileName)}, { type: ${JSON.stringify(mime)} });\n` +
      `await setFileAttachment(pkgFile, window.__ojs_runtime.mains.get(${JSON.stringify(moduleId)}));\n` +
      `return "attached " + ${JSON.stringify(fileName)} + " (" + pkgBytes.byteLength + "B)";`,
  },
});

const skeleton = (title) => `const _intro = function intro(md){return( md\`# ${title}\` )};
export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn).pid = pid;
  $def("_intro", "intro", ["md"], _intro);
  return main;
}
`;

// ── reference solutions, one per documented trick ────────────────────────────────────────────────────

const STATS_SOLUTION = `const _miniStats = async function miniStats(FileAttachment){
  return await import(await FileAttachment("mini-stats.bundle.js").url());
};
const _statsMean = function statsMean(miniStats){return( miniStats.mean([2, 4, 9, 13]) )};
const _statsSpread = function statsSpread(miniStats){return( miniStats.spread([2, 4, 9, 13]) )};
export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn).pid = pid;
  $def("_miniStats", "miniStats", ["FileAttachment"], _miniStats);
  $def("_statsMean", "statsMean", ["miniStats"], _statsMean);
  $def("_statsSpread", "statsSpread", ["miniStats"], _statsSpread);
  return main;
}
`;

// § 3, rewrite route: mint a blob URL for the dependency and textually replace the specifier in the
// entry file before making ITS blob. The one route known to survive an export.
const DUOFMT_SOLUTION = `const _duoFmt = async function duoFmt(FileAttachment){
  const padUrl = await FileAttachment("pad.js").url();
  const entrySrc = await FileAttachment("index.js").text();
  const patched = entrySrc.replace('"./pad.js"', JSON.stringify(padUrl));
  return await import(URL.createObjectURL(new Blob([patched], { type: "text/javascript" })));
};
const _stamps = function stamps(duoFmt){return( [7, 42, 1234].map(duoFmt.stamp) )};
export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn).pid = pid;
  $def("_duoFmt", "duoFmt", ["FileAttachment"], _duoFmt);
  $def("_stamps", "stamps", ["duoFmt"], _stamps);
  return main;
}
`;

// § 2.1, wrapper form: shadow define/module/exports as PARAMETERS rather than mutating the page's
// globals, so a throwing bundle cannot leave the AMD loader clobbered.
const PAINTBOX_SOLUTION = `const _paintbox = async function paintbox(FileAttachment){
  const src = await FileAttachment("paintbox.umd.js").text();
  const wrapped = "(function(define, module, exports){\\n" + src + "\\n}).call(globalThis, void 0, void 0, void 0);";
  new Function(wrapped)();
  return window.paintbox;
};
const _paintVersion = function paintVersion(paintbox){return( paintbox.VERSION )};
const _mixed = function mixed(paintbox){return( paintbox.mix("#102030", "#302010") )};
export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn).pid = pid;
  $def("_paintbox", "paintbox", ["FileAttachment"], _paintbox);
  $def("_paintVersion", "paintVersion", ["paintbox"], _paintVersion);
  $def("_mixed", "mixed", ["paintbox"], _mixed);
  return main;
}
`;

const SLUGPRESS_SOLUTION = `const _slugpress = async function slugpress(FileAttachment){
  const src = await FileAttachment("slugpress.cjs.js").text();
  const mod = { exports: {} };
  new Function("module", "exports", src)(mod, mod.exports);
  return mod.exports;
};
const _slugs = function slugs(slugpress){return( ["Hello World", "  A/B  test "].map(slugpress.slugify) )};
export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn).pid = pid;
  $def("_slugpress", "slugpress", ["FileAttachment"], _slugpress);
  $def("_slugs", "slugs", ["slugpress"], _slugs);
  return main;
}
`;

const PACKRAT_SOLUTION = `const _unzip = function unzip(){return(
  async (attachment) =>
    await new Response((await attachment.stream()).pipeThrough(new DecompressionStream("gzip"))).blob()
)};
const _packrat = async function packrat(unzip, FileAttachment){
  const blob = await unzip(FileAttachment("packrat.esm.js.gz"));
  const objectURL = URL.createObjectURL(new Blob([blob], { type: "application/javascript" }));
  try { return await import(objectURL); } finally { URL.revokeObjectURL(objectURL); }
};
const _packed = function packed(packrat){return( packrat.pack(["a", "a", "b", "a", "a", "a"]) )};
export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn).pid = pid;
  $def("_unzip", "unzip", [], _unzip);
  $def("_packrat", "packrat", ["unzip", "FileAttachment"], _packrat);
  $def("_packed", "packed", ["packrat"], _packed);
  return main;
}
`;

// Criteria every pattern eval shares: the doc was read, and the bytes landed somewhere an export sees.
const wikiRead = { name: "tool_call_matches", args: { pattern: "vendoring-npm-dependencies" }, weight: 2 };
const noNetwork = (file) => ({ name: "not_contains_string", args: { file, needle: "eval.test" }, weight: 2 });

export const VENDORING_PATTERN_EVALS = [
  // ── bare specifier: the obvious file is the unimportable one ──────────────────────────────────────
  {
    id: "vendor-pattern-bare-specifier",
    category: "vendoring-patterns",
    question:
      "Vendor the npm package mini-stats 2.0.0 into this notebook so it runs with the network unplugged. " +
      "Its package entry point is " + MINI_STATS_ENTRY_URL + " and a browser build is published " +
      "alongside it at " + MINI_STATS_BUNDLE_URL + ". It exports mean(list), spread(list) and VERSION. " +
      "Create a module @user/stats with a cell `statsMean` = mean([2, 4, 9, 13]) and a cell `statsSpread` " +
      "= spread([2, 4, 9, 13]), both computed by the vendored library. Do not fetch anything at run time " +
      "and do not copy the library's code into the module." + WIKI_HINT,
    setup: {
      routes: [
        { url: MINI_STATS_ENTRY_URL, contentType: "text/javascript", body: MINI_STATS_ENTRY_SRC },
        { url: MINI_STATS_BUNDLE_URL, contentType: "text/javascript", body: MINI_STATS_BUNDLE_SRC },
      ],
    },
    criteria: [
      wikiRead,
      { name: "module_exists", args: { id: "@user/stats" }, weight: 1 },
      // the BUNDLED build, not the entry point: only the bundle carries this banner, and only the
      // bundle can be imported at all (the entry's `import "tiny-stats-core"` cannot resolve)
      { name: "attachment_contains", args: { module: "@user/stats", needle: "mini-stats v2.0.0 bundled" }, weight: 3 },
      { name: "contains_string", args: { file: "/src/@user/stats.js", needle: "FileAttachment" }, weight: 2 },
      noNetwork("/src/@user/stats.js"),
      { name: "not_contains_string", args: { file: "/src/@user/stats.js", needle: "__msOut" }, weight: 2 },
      { name: "variable_equals", args: { module: "@user/stats", name: "statsMean", equals: 7 }, weight: 3 },
      { name: "variable_equals", args: { module: "@user/stats", name: "statsSpread", equals: 11 }, weight: 2 },
      { name: "variable_no_error", args: { module: "@user/stats" }, weight: 1 },
    ],
    oracle: [
      readWiki,
      { tool: "write_file", args: { file_path: "/src/@user/stats.js", content: skeleton("stats") } },
      attachText("@user/stats", MINI_STATS_BUNDLE_URL, "mini-stats.bundle.js"),
      { tool: "write_file", args: { file_path: "/src/@user/stats.js", content: STATS_SOLUTION }, settleMs: 500 },
    ],
  },

  // ── relative import across two files, no bundle published ─────────────────────────────────────────
  {
    id: "vendor-pattern-relative-multifile",
    category: "vendoring-patterns",
    question:
      "Vendor the npm package duo-fmt 1.0.0 into this notebook so it runs offline. It ships as two ES " +
      "module files and publishes no bundled build: " + DUO_FMT_ENTRY_URL + " (the entry, which exports " +
      "stamp(n) and VERSION) and " + DUO_FMT_PAD_URL + " (its dependency). Create a module @user/stamper " +
      "with a cell `stamps` = [7, 42, 1234].map(stamp), computed by the vendored library. Nothing may be " +
      "fetched at run time and the library's code must not be copied into the module." + WIKI_HINT,
    setup: {
      routes: [
        { url: DUO_FMT_ENTRY_URL, contentType: "text/javascript", body: DUO_FMT_ENTRY_SRC },
        { url: DUO_FMT_PAD_URL, contentType: "text/javascript", body: DUO_FMT_PAD_SRC },
      ],
    },
    criteria: [
      wikiRead,
      { name: "module_exists", args: { id: "@user/stamper" }, weight: 1 },
      // BOTH files have to be stored — vendoring only the entry leaves the dependency on the network
      { name: "attachment_contains", args: { module: "@user/stamper", needle: 'import { pad } from "./pad.js"' }, weight: 2 },
      { name: "attachment_contains", args: { module: "@user/stamper", needle: "export function pad" }, weight: 3 },
      noNetwork("/src/@user/stamper.js"),
      { name: "not_contains_string", args: { file: "/src/@user/stamper.js", needle: "__dfOut" }, weight: 2 },
      { name: "live_value_contains", args: { module: "@user/stamper", name: "stamps", needle: '["#0007","#0042","#1234"]' }, weight: 4 },
      { name: "variable_no_error", args: { module: "@user/stamper" }, weight: 1 },
    ],
    oracle: [
      readWiki,
      { tool: "write_file", args: { file_path: "/src/@user/stamper.js", content: skeleton("stamper") } },
      attachText("@user/stamper", DUO_FMT_ENTRY_URL, "index.js"),
      attachText("@user/stamper", DUO_FMT_PAD_URL, "pad.js"),
      { tool: "write_file", args: { file_path: "/src/@user/stamper.js", content: DUOFMT_SOLUTION }, settleMs: 500 },
    ],
  },

  // ── UMD, on a page that has an AMD loader ─────────────────────────────────────────────────────────
  {
    id: "vendor-pattern-umd-amd",
    category: "vendoring-patterns",
    question:
      "Vendor the npm package paintbox 1.2.0 into this notebook so it runs offline. It publishes a single " +
      "UMD browser build at " + PAINTBOX_URL + ", exposing VERSION and mix(hexA, hexB). Create a module " +
      "@user/painter with a cell `paintVersion` = the library's VERSION and a cell `mixed` = " +
      'mix("#102030", "#302010"), both produced by the vendored library. No run-time fetching, and do not ' +
      "copy the library's code into the module." + WIKI_HINT,
    setup: { routes: [{ url: PAINTBOX_URL, contentType: "text/javascript", body: PAINTBOX_SRC }] },
    criteria: [
      wikiRead,
      { name: "module_exists", args: { id: "@user/painter" }, weight: 1 },
      { name: "attachment_contains", args: { module: "@user/painter", needle: "paintbox v1.2.0 (umd)" }, weight: 3 },
      noNetwork("/src/@user/painter.js"),
      { name: "not_contains_string", args: { file: "/src/@user/painter.js", needle: "__pbOut" }, weight: 2 },
      { name: "variable_equals", args: { module: "@user/painter", name: "paintVersion", equals: "1.2.0" }, weight: 2 },
      // the AMD branch is the trap: a bundle run without shadowing `define` assigns no global, so this
      // value exists only if the agent applied § 2.1
      { name: "variable_equals", args: { module: "@user/painter", name: "mixed", equals: "#202020" }, weight: 4 },
      { name: "variable_no_error", args: { module: "@user/painter" }, weight: 1 },
    ],
    oracle: [
      readWiki,
      { tool: "write_file", args: { file_path: "/src/@user/painter.js", content: skeleton("painter") } },
      attachText("@user/painter", PAINTBOX_URL, "paintbox.umd.js"),
      { tool: "write_file", args: { file_path: "/src/@user/painter.js", content: PAINTBOX_SOLUTION }, settleMs: 500 },
    ],
  },

  // ── CommonJS ──────────────────────────────────────────────────────────────────────────────────────
  {
    id: "vendor-pattern-commonjs",
    category: "vendoring-patterns",
    question:
      "Vendor the npm package slugpress 0.4.1 into this notebook so it runs offline. It ships one " +
      "CommonJS file at " + SLUGPRESS_URL + ", whose exports are VERSION and slugify(text). Create a " +
      'module @user/slugger with a cell `slugs` = ["Hello World", "  A/B  test "].map(slugify), computed ' +
      "by the vendored library. No run-time fetching, and do not copy the library's code into the " +
      "module." + WIKI_HINT,
    setup: { routes: [{ url: SLUGPRESS_URL, contentType: "text/javascript", body: SLUGPRESS_SRC }] },
    criteria: [
      wikiRead,
      { name: "module_exists", args: { id: "@user/slugger" }, weight: 1 },
      { name: "attachment_contains", args: { module: "@user/slugger", needle: "slugpress v0.4.1 (cjs)" }, weight: 3 },
      noNetwork("/src/@user/slugger.js"),
      { name: "not_contains_string", args: { file: "/src/@user/slugger.js", needle: "__spOut" }, weight: 2 },
      { name: "live_value_contains", args: { module: "@user/slugger", name: "slugs", needle: '["hello-world","a-b-test"]' }, weight: 4 },
      { name: "variable_no_error", args: { module: "@user/slugger" }, weight: 1 },
    ],
    oracle: [
      readWiki,
      { tool: "write_file", args: { file_path: "/src/@user/slugger.js", content: skeleton("slugger") } },
      attachText("@user/slugger", SLUGPRESS_URL, "slugpress.cjs.js"),
      { tool: "write_file", args: { file_path: "/src/@user/slugger.js", content: SLUGPRESS_SOLUTION }, settleMs: 500 },
    ],
  },

  // ── gzip: stored compressed, expanded at run time (how all 49 corpus libraries are stored) ────────
  {
    id: "vendor-pattern-gzip",
    category: "vendoring-patterns",
    question:
      "Vendor the npm package packrat 5.0.0 into this notebook so it runs offline. Its ES module build is " +
      "published gzipped at " + PACKRAT_URL + ", exporting pack(list) and VERSION. Store it the way this " +
      "notebook stores every other bundled library — the notebook must hold the COMPRESSED bytes, and a " +
      "cell expands them when it runs. Create a module @user/packer with a cell `packed` = " +
      'pack(["a", "a", "b", "a", "a", "a"]), computed by the vendored library. No run-time fetching, and ' +
      "do not copy the library's code into the module." + WIKI_HINT,
    setup: {
      routes: [{ url: PACKRAT_URL, contentType: "application/gzip", bodyBase64: PACKRAT_GZ_B64 }],
    },
    criteria: [
      wikiRead,
      { name: "module_exists", args: { id: "@user/packer" }, weight: 1 },
      // stored compressed: the attachment is the .gz, so its bytes are NOT the readable source
      { name: "attachment_exists", args: { module: "@user/packer", nameMatches: "\\.gz$" }, weight: 3 },
      { name: "contains_string", args: { file: "/src/@user/packer.js", needle: "DecompressionStream" }, weight: 2 },
      noNetwork("/src/@user/packer.js"),
      { name: "not_contains_string", args: { file: "/src/@user/packer.js", needle: "__prOut" }, weight: 2 },
      { name: "live_value_contains", args: { module: "@user/packer", name: "packed", needle: '[["a",2],["b",1],["a",3]]' }, weight: 4 },
      { name: "variable_no_error", args: { module: "@user/packer" }, weight: 1 },
    ],
    oracle: [
      readWiki,
      { tool: "write_file", args: { file_path: "/src/@user/packer.js", content: skeleton("packer") } },
      attachBytes("@user/packer", PACKRAT_URL, "packrat.esm.js.gz", "application/gzip"),
      { tool: "write_file", args: { file_path: "/src/@user/packer.js", content: PACKRAT_SOLUTION }, settleMs: 500 },
    ],
  },
];
