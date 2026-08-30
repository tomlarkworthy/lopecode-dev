// Would the width-constrained homography help flat-trace? Answered on the
// eleven rescued phone frames rather than on synthetic data.
//
// 1. GEOMETRY, no fitting. flat-trace's markConsensus is RANSAC over 4-point
//    subsets fitted from centres alone. Four centres are 8 equations for 8
//    unknowns, so the fit is exact and its residual measures nothing; and when
//    three of the four are collinear it is not determined at all. How many of
//    the mat's 4-subsets are collinear — i.e. how often does the sampler draw a
//    subset that cannot constrain the plane?
//
// 2. ACCURACY, leave-one-out. Fit the plane on every mark but one and reproject
//    the one held out. LOO rather than random 4-subsets: a 4-point centres-only
//    fit has zero residual by construction, and on a low-count frame nearly
//    every 4-subset is collinear, where the LM fit does not return at all (an
//    earlier version of this probe wedged on cal10's 8 marks for that reason).
//    With 20+ marks against 8 degrees of freedom the fit is far from its
//    minimum, so LOO is bounded here.
import { chromium } from "playwright";
import { resolve } from "node:path";
import { readFileSync, readdirSync } from "node:fs";

const DIR = resolve("scratch/rmbt/calshots");
const NB = resolve("lopebooks/notebooks/tomlarkworthy_flat-trace.html");
const shots = readdirSync(DIR).filter((f) => f.endsWith(".png")).sort().map((f) => {
  const meta = JSON.parse(readFileSync(resolve(DIR, f.replace(/\.png$/, ".json")), "utf8"));
  return { name: meta.name, w: meta.w, h: meta.h, png: readFileSync(resolve(DIR, f)).toString("base64") };
});

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1400, height: 1200 } });
page.on("pageerror", (e) => console.log("!! " + e.message.slice(0, 200)));
page.on("console", (m) => { if (m.text().startsWith("[p]")) console.log(m.text()); });
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

