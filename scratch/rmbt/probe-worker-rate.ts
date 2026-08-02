// A worker takes ~0.4ms per row while this thread takes ~0.09ms for the same
// row. Either the six workers are fighting each other for cores, or a worker
// thread is simply slower than the main thread (macOS puts background threads
// on efficiency cores). One lone worker, same rows, settles it -- and the
// answer decides whether the main thread should be scanning rows too.
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
  const kernel: string = await V("detectKernelSource");
  const manScanRows: any = await V("manScanRows");
  const scanRowsMan: any = await V("scanRowsMan");
  const frame = bank[0].frame;
  const ys: number[] = manScanRows(frame, opts);
  const plain: any = {};
  for (const [k, v] of Object.entries(opts)) if (typeof v !== "function") plain[k] = v;

  const url = URL.createObjectURL(new Blob([kernel], { type: "text/javascript" }));
  const mk = () => {
    const w: any = new Worker(url);
    w.jobs = new Map();
    w.onmessage = (e: any) => {
      const d = e.data;
      if (d.type === "ready") { w.ready && w.ready(); return; }
      const s = w.jobs.get(d.id); if (s) { w.jobs.delete(d.id); s(d); }
    };
    return w;
  };
  const init = (w: any) => new Promise((r) => { w.ready = r; w.postMessage({ type: "init", w: frame.w, h: frame.h }); });
  const run = (w: any, rows: number[], id: number) => new Promise<any>((res) => {
    const px = new Uint8Array(rows.length * frame.w);
    rows.forEach((y, k) => px.set(frame.gray.subarray(y * frame.w, (y + 1) * frame.w), k * frame.w));
    w.jobs.set(id, res);
    w.postMessage({ type: "rows", ys: rows, px, opts: plain, id }, [px.buffer]);
  });

  const med = (xs: number[]) => +xs.slice().sort((a, b) => a - b)[xs.length >> 1].toFixed(2);

  // main thread, all rows, warmed
  for (let i = 0; i < 3; i++) scanRowsMan(frame, ys, opts);
  const mainMs: number[] = [];
  for (let i = 0; i < 7; i++) {
    const t = performance.now();
    scanRowsMan(frame, ys, opts);
    mainMs.push(performance.now() - t);
  }

  // ONE worker, all rows -- no contention with any other worker
  const solo = mk();
  await init(solo);
  let id = 0;
  for (let i = 0; i < 3; i++) await run(solo, ys, ++id);
  const soloMs: number[] = [];
  const soloWall: number[] = [];
  for (let i = 0; i < 7; i++) {
    const t = performance.now();
    const r = await run(solo, ys, ++id);
    soloWall.push(performance.now() - t);
    soloMs.push(r.ms);
  }
  solo.terminate();

  // N workers, all rows each, at the same time -- contention only
  const N = 6;
  const many = Array.from({ length: N }, mk);
  await Promise.all(many.map(init));
  // warm them the way the real pool is warm: a cold worker's first job runs
  // interpreted, and comparing that against a warmed solo worker measures the
  // JIT, not the scheduler
  for (let i = 0; i < 4; i++) await Promise.all(many.map((w) => run(w, ys, ++id)));
  const reps: number[][] = [];
  const walls: number[] = [];
  for (let i = 0; i < 5; i++) {
    const t2 = performance.now();
    const r = await Promise.all(many.map((w) => run(w, ys, ++id)));
    walls.push(performance.now() - t2);
    reps.push(r.map((x: any) => +x.ms.toFixed(1)));
  }
  const rs = reps[reps.length >> 1].map((ms) => ({ ms }));
  const manyWall = med(walls);
  many.forEach((w) => w.terminate());
  URL.revokeObjectURL(url);

  return {
    cores: navigator.hardwareConcurrency,
    rows: ys.length,
    mainAllRowsMs: med(mainMs),
    soloWorkerAllRowsMs: med(soloMs),
    soloWorkerWallMs: med(soloWall),
    sixWorkersEachAllRowsMs: rs.map((r: any) => +r.ms.toFixed(1)),
    sixWorkersWallMs: +manyWall.toFixed(1)
  };
});
await browser.close();
console.log(JSON.stringify(out, null, 1));
