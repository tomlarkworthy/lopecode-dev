// rc5-train eval (20260928-0847-m7): a MAINTENANCE goal. The user's module already exists and works;
// the task is a feature addition and the risk is breaking what is there.
// setup.files seeds @user/code-metrics: @tomlarkworthy/code-metrics (lopebooks
// @tomlarkworthy_code-metrics.html) re-homed standalone. Its display cells are verbatim (metricsChart,
// viewof moduleFilter, summary, viewof metricsTable, moduleFilterNames); the runtime-reading pipeline
// (allCells -> acorn metrics) is replaced by `allRows`, 33 rows the real `metricsRows` cell computed
// over four modules, and `linkTo` is a local stand-in for the lopepage-urls import.
// setup.collect drives the module as a user: finds a text input in @user/code-metrics, types a term
// (input events), checks the cells table shows only matching rows, clears it and checks every row is
// back; then re-runs the fixture's own interactions (untick a module in the module table -> the count,
// the chart and the cells table drop to that module's complement; tick a row in the cells table ->
// metricsTable holds it; click a header -> the rows re-sort) and checks the module was edited in place.
// countFollows/chartFollows (does the count and chart follow the search) are recorded, not scored.
const FIXTURE = "const _vyza3y = function _title(md){return(\nmd`# Code Metrics\n\nCell-by-cell code-health metrics for every named variable in the user-authored modules of this runtime — find refactor candidates by sorting on the **Maintainability Index** (lower = worse).\n\n**Metrics** — LOC, cyclomatic complexity, cognitive complexity, max nesting, Halstead volume / difficulty, fan-in, fan-out, MI.`\n)};\nconst _8nt6z2 = function _metricsChart(metricsRows,htl,Plot,linkTo)\n{\n    if (!metricsRows.length)\n        return htl.html`<em>No data.</em>`;\n    return Plot.plot({\n        width: 720,\n        height: 420,\n        marginLeft: 50,\n        marginBottom: 40,\n        grid: true,\n        x: {\n            label: 'Lines of code \\u2192',\n            type: 'log'\n        },\n        y: {\n            label: '\\u2191 Cyclomatic complexity',\n            type: 'log'\n        },\n        color: {\n            label: 'Maintainability Index',\n            type: 'linear',\n            scheme: 'RdYlGn',\n            domain: [\n                20,\n                85\n            ],\n            legend: true\n        },\n        r: {\n            range: [\n                2,\n                14\n            ],\n            domain: [\n                0,\n                30\n            ]\n        },\n        marks: [\n            Plot.ruleY([10], {\n                stroke: '#e11',\n                strokeDasharray: '3,3',\n                strokeOpacity: 0.6\n            }),\n            Plot.dot(metricsRows, {\n                x: d => Math.max(d.loc, 1),\n                y: d => Math.max(d.cyclomatic, 1),\n                r: d => Math.max(d.fanOut, 1),\n                fill: 'mi',\n                stroke: '#333',\n                strokeOpacity: 0.3,\n                fillOpacity: 0.75,\n                tip: true,\n                href: d => linkTo(d.module + '#' + d.name),\n                title: d => `${ d.name }  @  ${ d.module }\\nMI ${ d.mi }  CC ${ d.cyclomatic }  Cog ${ d.cognitive }  Nest ${ d.nesting }\\nLOC ${ d.loc }  H.Vol ${ d.vol }  H.Diff ${ d.diff }\\nFan-in ${ d.fanIn }  Fan-out ${ d.fanOut }`\n            })\n        ]\n    });\n};\nconst _15k10yj = function _moduleFilter(Inputs,moduleStats,htl,linkTo){return(\nInputs.table(moduleStats, {\n    columns: [\n        'module',\n        'title',\n        'cells',\n        'loc',\n        'dependsOn',\n        'dependedBy'\n    ],\n    header: {\n        module: 'Module',\n        title: 'Title',\n        cells: 'Cells',\n        loc: 'LOC',\n        dependsOn: 'Deps\\u2192',\n        dependedBy: '\\u2190Deps'\n    },\n    sort: 'loc',\n    reverse: true,\n    multiple: true,\n    layout: 'auto',\n    rows: 14,\n    value: moduleStats,\n    format: { module: v => htl.html`<a href=\"${ linkTo(v) }\" target=\"_self\">${ v }</a>` }\n})\n)};\nconst _8bwet6 = (G, _) => G.input(_);\nconst _1cydseu = function _summary(metricsRows,md)\n{\n    const total = metricsRows.length;\n    if (total === 0)\n        return md`_Select at least one module above._`;\n    const lowMI = metricsRows.filter(r => r.mi < 65).length;\n    const highCC = metricsRows.filter(r => r.cyclomatic >= 10).length;\n    const deepNest = metricsRows.filter(r => r.nesting >= 4).length;\n    return md`**${ total }** cells analyzed.\n\n| Flag | Count | Threshold |\n|------|-------|-----------|\n| Low Maintainability Index | ${ lowMI } | MI &lt; 65 |\n| High Cyclomatic Complexity | ${ highCC } | CC ≥ 10 |\n| Deep Nesting | ${ deepNest } | depth ≥ 4 |\n`;\n};\nconst _13azngq = function _metricsTable(Inputs,metricsRows,htl,linkTo){return(\nInputs.table(metricsRows, {\n    sort: 'mi',\n    reverse: false,\n    columns: [\n        'mi',\n        'name',\n        'module',\n        'loc',\n        'cyclomatic',\n        'cognitive',\n        'nesting',\n        'vol',\n        'diff',\n        'fanIn',\n        'fanOut'\n    ],\n    header: {\n        mi: 'MI',\n        name: 'Name',\n        module: 'Module',\n        loc: 'LOC',\n        cyclomatic: 'CC',\n        cognitive: 'Cog',\n        nesting: 'Nest',\n        vol: 'H.Vol',\n        diff: 'H.Diff',\n        fanIn: 'In',\n        fanOut: 'Out'\n    },\n    layout: 'auto',\n    rows: 25,\n    format: {\n        name: (v, i) => {\n            const row = metricsRows[i];\n            return htl.html`<a href=\"${ linkTo(row.module) }\" target=\"_self\">${ v }</a>`;\n        },\n        module: v => htl.html`<a href=\"${ linkTo(v) }\" target=\"_self\">${ v }</a>`\n    }\n})\n)};\nconst _99fyjz = (G, _) => G.input(_);\nconst _lnkto1 = function _linkTo(){return(\n(target) => `#view=R100(S100(${target}))`\n)};\nconst _allrw1 = function _allRows(){return(\n[{\"mi\":0,\"name\":\"gridContainer\",\"module\":\"@tomlarkworthy/grid-container\",\"loc\":794,\"cyclomatic\":219,\"cognitive\":291,\"nesting\":6,\"vol\":33084,\"diff\":73.8,\"fanIn\":7,\"fanOut\":0},\n  {\"mi\":25,\"name\":\"gridControls\",\"module\":\"@tomlarkworthy/grid-container\",\"loc\":130,\"cyclomatic\":27,\"cognitive\":30,\"nesting\":2,\"vol\":3833,\"diff\":21.5,\"fanIn\":1,\"fanOut\":0},\n  {\"mi\":31,\"name\":\"invokeVariable\",\"module\":\"@tomlarkworthy/invoke-variable\",\"loc\":78,\"cyclomatic\":32,\"cognitive\":42,\"nesting\":3,\"vol\":1979,\"diff\":23.3,\"fanIn\":1,\"fanOut\":0},\n  {\"mi\":37,\"name\":\"flowQueue\",\"module\":\"@tomlarkworthy/flow-queue\",\"loc\":65,\"cyclomatic\":15,\"cognitive\":15,\"nesting\":3,\"vol\":1283,\"diff\":21,\"fanIn\":3,\"fanOut\":0},\n  {\"mi\":46,\"name\":\"localStorageView\",\"module\":\"@tomlarkworthy/local-storage-view\",\"loc\":33,\"cyclomatic\":7,\"cognitive\":6,\"nesting\":1,\"vol\":696,\"diff\":7.6,\"fanIn\":5,\"fanOut\":0},\n  {\"mi\":47,\"name\":\"sg_css\",\"module\":\"@tomlarkworthy/grid-container\",\"loc\":157,\"cyclomatic\":1,\"cognitive\":0,\"nesting\":0,\"vol\":5,\"diff\":0.5,\"fanIn\":0,\"fanOut\":0},\n  {\"mi\":50,\"name\":\"widget\",\"module\":\"@tomlarkworthy/grid-container\",\"loc\":27,\"cyclomatic\":1,\"cognitive\":0,\"nesting\":0,\"vol\":434,\"diff\":2.4,\"fanIn\":4,\"fanOut\":0},\n  {\"mi\":58,\"name\":\"testing\",\"module\":\"@tomlarkworthy/flow-queue\",\"loc\":15,\"cyclomatic\":1,\"cognitive\":0,\"nesting\":0,\"vol\":205,\"diff\":2.4,\"fanIn\":1,\"fanOut\":0},\n  {\"mi\":63,\"name\":\"title\",\"module\":\"@tomlarkworthy/grid-container\",\"loc\":24,\"cyclomatic\":1,\"cognitive\":0,\"nesting\":0,\"vol\":10,\"diff\":0.7,\"fanIn\":1,\"fanOut\":0},\n  {\"mi\":66,\"name\":\"freq\",\"module\":\"@tomlarkworthy/grid-container\",\"loc\":10,\"cyclomatic\":1,\"cognitive\":0,\"nesting\":0,\"vol\":57,\"diff\":1.6,\"fanIn\":1,\"fanOut\":0},\n  {\"mi\":66,\"name\":\"amp\",\"module\":\"@tomlarkworthy/grid-container\",\"loc\":10,\"cyclomatic\":1,\"cognitive\":0,\"nesting\":0,\"vol\":57,\"diff\":1.6,\"fanIn\":1,\"fanOut\":0},\n  {\"mi\":66,\"name\":\"waveStats\",\"module\":\"@tomlarkworthy/grid-container\",\"loc\":7,\"cyclomatic\":1,\"cognitive\":0,\"nesting\":0,\"vol\":160,\"diff\":3.1,\"fanIn\":1,\"fanOut\":0},\n  {\"mi\":66,\"name\":\"wavePlot\",\"module\":\"@tomlarkworthy/grid-container\",\"loc\":7,\"cyclomatic\":1,\"cognitive\":0,\"nesting\":0,\"vol\":183,\"diff\":4.7,\"fanIn\":2,\"fanOut\":0},\n  {\"mi\":66,\"name\":\"template_dial\",\"module\":\"@tomlarkworthy/grid-container\",\"loc\":10,\"cyclomatic\":1,\"cognitive\":0,\"nesting\":0,\"vol\":57,\"diff\":1.6,\"fanIn\":1,\"fanOut\":0},\n  {\"mi\":68,\"name\":\"wave\",\"module\":\"@tomlarkworthy/grid-container\",\"loc\":6,\"cyclomatic\":1,\"cognitive\":0,\"nesting\":0,\"vol\":130,\"diff\":3.3,\"fanIn\":2,\"fanOut\":0},\n  {\"mi\":73,\"name\":\"maybeReplyReplier\",\"module\":\"@tomlarkworthy/flow-queue\",\"loc\":5,\"cyclomatic\":2,\"cognitive\":1,\"nesting\":1,\"vol\":38,\"diff\":3.2,\"fanIn\":2,\"fanOut\":0},\n  {\"mi\":75,\"name\":\"jsonView\",\"module\":\"@tomlarkworthy/local-storage-view\",\"loc\":5,\"cyclomatic\":1,\"cognitive\":0,\"nesting\":0,\"vol\":22,\"diff\":1.2,\"fanIn\":1,\"fanOut\":0},\n  {\"mi\":78,\"name\":\"example3\",\"module\":\"@tomlarkworthy/local-storage-view\",\"loc\":3,\"cyclomatic\":1,\"cognitive\":0,\"nesting\":0,\"vol\":48,\"diff\":2.3,\"fanIn\":2,\"fanOut\":0},\n  {\"mi\":78,\"name\":\"demo\",\"module\":\"@tomlarkworthy/grid-container\",\"loc\":5,\"cyclomatic\":1,\"cognitive\":0,\"nesting\":0,\"vol\":10,\"diff\":0.7,\"fanIn\":1,\"fanOut\":0},\n  {\"mi\":79,\"name\":\"suite\",\"module\":\"@tomlarkworthy/flow-queue\",\"loc\":3,\"cyclomatic\":1,\"cognitive\":0,\"nesting\":0,\"vol\":27,\"diff\":1.8,\"fanIn\":1,\"fanOut\":0},\n  {\"mi\":80,\"name\":\"template_dial_swatch\",\"module\":\"@tomlarkworthy/grid-container\",\"loc\":3,\"cyclomatic\":1,\"cognitive\":0,\"nesting\":0,\"vol\":25,\"diff\":1.4,\"fanIn\":2,\"fanOut\":0},\n  {\"mi\":81,\"name\":\"example1\",\"module\":\"@tomlarkworthy/local-storage-view\",\"loc\":3,\"cyclomatic\":1,\"cognitive\":0,\"nesting\":0,\"vol\":18,\"diff\":2,\"fanIn\":1,\"fanOut\":0},\n  {\"mi\":81,\"name\":\"example1storage\",\"module\":\"@tomlarkworthy/local-storage-view\",\"loc\":3,\"cyclomatic\":1,\"cognitive\":0,\"nesting\":0,\"vol\":14,\"diff\":1.3,\"fanIn\":1,\"fanOut\":0},\n  {\"mi\":81,\"name\":\"example2\",\"module\":\"@tomlarkworthy/local-storage-view\",\"loc\":3,\"cyclomatic\":1,\"cognitive\":0,\"nesting\":0,\"vol\":18,\"diff\":2,\"fanIn\":1,\"fanOut\":0},\n  {\"mi\":81,\"name\":\"sqrt\",\"module\":\"@tomlarkworthy/flow-queue\",\"loc\":3,\"cyclomatic\":1,\"cognitive\":0,\"nesting\":0,\"vol\":18,\"diff\":1.3,\"fanIn\":1,\"fanOut\":0},\n  {\"mi\":81,\"name\":\"maybeReply\",\"module\":\"@tomlarkworthy/flow-queue\",\"loc\":3,\"cyclomatic\":1,\"cognitive\":0,\"nesting\":0,\"vol\":18,\"diff\":1.3,\"fanIn\":1,\"fanOut\":0},\n  {\"mi\":81,\"name\":\"c\",\"module\":\"@tomlarkworthy/invoke-variable\",\"loc\":3,\"cyclomatic\":1,\"cognitive\":0,\"nesting\":0,\"vol\":16,\"diff\":1.7,\"fanIn\":2,\"fanOut\":0},\n  {\"mi\":82,\"name\":\"invokeVariableModule\",\"module\":\"@tomlarkworthy/invoke-variable\",\"loc\":3,\"cyclomatic\":1,\"cognitive\":0,\"nesting\":0,\"vol\":10,\"diff\":1.5,\"fanIn\":1,\"fanOut\":0},\n  {\"mi\":82,\"name\":\"controls\",\"module\":\"@tomlarkworthy/grid-container\",\"loc\":3,\"cyclomatic\":1,\"cognitive\":0,\"nesting\":0,\"vol\":10,\"diff\":1.5,\"fanIn\":1,\"fanOut\":0},\n  {\"mi\":82,\"name\":\"gridModule\",\"module\":\"@tomlarkworthy/grid-container\",\"loc\":3,\"cyclomatic\":1,\"cognitive\":0,\"nesting\":0,\"vol\":10,\"diff\":1.5,\"fanIn\":1,\"fanOut\":0},\n  {\"mi\":82,\"name\":\"export_ui\",\"module\":\"@tomlarkworthy/grid-container\",\"loc\":3,\"cyclomatic\":1,\"cognitive\":0,\"nesting\":0,\"vol\":10,\"diff\":1.5,\"fanIn\":1,\"fanOut\":0},\n  {\"mi\":85,\"name\":\"a\",\"module\":\"@tomlarkworthy/invoke-variable\",\"loc\":3,\"cyclomatic\":1,\"cognitive\":0,\"nesting\":0,\"vol\":5,\"diff\":0.5,\"fanIn\":0,\"fanOut\":0},\n  {\"mi\":85,\"name\":\"b\",\"module\":\"@tomlarkworthy/invoke-variable\",\"loc\":3,\"cyclomatic\":1,\"cognitive\":0,\"nesting\":0,\"vol\":5,\"diff\":0.5,\"fanIn\":0,\"fanOut\":0}]\n)};\nconst _mstat1 = function _moduleStats(){return(\n[{\"module\":\"@tomlarkworthy/grid-container\",\"title\":\"Grid container\",\"cells\":16,\"loc\":1199,\"dependsOn\":2,\"dependedBy\":0},\n  {\"module\":\"@tomlarkworthy/flow-queue\",\"title\":\"Flow queue\",\"cells\":6,\"loc\":94,\"dependsOn\":2,\"dependedBy\":1},\n  {\"module\":\"@tomlarkworthy/invoke-variable\",\"title\":\"Invoke variable\",\"cells\":5,\"loc\":90,\"dependsOn\":1,\"dependedBy\":0},\n  {\"module\":\"@tomlarkworthy/local-storage-view\",\"title\":\"localStorage view\",\"cells\":6,\"loc\":50,\"dependsOn\":1,\"dependedBy\":3}]\n)};\nconst _b985f3 = function _moduleFilterNames(moduleFilter){return(\nnew Set(moduleFilter.map(r => r.module))\n)};\nconst _mrows1 = function _metricsRows(allRows,moduleFilterNames){return(\nallRows.filter(r => moduleFilterNames.has(r.module)).sort((a, b) => a.mi - b.mi)\n)};\n\nexport default function define(runtime, observer) {\n  const main = runtime.module();\n  const $def = (pid, name, deps, fn) => {\n    main.variable(observer(name)).define(name, deps, fn).pid = pid;\n  };\n\n  $def(\"_vyza3y\", \"title\", [\"md\"], _vyza3y);\n  $def(\"_8nt6z2\", \"metricsChart\", [\"metricsRows\",\"htl\",\"Plot\",\"linkTo\"], _8nt6z2);\n  $def(\"_15k10yj\", \"viewof moduleFilter\", [\"Inputs\",\"moduleStats\",\"htl\",\"linkTo\"], _15k10yj);\n  $def(\"_8bwet6\", \"moduleFilter\", [\"Generators\",\"viewof moduleFilter\"], _8bwet6);\n  $def(\"_1cydseu\", \"summary\", [\"metricsRows\",\"md\"], _1cydseu);\n  $def(\"_13azngq\", \"viewof metricsTable\", [\"Inputs\",\"metricsRows\",\"htl\",\"linkTo\"], _13azngq);\n  $def(\"_99fyjz\", \"metricsTable\", [\"Generators\",\"viewof metricsTable\"], _99fyjz);\n  $def(\"_lnkto1\", \"linkTo\", [], _lnkto1);\n  $def(\"_allrw1\", \"allRows\", [], _allrw1);\n  $def(\"_mstat1\", \"moduleStats\", [], _mstat1);\n  $def(\"_b985f3\", \"moduleFilterNames\", [\"moduleFilter\"], _b985f3);\n  $def(\"_mrows1\", \"metricsRows\", [\"allRows\",\"moduleFilterNames\"], _mrows1);\n  return main;\n}\n";

