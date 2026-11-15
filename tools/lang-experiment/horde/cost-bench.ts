// bun horde/cost-bench.ts [reps] : what strict indexing costs. Runs bench.html for each generated sim
// arm, interleaved (arm order rotates each rep), main thread and transfer/8, at 10k/100k/400k agents.
// Arms: strict1/raw1 = first strict version (every read through at()) and the same text with a[i];
// strict/raw = the restructured version (per-frame values read once, one range per 3-cell row).
// Writes horde/cost-results.json.
import { chromium } from "../../../node_modules/playwright/index.mjs";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
const reps = +(process.argv[2] || 3);
const arms = ["strict1", "raw1", "strict", "raw"];
const sizes: [number, number, number][] = [[10000, 200, 300], [100000, 150, 200], [400000, 60, 80]];
const modes = [["main", 0], ["transfer", 8]] as const;
const browser = await chromium.launch();
const rows: any[] = [];
for (let r = 0; r < reps; r++) for (const [n, warm, frames] of sizes) for (const [mode, workers] of modes) {
  const order = arms.map((_, i) => arms[(i + r) % arms.length]);
  for (const sim of order) {
    const page = await browser.newPage();
    await page.goto(`file://${join(import.meta.dir, "proto/bench.html")}?mode=${mode}&workers=${workers}&n=${n}&warm=${warm}&frames=${frames}&sim=${sim}`, { waitUntil: "commit" });
    const b: any = await page.waitForFunction(() => (window as any).__bench, null, { timeout: 600000 }).then((h) => h.jsonValue());
    await page.close();
    if (b.error) throw new Error(b.error);
    rows.push({ rep: r, sim, mode, workers, n, mean: b.totalMean, median: b.total, p90: b.totalP90, hash: b.hash });
    console.log(r, n, mode, sim, b.totalMean.toFixed(2), b.hash);
  }
}
await browser.close();
const out = { date: new Date().toISOString(), browser: "playwright chromium headless", rows };
writeFileSync(join(import.meta.dir, "cost-results.json"), JSON.stringify(out, null, 1));
