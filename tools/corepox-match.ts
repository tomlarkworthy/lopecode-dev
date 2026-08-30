// One match, shared by the analysis tools. Same shape as corepox-tourney.ts's
// inline match: randomised separation and bearing from the seed, capped at 60s.
import {importNotebookModule} from "./notebook-import.ts";
const m = await importNotebookModule("modules/@tomlarkworthy/corepox-engine.js");
export const Ship: any = await m.value("Ship");
export const World: any = await m.value("World");
export const loadShipSpec: any = await m.value("loadShipSpec");

export const TICKS = 60 * 50;   // 60s at DT=0.02

export function match(A: any, B: any, seed: number) {
  const r = (n: number) => ((Math.sin(seed * 12.9898 + n * 78.233) * 43758.5453) % 1 + 1) % 1;
  const d = 10 + r(1) * 8, th = r(2) * 360;
  const a = new Ship(A, {team: "a", x: -Math.sin(th * Math.PI / 180) * d, y:  Math.cos(th * Math.PI / 180) * d, a: r(3) * 360});
  const b = new Ship(B, {team: "b", x:  Math.sin(th * Math.PI / 180) * d, y: -Math.cos(th * Math.PI / 180) * d, a: r(4) * 360});
  if (!a.alive || !b.alive) return null;
  const w = new World([a, b]);
  for (let i = 0; i < TICKS; i++) { w.step(); if (!a.alive || !b.alive) break; }
  if (a.alive && !b.alive) return {res: 1, t: w.t};
  if (b.alive && !a.alive) return {res: 0, t: w.t};
  return {res: 0.5, t: w.t};
}
