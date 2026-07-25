// §11 prototype: train ONE transformer on the 5-world zoo mixture at ctx 32.
// Success criteria: (1) eval loss approaches the exact meta-Bayes floor,
// (2) a linear probe on the residual stream reads out a CALIBRATED world posterior.
// usage: bun meta_train.ts [workers] [rounds] [K] [C] [F]
import { cpus } from "node:os";
import { zooWorlds, metaInit, metaUpdate, metaPredictive, worldMarginal, sampleSeq, mulberry32 } from "./processes";
import { GPT, type Cfg } from "./gpt";
import { solveRidge, predict, r2 } from "./probe";

const NWORKERS = parseInt(process.argv[2] || String(Math.min(8, cpus().length - 2)), 10);
const ROUNDS = parseInt(process.argv[3] || "80", 10);
const KSTEPS = parseInt(process.argv[4] || "50", 10);
const C = parseInt(process.argv[5] || "48", 10);
const F = parseInt(process.argv[6] || "192", 10);
const cfg: Cfg = { V: 3, T: 32, C, H: 4, L: 2, F, B: 32 };
const worlds = zooWorlds();
const K = worlds.length;

// ---- eval set: mixture sequences + exact meta-Bayes trajectories
const N_EVAL = 500;
const rng = mulberry32(4242);
type EvalSeq = { world: number; tokens: Int32Array; postTraj: Float64Array; floorLoss: Float64Array };
const evalSeqs: EvalSeq[] = [];
let floorSum = 0, floorN = 0, iidSum = 0;
for (let q = 0; q < N_EVAL; q++) {
  const wi = q % K;
  const { tokens } = sampleSeq(worlds[wi], cfg.T + 1, rng);
  const w = metaInit(worlds);
  const postTraj = new Float64Array(cfg.T * K); // world marginal BEFORE predicting token t+1 (i.e. after tokens[0..t])
  const floorLoss = new Float64Array(cfg.T);
  for (let t = 0; t < cfg.T; t++) {
    metaUpdate(worlds, w, tokens[t]);
    postTraj.set(worldMarginal(w), t * K);
    const pm = metaPredictive(worlds, w);
    floorLoss[t] = -Math.log(pm[tokens[t + 1]]);
    floorSum += floorLoss[t]; floorN++;
    iidSum += Math.log(3);
  }
  evalSeqs.push({ world: wi, tokens, postTraj, floorLoss });
}
const FLOOR = floorSum / floorN;
console.log(`zoo mixture: ${K} worlds, ctx ${cfg.T}, model C=${C} F=${F} (${new GPT(cfg, mulberry32(0)).weightCount()} params)`);
console.log(`meta-Bayes floor ${FLOOR.toFixed(4)} nats | iid ln3 = ${Math.log(3).toFixed(4)}`);

function evalLoss(model: GPT): number {
  const tokens = new Int32Array(cfg.B * cfg.T);
  const targets = new Int32Array(cfg.B * cfg.T);
  let sum = 0, n = 0;
  for (let s = 0; s + cfg.B <= N_EVAL; s += cfg.B) {
    for (let b = 0; b < cfg.B; b++) {
      const seq = evalSeqs[s + b].tokens;
      for (let t = 0; t < cfg.T; t++) { tokens[b * cfg.T + t] = seq[t]; targets[b * cfg.T + t] = seq[t + 1]; }
    }
    sum += model.forward(tokens, targets) * cfg.B * cfg.T;
    n += cfg.B * cfg.T;
  }
  return sum / n;
}

// probe: residual (final layer) -> 5-dim world posterior, positions pooled
function worldProbe(model: GPT, nSeq: number) {
  const D = cfg.C + 1;
  const X = new Float64Array(nSeq * cfg.T * D);
  const Y = new Float64Array(nSeq * cfg.T * K);
  const meta: { world: number; pos: number }[] = [];
  const tokens = new Int32Array(cfg.B * cfg.T);
  let n = 0;
  for (let s = 0; s + cfg.B <= nSeq; s += cfg.B) {
    for (let b = 0; b < cfg.B; b++) tokens.set(evalSeqs[s + b].tokens.subarray(0, cfg.T), b * cfg.T);
    model.forward(tokens, null);
    const res = model.act[`l${cfg.L - 1}.res3`];
    for (let b = 0; b < cfg.B; b++)
      for (let t = 0; t < cfg.T; t++) {
        const ro = (b * cfg.T + t) * cfg.C;
        for (let c = 0; c < cfg.C; c++) X[n * D + c] = res[ro + c];
        X[n * D + cfg.C] = 1;
        for (let k = 0; k < K; k++) Y[n * K + k] = evalSeqs[s + b].postTraj[t * K + k];
        meta.push({ world: evalSeqs[s + b].world, pos: t });
        n++;
      }
  }
  const W = solveRidge(X, Y, n, D, K, 1e-4);
  const Yhat = predict(X, W, n, D, K);
  const R2 = r2(Y, Yhat, n, K);
  // calibration: mean |probe - exactPosterior| and argmax agreement, by position bucket
  const buckets = [[0, 4], [4, 8], [8, 16], [16, 32]];
  const rows = buckets.map(() => ({ l1: 0, agree: 0, correct: 0, bayesCorrect: 0, n: 0 }));
  for (let i = 0; i < n; i++) {
    const b = buckets.findIndex(([lo, hi]) => meta[i].pos >= lo && meta[i].pos < hi);
    if (b < 0) continue;
    let l1 = 0, am = 0, ab = 0;
    for (let k = 0; k < K; k++) {
      l1 += Math.abs(Yhat[i * K + k] - Y[i * K + k]);
      if (Yhat[i * K + k] > Yhat[i * K + am]) am = k;
      if (Y[i * K + k] > Y[i * K + ab]) ab = k;
    }
    rows[b].l1 += l1 / K;
    rows[b].agree += am === ab ? 1 : 0;
    rows[b].correct += am === meta[i].world ? 1 : 0;
    rows[b].bayesCorrect += ab === meta[i].world ? 1 : 0;
    rows[b].n++;
  }
  return { R2, rows, buckets, W };
}

