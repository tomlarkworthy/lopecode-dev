// Headless liquid-timer run through the real cells.
// bun tools/scratch/timer/sim.ts [--n 1500] [--t 60] [--every 5] [--set k=v,...] [--raster] [--gx 0 --gy -1]
import { importNotebookModule } from "../../notebook-import.ts";

const arg = (k: string, d: string) => { const i = process.argv.indexOf(k); return i < 0 ? d : process.argv[i + 1]; };
const n = +arg("--n", "1500"), T = +arg("--t", "60"), every = +arg("--every", "5");
const raster = process.argv.includes("--raster");
const m = await importNotebookModule("modules/@tomlarkworthy/liquid-timer.js", {});
const createLiquid = await m.value("createLiquid");
const geometry = await m.value("geometry");
const params = { ...(await m.value("defaults")) };
for (const kv of arg("--set", "").split(",").filter(Boolean)) { const [k, v] = kv.split("="); params[k] = +v; }
const gdir = [+arg("--gx", "0"), +arg("--gy", "-1")];
const liquid = createLiquid(n);
const { plates } = geometry;

// connected components among particles closer than h: drops in flight
const clusters = () => {
  const parent = Int32Array.from({ length: liquid.n }, (_, i) => i);
  const find = (i: number) => { while (parent[i] !== i) i = parent[i] = parent[parent[i]]; return i; };
  const h2 = liquid.h * liquid.h;
  for (let i = 0; i < liquid.n; i++) for (let j = i + 1; j < liquid.n; j++) {
    const dx = liquid.x[i] - liquid.x[j], dy = liquid.y[i] - liquid.y[j];
    if (dx * dx + dy * dy < h2) { const a = find(i), b = find(j); if (a !== b) parent[a] = b; }
  }
  const size = new Map<number, number>();
  for (let i = 0; i < liquid.n; i++) { const r = find(i); size.set(r, (size.get(r) || 0) + 1); }
  return [...size.values()].sort((a, b) => b - a);
};
const draw = () => {
  const cols = 34, rows = 54;
  const grid = Array.from({ length: rows }, () => new Array(cols).fill(0));
  for (let i = 0; i < liquid.n; i++) {
    const c = Math.min(cols - 1, (liquid.x[i] / geometry.width * cols) | 0);
    const r = Math.min(rows - 1, ((1 - liquid.y[i] / geometry.height) * rows) | 0);
    grid[r][c]++;
  }
  const lines = grid.map((row, r) => {
    const y = (1 - (r + 0.5) / rows) * geometry.height;
    const plate = plates.some((p: any) => Math.abs(y - p.y) < p.thickness / 2);
    return "|" + row.map((v, c) => {
      const x = (c + 0.5) / cols * geometry.width;
      if (plate) return plates.some((p: any) => p.holes.some((hx: number) => Math.abs(x - hx) < p.holeWidth / 2)) ? " " : "=";
      return v === 0 ? " " : v < 2 ? "." : v < 4 ? "o" : "#";
    }).join("") + "|";
  });
  console.log(lines.join("\n"));
};
const level = () => {
  // spread of the top pool's surface: the highest particle in each of 10 columns
  const tops = new Array(10).fill(-1);
  for (let i = 0; i < liquid.n; i++) if (liquid.y[i] > plates[2].y) { const c = Math.min(9, (liquid.x[i] * 10) | 0); tops[c] = Math.max(tops[c], liquid.y[i]); }
  const t = tops.filter((v) => v >= 0);
  return t.length ? Math.max(...t) - Math.min(...t) : 0;
};
const report = (t: number) => {
  const top = 1 - liquid.below(plates[2].y), mid = liquid.below(plates[2].y) - liquid.below(plates[0].y), bot = liquid.below(plates[0].y);
  const cl = clusters();
  const w = liquid.wheels.map((w: any) => `θ=${w.theta.toFixed(1)} ω=${w.omega.toFixed(2)}`).join("  ");
  console.log(`t=${t.toFixed(0).padStart(4)}s  top ${(100 * top).toFixed(0).padStart(3)}%  mid ${(100 * mid).toFixed(0).padStart(3)}%  bot ${(100 * bot).toFixed(0).padStart(3)}%  clusters ${cl.length} sizes ${cl.slice(0, 5).join(",")}  level ${level().toFixed(3)}  ${w}`);
};
const steps = Math.round(T / params.dt), per = Math.round(every / params.dt);
const t0 = performance.now();
for (let k = 1; k <= steps; k++) {
  liquid.step(params.dt, gdir[0] * params.gravity, gdir[1] * params.gravity, params);
  if (k % per === 0) report(k * params.dt);
}
console.log(`${((performance.now() - t0) / steps).toFixed(3)} ms/step  n=${liquid.n} s=${liquid.s.toFixed(4)} h=${liquid.h.toFixed(4)}`);
if (raster) draw();
