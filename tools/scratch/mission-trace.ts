import {importNotebookModule} from "../notebook-import.ts";
const eng = await importNotebookModule(process.env.ENGINE ?? "modules/@tomlarkworthy/corepox-engine.js");
const parts: any = await eng.values(["Ship","World","geom","DT","pilot"]);
const mis = await importNotebookModule(process.env.MISSIONS ?? "modules/@tomlarkworthy/corepox-missions.js");
const MISSIONS: any[] = await mis.value("MISSIONS");
const {Ship, World, geom, DT, pilot} = parts;
const game = await importNotebookModule("modules/@tomlarkworthy/corepox-game.js",
  {overrides: {Ship, World, geom, DT, pilot, MISSIONS, componentNode: null,
               objectiveHtml: null, shipBoard: null, PALETTE: null, CAMPAIGNS: []}});
const newSession: any = await game.value("newSession");
const evaluate: any = await game.value("evaluateObjectives");
const stepS: any = await game.value("stepSession");
const id = process.env.M ?? "TwinTurrets";
const base = MISSIONS.find(x => x.id === id)!;
let h = 2166136261; for (const ch of `${id}/solution/0`) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
let x = (h >>> 0) || 1;
World.rng = () => (x = (x * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
const S = newSession(base);
const p = new Ship({name: "player", ...base.solution}, {team: "player", x: 0, y: 0, a: 0});
S.world.ships[0] = p; S.player = p;
S.initialParams = new Map(p.comps.map((c: any) => [c, c.param]));
S.state = "playing"; S.enemyWas = new Map();
const hp0 = new Map(p.comps.map((c: any) => [c, c.hp]));
let t = 0, out = "timeout";
while (t < 60) { const o = evaluate(S); const r = stepS(S, o); t += DT; if (r !== "playing") { out = r; break; } }
console.log(`${id} -> ${out} ${t.toFixed(1)}s   beam hits ${JSON.stringify((S.world as any).shots ?? {})}`);
for (const c of p.comps) if (c.hp !== hp0.get(c))
  console.log(`  ${c.type} [${c.px},${c.py}] ${hp0.get(c)} -> ${c.hp}`);
