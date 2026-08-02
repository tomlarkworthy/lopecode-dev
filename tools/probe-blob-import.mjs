// Is the parent-URL argument to importShim still needed for file-sync's blob imports?
// file-sync reads a module .js off disk, wraps it in a blob:, and imports it. That text is
// exportModuleJS output, so the question is whether ITS cross-module imports still resolve
// when the blob is loaded natively. Tries both paths against a real lopecode page.
import { chromium } from 'playwright';
import { resolve } from 'path';

const file = resolve(process.argv[2] || 'lopebooks/notebooks/@tomlarkworthy_file-sync.html');
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push(String(e).slice(0, 200)));
await page.goto(`file://${file}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
await page.waitForTimeout(12000);

const out = await page.evaluate(async () => {
  const r = { importmap: null, emitted: null, native: null, shim: null, shimNoParent: null };
  const im = document.querySelector('script[type="importmap"]');
  r.importmap = im ? Object.keys(JSON.parse(im.textContent).imports || {}).slice(0, 12) : 'none';

  // What does today's exportModuleJS actually emit for a cross-module import?
  try {
    const rt = window.__ojs_runtime;
    const fs = rt.mains.get('@tomlarkworthy/file-sync');
    let exportModuleJS = null;
    for (const v of rt._variables)
      if (v._name === 'exportModuleJS' && v._module === fs) exportModuleJS = v._value;
    const res = await exportModuleJS('@tomlarkworthy/file-sync');
    const lines = res.source.split('\n').filter((l) => l.includes('module @tomlarkworthy/runtime-sdk'));
    r.emitted = lines[0] ? lines[0].trim().slice(0, 200) : 'no runtime-sdk loader line';
  } catch (e) { r.emitted = 'ERR ' + e.message; }

  // A minimal blob module doing exactly what an emitted module does. A FRESH blob per case —
  // es-module-shims caches by URL, so reusing one would let an earlier success mask a failure.
  const mint = (tag) =>
    URL.createObjectURL(new Blob([
      `export const tag = ${JSON.stringify(tag)};\n` +
      `export const probe = await import("/@tomlarkworthy/runtime-sdk.js?v=4").then(m => typeof m.default).catch(e => "INNER-ERR: " + e.message);`,
    ], { type: 'text/javascript' }));

  // shimNoParent first, so if anything is order-dependent it counts against the claim.
  r.shimNoParent = window.importShim
    ? await window.importShim(mint('a')).then((m) => m.probe).catch((e) => 'SHIM-ERR: ' + e.message)
    : 'no window.importShim';
  r.native = await import(mint('b')).then((m) => m.probe).catch((e) => 'NATIVE-ERR: ' + e.message);
  r.shim = window.importShim
    ? await window.importShim(mint('c'), 'file://@tomlarkworthy/file-sync').then((m) => m.probe).catch((e) => 'SHIM-ERR: ' + e.message)
    : 'no window.importShim';
  // Does the parent-URL argument do anything? Only a RELATIVE specifier could care: it resolves
  // against the blob: URL without a parent, against the parent with one.
  const mintRel = () =>
    URL.createObjectURL(new Blob([
      `export const probe = await import("./@tomlarkworthy/runtime-sdk.js?v=4").then(m => typeof m.default).catch(e => "INNER-ERR: " + e.message);`,
    ], { type: 'text/javascript' }));
  r.relNoParent = await window.importShim(mintRel()).then((m) => m.probe).catch((e) => 'SHIM-ERR: ' + e.message);
  r.relWithParent = await window.importShim(mintRel(), 'file://@tomlarkworthy/file-sync').then((m) => m.probe).catch((e) => 'SHIM-ERR: ' + e.message);
  return r;
});

console.log(JSON.stringify(out, null, 2));
console.log('page errors:', errs.length ? errs.slice(0, 3) : 'none');
await browser.close();
