// "The phone always starts slow and then gets really fast." Is that real, how
// big is it, and how long does it take to converge?
//
// The pool's kernel is the live cells put through toString() and rebuilt with
// new Function() inside each worker, so a fresh worker starts fully
// interpreted -- nothing about the main thread's JIT state crosses over. That
// makes warm-up a prediction, not a guess, and this measures it: force a NEW
// pool, then time the very first job and every job after it, one at a time.
//
// poolAgreement recomputes when the pool does and pushes all 16 bank frames
// through the same new workers, so the early samples are contended as well as
// cold. That is exactly what boot does on the phone, so it stays in -- but the
// moment it resolves is recorded, because a curve that keeps falling after it
// is JIT and one that snaps flat at it was contention.
//
//   bun scratch/rmbt/warmup-curve.ts [--n 80] [--size 6] [--nb <file.html>]
import { chromium } from "playwright";
import { resolve } from "node:path";

const arg = (n: string, d: string) => {
  const i = process.argv.indexOf("--" + n);
  return i >= 0 ? process.argv[i + 1] : d;
};
const NB = resolve(arg("nb", "lopebooks/notebooks/tomlarkworthy_coded-landmark-tracking.html"));
const N = +arg("n", "80");
const SIZE = +arg("size", "6");

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.addInitScript(() => {
  const orig = (window as any).Runtime; let cap = false;
  Object.defineProperty(window, "Runtime", { get() { return orig; }, set(N: any) {
    const W = function (this: any, ...a: any[]) { const i = new N(...a); if (!cap) { (window as any).__ojs_runtime = i; cap = true; } return i; };
    W.prototype = N.prototype; Object.assign(W, N); return W; } });
});
await page.goto(`file://${NB}`, { waitUntil: "networkidle", timeout: 180000 });
await page.waitForFunction(() => !!(window as any).__ojs_runtime, { timeout: 180000 });
await page.waitForTimeout(15000);

const out = await page.evaluate(async ({ n, size }) => {
  const rt = (window as any).__ojs_runtime;
  const mod = rt.mains.get("@tomlarkworthy/coded-landmark-tracking");
  const vars = [...rt._variables].filter((v: any) => v._module === mod);
  const V = (nm: string) => vars.find((x: any) => x._name === nm);
  const bank = await mod.value("hexFrameBank");
  const run = await mod.value("analyzeFrameManAsync");
  const opts = await mod.value("hexRigOpts");
  const frame = bank[0].frame;

  // Settle first, so the "cold" below is the pool's coldness and not the
  // notebook's. Everything the boot wanted to compute is done by now.
  await mod.value("poolAgreement");
  await new Promise((r) => setTimeout(r, 1500));

  // Steady state, measured BEFORE the swap on the warm pool that is already
  // here -- the number the cold curve has to be compared against.
  const warmPool = await mod.value("detectPool");
  const warm: number[] = [];
  for (let i = 0; i < 25; i++) {
    const t = performance.now();
    await run(frame, { ...opts, bothAxes: false, runRows: warmPool.runRows });
    warm.push(performance.now() - t);
  }

  // Now a genuinely new pool. Cycle through a different size so the cell has
  // to recompute even if `size` is what it already was.
  const vo = V("viewof poolSize")._value as HTMLElement & { value: number };
  vo.value = size === 2 ? 3 : 2;
  vo.dispatchEvent(new Event("input", { bubbles: true }));
  await new Promise((r) => setTimeout(r, 400));
  vo.value = size;
  vo.dispatchEvent(new Event("input", { bubbles: true }));

  const pool = await mod.value("detectPool");
  const t0 = performance.now();
  let agreeAt: number | null = null;
  mod.value("poolAgreement").then(() => { agreeAt = performance.now() - t0; });

  const cold: number[] = [];
  const at: number[] = [];
  const wrk: number[] = [];
  for (let i = 0; i < n; i++) {
    const t = performance.now();
    await run(frame, { ...opts, bothAxes: false, runRows: pool.runRows });
    cold.push(performance.now() - t);
    at.push(t - t0);
    // The slowest worker's own reported time. Wall clock minus this is time the
    // job spent NOT being worked on -- queued behind poolAgreement's 16 frames.
    // Cold code makes lastWorkerMs large; contention leaves it small and opens
    // a gap. The two look identical from the outside and are not the same bug.
    const per = pool.lastWorkerMs || [];
    wrk.push(per.length ? Math.max(...per) : 0);
  }
  return {
    cores: navigator.hardwareConcurrency, workers: pool.size,
    px: frame.w + "x" + frame.h, warm, cold, at, wrk, agreeAt
  };
}, { n: N, size: SIZE });

const med = (a: number[]) => { const s = a.slice().sort((x, y) => x - y); return s[s.length >> 1]; };
const f = (x: number) => x.toFixed(1).padStart(6);

console.log(`${out.cores} cores, ${out.workers} workers, ${out.px}`);
console.log(`poolAgreement on the new pool resolved at ${out.agreeAt == null ? "not within the run" : Math.round(out.agreeAt) + "ms"}\n`);
console.log("cold pool, per job (ms), in order -- wall, then the slowest worker's own time:");
for (let i = 0; i < out.cold.length; i += 10) {
  const c = out.cold.slice(i, i + 10);
  const w = out.wrk.slice(i, i + 10);
  console.log(`  ${String(i + 1).padStart(3)}-${String(i + c.length).padStart(3)} wall ${c.map(f).join("")}`);
  console.log(`          wrkr ${w.map(f).join("")}`);
}
const gap = out.cold.map((c, i) => c - out.wrk[i]);
console.log(`\nqueued (wall - worker): first 10 median ${med(gap.slice(0, 10)).toFixed(1)}ms, last 20 median ${med(gap.slice(-20)).toFixed(1)}ms`);
console.log(`worker time itself:     first 10 median ${med(out.wrk.slice(0, 10)).toFixed(1)}ms, last 20 median ${med(out.wrk.slice(-20)).toFixed(1)}ms`);
const first = out.cold[0];
const early = med(out.cold.slice(0, 10));
const late = med(out.cold.slice(-20));
const warmMed = med(out.warm);
console.log(`\nfirst job        ${first.toFixed(1)}ms`);
console.log(`first 10 median  ${early.toFixed(1)}ms`);
console.log(`last 20 median   ${late.toFixed(1)}ms`);
console.log(`pre-swap warm    ${warmMed.toFixed(1)}ms  (the same pool, already warm)`);
console.log(`\nwarm-up factor   ${(early / late).toFixed(2)}x  (first 10 vs last 20)`);
console.log(`first-job factor ${(first / late).toFixed(2)}x`);
// Where does it stop improving? First job within 20% of steady state.
const conv = out.cold.findIndex((v) => v <= late * 1.2);
console.log(`converged at     job ${conv + 1}, ${Math.round(out.at[conv < 0 ? out.at.length - 1 : conv])}ms after the pool was built`);
if (out.agreeAt != null)
  console.log(`(poolAgreement was still running for the first ${Math.round(out.agreeAt)}ms of that)`);

await browser.close();
process.exit(0);
