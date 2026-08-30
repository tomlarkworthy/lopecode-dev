// FollowBoss's reference solution was built when connectivity was tile distance,
// and it does not survive the switch to joints: JOINTS.Radar is the aft edge only,
// so a radar parked beside the core is not attached to it, and neither Engine's
// forward face met a Binary joint. The saved solution loads as 3 islands and the
// campaign gate times out.
//
// corepox-boss-search.ts cannot repair it. Re-run under joints it enumerates
// 4,898,880 layouts, finds 490 that are one joint-bound body, and the best of them
// kills 1 of 3 enemies in 60s. Its role template is the problem: a fixed Lazer for
// the gun, and a radar position that has to bind while the core's north face is
// already spoken for.
//
// So this searches the turret design the old solution actually used -- LaserTurret2
// slaved to radar bearing and dist -- and places every part constructively: a part
// may only go where it joint-binds to the hull built so far. That prunes 1.8e9
// position tuples to a few thousand without simulating any of them.
//
//   bun tools/corepox-boss-rebuild.ts
import {importNotebookModule} from "./notebook-import.ts";

const eng = await importNotebookModule(process.env.ENGINE ?? "modules/@tomlarkworthy/corepox-engine.js");
const {Ship, World, DT, TYPES}: any = await eng.values(["Ship", "World", "DT", "TYPES"]);
const mis = await importNotebookModule("modules/@tomlarkworthy/corepox-missions.js");
const MISSIONS: any[] = await mis.value("MISSIONS");
const m: any = MISSIONS.find(x => x.id === "FollowBoss")!;
const box: number[][] = m.envelope;
const HORIZON = Number(process.env.T ?? 60);
const core = (s: any) => s.live.some((k: any) => k.type === "Brain");

// The mission allows rotation, and rotation is not cosmetic under joints: JOINTS
// travels with the component, so a Radar turned 180 carries its aft edge forward
// and binds to entirely different neighbours. Symmetric parts (Brain, Constant --
// all eight slots) gain nothing from it, so only the shaped parts turn.
// UPRIGHT=1 restricts every part to "up". A layout with no rotation at all is
// worth having even when a rotated one scores better: the shipped build flow
// places a part up and rotates it after, and every rotation is another menu the
// UI gate has to open -- FollowBoss's 2026-08-21 rotated answer wins headless and
// then strands corepox-qa-campaign.ts in connect mode ("no confirm", then "no
// menu" for the rest of the build).
const DIRS4 = process.env.UPRIGHT ? ["up"] : ["up", "right", "down", "left"];
const ROLES = [
  {type: "Radar", dirs: DIRS4},
  {type: "LaserTurret2", dirs: DIRS4},
  {type: "Constant", param: "100", dirs: ["up"]},
  {type: "Binary", param: "MINUS", dirs: DIRS4},
  {type: "Engine", dirs: DIRS4}, {type: "Engine", dirs: DIRS4}];

const bound = (comps: any[]) => {
  let s: any;
  try { s = new Ship({name: "p", components: comps, connections: []}, {team: "player"}); }
  catch { return null; }
  if (s.overlaps() || s.islands().length > 1) return null;
  return s;
};

// A ship that shoots itself is not a solution either, and the difference between
// winning and losing can be one self-hit: the 2026-08-21 upright answer put the
// turret at [1,0] with the core at [0,0], and the beam's TAIL -- 1.24 tiles behind
// the barrel pivot -- lands on the core whenever the turret aims east. Headless it
// took 2 hits of 4 and won at 16.8s; in the browser it took 4 and the campaign UI
// gate read DEFEAT at t=5.0s with the enemies untouched. Fly it alone first, the
// way corepox-selfharm.ts flies the corpus, and reject anything that hurts itself.
// Flown ALONE the radar reads NaN and the turret never fires, so the test needs a
// target -- one parked 60 tiles east, past the 40.6-tile beam range and far enough
// that 5s of thrust cannot close it. Anything the player loses is its own doing.
const selfHarms = (spec: any) => {
  let p: any; try { p = new Ship({name: "p", ...spec}, {team: "player", x: 0, y: 0, a: 0}); }
  catch { return true; }
  const hp0 = p.comps.map((c: any) => c.hp);
  const far = new Ship({name: "dummy", components: [{type: "Brain", pos: [0, 0]}], connections: []},
                       {team: "enemy", x: 60, y: 0, a: 180});
  const w = new World([p, far]);
  for (let t = 0; t < 5; t += DT) w.step();
  return p.comps.some((c: any, i: number) => c.hp < hp0[i]);
};

let best: any = null, found = 0, simulated = 0, unbuildable = 0, selfharmed = 0;
const STOP = Number(process.env.STOP ?? 45);        // a win this fast is good enough
// The objective is `destroy n: 1`, so one kill and a surviving core IS the win.
const KILLS = Number(process.env.KILLS ?? 1);
class Done extends Error {}

