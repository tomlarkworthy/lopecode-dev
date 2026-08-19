// Does per-component joint attachment explain the ships that load in pieces?
// Tests both art->engine y orientations, because the art's +y is DOWN and the
// footprint anchors were chosen by an overlap test that could not say which end
// is the nozzle.
import {importNotebookModule} from "./notebook-import.ts";
const m = await importNotebookModule("modules/@tomlarkworthy/corepox-engine.js");
const Ship:any=await m.value("Ship"); const load:any=await m.value("loadShipSpec");
const TYPES:any=await m.value("TYPES"); const JOINTS:any=await m.value("JOINTS");
const fs=await import("node:fs");
// Binary is the one type whose art cell grid cannot be laid on its footprint by a
// y-flip: the art's T stem points forward, the footprint's points aft. --binary-flip
// tests the other footprint.
if(process.argv.includes("--lazer6")) JOINTS.Lazer={"0,2":{E:[0,1],S:[0,1],W:[0,1]}};
const NOMIR=process.argv.includes("--no-mirror");
if(process.argv.includes("--binary-flip")) TYPES.Binary.tiles=[[-1,0],[0,0],[1,0],[0,1]];
// --binary-art instead keeps the footprint and assumes the art grid was transcribed
// upside down (stem at the BOTTOM of the symbol, not the top).
const BINART=process.argv.includes("--binary-art");
const raw:any[]=[];
for (const line of fs.readFileSync("vendor/corepox/firebase/data/ships.json","utf8").split("\n")){
  const i=line.indexOf(","); if(i<0) continue;
  try{const s=JSON.parse(line.slice(i+1)); if(s?.components) raw.push(s);}catch{}
}
// Art cells are anchored at the symbol's top-left; engine tiles are anchored
// wherever the footprint put them (Binary at its bar centre). Solve the offset by
// matching the two shapes, rather than assuming they share an origin.
const ARTCELLS:any={Engine:[[0,0],[0,1]],Lazer:[[0,0],[0,1],[0,2]],
  Binary:BINART?[[0,0],[1,0],[2,0],[1,1]]:[[1,0],[0,1],[1,1],[2,1]],Radar:[[0,0],[1,0],[0,1],[1,1],[0,2],[1,2]],
  Orb:[[0,0],[1,0],[0,1],[1,1]],Armour:[[0,0]],Constant:[[0,0]],
  Explosive:[[0,0]],Brain:[[0,0]],LaserTurret2:[[0,0],[1,0]]};
