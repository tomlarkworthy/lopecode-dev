// Does the pooled JS kernel converge, and to what?
//
// The A/B pool bench read 4.1ms then 7.1ms for the same JS configuration while
// the wasm arm sat on 1.6 for all ten rounds. Before quoting any ratio, find
// out whether the JS arm has a steady state at all: rebuild the pool cold and
// run 40 uninterrupted passes.
//
// The hypothesis worth killing: six workers each see a sixth of the rows, so
// each accumulates tier-up evidence six times slower than one thread would
// (project_coded_landmark_warmup_curve measured ~1.5M inner iterations to
// tier). If that is it, the curve falls and flattens. If it wanders, the
// machine is the problem and no pooled ratio from it means anything.
import { chromium } from "playwright";
const URL = "http://localhost:8791/tomlarkworthy_coded-landmark-tracking.html";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
page.on("pageerror", (e) => console.error("PAGEERROR", e.message.slice(0, 200)));
await page.addInitScript(() => {
  const orig = (window as any).Runtime; let cap = false;
  Object.defineProperty(window, "Runtime", { get() { return orig; }, set(N: any) {
    const W = function (this: any, ...a: any[]) { const i = new N(...a); if (!cap) { (window as any).__ojs_runtime = i; cap = true; } return i; };
    W.prototype = N.prototype; Object.assign(W, N); return W; } });
});
await page.goto(URL, { waitUntil: "networkidle", timeout: 180000 });
await page.waitForFunction(() => !!(window as any).__ojs_runtime, { timeout: 180000 });
await page.waitForTimeout(15000);
const out = await page.evaluate(async () => {
  const mod = (window as any).__ojs_runtime.mains.get("@tomlarkworthy/coded-landmark-tracking");
  const bank = await mod.value("hexFrameBank");
  const analyze = await mod.value("analyzeFrameManAsync");
  const t = await mod.value("viewof wasmOn");
  const set = async (on: boolean) => {
    t.value = on; t.dispatchEvent(new Event("input", { bubbles: true }));
    for (let i = 0; i < 40; i++) {
      await new Promise((r) => setTimeout(r, 100));
      if ((await mod.value("detectKernelSource")).includes("makeWasmDetectRow(") === on) break;
    }
    await new Promise((r) => setTimeout(r, 500));
  };
  const curve = async () => {
    const c: number[] = [], wk: number[] = [];
    for (let r = 0; r < 40; r++) {
      const pool = await mod.value("detectPool");
      const opts = { ...(await mod.value("hexRigOpts")), bothAxes: false, runRows: pool.runRows };
      let ms = 0, w = 0;
      for (const s of bank) {
        const t0 = performance.now();
        await analyze(s.frame, opts);
        ms += performance.now() - t0;
        if (pool.lastWorkerMs.length) w += Math.max(...pool.lastWorkerMs);
      }
      c.push(ms / bank.length); wk.push(w / bank.length);
    }
    return { ms: c, wk };
  };
  await set(true); await set(false);   // force a cold JS pool
  const js = await curve();
  await set(true);                     // force a cold wasm pool
  const wa = await curve();
  const pool = await mod.value("detectPool");
  return {
    js, wa,
    meta: {
      frames: bank.length,
      workers: pool.size,
      cores: navigator.hardwareConcurrency || null,
      ua: navigator.userAgent,
      stride: (await mod.value("hexRigOpts")).stride
    }
  };
}, null);
await browser.close();
const f = (a: number[]) => a.map((x) => x.toFixed(1)).join(" ");
const med = (a: number[]) => { const s = a.slice().sort((x, y) => x - y); return s[s.length >> 1]; };
console.log("js   " + f(out.js.ms));
console.log("wasm " + f(out.wa.ms));
console.log(`\njs   first ${out.js.ms[0].toFixed(1)}  last-10 median ${med(out.js.ms.slice(-10)).toFixed(1)}`);
console.log(`wasm first ${out.wa.ms[0].toFixed(1)}  last-10 median ${med(out.wa.ms.slice(-10)).toFixed(1)}`);
console.log(`\nsettled ratio ${(med(out.js.ms.slice(-10)) / med(out.wa.ms.slice(-10))).toFixed(2)}x`);
console.log(`first-pass penalty: js ${(out.js.ms[0] / med(out.js.ms.slice(-10))).toFixed(2)}x, wasm ${(out.wa.ms[0] / med(out.wa.ms.slice(-10))).toFixed(2)}x`);
await Bun.write("scratch/rmbt/warmup-curve.json", JSON.stringify(out));
console.log("\nwrote scratch/rmbt/warmup-curve.json");
