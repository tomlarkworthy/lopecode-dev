// rc5t-signup-slots-persist (run 20260928-0847-w13, model xiaomi/mimo-v2.5-pro): a sign-up sheet where a
// person types a name, picks one of three slots, and the sheet lists who is in each slot; the sign-ups must
// survive saving the notebook. The baseline run read keeping-user-state-in-the-saved-notebook.md at 5 s and
// used sticky. At 231 s its own eval_js showed one click adding the same person twice.
// setup.collect acts as the user on the modules created in the turn: in the element holding a text box, a
// slot picker (a <select> with >= 3 real options, or >= 3 radios) and a button, it signs up NAME_A in slot 2
// and NAME_B in slot 3, then checks each name is shown once and sits under its own slot (walking up from the
// name, the first ancestor that mentions any slot label mentions the right one). It then exports, boots the
// file in a sandboxed blob: iframe (opaque origin: no localStorage/IndexedDB from this browser) and repeats
// the checks there.
const COLLECT = String.raw`(async () => {
  const NAMES = ["Quokka Pemberton", "Wombat Ellery"];
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const rt = globalThis.__ojs_runtime;
  const base = globalThis.__baseMods || new Set();
  const newMods = [...rt.mains.keys()].filter(n => !base.has(n));
  const out = { newModules: newMods, created: false, added: false, once: false, grouped: false, reopened: false, reopenedOnce: false, reopenedGrouped: false };
  const modVars = () => [...rt._variables].filter(v => v._module && v._name && newMods.some(n => rt.mains.get(n) === v._module));
  out.created = modVars().length > 0;
  if (!out.created) return { ...out, stage: "no module created this turn" };
  for (const v of modVars()) { try { await Promise.race([v._module.value(v._name), sleep(3000)]); } catch {} }
  await sleep(500);
  const els = () => modVars().map(v => v._value).filter(x => x instanceof Element);
  const q = (e, sel) => [...(e.matches(sel) ? [e] : []), ...e.querySelectorAll(sel)];
  const textBoxes = e => q(e, "input[type=text], input:not([type]), input[type=search]");
  const realOptions = s => [...s.options].filter(o => o.value !== "" && !/^\W*(pick|choose|select)\b/i.test(o.text.trim()));
  const radiosOf = e => q(e, "input[type=radio]");
  const labelOfRadio = r => (r.closest("label")?.textContent || (r.id && r.ownerDocument.querySelector("label[for='" + r.id + "']")?.textContent) || r.value || "").trim();
  const host = els().find(e => textBoxes(e).length && (q(e, "select").some(s => realOptions(s).length >= 3) || radiosOf(e).length >= 3));
  if (!host) return { ...out, stage: "no element with a text box and a slot picker (select or radios, >= 3 slots)" };
  const sel = q(host, "select").find(s => realOptions(s).length >= 3);
  const slots = sel ? realOptions(sel).map(o => ({ label: o.text.trim(), value: o.value })) : radiosOf(host).map(r => ({ label: labelOfRadio(r), value: r.value }));
  out.slots = slots.map(s => s.label);
  const fire = (el, types) => types.forEach(t => el.dispatchEvent(new Event(t, { bubbles: true })));
  const signUp = async (name, i) => {
    const h = els().find(e => textBoxes(e).length && (q(e, "select").some(s => realOptions(s).length >= 3) || radiosOf(e).length >= 3)) || host;
    const box = textBoxes(h).find(b => !b.value) || textBoxes(h)[0];
    box.focus(); box.value = name; fire(box, ["input", "change"]);
    const s = q(h, "select").find(s => realOptions(s).length >= 3);
    if (s) { s.value = slots[i].value; fire(s, ["input", "change"]); }
    else { const r = radiosOf(h)[i]; r.click(); }
    await sleep(200);
    const btns = q(h, "button, input[type=submit], input[type=button]");
    const btn = btns.find(b => /sign|add|join|register|submit|save|book|\+/i.test(b.textContent + " " + (b.value || ""))) || btns[0];
    if (btn) btn.click();
    else for (const t of ["keydown", "keypress", "keyup"]) box.dispatchEvent(new KeyboardEvent(t, { key: "Enter", code: "Enter", keyCode: 13, which: 13, bubbles: true }));
    await sleep(1200);
  };
  const judge = (roots, names, labels, picks) => {
      const hits = name => { const r = []; for (const root of roots) { const w = root.ownerDocument.createTreeWalker(root, NodeFilter.SHOW_TEXT); let t; while ((t = w.nextNode())) if (t.nodeValue.includes(name) && !t.parentElement.closest("option, select, script, style")) r.push(t.parentElement); } return r; };
      const norm = s => s.replace(/\s+/g, " ").trim().toLowerCase();
      const slotOf = el => { for (let n = el; n; n = n.parentElement) { const tx = norm(n.textContent); const m = labels.filter(l => tx.includes(norm(l))); if (m.length === 1) return m[0]; if (m.length > 1) return null; } return null; };
      const shown = names.map(n => hits(n).length > 0);
      const once = names.map(n => hits(n).length === 1 || (hits(n).length > 1 && new Set(hits(n).map(slotOf)).size === 1 && hits(n).length <= 2));
      const grouped = names.map((n, i) => hits(n).length > 0 && hits(n).every(h => slotOf(h) === labels[picks[i]]));
      return { shown, counts: names.map(n => hits(n).length), once, grouped, slotOf: names.map(n => hits(n).map(slotOf)) };
    };
  await signUp(NAMES[0], 1);
  await signUp(NAMES[1], 2);
  const live = judge(els(), NAMES, out.slots, [1, 2]);
  out.live = live;
  out.added = live.shown.every(Boolean);
  out.once = live.counts.every(c => c === 1);
  out.grouped = live.grouped.every(Boolean);
  if (!out.added) return { ...out, stage: "a signed-up name is not shown" };
  const exp = [...rt._variables].find(v => v._name === "exportToHTML" && typeof v._value === "function")._value;
  const r = await exp({ mains: rt.mains });
  let html = typeof r === "string" ? r : r.source;
  const reporter = "<script>(" + (async (judgeSrc, NAMES, labels, base) => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const judge = (0, eval)("(" + judgeSrc + ")");
    const t0 = Date.now(); let res = { shown: [false, false] };
    while (Date.now() - t0 < 20000) {
      await sleep(1000);
      const rt = globalThis.__ojs_runtime;
      if (!rt || !rt.mains || !rt.mains.size) continue;
      const roots = [];
      for (const [n, m] of [...rt.mains].filter(([n]) => !base.includes(n))) for (const v of [...rt._variables].filter(v => v._module === m && v._name)) {
        let x; try { x = await Promise.race([m.value(v._name), sleep(1500).then(() => undefined)]); } catch { x = undefined; }
        if (x instanceof Element) roots.push(x);
      }
      res = judge(roots, NAMES, labels, [1, 2]);
      if (res.shown.every(Boolean) || (roots.length && Date.now() - t0 > 12000)) break;
    }
    parent.postMessage({ __signupProbe: res }, "*");
  }).toString() + ")(" + JSON.stringify(judge.toString()) + "," + JSON.stringify(NAMES) + "," + JSON.stringify(out.slots) + "," + JSON.stringify([...base]) + ")<\/script>";
  html = html.replace(/<\/body>(?![\s\S]*<\/body>)/i, reporter + "</body>");
  const frame = document.createElement("iframe");
  frame.sandbox = "allow-scripts";
  frame.style.cssText = "position:fixed;left:0;top:0;width:1200px;height:900px;opacity:0;pointer-events:none";
  const got = new Promise(res => {
    addEventListener("message", e => { if (e.data && e.data.__signupProbe) res(e.data.__signupProbe); });
    setTimeout(() => res({ shown: [false, false], timeout: true }), 26000);
  });
  frame.src = URL.createObjectURL(new Blob([html], { type: "text/html" }));
  document.body.appendChild(frame);
  const re = await got;
  frame.remove();
  out.reopenedDetail = re;
  out.reopened = (re.shown || []).every(Boolean);
  out.reopenedOnce = out.reopened && (re.counts || []).every(c => c === 1);
  out.reopenedGrouped = out.reopened && (re.grouped || []).every(Boolean);
  out.stage = "done";
  return out;
})()`;

