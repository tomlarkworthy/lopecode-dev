// What a run actually pays, and what it has to beat. Written 2026-08-21 after Tom
// played a run: "the boss is OP for what components we have and there are few
// chances to get more components."
//
// Reads the shipped tables rather than restating them: SHIPS.wiredCore for the
// starting hull, genRun for the board. ENCOUNTER_RULES' scrap column is duplicated
// here as RULES because importing corepox-duel-encounter headlessly pulls in the
// battle stack; tools/corepox-encounter-check.ts is the gate that holds the map
// panel and ENCOUNTER_RULES to the same numbers, so a drift shows up there.
//
//   bun tools/corepox-econ-audit.ts
import {importNotebookModule} from "./notebook-import.ts";
const mis = await importNotebookModule("modules/@tomlarkworthy/corepox-missions.js",
  {overrides: {md: (s: any) => String(s)}});
const SHIPS: any = await mis.value("SHIPS");
const map = await importNotebookModule("modules/@tomlarkworthy/corepox-map.js",
  {overrides: {md: (s: any) => String(s)}});
const genRun: any = await map.value("genRun");

const RULES: any = {duel: 40, escort: 65, infiltrate: 90, boss: 200, race: 50,
                    debris: 35, rescue: 45, mining: 0, shop: 0, repair: 0, unknown: 0};
const wc = SHIPS.wiredCore;
console.log("start hull  wiredCore:", wc.components.length, "parts,",
            wc.connections.length, "wires  [" +
            [...new Set(wc.components.map((c: any) => c.type))].join(" ") + "]");
console.log("start hold  Engine 2, Lazer 2, Armour 4, Constant 2, Radar 1 = 11 spares");
console.log("start scrap 214\n");

for (const seed of [41, 7, 99]) {
  const run = genRun({seed, galaxy: 2, jumps: 7});
  const byCol: any[][] = [];
  for (const n of run.nodes) (byCol[n.col] ??= []).push(n);
  // best-case path: at every column take the node paying most
  let best = 0; const kinds: string[] = [];
  for (const col of byCol) {
    const pick = col.slice().sort((a, b) => (RULES[b.kind] ?? 0) - (RULES[a.kind] ?? 0))[0];
    best += RULES[pick.kind] ?? 0; kinds.push(pick.kind);
  }
  const counts: any = {};
  for (const n of run.nodes) counts[n.kind] = (counts[n.kind] ?? 0) + 1;
  console.log(`seed ${seed}  ${run.nodes.length} nodes  ` + JSON.stringify(counts));
  console.log(`  greedy path ${kinds.join(" -> ")}`);
  console.log(`  scrap on that path ${best}  (start 214 -> ${214 + best}), parts won <= ${kinds.length}`);
  console.log(`  boss band = 5 + col*2 + 12 = ${5 + (byCol.length - 1) * 2 + 12} parts`);
}

// What one salvage roll is worth, by the shipped weighting 1/max(5,cost)
const PART_COST: any = {Brain: 0, Constant: 5, Binary: 12, Radar: 25, Engine: 20, Lazer: 30,
  Explosive: 18, Orb: 35, Armour: 10, LaserTurret2: 55, Hyperdrive: 60};
const bag = Object.keys(PART_COST).filter(t => PART_COST[t] > 0);
const w = (t: string) => 1 / Math.max(5, PART_COST[t]);
const tot = bag.reduce((a, t) => a + w(t), 0);
const GUN = /Lazer|Explosive|Orb|Turret/;
let ev = 0, pg = 0;
console.log("\none salvage roll:");
for (const t of bag.sort((a, b) => w(b) - w(a))) {
  const p = w(t) / tot; ev += p * PART_COST[t]; if (GUN.test(t)) pg += p;
  console.log(`  ${t.padEnd(13)} ${(100 * p).toFixed(1).padStart(5)}%  worth ${PART_COST[t]}`);
}
console.log(`  expected value ${ev.toFixed(1)} scrap    P(a weapon) ${(100 * pg).toFixed(1)}%`);
console.log(`  over 6 nodes: ~${(6 * ev).toFixed(0)} scrap of parts, ~${(6 * pg).toFixed(1)} weapons`);