// A layout the UI cannot build is not a solution. The shipped flow places a part
// UP and rotates it afterwards, so every rotated part must have somewhere to sit
// in its up-facing footprint at the moment it goes down -- and the 2026-08-21
// search's first answer did not: LaserTurret2 at [-2,-2] facing up covers (0,0),
// where the mission's Brain already is, in any build order. The qa-campaign gate
// caught it by clicking ("no menu at -2,-2", 5/7 parts). This is that gate's rule,
// applied before a layout is worth simulating.
//
// Greedy is complete here: placing a part only ever ADDS obstacles, so a part that
// cannot go down now cannot go down later either.
const upTiles = (c: any) => TYPES[c.type].tiles.map((t: number[]) =>
  [c.pos[0] + t[0], c.pos[1] + t[1]].join(","));
const finalTiles = (c: any) => {
  const s = new Ship({name: "x", components: [c], connections: []}, {team: "p"});
  return s.comps[0].tiles.map((t: number[]) => t.join(","));
};
const buildable = (comps: any[]) => {
  const base = comps[0];                            // the Brain the mission hands you
  const done = new Set<string>(finalTiles(base));
  const left = comps.slice(1).map(c => ({c, up: upTiles(c), fin: finalTiles(c)}));
  while (left.length) {
    const i = left.findIndex(k => !k.up.some(t => done.has(t)));
    if (i < 0) return false;
    left[i].fin.forEach((t: string) => done.add(t));
    left.splice(i, 1);
  }
  return true;
};

// constructive: each part must attach to what is already there
const grow = (i: number, comps: any[]) => {
  if (i === ROLES.length) {
    found++;
    if (!buildable(comps)) { unbuildable++; return; }
    evaluate(comps);
    return;
  }
  const role = ROLES[i];
  for (const pos of box) for (const dir of role.dirs) {
    // the two Engines are interchangeable; fix an order so each pair is tried once
    if (role.type === "Engine" && i > 0 && ROLES[i - 1].type === "Engine") {
      const prev = comps[comps.length - 1].pos;
      if (pos[0] < prev[0] || (pos[0] === prev[0] && pos[1] <= prev[1])) continue;
    }
    const next = [...comps, {...role, dirs: undefined, dir, pos}];
    if (bound(next)) grow(i + 1, next);
  }
};
const wire = (c: any[]) => {
  const at = (t: string, n = 0) => c.filter(k => k.type === t)[n].pos;
  const radar = at("Radar"), gun = at("LaserTurret2"), konst = at("Constant"),
        bin = at("Binary"), eL = at("Engine", 0), eR = at("Engine", 1);
  return [
    {from: radar, fromPort: "bearing", to: gun, toPort: "angle"},
    {from: radar, fromPort: "dist", to: gun, toPort: "fire"},
    {from: radar, fromPort: "bearing", to: eL, toPort: "in"},
    {from: radar, fromPort: "bearing", to: bin, toPort: "b"},
    {from: konst, fromPort: "out", to: bin, toPort: "a"},
    {from: bin, fromPort: "out", to: eR, toPort: "in"}];
};

function evaluate(comps: any[]) {
  if (best && best.left === 0 && best.t <= STOP) return;
  const spec = {components: comps, connections: wire(comps)};
  let p: any; try { p = new Ship({name: "p", ...spec}, {team: "player", x: 0, y: 0, a: 0}); } catch { return; }
  if (selfHarms(spec)) { selfharmed++; return; }
  simulated++;
  if (simulated % 200 === 0) console.log(`  ... ${found} layouts, ${unbuildable} unbuildable, ${selfharmed} self-harming, ${simulated} simulated, best ${best ? best.left + " left @" + best.t.toFixed(1) + "s" : "none"}`);
  const es = m.enemies.map((e: any) => new Ship(e.spec, {team: "enemy", x: e.x, y: e.y, a: e.a}));
  const w = new World([p, ...es]);
  let t = 0;
  for (; t < HORIZON && core(p) && es.some(core); t += DT) w.step(DT);
  const left = es.filter(core).length;
  // dying fast is not winning fast: without this the ranking prefers a layout that
  // suicides at 0.3s over one that fights for 14s, because both leave 3 enemies.
  // A core that ends the match on full health is the real robustness test, and it
  // is the one the dummy-target self-harm probe above is too gentle to make: the
  // turret only sweeps across its own hull while it is TRACKING something that
  // moves. The layout this replaced won headless at 16.8s with its core at 10 of
  // 20 -- two of the four self-hits it takes -- and lost in the browser, where it
  // took all four. Rank a hurt core below an unhurt one.
  const hurt = p.comps.filter((c: any) => c.type === "Brain")
                      .some((c: any) => c.hp < TYPES.Brain.hp);
  const score = core(p) ? (hurt ? 5e5 : 0) + left * 1000 + t : 9e6 + left * 1000 - t;
  if (!best || score < best.score) {
    best = {score, t, left, spec};
    console.log(`  ${left} enemies left at ${t.toFixed(1)}s ${hurt ? "CORE HURT" : "core ok "}  ` +
      comps.slice(1).map((k: any) => `${k.type[0]}${k.pos}${k.dir === "up" ? "" : "/" + k.dir}`).join(" "));
  }
  if (core(p) && !hurt && es.length - left >= KILLS) throw new Done();
}
try { grow(0, [{type: "Brain", pos: [0, 0]}]); } catch (e) { if (!(e instanceof Done)) throw e; }
console.log(`\n${found} joint-bound layouts, ${unbuildable} unbuildable, ${selfharmed} self-harming, ${simulated} simulated`);
if (best) console.log(JSON.stringify(best.spec));