// Oracle: sticky over a view that follows the view contract (setter re-renders, each edit dispatches
// `input`), as in @tomlarkworthy/codestrates.codestratePlace (lopebooks tomlarkworthy_codestrates.html) and the
// rc5t-timeline-add-task oracle.
const ORACLE_SRC = `const _intro = function intro(md){return( md\`# Sign-up sheet

Type a name, pick a slot, press Sign up. Sign-ups are kept in this cell's source by \\\`sticky\\\`, so Save in place keeps them.\` )};

const _slots = function slots(){return( ["Morning", "Afternoon", "Evening"] )};

const _sheet = function sheet(htl, slots){return(
function sheet() {
  let rows = [];
  const name = htl.html\`<input type=text placeholder="Your name">\`;
  const pick = htl.html\`<select>\${slots.map(s => htl.html\`<option value=\${s}>\${s}</option>\`)}</select>\`;
  const go = htl.html\`<button>Sign up</button>\`;
  const list = htl.html\`<div>\`;
  const el = htl.html\`<div>\${name} \${pick} \${go}\${list}</div>\`;
  const render = () => list.replaceChildren(...slots.map(s => htl.html\`<section><h4>\${s}</h4><ul>\${rows.filter(r => r.slot === s).map(r => htl.html\`<li>\${r.name}</li>\`)}</ul></section>\`));
  go.onclick = () => {
    const n = name.value.trim();
    if (!n) return;
    rows = [...rows, {name: n, slot: pick.value}];
    name.value = "";
    render();
    el.dispatchEvent(new Event("input", {bubbles: true}));
  };
  Object.defineProperty(el, "value", {
    get: () => rows,
    set: (v) => { rows = Array.isArray(v) ? v : []; render(); }
  });
  render();
  return el;
}
)};

const _viewof_signups = function viewof_signups(sticky, sheet){return( sticky(sheet(), []) )};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn).pid = pid;
  $def("_intro", "intro", ["md"], _intro);
  $def("_slots", "slots", [], _slots);
  $def("_sheet", "sheet", ["htl", "slots"], _sheet);
  $def("_viewof_signups", "viewof signups", ["sticky", "sheet"], _viewof_signups);
  $def("_signups", "signups", ["Generators", "viewof signups"], (G, v) => G.input(v));
  main.define("module @tomlarkworthy/sticky", async () => runtime.module((await import("/@tomlarkworthy/sticky.js?v=4")).default));
  main.define("sticky", ["module @tomlarkworthy/sticky", "@variable"], (_, v) => v.import("sticky", _));
  return main;
}
`;

