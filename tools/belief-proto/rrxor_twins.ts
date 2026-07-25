// Train on RRXOR; test whether residuals separate belief states that have
// IDENTICAL next-token predictions (S, "0", "1" all predict 50/50).
// usage: bun rrxor_twins.ts [steps]
import { rrxor, sampleSeq, beliefTrajectory, nextTokenDist, mulberry32 } from "./processes";
import { GPT, type Cfg } from "./gpt";
import { solveRidge, predict, r2 } from "./probe";
import { scatterPNG, type Pt } from "./png";

const STEPS = parseInt(process.argv[2] || "8000", 10);
const RENDER_ONLY = process.argv.includes("--render-only");
const proc = rrxor();
const cfg: Cfg = { V: 2, T: 12, C: 32, H: 4, L: 2, F: 128, B: 32 };
const rng = mulberry32(11);
const outDir = new URL("./out/", import.meta.url).pathname;
const model = RENDER_ONLY ? GPT.deserialize(await Bun.file(`${outDir}model_rrxor.json`).text()) : new GPT(cfg, rng);

// ---- eval set + optimal loss
const NEVAL = 1000;
const evalRng = mulberry32(555);
const evalSeqs: { tokens: Int32Array; beliefs: Float64Array[] }[] = [];
let optimalLoss = 0, n0 = 0;
for (let s = 0; s < NEVAL; s++) {
  const { tokens } = sampleSeq(proc, cfg.T + 1, evalRng);
  const { beliefs } = beliefTrajectory(proc, tokens.subarray(0, cfg.T));
  evalSeqs.push({ tokens, beliefs });
  for (let t = 0; t < cfg.T; t++) {
    const p = nextTokenDist(proc, beliefs[t])[tokens[t + 1]];
    optimalLoss += -Math.log(Math.max(p, 1e-12));
    n0++;
  }
}
optimalLoss /= n0;
console.log(`rrxor optimal loss ${optimalLoss.toFixed(4)} nats (iid: ${Math.log(2).toFixed(4)})`);

// ---- train
function makeBatch(r: () => number) {
  const tokens = new Int32Array(cfg.B * cfg.T);
  const targets = new Int32Array(cfg.B * cfg.T);
  for (let b = 0; b < cfg.B; b++) {
    const { tokens: seq } = sampleSeq(proc, cfg.T + 1, r);
    for (let t = 0; t < cfg.T; t++) { tokens[b * cfg.T + t] = seq[t]; targets[b * cfg.T + t] = seq[t + 1]; }
  }
  return { tokens, targets };
}
const trainRng = mulberry32(1);
let ema = -1;
const t0 = performance.now();
for (let step = 1; step <= (RENDER_ONLY ? 0 : STEPS); step++) {
  const { tokens, targets } = makeBatch(trainRng);
  model.zeroGrads();
  const loss = model.forward(tokens, targets);
  model.backward(tokens, targets);
  const warm = Math.min(1, step / 100);
  const decay = 0.5 * (1 + Math.cos(Math.PI * step / STEPS));
  model.adam(1e-3 * warm * (0.1 + 0.9 * decay));
  ema = ema < 0 ? loss : 0.99 * ema + 0.01 * loss;
  if (step % 1000 === 0 || step === 1)
    console.log(`step ${step} train(ema) ${ema.toFixed(4)} optimal ${optimalLoss.toFixed(4)} | ${((performance.now() - t0) / step).toFixed(1)} ms/step`);
}

// ---- collect residuals per layer at eval positions, plus model's own next-token probs
const K = 5;
type Row = { l0: Float64Array; l1: Float64Array; belief: Float64Array; p1: number; cls: number; t: number };
const rows: Row[] = [];
const tokens = new Int32Array(cfg.B * cfg.T);
const res0 = model.act[`l0.res3`], res1 = model.act[`l1.res3`], probs = model.act.probs;
for (let s = 0; s + cfg.B <= 960; s += cfg.B) {
  for (let b = 0; b < cfg.B; b++) {
    const seq = evalSeqs[s + b].tokens;
    for (let t = 0; t < cfg.T; t++) tokens[b * cfg.T + t] = seq[t];
  }
  model.forward(tokens, null);
  for (let b = 0; b < cfg.B; b++) {
    const { beliefs } = evalSeqs[s + b];
    for (let t = 0; t < cfg.T; t++) {
      const o = (b * cfg.T + t) * cfg.C;
      const belief = beliefs[t];
      let amax = 0;
      for (let i = 1; i < K; i++) if (belief[i] > belief[amax]) amax = i;
      // twin classes: pure S(0), "0"(1), "1"(2)
      const cls = belief[amax] > 0.99 && amax <= 2 ? amax : -1;
      rows.push({
        l0: Float64Array.from(res0.subarray(o, o + cfg.C)),
        l1: Float64Array.from(res1.subarray(o, o + cfg.C)),
        belief: Float64Array.from(belief),
        p1: probs[(b * cfg.T + t) * cfg.V + 1],
        cls,
        t,
      });
    }
  }
}

