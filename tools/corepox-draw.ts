// Draw ships schematically from the ENGINE's own tables, so the modelling choices
// (footprints, joints, ports, anchors) are visible and checkable by eye.
//
// Frames: the engine's ship-local tile frame is +y FORWARD (rotTile is clockwise
// only in a y-up frame; Engine's [[0,0],[0,-1]] puts the nozzle aft). This file
// used to hold a second copy of the art->engine joint conversion; JOINTS is stored
// in engine frame from 2026-08-19, so it is read straight through and the copy is
// gone. Two copies of a frame conversion is how the sign bugs happened.
import {importNotebookModule} from "./notebook-import.ts";
const m=await importNotebookModule("modules/@tomlarkworthy/corepox-engine.js");
const Ship:any=await m.value("Ship"); const load:any=await m.value("loadShipSpec");
const TYPES:any=await m.value("TYPES");
const PORTS:any=await m.value("PORTS"); const rotTile:any=await m.value("rotTile");
const fs=await import("node:fs");
const STAMP=new Date().toISOString().slice(0,10);

const COL:any={Brain:"#ff9f43",Constant:"#ffe14d",Binary:"#ff6b9d",Radar:"#4dd47a",
  Engine:"#6ec6ff",Lazer:"#ff5a4a",Explosive:"#ff3860",Armour:"#c9d4e6",
  Orb:"#c17bff",LaserTurret2:"#ff8c42",Hyperdrive:"#4ddbd4",Composite:"#9aa5b1"};
