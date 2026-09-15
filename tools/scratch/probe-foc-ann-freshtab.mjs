// Why a fresh tab opened on an app-anchor link does not flash its target.
import { chromium } from "playwright";
const [url] = process.argv.slice(2);
const VIEW = "S100(@tomlarkworthy/foc-chat,@tomlarkworthy/foc-wiki,@tomlarkworthy/foc-demos,@tomlarkworthy/foc-projects,@tomlarkworthy/foc-people)";
const anchor = {"v":1,"surface":"text","module":"@tomlarkworthy/foc-projects","region":"cell","afterIndex":0,"cell":"focProjectsView","pid":"_1mgh8e0","quote":{"prefix":"ages/projects.md0Dgithub.comComp","exact":"onent-based software","suffix":" using drawings as source codeno"},"hint":{"start":179,"end":199},"cellHash":"jy7cwp"};
const b64 = Buffer.from(JSON.stringify(anchor)).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const b = await chromium.launch();
const p = await (await b.newContext({ viewport: { width: 1400, height: 900 } })).newPage();
const errs = []; p.on("pageerror", (e) => errs.push(String(e).slice(0, 200)));
p.on("console", (m) => { if (m.type() === "error") errs.push("console: " + m.text().slice(0, 200)); });
await p.addInitScript(() => {
  const t0 = Date.now();
  const log = (window.__diag = { layers: [], events: [] });
  const seen = new Set();
  setInterval(() => {
    const rt = window.__ojs_runtime;
    if (!rt) return;
    for (const v of rt._variables) {
      if (v._name === "focAnnLayer" && v._value && !seen.has(v._value)) { seen.add(v._value); log.layers.push(Date.now() - t0); }
      if (v._name === "focAnnState" && v._value && !log.stateSeen) { log.stateSeen = Date.now() - t0; }
    }
    const flash = !!(window.CSS && CSS.highlights && CSS.highlights.has("foc-ann-flash"));
    if (flash && !log.flashAt) log.flashAt = Date.now() - t0;
  }, 25);
});
await p.goto(url + "#view=" + VIEW + "&open=@tomlarkworthy/foc-projects&anchor=" + b64, { waitUntil: "load" });
await p.waitForFunction(() => { const pane = document.querySelector('.lp2-pane[data-module="@tomlarkworthy/foc-projects"]'); return pane && pane.querySelector(".foc-card p") && pane.getBoundingClientRect().width > 0; }, null, { timeout: 120000, polling: 200 });
await p.waitForTimeout(3000);
const diag = await p.evaluate((anchor) => {
  const get = (n) => { for (const v of window.__ojs_runtime._variables) if (v._name === n && v._value !== undefined) return v._value; };
  const A = get("a2Anchors"), S = get("focAnnState");
  const out = { ...window.__diag, now: performance.now() | 0 };
  out.pending = S.pending ? { until_in_ms: S.pending.until - Date.now() } : null;
  out.stateKeys = { index: !!S.index, byRkey: !!S.byRkey, composer: !!S.composer };
  const loc = A.locate(anchor);
  const pane = document.querySelector('.lp2-pane[data-module="@tomlarkworthy/foc-projects"]');
  out.loc = { pane: !!loc.pane, paneIsProjects: loc.pane === pane, cellNode: !!loc.cellNode, hostNode: !!loc.hostNode, hostInPane: !!(loc.hostNode && pane.contains(loc.hostNode)), degraded: loc.degraded };
  const host = loc.hostNode;
  out.hostTextHas = host ? (host.textContent || "").indexOf(anchor.quote.exact) : null;
  out.findQuote = host ? A.findQuote(host.textContent || "", anchor.quote, anchor.hint) : null;
  // How many nodes carry the pid'd variable, and is the resolved node the visible one?
  const vars = [...window.__ojs_runtime._variables].filter((v) => v._name === "focProjectsView");
  out.projectsViewVars = vars.map((v) => ({ pid: v.pid, node: !!(v._observer && v._observer._node), connected: !!(v._observer && v._observer._node && v._observer._node.isConnected), inPane: !!(v._observer && v._observer._node && pane.contains(v._observer._node)) }));
  out.cellDivsInPane = pane.querySelectorAll(".observablehq").length;
  return out;
}, anchor);
console.log("diag", JSON.stringify(diag, null, 1));
const manual = await p.evaluate(async (anchor) => {
  const get = (n) => { for (const v of window.__ojs_runtime._variables) if (v._name === n && v._value !== undefined) return v._value; };
  get("focAnnLayer").reveal(anchor);
  await new Promise((r) => setTimeout(r, 800));
  return { flashNow: CSS.highlights.has("foc-ann-flash"), pendingAfter: !!get("focAnnState").pending };
}, anchor);
console.log("manualReveal", JSON.stringify(manual));
console.log("errors", JSON.stringify(errs.slice(0, 10)));
await b.close();
