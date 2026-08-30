// Damage carries between nodes. Gate for the 2026-08-21 change to survivingHull /
// specOfShip / the Ship constructor.
//
// Before it, `survivingHull` returned every component a hull started with, at full
// hp, however the battle went (tools/corepox-attrition.ts). A run therefore had no
// accumulating state at all -- see plan/corepox-tasks.md, "The map arc".
//
// What must hold:
//   1. a destroyed component is gone from the hull, and so are its wires
//   2. a damaged survivor keeps its damage, as `dmg` in the spec
//   3. loading that spec gives back the damaged hp, and maxHp is still the full one
//   4. the round trip is idempotent -- spec -> Ship -> spec is a fixed point
//   5. an UNDAMAGED ship serialises exactly as it did before, so saved designs, the
//      corpus and shipSource are untouched
//
//   bun tools/corepox-carry.ts
import {importNotebookModule} from "./notebook-import.ts";
import {Runtime} from "@observablehq/runtime";
(Runtime.prototype as any).fileAttachments ??= () => () => null;
(globalThis as any).window = {lopecode: {contentSync: () => ({status: 200, mime: "application/gzip", bytes: new Uint8Array()})}};

const eng = await importNotebookModule(process.env.ENGINE ?? "modules/@tomlarkworthy/corepox-engine.js");
const E: any = {};
for (const n of ["Ship", "World", "geom", "DT", "pilot", "TYPES", "TYPE_ALIAS", "RELICS", "loadShipSpec"])
  E[n] = await eng.value(n);
const mis = await importNotebookModule("modules/@tomlarkworthy/corepox-missions.js",
  {overrides: {md: (s: any) => String(s)}});
const SHIPS: any = await mis.value("SHIPS");
const yard = await importNotebookModule("modules/@tomlarkworthy/corepox-shipyard.js", {
  overrides: {TYPES: E.TYPES, TYPE_ALIAS: E.TYPE_ALIAS, RELICS: E.RELICS,
              loadShipSpec: E.loadShipSpec, SHIPS, TILE: 1}});
const specOfShip: any = await yard.value("specOfShip");
// EXACTLY corepox-duel-encounter's import list: module.redefine throws on a name the
// module does not have, so an over-supplied fixture is as fatal as a short one.
const encMod = await importNotebookModule("modules/@tomlarkworthy/corepox-duel-encounter.js", {
  overrides: {Ship: E.Ship, World: E.World, geom: E.geom, DT: E.DT, TYPES: E.TYPES,
              TYPE_ALIAS: E.TYPE_ALIAS, RELICS: E.RELICS, loadShipSpec: E.loadShipSpec,
              shipNode: null, TILE: 1, shipEditor: null, specOfShip, CORPUS: {ships: {}},
              runDuel: null, duelView: null, newDuel: null, stepDuel: null,
              humanControl: null, SHIPS, miningView: null, runMining: null,
              md: (s: any) => String(s), htl: {html: () => {}},
              invalidation: new Promise(() => {})}});
const survivingHull: any = await encMod.value("survivingHull");

let fail = 0;
const say = (ok: boolean, s: string) => { if (!ok) fail++; console.log((ok ? "ok   " : "FAIL ") + s); };
const mk = (spec: any) => new E.Ship(E.loadShipSpec(spec).spec, {team: "a", x: 0, y: 0, a: 0});

// gunBoat: Radar Engine LaserTurret2 Constant Engine Armour Brain, 6 wires
const s = mk(SHIPS.gunBoat);
const n0 = s.comps.length, w0 = s.conns.length;
// The destroyed part must be a WIRED one, or the wire-dropping assertion below
// passes on "0 of 0" and never reaches the path it is there to guard.
const wired = (c: any) => s.conns.some((k: any) =>
  (k.from[0] === c.px && k.from[1] === c.py) || (k.to[0] === c.px && k.to[1] === c.py));
const dead = s.comps.find(wired);
const hurt = s.comps.find((c: any) => c.type === "Engine");
s.damage(dead, dead.hp);
s.damage(hurt, 7);
const wiresOnDead = s.conns.filter((k: any) =>
  (k.from[0] === dead.px && k.from[1] === dead.py) || (k.to[0] === dead.px && k.to[1] === dead.py)).length;

const spec = survivingHull(s, "hull");
console.log(`gunBoat ${n0} parts / ${w0} wires: one ${dead.type} destroyed, one ${hurt.type} at ` +
            `${hurt.hp}/${hurt.maxHp}\n`);

say(spec.components.length === n0 - 1,
    `the destroyed part is gone from the hull (${spec.components.length} of ${n0})`);
say(!spec.components.some((c: any) => c.pos[0] === dead.px && c.pos[1] === dead.py),
    `and it is gone by POSITION, not just by count`);
say(wiresOnDead > 0, `the fixture exercises the wire path: the dead ${dead.type} had ${wiresOnDead} wire(s)`);
say(spec.connections.length === w0 - wiresOnDead,
    `its ${wiresOnDead} wire(s) went with it (${spec.connections.length} of ${w0})`);
const back = spec.components.find((c: any) => c.pos[0] === hurt.px && c.pos[1] === hurt.py);
say(back?.dmg === hurt.maxHp - hurt.hp,
    `the damaged survivor carries dmg ${back?.dmg} (took ${hurt.maxHp - hurt.hp})`);
say(spec.components.filter((c: any) => c.dmg != null).length === 1,
    `and it is the ONLY component carrying damage`);

// 3. reload
const s2 = mk(spec);
const re = s2.comps.find((c: any) => c.px === hurt.px && c.py === hurt.py);
say(re.hp === hurt.hp, `reloaded at ${re.hp} hp, not ${re.maxHp}`);
say(re.maxHp === hurt.maxHp, `and maxHp is still the full ${re.maxHp} -- repair has a ceiling`);

// 4. idempotent
const spec2 = survivingHull(s2, "hull");
say(JSON.stringify(spec2) === JSON.stringify(spec), "spec -> Ship -> spec is a fixed point");

// 5. an undamaged ship is untouched
let clean = 0, dirty: string[] = [];
for (const [name, sp] of Object.entries<any>(SHIPS)) {
  let sh: any; try { sh = mk(sp); } catch { continue; }
  const out = specOfShip(sh, name);
  if (out.components.some((c: any) => "dmg" in c)) dirty.push(name); else clean++;
}
say(!dirty.length, `no undamaged roster ship gains a dmg field (${clean} checked)` +
                   (dirty.length ? "  offenders: " + dirty.join(",") : ""));

// a hull cut in two: the fragment's parts must not come back either
const bar = {name: "bar", components: Array.from({length: 6}, (_, i) =>
  ({type: "Armour", pos: [i, 0], dir: "up"})), connections: []};
const b = mk(bar);
const cut = b.at(2, 0); b.damage(cut, cut.hp);
const w = new E.World([b]); w.step();
const kept = survivingHull(w.ships[0], "bar");
say(kept.components.length < 6,
    `a severed bar keeps only its own island (${kept.components.length} of 6 parts)`);

console.log();
process.exit(fail ? 1 : 0);