const out = await page.evaluate(async (payload: any[]) => {
  const rt = (window as any).__ojs_runtime;
  const ft = [...rt._variables].find((v: any) => v._name === "matTarget")?._module;
  // coded-landmark-tracking is IMPORTED here, not a main, so rt.mains does not
  // hold it — find it through a variable only it defines.
  const clt = [...rt._variables].find((v: any) => v._name === "fitHomographyScaled")?._module;
  if (!clt) return { err: "fitHomographyScaled not defined anywhere — module did not sync?" };
  const T: any = await ft.value("matTarget");
  const calib: any = await ft.value("calib");
  const afm: any = await ft.value("analyzeFrameMan");
  const detectOpts: any = await ft.value("detectOpts");
  const fitScaled: any = await clt.value("fitHomographyScaled");
  const fitPlain: any = await clt.value("fitHomography");

  // ---- 1. how many 4-subsets of the MAT cannot constrain a plane -----------
  const M = T.marks;
  const tri = (p: any, q: any, r: any) =>
    Math.abs((q.xMm - p.xMm) * (r.yMm - p.yMm) - (q.yMm - p.yMm) * (r.xMm - p.xMm)) / 2;
  const COLL_MM2 = 0.5;   // a real triangle on a 43.5mm lattice is hundreds of mm^2
  let quads = 0, bad = 0;
  for (let a = 0; a < M.length; a++) for (let b = a + 1; b < M.length; b++)
    for (let c = b + 1; c < M.length; c++) for (let d = c + 1; d < M.length; d++) {
      quads++;
      const s = [M[a], M[b], M[c], M[d]];
      let deg = false;
      for (let i = 0; i < 4 && !deg; i++) for (let j = i + 1; j < 4 && !deg; j++) for (let k = j + 1; k < 4 && !deg; k++)
        if (tri(s[i], s[j], s[k]) < COLL_MM2) deg = true;
      if (deg) bad++;
    }

  // ---- 2. leave-one-out reprojection ---------------------------------------
  const cv = document.createElement("canvas");
  const g2 = cv.getContext("2d", { willReadFrequently: true })!;
  const dec = async (b64: string, w: number, h: number) => {
    const bin = atob(b64); const u = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    const bm = await createImageBitmap(new Blob([u], { type: "image/png" }));
    cv.width = w; cv.height = h; g2.drawImage(bm, 0, 0);
    const px = g2.getImageData(0, 0, w, h).data;
    const gray = new Uint8Array(w * h);
    for (let k = 0, p = 0; k < gray.length; k++, p += 4) gray[k] = px[p];
    return gray;
  };
  const apply = (H: any, X: number, Y: number) => calib.applyH(H.H ?? H, X, Y);

  const perFrame: any[] = [], allPlain: number[] = [], allScaled: number[] = [];
  let shapeSeen: any = null, widthless = 0, marksTotal = 0;

  for (const sh of payload) {
    console.log("[p] " + sh.name);
    const gray = await dec(sh.png, sh.w, sh.h);
    const res = afm({ gray, w: sh.w, h: sh.h }, detectOpts);
    const on = res.fused.filter((f: any) => T.byId.has(f.id));
    const pairs = on.map((f: any) => {
      const m = T.byId.get(f.id);
      return { sx: m.xMm, sy: m.yMm, dx: f.xc, dy: f.yc, id: f.id, a: f.a, b: f.b, rMm: T.radiusMm };
    });
    marksTotal += pairs.length;
    widthless += pairs.filter((p: any) => !(p.a > 0 && p.b > 0)).length;
    if (pairs.length < 12) { perFrame.push({ name: sh.name, marks: pairs.length, skipped: "under 12 marks" }); continue; }

    const fp: number[] = [], fs: number[] = [];
    for (let i = 0; i < pairs.length; i++) {
      const train = pairs.filter((_: any, j: number) => j !== i), test = pairs[i];
      const score = (fn: any) => {
        let H = null;
        try { H = fn(train); } catch (e) { return null; }
        if (!H) return null;
        const z = apply(H, test.sx, test.sy);
        const d = Math.hypot(z[0] - test.dx, z[1] - test.dy);
        return Number.isFinite(d) ? d : null;
      };
      const ep = score(fitPlain), es = score(fitScaled);
      if (shapeSeen === null) { const h = fitScaled(train); shapeSeen = h ? Object.keys(h).slice(0, 8) : "null"; }
      if (ep != null) fp.push(ep);
      if (es != null) fs.push(es);
    }
    const med = (x: number[]) => x.length ? +x.slice().sort((a, b) => a - b)[x.length >> 1].toFixed(2) : null;
    const p90 = (x: number[]) => x.length ? +x.slice().sort((a, b) => a - b)[Math.floor(0.9 * x.length)].toFixed(2) : null;
    allPlain.push(...fp); allScaled.push(...fs);
    perFrame.push({ name: sh.name, marks: pairs.length,
      centresOnly: { med: med(fp), p90: p90(fp) }, centresPlusWidths: { med: med(fs), p90: p90(fs) } });
  }
  const stat = (x: number[]) => {
    if (!x.length) return null;
    const y = x.slice().sort((a, b) => a - b);
    return { n: y.length, med: +y[y.length >> 1].toFixed(2), p90: +y[Math.floor(0.9 * y.length)].toFixed(2), max: +y[y.length - 1].toFixed(1) };
  };
  return {
    lattice: { marks: M.length, quads, degenerateQuads: bad, degeneratePct: +(100 * bad / quads).toFixed(1) },
    widths: { marksTotal, widthless },
    scaledFitShape: shapeSeen,
    leaveOneOutPx: { centresOnly: stat(allPlain), centresPlusWidths: stat(allScaled) },
    perFrame,
  };
}, shots);

console.log(JSON.stringify(out, null, 1));
await browser.close();
