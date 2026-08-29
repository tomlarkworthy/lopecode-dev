// Where does a bolt actually leave the gun? Tom, 2026-08-23: "the turret lazer does
// not seem to spawn lazers out of its barrel properly".
//
// The engine fires from `ship.worldOf(c)` -- the ANCHOR cell of the component -- plus
// `muzzle` tiles along the aim. The renderer draws the barrel hinged at TURRET_PIVOT,
// which is NOT the anchor. So the two disagree, and the disagreement TURNS with the
// barrel: it is a fixed offset in the component frame, so it reads as the bolt leaving
// from a different place depending on where the gun is pointing.
//
// This measures both in the component's own frame (tiles, +Y DOWN -- the frame the
// renderer's holder transform establishes, `(px-cx)*TILE, -(py-cy)*TILE`) and prints
// the gap. It never asserts a tuning number; it asserts the two agree.
//
//   bun tools/corepox-muzzle.ts
import {importNotebookModule} from "./notebook-import.ts";
import {Runtime} from "@observablehq/runtime";
import {readFileSync} from "node:fs";
(Runtime.prototype as any).fileAttachments ??= () => () => null;
(globalThis as any).window = {lopecode: {contentSync: () =>
  ({status: 200, mime: "application/gzip", bytes: new Uint8Array()})}};

const eng = await importNotebookModule("modules/@tomlarkworthy/corepox-engine.js");
const Ship: any = await eng.value("Ship");
const World: any = await eng.value("World");
const UNITS: any = await eng.value("UNITS");

// The art, read rather than remembered. TURRET_PIVOT is a pure cell in corepox-render;
// ART_TILE is a pure cell in corepox-components. Both are art units per the drawing.
const rnd = await importNotebookModule("modules/@tomlarkworthy/corepox-render.js");
const TURRET_PIVOT: number[] = await rnd.value("TURRET_PIVOT");
const cmp = await importNotebookModule("modules/@tomlarkworthy/corepox-components.js");
const ART_TILE: number = await cmp.value("ART_TILE");

// The barrel's outermost quad in art_LaserTurret2, hinged on the gear at x=112.
// Grepped, not typed in, so a redrawn barrel shows up here instead of drifting.
const art = readFileSync("modules/@tomlarkworthy/corepox-components.js", "utf8");
const seg = art.slice(art.indexOf('<g id="turret2-barrel">'));
const tipM = /M167 168H(\d+(?:\.\d+)?)V180H167Z/.exec(seg);
if (!tipM) throw new Error("corepox-muzzle: the barrel's muzzle quad is not where it was");
const HINGE_X = 112;                       // the gear circle, cx in the same drawing
const BARREL = (+tipM[1] - HINGE_X) / ART_TILE;
console.log(`art: hinge ${TURRET_PIVOT} units off the anchor, barrel ${(+tipM[1] - HINGE_X)} units`);
console.log(`     = hinge (${(TURRET_PIVOT[0] / ART_TILE).toFixed(4)}, ${(TURRET_PIVOT[1] / ART_TILE).toFixed(4)}) tiles, barrel ${BARREL.toFixed(4)} tiles`);
console.log(`engine: TURRET_HINGE ${UNITS.TURRET_HINGE ?? "(none -- fires from the anchor)"}, `+
            `TURRET_MUZZLE ${UNITS.TURRET_MUZZLE.toFixed(4)} tiles\n`);

// Where the drawing puts the muzzle, in component-frame tiles (+Y down).
const drawn = (t: number) => {
  const r = t * Math.PI / 180;
  return [TURRET_PIVOT[0] / ART_TILE + BARREL * Math.sin(r),
          TURRET_PIVOT[1] / ART_TILE - BARREL * Math.cos(r)];
};

// Where the engine puts it: fire once and read the spawn back off `emit`, not off the
// particle list -- `step` has already integrated a beam by v*DT (0.625 tiles) by the
// time it is in there, and a beam born inside another part is gone the same tick.
// Offsets are taken against `worldOf(c)`, because a ship's tiles are laid out around
// its CENTRE OF MASS, not around the anchor of any one part.
const fired = (t: number, {dir = "up", a = 0} = {}) => {
  const w = new World();
  const s = new Ship({name: "t", components: [
    {type: "Brain", pos: [9, 0], dir: "up"},
    {type: "LaserTurret2", pos: [0, 0], dir}]}, {x: 0, y: 0, a});
  w.ships = [s]; w.particles = [];
  const c = s.comps.find((k: any) => k.type === "LaserTurret2");
  c.turret = t; c.t = 99; c.in.fire = 1; c.in.angle = null;   // angle null: do not re-aim
  let at: number[] | null = null;
  const real = w.emit.bind(w);
  w.emit = (ship: any, comp: any, kind: string, x: number, y: number, ...rest: any[]) => {
    if (kind === "beam") at = [x, y];
    return real(ship, comp, kind, x, y, ...rest);
  };
  w.step ? w.step() : (w as any).tick();
  if (!at) throw new Error("corepox-muzzle: the turret did not fire");
  // Back into the component's own frame, so one expectation covers every pose.
  const [ax, ay] = s.worldOf(c);
  const r = -(a + c.dir) * Math.PI / 180, k = Math.cos(r), q = Math.sin(r);
  const [ux, uy] = [at[0] - ax, at[1] - ay];
  return [ux * k - uy * q, ux * q + uy * k];
};

let worst = 0;
console.log(" turret  part  ship   drawn muzzle        engine spawn        gap");
// A hinge is fixed in the COMPONENT frame, so a turret bolted on sideways and a ship
// flying backwards have to land on the same answer -- that is where a sign error hides.
for (const [dir, a] of [["up", 0], ["right", 0], ["down", 0], ["up", 37], ["left", -140]] as any)
  for (const t of [0, 30, 45, 60, 90, -45, -90]) {
    const [dx, dy] = drawn(t), [ex, ey] = fired(t, {dir, a});
    const gap = Math.hypot(ex - dx, ey - dy);
    worst = Math.max(worst, gap);
    console.log(`  ${String(t).padStart(4)}  ${String(dir).padStart(5)} ${String(a).padStart(5)}   ` +
      `(${dx.toFixed(3).padStart(7)},${dy.toFixed(3).padStart(7)})   ` +
      `(${ex.toFixed(3).padStart(7)},${ey.toFixed(3).padStart(7)})   ${gap.toFixed(3)}`);
  }
// A quarter tile is a fifth of the barrel's own length -- below that the bolt reads as
// leaving the muzzle, above it there is a visible gap or a visible sideways jump.
const LIMIT = 0.25;
console.log(worst <= LIMIT
  ? `\nPASS   worst gap ${worst.toFixed(3)} tiles (limit ${LIMIT})`
  : `\nFAIL   worst gap ${worst.toFixed(3)} tiles (limit ${LIMIT})`);
process.exit(worst <= LIMIT ? 0 : 1);
