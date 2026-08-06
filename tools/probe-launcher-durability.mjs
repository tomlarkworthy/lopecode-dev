// Does saving the launcher keep the modules the chooser hands out?
//
// exporter-3 emits module blocks by walking `runtime.mains` through each module's imports. A block
// that is neither a main nor imported by one is invisible to that walk, so a save-in-place — which
// is just exportToHTML({mains: new Map(runtime.mains), runtime}) — writes a file with the block
// gone. The chooser then offers a module the file no longer carries, and Generate throws.
//
// Boots the notebook, exports it the way save-in-place does, and diffs the module blocks.
import { chromium } from 'playwright';
import { resolve } from 'path';
import { readFileSync, writeFileSync } from 'fs';

const file = resolve(process.argv[2] || 'lopecode/notebooks/quick_start.html');
const before = [...readFileSync(file, 'utf8')
  .matchAll(/<script\s+id="([^"]+)"[^>]*data-mime="application\/javascript"/g)].map((m) => m[1]);

const b = await chromium.launch({ headless: true });
const p = await b.newPage({ viewport: { width: 1300, height: 1000 } });
p.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 200)));
await p.goto(`file://${file}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForTimeout(25000);

const r = await p.evaluate(async () => {
  const rt = window.__ojs_runtime;
  const val = (n) => { for (const v of rt._variables) if (v._name === n && v._value !== undefined) return v._value; };
  const exportToHTML = val('exportToHTML');
  if (!exportToHTML) return { error: 'exportToHTML not resolved in the launcher' };
  // A fork carries no catalogue; there the interesting number is simply what a save drops.
  const cat = val('catalogue');
  const offered = cat
    ? [...new Set([...cat.always, ...cat.mandatory, ...cat.optional].map((m) => m.id).concat(cat.cargo || []))]
    : [];
  const resp = await exportToHTML({ mains: new Map(rt.mains), runtime: rt, options: {} });
  return { html: resp?.source ?? resp, mains: [...rt.mains.keys()], offered };
});
await b.close();
if (r.error) { console.log('FAIL', r.error); process.exit(1); }

const out = resolve('scratch/launcher-resaved.html');
writeFileSync(out, r.html);
const after = [...r.html.matchAll(/<script\s+id="([^"]+)"[^>]*data-mime="application\/javascript"/g)].map((m) => m[1]);
const lost = before.filter((id) => !after.includes(id));
const offeredLost = r.offered.filter((id) => !after.includes(id));

console.log(`blocks on disk ${before.length} -> after a save ${after.length}`);
console.log(`mains ${r.mains.length}`);
console.log(`lost (${lost.length}): ${lost.join(', ') || 'none'}`);
console.log(`offered by the chooser but lost (${offeredLost.length}): ${offeredLost.join(', ') || 'none'}`);
process.exit(offeredLost.length ? 1 : 0);
