// Is a run reproducible from its seed? The atproto design ("the match result is a
// proof, not a claim") assumes anyone can re-simulate a duel and get the same answer,
// and a roguelike run assumes a seed names a run.
//
// `World.rng` defaults to `Math.random` (corepox-engine.js:1025) and NOTHING sets it:
// `seedRng` is exported and used by exactly one tool, corepox-engine-test.ts, which
// sets it for its own determinism check and puts Math.random back. runDuel and
// runMining take a `seed` and spend it on placement, field layout and backdrop, not
// on the simulation. Exhaust particles draw from World.rng and carry EXHAUST_DMG, so
// the randomness feeds back into damage.
//
// The answer is not the same for both: DUELS come out identical anyway on the
// pairings below, and MINING does not -- a miner thrusts continuously, so its exhaust
// is a live rng draw landing on the rock it is cutting. Measured 2026-08-21 after a
// mining gate moved 5/5 -> 3/5 with nothing changed but a push, which is a swing the
// gate cannot distinguish from a regression.
//
//   bun tools/corepox-replay.ts
import {importNotebookModule} from "./notebook-import.ts";
const eng = await importNotebookModule(process.env.ENGINE ?? "modules/@tomlarkworthy/corepox-engine.js");
const E: any = {};
for (const n of ["Ship", "World", "geom", "DT", "pilot", "loadShipSpec"]) E[n] = await eng.value(n);
const seedRng: any = await eng.value("seedRng");
const mis = await importNotebookModule("modules/@tomlarkworthy/corepox-missions.js",
  {overrides: {md: (s: any) => String(s)}});
const SHIPS: any = await mis.value("SHIPS");
const duel = await importNotebookModule("modules/@tomlarkworthy/corepox-duel.js", {
  overrides: {...E, SHIPS, md: (s: any) => String(s), htl: {html: () => {}},
              battlefield: null, backdrop: null, invalidation: new Promise(() => {})}});
const runDuel: any = await duel.value("runDuel");

const fight = (a: string, b: string) => {
  const r = runDuel({mode: "elimination", limit: 60, seed: 4,
    a: {spec: SHIPS[a]}, b: {spec: SHIPS[b]}, placement: {separation: 22, bearing: 25}});
  const hp = (s: any) => s.comps.reduce((t: number, c: any) => t + Math.max(0, c.hp), 0);
  return `${r.winner} @${r.seconds}s  a ${r.a.live}p/${hp(r.duel.a)}hp  b ${r.b.live}p/${hp(r.duel.b)}hp`;
};

const PAIRS: [string, string][] = [
  ["gunBoat", "aimPlayer"], ["laserpost", "orbDroneChassis_hull"],
  ["shooter", "proximityMine"], ["spike", "drifter"], ["gunBoat", "laserpost"]];

let fail = 0;
const say = (ok: boolean, s: string) => { if (!ok) fail++; console.log((ok ? "ok   " : "FAIL ") + s); };

console.log("the SAME duel, same seed, run three times, on World.rng as it ships:\n");
for (const [a, b] of PAIRS) {
  E.World.rng = Math.random;
  const runs = [fight(a, b), fight(a, b), fight(a, b)];
  const same = runs.every(r => r === runs[0]);
  console.log(`  ${(a + " vs " + b).padEnd(34)} ${same ? "same" : "DIFFERENT"}`);
  for (const r of same ? runs.slice(0, 1) : runs) console.log(`      ${r}`);
}

console.log("\nand with World.rng seeded, which nothing in the game does:\n");
let allSame = true;
for (const [a, b] of PAIRS) {
  const runs = [0, 1, 2].map(() => { E.World.rng = seedRng(12345); return fight(a, b); });
  const same = runs.every(r => r === runs[0]);
  if (!same) allSame = false;
  console.log(`  ${(a + " vs " + b).padEnd(34)} ${same ? "same" : "DIFFERENT"}`);
}
E.World.rng = Math.random;
console.log();
say(allSame, "seeding World.rng makes every pairing reproducible");
// ---- mining, which is where it actually bites -----------------------------
const min = await importNotebookModule("modules/@tomlarkworthy/corepox-mining.js", {
  overrides: {Ship: E.Ship, World: E.World, geom: E.geom, DT: E.DT, pilot: E.pilot,
              loadShipSpec: E.loadShipSpec, TYPES: await eng.value("TYPES"),
              rotTile: await eng.value("rotTile"), SHIPS,
              DUEL_BACKDROP: await duel.value("DUEL_BACKDROP"),
              humanControl: await duel.value("humanControl"),
              md: (s: any) => String(s), htl: {html: () => {}},
              battlefield: null, backdrop: null,
              invalidation: new Promise(() => {})}});
const runMining: any = await min.value("runMining");
const DEFAULTS: any = await min.value("MINING_DEFAULTS");
const MINER: any = await min.value("MINER");

const dig = (seed: number) => {
  const m = runMining({...DEFAULTS, ship: MINER, seed, duration: 90, control: "auto"});
  return `scrap ${String(m.scrap).padStart(4)}  ore ${JSON.stringify(m.collected)}`;
};
console.log("\nthe SAME mining field, same seed, three times:\n");
for (const seed of [3, 23]) {
  E.World.rng = Math.random;
  const runs = [dig(seed), dig(seed), dig(seed)];
  const same = runs.every(r => r === runs[0]);
  console.log(`  unseeded, seed ${seed}   ${same ? "same" : "DIFFERENT"}`);
  for (const r of runs) console.log(`      ${r}`);
  const sr = [0, 1, 2].map(() => { E.World.rng = seedRng(999); return dig(seed); });
  say(sr.every(r => r === sr[0]), `World.rng seeded, seed ${seed}: reproducible` +
      (sr.every(r => r === sr[0]) ? "" : "  " + sr.join(" | ")));
}
E.World.rng = Math.random;

console.log("\nNothing in corepox-duel, corepox-mining or corepox-duel-encounter sets World.rng.");
process.exit(fail ? 1 : 0);
