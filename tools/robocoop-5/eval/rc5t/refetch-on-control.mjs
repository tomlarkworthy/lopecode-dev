// rc5-train eval (20260928-0847-m18): a maintenance goal. The user's notebook re-downloads its data on
// every control change; make it faster without changing what it shows.
// setup.files seeds @user/penguins: @observablehq/plot-exploration-penguins (embedded in
// lopebooks/notebooks/@tomlarkworthy_cloudevents-explorer.html) re-homed, 21 real rows, with the data cell
// changed from FileAttachment(...).csv({typed: true}) to d3.csv(<url>, d3.autoType) and the seeded defect:
// the `data` cell fetches AND filters by `species`, so each species change re-fetches the CSV.
// Provenance: tools/scratch/rc5-train/20260928-0847/m18/fixtures/PROVENANCE.txt.
//
// setup.initScript serves https://penguin-census.test/palmer-penguins.csv from page JS with an 800 ms delay
// and counts requests (globalThis.__penguinFetches). routes cannot delay or count.
// setup.collect (behaviour, not spelling):
//   fetches  - counter reset, then the Species <select> is driven to Adelie, Gentoo, Chinstrap and the x-axis
//              select to bill_length: at most 1 request in total (0 when the data is already loaded)
//   outputs  - for each species, every table's rows (species|body_mass, in order), every dot chart's circle
//              count and titles, and the mean body mass shown, equal what the unedited fixture shows for that
//              species (expected values computed here from the CSV, not in the page)
//   refresh  - the server's data gains one Gentoo row; every live cell whose source names the URL is re-run;
//              Gentoo must then show 8 rows. A notebook with the CSV pasted in (no cell fetches the URL) or a
//              cache that outlives its cell (a global/localStorage memo) keeps showing 7 and fails: the user
//              asked to keep loading from the server, and pasted data stops following upstream updates.
//   errors   - no cell (anonymous included) errors at any point.
// M18_NEG=unchanged|stalecache|hardcoded swaps the oracle for a negative control (must score low).
const FIXTURE = "const _1tk47nv = function _1(md){return(\nmd`# Penguin census\n\nThe Palmer penguins sample, loaded from the survey server and shown as a summary, a table and a chart.`\n)};\nconst _w2qj1w = function _3(md){return(\nmd`Good day! Here is a fine dataset of [penguins](https://allisonhorst.github.io/palmerpenguins/):`\n)};\nconst _k3sp01 = function _species(Inputs){return(\nInputs.select([\"All\", \"Adelie\", \"Chinstrap\", \"Gentoo\"], {label: \"Species\", value: \"All\"})\n)};\nconst _k3sp02 = (G, _) => G.input(_);\nconst _h6dqmp = async function _data(d3,species){return(\n(await d3.csv(\"https://penguin-census.test/palmer-penguins.csv\", d3.autoType))\n  .filter(d => species === \"All\" || d.species === species)\n)};\nconst _k3sum1 = function _5(md,data,d3){return(\nmd`**${data.length}** penguins, mean body mass **${Math.round(d3.mean(data, d => d.body_mass))} g**`\n)};\nconst _hbm82u = function _7(md){return(\nmd`## Table`\n)};\nconst _1anzgx4 = function _8(Inputs,data){return(\nInputs.table(data)\n)};\nconst _1h6gpt1 = function _10(md){return(\nmd`## Plot\n\nHow is body mass related to the other measurements? Pick the measurement for the x axis:`\n)};\nconst _8gxsp6 = function _dimension(Inputs){return(\nInputs.select([\"bill_length\", \"bill_depth\", \"flipper_length\"], {\n  label: \"x axis\",\n  value: \"flipper_length\"\n})\n)};\nconst _l8gwg6 = (G, _) => G.input(_);\nconst _18qbakr = function _13(Plot,data,dimension){return(\nPlot.dot(data, {x: dimension, y: \"body_mass\", fill: \"species\", title: \"species\"}).plot({ grid: true })\n)};\n\nexport default function define(runtime, observer) {\n  const main = runtime.module();\n  const $def = (pid, name, deps, fn) => {\n    main.variable(observer(name)).define(name, deps, fn).pid = pid;\n  };\n  $def(\"_1tk47nv\", null, [\"md\"], _1tk47nv);\n  $def(\"_w2qj1w\", null, [\"md\"], _w2qj1w);\n  $def(\"_k3sp01\", \"viewof species\", [\"Inputs\"], _k3sp01);\n  $def(\"_k3sp02\", \"species\", [\"Generators\",\"viewof species\"], _k3sp02);\n  $def(\"_h6dqmp\", \"data\", [\"d3\",\"species\"], _h6dqmp);\n  $def(\"_k3sum1\", null, [\"md\",\"data\",\"d3\"], _k3sum1);\n  $def(\"_hbm82u\", null, [\"md\"], _hbm82u);\n  $def(\"_1anzgx4\", null, [\"Inputs\",\"data\"], _1anzgx4);\n  $def(\"_1h6gpt1\", null, [\"md\"], _1h6gpt1);\n  $def(\"_8gxsp6\", \"viewof dimension\", [\"Inputs\"], _8gxsp6);\n  $def(\"_l8gwg6\", \"dimension\", [\"Generators\",\"viewof dimension\"], _l8gwg6);\n  $def(\"_18qbakr\", null, [\"Plot\",\"data\",\"dimension\"], _18qbakr);\n  return main;\n}\n";
const CSV = "species,island,bill_length,bill_depth,flipper_length,body_mass,sex\nAdelie,Torgersen,39.1,18.7,181,3750,MALE\nAdelie,Biscoe,38.2,18.1,185,3950,MALE\nAdelie,Dream,40.8,18.4,195,3900,MALE\nAdelie,Biscoe,35.7,16.9,185,3150,FEMALE\nAdelie,Torgersen,42.1,19.1,195,4000,MALE\nAdelie,Dream,40.3,18.5,196,4350,MALE\nAdelie,Biscoe,42.7,18.3,196,4075,MALE\nAdelie,Dream,37.5,18.5,199,4475,MALE\nChinstrap,Dream,46.5,17.9,192,3500,FEMALE\nChinstrap,Dream,51.7,20.3,194,3775,MALE\nChinstrap,Dream,43.2,16.6,187,2900,FEMALE\nChinstrap,Dream,49.7,18.6,195,3600,MALE\nChinstrap,Dream,50.8,18.5,201,4450,MALE\nChinstrap,Dream,45.2,16.6,191,3250,FEMALE\nGentoo,Biscoe,46.1,13.2,211,4500,FEMALE\nGentoo,Biscoe,49.2,15.2,221,6300,MALE\nGentoo,Biscoe,48.4,16.3,220,5400,MALE\nGentoo,Biscoe,45.1,14.4,210,4400,FEMALE\nGentoo,Biscoe,47.7,15,216,4750,FEMALE\nGentoo,Biscoe,51.3,14.2,218,5300,MALE\nGentoo,Biscoe,46.8,16.1,215,5500,MALE\n";
const URL_ = "https://penguin-census.test/palmer-penguins.csv";
const EXTRA = "Gentoo,Biscoe,50,15.3,220,5550,MALE";

