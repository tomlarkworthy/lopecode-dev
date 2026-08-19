// Are the levels actually winnable, and are they non-trivial? Runs each mission
// twice with the real game cells: once with the reference solution (must WIN) and
// once with the ship the player is handed (must NOT win immediately).
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

const LIMIT = Number(process.env.LIMIT ?? 60);                                   // seconds of simulated time
function run(m: any, spec: any | null) {
  const S = newSession(m);
  if (spec) {
    const p = new Ship({name: "player", ...spec}, {team: "player", x: 0, y: 0, a: 0});
    S.world.ships[0] = p; S.player = p;
    S.initialParams = new Map(p.comps.map((c: any) => [c, c.param]));
    // the player typed these in, so `adjust` objectives must see a change
    for (const c of p.comps) {
      const orig = (m.ship?.components ?? []).find((o: any) =>
        o.pos[0] === c.px && o.pos[1] === c.py && o.type === c.type);
      if (orig) S.initialParams.set(c, orig.param);
    }
  }
  S.state = "playing"; S.enemyWas = new Map();
  let t = 0, out = "timeout";
  while (t < LIMIT) {
    const objs = evaluate(S);
    const r = stepS(S, objs);
    t += DT;
    if (r !== "playing") { out = r; break; }
  }
  const objs = evaluate(S);
  return {out, t, objs};
}

let winnable = 0, trivial = 0;
console.log("mission          solution        handed-to-player      objectives");
for (const m of MISSIONS) {
  const a = run(m, m.solution ?? null);
  const b = run(m, null);
  if (a.out === "win") winnable++;
  if (b.out === "win") trivial++;
  const marks = (r: any) => r.objs.map((o: any) => o.failed ? "x" : o.done ? "#" : ".").join("");
  console.log(`${m.id.padEnd(15)} ${(a.out + " " + a.t.toFixed(1) + "s").padEnd(15)} ` +
              `${(b.out + " " + b.t.toFixed(1) + "s").padEnd(21)} ${marks(a)}  (unsolved ${marks(b)})`);
}
console.log(`\n${winnable}/${MISSIONS.length} winnable with the reference solution`);
console.log(`${trivial}/${MISSIONS.length} win with no player input at all (should be 0)`);
// A gate, not a report: every level must be beatable by its own solution and none
// beatable by doing nothing. Both halves matter -- an objective that is satisfied
// at t=0 makes a level look winnable while teaching nothing.
if (winnable !== MISSIONS.length || trivial !== 0) {
  console.error("FAIL: campaign is not playable end to end");
  process.exit(1);
}
console.log("PASS");
