// Is the vendored glpk.js bundle self-contained? Serve nothing; import it from a blob offline.
import fs from 'node:fs';
import { chromium } from 'playwright';
const src = fs.readFileSync('tools/scratch/glpk-vendor/glpk-5.0.0.js', 'utf8');
const b = await chromium.launch();
const p = await b.newPage();
const asked = [];
await p.route('**/*', (route) => {
  const u = route.request().url();
  if (u.startsWith('blob:') || u === 'about:blank' || u.startsWith('data:')) return route.continue();
  asked.push(u);
  return route.abort();
});
await p.goto('about:blank');
const out = await p.evaluate(async (src) => {
  const url = URL.createObjectURL(new Blob([src], { type: 'text/javascript' }));
  const GLPK = (await import(url)).default;
  const glpk = await GLPK();
  const r = await glpk.solve({
    name: 'LP',
    objective: { direction: glpk.GLP_MAX, name: 'obj', vars: [{ name: 'x1', coef: 0.6 }, { name: 'x2', coef: 0.5 }] },
    subjectTo: [
      { name: 'c1', vars: [{ name: 'x1', coef: 1 }, { name: 'x2', coef: 2 }], bnds: { type: glpk.GLP_UP, ub: 1, lb: 0 } },
      { name: 'c2', vars: [{ name: 'x1', coef: 3 }, { name: 'x2', coef: 1 }], bnds: { type: glpk.GLP_UP, ub: 2, lb: 0 } }
    ]
  });
  return { version: glpk.version, status: r.result.status, opt: r.result.status === glpk.GLP_OPT, z: r.result.z, vars: r.result.vars };
}, src);
console.log('result', JSON.stringify(out));
console.log('network requests attempted:', asked.length ? asked : 'none');
await b.close();
