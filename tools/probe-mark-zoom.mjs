// Magnified crop of the banner mark — 60px of icon is too small to judge stroke weight and balance.
import { chromium } from 'playwright';
import { resolve } from 'path';
const file = resolve('lopecode/notebooks/quick_start.html');
const b = await chromium.launch({ headless: true });
const p = await b.newPage({ viewport: { width: 1300, height: 1000 }, deviceScaleFactor: 4 });
await p.goto(`file://${file}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForTimeout(24000);
const box = await p.evaluate(() => {
  const v = [...window.__ojs_runtime._variables].find((x) => x._name === 'heading');
  const r = v._value.getBoundingClientRect();
  return { x: r.x, y: r.y, width: Math.min(r.width, 360), height: r.height };
});
await p.screenshot({ path: 'tools/screenshots/mark-zoom.png', clip: box });
await b.close();
console.log('shot', JSON.stringify(box));
