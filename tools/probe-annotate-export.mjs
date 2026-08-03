import { chromium } from 'playwright';
import { resolve } from 'path';
const NOTEBOOK = resolve('lopebooks/notebooks/@tomlarkworthy_annotate.html');
const browser = await chromium.launch({ headless: true, args: ['--disable-web-security'] });
const page = await browser.newPage({ viewport: { width: 1300, height: 4600 } });
page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 200)));
await page.goto(`file://${NOTEBOOK}#view=S100(@tomlarkworthy/annotate)`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__ojs_runtime && document.querySelector('[data-a2-root]'), { timeout: 60000 });
await page.waitForTimeout(8000);
console.log(await page.evaluate(async () => {
  const rt = window.__ojs_runtime;
  const mod = rt.mains.get('@tomlarkworthy/annotate');
  const g = (n) => { for (const v of rt._variables) if (v._name === n && v._module === mod) return v._value; };
  const store = g('a2Store');
  const inStore = store.all().map((a) => a.varName || a.id);
  let fn = null;
  for (const v of rt._variables) if (v._name === 'exportModuleJS' && v._value) { fn = v._value; break; }
  const res = await fn('@tomlarkworthy/annotate');
  const src = res.source;
  const named = [...src.matchAll(/"(annotation_[\w]+)"/g)].map((m) => m[1]).filter((v, i, a) => a.indexOf(v) === i);
  return JSON.stringify({ inStore, exported: named, bytes: src.length }, null, 2);
}));
await browser.close();
