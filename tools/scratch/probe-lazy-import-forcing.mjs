// Why does test_modulesSettled_forces_a_lazy_import fail? Replicates the test in page and
// reports what it actually sees, since --run-tests reports a THROW as TIMEOUT.
import { chromium } from 'playwright';
const file = 'file:///Users/tom.larkworthy/dev/lopecode-dev/lopecode/notebooks/@tomlarkworthy_modules.html';
const browser = await chromium.launch({ args: ['--disable-web-security'] });
const page = await browser.newPage();
const errs = [];
page.on('pageerror', e => errs.push(e.message.slice(0, 200)));
await page.goto(file, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => !!window.__ojs_runtime, null, { timeout: 60000 });
await page.waitForTimeout(8000);

const out = await page.evaluate(async () => {
  const rt = window.__ojs_runtime;
  let mod = null;
  for (const v of rt._variables) if (v._name === 'modulesSettled') { mod = v._module; break; }
  const modulesSettled = await mod.value('modulesSettled');
  const Runtime = await mod.value('Runtime');
  const isImportCell = await mod.value('isImportCell');

  // Does the bare dynamic import even work here?
  let importOk = null;
  try { const d = await import('/@tomlarkworthy/runtime-sdk.js?v=4'); importOk = typeof d.default; }
  catch (e) { importOk = 'THREW: ' + String(e && e.message || e).slice(0, 160); }

  const scratch = new Runtime();
  const m = scratch.module();
  m.define('module @tomlarkworthy/runtime-sdk', async () =>
    scratch.module((await import('/@tomlarkworthy/runtime-sdk.js?v=4')).default));
  m.variable().define('borrowed', ['module @tomlarkworthy/runtime-sdk', '@variable'],
    (_, v) => v.import('id', 'borrowed', _));

  const bridge = [...scratch._variables].find(v => v._name === 'module @tomlarkworthy/runtime-sdk');
  const beforeValue = bridge ? typeof bridge._value : 'NO BRIDGE VAR';
  const recognised = bridge ? !!isImportCell(bridge) : null;

  let snapErr = null, names = [], size = 0;
  try {
    const snap = await modulesSettled({ runtime: scratch, rescanMs: 100, titleTimeoutMs: 500, quietMs: 400, timeoutMs: 15000 });
    size = snap.size;
    names = [...snap.values()].map(r => r.name);
  } catch (e) { snapErr = String(e && e.message || e).slice(0, 300); }

  const afterValue = bridge ? typeof bridge._value : 'NO BRIDGE VAR';
  const allModuleVars = [...scratch._variables]
    .filter(v => typeof v._name === 'string' && v._name.startsWith('module '))
    .map(v => ({ name: v._name, value: typeof v._value }));

  return { importOk, beforeValue, afterValue, recognised, size, names, snapErr, allModuleVars,
           scratchVarCount: scratch._variables.size ?? scratch._variables.length };
});

console.log(JSON.stringify(out, null, 2));
console.log('pageerrors:', errs.length, errs.slice(0, 4));
await browser.close();
