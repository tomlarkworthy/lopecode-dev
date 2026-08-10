// The tone-independent "is the mat visible here" term fixes a severed
// silhouette but must not move the object's EDGE. Sweep its slope ratio and
// window radius against both things at once: the 2D trace accuracy (which the
// edge decides) and a dark-grey part on a black ring (which the term rescues).
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
  const traceSelfTest: any = await val("traceSelfTest");
  const T: any = await val("matTarget");
  const makeMatSampler: any = await val("makeMatSampler");
  const makePlaneMap: any = await val("makePlaneMap");
  const traceFrame: any = await val("traceFrame");
  const cameraPoseAt: any = await val("cameraPoseAt");

  // The rescue case: dark-grey L-prism seen at 60 degrees.
  const W = 1100, H = 825;
  const TRUE = { f: 0.9 * W, cx: W / 2 - 6, cy: H / 2 + 4, k1: -0.16, k2: 0.04, p1: 0, p2: 0 };
  const matGray = makeMatSampler();
  const HGT = 18;
  const inPlan = (x: number, y: number) => x >= -20 && x <= 20 && y >= -15 && y <= 15 && !(x > 0 && y > 0);
  const map = makePlaneMap(TRUE, cameraPoseAt(0, 30, 1.15 * T.pageW));
  const gray = new Uint8Array(W * H);
  let truthObjPx = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const p0 = map.toPlaneAt(x + 0.5, y + 0.5, 0);
    if (!p0) { gray[y * W + x] = 230; continue; }
    const p1 = map.toPlaneAt(x + 0.5, y + 0.5, HGT);
    let hit = false;
    if (p1) for (let s = 0; s <= 24 && !hit; s++) {
      const u = s / 24;
      if (inPlan(p0[0] + (p1[0] - p0[0]) * u, p0[1] + (p1[1] - p0[1]) * u)) hit = true;
    }
    if (hit) truthObjPx++;
    gray[y * W + x] = hit ? 45 : matGray(p0[0], p0[1]);
  }

  const rows: any[] = [];
  for (const cfg of [
    { label: "off", difference: { structure: false } },
    { label: "r=3 ratio .30", difference: { structRadius: 3, structSlopeRatio: 0.3 } },
    { label: "r=3 ratio .18", difference: { structRadius: 3, structSlopeRatio: 0.18 } },
    { label: "r=3 ratio .10", difference: { structRadius: 3, structSlopeRatio: 0.1 } },
    { label: "r=3 ratio .05", difference: { structRadius: 3, structSlopeRatio: 0.05 } },
    { label: "r=5 ratio .10", difference: { structRadius: 5, structSlopeRatio: 0.1 } },
    { label: "off minLvl0", difference: { structure: false }, minLevel: 0 },
    { label: "r=3 .10 minLvl0", difference: { structRadius: 3, structSlopeRatio: 0.1 }, minLevel: 0 },
    { label: "r=3 .10 minLvlThr", difference: { structRadius: 3, structSlopeRatio: 0.1 }, minLevelThr: true },
  ]) {
    const extra: any = { difference: cfg.difference };
    if ((cfg as any).minLevel != null) extra.minLevel = (cfg as any).minLevel;
    const t = traceSelfTest({ trace: extra });
    const r = traceFrame({ gray, w: W, h: H }, TRUE, extra);
    rows.push({
      cfg: cfg.label,
      trace2d: t.rows.map((x: any) => ({ tilt: x.tilt, med: x.medMm, p95: x.p95Mm, max: x.maxMm, bbox: x.bboxErrMm, area: x.areaErrPct })),
      pass2d: t.pass,
      rescueMaskPx: r.mask ? r.mask.areaPx : null, truthObjPx,
      rescuePct: r.mask ? +(100 * r.mask.areaPx / truthObjPx).toFixed(1) : null
    });
  }
  return rows;
});
await browser.close();
console.log(out.map((r: any) => JSON.stringify(r)).join("\n"));
if (errs.length) console.log("\n--- page errors ---\n" + [...new Set(errs)].slice(0, 10).join("\n"));
