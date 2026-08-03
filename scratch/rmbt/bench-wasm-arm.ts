// End-to-end frame time with the row cascade in wasm vs in JS, through the
// real pool, on the 16 bank frames.
//
// 2.18x on detectRowMan is a component number. This is the one the rig
// reports: whole-frame, including edge finding, clustering, the pose fit and
// every worker round trip -- all of which the port does not touch, so the
// frame-level ratio is bounded well below 2.18x by Amdahl and that is the
// point of measuring it rather than projecting it.
//
// Arms alternate frame by frame within a round, and the pool is rebuilt
// between arms by toggling wasmOn (which changes detectKernelSource, which
// rebuilds the workers). Rebuilt workers start cold, so each arm gets warm-up
// rounds that are thrown away -- otherwise this measures JIT tiering
// (project_coded_landmark_warmup_curve) and calls it a wasm win.
//
// WARM is 34 because js-pool-curve.ts measured how long the two arms actually
// take to settle, rather than assuming: the pooled JS kernel falls 13.3 -> 3.9
// ms/frame over ~30 passes and the wasm one is done in 2. At WARM=8 this file
// reported the same JS configuration as 4.1ms and 7.1ms in one run -- both
// readings taken partway down that curve. Run js-pool-curve.ts before trusting
// any number here.
//
//   bun scratch/rmbt/bench-wasm-arm.ts --url http://localhost:8791/....html
import { chromium } from "playwright";
import { resolve } from "node:path";

const argUrl = process.argv.includes("--url") ? process.argv[process.argv.indexOf("--url") + 1] : null;
const NB = resolve("lopebooks/notebooks/tomlarkworthy_coded-landmark-tracking.html");
const ROUNDS = 5, WARM = 34;

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
page.on("pageerror", (e) => console.error("PAGEERROR", e.message.slice(0, 300)));
await page.addInitScript(() => {
  const orig = (window as any).Runtime; let cap = false;
  Object.defineProperty(window, "Runtime", { get() { return orig; }, set(N: any) {
    const W = function (this: any, ...a: any[]) { const i = new N(...a); if (!cap) { (window as any).__ojs_runtime = i; cap = true; } return i; };
    W.prototype = N.prototype; Object.assign(W, N); return W; } });
});
await page.goto(argUrl ?? `file://${NB}`, { waitUntil: "networkidle", timeout: 180000 });
await page.waitForFunction(() => !!(window as any).__ojs_runtime, { timeout: 180000 });
await page.waitForTimeout(15000);

const out = await page.evaluate(async ({ rounds, warm }) => {
  const rt = (window as any).__ojs_runtime;
  const mod = rt.mains.get("@tomlarkworthy/coded-landmark-tracking");
  const bank = await mod.value("hexFrameBank");
  const analyzeAsync = await mod.value("analyzeFrameManAsync");
  const wasmToggle = await mod.value("viewof wasmOn");

  const setWasm = async (on: boolean, force = false) => {
    if (wasmToggle.value === on && !force) return;
    wasmToggle.value = on;
    wasmToggle.dispatchEvent(new Event("input", { bubbles: true }));
    // let the kernel string, and therefore the pool, rebuild
    for (let i = 0; i < 40; i++) {
      await new Promise((r) => setTimeout(r, 100));
      const src = await mod.value("detectKernelSource");
      const has = src.includes("makeWasmDetectRow(");
      if (has === on) break;
    }
    await new Promise((r) => setTimeout(r, 400));
  };

  const passOnce = async () => {
    const pool = await mod.value("detectPool");
    const opts = { ...(await mod.value("hexRigOpts")), bothAxes: false, runRows: pool ? pool.runRows : undefined };
    let t = 0, marks = 0, wk = 0;
    for (const spec of bank) {
      const t0 = performance.now();
      const r = await analyzeAsync(spec.frame, opts);
      t += performance.now() - t0;
      // slowest worker is the frame's actual scan cost; the gap to wall clock
      // is queueing and the stages the port does not touch
      if (pool && pool.lastWorkerMs.length) wk += Math.max(...pool.lastWorkerMs);
      marks += (r.fused ?? r.marks ?? []).length;
    }
    return { ms: t / bank.length, wk: wk / bank.length, marks };
  };

  // Every arm rebuilds the pool, including one that is already in the state it
  // wants. The first version of this did not, so the first wasm arm measured
  // the boot pool and every later arm a fresh one -- and read 7.5ms against
  // 3.9ms for the same configuration. Arms are only comparable if they start
  // the same way.
  const arm = async (on: boolean) => {
    await setWasm(!on);
    await setWasm(on, true);
    for (let i = 0; i < warm; i++) await passOnce();
    const ms: number[] = [], wk: number[] = []; let marks = 0;
    for (let i = 0; i < rounds; i++) { const p = await passOnce(); ms.push(p.ms); wk.push(p.wk); marks = p.marks; }
    const pool = await mod.value("detectPool");
    return { ms, wk, marks, poolSize: pool ? pool.size : 0 };
  };

  // wasm first then JS, then again reversed, so an ordering effect shows up as
  // a disagreement between the two halves rather than as a result
  const w1 = await arm(true);
  const j1 = await arm(false);
  const j2 = await arm(false);
  const w2 = await arm(true);
  return { w1, j1, j2, w2, frames: bank.length };
}, { rounds: ROUNDS, warm: WARM });

await browser.close();
const med = (a: number[]) => { const s = a.slice().sort((x, y) => x - y); return s[s.length >> 1]; };
const w = med([...out.w1.ms, ...out.w2.ms]), j = med([...out.j1.ms, ...out.j2.ms]);
console.log(`whole-frame, ${out.frames} bank frames, ${out.w1.poolSize} workers\n`);
console.log("wasm ms/frame: " + [...out.w1.ms, ...out.w2.ms].map((x) => x.toFixed(1)).join(" "));
console.log("js   ms/frame: " + [...out.j1.ms, ...out.j2.ms].map((x) => x.toFixed(1)).join(" "));
console.log("wasm slowest worker: " + [...out.w1.wk, ...out.w2.wk].map((x) => x.toFixed(1)).join(" "));
console.log("js   slowest worker: " + [...out.j1.wk, ...out.j2.wk].map((x) => x.toFixed(1)).join(" "));
console.log(`\njs    ${j.toFixed(1)}ms/frame  ${(1000 / j).toFixed(0)} fps`);
console.log(`wasm  ${w.toFixed(1)}ms/frame  ${(1000 / w).toFixed(0)} fps`);
console.log(`      ${(j / w).toFixed(2)}x`);
const ws = med([...out.w1.wk, ...out.w2.wk]), js2 = med([...out.j1.wk, ...out.j2.wk]);
console.log(`\nscan only (slowest worker): js ${js2.toFixed(1)}ms -> wasm ${ws.toFixed(1)}ms  ${(js2 / ws).toFixed(2)}x`);
const half = (a: number[], b: number[]) => `${med(a).toFixed(1)} / ${med(b).toFixed(1)}`;
console.log(`halves (first/second run of each arm): wasm ${half(out.w1.ms, out.w2.ms)}  js ${half(out.j1.ms, out.j2.ms)}`);
console.log(`a large gap between halves means the arms are still warming, not that one is faster`);
console.log(`\nmarks found: js ${out.j1.marks}/${out.j2.marks}, wasm ${out.w1.marks}/${out.w2.marks} (must match)`);
