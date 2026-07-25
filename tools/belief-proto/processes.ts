// HMM processes as token-labeled transition matrices T[token][from][to],
// transcribed from epsilon-transformers (adamimos) processes.py.

export type Process = {
  name: string;
  nStates: number;
  V: number;
  T: number[][][]; // T[k][i][j] = P(emit k, i->j | i)
  stationary: Float64Array;
};

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function stationaryOf(T: number[][][], nStates: number): Float64Array {
  // power-iterate pi = pi M, M[i][j] = sum_k T[k][i][j]
  const M: number[][] = [];
  for (let i = 0; i < nStates; i++) {
    M.push(new Array(nStates).fill(0));
    for (const Tk of T) for (let j = 0; j < nStates; j++) M[i][j] += Tk[i][j];
  }
  let pi = new Float64Array(nStates).fill(1 / nStates);
  for (let it = 0; it < 2000; it++) {
    const next = new Float64Array(nStates);
    for (let i = 0; i < nStates; i++)
      for (let j = 0; j < nStates; j++) next[j] += pi[i] * M[i][j];
    let s = 0;
    for (let j = 0; j < nStates; j++) s += next[j];
    for (let j = 0; j < nStates; j++) next[j] /= s;
    pi = next;
  }
  return pi;
}

export function mess3(x = 0.05, a = 0.85): Process {
  const b = (1 - a) / 2;
  const y = 1 - 2 * x;
  const ay = a * y, bx = b * x, by = b * y, ax = a * x;
  const T = [
    [[ay, bx, bx], [ax, by, bx], [ax, bx, by]],
    [[by, ax, bx], [bx, ay, bx], [bx, ax, by]],
    [[by, bx, ax], [bx, by, ax], [bx, bx, ay]],
  ];
  return { name: `mess3(x=${x},a=${a})`, nStates: 3, V: 3, T, stationary: stationaryOf(T, 3) };
}

export function rrxor(pR1 = 0.5, pR2 = 0.5): Process {
  // states: S=0, "0"=1, "1"=2, T=3, F=4
  const T: number[][][] = [0, 1].map(() =>
    Array.from({ length: 5 }, () => new Array(5).fill(0))
  );
  T[0][0][1] = pR1;
  T[1][0][2] = 1 - pR1;
  T[0][1][4] = pR2;
  T[1][1][3] = 1 - pR2;
  T[0][2][3] = pR2;
  T[1][2][4] = 1 - pR2;
  T[1][3][0] = 1.0;
  T[0][4][0] = 1.0;
  return { name: "rrxor", nStates: 5, V: 2, T, stationary: stationaryOf(T, 5) };
}

export function z1r(): Process {
  // S0 -0-> S1 -1-> SR -(0|1, 50/50)-> S0
  const T: number[][][] = [0, 1].map(() =>
    Array.from({ length: 3 }, () => new Array(3).fill(0))
  );
  T[0][0][1] = 1.0;
  T[1][1][2] = 1.0;
  T[0][2][0] = 0.5;
  T[1][2][0] = 0.5;
  return { name: "z1r", nStates: 3, V: 2, T, stationary: stationaryOf(T, 3) };
}

function fromT(name: string, T: number[][][], nStates: number): Process {
  return { name, nStates, V: T.length, T, stationary: stationaryOf(T, nStates) };
}

// noisy 3-cycle: state advances surely, emits arrival state with prob 1-2e
export function cycle3(e = 0.05): Process {
  const T = Array.from({ length: 3 }, (_, k) =>
    Array.from({ length: 3 }, (_, i) =>
      Array.from({ length: 3 }, (_, j) => (j === (i + 1) % 3 ? (k === j ? 1 - 2 * e : e) : 0))));
  return fromT("cycle3", T, 3);
}
// never repeat: state = last token; next token uniform over the other two (2e repeat noise)
export function norepeat3(e = 0.04): Process {
  const T = Array.from({ length: 3 }, (_, k) =>
    Array.from({ length: 3 }, (_, i) =>
      Array.from({ length: 3 }, (_, j) => (j === k ? (k === i ? 2 * e : (1 - 2 * e) / 2) : 0))));
  return fromT("norepeat3", T, 3);
}
// iid tokens with fixed letter frequencies
export function skew3(p: number[] = [0.7, 0.2, 0.1]): Process {
  const T = Array.from({ length: 3 }, (_, k) =>
    Array.from({ length: 3 }, () => Array.from({ length: 3 }, () => p[k] / 3)));
  return fromT("skew3", T, 3);
}
export function iid3(): Process {
  return skew3([1 / 3, 1 / 3, 1 / 3]);
}

