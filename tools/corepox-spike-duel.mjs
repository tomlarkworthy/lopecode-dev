import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage();
await p.goto('file://' + process.cwd() + '/scratch/corepox-spike.html');
await p.evaluate(() => reset(1));
const rows = await p.evaluate(async () => {
  const out = []; const s = ships.find(s => s.name === 'seeker');
  const tgt = ships.find(s => s.name === 'drone');
  for (let k = 0; k < 20; k++) {
    await new Promise(r => setTimeout(r, 1000));
    const n = nearestEnemy(s, s.x, s.y);
    const rad = s.comps.find(c => c.type === 'Radar');
    out.push([k+1, n?n.d:NaN, rad.out.bearing, tgt.live.length, tgt.alive?1:0]);
  }
  return out;
});
console.log(' t(s)   dist  bearing  tgtHP  alive');
for (const r of rows) console.log(r.map(v=> (v==null||isNaN(v)?'NaN':(+v).toFixed(2))).map(s=>s.padStart(6)).join(' '));
await p.screenshot({ path: 'tools/screenshots/corepox-duel.png' });
await b.close();
