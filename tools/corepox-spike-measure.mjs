import { chromium } from 'playwright';
const url = 'file://' + process.cwd() + '/scratch/corepox-spike.html';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1400, height: 900 } });
const errs = [];
p.on('pageerror', e => errs.push(String(e)));
p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await p.goto(url);
for (const n of [1, 8, 24, 60]) {
  await p.evaluate(n => reset(n), n);
  await p.waitForTimeout(4000);
  const s = await p.evaluate(() => window.__spike);
  console.log(`n=${String(n).padStart(2)} ships=${String(s.ships).padStart(3)} nodes=${String(s.nodes).padStart(4)} fps=${s.fps.toFixed(0).padStart(3)} sim=${s.sim.toFixed(2)}ms dom=${s.dom.toFixed(2)}ms closed=${s.closed.toFixed(0)}% dist=${s.dist.toFixed(1)}`);
}
await p.evaluate(() => reset(1));
for (const t of [2000, 4000, 6000]) {
  await p.waitForTimeout(2000);
  const s = await p.evaluate(() => window.__spike);
  console.log(`duel t=${t/1000}s dist=${s.dist.toFixed(1)} closed=${s.closed.toFixed(0)}% fps=${s.fps.toFixed(0)}`);
}
await p.screenshot({ path: 'tools/screenshots/corepox-spike.png' });
if (errs.length) console.log('ERRORS:', errs.slice(0, 5));
await b.close();
