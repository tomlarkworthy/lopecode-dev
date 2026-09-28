// rc5t-timeline-add-task (run 20260928-0847-w9): a timeline where the user adds a task with a start and
// end date and sees it as a bar. In the baseline run the only write_file was REFUSED by the wiki gate
// (event-handlers-in-cells.md unread); the agent read the page, grepped twice, and at 1126 s called
// task_complete "I created /src/@user/project-timeline.js ... Gantt chart using Observable Plot". The result
// was "ok"; the saved file held no user module. `created` and `bars` fail on that.
// setup.collect acts as the user: in a module created during the turn it finds a text box, two date inputs
// and a button, adds "Probe task 4K" from 2026-10-05 to 2026-10-09, and counts the marks the module draws
// (svg rect/path/line, or an element with an inline width) before and after. `reopened` exports the notebook,
// boots the file in a sandboxed blob: iframe (no localStorage from this browser) and looks for the task.
const COLLECT = String.raw`(async () => {
  const PROBE = "Probe task 4K";
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const rt = globalThis.__ojs_runtime;
  const base = globalThis.__baseMods || new Set();
  const newMods = [...rt.mains.keys()].filter(n => !base.has(n));
  const out = { newModules: newMods, created: false, bars: false, reopened: false };
  const modVars = () => [...rt._variables].filter(v => v._module && v._name && newMods.some(n => rt.mains.get(n) === v._module));
  out.created = modVars().length > 0;
  if (!out.created) return { ...out, stage: "no module created this turn" };
  for (const v of modVars()) { try { await Promise.race([v._module.value(v._name), sleep(3000)]); } catch {} }
  await sleep(500);
  const els = () => modVars().map(v => v._value).filter(x => x instanceof Element);
  const marks = () => els().reduce((n, e) => n + e.querySelectorAll("svg rect, svg path, svg line, [style*='width']").length, 0);
  const shown = () => els().some(e => e.textContent.includes(PROBE) || [...e.querySelectorAll("title")].some(t => t.textContent.includes(PROBE)));
  const host = els().find(e => e.querySelectorAll("input[type=date]").length >= 2 && e.querySelector("input[type=text], input:not([type])"));
  if (!host) return { ...out, stage: "no element with a text box and two date inputs" };
  const before = marks();
  const set = (i, v) => { i.value = v; i.dispatchEvent(new Event("input", { bubbles: true })); i.dispatchEvent(new Event("change", { bubbles: true })); };
  const [d1, d2] = host.querySelectorAll("input[type=date]");
  set(host.querySelector("input[type=text], input:not([type])"), PROBE);
  set(d1, "2026-10-05"); set(d2, "2026-10-09");
  const btns = [...host.querySelectorAll("button, input[type=submit], input[type=button]")];
  const btn = btns.find(b => /add|\+|create|new|submit/i.test(b.textContent + " " + (b.value || ""))) || btns[0];
  if (btn) btn.click(); else host.querySelector("form")?.requestSubmit?.();
  await sleep(1500);
  out.marksBefore = before; out.marksAfter = marks(); out.shown = shown();
  out.bars = out.marksAfter > before && out.shown;
  if (!out.bars) return { ...out, stage: "adding a task did not draw a new mark labelled with it" };
  const exp = [...rt._variables].find(v => v._name === "exportToHTML" && typeof v._value === "function")._value;
  const r = await exp({ mains: rt.mains });
  let html = typeof r === "string" ? r : r.source;
  const reporter = "<script>(" + (async (PROBE, base) => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const t0 = Date.now(); let found = false;
    while (!found && Date.now() - t0 < 20000) {
      await sleep(1000);
      const rt = globalThis.__ojs_runtime;
      if (!rt || !rt.mains || !rt.mains.size) continue;
      for (const [n, m] of [...rt.mains].filter(([n]) => !base.includes(n))) for (const v of [...rt._variables].filter(v => v._module === m && v._name)) {
        let x; try { x = await Promise.race([m.value(v._name), sleep(1500).then(() => undefined)]); } catch { x = undefined; }
        if (x instanceof Element && (x.textContent.includes(PROBE) || [...x.querySelectorAll("title")].some(t => t.textContent.includes(PROBE)))) found = true;
      }
    }
    parent.postMessage({ __timelineProbe: { found } }, "*");
  }).toString() + ")(" + JSON.stringify(PROBE) + "," + JSON.stringify([...base]) + ")<\/script>";
  html = html.replace(/<\/body>(?![\s\S]*<\/body>)/i, reporter + "</body>");
  const frame = document.createElement("iframe");
  frame.sandbox = "allow-scripts";
  frame.style.cssText = "position:fixed;left:0;top:0;width:1200px;height:900px;opacity:0;pointer-events:none";
  const got = new Promise(res => {
    addEventListener("message", e => { if (e.data && e.data.__timelineProbe) res(e.data.__timelineProbe); });
    setTimeout(() => res({ found: false, timeout: true }), 26000);
  });
  frame.src = URL.createObjectURL(new Blob([html], { type: "text/html" }));
  document.body.appendChild(frame);
  const re = await got;
  frame.remove();
  out.reopened = !!re.found;
  out.stage = "done";
  return out;
})()`;

