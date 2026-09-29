// Exports the notebook in-page (exportToHTML, as save-in-place does) and writes the result to argv[3].
import { chromium } from 'playwright';
import { resolve } from 'node:path';
import { writeFileSync } from 'node:fs';
const b = await chromium.launch({ headless: true });
const page = await (await b.newContext()).newPage();
await page.goto('file://' + resolve(process.argv[2]), { waitUntil: 'load', timeout: 120000 });
await page.waitForTimeout(10000);
const res = await page.evaluate(async () => {
  const rt = window.__ojs_runtime;
  const get = n => { for (const v of rt._variables) if (v._name === n && v._value !== undefined) return v._value; };
  const exportToHTML = get('exportToHTML');
  if (typeof exportToHTML !== 'function') return { err: 'no exportToHTML' };
  const r = await exportToHTML({ mains: new Map(rt.mains), runtime: rt, options: {} });
  return { html: r?.source ?? r };
});
if (res.err) { console.log(res.err); process.exit(1); }
writeFileSync(resolve(process.argv[3]), res.html);
console.log('wrote', res.html.length);
await b.close();