const parse = (csv) => csv.trim().split("\n").slice(1).map(l => { const c = l.split(","); return { species: c[0], body_mass: +c[5] }; });
const expectFor = (rows, sp) => {
  const r = rows.filter(d => sp === "All" || d.species === sp);
  return { n: r.length, mean: Math.round(r.reduce((a, d) => a + d.body_mass, 0) / r.length), rows: r.map(d => d.species + "|" + d.body_mass), titles: r.map(d => d.species).sort() };
};
const ROWS = parse(CSV);
const EXPECT = Object.fromEntries(["All", "Adelie", "Gentoo", "Chinstrap"].map(sp => [sp, expectFor(ROWS, sp)]));
const EXPECT_V2_GENTOO = expectFor(parse(CSV + "\n" + EXTRA), "Gentoo");
if (EXPECT.All.n !== 21 || EXPECT.Gentoo.n !== 7 || EXPECT_V2_GENTOO.n !== 8) throw new Error("m18 eval: fixture rows changed");

const INITSCRIPT = `(() => {
  const V1 = ${JSON.stringify(CSV.trim() + "\n")}, EXTRA = ${JSON.stringify(EXTRA)};
  globalThis.__penguinFetches = 0; globalThis.__penguinVersion = 1;
  const realFetch = globalThis.fetch;
  globalThis.fetch = function (input, init) {
    let url;
    try { url = new URL(typeof input === "string" ? input : input.url, location.href); } catch { return realFetch.apply(this, arguments); }
    if (url.hostname !== "penguin-census.test") return realFetch.apply(this, arguments);
    globalThis.__penguinFetches++;
    const body = globalThis.__penguinVersion === 2 ? V1 + EXTRA + "\\n" : V1;
    return new Promise(r => setTimeout(() => r(new Response(url.pathname === "/palmer-penguins.csv" ? body : "not found",
      { status: url.pathname === "/palmer-penguins.csv" ? 200 : 404, headers: { "content-type": "text/csv", "access-control-allow-origin": "*" } })), 800));
  };
})();`;

