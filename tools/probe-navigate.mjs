import { chromium } from 'playwright';
import { resolve } from 'path';
const b = await chromium.launch({ headless: true });
const p = await b.newPage({ viewport: { width: 1300, height: 1000 } });
await p.goto(`file://${resolve('lopecode/notebooks/quick_start.html')}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForTimeout(25000);
console.log(await p.evaluate(() => {
  const rt = window.__ojs_runtime;
  const names = [];
  for (const v of rt._variables) if (v._name === 'navigate') names.push({
    module: v._module?._scope ? '?' : '?', hasValue: v._value !== undefined,
    err: v._error ? String(v._error).slice(0, 80) : null,
    inputs: (v._inputs || []).map((i) => i._name),
  });
  // which module owns a cell called navigate
  const owners = [];
  for (const m of rt._modules?.values?.() ?? []) {}
  const lp = [...rt._variables].filter((v) => v._name === 'navigate');
  return JSON.stringify({ count: lp.length, detail: names }, null, 1);
}));
await b.close();
