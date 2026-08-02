// Does the on-demand queue still agree with the serial arm, and does it
// actually redistribute? Chunk counts are the visible evidence: equal counts
// mean the cores were equal, unequal counts mean the queue absorbed a slow one.
import { chromium } from "playwright";
import { resolve } from "node:path";
const NB = resolve(process.argv.includes("--nb")
  ? process.argv[process.argv.indexOf("--nb") + 1]
  : "lopebooks/notebooks/tomlarkworthy_coded-landmark-tracking.html");
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
  const agree: any = await V("poolAgreement");
  const bank: any[] = await V("hexFrameBank");
  const pool: any = await V("detectPool");
  const opts: any = await V("hexRigOpts");
  const async1: any = await V("analyzeFrameManAsync");
  const sync1: any = await V("analyzeFrameMan");
  const chunks: number[][] = [], wall: number[] = [], maxw: number[] = [];
  let mismatch = 0;
  for (let rep = 0; rep < 3; rep++)
    for (const b of bank) {
      const t = performance.now();
      const r = await async1(b.frame, { ...opts, runRows: pool.runRows });
      const dt = performance.now() - t;
      if (rep > 0) { wall.push(dt); chunks.push((pool.lastWorkerChunks ?? []).slice()); maxw.push(Math.max(...pool.lastWorkerMs)); }
      const s = sync1(b.frame, opts);
      const round = (o: any) => JSON.stringify(o, (_k, v) => (typeof v === "number" ? +v.toFixed(4) : v));
      if (round(r.fused) !== round(s.fused)) mismatch++;
    }
  const med = (xs: number[]) => +xs.slice().sort((a, b) => a - b)[xs.length >> 1].toFixed(2);
  return { poolSize: pool.size, bootAgreement: agree.allIdentical ?? String(agree),
    frames: wall.length, mismatch, medWallMs: med(wall), medSlowestWorkerMs: med(maxw),
    sampleChunks: chunks.slice(0, 6) };
});
await browser.close();
console.log(JSON.stringify(out, null, 1));
