import { chromium } from "playwright";
import { resolve } from "node:path";
const NB = resolve("lopebooks/notebooks/tomlarkworthy_coded-landmark-tracking.html");
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
const errs: string[] = [];
page.on("pageerror", (e) => errs.push("PAGEERROR: " + e.message));
page.on("console", (m) => { if (m.type() === "error") errs.push("CONSOLE: " + m.text().slice(0, 200)); });
await page.addInitScript(() => {
  const orig = (window as any).Runtime; let cap = false;
  Object.defineProperty(window, "Runtime", { get() { return orig; },
    set(N: any) { const W = function (this: any, ...a: any[]) { const i = new N(...a); if (!cap) { (window as any).__ojs_runtime = i; cap = true; } return i; }; W.prototype = N.prototype; Object.assign(W, N); return W; } });
});
await page.goto(`file://${NB}`, { waitUntil: "networkidle", timeout: 180000 });
await page.waitForFunction(() => !!(window as any).__ojs_runtime, { timeout: 180000 });
await page.waitForTimeout(20000);

const out = await page.evaluate(async () => {
  const rt = (window as any).__ojs_runtime;
  const mod = rt.mains.get("@tomlarkworthy/coded-landmark-tracking");
  const vars = [...rt._variables].filter((v: any) => v._module === mod);
  const order: string[] = [], bad: string[] = [];
  for (const v of vars) {
    const n = v._name ?? "(anon)";
    order.push(n);
    try { await v._module.value(n); } catch (e: any) { bad.push(`${n}: ${String(e && e.message || e).slice(0, 140)}`); }
  }
  // did the markdown render, or is it showing escapes?
  const mdText = (name: string) => {
    const v = vars.find((z: any) => z._name === name);
    return v && v._value && v._value.textContent ? v._value.textContent.slice(0, 120) : "(no node)";
  };
  return { count: vars.length, order, bad,
           headline: mdText("headline_md"), algo: mdText("algo_md"), enc: mdText("redesign_md") };
});
await browser.close();
console.log(`module variables: ${out.count}`);
console.log(`\nERRORS (${out.bad.length}):`); for (const b of out.bad) console.log("  " + b);
console.log(`\npage errors (${errs.length}):`); for (const e of errs.slice(0, 8)) console.log("  " + e);
console.log(`\nheadline: ${out.headline}`);
console.log(`algo:     ${out.algo}`);
console.log(`encoding: ${out.enc}`);
console.log(`\norder:\n  ${out.order.join(", ")}`);
