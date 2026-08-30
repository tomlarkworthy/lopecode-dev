import {importNotebookModule} from "../notebook-import.ts";
const eng = await importNotebookModule("modules/@tomlarkworthy/corepox-engine.js");
const E: any = {};
for (const n of ["Ship","World","geom","DT","pilot","loadShipSpec","TYPES","rotTile"]) E[n] = await eng.value(n);
const mis = await importNotebookModule("modules/@tomlarkworthy/corepox-missions.js", {overrides: {md:(s:any)=>String(s)}});
const SHIPS: any = await mis.value("SHIPS");
const {rotTile: _rt, ...Eduel} = E;
const duel = await importNotebookModule("modules/@tomlarkworthy/corepox-duel.js", {overrides: {...Eduel, SHIPS, md:(s:any)=>String(s), htl:{html:()=>{}}, battlefield:null, backdrop:null, invalidation:new Promise(()=>{})}});
const DUEL_BACKDROP: any = await duel.value("DUEL_BACKDROP");
const humanControl: any = await duel.value("humanControl");
const min = await importNotebookModule("modules/@tomlarkworthy/corepox-mining.js", {overrides: {...E, SHIPS, DUEL_BACKDROP, humanControl, md:(s:any)=>String(s), htl:{html:()=>{}}, battlefield:null, backdrop:null, invalidation:new Promise(()=>{})}});
const M: any = {};
for (const n of ["rockSpec","minRng","newMining","MINING_ORE","loosePiece"]) M[n] = await min.value(n);

const r = M.minRng(11);
const spec = M.rockSpec(r, {rockVolume: 50, oreVolume: 3, rockHp: 12, ore: M.MINING_ORE});
const byType: any = {};
for (const c of spec.components) byType[c.type] = (byType[c.type] ?? 0) + 1;
const ship = new E.Ship(E.loadShipSpec(spec).spec, {team: "rock", x: 0, y: 0, a: 0});
const tiles = ship.live.flatMap((c: any) => c.tiles);
const xs = tiles.map((t: any) => t[0]), ys = tiles.map((t: any) => t[1]);
console.log("pieces", spec.components.length, byType);
console.log("tiles", tiles.length, "bbox", Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys));
console.log("islands", ship.islands().length, "total hp", ship.live.reduce((a:number,c:any)=>a+c.hp,0));
// how buried is each ore?  depth = BFS distance from outside the blob
const occ = new Set(tiles.map((t: any) => t.join(",")));
const bfs = new Map<string, number>();
const q: [number, number][] = [];
for (let x = Math.min(...xs)-1; x <= Math.max(...xs)+1; x++)
  for (const y of [Math.min(...ys)-1, Math.max(...ys)+1]) { bfs.set(x+","+y, 0); q.push([x,y]); }
for (let y = Math.min(...ys)-1; y <= Math.max(...ys)+1; y++)
  for (const x of [Math.min(...xs)-1, Math.max(...xs)+1]) if(!bfs.has(x+","+y)) { bfs.set(x+","+y,0); q.push([x,y]); }
while (q.length) { const [x,y] = q.shift()!; const d = bfs.get(x+","+y)!;
  for (const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) { const k=(x+dx)+","+(y+dy);
    if (bfs.has(k) || Math.abs(x+dx) > 40 || Math.abs(y+dy) > 40) continue;
    bfs.set(k, d + (occ.has(k) ? 1 : 0)); q.push([x+dx,y+dy]); } }
for (const c of ship.live) if (E.TYPES[c.type].ore != null)
  console.log("  ore", c.type, "at", c.px + "," + c.py, "depth", Math.min(...c.tiles.map((t:any)=>bfs.get(t.join(",")) ?? -1)));

console.log("\nfield sizes");
for (const d of [0.15, 0.25, 0.4]) {
  const F = M.newMining({ship: SHIPS.spike, seed: 5, density: d});
  const comps = F.world.ships.filter((s:any)=>s!==F.player).reduce((a:number,s:any)=>a+s.live.length,0);
  console.log(`  density ${d}: ${F.rocks} rocks, ${comps} pieces, ${F.world.ships.filter((s:any)=>s!==F.player).reduce((a:number,s:any)=>a+s.live.flatMap((c:any)=>c.tiles).length,0)} tiles`);
}

console.log("\n90s runs, MINER on auto");
const runMining: any = await min.value("runMining");
const MINER: any = await min.value("MINER");
for (const rhp of [8]) for (const seed of [3, 5, 11, 17, 23]) {
  const t0 = performance.now();
  const R = runMining({ship: MINER, seed, control: "auto", rockHp: rhp});
  const totalHp = (M: any) => M.world.ships.filter((s: any) => s !== M.player)
    .reduce((a: number, s: any) => a + s.live.filter((c:any)=>E.TYPES[c.type].ore==null).reduce((b: number, c: any) => b + c.hp, 0), 0);
  console.log(`  rockHp ${rhp} seed ${seed}: ${R.outcome} scrap ${R.scrap} ore ${JSON.stringify(R.collected)}` +
    ` bodies ${R.rocks}->${R.rocksLeft} rockHp ${totalHp(R.mining)} hull ${R.parts} (${((performance.now()-t0)/1000).toFixed(1)}s wall)`);
}