// Oracle. State kept by sticky with the view contract, as in rc5t-habit-tracker's oracle and
// @tomlarkworthy/codestrates.codestratePlace (lopebooks tomlarkworthy_codestrates.html): the setter
// re-renders, each edit dispatches `input`. The interval bar (Plot.barX with x1/x2) has no corpus precedent;
// it is Plot's documented form.
const ORACLE_SRC = `const _intro = function intro(md){return( md\`# Timeline

Add an item with a start and end date. Items are kept in this cell's source by \\\`sticky\\\`, so saving the notebook saves them.\` )};

const _itemEditor = function itemEditor(htl){return(
function itemEditor() {
  let state = {items: []};
  const name = htl.html\`<input type=text placeholder="Name">\`;
  const start = htl.html\`<input type=date>\`;
  const end = htl.html\`<input type=date>\`;
  const add = htl.html\`<button>Add</button>\`;
  const list = htl.html\`<ul>\`;
  const el = htl.html\`<div>\${name} \${start} \${end} \${add}\${list}</div>\`;
  const render = () => list.replaceChildren(...state.items.map(t => htl.html\`<li>\${t.name}: \${t.start} → \${t.end}</li>\`));
  add.onclick = () => {
    if (!name.value.trim() || !start.value || !end.value) return;
    state = {items: [...state.items, {name: name.value.trim(), start: start.value, end: end.value}]};
    name.value = "";
    render();
    el.dispatchEvent(new Event("input", {bubbles: true}));
  };
  Object.defineProperty(el, "value", {
    get: () => state,
    set: (v) => { state = v && Array.isArray(v.items) ? v : {items: []}; render(); }
  });
  render();
  return el;
}
)};

const _viewof_plan = function viewof_plan(sticky, itemEditor){return( sticky(itemEditor(), {items: []}) )};

const _chart = function chart(Plot, plan){return(
Plot.plot({
  marginLeft: 120,
  x: {type: "utc"},
  marks: [
    Plot.barX(plan.items.map(t => ({...t, start: new Date(t.start), end: new Date(t.end)})), {x1: "start", x2: "end", y: "name", title: "name"}),
    Plot.ruleX([new Date()])
  ]
})
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn).pid = pid;
  $def("_intro", "intro", ["md"], _intro);
  $def("_itemEditor", "itemEditor", ["htl"], _itemEditor);
  $def("_viewof_plan", "viewof plan", ["sticky", "itemEditor"], _viewof_plan);
  $def("_plan", "plan", ["Generators", "viewof plan"], (G, v) => G.input(v));
  $def("_chart", "chart", ["Plot", "plan"], _chart);
  main.define("module @tomlarkworthy/sticky", async () => runtime.module((await import("/@tomlarkworthy/sticky.js?v=4")).default));
  main.define("sticky", ["module @tomlarkworthy/sticky", "@variable"], (_, v) => v.import("sticky", _));
  return main;
}
`;

export default {
  id: "rc5t-timeline-add-task",
  category: "rc5-train",
  question: "Make a project timeline chart where I can add tasks with a start and end date and see them as bars.",
  setup: {
    init: `globalThis.__baseMods = new Set(globalThis.__ojs_runtime.mains.keys());`,
    collect: COLLECT,
  },
  criteria: [
    // THE defect of run 20260928-0847-w9-before: the turn ended "I created …" with no module in the runtime
    { name: "collected_equals", args: { key: "created", equals: true }, weight: 2 },
    { name: "collected_equals", args: { key: "bars", equals: true }, weight: 3 },
    { name: "collected_equals", args: { key: "reopened", equals: true }, weight: 1 },
    { name: "no_runtime_errors", args: {}, weight: 1 },
  ],
  oracle: [
    { tool: "read_file", args: { file_path: "/content/@tomlarkworthy/markdown-wiki/writing-cells-in-module-source.md" } },
    { tool: "read_file", args: { file_path: "/content/@tomlarkworthy/markdown-wiki/event-handlers-in-cells.md" } },
    { tool: "write_file", args: { file_path: "/src/@user/timeline.js", content: ORACLE_SRC }, settleMs: 3000 },
  ],
};
