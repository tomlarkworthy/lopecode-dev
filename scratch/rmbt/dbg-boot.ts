import { chromium } from "playwright";
const URL_ = process.argv[2];
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const errs: string[] = [], logs: string[] = [];
page.on("pageerror", (e) => errs.push("PAGEERROR " + e.message.slice(0, 300)));
page.on("console", (m) => { if (m.type() === "error") logs.push(m.text().slice(0, 200)); });
await page.addInitScript(() => {
  const orig = (window as any).Runtime; let cap = false;
  Object.defineProperty(window, "Runtime", { get() { return orig; }, set(N: any) {
    const W = function (this: any, ...a: any[]) { const i = new N(...a); if (!cap) { (window as any).__ojs_runtime = i; cap = true; } return i; };
    W.prototype = N.prototype; Object.assign(W, N); return W; } });
});
await page.goto(URL_, { waitUntil: "domcontentloaded", timeout: 300000 });
await page.waitForTimeout(60000);
const st = await page.evaluate(() => ({
  hasRuntime: !!(window as any).__ojs_runtime,
  mains: (window as any).__ojs_runtime ? [...(window as any).__ojs_runtime.mains.keys()] : null,
  cells: document.querySelectorAll("#lopepage-2 .observablehq").length,
  prerenderStillUp: !!document.getElementById("lope-prerender"),
  bodyKids: document.body.children.length,
  origin: location.origin
}));
await browser.close();
console.log(JSON.stringify({ state: st, pageerrors: errs.slice(0, 8), consoleErrors: [...new Set(logs)].slice(0, 10) }, null, 2));
