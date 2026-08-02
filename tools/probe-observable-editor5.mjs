// Which editor-5 cell fails on observablehq.com? Resolve the module the annotate layer loads
// and try the cells the heavy editor needs, reporting resolved / rejected / still pending.
import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1300, height: 1200 } });
await page.goto('https://observablehq.com/@tomlarkworthy/annotate', { waitUntil: 'domcontentloaded', timeout: 90000 });
await page.waitForTimeout(22000);
const frame = page.frames().find((f) => f.url().includes('observableusercontent.com'));

console.log(await frame.evaluate(async () => {
  const rt = window.__ojs_runtime;
  const home = ([...rt._variables].find((v) => v._name === 'a2Layer') || {})._module;
  const thunk = ([...rt._variables].find((v) => v._name === 'cellEditor' && v._module === home) || {})._value;
  const out = [];
  let mod = null;
  try {
    await thunk(); // resolves cellEditor, and with it the module
    mod = [...rt._variables].find((v) => v._name === 'cellEditor' && v._module !== home)?._module;
    out.push('editor-5 module: ' + (mod ? 'found, ' + mod._scope.size + ' cells' : 'NOT FOUND'));
  } catch (e) { out.push('thunk threw: ' + String(e).slice(0, 120)); }
  if (!mod) return out.join('\n');

  const race = (p, ms) => Promise.race([
    p.then((v) => 'ok:' + (v && v.constructor ? v.constructor.name : typeof v)).catch((e) => 'REJECTED ' + String(e).slice(0, 90)),
    new Promise((r) => setTimeout(() => r('PENDING'), ms))
  ]);
  for (const name of ['cloneDataflow', 'editorModule', 'shellTemplate', 'editorTemplate',
                      'code_editor', 'code_editor_view', 'editor_panel', 'decompiled', 'toolbar']) {
    let res;
    try { res = await race(mod.value(name), 6000); } catch (e) { res = 'threw ' + String(e).slice(0, 90); }
    out.push(`  ${name.padEnd(20)} ${res}`);
  }
  return out.join('\n');
}));
await browser.close();
