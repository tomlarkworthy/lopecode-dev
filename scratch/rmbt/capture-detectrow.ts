// Record every real call to detectRowMan the 16 bank frames make, with its
// full output, so an AssemblyScript port of the whole cascade
// (manRowGroups -> findInvolution -> solveMan) can be held to it.
//
// detectRowMan is the right boundary for the port: one call per row, so the
// JS<->WASM crossing is paid ~120 times a frame instead of once per candidate
// group, and it is the smallest unit that contains all three expensive stages.
//
// Captured by REDEFINING the cell with a recording wrapper, so these are the
// calls the shipping detector makes.
//
//   bun scratch/rmbt/capture-detectrow.ts
import { chromium } from "playwright";
import { resolve } from "node:path";

const arg = (n: string, d: string) => {
  const i = process.argv.indexOf("--" + n);
  return i >= 0 ? process.argv[i + 1] : d;
};
const NB = resolve(arg("nb", "lopebooks/notebooks/tomlarkworthy_coded-landmark-tracking.html"));
const OUT = arg("out", "scratch/rmbt/detectrow-cases.json");

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
page.on("pageerror", (e) => console.error("PAGEERROR", e.message.slice(0, 200)));
await page.addInitScript(() => {
  const orig = (window as any).Runtime; let cap = false;
  Object.defineProperty(window, "Runtime", { get() { return orig; }, set(N: any) {
    const W = function (this: any, ...a: any[]) { const i = new N(...a); if (!cap) { (window as any).__ojs_runtime = i; cap = true; } return i; };
    W.prototype = N.prototype; Object.assign(W, N); return W; } });
});
await page.goto(`file://${NB}`, { waitUntil: "networkidle", timeout: 180000 });
await page.waitForFunction(() => !!(window as any).__ojs_runtime, { timeout: 180000 });
await page.waitForTimeout(15000);

const out = await page.evaluate(async () => {
  const rt = (window as any).__ojs_runtime;
  const mod = rt.mains.get("@tomlarkworthy/coded-landmark-tracking");
  const real = await mod.value("detectRowMan");
  const bank = await mod.value("hexFrameBank");
  const opts = await mod.value("hexRigOpts");
  const o = { ...opts, bothAxes: false };

  const calls: any[] = [];
  mod.redefine("detectRowMan", [], () => (scanEdges: any[], op: any = {}) => {
    const hits = real(scanEdges, op);
    calls.push({
      xs: scanEdges.map((e: any) => (typeof e === "number" ? e : e.x)),
      ss: scanEdges.map((e: any) => (typeof e === "number" ? 1 : e.s)),
      // every knob the cascade reads, pinned at capture time so the port is
      // compared under the same configuration and not the defaults
      tolPx: op.tolPx ?? 1.1, minInliers: op.minInliers ?? 6,
      gapFrac: op.gapFrac ?? 0.2, minEdges: op.minEdges ?? 6, minSpan: op.minSpan ?? 14,
      minDirect: op.minDirect ?? 5,
      hits: hits.map((h: any) => ({
        foot: h.foot, d: h.d, sup: h.sup, wHalf: h.wHalf,
        id: h.id === null ? -1 : h.id, x0: h.x0, x1: h.x1
      }))
    });
    return hits;
  });

  const analyze = await mod.value("analyzeFrameMan");
  for (const spec of bank) analyze(spec.frame, o);
  // Deliberately NO summary here. Redefining the cell makes every downstream
  // consumer recompute -- poolAgreement and both frame reports each push the
  // whole bank through detectRowMan as well -- and those land asynchronously,
  // including between a summary computed here and Playwright serialising the
  // array. A summary taken in-page counted 2715 hits for an array that
  // reached the disk holding 11213. Count outside, where the data is final.
  return { frames: bank.length, calls };
});

await browser.close();
await Bun.write(OUT, JSON.stringify(out, null, 0));
const calls = out.calls;
const nHits = calls.reduce((a: number, c: any) => a + c.hits.length, 0);
const decoded = calls.reduce((a: number, c: any) => a + c.hits.filter((h: any) => h.id >= 0).length, 0);
const maxEdges = calls.reduce((a: number, c: any) => Math.max(a, c.xs.length), 0);
console.log(`${out.frames} frames -> ${calls.length} detectRowMan calls`);
console.log(`  (more than one pass over the bank: poolAgreement and the frame reports run it too)`);
console.log(`  ${calls.filter((c: any) => c.hits.length).length} produced hits, ${nHits} hits total, ${decoded} with a decoded id`);
console.log(`  widest row: ${maxEdges} edges`);
console.log(`wrote ${OUT}`);
