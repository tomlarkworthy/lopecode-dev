// The generate console: does it read as part of the page, and is the predicted size shown?
import { chromium } from 'playwright';
import { resolve } from 'path';
const b = await chromium.launch({ headless: true });
const p = await b.newPage({ viewport: { width: 1300, height: 1000 }, deviceScaleFactor: 2 });
await p.goto(`file://${resolve('lopecode/notebooks/quick_start.html')}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForTimeout(24000);
const box = await p.evaluate(() => {
  const c = document.querySelector('.qs .console');
  c.scrollIntoView({ block: 'center' });
  const r = c.getBoundingClientRect();
  return { x: Math.max(0, r.x - 12), y: Math.max(0, r.y - 12), width: Math.min(1100, r.width + 24), height: r.height + 24,
    weight: document.querySelector('.qs .weight')?.textContent };
});
console.log('weight reads:', JSON.stringify(box.weight));
await p.screenshot({ path: 'tools/screenshots/footer.png', clip: { x: box.x, y: box.y, width: box.width, height: box.height } });
await b.close();
