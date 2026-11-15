// bun horde/bench.ts [--quick] : runs proto/bench.html in headless Chromium for every arm and N, after 900 warm-up
// frames (15 s: the horde has reached the player and is being shot).
// copy, transfer, lite and main from file://; sab from serve.ts (needs COOP/COEP). Writes bench-results.json.
import { chromium } from "../../../node_modules/playwright/index.mjs";
import { resolve, join } from "node:path";
import { writeFileSync } from "node:fs";
const quick = process.argv.includes("--quick");
const onlyArg = process.argv.find((a) => a.startsWith("--only="));
const only = onlyArg ? onlyArg.slice(7).split(",") : null;
const fileUrl = "file://" + resolve(import.meta.dir, "proto/bench.html");
const port = 8765;
const server = Bun.spawn(["bun", join(import.meta.dir, "serve.ts"), String(port)], { stdout: "ignore" });
await Bun.sleep(400);
const browser = await chromium.launch();
const hc = 18;
const Ns = quick ? [10000] : [10000, 50000, 100000, 200000, 400000];
const arms: { mode: string; workers: number }[] = [{ mode: "main", workers: 0 }];
for (const mode of ["transfer", "sab"]) for (const w of [8, hc - 1]) arms.push({ mode, workers: w });
arms.push({ mode: "copy", workers: hc - 1 }, { mode: "lite", workers: 8 });
const results: any[] = [];
for (const n of Ns) for (const a of arms) {
  if (only && !only.includes(a.mode)) continue;
  const page = await browser.newPage();
  const base = a.mode === "sab" ? `http://localhost:${port}/bench.html` : fileUrl;
  const frames = quick ? 120 : 240;
  await page.goto(`${base}?mode=${a.mode}&workers=${a.workers}&n=${n}&warm=900&frames=${frames}`, { waitUntil: "commit" });
  const r = await page.waitForFunction(() => (window as any).__bench, null, { timeout: 600000, polling: 100 }).then((h) => h.jsonValue());
  await page.close();
  results.push({ ...a, n, ...r });
  console.log(JSON.stringify({ ...a, n, ...r }));
}
writeFileSync(join(import.meta.dir, quick ? "bench-quick.json" : "bench-results.json"), JSON.stringify({ chromium: browser.version(), date: new Date().toISOString(), results }, null, 1));
await browser.close();
server.kill();
