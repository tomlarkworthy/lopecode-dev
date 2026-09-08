import { chromium } from 'playwright';
const url = 'file://' + process.cwd() + '/lopebooks/notebooks/@tomlarkworthy_glpk-canonicalization.html';
const b = await chromium.launch();
const p = await b.newPage();
p.on('console', (m) => { if (m.type() === 'error') console.error('PAGE', m.text().slice(0, 200)); });
await p.goto(url, { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(8000);
const out = await p.evaluate(async () => {
  const rt = window.__ojs_runtime;
  const find = (n) => [...rt._variables].find((v) => v._name === n);
  const val = async (n) => { const v = find(n); if (!v) return null; v._reachable = true; v._module._runtime._computeNow(); return await v._promise; };
  const canonicalize = await val('canonicalize');
  const math = await val('math');
  const rows = [`mathjs ${math?.version}`];
  const isCanonical = await val('isCanonical');
  for (const n of [3000, 5000, 7000, 10000]) {
    const terms = Array.from({ length: n }).map((_, i) => `x${i}`).join(' + ');
    const step = {};
    for (const [k, f] of [['parse', () => math.parse(terms + ' > 0')],
                          ['isCanonical', () => isCanonical(math.parse(terms + ' > 0'))],
                          ['canonicalize', () => canonicalize(terms + ' > 0')],
                          ['toString', () => canonicalize(terms + ' > 0').toString().length]]) {
      const t = performance.now();
      try { f(); step[k] = Math.round(performance.now() - t) + 'ms'; }
      catch (e) { step[k] = e.message.slice(0, 40); }
    }
    rows.push(`n=${n}\t` + JSON.stringify(step));
  }
  return rows;
});
console.log(out.join('\n'));
await b.close();
