// Cells that `await visibility()` must (a) not compute while off screen, (b) not park anything
// else, and (c) compute once scrolled to. Check all three.
import { chromium } from 'playwright';
import { resolve } from 'path';
const file = resolve(process.argv[2]);
const cells = process.argv[3].split(',');
const b = await chromium.launch({ headless: true });
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
const errs = [];
p.on('pageerror', (e) => errs.push(String(e).slice(0, 160)));
await p.addInitScript(() => {
  window.__long = [];
  new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__long.push(Math.round(e.duration)); })
    .observe({ entryTypes: ['longtask'] });
});
await p.goto(`file://${file}`, { waitUntil: 'domcontentloaded', timeout: 180000 });
await p.waitForTimeout(25000);

const off = await p.evaluate((cells) => {
  const rt = window.__ojs_runtime;
  const v = (n) => { for (const x of rt._variables) if (x._name === n) return x; };
  // the runtime is not wedged if a brand-new trivial cell still computes
  const probe = rt.mains.get('@tomlarkworthy/coded-landmark-tracking').variable();
  probe.define('__wedge_probe', [], () => 41 + 1);
  let errored = 0; for (const x of rt._variables) if (x._error) errored++;
  return {
    blockedMs: window.__long.reduce((a, c) => a + c, 0),
    longest: Math.max(0, ...window.__long),
    pending: Object.fromEntries(cells.map((c) => [c, v(c)?._value === undefined])),
    erroredVariables: errored,
  };
}, cells);
await p.waitForTimeout(2000);
const wedge = await p.evaluate(() => {
  const rt = window.__ojs_runtime;
  for (const x of rt._variables) if (x._name === '__wedge_probe') return x._value;
});

// scroll every gated cell into view in turn
const target = cells[cells.length - 1];
const scrolled = await p.evaluate((t) => {
  const el = document.querySelector(`[cell="${t}"]`);
  if (!el) return false;
  el.scrollIntoView({ block: 'center' });
  return true;
}, target);
await p.waitForTimeout(20000);
const after = await p.evaluate((t) => {
  const rt = window.__ojs_runtime;
  for (const x of rt._variables) if (x._name === t)
    return { computed: x._value !== undefined, err: x._error ? String(x._error).slice(0, 120) : null };
  return { computed: null };
}, target);

const eachOne = [];
for (const c of cells) {
  const found = await p.evaluate((t) => {
    const el = document.querySelector(`[cell="${t}"]`);
    if (!el) return false;
    el.scrollIntoView({ block: 'center' });
    return true;
  }, c);
  await p.waitForTimeout(9000);
  eachOne.push(await p.evaluate((t) => {
    const rt = window.__ojs_runtime;
    for (const x of rt._variables) if (x._name === t)
      return { cell: t, found: true, computed: x._value !== undefined, err: x._error ? String(x._error).slice(0, 90) : null };
    return { cell: t, found: false };
  }, c));
  if (!found) eachOne[eachOne.length - 1].nodeMissing = true;
}
const consumers = await p.evaluate(() => {
  const rt = window.__ojs_runtime;
  const out = {};
  for (const n of ['poolReport', 'hexRigSweep'])
    for (const x of rt._variables) if (x._name === n)
      out[n] = { computed: x._value !== undefined, err: x._error ? String(x._error).slice(0, 90) : null };
  let errored = 0; for (const x of rt._variables) if (x._error) errored++;
  out.erroredVariables = errored;
  return out;
});
console.log(JSON.stringify({ off, wedgeProbe: wedge, scrolledTo: target, foundNode: scrolled, after, eachOne, consumers }, null, 1));
console.log('page errors:', errs.length ? errs.slice(0, 4) : 'none');
await b.close();
