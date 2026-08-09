// The consensus filter inside calibrate uses a homography to decide which mark
// reads are misplaced. A homography cannot represent lens distortion, so on a
// wide lens the filter's residual IS the distortion — and the marks it throws
// away are the outermost ones, the only ones that constrain k1/k2. Sweep the
// tolerance against synthetic views with a known camera and see where the
// recovered lens stops matching the truth.
import { chromium } from "playwright";
import { resolve } from "node:path";

const NB = resolve("lopebooks/notebooks/tomlarkworthy_flat-trace.html");
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1400, height: 1200 } });
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
  const mod = [...rt._variables].find((v: any) => v._name === "matTarget")?._module;
  const val = async (n: string) => mod.value(n);
  const T: any = await val("matTarget");
  const calib: any = await val("calib");
  const calibrate: any = await val("calibrate");
  const makePlaneMap: any = await val("makePlaneMap");
  const matGray: any = (await val("makeMatSampler"))();
  const afm: any = await val("analyzeFrameMan");
  const detectOpts: any = await val("detectOpts");

  const W = 1280, H = 960;
  const TRUE = { f: 1150, cx: W / 2 - 8, cy: H / 2 + 5, k1: -0.22, k2: 0.06, p1: 0, p2: 0 };
  const comp = (A: any, B: any) => A.map((r: any) => B[0].map((_: any, j: number) => r.reduce((s: number, v: number, k: number) => s + v * B[k][j], 0)));
  const shoot = (name: string, tiltDeg: number, azDeg: number, dist: number) => {
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
    const res = afm({ gray, w: W, h: H }, detectOpts);
    const pairs = res.fused.filter((f: any) => T.byId.has(f.id)).map((f: any) => {
      const m = T.byId.get(f.id);
      return { X: m.xMm, Y: m.yMm, u: f.xc, v: f.yc };
    });
    return { name, pairs };
  };

  // dist 0.72 puts the mat right into the frame corners, which is what the
  // instructions ask for and where the distortion actually shows.
  const plan: [string, number, number, number][] = [
    ["over-1", 3, 0, 0.72], ["over-2", 5, 0, 0.9],
    ["az0", 30, 0, 0.72], ["az90", 30, 90, 0.72], ["az180", 32, 180, 0.72], ["az270", 32, 270, 0.72],
  ];
  const views = plan.map(([n, t, a, d]) => shoot(n, t, a, d));
  const total = views.reduce((s, v) => s + v.pairs.length, 0);

  const runs: any[] = [];
  for (const tol of [3.56, 8, 16, 24, 32, 48, 1e9]) {
    const r = calibrate(views.map((v) => ({ name: v.name, pairs: v.pairs.map((p: any) => ({ ...p })) })), W, H, { consensusTolPx: tol });
    runs.push(r.ok
      ? { tol, ok: true, rejected: r.rejected ?? 0, rms: r.rms, coverage: +r.coverage.toFixed(2),
          f: +r.intrinsics.f.toFixed(1), cx: +r.intrinsics.cx.toFixed(1), cy: +r.intrinsics.cy.toFixed(1),
          k1: +r.intrinsics.k1.toFixed(4), k2: +r.intrinsics.k2.toFixed(4),
          fErrPct: +(100 * Math.abs(r.intrinsics.f - TRUE.f) / TRUE.f).toFixed(2) }
      : { tol, ok: false, why: r.why?.slice(0, 120), rejected: r.rejected ?? 0 });
  }
  // Does a loose tolerance still catch a genuinely wrong id? Move two reads per
  // view to a neighbouring mark's mm position — the failure the filter exists
  // for. One pitch is 43.5mm, which at this framing is well over 100px.
  const poisoned = views.map((v) => ({
    name: v.name,
    pairs: v.pairs.map((p: any, i: number) => (i % 11 === 0 ? { ...p, X: p.X + T.pitchMm, Y: p.Y + T.pitchMm } : { ...p })),
  }));
  const poisonRuns: any[] = [];
  for (const tol of [3.56, 32]) {
    const r = calibrate(poisoned.map((v) => ({ name: v.name, pairs: v.pairs.map((p: any) => ({ ...p })) })), W, H, { consensusTolPx: tol });
    poisonRuns.push({ tol, ok: r.ok, rejected: r.rejected ?? 0, rms: r.rms,
      f: r.ok ? +r.intrinsics.f.toFixed(1) : null, why: r.ok ? null : r.why?.slice(0, 100) });
  }
  const poisonCount = poisoned.reduce((s, v) => s + v.pairs.filter((_: any, i: number) => i % 11 === 0).length, 0);
  return { truth: TRUE, marksTotal: total, perView: views.map((v) => v.pairs.length), runs, poisonCount, poisonRuns };
});

console.log(JSON.stringify(out, null, 1));
await browser.close();
