// FollowBoss, from the outside: how much of each enemy the player's chain
// actually takes off, and at what range. Written 2026-08-21 to answer whether the
// old solution was merely SLOW under solid footprints or genuinely stuck. It is
// stuck -- the Gun Boat sits at 125 of 320 hp from t=45s to t=210s at a range of
// 22 tiles, where the radar-to-turret parallax miss stops the shots landing, and
// both Spikes simply fly away. BASE below is the old chain; edit it to trace a
// different build.
//
//   bun tools/corepox-boss-trace.ts
import {importNotebookModule} from "./notebook-import.ts";
const eng = await importNotebookModule("modules/@tomlarkworthy/corepox-engine.js");
const {Ship, World, DT}: any = await eng.values(["Ship","World","DT"]);
const mis = await importNotebookModule("modules/@tomlarkworthy/corepox-missions.js");
const MISSIONS: any[] = await mis.value("MISSIONS");
const m: any = MISSIONS.find(x => x.id === "FollowBoss");
const BASE = {components: [{type: "Brain", pos: [0, 0]},
  {type: "LaserTurret2", pos: [0, 1]}, {type: "Radar", pos: [-2, -1]},
  {type: "Constant", pos: [0, -1], param: "100"},
  {type: "Binary", pos: [0, -2], param: "MINUS"},
  {type: "Engine", pos: [-2, -2]}, {type: "Engine", pos: [1, -3]}],
  connections: [
  {from: [-2, -1], fromPort: "bearing", to: [0, 1], toPort: "angle"},
  {from: [-2, -1], fromPort: "dist", to: [0, 1], toPort: "fire"},
  {from: [-2, -1], fromPort: "bearing", to: [-2, -2], toPort: "in"},
  {from: [-2, -1], fromPort: "bearing", to: [0, -2], toPort: "b"},
  {from: [0, -1], fromPort: "out", to: [0, -2], toPort: "a"},
  {from: [0, -2], fromPort: "out", to: [1, -3], toPort: "in"}]};
const p = new Ship({name:"p", ...BASE}, {team:"player", x:0,y:0,a:0});
const es = m.enemies.map((e:any)=>new Ship(e.spec,{team:"enemy",x:e.x,y:e.y,a:e.a}));
const hp0 = es.map((s:any)=>s.comps.reduce((n:number,c:any)=>n+c.hp,0));
const w = new World([p, ...es]);
for (let t=0; t<240; t+=DT) {
  w.step();
  if (Math.abs(t % 30) < DT/2) {
    console.log(`t=${t.toFixed(0)}  ` + es.map((s:any,i:number)=>{
      const hp = s.comps.reduce((n:number,c:any)=>n+c.hp,0);
      const b = s.comps.find((c:any)=>c.type==="Brain");
      return `${s.name}:${hp}/${hp0[i]}${b&&b.hp<=0?" BRAINDEAD":""} d=${Math.hypot(s.x-p.x,s.y-p.y).toFixed(0)}`;
    }).join("  "));
  }
}
