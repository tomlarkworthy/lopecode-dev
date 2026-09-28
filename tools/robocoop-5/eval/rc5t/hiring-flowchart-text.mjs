// rc5-train eval (20260928-0847-w4): a flowchart whose steps the user edits as text.
// In run 20260928-0847-w4-before (xiaomi/mimo-v2.6-pro) the agent read important-modules.md, found the
// stdlib mermaid tag, then spent 8 of 10 steps and ~1000 s designing a text DSL and researching how
// sticky rewrites reach the saved file; the 20-minute budget ran out with no write_file.
//
// Behavioural check, so any correct build passes (textarea -> mermaid, per-step text inputs, a hand-built
// SVG): setup.collect finds an SVG in a module created during the turn that names all five stages, finds
// the text control holding "Interview", renames it, and requires the SVG to follow.

const INIT = String.raw`(() => {
  const rt = [...globalThis.__ojs_runtime.mains.values()].find(m => m && m._runtime)._runtime;
  globalThis.__rc5tBefore = new Set([...rt._variables].map(v => v._module));
})()`;

const COLLECT = String.raw`(async () => {
  const rt = [...globalThis.__ojs_runtime.mains.values()].find(m => m && m._runtime)._runtime;
  const userVars = [...rt._variables].filter(v => !globalThis.__rc5tBefore.has(v._module) && v._name &&
    !String(v._name).startsWith("module ") && v._name !== "@variable");
  if (!userVars.length) return "no module was created";
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const keepers = [];
  for (const v of userVars) { try { keepers.push(v._module.variable(true).define([v._name], x => x)); } catch {} }
  try {
    const els = () => userVars.map(v => v._value).filter(x => x instanceof Element);
    const svgs = () => els().flatMap(x => [...(x.matches("svg") ? [x] : []), ...x.querySelectorAll("svg")]);
    const svgText = () => svgs().map(s => s.textContent).join(" | ");
    const stages = [/application/i, /phone/i, /interview/i, /offer/i, /reject/i];
    let ok = false;
    for (let i = 0; i < 40 && !ok; i++) { ok = stages.every(re => re.test(svgText())); if (!ok) await sleep(500); }
    if (!ok) return "no rendered SVG names all five stages: " + JSON.stringify(svgText().slice(0, 200));
    const fields = els().flatMap(x => [...(x.matches("textarea,input") ? [x] : []), ...x.querySelectorAll("textarea,input[type=text],input:not([type])")]);
    const field = fields.find(f => /interview/i.test(f.value));
    if (!field) {
      const ce = els().flatMap(x => [...x.querySelectorAll("[contenteditable]")]).find(e => /interview/i.test(e.textContent));
      if (!ce) return "no text control holding the step 'Interview' (fields: " + fields.length + ")";
      const w = document.createTreeWalker(ce, NodeFilter.SHOW_TEXT);
      for (let n; (n = w.nextNode());) if (/interview/i.test(n.data)) { n.data = n.data.replace(/interview/i, "Onsite panel"); break; }
      ce.dispatchEvent(new InputEvent("input", { bubbles: true }));
      ce.dispatchEvent(new Event("blur"));
    } else {
      field.value = field.value.replace(/interview/i, "Onsite panel");
      field.dispatchEvent(new Event("input", { bubbles: true }));
      field.dispatchEvent(new Event("change", { bubbles: true }));
    }
    for (let i = 0; i < 20; i++) { if (/onsite panel/i.test(svgText())) return "ok"; await sleep(500); }
    return "diagram did not follow the text edit: " + JSON.stringify(svgText().slice(0, 200));
  } finally {
    for (const k of keepers) { try { k.delete(); } catch {} }
  }
})()`;

const SOLUTION = "const _intro = function _intro(md){return(\nmd`# Hiring process\n\nEdit the mermaid text below; the flowchart redraws as you type.`\n)};\nconst _viewof_steps = function _steps(sticky,Inputs){return(\nsticky(Inputs.textarea({label: \"Steps (mermaid)\", rows: 8, width: 520, value: \"flowchart TD\\n  A[Application] --> B[Phone screen]\\n  B --> C[Interview]\\n  C --> D{Decision}\\n  D -->|yes| E[Offer]\\n  D -->|no| F[Reject]\"}), \"flowchart TD\\n  A[Application] --> B[Phone screen]\\n  B --> C[Interview]\\n  C --> D{Decision}\\n  D -->|yes| E[Offer]\\n  D -->|no| F[Reject]\")\n)};\nconst _chart = function _chart(mermaid,steps){return(\nmermaid`${steps}`\n)};\nexport default function define(runtime, observer) {\n  const main = runtime.module();\n  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn).pid = pid;\n  $def(\"_intro\", \"intro\", [\"md\"], _intro);\n  $def(\"_viewof_steps\", \"viewof steps\", [\"sticky\", \"Inputs\"], _viewof_steps);\n  $def(\"_steps\", \"steps\", [\"Generators\", \"viewof steps\"], (G, v) => G.input(v));\n  $def(\"_chart\", \"chart\", [\"mermaid\", \"steps\"], _chart);\n  main.define(\"module @tomlarkworthy/sticky\", async () => \"@tomlarkworthy/sticky\" && runtime.module((await import(\"https://earthstar.us-east.host.bsky.network/xrpc/com.atproto.sync.getBlob?did=did:plc:j7nm3lrd5h7fm3sfhcv3lhfv&cid=bafkreidnbl6wlhnt25ttzwms3c6kpzlmiiozwugx7iezsgl6ul35eabg5m\")).default));\n  main.define(\"sticky\", [\"module @tomlarkworthy/sticky\", \"@variable\"], (_, v) => v.import(\"sticky\", _));\n  return main;\n}\n";

export default {
  id: "rc5t-hiring-flowchart-text",
  category: "rc5-train",
  question: "Draw a flowchart of our hiring process: application, phone screen, interview, then offer or reject. I want to be able to edit the steps as text.",
  setup: { init: INIT, collect: COLLECT },
  criteria: [
    { name: "collected_equals", args: { equals: "ok" }, weight: 4 },
  ],
  oracle: [
    { tool: "read_file", args: { file_path: "/content/@tomlarkworthy/markdown-wiki/important-modules.md" } },
    { tool: "write_file", args: { file_path: "/src/@user/hiring-flow.js", content: SOLUTION } },
  ],
};
