// Cold-boot: does the EXPORTED notebook still read its own printable target,
// and hand me the exact SVG the download button produces?
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
const NB = resolve("lopebooks/notebooks/tomlarkworthy_coded-landmark-tracking.html");
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
await page.addInitScript(() => {
  const orig = (window as any).Runtime; let cap = false;
  Object.defineProperty(window, "Runtime", {
    get() { return orig; },
    set(N: any) {
      const W = function (this: any, ...a: any[]) { const i = new N(...a); if (!cap) { (window as any).__ojs_runtime = i; cap = true; } return i; };
      W.prototype = N.prototype; Object.assign(W, N); return W;
    },
  });
});
await page.goto(`file://${NB}`, { waitUntil: "networkidle", timeout: 90000 });
await page.waitForFunction(() => !!(window as any).__ojs_runtime, { timeout: 90000 });
await page.waitForTimeout(6000);
const out = await page.evaluate(async () => {
  const rt = (window as any).__ojs_runtime;
  const v = (n: string) => [...rt._variables].find((z: any) => z._name === n);
  const mod = v("hexTarget")?._module;
  if (!mod) return { error: "hexTarget not in runtime" };
  const [check, sweep, svgFn, T] = await Promise.all([
    mod.value("hexPrintCheck"), mod.value("hexPitchSweep"),
    mod.value("hexTargetSvg"), mod.value("hexTarget"),
  ]);
  return {
    check, sweep: sweep.map((s: any) => ({ p: s.pitchFactor, roll: s.printRollDeg, det: s.detected, wrong: s.wrongPlace })),
    svg: svgFn({ target: T }),
    geom: { d: T.diameterMm, pitch: T.pitchMm, roll: T.rollDeg, sheet: `${T.widthMm}x${T.heightMm}`, ids: T.ids },
  };
});
if (out.error) { console.error(out.error); process.exit(1); }
console.log("geometry", JSON.stringify(out.geom));
console.log("printCheck", JSON.stringify(out.check, null, 1));
console.log("sweep", JSON.stringify(out.sweep));
const dst = resolve("scratch/rmbt/man-hex-target-a4.svg");
writeFileSync(dst, out.svg);
console.log("wrote", dst, out.svg.length, "bytes");
await browser.close();
