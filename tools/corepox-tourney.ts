// Round-robin self-play to find what dominates. Imports the real engine cells;
// nothing is reimplemented here.
//
// Two rosters. The default is now CANON -- fourteen real corpus designs picked on
// measured behaviour by tools/corepox-canon.ts, every one of them a legal ship.
// ROSTER=archetypes gets the seven hand-built ones back, and they are BROKEN: five
// of the seven are several bodies under the real footprints and the joint rule
// (sniper is 6 islands), so that arm is measuring debris. It is kept only so the
// two can be compared while the archetypes are rebuilt.
import {importNotebookModule} from "./notebook-import.ts";

const m = await importNotebookModule("modules/@tomlarkworthy/corepox-engine.js");
const Ship: any = await m.value("Ship");
const World: any = await m.value("World");

import {ROSTER as ARCHETYPES} from "./corepox-tourney-specs.ts";
import {CANON} from "./corepox-canon.ts";
const USE_ARCH = process.env.ROSTER === "archetypes";
const ROSTER: any[] = USE_ARCH ? ARCHETYPES : CANON.map(c => c.spec);
if (!ROSTER.length) throw new Error("corepox-tourney: no roster -- run `bun tools/corepox-canon.ts` first");
{
  // Overlapping cells is illegal. Several islands is NOT -- a carrier arrives in
  // pieces on purpose, and calling that broken is how the archetypes got away with
  // being broken for so long. Report them apart.
  const over = ROSTER.filter(r => new Ship(r, {team: "a"}).overlaps());
  const multi = ROSTER.filter(r => new Ship(r, {team: "a"}).islands().length > 1);
  console.log(`roster: ${USE_ARCH ? "archetypes (hand-built)" : "canon (corpus, measured)"}, ` +
    `${ROSTER.length} ships, ${multi.length} of them multi-body at t=0` +
    (over.length ? `\n  ILLEGAL, cells shared between components: ${over.map(r => r.name).join(" ")}` : ""));
  if (over.length && !process.env.FORCE) { console.log("  refusing -- FORCE=1 to measure anyway"); process.exit(1); }
}

// ---- match ----------------------------------------------------------------
const TICKS = 60 * 50;   // 60s at DT=0.02
function match(A: any, B: any, seed: number) {
  const r = (n: number) => ((Math.sin(seed * 12.9898 + n * 78.233) * 43758.5453) % 1 + 1) % 1;
  const d = 10 + r(1) * 8, th = r(2) * 360;
  const a = new Ship(A, {team:"a", x: -Math.sin(th*Math.PI/180)*d, y:  Math.cos(th*Math.PI/180)*d, a: r(3)*360});
  const b = new Ship(B, {team:"b", x:  Math.sin(th*Math.PI/180)*d, y: -Math.cos(th*Math.PI/180)*d, a: r(4)*360});
  const w = new World([a, b]);
  for (let i = 0; i < TICKS; i++) { w.step(); if (!a.alive || !b.alive) break; }
  const dmgA = 1 - a.live.length / A.components.length;     // fraction destroyed
  const dmgB = 1 - b.live.length / B.components.length;
  if (a.alive && !b.alive) return {res: 1, dmgA, dmgB, t: w.t};
  if (b.alive && !a.alive) return {res: 0, dmgA, dmgB, t: w.t};
  return {res: 0.5, dmgA, dmgB, t: w.t};
}

const SEEDS = Number(process.env.SEEDS ?? (ROSTER.length > 8 ? 4 : 12));
const score: Record<string, number> = {}, played: Record<string, number> = {};
const dealt: Record<string, number> = {}, taken: Record<string, number> = {};
const draws: Record<string, number> = {};
for (const s of ROSTER) { score[s.name]=0; played[s.name]=0; dealt[s.name]=0; taken[s.name]=0; draws[s.name]=0; }
const grid: string[] = [];
for (let i = 0; i < ROSTER.length; i++) for (let j = i+1; j < ROSTER.length; j++) {
  const A = ROSTER[i], B = ROSTER[j];
  let sa = 0, dr = 0;
  for (let k = 0; k < SEEDS; k++) {
    for (const [X, Y, flip] of [[A,B,false],[B,A,true]] as any[]) {
      const r = match(X, Y, k*7+i*31+j);
      const forA = flip ? 1 - r.res : r.res;
      sa += forA;
      if (r.res === 0.5) { dr++; draws[A.name]++; draws[B.name]++; }
      dealt[flip?B.name:A.name] += flip? r.dmgA : r.dmgB;
      dealt[flip?A.name:B.name] += flip? r.dmgB : r.dmgA;
      taken[flip?B.name:A.name] += flip? r.dmgB : r.dmgA;
      taken[flip?A.name:B.name] += flip? r.dmgA : r.dmgB;
    }
  }
  const n = SEEDS*2;
  score[A.name]+=sa; played[A.name]+=n; score[B.name]+=n-sa; played[B.name]+=n;
  grid.push(`${A.name.padEnd(13)} vs ${B.name.padEnd(13)} ${(100*sa/n).toFixed(0).padStart(3)}%  draws ${dr}/${n}`);
}
console.log(grid.join("\n"));
console.log("\n name           win%   draw%   dmg dealt/match  taken/match");
const rank = ROSTER.map(s=>s.name).sort((x,y)=>score[y]/played[y]-score[x]/played[x]);
for (const n of rank)
  console.log(` ${n.padEnd(13)} ${(100*score[n]/played[n]).toFixed(0).padStart(4)}   ${(100*draws[n]/played[n]).toFixed(0).padStart(4)}   ${(dealt[n]/played[n]).toFixed(2).padStart(12)} ${(taken[n]/played[n]).toFixed(2).padStart(12)}`);
