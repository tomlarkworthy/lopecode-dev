// rc5-train eval (20260928-0847-w11): an org chart the user edits.
// Run 20260928-0847-w11-before (xiaomi/mimo-v2.5-pro) built it correctly first time (sticky textarea ->
// mermaid`${src}`, edits survived save + reopen), so this is a regression guard for the
// important-modules.md Diagrams idiom on a hierarchy rather than the flowchart it was written for.
//
// Behavioural, so any correct build passes (mermaid, a hand-built SVG, an HTML tree, per-person inputs):
// setup.collect renders a clone of every element a module created during the turn, locates each
// person's label, requires every manager to sit above (or left of) each direct report, then renames
// "Mei" in whichever text control holds it and requires the rendered chart to follow (key chart), then
// requires the edit to reach a cell definition, which is what a saved file keeps (key persisted).
// The eval runs (base, 2 of 2) wrote Inputs.table(rows, {editable: true}): read-only, so chart fails.

const INIT = String.raw`(() => {
  const rt = [...globalThis.__ojs_runtime.mains.values()].find(m => m && m._runtime)._runtime;
  globalThis.__rc5tBefore = new Set([...rt._variables].map(v => v._module));
})()`;

const COLLECT = String.raw`(async () => {
  const rt = [...globalThis.__ojs_runtime.mains.values()].find(m => m && m._runtime)._runtime;
  const userVars = [...rt._variables].filter(v => !globalThis.__rc5tBefore.has(v._module) && v._name &&
    !String(v._name).startsWith("module ") && v._name !== "@variable");
  if (!userVars.length) return { chart: "no module was created" };
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const keepers = [];
  for (const v of userVars) { try { keepers.push(v._module.variable(true).define([v._name], x => x)); } catch {} }
  const people = ["Priya", "Tom", "Aisha", "Leo", "Mei"];
  const reports = [["Priya", "Tom"], ["Priya", "Aisha"], ["Aisha", "Leo"], ["Aisha", "Mei"]];
  const els = () => userVars.map(v => v._value).filter(x => x instanceof Element);
  const isField = n => n.closest?.("textarea,input,select,script,style,[contenteditable]");
  // label positions per cell value (a roster table and the chart are separate cells), measured on a
  // laid-out clone so an unmounted cell still has geometry
  const locate = () => {
    const box = document.createElement("div");
    box.style.cssText = "position:absolute;left:0;top:0;width:1600px;visibility:hidden;pointer-events:none";
    document.body.appendChild(box);
    try {
      const all = [];
      for (const e of els()) {
      const holder = box.appendChild(document.createElement("div"));
      holder.appendChild(e.cloneNode(true));
      const found = {};
      const w = document.createTreeWalker(holder, NodeFilter.SHOW_TEXT);
      for (let n; (n = w.nextNode());) {
        const t = n.data.trim(); const p = n.parentElement;
        if (!t || t.length > 40 || !p || isField(p)) continue;
        for (const name of people) {
          if (found[name] || !new RegExp("^" + name + "\\b").test(t)) continue;
          const r = p.getBoundingClientRect();
          if (r.width || r.height) found[name] = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
        }
      }
      all.push(found);
      }
      return all;
    } finally { box.remove(); }
  };
  // direct reports of one manager share a level; each level is further down (or right) than its manager
  const tiered = (at, a) => reports.every(([m, r]) => at[r][a] > at[m][a] + 2) &&
    Math.abs(at.Tom[a] - at.Aisha[a]) < 8 && Math.abs(at.Leo[a] - at.Mei[a]) < 8;
  try {
    let full = [];
    for (let i = 0; i < 40; i++) { full = locate().filter(at => people.every(p => at[p])); if (full.length) break; await sleep(500); }
    if (!full.length) return { chart: "no rendered cell labels all of " + people.join(", ") };
    if (!full.some(at => tiered(at, "y") || tiered(at, "x"))) return { chart: "reporting lines wrong: " + JSON.stringify(full[0]) };
    const fields = els().flatMap(x => [...(x.matches("textarea,input") ? [x] : []), ...x.querySelectorAll("textarea,input[type=text],input:not([type])")]);
    const field = fields.find(f => /\bMei\b/.test(f.value));
    if (field) {
      field.value = field.value.replace(/\bMei\b/g, "Noor");
      field.dispatchEvent(new Event("input", { bubbles: true }));
      field.dispatchEvent(new Event("change", { bubbles: true }));
    } else {
      const ce = els().flatMap(x => [...x.querySelectorAll("[contenteditable]")]).find(e => /\bMei\b/.test(e.textContent));
      if (!ce) return { chart: "no text control holding the name Mei (fields: " + fields.length + ")" };
      const tw = document.createTreeWalker(ce, NodeFilter.SHOW_TEXT);
      for (let n; (n = tw.nextNode());) if (/\bMei\b/.test(n.data)) n.data = n.data.replace(/\bMei\b/g, "Noor");
      ce.dispatchEvent(new InputEvent("input", { bubbles: true }));
      ce.dispatchEvent(new Event("blur"));
    }
    people[4] = "Noor";
    let followed = false;
    for (let i = 0; i < 20 && !followed; i++) { followed = locate().some(at => at.Noor); if (!followed) await sleep(500); }
    if (!followed) return { chart: "chart did not follow the text edit Mei -> Noor" };
    // a saved file holds cell definitions: an edit that survives Save is in one of them (sticky rewrites its
    // own literal); a value held only in a DOM control or in localStorage is lost from the file
    const defs = () => [...rt._variables].filter(v => userVars.some(u => u._module === v._module))
      .map(v => typeof v._definition === "function" ? v._definition.toString() : "").join("\n");
    for (let i = 0; i < 10; i++) { if (/\bNoor\b/.test(defs())) return { chart: "ok", persisted: "ok" }; await sleep(500); }
    return { chart: "ok", persisted: "the edit Mei -> Noor is in no cell definition, so saving the notebook drops it" };
  } finally {
    for (const k of keepers) { try { k.delete(); } catch {} }
  }
})()`;

