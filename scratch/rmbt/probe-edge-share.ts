// A GPU pass can only take the branch-free half of stage 1. edges1Dsub is a
// per-pixel gradient with a sub-pixel interpolation -- ideal. The cascade after
// it (manRowGroups, findInvolution, solveMan) is variable-length, data
// dependent and votes, which is the shape GPUs are worst at. Amdahl decides
// whether WebGPU is worth anything here, so measure the split.
import { chromium } from "playwright";
import { resolve } from "node:path";

const NB = resolve("lopebooks/notebooks/tomlarkworthy_coded-landmark-tracking.html");
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
await page.addInitScript(() => {
  const orig = (window as any).Runtime; let cap = false;
  Object.defineProperty(window, "Runtime", { get() { return orig; }, set(N: any) {
    const W = function (this: any, ...a: any[]) { const i = new N(...a); if (!cap) { (window as any).__ojs_runtime = i; cap = true; } return i; };
    W.prototype = N.prototype; Object.assign(W, N); return W; } });
});
page.on("pageerror", (e) => console.log("!! pageerror " + e.message.slice(0, 160)));
await page.goto(`file://${NB}`, { waitUntil: "networkidle", timeout: 180000 });
await page.waitForFunction(() => !!(window as any).__ojs_runtime, { timeout: 180000 });
await page.waitForTimeout(15000);

const out = await page.evaluate(async () => {
  const rt = (window as any).__ojs_runtime;
  const mod = rt.mains.get("@tomlarkworthy/coded-landmark-tracking");
  const V = (n: string) => mod.value(n);
  await V("poolAgreement");
  const bank: any[] = await V("hexFrameBank");
  const opts: any = await V("hexRigOpts");
  const manScanRows: any = await V("manScanRows");
  const scanRowsMan: any = await V("scanRowsMan");
  const edges1Dsub: any = await V("edges1Dsub");
  const detectRowMan: any = await V("detectRowMan");
  const thr = opts.edgeThreshold ?? 12;

  const edgeMs: number[] = [], fullMs: number[] = [], cascadeMs: number[] = [];
  const edgeCounts: number[] = [];
  for (let rep = 0; rep < 4; rep++) {
    for (const b of bank) {
      const f = b.frame, ys: number[] = manScanRows(f, opts);

      const t0 = performance.now();
      const es: any[] = [];
      for (const y of ys) es.push(edges1Dsub(f.gray.subarray(y * f.w, (y + 1) * f.w), thr));
      const t1 = performance.now();
      for (const e of es) detectRowMan(e, opts);
      const t2 = performance.now();
      scanRowsMan(f, ys, opts);
      const t3 = performance.now();

      if (rep > 1) {
        edgeMs.push(t1 - t0);
        cascadeMs.push(t2 - t1);
        fullMs.push(t3 - t2);
        edgeCounts.push(es.reduce((a: number, e: any) => a + (e.length ?? e.n ?? 0), 0));
      }
    }
  }
  const med = (xs: number[]) => +xs.slice().sort((a, b) => a - b)[xs.length >> 1].toFixed(2);
  const e = med(edgeMs), c = med(cascadeMs), fl = med(fullMs);
  return {
    frames: edgeMs.length,
    edgesMs: e, cascadeMs: c, fullScanMs: fl,
    edgeShare: +(e / (e + c)).toFixed(3),
    medEdgesPerFrame: med(edgeCounts),
    // if the edges became free, what is left of stage 1
    stage1IfEdgesFree: +(c).toFixed(2)
  };
});
await browser.close();
console.log(JSON.stringify(out, null, 1));
