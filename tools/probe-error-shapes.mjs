// The guide is about to tell readers what a broken cell looks like. Capture the REAL messages:
// duplicate name, circular definition, plain runtime error — and whether neighbours survive.
import { chromium } from 'playwright';
import { resolve } from 'path';
const b = await chromium.launch({ headless: true });
const p = await b.newPage({ viewport: { width: 1400, height: 1000 } });
await p.goto(`file://${resolve('scratch/tpl-blog-tutorial.html')}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
await p.waitForTimeout(18000);

const out = await p.evaluate(async () => {
  const rt = window.__ojs_runtime;
  const mod = rt.mains.get([...rt.mains.keys()].find((k) => k.startsWith('@user/')));
  const seen = {};
  const obs = (label) => ({
    pending() {}, fulfilled(v) { seen[label] = { ok: String(v).slice(0, 40) }; },
    rejected(e) { seen[label] = { err: (e && e.message) || String(e) }; },
  });
  // 1. duplicate name — define `rate` a second time (the template already has viewof rate)
  mod.variable(obs('duplicate')).define('rate', [], () => 99);
  // 2. circular definition
  mod.variable(obs('cycleA')).define('qaA', ['qaB'], (b) => b + 1);
  mod.variable(obs('cycleB')).define('qaB', ['qaA'], (a) => a + 1);
  // 3. ordinary runtime error, and a neighbour that should be untouched
  mod.variable(obs('throws')).define('qaThrows', [], () => { throw new Error('boom'); });
  mod.variable(obs('neighbour')).define('qaFine', [], () => 'still fine');
  // 4. reference to a name that does not exist
  mod.variable(obs('missing')).define('qaMissing', ['noSuchCell'], (x) => x);
  await new Promise((r) => setTimeout(r, 3000));
  return seen;
});
console.log(JSON.stringify(out, null, 1));
await b.close();
