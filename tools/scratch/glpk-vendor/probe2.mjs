import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage();
await p.goto('file://' + process.cwd() + '/lopebooks/notebooks/@tomlarkworthy_mip.html', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(9000);
console.log(await p.evaluate(() => {
  const rt = window.__ojs_runtime;
  const show = (n) => {
    const vs = [...rt._variables].filter((v) => v._name === n);
    return vs.map((v) => ({
      n, count: vs.length,
      def: String(v._definition).slice(0, 120).replace(/\n/g, '⏎'),
      obs: v._observer && Object.keys(v._observer).join(','),
      reachable: v._reachable, generator: !!v._generator,
      mod: v._module?._name ?? '(anon module)',
    }));
  };
  return JSON.stringify([...show('test_isCanonical_1'), ...show('test_expandBrackets_1')], null, 1);
}));
await b.close();
