// Emit the printable scan mat as an SVG file.
import { chromium } from "playwright";
import { resolve } from "node:path";
import { readFileSync, writeFileSync } from "node:fs";

const NB = resolve("lopebooks/notebooks/tomlarkworthy_coded-landmark-tracking.html");
const BUNDLE = readFileSync(resolve("scratch/rmbt/trace-bundle.js"), "utf8");
const arg = (k: string, d: string) => (process.argv.find((a) => a.startsWith(`--${k}=`)) ?? `--${k}=${d}`).split("=")[1];
const diameterMm = +arg("diameter", "32");
const rollDeg = +arg("roll", "0");
const pageW = +arg("pageW", "297");
const pageH = +arg("pageH", "210");
const out = arg("out", `scratch/rmbt/scan-mat-${pageW}x${pageH}-d${diameterMm}.svg`);

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
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
await page.goto(`file://${NB}`, { waitUntil: "networkidle", timeout: 120000 });
await page.waitForFunction(() => !!(window as any).__ojs_runtime, { timeout: 120000 });
await page.waitForTimeout(8000);
await page.addScriptTag({ content: BUNDLE });

const r = await page.evaluate(async (o: any) => {
  const T4 = (window as any).TRACE;
  const rt = (window as any).__ojs_runtime;
  const vars = [...rt._variables];
  const val = async (n: string) => { const v = vars.find((z: any) => z._name === n); return v ? await v._module.value(n) : null; };
  const manLayout: any = await val("manLayout");
  const manColor: any = await val("manColor");
  const T = T4.makeMatTarget(manLayout, o);
  return {
    svg: T4.matTargetSvg(T, manColor),
    marks: T.marks.length, truncated: T.sitesTruncated, idsAvailable: T.idsAvailable,
    pitchMm: T.pitchMm, gap: T.rowGapInDiscs, w: T.widthMm, h: T.heightMm,
    ids: T.marks.map((m: any) => ({ id: m.id, x: m.xMm, y: m.yMm }))
  };
}, { diameterMm, rollDeg, pageW, pageH });

await browser.close();
writeFileSync(resolve(out), r.svg);
writeFileSync(resolve(out.replace(/\.svg$/, ".json")), JSON.stringify({ diameterMm, rollDeg, pageW, pageH, pitchMm: r.pitchMm, marks: r.ids }, null, 1));
console.log(`${r.marks} marks (${r.idsAvailable} ids available, ${r.truncated} sites dropped), pitch ${r.pitchMm}mm, row gap ${r.gap} discs, pattern ${r.w} x ${r.h} mm`);
console.log(`wrote ${out} and its .json geometry`);
