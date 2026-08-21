// How pinnable is an artifact sample? Counts connected size-k subgraphs per island,
// using the engine's own reach-2 adjacency (Ship.islands), never a reimplementation.
import {importNotebookModule} from "./notebook-import.ts";
const m = await importNotebookModule("modules/@tomlarkworthy/corepox-engine.js");
const Ship: any = await m.value("Ship");
const load: any = await m.value("loadShipSpec");
const NEIGHBOURS: any = await m.value("NEIGHBOURS");
const fs = await import("node:fs");

const K = Number(process.argv[2] ?? 4);

const ships: any[] = [];
for (const line of fs.readFileSync("vendor/corepox/firebase/data/ships.json", "utf8").split("\n")) {
  const i = line.indexOf(","); if (i < 0) continue;
  try { const s = JSON.parse(line.slice(i + 1)); if (s?.components) ships.push(s); } catch {}
}

// component adjacency inside one island, same rule as Ship.islands
const adjacency = (grp: any[]) => {
  const at = new Map<string, number>();
  grp.forEach((c, i) => { for (const [tx, ty] of c.tiles) at.set(tx + "," + ty, i); });
  const adj = grp.map(() => new Set<number>());
  grp.forEach((c, i) => {
    for (const [tx, ty] of c.tiles) for (const [dx, dy] of NEIGHBOURS) {
      const j = at.get((tx + dx) + "," + (ty + dy));
      if (j !== undefined && j !== i) { adj[i].add(j); adj[j].add(i); }
    }
  });
  return adj;
};

// exhaustive: every k-subset, tested for connectivity. n<=40 so C(n,4) is small.
const countConnected = (adj: Set<number>[], k: number) => {
  const n = adj.length; if (n < k) return 0;
  let total = 0;
  const idx = new Array(k);
  const connected = () => {
    const inSet = new Set(idx);
    const seen = new Set([idx[0]]), q = [idx[0]];
    while (q.length) { const v = q.pop()!;
      for (const w of adj[v]) if (inSet.has(w) && !seen.has(w)) { seen.add(w); q.push(w); } }
    return seen.size === k;
  };
  const rec = (start: number, d: number) => {
    if (d === k) { if (connected()) total++; return; }
    for (let v = start; v <= n - (k - d); v++) { idx[d] = v; rec(v + 1, d + 1); }
  };
  rec(0, 0);
  return total;
};

const perShipBest: number[] = [], perIsland: number[] = [];
let multi = 0, pinnableIsland = 0, built = 0;
for (const raw of ships) {
  try {
    const {spec} = load(raw);
    const s = new Ship(spec, {team: "a"});
    const isl = s.islands();
    built++;
    if (isl.length > 1) multi++;
    let best = 0, pin = false;
    for (const g of isl) {
      const c = countConnected(adjacency(g), K);
      perIsland.push(c);
      if (c > best) best = c;
      if (g.length >= K && c > 0 && c <= 3) pin = true;
    }
    if (pin) pinnableIsland++;
    perShipBest.push(best);
  } catch {}
}

const pct = (c: number, t: number) => `${c}/${t} (${Math.round(100 * c / t)}%)`;
perShipBest.sort((a, b) => a - b);
const q = (p: number) => perShipBest[Math.max(0, Math.floor(p * perShipBest.length) - 1)];
console.log(`k = ${K}   ships built ${built}   islands ${perIsland.length}   multi-island ${pct(multi, built)}`);
console.log(`connected ${K}-subgraphs in a ship's BEST island:`);
console.log(`   min ${q(0.001)}  p25 ${q(.25)}  median ${q(.5)}  p75 ${q(.75)}  p90 ${q(.9)}  max ${perShipBest.at(-1)}`);
console.log(`\nships with at least one island that is PINNABLE (1-3 combinations): ${pct(pinnableIsland, built)}`);
console.log(`\nfraction of ships that could mint at threshold T:`);
for (const T of [1, 5, 10, 25, 50, 100, 250, 500]) {
  const c = perShipBest.filter(x => x >= T).length;
  console.log(`   T >= ${String(T).padStart(3)}   ${pct(c, built)}`);
}
