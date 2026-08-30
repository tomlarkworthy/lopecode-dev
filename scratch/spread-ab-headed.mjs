// Is the spread jank the SMIL animation or the image rasterisation?
// Same page, same animation, only the painted content differs.
import { chromium } from 'playwright';
import { resolve } from 'path';

const file = resolve('lopebooks/notebooks/@tomlarkworthy_tarot.html');
const ARMS = {
  baseline: () => {},
  'tiny image (1x1 png)': () => {
    const px = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    document.querySelectorAll('.tarot-app image.card').forEach((i) => i.setAttribute('href', px));
  },
  'no image (plain rect)': () => {
    document.querySelectorAll('.tarot-app image.card').forEach((img) => {
      const r = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      for (const a of ['width', 'height', 'class', 'style']) if (img.hasAttribute(a)) r.setAttribute(a, img.getAttribute(a));
      r.setAttribute('fill', '#69c');
      img.replaceWith(r);
    });
  },
  'half the cards': () => {
    const g = [...document.querySelectorAll('.tarot-app .spread')];
    g.slice(0, Math.floor(g.length / 2)).forEach((el) => el.remove());
  },
};

const browser = await chromium.launch({headless:false});
for (const [label, mutate] of Object.entries(ARMS)) {
  const page = await browser.newPage({ viewport: { width: 1100, height: 1000 } });
  const app = () => page.locator('.tarot-app').first();
  await page.goto(`file://${file}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForSelector('.tarot-app', { timeout: 90000 });
  await page.waitForTimeout(5000);
  await app().locator('input[autocomplete="given-name"]').fill('Tom');
  await app().locator('input[autocomplete="given-name"]').dispatchEvent('input');
  await page.waitForTimeout(900);
  await app().locator('textarea').first().fill('Will it ship?');
  await app().locator('textarea').first().dispatchEvent('input');
  await page.waitForTimeout(1400);

  await page.evaluate(mutate);
  await page.waitForTimeout(400);

  await page.evaluate(() => {
    window.__f = []; window.__rec = true; let last = performance.now();
    const tick = (t) => { if (!window.__rec) return; window.__f.push(t - last); last = t; requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  });
  const spot = await page.evaluate(() => {
    const c = document.querySelectorAll('.tarot-app image.card, .tarot-app rect[fill="#69c"]');
    const r = c[c.length - 1].getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });
  await page.mouse.click(spot.x, spot.y);
  await page.waitForTimeout(1500);
  const r = await page.evaluate(() => {
    window.__rec = false;
    const f = window.__f.slice(2).sort((a, b) => a - b);
    return { frames: f.length, median: +(f[Math.floor(f.length / 2)] || 0).toFixed(1), worst: +(f[f.length - 1] || 0).toFixed(1) };
  });
  console.log(`${label.padEnd(24)} frames=${String(r.frames).padStart(3)}  median=${String(r.median).padStart(5)}ms  worst=${r.worst}ms`);
  await page.close();
}
await browser.close();
