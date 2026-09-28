// rc5-train eval (20260928-0847-m19): a maintenance goal. Clicking Add sometimes adds the item twice,
// and more often the longer the notebook is used.
// setup.files seeds @user/shopping (fixtures/shopping.js, provenance in fixtures/PROVENANCE.txt): a list
// held in `viewof items = Inputs.input([...])`, appended to with the corpus idiom
// `$0.value = [...]; $0.dispatchEvent(new Event("input", {bubbles: true}))`. Seeded defect: the
// `addHandler` cell lists `category` (the select's value) and calls addButton.addEventListener("click", …)
// on the button owned by the `addButton` cell, with no removal on `invalidation`. Each category change
// re-runs addHandler and adds one more listener to the same button, so one click appends N items.
//
// setup.initScript counts live "click" listeners per EventTarget (add/remove, and removal by AbortSignal).
// setup.collect (behaviour, not spelling). It first observes every cell of the module (the module is not
// rendered in the eval layout) and re-defines each own cell, as a reload would: a listener left on the old
// button by a buggy run earlier in the session is not the code's behaviour after the fix.
//   existing - the seeded items "bread" and "dish soap" are listed
//   leak     - click listeners on the Add button, its ancestors, document and window do not grow across
//              5 category changes (Household, Groceries, Household, Groceries, Household)
//   adds     - after those changes: text "oat milk", one click -> exactly 1 list row with it; the same text
//              again, one click -> exactly 2 (a dedupe that drops a repeated item on purpose fails)
//   category - the new rows are tagged Household (the select still has its effect)
//   errors   - no cell (anonymous included) errors
// M19_NEG=unchanged|dedupe|debounce|stalecategory swaps the oracle for a negative control (must score low);
// M19_NEG=ok2|ok3 are other correct fixes (must score 1.00).
const FIXTURE = "const _title = function title(md){return( md`# Shopping list\n\nType an item, pick where it goes, and click **Add**.` )};\nconst _viewof_items = function viewof_items(Inputs){return( Inputs.input([\n  { text: \"bread\", category: \"Groceries\" },\n  { text: \"dish soap\", category: \"Household\" }\n]) )};\nconst _items = function items(Generators, viewof_items){return( Generators.input(viewof_items) )};\nconst _viewof_newItem = function viewof_newItem(Inputs){return( Inputs.text({ label: \"Item\", placeholder: \"e.g. oat milk\" }) )};\nconst _viewof_category = function viewof_category(Inputs){return( Inputs.select([\"Groceries\", \"Household\"], { label: \"Category\" }) )};\nconst _category = function category(Generators, viewof_category){return( Generators.input(viewof_category) )};\nconst _addButton = function addButton(htl){return( htl.html`<button>Add</button>` )};\nconst _addHandler = function addHandler(addButton, category, viewof_items, viewof_newItem, Event){\n  addButton.addEventListener(\"click\", () => {\n    const text = viewof_newItem.value.trim();\n    if (!text) return;\n    viewof_items.value = [...viewof_items.value, { text, category }];\n    viewof_items.dispatchEvent(new Event(\"input\", { bubbles: true }));\n  });\n  return `New items go under ${category}.`;\n};\nconst _list = function list(htl, items){return( htl.html`<ul>${items.map(d => htl.html`<li>${d.text} <small>(${d.category})</small></li>`)}</ul>` )};\nconst _summary = function _summary(md, items){return( md`length: ${items.length} with elements: ${items.map(d => d.text).join(\", \")}` )};\nconst _clear = function _clear(Inputs, viewof_items, Event){return( Inputs.button(\"clear\", {\n  reduce: () => {\n    viewof_items.value = [];\n    viewof_items.dispatchEvent(new Event(\"input\", { bubbles: true }));\n  }\n}) )};\nexport default function define(runtime, observer) {\n  const main = runtime.module();\n  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn).pid = pid;\n  $def(\"_title\", null, [\"md\"], _title);\n  $def(\"_viewof_items\", \"viewof items\", [\"Inputs\"], _viewof_items);\n  $def(\"_items\", \"items\", [\"Generators\", \"viewof items\"], _items);\n  $def(\"_viewof_newItem\", \"viewof newItem\", [\"Inputs\"], _viewof_newItem);\n  main.variable(observer(\"newItem\")).define(\"newItem\", [\"Generators\", \"viewof newItem\"], (G, _) => G.input(_));\n  $def(\"_viewof_category\", \"viewof category\", [\"Inputs\"], _viewof_category);\n  $def(\"_category\", \"category\", [\"Generators\", \"viewof category\"], _category);\n  $def(\"_addButton\", \"addButton\", [\"htl\"], _addButton);\n  $def(\"_addHandler\", \"addHandler\", [\"addButton\", \"category\", \"viewof items\", \"viewof newItem\", \"Event\"], _addHandler);\n  $def(\"_list\", \"list\", [\"htl\", \"items\"], _list);\n  $def(\"_summary\", null, [\"md\", \"items\"], _summary);\n  $def(\"_clear\", null, [\"Inputs\", \"viewof items\", \"Event\"], _clear);\n  return main;\n}\n";