const INIT = String.raw`(() => { globalThis.__rc5tBaseMods = new Set([...globalThis.__ojs_runtime.mains.keys()].filter(k => k !== "@user/penguins")); })()`;

const COLLECT = String.raw`(async () => {
  const EXPECT = ${JSON.stringify(EXPECT)}, V2G = ${JSON.stringify(EXPECT_V2_GENTOO)}, HOST = "penguin-census.test";
  const rt = globalThis.__ojs_runtime;
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const base = globalThis.__rc5tBaseMods || new Set();
  const out = { fetches: "not run", outputs: "not run", refresh: "not run", existingControl: "not run", errors: "not run", verdict: "not run" };
  const mod = rt.mains.get("@user/penguins") || [...rt.mains].filter(([k]) => !base.has(k)).map(([, m]) => m)[0];
  if (!mod) { out.verdict = "no @user/penguins module"; return out; }
  globalThis.__penguinFetches = 0;
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
  const readChart = s => { const cs = [...s.querySelectorAll("circle")]; return { n: cs.length, titles: cs.map(c => c.querySelector("title")?.textContent ?? "").sort(), xlabel: [...s.querySelectorAll("[aria-label='x-axis label'], [aria-label='x-axis'] text")].map(t => t.textContent).join(" ") }; };
  const readTable = t => { const ths = [...t.querySelectorAll("thead th")].map(th => th.textContent.trim().toLowerCase()); const i = ths.findIndex(h => h.startsWith("species")), j = ths.findIndex(h => h.startsWith("body_mass")); return [...t.querySelectorAll("tbody tr")].map(tr => (tr.children[i]?.textContent.trim() ?? "?") + "|" + String(tr.children[j]?.textContent.trim() ?? "?").replace(/[,\s]/g, "")); };
  const text = () => els().map(e => e.textContent).join(" | ").replace(/(\d),(\d{3})/g, "$1$2");
  const errs = () => live().filter(v => v._error != null).map(v => (v._name || "(anonymous)") + ": " + String(v._error?.message ?? v._error).slice(0, 160));
  const errSeen = new Set();
  const noteErrs = () => { for (const e of errs()) errSeen.add(e); };
  const settle = async () => { await sleep(2500); noteErrs(); };
  const pick = (sel, t) => { const o = [...sel.options].find(o => o.textContent.trim() === t); if (!o) return false; sel.value = o.value; sel.dispatchEvent(new Event("input", { bubbles: true })); sel.dispatchEvent(new Event("change", { bubbles: true })); return true; };
  const check = (sp, e) => {
    const bad = [];
    const cs = charts().map(readChart), ts = tables().map(readTable);
    if (!cs.length) bad.push("no dot chart");
    cs.forEach((c, i) => { if (c.n !== e.n) bad.push("chart" + i + " " + c.n + " dots (want " + e.n + ")"); else if (JSON.stringify(c.titles) !== JSON.stringify(e.titles)) bad.push("chart" + i + " wrong species"); });
    if (!ts.length) bad.push("no table");
    ts.forEach((r, i) => { if (r.length !== e.n) bad.push("table" + i + " " + r.length + " rows (want " + e.n + ")"); else if (JSON.stringify(r) !== JSON.stringify(e.rows)) bad.push("table" + i + " rows differ: " + r.slice(0, 3).join(",")); });
    if (!new RegExp("\\b" + e.mean + "\\b").test(text())) bad.push("mean body mass " + e.mean + " not shown");
    return bad.map(b => sp + ": " + b);
  };
  try {
    await settle();
    const selects = own().filter(v => v._name && v._value instanceof Element).flatMap(v => (v._value.matches("select") ? [v._value] : [...v._value.querySelectorAll("select")]).map(s => [v._name, s]));
    const cat = selects.find(([, s]) => ["Adelie", "Gentoo", "Chinstrap"].every(sp => [...s.options].some(o => o.textContent.trim() === sp)));
    const dim = selects.find(([, s]) => [...s.options].some(o => o.textContent.trim() === "bill_length"));
    const cur = cat ? [...cat[1].options].find(o => o.selected)?.textContent.trim() : null;
    out.initial = { control: cat?.[0] ?? null, selected: cur };
    const bad = [];
    if (!cat) bad.push("no species <select> in a named cell (selects: " + selects.map(([n]) => n).join(",") + ")");
    else {
      if (EXPECT[cur]) bad.push(...check(cur, EXPECT[cur]));
      for (const sp of ["Adelie", "Gentoo", "Chinstrap"]) { pick(cat[1], sp); await settle(); bad.push(...check(sp, EXPECT[sp])); }
    }
    if (!dim) out.existingControl = "the x-axis select (bill_length option) is gone";
    else {
      pick(dim[1], "bill_length"); await settle();
      const xl = charts().map(readChart).map(c => c.xlabel).join("|");
      out.existingControl = /bill_length/.test(xl) ? "ok" : "x axis did not follow the select (" + xl.slice(0, 80) + ")";
      pick(dim[1], "flipper_length"); await settle();
    }
    out.fetchCount = globalThis.__penguinFetches;
    out.fetches = !cat ? "species control not found" : out.fetchCount <= 1 ? "ok" : out.fetchCount + " requests while changing controls (allowed 1)";
    out.outputs = bad.length ? bad.join("; ") : "ok";
    // upstream data changes; re-run the cells that load it
    globalThis.__penguinVersion = 2;
    const loaders = own().filter(v => typeof v._definition === "function" && String(v._definition).includes(HOST));
    out.loaders = loaders.map(v => v._name || "(anonymous)");
    if (!loaders.length) out.refresh = "no cell loads " + HOST + " (data no longer comes from the server)";
    else if (!cat) out.refresh = "species control not found";
    else {
      for (const v of loaders) v.define(v._name, v._inputs.map(i => i._name), v._definition);
      await settle();
      pick(cat[1], "All"); await settle();
      pick(cat[1], "Gentoo"); await settle();
      const rb = check("Gentoo after upstream update", V2G);
      out.refresh = rb.length ? rb.join("; ") : "ok";
    }
    noteErrs();
    out.errors = errSeen.size ? [...errSeen].join("; ") : "none";
    out.verdict = [out.fetches, out.outputs, out.refresh, out.existingControl].every(x => x === "ok") && out.errors === "none" ? "ok" : "not ok";
    return out;
  } catch (e) { out.verdict = "collect threw: " + (e?.message ?? e); return out; }
  finally { globalThis.__penguinVersion = 1; for (const k of [...keepers, ...clones]) { try { k.delete(); } catch {} } }
})()`;

