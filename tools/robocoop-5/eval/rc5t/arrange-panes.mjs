// rc5-train eval (20260929-0620-m63): rearrange the lopepage panes on request.
// Fixture: two user modules, @user/sales-chart (a Plot bar chart, the drawing-charts-with-plot idiom) and
// @user/sales-table (an Inputs.table, the inputs-reference idiom), open as two TABS of one stack beside the
// chat: #view=R100(S60(@tomlarkworthy/robocoop-5),S40(@user/sales-table,@user/sales-chart)).
// Scored from rendered geometry of the lopepage-2 panes, not from the hash string: the chart pane is left of
// the table pane, both sit above the chat pane, all three are visible (a stack shows only its active tab),
// and the same holds after a simulated save and reopen (the exporter's bootconf hash applied fresh, which
// resets every stack to its first tab, as a reopened file does).
const CHART = "const _sc_title = function _title(md){return(\nmd`# Sales chart\n\nMonthly revenue by region.`\n)};\nconst _sc_sales = function _sales(){return(\n[\n  {month: \"Jan\", region: \"North\", revenue: 120}, {month: \"Jan\", region: \"South\", revenue: 95},\n  {month: \"Feb\", region: \"North\", revenue: 132}, {month: \"Feb\", region: \"South\", revenue: 101},\n  {month: \"Mar\", region: \"North\", revenue: 150}, {month: \"Mar\", region: \"South\", revenue: 118},\n  {month: \"Apr\", region: \"North\", revenue: 141}, {month: \"Apr\", region: \"South\", revenue: 127}\n]\n)};\nconst _sc_chart = function _chart(Plot,sales){return(\nPlot.plot({\n  x: {domain: [\"Jan\", \"Feb\", \"Mar\", \"Apr\"]},\n  color: {legend: true},\n  marks: [Plot.barY(sales, {x: \"month\", y: \"revenue\", fill: \"region\"}), Plot.ruleY([0])]\n})\n)};\n\nexport default function define(runtime, observer) {\n  const main = runtime.module();\n  const $def = (pid, name, deps, fn) => {\n    main.variable(observer(name)).define(name, deps, fn).pid = pid;\n  };\n  $def(\"_sc_title\", null, [\"md\"], _sc_title);\n  $def(\"_sc_sales\", \"sales\", [], _sc_sales);\n  $def(\"_sc_chart\", \"chart\", [\"Plot\",\"sales\"], _sc_chart);\n  return main;\n}\n";
const TABLE = "const _st_title = function _title(md){return(\nmd`# Sales table\n\nEvery order this quarter.`\n)};\nconst _st_orders = function _orders(){return(\n[\n  {id: 1001, date: \"2026-01-04\", region: \"North\", product: \"Widget\", units: 12, revenue: 60},\n  {id: 1002, date: \"2026-01-19\", region: \"South\", product: \"Gadget\", units: 5, revenue: 45},\n  {id: 1003, date: \"2026-02-02\", region: \"North\", product: \"Gizmo\", units: 8, revenue: 72},\n  {id: 1004, date: \"2026-02-21\", region: \"South\", product: \"Widget\", units: 20, revenue: 100},\n  {id: 1005, date: \"2026-03-07\", region: \"North\", product: \"Gadget\", units: 9, revenue: 81},\n  {id: 1006, date: \"2026-03-30\", region: \"South\", product: \"Gizmo\", units: 14, revenue: 126}\n]\n)};\nconst _st_table = function _table(Inputs,orders){return(\nInputs.table(orders, {sort: \"date\"})\n)};\n\nexport default function define(runtime, observer) {\n  const main = runtime.module();\n  const $def = (pid, name, deps, fn) => {\n    main.variable(observer(name)).define(name, deps, fn).pid = pid;\n  };\n  $def(\"_st_title\", null, [\"md\"], _st_title);\n  $def(\"_st_orders\", \"orders\", [], _st_orders);\n  $def(\"_st_table\", \"viewof table\", [\"Inputs\",\"orders\"], _st_table);\n  main.variable(observer(\"table\")).define(\"table\", [\"Generators\", \"viewof table\"], (G, _) => G.input(_));\n  return main;\n}\n";

const START = "#view=R100(S60(@tomlarkworthy/robocoop-5),S40(@user/sales-table,@user/sales-chart))";

const INIT = String.raw`(async () => {
  history.pushState(null, "", ${JSON.stringify(START)});
  dispatchEvent(new HashChangeEvent("hashchange"));
  await new Promise(r => setTimeout(r, 1500));
})()`;

