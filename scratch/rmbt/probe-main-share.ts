// Does letting the main thread take chunks from the pool's queue actually pay?
// It scans faster than any worker and idles the whole frame, but it is also the
// only thread that can hand out the next chunk, so its contribution can cost
// more than it adds. Measured, not assumed.
//
// Arms are INTERLEAVED frame by frame and every arm is warmed first: a cold
// worker's first job runs interpreted, and headless Chromium drifts run to run,
// so an arm measured in its own block is measuring the block.
//
//   bun scratch/rmbt/probe-main-share.ts [--reps 7] [--pool 6]
import { chromium } from "playwright";
import { resolve } from "node:path";

const NB = resolve(process.argv.includes("--nb")
  ? process.argv[process.argv.indexOf("--nb") + 1]
  : "lopebooks/notebooks/tomlarkworthy_coded-landmark-tracking.html");
const REPS = +(process.argv.includes("--reps") ? process.argv[process.argv.indexOf("--reps") + 1] : 7);

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
page.on("pageerror", (e) => console.error("PAGE ERROR:", e.message.slice(0, 200)));
await page.addInitScript(() => {
  const orig = (window as any).Runtime; let cap = false;
  Object.defineProperty(window, "Runtime", { get() { return orig; }, set(N: any) {
    const W = function (this: any, ...a: any[]) { const i = new N(...a); if (!cap) { (window as any).__ojs_runtime = i; cap = true; } return i; };
    W.prototype = N.prototype; Object.assign(W, N); return W; } });
});
await page.goto(`file://${NB}`, { waitUntil: "networkidle", timeout: 180000 });
await page.waitForFunction(() => !!(window as any).__ojs_runtime, { timeout: 180000 });
await page.waitForTimeout(20000);

const out = await page.evaluate(async (REPS) => {
  const rt = (window as any).__ojs_runtime;
  const mod = rt.mains.get("@tomlarkworthy/coded-landmark-tracking");
  const V = async (n: string) => await mod.value(n);
  const detectPool: any = await V("detectPool");
  const bank: any = await V("hexFrameBank");
  const analyzeFrameMan: any = await V("analyzeFrameMan");
  const analyzeFrameManAsync: any = await V("analyzeFrameManAsync");
  if (!detectPool) return { note: "pool off" };

  const key = (f: any) => `${f.id}@${f.xc.toFixed(4)},${f.yc.toFixed(4)}`;
  const arms: any = {
    serial: () => analyzeFrameMan(bankFrame, {}),
    pool: () => analyzeFrameManAsync(bankFrame, { runRows: detectPool.runRows }),
    shared: () => analyzeFrameManAsync(bankFrame, { runRows: detectPool.runRows, mainShare: true })
  };
  let bankFrame: any = null;

  const rows: any[] = [];
  let mismatch = 0;
  for (const spec of bank) {
    bankFrame = spec.frame;
    // warm every arm before timing any of them
    for (const k of Object.keys(arms)) { await arms[k](); await arms[k](); }

    // correctness: identical marks, to 4dp, or the speed number is worthless
    const a = await arms.pool(), b = await arms.shared();
    const same = a.fused.map(key).sort().join("|") === b.fused.map(key).sort().join("|");
    if (!same) mismatch++;

    const ts: any = { serial: [], pool: [], shared: [] };
    let mainChunks = 0, workerChunks = 0;
    for (let i = 0; i < REPS; i++) {
      // interleaved: each rep runs all three, so drift hits every arm equally
      for (const k of ["serial", "pool", "shared"]) {
        const t0 = performance.now();
        await arms[k]();
        ts[k].push(performance.now() - t0);
        if (k === "shared") {
          mainChunks = detectPool.lastMainChunks;
          workerChunks = detectPool.lastWorkerChunks.reduce((s: number, x: number) => s + x, 0);
        }
      }
    }
    const med = (xs: number[]) => xs.slice().sort((x, y) => x - y)[xs.length >> 1];
    rows.push({
      frame: spec.name, px: spec.frame.w + "x" + spec.frame.h, same,
      serial: +med(ts.serial).toFixed(2), pool: +med(ts.pool).toFixed(2),
      shared: +med(ts.shared).toFixed(2), mainChunks, workerChunks,
      mainMs: detectPool.lastMainMs
    });
  }
  return { workers: detectPool.size, cores: navigator.hardwareConcurrency, mismatch, rows };
}, REPS);
await browser.close();

if ((out as any).note) { console.log((out as any).note); process.exit(0); }
const o = out as any;
const pad = (x: any, n: number) => String(x).padEnd(n);
console.log(`${o.workers} workers on ${o.cores} logical cores, median of ${REPS} interleaved reps`);
console.log(`\n` + pad("frame", 20) + pad("px", 10) + pad("serial", 9) + pad("pool", 8) +
  pad("shared", 9) + pad("gain", 8) + pad("main/wk chunks", 16) + "identical");
for (const r of o.rows)
  console.log(pad(r.frame, 20) + pad(r.px, 10) + pad(r.serial, 9) + pad(r.pool, 8) +
    pad(r.shared, 9) + pad(((1 - r.shared / r.pool) * 100).toFixed(0) + "%", 8) +
    pad(`${r.mainChunks}/${r.workerChunks}`, 16) + (r.same ? "yes" : "NO"));
const med = (xs: number[]) => xs.slice().sort((a, b) => a - b)[xs.length >> 1];
const mp = med(o.rows.map((r: any) => r.pool)), msh = med(o.rows.map((r: any) => r.shared));
console.log(`\nmedian pool ${mp.toFixed(2)}ms -> shared ${msh.toFixed(2)}ms  ` +
  `(${((1 - msh / mp) * 100).toFixed(0)}% off the frame)`);
console.log(`mark mismatches between the two arms: ${o.mismatch} (must be 0)`);
