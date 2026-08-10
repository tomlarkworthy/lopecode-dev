// Pick the mat by rasterising the SVG that actually gets printed and reading it
// back with the real cascade. Reports the printed margins too -- a mark inside
// a printer's unprintable border is not a mark.
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
  const val = (n: string) => mod.value(n);
  const makeMatTarget: any = await val("makeMatTarget");
  const matTargetSvg: any = await val("matTargetSvg");
  const matPrintCheck: any = await val("matPrintCheck");
  const rows: any[] = [];
  for (const diameterMm of [32, 30, 28, 26, 24]) {
    for (const legendMm of [15, 12]) {
      const T = makeMatTarget({ diameterMm, legendMm });
      const R = T.radiusMm;
      const ys = [...new Set(T.marks.map((m: any) => +m.yMm.toFixed(1)))];
      const inkTop = Math.min(...T.marks.map((m: any) => T.cy0 - m.yMm - R));
      const inkBot = Math.max(...T.marks.map((m: any) => T.cy0 - m.yMm + R));
      const inkLeft = Math.min(...T.marks.map((m: any) => T.cx0 + m.xMm - R));
      const check = await matPrintCheck({ target: T, widths: [1400] });
      rows.push({
        d: diameterMm, legend: legendMm, rows: ys.length, marks: T.marks.length,
        ids: T.idsAvailable, dropped: T.sitesTruncated,
        pitch: T.pitchMm, gapDiscs: T.rowGapInDiscs,
        patternMm: [T.widthMm, T.heightMm],
        marginTopMm: +inkTop.toFixed(1), marginBotMm: +(T.pageH - T.legendMm - inkBot).toFixed(1), marginSideMm: +inkLeft.toFixed(1),
        read: `${check[0].read}/${check[0].of}`, offTarget: check[0].offTarget.length,
        markPx: check[0].markPx, medErrPx: check[0].medErrPx, worstErrPx: check[0].worstErrPx
      });
    }
  }
  return rows;
});
await browser.close();
const hdr = ["d","legend","rows","marks","ids","dropped","pitch","gapDiscs","patternMm","marginTopMm","marginBotMm","marginSideMm","read","offTarget","markPx","medErrPx","worstErrPx"];
console.log(hdr.join("\t"));
for (const r of out as any[]) console.log(hdr.map((k) => Array.isArray(r[k]) ? r[k].join("x") : r[k]).join("\t"));
