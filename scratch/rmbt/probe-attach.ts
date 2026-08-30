// When does a block first exist, and when does it get a nextSibling?
import { chromium } from "playwright";
const b = await chromium.launch({ headless: true });
const page = await (await b.newContext()).newPage();
await page.addInitScript(() => {
  const t0 = performance.now(); const T: any[] = []; (window as any).__t = T;
  const ids = ["bootconf.json", "@tomlarkworthy/bootloader", "@tomlarkworthy/annotate"];
  const seen = new Set<string>();
  const tick = () => {
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el && !seen.has(id + ":exists")) { seen.add(id + ":exists");
        T.push([Math.round(performance.now() - t0), "exists", id, (el.textContent || "").length]); }
      if (el && el.nextSibling && !seen.has(id + ":sib")) { seen.add(id + ":sib");
        T.push([Math.round(performance.now() - t0), "nextSibling", id, el.nextSibling.nodeName]); }
    }
    if (seen.size < ids.length * 2) setTimeout(tick, 50);
  };
  tick();
});
await page.goto(process.argv[2], { waitUntil: "load", timeout: 300000 });
for (const [ms, what, id, extra] of await page.evaluate(() => (window as any).__t))
  console.log(String(ms).padStart(6) + "ms " + String(what).padEnd(12) + String(id).padEnd(28) + extra);
await b.close();
