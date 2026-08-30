// A ship built through the UI does not sit where the same ship built in one go
// sits, and for some missions that decides the match.
//
// `rebuild` (corepox-game) compensates for the centre of mass moving as parts go
// down, so the parts already on the board stay under the player's fingers -- Tom
// reported the alternative as "when i place a component the center of the ship
// shifts". The consequence is that after N placements the ship's ORIGIN has moved
// by the total CoM shift: FollowBoss's UI build leaves the Brain pinned at world
// (0,0) where a fresh `new Ship(solution, {x:0,y:0})` puts it at (0.429,-0.679).
//
// corepox-play-missions.ts constructs fresh and so cannot see this at all; it
// reports FollowBoss winnable. corepox-qa-campaign.ts builds through the UI and so
// can, but it reports one word ("DEFEAT") with the ship spec matching the solution
// exactly, which reads as a UI fault and is not one.
//
// This gate runs each mission's own reference solution at BOTH poses in the same
// engine, so the pose is the only variable. Read the DIFFERENCE, not the verdict:
// there is no player at the controls here, so a `live` mission that the campaign
// wins by flying reads `----` at both poses and is correctly reported as not
// pose-fragile.
//
// The modelled pose is checked against the real one, not assumed:
// tools/scratch/pose-read.ts builds each mission through the UI and reads the
// pose back. Measured 2026-08-21 -- FollowBoss x -0.429 y 0.679, TwinTurrets
// x -0.444 y 0.722, both exactly what uiPose() returns.
//
// It flags two. FollowBoss is confirmed end to end: LOSS at 5.0s here, and
// corepox-qa-campaign.ts loses it in the browser at t=5.0s with a spec matching
// the solution part for part and wire for wire. TwinTurrets is NOT confirmed --
// the browser wins it from the same pose -- so that mission sits near a boundary
// and this A/B is a warning about it, not a verdict on it.
//
//   usage: bun tools/corepox-build-pose.ts [MissionId]
import {importNotebookModule} from "./notebook-import.ts";

const eng = await importNotebookModule("modules/@tomlarkworthy/corepox-engine.js");
const mis = await importNotebookModule("modules/@tomlarkworthy/corepox-missions.js");
const Ship: any = await eng.value("Ship");
const World: any = await eng.value("World");
const pilot: any = await eng.value("pilot");
const DT: number = await eng.value("DT");
const MISSIONS: any[] = await mis.value("MISSIONS");
const only = process.argv[2];

// Where the UI leaves the ship. `rebuild` keeps the parts ALREADY on the board
// fixed in world space, and the parts already on the board are the ones the
// mission handed you -- so the finished hull is positioned such that the SEED's
// centre of mass is still at the world origin, not the finished hull's. At a=0
// that is a pure translation of -(seed CoM, expressed in the finished hull's
// frame), which worldOf gives directly since it takes fractional lattice points.
const uiPose = (spec: any, seed: any) => {
  const seedComps = (seed?.components ?? []).length ? seed.components
                                                    : [(spec.components ?? [])[0]];
  const s0 = new Ship({name: "seed", components: seedComps, connections: []},
                      {team: "player", x: 0, y: 0, a: 0});
  const full = new Ship(spec, {team: "player", x: 0, y: 0, a: 0});
  const [wx, wy] = full.worldOf({px: s0.cx, py: s0.cy});
  return [-wx, -wy];
};

const play = (m: any, dx: number, dy: number) => {
  const p = new Ship(m.solution ?? m.ship, {team: "player", x: dx, y: dy, a: 0});
  const w = new World([p]);
  for (const e of m.enemies ?? []) {
    const s = new Ship(e.spec, {team: e.team ?? "enemy", x: e.x, y: e.y, a: e.a ?? 0});
    s.vx = e.vx ?? 0; s.vy = e.vy ?? 0;
    w.ships.push(s);
  }
  const memo: any = {}, cmd = {target: null, face: null, drive: null, fire: false};
  const kill = (m.objectives ?? []).find((o: any) => o.kind === "destroy");
  const want = kill?.n ?? Infinity;
  const cores0 = kill ? w.ships.filter((s: any) => s.team === (kill.team ?? "enemy"))
    .reduce((n: number, s: any) => n + s.live.filter((c: any) => c.type === kill.type).length, 0) : 0;
  for (let i = 0; i < 60 / DT; i++) {
    pilot(p, cmd, memo);
    w.step();
    if (!p.live.some((c: any) => c.type === "Brain")) return `LOSS ${w.t.toFixed(1)}s`;
    if (kill) {
      const now = w.ships.filter((s: any) => s.team === (kill.team ?? "enemy"))
        .reduce((n: number, s: any) => n + s.live.filter((c: any) => c.type === kill.type).length, 0);
      if (kill.n ? cores0 - now >= want : now === 0) return `WIN  ${w.t.toFixed(1)}s`;
    }
  }
  return "----  60s";
};

let fragile = 0, ran = 0;
for (const m of MISSIONS) {
  if (only && m.id !== only) continue;
  if (!m.solution || !(m.enemies?.length)) continue;   // nothing to lose
  ran++;
  const [dx, dy] = uiPose(m.solution, m.ship);
  const a = play(m, 0, 0), b = play(m, dx, dy);
  const same = a.slice(0, 4) === b.slice(0, 4);
  if (!same) fragile++;
  console.log(`${m.id.padEnd(22)} fresh ${a.padEnd(12)} ui(${dx.toFixed(3)},${dy.toFixed(3)}) ${b}` +
              (same ? "" : "   <-- POSE-FRAGILE"));
}
console.log(`\n${ran - fragile}/${ran} missions give the same verdict however the ship was built`);
process.exit(fragile ? 1 : 0);
