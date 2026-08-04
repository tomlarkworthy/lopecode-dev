import { chromium } from "playwright";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
page.on("pageerror", (e) => console.error("PAGEERROR", e.message.slice(0, 200)));
await page.addInitScript(() => {
  const orig = (window as any).Runtime; let cap = false;
  Object.defineProperty(window, "Runtime", { get() { return orig; }, set(N: any) {
    const W = function (this: any, ...a: any[]) { const i = new N(...a); if (!cap) { (window as any).__ojs_runtime = i; cap = true; } return i; };
    W.prototype = N.prototype; Object.assign(W, N); return W; } });
});
await page.goto("http://localhost:8791/tomlarkworthy_coded-landmark-tracking.html", { waitUntil: "networkidle", timeout: 180000 });
await page.waitForFunction(() => !!(window as any).__ojs_runtime, { timeout: 180000 });
await page.waitForTimeout(10000);
console.log(JSON.stringify(await page.evaluate(async () => {
  const rt = (window as any).__ojs_runtime;
  const mod = rt.mains.get("@tomlarkworthy/coded-landmark-tracking");
  const probe = mod.variable();
  probe.define("__plotProbe", ["Plot"], (P: any) => {
    const svg = P.plot({ marks: [P.line([{ x: 1, y: 1 }, { x: 2, y: 4 }], { x: "x", y: "y" })] });
    return { version: P.version ?? "?", tag: svg.tagName, kids: svg.childNodes.length };
  });
  try { return { ok: true, ...(await probe.value ? {} : {}), result: await mod.value("__plotProbe") }; }
  catch (e: any) { return { ok: false, err: String(e && e.message || e) }; }
}, null), null, 2));
await browser.close();
