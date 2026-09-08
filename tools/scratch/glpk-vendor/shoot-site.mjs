import { chromium } from 'playwright';
const [url, out] = process.argv.slice(2);
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1100, height: 1400 } });
const errs = [];
p.on('pageerror', (e) => errs.push(e.message.slice(0, 160)));
await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
await p.waitForTimeout(10000);
for (let i = 0; i < 25; i++) { await p.mouse.wheel(0, 1400); await p.waitForTimeout(500); }
await p.evaluate(() => window.scrollTo(0, 0));
await p.waitForTimeout(6000);
const h = await p.evaluate(() => document.documentElement.scrollHeight);
console.log('scrollHeight', h, 'pageErrors', JSON.stringify([...new Set(errs)].slice(0, 6)));
for (const [i, y] of [0, Math.round(h * 0.32), Math.round(h * 0.62)].entries()) {
  await p.evaluate((y) => window.scrollTo(0, y), y);
  await p.waitForTimeout(2500);
  await p.screenshot({ path: `${out}-${i}.png` });
}
await b.close();
