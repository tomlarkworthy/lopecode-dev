// Exercise the visual-hull path: the self-test, plus the reactive path from
// shots -> scanViews -> hullResult -> hullPanel with synthetic multi-view shots.
import { chromium } from "playwright";
import { resolve } from "node:path";

const NB = resolve("lopebooks/notebooks/tomlarkworthy_flat-trace.html");
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1200, height: 1000 } });
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
await page.waitForTimeout(6000);

const out = await page.evaluate(async () => {
  const rt = (window as any).__ojs_runtime;
  const vars = [...rt._variables];
  const mod = vars.find((v: any) => v._name === "matTarget")?._module;
  const val = (n: string) => mod.value(n);
  const report: any = {};

  // toPixelAt must agree with toPixel at z = 0, or every voxel is projected
  // through a different camera than the outline was.
  {
    const calib: any = await val("calib");
    const makePlaneMap: any = await val("makePlaneMap");
    const I = { f: 900, cx: 470, cy: 366, k1: -0.2, k2: 0.05, p1: 0.001, p2: -0.002 };
    const pose = [0.2, -0.1, 0.35, 12, -8, 420];
    const m = makePlaneMap(I, pose);
    let worst = 0;
    for (let X = -120; X <= 120; X += 17) for (let Y = -90; Y <= 90; Y += 13) {
      const a = m.toPixel(X, Y), b = m.toPixelAt(X, Y, 0);
      worst = Math.max(worst, Math.hypot(a[0] - b[0], a[1] - b[1]));
    }
    report.toPixelAtAgreesPx = +worst.toExponential(2);
    report.cameraMm = m.cameraMm.map((v: number) => +v.toFixed(2));
    report.azEl = [+m.azimuthDeg.toFixed(1), +m.elevationDeg.toFixed(1)];
  }

  const t0 = performance.now();
  report.hullSelfTest = (await val("hullSelfTest"))();
  report.hullSelfTestMs = Math.round(performance.now() - t0);

  // The reactive path: build shots the same way the self-test renders, push them
  // through viewof shots, turn the scan on, read hullResult and hullPanel.
  const calib: any = await val("calib");
  const makePlaneMap: any = await val("makePlaneMap");
  const makeMatSampler: any = await val("makeMatSampler");
  const setValue: any = await val("setValue");
  const T: any = await val("matTarget");
  const W = 1100, H = 825;
  const TRUE = { f: 0.9 * W, cx: W / 2 - 6, cy: H / 2 + 4, k1: -0.16, k2: 0.04, p1: 0, p2: 0 };
  const matGray = makeMatSampler();
  const cameraPoseAt: any = await val("cameraPoseAt");
  const HGT = 18;
  const inPlan = (x: number, y: number) => x >= -20 && x <= 20 && y >= -15 && y <= 15 && !(x > 0 && y > 0);
  const shots = [];
  for (const [az, el] of [[0, 85], [0, 62], [72, 62], [144, 62], [216, 62], [288, 62]]) {
    const map = makePlaneMap(TRUE, cameraPoseAt(az, el, 1.15 * T.pageW));
    const gray = new Uint8Array(W * H);
    for (let yy = 0; yy < H; yy++) for (let xx = 0; xx < W; xx++) {
      const p0 = map.toPlaneAt(xx + 0.5, yy + 0.5, 0);
      if (!p0) { gray[yy * W + xx] = 230; continue; }
      const p1 = map.toPlaneAt(xx + 0.5, yy + 0.5, HGT);
      let hit = false;
      if (p1) for (let s = 0; s <= 24 && !hit; s++) {
        const u = s / 24;
        if (inPlan(p0[0] + (p1[0] - p0[0]) * u, p0[1] + (p1[1] - p0[1]) * u)) hit = true;
      }
      gray[yy * W + xx] = hit ? 45 : matGray(p0[0], p0[1]);
    }
    shots.push({ gray, w: W, h: H, name: `az${az}` });
  }
  setValue(await val("viewof cameraProfile"), { ...TRUE, w: W, h: H, rms: 0, views: 40, coverage: 0.9 });
  setValue(await val("viewof shots"), shots);
  setValue(await val("viewof scanOn"), true);
  await new Promise((r) => setTimeout(r, 400));

  // hullResult is a generator; poll until it settles or gives up
  let hr: any = null;
  for (let i = 0; i < 120; i++) {
    hr = await val("hullResult");
    if (!hr.working) break;
    await new Promise((r) => setTimeout(r, 500));
  }
  const sv: any = await val("scanViews");
  report.scanViews = { ok: sv.ok, why: sv.why, usable: sv.usable?.length, gap: sv.azimuthGapDeg, az: sv.usable?.map((v: any) => v.azimuthDeg), el: sv.usable?.map((v: any) => v.elevationDeg) };
  report.hullResult = hr.ok
    ? { ok: true, sizeMm: hr.sizeMm, volumeMm3: hr.volumeMm3, tris: hr.mesh.triangles, verts: hr.mesh.vertices, carveMs: hr.carve.ms, voxels: hr.carve.voxels, filled: hr.carve.filled, offFrame: hr.carve.offFrame, hitCeiling: hr.hitCeiling, gap: hr.azimuthGapDeg }
    : { ok: false, why: hr.why };

  if (hr.ok) {
    const toStl: any = await val("toStl");
    const buf = toStl(hr.mesh);
    const dv = new DataView(buf);
    report.stl = { bytes: buf.byteLength, triangles: dv.getUint32(80, true), expected: 84 + hr.mesh.triangles * 50 };
  }
  return report;
});

// The panel needs three.js from the network; look at it separately so a blocked
// CDN does not read as a broken hull.
await page.waitForTimeout(4000);
const panel = await page.evaluate(async () => {
  const rt = (window as any).__ojs_runtime;
  const mod = [...rt._variables].find((v: any) => v._name === "matTarget")?._module;
  const el = await mod.value("hullPanel");
  return { tag: el && el.tagName, text: el ? el.textContent.replace(/\s+/g, " ").slice(0, 400) : null, canvases: el ? el.querySelectorAll("canvas").length : 0 };
});
await page.screenshot({ path: "tools/screenshots/flat-trace-hull.png", fullPage: false });
await browser.close();
console.log(JSON.stringify({ ...out, panel }, null, 1));
if (errs.length) console.log("\n--- page errors ---\n" + [...new Set(errs)].slice(0, 20).join("\n"));
