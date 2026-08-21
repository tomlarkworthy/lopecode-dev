// Does winning a fight cost you anything? A run only has a spine if it does.
//
// FTL's hull and Slay the Spire's HP are the devices that make a node choice a
// decision: you can win and still be worse off, and the accumulation is the
// pressure. Corepox has a stronger version available and it is already implemented
// -- `survivingHull` rebuilds the campaign hull from the survivors, so a part shot
// off is gone for the rest of the run, and losing a Radar is a CAPABILITY loss, not
// a number going down. This measures whether that actually bites today.
//
// Wired control on both sides: corpus and roster ships fly their own programs, so
// the answer does not depend on the pilot (whose waypoint+face aiming is broken --
// tools/corepox-aim-hold.ts).
//
//   bun tools/corepox-attrition.ts
import {importNotebookModule} from "./notebook-import.ts";
import {Runtime} from "@observablehq/runtime";
(Runtime.prototype as any).fileAttachments ??= () => () => null;
(globalThis as any).window = {lopecode: {contentSync: () => ({status: 200, mime: "application/gzip", bytes: new Uint8Array()})}};
const eng = await importNotebookModule(process.env.ENGINE ?? "modules/@tomlarkworthy/corepox-engine.js");
const E: any = {};
for (const n of ["Ship", "World", "geom", "DT", "pilot", "loadShipSpec"]) E[n] = await eng.value(n);
const mis = await importNotebookModule("modules/@tomlarkworthy/corepox-missions.js",
  {overrides: {md: (s: any) => String(s)}});
const SHIPS: any = await mis.value("SHIPS");
const duel = await importNotebookModule("modules/@tomlarkworthy/corepox-duel.js", {
  overrides: {...E, SHIPS, md: (s: any) => String(s), htl: {html: () => {}},
              battlefield: null, backdrop: null, invalidation: new Promise(() => {})}});
const runDuel: any = await duel.value("runDuel");
// World.rng is Math.random and nothing in the game sets it (corepox-engine.js:1025;
// `seedRng` has one caller in the repo). Exhaust particles draw from it and carry
// EXHAUST_DMG, so an unseeded run is not repeatable -- corepox-mining-check.ts swung
// 2/5 to 5/5 seeds on identical input before this was found. Seeded here so the
// numbers in the header and in the plan can be reproduced.
(await eng.value("World") as any).rng = (await eng.value("seedRng") as any)(20260821);
const yard = await importNotebookModule("modules/@tomlarkworthy/corepox-shipyard.js", {
  overrides: {TYPES: await eng.value("TYPES"), TYPE_ALIAS: await eng.value("TYPE_ALIAS"),
              RELICS: await eng.value("RELICS"), loadShipSpec: E.loadShipSpec, SHIPS, TILE: 1}});
const specOfShip: any = await yard.value("specOfShip");
const encMod = await importNotebookModule("modules/@tomlarkworthy/corepox-duel-encounter.js", {
  overrides: {Ship: E.Ship, World: E.World, geom: E.geom, DT: E.DT,
              TYPES: await eng.value("TYPES"), TYPE_ALIAS: await eng.value("TYPE_ALIAS"),
              RELICS: await eng.value("RELICS"), loadShipSpec: E.loadShipSpec,
              shipNode: null, TILE: 1, shipEditor: null, specOfShip, CORPUS: {ships: {}},
              runDuel: null, duelView: null, newDuel: null, stepDuel: null,
              humanControl: null, SHIPS, miningView: null, runMining: null,
              md: (s: any) => String(s), htl: {html: () => {}},
              invalidation: new Promise(() => {})}});
const survivingHull: any = await encMod.value("survivingHull");

const ROSTER = ["gunBoat", "laserpost", "aimPlayer", "proximityMine", "spike",
                "orbDroneChassis_hull", "unfinishedOrbDrone_hull", "shooter", "drifter"];
const f = (x: number, w = 6, d = 1) => x.toFixed(d).padStart(w);

type R = {win: string; lost: number; of: number; secs: number; hp: number};
const res: R[] = [];
let draws = 0;
for (let i = 0; i < ROSTER.length; i++)
  for (let j = i + 1; j < ROSTER.length; j++)
    for (const seed of [1, 2, 3]) {
      const r = runDuel({mode: "elimination", limit: 60, seed,
        a: {spec: SHIPS[ROSTER[i]]}, b: {spec: SHIPS[ROSTER[j]]},
        placement: {separation: 22, bearing: 25}});
      if (r.winner !== "a" && r.winner !== "b") { draws++; continue; }
      const w = r.winner === "a" ? r.duel.a : r.duel.b;
      const of = r.winner === "a" ? SHIPS[ROSTER[i]].components.length
                                  : SHIPS[ROSTER[j]].components.length;
      // hp as well as parts: a hull can come out whole and shredded, and only the
      // parts count survives into the campaign (survivingHull rebuilds from live).
      const hp = w.comps.reduce((a: number, c: any) => a + Math.max(0, c.hp), 0);
      const hp0 = w.comps.reduce((a: number, c: any) => a + (c.maxHp ?? c.hp), 0);
      res.push({win: r.winner === "a" ? ROSTER[i] : ROSTER[j],
                lost: of - w.live.length, of, secs: r.seconds,
                hp: hp0 ? 100 * (1 - hp / hp0) : 0});
    }

