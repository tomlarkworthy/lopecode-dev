// node horde/sep-probe.cjs n frames : how close live agents get to each other after `frames` frames
const fs = require("fs"), path = require("path");
const hordeSim = new Function(fs.readFileSync(path.join(__dirname, "proto/sim.gen.js"), "utf8") + "; return hordeSim")();
const s = hordeSim(), M = s.maze, S = s.S;
const N = +(process.argv[2] || 50000), F = +(process.argv[3] || 600);
// SEP_OFF=1: the control, separation switched off (sepR 1e-4 disables both the force and the position correction)
const P = process.env.SEP_OFF ? { ...s.params, sepR: 1e-4 } : s.params;
const pl = new Float32Array([80.5, 50.5]), none = new Float32Array(0), shock = new Float32Array(4);
let parts = [s.initial(N, 0)];
const fl = s.flowOf(M, pl);
for (let f = 0; f < F; f++) { const nb = s.neighOf(M, parts), b = s.binsOf(M, none); parts = [s.stepBatch(parts[0], 0, f, fl, nb, b, none, pl, shock, N, M, P).agents]; }
const a = parts[0], nb = s.neighOf(M, parts), hw = M.w * 2;
const hist = [0, 0, 0, 0, 0, 0]; let sample = 0, crowded = 0;
for (let i = 0; i < N; i += 5) {
  if (a[i * S + 4] <= 0) continue; sample++;
  const x = a[i * S], y = a[i * S + 1], cx = Math.floor(x * 2), cy = Math.floor(y * 2); let m = 9, cnt = 0;
  for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) { const c = (cy + oy) * hw + cx + ox; for (let j = nb.start[c]; j < nb.start[c + 1]; j++) { const d = Math.hypot(nb.pos[j * 2] - x, nb.pos[j * 2 + 1] - y); if (d > 0 && d < m) m = d; if (d > 0 && d < 0.36) cnt++; } }
  hist[Math.min(5, Math.floor(m / 0.06))]++; if (cnt > 14) crowded++;
}
console.log(`n ${N} after ${F} frames, ${sample} sampled; nearest neighbour histogram (0.06 bins):`, hist.join(" "), `| >14 within sepR: ${crowded}`);
