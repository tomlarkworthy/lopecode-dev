// A bomb goes off however it dies. ShipComponent.cs:84 damage() calls destroy() the
// moment hp reaches 0, and ExplosiveFn overrides destroy() to fire its 32 fragments,
// so the original detonates on a bolt, on a ram and on an Orb alike.
//
// The port had the rule in the PARTICLE path only ("if (died && hit.c.type ===
// 'Explosive')" inside World.step), so shooting a bomb set it off and ramming one did
// not -- Tom, 2026-08-23: "Explosives don't trigger on contact destruction".
//
// The one death that must NOT detonate is a SPLIT: Ship.detach removes a component
// from the parent by damaging it to 0 after copying it onto the fragment, so a bomb
// on a severed island would explode every time a hull came apart.
//
//   bun tools/corepox-explosive-death.ts
//   ENGINE=path/to/engine.js bun tools/corepox-explosive-death.ts   # A/B one session
import {importNotebookModule} from "./notebook-import.ts";

const path = process.env.ENGINE ?? process.env.COREPOX_ENGINE ??
             "modules/@tomlarkworthy/corepox-engine.js";
const eng = await importNotebookModule(path);
const {Ship, World, UNITS, seedRng}: any = await eng.values(["Ship", "World", "UNITS", "seedRng"]);
World.rng = seedRng(20260823);          // exhaust damage is a draw; pin it
World.EXHAUST = false;                  // and keep it out of the way entirely

let fail = 0;
const ok = (c: any, label: string, detail = "") => {
  console.log(`${c ? "  ok  " : "FAIL  "}${label}${detail ? "   " + detail : ""}`); if (!c) fail++;
};
const frags = (w: any) => w.particles.filter((p: any) => p.kind === "frag").length;
const spec = (comps: any[], name = "t") =>
  ({name, components: comps, connections: []});

// ---- what a detonation looks like when it works ----------------------------
// The unit case: kill the bomb outright and count what comes off it.
const shot = () => {
  const s = new Ship(spec([{type: "Brain", pos: [0, 0], dir: "up"},
                           {type: "Explosive", pos: [0, 1], dir: "up"}]), {team: "a", x: 0, y: 0, a: 0});
  const w = new World([s]);
  w.step();                                        // the world has to be stepped once to be a world
  const bomb = s.comps.find((c: any) => c.type === "Explosive");
  s.damage(bomb, bomb.hp);
  return {n: frags(w), dead: bomb.hp === 0};
};
const direct = shot();
console.log("a bomb destroyed outright\n");
ok(direct.n === UNITS.FRAG_N, `fires ${UNITS.FRAG_N} fragments`, `${direct.n}`);

// ---- contact: the case that was broken -------------------------------------
// Two hulls pressed together and closing. Ship.cs:586 puts RAM_DMG on the cell under
// each contact point EVERY tick they touch, and an Explosive has 5hp against a
// RAM_DMG of 5, so the first contact tick is fatal to it.
console.log("\ncontact");
const ram = () => {
  const a = new Ship(spec([{type: "Brain", pos: [0, 0], dir: "up"},
                           {type: "Explosive", pos: [1, 0], dir: "up"}], "bomber"),
                     {team: "a", x: 0, y: 0, a: 0});
  const b = new Ship(spec([{type: "Armour", pos: [0, 0], dir: "up"},
                           {type: "Armour", pos: [1, 0], dir: "up"}], "wall"),
                     {team: "b", x: 3.2, y: 0, a: 0});
  a.vx = 6; b.vx = -6;                              // closing, so contact is not separating
  const w = new World([a, b]);
  const bomb = a.comps.find((c: any) => c.type === "Explosive");
  let contactTick = -1;
  for (let i = 0; i < 120; i++) {
    w.step();
    if (bomb.hp <= 0) { contactTick = i; break; }
  }
  return {n: frags(w), contactTick, hp: bomb.hp,
          wallHp: b.comps.map((c: any) => c.hp)};
};
const r = ram();
ok(r.contactTick >= 0, "the bomb is destroyed by contact", `tick ${r.contactTick}`);
ok(r.n > 0, "and it detonates", `${r.n} fragments`);
ok(r.n === UNITS.FRAG_N, `all ${UNITS.FRAG_N} of them`, `${r.n}`);

// ---- an Orb is contact too -------------------------------------------------
console.log("\nan Orb's field");
const orb = () => {
  const a = new Ship(spec([{type: "Brain", pos: [0, 0], dir: "up"},
                           {type: "Orb", pos: [0, 1], dir: "up"}], "orb"), {team: "a", x: 0, y: 0, a: 0});
  // ORB_R is 1.1 * 0.33 / 0.64 = 0.567 TILES, which is smaller than it sounds: a bomb
  // parked at (0.9, 1.2) sits outside the field and nothing happens, and a gate
  // written against that placement reports a broken Orb rather than a missed one.
  const b = new Ship(spec([{type: "Explosive", pos: [0, 0], dir: "up"}], "bomb"),
                     {team: "b", x: 0.6, y: 1.0, a: 0});
  const w = new World([a, b]);
  const bomb = b.comps[0];
  let tick = -1;
  for (let i = 0; i < 60; i++) { w.step(); if (bomb.hp <= 0) { tick = i; break; } }
  return {n: frags(w), tick};
};
const o = orb();
ok(o.tick >= 0, "an Orb destroys a bomb parked in it", `tick ${o.tick}`);
ok(o.n > 0, "and that detonates too", `${o.n} fragments`);

// ---- and the death that is not a death -------------------------------------
// A bar cut in the middle: the far half becomes its own ship, and the Explosive
// riding on it is moved, not destroyed.
console.log("\na split is not a death");
const split = () => {
  const s = new Ship(spec([{type: "Armour", pos: [0, 0], dir: "up"},
                           {type: "Armour", pos: [1, 0], dir: "up"},
                           {type: "Armour", pos: [2, 0], dir: "up"},
                           {type: "Explosive", pos: [3, 0], dir: "up"}], "bar"),
                     {team: "a", x: 0, y: 0, a: 0});
  const w = new World([s]);
  w.step();
  const before = frags(w);
  const mid = s.at(2, 0);
  s.damage(mid, mid.hp);            // cut it: the Explosive's island is now separate
  w.step();
  // The parent keeps a DEAD copy of every transferred component -- damaging it to 0
  // is how Ship.detach removes it -- so the bomb to look at is the fragment's, and a
  // check that takes the first Explosive in the world finds the corpse instead.
  const alive = w.ships.some((x: any) =>
    x.comps.some((c: any) => c.type === "Explosive" && c.hp > 0));
  return {bodies: w.ships.length, n: frags(w) - before, alive};
};
const sp = split();
ok(sp.bodies === 2, "the hull comes apart", `${sp.bodies} bodies`);
ok(sp.alive, "the bomb rides the fragment, alive");
ok(sp.n === 0, "and nothing detonates", `${sp.n} fragments`);

console.log(fail ? `\nFAIL: ${fail}` : "\nPASS");
process.exit(fail ? 1 : 0);
