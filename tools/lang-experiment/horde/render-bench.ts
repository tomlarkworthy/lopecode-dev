// bun horde/render-bench.ts : game.html with the renderer, frames back to back (each waits for the GPU),
// 600 frames, medians over the last 480; per N and arm. Writes render-results.json.
import { chromium } from "../../../node_modules/playwright/index.mjs";
import { resolve, join } from "node:path";
import { writeFileSync } from "node:fs";
const url = "file://" + resolve(import.meta.dir, "proto/game.html");
const browser = await chromium.launch();
const out: any[] = [];
for (const n of [10000, 50000, 100000, 200000, 400000, 1000000]) for (const [mode, w] of [["main", 0], ["transfer", 8], ["transfer", 17]] as const) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto(`${url}?n=${n}&mode=${mode}&workers=${w}&measure=1&frames=600`);
  await page.waitForFunction(() => (window as any).__ready, null, { timeout: 600000 });
  const r = await page.evaluate(() => (window as any).__measure ?? { error: (window as any).__error });
  out.push(r);
  console.log(JSON.stringify(r));
  await page.close();
}
writeFileSync(join(import.meta.dir, "render-results.json"), JSON.stringify({ chromium: browser.version(), date: new Date().toISOString(), results: out }, null, 1));
await browser.close();
