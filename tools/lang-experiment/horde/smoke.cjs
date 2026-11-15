// node horde/smoke.cjs [n] : the generated sim in node: the replay test, then n agents for 300 frames
const fs = require("fs"), path = require("path");
const hordeSim = new Function(fs.readFileSync(path.join(__dirname, "proto/sim.gen.js"), "utf8") + "; return hordeSim")();
const s = hordeSim(), M = s.maze, S = s.S;
console.log("maze", M.w, "x", M.h);
let t = performance.now();
console.log(s.test(), `(${(performance.now() - t).toFixed(0)} ms)`);
const N = +(process.argv[2] || 50000), F = 300;
const pl = new Float32Array([80.5, 50.5]), none = new Float32Array(0), shock = new Float32Array(4);
let parts = [s.initial(N, 0)];
const fl = s.flowOf(M, pl);
t = performance.now();
for (let f = 0; f < F; f++) { const nb = s.neighOf(M, parts), b = s.binsOf(M, none); parts = [s.stepBatch(parts[0], 0, f, fl, nb, b, none, pl, shock, N, M, s.params).agents]; }
console.log(`node ${N} agents: ${((performance.now() - t) / F).toFixed(2)} ms/frame`);
const a = parts[0]; let alive = 0, kinds = [0, 0, 0, 0], close = 0;
for (let i = 0; i < N; i++) if (a[i * S + 4] > 0) { alive++; kinds[a[i * S + 5]]++; }
// nearest-neighbour check on a sample: how many live agents sit within 0.15 of another
const nb = s.neighOf(M, parts); let pairs = 0, sample = 0;
for (let i = 0; i < N && sample < 2000; i += 7) { if (a[i * S + 4] <= 0) continue; sample++; const x = a[i*S], y = a[i*S+1]; const hw = M.w*2; const cx = Math.floor(x*2), cy = Math.floor(y*2); let m = 9;
  for (let oy=-1;oy<=1;oy++) for (let ox=-1;ox<=1;ox++){const c=(cy+oy)*hw+cx+ox; for(let j=nb.start[c];j<nb.start[c+1];j++){const d=Math.hypot(nb.pos[j*2]-x,nb.pos[j*2+1]-y); if(d>0&&d<m)m=d;}} if (m < 0.15) pairs++; }
console.log("alive", alive, "kinds [diamond, chevron, hex, shard]", kinds.join(","), `sampled ${sample}: ${pairs} closer than 0.15 to a neighbour`);
