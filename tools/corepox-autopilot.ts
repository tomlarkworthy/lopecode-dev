// Flight test for the pilot. The pilot ITSELF lives in @tomlarkworthy/corepox-engine
// (cells pilotActuators / pilotAllocate / flightModel / pilot) -- this file only
// drives it, so there is no second copy to drift.
import {importNotebookModule} from "./notebook-import.ts";
const m = await importNotebookModule(process.env.ENGINE ?? "modules/@tomlarkworthy/corepox-engine.js");
const Ship: any = await m.value("Ship");
const World: any = await m.value("World");
const load: any = await m.value("loadShipSpec");
const DT: number = await m.value("DT");
export const pilot: any = await m.value("pilot");
export const pilotActuators: any = await m.value("pilotActuators");
export const flightModel: any = await m.value("flightModel");
export const actuators = (s: any) => pilotActuators(s);
export const allEngines = (s: any) => pilotActuators(s, {all: true});
export const regime = flightModel;
const D = Math.PI / 180;

// ---- flight test over the corpus -------------------------------------------
if (import.meta.main) {
  const fs = await import("node:fs");
  const raws: any[] = [];
  for (const line of fs.readFileSync("vendor/corepox/firebase/data/ships.json", "utf8").split("\n")) {
    const i = line.indexOf(","); if (i < 0) continue;
    try { const s = JSON.parse(line.slice(i + 1)); if (s?.components) raws.push(s); } catch {}
  }
  const ALL = process.argv.includes("--all");
  // --nopower used to disable the power budget here, because it was invented during
  // the rebuild and gating piloting on it was a decision rather than a given. The
  // budget was removed outright on 2026-08-20, so the flag has nothing to turn off.
  if (process.argv.includes("--nopower")) console.log("--nopower: no power budget exists any more");
  const acts = (sh: any) => ALL ? allEngines(sh) : actuators(sh);
  const N = Number(process.argv.find(a => /^\d+$/.test(a)) ?? 200), RANGE = 25, SECS = 40, HIT = 3;
  const res: {n: number; rocket: boolean; both: boolean; hit: boolean; t: number; near: number}[] = [];
  let skipped = 0;
  for (let i = 0; i < raws.length && res.length < N; i++) {
    let s: any;
    try { s = new Ship(load(raws[i]).spec, {team: "a", x: 0, y: 0, a: (i * 37) % 360}); } catch { skipped++; continue; }
    if (!s.alive) { skipped++; continue; }
    s.conns = s.conns.filter((k: any) => { const d = s.at(k.to[0], k.to[1]); return !(ALL && d && d.type === "Engine"); });
    const A = acts(s);
    if (!A.length) { skipped++; continue; }
    let yp = 0, yn = 0;
    for (const a of A) { yp += Math.max(0, a.t); yn += Math.max(0, -a.t); }
    const th = (i * 53) % 360;
    const target: [number, number] = [Math.cos(th * D) * RANGE, Math.sin(th * D) * RANGE];
    const w = new World([s]);
    let hit = false, t = 0, near = 1e9; const memo: any = {};
    for (let k = 0; k < SECS / DT; k++) {
      pilot(s, {target}, memo, acts(s));
      w.step();
      const d = Math.hypot(target[0] - s.x, target[1] - s.y);
      near = Math.min(near, d);
      if (d < HIT) { hit = true; t = w.t; break; }
    }
    res.push({n: A.length, rocket: regime(A).rocket, both: yp > 0 && yn > 0, hit, t, near: +near.toFixed(1)});
  }
  const pct = (xs: any[]) => (100 * xs.length / res.length).toFixed(1) + "%";
  const med = (xs: number[]) => xs.length ? xs.slice().sort((a, b) => a - b)[Math.floor(xs.length / 2)] : NaN;
  console.log(`${res.length} ships flown (${skipped} skipped: dead or no free engine), ${RANGE} tiles, ${SECS}s cap, arrive < ${HIT} tiles`);
  console.log(`  arrived            ${pct(res.filter(r => r.hit))}   median ${med(res.filter(r => r.hit).map(r => r.t)).toFixed(1)}s`);
  console.log(`  rockets            ${pct(res.filter(r => r.rocket))}  of which arrived ${(100 * res.filter(r => r.rocket && r.hit).length / Math.max(1, res.filter(r => r.rocket).length)).toFixed(1)}%`);
  console.log(`  yaw both ways      ${(100 * res.filter(r => r.both && r.hit).length / Math.max(1, res.filter(r => r.both).length)).toFixed(1)}% arrived`);
  console.log(`  yaw one way / none ${(100 * res.filter(r => !r.both && r.hit).length / Math.max(1, res.filter(r => !r.both).length)).toFixed(1)}% arrived  (n=${res.filter(r => !r.both).length})`);
  const two = res.filter(r => r.both);
  console.log(`  median closest approach when it missed: ${med(res.filter(r => !r.hit).map(r => r.near))} tiles`);
  console.log(`  of the ${two.length} with two-way yaw that missed: median closest ${med(two.filter(r => !r.hit).map(r => r.near))} tiles`);
}
