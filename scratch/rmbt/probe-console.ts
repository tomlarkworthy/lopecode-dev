import { chromium } from "playwright";
const b = await chromium.launch({ headless: true });
const page = await (await b.newContext({ viewport: { width: 1400, height: 1000 } })).newPage();
const t0 = Date.now();
page.on("console", (m) => {
  const s = m.text();
  if (/module_definition|error loading module|generate summary|Bootloader/.test(s))
    console.log(String(Date.now() - t0).padStart(6) + "ms  " + s.slice(0, 120));
});
await page.addInitScript(() => {
  (window as any).__live = () => { const pr = document.getElementById("lope-prerender");
    return [...document.querySelectorAll("#lopepage-2 .observablehq")].filter((n) => !pr || !pr.contains(n)).length; };
});
await page.goto(process.argv[2], { waitUntil: "commit", timeout: 300000 });
await page.waitForFunction(() => (window as any).__live() > 3, { timeout: 300000 });
console.log(String(Date.now() - t0).padStart(6) + "ms  MOUNT");
await b.close();
