// Does the self-test's own frame size explain the jump in p95? Run the same
// three placements at several resolutions.
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
  for (const W of [900, 1100, 1280, 1600]) {
    for (const places of [[[0, 0]], [[30, 14]], [[-26, -15]]]) {
      const r = t({ W, H: Math.round(W * 0.75), cases: [{ tilt: 3, thick: 0 }], places });
      const x = r.rows[0];
      rows.push({ W, at: places[0], med: x.medMm, p95: x.p95Mm, max: x.maxMm, bbox: x.worstBboxMm, area: x.worstAreaPct, pts: x.per[0]?.pts, marks: x.marks });
    }
  }
  return rows;
});
await browser.close();
console.log(out.map((r: any) => JSON.stringify(r)).join("\n"));
