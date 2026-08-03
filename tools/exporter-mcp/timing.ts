// Boot-time comparison: exporter-3 vs exporter-mcp serialization of the same notebook.
import { chromium } from "playwright";
import { resolve } from "node:path";
const files = process.argv.slice(2);
const browser = await chromium.launch({ headless: true });
for (const f of files) {
  const runs: number[] = [];
  for (let i = 0; i < 3; i++) {
    const page = await browser.newPage();
    await page.route("**/*", (r) => (r.request().url().startsWith("file:") ? r.continue() : r.abort()));
    const t0 = Date.now();
    await page.goto(`file://${resolve(f)}`, { waitUntil: "load" });
    await page.waitForSelector(".observablehq", { timeout: 60000 });
    runs.push(Date.now() - t0);
    await page.close();
  }
  console.log(`${f.padEnd(48)} first cell: ${runs.map(r => r + "ms").join("  ")}`);
}
await browser.close();
