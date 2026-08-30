// Wrap the es-module-shims source hook to see what the loader actually read, and when.
import { chromium } from "playwright";
const b = await chromium.launch({ headless: true });
const page = await (await b.newContext({ viewport: { width: 1400, height: 1000 } })).newPage();
await page.addInitScript(() => {
  const t0 = performance.now();
  const log: any[] = []; (window as any).__srclog = log;
  let stored: any;
  Object.defineProperty(window, "esmsInitOptions", {
    configurable: true,
    get() { return stored; },
    set(v) {
      const orig = v.source;
      v.source = async function (url: string, ...rest: any[]) {
        const id = String(url).startsWith("file://") ? String(url).slice(7) : String(url);
        const el = document.getElementById(id);
        const before = el ? (el.textContent || "").length : -1;
        const streaming = (window as any).__lopeStreaming;
        const sibling = el ? el.nextSibling ? el.nextSibling.nodeName : "none" : "no-el";
        const r = await orig.apply(this, [url, ...rest]);
        const len = typeof r?.source === "string" ? r.source.length : -1;
        log.push({ t: Math.round(performance.now() - t0), id: id.slice(0, 46), before, read: len, streaming, sibling });
        return r;
      };
      stored = v;
    }
  });
  (window as any).__live = () => { const pr = document.getElementById("lope-prerender");
    return [...document.querySelectorAll("#lopepage-2 .observablehq")].filter((n) => !pr || !pr.contains(n)).length; };
});
await page.goto(process.argv[2], { waitUntil: "commit", timeout: 300000 });
await page.waitForFunction(() => (window as any).__live() > 3, { timeout: 300000 });
await page.waitForTimeout(15000);
const rows = await page.evaluate(() => {
  const final: any = {};
  for (const r of (window as any).__srclog) {
    const el = document.getElementById(r.id);
    final[r.id] = el ? (el.textContent || "").length : -1;
  }
  return { log: (window as any).__srclog, final };
});
await b.close();
for (const r of rows.log) {
  const f = rows.final[r.id];
  const flag = r.read > 0 && f > 0 && r.read !== f ? "  TRUNCATED read=" + r.read + " final=" + f : "";
  if (flag || /annotate|editor-5/.test(r.id))
    console.log(String(r.t).padStart(6) + "ms " + r.id.padEnd(48) + "read=" + String(r.read).padStart(7) + " final=" + String(f).padStart(7) + " streaming=" + r.streaming + " sibling=" + r.sibling + flag);
}
