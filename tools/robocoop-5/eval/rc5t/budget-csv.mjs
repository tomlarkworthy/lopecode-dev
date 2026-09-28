// rc5-train eval (20260928-0847-w7): an "editable" budget table that cannot be edited.
// In run 20260928-0847-w7-before the agent wrote `Inputs.table(rows, {columns: [...], edit: true})`.
// Inputs.table has no edit option (vendor/observable-inputs/src/table.js); the option is ignored without
// an error, the table's only inputs are row-selection checkboxes, and every cell "computed with no runtime
// error". The agent told the user "Editable table … with inline editing on Category, Planned, and Actual".
// Same defect as rc5t-bill-spreadsheet (w2: `{editable: {...}}`), reached from "editable table" instead of
// "spreadsheet".
//
// Scoring is behavioural (budget-csv.collect.js): change Rent's actual through the page, check the
// difference follows, click the export control and read the CSV. A sheet, an htl table of <input>s or a
// contenteditable table all pass; module id and cell names are free.


const INIT = String.raw`(() => {
  const rt = [...globalThis.__ojs_runtime.mains.values()].find(m => m && m._runtime)._runtime;
  globalThis.__rc5tBefore = new Set([...rt._variables].map(v => v._module));
})()`;

const SHEET = "https://earthstar.us-east.host.bsky.network/xrpc/com.atproto.sync.getBlob?did=did:plc:j7nm3lrd5h7fm3sfhcv3lhfv&cid=bafkreictiyvkeezqxxbuvqd74f6qzkglc3vsgume6fz5gz5bgph2vq4vga";

// important-modules.md "sheet" (cells named by address, a formula is a cell body) + "Files" (DOM.download of d3.csvFormat)
const SOLUTION = `const _A1 = function A1(){return( "Category" )};
const _B1 = function B1(){return( "Planned" )};
const _C1 = function C1(){return( "Actual" )};
const _D1 = function D1(){return( "Difference" )};
const _A2 = function A2(){return( "Rent" )};
const _B2 = function B2(){return( 1200 )};
const _C2 = function C2(){return( 1250 )};
const _D2 = function D2(B2, C2){return( B2 - C2 )};
const _A3 = function A3(){return( "Food" )};
const _B3 = function B3(){return( 400 )};
const _C3 = function C3(){return( 380 )};
const _D3 = function D3(B3, C3){return( B3 - C3 )};
const _rows = function rows(A2,B2,C2,D2,A3,B3,C3,D3){return( [
  {category: A2, planned: B2, actual: C2, difference: D2},
  {category: A3, planned: B3, actual: C3, difference: D3}
] )};
const _csvButton = function csvButton(DOM, d3, rows){return( DOM.download(new Blob([d3.csvFormat(rows)], {type: "text/csv"}), "budget.csv", "Export CSV") )};
export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn).pid = pid;
  $def("_A1", "A1", [], _A1); $def("_B1", "B1", [], _B1); $def("_C1", "C1", [], _C1); $def("_D1", "D1", [], _D1);
  $def("_A2", "A2", [], _A2); $def("_B2", "B2", [], _B2); $def("_C2", "C2", [], _C2); $def("_D2", "D2", ["B2", "C2"], _D2);
  $def("_A3", "A3", [], _A3); $def("_B3", "B3", [], _B3); $def("_C3", "C3", [], _C3); $def("_D3", "D3", ["B3", "C3"], _D3);
  $def("_rows", "rows", ["A2","B2","C2","D2","A3","B3","C3","D3"], _rows);
  $def("_csvButton", "csvButton", ["DOM", "d3", "rows"], _csvButton);
  $def("_vmy", "viewof myModule", ["thisModule"], (thisModule) => thisModule());
  $def("_my", "myModule", ["Generators", "viewof myModule"], (G, v) => G.input(v));
  $def("_grid", "grid", ["sheet", "runtime", "invalidation", "myModule"],
    (sheet, runtime, invalidation, myModule) => sheet(runtime, {invalidation, module: myModule, format: {B2: "$", C2: "$", D2: "$", B3: "$", C3: "$", D3: "$"}}));
  main.define("module @tomlarkworthy/sheet", async () => "@tomlarkworthy/sheet" && runtime.module((await import("${SHEET}")).default));
  main.define("sheet", ["module @tomlarkworthy/sheet", "@variable"], (_, v) => v.import("sheet", _));
  main.define("module @tomlarkworthy/runtime-sdk", async () => runtime.module((await import("/@tomlarkworthy/runtime-sdk.js?v=4")).default));
  main.define("runtime", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("runtime", _));
  main.define("thisModule", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("thisModule", _));
  return main;
}
`;

