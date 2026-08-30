// Aim under different CircleSpawn settings. The scene's numbers (period 5, radius
// 18) are the ones to match; this says whether the reference wiring survives them.
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
const base = MISSIONS.find(x => x.id === "Aim")!;

for (const [every, radius, arc] of [[5, 18, [-6, 6]], [5, 18, [-6, 6]], [5, 18, [-6, 6]], [5, 18, [-2, 10]], [5, 18, [2, 10]], [5, 18, [-10, -2]]] as any[]) {
  const m = {...base, spawn: {...base.spawn, every, radius, arc}};
  const S = newSession(m);
  const p = new Ship({name: "player", ...base.solution}, {team: "player", x: 0, y: 0, a: 0});
  S.world.ships[0] = p; S.player = p;
  S.initialParams = new Map(p.comps.map((c: any) => [c, c.param]));
  S.state = "playing"; S.enemyWas = new Map();
  let t = 0, out = "timeout";
  while (t < 60) { const o = evaluate(S); const r = stepS(S, o); t += DT;
    if (r !== "playing") { out = r; break; } }
  const objs = evaluate(S);
  console.log(`every ${every}  r ${radius}  arc [${arc}]  -> ${out} ${t.toFixed(1)}s  ` +
    objs.map((o: any) => o.failed ? "x" : o.done ? "#" : ".").join(""));
}
