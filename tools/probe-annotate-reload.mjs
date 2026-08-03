// Export the module, splice it back, reload — which annotation cells survive?
import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
const NOTEBOOK = resolve('lopebooks/notebooks/@tomlarkworthy_annotate.html');
const MODULE_RE = /(<script[^>]*\bid="@tomlarkworthy\/annotate"[^>]*>)([\s\S]*?)(<\/script>)/;
const pristine = readFileSync(NOTEBOOK, 'utf8').match(MODULE_RE)[2];
const restore = () => {
  const cur = readFileSync(NOTEBOOK, 'utf8');
  writeFileSync(NOTEBOOK, cur.replace(MODULE_RE, (_a, o, _b, c) => o + pristine + c));
};
const browser = await chromium.launch({ headless: true, args: ['--disable-web-security'] });
const page = await browser.newPage({ viewport: { width: 1300, height: 4600 } });
page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 200)));
try {
  await page.goto(`file://${NOTEBOOK}#view=S100(@tomlarkworthy/annotate)`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__ojs_runtime && document.querySelector('[data-a2-root]'), { timeout: 60000 });
  await page.waitForTimeout(8000);
  // mimic the suite: park a tour box via store.patch before exporting
  await page.evaluate(() => {
    const rt = window.__ojs_runtime;
    const mod = rt.mains.get('@tomlarkworthy/annotate');
    for (const v of rt._variables) if (v._name === 'a2Store' && v._module === mod)
      return v._value.patch('tour_title', { box: { dx: 0, dy: -9999, w: 200 } });
  });
  await page.waitForTimeout(2000);
  const exported = await page.evaluate(async () => {
    const rt = window.__ojs_runtime;
    let fn = null;
    for (const v of rt._variables) if (v._name === 'exportModuleJS' && v._value) { fn = v._value; break; }
    return (await fn('@tomlarkworthy/annotate')).source;
  });
  const html = readFileSync(NOTEBOOK, 'utf8');
  writeFileSync(NOTEBOOK, html.replace(MODULE_RE, (_a, o, _m, c) => o + '\n' + exported.replace(/^\n+|\n+$/g, '') + '\n' + c));
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => window.__ojs_runtime && document.querySelector('[data-a2-root]'), { timeout: 60000 });
  await page.waitForTimeout(9000);
  console.log(await page.evaluate(() => {
    const rt = window.__ojs_runtime;
    const mod = rt.mains.get('@tomlarkworthy/annotate');
    const g = (n) => { for (const v of rt._variables) if (v._name === n && v._module === mod) return v._value; };
    const store = g('a2Store');
    const cells = [...mod._scope.keys()].filter((k) => /^annotation_/.test(k));
    const vals = cells.map((k) => {
      const v = mod._scope.get(k);
      return `${k}: type=${v._type} value=${v._value === undefined ? 'UNDEFINED' : typeof v._value} reachable=${v._reachable}`;
    });
    return JSON.stringify({ store: store.all().map((a) => a.varName), cells: vals }, null, 2);
  }));
} finally {
  restore();
  await browser.close();
}
