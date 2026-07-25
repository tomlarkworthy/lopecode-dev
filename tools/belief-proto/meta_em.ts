// Can Baum-Welch learn the zoo mixture? The union of 5 worlds x 3 states IS a
// 15-state HMM (block diagonal), so EM can represent it in principle. This measures
// whether EM FINDS it: held-out predictive loss vs the exact meta-Bayes floor
// (0.8544) and the trained transformer (0.8601, meta_train.ts).
// usage: bun meta_em.ts [iters] [restarts]
import { zooWorlds, metaInit, metaUpdate, metaPredictive, sampleSeq, mulberry32, type Process } from "./processes";
import { emStep } from "./em_test";

const ITERS = parseInt(process.argv[2] || "150", 10);
const RESTARTS = parseInt(process.argv[3] || "3", 10);
const V = 3, LEN = 33;
const worlds = zooWorlds();
const K = worlds.length;

const rng = mulberry32(1234);
const train: Int32Array[] = [];
for (let q = 0; q < 1500; q++) train.push(sampleSeq(worlds[q % K], LEN, rng).tokens);
const held: Int32Array[] = [];
for (let q = 0; q < 400; q++) held.push(sampleSeq(worlds[q % K], LEN, rng).tokens);

// exact meta-Bayes floor on held-out (predict tokens 1..LEN-1 from prefix, like the transformer eval)
let floorSum = 0, floorN = 0;
for (const seq of held) {
  const w = metaInit(worlds);
  for (let t = 0; t < LEN - 1; t++) {
    metaUpdate(worlds, w, seq[t]);
    const pm = metaPredictive(worlds, w);
    floorSum += -Math.log(pm[seq[t + 1]]);
    floorN++;
  }
}
const FLOOR = floorSum / floorN;
console.log(`held-out meta-Bayes floor ${FLOOR.toFixed(4)} nats | iid ${Math.log(3).toFixed(4)} | transformer (meta_train) 0.8601`);

function stationaryOf(T: number[][][], nStates: number): Float64Array {
  const M: number[][] = [];
  for (let i = 0; i < nStates; i++) {
    M.push(new Array(nStates).fill(0));
    for (const Tk of T) for (let j = 0; j < nStates; j++) M[i][j] += Tk[i][j];
  }
  let pi = new Float64Array(nStates).fill(1 / nStates);
  for (let it = 0; it < 500; it++) {
    const next = new Float64Array(nStates);
    for (let i = 0; i < nStates; i++) for (let j = 0; j < nStates; j++) next[j] += pi[i] * M[i][j];
    let s = 0; for (let j = 0; j < nStates; j++) s += next[j];
    for (let j = 0; j < nStates; j++) next[j] /= s;
    pi = next;
  }
  return pi;
}

// held-out predictive loss of a learned HMM: filter forward, -log P(next token)
function heldOutLoss(T: number[][][], nStates: number): number {
  const pi = stationaryOf(T, nStates);
  let sum = 0, n = 0;
  for (const seq of held) {
    let eta = Float64Array.from(pi);
    for (let t = 0; t < LEN - 1; t++) {
      // condition on seq[t]
      const next = new Float64Array(nStates);
      for (let i = 0; i < nStates; i++) {
        if (eta[i] === 0) continue;
        const row = T[seq[t]][i];
        for (let j = 0; j < nStates; j++) next[j] += eta[i] * row[j];
      }
      let z = 0;
      for (let j = 0; j < nStates; j++) z += next[j];
      if (z <= 0) { eta = Float64Array.from(pi); continue; }
      for (let j = 0; j < nStates; j++) next[j] /= z;
      eta = next;
      // predict seq[t+1]
      let p = 0;
      for (let k = 0; k < V; k++) {
        if (k !== seq[t + 1]) continue;
        for (let i = 0; i < nStates; i++) {
          let row = 0;
          for (let j = 0; j < nStates; j++) row += T[k][i][j];
          p += eta[i] * row;
        }
      }
      sum += -Math.log(Math.max(p, 1e-12));
      n++;
    }
  }
  return sum / n;
}

function randomT(nStates: number, rand: () => number): number[][][] {
  const T: number[][][] = Array.from({ length: V }, () =>
    Array.from({ length: nStates }, () => new Array(nStates).fill(0)));
  for (let i = 0; i < nStates; i++) {
    let z = 0;
    for (let k = 0; k < V; k++) for (let j = 0; j < nStates; j++) { const v = 0.1 + rand(); T[k][i][j] = v; z += v; }
    for (let k = 0; k < V; k++) for (let j = 0; j < nStates; j++) T[k][i][j] /= z;
  }
  return T;
}

// also try EM initialized AT the truth (block-diagonal union) — the representability ceiling
function unionT(): number[][][] {
  const S = 15;
  const T: number[][][] = Array.from({ length: V }, () =>
    Array.from({ length: S }, () => new Array(S).fill(0)));
  worlds.forEach((proc, c) => {
    for (let k = 0; k < V; k++)
      for (let i = 0; i < 3; i++)
        for (let j = 0; j < 3; j++) T[k][c * 3 + i][c * 3 + j] = proc.T[k][i][j];
  });
  return T;
}
console.log(`union-HMM (truth, 15 states) held-out loss: ${heldOutLoss(unionT(), 15).toFixed(4)}  <- representability ceiling`);

for (const S of [5, 10, 15, 20]) {
  let best = Infinity, bestLL = -Infinity;
  for (let r = 0; r < RESTARTS; r++) {
    const rr = mulberry32(999 + 61 * r + S);
    let T = randomT(S, rr);
    let lastLL = -Infinity, ll = 0;
    let it = 0;
    for (; it < ITERS; it++) {
      const res = emStep(T, train, S, V);
      T = res.T; ll = res.logLik;
      if (it > 20 && ll - lastLL < 0.5) break; // plateau (total ll over 1500 seqs)
      lastLL = ll;
    }
    const hl = heldOutLoss(T, S);
    console.log(`  S=${String(S).padStart(2)} restart ${r}: ${it} iters, train ll/seq ${(ll / train.length).toFixed(3)}, held-out ${hl.toFixed(4)}`);
    if (hl < best) { best = hl; bestLL = ll; }
  }
  console.log(`S=${String(S).padStart(2)} BEST held-out ${best.toFixed(4)} (floor ${FLOOR.toFixed(4)}, gap ${(best - FLOOR).toFixed(4)})`);
}
