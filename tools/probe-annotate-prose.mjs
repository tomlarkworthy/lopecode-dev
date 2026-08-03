import { chromium } from 'playwright';
import { resolve } from 'path';
const NOTEBOOK = resolve('lopebooks/notebooks/@tomlarkworthy_annotate.html');
const browser = await chromium.launch({ headless: true, args: ['--disable-web-security'] });
const page = await browser.newPage({ viewport: { width: 1300, height: 4600 } });
await page.goto(`file://${NOTEBOOK}#view=S100(@tomlarkworthy/annotate)`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__ojs_runtime && document.querySelector('[data-a2-root]'), { timeout: 60000 });
await page.waitForTimeout(7000);
console.log(JSON.stringify(await page.evaluate(() => {
  const t = document.querySelector('.observablehq[cell="demoProse"]').textContent;
  const idx = (p) => { const o = []; let i = t.indexOf(p); while (i !== -1) { o.push(i); i = t.indexOf(p, i + 1); } return o; };
  return { text: t, notAPosition: idx('not a position'), toldApart: idx('told apart'), surroundings: idx('surroundings') };
}), null, 2));
await browser.close();
