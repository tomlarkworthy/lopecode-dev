// Does an Orb hurt what it is sitting on, and where exactly?
//
// MeleeFn damages EVERY component whose collider touches the trigger, by 5, every
// FixedUpdate. This walks a one-tile enemy across a stationary Orb and prints the
// damage per tick at each offset, so the SHAPE of the zone is visible rather than
// asserted. `collide` is stubbed out for the sweep because ramming also does 5 per
// contact per tick (Ship.cs:586) and would be indistinguishable in the table.
//
// Amended 2026-08-21. The reach used to be asserted from ONE point, the centre of
// the 2x2: 1.067 tiles about a square whose own cell centres are 0.707 out, so it
// stopped 0.36 tiles short of the Orb's own edge. That only ever worked because
// hulls could interpenetrate. Footprints are solid now, contact happens at a cell
// separation of 1.0, and a centre-measured Orb reached nothing at all -- an Orb
// rammed into a Brain left it untouched. The reach is measured from each of the
// Orb's four CELLS instead, which is 1.067 against contact at 1.0, i.e. touching.
import {importNotebookModule} from "./notebook-import.ts";
const m = await importNotebookModule(process.env.ENGINE ?? "modules/@tomlarkworthy/corepox-engine.js");
const Ship: any = await m.value("Ship");
const World: any = await m.value("World");
const UNITS: any = await m.value("UNITS");

const orb = {name: "orb", components: [{type: "Orb", pos: [0, 0]}], connections: []};
const dot = {name: "dot", components: [{type: "Armour", pos: [0, 0]}], connections: []};

// dx, dy are TILE offsets from the Orb's own centre; worldOf has +py downward
// (ly = -(py - cy)), so a tile offset of +dy is a world y of -dy.
const probe = (dx: number, dy: number) => {
  const a = new Ship(orb, {team: "a", x: 0, y: 0, a: 0});
  const b = new Ship(dot, {team: "b", x: dx, y: -dy, a: 0});
  const w = new World([a, b]);
  w.collide = () => {};
  const before = b.comps[0].hp;
  w.step();
  return before - b.comps[0].hp;
};

const R = UNITS.ORB_R + UNITS.HIT_R;
console.log(`ORB_R ${UNITS.ORB_R.toFixed(3)} + HIT_R ${UNITS.HIT_R} = ${R.toFixed(3)} tiles, ` +
            `ORB_DMG ${UNITS.ORB_DMG} per tick`);
const AX = [-1.5, -1, -0.5, 0, 0.5, 1, 1.5];
console.log("\ndamage per tick, target at (dx,dy) TILES from the Orb's centre\n");
console.log("       " + AX.map(x => String(x).padStart(5)).join(""));
for (const dy of AX)
  console.log(String(dy).padStart(6) + " " + AX.map(dx => String(probe(dx, dy)).padStart(5)).join(""));

// A zone centred on the Orb's own square is symmetric in both axes about 0.
const sym = AX.every(v => probe(v, 0) === probe(-v, 0) && probe(0, v) === probe(0, -v));
// Measured from the nearest of the Orb's four cells, which sit at (+-0.5, +-0.5)
// from its centre. (1.5, 0.5) is exactly 1.0 from the cell at (0.5, -0.5) -- the
// separation two cells have when they are touching -- and must be damaged.
// (2, 0.5) is 1.5 away and (1.5, 1.5) is 1.414 away; both are clear of it.
const reaches = probe(1.5, 0.5) === UNITS.ORB_DMG && probe(0.5, 0.5) === UNITS.ORB_DMG &&
                probe(2, 0.5) === 0 && probe(1.5, 1.5) === 0;
// Every component inside gets hit, not just the nearest -- two targets, both hurt.
const many = (() => {
  const a = new Ship(orb, {team: "a", x: 0, y: 0, a: 0});
  const b = new Ship({name: "pair", connections: [], components:
    [{type: "Armour", pos: [0, 0]}, {type: "Armour", pos: [1, 0]}]},
    {team: "b", x: -0.5, y: 0, a: 0});
  const w = new World([a, b]); w.collide = () => {};
  const h = b.comps.map((c: any) => c.hp); w.step();
  return b.comps.map((c: any, i: number) => h[i] - c.hp);
})();
console.log(`\nsymmetric about the Orb's centre: ${sym}`);
console.log(`reaches ${R.toFixed(2)} tiles from a CELL and no further: ${reaches}`);
console.log(`two components inside, damage each: ${JSON.stringify(many)}`);
const ok = sym && reaches && many.filter((d: number) => d > 0).length === 2;
console.log(ok ? "\nOrb damages everything it touches, centred on its own square"
               : "\nFAIL");
process.exit(ok ? 0 : 1);
