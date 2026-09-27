// Who re-creates the visualizer's dataflow bridges? Patches Variable.prototype.define as soon as
// the runtime exists and records a stack for each `dynamic bridge` definition.
import { chromium } from 'playwright';
import { resolve } from 'node:path';

const file = process.argv[2];
const ms = Number(process.argv[3] ?? 7000);
if (!file) { console.error('usage: boot-bridge-stacks.mjs <notebook.html> [ms]'); process.exit(1); }

const browser = await chromium.launch({ headless: true, args: ['--disable-web-security'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

await page.addInitScript(() => {
  window.__bs = { defs: [], dels: [], patchedAt: null };
  const patch = () => {
    const rt = window.__ojs_runtime;
    if (!rt || !rt._variables || !rt._variables.size) return false;
    const V = [...rt._variables][0].constructor;
    const origDefine = V.prototype.define;
    const origDelete = V.prototype.delete;
    V.prototype.define = function (...args) {
      const name = typeof args[0] === 'string' ? args[0] : null;
      if (name && name.startsWith('dynamic bridge ')) {
        window.__bs.defs.push({ t: Math.round(performance.now()), name, stack: new Error().stack.split('\n').slice(1, 14).join('\n') });
      }
      return origDefine.apply(this, args);
    };
    V.prototype.delete = function () {
      if (this._name && String(this._name).startsWith('dynamic bridge ')) {
        window.__bs.dels.push({ t: Math.round(performance.now()), name: this._name, stack: new Error().stack.split('\n').slice(1, 14).join('\n') });
      }
      return origDelete.apply(this);
    };
    window.__bs.patchedAt = Math.round(performance.now());
    return true;
  };
  const tick = () => { if (!patch() && performance.now() < 8000) requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
});

await page.goto('file://' + resolve(file) + '#view=S100(@tomlarkworthy/lopecode-live-2026)', { waitUntil: 'commit' });
await page.waitForTimeout(ms);

const out = await page.evaluate(() => {
  const { defs, dels, patchedAt } = window.__bs;
  // one representative stack per distinct time bucket
  const buckets = [];
  for (const d of defs) {
    const last = buckets[buckets.length - 1];
    if (last && d.t - last.t < 60) { last.n++; continue; }
    buckets.push({ t: d.t, n: 1, name: d.name, stack: d.stack });
  }
  const delBuckets = [];
  for (const d of dels) {
    const last = delBuckets[delBuckets.length - 1];
    if (last && d.t - last.t < 60) { last.n++; continue; }
    delBuckets.push({ t: d.t, n: 1, name: d.name, stack: d.stack });
  }
  return { patchedAt, totalDefs: defs.length, totalDels: dels.length, buckets, delBuckets };
});

console.log(JSON.stringify(out, null, 2));
await browser.close();
