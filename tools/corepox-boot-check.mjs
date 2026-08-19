import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1500, height: 900 } });
const errs = [];
p.on('pageerror', e => errs.push('PAGEERROR ' + String(e).slice(0,200)));
p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text().slice(0,200)); });
await p.goto('file://' + process.cwd() + '/lopebooks/notebooks/corepox.html');
await p.waitForTimeout(9000);
const probe = await p.evaluate(async () => {
  const rt = window.__ojs_runtime;
  if (!rt) return { err: 'no runtime' };
  const out = { mains: [...rt.mains.keys()].filter(k => k.includes('corepox')) };
  try {
    const eng = rt.mains.get('@tomlarkworthy/corepox-engine');
    const sim = await eng.value('simulate');
    const TYPES = await eng.value('TYPES');
    out.types = Object.keys(TYPES).length;
    const B = { name:'b', components:[{type:'Brain',pos:[0,0]}] };
    out.sim = sim(B, B, { ticks: 50 }).winner;
    const as = rt.mains.get('@tomlarkworthy/corepox-assets');
    const SY = await as.value('SYMBOLS');
    out.symbols = Object.keys(SY).length;
    out.spriteWorks = (await as.value('sprite'))('brain').tagName;
  } catch (e) { out.err = String(e).slice(0,200); }
  return out;
});
console.log(JSON.stringify(probe, null, 1));
console.log('errors:', errs.length ? errs.slice(0,6) : 'none');
await p.screenshot({ path: 'tools/screenshots/corepox-notebook.png' });
await b.close();
