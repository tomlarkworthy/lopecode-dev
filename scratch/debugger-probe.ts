// What does a booted debugger cost, and does its instrumentation change dataflow?
// usage: bun tools/scratch/debugger-probe.ts <notebook.html> [--strip <module>] [--hash <view>]
import {chromium} from "playwright";
import {readFileSync, writeFileSync} from "node:fs";

const args = process.argv.slice(2);
let FILE = args[0];
const strip = args.includes("--strip") ? args[args.indexOf("--strip") + 1] : null;
const hash = args.includes("--hash") ? args[args.indexOf("--hash") + 1] : "";
if (strip) {
  const html = readFileSync(FILE, "utf8");
  const out = html.replace(/("mains"\s*:\s*\[)([^\]]*)\]/g, (_, a, body) =>
    a + body.split(",").filter((s: string) => !s.includes(`"${strip}"`)).join(",") + "]");
  FILE = `scratch/.dbg-probe-stripped.html`;
  writeFileSync(FILE, out);
}
const b = await chromium.launch();
const p = await b.newPage({viewport: {width: 1280, height: 900}});
await p.goto("file://" + process.cwd() + "/" + FILE + hash);
await p.waitForFunction(() => (window as any).__ojs_runtime?.mains?.size > 0, {timeout: 60000});
await p.waitForTimeout(8000); // boot churn

const measure = (label: string) => p.evaluate(async (label) => {
  const rt = (window as any).__ojs_runtime;
  const find = (name: string) => {
    for (const [, m] of rt.mains) { const v = (m as any)._scope.get(name); if (v && /debugger/.test(String((m as any)._name ?? ""))) return v; }
    for (const [mn, m] of rt.mains) if (/debugger/.test(mn)) { const v = (m as any)._scope.get(name); if (v) return v; }
  };
  const holder = find("vizHolder")?._value;
  let replots = 0;
  const mo = holder ? new MutationObserver(ms => { for (const m of ms) replots += m.addedNodes.length; }) : null;
  mo?.observe(holder, {childList: true});
  let computes = 0;
  const orig = rt._computeNow;
  rt._computeNow = function () { computes++; return orig.call(this); };
  let longMs = 0;
  const po = new PerformanceObserver(l => { for (const e of l.getEntries()) longMs += e.duration; });
  try { po.observe({entryTypes: ["longtask"]}); } catch {}
  const gaps: number[] = [];
  let last = performance.now(), running = true;
  const tick = () => { const t = performance.now(); gaps.push(t - last); last = t; if (running) requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
  const SECS = 5;
  await new Promise(r => setTimeout(r, SECS * 1000));
  running = false; mo?.disconnect(); po.disconnect(); rt._computeNow = orig;
  gaps.sort((a, b) => a - b);
  const q = (f: number) => +gaps[Math.min(gaps.length - 1, Math.floor(gaps.length * f))].toFixed(1);
  let vars = 0, reachable = 0, dispatchers = 0, pinned = 0;
  for (const v of rt._variables) {
    vars++; if (v._reachable) reachable++;
    const ls = v._observer?.["__observe_listeners__"];
    if (ls) { dispatchers++; if (!ls.some((l: any) => l.base)) pinned++; }
  }
  return {label, booted: [...rt.mains.keys()].filter((k: string) => /debugger/.test(k)),
    fps: +(gaps.length / SECS).toFixed(1), rafP50: q(0.5), rafP90: q(0.9), rafWorst: q(1),
    longTaskMsPerSec: +(longMs / SECS).toFixed(0), computesPerSec: +(computes / SECS).toFixed(1),
    replotsPerSec: +(replots / SECS).toFixed(1), holderConnected: holder?.isConnected ?? null,
    svgNodes: holder ? holder.querySelectorAll("*").length : null,
    perf: (window as any).__dbg2Perf ?? null,
    vars, reachable, dispatchers, pinnedByObserveOnly: pinned};
}, label);

console.log(JSON.stringify(await measure("live"), null, 1));

// pause arm: stops debugger-2's refresh loop but leaves its observers attached
const paused = await p.evaluate(() => {
  const rt = (window as any).__ojs_runtime;
  for (const [mn, m] of rt.mains) if (/debugger/.test(mn))
    for (const n of ["viewof paused", "viewof pause"]) {
      const el = (m as any)._scope.get(n)?._value;
      const box = el?.querySelector?.("input[type=checkbox]");
      if (box) { box.checked = true; el.dispatchEvent(new Event("input", {bubbles: true})); return n; }
    }
  return null;
});
if (paused) { await p.waitForTimeout(1500); console.log(JSON.stringify(await measure("paused via " + paused), null, 1)); }

// Does a generator keep running after its only consumer is deleted?
console.log(JSON.stringify(await p.evaluate(async () => {
  const rt = (window as any).__ojs_runtime;
  const w = window as any; w.__g = 0;
  // a named main: the page-title extractor observes every variable of an unnamed module
  const m = rt.module(); m._name = "@probe/hidden";
  const g = m.variable().define("probe_gen", [], function* () { while (true) yield ++w.__g; });
  const c = m.variable({}).define("probe_consumer", ["probe_gen"], (x: number) => x);
  const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
  await sleep(1000);
  m.variable().define("probe_nudge", [], () => 1); // a set mutation, so a debugger re-attaches
  await sleep(1000);
  const instrumented = (g._observer?.["__observe_listeners__"] ?? []).map((l: any) => Object.keys(l.observer).join("/"));
  const before = w.__g;
  c.delete();
  await sleep(1000);
  const atDelete = w.__g;
  await sleep(2000);
  return {test: "generator after its only consumer is deleted", instrumented, ticksBeforeDelete: before,
    ticksIn2sAfterDelete: w.__g - atDelete, genStillReachable: g._reachable};
}), null, 1));
await b.close();
