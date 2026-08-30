// Does a metagame exist? A transitive tournament has one strictly best ship and the
// ladder collapses; a metagame needs cycles (A beats B beats C beats A).
// Reference points: a fully transitive tournament has 0 cyclic triads, a coin-flip
// random one has 1/4. Both orientations are played so a side advantage cannot fake a cycle.
import {match, loadShipSpec} from "./corepox-match.ts";
const fs = await import("node:fs");

const N = Number(process.argv[2] ?? 30);
const SEEDS = Number(process.argv[3] ?? 4);

const raw: any[] = [];
for (const line of fs.readFileSync("vendor/corepox/firebase/data/ships.json", "utf8").split("\n")) {
  const i = line.indexOf(","); if (i < 0) continue;
  try { const s = JSON.parse(line.slice(i + 1));
    if (s?.components?.length >= 6 && (s.connections?.length ?? 0) >= 3) raw.push(s); } catch {}
}
// deterministic spread through the corpus rather than the first N
const step = Math.max(1, Math.floor(raw.length / N));
const specs: any[] = [], names: string[] = [];
for (let i = 0; specs.length < N && i * step < raw.length; i++) {
  const r = raw[i * step];
  try { specs.push(loadShipSpec(r).spec); names.push(r.name ?? `#${i * step}`); } catch {}
}
const n = specs.length;
console.log(`corpus candidates ${raw.length}, sampled ${n}, ${SEEDS} seeds x 2 orientations per pair`);

const t0 = Date.now();
const win = Array.from({length: n}, () => new Array(n).fill(0));   // win fraction for row vs col
let played = 0, sideA = 0, sideTot = 0;
for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
  let s = 0, cnt = 0;
  for (let k = 0; k < SEEDS; k++) for (const flip of [false, true]) {
    const r = flip ? match(specs[j], specs[i], k * 7 + i * 31 + j)
                   : match(specs[i], specs[j], k * 7 + i * 31 + j);
    if (!r) continue;
    s += flip ? 1 - r.res : r.res; cnt++; played++;
    sideA += r.res; sideTot++;
  }
  if (!cnt) { win[i][j] = win[j][i] = 0.5; continue; }
  win[i][j] = s / cnt; win[j][i] = 1 - s / cnt;
}
const secs = (Date.now() - t0) / 1000;
console.log(`${played} matches in ${secs.toFixed(1)}s  (${(1000 * secs / played).toFixed(1)} ms/match)`);
console.log(`side-A win rate across all matches: ${(100 * sideA / sideTot).toFixed(1)}%  (50% = no positional bias)`);

const M = 0.1;   // decisive if the win fraction is outside 0.5 +/- M
const beats = (i: number, j: number) => win[i][j] > 0.5 + M;
let decisive = 0, pairs = 0;
for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
  pairs++; if (beats(i, j) || beats(j, i)) decisive++;
}
let triads = 0, cyclic = 0;
for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) for (let k = j + 1; k < n; k++) {
  const e = [[i, j], [j, k], [i, k]];
  if (!e.every(([a, b]) => beats(a, b) || beats(b, a))) continue;
  triads++;
  const d = (a: number, b: number) => beats(a, b) ? 1 : 0;
  const out = [d(i, j) + d(i, k), d(j, i) + d(j, k), d(k, i) + d(k, j)].sort();
  if (out[0] === 1 && out[1] === 1 && out[2] === 1) cyclic++;   // every node 1-1 => 3-cycle
}
const wr = specs.map((_, i) => win[i].reduce((a, b, j) => a + (i === j ? 0 : b), 0) / (n - 1));
const order = wr.map((v, i) => i).sort((a, b) => wr[b] - wr[a]);
const kings = order.filter(i => specs.every((_, j) => i === j || !beats(j, i)));

console.log(`\ndecisive pairs        ${decisive}/${pairs} (${Math.round(100 * decisive / pairs)}%)`);
console.log(`fully decisive triads ${triads}`);
console.log(`CYCLIC triads         ${cyclic} (${(100 * cyclic / Math.max(1, triads)).toFixed(1)}%)`);
console.log(`   transitive = 0%,  coin-flip random = 25%`);
console.log(`\nships beaten by nobody (Condorcet-ish kings): ${kings.length}  ${kings.slice(0,5).map(i=>names[i]).join(", ")}`);
console.log(`top by win rate:`);
for (const i of order.slice(0, 5)) console.log(`   ${(100 * wr[i]).toFixed(0).padStart(3)}%  ${names[i]}`);
console.log(`bottom:`);
for (const i of order.slice(-3)) console.log(`   ${(100 * wr[i]).toFixed(0).padStart(3)}%  ${names[i]}`);
