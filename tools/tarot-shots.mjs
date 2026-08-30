// Visual + frame check for the SVG card back and the full-width board.
// Headed, because headless Chromium caps rAF at 2 vsync and hides the real cost.
import { chromium } from 'playwright';
import { resolve } from 'path';

const arg = process.argv[2] || resolve('lopebooks/notebooks/@tomlarkworthy_tarot.html');
const url = arg.startsWith('http') ? arg : `file://${arg}`;
const browser = await chromium.launch({ headless: false });
const page = await browser.newPage({ viewport: { width: 1100, height: 1000 } });
const errs = [];
page.on('pageerror', (e) => errs.push(String(e).slice(0, 200)));
const app = () => page.locator('.tarot-app').first();

await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForSelector('.tarot-app', { timeout: 90000 });
await page.waitForTimeout(6000);

await app().locator('input[autocomplete="given-name"]').fill('Tom');
await app().locator('input[autocomplete="given-name"]').dispatchEvent('input');
await page.waitForTimeout(1000);
await app().locator('textarea').first().fill('Will it ship?');
await app().locator('textarea').first().dispatchEvent('input');
await page.waitForTimeout(1600);
await page.screenshot({ path: 'tools/screenshots/tarot-1-stack.png' });

const rec = () => page.evaluate(() => {
  window.__f = []; window.__rec = true; let last = performance.now();
  const tick = (t) => { if (!window.__rec) return; window.__f.push(t - last); last = t; requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
});
const stop = () => page.evaluate(() => {
  window.__rec = false;
  const f = window.__f.slice(2).sort((a, b) => a - b);
  return { n: f.length, median: +(f[Math.floor(f.length / 2)] || 0).toFixed(1), p90: +(f[Math.floor(f.length * 0.9)] || 0).toFixed(1) };
});
const topCard = () => page.evaluate(() => {
  const c = document.querySelectorAll('.tarot-app use.card, .tarot-app image.card');
  const r = c[c.length - 1].getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + r.height / 2, n: c.length };
});

await rec();
let spot = await topCard();
await page.mouse.click(spot.x, spot.y);
await page.waitForTimeout(1500);
console.log('spread frames:', JSON.stringify(await stop()));
await page.screenshot({ path: 'tools/screenshots/tarot-2-spread.png' });

// pick three, measuring the pick animation too
await rec();
for (let i = 0; i < 3; i++) {
  const s = await page.evaluate(() => {
    const c = [...document.querySelectorAll('.tarot-app use.card')].filter((e) => e.style.pointerEvents !== 'none');
    const r = c[c.length - 1].getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });
  await page.mouse.click(s.x, s.y);
  await page.waitForTimeout(800);
}
console.log('pick frames:  ', JSON.stringify(await stop()));
await page.waitForTimeout(1500);
await page.screenshot({ path: 'tools/screenshots/tarot-3-board.png' });
await page.waitForTimeout(12000);
await page.screenshot({ path: 'tools/screenshots/tarot-4-reading.png', fullPage: true });

console.log('cards on screen:', (await topCard().catch(() => ({ n: 0 }))).n);
console.log('page errors:', errs.length ? errs : 'none');
await browser.close();
