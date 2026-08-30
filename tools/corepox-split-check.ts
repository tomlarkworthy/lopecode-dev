import {ROSTER, Ship, World} from "./corepox-roster.ts";
const by: any = Object.fromEntries(ROSTER.map((s:any)=>[s.name,s]));
for (const [x,y] of [["proportional","turtle"],["sniper","turtle"],["seeker","wall"],["proportional","sniper"]]) {
  const A=by[x], B=by[y];
  const a=new Ship(A,{team:"a",x:-9,y:4,a:33}), b=new Ship(B,{team:"b",x:9,y:-4,a:211});
  const w=new World([a,b]);
  let maxShips=2, firstSplit=-1, contacts=0;
  const hp0 = new Map(w.ships.map((s:any)=>[s,s.live.length]));
  for(let i=0;i<3000;i++){
    const n0=w.ships.length; w.step();
    if(w.ships.length>n0 && firstSplit<0) firstSplit=w.tick;
    maxShips=Math.max(maxShips,w.ships.length);
    if(!a.alive&&!b.alive) break;
    if(!a.alive||!b.alive) break;
  }
  console.log(`${(x+" v "+y).padEnd(24)} t=${w.t.toFixed(0)}s bodies=${w.ships.length} (peak ${maxShips}) firstSplit=${firstSplit<0?"never":"tick "+firstSplit} aAlive=${a.alive} bAlive=${b.alive} parts ${a.live.length}/${A.components.length} ${b.live.length}/${B.components.length}`);
}
