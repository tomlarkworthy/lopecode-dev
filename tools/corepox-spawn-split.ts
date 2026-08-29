// "Some CORPUS enemies have front firing lazers but seem to destroy their weapon on
// spawn. e.g. CEC3F746 seems to spontaneously destroy themselves." (Tom, 2026-08-23)
//
// How many corpus designs arrive in more than one piece, and what happens to the
// pieces when they do. Flies each ALONE -- no enemy, no terrain, no orb.
import {importNotebookModule} from "./notebook-import.ts";
const m = await importNotebookModule(process.env.ENGINE ?? "modules/@tomlarkworthy/corepox-engine.js");
const Ship:any=await m.value("Ship"); const World:any=await m.value("World");
const load:any=await m.value("loadShipSpec");
const GUNS=new Set(["Lazer","LaserTurret2","Explosive"]);
const fs=await import("node:fs");
const raw:any[]=[];
for(const line of fs.readFileSync("vendor/corepox/firebase/data/ships.json","utf8").split("\n")){
  const i=line.indexOf(","); if(i<0) continue;
  try{const s=JSON.parse(line.slice(i+1)); if(s?.components) raw.push([line.slice(0,i),s]);}catch{}
}
let n=0, multi=0, lostAny=0, lostGun=0, disarmed=0, dead=0;
const worst:any[]=[];
for(const [id,r] of raw){
  let s:any; try{s=new Ship(load(r).spec,{team:"a",x:0,y:0,a:0});}catch{continue}
  if(!s.alive||!s.live.length) continue;
  n++;
  const isl=s.islands().length;
  const parts0=s.live.length, guns0=s.live.filter((c:any)=>GUNS.has(c.type)).length;
  const w=new World([s]);
  for(let t=0;t<250;t++) w.step();                 // 5 seconds
  const parts1=w.ships.reduce((a:number,z:any)=>a+z.live.length,0);
  const guns1=w.ships.reduce((a:number,z:any)=>a+z.live.filter((c:any)=>GUNS.has(c.type)).length,0);
  if(isl>1) multi++;
  if(parts1<parts0){ lostAny++;
    if(guns0&&guns1<guns0) lostGun++;
    if(guns0&&guns1===0) disarmed++;
    worst.push([id.slice(0,8),isl,parts0-parts1,guns0-guns1]); }
  if(!s.alive) dead++;
}
worst.sort((a,b)=>b[2]-a[2]);
console.log(`${n} corpus designs, each flown ALONE for 5s`);
console.log(`  ${multi} (${(100*multi/n).toFixed(0)}%) arrive as MORE THAN ONE BODY -- splitDetached fires at t=0`);
console.log(`  ${lostAny} (${(100*lostAny/n).toFixed(0)}%) lose a component with no enemy present`);
console.log(`  ${lostGun} (${(100*lostGun/n).toFixed(0)}%) lose a WEAPON`);
console.log(`  ${disarmed} (${(100*disarmed/n).toFixed(0)}%) end up with NO weapon at all, having spawned armed`);
console.log(`  ${dead} (${(100*dead/n).toFixed(0)}%) lose their last Brain`);
console.log(`\nworst offenders (id, islands at spawn, components lost, weapons lost)`);
for(const wq of worst.slice(0,12)) console.log(`  ${wq[0]}  islands ${wq[1]}  lost ${wq[2]} components, ${wq[3]} weapons`);

// What actually deals the damage, pooled over the whole corpus. Nothing else is in
// the world, so every point of it is self-inflicted.
{
  let phase="?"; const by:Record<string,number>={}, kills:Record<string,number>={};
  for(const p of ["stepParticles","collide","detonate"] as const){
    const f=(World.prototype as any)[p]; if(!f) continue;
    (World.prototype as any)[p]=function(...a:any[]){const o=phase;phase=p;try{return f.apply(this,a)}finally{phase=o}};
  }
  const d=Ship.prototype.damage;
  Ship.prototype.damage=function(c:any,n:number,tr:boolean){
    if(!tr&&n>0){ by[phase]=(by[phase]??0)+n;
      const died=d.call(this,c,n,tr);
      if(died) kills[`${phase} kills ${c.type}`]=(kills[`${phase} kills ${c.type}`]??0)+1;
      return died; }
    return d.call(this,c,n,tr);
  };
  for(const [,r] of raw){
    let s:any; try{s=new Ship(load(r).spec,{team:"a",x:0,y:0,a:0});}catch{continue}
    if(!s.alive||!s.live.length) continue;
    const w=new World([s]); for(let t=0;t<250;t++) w.step();
  }
  Ship.prototype.damage=d;
  console.log(`\nall self-inflicted damage across the corpus, by source`);
  const tot=Object.values(by).reduce((a,b)=>a+b,0);
  for(const [k,v] of Object.entries(by).sort((a,b)=>b[1]-a[1]))
    console.log(`  ${k.padEnd(16)} ${String(v).padStart(8)} hp  (${(100*v/tot).toFixed(0)}%)`);
  console.log(`\ncomponents destroyed, by source`);
  for(const [k,v] of Object.entries(kills).sort((a,b)=>b[1]-a[1]).slice(0,10))
    console.log(`  ${String(v).padStart(4)}x  ${k}`);
}
