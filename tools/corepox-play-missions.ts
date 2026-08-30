// Are the levels actually winnable, and are they non-trivial? Runs each mission
// twice with the real game cells: once with the reference solution (must WIN) and
// once with the ship the player is handed (must NOT win immediately).
import {importNotebookModule} from "./notebook-import.ts";

// ENGINE points this at a variant engine. That is how the FollowBoss timeout was
// pinned on the connectivity switch rather than guessed at: the same missions run
// against a copy with islands() swapped back to the distance rule pass 12/12.
const eng = await importNotebookModule(process.env.ENGINE ?? "modules/@tomlarkworthy/corepox-engine.js");
const parts: any = await eng.values(["Ship","World","TYPES","PORTS","geom","DT","pilot"]);
const mis = await importNotebookModule(process.env.MISSIONS ?? "modules/@tomlarkworthy/corepox-missions.js");
const MISSIONS: any[] = await mis.value("MISSIONS");
// Only the names corepox-game still declares. It shed TYPES, PORTS, battlefield
// and TILE on 2026-08-21 when the board moved to @tomlarkworthy/corepox-board, and
// `module_redefine` throws on a name that is not in scope ("TYPES is not defined")
// rather than ignoring it -- which is the behaviour you want, because the
// alternative hides a typo in an override forever.
const {Ship: _S, World: _W, geom: _g, DT: _dt, pilot: _p} = parts;
const game = await importNotebookModule("modules/@tomlarkworthy/corepox-game.js",
  {overrides: {Ship: _S, World: _W, geom: _g, DT: _dt, pilot: _p,
               MISSIONS, componentNode: null, objectiveHtml: null,
               shipBoard: null, PALETTE: null, CAMPAIGNS: []}});
const newSession: any = await game.value("newSession");
const evaluate: any = await game.value("evaluateObjectives");
const stepS: any = await game.value("stepSession");
const {Ship, DT} = parts;

const LIMIT = Number(process.env.LIMIT ?? 60);                                   // seconds of simulated time

// SEED the world before every run. `World.rng` defaults to Math.random, so without
// this the twelve missions share one random stream and each one's result depends on
// how many draws the eleven before it happened to make: changing ONE mission's spawn
// arc on 2026-08-23 moved FollowBoss from a 16.8s win to a timeout and TwinTurrets
// from a 13.6s win to a 1.4s loss, neither of which had been touched. A gate whose
// verdict travels between the things it is judging cannot attribute anything.
// Seeded per (mission, run, seed), so a row is reproducible on its own.
const SEEDS = Number(process.env.SEEDS ?? 5);
const seedRng = (key: string) => {
  let h = 2166136261;
  for (const ch of key) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  let x = (h >>> 0) || 1;
  return () => (x = (x * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
};

function run(m: any, spec: any | null, seed = 0) {
  parts.World.rng = seedRng(`${m.id}/${spec ? "solution" : "handed"}/${seed}`);
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

// One draw is not a measurement: several of these levels finish within a second of
// their limit, and Aim is decided by a single bolt. A mission counts as winnable if
// its reference solution wins on a MAJORITY of seeds, and the per-seed record is
// printed so a level that only just clears is visible as one that only just clears.
let winnable = 0, trivial = 0;
console.log(`mission          solution        handed-to-player      objectives   (${SEEDS} seeds)`);
for (const m of MISSIONS) {
  const A = Array.from({length: SEEDS}, (_, i) => run(m, m.solution ?? null, i));
  const B = Array.from({length: SEEDS}, (_, i) => run(m, null, i));
  const wins = A.filter(r => r.out === "win").length;
  const triv = B.filter(r => r.out === "win").length;
  if (wins * 2 > SEEDS) winnable++;
  if (triv > 0) trivial++;
  const a = A[0], b = B[0];
  const marks = (r: any) => r.objs.map((o: any) => o.failed ? "x" : o.done ? "#" : ".").join("");
  console.log(`${m.id.padEnd(15)} ${(a.out + " " + a.t.toFixed(1) + "s").padEnd(15)} ` +
              `${(b.out + " " + b.t.toFixed(1) + "s").padEnd(21)} ${marks(a)}  ` +
              `(unsolved ${marks(b)})  win ${wins}/${SEEDS}${triv ? `  TRIVIAL ${triv}/${SEEDS}` : ""}`);
}
console.log(`\n${winnable}/${MISSIONS.length} winnable with the reference solution (majority of ${SEEDS} seeds)`);
console.log(`${trivial}/${MISSIONS.length} win with no player input at all (should be 0)`);
// A gate, not a report: every level must be beatable by its own solution and none
// beatable by doing nothing. Both halves matter -- an objective that is satisfied
// at t=0 makes a level look winnable while teaching nothing.
if (winnable !== MISSIONS.length || trivial !== 0) {
  console.error("FAIL: campaign is not playable end to end");
  process.exit(1);
}
console.log("PASS");
