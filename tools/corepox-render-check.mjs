import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1400, height: 880 } });
const errs = [];
p.on('pageerror', e => errs.push('PAGEERROR ' + String(e).slice(0,300)));
p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text().slice(0,300)); });
await p.goto('file://' + process.cwd() + '/lopebooks/notebooks/corepox.html#view=S100(@tomlarkworthy/corepox-render)');
await p.waitForTimeout(11000);
const probe = await p.evaluate(async () => {
  const rt = window.__ojs_runtime, m = rt.mains.get('@tomlarkworthy/corepox-render');
  const out = {};
  try {
    out.symbols = Object.keys(await m.value('SYMBOLS')).length;
    out.map = Object.keys(await m.value('SYMBOL_FOR')).length;
    const d = await m.value('demo');
    out.demoTag = d?.tagName;
    out.uses = d?.querySelectorAll('use').length;
    out.texts = d?.querySelectorAll('text').length;
  } catch (e) { out.err = String(e).slice(0,300); }
  return out;
});
console.log(JSON.stringify(probe));
console.log('errors:', errs.length ? errs.slice(0,5) : 'none');
await p.screenshot({ path: 'tools/screenshots/corepox-render.png' });
await b.close();
