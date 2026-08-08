import { chromium } from 'playwright';
import { resolve } from 'path';
const b = await chromium.launch({ headless: true });
const p = await b.newPage({ viewport: { width: 1300, height: 1000 } });
await p.goto(`file://${resolve('lopecode/notebooks/quick_start.html')}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForTimeout(24000);
console.log(await p.evaluate(() => JSON.stringify(
  [...document.querySelectorAll('.lp2-pane .observablehq[cell]')].slice(0, 8)
    .map((n) => ({ cell: n.getAttribute('cell'), h: Math.round(n.getBoundingClientRect().height), text: (n.textContent || '').slice(0, 24) })), null, 1)));
await b.close();
