// How oblique can a silhouette view be and still REGISTER? The hull needs views
// spread around the part, but the pose comes from marks on a foreshortened mat
// and the mat-cancellation gate refuses a frame the model no longer lands on.
// Sweep elevation (and frame size) and report where views stop being usable.
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
  const matGray = makeMatSampler();
  const HGT = 18;
  const inPlan = (x: number, y: number) => x >= -20 && x <= 20 && y >= -15 && y <= 15 && !(x > 0 && y > 0);

  const rows: any[] = [];
  for (const W of [900, 1100, 1400]) {
    const H = Math.round(W * 0.75);
    const TRUE = { f: 0.9 * W, cx: W / 2 - 6, cy: H / 2 + 4, k1: -0.16, k2: 0.04, p1: 0, p2: 0 };
    for (const el of [85, 75, 65, 55, 45, 35]) {
      const pose = cameraPoseAt(0, el, 1.15 * T.pageW);
      const map = makePlaneMap(TRUE, pose);
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
      const t0 = performance.now();
      const r = traceFrame({ gray, w: W, h: H }, TRUE, {});
      rows.push({
        W, el, markPx: Math.round((T.diameterMm * TRUE.f) / (1.15 * T.pageW)),
        camZ: +map.cameraMm[2].toFixed(0), tilt: +map.tiltDeg.toFixed(1),
        ok: r.ok, marks: r.marks ?? 0, rmsPx: r.rmsPx, resid: r.matResidualPct,
        why: r.ok ? null : String(r.why).split("—")[0].trim(),
        ms: Math.round(performance.now() - t0)
      });
    }
  }
  return rows;
});
await browser.close();
console.log(out.map((r: any) => JSON.stringify(r)).join("\n"));
if (errs.length) console.log("\n--- page errors ---\n" + [...new Set(errs)].slice(0, 10).join("\n"));
