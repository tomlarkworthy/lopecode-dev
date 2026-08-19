import {importNotebookModule} from "./notebook-import.ts";
const m=await importNotebookModule("modules/@tomlarkworthy/corepox-engine.js");
const Ship:any=await m.value("Ship"); const load:any=await m.value("loadShipSpec");
const JOINTS:any=await m.value("JOINTS");
const fs=await import("node:fs"); const raw:any[]=[];
for(const line of fs.readFileSync("vendor/corepox/firebase/data/ships.json","utf8").split("\n")){
  const i=line.indexOf(","); if(i<0) continue;
  try{const s=JSON.parse(line.slice(i+1)); if(s?.components) raw.push(s);}catch{}
}
let n=0, withJointless=0; const miss:any={};
for(const r of raw){ let s:any; try{s=new Ship(load(r).spec,{team:"a"});}catch{continue}
  n++; let bad=false;
  for(const c of s.live) if(!JOINTS[c.type]){bad=true; miss[c.type]=(miss[c.type]??0)+1;}
  if(bad) withJointless++; }
console.log(`${withJointless}/${n} ships (${(100*withJointless/n).toFixed(0)}%) contain a type with NO joint table`);
console.log("component instances missing a joint table:", miss);
