// lopepage panes scroll internally, so fullPage screenshots stop at the fold — scroll the pane.
import { chromium } from 'playwright';
import { resolve } from 'path';
const b = await chromium.launch({ headless: true });
const p = await b.newPage({ viewport: { width: 1300, height: 1000 } });
await p.goto(`file://${resolve('scratch/guide-check.html')}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
await p.waitForTimeout(16000);
for (const [i, y] of [700, 1500, 2300].entries()) {
  await p.evaluate((y) => {
    const els = [...document.querySelectorAll('*')].filter((e) => e.scrollHeight > e.clientHeight + 50 && e.clientHeight > 300);
    if (els[0]) els[0].scrollTop = y;
  }, y);
  await p.waitForTimeout(1200);
  await p.screenshot({ path: `tools/screenshots/guide-scroll-${i}.png` });
}
await b.close();
