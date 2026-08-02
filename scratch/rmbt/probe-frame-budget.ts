// Where does a LIVE frame's time go, end to end? The HUD's number starts after
// the grayscale conversion and stops after the pose, so it cannot see two of
// the four things a frame costs. This times all of them on real bank frames at
// the rig's own settings, and reports the pool's wall clock beside its slowest
// worker so imbalance is separable from overhead.
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

  // let boot-time agreement clear the workers first, or every number below is
  // measured queued behind it
  await V("poolAgreement");

  const bank: any[] = await V("hexFrameBank");
  const pool: any = await V("detectPool");
  const opts: any = await V("hexRigOpts");
  const manScanRows: any = await V("manScanRows");
  const scanRowsMan: any = await V("scanRowsMan");
  const clusterManRows: any = await V("clusterManRows");
  const fitHexPose: any = await V("fitHexPose");
  const now = () => performance.now();

  // a canvas holding each frame as RGBA, so the grayscale conversion the rig
  // does every frame can be timed for real rather than estimated
  const rgba = bank.map((b) => {
    const f = b.frame;
    const c = document.createElement("canvas");
    c.width = f.w; c.height = f.h;
    const g = c.getContext("2d", { willReadFrequently: true })!;
    const im = g.createImageData(f.w, f.h);
    for (let i = 0, p = 0; i < f.gray.length; i++, p += 4) {
      im.data[p] = im.data[p + 1] = im.data[p + 2] = f.gray[i];
      im.data[p + 3] = 255;
    }
    g.putImageData(im, 0, 0);
    return { ctx: g, w: f.w, h: f.h };
  });

  const rows: any[] = [];
  for (let rep = 0; rep < 3; rep++) {
    for (let i = 0; i < bank.length; i++) {
      const f = bank[i].frame;
      const { ctx, w, h } = rgba[i];

      const a0 = now();
      const px = ctx.getImageData(0, 0, w, h).data;
      const a1 = now();
      const gray = new Uint8Array(w * h);
      for (let k = 0, p = 0; k < gray.length; k++, p += 4)
        gray[k] = (px[p] * 77 + px[p + 1] * 150 + px[p + 2] * 29) >> 8;
      const a2 = now();

      const frame = { gray, w, h };
      const ys = manScanRows(frame, opts);
      const a3 = now();

      // the same conversion restricted to the rows that are actually scanned
      const grayRows = new Uint8Array(w * h);
      for (const y of ys) {
        const base = y * w;
        for (let x = 0, p = base * 4; x < w; x++, p += 4)
          grayRows[base + x] = (px[p] * 77 + px[p + 1] * 150 + px[p + 2] * 29) >> 8;
      }
      const a4 = now();

      const rr = await pool.runRows(frame, ys, opts);
      const a5 = now();
      const res = clusterManRows(rr, opts);
      const a6 = now();
      const pose = fitHexPose({ ...res, w, h });
      const a7 = now();

      const serial0 = now();
      scanRowsMan(frame, ys, opts);
      const serial1 = now();

      if (rep > 0) rows.push({
        i,
        getImageData: a1 - a0,
        grayFull: a2 - a1,
        grayRowsOnly: a4 - a3,
        scanRows: ys.length,
        poolWall: a5 - a4,
        poolMaxWorker: Math.max(...pool.lastWorkerMs),
        poolWorkers: pool.lastWorkerMs.slice(),
        cluster: a6 - a5,
        pose: a7 - a6,
        serialScan: serial1 - serial0,
        read: pose.ok ? pose.counts.read : 0
      });
    }
  }

  const med = (xs: number[]) => xs.slice().sort((a, b) => a - b)[xs.length >> 1];
  const col = (k: string) => +med(rows.map((r: any) => r[k])).toFixed(2);
  return {
    poolSize: pool.size,
    frames: rows.length,
    rowsScanned: rows[0].scanRows,
    median: {
      getImageData: col("getImageData"),
      grayFull: col("grayFull"),
      grayRowsOnly: col("grayRowsOnly"),
      poolWall: col("poolWall"),
      poolMaxWorker: col("poolMaxWorker"),
      cluster: col("cluster"),
      pose: col("pose"),
      serialScan: col("serialScan")
    },
    // how uneven is one frame's split, worst worker over median worker
    imbalance: +med(rows.map((r: any) => {
      const w = r.poolWorkers.slice().sort((a: number, b: number) => a - b);
      return Math.max(...w) / (w[w.length >> 1] || 1);
    })).toFixed(2),
    sampleWorkers: rows.slice(0, 4).map((r: any) => r.poolWorkers)
  };
});
await browser.close();
console.log(JSON.stringify(out, null, 1));
