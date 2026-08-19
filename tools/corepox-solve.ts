// Search a mission's own inventory and build envelope for a build that wins.
// A hand-picked "reference solution" only proves I can imagine one; this proves
// the level is solvable with what the level actually hands the player.
import {importNotebookModule} from "./notebook-import.ts";
const eng = await importNotebookModule("modules/@tomlarkworthy/corepox-engine.js");
const {Ship, World, DT, geom}: any = await eng.values(["Ship","World","DT","geom"]);
const mis = await importNotebookModule("modules/@tomlarkworthy/corepox-missions.js");
const MISSIONS: any[] = await mis.value("MISSIONS");

const id = process.argv[2];
const m = MISSIONS.find((x: any) => x.id === id)!;
const base = m.ship?.components ?? [];
const baseConns = m.ship?.connections ?? [];
const env: number[][] = m.envelope ?? [];
const inv: any[] = m.inventory ?? [];
const engines = inv.filter(i => i.type === "Engine").reduce((n, i) => n + i.n, 0);
const consts = inv.filter(i => i.type === "Constant").reduce((n, i) => n + i.n, 0);
const armour = inv.filter(i => i.type === "Armour").reduce((n, i) => n + i.n, 0);
console.log(`${id}: ${base.length} placed, envelope ${env.length}, ` +
  `inventory ${engines} engine / ${consts} constant / ${armour} armour`);

const gun = base.find((c: any) => c.type === "Lazer");
const results: any[] = [];
for (const ePos of env) for (const cPos of env) {
  if (ePos === cPos) continue;
  for (const throttle of [30, 50, 70, 100]) {
    const comps = [...base.map((c: any) => ({...c})),
      {type: "Engine", pos: ePos}, {type: "Constant", pos: cPos, param: String(throttle)}];
    // spend any remaining armour filling the envelope, nearest the core first
    let left = armour;
    for (const p of [...env].sort((a,b)=>Math.hypot(a[0],a[1])-Math.hypot(b[0],b[1]))) {
      if (left <= 0) break;
      if (comps.some((c: any) => c.pos[0]===p[0] && c.pos[1]===p[1])) continue;
      comps.push({type: "Armour", pos: p}); left--;
    }
    const conns = [...baseConns, {from: cPos, fromPort: "out", to: ePos, toPort: "in"}];
    if (gun) conns.push({from: cPos, fromPort: "out", to: gun.pos, toPort: "in"});
    const w = new World();
    let p: any;
    try { p = new Ship({name: "p", components: comps, connections: conns},
                       {team: "player", x: 0, y: 0, a: 0}); } catch { continue; }
    if (p.overlaps()) continue;                 // components may not share a cell
    w.ships.push(p);
    for (const e of m.enemies ?? []) {
      const ex = Number(process.env.EX ?? e.x), ey = Number(process.env.EY ?? e.y);
      w.ships.push(new Ship(e.spec, {team: e.team ?? "enemy",
        x: (m.enemies.length > 1 ? e.x : ex), y: (m.enemies.length > 1 ? e.y : ey), a: e.a ?? 0}));
    }
    let out = "timeout", t = 0;
    for (; t < 60; t += DT) {
      w.step();
      const enemyBrains = w.ships.filter((s: any) => s.team === "enemy")
        .reduce((n: number, s: any) => n + s.live.filter((c: any) => c.type === "Brain").length, 0);
      if (!p.live.some((c: any) => c.type === "Brain")) { out = "died"; break; }
      if (enemyBrains === 0) { out = "WIN"; break; }
    }
    results.push({ePos, cPos, throttle, out, t});
  }
}
const wins = results.filter(r => r.out === "WIN").sort((a, b) => a.t - b.t);
console.log(`${wins.length}/${results.length} builds win`);
for (const r of wins.slice(0, 8))
  console.log(`  engine ${JSON.stringify(r.ePos)} constant ${JSON.stringify(r.cPos)}` +
              ` @${r.throttle}  win in ${r.t.toFixed(1)}s`);
if (!wins.length) {
  const tally: any = {}; for (const r of results) tally[r.out] = (tally[r.out]??0)+1;
  console.log("  outcomes:", tally);
}
