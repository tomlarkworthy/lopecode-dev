// "it should not take 134ms! and also I moved it to the top where it should stay"
//
// Two claims to check on a cold page, because both failure modes only exist on
// a cold page: the taster must sit above the contents list, and the number in
// its caption must be the pooled path warmed rather than a first call at boot.
// A booted-and-settled runtime cannot show either -- this has to be the load.
import { chromium } from "playwright";
import { resolve } from "node:path";
const IN = resolve("lopebooks/notebooks/tomlarkworthy_coded-landmark-tracking.html");
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 2000 } });
const errs: string[] = [];
page.on("pageerror", (e) => errs.push(e.message.slice(0, 160)));
await page.addInitScript(() => {
  const orig = (window as any).Runtime; let cap = false;
  Object.defineProperty(window, "Runtime", { get() { return orig; }, set(N: any) {
    const W = function (this: any, ...a: any[]) { const i = new N(...a); if (!cap) { (window as any).__ojs_runtime = i; cap = true; } return i; };
    W.prototype = N.prototype; Object.assign(W, N); return W; } });
});
await page.goto(`file://${IN}#view=S100(@tomlarkworthy/coded-landmark-tracking)`, { waitUntil: "networkidle", timeout: 300000 });
await page.waitForFunction(() => !!(window as any).__ojs_runtime, { timeout: 300000 });
// The taster is whenVisible-gated and now sits at the top, so it should resolve
// without scrolling anywhere.
await page.waitForFunction(() => {
  const t = [...document.querySelectorAll("#lopepage-2 .observablehq")]
    .find((z) => /read here in/.test(z.textContent || ""));
  return !!t;
}, { timeout: 300000 });
await page.waitForTimeout(4000);

const out = await page.evaluate(() => {
  const rt = (window as any).__ojs_runtime;
  const mod = rt.mains.get("@tomlarkworthy/coded-landmark-tracking");
  const vars = [...rt._variables].filter((v: any) => v._module === mod);
  const val = (n: string) => { const v: any = vars.find((z: any) => z._name === n); return v ? v._value : undefined; };
  const root = document.querySelector("#lopepage-2") || document.body;
  const y = (needle: string) => {
    const n = [...root.querySelectorAll(".observablehq")].find((z) => (z.textContent || "").includes(needle));
    return n ? Math.round((n as any).getBoundingClientRect().top + window.scrollY) : null;
  };
  const cap = [...root.querySelectorAll("figcaption")].find((z) => /read here in/.test(z.textContent || ""));
  const text = cap ? (cap.textContent || "").replace(/\s+/g, " ").trim() : null;
  const m = text && text.match(/read here in ([\d.]+)ms/);
  return {
    ms: m ? parseFloat(m[1]) : null,
    caption: text ? text.slice(0, 190) : null,
    yTaster: y("read here in"),
    yToc: y("The barcode mark"),
    yHeadline: y("Fast Multi-Target"),
    poolSize: val("poolSize")
  };
});
const ok = (b: boolean) => (b ? "ok  " : "FAIL");
console.log(JSON.stringify(out, null, 1));
console.log(ok(out.yHeadline! < out.yTaster!), "taster is below the headline");
console.log(ok(out.yTaster! < out.yToc!), "taster is ABOVE the contents list");
console.log(ok(out.ms !== null && out.ms < 10), `caption reports ${out.ms}ms, must be well under the 27ms main-thread arm`);
console.log("pageerrors:", errs.length ? errs.slice(0, 3) : "none");
await browser.close();
