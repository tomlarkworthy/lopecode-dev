import {importNotebookModule} from "./notebook-import.ts";
const m=await importNotebookModule("modules/@tomlarkworthy/corepox-engine.js");
const Ship:any=await m.value("Ship"); const JOINTS:any=await m.value("JOINTS");
const TYPES:any=await m.value("TYPES");
const ARTCELLS:any={Engine:[[0,0],[0,1]],Lazer:[[0,0],[0,1],[0,2]],
  Binary:[[1,0],[0,1],[1,1],[2,1]],Radar:[[0,0],[1,0],[0,1],[1,1],[0,2],[1,2]],
  Orb:[[0,0],[1,0],[0,1],[1,1]],Armour:[[0,0]],Constant:[[0,0]],
  Explosive:[[0,0]],Brain:[[0,0]],LaserTurret2:[[0,0],[1,0]]};
function align(type:string){
  const art=ARTCELLS[type], eng=TYPES[type]?.tiles; if(!art||!eng) return null;
  const key=(a:number[])=>a[0]+","+a[1];
  const want=new Set(eng.map((t:number[])=>key(t)));
  for(const s of [1,-1]) for(const a of art) for(const e of eng){
    const ox=e[0]-a[0], oy=e[1]-s*a[1];
    const got=art.map((c:number[])=>key([c[0]+ox, s*c[1]+oy]));
    if(got.length===want.size && got.every(k=>want.has(k))) return [ox,oy,s];
  }
  return null;
}
for(const t of Object.keys(ARTCELLS)) console.log(` align ${t.padEnd(13)} ${JSON.stringify(align(t))}   engineTiles=${JSON.stringify(TYPES[t]?.tiles)}`);
const TURN=["N","E","S","W"];
function wj(c:any){
  const tbl=JOINTS[c.type]; const al=align(c.type); if(!tbl||!al) return new Set<string>();
  const t=(Math.round((c.dir??0)/90)%4+4)%4; const out=new Set<string>();
  for(const key of Object.keys(tbl)){
    const [a0,b0]=key.split(",").map(Number);
    const ax=a0+al[0], ay=al[2]*b0+al[1];
    let x=ax,y=ay; for(let i=0;i<t;i++){const nx=-y,ny=x;x=nx;y=ny;}
    for(const side of Object.keys(tbl[key])){
      const fs=(al[2]===-1&&(side==="N"||side==="S"))?(side==="N"?"S":"N"):side;
      const rs=TURN[(TURN.indexOf(fs)+t)%4];
      for(const slot of tbl[key][side]) out.add(`${c.px+x},${c.py+y},${rs},${slot}`);
    }
  }
  return out;
}
const spec={name:"t",components:[{type:"Armour",pos:[0,0],dir:"up"},{type:"Armour",pos:[1,0],dir:"up"}],connections:[]};
const s=new Ship(spec,{team:"a"});
const A=wj(s.comps[0]), B=wj(s.comps[1]);
console.log("\nArmour@0,0 joints:", [...A].join(" | "));
console.log("Armour@1,0 joints:", [...B].join(" | "));
const SIDE:any={N:[0,-1],S:[0,1],W:[-1,0],E:[1,0]}, OPP:any={N:"S",S:"N",W:"E",E:"W"};
let linked=false;
for(const k of A){const [x,y,sd,sl]=k.split(","); const d=SIDE[sd];
  const want=`${Number(x)+d[0]},${Number(y)+d[1]},${OPP[sd]},${sl}`;
  if(B.has(want)){console.log(`LINK: ${k}  meets  ${want}`); linked=true;}}
console.log("linked:", linked);
