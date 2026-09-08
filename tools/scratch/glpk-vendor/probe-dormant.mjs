import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage();
await p.goto('file://' + process.cwd() + '/lopebooks/notebooks/@tomlarkworthy_mip.html', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(9000);
console.log(await p.evaluate(async () => {
  const rt = window.__ojs_runtime;
  const names = ['test_isCanonical_1', 'test_expandBrackets_1', 'test_canonicalize_scale_10k'];
  const out = [];
  for (const n of names) {
    const vs = [...rt._variables].filter((v) => v._name === n);
    for (const v of vs) {
      v._reachable = true; v._module._runtime._dirty.add(v);
      out.push({ n, defLen: String(v._definition).length, inputs: v._inputs.map((i) => i._name) });
    }
  }
  rt._computeNow?.() ?? [...rt._variables][0]._module._runtime._computeNow();
  await new Promise((r) => setTimeout(r, 6000));
  for (const o of out) {
    const v = [...rt._variables].find((x) => x._name === o.n);
    o.value = String(v._value); o.error = v._error?.message;
  }
  return JSON.stringify(out, null, 1);
}));
await b.close();