const COLLECT = "// Page-side (setup.collect) for rc5t-budget-csv: act as the user on every module created in the turn.\n// Seed rows: Rent planned 1200 actual 1250, Food planned 400 actual 380.\n//  edited      Rent's actual (1250) was changed to 1300 through the page: a text/number field, a\n//              contenteditable, or a sheet cell (a variable named like C2, redefined as the sheet's\n//              formula bar does). Inputs.table has no edit option, so a read-only table fails here.\n//  difference  before the edit a value of \u00b150 is shown for Rent; after it, \u00b1100.\n//  csvExported clicking a control labelled csv/export/download produces a CSV (Blob or data: URL)\n//              with a header naming a difference column and a Rent line.\n//  csvCurrent  that CSV's Rent line holds 1300 and \u00b1100 (the export reads the edited rows).\n(async () => {\n  const sleep = ms => new Promise(r => setTimeout(r, ms));\n  const rt = [...globalThis.__ojs_runtime.mains.values()].find(m => m && m._runtime)._runtime;\n  const userVars = () => [...rt._variables].filter(v => !globalThis.__rc5tBefore.has(v._module) && v._name &&\n    !String(v._name).startsWith(\"module \") && v._name !== \"@variable\");\n  const out = { edited: false, difference: false, csvExported: false, csvCurrent: false };\n  if (!userVars().length) { out.why = \"no module was created\"; return out; }\n  const keepers = [];\n  for (const v of userVars()) { try { keepers.push(v._module.variable(true).define([v._name], x => x)); } catch {} }\n  const blobs = [];\n  const origCreate = URL.createObjectURL;\n  URL.createObjectURL = function (o) { const u = origCreate.call(URL, o); blobs.push({ url: u, obj: o }); return u; };\n  const origClick = HTMLAnchorElement.prototype.click;\n  const anchors = [];\n  HTMLAnchorElement.prototype.click = function () { anchors.push(this.href); };\n  try {\n    await sleep(3000);\n    const els = () => userVars().map(v => v._value).filter(x => typeof Element !== \"undefined\" && x instanceof Element);\n    const all = sel => els().flatMap(e => [...(e.matches(sel) ? [e] : []), ...e.querySelectorAll(sel)]);\n    const nums = () => {\n      const s = new Set();\n      const walk = (x, d = 0) => {\n        if (d > 4 || x == null) return;\n        if (typeof x === \"number\") { s.add(Math.round(x)); return; }\n        if (typeof x === \"string\") { for (const m of x.matchAll(/[-\u2212]?\\$?\\d[\\d,]*(?:\\.\\d+)?/g)) s.add(Math.round(+m[0].replace(/[\u2212]/, \"-\").replace(/[$,]/g, \"\"))); return; }\n        if (x instanceof Element) {\n          walk(x.textContent, d + 1);\n          for (const i of x.querySelectorAll(\"input\")) walk(i.value, d + 1);\n          if (x.matches(\"input\")) walk(x.value, d + 1);\n          return;\n        }\n        if (Array.isArray(x)) { x.forEach(y => walk(y, d + 1)); return; }\n        if (typeof x === \"object\") for (const v of Object.values(x)) walk(v, d + 1);\n      };\n      for (const v of userVars()) walk(v._value);\n      return s;\n    };\n    const n0 = nums();\n    const before50 = n0.has(50) || n0.has(-50);\n\n    // edit Rent's actual 1250 -> 1300\n    const FIELD = \"input:not([type=checkbox]):not([type=radio]):not([type=button]):not([type=submit]):not([type=range]), textarea\";\n    const field = all(FIELD).find(i => String(i.value).replace(/[$,\\s]/g, \"\") === \"1250\" || +String(i.value).replace(/[$,\\s]/g, \"\") === 1250);\n    const ce = !field && all(\"[contenteditable]:not([contenteditable=false])\").find(e => e.textContent.replace(/[$,\\s]/g, \"\") === \"1250\");\n    if (field) {\n      field.focus?.();\n      field.value = field.type === \"number\" ? \"1300\" : String(field.value).replace(/1,?250/, \"1300\");\n      for (const t of [\"input\", \"change\"]) field.dispatchEvent(new Event(t, { bubbles: true }));\n      field.dispatchEvent(new KeyboardEvent(\"keydown\", { key: \"Enter\", bubbles: true }));\n      field.blur?.();\n      out.edited = \"field\";\n    } else if (ce) {\n      ce.focus?.(); ce.textContent = \"1300\";\n      ce.dispatchEvent(new Event(\"input\", { bubbles: true }));\n      ce.dispatchEvent(new KeyboardEvent(\"keydown\", { key: \"Enter\", bubbles: true }));\n      ce.blur?.(); ce.dispatchEvent(new FocusEvent(\"focusout\", { bubbles: true }));\n      out.edited = \"contenteditable\";\n    } else {\n      const cell = userVars().find(v => /^[A-Z]{1,2}\\d{1,3}$/.test(v._name) && v._value === 1250);\n      if (cell) { cell.define(cell._name, [], () => 1300); out.edited = \"sheet cell \" + cell._name; }\n    }\n    if (!out.edited) { out.why = \"no field, contenteditable or sheet cell holds Rent's actual 1250 (read-only table?)\"; return out; }\n    await sleep(2000);\n    const n1 = nums();\n    out.difference = before50 && (n1.has(100) || n1.has(-100));\n    if (!out.difference) out.whyDiff = \"before \u00b150 \" + before50 + \"; after \" + [...n1].slice(0, 40).join(\",\");\n\n    // export\n    const ctl = all(\"button, a\").find(b => /csv|export|download/i.test(b.textContent + \" \" + (b.getAttribute(\"download\") || \"\")));\n    if (!ctl) { out.why = \"no csv/export/download control\"; return out; }\n    const click = el => el.dispatchEvent(new MouseEvent(\"click\", { bubbles: true, cancelable: true }));\n    const target = ctl.matches(\"a\") ? ctl : ctl;\n    click(target);\n    await sleep(800);\n    if (!blobs.length && !anchors.some(h => h.startsWith(\"data:\"))) { click(target); await sleep(800); }\n    let csv = null;\n    for (const b of blobs) { try { const t = await b.obj.text(); if (/Rent/.test(t)) csv = t; } catch {} }\n    const hrefs = [...anchors, ...all(\"a[href^='data:']\").map(a => a.href)];\n    for (const h of hrefs) if (!csv && h.startsWith(\"data:\")) { const t = decodeURIComponent(h.slice(h.indexOf(\",\") + 1)); if (/Rent/.test(t)) csv = t; }\n    out.csvHead = csv && csv.slice(0, 200);\n    if (!csv) { out.why = \"clicking \" + JSON.stringify(ctl.textContent.trim().slice(0, 40)) + \" produced no CSV with a Rent line\"; return out; }\n    const lines = csv.trim().split(/\\r?\\n/);\n    out.csvExported = /diff|variance|remaining/i.test(lines[0]) && lines.some(l => /Rent/.test(l));\n    const rent = lines.find(l => /Rent/.test(l)) || \"\";\n    const fields = rent.split(/,(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)/).map(f => +f.replace(/[\"$\\s,]/g, \"\").replace(\"\u2212\", \"-\"));\n    out.csvCurrent = fields.includes(1300) && (fields.includes(100) || fields.includes(-100));\n    return out;\n  } finally {\n    URL.createObjectURL = origCreate;\n    HTMLAnchorElement.prototype.click = origClick;\n    for (const k of keepers) { try { k.delete(); } catch {} }\n  }\n})()\n";

export default {
  id: "rc5t-budget-csv",
  category: "rc5-train",
  question: "Make an editable monthly budget table (category, planned, actual) with a difference column and a button to export it as CSV. Start it with two rows: Rent planned 1200 actual 1250, and Food planned 400 actual 380.",
  setup: { init: INIT, collect: COLLECT },
  criteria: [
    // the defect: Rent's actual cannot be changed on the page (read-only Inputs.table)
    { name: "collected_equals", args: { key: "difference", equals: true }, weight: 3 },
    { name: "collected_equals", args: { key: "csvExported", equals: true }, weight: 1 },
    { name: "collected_equals", args: { key: "csvCurrent", equals: true }, weight: 2 },
    { name: "no_runtime_errors", args: {}, weight: 1 },
  ],
  oracle: [
    { tool: "write_file", args: { file_path: "/src/@user/budget.js", content: SOLUTION }, settleMs: 4000 },
  ],
};
