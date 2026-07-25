// Probe-quality experiments on the saved zoo model: layer choice, concat, log-space target.
import { zooWorlds, metaInit, metaUpdate, worldMarginal, sampleSeq, mulberry32 } from "./processes";
import { GPT, type Cfg } from "./gpt";
import { solveRidge, predict, r2 } from "./probe";

const model = GPT.deserialize(await Bun.file(new URL("./out/model_zoo.json", import.meta.url).pathname).text());
const cfg: Cfg = (model as any).cfg;
const worlds = zooWorlds();
const K = worlds.length;

const rng = mulberry32(4242);
const N_SEQ = 480;
const seqs: { world: number; tokens: Int32Array; postTraj: Float64Array }[] = [];
for (let q = 0; q < N_SEQ; q++) {
  const wi = q % K;
  const { tokens } = sampleSeq(worlds[wi], cfg.T + 1, rng);
  const w = metaInit(worlds);
  const postTraj = new Float64Array(cfg.T * K);
  for (let t = 0; t < cfg.T; t++) {
    metaUpdate(worlds, w, tokens[t]);
    postTraj.set(worldMarginal(w), t * K);
  }
  seqs.push({ world: wi, tokens, postTraj });
}

function collectBufs(bufs: string[]) {
  const D = bufs.length * cfg.C + 1;
  const N = Math.floor(N_SEQ / cfg.B) * cfg.B * cfg.T;
  const X = new Float64Array(N * D);
  const Y = new Float64Array(N * K);
  const pos = new Int32Array(N);
  const world = new Int32Array(N);
  const tokens = new Int32Array(cfg.B * cfg.T);
  let n = 0;
  for (let s = 0; s + cfg.B <= N_SEQ; s += cfg.B) {
    for (let b = 0; b < cfg.B; b++) tokens.set(seqs[s + b].tokens.subarray(0, cfg.T), b * cfg.T);
    model.forward(tokens, null);
    const srcs = bufs.map((bf) => model.act[bf]);
    for (let b = 0; b < cfg.B; b++)
      for (let t = 0; t < cfg.T; t++) {
        const ro = (b * cfg.T + t) * cfg.C;
        for (let bi = 0; bi < srcs.length; bi++)
          for (let c = 0; c < cfg.C; c++) X[n * D + bi * cfg.C + c] = srcs[bi][ro + c];
        X[n * D + D - 1] = 1;
        for (let k = 0; k < K; k++) Y[n * K + k] = seqs[s + b].postTraj[t * K + k];
        pos[n] = t; world[n] = seqs[s + b].world;
        n++;
      }
  }
  return { X, Y, N: n, D, pos, world };
}

function report(name: string, Yhat: Float64Array, Y: Float64Array, N: number, pos: Int32Array, world: Int32Array) {
  const R2 = r2(Y, Yhat, N, K);
  let agree = 0, correct = 0, bayesC = 0, l1 = 0, late = 0;
  for (let i = 0; i < N; i++) {
    if (pos[i] < 16) continue;
    let am = 0, ab = 0, d = 0;
    for (let k = 0; k < K; k++) {
      if (Yhat[i * K + k] > Yhat[i * K + am]) am = k;
      if (Y[i * K + k] > Y[i * K + ab]) ab = k;
      d += Math.abs(Yhat[i * K + k] - Y[i * K + k]);
    }
    if (am === ab) agree++;
    if (am === world[i]) correct++;
    if (ab === world[i]) bayesC++;
    l1 += d / K;
    late++;
  }
  console.log(`${name.padEnd(28)} R²=${Array.from(R2, (r) => r.toFixed(3)).join(",")} | late: acc ${(100 * correct / late).toFixed(1)}% (bayes ${(100 * bayesC / late).toFixed(1)}%) agree ${(100 * agree / late).toFixed(1)}% L1 ${(l1 / late).toFixed(4)}`);
}

for (const bufs of [["l1.res3"], ["l0.res3"], ["l0.res3", "l1.res3"]]) {
  const { X, Y, N, D, pos, world } = collectBufs(bufs);
  // linear target
  {
    const W = solveRidge(X, Y, N, D, K, 1e-4);
    report(bufs.join("+") + " linear", predict(X, W, N, D, K), Y, N, pos, world);
  }
  // log target, softmax-renormalized readout
  {
    const Ylog = Float64Array.from(Y, (v) => Math.log(v + 1e-4));
    const W = solveRidge(X, Ylog, N, D, K, 1e-4);
    const raw = predict(X, W, N, D, K);
    const Yhat = new Float64Array(N * K);
    for (let i = 0; i < N; i++) {
      let z = 0;
      for (let k = 0; k < K; k++) z += Math.exp(raw[i * K + k]);
      for (let k = 0; k < K; k++) Yhat[i * K + k] = Math.exp(raw[i * K + k]) / z;
    }
    report(bufs.join("+") + " log→softmax", Yhat, Y, N, pos, world);
  }
}
