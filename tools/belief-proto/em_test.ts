// Baum-Welch EM for token-labeled transition matrices (unscaled forward-backward,
// safe for short sequences). Validates recovery of Mess3 up to state permutation.
import { mess3, z1r, sampleSeq, mulberry32, type Process } from "./processes";

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

export function emStep(Tc: number[][][], seqs: Int32Array[], nStates: number, V: number) {
  const counts: number[][][] = Array.from({ length: V }, () =>
    Array.from({ length: nStates }, () => new Array(nStates).fill(0)));
  const pi = stationaryOf(Tc, nStates);
  let ll = 0;
  for (const seq of seqs) {
    const L = seq.length;
    const alpha: Float64Array[] = [Float64Array.from(pi)];
    for (let t = 0; t < L; t++) {
      const a = alpha[t], next = new Float64Array(nStates);
      for (let i = 0; i < nStates; i++) {
        if (a[i] === 0) continue;
        const row = Tc[seq[t]][i];
        for (let j = 0; j < nStates; j++) next[j] += a[i] * row[j];
      }
      alpha.push(next);
    }
    let P = 0;
    for (let i = 0; i < nStates; i++) P += alpha[L][i];
    if (P <= 0) continue;
    ll += Math.log(P);
    const beta: Float64Array[] = new Array(L + 1);
    beta[L] = new Float64Array(nStates).fill(1);
    for (let t = L - 1; t >= 0; t--) {
      const b = new Float64Array(nStates);
      for (let i = 0; i < nStates; i++) {
        let acc = 0;
        const row = Tc[seq[t]][i];
        for (let j = 0; j < nStates; j++) acc += row[j] * beta[t + 1][j];
        b[i] = acc;
      }
      beta[t] = b;
    }
    for (let t = 0; t < L; t++)
      for (let i = 0; i < nStates; i++) {
        const ai = alpha[t][i];
        if (ai === 0) continue;
        const row = Tc[seq[t]][i];
        for (let j = 0; j < nStates; j++)
          counts[seq[t]][i][j] += (ai * row[j] * beta[t + 1][j]) / P;
      }
  }
  const Tn: number[][][] = Array.from({ length: V }, () =>
    Array.from({ length: nStates }, () => new Array(nStates).fill(0)));
  for (let i = 0; i < nStates; i++) {
    let rowSum = 0;
    for (let k = 0; k < V; k++) for (let j = 0; j < nStates; j++) rowSum += counts[k][i][j];
    for (let k = 0; k < V; k++)
      for (let j = 0; j < nStates; j++)
        Tn[k][i][j] = rowSum > 0 ? counts[k][i][j] / rowSum : 1 / (V * nStates);
  }
  return { T: Tn, logLik: ll };
}

function perms<T2>(xs: T2[]): T2[][] {
  if (xs.length <= 1) return [xs];
  const out: T2[][] = [];
  xs.forEach((x, i) => {
    for (const rest of perms([...xs.slice(0, i), ...xs.slice(i + 1)])) out.push([x, ...rest]);
  });
  return out;
}

export function alignToTruth(Tl: number[][][], Tt: number[][][], nStates: number, V: number) {
  let best: number[] = [], bestErr = Infinity;
  for (const p of perms(Array.from({ length: nStates }, (_, i) => i))) {
    let err = 0;
    for (let k = 0; k < V; k++)
      for (let i = 0; i < nStates; i++)
        for (let j = 0; j < nStates; j++) err += Math.abs(Tl[k][p[i]][p[j]] - Tt[k][i][j]);
    if (err < bestErr) { bestErr = err; best = p; }
  }
  const Ta: number[][][] = Array.from({ length: V }, (_, k) =>
    Array.from({ length: nStates }, (_, i) =>
      Array.from({ length: nStates }, (_, j) => Tl[k][best[i]][best[j]])));
  return { T: Ta, err: bestErr };
}

if (import.meta.main) {
  for (const proc of [mess3(0.05, 0.85), z1r()]) {
    const rng = mulberry32(5);
    const seqs: Int32Array[] = [];
    for (let s = 0; s < 300; s++) seqs.push(sampleSeq(proc, 16, rng).tokens);
    // random positive init
    const irng = mulberry32(9);
    let T: number[][][] = Array.from({ length: proc.V }, () =>
      Array.from({ length: proc.nStates }, () => Array.from({ length: proc.nStates }, () => 0.1 + irng())));
    for (let i = 0; i < proc.nStates; i++) {
      let s = 0;
      for (let k = 0; k < proc.V; k++) for (let j = 0; j < proc.nStates; j++) s += T[k][i][j];
      for (let k = 0; k < proc.V; k++) for (let j = 0; j < proc.nStates; j++) T[k][i][j] /= s;
    }
    let ll = 0;
    for (let it = 0; it < 300; it++) {
      const r = emStep(T, seqs, proc.nStates, proc.V);
      T = r.T; ll = r.logLik;
    }
    const { err } = alignToTruth(T, proc.T, proc.nStates, proc.V);
    console.log(`${proc.name}: final logLik ${ll.toFixed(1)}, aligned L1 error ${err.toFixed(3)} (${(err / (proc.V * proc.nStates * proc.nStates)).toFixed(4)}/entry)`);
  }
}
