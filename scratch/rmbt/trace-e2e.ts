// End-to-end flat trace on synthetic scenes with KNOWN truth.
//
// The whole chain runs: render a photo of a part lying on the mat through a
// camera with real lens distortion -> the REAL cascade finds the marks -> pose
// -> predicted mat subtracted -> sub-pixel contour -> millimetres -> DXF. Then
// the recovered outline is compared with the polygon that was rendered.
//
// The answer is in millimetres of outline error, because that is the number the
// job was specified in. A reprojection residual would not tell you whether the
// part fits.
import { chromium } from "playwright";
import { resolve } from "node:path";
import { readFileSync, writeFileSync } from "node:fs";

const NB = resolve("lopebooks/notebooks/tomlarkworthy_coded-landmark-tracking.html");
const BUNDLE = readFileSync(resolve("scratch/rmbt/trace-bundle.js"), "utf8");

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
page.on("pageerror", (e) => console.error("PAGE ERROR:", e.message));
page.on("console", (m) => { if (m.type() === "error") console.error("CONSOLE:", m.text()); });
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
await page.goto(`file://${NB}`, { waitUntil: "networkidle", timeout: 120000 });
await page.waitForFunction(() => !!(window as any).__ojs_runtime, { timeout: 120000 });
await page.waitForTimeout(9000);
await page.addScriptTag({ content: BUNDLE });

