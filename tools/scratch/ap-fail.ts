import {importNotebookModule} from "../notebook-import.ts";
const ap = await import("../corepox-autopilot.ts");
const m = await importNotebookModule("modules/@tomlarkworthy/corepox-engine.js");
const Ship: any = await m.value("Ship");
const World: any = await m.value("World");
const load: any = await m.value("loadShipSpec");
const DT: number = await m.value("DT");
Ship.prototype.powerUp = function () { for (const c of this.live) c.powered = true; this.power = 0; };
const fs = await import("node:fs");
const raws: any[] = [];
for (const line of fs.readFileSync("vendor/corepox/firebase/data/ships.json", "utf8").split("\n")) {
  const i = line.indexOf(","); if (i < 0) continue;
  try { const s = JSON.parse(line.slice(i + 1)); if (s?.components) raws.push(s); } catch {}
}
const D = Math.PI / 180;
let shown = 0;
for (let i = 0; i < raws.length && shown < 4; i++) {
  let s: any; try { s = new Ship(load(raws[i]).spec, {team: "a", x: 0, y: 0, a: (i * 37) % 360}); } catch { continue; }
  if (!s.alive) continue;
  s.conns = s.conns.filter((k: any) => { const d = s.at(k.to[0], k.to[1]); return !(d && d.type === "Engine"); });
  let A = ap.allEngines(s); if (!A.length) continue;
  const R = ap.regime(A);
  if (!(R.yawP > 0 && R.yawN > 0)) continue;
  const th = (i * 53) % 360;
  const target: [number, number] = [Math.cos(th * D) * 25, Math.sin(th * D) * 25];
  const w = new World([s]); const memo: any = {};
  let near = 1e9;
  for (let k = 0; k < 40 / DT; k++) { ap.pilot(s, {target}, ap.allEngines(s), memo); w.step();
    near = Math.min(near, Math.hypot(target[0] - s.x, target[1] - s.y)); }
  if (near < 10) continue;                       // only look at the failures
  shown++;
  const s2 = new Ship(load(raws[i]).spec, {team: "a", x: 0, y: 0, a: (i * 37) % 360});
  s2.conns = s2.conns.filter((k: any) => { const d = s2.at(k.to[0], k.to[1]); return !(d && d.type === "Engine"); });
  const w2 = new World([s2]); const memo2: any = {};
  console.log(`\n${raws[i].name} eng=${A.length} rocket=${R.rocket} phi=${R.phi.toFixed(0)} vmax=${R.vmax.toFixed(2)} yaw=${R.yawP.toFixed(0)}/${R.yawN.toFixed(0)} target=${target.map(v=>v.toFixed(0))} near=${near.toFixed(1)}`);
  for (let k = 0; k < 40 / DT; k++) {
    const AA = ap.allEngines(s2); const r = ap.pilot(s2, {target}, AA, memo2); w2.step();
    if (k % 250 === 0) console.log(`  t=${w2.t.toFixed(0)} a=${s2.a.toFixed(0)} w=${s2.w.toFixed(0)} p=${s2.x.toFixed(1)},${s2.y.toFixed(1)} v=${Math.hypot(s2.vx,s2.vy).toFixed(2)} err=${r.err.toFixed(0)} thr=[${AA.map(a=>a.c.in.in.toFixed(0)).join(",")}]`);
  }
}
