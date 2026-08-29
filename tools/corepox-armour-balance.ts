// "Armour seems a bit too strong" (Tom, 2026-08-22). What is it actually worth?
//
// Armour is the ONLY part the shipped game buffed in the 2018-01-14 balance pass:
// 75 -> 100 while Brain went 50 -> 20, Binary and Constant 100/50 -> 25, Lazer
// 100 -> 75, Radar 50 -> 25 and LaserTurret2 100 -> 50 (tools/corepox-hp-eras.ts,
// dated from 303 corpus ships). So 100 is not a guess, and lowering it is a
// deliberate departure from the shipped number rather than a bug fix.
//
// The arm: one wired hull, the same one on both sides of every duel, with N Armour
// cells bolted on and Armour's hp swept. Wired control on both sides, seeded, so
// the number does not depend on the pilot.
//
//   bun tools/corepox-armour-balance.ts
import {importNotebookModule} from "./notebook-import.ts";
import {Runtime} from "@observablehq/runtime";
(Runtime.prototype as any).fileAttachments ??= () => () => null;
(globalThis as any).window = {lopecode: {contentSync: () =>
  ({status: 200, mime: "application/gzip", bytes: new Uint8Array()})}};

const eng = await importNotebookModule("modules/@tomlarkworthy/corepox-engine.js");
const E: any = {};
for (const n of ["Ship", "World", "geom", "DT", "pilot", "loadShipSpec"]) E[n] = await eng.value(n);
const TYPES: any = await eng.value("TYPES");
const UNITS: any = await eng.value("UNITS");
const mis = await importNotebookModule("modules/@tomlarkworthy/corepox-missions.js",
  {overrides: {md: (s: any) => String(s)}});
const SHIPS: any = await mis.value("SHIPS");
const duel = await importNotebookModule("modules/@tomlarkworthy/corepox-duel.js", {
  overrides: {...E, SHIPS, md: (s: any) => String(s), htl: {html: () => {}},
              battlefield: null, backdrop: null, invalidation: new Promise(() => {})}});
const runDuel: any = await duel.value("runDuel");

// One Lazer is 5 damage a second (UNITS.BEAM_DMG over BEAM_CYCLE), so the table
// below is also readable straight off the hp: seconds of unbroken fire per cell.
console.log(`one Lazer = ${UNITS.BEAM_DMG} damage / ${UNITS.BEAM_CYCLE}s\n`);
console.log("part            hp   seconds of fire to destroy one");
for (const t of ["Brain", "Constant", "Radar", "Engine", "Lazer", "Armour"])
  console.log(`${t.padEnd(12)} ${String(TYPES[t].hp).padStart(5)}   ` +
              `${(TYPES[t].hp / UNITS.BEAM_DMG * UNITS.BEAM_CYCLE).toFixed(0).padStart(4)}`);

// gunBoat is the arm: a radar-driven turret and two engines, so it closes and
// shoots on its own program and the duel decides. Plates go on free cells touching
// the hull, taken in a fixed order, so both sides of a comparison get the same ones.
const BASE = SHIPS.gunBoat;
const freeCells = () => {
  const s = new E.Ship(structuredClone(BASE), {team: "a", x: 0, y: 0, a: 0});
  const taken = new Set<string>();
  for (const c of s.comps) for (const t of c.tiles) taken.add(t.join(","));
  const out: number[][] = [], seen = new Set<string>();
  for (const c of s.comps) for (const [x, y] of c.tiles)
    for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const k = (x + dx) + "," + (y + dy);
      if (taken.has(k) || seen.has(k)) continue;
      seen.add(k); out.push([x + dx, y + dy]);
    }
  return out.sort((p, q) => p[0] - q[0] || p[1] - q[1]);
};
const PLATES = freeCells();
console.log(`\n${PLATES.length} free cells touch the ${BASE.name} hull`);
// hp is stamped on the COMPONENT, not by mutating TYPES: `Ship` reads `c.hp ?? T.hp`
// (corepox-engine.js:669), and a spec-level hp is the same lever a corpus ship from
// an older balance era pulls. Mutating the shared TYPES was tried first and did not
// reach the ships at all -- a fresh 1-plate hull still came out 100/100 with
// TYPES.Armour.hp at 10 (tools/scratch/armour-duel.ts), so every row was identical
// and the sweep read as "hp does not matter" when it had simply never been applied.
const armoured = (n: number, hp: number) => ({
  name: "armoured", connections: structuredClone(BASE.connections),
  components: [...structuredClone(BASE.components).map((c: any) =>
                 c.type === "Armour" ? {...c, hp} : c),
               ...PLATES.slice(0, n).map(pos => ({type: "Armour", pos, hp}))]});

const SEEDS = [1, 2, 3, 4, 5, 6];
// Symmetric duels all draw at the limit -- gunBoat against itself is 8/8 draws at
// 90s, control included -- so the arm is the gunBoat against OTHER hulls, with the
// bare hull as the control row.
const FOES = ["laserpost", "spike", "drifter", "orbDroneChassis_hull", "shooter"];
const run = (spec: any) => {
  let win = 0, loss = 0, draw = 0, kept = 0, of = 0, plateDead = 0, plateAll = 0;
  for (const foe of FOES) for (const seed of SEEDS) {
    const r = runDuel({mode: "elimination", limit: 90, seed,
                       a: {spec}, b: {spec: SHIPS[foe]},
                       placement: {separation: 22, bearing: 25}});
    if (r.winner === "a") win++; else if (r.winner === "b") loss++; else draw++;
    // How much of the gunBoat is still flying when the clock stops, armour cells
    // excluded -- plates you bolt on inflate a raw part count for free.
    const live = r.duel.a.live.filter((c: any) => c.type !== "Armour").length;
    const all = r.duel.a.comps.filter((c: any) => c.type !== "Armour").length;
    kept += live; of += all;
    const plates = r.duel.a.comps.filter((c: any) => c.type === "Armour");
    plateAll += plates.length;
    plateDead += plates.filter((c: any) => c.hp <= 0).length;
  }
  return {win, loss, draw, kept: 100 * kept / of,
          plates: plateAll ? 100 * plateDead / plateAll : 0};
};

const n = FOES.length * SEEDS.length;
console.log(`\n${n} seeded elimination duels per row (${FOES.length} foes x ${SEEDS.length} seeds), 90s limit.`);
console.log("The gun boat's own record. `kept` is the percentage of its NON-armour");
console.log("components still alive when the clock stops.\n");
console.log("armour hp  plates   win  loss  draw   kept%   plates shot off%");
const row = (hp: any, plates: number, r: any) =>
  console.log(`${String(hp).padStart(9)}  ${String(plates).padStart(6)}   ` +
    `${String(r.win).padStart(3)}  ${String(r.loss).padStart(4)}  ${String(r.draw).padStart(4)}   ` +
    r.kept.toFixed(1).padStart(5) + "   " + r.plates.toFixed(1).padStart(15));
row(TYPES.Armour.hp, 1, run(structuredClone(BASE)));   // the hull ships with one plate
for (const hp of [100, 75, 50, 25, 10])
  for (const k of [4, 8]) row(hp, 1 + k, run(armoured(k, hp)));
