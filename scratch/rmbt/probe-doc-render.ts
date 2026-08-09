import { chromium } from "playwright";
import { resolve } from "node:path";
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
const out = await page.evaluate(() => {
  const rt = (window as any).__ojs_runtime;
  const mod = rt.mains.get("@tomlarkworthy/coded-landmark-tracking");
  const el = [...rt._variables]
    .filter((z: any) => z._module === mod)
    .map((z: any) => z._value)
    .find((x: any) => x && x.querySelector && /Scanning orthogonally/.test(x.textContent || ""));
  if (!el || !el.querySelectorAll) return { found: false };
  const rows = [...el.querySelectorAll("tr")].map((r: any) => [...r.children].map((c: any) => c.textContent.trim()).join(" | "));
  return { found: true, heading: el.querySelector("h4")?.textContent,
    tables: el.querySelectorAll("table").length, rows,
    bold: [...el.querySelectorAll("strong")].map((b: any) => b.textContent),
    chars: el.textContent.length, li: el.querySelectorAll("li").length };
});
console.log(JSON.stringify(out, null, 1));
console.log("pageerrors:", errs.length ? errs.slice(0, 3) : "none");
await browser.close();
