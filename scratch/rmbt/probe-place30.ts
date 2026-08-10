// One placement is a persistent -3% area at every resolution. Sweep the
// structure term and the contour floor on exactly that scene.
import { chromium } from "playwright";
import { resolve } from "node:path";
const NB = resolve("lopebooks/notebooks/tomlarkworthy_flat-trace.html");
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
await page.addInitScript(() => {
  const orig = (window as any).Runtime; let cap = false;
  Object.defineProperty(window, "Runtime", { get() { return orig; }, set(N: any) {
    const W = function (this: any, ...a: any[]) { const i = new N(...a); if (!cap) { (window as any).__ojs_runtime = i; cap = true; } return i; };
    W.prototype = N.prototype; Object.assign(W, N); return W; } });
});
await page.goto(`file://${NB}`, { waitUntil: "networkidle", timeout: 180000 });
await page.waitForFunction(() => !!(window as any).__ojs_runtime, { timeout: 180000 });
await page.waitForTimeout(5000);
const out = await page.evaluate(async () => {
  const rt = (window as any).__ojs_runtime;
  const mod = [...rt._variables].find((v: any) => v._name === "matTarget")?._module;
  const t: any = await mod.value("traceSelfTest");
  const rows: any[] = [];
  const cfgs: any[] = [
    { label: "default" },
    { label: "struct off", trace: { difference: { structure: false } } },
    { label: "ratio .25", trace: { difference: { structSlopeRatio: 0.25 } } },
    { label: "ratio .45", trace: { difference: { structSlopeRatio: 0.45 } } },
    { label: "r=3 ratio .25", trace: { difference: { structRadius: 3, structSlopeRatio: 0.25 } } },
    { label: "minLevel 0", trace: { minLevel: 0 } },
    { label: "minLevel 3", trace: { minLevel: 3 } },
    { label: "close 5", trace: { mask: { closeRadius: 5 } } },
    { label: "open 1", trace: { mask: { openRadius: 1 } } },
    { label: "thr 8", trace: { mask: { threshold: 8 } } },
  ];
  for (const c of cfgs) {
    const r = t({ W: 1280, H: 960, cases: [{ tilt: 3, thick: 0 }], places: [[30, 14]], trace: c.trace });
    const x = r.rows[0];
    rows.push({ cfg: c.label, med: x.medMm, p95: x.p95Mm, max: x.maxMm, bbox: x.worstBboxMm, area: x.worstAreaPct, pts: x.per[0]?.pts });
  }
  return rows;
});
await browser.close();
console.log(out.map((r: any) => JSON.stringify(r)).join("\n"));
