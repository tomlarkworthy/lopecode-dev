import { chromium } from "playwright";
import { resolve } from "node:path";
const IN = resolve("lopebooks/notebooks/tomlarkworthy_coded-landmark-tracking.html");
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.addInitScript(() => {
  const orig = (window as any).Runtime; let cap = false;
  Object.defineProperty(window, "Runtime", { get() { return orig; }, set(N: any) {
    const W = function (this: any, ...a: any[]) { const i = new N(...a); if (!cap) { (window as any).__ojs_runtime = i; cap = true; } return i; };
    W.prototype = N.prototype; Object.assign(W, N); return W; } });
});
await page.goto(`file://${IN}#view=R100(S100(@tomlarkworthy/coded-landmark-tracking))`, { waitUntil: "networkidle", timeout: 300000 });
await page.waitForFunction(() => document.querySelectorAll("#lopepage-2 .observablehq").length > 20, { timeout: 300000 });
await page.waitForTimeout(15000);
console.log(JSON.stringify(await page.evaluate(() => {
  const rt = (window as any).__ojs_runtime;
  const mains = rt.mains;
  const sample: any[] = [];
  if (mains && mains.forEach) mains.forEach((v: any, k: any) => {
    if (sample.length < 4) sample.push({ keyType: typeof k, keyIsStr: typeof k === "string", valType: typeof v, valName: v && v._name });
  });
  return {
    hasModuleNames: !!rt.module_names,
    moduleNamesType: typeof rt.module_names,
    mainsCtor: mains && mains.constructor && mains.constructor.name,
    mainsSize: mains && mains.size,
    mainsKeys: mains && mains.keys ? [...mains.keys()].slice(0, 6).map((k: any) => typeof k === "string" ? k : (k && k._name) || "[module]") : null,
    sample
  };
}, null), null, 2));
await browser.close();
