// Aim under different CircleSpawn settings. The scene's numbers (period 5, radius
// 18) are the ones to match; this says whether the reference wiring survives them.
import {importNotebookModule} from "../notebook-import.ts";
const eng = await importNotebookModule(process.env.ENGINE ?? "modules/@tomlarkworthy/corepox-engine.js");
const parts: any = await eng.values(["Ship","World","TYPES","PORTS","geom","DT"]);
const mis = await importNotebookModule("modules/@tomlarkworthy/corepox-missions.js");
const MISSIONS: any[] = await mis.value("MISSIONS");
const {Ship: _S, World: _W, geom: _g, DT: _dt} = parts;
const pilot: any = await eng.value("pilot");
const game = await importNotebookModule("modules/@tomlarkworthy/corepox-game.js",
  {overrides: {Ship: _S, World: _W, geom: _g, DT: _dt, pilot, MISSIONS,
               componentNode: null, objectiveHtml: null, shipBoard: null,
               PALETTE: null, CAMPAIGNS: []}});
const newSession: any = await game.value("newSession");
const evaluate: any = await game.value("evaluateObjectives");
const stepS: any = await game.value("stepSession");
const {Ship, DT} = parts;
const base = MISSIONS.find(x => x.id === "Aim")!;

for (const [every, radius, arc] of [[5, 18, [-8, -4]], [5, 18, [-9, -3]], [5, 18, [-10, -2]], [5, 18, [-12, 0]], [5, 18, [-7, -3]], [5, 18, [-8, -2]], [5, 18, [-9, -1]], [5, 18, [-11, 1]], [5, 18, [-6, -2]], [5, 18, [-7, -1]], [5, 18, [-8, 0]], [5, 18, [-10, 2]], [5, 18, [-5, -1]], [5, 18, [-6, 0]], [5, 18, [-7, 1]], [5, 18, [-9, 3]], [5, 18, [-4, 0]], [5, 18, [-5, 1]], [5, 18, [-6, 2]], [5, 18, [-8, 4]], [5, 18, [-3, 1]], [5, 18, [-4, 2]], [5, 18, [-5, 3]], [5, 18, [-7, 5]], [5, 18, [-2, 2]], [5, 18, [-3, 3]], [5, 18, [-4, 4]], [5, 18, [-6, 6]], [5, 18, [-1, 3]], [5, 18, [-2, 4]], [5, 18, [-3, 5]], [5, 18, [-5, 7]], [5, 18, [0, 4]], [5, 18, [-1, 5]], [5, 18, [-2, 6]], [5, 18, [-4, 8]], [5, 18, [1, 5]], [5, 18, [0, 6]], [5, 18, [-1, 7]], [5, 18, [-3, 9]], [5, 18, [2, 6]], [5, 18, [1, 7]], [5, 18, [0, 8]], [5, 18, [-2, 10]], [5, 18, [3, 7]], [5, 18, [2, 8]], [5, 18, [1, 9]], [5, 18, [-1, 11]], [5, 18, [4, 8]], [5, 18, [3, 9]], [5, 18, [2, 10]], [5, 18, [0, 12]], [5, 18, [5, 9]], [5, 18, [4, 10]], [5, 18, [3, 11]], [5, 18, [1, 13]], [5, 18, [6, 10]], [5, 18, [5, 11]], [5, 18, [4, 12]], [5, 18, [2, 14]]] as any[]) {
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
