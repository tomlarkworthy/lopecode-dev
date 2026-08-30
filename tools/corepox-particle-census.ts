// How many particles does corepox actually have live? Reuses the real engine and
// the real mission reference solutions (same harness as corepox-play-missions.ts)
// and samples world.particles.length every tick.
//
// This decides whether the render technique matters at all: a draw that is 9x
// cheaper is worth nothing at counts a browser does not notice. Headless, because
// the browser census kept losing the play button to the game's own win screen.
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

const LIMIT = Number(process.env.LIMIT ?? 60);
const q = (a: number[], p: number) => [...a].sort((x, y) => x - y)[Math.floor(a.length * p)] ?? 0;

console.log("mission              med   p90  peak   ticks  outcome");
let worst = 0;
for (const m of MISSIONS) {
  const S = newSession(m);
  if (m.solution) {
    const p = new Ship({name: "player", ...m.solution}, {team: "player", x: 0, y: 0, a: 0});
    S.world.ships[0] = p; S.player = p;
    S.initialParams = new Map(p.comps.map((c: any) => [c, c.param]));
  }
  S.state = "playing"; S.enemyWas = new Map();
  const n: number[] = [];
  let t = 0, out = "timeout";
  while (t < LIMIT) {
    const r = stepS(S, evaluate(S));
    n.push(S.world.particles.length);
    t += DT;
    if (r !== "playing") { out = r; break; }
  }
  const peak = Math.max(...n, 0);
  worst = Math.max(worst, peak);
  console.log(`${(m.name ?? m.id ?? "?").padEnd(20)}${String(q(n, 0.5)).padStart(4)}` +
              `${String(q(n, 0.9)).padStart(6)}${String(peak).padStart(6)}${String(n.length).padStart(8)}  ${out}`);
}
console.log(`\nworst peak across the campaign: ${worst}`);
