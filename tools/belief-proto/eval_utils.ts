// Shared eval-set construction, eval loss, and belief-probe helpers (Mess3-shaped, 3-state).
import { sampleSeq, beliefTrajectory, nextTokenDist, mulberry32, type Process } from "./processes";
import { GPT, type Cfg } from "./gpt";
import { solveRidge, predict, r2 } from "./probe";
import { scatterPNG, baryXY, beliefColor, type Pt } from "./png";

export type EvalSet = {
  seqs: { tokens: Int32Array; beliefs: Float64Array[] }[];
  optimalLoss: number;
};

export function makeEvalSet(proc: Process, cfg: Cfg, n: number, seed = 999): EvalSet {
  const rng = mulberry32(seed);
  const seqs: EvalSet["seqs"] = [];
  let optimalLoss = 0, count = 0;
  for (let s = 0; s < n; s++) {
    const { tokens } = sampleSeq(proc, cfg.T + 1, rng);
    const { beliefs } = beliefTrajectory(proc, tokens.subarray(0, cfg.T));
    seqs.push({ tokens, beliefs });
    for (let t = 0; t < cfg.T; t++) {
      const p = nextTokenDist(proc, beliefs[t])[tokens[t + 1]];
      optimalLoss += -Math.log(Math.max(p, 1e-12));
      count++;
    }
  }
  return { seqs, optimalLoss: optimalLoss / count };
}

export function evalLoss(model: GPT, cfg: Cfg, ev: EvalSet, maxSeq = 320): number {
  let loss = 0, batches = 0;
  const tokens = new Int32Array(cfg.B * cfg.T);
  const targets = new Int32Array(cfg.B * cfg.T);
  for (let s = 0; s + cfg.B <= Math.min(ev.seqs.length, maxSeq); s += cfg.B) {
    for (let b = 0; b < cfg.B; b++) {
      const seq = ev.seqs[s + b].tokens;
      for (let t = 0; t < cfg.T; t++) { tokens[b * cfg.T + t] = seq[t]; targets[b * cfg.T + t] = seq[t + 1]; }
    }
    loss += model.forward(tokens, targets);
    batches++;
  }
  return loss / batches;
}

export function collectProbeData(model: GPT, cfg: Cfg, ev: EvalSet, nSeq: number) {
  const D = cfg.C + 1, K = 3;
  const X = new Float64Array(nSeq * cfg.T * D);
  const Y = new Float64Array(nSeq * cfg.T * K);
  const tokens = new Int32Array(cfg.B * cfg.T);
  let n = 0;
  const res = model.act[`l${cfg.L - 1}.res3`];
  for (let s = 0; s + cfg.B <= nSeq; s += cfg.B) {
    for (let b = 0; b < cfg.B; b++) {
      const seq = ev.seqs[s + b].tokens;
      for (let t = 0; t < cfg.T; t++) tokens[b * cfg.T + t] = seq[t];
    }
    model.forward(tokens, null);
    for (let b = 0; b < cfg.B; b++) {
      const { beliefs } = ev.seqs[s + b];
      for (let t = 0; t < cfg.T; t++) {
        const ro = (b * cfg.T + t) * cfg.C;
        for (let c = 0; c < cfg.C; c++) X[n * D + c] = res[ro + c];
        X[n * D + cfg.C] = 1;
        for (let k = 0; k < K; k++) Y[n * K + k] = beliefs[t][k];
        n++;
      }
    }
  }
  return { X, Y, N: n, D, K };
}

export function probeAndRender(model: GPT, cfg: Cfg, ev: EvalSet, outPath: string | null, shuffle = false, nSeq = 960) {
  const { X, Y, N, D, K } = collectProbeData(model, cfg, ev, nSeq);
  let Yfit = Y;
  if (shuffle) {
    Yfit = new Float64Array(Y);
    const r = mulberry32(4242);
    for (let n = N - 1; n > 0; n--) {
      const j = Math.floor(r() * (n + 1));
      for (let k = 0; k < K; k++) {
        const a = Yfit[n * K + k]; Yfit[n * K + k] = Yfit[j * K + k]; Yfit[j * K + k] = a;
      }
    }
  }
  const W = solveRidge(X, Yfit, N, D, K, 1e-4);
  const Yhat = predict(X, W, N, D, K);
  const scores = r2(Yfit, Yhat, N, K);
  if (outPath) {
    const pts: Pt[] = [];
    for (let n = 0; n < N; n++) {
      const [x, y] = baryXY([Yhat[n * K], Yhat[n * K + 1], Yhat[n * K + 2]]);
      const [r_, g, b] = beliefColor([Y[n * K], Y[n * K + 1], Y[n * K + 2]]);
      pts.push({ x, y, r: r_, g, b });
    }
    Bun.write(outPath, scatterPNG(700, 620, pts));
  }
  return scores;
}
