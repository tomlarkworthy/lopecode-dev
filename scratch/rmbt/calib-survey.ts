// Does the calibration panel's shot survey report the angles it was actually
// shown? Renders synthetic mat views at known tilt and azimuth, pushes them
// through viewof shots, and reads the table back out of the DOM. A survey that
// cannot recover the pose it was handed is worse than none — it would bless a
// degenerate set.
import { chromium } from "playwright";
import { resolve } from "node:path";

const NB = resolve("lopebooks/notebooks/tomlarkworthy_flat-trace.html");
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1400, height: 1200 } });
const errs: string[] = [];
page.on("pageerror", (e) => errs.push("pageerror: " + e.message));
page.on("console", (m) => { if (m.type() === "error" && !m.text().includes("Not allowed to load local resource")) errs.push("console: " + m.text().slice(0, 200)); });

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

const out = await page.evaluate(async () => {
  const rt = (window as any).__ojs_runtime;
  const vars = [...rt._variables];
  const mod = vars.find((v: any) => v._name === "matTarget")?._module;
  const val = async (n: string) => mod.value(n);
  const T: any = await val("matTarget");
  const calib: any = await val("calib");
  const makePlaneMap: any = await val("makePlaneMap");
  const matGray: any = (await val("makeMatSampler"))();
  const setValue: any = await val("setValue");

  const W = 1280, H = 960;
  const TRUE = { f: 1150, cx: W / 2 - 8, cy: H / 2 + 5, k1: -0.22, k2: 0.06, p1: 0, p2: 0 };
  const comp = (A: any, B: any) => A.map((r: any) => B[0].map((_: any, j: number) => r.reduce((s: number, v: number, k: number) => s + v * B[k][j], 0)));

  // az here is the direction the plane tips towards; the camera ends up on the
  // opposite side, which is exactly what the survey's "from" column reports.
  const shoot = (name: string, tiltDeg: number, azDeg: number, dist = 1.15) => {
    const ro = (12 * Math.PI) / 180, tilt = (tiltDeg * Math.PI) / 180, az = (azDeg * Math.PI) / 180;
    const Rz = [[Math.cos(ro), -Math.sin(ro), 0], [Math.sin(ro), Math.cos(ro), 0], [0, 0, 1]];
    const ax = [Math.cos(az), Math.sin(az), 0];
    const c = Math.cos(tilt), s = Math.sin(tilt), C = 1 - c;
    const Rt = [[c + ax[0] * ax[0] * C, ax[0] * ax[1] * C, ax[1] * s], [ax[1] * ax[0] * C, c + ax[1] * ax[1] * C, -ax[0] * s], [-ax[1] * s, ax[0] * s, c]];
    const pose = [...calib.rodriguesInv(comp(Rz, Rt)), 0, 0, (dist * T.pageW * TRUE.f) / W];
    const map = makePlaneMap(TRUE, pose);
    const gray = new Uint8Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const p = map.toPlane(x + 0.5, y + 0.5);
      gray[y * W + x] = p ? matGray(p[0], p[1]) : 0x80;
    }
    return { gray, w: W, h: H, name };
  };

  const plan = [
    ["over-1", 3, 0, 1.15],
    ["over-2", 5, 0, 1.5],
    ["az0", 30, 0, 1.15],
    ["az90", 30, 90, 1.15],
    ["az180", 32, 180, 1.15],
    ["az270", 32, 270, 1.15],
  ] as [string, number, number, number][];

  setValue(await val("viewof shots"), plan.map(([n, t, a, d]) => shoot(n, t, a, d)));
  await new Promise((r) => setTimeout(r, 2500));

  const panel: any = await val("calibratePanel");
  const rows = [...panel.querySelectorAll("tr")].map((tr: any) =>
    [...tr.querySelectorAll("td,th")].map((c: any) => c.textContent.trim()));
  const checks = panel.querySelectorAll("table + div")[0]?.textContent.replace(/\s+/g, " ").trim();
  const warn = [...panel.querySelectorAll("div")].map((d: any) => d.textContent)
    .find((t: string) => t.includes("same view") || t.includes("never leave"));

  // and then fit, which is the thing the survey is a proxy for
  const btn = [...panel.querySelectorAll("button")].find((b: any) => /Calibrate/.test(b.textContent));
  btn.click();
  await new Promise((r) => setTimeout(r, 3000));
  const fit = panel.textContent.replace(/\s+/g, " ").trim().slice(-400);

  const svg: any = await val("calibPosesSvg");
  return { plan: plan.map((p) => p[0] + " t=" + p[1] + " az=" + p[2]), rows, checks, warn: warn ?? null, fit,
           posesSvgCams: svg.querySelectorAll("svg rect").length, posesSvgText: svg.querySelector("div")?.textContent.slice(0, 60) };
});

console.log(JSON.stringify({ ...out, errs: errs.slice(0, 6) }, null, 1));
await browser.close();
