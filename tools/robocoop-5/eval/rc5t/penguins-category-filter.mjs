// rc5-train eval (20260928-0847-m16): add a category filter to an existing notebook, wired to both views.
// setup.files seeds @user/penguins: @observablehq/plot-exploration-penguins (embedded in
// lopebooks/notebooks/@tomlarkworthy_cloudevents-explorer.html, lopebooks 187f90e4) trimmed and re-homed:
// 21 inline rows (Adelie 8, Chinstrap 6, Gentoo 7), an anonymous Inputs.table(data), an anonymous
// Plot.dot chart coloured by species, and an existing `viewof dimension` select for the chart's x axis.
// Provenance: tools/scratch/rc5-train/20260928-0847/m16/fixtures/PROVENANCE.txt.
//
// The user module is not rendered in the eval layout, so setup.collect observes its named cells and
// re-defines each anonymous cell as an observed clone (same inputs, same definition) to make them compute.
// It then finds the new <select> that offers the three species, drives it to Adelie and to Gentoo, and
// requires every dot chart's circles and every table's rows to be exactly that species (counts from the
// fixture rows, computed here, not in the page). It also checks the initial selection still shows all 21,
// that the existing x-axis select still moves the chart, and that no cell (anonymous included) errors.
// Keys: chart, table, defaultView, existingControl, errors, and verdict = all five.
// M16_NEG=table|unwired|breaks swaps the oracle for a negative control (must score low).
const FIXTURE = "const _1tk47nv = function _1(md){return(\nmd`# Plot Exploration: Penguins\n\nA small sample of the Palmer penguins dataset, shown as a table and as a chart.`\n)};\nconst _w2qj1w = function _3(md){return(\nmd`Good day! Here is a fine dataset of [penguins](https://allisonhorst.github.io/palmerpenguins/):`\n)};\nconst _h6dqmp = function _data(d3){return(\nd3.csvParse(`species,island,bill_length,bill_depth,flipper_length,body_mass,sex\nAdelie,Torgersen,39.1,18.7,181,3750,MALE\nAdelie,Biscoe,38.2,18.1,185,3950,MALE\nAdelie,Dream,40.8,18.4,195,3900,MALE\nAdelie,Biscoe,35.7,16.9,185,3150,FEMALE\nAdelie,Torgersen,42.1,19.1,195,4000,MALE\nAdelie,Dream,40.3,18.5,196,4350,MALE\nAdelie,Biscoe,42.7,18.3,196,4075,MALE\nAdelie,Dream,37.5,18.5,199,4475,MALE\nChinstrap,Dream,46.5,17.9,192,3500,FEMALE\nChinstrap,Dream,51.7,20.3,194,3775,MALE\nChinstrap,Dream,43.2,16.6,187,2900,FEMALE\nChinstrap,Dream,49.7,18.6,195,3600,MALE\nChinstrap,Dream,50.8,18.5,201,4450,MALE\nChinstrap,Dream,45.2,16.6,191,3250,FEMALE\nGentoo,Biscoe,46.1,13.2,211,4500,FEMALE\nGentoo,Biscoe,49.2,15.2,221,6300,MALE\nGentoo,Biscoe,48.4,16.3,220,5400,MALE\nGentoo,Biscoe,45.1,14.4,210,4400,FEMALE\nGentoo,Biscoe,47.7,15,216,4750,FEMALE\nGentoo,Biscoe,51.3,14.2,218,5300,MALE\nGentoo,Biscoe,46.8,16.1,215,5500,MALE`, d3.autoType)\n)};\nconst _hbm82u = function _7(md){return(\nmd`## Table\n\nUsing Observable’s [Table](/@observablehq/input-table) component, we can have a look at the contents, structure, and dimensions of this dataset:`\n)};\nconst _1anzgx4 = function _8(Inputs,data){return(\nInputs.table(data)\n)};\nconst _1yau7bj = function _9(md,data){return(\nmd`As we can see, the data is tabular, and one row corresponds to one observation.\n\nWe have access, for each penguin (or data point), to its *${data.columns.join(\", \")}.*\n\nThe numerical values are given in millimeters (for the bill and flipper’s lengths) and grams (for the body mass). Categories (*species, island*, and *sex*) are represented as strings.`\n)};\nconst _1h6gpt1 = function _10(md){return(\nmd`## Plot\n\nHow is body mass related to the other measurements? Pick the measurement for the x axis:`\n)};\nconst _8gxsp6 = function _dimension(Inputs,data){return(\nInputs.select(data.columns.filter(c => typeof data[0][c] === \"number\" && c !== \"body_mass\"), {\n  label: \"x axis\",\n  value: \"flipper_length\"\n})\n)};\nconst _l8gwg6 = (G, _) => G.input(_);\nconst _18qbakr = function _13(Plot,data,dimension){return(\nPlot.dot(data, {x: dimension, y: \"body_mass\", fill: \"species\", title: \"species\"}).plot({ grid: true })\n)};\n\nexport default function define(runtime, observer) {\n  const main = runtime.module();\n  const $def = (pid, name, deps, fn) => {\n    main.variable(observer(name)).define(name, deps, fn).pid = pid;\n  };\n  $def(\"_1tk47nv\", null, [\"md\"], _1tk47nv);\n  $def(\"_w2qj1w\", null, [\"md\"], _w2qj1w);\n  $def(\"_h6dqmp\", \"data\", [\"d3\"], _h6dqmp);\n  $def(\"_hbm82u\", null, [\"md\"], _hbm82u);\n  $def(\"_1anzgx4\", null, [\"Inputs\",\"data\"], _1anzgx4);\n  $def(\"_1yau7bj\", null, [\"md\",\"data\"], _1yau7bj);\n  $def(\"_1h6gpt1\", null, [\"md\"], _1h6gpt1);\n  $def(\"_8gxsp6\", \"viewof dimension\", [\"Inputs\",\"data\"], _8gxsp6);\n  $def(\"_l8gwg6\", \"dimension\", [\"Generators\",\"viewof dimension\"], _l8gwg6);\n  $def(\"_18qbakr\", null, [\"Plot\",\"data\",\"dimension\"], _18qbakr);\n  return main;\n}\n";

