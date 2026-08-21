// blank-notebook deliberately does NOT bundle @tomlarkworthy/annotate-data, yet it showed up in
// the exported bootconf mains. If it is in runtime.mains with no script block, a save-in-place
// bakes a main the saved file cannot boot.
import { chromium } from 'playwright';
import { resolve } from 'path';

const file = resolve(process.argv[2] || 'lopecode/notebooks/quick_start.html');
const DATA = '@tomlarkworthy/annotate-data';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push(String(e).slice(0, 160)));
await page.goto(`file://${file}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
await page.waitForTimeout(18000);

const out = await page.evaluate(async (DATA) => {
  const rt = window.__ojs_runtime;
  const byName = (n) => {
    for (const v of rt._variables) if (v._name === n && typeof v._value === 'function') return v._value;
    return null;
  };
  const inMains = rt.mains.has(DATA);
  const blockInPage = !!document.getElementById(DATA);
  let varCount = 0;
  const mod = rt.mains.get(DATA);
  if (mod) for (const v of rt._variables) if (v._module === mod) varCount++;

  const exportToHTML = byName('exportToHTML');
  const resp = await exportToHTML({ mains: new Map(rt.mains), runtime: rt, options: { hash: '' } });
  const html = resp?.source ?? resp;
  let boot = null;
  const re = /<script[^>]*id="bootconf\.json"[^>]*>([\s\S]*?)<\/script>/g;
  let m;
  while ((m = re.exec(html))) { try { boot = JSON.parse(m[1]); } catch (e) {} }

  return {
    inRuntimeMains: inMains,
    blockInLivePage: blockInPage,
    variablesInModule: varCount,
    inExportedMains: !!(boot && boot.mains && boot.mains.includes(DATA)),
    blockInExport: typeof html === 'string' && html.includes(`id="${DATA}"`),
  };
}, DATA);

console.log(JSON.stringify(out, null, 2));
console.log('page errors:', errs.length ? errs.slice(0, 3) : 'none');
await browser.close();