const result = await page.evaluate(async () => {
  const T4 = (window as any).TRACE;
  const rt = (window as any).__ojs_runtime;
  const vars = [...rt._variables];
  const val = async (n: string) => { const v = vars.find((z: any) => z._name === n); return v ? await v._module.value(n) : null; };
  const manLayout: any = await val("manLayout");
  const manColor: any = await val("manColor");
  const analyzeFrameMan: any = await val("analyzeFrameMan");

  const { calib, makeMatTarget, makeMatSampler, makePlaneMap, matDifference, objectMask, autoThreshold, traceContour, contourToMm, simplifyMm, toDxf, toSvgMm, polygonAreaMm2 } = T4;

  const mat = makeMatTarget(manLayout, { diameterMm: 32, rollDeg: 0 });
  const matGray = makeMatSampler(mat, manColor);

  // ---- the part: a bracket outline in millimetres, on the mat, centred
  const partPoly: [number, number][] = [];
  {
    const pts: [number, number][] = [[-35, -22], [35, -22], [35, 8], [12, 8], [12, 22], [-12, 22], [-12, 8], [-35, 8]];
    // round the corners a little so the truth is not all straight lines
    for (let i = 0; i < pts.length; i++) {
      const a = pts[(i - 1 + pts.length) % pts.length], b = pts[i], c = pts[(i + 1) % pts.length];
      const r = 3;
      const n1 = Math.hypot(b[0] - a[0], b[1] - a[1]), n2 = Math.hypot(c[0] - b[0], c[1] - b[1]);
      const p1: [number, number] = [b[0] - (r * (b[0] - a[0])) / n1, b[1] - (r * (b[1] - a[1])) / n1];
      const p2: [number, number] = [b[0] + (r * (c[0] - b[0])) / n2, b[1] + (r * (c[1] - b[1])) / n2];
      for (let t = 0; t <= 1.0001; t += 0.25) {
        const u = 1 - t;
        partPoly.push([u * u * p1[0] + 2 * u * t * b[0] + t * t * p2[0], u * u * p1[1] + 2 * u * t * b[1] + t * t * p2[1]]);
      }
    }
  }
  const inPoly = (x: number, y: number, poly: [number, number][]) => {
    let c = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i], [xj, yj] = poly[j];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
    }
    return c;
  };
  const distToPoly = (x: number, y: number, poly: [number, number][]) => {
    let best = Infinity;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [x1, y1] = poly[j], [x2, y2] = poly[i];
      const dx = x2 - x1, dy = y2 - y1;
      const L2 = dx * dx + dy * dy || 1;
      let t = ((x - x1) * dx + (y - y1) * dy) / L2;
      t = Math.max(0, Math.min(1, t));
      best = Math.min(best, Math.hypot(x - (x1 + t * dx), y - (y1 + t * dy)));
    }
    return best;
  };

  const makePose = (tiltDeg: number, azDeg: number, distMm: number, rollDeg: number) => {
    const t = (tiltDeg * Math.PI) / 180, a = (azDeg * Math.PI) / 180, ro = (rollDeg * Math.PI) / 180;
    const comp = (A: number[][], B: number[][]) => A.map((r) => B[0].map((_, j) => r.reduce((s, v, k) => s + v * B[k][j], 0)));
    const Rz = [[Math.cos(ro), -Math.sin(ro), 0], [Math.sin(ro), Math.cos(ro), 0], [0, 0, 1]];
    const ax = [Math.cos(a), Math.sin(a), 0];
    const c = Math.cos(t), s = Math.sin(t), C = 1 - c;
    const Rt = [[c + ax[0] * ax[0] * C, ax[0] * ax[1] * C, ax[1] * s], [ax[1] * ax[0] * C, c + ax[1] * ax[1] * C, -ax[0] * s], [-ax[1] * s, ax[0] * s, c]];
    return [...calib.rodriguesInv(comp(Rz, Rt)), 0, 0, distMm];
  };

  // ---- render one photo: back-project every pixel, paint mat or part
  const render = (I: any, pose: number[], W: number, H: number, thickMm: number, partGray: number) => {
    const map = makePlaneMap(calib, I, pose);
    const gray = new Uint8Array(W * H);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = y * W + x;
        let v = 0x80;
        const p0 = map.toPlane(x + 0.5, y + 0.5);
        // a part with thickness is a vertical prism: its silhouette is the union
        // of the footprint and the top face, which is what a ray sees
        const pt = thickMm ? map.toPlaneAt(x + 0.5, y + 0.5, thickMm) : null;
        const hit = (p0 && inPoly(p0[0], p0[1], partPoly)) || (pt && inPoly(pt[0], pt[1], partPoly));
        if (hit) v = partGray;
        else if (p0) v = matGray(p0[0], p0[1]);
        gray[i] = v;
      }
    }
    return { gray, w: W, h: H };
  };

  const W = 1280, H = 960;
  const out: any[] = [];
  let sampleDxf: string | null = null, sampleSvg: string | null = null;

  const CASES = [
    { name: "frontal, flat part", tilt: 3, thick: 0, part: 40, calErr: 0 },
    { name: "frontal, 3mm thick", tilt: 3, thick: 3, part: 40, calErr: 0 },
    { name: "10deg tilt, 3mm", tilt: 10, thick: 3, part: 40, calErr: 0 },
    { name: "25deg tilt, 3mm", tilt: 25, thick: 3, part: 40, calErr: 0 },
    { name: "25deg, thickness corrected", tilt: 25, thick: 3, part: 40, calErr: 0, useThick: true },
    { name: "frontal, low contrast part", tilt: 3, thick: 0, part: 105, calErr: 0 },
    { name: "frontal, f wrong by 3%", tilt: 3, thick: 0, part: 40, calErr: 0.03 },
    { name: "frontal, k1 wrong by 0.05", tilt: 3, thick: 0, part: 40, calErr: 0, k1Err: 0.05 }
  ];

  for (const C of CASES) {
    const TRUEI = { f: 1150, cx: W / 2 - 8, cy: H / 2 + 5, k1: -0.22, k2: 0.06, p1: 0, p2: 0 };
    // distance so the mat roughly fills the frame
    const pose = makePose(C.tilt, 35, (1.15 * mat.pageW * TRUEI.f) / W, 12);
    const frame = render(TRUEI, pose, W, H, C.thick, C.part);

    // ---- the pipeline: real cascade, then pose against the calibrated lens
    const res = analyzeFrameMan(frame, {});
    const onTarget = res.fused.filter((f: any) => mat.byId.has(f.id));
    const USEI = { ...TRUEI, f: TRUEI.f * (1 + (C.calErr ?? 0)), k1: TRUEI.k1 + ((C as any).k1Err ?? 0) };
    const pairs = onTarget.map((f: any) => { const m = mat.byId.get(f.id); return { X: m.xMm, Y: m.yMm, u: f.xc, v: f.yc }; });
    if (pairs.length < 5) { out.push({ name: C.name, marks: pairs.length, error: "too few marks" }); continue; }
    const und = pairs.map((p: any) => { const [xn, yn] = calib.unproject(USEI, p.u, p.v); return { ...p, u: xn * USEI.f + USEI.cx, v: yn * USEI.f + USEI.cy }; });
    const Hh = calib.fitH(und);
    const P0 = calib.poseFromH({ ...USEI, k1: 0, k2: 0, p1: 0, p2: 0 }, Hh);
    const P = calib.refinePose(USEI, P0, pairs);
    const map = makePlaneMap(calib, USEI, P);

    const field = matDifference(frame, map, matGray, { roiMm: [-mat.pageW / 2, -mat.pageH / 2, mat.pageW / 2, mat.pageH / 2] });
    const thr = autoThreshold(field);
    const mk = objectMask(field, { threshold: thr, minAreaPx: 800 });
    if (!mk.areaPx) { out.push({ name: C.name, marks: pairs.length, error: "no object found" }); continue; }
    const rings = traceContour(field, mk, { threshold: thr });
    if (!rings.length) { out.push({ name: C.name, marks: pairs.length, error: "no contour" }); continue; }
    // diagnostics: where is the MASK, in plane millimetres?
    let mnx = 1e9, mny = 1e9, mxx = -1e9, mxy = -1e9;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (!mk.mask[y * W + x]) continue;
      const p = map.toPlane(x + 0.5, y + 0.5);
      if (!p) continue;
      mnx = Math.min(mnx, p[0]); mxx = Math.max(mxx, p[0]);
      mny = Math.min(mny, p[1]); mxy = Math.max(mxy, p[1]);
    }
    const ringClosed = Math.hypot(rings[0][0][0] - rings[0][rings[0].length - 1][0], rings[0][0][1] - rings[0][rings[0].length - 1][1]) < 1.5;
    const mm = simplifyMm(contourToMm(rings[0], map, (C as any).useThick ? C.thick : 0), 0.05);

    const errs = mm.map(([x, y]: [number, number]) => distToPoly(x, y, partPoly)).sort((a: number, b: number) => a - b);
    const q = (f: number) => errs[Math.min(errs.length - 1, Math.round(f * (errs.length - 1)))];
    const areaTrue = polygonAreaMm2(partPoly), areaGot = polygonAreaMm2(mm);
    out.push({
      name: C.name, marks: pairs.length, pts: mm.length,
      medMm: +q(0.5).toFixed(3), p95Mm: +q(0.95).toFixed(3), maxMm: +q(1).toFixed(3),
      areaErrPct: +(((areaGot - areaTrue) / areaTrue) * 100).toFixed(2),
      thr, tiltFit: +map.tiltDeg.toFixed(1),
      maskBox: `${mnx.toFixed(0)}..${mxx.toFixed(0)} x ${mny.toFixed(0)}..${mxy.toFixed(0)}`,
      nRings: rings.length, ring0: rings[0].length, closed: ringClosed, raw: mm.length
    });
    if (!sampleDxf) { sampleDxf = toDxf([mm]); sampleSvg = toSvgMm([mm]); }
  }
  return { out, sampleDxf, sampleSvg, matMarks: mat.marks.length, truthArea: polygonAreaMm2(partPoly) };
});

