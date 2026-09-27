// Which input makes editor-5's `cellEditor` recompute during boot? Samples the identity of
// cellEditor and each of its declared inputs every rAF and reports when each one changes.
import { chromium } from 'playwright';
import { resolve } from 'node:path';

const file = process.argv[2];
const ms = Number(process.argv[3] ?? 7000);
const browser = await chromium.launch({ headless: true, args: ['--disable-web-security'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

await page.addInitScript(() => {
  window.__ce = { changes: [] };
  const NAMES = ['cellEditor', 'editorTemplate', 'shellTemplate', 'findCell', 'dragReorder',
    'getOption', 'setOption', 'auto_attach', 'syncers',
    'viewof liveCellMap', 'liveCellMap', 'maintain_live_cell_map', 'currentModules',
    'viewof currentModules', 'modules', 'runtime_variables', 'cellMap', 'moduleMap'];
  const ids = new WeakMap(); let idSeq = 0;
  const idOf = (x) => {
    if (x === null || typeof x !== 'object' && typeof x !== 'function') return String(x).slice(0, 30);
    if (!ids.has(x)) ids.set(x, '#' + idSeq++);
    return ids.get(x);
  };
  const prev = new Map();
  const tick = () => {
    const rt = window.__ojs_runtime;
    if (rt && rt._variables) {
      const t = Math.round(performance.now());
      for (const v of rt._variables) {
        if (!NAMES.includes(v._name)) continue;
        const mod = v._module;
        let mn = '?';
        try { const n = [...(mod?._scope?.keys?.() ?? [])].find(k => k.startsWith('module @')); mn = n ? n.slice(7) : 'main'; } catch {}

        const key = mn + '::' + v._name;
        const sig = idOf(v._value) + '|def' + idOf(v._definition) + '|v' + v._version;
        if (prev.get(key) !== sig) { window.__ce.changes.push({ t, key, sig, was: prev.get(key) ?? null }); prev.set(key, sig); }
      }
    }
    if (performance.now() < 8000) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
});

await page.goto('file://' + resolve(file) + '#view=S100(@tomlarkworthy/lopecode-live-2026)', { waitUntil: 'commit' });
await page.waitForTimeout(ms);
const out = await page.evaluate(() => window.__ce.changes);
for (const c of out) console.log(String(c.t).padStart(5), c.key.padEnd(48), (c.was ?? '-') + '  ->  ' + c.sig);
await browser.close();
