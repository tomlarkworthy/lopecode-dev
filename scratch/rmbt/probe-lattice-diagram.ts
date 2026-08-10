// Does ringLatticeDiagram resolve? It is whenVisible-gated and sits deep in §4.7,
// so probe-prose.ts's fixed scroll walk never reached it and reported svg 0 --
// which is indistinguishable from a cell that threw. Scroll to it by name.
import { chromium } from "playwright";
import { resolve } from "node:path";
const IN = resolve("lopebooks/notebooks/tomlarkworthy_coded-landmark-tracking.html");
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errs: string[] = [];
page.on("pageerror", (e) => errs.push(e.message.slice(0, 200)));
await page.goto(`file://${IN}#view=S100(@tomlarkworthy/coded-landmark-tracking)`, { waitUntil: "networkidle", timeout: 300000 });
await page.waitForFunction(() => document.querySelectorAll("#lopepage-2 .observablehq").length > 20, { timeout: 300000 });
await page.waitForTimeout(8000);
for (let pass = 0; pass < 3; pass++) {
  const n = await page.evaluate(() => document.querySelectorAll("#lopepage-2 .observablehq").length);
  for (let i = 0; i < n; i++) {
    await page.evaluate((k) => document.querySelectorAll("#lopepage-2 .observablehq")[k]?.scrollIntoView({ block: "center" }), i);
    await page.waitForTimeout(60);
  }
  await page.waitForTimeout(6000);
  const hit = await page.evaluate(() => {
    const n2 = [...document.querySelectorAll("#lopepage-2 .observablehq")]
      .find((z) => /crossings on one mark/.test(z.textContent || ""));
    if (!n2) return null;
    const cv: any = n2.querySelector("canvas");
    // The dots are pixels now, so count coloured ones rather than DOM nodes.
    let coloured = 0;
    if (cv) {
      const d = cv.getContext("2d").getImageData(0, 0, cv.width, cv.height).data;
      for (let i = 0; i < d.length; i += 4)
        if (Math.max(d[i], d[i + 1], d[i + 2]) - Math.min(d[i], d[i + 1], d[i + 2]) > 40) coloured++;
    }
    return { caption: (n2.textContent || "").replace(/\s+/g, " ").trim().slice(0, 320),
             canvas: cv ? `${cv.width}x${cv.height}` : null, colouredPx: coloured,
             svgCircles: n2.querySelectorAll("circle").length };
  });
  if (hit) { console.log(JSON.stringify(hit, null, 1)); break; }
  console.log(`pass ${pass}: not resolved yet`);
}
console.log("pageerrors:", errs.length ? errs.slice(0, 5) : "none");
await browser.close();
