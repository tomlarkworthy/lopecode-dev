import { chromium } from "playwright";
import { resolve } from "node:path";
const NB = resolve(process.argv[2] ?? "lopebooks/notebooks/tomlarkworthy_coded-landmark-tracking.html");
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
page.on("pageerror", (e) => console.error("PAGE ERROR:", e.message));
await page.addInitScript(() => {
  const orig = (window as any).Runtime; let cap = false;
  Object.defineProperty(window, "Runtime", { get() { return orig; },
    set(N: any) { const W = function (this: any, ...a: any[]) { const i = new N(...a); if (!cap) { (window as any).__ojs_runtime = i; cap = true; } return i; }; W.prototype = N.prototype; Object.assign(W, N); return W; } });
});
await page.goto(`file://${NB}`, { waitUntil: "networkidle", timeout: 120000 });
await page.waitForFunction(() => !!(window as any).__ojs_runtime, { timeout: 120000 });
await page.waitForTimeout(11000);
const out = await page.evaluate(async () => {
  const rt = (window as any).__ojs_runtime; const vars = [...rt._variables];
  const get = async (n: string) => { const v = vars.find((z: any) => z._name === n); if (!v) return "MISSING";
    try { return await v._module.value(n); } catch (e: any) { return "ERROR: " + e.message; } };
  const t: any = await get("testFrameResults");
  const m: any = await get("manFrameResults");
  return {
    classic: Array.isArray(t) ? t.map((f: any) => ({ name: f.name, pass: f.pass, ids: f.ids ?? f.idsUpright, failures: f.failures })) : t,
    man: Array.isArray(m) ? m.map((f: any) => ({ name: f.name, pass: f.pass, failures: f.failures })) : m,
  };
});
console.log("CLASSIC bank (analyzeFrame):\n" + JSON.stringify(out.classic, null, 1));
console.log("\nMAN bank (analyzeFrameMan):\n" + JSON.stringify(out.man, null, 1));
await browser.close();
