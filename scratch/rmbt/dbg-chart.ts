import { chromium } from "playwright";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
page.on("pageerror", (e) => console.error("PAGEERROR", e.message.slice(0, 250)));
await page.addInitScript(() => {
  const orig = (window as any).Runtime; let cap = false;
  Object.defineProperty(window, "Runtime", { get() { return orig; }, set(N: any) {
    const W = function (this: any, ...a: any[]) { const i = new N(...a); if (!cap) { (window as any).__ojs_runtime = i; cap = true; } return i; };
    W.prototype = N.prototype; Object.assign(W, N); return W; } });
});
await page.goto("http://localhost:8791/tomlarkworthy_coded-landmark-tracking.html", { waitUntil: "networkidle", timeout: 180000 });
await page.waitForFunction(() => !!(window as any).__ojs_runtime, { timeout: 180000 });
await page.waitForTimeout(12000);
const out = await page.evaluate(async () => {
  const mod = (window as any).__ojs_runtime.mains.get("@tomlarkworthy/coded-landmark-tracking");
  const v = async (n: string) => { try { return await mod.value(n); } catch (e: any) { return { ERR: String(e && e.message || e) }; } };
  const fig: any = await v("warmupCurveChart");
  const d: any = await v("warmupCurve");
  const md1: any = await v("wasm_md");
  const md2: any = await v("wasm_md2");
  return {
    figTag: fig && fig.tagName, hasSvg: !!(fig && fig.querySelector && fig.querySelector("svg")),
    svgCount: fig && fig.querySelectorAll ? fig.querySelectorAll("svg").length : 0,
    paths: fig && fig.querySelectorAll ? fig.querySelectorAll("path").length : 0,
    captionLen: fig && fig.querySelector ? (fig.querySelector("figcaption")?.textContent || "").length : 0,
    series: d.runs ? d.runs.length : d,
    md1: md1 && md1.textContent ? md1.textContent.slice(0, 60) : md1,
    md2: md2 && md2.textContent ? md2.textContent.slice(0, 60) : md2
  };
});
console.log(JSON.stringify(out, null, 2));
const el = await page.evaluateHandle(async () => {
  const mod = (window as any).__ojs_runtime.mains.get("@tomlarkworthy/coded-landmark-tracking");
  const f = await mod.value("warmupCurveChart");
  const host = document.createElement("div");
  host.style.cssText = "position:fixed;top:0;left:0;background:#fff;padding:16px;z-index:99999";
  host.appendChild(f.cloneNode(true));
  document.body.appendChild(host);
  return host;
});
await (el as any).screenshot({ path: "scratch/rmbt/warmup-figure.png" });
await browser.close();
console.log("screenshot -> scratch/rmbt/warmup-figure.png");
