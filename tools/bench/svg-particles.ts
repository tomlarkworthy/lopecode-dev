// Drives tools/bench/svg-particles.html in a REAL (headed) Chromium, because
// headless rasterises on SwiftShader and would misprice every filter and
// gradient in the sheet. One row per (technique, n): median frame interval,
// p90 interval, median script ms.
//
//   bun tools/bench/svg-particles.ts [--n 200,500,1000,2000,4000] [--only substr]
import { chromium } from "playwright";

const arg = (k: string, d: string) => {
  const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d;
};
const NS = arg("--n", "200,500,1000,2000,4000").split(",").map(Number);
const ONLY = arg("--only", "");
const FRAMES = Number(arg("--frames", "100"));

const med = (a: number[]) => { const s = [...a].sort((x, y) => x - y); return s[s.length >> 1]; };
const pct = (a: number[], p: number) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(s.length * p))]; };

const browser = await chromium.launch({ headless: false, args: ["--force-device-scale-factor=1"] });
const page = await browser.newPage({ viewport: { width: 1300, height: 760 } });
await page.goto("file://" + import.meta.dir + "/svg-particles.html");
await page.waitForFunction("window.TECHS");

const refresh = await page.evaluate(() => new Promise<number>(res => {
  const t: number[] = []; let last = 0;
  const tick = (n: number) => { if (last) t.push(n - last); last = n; t.length < 40 ? requestAnimationFrame(tick) : res(t.sort((a, b) => a - b)[20]); };
  requestAnimationFrame(tick);
}));
console.log(`display refresh: ${refresh.toFixed(1)} ms/frame (${(1000 / refresh).toFixed(0)} Hz)\n`);

const techs: string[] = (await page.evaluate("window.TECHS")) as string[];
const rows: any[] = [];
for (const t of techs.filter(t => !ONLY || t.includes(ONLY))) {
  for (const n of NS) {
    if (rows.length && rows[rows.length - 1].tech === t && rows[rows.length - 1].ms > 60) {
      console.log(`${t.padEnd(26)} n=${String(n).padStart(5)}  skipped (already past 60ms)`); continue;
    }
    const r: any = await page.evaluate(([t, n, f]) => (window as any).run(t, n, f), [t, n, FRAMES] as any);
    const row = { tech: t, n, ms: med(r.iv), p90: pct(r.iv, 0.9), js: med(r.js), fps: 1000 / med(r.iv) };
    rows.push(row);
    console.log(`${t.padEnd(26)} n=${String(n).padStart(5)}  frame ${row.ms.toFixed(1).padStart(6)}ms  p90 ${row.p90.toFixed(1).padStart(6)}  js ${row.js.toFixed(2).padStart(6)}ms  ${row.fps.toFixed(0).padStart(4)} fps`);
  }
}

console.log("\n=== budget: largest n holding >=60fps (median frame <= 16.7ms) ===");
const byTech = new Map<string, any[]>();
for (const r of rows) (byTech.get(r.tech) ?? byTech.set(r.tech, []).get(r.tech)!).push(r);
const budget = [...byTech].map(([t, rs]) => {
  const ok = rs.filter(r => r.ms <= 16.7).map(r => r.n);
  return { tech: t, budget: ok.length ? Math.max(...ok) : 0, at1000: rs.find(r => r.n === 1000) };
}).sort((a, b) => b.budget - a.budget);
for (const b of budget)
  console.log(`${b.tech.padEnd(26)} ${String(b.budget).padStart(5)} particles   @1000: ${b.at1000 ? b.at1000.ms.toFixed(1) + "ms / js " + b.at1000.js.toFixed(2) + "ms" : "-"}`);

await Bun.write(import.meta.dir + "/svg-particles.json", JSON.stringify({ refresh, rows }, null, 1));
await browser.close();
