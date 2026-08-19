// Do the seven hand-built archetypes hold up against real 2018 player ships?
// The roster was designed to span control strategies (no sensing, bang-bang,
// proportional, ram, turtle, snipe). Nothing had ever fought it against the dump.
import {importNotebookModule} from "./notebook-import.ts";
const m = await importNotebookModule("modules/@tomlarkworthy/corepox-engine.js");
const {Ship, World, TYPES}: any = await m.values(["Ship", "World", "TYPES"]);
const load: any = await m.value("loadShipSpec");
const {ROSTER}: any = await import("./corepox-tourney-specs.ts");
const fs = await import("node:fs");

// Legal, self-consistent opponents only: no dropped wires, no overlapping cells,
// one body, and inside its own power budget. An over-budget ship fights with parts
// dark, which measures the budget rather than the design.
const foes: any[] = [];
for (const line of fs.readFileSync("vendor/corepox/firebase/data/ships.json", "utf8").split("\n")) {
  const i = line.indexOf(","); if (i < 0) continue;
  let raw: any; try { raw = JSON.parse(line.slice(i + 1)); } catch { continue }
  if (!raw?.components) continue;
  let spec: any, dropped: any;
  try { ({spec, dropped} = load(raw)); } catch { continue }
  if (dropped.length) continue;
  let s: any; try { s = new Ship(spec, {team: "b"}); } catch { continue }
  if (s.overlaps() || s.islands().length !== 1 || s.comps.length < 6) continue;
  const draw = s.live.reduce((n: number, c: any) => n + (TYPES[c.type].pwr ?? 1), 0);
  const supply = s.live.filter((c: any) => c.type === "Brain").length * Ship.SUPPLY;
  if (!supply || draw > supply) continue;
  foes.push({id: line.slice(0, i), spec});
}
// Four start bearings, so a ship that only works head-on cannot fake a score.
const STARTS = [[0, 26, 180], [18, 18, 225], [26, 0, 270], [-18, 18, 135]];
const duel = (A: any, B: any) => {
  let w = 0, l = 0, d = 0;
  for (const [x, y, a] of STARTS) {
    const p = new Ship(A, {team: "player", x: 0, y: 0, a: 0});
    const e = new Ship(B, {team: "enemy", x, y, a});
    const wd = new World([p, e]);
    let out = "draw";
    for (let i = 0; i < 3000; i++) {
      wd.step();
      if (!p.live.some((c: any) => c.type === "Brain")) { out = "loss"; break }
      if (!e.live.some((c: any) => c.type === "Brain")) { out = "win"; break }
    }
    out === "win" ? w++ : out === "loss" ? l++ : d++;
  }
  return [w, l, d];
};

// ONE named ship, for reproducing a specific result: ID=2259C5... bun tools/...
if (process.env.ID) {
  const f = foes.find(x => x.id === process.env.ID);
  if (!f) { console.log(`${process.env.ID} is not a legal in-budget corpus ship`); process.exit(1); }
  console.log(`vs ${f.id}\n`);
  for (const arch of ROSTER) {
    const [w, l, d] = duel(arch, f.spec);
    console.log(`${arch.name.padEnd(14)} W${w} L${l} D${d}`);
  }
  process.exit(0);
}
const N = Number(process.env.N ?? 50);
const step = Math.max(1, Math.floor(foes.length / N));
const sample = foes.filter((_, i) => i % step === 0).slice(0, N);   // deterministic
console.log(`legal in-budget corpus ships: ${foes.length}; sampled ${sample.length}\n`);


console.log("archetype        win   loss   draw   of " + sample.length * 4 + " duels");
const rows: any[] = [];
for (const arch of ROSTER) {
  let W = 0, L = 0, D = 0;
  for (const f of sample) { const [w, l, d] = duel(arch, f.spec); W += w; L += l; D += d; }
  const n = W + L + D;
  rows.push({name: arch.name, W, L, D});
  console.log(`${arch.name.padEnd(14)} ${String(W).padStart(4)} ${String(L).padStart(6)} ` +
    `${String(D).padStart(6)}   ${(100 * W / n).toFixed(0)}% win`);
}
const tot = rows.reduce((a, r) => ({W: a.W + r.W, L: a.L + r.L, D: a.D + r.D}), {W: 0, L: 0, D: 0});
console.log(`\nroster overall ${(100 * tot.W / (tot.W + tot.L + tot.D)).toFixed(1)}% win, ` +
  `${(100 * tot.L / (tot.W + tot.L + tot.D)).toFixed(1)}% loss, ` +
  `${(100 * tot.D / (tot.W + tot.L + tot.D)).toFixed(1)}% draw`);