export default {
  id: "rc5t-signup-slots-persist",
  category: "rc5-train",
  question: "Make a sign-up sheet where people type their name and pick one of three time slots, and it lists who is in each slot. The sign-ups should still be there after I save the notebook.",
  setup: {
    init: "globalThis.__baseMods = new Set(globalThis.__ojs_runtime.mains.keys())",
    collect: COLLECT,
  },
  criteria: [
    { name: "collected_equals", args: { key: "added", equals: true }, weight: 1 },
    // one sign-up is one entry: a click that adds the person twice fails here
    { name: "collected_equals", args: { key: "once", equals: true }, weight: 1 },
    { name: "collected_equals", args: { key: "grouped", equals: true }, weight: 1 },
    // the defect class: sign-ups held only in the live page or in localStorage are gone after save + reopen
    { name: "collected_equals", args: { key: "reopened", equals: true }, weight: 3 },
    { name: "collected_equals", args: { key: "reopenedOnce", equals: true }, weight: 1 },
    { name: "collected_equals", args: { key: "reopenedGrouped", equals: true }, weight: 1 },
    { name: "no_runtime_errors", args: {}, weight: 1 },
  ],
  oracle: [
    { tool: "write_file", args: { file_path: "/src/@user/signup-oracle.js", content: ORACLE_SRC }, settleMs: 5000 },
  ],
};