const rep = (src, a, b) => { if (!src.includes(a)) throw new Error("m18 eval: edit did not apply: " + a.slice(0, 60)); return src.replace(a, b); };
const DATA_CELL = 'const _h6dqmp = async function _data(d3,species){return(\n(await d3.csv("https://penguin-census.test/palmer-penguins.csv", d3.autoType))\n  .filter(d => species === "All" || d.species === species)\n)};';
const DATA_DEF = '$def("_h6dqmp", "data", ["d3","species"], _h6dqmp);';
// the fix: load once in `data`, filter in its own cell (the split used by @tomlarkworthy/gallery
// toolRegistry_history_filtered, lopebooks/notebooks/@tomlarkworthy_gallery.html)
const SPLIT = (s, dataBody) => {
  s = rep(s, DATA_CELL, `const _h6dqmp = ${dataBody};
const _k3flt1 = function _filtered(data,species){return(
data.filter(d => species === "All" || d.species === species)
)};`);
  s = rep(s, DATA_DEF, `$def("_h6dqmp", "data", ["d3"], _h6dqmp);
  $def("_k3flt1", "filtered", ["data","species"], _k3flt1);`);
  s = rep(s, "function _5(md,data,d3){return(\nmd`**${data.length}** penguins, mean body mass **${Math.round(d3.mean(data, d => d.body_mass))} g**`",
    "function _5(md,filtered,d3){return(\nmd`**${filtered.length}** penguins, mean body mass **${Math.round(d3.mean(filtered, d => d.body_mass))} g**`");
  s = rep(s, '["md","data","d3"], _k3sum1', '["md","filtered","d3"], _k3sum1');
  s = rep(s, "function _8(Inputs,data){return(\nInputs.table(data)", "function _8(Inputs,filtered){return(\nInputs.table(filtered)");
  s = rep(s, '["Inputs","data"], _1anzgx4', '["Inputs","filtered"], _1anzgx4');
  s = rep(s, "function _13(Plot,data,dimension){return(\nPlot.dot(data,", "function _13(Plot,filtered,dimension){return(\nPlot.dot(filtered,");
  return rep(s, '["Plot","data","dimension"], _18qbakr', '["Plot","filtered","dimension"], _18qbakr');
};
const FETCH_BODY = 'function _data(d3){return(\nd3.csv("https://penguin-census.test/palmer-penguins.csv", d3.autoType)\n)}';
const PASTED_BODY = "function _data(d3){return(\nd3.csvParse(`" + CSV.trim() + "`, d3.autoType)\n)}";
const STALE_CELL = 'const _h6dqmp = async function _data(d3,species){\n  const cache = (globalThis.__penguinCache ??= {});\n  const url = "https://penguin-census.test/palmer-penguins.csv";\n  if (!cache[url]) cache[url] = (await d3.csv(url, d3.autoType)).filter(d => species === "All" || d.species === species);\n  return cache[url];\n};';

