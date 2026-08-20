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

const eng = await importNotebookModule("modules/@tomlarkworthy/corepox-engine.js");
const {Ship, World, DT}: any = await eng.values(["Ship", "World", "DT"]);
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
const DIRS4 = ["up", "right", "down", "left"];
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

let best: any = null, found = 0, simulated = 0;
const STOP = Number(process.env.STOP ?? 45);        // a win this fast is good enough

// constructive: each part must attach to what is already there
const grow = (i: number, comps: any[]) => {
  if (i === ROLES.length) { found++; evaluate(comps); return; }
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
  simulated++;
  if (simulated % 2000 === 0) console.log(`  ... ${found} layouts, ${simulated} simulated, best ${best ? best.left + " left @" + best.t.toFixed(1) + "s" : "none"}`);
  const es = m.enemies.map((e: any) => new Ship(e.spec, {team: "enemy", x: e.x, y: e.y, a: e.a}));
  const w = new World([p, ...es]);
  let t = 0;
  for (; t < HORIZON && core(p) && es.some(core); t += DT) w.step(DT);
  const left = es.filter(core).length;
  // dying fast is not winning fast: without this the ranking prefers a layout that
  // suicides at 0.3s over one that fights for 14s, because both leave 3 enemies.
  const score = core(p) ? left * 1000 + t : 9e6 + left * 1000 - t;
  if (!best || score < best.score) {
    best = {score, t, left, spec};
    console.log(`  ${left} enemies left at ${t.toFixed(1)}s   ` +
      comps.slice(1).map((k: any) => `${k.type[0]}${k.pos}${k.dir === "up" ? "" : "/" + k.dir}`).join(" "));
  }
}
grow(0, [{type: "Brain", pos: [0, 0]}]);
console.log(`\n${found} joint-bound layouts, ${simulated} simulated`);
if (best) console.log(JSON.stringify(best.spec));
