// node horde/smoke.cjs : the generated sim in node: maze picture, the replay test, 100k agents for 300 frames
const fs = require("fs"), path = require("path");
eval(fs.readFileSync(path.join(__dirname, "proto/sim.gen.js"), "utf8") + "; globalThis.hordeSim = hordeSim");
const s = hordeSim(), M = s.maze;
const rows = []; for (let y = 0; y < M.h; y++) { let r = ""; for (let x = 0; x < M.w; x++) r += M.walls[y * M.w + x] ? "#" : " "; rows.push(r); }
console.log(rows.join("\n"));
console.log(s.test());
const N = +(process.argv[2] || 100000), F = 300;
const pl = new Float32Array([48.5, 30.5]), none = new Float32Array(0);
let parts = [s.initial(N, 0)];
const t = performance.now();
for (let f = 0; f < F; f++) { const fl = s.flowOf(M, pl), g = s.gridOf(M, parts), b = s.binsOf(M, none); parts = [s.stepBatch(parts[0], 0, f, fl, g, b, none, pl, M, s.params).agents]; }
console.log(`node ${N} agents: ${((performance.now() - t) / F).toFixed(2)} ms/frame`);
let alive = 0, near = 0; for (let i = 0; i < N; i++) { const a = parts[0]; if (a[i * 5 + 4] > 0) { alive++; if (Math.hypot(a[i*5]-48.5, a[i*5+1]-30.5) < 8) near++; } }
console.log("alive", alive, "within 8 tiles of player", near);
