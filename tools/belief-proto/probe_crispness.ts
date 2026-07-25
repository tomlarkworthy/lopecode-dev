// What buys fractal crispness in the probe scatter? Diagnose on a saved model:
// per-position probe error, presentation variants (position filter, point count),
// and optionally a longer/bigger training run for comparison.
// usage: bun probe_crispness.ts [modelPath]
import { mess3, mulberry32, sampleSeq, beliefTrajectory } from "./processes";
import { GPT, type Cfg } from "./gpt";
import { solveRidge, predict, r2 } from "./probe";
import { scatterPNG, baryXY, beliefColor, type Pt } from "./png";

const path = process.argv[2] || new URL("./out/model_mess3_parallel.json", import.meta.url).pathname;
const model = GPT.deserialize(await Bun.file(path).text());
const cfg: Cfg = (model as any).cfg;
console.log(`model ${path.split("/").pop()} cfg ${JSON.stringify(cfg)} step ${(model as any).step}`);
const proc = mess3(0.05, 0.85);

// big probe collection
const N_SEQ = 2048;
const rng = mulberry32(999);
const seqs: { tokens: Int32Array; beliefs: Float64Array[] }[] = [];
for (let s = 0; s < N_SEQ; s++) {
  const { tokens } = sampleSeq(proc, cfg.T + 1, rng);
  const { beliefs } = beliefTrajectory(proc, tokens.subarray(0, cfg.T));
  seqs.push({ tokens, beliefs });
}
const D = cfg.C + 1, K = 3;
const N = Math.floor(N_SEQ / cfg.B) * cfg.B * cfg.T;
const X = new Float64Array(N * D);
const Y = new Float64Array(N * K);
const pos = new Int32Array(N);
const tokens = new Int32Array(cfg.B * cfg.T);
let n = 0;
const res = model.act[`l${cfg.L - 1}.res3`];
for (let s = 0; s + cfg.B <= N_SEQ; s += cfg.B) {
  for (let b = 0; b < cfg.B; b++) tokens.set(seqs[s + b].tokens.subarray(0, cfg.T), b * cfg.T);
  model.forward(tokens, null);
  for (let b = 0; b < cfg.B; b++)
    for (let t = 0; t < cfg.T; t++) {
      const ro = (b * cfg.T + t) * cfg.C;
      for (let c = 0; c < cfg.C; c++) X[n * D + c] = res[ro + c];
      X[n * D + cfg.C] = 1;
      for (let k = 0; k < K; k++) Y[n * K + k] = seqs[s + b].beliefs[t][k];
      pos[n] = t;
      n++;
    }
}
const W = solveRidge(X, Y, n, D, K, 1e-4);
const Yhat = predict(X, W, n, D, K);
console.log("overall R²:", Array.from(r2(Y, Yhat, n, K), (v) => v.toFixed(4)).join(", "));

// per-position mean |error| in belief coords (the blur radius)
console.log("pos | mean|etaHat-eta| (blur, simplex units)");
for (let t = 0; t < cfg.T; t++) {
  let e = 0, c = 0;
  for (let i = 0; i < n; i++) {
    if (pos[i] !== t) continue;
    for (let k = 0; k < K; k++) e += Math.abs(Yhat[i * K + k] - Y[i * K + k]);
    c++;
  }
  console.log(String(t).padStart(3) + " | " + (e / c / K).toFixed(4));
}

// renders: all positions vs late-only, same point budget
function render(name: string, minPos: number, maxPts: number) {
  const pts: Pt[] = [];
  for (let i = 0; i < n && pts.length < maxPts; i++) {
    if (pos[i] < minPos) continue;
    const [x, y] = baryXY([Yhat[i * K], Yhat[i * K + 1], Yhat[i * K + 2]]);
    const [r_, g, b] = beliefColor([Y[i * K], Y[i * K + 1], Y[i * K + 2]]);
    pts.push({ x, y, r: r_, g, b });
  }
  const out = new URL(`./out/${name}`, import.meta.url).pathname;
  Bun.write(out, scatterPNG(700, 620, pts));
  console.log(`wrote ${name} (${pts.length} pts, pos>=${minPos})`);
}
render("crisp_allpos.png", 0, 8000);
render("crisp_latepos.png", 4, 8000);

// per-position probes: does adapting the linear map to each position cut the blur?
console.log("per-position probes (fit + eval at single t):");
for (const t of [3, 6, 9]) {
  const idx: number[] = [];
  for (let i = 0; i < n; i++) if (pos[i] === t) idx.push(i);
  const Np = idx.length;
  const Xp = new Float64Array(Np * D), Yp = new Float64Array(Np * K);
  idx.forEach((i, j) => {
    Xp.set(X.subarray(i * D, i * D + D), j * D);
    Yp.set(Y.subarray(i * K, i * K + K), j * K);
  });
  const Wp = solveRidge(Xp, Yp, Np, D, K, 1e-4);
  const Yhp = predict(Xp, Wp, Np, D, K);
  let e = 0;
  for (let j = 0; j < Np; j++) for (let k = 0; k < K; k++) e += Math.abs(Yhp[j * K + k] - Yp[j * K + k]);
  console.log(`  t=${t}: blur ${(e / Np / K).toFixed(4)} (n=${Np})`);
}

// render with per-position probes (the winning combination)
{
  const pts: Pt[] = [];
  const Ws = new Map<number, Float64Array>();
  for (let t = 0; t < cfg.T; t++) {
    const idx: number[] = [];
    for (let i = 0; i < n; i++) if (pos[i] === t) idx.push(i);
    const Np = idx.length;
    const Xp = new Float64Array(Np * D), Yp = new Float64Array(Np * K);
    idx.forEach((i, j) => {
      Xp.set(X.subarray(i * D, i * D + D), j * D);
      Yp.set(Y.subarray(i * K, i * K + K), j * K);
    });
    Ws.set(t, solveRidge(Xp, Yp, Np, D, K, 1e-4));
  }
  for (let i = 0; i < n && pts.length < 16000; i++) {
    const W2 = Ws.get(pos[i])!;
    const eh = [0, 1, 2].map((k) => {
      let a = W2[(D - 1) * K + k];
      for (let c = 0; c < D - 1; c++) a += X[i * D + c] * W2[c * K + k];
      return a;
    });
    const [x, y] = baryXY(eh);
    const [r_, g, b] = beliefColor([Y[i * K], Y[i * K + 1], Y[i * K + 2]]);
    pts.push({ x, y, r: r_, g, b });
  }
  const out = new URL("./out/crisp_perpos.png", import.meta.url).pathname;
  Bun.write(out, scatterPNG(700, 620, pts));
  console.log(`wrote crisp_perpos.png (${pts.length} pts, per-position probes)`);
}
