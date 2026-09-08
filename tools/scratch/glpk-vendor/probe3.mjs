import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage();
p.on('pageerror', (e) => console.error('PAGEERR', e.message.slice(0, 200)));
await p.goto('file://' + process.cwd() + '/lopebooks/notebooks/@tomlarkworthy_mip.html', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(9000);
console.log(await p.evaluate(async () => {
  const rt = window.__ojs_runtime;
  const v = [...rt._variables].find((x) => x._name === 'test_isCanonical_1');
  const mod = v._module;
  const out = {};
  const wait = (name) => new Promise((res) => {
    const probe = mod.variable({ pending() {}, fulfilled(val) { res(['ok', String(val)]); }, rejected(e) { res(['rejected', e?.message ?? String(e)]); } });
    probe.define(null, [name], (x) => x);
    setTimeout(() => res(['timeout', null]), 15000);
  });
  for (const n of ['math', 'isCanonical', 'extractLHS', 'extractRHS', 'test_isCanonical_1', 'test_expandBrackets_1']) {
    out[n] = await wait(n);
  }
  return JSON.stringify(out, null, 1);
}));
await b.close();
