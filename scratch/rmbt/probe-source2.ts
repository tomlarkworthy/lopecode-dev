// At the instant the source hook returns: how long is the block, does it have a nextSibling,
// is streaming still on, and how many elements carry that id?
import { chromium } from "playwright";
const b = await chromium.launch({ headless: true });
const page = await (await b.newContext({ viewport: { width: 1400, height: 1000 } })).newPage();
await page.addInitScript(() => {
  const t0 = performance.now();
  const log: any[] = []; (window as any).__srclog = log;
  const count = (id: string) => [...document.querySelectorAll("script[id]")].filter((e: any) => e.id === id).length;
  let stored: any;
  Object.defineProperty(window, "esmsInitOptions", {
    configurable: true,
    get() { return stored; },
    set(v) {
      const orig = v.source;
      v.source = async function (url: string, ...rest: any[]) {
        const id = String(url).startsWith("file://") ? String(url).slice(7) : String(url);
        const r = await orig.apply(this, [url, ...rest]);
        const el = document.getElementById(id);
        log.push({
          t: Math.round(performance.now() - t0), id,
          read: typeof r?.source === "string" ? r.source.length : -1,
          len: el ? (el.textContent || "").length : -1,
          sib: el ? (el.nextSibling ? (el.nextSibling.nodeName + "#" + ((el.nextSibling as any).id || "") + "." + ((el.nextSibling as any).className || "")) : "NULL") : "no-el",
          streaming: (window as any).__lopeStreaming,
          dupes: count(id),
          readyState: document.readyState
        });
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
  const out = [] as any[];
  for (const r of (window as any).__srclog) {
    const el = document.getElementById(r.id);
    out.push({ ...r, final: el ? (el.textContent || "").length : -1 });
  }
  return out;
});
await b.close();
for (const r of rows) {
  const bad = r.read > 0 && r.final > 0 && r.len > 0 && r.len < r.final;
  if (bad || /annotate|editor-5|coded-landmark/.test(r.id))
    console.log(String(r.t).padStart(6) + "ms " + String(r.id).slice(0, 40).padEnd(42) +
      "read=" + String(r.read).padStart(7) + " lenAtReturn=" + String(r.len).padStart(7) +
      " final=" + String(r.final).padStart(7) + " sib=" + String(r.sib).padEnd(6) +
      " streaming=" + r.streaming + " dupes=" + r.dupes + " rs=" + r.readyState + (bad ? "   PARTIAL" : ""));
}
