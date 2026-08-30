// Mobile layout check: does the app fit a phone viewport without horizontal scroll?
import { chromium } from 'playwright';
import { resolve } from 'path';

const file = resolve('lopebooks/notebooks/@tomlarkworthy_tarot.html');
const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
});
await page.goto(`file://${file}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForSelector('.tarot-app', { timeout: 90000 });
await page.waitForTimeout(6000);

const app = () => page.locator('.tarot-app').first();
await app().locator('input[autocomplete="given-name"]').fill('Tom');
await app().locator('input[autocomplete="given-name"]').dispatchEvent('input');
await page.waitForTimeout(1200);
await app().locator('textarea').first().fill('Will it ship?');
await app().locator('textarea').first().dispatchEvent('input');
await page.waitForTimeout(1800);

const m = await page.evaluate(() => ({
  docWidth: document.documentElement.scrollWidth,
  viewport: window.innerWidth,
  overflows: document.documentElement.scrollWidth > window.innerWidth + 1,
  fanBox: (() => { const s = document.querySelector('.tarot-app svg'); const r = s.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; })(),
}));
console.log(JSON.stringify(m));
await page.screenshot({ path: 'tools/screenshots/tarot-mobile.png', fullPage: false });
await browser.close();