const INITSCRIPT = `(() => {
  const live = new WeakMap();
  const addL = EventTarget.prototype.addEventListener, remL = EventTarget.prototype.removeEventListener;
  const cap = o => typeof o === "boolean" ? o : !!(o && o.capture);
  const drop = (t, l, c) => { const a = live.get(t); if (!a) return; const i = a.findIndex(x => x.l === l && x.c === c); if (i >= 0) a.splice(i, 1); };
  EventTarget.prototype.addEventListener = function (type, l, o) {
    if (type === "click" && l) {
      const c = cap(o), a = live.get(this) || []; live.set(this, a);
      if (!a.some(x => x.l === l && x.c === c)) {
        a.push({ l, c });
        const s = o && typeof o === "object" && o.signal;
        if (s) { if (s.aborted) drop(this, l, c); else addL.call(s, "abort", () => drop(this, l, c), { once: true }); }
      }
    }
    return addL.call(this, type, l, o);
  };
  EventTarget.prototype.removeEventListener = function (type, l, o) {
    if (type === "click") drop(this, l, cap(o));
    return remL.call(this, type, l, o);
  };
  globalThis.__clickListenerCount = (el) => {
    let n = 0;
    for (let e = el; e; e = e.parentNode) n += (live.get(e) || []).length;
    return n + (live.get(document) || []).length + (live.get(window) || []).length;
  };
})();`;

const INIT = String.raw`(() => { globalThis.__rc5tBaseMods = new Set([...globalThis.__ojs_runtime.mains.keys()].filter(k => k !== "@user/shopping")); })()`;

