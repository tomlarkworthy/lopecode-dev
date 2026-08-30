// Does the ported damage model behave like the constants say it should?
import {importNotebookModule} from "./notebook-import.ts";
const m = await importNotebookModule("modules/@tomlarkworthy/corepox-engine.js");
const Ship:any=await m.value("Ship"); const World:any=await m.value("World");
const U:any=await m.value("UNITS"); const DT:number=await m.value("DT");

const C=(type:string,pos:number[],extra:any={})=>({type,pos,dir:"up",...extra});
const gun=(y:number)=>({name:"gun",components:[C("Brain",[0,0]),C("Constant",[0,-1],{param:"100"}),C("Lazer",[0,1])],
  connections:[{from:[0,-1],fromPort:"out",to:[0,1],toPort:"in"}]});
const brick={name:"brick",components:[C("Brain",[0,0]),C("Armour",[0,1]),C("Armour",[1,0]),C("Armour",[-1,0])],connections:[]};

console.log("BEAM range: speed", U.BEAM_SPEED.toFixed(1), "tiles/s x ttl", U.BEAM_TTL,
            "=", (U.BEAM_SPEED*U.BEAM_TTL).toFixed(1), "tiles");

// 1. a bolt must MISS beyond its range
for (const gap of [20, 35, 50]) {
  const a=new Ship(gun(0),{team:"a",x:0,y:gap/2,a:0});      // heading 0 is -y
  const b=new Ship(brick,{team:"b",x:0,y:-gap/2,a:180});
  a.vx=a.vy=a.w=0; b.vx=b.vy=b.w=0;
  const w=new World([a,b]); (w as any).constructor.EXHAUST=false;
  // freeze both ships so only the bolt moves
  const hpBefore=b.live.reduce((n:number,c:any)=>n+c.hp,0);
  for(let i=0;i<400;i++){ w.step(); a.vx=a.vy=a.w=0; b.vx=b.vy=b.w=0; a.x=0; a.y=gap/2; b.x=0; b.y=-gap/2; }
  const hpAfter=b.live.reduce((n:number,c:any)=>n+c.hp,0);
  console.log(`  gap ${String(gap).padStart(2)} tiles -> target took ${hpBefore-hpAfter} damage in 8s`);
}

// 2. a laser needs 20s of fire to chew one Armour (100hp / 5 per second)
{
  const a=new Ship(gun(0),{team:"a",x:0,y:5,a:0});
  const b=new Ship({name:"one",components:[C("Brain",[0,1]),C("Armour",[0,0])],connections:[]},{team:"b",x:0,y:-5,a:180});
  const w=new World([a,b]); World.EXHAUST=false;
  let t=0; const armour=b.comps.find((c:any)=>c.type==="Armour");
  while(armour.hp>0 && t<60){ w.step(); a.x=0;a.y=5;a.vx=a.vy=a.w=0;a.a=0; b.x=0;b.y=-5;b.vx=b.vy=b.w=0;b.a=180; t+=DT; }
  console.log(`  one Armour (100hp) under one Lazer: ${t.toFixed(1)}s  (expected ~20s at 5 dmg/s)`);
}

// 3. friendly fire: an Explosive on your own hull must shred your own ship
{
  const suicide={name:"boom",components:[C("Brain",[0,0]),C("Constant",[0,-1],{param:"1"}),
    C("Explosive",[0,2]),C("Armour",[1,2]),C("Armour",[-1,2]),C("Armour",[0,3])],
    connections:[{from:[0,-1],fromPort:"out",to:[0,2],toPort:"in"}]};
  const a=new Ship(suicide,{team:"a",x:0,y:0,a:0});
  const w=new World([a]); World.EXHAUST=false;
  const before=a.live.length;
  for(let i=0;i<300;i++) w.step();
  const hurt=a.comps.filter((c:any)=>c.type==="Armour").map((c:any)=>c.hp);
  console.log(`  self-detonation: ${before} parts -> ${a.live.length} alive; own armour hp now [${hurt}] (was [100,100,100])`);
}

// 4. exhaust burns whatever sits behind an engine -- including your own ship
{
  World.EXHAUST=true;
  // armour parked directly behind the nozzle, brain safely off the exhaust line
  const ok={name:"ok",components:[C("Engine",[0,3]),C("Armour",[0,1]),C("Brain",[1,1]),
    C("Constant",[2,1],{param:"100"})],
    connections:[{from:[2,1],fromPort:"out",to:[0,3],toPort:"in"}]};
  const a=new Ship(ok,{team:"a",x:0,y:0,a:0});
  const w=new World([a]);
  const arm=a.comps.find((c:any)=>c.type==="Armour");
  const brain=a.comps.find((c:any)=>c.type==="Brain");
  for(let i=0;i<500;i++){ w.step(); a.x=0;a.y=0;a.a=0;a.vx=a.vy=a.w=0; }
  console.log(`  armour parked in the exhaust: 100 -> ${arm.hp} hp after 10s of thrust ` +
              `(brain, one tile off the line, ${brain.hp}/20)`);

  // the classic self-inflicted loss: a core mounted directly behind an engine
  const bad={name:"bad",components:[C("Engine",[0,2]),C("Brain",[0,0]),
    C("Constant",[1,0],{param:"100"})],
    connections:[{from:[1,0],fromPort:"out",to:[0,2],toPort:"in"}]};
  const c2=new Ship(bad,{team:"a",x:0,y:0,a:0});
  const w2=new World([c2]);
  const bb=c2.comps.find((x:any)=>x.type==="Brain");
  let t2=0; while(bb.hp>0 && t2<20){ w2.step(); c2.x=0;c2.y=0;c2.a=0;c2.vx=c2.vy=c2.w=0; t2+=DT; }
  console.log(`  core mounted BEHIND the engine: dead in ${t2.toFixed(2)}s of its own exhaust`);
}
