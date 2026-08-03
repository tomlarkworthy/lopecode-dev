// Reproduce the user's query: type "ann" into ⌘K and dump every row in order.
import { chromium } from 'playwright';
import { resolve } from 'path';
const NOTEBOOK = resolve('lopebooks/notebooks/@tomlarkworthy_annotate.html');
const q = process.argv[2] || 'ann';
const browser = await chromium.launch({ headless: true, args: ['--disable-web-security'] });
const page = await browser.newPage({ viewport: { width: 1300, height: 1400 } });
page.on('pageerror', e => console.log('[pageerror]', String(e).slice(0,160)));
await page.goto(`file://${NOTEBOOK}#view=S100(@tomlarkworthy/annotate)`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__ojs_runtime && document.querySelector('[data-a2-root]'), { timeout: 60000 });
await page.waitForTimeout(6000);

console.log('a2Commands cell:', JSON.stringify(await page.evaluate(() => {
  const rt = window.__ojs_runtime;
  const mod = rt.mains.get('@tomlarkworthy/annotate');
  const out = {};
  for (const v of rt._variables) if (v._module === mod && (v._name === 'a2Commands' || v._name === 'a2MenuItem'))
    out[v._name] = v._value instanceof Error ? 'ERROR: ' + v._value.message : String(v._value);
  let providers = null;
  for (const v of rt._variables) if (v._name === 'commandProviders' && Array.isArray(v._value)) providers = v._value.length;
  return { ...out, providerCount: providers };
})));

await page.keyboard.press('Control+k');
await page.waitForTimeout(500);
await page.keyboard.type(q);
await page.waitForTimeout(800);
console.log(JSON.stringify(await page.evaluate(() => {
  const rows = [...document.querySelectorAll('.command-palette-result')];
  return { n: rows.length, rows: rows.map((r, i) => `${i}: ${r.textContent.slice(0,70)}${'commandAction' in r.dataset ? '  [ACTION]' : ''}`) };
}), null, 2));
await browser.close();
