// Crop of the top of the chooser: is the banner really sitting in the table's corner, and how much
// vertical space did moving it there save?
import { chromium } from 'playwright';
import { resolve } from 'path';
const file = resolve('lopecode/notebooks/quick_start.html');
const b = await chromium.launch({ headless: true });
const p = await b.newPage({ viewport: { width: 1300, height: 1000 }, deviceScaleFactor: 2 });
await p.goto(`file://${file}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForTimeout(24000);
const m = await p.evaluate(() => {
  const rt = window.__ojs_runtime;
  const val = (n) => { for (const v of rt._variables) if (v._name === n && v._value !== undefined) return v._value; };
  const g = val('gallery'), banner = val('heading');
  const table = g.querySelector('table');
  const r = (e) => { const x = e.getBoundingClientRect(); return {y: Math.round(x.y), h: Math.round(x.height)}; };
  return { banner: r(banner), table: r(table), gallery: r(g),
    pane: Math.round(document.querySelector('.lp2-pane .observablehq-root').getBoundingClientRect().height) };
});
console.log(JSON.stringify(m));
await p.screenshot({ path: 'tools/screenshots/chooser-top.png', clip: { x: 0, y: 20, width: 1080, height: 420 } });
await b.close();
