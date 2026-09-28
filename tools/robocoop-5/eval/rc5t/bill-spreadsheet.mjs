// rc5-train eval (20260928-0847-w2): asked for "a spreadsheet", the agent built one by hand.
// In run 20260928-0847-w2-before the index listed "/content/@tomlarkworthy/markdown-wiki/important-modules.md —
// Important modules: spreadsheets, documents, …". The agent read writing-cells-in-module-source.md and
// event-handlers-in-cells.md, never important-modules.md, and hand-rolled a mutable array + <form> + table
// (5 erroring edits on the way) instead of importing @tomlarkworthy/sheet.
//
// In the retitled-page run (eval-fixed) the agent read the page, then wrote Inputs.table(rows, {editable: {…}}):
// Inputs.table has no such option, the table was read-only, and it told the user "Editable table".
//
// Criteria: the page was read (the defect), each person's share is computed and the rows are editable
// (behaviour; any build passes),
// and the published sheet module was imported (weight 1: a hand-built table that is correct still scores 0.8).

const INIT = String.raw`(() => {
  const rt = [...globalThis.__ojs_runtime.mains.values()].find(m => m && m._runtime)._runtime;
  globalThis.__rc5tBefore = new Set([...rt._variables].map(v => v._module));
})()`;

// Every module created during the turn: keep its cells reachable, then look for Ann = 18 and Ben = 22
// in the values: rendered text naming each share, or number cells alongside the two names (a sheet).
const COLLECT = String.raw`(async () => {
  const rt = [...globalThis.__ojs_runtime.mains.values()].find(m => m && m._runtime)._runtime;
  const userVars = [...rt._variables].filter(v => !globalThis.__rc5tBefore.has(v._module) && v._name &&
    !String(v._name).startsWith("module ") && v._name !== "@variable");
  if (!userVars.length) return "no module was created";
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const keepers = [];
  for (const v of userVars) { try { keepers.push(v._module.variable(true).define([v._name], x => x)); } catch {} }
  try {
    await sleep(3000);
    const nums = new Set(); let text = "";
    const walk = (x, d = 0) => {
      if (d > 4 || x == null) return;
      if (typeof x === "number") { nums.add(Math.round(x * 100) / 100); return; }
      if (typeof x === "string") { text += " " + x; return; }
      if (typeof Element !== "undefined" && x instanceof Element) { text += " " + x.textContent; return; }
      if (x instanceof Map) { for (const [k, v] of x) { text += " " + k; walk(v, d + 1); } return; }
      if (Array.isArray(x)) { x.forEach(y => walk(y, d + 1)); return; }
      if (typeof x === "object") for (const [k, v] of Object.entries(x)) { text += " " + k; walk(v, d + 1); }
    };
    for (const v of userVars) walk(v._value);
    // rendered text pairs a name with its share ("Ann … 18.00"), or the values hold both names and both numbers (a sheet)
    const pair = (who, n) => new RegExp(who + "[^0-9]{0,60}" + n + "(?:[.,]0+)?(?![0-9])").test(text);
    const byText = pair("Ann", 18) && pair("Ben", 22);
    const byCells = nums.has(18) && nums.has(22) && /\bAnn\b/.test(text) && /\bBen\b/.test(text);
    if (!byText && !byCells) return "owed amounts not found (Ann 18, Ben 22); numbers seen " + [...nums].slice(0, 30).join(",") + "; text " + text.replace(/\s+/g, " ").slice(0, 200);
    // a spreadsheet's rows are typed into: some text/number field, textarea or contenteditable in the module's output.
    // Inputs.table has no editable option (vendor/observable-inputs/src/table.js); its only inputs are selection checkboxes.
    const SEL = "input:not([type=checkbox]):not([type=radio]):not([type=button]):not([type=submit]), textarea, [contenteditable]:not([contenteditable=false])";
    const editable = userVars.some(v => v._value instanceof Element && (v._value.matches(SEL) || v._value.querySelector(SEL)));
    if (!editable) return "rows cannot be edited: no text/number field, textarea or contenteditable in any cell of the new module";
    return "ok";
  } finally {
    for (const k of keepers) { try { k.delete(); } catch {} }
  }
})()`;

