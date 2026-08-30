// "Some CORPUS enemies have front firing lazers but seem to destroy their weapon on
// spawn. e.g. CEC3F746 seems to spontaneously destroy themselves." (Tom, 2026-08-23)
// Flies one design ALONE -- no enemy, no terrain -- and reports what kills it.
import {importNotebookModule} from "./notebook-import.ts";
const m = await importNotebookModule(process.env.ENGINE ?? "modules/@tomlarkworthy/corepox-engine.js");
const Ship:any=await m.value("Ship"); const World:any=await m.value("World");
const load:any=await m.value("loadShipSpec"); const UNITS:any=await m.value("UNITS");
const TYPES:any=await m.value("TYPES");
const fs=await import("node:fs");
const want=(process.argv[2]??"CEC3F746").toUpperCase();
let raw:any=null, id="";
for(const line of fs.readFileSync("vendor/corepox/firebase/data/ships.json","utf8").split("\n")){
  const i=line.indexOf(","); if(i<0) continue;
  if(!line.slice(0,i).toUpperCase().startsWith(want)) continue;
  id=line.slice(0,i); try{raw=JSON.parse(line.slice(i+1));}catch{}
  break;
}
if(!raw){console.log("no such ship");process.exit(1);}

const {spec}=load(raw);
const probe=new Ship(spec,{team:"a",x:0,y:0,a:0});
console.log(`${id}`);
console.log(`  ${probe.live.length} components, islands ${JSON.stringify(probe.islands().map((i:any)=>i.length))}`);
for(const c of probe.live){
  const tiles=probe.worldTiles(c).map(([x,y]:any[])=>`${x.toFixed(1)},${y.toFixed(1)}`);
  console.log(`  ${c.type.padEnd(13)} hp ${String(c.hp).padEnd(4)} cells ${tiles.join("  ")}`);
}

function fly(label:string, mut:(u:any)=>void){
  const save={...UNITS}; mut(UNITS);
  const s=new Ship(load(raw).spec,{team:"a",x:0,y:0,a:0});
  const w=new World([s]);
  const log:string[]=[]; let split=-1;
  for(let t=0;t<250;t++){
    const n0=w.ships.length, l0=w.ships.map((z:any)=>z.live.length).join("/");
    w.step();
    if(w.ships.length!==n0 && split<0) split=t;
    const l1=w.ships.map((z:any)=>z.live.length).join("/");
    if(l1!==l0||w.ships.length!==n0) log.push(`    t=${(t*0.02).toFixed(2)}s  ships ${n0}->${w.ships.length}  live ${l0} -> ${l1}`);
  }
  Object.assign(UNITS,save);
  console.log(`\n${label}`);
  console.log(log.slice(0,8).join("\n") || "    (nothing changed)");
  console.log(`    after 5s: ${w.ships.length} bodies, ${w.ships.map((z:any)=>z.live.map((c:any)=>c.type+":"+c.hp).join("+")||"(empty)").join("   |   ")}`);
}

fly("as shipped", ()=>{});
fly(`with RAM_DMG 0 (was ${UNITS.RAM_DMG})`, (u:any)=>{u.RAM_DMG=0;});

// which phase deals the damage?
{
  const s=new Ship(load(raw).spec,{team:"a",x:0,y:0,a:0});
  const w=new World([s]);
  let phase="?"; const tally:Record<string,number>={};
  for(const p of ["stepParticles","collide","splitDetached"] as const){
    const f=(World.prototype as any)[p];
    (World.prototype as any)[p]=function(...a:any[]){const o=phase;phase=p;try{return f.apply(this,a)}finally{phase=o}};
  }
  const d=Ship.prototype.damage;
  let t=0; const first:string[]=[];
  Ship.prototype.damage=function(c:any,n:number,tr:boolean){
    if(!tr){ tally[`${phase} -> ${c.type} ${n}`]=(tally[`${phase} -> ${c.type} ${n}`]??0)+1;
      if(first.length<3) first.push(`    t=${(t*0.02).toFixed(2)}s  ${phase} deals ${n} to ${c.type}`); }
    return d.call(this,c,n,tr);
  };
  for(t=0;t<250;t++) w.step();
  Ship.prototype.damage=d;
  console.log("\nwho actually deals the damage");
  console.log(first.join("\n"));
  for(const [k,v] of Object.entries(tally).sort((a,b)=>b[1]-a[1])) console.log(`    ${String(v).padStart(4)}x  ${k}`);
}
