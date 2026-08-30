import {importNotebookModule} from "../notebook-import.ts";
const eng = await importNotebookModule(process.env.ENGINE ?? "modules/@tomlarkworthy/corepox-engine.js");
const parts: any = await eng.values(["Ship","World","geom","DT","pilot"]);
const mis = await importNotebookModule("modules/@tomlarkworthy/corepox-missions.js");
const MISSIONS: any[] = await mis.value("MISSIONS");
const {Ship, World, geom, DT, pilot} = parts;
const game = await importNotebookModule("modules/@tomlarkworthy/corepox-game.js",
  {overrides: {Ship, World, geom, DT, pilot, MISSIONS, componentNode: null,
               objectiveHtml: null, shipBoard: null, PALETTE: null, CAMPAIGNS: []}});
const newSession: any = await game.value("newSession");
const evaluate: any = await game.value("evaluateObjectives");
const stepS: any = await game.value("stepSession");
const base = MISSIONS.find(x => x.id === "Aim")!;
const S = newSession(base);
const p = new Ship({name: "player", ...base.solution}, {team: "player", x: 0, y: 0, a: 0});
S.world.ships[0] = p; S.player = p;
S.initialParams = new Map(p.comps.map((c: any) => [c, c.param]));
S.state = "playing"; S.enemyWas = new Map();
const seen = new Map<any, any>();
let t = 0, out = "timeout";
while (t < 60) {
  const o = evaluate(S); const r = stepS(S, o); t += DT;
  for (const s of S.world.ships) {
    if (s.team !== "enemy") continue;
    if (!seen.has(s)) {
      const b = geom.bearing(p.x, p.y, s.x, s.y);
      seen.set(s, {born: t, bearing: b, range: Math.hypot(s.x - p.x, s.y - p.y)});
    }
    const st = seen.get(s);
    st.last = t; st.alive = s.comps.some((c: any) => c.hp > 0);
    st.range = Math.min(st.range, Math.hypot(s.x - p.x, s.y - p.y));
    if (!st.alive && st.died == null) { st.died = t; st.dieRange = Math.hypot(s.x - p.x, s.y - p.y); }
  }
  if (r !== "playing") { out = r; break; }
}
for (const [, st] of seen)
  console.log(`spawn t=${st.born.toFixed(1)} bearing ${st.bearing.toFixed(1)}  ` +
    `${st.died != null ? `killed t=${st.died.toFixed(1)} at ${st.dieRange.toFixed(1)} tiles`
                       : `ALIVE, closed to ${st.range.toFixed(1)} tiles`}`);
const brain = p.comps.find((c: any) => c.type === "Brain");
console.log(`\n-> ${out} ${t.toFixed(1)}s   core hp ${brain.hp}   ` +
  evaluate(S).map((o: any) => o.failed ? "x" : o.done ? "#" : ".").join(""));
console.log("beam hits:", JSON.stringify((S.world as any).shots ?? {}));