const COLLECT = String.raw`(async () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const reg = globalThis.__ojs_runtime;
  const rt = [...reg.mains.values()].find(m => m && m._runtime)._runtime;
  const val = (name, mod) => { for (const v of rt._variables) if (v._name === name && (!mod || v._module === reg.mains.get(mod))) return v._value; };
  const panes = val("lp2_paneRegistry", "@tomlarkworthy/lopepage-2");
  if (!(panes instanceof Map)) return { verdict: "no lopepage-2 pane registry" };
  const CH = "@user/sales-chart", TB = "@user/sales-table", AI = "@tomlarkworthy/robocoop-5";
  const pane = m => panes.get(m)?.el;
  const box = m => {
    const p = pane(m);
    if (!p || !p.isConnected) return { m, shown: false, why: "no pane" };
    const r = p.getBoundingClientRect();
    const vis = p.checkVisibility ? p.checkVisibility() : p.offsetParent !== null;
    const inView = r.width >= 150 && r.height >= 100 && r.right > 0 && r.bottom > 0 && r.left < innerWidth && r.top < innerHeight;
    return { m, shown: vis && inView, l: Math.round(r.left), t: Math.round(r.top), r: Math.round(r.right), b: Math.round(r.bottom) };
  };
  const judge = () => {
    const c = box(CH), t = box(TB), a = box(AI);
    const content = !!(pane(CH)?.querySelector("svg") && pane(TB)?.querySelector("table"));
    const why = [];
    if (!c.shown) why.push("chart pane not visible");
    if (!t.shown) why.push("table pane not visible");
    if (!a.shown) why.push("chat pane not visible");
    if (!content) why.push("chart svg or table element missing");
    if (c.shown && t.shown) {
      if (!(c.r <= t.l + 4)) why.push("chart is not left of table");
      if (Math.min(c.b, t.b) - Math.max(c.t, t.t) < 50) why.push("chart and table are not side by side");
    }
    if (a.shown && c.shown && t.shown) {
      if (!(c.b <= a.t + 4 && t.b <= a.t + 4)) why.push("chat is not underneath both");
      if (Math.min(a.r, c.r) - Math.max(a.l, c.l) < 50 || Math.min(a.r, t.r) - Math.max(a.l, t.l) < 50) why.push("chat does not span under both");
    }
    return { ok: why.length === 0, why: why.join("; "), boxes: [c, t, a] };
  };
  const out = { hash: decodeURIComponent(location.hash) };
  out.live = judge();
  // save: what save-in-place writes (exportToHTML with runtime.mains and the cleaned hash)
  const exportToHTML = val("exportToHTML", "@tomlarkworthy/save-in-place");
  const runtime = val("runtime", "@tomlarkworthy/save-in-place");
  let conf = null;
  try {
    const clean = String(location.hash).replace(/^#/, "").split("&").filter(p => p && !["cc","open","close","filesync","from","focus"].includes(p.split("=")[0])).join("&");
    const r = await exportToHTML({ mains: new Map(runtime.mains), runtime, options: { hash: clean ? "#" + clean : "" } });
    const doc = new DOMParser().parseFromString(r?.source ?? r, "text/html");
    conf = JSON.parse(doc.getElementById("bootconf.json").textContent);
  } catch (e) { out.saved = { ok: false, why: "export failed: " + e.message }; }
  if (conf) {
    out.savedHash = conf.hash;
    const missing = [CH, TB].filter(m => !conf.mains.includes(m));
    // reopen: a fresh boot parses the saved hash with every stack on its first tab
    history.pushState(null, "", "#view=S100(@tomlarkworthy/robocoop-5)");
    dispatchEvent(new HashChangeEvent("hashchange"));
    await sleep(1200);
    history.pushState(null, "", conf.hash || "#");
    dispatchEvent(new HashChangeEvent("hashchange"));
    await sleep(2000);
    out.saved = judge();
    if (missing.length) { out.saved.ok = false; out.saved.why = "saved mains lack " + missing.join(", ") + "; " + out.saved.why; }
  }
  out.liveOk = out.live.ok;
  out.savedOk = !!(out.saved && out.saved.ok);
  out.verdict = out.liveOk && out.savedOk ? "ok" : "live: " + (out.live.why || "ok") + " | saved: " + (out.saved?.why || "ok") + " | hash " + out.hash;
  return out;
})()`;

// RC5T_ARRANGE_VARIANT selects a negative control for `--oracle` runs: "tabs" (chart and table stacked as two
// tabs of one stack above the chat), "wrongaxis" (R and C swapped), "none" (layout left as the fixture had it).
const LAYOUTS = {
  good: "#view=C100(R60(S50(@user/sales-chart),S50(@user/sales-table)),S40(@tomlarkworthy/robocoop-5))",
  tabs: "#view=C100(S60(@user/sales-chart,@user/sales-table),S40(@tomlarkworthy/robocoop-5))",
  wrongaxis: "#view=R100(C60(S50(@user/sales-chart),S50(@user/sales-table)),S40(@tomlarkworthy/robocoop-5))",
};
const VARIANT = globalThis.process?.env?.RC5T_ARRANGE_VARIANT || "good";

export default {
  id: "rc5t-arrange-panes",
  category: "rc5-train",
  question: "Arrange the page so my chart module is on the left, my data table module is on the right, and this chat is underneath both.",
  setup: { files: { "/src/@user/sales-chart.js": CHART, "/src/@user/sales-table.js": TABLE }, init: INIT, collect: COLLECT },
  criteria: [
    { name: "collected_equals", args: { key: "verdict", equals: "ok" }, weight: 3 },
    { name: "collected_equals", args: { key: "liveOk", equals: true }, weight: 1 },
    { name: "collected_equals", args: { key: "savedOk", equals: true }, weight: 1 },
  ],
  oracle: VARIANT === "none" ? [{ tool: "read_file", args: { file_path: "/src/@user/sales-chart.js" } }] : [
    { tool: "eval_js", args: { module: "@tomlarkworthy/lopepage-2", code: `location.hash = ${JSON.stringify(LAYOUTS[VARIANT])}; return location.hash;` }, settleMs: 2000 },
  ],
};

