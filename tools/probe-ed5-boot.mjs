// Boot the refreshed editor-5 notebook: does it come up clean, with its pinned demo editor?
import { chromium } from 'playwright';
import { resolve } from 'path';
const file = resolve(process.argv[2] || 'lopecode/notebooks/@tomlarkworthy_editor-5.html');
const browser = await chromium.launch({ headless: true, args: ['--disable-web-security'] });
const page = await browser.newPage({ viewport: { width: 1400, height: 1100 } });
const errs = [];
page.on('pageerror', (e) => errs.push(String(e).slice(0, 140)));
await page.goto(`file://${file}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
await page.waitForTimeout(15000);
console.log(await page.evaluate(() => {
  const rt = window.__ojs_runtime;
  const mains = rt.mains ? [...rt.mains.keys()] : [];
  const mod = rt.mains.get('@tomlarkworthy/editor-5');
  let broken = [];
  for (const v of rt._variables) {
    if (v._module === mod && v._name && v._value === undefined && v._reachable) broken.push(v._name);
  }
  return `mains: ${mains.join(', ')}
cm-editors: ${document.querySelectorAll('.cm-editor').length}
hotbars: ${document.querySelectorAll('.hotbar').length}
cells rendered: ${document.querySelectorAll('.observablehq[cell]').length}
reachable-but-undefined in editor-5: ${broken.length ? broken.slice(0, 6).join(', ') : 'none'}`;
}));
console.log('page errors:', errs.length ? errs.slice(0, 4).join(' | ') : 'none');
await page.screenshot({ path: 'tools/screenshots/ed5-refreshed.png' });
await browser.close();
