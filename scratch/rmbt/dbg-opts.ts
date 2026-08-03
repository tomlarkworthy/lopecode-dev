import { chromium } from "playwright";
const URL = "http://localhost:8791/tomlarkworthy_coded-landmark-tracking.html";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.addInitScript(() => {
  const orig = (window as any).Runtime; let cap = false;
  Object.defineProperty(window, "Runtime", { get() { return orig; }, set(N: any) {
    const W = function (this: any, ...a: any[]) { const i = new N(...a); if (!cap) { (window as any).__ojs_runtime = i; cap = true; } return i; };
    W.prototype = N.prototype; Object.assign(W, N); return W; } });
});
await page.goto(URL, { waitUntil: "networkidle", timeout: 180000 });
await page.waitForFunction(() => !!(window as any).__ojs_runtime, { timeout: 180000 });
await page.waitForTimeout(12000);
console.log(JSON.stringify(await page.evaluate(async () => {
  const mod = (window as any).__ojs_runtime.mains.get("@tomlarkworthy/coded-landmark-tracking");
  const o = await mod.value("hexRigOpts");
  const keys: any = {};
  for (const [k, v] of Object.entries(o)) keys[k] = typeof v === "function" ? "fn" : (v && typeof v === "object" ? "obj" : v);
  return keys;
}, null), null, 2));
await browser.close();
