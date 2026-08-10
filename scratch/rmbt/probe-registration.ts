// What statistic separates "the mat is misregistered so the outline is junk"
// from "the marks are noisy under tilt but the mat still lines up"?
import { chromium } from "playwright";
import { resolve } from "node:path";
const NB = resolve("lopebooks/notebooks/tomlarkworthy_flat-trace.html");
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
await page.addInitScript(() => {
  const orig = (window as any).Runtime; let cap = false;
  Object.defineProperty(window, "Runtime", { get() { return orig; },
    set(N: any) { const W = function (this: any, ...a: any[]) { const i = new N(...a); if (!cap) { (window as any).__ojs_runtime = i; cap = true; } return i; }; W.prototype = N.prototype; Object.assign(W, N); return W; } });
});
await page.goto(`file://${NB}`, { waitUntil: "networkidle", timeout: 180000 });
await page.waitForFunction(() => !!(window as any).__ojs_runtime, { timeout: 180000 });
await page.waitForTimeout(8000);

const out = await page.evaluate(async () => {
  const rt = (window as any).__ojs_runtime;
  const mod = [...rt._variables].find((v: any) => v._name === "matTarget")?._module;
  const val = (n: string) => mod.value(n);
  const T: any = await val("matTarget");
  const calib: any = await val("calib");
  const makePlaneMap: any = await val("makePlaneMap");
  const makeMatSampler: any = await val("makeMatSampler");
  const matDifference: any = await val("matDifference");
  const objectMask: any = await val("objectMask");
  const autoThreshold: any = await val("autoThreshold");
  const analyzeFrameMan: any = await val("analyzeFrameMan");
  const traceContour: any = await val("traceContour");
  const contourToMm: any = await val("contourToMm");
  const simplifyMm: any = await val("simplifyMm");
  const polygonAreaMm2: any = await val("polygonAreaMm2");

  const W = 1280, H = 960;
  const TRUE = { f: 1150, cx: W / 2 - 8, cy: H / 2 + 5, k1: -0.22, k2: 0.06, p1: 0, p2: 0 };
  const matGray = makeMatSampler();
  const comp = (A: any, B: any) => A.map((r: any) => B[0].map((_: any, j: number) => r.reduce((s: number, v: number, k: number) => s + v * B[k][j], 0)));
  const poseOf = (tiltDeg: number) => {
    const t = tiltDeg * Math.PI / 180, a = 35 * Math.PI / 180, ro = 12 * Math.PI / 180;
    const Rz = [[Math.cos(ro), -Math.sin(ro), 0], [Math.sin(ro), Math.cos(ro), 0], [0, 0, 1]];
    const ax = [Math.cos(a), Math.sin(a), 0]; const c = Math.cos(t), s = Math.sin(t), C = 1 - c;
    const Rt = [[c + ax[0] * ax[0] * C, ax[0] * ax[1] * C, ax[1] * s], [ax[1] * ax[0] * C, c + ax[1] * ax[1] * C, -ax[0] * s], [-ax[1] * s, ax[0] * s, c]];
    return [...calib.rodriguesInv(comp(Rz, Rt)), 0, 0, (1.15 * T.pageW * TRUE.f) / W];
  };
  const render = (tiltDeg: number, thick: number) => {
    const pose = poseOf(tiltDeg);
    const map = makePlaneMap(TRUE, pose);
    const gray = new Uint8Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const p0 = map.toPlane(x + 0.5, y + 0.5);
      const pt = thick ? map.toPlaneAt(x + 0.5, y + 0.5, thick) : null;
      const hit = (p0 && Math.abs(p0[0]) < 30 && Math.abs(p0[1]) < 18) || (pt && Math.abs(pt[0]) < 30 && Math.abs(pt[1]) < 18);
      gray[y * W + x] = hit ? 40 : (p0 ? matGray(p0[0], p0[1]) : 0x80);
    }
    return { gray, w: W, h: H };
  };

  const measure = (frame: any, I: any) => {
    const res = analyzeFrameMan(frame, {});
    const pairs = res.fused.filter((f: any) => T.byId.has(f.id)).map((f: any) => {
      const m = T.byId.get(f.id); return { X: m.xMm, Y: m.yMm, u: f.xc, v: f.yc };
    });
    const pose = calib.poseFor(I, pairs);
    const resid = pairs.map((p: any) => { const [u, v] = calib.project(I, pose, p.X, p.Y); return Math.hypot(u - p.u, v - p.v); });
    const rms = Math.sqrt(resid.reduce((s: number, v: number) => s + v * v, 0) / resid.length);
    const map = makePlaneMap(I, pose);
    const half = [T.pageW / 2, T.pageH / 2];
    const field = matDifference(frame, map, matGray, { roiMm: [-half[0], -half[1], half[0], half[1]] });
    const thr = autoThreshold(field);
    let roi = 0, hot = 0;
    for (let i = 0; i < field.diff.length; i++) if (field.inRoi[i]) { roi++; if (Math.abs(field.diff[i]) > thr) hot++; }
    const mk = objectMask(field, {});
    // residual OUTSIDE the object: how well the mat itself is predicted
    const outs: number[] = [];
    for (let i = 0; i < field.diff.length; i++) if (field.inRoi[i] && !mk.mask[i]) outs.push(Math.abs(field.diff[i]));
    outs.sort((a, b) => a - b);
    const q = (f: number) => outs[Math.min(outs.length - 1, Math.round(f * (outs.length - 1)))];
    const rings = traceContour(field, mk, { threshold: mk.threshold });
    const outline = rings.length ? simplifyMm(contourToMm(rings[0], map, 0), 0.05) : [];
    return {
      rmsPx: +rms.toFixed(2), marks: pairs.length, thr,
      rawHotPct: +(100 * hot / roi).toFixed(2),
      maskPctOfRoi: +(100 * mk.areaPx / roi).toFixed(2),
      outResidMed: +q(0.5).toFixed(1), outResidP95: +q(0.95).toFixed(1), outResidP99: +q(0.99).toFixed(1),
      rings: rings.length,
      areaMm2: outline.length ? +polygonAreaMm2(outline).toFixed(0) : null
    };
  };

  const guess = { f: 1.1 * W, cx: W / 2, cy: H / 2, k1: 0, k2: 0, p1: 0, p2: 0 };
  const noK = { ...TRUE, k1: 0, k2: 0 };
  return {
    truthAreaMm2: 2160,
    "true@4":    measure(render(4, 0), TRUE),
    "true@10":   measure(render(10, 3), TRUE),
    "true@25":   measure(render(25, 3), TRUE),
    "guess@4":   measure(render(4, 0), guess),
    "noK@4":     measure(render(4, 0), noK),
    "noK@25":    measure(render(25, 3), noK)
  };
});
await browser.close();
console.log(JSON.stringify(out, null, 1));