// ---- (a) are the model's next-token predictions actually identical across twin classes?
for (const cls of [0, 1, 2]) {
  const sel = rows.filter((r) => r.cls === cls);
  const mean = sel.reduce((a, r) => a + r.p1, 0) / sel.length;
  const dev = sel.reduce((a, r) => a + Math.abs(r.p1 - 0.5), 0) / sel.length;
  console.log(`class ${["S", '"0"', '"1"'][cls]}: n=${sel.length} mean p(1)=${mean.toFixed(4)} mean|p-0.5|=${dev.toFixed(4)}`);
}

// ---- (b) belief probe R^2 per representation
function probeR2(getX: (r: Row) => Float64Array, D: number, tag: string) {
  const sel = rows;
  const N = sel.length;
  const X = new Float64Array(N * (D + 1)), Y = new Float64Array(N * K);
  sel.forEach((r, n) => {
    X.set(getX(r), n * (D + 1));
    X[n * (D + 1) + D] = 1;
    Y.set(r.belief, n * K);
  });
  const W = solveRidge(X, Y, N, D + 1, K, 1e-4);
  const scores = r2(Y, predict(X, W, N, D + 1, K), N, K);
  console.log(`belief probe [${tag}]: R^2 mean ${(scores.reduce((a, b) => a + b) / K).toFixed(4)} (${scores.map((s) => s.toFixed(3)).join(",")})`);
}
probeR2((r) => r.l0, cfg.C, "layer0");
probeR2((r) => r.l1, cfg.C, "layer1/final");
const catX = (r: Row) => { const x = new Float64Array(2 * cfg.C); x.set(r.l0); x.set(r.l1, cfg.C); return x; };
probeR2(catX, 2 * cfg.C, "concat");

// ---- (c) twin separability: linear classifier on residuals, train/test split
function twinAccuracy(getX: (r: Row) => Float64Array, D: number, tag: string) {
  const sel = rows.filter((r) => r.cls >= 0);
  const split = Math.floor(sel.length * 0.7);
  const shuf = mulberry32(77);
  for (let i = sel.length - 1; i > 0; i--) { const j = Math.floor(shuf() * (i + 1)); [sel[i], sel[j]] = [sel[j], sel[i]]; }
  const train = sel.slice(0, split), test = sel.slice(split);
  const Dp = D + 1;
  const X = new Float64Array(train.length * Dp), Y = new Float64Array(train.length * 3);
  train.forEach((r, n) => { X.set(getX(r), n * Dp); X[n * Dp + D] = 1; Y[n * 3 + r.cls] = 1; });
  const W = solveRidge(X, Y, train.length, Dp, 3, 1e-3);
  let correct = 0;
  const conf = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for (const r of test) {
    const x = getX(r);
    const scores = [0, 1, 2].map((k) => {
      let a = W[D * 3 + k];
      for (let i = 0; i < D; i++) a += x[i] * W[i * 3 + k];
      return a;
    });
    const pred = scores.indexOf(Math.max(...scores));
    conf[r.cls][pred]++;
    if (pred === r.cls) correct++;
  }
  const counts = [0, 1, 2].map((c) => test.filter((r) => r.cls === c).length);
  const chance = Math.max(...counts) / test.length;
  console.log(`twin classifier [${tag}]: acc ${(correct / test.length).toFixed(4)} (majority-chance ${chance.toFixed(4)}, n_test=${test.length})`);
  console.log(`  confusion S/0/1: ${conf.map((r) => r.join(",")).join(" | ")}`);
  return { sel, W, D };
}
twinAccuracy((r) => r.l0, cfg.C, "layer0");
twinAccuracy((r) => r.l1, cfg.C, "layer1/final");
const { sel, W: Wtwin } = twinAccuracy(catX, 2 * cfg.C, "concat");

// ---- render: the linear readout itself. Plot each twin point at the barycentric
// position of the classifier's 3 class scores (clamped+normalized), colored by TRUE class.
// Same move as the Mess3 figure: predicted geometry, ground-truth color.
{
  const D = 2 * cfg.C;
  const V0 = [0.10, 0.88], V1 = [0.90, 0.88], V2 = [0.50, 0.14];
  const colors: [number, number, number][] = [[90, 90, 90], [220, 40, 40], [40, 80, 230]];
  const pts: Pt[] = [];
  for (const r of sel) {
    const x = catX(r);
    const s = [0, 1, 2].map((k) => {
      let a = Wtwin[D * 3 + k];
      for (let i = 0; i < D; i++) a += x[i] * Wtwin[i * 3 + k];
      return Math.max(0, a);
    });
    const sum = s[0] + s[1] + s[2] || 1;
    const p0 = s[0] / sum, p1 = s[1] / sum, p2 = s[2] / sum;
    pts.push({
      x: p0 * V0[0] + p1 * V1[0] + p2 * V2[0],
      y: p0 * V0[1] + p1 * V1[1] + p2 * V2[1],
      r: colors[r.cls][0], g: colors[r.cls][1], b: colors[r.cls][2],
    });
  }
  await Bun.write(`${outDir}rrxor_twins.png`, scatterPNG(700, 620, pts));
  console.log(`wrote ${outDir}rrxor_twins.png (linear readout simplex: gray=S red="0" blue="1" — all three predict next token 50/50)`);
}
await Bun.write(`${outDir}model_rrxor.json`, model.serialize());