const pct = res.map(r => 100 * r.lost / r.of);
const srt = pct.slice().sort((a, b) => a - b);
console.log(`${res.length} decisive wired duels over ${ROSTER.length} roster ships; ` +
            `${draws} of ${res.length + draws} pairings ended in a DRAW at the 60s limit ` +
            `(${(100 * draws / (res.length + draws)).toFixed(0)}%)\n`);
console.log(`the WINNER's losses, as a share of its own parts:`);
console.log(`  median ${f(srt[srt.length >> 1])}%   mean ${f(pct.reduce((a, b) => a + b, 0) / pct.length)}%` +
            `   worst ${f(Math.max(...pct))}%`);
console.log(`  won without losing a single part   ` +
            `${(100 * res.filter(r => r.lost === 0).length / res.length).toFixed(0)}% of wins`);
console.log(`  lost a third or more of the hull   ` +
            `${(100 * pct.filter(p => p >= 33).length / pct.length).toFixed(0)}% of wins`);
const hps = res.map(r => r.hp).sort((a, b) => a - b);
console.log(`\nthe winner's HP loss, which the campaign does NOT carry:`);
console.log(`  median ${f(hps[hps.length >> 1])}%   worst ${f(Math.max(...hps))}%   ` +
            `took ANY damage in ${(100 * hps.filter(h => h > 0).length / hps.length).toFixed(0)}% of wins`);
console.log(`\n  median fight length ${f(res.map(r => r.secs).sort((a, b) => a - b)[res.length >> 1], 5)}s\n`);

console.log("by winner:");
for (const s of ROSTER) {
  const rs = res.filter(r => r.win === s);
  if (!rs.length) { console.log(`  ${s.padEnd(24)} never won`); continue; }
  const p = rs.map(r => 100 * r.lost / r.of);
  console.log(`  ${s.padEnd(24)} ${String(rs.length).padStart(2)} wins   ` +
              `median loss ${f(p.slice().sort((a, b) => a - b)[p.length >> 1])}%  ` +
              `of ${rs[0].of} parts`);
}

// Six wins in a row is a run. What is left of the hull at the boss?
console.log("\ncompounded over the six fights of a run, at the median rate:");
let keep = 1;
const med = srt[srt.length >> 1] / 100;
for (let k = 1; k <= 6; k++) { keep *= (1 - med); if (k % 2 === 0) console.log(`  after ${k} wins  ${(100 * keep).toFixed(0)}% of the hull left`); }

// ---- and what the campaign carries between nodes ---------------------------
// Until 2026-08-21 this section reported NOTHING PERSISTS: `survivingHull` was
// `specOfShip` alone, which maps ship.COMPS, and a destroyed component stays in
// comps at hp 0 (Ship.damage never splices; the split path at :976 kills into the
// parent rather than removing). The destroyed part came back whole at the next node.
console.log("\nwhat survives to the next node:");
const s2 = new E.Ship(E.loadShipSpec(SHIPS.gunBoat).spec, {team: "a", x: 0, y: 0, a: 0});
const v = s2.comps.find((c: any) => c.type === "Armour") ?? s2.comps[1];
const h = s2.comps.find((c: any) => c.type === "Engine");
s2.damage(v, v.hp);
s2.damage(h, 7);
const back = survivingHull(s2, "hull");
const kept = back.components.find((c: any) => c.pos[0] === h.px && c.pos[1] === h.py);
console.log(`  gunBoat, one ${v.type} destroyed and one ${h.type} down to ${h.hp}/${h.maxHp}:`);
console.log(`    comps ${s2.comps.length}, live ${s2.live.length}`);
console.log(`    survivingHull -> ${back.components.length} components, ` +
            `${back.connections.length} of ${s2.conns.length} wires`);
console.log(`    the damaged survivor carries dmg ${kept?.dmg ?? "NONE"}`);
console.log(back.components.length < s2.comps.length && kept?.dmg
  ? "  -> damage persists: the dead are dropped and the living keep their wounds"
  : "  -> NOTHING PERSISTS -- see tools/corepox-carry.ts, which gates this");
