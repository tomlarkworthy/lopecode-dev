import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage();
await p.goto('file://' + process.cwd() + '/lopebooks/notebooks/@tomlarkworthy_mip.html', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(9000);
console.log(await p.evaluate(() => {
  const rt = window.__ojs_runtime;
  const tests = [...rt._variables].filter((v) => typeof v._name === 'string' && v._name.startsWith('test_'));
  const rows = tests.map((v) => ({
    name: v._name,
    block: !/\{return\(/.test(String(v._definition)),
    computed: v._value !== undefined,
    err: v._error !== undefined,
    reachable: v._reachable,
    main: rt.mains ? [...rt.mains.values()].includes(v._module) : null,
  }));
  const g = (f) => rows.filter(f).length;
  return JSON.stringify({
    total: rows.length,
    block_computed: g((r) => r.block && r.computed),
    block_not: g((r) => r.block && !r.computed),
    expr_computed: g((r) => !r.block && r.computed),
    expr_not: g((r) => !r.block && !r.computed),
    sample_block_not: rows.filter((r) => r.block && !r.computed).slice(0, 4),
    sample_expr_computed: rows.filter((r) => !r.block && r.computed).slice(0, 2),
  }, null, 1);
}));
await b.close();
