// Per-view: what did the segmenter actually call "the object", and do the TRUE
// object's own corners land inside that view's silhouette? If a corner of the
// real solid is outside its own view's mask, the silhouette is wrong and every
// intersection downstream is wrong with it.
import { chromium } from "playwright";
import { resolve } from "node:path";

const NB = resolve("lopebooks/notebooks/tomlarkworthy_flat-trace.html");
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
const errs: string[] = [];
page.on("pageerror", (e) => errs.push("pageerror: " + e.message));
await page.addInitScript(() => {
  const orig = (window as any).Runtime; let cap = false;
  Object.defineProperty(window, "Runtime", {
    get() { return orig; },
    set(N: any) {
      const W = function (this: any, ...a: any[]) { const i = new N(...a); if (!cap) { (window as any).__ojs_runtime = i; cap = true; } return i; };
      W.prototype = N.prototype; Object.assign(W, N); return W;
    }
  });
});
await page.goto(`file://${NB}`, { waitUntil: "networkidle", timeout: 180000 });
await page.waitForFunction(() => !!(window as any).__ojs_runtime, { timeout: 180000 });
await page.waitForTimeout(5000);

const out = await page.evaluate(async () => {
  const rt = (window as any).__ojs_runtime;
  const mod = [...rt._variables].find((v: any) => v._name === "matTarget")?._module;
  const val = (n: string) => mod.value(n);
  const T: any = await val("matTarget");
  const makeMatSampler: any = await val("makeMatSampler");
  const makePlaneMap: any = await val("makePlaneMap");
  const traceFrame: any = await val("traceFrame");
  const cameraPoseAt: any = await val("cameraPoseAt");

  const W = 1100, H = 825;
  const TRUE = { f: 0.9 * W, cx: W / 2 - 6, cy: H / 2 + 4, k1: -0.16, k2: 0.04, p1: 0, p2: 0 };
  const matGray = makeMatSampler();
  const HGT = 18;
  const inPlan = (x: number, y: number) => x >= -20 && x <= 20 && y >= -15 && y <= 15 && !(x > 0 && y > 0);

  const rows: any[] = [];
  for (const [el, TONE] of [[85, 45], [62, 45], [45, 45], [30, 45], [30, 120], [30, 200], [30, 10], [45, 120], [62, 120]]) {
    const map = makePlaneMap(TRUE, cameraPoseAt(0, el, 1.15 * T.pageW));
    const gray = new Uint8Array(W * H);
    let objPx = 0, roiPx = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const p0 = map.toPlaneAt(x + 0.5, y + 0.5, 0);
      if (!p0) { gray[y * W + x] = 230; continue; }
      const p1 = map.toPlaneAt(x + 0.5, y + 0.5, HGT);
      let hit = false;
      if (p1) for (let s = 0; s <= 24 && !hit; s++) {
        const u = s / 24;
        if (inPlan(p0[0] + (p1[0] - p0[0]) * u, p0[1] + (p1[1] - p0[1]) * u)) hit = true;
      }
      if (hit) objPx++;
      if (Math.abs(p0[0]) < T.pageW / 2 && Math.abs(p0[1]) < T.pageH / 2) roiPx++;
      gray[y * W + x] = hit ? TONE : matGray(p0[0], p0[1]);
    }
    const r = traceFrame({ gray, w: W, h: H }, TRUE, {});
    const row: any = {
      el, TONE, tilt: +map.tiltDeg.toFixed(0), truthObjPx: objPx, roiPx,
      ok: r.ok, why: r.ok ? null : String(r.why).split("—")[0].trim(),
      maskAreaPx: r.mask ? r.mask.areaPx : null, bboxMm: r.bboxMm, areaMm2: r.areaMm2,
      resid: r.matResidualPct
    };
    if (r.mask) {
      // Every corner of the true solid, at both heights, must be inside the mask.
      let out = 0, total = 0, offFrame = 0;
      for (const [X, Y] of [[-20, -15], [20, -15], [-20, 15], [0, 15], [0, 0], [20, 0], [-10, -7], [-19, 14]]) {
        for (const Z of [0, HGT / 2, HGT]) {
          const p = map.toPixelAt(X, Y, Z);
          total++;
          if (!p) { offFrame++; continue; }
          const u = Math.round(p[0]), v = Math.round(p[1]);
          if (u < 0 || v < 0 || u >= W || v >= H) { offFrame++; continue; }
          if (!r.mask.mask[v * W + u]) out++;
        }
      }
      row.truePointsOutsideMask = `${out}/${total}` + (offFrame ? ` (${offFrame} off frame)` : "");
      // Where does the mask actually sit, in pixels?
      let u0 = 1e9, v0 = 1e9, u1 = -1, v1 = -1;
      for (let i = 0; i < r.mask.mask.length; i++) if (r.mask.mask[i]) {
        const u = i % W, v = (i / W) | 0;
        if (u < u0) u0 = u; if (u > u1) u1 = u; if (v < v0) v0 = v; if (v > v1) v1 = v;
      }
      row.maskPxBox = [u0, v0, u1, v1];
      // and where the true object sits
      let a0 = 1e9, b0 = 1e9, a1 = -1, b1 = -1;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (gray[y * W + x] === TONE) {
        if (x < a0) a0 = x; if (x > a1) a1 = x; if (y < b0) b0 = y; if (y > b1) b1 = y;
      }
      row.truthPxBox = [a0, b0, a1, b1];
    }
    rows.push(row);
  }
  return rows;
});
await browser.close();
console.log(out.map((r: any) => JSON.stringify(r)).join("\n"));
if (errs.length) console.log("\n--- page errors ---\n" + [...new Set(errs)].slice(0, 10).join("\n"));
