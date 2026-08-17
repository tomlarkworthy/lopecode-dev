import { chromium } from 'playwright';
import { resolve } from 'path';
const files = process.argv.slice(2);
const b = await chromium.launch({ headless: true });
let bad = 0;
for (const f of files) {
  const p = await b.newPage({ viewport: { width: 1200, height: 900 } });
  const perr = [];
  p.on('pageerror', (e) => perr.push(String(e).slice(0, 120)));
  await p.goto(`file://${resolve(f)}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await p.waitForTimeout(25000);
  const r = await p.evaluate(async () => {
    const rt = window.__ojs_runtime;
    const errs = [...document.querySelectorAll('.observablehq--error')].map((n) => n.textContent.slice(0, 100));
    let exporterOk = null;
    for (const v of rt._variables) {
      if (v._name === 'exporter' && v._module && [...rt.mains.keys()].length) {
        try { exporterOk = typeof (await rt._compute?.() ?? v._value); } catch (e) { exporterOk = 'throw: ' + e.message; }
        if (v._value !== undefined) exporterOk = typeof v._value;
      }
    }
    return { vars: rt._variables.size, errs, exporterOk, body: document.body.innerText.length };
  });
  await p.close();
  const ok = r.errs.length === 0 && perr.length === 0;
  if (!ok) bad++;
  console.log(`${f.split('/').pop()}  vars=${r.vars} bodyText=${r.body} exporter=${r.exporterOk} errors=${r.errs.length} pageerrors=${perr.length} ${ok ? 'OK' : 'PROBLEMS'}`);
  for (const e of r.errs.slice(0, 3)) console.log('    ' + e);
  for (const e of perr.slice(0, 3)) console.log('    [pageerror] ' + e);
}
await b.close();
process.exit(bad ? 1 : 0);
