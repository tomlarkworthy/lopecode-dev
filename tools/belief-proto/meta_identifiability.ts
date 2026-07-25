// §11 identifiability check, no training: exact grid-Bayes joint posterior over
// (theta, hidden state) for a uniform prior on Mess3 parameter space.
// Measures contraction (posterior entropy over theta, credible area, posterior-mean
// error) vs position, and the meta-optimal loss vs the known-theta optimal loss.
import { mess3, sampleSeq, mulberry32, type Process } from "./processes";

const XR = [0.03, 0.2], AR = [0.6, 0.95];
const G = 16; // theta grid per axis
const CTX = 64;
const N_SEQ = 200;

// grid of processes
const grid: { x: number; a: number; proc: Process }[] = [];
for (let i = 0; i < G; i++)
  for (let j = 0; j < G; j++) {
    const x = XR[0] + ((i + 0.5) / G) * (XR[1] - XR[0]);
    const a = AR[0] + ((j + 0.5) / G) * (AR[1] - AR[0]);
    grid.push({ x, a, proc: mess3(x, a) });
  }
const M = grid.length, S = 3, V = 3;

// joint posterior over (theta, state): w[m*S+s]. Init: uniform over theta x stationary.
function initPosterior(): Float64Array {
  const w = new Float64Array(M * S);
  for (let m = 0; m < M; m++)
    for (let s = 0; s < S; s++) w[m * S + s] = (1 / M) * grid[m].proc.stationary[s];
  return w;
}
// predictive p(token k | history) = sum_m,s,s2 w[m,s] T_m[k][s][s2]
function predictive(w: Float64Array): number[] {
  const p = [0, 0, 0];
  for (let m = 0; m < M; m++) {
    const T = grid[m].proc.T;
    for (let s = 0; s < S; s++) {
      const ws = w[m * S + s];
      if (ws === 0) continue;
      for (let k = 0; k < V; k++) {
        const row = T[k][s];
        p[k] += ws * (row[0] + row[1] + row[2]);
      }
    }
  }
  return p;
}
// condition on observed token k (in place), return P(k)
function update(w: Float64Array, k: number): number {
  let z = 0;
  for (let m = 0; m < M; m++) {
    const T = grid[m].proc.T[k];
    const s0 = w[m * S], s1 = w[m * S + 1], s2 = w[m * S + 2];
    for (let s2i = 0; s2i < S; s2i++) {
      const nv = s0 * T[0][s2i] + s1 * T[1][s2i] + s2 * T[2][s2i];
      w[m * S + s2i] = nv;
      z += nv;
    }
  }
  for (let i = 0; i < M * S; i++) w[i] /= z;
  return z;
}
const thetaMarginal = (w: Float64Array) => {
  const t = new Float64Array(M);
  for (let m = 0; m < M; m++) t[m] = w[m * S] + w[m * S + 1] + w[m * S + 2];
  return t;
};
const entropyBits = (t: Float64Array) => {
  let e = 0;
  for (const v of t) if (v > 1e-300) e -= v * Math.log2(v);
  return e;
};
const credibleFrac = (t: Float64Array, mass: number) => {
  const sorted = Array.from(t).sort((a, b) => b - a);
  let acc = 0, n = 0;
  for (const v of sorted) { acc += v; n++; if (acc >= mass) break; }
  return n / M;
};

// aggregate over sequences with random true theta
const rng = mulberry32(77);
const positions = [0, 1, 2, 4, 8, 16, 32, 63];
const agg = positions.map(() => ({ ent: 0, cred90: 0, exErr: 0, eaErr: 0, metaLoss: 0, optLoss: 0 }));
for (let q = 0; q < N_SEQ; q++) {
  const xT = XR[0] + rng() * (XR[1] - XR[0]);
  const aT = AR[0] + rng() * (AR[1] - AR[0]);
  const world = mess3(xT, aT);
  const { tokens } = sampleSeq(world, CTX, rng);
  const w = initPosterior();
  // known-theta filter for the optimal-loss reference
  let eta = Float64Array.from(world.stationary);
  for (let t = 0; t < CTX; t++) {
    const pi = positions.indexOf(t);
    if (pi >= 0) {
      const th = thetaMarginal(w);
      agg[pi].ent += entropyBits(th);
      agg[pi].cred90 += credibleFrac(th, 0.9);
      let ex = 0, ea = 0;
      for (let m = 0; m < M; m++) { ex += th[m] * grid[m].x; ea += th[m] * grid[m].a; }
      agg[pi].exErr += Math.abs(ex - xT);
      agg[pi].eaErr += Math.abs(ea - aT);
      // per-token losses at this position
      const pm = predictive(w);
      agg[pi].metaLoss += -Math.log(pm[tokens[t]]);
      const po = [0, 1, 2].map((k) => {
        let s = 0;
        for (let si = 0; si < S; si++) for (let sj = 0; sj < S; sj++) s += eta[si] * world.T[k][si][sj];
        return s;
      });
      agg[pi].optLoss += -Math.log(po[tokens[t]]);
    }
    update(w, tokens[t]);
    // known-theta belief update
    const ne = new Float64Array(S);
    let z = 0;
    for (let sj = 0; sj < S; sj++) {
      for (let si = 0; si < S; si++) ne[sj] += eta[si] * world.T[tokens[t]][si][sj];
      z += ne[sj];
    }
    for (let sj = 0; sj < S; sj++) ne[sj] /= z;
    eta = ne;
  }
}
console.log("uniform prior over theta: x∈[" + XR + "], α∈[" + AR + "], grid " + G + "×" + G + ", " + N_SEQ + " worlds, ctx " + CTX);
console.log("max theta entropy = " + Math.log2(M).toFixed(2) + " bits (uniform)");
console.log("pos | H(θ) bits | 90% cred area | E|x̂-x| | E|α̂-α| | meta-loss | known-θ-loss");
positions.forEach((p, i) => {
  const a = agg[i];
  console.log(
    String(p).padStart(3) + " | " +
    (a.ent / N_SEQ).toFixed(2).padStart(9) + " | " +
    ((100 * a.cred90) / N_SEQ).toFixed(1).padStart(12) + "% | " +
    (a.exErr / N_SEQ).toFixed(4) + " | " +
    (a.eaErr / N_SEQ).toFixed(4) + " | " +
    (a.metaLoss / N_SEQ).toFixed(4).padStart(9) + " | " +
    (a.optLoss / N_SEQ).toFixed(4).padStart(9)
  );
});
