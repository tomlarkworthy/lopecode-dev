// Eyeball the reading order of the refreshed notebook documentation.
import { chromium } from 'playwright';
import { resolve } from 'path';

const NOTEBOOK = resolve('lopebooks/notebooks/@tomlarkworthy_annotate.html');
const browser = await chromium.launch({ headless: true, args: ['--disable-web-security'] });
const page = await browser.newPage({ viewport: { width: 900, height: 1000 } });
page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 200)));
await page.goto(`file://${NOTEBOOK}#view=S100(@tomlarkworthy/annotate)`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__ojs_runtime && document.querySelector('[data-a2-root]'), { timeout: 60000 });
await page.waitForTimeout(7000);

const pane = await page.$('.lp2-pane[data-module="@tomlarkworthy/annotate"] .lp2-pane-content, .lp2-pane[data-module="@tomlarkworthy/annotate"]');
const total = await page.evaluate(() => {
  const p = document.querySelector('.lp2-pane[data-module="@tomlarkworthy/annotate"]');
  const sc = p.querySelector('[data-a2-layer]') ? p : p;
  return { scrollHeight: sc.scrollHeight, clientHeight: sc.clientHeight };
});
console.log('pane', JSON.stringify(total));

const headings = await page.evaluate(() => {
  const p = document.querySelector('.lp2-pane[data-module="@tomlarkworthy/annotate"]');
  return [...p.querySelectorAll('h1, h2')].map((h) => h.tagName + ' ' + h.textContent.trim());
});
console.log(headings.join('\n'));

for (let i = 0; i < 5; i++) {
  await page.evaluate((n) => {
    const p = document.querySelector('.lp2-pane[data-module="@tomlarkworthy/annotate"]');
    p.scrollTop = n * 900;
  }, i);
  await page.waitForTimeout(400);
  await page.screenshot({ path: `tools/screenshots/a2-doc-${i}.png` });
}
console.log('wrote tools/screenshots/a2-doc-0..4.png');
await browser.close();
