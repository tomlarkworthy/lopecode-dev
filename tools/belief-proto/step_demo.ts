// Steppable next-token prediction machine: B=1 inference clone of the trained
// Mess3 model, stepped token by token. At each step compare the model's
// next-token distribution to the optimal (belief-state) prediction, and the
// probe-projected residual point to the true Bayesian belief.
// usage: bun step_demo.ts
import { mess3, beliefTrajectory, nextTokenDist, mulberry32 } from "./processes";
import { GPT, type Cfg } from "./gpt";
import { makeEvalSet, collectProbeData } from "./eval_utils";
import { solveRidge } from "./probe";

const outDir = new URL("./out/", import.meta.url).pathname;
const proc = mess3(0.05, 0.85);
const trained = GPT.deserialize(await Bun.file(`${outDir}model_mess3_parallel.json`).text());
const cfgT = trained.cfg;

// B=1 inference clone (weights are independent of batch size)
const cfg1: Cfg = { ...cfgT, B: 1 };
const model = new GPT(cfg1, mulberry32(0));
model.setWeights(trained.getWeights());

// sanity: padded-prefix prediction must equal full-context prediction at same position
{
  const rng = mulberry32(3);
  const full = new Int32Array(cfgT.T);
  for (let t = 0; t < cfgT.T; t++) full[t] = Math.floor(rng() * cfgT.V);
  for (const n of [1, 3, 7]) {
    const padded = new Int32Array(cfgT.T); // zeros beyond prefix
    padded.set(full.subarray(0, n));
    model.forward(padded, null);
    const a = Array.from(model.act.probs.subarray((n - 1) * cfgT.V, n * cfgT.V));
    model.forward(full, null);
    const b = Array.from(model.act.probs.subarray((n - 1) * cfgT.V, n * cfgT.V));
    const diff = Math.max(...a.map((v, i) => Math.abs(v - b[i])));
    if (diff > 1e-12) throw new Error(`causal padding violated at n=${n}: ${diff}`);
  }
  console.log("padding sanity: prefix-padded predictions exactly match full-context (causal ✓)");
}

// fit the probe once (on the batch-sized trained model for speed)
const ev = makeEvalSet(proc, cfgT, 1000);
const { X, Y, N, D, K } = collectProbeData(trained, cfgT, ev, 960);
const W = solveRidge(X, Y, N, D, K, 1e-4);

function stepPredict(prefix: number[]) {
  const t0 = performance.now();
  const padded = new Int32Array(cfgT.T);
  padded.set(prefix.slice(-cfgT.T)); // sliding window if prefix > ctx
  const n = Math.min(prefix.length, cfgT.T);
  model.forward(padded, null);
  const dist = Array.from(model.act.probs.subarray((n - 1) * cfgT.V, n * cfgT.V));
  // probe-projected belief from the residual at the last position
  const res = model.act[`l${cfgT.L - 1}.res3`].subarray((n - 1) * cfgT.C, n * cfgT.C);
  const etaHat = [0, 1, 2].map((k) => {
    let a = W[cfgT.C * K + k];
    for (let c = 0; c < cfgT.C; c++) a += res[c] * W[c * K + k];
    return a;
  });
  return { dist, etaHat, ms: performance.now() - t0 };
}

// scripted user session: normal steps, then force a rare token to show Bayesian surprise
const TOK = "ABC";
const rng = mulberry32(2026);
const prefix: number[] = [0]; // user presses "A"
console.log("\n tok | model P(A,B,C)      | optimal P(A,B,C)    | KL(m||o) | true belief         | probe belief        | L1   | ms");
let script: (number | null)[] = [null, null, null, null, null, 1, null, null, null]; // null = sample from model; forced "B" mid-way
for (const forced of script) {
  const { dist, etaHat, ms } = stepPredict(prefix);
  const { beliefs } = beliefTrajectory(proc, prefix.slice(-cfgT.T));
  const eta = beliefs[beliefs.length - 1];
  const opt = nextTokenDist(proc, eta);
  let kl = 0;
  for (let k = 0; k < 3; k++) kl += dist[k] * Math.log(dist[k] / Math.max(opt[k], 1e-12));
  const l1 = etaHat.reduce((a, v, i) => a + Math.abs(v - eta[i]), 0);
  const f = (xs: ArrayLike<number>) => Array.from(xs, (v) => v.toFixed(3)).join(" ");
  console.log(`  ${TOK[prefix[prefix.length - 1]]}  | ${f(dist)} | ${f(opt)} | ${kl.toFixed(4)}   | ${f(eta)} | ${f(etaHat)} | ${l1.toFixed(3)} | ${ms.toFixed(2)}`);
  // choose next token
  let next: number;
  if (forced !== null) next = forced;
  else {
    const r = rng();
    next = dist[0] > r ? 0 : dist[0] + dist[1] > r ? 1 : 2;
  }
  prefix.push(next);
}
console.log(`\n(forced a low-probability token mid-sequence — watch belief and predictions jump, then re-converge)`);