const ROWS = FIXTURE.match(/d3\.csvParse\(`([\s\S]*?)`/)[1].trim().split("\n").slice(1).map(l => l.split(","));
const COUNTS = {};
for (const r of ROWS) COUNTS[r[0]] = (COUNTS[r[0]] || 0) + 1;
if (ROWS.length !== 21 || COUNTS.Adelie !== 8 || COUNTS.Gentoo !== 7) throw new Error("penguins eval: fixture rows changed");

const INIT = String.raw`(() => { globalThis.__rc5tBaseMods = new Set([...globalThis.__ojs_runtime.mains.keys()].filter(k => k !== "@user/penguins")); })()`;

const COLLECT = String.raw`(async () => {
  const TOTAL = ${ROWS.length}, COUNTS = ${JSON.stringify(COUNTS)}, SPECIES = Object.keys(COUNTS);
  const rt = globalThis.__ojs_runtime;
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const base = globalThis.__rc5tBaseMods || new Set();
  const out = { chart: "not run", table: "not run", defaultView: "not run", existingControl: "not run", errors: "not run", verdict: "not run" };
  const mod = rt.mains.get("@user/penguins") || [...rt.mains].filter(([k]) => !base.has(k)).map(([, m]) => m)[0];
  if (!mod) { out.verdict = "no @user/penguins module"; return out; }
  const own = () => [...mod._runtime._variables].filter(v => v._module === mod && !v.__rc5tClone && !String(v._name ?? "").startsWith("module ") && v._name !== "@variable");
  const keepers = [], clones = [];
  for (const v of own()) {
    try {
      if (v._name) keepers.push(mod.variable(true).define([v._name], x => x));
      else if (typeof v._definition === "function") {
        const c = mod.variable(true).define(null, v._inputs.map(i => i._name), v._definition);
        c.__rc5tClone = true; clones.push(c);
      }
    } catch (e) {}
  }
  const live = () => [...own(), ...clones];
  const els = () => live().map(v => v._value).filter(x => x instanceof Element);
  const charts = () => els().flatMap(e => e.matches("svg") ? [e] : [...e.querySelectorAll("svg")]).filter(s => s.querySelector("circle"));
  const tables = () => els().flatMap(e => e.matches("table") ? [e] : [...e.querySelectorAll("table")]).filter(t => t.querySelector("thead"));
  const readChart = s => { const cs = [...s.querySelectorAll("circle")]; return { n: cs.length, titles: cs.map(c => c.querySelector("title")?.textContent ?? null), xlabel: [...s.querySelectorAll("[aria-label='x-axis label'], [aria-label='x-axis'] text")].map(t => t.textContent).join(" ") }; };
  const readTable = t => { const ths = [...t.querySelectorAll("thead th")].map(th => th.textContent.trim().toLowerCase()); const i = ths.findIndex(h => h.startsWith("species")); const trs = [...t.querySelectorAll("tbody tr")]; return { n: trs.length, species: trs.map(tr => i >= 0 ? tr.children[i]?.textContent.trim() : null) }; };
  const snap = () => ({ charts: charts().map(readChart), tables: tables().map(readTable) });
  const errs = () => live().filter(v => v._error != null).map(v => (v._name || "(anonymous)") + ": " + String(v._error?.message ?? v._error).slice(0, 160));
  const errSeen = new Set();
  const noteErrs = () => { for (const e of errs()) errSeen.add(e); };
  const settle = async () => { await sleep(900); noteErrs(); };
  const pick = (sel, text) => { const o = [...sel.options].find(o => o.textContent.trim() === text); if (!o) return false; sel.value = o.value; sel.dispatchEvent(new Event("input", { bubbles: true })); sel.dispatchEvent(new Event("change", { bubbles: true })); return true; };
  const matches = (s, sp) => {
    const bad = [];
    if (!s.charts.length) bad.push("no dot chart");
    s.charts.forEach((c, i) => { if (c.n !== (sp ? COUNTS[sp] : TOTAL)) bad.push("chart" + i + " has " + c.n + " dots"); if (sp && c.titles.some(t => t != null && t !== sp)) bad.push("chart" + i + " shows other species"); });
    const cb = bad.length;
    if (!s.tables.length) bad.push("no table");
    s.tables.forEach((t, i) => { if (t.n !== (sp ? COUNTS[sp] : TOTAL)) bad.push("table" + i + " has " + t.n + " rows"); if (sp && t.species.some(x => x != null && x !== sp)) bad.push("table" + i + " shows other species"); });
    return { chart: bad.slice(0, cb), table: bad.slice(cb) };
  };
  try {
    await sleep(1500); noteErrs();
    // the new control: a <select> in a named cell offering all three species
    const selects = own().filter(v => v._name && v._value instanceof Element).flatMap(v => (v._value.matches("select") ? [v._value] : [...v._value.querySelectorAll("select")]).map(s => [v._name, s]));
    const cat = selects.find(([, s]) => SPECIES.every(sp => [...s.options].some(o => o.textContent.trim() === sp)));
    const dim = selects.find(([, s]) => [...s.options].some(o => o.textContent.trim() === "bill_length"));
    out.control = cat ? cat[0] : null;
    const s0 = snap(); out.initial = { charts: s0.charts.map(c => c.n), tables: s0.tables.map(t => t.n) };
    const m0 = matches(s0, null);
    out.defaultView = m0.chart.length + m0.table.length ? "initial view: " + [...m0.chart, ...m0.table].join("; ") : "ok";
    if (!cat) { out.chart = out.table = "no <select> offering " + SPECIES.join("/") + " in a named cell (selects: " + selects.map(([n]) => n).join(",") + ")"; }
    else {
      const res = {};
      for (const sp of ["Adelie", "Gentoo"]) { pick(cat[1], sp); await settle(); const s = snap(); res[sp] = { m: matches(s, sp), charts: s.charts.map(c => c.n), tables: s.tables.map(t => t.n) }; }
      out.driven = Object.fromEntries(Object.entries(res).map(([k, r]) => [k, { charts: r.charts, tables: r.tables }]));
      const cBad = Object.entries(res).flatMap(([k, r]) => r.m.chart.map(b => k + ": " + b));
      const tBad = Object.entries(res).flatMap(([k, r]) => r.m.table.map(b => k + ": " + b));
      out.chart = cBad.length ? cBad.join("; ") : "ok";
      out.table = tBad.length ? tBad.join("; ") : "ok";
    }
    // the existing x-axis control still moves the chart (and the category filter still holds)
    if (!dim) out.existingControl = "the x-axis select (bill_length option) is gone";
    else {
      const before = snap().charts.map(c => c.xlabel).join("|");
      pick(dim[1], "bill_length"); await settle();
      const after = snap();
      const xl = after.charts.map(c => c.xlabel).join("|");
      const sp = cat ? "Gentoo" : null;
      const m = matches(after, sp);
      out.existingControl = !after.charts.length ? "no dot chart after changing x axis"
        : !/bill_length/.test(xl) ? "x axis did not follow the select (" + before.slice(0, 60) + " -> " + xl.slice(0, 60) + ")"
        : m.chart.length ? "after changing x axis: " + m.chart.join("; ") : "ok";
      pick(dim[1], "flipper_length"); await settle();
    }
    noteErrs();
    out.errors = errSeen.size ? [...errSeen].join("; ") : "none";
    out.verdict = [out.chart, out.table, out.defaultView, out.existingControl].every(x => x === "ok") && out.errors === "none" ? "ok" : "not ok";
    return out;
  } catch (e) { out.verdict = "collect threw: " + (e?.message ?? e); return out; }
  finally { for (const k of [...keepers, ...clones]) { try { k.delete(); } catch {} } }
})()`;

const rep = (src, a, b) => { if (!src.includes(a)) throw new Error("penguins eval: edit did not apply: " + a.slice(0, 60)); return src.replace(a, b); };
// the new cells, after the corpus idiom @tomlarkworthy gallery toolRegistry_inspector_controls /
// toolRegistry_history_filtered (lopebooks/notebooks/@tomlarkworthy_gallery.html): an "(all)" first option
const ADD_SELECT = (s) => rep(s, "\nexport default function define", `
const _species = function _species(Inputs,data){return(
Inputs.select(["(all)", ...new Set(data.map(d => d.species))], {label: "Species", value: "(all)"})
)};
const _species_gen = (G, _) => G.input(_);
const _filtered = function _filtered(data,species){return(
species === "(all)" ? data : data.filter(d => d.species === species)
)};

export default function define`).replace(`  return main;`, `  $def("_species", "viewof species", ["Inputs","data"], _species);
  $def("_species_gen", "species", ["Generators","viewof species"], _species_gen);
  $def("_filtered", "filtered", ["data","species"], _filtered);
  return main;`);
const TABLE = (s) => rep(rep(s, "function _8(Inputs,data){return(\nInputs.table(data)", "function _8(Inputs,filtered){return(\nInputs.table(filtered)"),
  `$def("_1anzgx4", null, ["Inputs","data"]`, `$def("_1anzgx4", null, ["Inputs","filtered"]`);
const CHART = (s) => rep(rep(s, "function _13(Plot,data,dimension){return(\nPlot.dot(data, {x: dimension", "function _13(Plot,filtered,dimension){return(\nPlot.dot(filtered, {x: dimension"),
  `$def("_18qbakr", null, ["Plot","data","dimension"]`, `$def("_18qbakr", null, ["Plot","filtered","dimension"]`);
const BREAK_X = (s) => rep(rep(s, "function _13(Plot,filtered,dimension){return(\nPlot.dot(filtered, {x: dimension", "function _13(Plot,filtered){return(\nPlot.dot(filtered, {x: \"flipper_length\""),
  `$def("_18qbakr", null, ["Plot","filtered","dimension"]`, `$def("_18qbakr", null, ["Plot","filtered"]`);

const SOLUTIONS = {
  ok: CHART(TABLE(ADD_SELECT(FIXTURE))),
  table: TABLE(ADD_SELECT(FIXTURE)),        // negative: filters only the table
  unwired: ADD_SELECT(FIXTURE),             // negative: a dropdown wired to nothing
  breaks: BREAK_X(CHART(TABLE(ADD_SELECT(FIXTURE)))), // negative: filters both, x-axis select stops working
};
const NEG = globalThis.process?.env?.M16_NEG;

export default {
  id: "rc5t-penguins-category-filter",
  category: "rc5-train",
  question: "Add a dropdown to my notebook so I can pick which species the chart and the table show. Keep everything else working.",
  setup: { files: { "/src/@user/penguins.js": FIXTURE }, init: INIT, collect: COLLECT },
  criteria: [
    { name: "collected_equals", args: { key: "verdict", equals: "ok" }, weight: 4 },
    { name: "collected_equals", args: { key: "chart", equals: "ok" }, weight: 1 },
    { name: "collected_equals", args: { key: "table", equals: "ok" }, weight: 1 },
    { name: "collected_equals", args: { key: "defaultView", equals: "ok" }, weight: 1 },
    { name: "collected_equals", args: { key: "existingControl", equals: "ok" }, weight: 1 },
    { name: "collected_equals", args: { key: "errors", equals: "none" }, weight: 1 },
  ],
  oracle: [
    { tool: "read_file", args: { file_path: "/src/@user/penguins.js" } },
    { tool: "write_file", args: { file_path: "/src/@user/penguins.js", content: SOLUTIONS[NEG || "ok"] } },
  ],
};
