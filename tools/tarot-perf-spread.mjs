// Why does the spread feel janky? Records frame intervals across the spread animation
// and counts what the browser is actually being asked to draw.
import { chromium } from 'playwright';
import { resolve } from 'path';

const file = process.argv[2] || resolve('lopebooks/notebooks/@tomlarkworthy_tarot.html');
const url = file.startsWith('http') ? file : `file://${file}`;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1100, height: 1000 } });
const app = () => page.locator('.tarot-app').first();

await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForSelector('.tarot-app', { timeout: 90000 });
await page.waitForTimeout(5000);

await app().locator('input[autocomplete="given-name"]').fill('Tom');
await app().locator('input[autocomplete="given-name"]').dispatchEvent('input');
await page.waitForTimeout(1000);
await app().locator('textarea').first().fill('Will it ship?');
await app().locator('textarea').first().dispatchEvent('input');
await page.waitForTimeout(1500);

const shape = await page.evaluate(() => {
  const svg = document.querySelector('.tarot-app svg');
  const imgs = svg.querySelectorAll('use.card');
  const hrefs = new Set([...imgs].map((i) => i.getAttribute('href')));
  return {
    cardElements: imgs.length,
    distinctHrefs: hrefs.size,
    totalSvgNodes: svg.querySelectorAll('*').length,
  };
});
console.log('before spread:', JSON.stringify(shape));

// start frame recording, then click to spread
await page.evaluate(() => {
  window.__frames = [];
  let last = performance.now();
  window.__rec = true;
  const tick = (t) => { if (!window.__rec) return; window.__frames.push(t - last); last = t; requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
});

const spot = await page.evaluate(() => {
  const c = document.querySelectorAll('.tarot-app use.card');
  const r = c[c.length - 1].getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
});
await page.mouse.click(spot.x, spot.y);
await page.waitForTimeout(1600);

const res = await page.evaluate(() => {
  window.__rec = false;
  const f = window.__frames.slice(2);
  const sorted = [...f].sort((a, b) => a - b);
  const pct = (p) => sorted[Math.floor(sorted.length * p)] || 0;
  const svg = document.querySelector('.tarot-app svg');
  return {
    frames: f.length,
    medianMs: +pct(0.5).toFixed(1),
    p90Ms: +pct(0.9).toFixed(1),
    worstMs: +Math.max(...f).toFixed(1),
    over32ms: f.filter((x) => x > 32).length,
    over100ms: f.filter((x) => x > 100).length,
    animateNodes: svg.querySelectorAll('animateTransform, animate').length,
    svgNodes: svg.querySelectorAll('*').length,
  };
});
console.log('during spread:', JSON.stringify(res, null, 1));
await browser.close();
