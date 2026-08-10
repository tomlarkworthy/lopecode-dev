// "the About seems out of order" -- About was a child of The Scanner and came
// after it, so the scanner's usage note, the taster and the whole rig rendered
// INSIDE a subsection called About, and The Scanner had no content of its own.
// Checks the rendered page, not the source: contents list order, heading order
// down the page, heading LEVEL (About must stop being an H3), and that the
// taster did not move relative to the prose above it.
import { chromium } from "playwright";
import { resolve } from "node:path";
const IN = resolve("lopebooks/notebooks/tomlarkworthy_coded-landmark-tracking.html");
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 2400 } });
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
await page.waitForFunction(() => document.querySelectorAll("#lopepage-2 .observablehq").length > 20, { timeout: 300000 });
for (let i = 0; i < 6; i++) { await page.evaluate((k) => window.scrollTo(0, k * 900), i); await page.waitForTimeout(500); }
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(12000);

const out = await page.evaluate(() => {
  const rt = (window as any).__ojs_runtime;
  const mod = rt.mains.get("@tomlarkworthy/coded-landmark-tracking");
  const vars = [...rt._variables].filter((v: any) => v._module === mod);
  const val = (n: string) => { const v: any = vars.find((z: any) => z._name === n); return v ? v._value : undefined; };
  const root = document.querySelector("#lopepage-2") || document.body;
  const heads = [...root.querySelectorAll("h1,h2,h3")]
    .map((h: any) => ({ tag: h.tagName, text: (h.textContent || "").replace(/\s+/g, " ").trim().slice(0, 40),
                        y: Math.round(h.getBoundingClientRect().top + window.scrollY) }))
    .filter((h) => h.text).sort((a, b) => a.y - b.y).slice(0, 7);
  const toc = val("toc");
  const strip = (x: any) => (typeof x === "string" ? x : (x && x.textContent) || String(x));
  const yOf = (needle: string) => {
    const n = [...root.querySelectorAll(".observablehq")].find((z) => (z.textContent || "").includes(needle));
    return n ? Math.round((n as any).getBoundingClientRect().top + window.scrollY) : null;
  };
  return {
    heads,
    tocFirst: toc ? strip(toc).replace(/\s+/g, " ").trim().slice(0, 80) : null,
    yAbout: yOf("Part V of a super long"),
    yUsage: yOf("This lets you run the barcode matcher"),
    yTaster: yOf("read here in"),
    audit: strip(val("sectionAudit")).replace(/\s+/g, " ").trim()
  };
});
console.log(JSON.stringify(out, null, 1));
console.log("pageerrors:", errs.length ? errs.slice(0, 3) : "none");
await browser.close();
