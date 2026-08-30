import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage();
await p.goto('file://' + process.cwd() + '/scratch/corepox-spike.html');
await p.evaluate(() => reset(1));
const rows = await p.evaluate(async () => {
  const out = [];
  const s = ships.find(s => s.name === 'seeker');
  for (let k = 0; k < 12; k++) {
    await new Promise(r => setTimeout(r, 500));
    const rad = s.comps.find(c => c.type === 'Radar');
    const eL = s.comps.find(c => c.px === -1 && c.py === -1);
    const eR = s.comps.find(c => c.px === 1 && c.py === -1);
    const n = nearestEnemy(s, s.x, s.y);
    out.push([ (k+1)*0.5, s.a, rad.out.bearing, eL.in.in, eR.in.in, n ? n.d : NaN,
               Math.hypot(s.vx, s.vy), s.w ]);
  }
  return out;
});
console.log('t     head    bearing  engL  engR   dist   speed   omega');
for (const r of rows)
  console.log(r.map((v,i)=> (i===0? v.toFixed(1): v==null||isNaN(v)?'  NaN': v.toFixed(2)).padStart(7)).join(' '));
await b.close();
