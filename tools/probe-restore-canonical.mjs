// Does exporter-3's restoreCanonicalImports rewrite the importShim forms file-sync could carry?
// Run against a real booted notebook so the cell gets its true dependencies.
import { chromium } from 'playwright';
import { resolve } from 'path';

const file = resolve(process.argv[2] || 'lopebooks/notebooks/@tomlarkworthy_file-sync.html');
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto(`file://${file}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
await page.waitForTimeout(12000);

const out = await page.evaluate(async () => {
  const rt = window.__ojs_runtime;
  // exporter-3 is an imported module here, not a main, so match by name + callable.
  let R = null, exporterMod = null;
  for (const v of rt._variables)
    if (v._name === 'restoreCanonicalImports' && typeof v._value === 'function') { R = v._value; exporterMod = v._module; }
  if (typeof R !== 'function') {
    const info = { type: typeof R, ctor: R && R.constructor && R.constructor.name, keys: R ? Object.keys(R).slice(0, 10) : null };
    const cands = [];
    for (const v of rt._variables)
      if (v._name === 'restoreCanonicalImports') cands.push({ mod: [...rt.mains].find(([, m]) => m === v._module)?.[0] || '?', t: typeof v._value });
    if (R && typeof R.then === 'function') R = await R;
    if (typeof R !== 'function') return { error: 'not a function', info, cands };
  }

  const cases = {
    injected: "async () => { const mod = await importShim(url); }",
    windowed: "async () => { const mod = await window.importShim(url); }",
    windowedParent: "async () => { const mod = await window.importShim(url, 'file://@tomlarkworthy/file-sync'); }",
    aliased: "async () => { const load = importShim; const mod = await load(url); }",
    observableCompiled: "async () => await importShim(url, 'https://api.observablehq.com/@a/b.js?v=4')",
  };
  const r = {};
  for (const [k, src] of Object.entries(cases)) {
    const o = R(src);
    r[k] = o === src ? 'UNCHANGED' : o;
  }

  // The cells that actually matter: does an export preserve file-sync's blob loads?
  const fs = rt.mains.get('@tomlarkworthy/file-sync');
  r.realCells = {};
  for (const name of ['filesToNotebook', 'viewof disassemble']) {
    for (const v of rt._variables) {
      if (v._name !== name || v._module !== fs) continue;
      const src = v._definition.toString();
      const after = R(src);
      r.realCells[name] = {
        shimCallsBefore: (src.match(/window\.importShim\(url\)/g) || []).length,
        shimCallsAfter: (after.match(/window\.importShim\(url\)/g) || []).length,
        bareImportAfter: (after.match(/[^.\w]import\(url\)/g) || []).length,
        survives: after === src,
      };
    }
  }
  return r;
});

console.log(JSON.stringify(out, null, 2));
await browser.close();
