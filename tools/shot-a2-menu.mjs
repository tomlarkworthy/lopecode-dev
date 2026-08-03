// Visual check: the burger menu carries the annotate item, and no floating button remains.
import { chromium } from 'playwright';
import { resolve } from 'path';
const NOTEBOOK = resolve('lopebooks/notebooks/@tomlarkworthy_annotate.html');
const browser = await chromium.launch({ headless: true, args: ['--disable-web-security'] });
const page = await browser.newPage({ viewport: { width: 1250, height: 900 } });
await page.goto(`file://${NOTEBOOK}#view=S100(@tomlarkworthy/annotate)`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__ojs_runtime && document.querySelector('[data-a2-root]'), { timeout: 60000 });
await page.waitForTimeout(6000);
const burger = await page.evaluate(() => {
  const b = [...document.querySelectorAll('button')].find(x => /lp2-burger|burger/i.test(x.className + ' ' + (x.id||'')) || x.getAttribute('aria-label') === 'Menu');
  if (b) { b.click(); return { clicked: true, cls: b.className }; }
  return { clicked: false, buttons: [...document.querySelectorAll('button')].slice(0,8).map(x => x.className + '|' + (x.textContent||'').slice(0,12)) };
});
console.log('burger:', JSON.stringify(burger));
await page.waitForTimeout(800);
console.log('floating add button present:', await page.evaluate(() => !!document.querySelector('[data-a2-add]')));
await page.screenshot({ path: 'tools/screenshots/a2-menu.png', clip: { x: 0, y: 0, width: 620, height: 480 } });
await browser.close();