// the §11 world zoo: 5 structurally distinct V=3 processes (validated in meta_worlds.ts)
export function zooWorlds(): Process[] {
  const worlds = [mess3(0.05, 0.85), cycle3(0.05), norepeat3(0.04), skew3([0.7, 0.2, 0.1]), iid3()];
  worlds[4].name = "iid3";
  return worlds;
}

// ---- exact meta-Bayes over a world mixture: joint posterior P(world, state | tokens)
export function metaInit(worlds: Process[]): Float64Array[] {
  return worlds.map((p) => Float64Array.from(p.stationary, (v) => v / worlds.length));
}
// P(next token | posterior)
export function metaPredictive(worlds: Process[], w: Float64Array[]): Float64Array {
  const V = worlds[0].V;
  const out = new Float64Array(V);
  for (let c = 0; c < worlds.length; c++) {
    const proc = worlds[c];
    for (let i = 0; i < proc.nStates; i++) {
      const wi = w[c][i];
      if (wi === 0) continue;
      for (let k = 0; k < V; k++) {
        const row = proc.T[k][i];
        let s = 0;
        for (let j = 0; j < proc.nStates; j++) s += row[j];
        out[k] += wi * s;
      }
    }
  }
  return out;
}
// condition on token k in place; returns P(k | history)
export function metaUpdate(worlds: Process[], w: Float64Array[], k: number): number {
  let z = 0;
  for (let c = 0; c < worlds.length; c++) {
    const proc = worlds[c];
    const n = proc.nStates;
    const prev = Float64Array.from(w[c]);
    for (let j = 0; j < n; j++) {
      let nv = 0;
      for (let i = 0; i < n; i++) nv += prev[i] * proc.T[k][i][j];
      w[c][j] = nv;
      z += nv;
    }
  }
  if (z > 0) for (const wc of w) for (let j = 0; j < wc.length; j++) wc[j] /= z;
  return z;
}
export function worldMarginal(w: Float64Array[]): Float64Array {
  return Float64Array.from(w, (wc) => wc.reduce((a, b) => a + b, 0));
}

export function sampleSeq(proc: Process, len: number, rng: () => number) {
  const tokens = new Int32Array(len);
  const states = new Int32Array(len + 1);
  // start state ~ stationary
  let s = 0;
  {
    let r = rng(), acc = 0;
    for (let i = 0; i < proc.nStates; i++) { acc += proc.stationary[i]; if (r < acc) { s = i; break; } }
  }
  states[0] = s;
  for (let t = 0; t < len; t++) {
    let r = rng(), acc = 0, done = false;
    for (let k = 0; k < proc.V && !done; k++)
      for (let j = 0; j < proc.nStates && !done; j++) {
        acc += proc.T[k][s][j];
        if (r < acc) { tokens[t] = k; s = j; done = true; }
      }
    if (!done) { tokens[t] = proc.V - 1; } // numeric edge; s unchanged
    states[t + 1] = s;
  }
  return { tokens, states };
}

// One Bayes step: eta'_j ∝ sum_i eta_i T[k][i][j]. Returns [eta', P(k | eta)].
export function beliefUpdate(proc: Process, eta: Float64Array, k: number): [Float64Array, number] {
  const n = proc.nStates;
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const ei = eta[i];
    if (ei === 0) continue;
    const row = proc.T[k][i];
    for (let j = 0; j < n; j++) out[j] += ei * row[j];
  }
  let s = 0;
  for (let j = 0; j < n; j++) s += out[j];
  if (s > 0) for (let j = 0; j < n; j++) out[j] /= s;
  return [out, s];
}

// beliefs[t] = belief after observing tokens[0..t] (starting from stationary prior).
export function beliefTrajectory(proc: Process, tokens: Int32Array | number[]) {
  let eta = Float64Array.from(proc.stationary);
  const out: Float64Array[] = [];
  const probs: number[] = [];
  for (let t = 0; t < tokens.length; t++) {
    const [next, p] = beliefUpdate(proc, eta, tokens[t] as number);
    out.push(next);
    probs.push(p);
    eta = next;
  }
  return { beliefs: out, tokenProbs: probs };
}

// P(next token | belief eta)
export function nextTokenDist(proc: Process, eta: Float64Array): Float64Array {
  const out = new Float64Array(proc.V);
  for (let k = 0; k < proc.V; k++) {
    let p = 0;
    for (let i = 0; i < proc.nStates; i++) {
      let row = 0;
      for (let j = 0; j < proc.nStates; j++) row += proc.T[k][i][j];
      p += eta[i] * row;
    }
    out[k] = p;
  }
  return out;
}
