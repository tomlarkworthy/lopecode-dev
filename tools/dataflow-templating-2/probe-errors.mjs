// Just boots a page and reports console/page errors — the control for probe-home-notebook.mjs.
import { chromium } from "playwright";
const browser = await chromium.launch();
for (const f of process.argv.slice(2)) {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await page.goto("file://" + f, { waitUntil: "load" });
  await page.waitForTimeout(12000);
  console.log(f.split("/").pop(), "->", errors.length ? errors : "no errors");
  await page.close();
}
await browser.close();
