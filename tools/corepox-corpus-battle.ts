// Do REAL player ships fly? Sample the corpus and fight them.
import {importNotebookModule} from "./notebook-import.ts";
const m=await importNotebookModule("modules/@tomlarkworthy/corepox-engine.js");
const Ship:any=await m.value("Ship"); const World:any=await m.value("World");
const load:any=await m.value("loadShipSpec");
const fs=await import("node:fs");
const raw:any[]=[];
for (const line of fs.readFileSync("vendor/corepox/firebase/data/ships.json","utf8").split("\n")){
  const i=line.indexOf(","); if(i<0) continue;
  try{const s=JSON.parse(line.slice(i+1)); if(s?.components?.length>=6 && (s.connections?.length??0)>=3) raw.push(s);}catch{}
}
console.log(`candidate real ships (>=6 parts, >=3 wires): ${raw.length}`);
let closed=0, fought=0, decisive=0;
for (let i=0;i<40;i++){
  const A=load(raw[(i*7)%raw.length]).spec, B=load(raw[(i*13+3)%raw.length]).spec;
  const a=new Ship(A,{team:"a",x:-12,y:5,a:20}), b=new Ship(B,{team:"b",x:12,y:-5,a:200});
  if(!a.alive||!b.alive) continue;
  const w=new World([a,b]); const r0=Math.hypot(a.x-b.x,a.y-b.y);
  for(let t=0;t<3000;t++){w.step(); if(!a.alive||!b.alive)break;}
  const r1=Math.hypot(a.x-b.x,a.y-b.y);
  fought++; if(r1<r0*0.6) closed++; if(!a.alive||!b.alive) decisive++;
}
console.log(`fought ${fought} real-vs-real matches`);
console.log(`  closed to <60% of start range: ${closed} (${(100*closed/fought).toFixed(0)}%)  <- ships actually pilot`);
console.log(`  decisive (someone died):       ${decisive} (${(100*decisive/fought).toFixed(0)}%)`);
