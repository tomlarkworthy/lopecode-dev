// For each recompute of editor-5's `cellEditor`, report which of its inputs changed version.
import { chromium } from 'playwright';
import { resolve } from 'node:path';

const file = process.argv[2];
const ms = Number(process.argv[3] ?? 7000);
const browser = await chromium.launch({ headless: true, args: ['--disable-web-security'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

await page.addInitScript(() => {
  window.__cc = { rows: [] };
  const findCE = (rt) => [...rt._variables].find(v => v._name === 'cellEditor' && v._inputs && v._inputs.length > 3);
  let lastV = null, lastIn = null;
  const tick = () => {
    const rt = window.__ojs_runtime;
    const ce = rt && rt._variables && findCE(rt);
    if (ce) {
      const inVersions = ce._inputs.map(i => `${i._name}:${i._version}`);
      if (ce._version !== lastV) {
        const changed = lastIn ? inVersions.filter((s, k) => s !== lastIn[k]) : inVersions;
        window.__cc.rows.push({ t: Math.round(performance.now()), v: ce._version, changed });
        lastV = ce._version; lastIn = inVersions;
      } else if (lastIn) {
        const changed = inVersions.filter((s, k) => s !== lastIn[k]);
        if (changed.length) { window.__cc.rows.push({ t: Math.round(performance.now()), v: ce._version, inputOnly: changed }); lastIn = inVersions; }
      }
    }
    if (performance.now() < 8000) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
});

await page.goto('file://' + resolve(file) + '#view=S100(@tomlarkworthy/lopecode-live-2026)', { waitUntil: 'commit' });
await page.waitForTimeout(ms);
const rows = await page.evaluate(() => window.__cc.rows);
for (const r of rows) console.log(String(r.t).padStart(5), r.v === undefined ? '' : 'ce.v=' + r.v, JSON.stringify(r.changed ?? r.inputOnly));
await browser.close();
