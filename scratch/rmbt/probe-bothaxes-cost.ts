// What does bothAxes cost NOW, after the concurrency work? The toggle's comment
// still says "halves the frame rate", which was true when the two passes ran
// one after the other. Measured on the pooled path, warmed.
import { chromium } from "playwright";
import { resolve } from "node:path";
const IN = resolve("lopebooks/notebooks/tomlarkworthy_coded-landmark-tracking.html");
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.addInitScript(() => {
  const orig = (window as any).Runtime; let cap = false;
  Object.defineProperty(window, "Runtime", { get() { return orig; }, set(N: any) {
    const W = function (this: any, ...a: any[]) { const i = new N(...a); if (!cap) { (window as any).__ojs_runtime = i; cap = true; } return i; };
    W.prototype = N.prototype; Object.assign(W, N); return W; } });
});
await page.goto(`file://${IN}#view=S100(@tomlarkworthy/coded-landmark-tracking)`, { waitUntil: "networkidle", timeout: 300000 });
await page.waitForFunction(() => !!(window as any).__ojs_runtime, { timeout: 300000 });
await page.waitForTimeout(15000);
const out = await page.evaluate(async () => {
  const rt = (window as any).__ojs_runtime;
  const mod = rt.mains.get("@tomlarkworthy/coded-landmark-tracking");
  const val = async (n: string) => {
    const v = [...rt._variables].find((z: any) => z._module === mod && z._name === n);
    return v ? await v._promise : null; };
  const [bank, opts, asyncA, pool] = await Promise.all(
    ["hexFrameBank", "hexRigOpts", "analyzeFrameManAsync", "detectPool"].map(val));
  const f = (bank as any[])[0].frame;
  const frame = { gray: f.gray, w: f.w, h: f.h };
  const time = async (bothAxes: boolean, n = 25) => {
    const o = { ...opts, bothAxes, runRows: pool.runRows };
    for (let i = 0; i < 8; i++) await asyncA(frame, o);      // warm
    const ts: number[] = [];
    for (let i = 0; i < n; i++) { const t = performance.now(); await asyncA(frame, o); ts.push(performance.now() - t); }
    ts.sort((a, b) => a - b);
    return { p50: +ts[ts.length >> 1].toFixed(1), p10: +ts[Math.floor(n * .1)].toFixed(1), p90: +ts[Math.floor(n * .9)].toFixed(1) };
  };
  const one = await time(false), two = await time(true), one2 = await time(false), two2 = await time(true);
  return { poolSize: pool?.size, dims: `${f.w}x${f.h}`, one, two, one2, two2,
    ratio: +(((two.p50 + two2.p50) / (one.p50 + one2.p50))).toFixed(2) };
});
console.log(JSON.stringify(out, null, 1));
console.log(`\nbothAxes costs ${out.ratio}x single-axis (desktop, pool ${out.poolSize})`);
await browser.close();
