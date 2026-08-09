import { chromium } from "playwright";
import { resolve } from "node:path";
const IN = resolve("lopebooks/notebooks/tomlarkworthy_coded-landmark-tracking.html");
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });
const errs: string[] = [];
page.on("pageerror", (x) => errs.push(x.message.slice(0, 200)));
await page.addInitScript(() => {
  const orig = (window as any).Runtime; let cap = false;
  Object.defineProperty(window, "Runtime", { get() { return orig; }, set(N: any) {
    const W = function (this: any, ...a: any[]) { const i = new N(...a); if (!cap) { (window as any).__ojs_runtime = i; cap = true; } return i; };
    W.prototype = N.prototype; Object.assign(W, N); return W; } });
});
await page.goto(`file://${IN}#view=S100(@tomlarkworthy/coded-landmark-tracking)`, { waitUntil: "networkidle", timeout: 300000 });
await page.waitForFunction(() => !!(window as any).__ojs_runtime, { timeout: 300000 });
await page.waitForTimeout(22000);
const out = await page.evaluate(async () => {
  const rt = (window as any).__ojs_runtime;
  const mod = rt.mains.get("@tomlarkworthy/coded-landmark-tracking");
  const v = [...rt._variables].find((z: any) => z._module === mod && z._name === "sectionAudit");
  if (!v) return { err: "no sectionAudit variable" };
  const el: any = await Promise.race([v._promise, new Promise((r) => setTimeout(() => r(null), 8000))]);
  return { text: el?.textContent ?? "(pending)" };
});
console.log(out.err ?? out.text);
console.log("pageerrors:", errs.length ? errs.slice(0, 3) : "none");
await browser.close();
