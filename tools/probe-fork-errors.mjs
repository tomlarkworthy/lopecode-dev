// Dump the full text of every errored cell in an already-built fork, so a truncated gate message
// can be traced back to the cell that produced it.
import { chromium } from 'playwright';
import { resolve } from 'path';

const file = resolve(process.argv[2] || 'scratch/tpl-blog-tutorial.html');
const b = await chromium.launch({ headless: true });
const p = await b.newPage({ viewport: { width: 1300, height: 1000 } });
p.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 300)));
await p.goto(`file://${file}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
await p.waitForTimeout(20000);
const out = await p.evaluate(() => {
  const rt = window.__ojs_runtime;
  const hits = [];
  for (const v of rt._variables) {
    const n = v._observer && v._observer._node;
    if (!n || !n.textContent) continue;
    const errored = (n.querySelector && n.querySelector('.observablehq--error')) ||
      /\b(Runtime|Reference|Type|Syntax|Range)Error:/.test(n.textContent);
    if (!errored) continue;
    const mod = [...rt.mains.entries()].find(([, m]) => m === v._module)?.[0];
    hits.push({ name: String(v._name), module: mod || '(unnamed module)', pid: v.pid,
      text: n.textContent.replace(/\s+/g, ' ').slice(0, 700) });
  }
  return hits;
});
await b.close();
for (const h of out) console.log(`\n=== ${h.module} :: ${h.name} [${h.pid}]\n${h.text}`);
console.log(`\n${out.length} errored cells`);
