// Per-second state of one mission under its reference solution, so a stuck
// objective can be attributed instead of guessed at.
import {importNotebookModule} from "./notebook-import.ts";
const eng = await importNotebookModule("modules/@tomlarkworthy/corepox-engine.js");
const parts: any = await eng.values(["Ship","World","TYPES","PORTS","geom","DT"]);
const mis = await importNotebookModule("modules/@tomlarkworthy/corepox-missions.js");
const MISSIONS: any[] = await mis.value("MISSIONS");
const game = await importNotebookModule("modules/@tomlarkworthy/corepox-game.js",
  {overrides: {...parts, MISSIONS, battlefield: null, TILE: 56, objectiveHtml: null}});
const newSession: any = await game.value("newSession");
const evaluate: any = await game.value("evaluateObjectives");
const stepS: any = await game.value("stepSession");
const {Ship, DT} = parts;

const id = process.argv[2], LIMIT = Number(process.argv[3] ?? 30);
const m = MISSIONS.find(x => x.id === id);
if (!m) { console.log("missions:", MISSIONS.map(x=>x.id).join(" ")); process.exit(1); }
const S = newSession(m);
if (m.solution) {
  const p = new Ship({name:"player", ...m.solution}, {team:"player", x:0, y:0, a:0});
  S.world.ships[0] = p; S.player = p;
  S.initialParams = new Map(p.comps.map((c:any)=>[c,c.param]));
  for (const c of p.comps) {
    const o = (m.ship?.components ?? []).find((q:any)=>q.pos[0]===c.px&&q.pos[1]===c.py&&q.type===c.type);
    if (o) S.initialParams.set(c, o.param);
  }
}
S.state = "playing"; S.enemyWas = new Map();
console.log(`# ${m.id}  objectives: ${m.objectives.map((o:any)=>o.kind).join(",")}`);
let t = 0, last = -1;
while (t < LIMIT) {
  const objs = evaluate(S);
  const r = stepS(S, objs);
  t += DT;
  if (Math.floor(t) !== last) {
    last = Math.floor(t);
    const p = S.player;
    const en = S.world.ships.filter((s:any)=>s.team!=="player"&&s.live.length);
    const turret = p.comps.find((c:any)=>c.type==="LaserTurret2");
    const rad = p.comps.find((c:any)=>c.type==="Radar");
    console.log(
      `t=${last.toString().padStart(2)} ` +
      `p=(${p.x.toFixed(1)},${p.y.toFixed(1)}) a=${p.a.toFixed(0)} live=${p.live.length} ` +
      (rad ? `radar(brg=${(rad.out.bearing??NaN).toFixed?.(0)} d=${(rad.out.dist??NaN).toFixed?.(1)}) ` : "") +
      (turret ? `turret(want=${(turret.in.angle??NaN).toFixed?.(0)} at=${(turret.turret??0).toFixed(0)} fire=${turret.in.fire??0}) ` : "") +
      `beams=${S.world.particles.filter((b:any)=>b.kind==="beam").length} ` +
      `enemies=${en.length}[${en.map((s:any)=>s.live.length).join(",")}] ` +
      `killed=${JSON.stringify(S.killed)} ` +
      `objs=${objs.map((o:any)=>o.failed?"x":o.done?"#":".").join("")} ${r}`);
  }
  if (r !== "playing") { console.log("=>", r, "at", t.toFixed(1)); break; }
}