const COLLECT = String.raw`(async () => {
  const rt = globalThis.__ojs_runtime;
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const base = globalThis.__rc5tBaseMods || new Set();
  const out = { existing: "not run", leak: "not run", adds: "not run", category: "not run", errors: "not run", verdict: "not run" };
  const mod = rt.mains.get("@user/shopping") || [...rt.mains].filter(([k]) => !base.has(k)).map(([, m]) => m)[0];
  if (!mod) { out.verdict = "no @user/shopping module"; return out; }
  const own = () => [...rt._variables].filter(v => v._module === mod && v._type === 1 && !String(v._name ?? "").startsWith("module ") && v._name !== "@variable");
  const observed = [];
  const errSeen = new Set();
  const noteErrs = () => { for (const v of own()) if (v._error != null) errSeen.add((v._name || "(anonymous)") + ": " + String(v._error?.message ?? v._error).slice(0, 160)); };
  const settle = async (ms = 1200) => { await sleep(ms); noteErrs(); };
  try {
    for (const v of own()) if (typeof v._observer === "symbol") { observed.push([v, v._observer]); v._observer = {}; rt._dirty.add(v); }
    rt._computeSoon();
    await settle(1500);
    // re-run every own cell, as a reload would
    const skipped = [];
    for (const v of own()) {
      if (typeof v._definition !== "function" || v._inputs.some(i => i._module !== mod && i._module !== rt._builtin)) { skipped.push(v._name || "(anon)"); continue; }
      try { v.define(v._name ?? null, v._inputs.map(i => i._name), v._definition); } catch (e) { skipped.push((v._name || "(anon)") + " threw"); }
    }
    out.notRedefined = skipped;
    await settle(2500);
    const els = () => own().map(v => v._value).filter(x => x instanceof Element);
    const all = sel => els().flatMap(e => [...(e.matches(sel) ? [e] : []), ...e.querySelectorAll(sel)]);
    const addBtn = () => all("button").find(b => /^\W*add\b/i.test(b.textContent.trim()));
    const textIn = () => all("input").find(i => ["text", "search", ""].includes(i.getAttribute("type") ?? ""));
    const catSel = () => all("select").find(s => ["Groceries", "Household"].every(t => [...s.options].some(o => o.textContent.trim() === t)));
    const rows = t => Math.max(0, ...els().map(e => [...e.querySelectorAll("li, tr")].filter(r => r.textContent.includes(t) && ![...r.querySelectorAll("li, tr")].some(c => c.textContent.includes(t))).length));
    const rowTexts = t => els().flatMap(e => [...e.querySelectorAll("li, tr")].filter(r => r.textContent.includes(t) && ![...r.querySelectorAll("li, tr")].some(c => c.textContent.includes(t))).map(r => r.textContent.trim()));
    const pick = (sel, t) => { const o = [...sel.options].find(o => o.textContent.trim() === t); sel.value = o.value; sel.dispatchEvent(new Event("input", { bubbles: true })); sel.dispatchEvent(new Event("change", { bubbles: true })); };
    const type = (inp, t) => { inp.value = t; inp.dispatchEvent(new Event("input", { bubbles: true })); inp.dispatchEvent(new Event("change", { bubbles: true })); };
    const missing = [!addBtn() && "Add button", !textIn() && "text input", !catSel() && "Groceries/Household select"].filter(Boolean);
    if (missing.length) { out.verdict = "not found: " + missing.join(", "); noteErrs(); out.errors = errSeen.size ? [...errSeen].join("; ") : "none"; return out; }
    out.existing = rows("bread") >= 1 && rows("dish soap") >= 1 ? "ok" : "seeded items not listed (bread " + rows("bread") + ", dish soap " + rows("dish soap") + ")";
    const before = globalThis.__clickListenerCount(addBtn());
    for (const c of ["Household", "Groceries", "Household", "Groceries", "Household"]) { pick(catSel(), c); await settle(800); }
    const after = globalThis.__clickListenerCount(addBtn());
    out.listeners = { before, after };
    out.leak = after <= before ? "ok" : "click listeners on the Add button grew from " + before + " to " + after + " over 5 category changes";
    type(textIn(), "oat milk"); await sleep(200); addBtn().click(); await settle();
    const n1 = rows("oat milk");
    type(textIn(), "oat milk"); await sleep(200); addBtn().click(); await settle();
    const n2 = rows("oat milk");
    out.addCounts = [n1, n2];
    out.adds = n1 === 1 && n2 === 2 ? "ok" : "after 5 category changes: first click listed 'oat milk' " + n1 + " times, second click " + n2 + " (want 1, 2)";
    const tagged = rowTexts("oat milk");
    out.rows = tagged.slice(0, 8);
    out.category = tagged.length && tagged.every(t => /Household/.test(t) && !/Groceries/.test(t)) ? "ok" : "new rows not tagged with the selected category Household: " + JSON.stringify(tagged.slice(0, 4));
    noteErrs();
    out.errors = errSeen.size ? [...errSeen].join("; ") : "none";
    out.verdict = [out.existing, out.leak, out.adds, out.category].every(x => x === "ok") && out.errors === "none" ? "ok" : "not ok";
    return out;
  } catch (e) { out.verdict = "collect threw: " + (e?.message ?? e); return out; }
  finally { for (const [v, o] of observed) { v._observer = o; rt._dirty.add(v); } rt._computeSoon(); }
})()`;

const rep = (src, a, b) => { if (!src.includes(a)) throw new Error("m19 eval: edit did not apply: " + a.slice(0, 60)); return src.replace(a, b); };
const HANDLER = FIXTURE.slice(FIXTURE.indexOf("const _addHandler"), FIXTURE.indexOf("const _list"));
const HANDLER_DEF = '$def("_addHandler", "addHandler", ["addButton", "category", "viewof items", "viewof newItem", "Event"], _addHandler);';
const withHandler = (body, deps) => rep(rep(FIXTURE, HANDLER, body + "\n"), HANDLER_DEF, `$def("_addHandler", "addHandler", ${JSON.stringify(deps)}, _addHandler);`);

// the fix: remove the listener when the cell is invalidated
// (@tomlarkworthy/spectral-layout plot_editor, lopecode/notebooks/@tomlarkworthy_atlas.html)
const OK = withHandler(`const _addHandler = function addHandler(addButton, category, viewof_items, viewof_newItem, Event, invalidation){
  const onClick = () => {
    const text = viewof_newItem.value.trim();
    if (!text) return;
    viewof_items.value = [...viewof_items.value, { text, category }];
    viewof_items.dispatchEvent(new Event("input", { bubbles: true }));
  };
  addButton.addEventListener("click", onClick);
  invalidation.then(() => addButton.removeEventListener("click", onClick));
  return \`New items go under \${category}.\`;
};`, ["addButton", "category", "viewof items", "viewof newItem", "Event", "invalidation"]);
// other correct fix: the handler cell lists viewof category and reads .value at click time, so it runs once
const OK2 = withHandler(`const _addHandler = function addHandler(addButton, viewof_category, viewof_items, viewof_newItem, Event){
  addButton.addEventListener("click", () => {
    const text = viewof_newItem.value.trim();
    if (!text) return;
    viewof_items.value = [...viewof_items.value, { text, category: viewof_category.value }];
    viewof_items.dispatchEvent(new Event("input", { bubbles: true }));
  });
  return "Add is wired.";
};`, ["addButton", "viewof category", "viewof items", "viewof newItem", "Event"]);
// other correct fix: the button carries its own htl onclick; no separate handler cell
const OK3 = rep(rep(rep(FIXTURE, HANDLER, ""), HANDLER_DEF, ""),
  'const _addButton = function addButton(htl){return( htl.html`<button>Add</button>` )};',
  `const _addButton = function addButton(htl, viewof_category, viewof_items, viewof_newItem, Event){return( htl.html\`<button onclick=\${() => {
  const text = viewof_newItem.value.trim();
  if (!text) return;
  viewof_items.value = [...viewof_items.value, { text, category: viewof_category.value }];
  viewof_items.dispatchEvent(new Event("input", { bubbles: true }));
}}>Add</button>\` )};`).replace('$def("_addButton", "addButton", ["htl"], _addButton);',
  '$def("_addButton", "addButton", ["htl", "viewof category", "viewof items", "viewof newItem", "Event"], _addButton);');