const CELL=44, PAD=2.5;
function portCell(c:any,name:string,kind:string){
  const tbl=PORTS[c.type]?.[kind]; if(!tbl||!tbl[name]) return null;
  const [x,y]=rotTile(tbl[name], c.dir??0);
  return [c.px+x, c.py+y];
}
function drawShip(ship:any, title:string, allPorts=false){
  const parts:string[]=[];
  let minx=99,maxx=-99,miny=99,maxy=-99;
  for(const c of ship.comps) for(const [tx,ty] of c.tiles){
    minx=Math.min(minx,tx); maxx=Math.max(maxx,tx);
    miny=Math.min(miny,ty); maxy=Math.max(maxy,ty); }
  minx-=1; maxx+=1; miny-=1; maxy+=1;
  const W=(maxx-minx+1)*CELL, H=(maxy-miny+1)*CELL;
  const X=(v:number)=>(v-minx)*CELL, Y=(v:number)=>(maxy-v)*CELL;   // +y UP
  for(let gx=minx;gx<=maxx+1;gx++) parts.push(`<line x1="${X(gx)}" y1="0" x2="${X(gx)}" y2="${H}" stroke="#182433"/>`);
  for(let gy=miny;gy<=maxy+1;gy++) parts.push(`<line x1="0" y1="${Y(gy)}" x2="${W}" y2="${Y(gy)}" stroke="#182433"/>`);
  parts.push(`<path d="M${W-16},26 v-16 m0,0 l-5,5 m5,-5 l5,5" stroke="#5b6b7d" stroke-width="1.5" fill="none"/>`);
  parts.push(`<text x="${W-22}" y="24" fill="#5b6b7d" font-size="10" font-family="monospace" text-anchor="end">fwd</text>`);
  for(const c of ship.comps){
    const col=COL[c.type]??"#888";
    for(const [tx,ty] of c.tiles)
      parts.push(`<rect x="${X(tx)+PAD}" y="${Y(ty)+PAD}" width="${CELL-2*PAD}" height="${CELL-2*PAD}" fill="${col}" fill-opacity="0.18" stroke="${col}" stroke-width="1.4" rx="3"/>`);
    parts.push(`<path d="M${X(c.px)+CELL/2-5},${Y(c.py)+CELL/2} h10 M${X(c.px)+CELL/2},${Y(c.py)+CELL/2-5} v10" stroke="${col}" stroke-width="2"/>`);
    const lbl=c.type.replace("LaserTurret2","Turret")+(c.param?" "+c.param:"")+(c.dir?" ↻"+c.dir:"");
    parts.push(`<text x="${X(c.px)+CELL/2}" y="${Y(c.py)+CELL/2-8}" fill="${col}" font-size="8.5" font-family="monospace" text-anchor="middle" paint-order="stroke" stroke="#0d1420" stroke-width="3">${lbl}</text>`);
    // Ship.jointList, not a copy of the table walk: this file used to hold its own,
    // at its own 0.28/0.72 along the edge, and it drifted from what the game draws
    // the moment the convention moved to the thirds (2026-08-21). mx,my are the
    // DRAWN point; x,y are the mating key, which nothing here needs.
    for(const j of ship.jointList(c))
      parts.push(`<circle cx="${X(j.mx)+CELL/2}" cy="${Y(j.my)+CELL/2}" r="3.6" fill="#5ef2a0" stroke="#0d1420"/>`);
  }
  // Every connector is an input or an output and occupies one 1x1 slot of the
  // footprint (Tom). On the sheet, draw them all; on a ship, only the wired ones,
  // or the labels bury the wiring.
  if(allPorts) for(const c of ship.comps){
    for(const kind of ["outs","ins"]) for(const name of Object.keys(PORTS[c.type]?.[kind]??{})){
      const q=portCell(c,name,kind); if(!q) continue;
      const cx=X(q[0])+CELL/2, cy=Y(q[1])+CELL/2, col=kind==="outs"?"#f2c14e":"#ff8f6d";
      if(kind==="outs") parts.push(`<circle cx="${cx}" cy="${cy}" r="6" fill="none" stroke="${col}" stroke-width="1.8"/>`);
      else parts.push(`<rect x="${cx-5.5}" y="${cy-5.5}" width="11" height="11" fill="none" stroke="${col}" stroke-width="1.8"/>`);
      parts.push(`<text x="${cx}" y="${cy+15}" fill="${col}" font-size="8.5" font-family="monospace" text-anchor="middle" paint-order="stroke" stroke="#0d1420" stroke-width="3">${name}</text>`);
    }
  }
  for(const k of ship.conns){
    const a=ship.at?.(k.from[0],k.from[1]), b=ship.at?.(k.to[0],k.to[1]);
    if(!a||!b) continue;
    const p=portCell(a,k.fromPort,"outs"), q=portCell(b,k.toPort,"ins");
    if(!p||!q) continue;
    parts.push(`<line x1="${X(p[0])+CELL/2}" y1="${Y(p[1])+CELL/2}" x2="${X(q[0])+CELL/2}" y2="${Y(q[1])+CELL/2}" stroke="#f2c14e" stroke-width="1.3" stroke-opacity="0.7"/>`);
    parts.push(`<circle cx="${X(p[0])+CELL/2}" cy="${Y(p[1])+CELL/2}" r="5" fill="none" stroke="#f2c14e" stroke-width="1.6"/>`);
    parts.push(`<rect x="${X(q[0])+CELL/2-4.5}" y="${Y(q[1])+CELL/2-4.5}" width="9" height="9" fill="none" stroke="#ff8f6d" stroke-width="1.6"/>`);
  }
  const isl=ship.islands?ship.islands().length:"?";
  return `<figure><figcaption>${title}<br><span class="sub">${ship.comps.length} parts · ${isl} island${isl>1?"s":""}</span></figcaption>
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${parts.join("")}</svg></figure>`;
}
// --- component sheet: one of each, alone, to check footprint/joints/ports ---
const sheet:string[]=[];
for(const type of Object.keys(TYPES)){
  if(type==="Composite") continue;
  const s=new Ship({name:type,components:[{type,pos:[0,0]}],connections:[]},{team:"a"});
  const T=TYPES[type];
  const nj=s.jointList(s.comps[0]).length;
  const np=Object.keys(PORTS[type]?.outs??{}).length+Object.keys(PORTS[type]?.ins??{}).length;
  sheet.push(drawShip(s,`${type} — ${T.tiles.length} cell${T.tiles.length>1?"s":""}, ${nj} joints, ${np} connector${np===1?"":"s"}, hp ${T.hp}`,true));
}
// --- rotations of one component, to check the rotation convention ---
const rots:string[]=[];
for(const d of [0,90,180,270])
  rots.push(drawShip(new Ship({name:"e",components:[{type:"Engine",pos:[0,0],dir:d}],connections:[]},{team:"a"}),
    `Engine dir=${d}°`));
// --- real ships ---
const raw:any[]=[];
for(const line of fs.readFileSync("vendor/corepox/firebase/data/ships.json","utf8").split("\n")){
  const i=line.indexOf(","); if(i<0) continue;
  try{const s=JSON.parse(line.slice(i+1)); if(s?.components) raw.push(s);}catch{}
}
const ships:string[]=[];
const relic=JSON.parse(fs.readFileSync("vendor/corepox/Meritocracy/Assets/scripts/game/components/Resources/composites.json","utf8"));
for(const id of Object.keys(relic).slice(0,4)){
  try{ships.push(drawShip(new Ship(load(relic[id]).spec,{team:"a"}),`composites.json / <b>${id}</b> (shipped with the game)`));}catch{}
}
let whole=0, broken=0;
for(const r of raw){
  let s:any; try{s=new Ship(load(r).spec,{team:"a"});}catch{continue}
  if(s.comps.length<6||s.comps.length>22) continue;
  const n=s.islands().length;
  if(n===1&&whole<4){whole++;ships.push(drawShip(s,`ships.json "<b>${r.name??"?"}</b>" — loads WHOLE`));}
  else if(n>1&&broken<6){broken++;ships.push(drawShip(s,`ships.json "<b>${r.name??"?"}</b>" — loads in <b>${n} pieces</b>`));}
  if(whole>=4&&broken>=6) break;
}
const secId=(t:string)=>t.toLowerCase().replace(/[^a-z]+/g,"-");
const wrap=(t:string,d:string,f:string[])=>`<section id="${secId(t)}">
  <h2>${t}</h2><p class="lede">${d}</p>
  <div class="rack">${f.join("")}</div></section>`;
