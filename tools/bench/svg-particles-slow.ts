// The same sheet under CDP CPU throttling. On an M-series Mac almost everything
// clears 60fps at corepox's real particle counts, so the unthrottled sheet ranks
// techniques it cannot separate. Throttling restores the ordering a mid-range
// machine would feel. Raster/composite are NOT throttled by this -- only the
// main thread -- so it prices SCRIPT cost, and the filter rows stay honest.
import { chromium } from "playwright";

const RATE = Number(process.argv[2] ?? 6);
const NS = [500, 1000, 2000, 4000];
const TECHS = ["circle-recreate-bloom", "circle-attr-bloom", "circle-attr-opacity",
               "circle-gradient", "use-symbol", "poly-tri", "ellipse-streak",
               "path-dots-bloom", "path-dots-buckets-bloom", "path-streak-buckets",
               "path-tris", "canvas2d"];

const med = (a: number[]) => { const s = [...a].sort((x, y) => x - y); return s[s.length >> 1]; };

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage({ viewport: { width: 1300, height: 760 } });
const cdp = await page.context().newCDPSession(page);
await page.goto("file://" + import.meta.dir + "/svg-particles.html");
await page.waitForFunction("window.TECHS");
await cdp.send("Emulation.setCPUThrottlingRate", { rate: RATE });
console.log(`CPU throttled ${RATE}x\n`);

const rows: any[] = [];
for (const t of TECHS) {
  const line: string[] = [];
  for (const n of NS) {
    const r: any = await page.evaluate(([t, n]) => (window as any).run(t, n, 60, 20), [t, n] as any);
    const ms = med(r.iv), js = med(r.js);
    rows.push({ tech: t, n, ms, js });
    line.push(`n=${n} ${ms.toFixed(1)}ms/${(1000 / ms).toFixed(0)}fps js${js.toFixed(1)}`);
  }
  console.log(t.padEnd(24) + line.join("  "));
}
await Bun.write(`${import.meta.dir}/svg-particles-slow-${RATE}x.json`, JSON.stringify(rows, null, 1));
await browser.close();
