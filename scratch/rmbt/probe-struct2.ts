// Settle the structure term's radius and slope ratio against ALL three
// placements at once (it is placement, not resolution, that exposes it) plus
// the oblique dark-part rescue.
import { chromium } from "playwright";
import { resolve } from "node:path";
const NB = resolve("lopebooks/notebooks/tomlarkworthy_flat-trace.html");
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
await page.addInitScript(() => {
  const orig = (window as any).Runtime; let cap = false;
  Object.defineProperty(window, "Runtime", { get() { return orig; }, set(N: any) {
    const W = function (this: any, ...a: any[]) { const i = new N(...a); if (!cap) { (window as any).__ojs_runtime = i; cap = true; } return i; };
    W.prototype = N.prototype; Object.assign(W, N); return W; } });
});
await page.goto(`file://${NB}`, { waitUntil: "networkidle", timeout: 180000 });
await page.waitForFunction(() => !!(window as any).__ojs_runtime, { timeout: 180000 });
await page.waitForTimeout(5000);
const out = await page.evaluate(async () => {
  const rt = (window as any).__ojs_runtime;
  const mod = [...rt._variables].find((v: any) => v._name === "matTarget")?._module;
  const val = (n: string) => mod.value(n);
  const t: any = await val("traceSelfTest");
  const T: any = await val("matTarget");
  const makeMatSampler: any = await val("makeMatSampler");
  const makePlaneMap: any = await val("makePlaneMap");
  const traceFrame: any = await val("traceFrame");
  const cameraPoseAt: any = await val("cameraPoseAt");
  // the oblique rescue scene
  const W = 1100, H = 825;
  const TRUE = { f: 0.9 * W, cx: W / 2 - 6, cy: H / 2 + 4, k1: -0.16, k2: 0.04, p1: 0, p2: 0 };
  const matGray = makeMatSampler();
  const HGT = 18;
  const inPlan = (x: number, y: number) => x >= -20 && x <= 20 && y >= -15 && y <= 15 && !(x > 0 && y > 0);
  const map = makePlaneMap(TRUE, cameraPoseAt(0, 30, 1.15 * T.pageW));
  const gray = new Uint8Array(W * H);
  let truthObjPx = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const p0 = map.toPlaneAt(x + 0.5, y + 0.5, 0);
    if (!p0) { gray[y * W + x] = 230; continue; }
    const p1 = map.toPlaneAt(x + 0.5, y + 0.5, HGT);
    let hit = false;
    if (p1) for (let s = 0; s <= 24 && !hit; s++) { const u = s / 24; if (inPlan(p0[0] + (p1[0] - p0[0]) * u, p0[1] + (p1[1] - p0[1]) * u)) hit = true; }
    if (hit) truthObjPx++;
    gray[y * W + x] = hit ? 45 : matGray(p0[0], p0[1]);
  }
  const rows: any[] = [];
  for (const r of [3, 4, 5, 7]) for (const ratio of [0.15, 0.25, 0.35]) {
    const difference = { structRadius: r, structSlopeRatio: ratio };
    const a = t({ W: 1280, H: 960, cases: [{ tilt: 3, thick: 0 }], trace: { difference } });
    const b = t({ W: 1280, H: 960, cases: [{ tilt: 25, thick: 3 }], trace: { difference } });
    const res = traceFrame({ gray, w: W, h: H }, TRUE, { difference });
    rows.push({
      r, ratio,
      f_med: a.rows[0].medMm, f_p95: a.rows[0].p95Mm, f_max: a.rows[0].maxMm, f_bbox: a.rows[0].worstBboxMm, f_area: a.rows[0].worstAreaPct,
      t25_med: b.rows[0].medMm, t25_p95: b.rows[0].p95Mm, t25_area: b.rows[0].worstAreaPct,
      rescuePct: res.mask ? +(100 * res.mask.areaPx / truthObjPx).toFixed(1) : null
    });
  }
  return rows;
});
await browser.close();
console.log(out.map((r: any) => JSON.stringify(r)).join("\n"));