const SOLUTION = "const _intro = function intro(md){return( md`# Team Org Chart\n\nThis chart is **editable** — click the text box below to change names or add reporting lines. Changes are saved in the notebook.\n\n**Mermaid syntax:** \\`A --> B\\` means A manages B. Indent lines for readability; \\`graph TD\\` sets the direction (top-down).` )};\nconst _viewof_src = function src(sticky,Inputs){return(\nsticky(Inputs.textarea({\n  label: \"Org chart (mermaid syntax)\",\n  rows: 12,\n  value: \"graph TD\\n  Priya --> Tom\\n  Priya --> Aisha\\n  Aisha --> Leo\\n  Aisha --> Mei\"\n}), \"graph TD\\n  Priya --> Tom\\n  Priya --> Aisha\\n  Aisha --> Leo\\n  Aisha --> Mei\")\n)};\nconst _src = function src(G,v){return( G.input(v) )};\nconst _chart = function chart(mermaid,src){return( mermaid`${src}` )};\nexport default function define(runtime, observer) {\n  const main = runtime.module();\n  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn).pid = pid;\n\n  main.define(\"module @tomlarkworthy/sticky\", async () => \"@tomlarkworthy/sticky\" && runtime.module((await import(\"https://earthstar.us-east.host.bsky.network/xrpc/com.atproto.sync.getBlob?did=did:plc:j7nm3lrd5h7fm3sfhcv3lhfv&cid=bafkreidnbl6wlhnt25ttzwms3c6kpzlmiiozwugx7iezsgl6ul35eabg5m\")).default));\n  main.define(\"sticky\", [\"module @tomlarkworthy/sticky\", \"@variable\"], (_, v) => v.import(\"sticky\", _));\n\n  $def(\"_intro\", \"intro\", [\"md\"], _intro);\n  $def(\"_viewof_src\", \"viewof src\", [\"sticky\", \"Inputs\"], _viewof_src);\n  $def(\"_src\", \"src\", [\"Generators\", \"viewof src\"], _src);\n  $def(\"_chart\", \"chart\", [\"mermaid\", \"src\"], _chart);\n  return main;\n}";

export default {
  id: "rc5t-org-chart-edit",
  category: "rc5-train",
  question: "Make an org chart of my team that I can edit: Priya manages Tom and Aisha, Aisha manages Leo and Mei.",
  setup: { init: INIT, collect: COLLECT },
  criteria: [
    { name: "collected_equals", args: { key: "chart", equals: "ok" }, weight: 3 },
    { name: "collected_equals", args: { key: "persisted", equals: "ok" }, weight: 1 },
  ],
  oracle: [
    { tool: "write_file", args: { file_path: "/src/@user/org-chart.js", content: SOLUTION } },
  ],
};
