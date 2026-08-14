// Cold-boot the tarot notebook and report cell errors + key variable states.
import { chromium } from 'playwright';
import { resolve } from 'path';

const file = resolve(process.argv[2] || 'lopebooks/notebooks/@tomlarkworthy_tarot.html');
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
const errs = [];
page.on('pageerror', (e) => errs.push(String(e).slice(0, 200)));
page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 200)); });

await page.goto(`file://${file}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForTimeout(20000);

const report = await page.evaluate(async () => {
  const rt = window.__ojs_runtime;
  const mod = rt.mains.get('@tomlarkworthy/tarot');
  const out = { moduleFound: !!mod, vars: {}, errorCells: [] };
  if (!mod) return out;
  const names = ['deck', 'cardUrls', 'backUrl', 'velvetUrl', 'palette', 'viewof display',
    'sharedReading', 'loadShared', 'transitions', 'getFortune', 'showCards'];
  for (const n of names) {
    try {
      const v = await Promise.race([mod.value(n), new Promise((_, rj) => setTimeout(() => rj(new Error('timeout')), 8000))]);
      out.vars[n] = v === undefined ? 'undefined'
        : Array.isArray(v) ? `Array(${v.length})`
        : v instanceof Element ? `<${v.tagName.toLowerCase()}>`
        : typeof v === 'object' ? `object{${Object.keys(v).slice(0, 4).join(',')}}`
        : typeof v === 'function' ? 'function'
        : String(v).slice(0, 60);
    } catch (e) { out.vars[n] = 'ERROR: ' + e.message.slice(0, 90); }
  }
  for (const v of rt._variables) {
    const n = v._observer && v._observer._node;
    if (n && n.querySelector && n.querySelector('.observablehq--error'))
      out.errorCells.push((v._name || '(anon)') + ': ' + n.querySelector('.observablehq--error').textContent.slice(0, 110));
  }
  return out;
});

console.log(JSON.stringify(report, null, 2));
console.log('page errors:', errs.length ? errs.slice(0, 6) : 'none');
await page.screenshot({ path: 'tools/screenshots/tarot-boot.png', fullPage: false });
await browser.close();
