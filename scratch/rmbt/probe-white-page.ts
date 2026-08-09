// Does the detector need the mid-gray page flood, or does a white page work?
//
// The mark already ends in a dark framing half-cell, so on white paper the rim
// edge is 25->255 instead of 25->128: same polarity, larger magnitude. If the
// gray is not load-bearing, a white render should read the same marks.
//
// The gray render is the control -- no external truth needed. Same scene, same
// pose, same seed, only the page level differs; if the ids and centres agree,
// the algorithm does not care.
import { chromium } from "playwright";
import { resolve } from "node:path";

const IN = resolve("lopebooks/notebooks/tomlarkworthy_coded-landmark-tracking.html");
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errs: string[] = [];
page.on("pageerror", (x) => errs.push(x.message.slice(0, 160)));
await page.addInitScript(() => {
  const orig = (window as any).Runtime; let cap = false;
  Object.defineProperty(window, "Runtime", { get() { return orig; }, set(N: any) {
    const W = function (this: any, ...a: any[]) { const i = new N(...a); if (!cap) { (window as any).__ojs_runtime = i; cap = true; } return i; };
    W.prototype = N.prototype; Object.assign(W, N); return W; } });
});
await page.goto(`file://${IN}#view=S100(@tomlarkworthy/coded-landmark-tracking)`, { waitUntil: "networkidle", timeout: 300000 });
await page.waitForFunction(() => !!(window as any).__ojs_runtime, { timeout: 300000 });
await page.waitForTimeout(18000);

const out = await page.evaluate(async () => {
  const rt = (window as any).__ojs_runtime;
  const mod = rt.mains.get("@tomlarkworthy/coded-landmark-tracking");
  const val = async (n: string) => {
    const v = [...rt._variables].find((z: any) => z._module === mod && z._name === n);
    return v ? await v._promise : null; };
  const [render, analyze, opts, T, fitPose] = await Promise.all(
    ["renderHexScene", "analyzeFrameMan", "hexRigOpts", "hexTarget", "fitHexPose"].map(val));

  // Rebuild the renderer with the page level as a parameter. Same source, one
  // literal changed, so nothing else about the render can drift between arms.
  const src = render.toString().replace("val = 128;", "val = (opts.pageGray ?? 128);");
  if (src === render.toString()) throw new Error("page literal not found in renderHexScene");
  const manColor: any = await val("manColor");
  const hexTarget: any = await val("hexTarget");
  const render2 = eval(`(${src})`);

  const POSES = [
    { yawDeg: 0, tiltDeg: 0 }, { yawDeg: 20, tiltDeg: 10 }, { yawDeg: 35, tiltDeg: 0 },
    { yawDeg: 0, tiltDeg: 30 }, { yawDeg: 45, tiltDeg: 20 }, { yawDeg: 25, tiltDeg: 35, rollDeg: 15 },
    { yawDeg: 50, tiltDeg: 25 }, { yawDeg: 15, tiltDeg: 15, Zmm: 1600 }, { yawDeg: 0, tiltDeg: 0, Zmm: 1900 }
  ];
  const rows: any[] = [];
  for (const p of POSES) {
    const base = { ...p, target: hexTarget, seed: 7, noise: 3, blur: 1.0 };
    const arms: any = {};
    for (const [tag, pg] of [["gray128", 128], ["white255", 255], ["white240", 240]] as any) {
      const sc = render2({ ...base, pageGray: pg });
      const r = analyze({ gray: sc.gray, w: sc.w, h: sc.h }, { ...opts, bothAxes: true });
      const ids = (r.fused ?? []).map((f: any) => f.id).sort((a: number, b: number) => a - b);
      const byId = new Map((r.fused ?? []).map((f: any) => [f.id, f]));
      // The renderer hands back exact truth, so each arm is scored against the
      // scene rather than against the other arm.
      const truth = new Map(sc.truth.map((t: any) => [t.id, t]));
      const res = ids.map((i: number) => {
        const t: any = truth.get(i), f: any = byId.get(i);
        return t ? Math.hypot(f.xc - t.x, f.yc - t.y) : null;
      }).filter((x: any) => x != null).sort((a: number, b: number) => a - b);
      arms[tag] = { n: ids.length, ids, byId,
        resid: res.length ? +res[res.length >> 1].toFixed(3) : null,
        worst: res.length ? +res[res.length - 1].toFixed(2) : null };
    }
    // centre agreement between the gray control and each white arm
    const cmp = (a: any, b: any) => {
      const shared = a.ids.filter((i: number) => b.byId.has(i));
      const d = shared.map((i: number) => Math.hypot(
        a.byId.get(i).xc - b.byId.get(i).xc, a.byId.get(i).yc - b.byId.get(i).yc));
      d.sort((x: number, y: number) => x - y);
      return { shared: shared.length, onlyA: a.ids.filter((i: number) => !b.byId.has(i)),
               onlyB: b.ids.filter((i: number) => !a.byId.has(i)),
               medPx: d.length ? +d[d.length >> 1].toFixed(3) : null,
               maxPx: d.length ? +d[d.length - 1].toFixed(3) : null };
    };
    rows.push({ pose: `yaw${p.yawDeg} tilt${p.tiltDeg}${p.rollDeg ? " roll" + p.rollDeg : ""}${p.Zmm ? " Z" + p.Zmm : ""}`,
      gray: arms.gray128.n, white255: arms.white255.n, white240: arms.white240.n,
      gResid: arms.gray128.resid, wResid: arms.white255.resid, w240Resid: arms.white240.resid,
      gWorst: arms.gray128.worst, wWorst: arms.white255.worst,
      vs255: cmp(arms.gray128, arms.white255), vs240: cmp(arms.gray128, arms.white240) });
  }
  return rows;
});

console.log("pose                       marks read          median residual vs TRUTH     worst");
console.log("                          gray w255 w240    gray    w255    w240      gray   w255");
for (const r of out) {
  console.log(`${r.pose.padEnd(26)}${String(r.gray).padEnd(5)}${String(r.white255).padEnd(5)}${String(r.white240).padEnd(8)}` +
    `${String(r.gResid).padEnd(8)}${String(r.wResid).padEnd(8)}${String(r.w240Resid).padEnd(9)}` +
    `${String(r.gWorst).padEnd(7)}${r.wWorst}`);
}
const tot = (k: string) => out.reduce((a: number, r: any) => a + (r as any)[k], 0);
console.log(`\ntotal marks read: gray ${tot("gray")}   white255 ${tot("white255")}   white240 ${tot("white240")}`);
console.log("pageerrors:", errs.length ? errs.slice(0, 3) : "none");
await browser.close();