// Solve art -> engine as (x+ox, -y+oy). The art SVG is +y DOWN; the engine's
// ship-local tile frame is +y FORWARD (rotTile is (x,y)->(y,-x), clockwise only
// in a y-up frame; Engine's [[0,0],[0,-1]] puts the nozzle aft; SEEKER's engines
// sit at y=-1 and its lazer at y=+2). They agree VISUALLY and disagree only on
// the sign of the y number, so the flip is mandatory for every type and the side
// names N/E/S/W carry across unchanged. The earlier version tried s=+1 first and
// every symmetric footprint matched it, which put Engine's mount at (0,-1) --
// ahead of its own nozzle. That is why joint connectivity read 1%.
function align(type:string){
  const art=ARTCELLS[type], eng=TYPES[type]?.tiles;
  if(!art||!eng) return null;
  const key=(a:number[])=>a[0]+","+a[1];
  const want=new Set(eng.map((t:number[])=>key(t)));
  for(const s of [-1,1]) for(const a of art) for(const e of eng){
    const ox=e[0]-a[0], oy=e[1]-s*a[1];
    const got=art.map((c:number[])=>key([c[0]+ox, s*c[1]+oy]));
    if(got.length===want.size && got.every(k=>want.has(k))) return [ox,oy,s];
  }
  return null;
}
const ALIGN:any={}; for(const t of Object.keys(ARTCELLS)) ALIGN[t]=align(t);
console.log("art->engine alignment:", Object.entries(ALIGN).map(([k,v]:any)=>`${k}:${v?`(${v[0]},${v[1]})${v[2]<0?"[flip]":""}`:"FAILED"}`).join("  "));
const SIDE:any={N:[0,1],S:[0,-1],W:[-1,0],E:[1,0]};   // engine tile frame: +y forward
const OPP:any={N:"S",S:"N",W:"E",E:"W"};
const TURN=["N","E","S","W"];
const DIRTURN:any={up:0,right:1,down:2,left:3};
function worldJoints(c:any, flipY:boolean){
  const tbl=JOINTS[c.type]; if(!tbl) return null;
  const t=(Math.round((c.dir??0)/90)%4+4)%4;   // c.dir is DEGREES
  const out=new Set<string>();
  for(const key of Object.keys(tbl)){
    const [ax0,ay0]=key.split(",").map(Number);
    const al=ALIGN[c.type]; if(!al) return null;
    const ax=ax0+al[0], ay=al[2]*ay0+al[1];   // rebased per this type's solution
    const ly=ay;
    // rotate clockwise in the engine's y-up frame, exactly as rotTile does
    let x=ax, y=ly;
    for(let i=0;i<t;i++){ const nx=y, ny=-x; x=nx; y=ny; }
    for(const side of Object.keys(tbl[key])){
      // s=+1 means the fit did not negate y, so the component is mirrored: the
      // N/S names swap and so does the slot order on the vertical sides.
      const fs = (al[2]===1 && (side==="N"||side==="S")) ? (side==="N"?"S":"N") : side;
      const mir = !NOMIR && al[2]===1 && (side==="E"||side==="W");
      const rs=TURN[(TURN.indexOf(fs)+t)%4];
      for(const slot of tbl[key][side]) out.add(`${c.px+x},${c.py+y},${rs},${mir?1-slot:slot}`);
    }
  }
  return out;
}
let GAP=[1];
function islandsByJoint(ship:any, flipY:boolean){
  const cs=ship.live; const n=cs.length;
  const J=cs.map((c:any)=>worldJoints(c,flipY));
  // Two joints meet either at a shared cell edge (touching bodies) or, if the
  // stalks project outward as the screenshot shows, in the empty cell between two
  // bodies one gap apart. GAP selects which rule is tested.
  const link=(i:number,j:number)=>{
    const a=J[i], b=J[j]; if(!a||!b) return false;
    for(const k of a){ const [x,y,s,sl]=k.split(","); const d=SIDE[s];
      for(const n of GAP)
        if(b.has(`${Number(x)+d[0]*n},${Number(y)+d[1]*n},${OPP[s]},${sl}`)) return true; }
    return false;
  };
  const seen=new Array(n).fill(false); let k=0;
  for(let i=0;i<n;i++){ if(seen[i])continue; k++; const q=[i]; seen[i]=true;
    while(q.length){ const a=q.pop()!; for(let b=0;b<n;b++) if(!seen[b]&&link(a,b)){seen[b]=true;q.push(b);} } }
  return k;
}
const covered=Object.keys(JOINTS);
console.log("types with joints recovered:", covered.join(", "));
for(const [label,gap] of [["touching (adjacent cells)",[1]],
                          ["stalks meet in the gap cell",[2]],
                          ["either",[1,2]]] as any[]){
  GAP=gap; const flipY=true;
  let whole=0, tested=0, nojoint=0;
  for(const r of raw){
    let s:any; try{ s=new Ship(load(r).spec,{team:"a"}); }catch{ continue; }
    if(!s.live.length) continue;
    if(s.live.some((c:any)=>!JOINTS[c.type])) { nojoint++; continue; }
    tested++; if(islandsByJoint(s,flipY)===1) whole++;
  }
  console.log(` ${String(label).padEnd(28)} ${whole}/${tested} ships one piece (${(100*whole/Math.max(1,tested)).toFixed(0)}%)`);
}