const MOD = "@user/code-metrics";

// oracle: Inputs.search over the module-filtered rows, as @tomlarkworthy/gallery._search
// (lopebooks @tomlarkworthy_gallery.html): Inputs.search(base, { placeholder, columns }). metricsRows
// keeps its name and becomes the searched rows, so the count, the chart and the table follow it.
const FIXED = FIXTURE
  .replace(`const _mrows1 = function _metricsRows(allRows,moduleFilterNames){return(
allRows.filter(r => moduleFilterNames.has(r.module)).sort((a, b) => a.mi - b.mi)
)};`, `const _modrw1 = function _moduleRows(allRows,moduleFilterNames){return(
allRows.filter(r => moduleFilterNames.has(r.module)).sort((a, b) => a.mi - b.mi)
)};
const _srch1 = function _cellSearch(Inputs,moduleRows){return(
Inputs.search(moduleRows, { placeholder: "Search cells…", columns: ["name", "module"] })
)};
const _srch2 = (G, _) => G.input(_);
const _mrows1 = function _metricsRows(cellSearch){return(
cellSearch
)};`)
  .replace(`  $def("_mrows1", "metricsRows", ["allRows","moduleFilterNames"], _mrows1);`,
    `  $def("_modrw1", "moduleRows", ["allRows","moduleFilterNames"], _modrw1);
  $def("_srch1", "viewof cellSearch", ["Inputs","moduleRows"], _srch1);
  $def("_srch2", "cellSearch", ["Generators","viewof cellSearch"], _srch2);
  $def("_mrows1", "metricsRows", ["cellSearch"], _mrows1);`);
