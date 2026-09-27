// Why does variable <name> recompute? Reports each version bump with the inputs that changed.
import { chromium } from 'playwright';
import { resolve } from 'node:path';

const file = process.argv[2];
const target = process.argv[3];
const ms = Number(process.argv[4] ?? 7000);
const browser = await chromium.launch({ headless: true, args: ['--disable-web-security'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

await page.addInitScript((target) => {
  window.__vz = { rows: [] };
  let lastV = null, lastIn = null;
  const tick = () => {
    const rt = window.__ojs_runtime;
    const v = rt && rt._variables && [...rt._variables].find(x => x._name === target && x._inputs && x._inputs.length);
    if (v) {
      const inV = v._inputs.map(i => `${i._name}:${i._version}`);
      if (v._version !== lastV) {
        window.__vz.rows.push({ t: Math.round(performance.now()), v: v._version, changed: lastIn ? inV.filter((s, k) => s !== lastIn[k]) : inV });
        lastV = v._version; lastIn = inV;
      }
    }
    if (performance.now() < 8000) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}, target);

await page.goto('file://' + resolve(file) + '#view=S100(@tomlarkworthy/lopecode-live-2026)', { waitUntil: 'commit' });
await page.waitForTimeout(ms);
const rows = await page.evaluate(() => window.__vz.rows);
for (const r of rows) console.log(String(r.t).padStart(5), 'v=' + r.v, JSON.stringify(r.changed));
await browser.close();