// ---- worker pool (same protocol as train_parallel)
const evalModel = new GPT(cfg, mulberry32(7));
const nW = evalModel.weightCount();
let weights = evalModel.getWeights();
type Handle = { worker: Worker; next: () => Promise<any> };
const handles: Handle[] = [];
for (let i = 0; i < NWORKERS; i++) {
  const worker = new Worker(new URL("./worker_train.ts", import.meta.url).href);
  const queue: ((v: any) => void)[] = [];
  const backlog: any[] = [];
  worker.onmessage = (e: MessageEvent) => {
    const resolve = queue.shift();
    if (resolve) resolve(e.data); else backlog.push(e.data);
  };
  const next = () =>
    backlog.length ? Promise.resolve(backlog.shift()) : new Promise<any>((res) => queue.push(res));
  handles.push({ worker, next });
  worker.postMessage({ type: "init", cfg, procName: "zoo", procArgs: [0, 0], seed: 1000 + i * 7919, weights: weights.buffer.slice(0) });
}
await Promise.all(handles.map((h) => h.next()));

const TOTAL = ROUNDS * KSTEPS;
const lrAt = (step: number) => {
  const warm = Math.min(1, step / 100);
  const decay = 0.5 * (1 + Math.cos(Math.PI * Math.min(1, step / TOTAL)));
  return 1e-3 * warm * (0.1 + 0.9 * decay);
};
const t0 = performance.now();
for (let round = 1; round <= ROUNDS; round++) {
  const lr = lrAt((round - 1) * KSTEPS + KSTEPS / 2);
  for (const h of handles) {
    const copy = weights.buffer.slice(0);
    h.worker.postMessage({ type: "round", weights: copy, steps: KSTEPS, lr }, [copy]);
  }
  const results = await Promise.all(handles.map((h) => h.next()));
  weights = new Float64Array(nW);
  for (const r of results) {
    const w = new Float64Array(r.weights);
    for (let i = 0; i < nW; i++) weights[i] += w[i];
  }
  for (let i = 0; i < nW; i++) weights[i] /= results.length;
  if (round % 10 === 0 || round === 1 || round === ROUNDS) {
    evalModel.setWeights(weights);
    const el = evalLoss(evalModel);
    const wall = (performance.now() - t0) / 1000;
    console.log(`round ${round} (${round * KSTEPS} steps/worker) wall ${wall.toFixed(1)}s | eval ${el.toFixed(4)} floor ${FLOOR.toFixed(4)} | ${((round * KSTEPS * NWORKERS) / wall).toFixed(0)} agg steps/s`);
  }
}
for (const h of handles) h.worker.terminate();

evalModel.setWeights(weights);
console.log(`FINAL eval ${evalLoss(evalModel).toFixed(4)} vs floor ${FLOOR.toFixed(4)} (gap ${(evalLoss(evalModel) - FLOOR).toFixed(4)} nats)`);
const { R2, rows, buckets } = worldProbe(evalModel, 480);
console.log(`world-posterior probe R² per world: ${Array.from(R2, (r) => r.toFixed(3)).join(", ")}`);
console.log("pos bucket | mean|probe-bayes|/K | argmax agree(probe,bayes) | probe acc | bayes acc");
rows.forEach((r, i) =>
  console.log(
    `${String(buckets[i][0]).padStart(3)}-${String(buckets[i][1]).padEnd(3)}` +
    ` | ${(r.l1 / r.n).toFixed(4).padStart(12)} | ${(100 * r.agree / r.n).toFixed(1).padStart(8)}%` +
    ` | ${(100 * r.correct / r.n).toFixed(1).padStart(6)}% | ${(100 * r.bayesCorrect / r.n).toFixed(1).padStart(6)}%`));
await Bun.write(new URL("./out/model_zoo.json", import.meta.url).pathname, evalModel.serialize());
console.log("saved out/model_zoo.json");
