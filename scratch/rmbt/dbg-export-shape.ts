import { chromium } from "playwright";
import { resolve } from "node:path";
const IN = resolve("lopebooks/notebooks/tomlarkworthy_coded-landmark-tracking.html");
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on("pageerror", (e) => console.error("PAGEERROR", e.message.slice(0, 200)));
await page.addInitScript(() => {
  const orig = (window as any).Runtime; let cap = false;
  Object.defineProperty(window, "Runtime", { get() { return orig; }, set(N: any) {
    const W = function (this: any, ...a: any[]) { const i = new N(...a); if (!cap) { (window as any).__ojs_runtime = i; cap = true; } return i; };
    W.prototype = N.prototype; Object.assign(W, N); return W; } });
});
await page.goto(`file://${IN}#view=R100(S100(@tomlarkworthy/coded-landmark-tracking))`, { waitUntil: "networkidle", timeout: 300000 });
await page.waitForFunction(() => document.querySelectorAll("#lopepage-2 .observablehq").length > 20, { timeout: 300000 });
await page.waitForTimeout(20000);
console.log(JSON.stringify(await page.evaluate(async () => {
  const rt = (window as any).__ojs_runtime;
  let f: any = null, names: string[] = [];
  for (const v of rt._variables) {
    if (typeof v._name === "string" && /export|sip|fork|book/i.test(v._name)) names.push(v._name);
    if (v._name === "exportToHTML" && v._value) f = v._value;
  }
  const r: any = await f({});
  return {
    candidates: [...new Set(names)],
    type: typeof r,
    ctor: r && r.constructor && r.constructor.name,
    keys: r && typeof r === "object" ? Object.keys(r).slice(0, 20) : null,
    isBlob: typeof Blob !== "undefined" && r instanceof Blob,
    size: r && r.size, blobType: r && r.type
  };
}, null), null, 2));
await browser.close();
