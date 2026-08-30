import { chromium } from 'playwright';
const b = await chromium.launch(); const p = await b.newPage();
await p.goto('file://' + process.cwd() + '/scratch/corepox-spike.html');
await p.evaluate(() => reset(1));
const r = await p.evaluate(async () => {
  const s = ships.find(s=>s.name==='seeker'), t = ships.find(s=>s.name==='drone');
  let fired = 0, hits = 0;
  const origPush = beams.push.bind(beams);
  const log = [];
  for (let k=0;k<25;k++) {
    await new Promise(r=>setTimeout(r,1000));
    log.push({t:k+1, dist:+nearestEnemy(s,s.x,s.y)?.d.toFixed(1),
              hp: t.comps.map(c=>c.hp).join('/'), live:t.live.length, alive:t.alive});
  }
  return log;
});
console.log(' t  dist  drone hp (Brain/Arm/Arm/Arm/Arm)  live alive');
for (const x of r) console.log(String(x.t).padStart(3), String(x.dist).padStart(6), x.hp.padStart(28), String(x.live).padStart(4), x.alive);
await b.close();
