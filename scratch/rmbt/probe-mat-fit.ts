// Where do the marks actually land on the PAGE, and how much room is left?
import { chromium } from "playwright";
import { resolve } from "node:path";
const NB = resolve("lopebooks/notebooks/tomlarkworthy_flat-trace.html");
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
await page.addInitScript(() => {
  const orig = (window as any).Runtime; let cap = false;
  Object.defineProperty(window, "Runtime", { get() { return orig; },
    set(N: any) { const W = function (this: any, ...a: any[]) { const i = new N(...a); if (!cap) { (window as any).__ojs_runtime = i; cap = true; } return i; }; W.prototype = N.prototype; Object.assign(W, N); return W; } });
});
await page.goto(`file://${NB}`, { waitUntil: "networkidle", timeout: 180000 });
await page.waitForFunction(() => !!(window as any).__ojs_runtime, { timeout: 180000 });
await page.waitForTimeout(8000);
const out = await page.evaluate(async () => {
  const rt = (window as any).__ojs_runtime;
  const mod = [...rt._variables].find((v: any) => v._name === "matTarget")?._module;
  const T: any = await mod.value("matTarget");
  const cy0 = (T.pageH - T.legendMm) / 2, cx0 = T.pageW / 2;
  const R = T.radiusMm;
  const rowsY = [...new Set(T.marks.map((m: any) => +m.yMm.toFixed(2)))].sort((a: any, b: any) => b - a);
  // page-space extents of the printed discs
  const top = Math.min(...T.marks.map((m: any) => cy0 - m.yMm - R));
  const bot = Math.max(...T.marks.map((m: any) => cy0 - m.yMm + R));
  const left = Math.min(...T.marks.map((m: any) => cx0 + m.xMm - R));
  const right = Math.max(...T.marks.map((m: any) => cx0 + m.xMm + R));
  return {
    page: [T.pageW, T.pageH], marginMm: T.marginMm, legendMm: T.legendMm, radiusMm: R,
    pitchMm: T.pitchMm, rowSpacingMm: +(T.pitchMm * Math.sqrt(3) / 2).toFixed(2),
    rows: rowsY.length, rowsY, marks: T.marks.length, perRow: rowsY.map((y: any) => T.marks.filter((m: any) => Math.abs(m.yMm - y) < 0.01).length),
    inkTopMm: +top.toFixed(2), inkBottomFromPageBottomMm: +(T.pageH - bot).toFixed(2),
    inkLeftMm: +left.toFixed(2), inkRightFromPageRightMm: +(T.pageW - right).toFixed(2),
    legendBandStartsAtMm: T.pageH - T.legendMm,
    gapBetweenInkAndLegendMm: +(T.pageH - T.legendMm - bot).toFixed(2)
  };
});
await browser.close();
console.log(JSON.stringify(out, null, 1));
