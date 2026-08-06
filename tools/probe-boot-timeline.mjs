// Which cells are the long pole in a cold boot? Polls the runtime and records
// when each variable of a target module first holds a value.
import { chromium } from 'playwright';
import { resolve } from 'path';

const file = resolve(process.argv[2]);
const MOD = process.argv[3] || '@tomlarkworthy/coded-landmark-tracking';
const wait = Number(process.argv[4] || 30000);
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto(`file://${file}`, { waitUntil: 'domcontentloaded', timeout: 180000 });

await page.evaluate((MOD) => {
  window.__seen = new Map();
  window.__t0 = performance.now();
  window.__tick = () => {
    const rt = window.__ojs_runtime;
    if (!rt) return;
    const mod = rt.mains?.get(MOD);
    if (!mod) return;
    const now = performance.now() - window.__t0;
    for (const v of rt._variables) {
      if (v._module !== mod || !v._name) continue;
      if (v._value !== undefined && !window.__seen.has(v._name)) window.__seen.set(v._name, Math.round(now));
    }
  };
  window.__iv = setInterval(window.__tick, 50);
}, MOD);

await page.waitForTimeout(wait);

const out = await page.evaluate(() => {
  clearInterval(window.__iv);
  const rows = [...window.__seen.entries()].sort((a, b) => a[1] - b[1]);
  // biggest jumps in the settle curve are where the time actually went
  const gaps = [];
  for (let i = 1; i < rows.length; i++) {
    const d = rows[i][1] - rows[i - 1][1];
    if (d > 150) gaps.push({ afterMs: rows[i - 1][1], gapMs: d, blockedUntil: rows[i][0] });
  }
  return { cells: rows.length, lastMs: rows.length ? rows[rows.length - 1][1] : null, slowest: rows.slice(-12), gaps: gaps.slice(-12) };
});

console.log(JSON.stringify(out, null, 2));
await browser.close();
