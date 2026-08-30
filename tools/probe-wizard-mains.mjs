// Does a module created by the import wizard survive a save? installModuleSource sets
// runtime.mains and writes a script block; save-in-place exports with mains: new Map(runtime.mains).
// So the question is whether the exported bootconf.json lists it — i.e. whether it BOOTS on reload,
// not merely whether its source is present.
import { chromium } from 'playwright';
import { resolve } from 'path';

const file = resolve(process.argv[2] || 'lopecode/notebooks/quick_start.html');
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push(String(e).slice(0, 160)));
await page.goto(`file://${file}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
await page.waitForTimeout(18000);

const out = await page.evaluate(async () => {
  const rt = window.__ojs_runtime;
  const byName = (n) => {
    for (const v of rt._variables) if (v._name === n && typeof v._value === 'function') return v._value;
    return null;
  };
  const installModuleSource = byName('installModuleSource');
  const exportToHTML = byName('exportToHTML');
  if (!installModuleSource) return { error: 'installModuleSource not found' };
  if (!exportToHTML) return { error: 'exportToHTML not found' };

  const NAME = '@probe/wizard-made';
  const src = `export default function define(runtime, observer) {
  const main = runtime.module();
  main.variable(observer("probeCell")).define("probeCell", [], () => 42);
  return main;
}`;
  await installModuleSource(NAME, src);
  const inMains = rt.mains.has(NAME);
  const hasBlock = !!document.getElementById(NAME);

  const resp = await exportToHTML({ mains: new Map(rt.mains), runtime: rt, options: { hash: '' } });
  const html = resp?.source ?? resp;

  // The exporter's own source contains a TEMPLATE bootconf block, so take the last
  // match that actually parses as JSON.
  let boot = null;
  const re = /<script[^>]*id="bootconf\.json"[^>]*>([\s\S]*?)<\/script>/g;
  let m;
  while ((m = re.exec(html))) {
    try { boot = JSON.parse(m[1]); } catch (e) {}
  }
  return {
    inRuntimeMains: inMains,
    hasScriptBlock: hasBlock,
    exportBytes: typeof html === 'string' ? html.length : null,
    blockInExport: typeof html === 'string' && html.includes(`id="${NAME}"`),
    bootconfMains: boot ? boot.mains : null,
    listedInBootconf: !!(boot && boot.mains && boot.mains.includes(NAME)),
  };
});

console.log(JSON.stringify(out, null, 2));
console.log('page errors:', errs.length ? errs.slice(0, 3) : 'none');
await browser.close();
