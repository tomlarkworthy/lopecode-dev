// Does the numbering come out right, does the contents list render, and does
// any cross-reference fail to resolve? A dangling ref renders as
// "[missing section: key]", so scanning the rendered DOM for that string is the
// whole check.
import { chromium } from "playwright";
import { resolve } from "node:path";
const IN = resolve("lopebooks/notebooks/tomlarkworthy_coded-landmark-tracking.html");
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });
const errs: string[] = [];
page.on("pageerror", (x) => errs.push(x.message.slice(0, 200)));
await page.addInitScript(() => {
  const orig = (window as any).Runtime; let cap = false;
  Object.defineProperty(window, "Runtime", { get() { return orig; }, set(N: any) {
    const W = function (this: any, ...a: any[]) { const i = new N(...a); if (!cap) { (window as any).__ojs_runtime = i; cap = true; } return i; };
    W.prototype = N.prototype; Object.assign(W, N); return W; } });
});
await page.goto(`file://${IN}#view=S100(@tomlarkworthy/coded-landmark-tracking)`, { waitUntil: "networkidle", timeout: 300000 });
await page.waitForFunction(() => !!(window as any).__ojs_runtime, { timeout: 300000 });
await page.waitForTimeout(20000);
const out = await page.evaluate(async () => {
  const rt = (window as any).__ojs_runtime;
  const mod = rt.mains.get("@tomlarkworthy/coded-landmark-tracking");
  const val = async (n: string) => {
    const v = [...rt._variables].find((z: any) => z._module === mod && z._name === n);
    return v ? await v._promise : null; };
  const idx: any = await val("sectionIndex");
  const toc: any = await val("toc");
  const headings = [...document.querySelectorAll("h2[id^=sec-],h3[id^=sec-],h4[id^=sec-],h5[id^=sec-]")]
    .map((h: any) => `${h.tagName} ${h.id.replace("sec-","")} :: ${h.textContent}`);
  const anchors = [...(toc?.querySelectorAll("a") ?? [])].map((a: any) => a.textContent);
  return {
    index: idx ? [...idx.values()].map((s: any) => `${s.num ?? "-"} ${s.title} (h${s.level})`) : null,
    tocAnchors: anchors, tocIsNav: toc?.tagName,
    headingsInDom: headings,
    missing: (document.body.textContent.match(/\[missing section: [a-z]+\]/g) ?? [])
  };
});
console.log("sectionIndex:"); for (const l of out.index ?? []) console.log("   " + l);
console.log(`\ntoc element: <${out.tocIsNav?.toLowerCase()}> with ${out.tocAnchors.length} entries`);
console.log(`headings rendered into the DOM: ${out.headingsInDom.length}`);
for (const h of out.headingsInDom.slice(0, 6)) console.log("   " + h);
console.log("   ...");
console.log("\nDANGLING REFERENCES:", out.missing.length ? out.missing : "none");
console.log("pageerrors:", errs.length ? errs.slice(0, 4) : "none");
await browser.close();
