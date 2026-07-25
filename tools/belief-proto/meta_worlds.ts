// §11 variant: posterior over K structurally distinct worlds (all V=3).
// Measures how fast P(world | tokens) concentrates on the truth.
import { mess3, sampleSeq, mulberry32, type Process } from "./processes";

// build a process from T[k][i][j] = P(emit k, next state j | state i)
function finish(name: string, T: number[][][], nStates: number): Process {
  const V = T.length;
  // stationary via power iteration on state-marginal transition
  let pi = new Float64Array(nStates).fill(1 / nStates);
  for (let it = 0; it < 500; it++) {
    const nx = new Float64Array(nStates);
    for (let i = 0; i < nStates; i++)
      for (let k = 0; k < V; k++)
        for (let j = 0; j < nStates; j++) nx[j] += pi[i] * T[k][i][j];
    let z = 0;
    for (let j = 0; j < nStates; j++) z += nx[j];
    for (let j = 0; j < nStates; j++) nx[j] /= z;
    pi = nx;
  }
  return { name, nStates, V, T, alphabet: ["A", "B", "C"], stateNames: ["0", "1", "2"], stationary: pi, params: {} } as any;
}
// noisy 3-cycle: state advances surely, emits arrival state 1-2e, others e each
function cycle3(e: number): Process {
  const T = Array.from({ length: 3 }, (_, k) =>
    Array.from({ length: 3 }, (_, i) =>
      Array.from({ length: 3 }, (_, j) => (j === (i + 1) % 3 ? (k === j ? 1 - 2 * e : e) : 0))));
  return finish("cycle3", T, 3);
}
// sticky walk: stay w.p. p, else jump uniformly; emits current state 1-2e
function sticky3(p: number, e: number): Process {
  const T = Array.from({ length: 3 }, (_, k) =>
    Array.from({ length: 3 }, (_, i) =>
      Array.from({ length: 3 }, (_, j) => {
        const move = j === i ? p : (1 - p) / 2;
        return move * (k === j ? 1 - 2 * e : e);
      })));
  return finish("sticky3", T, 3);
}
// iid uniform tokens
function iid3(): Process {
  const T = Array.from({ length: 3 }, () =>
    Array.from({ length: 3 }, () => Array.from({ length: 3 }, () => (1 / 3) * (1 / 3))));
  return finish("iid3", T, 3);
}

// never repeat: next token differs from current, uniform over the other two (e noise)
function norepeat3(e: number): Process {
  // state = last token; emit k!=i w.p. (1-2e)/2 + e ... simpler: choose k uniform over the two others w.p 1-2e, repeat w.p. 2e
  const T = Array.from({ length: 3 }, (_, k) =>
    Array.from({ length: 3 }, (_, i) =>
      Array.from({ length: 3 }, (_, j) => (j === k ? (k === i ? 2 * e : (1 - 2 * e) / 2) : 0))));
  return finish("norepeat3", T, 3);
}
// iid with skewed letter frequencies
function skew3(p: number[]): Process {
  const T = Array.from({ length: 3 }, (_, k) =>
    Array.from({ length: 3 }, () => Array.from({ length: 3 }, () => p[k] / 3)));
  return finish("skew3", T, 3);
}
const WORLDS: { name: string; proc: Process }[] = [
  { name: "mess3", proc: mess3(0.05, 0.85) },
  { name: "cycle3", proc: cycle3(0.05) },
  { name: "norepeat3", proc: norepeat3(0.04) },
  { name: "skew3", proc: skew3([0.7, 0.2, 0.1]) },
  { name: "iid3", proc: iid3() },
];
const K = WORLDS.length, S = 3;

const rng = mulberry32(99);
const CTX = 32, N_SEQ = 300;
const positions = [0, 1, 2, 3, 4, 6, 8, 12, 16, 24, 31];
// per true-world: mean posterior mass on truth at each position + mean H(world)
const stats = WORLDS.map(() => positions.map(() => ({ pTrue: 0, ent: 0, n: 0 })));
for (let q = 0; q < N_SEQ; q++) {
  const wi = q % K;
  const world = WORLDS[wi].proc;
  const { tokens } = sampleSeq(world, CTX, rng);
  // joint posterior w[k][s]
  const w = WORLDS.map(({ proc }) => Float64Array.from(proc.stationary, (v) => v / K));
  for (let t = 0; t < CTX; t++) {
    const pi = positions.indexOf(t);
    if (pi >= 0) {
      const masses = w.map((ws) => ws[0] + ws[1] + ws[2]);
      let ent = 0;
      for (const m of masses) if (m > 1e-300) ent -= m * Math.log2(m);
      stats[wi][pi].pTrue += masses[wi];
      stats[wi][pi].ent += ent;
      stats[wi][pi].n++;
    }
    const k = tokens[t];
    let z = 0;
    for (let c = 0; c < K; c++) {
      const T = WORLDS[c].proc.T[k];
      const s0 = w[c][0], s1 = w[c][1], s2 = w[c][2];
      for (let j = 0; j < S; j++) {
        const nv = s0 * T[0][j] + s1 * T[1][j] + s2 * T[2][j];
        w[c][j] = nv;
        z += nv;
      }
    }
    for (let c = 0; c < K; c++) for (let j = 0; j < S; j++) w[c][j] /= z;
  }
}
console.log("uniform prior over " + K + " structurally distinct worlds, " + N_SEQ + " sequences");
console.log("mean posterior mass on TRUE world by position:");
console.log("pos".padStart(4) + WORLDS.map((w) => w.name.padStart(15)).join("") + "   H(world) bits (avg)");
positions.forEach((p, i) => {
  let entAll = 0, nAll = 0;
  const row = WORLDS.map((_, wi) => {
    const s = stats[wi][i];
    entAll += s.ent; nAll += s.n;
    return (s.pTrue / s.n).toFixed(3).padStart(15);
  }).join("");
  console.log(String(p).padStart(4) + row + "   " + (entAll / nAll).toFixed(2));
});