if (FIXED === FIXTURE || !FIXED.includes('"viewof cellSearch"') || !FIXED.includes("_modrw1 = function")) throw new Error("code-metrics eval: FIXED did not apply");

const INIT = String.raw`(() => { globalThis.__m7Base = new Set([...globalThis.__ojs_runtime.mains.keys()].filter(k => k !== "@user/code-metrics")); })()`;

const COLLECT = String.raw`(async () => {
  const rt = globalThis.__ojs_runtime;
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const base = globalThis.__m7Base || new Set();
  const out = {};
  const mod = rt.mains.get("@user/code-metrics");
  if (!mod) return { error: "no @user/code-metrics module" };
  const vars = () => [...rt._variables].filter(v => v._module === mod && v._name && !String(v._name).startsWith("module ") && v._name !== "@variable");
  // edited in place: no other new module carries a copy of the fixture's cells
  const newMods = [...rt.mains].filter(([k]) => !base.has(k) && k !== "@user/code-metrics");
  out.copies = newMods.filter(([, m]) => [...rt._variables].some(v => v._module === m && /^(metricsChart|allRows|viewof metricsTable)$/.test(v._name))).map(([k]) => k);
  const keepers = [];
  for (const v of vars()) { try { keepers.push(mod.variable(true).define([v._name], x => x)); } catch {} }
  try {
    await sleep(2000);
    const byName = n => vars().find(v => v._name === n);
    const val = n => byName(n)?._value;
    const count = () => { const m = /(\d+)\D{0,12}cells analy[sz]ed/i.exec(val("summary")?.textContent || ""); return m ? +m[1] : null; };
    const dots = () => { const c = val("metricsChart"); return c instanceof Element ? c.querySelectorAll("circle").length : null; };
    const visible = tr => tr.style.display !== "none" && !tr.hidden && !tr.closest("[hidden]") && tr.style.visibility !== "hidden";
    const rows = n => { const t = val(n); return t instanceof Element ? [...t.querySelectorAll("tbody tr")].filter(visible) : []; };
    const cellsRows = () => rows("viewof metricsTable");
    const state = () => ({ count: count(), dots: dots(), rows: cellsRows().length });
    out.names = ["metricsChart", "viewof moduleFilter", "summary", "viewof metricsTable", "metricsTable"].filter(n => !byName(n));
    // --- the search box
    const els = () => vars().map(v => v._value).filter(x => x instanceof Element);
    const input = els().flatMap(e => e.matches("input") ? [e] : [...e.querySelectorAll("input")])
      .find(i => ["text", "search", ""].includes((i.getAttribute("type") || "").toLowerCase()));
    out.searchFound = !!input;
    const type = async s => { input.focus?.(); input.value = s; input.dispatchEvent(new InputEvent("input", { bubbles: true, data: s, inputType: "insertText" })); input.dispatchEvent(new Event("change", { bubbles: true })); await sleep(1500); };
    // the agent's own check (try_control with a value) leaves its test term in the box; record it, then
    // start from an empty box (base run 20260928-0847-m7 left "invoke": 5 of 33 rows shown)
    out.leftInBox = input ? input.value : null;
    if (input && input.value !== "") await type("");
    out.before = state();
    if (input) {
      await type("example");
      const trs = cellsRows();
      const names = trs.map(tr => tr.textContent);
      out.filtered = { ...state(), names: names.map(s => s.replace(/\s+/g, " ").trim().slice(0, 60)) };
      out.filters = trs.length === 4 && names.every(s => /example/i.test(s));
      // each row's links point at that row's own module (a filtered table fed to a format() that
      // indexes the UNfiltered array links a row to another row's module)
      out.linksOk = trs.length > 0 && trs.every(tr => { const hs = [...tr.querySelectorAll("a")].map(a => a.getAttribute("href")); const txt = tr.textContent; return hs.length > 0 && hs.every(h => h === hs[0]) && (txt.includes("local-storage-view") ? hs[0].includes("local-storage-view") : true); });
      out.countFollows = count() === 4;
      out.chartFollows = dots() === 4;
      await type("");
      out.cleared = state();
      out.restores = out.cleared.count === 33 && out.cleared.dots === 33 && out.cleared.rows === out.before.rows && out.before.rows > 4;
    } else { out.filters = false; out.restores = false; out.linksOk = false; }
    // --- pre-existing behaviour 1: the module table filters the count, the chart and the cells table
    const modTr = () => rows("viewof moduleFilter").find(tr => tr.textContent.includes("grid-container"));
    const box = tr => tr?.querySelector("input[type=checkbox]");
    let mf = null;
    if (box(modTr())) {
      box(modTr()).click(); await sleep(1500);
      mf = state();
      box(modTr()).click(); await sleep(1500);
      out.moduleFilter = mf;
      out.moduleFilterWorks = mf.count === 17 && mf.dots === 17 && mf.rows === 17 && count() === 33 && dots() === 33;
    } else out.moduleFilterWorks = false;
    // --- 2: ticking a row in the cells table selects it
    const first = cellsRows()[0];
    if (box(first)) {
      box(first).click(); await sleep(800);
      const sel = val("metricsTable");
      out.selected = Array.isArray(sel) ? sel.length : String(sel);
      out.selectWorks = Array.isArray(sel) && sel.length === 1 && typeof sel[0]?.name === "string";
      box(cellsRows()[0])?.click(); await sleep(800);
    } else out.selectWorks = false;
    // --- 3: clicking the LOC header re-sorts the rendered rows by LOC
    const LOC = (() => { const t = val("viewof metricsTable"); const ths = t ? [...t.querySelectorAll("thead th")] : []; return ths.findIndex(h => /(^|\W)LOC(\W|$)/.test(h.textContent.trim())); })();
    out.locCol = LOC;
    const locs = () => cellsRows().slice(0, 10).map(tr => +(tr.children[LOC]?.textContent || "").replace(/[^\d.]/g, ""));
    const sorted = a => a.length > 2 && a.every(Number.isFinite) && (a.every((x, i) => !i || a[i - 1] <= x) || a.every((x, i) => !i || a[i - 1] >= x));
    const seqs = [locs()];
    for (let k = 0; k < 2 && !sorted(seqs[seqs.length - 1]) && LOC >= 0; k++) {
      const th = [...val("viewof metricsTable").querySelectorAll("thead th")][LOC];
      th.click(); await sleep(800);
      seqs.push(locs());
    }
    out.sortSeqs = seqs.map(s => s.join(","));
    out.sortWorks = !sorted(seqs[0]) && sorted(seqs[seqs.length - 1]);
    out.inPlace = out.copies.length === 0 && out.names.length === 0;
    out.existingWorks = out.inPlace && out.moduleFilterWorks && out.selectWorks && out.sortWorks && out.before.count === 33 && out.before.dots === 33;
    return out;
  } finally {
    for (const k of keepers) { try { k.delete(); } catch {} }
  }
})()`;

export default {
  id: "rc5t-code-metrics-search",
  category: "rc5-train",
  question: "Add a search box to my notebook (@user/code-metrics) that filters the list it shows.",
  setup: { files: { "/src/@user/code-metrics.js": FIXTURE }, init: INIT, collect: COLLECT },
  criteria: [
    { name: "collected_equals", args: { key: "searchFound", equals: true }, weight: 1 },
    { name: "collected_equals", args: { key: "filters", equals: true }, weight: 2 },
    { name: "collected_equals", args: { key: "restores", equals: true }, weight: 1 },
    { name: "collected_equals", args: { key: "linksOk", equals: true }, weight: 1 },
    { name: "collected_equals", args: { key: "existingWorks", equals: true }, weight: 3 },
    { name: "no_runtime_errors", args: {}, weight: 1 },
  ],
  oracle: [
    { tool: "read_file", args: { file_path: "/src/@user/code-metrics.js" } },
    { tool: "write_file", args: { file_path: "/src/@user/code-metrics.js", content: FIXED }, settleMs: 3000 },
  ],
};
