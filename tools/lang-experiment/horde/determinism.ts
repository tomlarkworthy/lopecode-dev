// bun horde/determinism.ts : same seed, 360 frames, 10k agents (and 1M on four arms), bullets firing; the agent and bullet
// bit hashes for the main thread, 1, 2, 8 and 17 workers in each transport, and lite's pool.
import { chromium } from "../../../node_modules/playwright/index.mjs";
import { resolve, join } from "node:path";
const port = 8766;
const server = Bun.spawn(["bun", join(import.meta.dir, "serve.ts"), String(port)], { stdout: "ignore" });
await Bun.sleep(400);
const browser = await chromium.launch();
const fileUrl = "file://" + resolve(import.meta.dir, "proto/bench.html");
const runs = [["main", 0], ...["copy", "transfer", "sab"].flatMap((m) => [1, 2, 8, 17].map((w) => [m, w])), ["lite", 8]].map(([m, w]) => [m, w, 10000]) as [string, number, number][];
// a million agents: the main thread's single batch records thousands of hits a frame
runs.push(["main", 0, 1000000], ["transfer", 17, 1000000], ["sab", 8, 1000000], ["lite", 8, 1000000]);
const hashes = new Map<string, string[]>();
for (const [mode, w, n] of runs) {
  const page = await browser.newPage();
  const base = mode === "sab" ? `http://localhost:${port}/bench.html` : fileUrl;
  await page.goto(`${base}?mode=${mode}&workers=${w}&n=${n}&warm=0&frames=360`);
  const r: any = await page.waitForFunction(() => (window as any).__bench, null, { timeout: 120000 }).then((h) => h.jsonValue());
  await page.close();
  console.log(`n ${String(n).padStart(7)} ${mode.padEnd(8)} workers ${String(r.workers).padStart(2)}  hash ${r.hash}  kills ${r.score}`);
  hashes.set(n + ":" + r.hash, [...(hashes.get(n + ":" + r.hash) ?? []), `${mode}/${r.workers}`]);
}
console.log(hashes.size === 2 ? `all ${runs.length} runs bit-identical within each n` : `DIFFER: ${JSON.stringify([...hashes])}`);
await browser.close();
server.kill();
