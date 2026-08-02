// Where does a pooled frame's time go? The size sweep said 2 workers beat 6,
// which only makes sense if per-frame overhead dominates the work being
// spread. This splits one frame into: the round trip with no rows, the round
// trip carrying the rows, and the scan itself on this thread.
import { chromium } from "playwright";
import { resolve } from "node:path";

const NB = resolve("lopebooks/notebooks/tomlarkworthy_coded-landmark-tracking.html");
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
await page.addInitScript(() => {
  const orig = (window as any).Runtime;
  let cap = false;
  Object.defineProperty(window, "Runtime", {
    get() { return orig; },
    set(N: any) {
      const W = function (this: any, ...a: any[]) { const i = new N(...a); if (!cap) { (window as any).__ojs_runtime = i; cap = true; } return i; };
      W.prototype = N.prototype; Object.assign(W, N); return W;
    },
  });
});
page.on("crash", () => console.log("!! page crashed"));
page.on("close", () => console.log("!! page closed"));
page.on("framenavigated", (f) => { if (f === page.mainFrame()) console.log("!! navigated to " + f.url().slice(0, 80)); });
page.on("pageerror", (e) => console.log("!! pageerror " + e.message.slice(0, 160)));
await page.goto(`file://${NB}`, { waitUntil: "networkidle", timeout: 180000 });
await page.waitForFunction(() => !!(window as any).__ojs_runtime, { timeout: 180000 });
await page.waitForTimeout(15000);

const out = await page.evaluate(async () => {
  const rt = (window as any).__ojs_runtime;
  const mod = rt.mains.get("@tomlarkworthy/coded-landmark-tracking");
  const bank = await mod.value("hexFrameBank");
  const pool = await mod.value("detectPool");
  const scanRowsMan = await mod.value("scanRowsMan");
  const manScanRows = await mod.value("manScanRows");
  const clusterManRows = await mod.value("clusterManRows");
  const kernel = await mod.value("detectKernelSource");
  if (!pool) return { error: "pool off" };

  const med = (xs: number[]) => xs.slice().sort((a, b) => a - b)[xs.length >> 1];
  const timeIt = async (n: number, fn: () => any) => {
    await fn();
    const ts: number[] = [];
    for (let i = 0; i < n; i++) { const t = performance.now(); await fn(); ts.push(performance.now() - t); }
    return +med(ts).toFixed(2);
  };

  // an echo worker: same transfer, same reply shape, zero detection work
  const echoSrc = `self.onmessage = (e) => {
    const d = e.data;
    if (d.type === "init") { self.postMessage({type:"ready"}); return; }
    self.postMessage({ type:"done", id:d.id, rows: d.ys.map((y)=>({y, hits:[]})) });
  };`;
  const echoUrl = URL.createObjectURL(new Blob([echoSrc], { type: "text/javascript" }));
  const echoes = Array.from({ length: pool.size }, () => new Worker(echoUrl));
  const echoRound = (frame: any, ys: number[]) =>
    Promise.all(echoes.map((w, i) => new Promise((res) => {
      const mine = ys.filter((_, k) => k % echoes.length === i);
      const px = new Uint8Array(mine.length * frame.w);
      mine.forEach((y, k) => px.set(frame.gray.subarray(y * frame.w, (y + 1) * frame.w), k * frame.w));
      w.onmessage = () => res(null);
      w.postMessage({ type: "rows", id: 1, ys: mine, px, opts: {} }, [px.buffer]);
    })));

  const rows: any[] = [];
  for (const spec of bank.slice(0, 6)) {
    const f = spec.frame;
    const ys = manScanRows(f, {});
    const scanned = scanRowsMan(f, ys, {});
    const hitCount = scanned.reduce((a: number, r: any) => a + r.hits.length, 0);
    rows.push({
      frame: spec.name,
      rows: ys.length,
      hits: hitCount,
      scanMs: await timeIt(5, () => scanRowsMan(f, ys, {})),
      clusterMs: await timeIt(5, () => clusterManRows(scanned, {})),
      poolMs: await timeIt(5, () => pool.runRows(f, ys, {})),
      echoMs: await timeIt(5, () => echoRound(f, ys)),
    });
  }
  for (const w of echoes) w.terminate();
  URL.revokeObjectURL(echoUrl);

  // Slowest worker vs wall clock, on the pool that actually ships. If they are
  // close, the split is working and what is left is real work; if wall clock is
  // much larger, the loss is scheduling/transfer/reply-clone, not the scan.
  const split: any[] = [];
  for (const spec of bank.slice(0, 6)) {
    const f = spec.frame;
    const ys = manScanRows(f, {});
    for (let i = 0; i < 10; i++) await pool.runRows(f, ys, {});
    const wall: number[] = [], slowest: number[] = [], sums: number[] = [];
    for (let i = 0; i < 10; i++) {
      const t = performance.now();
      await pool.runRows(f, ys, {});
      wall.push(performance.now() - t);
      const per = pool.lastWorkerMs || [];
      slowest.push(Math.max(...per));
      sums.push(per.reduce((a: number, b: number) => a + b, 0));
    }
    split.push({ frame: spec.name, rows: ys.length,
      wallMs: +med(wall).toFixed(2), slowestWorkerMs: +med(slowest).toFixed(2),
      summedWorkerMs: +med(sums).toFixed(2) });
  }

  return {
    split,
    workers: pool.size,
    kernelKB: +(kernel.length / 1024).toFixed(1),
    rows,
    medians: {
      scanMs: med(rows.map((r) => r.scanMs)),
      clusterMs: med(rows.map((r) => r.clusterMs)),
      poolMs: med(rows.map((r) => r.poolMs)),
      echoMs: med(rows.map((r) => r.echoMs)),
    },
  };
});
await browser.close();
console.log(JSON.stringify(out, null, 1));
