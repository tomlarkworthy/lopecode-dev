import {importNotebookModule} from "./notebook-import.ts";
const m = await importNotebookModule("modules/@tomlarkworthy/corepox-engine.js");
const Ship:any = await m.value("Ship");
const C=(t:string,p:number[],e:any={})=>({type:t,pos:p,dir:"up",...e});
const SLOTS=[[0,2],[-1,2],[1,2],[-2,2],[2,2],[-1,3],[1,3],[0,3]];
const chassis=(n:number,brains=1)=>({name:`g${n}`,components:[
  C("Brain",[0,0]),...(brains>1?[C("Brain",[-1,-2])]:[]),
  C("Radar",[0,1]),C("Constant",[2,1],{param:"100"}),
  C("Binary",[1,1],{param:"GT"}),C("Binary",[-1,1],{param:"LT"}),
  C("Binary",[1,0],{param:"TIMES"}),C("Binary",[-1,0],{param:"TIMES"}),
  C("Engine",[-1,-1]),C("Engine",[1,-1]),C("Engine",[0,-1]),
  ...SLOTS.slice(0,n).map(g=>C("Lazer",g))],connections:[]});
for (const brains of [1,2]) {
  console.log(`\n== ${brains} Brain(s), supply ${20*brains}`);
  for (const n of [1,3,5,8]) {
    const s=new Ship(chassis(n,brains),{team:"a"});
    const off=s.comps.filter((c:any)=>!c.powered);
    const draw=s.comps.length? s.comps.filter((c:any)=>c.powered).length:0;
    console.log(` ${n} guns: powered ${draw}/${s.comps.length}, spare ${s.power}` +
      (off.length?`  BROWNED OUT: ${off.map((c:any)=>`${c.type}@${c.px},${c.py}`).join(" ")}`:"  (all powered)"));
  }
}
