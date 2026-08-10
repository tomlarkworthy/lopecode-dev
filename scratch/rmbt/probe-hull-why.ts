// Oblique views collapse the hull. Two candidates: the RECOVERED pose is wrong
// out of the plane (it is fitted from coplanar marks only, so any error has a
// lever arm proportional to height), or the carve itself is at fault. Decide by
// carving the SAME silhouettes with the TRUE poses.
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
  const packMask: any = await val("packMask");
  const carveHull: any = await val("carveHull");
  const surfaceNets: any = await val("surfaceNets");
  const calib: any = await val("calib");

  const W = 1100, H = 825;
  const TRUE = { f: 0.9 * W, cx: W / 2 - 6, cy: H / 2 + 4, k1: -0.16, k2: 0.04, p1: 0, p2: 0 };
  const matGray = makeMatSampler();
  const HGT = 18, truthVol = (40 * 30 - 20 * 15) * HGT;
  const inPlan = (x: number, y: number) => x >= -20 && x <= 20 && y >= -15 && y <= 15 && !(x > 0 && y > 0);
  const render = (map: any) => {
    const gray = new Uint8Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const p0 = map.toPlaneAt(x + 0.5, y + 0.5, 0);
      if (!p0) { gray[y * W + x] = 230; continue; }
      const p1 = map.toPlaneAt(x + 0.5, y + 0.5, HGT);
      let hit = false;
      if (p1) for (let s = 0; s <= 24 && !hit; s++) {
        const u = s / 24;
        if (inPlan(p0[0] + (p1[0] - p0[0]) * u, p0[1] + (p1[1] - p0[1]) * u)) hit = true;
      }
      gray[y * W + x] = hit ? 45 : matGray(p0[0], p0[1]);
    }
    return { gray, w: W, h: H };
  };
  const ring = (n: number, el: number, off = 0) => Array.from({ length: n }, (_, i) => [off + (360 * i) / n, el]);

  const measure = (views: any[], carveOpts: any) => {
    const c = carveHull(views, { voxelMm: 1, maxHeightMm: 40, ...carveOpts });
    if (!c.ok) return { why: c.why };
    const m = surfaceNets(c.occ, c.nx, c.ny, c.nz, c.origin, c.step);
    let x0 = Infinity, y0 = Infinity, z1 = -Infinity, x1 = -Infinity, y1 = -Infinity;
    for (let i = 0; i < m.positions.length; i += 3) {
      x0 = Math.min(x0, m.positions[i]); x1 = Math.max(x1, m.positions[i]);
      y0 = Math.min(y0, m.positions[i + 1]); y1 = Math.max(y1, m.positions[i + 1]);
      z1 = Math.max(z1, m.positions[i + 2]);
    }
    return {
      mm: [x1 - x0, y1 - y0, z1].map((v) => +v.toFixed(2)),
      volMm3: m.volumeMm3, volErrPct: +(100 * (m.volumeMm3 - truthVol) / truthVol).toFixed(1),
      filled: c.filled
    };
  };

  const rows: any[] = [];
  for (const [name, cams] of Object.entries({
    "top+5@62": [[0, 85], ...ring(5, 62)],
    "top+4@62+4@30": [[0, 85], ...ring(4, 62), ...ring(4, 30, 45)],
    "top+8@30": [[0, 85], ...ring(8, 30)]
  })) {
    const fitted: any[] = [], truthed: any[] = [];
    let worstPoseMm = 0, worstAt18 = 0;
    for (const [az, el] of cams as number[][]) {
      const truePose = cameraPoseAt(az, el, 1.15 * T.pageW);
      const trueMap = makePlaneMap(TRUE, truePose);
      const frame = render(trueMap);
      const r = traceFrame(frame, TRUE, {});
      if (!r.ok) continue;
      const p = packMask(r.mask.mask, W, H, 1200);
      fitted.push({ mask: p.mask, mw: p.w, mh: p.h, scale: p.scale, map: r.map, bboxMm: r.bboxMm, tiltDeg: r.tiltDeg });
      truthed.push({ mask: p.mask, mw: p.w, mh: p.h, scale: p.scale, map: trueMap, bboxMm: r.bboxMm, tiltDeg: trueMap.tiltDeg });
      // How far apart are the fitted and true cameras, in the plane and 18mm up?
      for (const [X, Y] of [[-20, -15], [20, -15], [20, 15], [-20, 15]]) {
        const a0 = trueMap.toPixelAt(X, Y, 0).slice(), b0 = r.map.toPixelAt(X, Y, 0).slice();
        worstPoseMm = Math.max(worstPoseMm, Math.hypot(a0[0] - b0[0], a0[1] - b0[1]));
        const a1 = trueMap.toPixelAt(X, Y, HGT).slice(), b1 = r.map.toPixelAt(X, Y, HGT).slice();
        worstAt18 = Math.max(worstAt18, Math.hypot(a1[0] - b1[0], a1[1] - b1[1]));
      }
    }
    rows.push({
      set: name, views: fitted.length,
      poseErrPxAtZ0: +worstPoseMm.toFixed(2), poseErrPxAt18mm: +worstAt18.toFixed(2),
      fittedPose: measure(fitted, {}),
      truePose: measure(truthed, {}),
      fittedTolerate1: measure(fitted, { tolerateMisses: 1 }),
      fittedTolerate2: measure(fitted, { tolerateMisses: 2 })
    });
  }
  return { truthMm: [40, 30, HGT], truthVol, rows };
});
await browser.close();
console.log(JSON.stringify(out, null, 1));
if (errs.length) console.log("\n--- page errors ---\n" + [...new Set(errs)].slice(0, 10).join("\n"));
