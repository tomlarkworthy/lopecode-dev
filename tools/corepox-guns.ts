// Does adding guns to a fixed, well-piloted chassis keep paying? If yes, guns have
// no opportunity cost and the wall of lasers is rational.
//
// READ THE REFUSAL BEFORE THE NUMBERS. This chassis was authored when every
// component was assumed 1x1, and under the real footprints it is not a ship: the
// T-tetromino Binaries sit inside the Brain and inside the Radar, 10 overlapping
// cells at one gun and 16 at eight (measured 2026-08-20). The monotonic ladder it
// produced -- 11/36/58/67/78, plan/corepox-design.md S8.3 -- is what the power
// budget was invented to fix, and it was measured on a hull that cannot be built.
// Rebuilding the chassis on the real footprints is an open task; until then this
// tool refuses rather than printing a number that looks like evidence.
import {importNotebookModule} from "./notebook-import.ts";
// ENGINE points this at a variant engine, so a rule change can be A/B'd in one
// session against one build rather than compared to a number from a past one.
const m = await importNotebookModule(process.env.ENGINE ?? "modules/@tomlarkworthy/corepox-engine.js");
const Ship: any = await m.value("Ship"); const World: any = await m.value("World");

const C=(t:string,p:number[],e:any={})=>({type:t,pos:p,dir:"up",...e});
const w_=(f:number[],fp:string,t:number[],tp:string)=>({from:f,fromPort:fp,to:t,toPort:tp});
// laser slots, added in order, kept symmetric so CoM stays put
const SLOTS=[[0,2],[-1,2],[1,2],[-2,2],[2,2],[-1,3],[1,3],[0,3]];
function chassis(nGuns:number){
  const guns=SLOTS.slice(0,nGuns);
  return {name:`guns${nGuns}`,
    components:[C("Brain",[0,0]),C("Radar",[0,1]),C("Constant",[2,1],{param:"100"}),
      C("Binary",[1,1],{param:"GT"}),C("Binary",[-1,1],{param:"LT"}),
      C("Binary",[1,0],{param:"TIMES"}),C("Binary",[-1,0],{param:"TIMES"}),
      C("Engine",[-1,-1]),C("Engine",[1,-1]),C("Engine",[0,-1]),
      ...guns.map(g=>C("Lazer",g))],
    connections:[w_([0,1],"bearing",[1,1],"a"),w_([0,1],"bearing",[-1,1],"a"),
      w_([1,1],"out",[1,0],"a"),w_([2,1],"out",[1,0],"b"),
      w_([-1,1],"out",[-1,0],"a"),w_([2,1],"out",[-1,0],"b"),
      w_([1,0],"out",[-1,-1],"in"),w_([-1,0],"out",[1,-1],"in"),
      w_([2,1],"out",[0,-1],"in"),...guns.map(g=>w_([2,1],"out",g,"in"))]};
}
const LADDER=[1,2,3,5,8].map(chassis);
// sanity: every rung must be a ship -- one joint-bound body, no shared cells
let broken=0;
for(const c of LADDER){const s=new Ship(c,{team:"a"});
  const at=new Map<string,number>();
  for(const k of s.comps) for(const [x,y] of k.tiles) at.set(x+","+y,(at.get(x+","+y)??0)+1);
  const clash=[...at.values()].filter(v=>v>1).length;
  const isl=s.islands().length;
  if(clash||isl>1){broken++; console.log(`!! ${c.name}: ${clash} overlapping cells, ${isl} islands`);}}
if(broken){
  console.log(`\n${broken}/${LADDER.length} rungs are not buildable ships. Refusing to report win
rates -- see the header. Set FORCE=1 to measure anyway, knowing what is being measured.`);
  if(!process.env.FORCE) process.exit(1);
}

function match(A:any,B:any,seed:number){
  const r=(n:number)=>((Math.sin(seed*12.9898+n*78.233)*43758.5453)%1+1)%1;
  const d=10+r(1)*8, th=r(2)*360;
  const a=new Ship(A,{team:"a",x:-Math.sin(th*Math.PI/180)*d,y:Math.cos(th*Math.PI/180)*d,a:r(3)*360});
  const b=new Ship(B,{team:"b",x:Math.sin(th*Math.PI/180)*d,y:-Math.cos(th*Math.PI/180)*d,a:r(4)*360});
  const w=new World([a,b]);
  for(let i=0;i<3000;i++){w.step(); if(!a.alive||!b.alive)break;}
  return a.alive&&!b.alive?1:b.alive&&!a.alive?0:0.5;
}
const sc:any={},pl:any={};
for(const c of LADDER){sc[c.name]=0;pl[c.name]=0;}
for(let i=0;i<LADDER.length;i++)for(let j=i+1;j<LADDER.length;j++){
  const A=LADDER[i],B=LADDER[j]; let sa=0;
  for(let k=0;k<12;k++){ sa+=match(A,B,k*7+i*31+j); sa+=1-match(B,A,k*7+i*31+j); }
  sc[A.name]+=sa; pl[A.name]+=24; sc[B.name]+=24-sa; pl[B.name]+=24;
}
console.log(" guns   mass   win%");
for(const c of LADDER){const s=new Ship(c,{team:"a"});
  console.log(` ${c.name.replace("guns","").padStart(4)}  ${s.mass.toFixed(2).padStart(5)}  ${(100*sc[c.name]/pl[c.name]).toFixed(0).padStart(4)}`);}
