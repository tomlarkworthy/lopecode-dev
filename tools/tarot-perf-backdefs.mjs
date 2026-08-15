// What actually costs the spread frame? A blank page in this same harness runs at 120fps,
// so the 30fps during the spread is the page, not the driver. Halving the fan and
// flattening the card geometry both changed nothing, so the cost is fixed per frame
// rather than per card — these arms go after the fixed costs.
import { chromium } from 'playwright';
import { resolve } from 'path';

const file = resolve('lopebooks/notebooks/@tomlarkworthy_tarot.html');
const REPEATS = 2;
// Each arm: [mutate before the click, move the mouse off the fan after the click?]
const ARMS = {
  'as shipped': [() => {}, false],
  'no :hover filter': [() => {
    for (const s of document.styleSheets) {
      try {
        for (let i = s.cssRules.length - 1; i >= 0; i--)
          if (/pickable .card:hover/.test(s.cssRules[i].cssText)) s.deleteRule(i);
      } catch {}
    }
  }, false],
  'mouse off the fan': [() => {}, true],
  'no page background': [() => {
    document.body.style.background = '#111';
    for (const el of document.querySelectorAll('*'))
      if (/blob:|data:image/.test(getComputedStyle(el).backgroundImage)) el.style.backgroundImage = 'none';
  }, false],
};

const browser = await chromium.launch({ headless: false });
for (const [label, [mutate, moveOff]] of Object.entries(ARMS)) {
  const runs = [];
  for (let r = 0; r < REPEATS; r++) {
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
    await page.waitForTimeout(1500);
    await page.evaluate(mutate);
    await page.waitForTimeout(500);

    await page.evaluate(() => {
      window.__f = []; window.__rec = true; let last = performance.now();
      const tick = (t) => { if (!window.__rec) return; window.__f.push(t - last); last = t; requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
    });
    const spot = await page.evaluate(() => {
      const c = document.querySelectorAll('.tarot-app use.card');
      const r = c[c.length - 1].getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    });
    await page.mouse.click(spot.x, spot.y);
    if (moveOff) await page.mouse.move(1050, 30);
    await page.waitForTimeout(1500);
    runs.push(await page.evaluate(() => {
      window.__rec = false;
      const f = window.__f.slice(2).sort((a, b) => a - b);
      return { n: f.length, med: +(f[Math.floor(f.length / 2)] || 0).toFixed(1) };
    }));
    await page.close();
  }
  console.log(`${label.padEnd(22)} fps=${runs.map((r) => Math.round(r.n / 1.5)).join('/')}  median-interval=${runs.map((r) => r.med).join('/')}ms`);
}
await browser.close();
