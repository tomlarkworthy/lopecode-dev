// Does a component BLOCK over its whole footprint, or only at its anchor?
//
// Tom, 2026-08-20: "Collisions are not working properly. Very apparent on radar
// where nodes can totally overlap that circular component. Also it seems like
// lazer can shoot things in the interior which is incorrect."
//
// Both the collision pass and the particle pass modelled a component as ONE disc
// at its origin tile (Ship.worldOf). A Radar is six cells and an Orb is four, so
// five sixths of a Radar and three quarters of an Orb were empty space. This
// measures that directly, and after the fix it is the gate that keeps footprints
// solid.
//
//   bun tools/corepox-hitbox.ts
import {importNotebookModule} from "./notebook-import.ts";

const eng = await importNotebookModule(process.env.ENGINE ?? "modules/@tomlarkworthy/corepox-engine.js");
const {Ship, World, TYPES, UNITS, DT}: any = await eng.values(["Ship", "World", "TYPES", "UNITS", "DT"]);

const ship = (comps: any[], opts: any = {}) =>
  new Ship({name: "t", components: comps, connections: []}, {team: "a", ...opts});
// c.tiles are absolute ship cells; worldOf takes anything with px,py, which is
// how the Orb melee already addresses a cell that is not the anchor.
const cellWorld = (s: any, t: number[]) => s.worldOf({px: t[0], py: t[1]});

let fail = 0;
const say = (ok: boolean, s: string) => { if (!ok) fail++; console.log((ok ? "ok   " : "FAIL ") + s); };

// ---------------------------------------------------------------- penetration
// Park a single Armour on each cell of a hull component and step once. If the
// footprint is solid, every cell rejects it.
const penetration = (type: string) => {
  const probe = ship([{type, pos: [0, 0], dir: "up"}]);
  const cells = probe.comps[0].tiles;
  const blocked: boolean[] = [];
  for (const cell of cells) {
    const hull = ship([{type, pos: [0, 0], dir: "up"}], {team: "a"});
    const [wx, wy] = cellWorld(hull, cell);
    const intr = ship([{type: "Armour", pos: [0, 0], dir: "up"}], {team: "b", x: wx, y: wy});
    const hp0 = hull.comps[0].hp;
    new World([hull, intr]).step();
    // contact is read off the HULL's hp, not the intruder's: collide() is the
    // only thing that damages the hull here, whereas the Orb also melees the
    // intruder and would report itself solid whatever its collision shape is.
    // Movement is no good either -- two cells resting exactly on top of one
    // another are at zero depth and get no separating push.
    blocked.push(hull.comps[0].hp < hp0);
  }
  const n = blocked.filter(Boolean).length;
  console.log(`  ${type.padEnd(10)} ${cells.length} cells, ${n} solid, ` +
              `${cells.length - n} passable   [${blocked.map(b => b ? "#" : ".").join("")}]`);
  return {n, of: cells.length};
};

console.log("an Armour parked on each cell of a hull component, one step:\n");
const HULLS = ["Radar", "Orb", "Lazer", "Engine", "Binary"];
const pen = HULLS.map(t => [t, penetration(t)] as const);

// ------------------------------------------------------------------ the beam
// A Radar shields a Brain parked beyond it. The beam runs ACROSS the Radar's far
// row, entering through cells (0,2) and (1,2) -- both 2.0 tiles from the Radar's
// ANCHOR at (0,0), so a test that only knows about anchors sees nothing there at
// all and carries on into the Brain.
const beamCase = () => {
  const HULL = [0, 2], TARGET = [3, 2];
  const s = ship([{type: "Radar", pos: [0, 0], dir: "up"},
                  {type: "Brain", pos: TARGET, dir: "up"}], {team: "a"});
  const gun = ship([{type: "Lazer", pos: [0, 0], dir: "up"}], {team: "b", x: 0, y: -40});
  const radar = s.comps[0], brain = s.comps[1];
  const [hx, hy] = cellWorld(s, HULL), [bx, by] = cellWorld(s, TARGET);
  const L = Math.hypot(bx - hx, by - hy), ux = (bx - hx) / L, uy = (by - hy) / L;
  const w = new World([s, gun]);
  w.emit(gun, gun.comps[0], "beam", hx - ux * 8, hy - uy * 8,
         ux * UNITS.BEAM_SPEED, uy * UNITS.BEAM_SPEED, UNITS.BEAM_TTL, 20);
  const hp = {radar: radar.hp, brain: brain.hp};
  for (let i = 0; i < 40 && w.particles.length; i++) w.stepParticles();
  const took = radar.hp < hp.radar ? "Radar" : brain.hp < hp.brain ? "Brain" : "nothing";
  const anchor = Math.abs((hx - s.worldOf(radar)[0]) * -uy + (hy - s.worldOf(radar)[1]) * ux);
  console.log(`\na beam crossing the Radar's far row on its way to a Brain beyond it:\n` +
              `  beam line passes ${anchor.toFixed(2)} tiles from the Radar's anchor, ` +
              `reach is HIT_R+BEAM_R = ${(UNITS.HIT_R + UNITS.BEAM_R).toFixed(2)}\n` +
              `  damaged: ${took}   (radar ${hp.radar}->${radar.hp}, brain ${hp.brain}->${brain.hp})`);
  return took;
};
const took = beamCase();

