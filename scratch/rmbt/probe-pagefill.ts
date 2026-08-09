// The pageFill option must default to today's output byte for byte, and must
// actually produce a white sheet when asked. Also writes both sheets out so
// they can be looked at.
import { chromium } from "playwright";
import { resolve } from "node:path";
import { writeFileSync } from "node:fs";
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
  const sheet: any = await val("hexTargetSvg");
  const mark: any = await val("manMarkSvgSource");
  const sGray = sheet(), sWhite = sheet({ pageFill: "#ffffff" });
  const mGray = mark(22), mWhite = mark(22, { pageFill: "#ffffff" });
  return {
    sheetDefaultHasGray: sGray.includes('fill="#808080"'),
    sheetWhiteHasWhite: sWhite.includes('fill="#ffffff"') && !sWhite.includes('fill="#808080"'),
    sheetDefaultLegend: sGray.includes("do not trim"),
    sheetWhiteLegend: sWhite.includes("do not trim"),
    markDefaultLabel: (mGray.match(/fill="(#[0-9a-f]{6})" text-anchor/) ?? [])[1],
    markWhiteLabel: (mWhite.match(/fill="(#[0-9a-f]{6})" text-anchor/) ?? [])[1],
    discsSame: (sGray.match(/<circle/g) ?? []).length === (sWhite.match(/<circle/g) ?? []).length,
    sGray, sWhite
  };
});
writeFileSync("scratch/rmbt/hex-target-gray.svg", out.sGray);
writeFileSync("scratch/rmbt/hex-target-white.svg", out.sWhite);
console.log("default sheet still floods #808080 :", out.sheetDefaultHasGray);
console.log("pageFill white gives a white sheet :", out.sheetWhiteHasWhite);
console.log("'do not trim' legend  gray/white   :", out.sheetDefaultLegend, "/", out.sheetWhiteLegend);
console.log("mark label fill       gray/white   :", out.markDefaultLabel, "/", out.markWhiteLabel);
console.log("same disc count both ways          :", out.discsSame);
console.log("wrote scratch/rmbt/hex-target-{gray,white}.svg");
console.log("pageerrors:", errs.length ? errs.slice(0, 3) : "none");
await browser.close();
