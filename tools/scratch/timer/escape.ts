import { importNotebookModule } from "../../notebook-import.ts";
const m = await importNotebookModule("modules/@tomlarkworthy/liquid-timer.js", {});
const createLiquid = await m.value("createLiquid"), geometry = await m.value("geometry"), p = await m.value("defaults");
const n = +(process.argv[2] || 500);
const liquid = createLiquid(n);
const prev = new Float32Array(liquid.n * 2);
for (let k = 0; k < 1200; k++) {
  for (let i = 0; i < liquid.n; i++) { prev[2 * i] = liquid.x[i]; prev[2 * i + 1] = liquid.y[i]; }
  liquid.step(p.dt, 0, -p.gravity, p);
  for (let i = 0; i < liquid.n; i++) {
    const x = liquid.x[i], y = liquid.y[i];
    if (!(x >= 0 && x <= geometry.width && y >= 0 && y <= geometry.height)) {
      console.log(`step ${k} particle ${i} kind ${liquid.kind[i]}: (${prev[2 * i].toFixed(3)}, ${prev[2 * i + 1].toFixed(3)}) -> (${x}, ${y}) v (${liquid.vx[i]}, ${liquid.vy[i]}) wheels ${liquid.wheels.map((w: any) => w.omega.toFixed(2))}`);
      process.exit(0);
    }
  }
}
console.log("all inside", liquid.n, "s", liquid.s.toFixed(4));
