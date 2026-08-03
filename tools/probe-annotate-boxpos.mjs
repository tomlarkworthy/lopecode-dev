import { chromium } from 'playwright';
import { resolve } from 'path';
const NOTEBOOK = resolve('lopebooks/notebooks/@tomlarkworthy_annotate.html');
const browser = await chromium.launch({ headless: true, args: ['--disable-web-security'] });
const page = await browser.newPage({ viewport: { width: 1100, height: 1000 } });
await page.goto(`file://${NOTEBOOK}#view=S100(@tomlarkworthy/annotate)`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__ojs_runtime && document.querySelector('[data-a2-root]'), { timeout: 60000 });
await page.waitForTimeout(9000);
for (const y of [0, 1700]) {
  await page.evaluate((n) => { document.querySelector('.lp2-pane[data-module="@tomlarkworthy/annotate"]').scrollTop = n; }, y);
  await page.waitForTimeout(1200);
  console.log('=== scrollTop', y, '===');
  console.log(await page.evaluate(() => [...document.querySelectorAll('[data-ann-id]')].map((b) => {
    const r = b.getBoundingClientRect();
    const parent = b.offsetParent;
    return `${b.getAttribute('data-ann-id').padEnd(14)} style.top=${b.style.top} left=${b.style.left} vp=${Math.round(r.left)},${Math.round(r.top)} parent=${parent ? (parent.getAttribute('data-a2-layer') !== null ? 'layer' : parent.className.toString().slice(0,20)) : 'none'}`;
  }).join('\n')));
}
await browser.close();