const SHEET = "https://earthstar.us-east.host.bsky.network/xrpc/com.atproto.sync.getBlob?did=did:plc:j7nm3lrd5h7fm3sfhcv3lhfv&cid=bafkreictiyvkeezqxxbuvqd74f6qzkglc3vsgume6fz5gz5bgph2vq4vga";

// the sheet example from important-modules.md "sheet", with the bill as its cells
const SOLUTION = `const _A1 = function A1(){return( "Pizza" )};
const _B1 = function B1(){return( 24 )};
const _C1 = function C1(){return( "Ann, Ben" )};
const _A2 = function A2(){return( "Beer" )};
const _B2 = function B2(){return( 6 )};
const _C2 = function C2(){return( "Ann" )};
const _A3 = function A3(){return( "Salad" )};
const _B3 = function B3(){return( 10 )};
const _C3 = function C3(){return( "Ben" )};
const _items = function items(A1,B1,C1,A2,B2,C2,A3,B3,C3){return( [[A1,B1,C1],[A2,B2,C2],[A3,B3,C3]] )};
const _owes = function owes(items){return( (who) => items.reduce((s, [, price, people]) => {
  const ps = String(people).split(",").map(p => p.trim()).filter(Boolean);
  return ps.includes(who) ? s + price / ps.length : s;
}, 0) )};
const _A5 = function A5(){return( "Ann" )};
const _B5 = function B5(owes, A5){return( owes(A5) )};
const _A6 = function A6(){return( "Ben" )};
const _B6 = function B6(owes, A6){return( owes(A6) )};
export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn).pid = pid;
  $def("_A1", "A1", [], _A1); $def("_B1", "B1", [], _B1); $def("_C1", "C1", [], _C1);
  $def("_A2", "A2", [], _A2); $def("_B2", "B2", [], _B2); $def("_C2", "C2", [], _C2);
  $def("_A3", "A3", [], _A3); $def("_B3", "B3", [], _B3); $def("_C3", "C3", [], _C3);
  $def("_items", "items", ["A1","B1","C1","A2","B2","C2","A3","B3","C3"], _items);
  $def("_owes", "owes", ["items"], _owes);
  $def("_A5", "A5", [], _A5); $def("_B5", "B5", ["owes", "A5"], _B5);
  $def("_A6", "A6", [], _A6); $def("_B6", "B6", ["owes", "A6"], _B6);
  $def("_vmy", "viewof myModule", ["thisModule"], (thisModule) => thisModule());
  $def("_my", "myModule", ["Generators", "viewof myModule"], (G, v) => G.input(v));
  $def("_grid", "grid", ["sheet", "runtime", "invalidation", "myModule"],
    (sheet, runtime, invalidation, myModule) => sheet(runtime, {invalidation, module: myModule, format: {B1: "$", B2: "$", B3: "$", B5: "$", B6: "$"}}));
  main.define("module @tomlarkworthy/sheet", async () => "@tomlarkworthy/sheet" && runtime.module((await import("${SHEET}")).default));
  main.define("sheet", ["module @tomlarkworthy/sheet", "@variable"], (_, v) => v.import("sheet", _));
  main.define("module @tomlarkworthy/runtime-sdk", async () => runtime.module((await import("/@tomlarkworthy/runtime-sdk.js?v=4")).default));
  main.define("runtime", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("runtime", _));
  main.define("thisModule", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("thisModule", _));
  return main;
}
`;

export default {
  id: "rc5t-bill-spreadsheet",
  category: "rc5-train",
  question: "Make a spreadsheet for splitting a restaurant bill: each row is an item with its price and who had it, and underneath it shows what each person owes. Start it with these rows: Pizza 24.00 shared by Ann and Ben; Beer 6.00 had by Ann; Salad 10.00 had by Ben.",
  setup: { init: INIT, collect: COLLECT },
  criteria: [
    // scored on behaviour; the baseline never opened important-modules.md, which is why it hand-built a table
    { name: "collected_equals", args: { equals: "ok" }, weight: 2 },
    { name: "tool_call_matches", args: { pattern: "module @tomlarkworthy/sheet" }, weight: 1 },
  ],
  oracle: [
    { tool: "read_file", args: { file_path: "/content/@tomlarkworthy/markdown-wiki/important-modules.md" } },
    { tool: "write_file", args: { file_path: "/src/@user/bill-split.js", content: SOLUTION } },
  ],
};
