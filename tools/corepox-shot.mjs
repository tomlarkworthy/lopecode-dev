import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1300, height: 820 }, deviceScaleFactor: 2 });
await p.goto('file://' + process.cwd() + '/lopebooks/notebooks/corepox.html#view=S100(@tomlarkworthy/corepox-render)');
await p.waitForTimeout(Number(process.argv[2] ?? 12000));
const el = await p.evaluateHandle(() => {
  const s = [...document.querySelectorAll('svg')].filter(x => x.querySelector('use'));
  return s.sort((a,b)=>b.clientWidth-a.clientWidth)[0];
});
try { await el.asElement().screenshot({ path: 'tools/screenshots/corepox-battle.png' }); }
catch(e){ await p.screenshot({ path: 'tools/screenshots/corepox-battle.png' }); }
await b.close();
