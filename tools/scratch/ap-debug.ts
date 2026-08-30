import {importNotebookModule} from "../notebook-import.ts";
const ap = await import("../corepox-autopilot.ts");
const m = await importNotebookModule("modules/@tomlarkworthy/corepox-engine.js");
const Ship: any = await m.value("Ship");
const World: any = await m.value("World");
const load: any = await m.value("loadShipSpec");
const DT: number = await m.value("DT");
const fs = await import("node:fs");
const raws: any[] = [];
for (const line of fs.readFileSync("vendor/corepox/firebase/data/ships.json", "utf8").split("\n")) {
  const i = line.indexOf(","); if (i < 0) continue;
  try { const s = JSON.parse(line.slice(i + 1)); if (s?.components) raws.push(s); } catch {}
}
let n = 0;
for (const raw of raws) {
  let s: any; try { s = new Ship(load(raw).spec, {team: "a", x: 0, y: 0, a: 0}); } catch { continue; }
  if (!s.alive) continue;
  // test-only: cut wires into engines so the pilot really owns them
  s.conns = s.conns.filter((k: any) => { const d = s.at(k.to[0], k.to[1]); return !d || d.type !== "Engine"; });
  const A = ap.allEngines(s);
  if (A.length < 2) continue;
  const R = ap.regime(A);
  const target: [number, number] = [25, 0];
  const w = new World([s]);
  console.log(`ship ${raw.name ?? n} comps=${s.live.length} mass=${s.mass.toFixed(2)} I=${s.I.toFixed(2)} engines=${A.length} rocket=${R.rocket} vmax=${R.vmax.toFixed(2)}`);
  for (let k = 0; k < 20 / DT; k++) {
    const r = ap.pilot(s, {target}, ap.allEngines(s));
    w.step();
    if (k % 100 === 0) console.log(`  t=${w.t.toFixed(1)} a=${s.a.toFixed(0)} w=${s.w.toFixed(1)} pos=${s.x.toFixed(1)},${s.y.toFixed(1)} v=${Math.hypot(s.vx,s.vy).toFixed(2)} err=${r.err.toFixed(0)} thr=[${A.map(a=>a.c.in.in.toFixed(0)).join(",")}] powered=[${A.map(a=>a.c.powered?1:0).join(",")}]`);
  }
  if (++n >= 3) break;
}
