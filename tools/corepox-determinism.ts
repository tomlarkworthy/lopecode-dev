import {ROSTER, Ship, World} from "./corepox-roster.ts";
const [A,B] = [ROSTER[2], ROSTER[3]];
const run = () => { const a=new Ship(A,{team:"a",x:-9,y:4,a:33}), b=new Ship(B,{team:"b",x:9,y:-4,a:211});
  const w=new World([a,b]); for(let i=0;i<3000;i++){w.step(); if(!a.alive||!b.alive)break;}
  return JSON.stringify([w.tick,a.x,a.y,a.a,b.x,b.y,b.a,a.live.length,b.live.length]); };
const r=[run(),run(),run()];
console.log("identical across 3 runs:", r[0]===r[1] && r[1]===r[2]);
console.log(r[0]);
