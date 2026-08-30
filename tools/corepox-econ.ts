// Where does combat actually go? Shots fired vs landed, and range over time.
import {ROSTER, Ship, World} from "./corepox-roster.ts";
const byName: any = Object.fromEntries(ROSTER.map((s:any)=>[s.name,s]));

function probe(An: string, Bn: string, seed = 3) {
  const A = byName[An], B = byName[Bn];
  const a = new Ship(A, {team:"a", x:-9, y: 4, a: 20 + seed*37});
  const b = new Ship(B, {team:"b", x: 9, y:-4, a: 200 + seed*11});
  const w = new World([a, b]);
  let fired = 0, landed = 0; const ranges: number[] = [];
  for (let i = 0; i < 3000; i++) {
    w.step();
    fired += w.beams.length;
    landed += w.beams.filter((x:any)=>x.hitOk).length;
    if (i % 25 === 0) ranges.push(Math.hypot(a.x-b.x, a.y-b.y));
    if (!a.alive || !b.alive) break;
  }
  const R = ranges;
  return {fired, landed, hitPct: fired? 100*landed/fired : 0,
    rMin: Math.min(...R).toFixed(1), rMed: R.slice().sort((x,y)=>x-y)[R.length>>1].toFixed(1),
    rEnd: R[R.length-1].toFixed(1),
    aLive: `${a.live.length}/${A.components.length}`, bLive: `${b.live.length}/${B.components.length}`,
    t: w.t.toFixed(0)};
}
const pairs = [["sniper","turtle"],["proportional","turtle"],["seeker","turtle"],
  ["wall","turtle"],["seeker","wall"],["proportional","sniper"],["rammer","turtle"],
  ["braitenberg","turtle"]];
console.log("  matchup                 fired landed  hit%   range min/med/end     survivors      t");
for (const [x,y] of pairs) {
  const r = probe(x,y);
  console.log(` ${(x+" v "+y).padEnd(24)} ${String(r.fired).padStart(5)} ${String(r.landed).padStart(6)} ${r.hitPct.toFixed(1).padStart(5)}   ${r.rMin.padStart(5)}/${r.rMed.padStart(5)}/${r.rEnd.padStart(5)}   ${r.aLive.padStart(6)} ${r.bLive.padStart(6)}  ${r.t.padStart(3)}s`);
}
