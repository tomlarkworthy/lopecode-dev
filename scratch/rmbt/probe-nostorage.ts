// Reported 2026-08-13: after forking to a blob: URL,
//   hexTaster = RuntimeError: Failed to read the 'localStorage' property from
//   'Window': Access is denied for this document.
// A blob: fork runs on an opaque origin where READING window.localStorage
// throws a SecurityError. Simulated here by making the getter throw, which is
// what the opaque origin does, so the repro needs no fork.
import { chromium } from "playwright";
import { resolve } from "node:path";
const IN = resolve("lopebooks/notebooks/tomlarkworthy_coded-landmark-tracking.html");
const b = await chromium.launch({ headless: true });
const page = await b.newPage({ viewport: { width: 1400, height: 1200 } });
await page.addInitScript(() => {
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    get() { throw new DOMException("Failed to read the 'localStorage' property from 'Window': Access is denied for this document.", "SecurityError"); }
  });
  const orig = (window as any).Runtime; let cap = false;
  Object.defineProperty(window, "Runtime", { get() { return orig; }, set(N: any) {
    const W = function (this: any, ...a: any[]) { const i = new N(...a); if (!cap) { (window as any).__ojs_runtime = i; cap = true; } return i; };
    W.prototype = N.prototype; Object.assign(W, N); return W; } });
});
await page.goto(`file://${IN}#view=S100(@tomlarkworthy/coded-landmark-tracking)`, { waitUntil: "networkidle", timeout: 300000 });
await page.waitForFunction(() => !!(window as any).__ojs_runtime, { timeout: 300000 });
await page.waitForFunction(() => document.querySelectorAll("#lopepage-2 .observablehq").length > 20, { timeout: 300000 });
for (let i = 0; i < 12; i++) { await page.evaluate((k) => window.scrollTo(0, k * 900), i); await page.waitForTimeout(250); }
await page.waitForTimeout(20000);
const out = await page.evaluate(() => {
  const rt = (window as any).__ojs_runtime;
  const mod = rt.mains.get("@tomlarkworthy/coded-landmark-tracking");
  const errs: any = {};
  for (const v of rt._variables) {
    if (v._module !== mod || !v._name) continue;
    const val = v._value;
    if (val instanceof Error) errs[v._name] = String(val.message).slice(0, 90);
  }
  const shown = [...document.querySelectorAll("#lopepage-2 .observablehq--error")]
    .map((e) => (e as HTMLElement).innerText.replace(/\s+/g, " ").slice(0, 90));
  return { errored: errs, shownErrors: shown.slice(0, 6), shownCount: shown.length };
});
await b.close();
console.log(JSON.stringify(out, null, 1));
const n = Object.keys(out.errored).length;
console.log(`${n === 0 && out.shownCount === 0 ? "PASS" : "FAIL"}  storage-denied page: ${n} errored variables, ${out.shownCount} error boxes`);