const SOLUTIONS = {
  ok: SPLIT(FIXTURE, FETCH_BODY),
  unchanged: FIXTURE,                              // negative: the defect as seeded
  stalecache: rep(FIXTURE, DATA_CELL, STALE_CELL), // negative: memo keyed on the URL only, other species show stale rows
  hardcoded: SPLIT(FIXTURE, PASTED_BODY),          // negative: the CSV pasted into the notebook, no request at all
};
const NEG = globalThis.process?.env?.M18_NEG;

export default {
  id: "rc5t-refetch-on-control",
  category: "rc5-train",
  question: "My notebook (@user/penguins) re-downloads its data every time I change anything and it's slow. Make it faster without changing the results.",
  setup: { files: { "/src/@user/penguins.js": FIXTURE }, initScript: INITSCRIPT, init: INIT, collect: COLLECT },
  criteria: [
    { name: "collected_equals", args: { key: "verdict", equals: "ok" }, weight: 6 },
    { name: "collected_equals", args: { key: "fetches", equals: "ok" }, weight: 2 },
    { name: "collected_equals", args: { key: "outputs", equals: "ok" }, weight: 2 },
    { name: "collected_equals", args: { key: "refresh", equals: "ok" }, weight: 2 },
    { name: "collected_equals", args: { key: "errors", equals: "none" }, weight: 1 },
  ],
  oracle: [
    { tool: "read_file", args: { file_path: "/src/@user/penguins.js" } },
    { tool: "write_file", args: { file_path: "/src/@user/penguins.js", content: SOLUTIONS[NEG || "ok"] } },
  ],
};
