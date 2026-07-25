// Train a small GPT on Mess3, probe the final residual stream for belief geometry.
// usage: bun train_probe.ts [steps] [--resume out/model_mess3.json]
import { mess3, sampleSeq, beliefTrajectory, nextTokenDist, mulberry32, type Process } from "./processes";
import { GPT, type Cfg } from "./gpt";
import { solveRidge, predict, r2 } from "./probe";
import { scatterPNG, baryXY, beliefColor, type Pt } from "./png";

const STEPS = parseInt(process.argv[2] || "8000", 10);
const resumeIdx = process.argv.indexOf("--resume");
const RESUME = resumeIdx > 0 ? process.argv[resumeIdx + 1] : null;

const proc = mess3(0.05, 0.85);
const cfg: Cfg = { V: 3, T: 10, C: 32, H: 4, L: 2, F: 128, B: 32 };
const rng = mulberry32(7);
const outDir = new URL("./out/", import.meta.url).pathname;

const model = RESUME ? GPT.deserialize(await Bun.file(RESUME).text()) : new GPT(cfg, rng);
console.log(`model: L=${cfg.L} C=${cfg.C} H=${cfg.H} ctx=${cfg.T} | ${model.order.reduce((a, p) => a + p.w.length, 0)} params | start step ${model.step}`);

// ---- eval set (fixed): sequences of length T+1; inputs [0..T-1], targets [1..T]
const NEVAL = 1000;
const evalRng = mulberry32(999);
type EvalSeq = { tokens: Int32Array; beliefs: Float64Array[] };
const evalSeqs: EvalSeq[] = [];
let optimalLoss = 0, optCount = 0;
for (let s = 0; s < NEVAL; s++) {
  const { tokens } = sampleSeq(proc, cfg.T + 1, evalRng);
  const { beliefs } = beliefTrajectory(proc, tokens.subarray(0, cfg.T));
  evalSeqs.push({ tokens, beliefs });
  for (let t = 0; t < cfg.T; t++) {
    const p = nextTokenDist(proc, beliefs[t])[tokens[t + 1]];
    optimalLoss += -Math.log(Math.max(p, 1e-12));
    optCount++;
  }
}
optimalLoss /= optCount;
// H(next | stationary belief) as the "know-nothing" baseline
let h0 = 0;
{
  const d = nextTokenDist(proc, Float64Array.from(proc.stationary));
  for (const p of d) if (p > 0) h0 += -p * Math.log(p);
}
console.log(`optimal (belief-state) loss: ${optimalLoss.toFixed(4)} nats | iid baseline: ${h0.toFixed(4)}`);

// ---- helpers
function makeBatch(B: number, r: () => number) {
  const tokens = new Int32Array(B * cfg.T);
  const targets = new Int32Array(B * cfg.T);
  for (let b = 0; b < B; b++) {
    const { tokens: seq } = sampleSeq(proc, cfg.T + 1, r);
    for (let t = 0; t < cfg.T; t++) {
      tokens[b * cfg.T + t] = seq[t];
      targets[b * cfg.T + t] = seq[t + 1];
    }
  }
  return { tokens, targets };
}

function evalLoss(): number {
  let loss = 0, batches = 0;
  const tokens = new Int32Array(cfg.B * cfg.T);
  const targets = new Int32Array(cfg.B * cfg.T);
  for (let s = 0; s + cfg.B <= Math.min(NEVAL, 320); s += cfg.B) {
    for (let b = 0; b < cfg.B; b++) {
      const seq = evalSeqs[s + b].tokens;
      for (let t = 0; t < cfg.T; t++) { tokens[b * cfg.T + t] = seq[t]; targets[b * cfg.T + t] = seq[t + 1]; }
    }
    loss += model.forward(tokens, targets);
    batches++;
  }
  return loss / batches;
}

// collect final-layer residuals + ground-truth beliefs over the eval set
function collectProbeData(nSeq: number) {
  const D = cfg.C + 1, K = 3;
  const N = nSeq * cfg.T;
  const X = new Float64Array(N * D);
  const Y = new Float64Array(N * K);
  const tokens = new Int32Array(cfg.B * cfg.T);
  let n = 0;
  const res = model.act[`l${cfg.L - 1}.res3`];
  for (let s = 0; s + cfg.B <= nSeq; s += cfg.B) {
    for (let b = 0; b < cfg.B; b++) {
      const seq = evalSeqs[s + b].tokens;
      for (let t = 0; t < cfg.T; t++) tokens[b * cfg.T + t] = seq[t];
    }
    model.forward(tokens, null);
    for (let b = 0; b < cfg.B; b++) {
      const { beliefs } = evalSeqs[s + b];
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

function probeAndRender(tag: string, shuffle = false) {
  const { X, Y, N, D, K } = collectProbeData(960);
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
  const pts: Pt[] = [];
  for (let n = 0; n < N; n++) {
    const etaHat = [Yhat[n * K], Yhat[n * K + 1], Yhat[n * K + 2]];
    const [x, y] = baryXY(etaHat);
    const [r_, g, b] = beliefColor([Y[n * K], Y[n * K + 1], Y[n * K + 2]]); // color by TRUE belief
    pts.push({ x, y, r: r_, g, b });
  }
  const png = scatterPNG(700, 620, pts);
  const file = `${outDir}${tag}.png`;
  Bun.write(file, png);
  console.log(`[probe ${tag}] R^2 = ${scores.map((s) => s.toFixed(4)).join(", ")} -> ${file}`);
  return scores;
}

// ---- training
const trainRng = mulberry32(model.step + 1);
const t0 = performance.now();
let ema = -1;
for (let step = 1; step <= STEPS; step++) {
  const { tokens, targets } = makeBatch(cfg.B, trainRng);
  model.zeroGrads();
  const loss = model.forward(tokens, targets);
  model.backward(tokens, targets);
  const warm = Math.min(1, model.step / 100);
  const decay = 0.5 * (1 + Math.cos(Math.PI * Math.min(1, model.step / (model.step - step + STEPS))));
  model.adam(1e-3 * warm * (0.1 + 0.9 * decay));
  ema = ema < 0 ? loss : 0.99 * ema + 0.01 * loss;
  if (step % 250 === 0 || step === 1) {
    const ms = (performance.now() - t0) / step;
    console.log(`step ${model.step} train(ema) ${ema.toFixed(4)} eval ${evalLoss().toFixed(4)} optimal ${optimalLoss.toFixed(4)} | ${ms.toFixed(1)} ms/step`);
  }
  if (step % 2000 === 0) probeAndRender(`probe_step${model.step}`);
}

probeAndRender("probe_final");
probeAndRender("probe_shuffled", true);

// ground-truth render of the SAME eval points for side-by-side comparison
{
  const pts: Pt[] = [];
  for (let s = 0; s < 960; s++)
    for (const eta of evalSeqs[s].beliefs) {
      const [x, y] = baryXY(eta);
      const [r, g, b] = beliefColor(eta);
      pts.push({ x, y, r, g, b });
    }
  await Bun.write(`${outDir}truth_evalpoints.png`, scatterPNG(700, 620, pts));
}

await Bun.write(`${outDir}model_mess3.json`, model.serialize());
console.log(`saved ${outDir}model_mess3.json at step ${model.step}`);
