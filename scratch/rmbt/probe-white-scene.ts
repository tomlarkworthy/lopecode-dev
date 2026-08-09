// Does the gapFrac 0.2 + offerWhole tuning survive a white page?
//
// That pair was validated on manScene, which fills 128 and composites marks
// rendered by renderManFrame (also 128 outside the mark). Its own comment
// warns that the wrong split "invents a SPURIOUS one at stride 6" -- a false
// positive in a positioning system. Now that the printed page is white, the
// scene the regression grades no longer matches what gets printed.
//
// Rebuilds manScene and renderManFrame with the page level as a parameter --
// one literal each, so nothing else drifts -- and re-runs the manSceneTest
// checks at 128 and 255.
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
  const [manLayout, manColor, renderManFrame, analyze] = await Promise.all(
    ["manLayout", "manColor", "renderManFrame", "analyzeFrameMan"].map(val));

  const rmfSrc = renderManFrame.toString();
  if (!rmfSrc.includes("let v = 128;")) throw new Error("renderManFrame page literal not found");
  // Rebuild the closure the cell had: the eval'd copy has no manLayout/manColor
  // in scope, and silently rendering blank would look like a detector failure.
  const rmf2 = eval(`(function(manLayout, manColor){ return ${
    rmfSrc.replace("let v = 128;", "let v = (opts.pageGray ?? 128);")}; })`)(manLayout, manColor);

  const SCENE = [
    { id: 45, W: 55, yaw: 0, x: 150, y: 140 },
    { id: 9, W: 40, yaw: 30, x: 430, y: 130 },
    { id: 62, W: 70, yaw: 50, x: 700, y: 300 },
    { id: 21, W: 33, yaw: 15, x: 300, y: 400 }
  ];
  const build = (pg: number) => {
    const W = 960, H = 540;
    const gray = new Uint8Array(W * H).fill(pg);
    const truth: any[] = [];
    for (const m of SCENE) {
      const bits: number[] = [];
      for (let i = manLayout.nBits - 1; i >= 0; i--) bits.push((m.id >> i) & 1);
      const f = rmf2(bits, { W: m.W, yawDeg: m.yaw, blur: 1.0, noise: 3, seed: m.id, pageGray: pg });
      for (let y = 0; y < f.h; y++)
        for (let x = 0; x < f.w; x++) {
          const gy = m.y + y - (f.h >> 1), gx = m.x + x - (f.w >> 1);
          if (gy >= 0 && gy < H && gx >= 0 && gx < W) gray[gy * W + gx] = f.gray[y * f.w + x];
        }
      truth.push({ id: m.id, xc: m.x, yc: m.y, bTrue: m.W });
    }
    return { gray, w: W, h: H, truth };
  };

  // Control first: the rebuild at 128 must reproduce the real manScene exactly,
  // or the 255 arm is being compared against a scene nobody validated.
  const real: any = await val("manScene");
  const mine = build(128);
  let diff = 0, firstDiff = -1;
  for (let i = 0; i < real.gray.length; i++)
    if (real.gray[i] !== mine.gray[i]) { diff++; if (firstDiff < 0) firstDiff = i; }
  const control = { bytes: real.gray.length, diff, firstDiff,
    pct: +(100 * diff / real.gray.length).toFixed(3) };

  const runs = [{ stride: 6 }, { stride: 4 }, { stride: 4, bothAxes: true }];
  const report: any[] = [];
  for (const pg of [128, 255]) {
    const sc = build(pg);
    for (const o of runs) {
      const res = analyze({ gray: sc.gray, w: sc.w, h: sc.h }, o);
      let found = 0; const errsPx: number[] = [];
      for (const t of sc.truth) {
        const hit = (res.fused ?? []).find((f: any) => Math.hypot(f.xc - t.xc, f.yc - t.yc) < 0.5 * t.bTrue);
        if (hit && hit.id === t.id) { found++; errsPx.push(Math.hypot(hit.xc - t.xc, hit.yc - t.yc)); }
      }
      // A detection that matches no truth mark is a spurious one -- the exact
      // failure the gapFrac/offerWhole comment says must never happen.
      const spurious = (res.fused ?? []).filter((f: any) =>
        !sc.truth.some((t: any) => Math.hypot(f.xc - t.xc, f.yc - t.yc) < 0.5 * t.bTrue)).length;
      errsPx.sort((a, b) => a - b);
      report.push({ page: pg, run: `stride${o.stride}${o.bothAxes ? " bothAxes" : ""}`,
        found, of: sc.truth.length, spurious,
        med: errsPx.length ? +errsPx[errsPx.length >> 1].toFixed(2) : null });
    }
  }
  return { report, control };
});

console.log("rebuild vs real manScene at 128:", JSON.stringify((out as any).control));
console.log();
console.log("page  run                found  spurious  median centre err");
for (const r of (out as any).report)
  console.log(`${String(r.page).padEnd(6)}${r.run.padEnd(20)}${(r.found + "/" + r.of).padEnd(7)}${String(r.spurious).padEnd(10)}${r.med}`);
console.log("pageerrors:", errs.length ? errs.slice(0, 3) : "none");
await browser.close();
