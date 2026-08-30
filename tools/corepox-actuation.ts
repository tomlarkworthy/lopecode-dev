// Can the corpus be auto-piloted? Builds each ship's actuation matrix from the
// engine's own force law (Ship.force: dv = f/m, dw = (r x f)/I) and asks what
// wrenches the build can actually produce. Support functions only -- the reachable
// wrench set of throttles in [0,1]^n is a zonotope, so max extent in direction d
// is sum_i max(0, w_i . d), exact and O(n).
import {importNotebookModule} from "./notebook-import.ts";
const m = await importNotebookModule("modules/@tomlarkworthy/corepox-engine.js");
const Ship: any = await m.value("Ship");
const load: any = await m.value("loadShipSpec");
const fs = await import("node:fs");

const ships: any[] = [];
for (const line of fs.readFileSync("vendor/corepox/firebase/data/ships.json", "utf8").split("\n")) {
  const i = line.indexOf(","); if (i < 0) continue;
  try { const s = JSON.parse(line.slice(i + 1)); if (s?.components) ships.push(s); } catch {}
}

const D = Math.PI / 180;
type Row = {n: number; fwd: number; aft: number; latL: number; latR: number; yawP: number; yawN: number};
const rows: Row[] = [];
let noEngine = 0, dead = 0;

for (const raw of ships) {
  let s: any;
  try { s = new Ship(load(raw).spec, {team: "a"}); } catch { dead++; continue; }
  if (!s.alive) { dead++; continue; }
  const eng = s.live.filter((c: any) => c.type === "Engine");
  if (!eng.length) { noEngine++; continue; }
  const r: Row = {n: eng.length, fwd: 0, aft: 0, latL: 0, latR: 0, yawP: 0, yawN: 0};
  for (const c of eng) {
    // ship frame: local position (worldOf without the rotation), thrust along c.dir
    const lx = c.px - s.cx, ly = -(c.py - s.cy);
    const ux = -Math.sin(c.dir * D), uy = Math.cos(c.dir * D);   // geom.unit(a) at a=dir
    const fx = ux / s.mass, fy = uy / s.mass;
    const t = (lx * fy - ly * fx) / s.I;
    r.fwd += Math.max(0, fy); r.aft += Math.max(0, -fy);
    r.latR += Math.max(0, fx); r.latL += Math.max(0, -fx);
    r.yawP += Math.max(0, t);  r.yawN += Math.max(0, -t);
  }
  rows.push(r);
}

const pct = (k: number) => (100 * k / rows.length).toFixed(1) + "%";
const med = (xs: number[]) => xs.slice().sort((a, b) => a - b)[Math.floor(xs.length / 2)];
const ratio = (r: Row) => Math.min(r.latL, r.latR) / Math.max(1e-9, r.fwd);

console.log(`${ships.length} corpus ships; ${dead} unloadable/dead, ${noEngine} with no live Engine`);
console.log(`${rows.length} steerable candidates, median ${med(rows.map(r => r.n))} engines (max ${Math.max(...rows.map(r => r.n))})`);
console.log(`  can torque BOTH ways        ${pct(rows.filter(r => r.yawP > 0 && r.yawN > 0).length)}`);
console.log(`  can torque only one way     ${pct(rows.filter(r => (r.yawP > 0) !== (r.yawN > 0)).length)}`);
console.log(`  no yaw authority at all     ${pct(rows.filter(r => !r.yawP && !r.yawN).length)}`);
console.log(`  can thrust aft (reverse)    ${pct(rows.filter(r => r.aft > 0).length)}`);
console.log(`  strafe both ways            ${pct(rows.filter(r => r.latL > 0 && r.latR > 0).length)}`);
console.log(`  strafe >= 20% of forward    ${pct(rows.filter(r => ratio(r) >= 0.2).length)}`);
console.log(`  median strafe/forward       ${med(rows.map(ratio)).toFixed(3)}`);
