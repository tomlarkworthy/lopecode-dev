// Catch the moment a cell renders the runtime's internal `variable_stale`
// function as if it were a value, and record what the node actually is.
import { chromium } from "playwright";

const url = process.argv[2];
const cell = process.argv[3] ?? "hexTaster";

const b = await chromium.launch({ headless: true });
const page = await (await b.newContext({ viewport: { width: 1400, height: 1000 } })).newPage();

await page.addInitScript(([cell]) => {
  const t0 = performance.now();
  const hits: any[] = [];
  (window as any).__hits = hits;
  const snap = () => {
    for (const host of document.querySelectorAll(`[cell="${cell}"]`)) {
      const txt = (host as HTMLElement).innerText || "";
      if (!/variable_stale/.test(txt)) continue;
      const inner = host.firstElementChild;
      const key = inner ? inner.className + "|" + txt.slice(0, 60) : txt.slice(0, 60);
      if (hits.some((h) => h.key === key)) continue;
      hits.push({
        t: Math.round(performance.now() - t0),
        key,
        innerClass: inner ? inner.className : null,
        // an error box and a rendered value are different nodes
        isError: !!host.querySelector(".observablehq--error, .observablehq--inspect-error"),
        html: host.innerHTML.slice(0, 400),
        inPrerender: !!(document.getElementById("lope-prerender")?.contains(host)),
      });
    }
  };
  new MutationObserver(snap).observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  setInterval(snap, 50);
}, [cell]);

await page.goto(url, { waitUntil: "commit", timeout: 300000 });
await page.waitForTimeout(45000);

const hits = await page.evaluate(() => (window as any).__hits);
await b.close();
console.log(JSON.stringify(hits, null, 1));
