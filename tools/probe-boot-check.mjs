import { chromium } from 'playwright';
import { resolve } from 'path';
const b = await chromium.launch({ headless: true });
const p = await b.newPage({ viewport: { width: 1300, height: 1000 } });
p.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 200)));
await p.goto(`file://${resolve(process.argv[2] || 'lopecode/notebooks/quick_start.html')}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
for (const t of [10, 15, 20, 25, 30, 40]) {
  await p.waitForTimeout(t === 10 ? 10000 : 5000);
  const r = await p.evaluate(() => {
    const rt = window.__ojs_runtime;
    const errs = [...rt._variables].filter((v) => v._value === undefined && v._reachable && v._error).length;
    return { qs: !!document.querySelector('.qs table'), cells: rt._variables.size };
  });
  console.log(`${t}s  .qs table=${r.qs}  variables=${r.cells}`);
  if (r.qs) break;
}
const errs = await p.evaluate(() => [...document.querySelectorAll('.observablehq--error')].map((n) => n.textContent.slice(0, 120)));
console.log('errored cells:', errs.length ? errs : 'none');
await b.close();