// negative: keeps the leak, skips an item already listed under that category
const DEDUPE = withHandler(`const _addHandler = function addHandler(addButton, category, viewof_items, viewof_newItem, Event){
  addButton.addEventListener("click", () => {
    const text = viewof_newItem.value.trim();
    if (!text) return;
    if (viewof_items.value.some(d => d.text === text && d.category === category)) return;
    viewof_items.value = [...viewof_items.value, { text, category }];
    viewof_items.dispatchEvent(new Event("input", { bubbles: true }));
  });
  return \`New items go under \${category}.\`;
};`, ["addButton", "category", "viewof items", "viewof newItem", "Event"]);
// negative: keeps the leak, ignores clicks within 300 ms of the last add
const DEBOUNCE = withHandler(`const _addHandler = function addHandler(addButton, category, viewof_items, viewof_newItem, Event){
  addButton.addEventListener("click", () => {
    const now = performance.now();
    if (now - (addButton.__lastAdd ?? -1e9) < 300) return;
    addButton.__lastAdd = now;
    const text = viewof_newItem.value.trim();
    if (!text) return;
    viewof_items.value = [...viewof_items.value, { text, category }];
    viewof_items.dispatchEvent(new Event("input", { bubbles: true }));
  });
  return \`New items go under \${category}.\`;
};`, ["addButton", "category", "viewof items", "viewof newItem", "Event"]);
// negative: runs once, but reads the category when the cell runs, so every item goes under Groceries
const STALECATEGORY = withHandler(`const _addHandler = function addHandler(addButton, viewof_category, viewof_items, viewof_newItem, Event){
  const category = viewof_category.value;
  addButton.addEventListener("click", () => {
    const text = viewof_newItem.value.trim();
    if (!text) return;
    viewof_items.value = [...viewof_items.value, { text, category }];
    viewof_items.dispatchEvent(new Event("input", { bubbles: true }));
  });
  return \`New items go under \${category}.\`;
};`, ["addButton", "viewof category", "viewof items", "viewof newItem", "Event"]);

const SOLUTIONS = { ok: OK, ok2: OK2, ok3: OK3, unchanged: FIXTURE, dedupe: DEDUPE, debounce: DEBOUNCE, stalecategory: STALECATEGORY };
const NEG = globalThis.process?.env?.M19_NEG;

export default {
  id: "rc5t-add-twice-listener-leak",
  category: "rc5-train",
  question: "In my shopping list notebook (@user/shopping): when I click Add, sometimes it adds the item twice, and it gets worse the longer I use the notebook. Find and fix it.",
  setup: { files: { "/src/@user/shopping.js": FIXTURE }, initScript: INITSCRIPT, init: INIT, collect: COLLECT },
  criteria: [
    { name: "collected_equals", args: { key: "verdict", equals: "ok" }, weight: 6 },
    { name: "collected_equals", args: { key: "adds", equals: "ok" }, weight: 2 },
    { name: "collected_equals", args: { key: "leak", equals: "ok" }, weight: 2 },
    { name: "collected_equals", args: { key: "category", equals: "ok" }, weight: 1 },
    { name: "collected_equals", args: { key: "existing", equals: "ok" }, weight: 1 },
    { name: "collected_equals", args: { key: "errors", equals: "none" }, weight: 1 },
  ],
  oracle: [
    { tool: "read_file", args: { file_path: "/src/@user/shopping.js" } },
    { tool: "write_file", args: { file_path: "/src/@user/shopping.js", content: SOLUTIONS[NEG || "ok"] } },
  ],
};
