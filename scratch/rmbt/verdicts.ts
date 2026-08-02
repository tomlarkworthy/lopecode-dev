import { chromium } from "playwright";
import { resolve } from "node:path";
const NB = resolve("lopebooks/notebooks/tomlarkworthy_coded-landmark-tracking.html");
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
await page.addInitScript(() => {
  const orig = (window as any).Runtime; let cap = false;
  Object.defineProperty(window, "Runtime", { get() { return orig; },
    set(N: any) { const W = function (this: any, ...a: any[]) { const i = new N(...a); if (!cap) { (window as any).__ojs_runtime = i; cap = true; } return i; }; W.prototype = N.prototype; Object.assign(W, N); return W; } });
});
await page.goto(`file://${NB}`, { waitUntil: "networkidle", timeout: 180000 });
await page.waitForFunction(() => !!(window as any).__ojs_runtime, { timeout: 180000 });
await page.waitForTimeout(15000);
const out = await page.evaluate(async () => {
  const rt = (window as any).__ojs_runtime;
  const vars = [...rt._variables];
  const val = async (n: string) => { const v = vars.find((z: any) => z._name === n); return v ? await v._module.value(n) : null; };
  const tail = (s: any, n = 3) => String(s).split("\n").filter(Boolean).slice(-n).join(" | ");
  return {
    selfTest: tail(await val("hexRigSelfTest"), 2),
    manScene: tail(await val("manSceneTest"), 2),
    rendererCheck: tail(await val("hexRendererCheck"), 1),
    printCheck: tail(await val("hexPrintCheck"), 2),
  };
});
await browser.close();
for (const [k, v] of Object.entries(out)) console.log(`${k.padEnd(14)} ${v}`);
