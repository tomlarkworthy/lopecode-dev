// bun horde/play-measure.ts [--headed] [seconds] : game.html in its rAF loop, the bot playing in god mode, for each
// arm (workers off = main thread, workers on = transfer to hardwareConcurrency-1). Prints window.__measure;
// appends to horde/play-results.json. Headed mode opens a visible Chromium window (real display vsync).
import { chromium } from "../../../node_modules/playwright/index.mjs";
import { resolve, join } from "node:path";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
const headed = process.argv.includes("--headed");
const seconds = +(process.argv.find((a) => /^\d+$/.test(a)) || 60);
const url = "file://" + resolve(import.meta.dir, "proto/game.html");
const arms = (process.env.ARMS || "n=100000&wave=6&mode=main;n=100000&wave=6&mode=transfer&workers=17;n=50000&wave=6&mode=main;n=50000&wave=6&mode=transfer&workers=17").split(";");
const browser = await chromium.launch({ headless: !headed });
const out = existsSync(join(import.meta.dir, "play-results.json")) ? JSON.parse(readFileSync(join(import.meta.dir, "play-results.json"), "utf8")) : [];
for (const arm of arms) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on("pageerror", (e) => console.log("pageerror", e.message));
  await page.goto(`${url}?${arm}&measure=${seconds}&w=1280&h=800`, { waitUntil: "commit" });
  await page.waitForFunction(() => (window as any).__ready, null, { timeout: (seconds + 60) * 1000 });
  const m = await page.evaluate(() => (window as any).__measure || (window as any).__error);
  const row = { date: new Date().toISOString(), headed, arm, dpr: await page.evaluate(() => devicePixelRatio), ...m };
  console.log(JSON.stringify(row));
  out.push(row);
  await page.close();
}
writeFileSync(join(import.meta.dir, "play-results.json"), JSON.stringify(out, null, 1));
await browser.close();