fs.writeFileSync("scratch/corepox-ships.html",
`<title>Corepox Component Atlas</title>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600&family=IBM+Plex+Sans:wght@400;600&display=swap">
<style>
  /* Deliberately single-theme: this is a schematic read against the game's own
     black space background, so it commits to that ground on either host theme. */
  :root{
    --void:#070b11; --panel:#0d1420; --rule:#1c2836;
    --ink:#dbe6f2; --ink-dim:#7d8fa5; --ink-faint:#4d5c6d;
    --live:#5ef2a0; --wire:#f2c14e; --sink:#ff8f6d; --warn:#ff9b84;
  }
  *{box-sizing:border-box}
  body{margin:0;padding:32px 28px 64px;background:var(--void);color:var(--ink);
       font:400 14px/1.6 "IBM Plex Sans",system-ui,sans-serif;
       font-variant-numeric:tabular-nums}
  .head{max-width:68ch;display:flex;flex-direction:column;gap:12px}
  h1{margin:0;font:600 26px/1.15 "IBM Plex Sans",system-ui,sans-serif;text-wrap:balance;
     letter-spacing:-.01em}
  .stamp{font:400 11px/1 "IBM Plex Mono",monospace;letter-spacing:.14em;
         text-transform:uppercase;color:var(--ink-faint)}
  p{margin:0;color:var(--ink-dim)}
  p b{color:var(--ink);font-weight:600}
  .flag{color:var(--warn)}
  .flag b{color:var(--warn)}
  .key{display:flex;flex-wrap:wrap;gap:6px 20px;margin-top:4px;padding:12px 14px;
       border:1px solid var(--rule);border-radius:6px;background:var(--panel);
       font:400 12px/1.5 "IBM Plex Mono",monospace;color:var(--ink-dim)}
  .key span{display:flex;align-items:center;gap:7px}
  .key i{width:11px;height:11px;flex:none;font-style:normal}
  section{margin-top:44px;display:flex;flex-direction:column;gap:10px}
  h2{margin:0;font:600 15px/1.3 "IBM Plex Sans",system-ui,sans-serif}
  h2::before{content:"";display:block;width:26px;border-top:2px solid var(--live);
             margin-bottom:9px}
  .lede{max-width:68ch;font-size:13px}
  .rack{display:flex;flex-wrap:wrap;gap:14px 22px;align-items:flex-start;
        overflow-x:auto;padding-bottom:4px}
  figure{margin:0;display:flex;flex-direction:column;gap:6px}
  figcaption{font:400 11.5px/1.45 "IBM Plex Mono",monospace;color:var(--ink-dim)}
  figcaption b{color:var(--ink);font-weight:600}
  figcaption .sub{color:var(--ink-faint)}
  svg{display:block;background:var(--panel);border:1px solid var(--rule);border-radius:5px}
</style>
<div class="head">
  <div class="stamp">corepox · engine tables · ${STAMP}</div>
  <h1>What the engine currently believes a ship is</h1>
  <p>Drawn straight from the engine's own tables, nothing hand-placed. If a footprint,
  a joint or an anchor is wrong here, it is wrong in the simulation. <b>Up the page is
  forward.</b></p>
  <div class="key">
    <span><i style="background:#5ef2a020;border:1.4px solid var(--live);border-radius:2px"></i>footprint cell</span>
    <span><i style="color:var(--ink)">✛</i>anchor — the <code>pos</code> a wire addresses</span>
    <span><i style="background:var(--live);border-radius:50%"></i>joint slot, two per cell side</span>
    <span><i style="border:1.6px solid var(--wire);border-radius:50%"></i>signal out</span>
    <span><i style="border:1.6px solid var(--sink)"></i>signal in</span>
  </div>
</div>
${wrap("Every component, alone","Footprint, joint slots and every connector slot for one unrotated instance of each type. Hyperdrive and Composite have no joints recovered yet.",sheet)}
${wrap("Rotation convention","One Engine at each of the four <code>dir</code> values. The nozzle cell should stay behind the mount as the arrow turns.",rots)}
${wrap("Ships","The four composites that shipped with the game, then real player ships out of the 892-ship dump — four that assemble into one body under the current rules, then six that come apart.",ships)}`);
console.log("wrote scratch/corepox-ships.html:", sheet.length,"components,",ships.length,"ships");