await browser.close();

console.log(`mat: ${result.matMarks} marks; part outline truth area ${result.truthArea.toFixed(1)} mm2\n`);
console.log("case                          marks  pts |  med mm  p95 mm  max mm | area err | thr | tilt");
console.log("-".repeat(88));
for (const r of result.out as any[]) {
  if (r.error) { console.log(`${r.name.padEnd(30)} ${String(r.marks).padStart(4)}      ERROR: ${r.error}`); continue; }
  console.log(
    `${r.name.padEnd(30)} ${String(r.marks).padStart(4)} ${String(r.pts).padStart(4)} | ` +
    `${r.medMm.toFixed(3).padStart(7)} ${r.p95Mm.toFixed(3).padStart(7)} ${r.maxMm.toFixed(3).padStart(7)} | ` +
    `${(r.areaErrPct + "%").padStart(8)} | ${String(r.thr).padStart(3)} | rings ${String(r.nRings).padStart(3)} ring0 ${String(r.ring0).padStart(5)} closed=${r.closed ? "Y" : "N"} | mask ${r.maskBox}`
  );
}
if (result.sampleDxf) {
  writeFileSync(resolve("scratch/rmbt/trace-sample.dxf"), result.sampleDxf);
  writeFileSync(resolve("scratch/rmbt/trace-sample.svg"), result.sampleSvg!);
  console.log("\nwrote scratch/rmbt/trace-sample.dxf and .svg");
}
