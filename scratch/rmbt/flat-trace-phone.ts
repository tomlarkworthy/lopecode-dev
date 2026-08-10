// What the notebook looks like on a phone, and how long boot takes there.
import { chromium, devices } from "playwright";
import { resolve } from "node:path";
const NB = resolve("lopebooks/notebooks/tomlarkworthy_flat-trace.html");
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ ...devices["Pixel 7"], permissions: [] });
const page = await ctx.newPage();
const errs: string[] = [];
page.on("pageerror", (e) => errs.push("pageerror: " + e.message));
page.on("console", (m) => { const t = m.text(); if (m.type() === "error" && !t.includes("Not allowed to load local resource")) errs.push("console: " + t.slice(0, 200)); });
const t0 = Date.now();
await page.goto(`file://${NB}`, { waitUntil: "networkidle", timeout: 180000 });
await page.waitForTimeout(9000);
console.log("boot (headless desktop CPU, phone viewport):", Date.now() - t0, "ms");
await page.screenshot({ path: "tools/screenshots/flat-trace-phone-top.png" });
// how wide does anything overflow?
const overflow = await page.evaluate(() => {
  const de = document.documentElement;
  return { scrollW: de.scrollWidth, clientW: de.clientWidth, overflows: de.scrollWidth > de.clientWidth + 2 };
});
console.log(JSON.stringify(overflow));
await page.evaluate(() => window.scrollBy(0, 1400));
await page.waitForTimeout(800);
await page.screenshot({ path: "tools/screenshots/flat-trace-phone-2.png" });
await browser.close();
if (errs.length) console.log([...new Set(errs)].slice(0, 10).join("\n"));
