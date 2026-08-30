// Avoid is a one-knob level: the ship arrives wired and the only thing the player
// can touch is the constant (the scene hides Build, Modify and Connect). So the
// solution space IS the constant, and this is the whole search.
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
const m = MISSIONS.find(x => x.id === (process.argv[2] ?? "Avoid"))!;

for (const v of (process.argv[3] ? [Number(process.argv[3])] :
    [...Array(41)].map((_, i) => -100 + i * 5))) {
  const spec = {components: m.ship.components.map((c: any) =>
                  c.type === "Constant" ? {...c, param: String(v)} : {...c}),
                connections: m.ship.connections};
  const S = newSession(m);
  const p = new Ship({name: "player", ...spec}, {team: "player", x: 0, y: 0, a: 0});
  S.world.ships[0] = p; S.player = p;
  S.initialParams = new Map(p.comps.map((c: any) => [c, "0"]));
  S.state = "playing"; S.enemyWas = new Map();
  let t = 0, out = "timeout";
  while (t < 60) { const o = evaluate(S); const r = stepS(S, o); t += DT;
    if (r !== "playing") { out = r; break; } }
  const objs = evaluate(S);
  console.log(`constant ${String(v).padStart(5)}  ${out} ${t.toFixed(1)}s   ` +
    objs.map((o: any) => o.failed ? "x" : o.done ? "#" : ".").join("") +
    `   ship (${p.x.toFixed(1)}, ${p.y.toFixed(1)})`);
}
