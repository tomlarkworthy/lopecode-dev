// Boot the flat-trace notebook headlessly: force every cell, report the ones
// that error, run the self-tests, and drive a synthetic shot through the
// capture -> trace -> DXF path the UI uses.
import { chromium } from "playwright";
import { resolve } from "node:path";
import { writeFileSync } from "node:fs";

const NB = resolve("lopebooks/notebooks/tomlarkworthy_flat-trace.html");
const deep = process.argv.includes("--deep");
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1400, height: 1200 } });
const errs: string[] = [];
page.on("pageerror", (e) => errs.push("pageerror: " + e.message));
page.on("console", (m) => {
  const t = m.text();
  if (m.type() === "error" && !t.includes("Not allowed to load local resource")) errs.push("console: " + t.slice(0, 300));
});

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
await page.waitForTimeout(8000);

const out = await page.evaluate(async (deepTests: boolean) => {
  const rt = (window as any).__ojs_runtime;
  const vars = [...rt._variables];
  const mod = vars.find((v: any) => v._name === "matTarget")?._module;
  if (!mod) return { fatal: "flat-trace module never defined matTarget" };
  const names = vars.filter((v: any) => v._module === mod && v._name).map((v: any) => v._name);
  const val = async (n: string) => mod.value(n);

  // Force every cell in the module; report which ones throw.
  const broken: any[] = [];
  for (const n of names) {
    if (n === "traceSelfTest" || n === "matPrintCheck") continue;      // functions, exercised below
    try { await val(n); } catch (e: any) { broken.push({ cell: n, error: String(e && e.message ? e.message : e).slice(0, 250) }); }
  }

  const T: any = await val("matTarget");
  const cs: any = await val("calibSelfTest");

  // Drive the capture path with a synthetic shot: same maths the self-test
  // renders, but pushed through viewof shots so traceResult/tracePanel run for
  // real rather than being called directly.
  const calib: any = await val("calib");
  const makePlaneMap: any = await val("makePlaneMap");
  const makeMatSampler: any = await val("makeMatSampler");
  const setValue: any = await val("setValue");
  const shotsView: any = await val("viewof shots");
  const W = 1280, H = 960;
  const TRUE = { f: 1150, cx: W / 2 - 8, cy: H / 2 + 5, k1: -0.22, k2: 0.06, p1: 0, p2: 0 };
  const matGray = makeMatSampler();
  const ro = (12 * Math.PI) / 180, tilt = (4 * Math.PI) / 180, az = (35 * Math.PI) / 180;
  const comp = (A: any, B: any) => A.map((r: any) => B[0].map((_: any, j: number) => r.reduce((s: number, v: number, k: number) => s + v * B[k][j], 0)));
  const Rz = [[Math.cos(ro), -Math.sin(ro), 0], [Math.sin(ro), Math.cos(ro), 0], [0, 0, 1]];
  const ax = [Math.cos(az), Math.sin(az), 0];
  const c = Math.cos(tilt), s = Math.sin(tilt), C = 1 - c;
  const Rt = [[c + ax[0] * ax[0] * C, ax[0] * ax[1] * C, ax[1] * s], [ax[1] * ax[0] * C, c + ax[1] * ax[1] * C, -ax[0] * s], [-ax[1] * s, ax[0] * s, c]];
  const pose = [...calib.rodriguesInv(comp(Rz, Rt)), 0, 0, (1.15 * T.pageW * TRUE.f) / W];
  const map = makePlaneMap(TRUE, pose);
  const gray = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const p = map.toPlane(x + 0.5, y + 0.5);
    const inside = p && Math.abs(p[0]) < 30 && Math.abs(p[1]) < 18;
    gray[y * W + x] = inside ? 40 : (p ? matGray(p[0], p[1]) : 0x80);
  }
  // Store the true camera as the profile, so the UI path is exercised the way a
  // calibrated user would hit it; the uncalibrated path is covered by
  // probe-profile.ts, where it is expected to refuse.
  setValue(await val("viewof cameraProfile"), { ...TRUE, w: W, h: H, rms: 0, views: 40, coverage: 0.9 });
  setValue(shotsView, [{ gray, w: W, h: H, name: "synthetic" }]);
  await new Promise((r) => setTimeout(r, 1500));

  const tr: any = await val("traceResult");
  const panel: any = await val("tracePanel");
  const toDxf: any = await val("toDxf");
  const dxf = tr.ok ? toDxf(tr.outlines) : null;

  const deepOut: any = {};
  if (deepTests) {
    const pc: any = await val("matPrintCheck");
    deepOut.printCheck = await pc();
    const t: any = await val("traceSelfTest");
    const t0 = performance.now();
    deepOut.traceSelfTest = t();
    deepOut.traceMs = Math.round(performance.now() - t0);
  }

  const svg: any = (await val("matTargetSvg"))();
  return {
    cells: names.length, broken,
    mat: { marks: T.marks.length, pitch: T.pitchMm, gap: T.rowGapInDiscs, ids: T.idsAvailable, dropped: T.sitesTruncated },
    calibSelfTest: { pass: cs.pass, recovered: cs.recovered, fitRmsPx: cs.fitRmsPx, coverage: cs.coverage },
    captureTrace: tr.ok
      ? { ok: true, guessed: tr.guessed, marks: tr.marks, rmsPx: tr.rmsPx, matResidualPct: tr.matResidualPct, tiltDeg: tr.tiltDeg, sizeMm: tr.sizeMm, truthSizeMm: [60, 36], areaMm2: tr.areaMm2, truthAreaMm2: 60 * 36, pts: tr.outline.length }
      : { ok: false, why: tr.why, marks: tr.marks },
    panelIsNode: !!(panel && panel.nodeType),
    dxfBytes: dxf ? dxf.length : null,
    dxfHead: dxf ? dxf.slice(0, 90) : null,
    ...deepOut,
    svg
  };
}, deep);

await page.screenshot({ path: "tools/screenshots/flat-trace-boot.png", fullPage: false });
await browser.close();

const { svg, ...report } = out as any;
if (svg) writeFileSync(resolve("scratch/rmbt/scan-mat-297x210-d30.svg"), svg);
console.log(JSON.stringify(report, null, 1));
if (errs.length) console.log("\n--- page errors ---\n" + [...new Set(errs)].slice(0, 20).join("\n"));