// A beam must still reach a target with nothing in front of it, or "shielding"
// would just be a beam that never lands.
const clearShot = () => {
  const s = ship([{type: "Brain", pos: [0, 0], dir: "up"}], {team: "a"});
  const gun = ship([{type: "Lazer", pos: [0, 0], dir: "up"}], {team: "b", x: 0, y: -40});
  const w = new World([s, gun]);
  const [bx, by] = cellWorld(s, [0, 0]);
  w.emit(gun, gun.comps[0], "beam", bx, by - 8, 0, UNITS.BEAM_SPEED, UNITS.BEAM_TTL, 20);
  const hp0 = s.comps[0].hp;
  for (let i = 0; i < 40 && w.particles.length; i++) w.stepParticles();
  return s.comps[0].hp < hp0;
};

// ------------------------------------------------------------------- the orb
// The Orb damages what is inside it. Its targets were addressed by anchor too, so
// a Radar could have cells in the Orb with its anchor outside and take nothing.
const orbCase = () => {
  const orb = ship([{type: "Orb", pos: [0, 0], dir: "up"}], {team: "a"});
  const [ox, oy] = orb.worldOf({px: 0.5, py: 0.5});          // centre of the 2x2
  // the victim's anchor is 2 cells from the cell that overlaps the Orb
  const victim = ship([{type: "Radar", pos: [0, 0], dir: "up"}], {team: "b"});
  const [vx, vy] = cellWorld(victim, [0, 2]);
  victim.x += ox - vx; victim.y += oy - vy;
  const hp0 = victim.comps[0].hp;
  const [ax, ay] = victim.worldOf(victim.comps[0]);
  new World([orb, victim]).step();
  const d = Math.hypot(ax - ox, ay - oy);
  console.log(`\nan Orb with an enemy Radar cell dead centre inside it:\n` +
              `  that Radar's anchor is ${d.toFixed(2)} tiles away, melee reach is ` +
              `${(UNITS.ORB_R + UNITS.HIT_R).toFixed(2)}\n` +
              `  radar ${hp0}->${victim.comps[0].hp}`);
  return victim.comps[0].hp < hp0;
};
const orbHit = orbCase();

// ------------------------------------------------------------------- teams
// Nothing in the damage model is team-scoped. Two ships collide whoever owns
// them, and MeleeFn has no team check at all -- what it cannot reach is its OWN
// ship, because every component of a ship shares one Rigidbody2D and Unity emits
// no contacts between colliders on the same body.
const teams = () => {
  const bump = (ta: string, tb: string) => {
    const A = ship([{type: "Armour", pos: [0, 0], dir: "up"}], {team: ta, x: -0.3, y: 0});
    const B = ship([{type: "Armour", pos: [0, 0], dir: "up"}], {team: tb, x: 0.3, y: 0});
    const h = A.comps[0].hp;
    new World([A, B]).step();
    return A.comps[0].hp < h;
  };
  const melee = (tb: string) => {
    const A = ship([{type: "Orb", pos: [0, 0], dir: "up"}], {team: "a"});
    const B = ship([{type: "Armour", pos: [0, 0], dir: "up"}], {team: tb, x: 1.5, y: -0.5});
    const h = B.comps[0].hp;
    const w = new World([A, B]); w.collide = () => {};        // isolate the melee
    w.step();
    return B.comps[0].hp < h;
  };
  // an Orb and an Armour on the SAME ship, touching: one rigid body, no contact.
  // The Armour goes on the Orb's AFT edge, the only side the Orb carries joints
  // on -- anywhere else and the ship is two islands, splits on the first step and
  // the melee is then between two ships, which is a different question.
  const own = (() => {
    const s = ship([{type: "Orb", pos: [0, 0], dir: "up"},
                    {type: "Armour", pos: [0, -1], dir: "up"}], {team: "a"});
    const h = s.comps[1].hp;
    const w = new World([s]); w.collide = () => {};
    w.step();
    return s.comps[1].hp < h;
  })();
  return {enemy: bump("a", "b"), friend: bump("a", "a"),
          meleeEnemy: melee("b"), meleeFriend: melee("a"), own};
};
const T = teams();

console.log();
for (const [t, r] of pen) say(r.n === r.of, `${t} is solid on all ${r.of} of its cells (${r.n})`);
say(took === "Radar", `the hull takes the beam, not the component behind it (took: ${took})`);
say(clearShot(), "a beam with nothing in the way still lands");
say(orbHit, "an Orb damages a component whose cell is inside it but whose anchor is not");
say(T.enemy && T.friend, `two ships collide whoever owns them (enemy ${T.enemy}, friendly ${T.friend})`);
say(T.meleeEnemy && T.meleeFriend, `an Orb melees anything touching it, friendly included ` +
    `(enemy ${T.meleeEnemy}, friendly ${T.meleeFriend})`);
say(!T.own, "an Orb does not melee its own ship -- one rigid body has no self-contacts");
process.exit(fail ? 1 : 0);
