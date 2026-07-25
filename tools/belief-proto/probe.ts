// Linear regression from residual activations to belief states (ridge, closed form).

export function solveRidge(X: Float64Array, Y: Float64Array, N: number, D: number, K: number, lambda = 1e-6): Float64Array {
  // A = X'X + lambda I (D x D), B = X'Y (D x K); solve A W = B
  const A = new Float64Array(D * D);
  const B = new Float64Array(D * K);
  for (let n = 0; n < N; n++) {
    const xo = n * D, yo = n * K;
    for (let i = 0; i < D; i++) {
      const xi = X[xo + i];
      if (xi === 0) continue;
      for (let j = i; j < D; j++) A[i * D + j] += xi * X[xo + j];
      for (let k = 0; k < K; k++) B[i * K + k] += xi * Y[yo + k];
    }
  }
  for (let i = 0; i < D; i++) {
    A[i * D + i] += lambda;
    for (let j = 0; j < i; j++) A[i * D + j] = A[j * D + i];
  }
  // gaussian elimination with partial pivoting, augmented with B
  const idx = Array.from({ length: D }, (_, i) => i);
  for (let col = 0; col < D; col++) {
    let piv = col;
    for (let r = col + 1; r < D; r++) if (Math.abs(A[idx[r] * D + col]) > Math.abs(A[idx[piv] * D + col])) piv = r;
    [idx[col], idx[piv]] = [idx[piv], idx[col]];
    const prow = idx[col];
    const pval = A[prow * D + col];
    for (let r = col + 1; r < D; r++) {
      const row = idx[r];
      const f = A[row * D + col] / pval;
      if (f === 0) continue;
      for (let j = col; j < D; j++) A[row * D + j] -= f * A[prow * D + j];
      for (let k = 0; k < K; k++) B[row * K + k] -= f * B[prow * K + k];
    }
  }
  const W = new Float64Array(D * K);
  for (let col = D - 1; col >= 0; col--) {
    const row = idx[col];
    for (let k = 0; k < K; k++) {
      let acc = B[row * K + k];
      for (let j = col + 1; j < D; j++) acc -= A[row * D + j] * W[j * K + k];
      W[col * K + k] = acc / A[row * D + col];
    }
  }
  return W;
}

export function predict(X: Float64Array, W: Float64Array, N: number, D: number, K: number): Float64Array {
  const out = new Float64Array(N * K);
  for (let n = 0; n < N; n++)
    for (let i = 0; i < D; i++) {
      const xi = X[n * D + i];
      if (xi === 0) continue;
      for (let k = 0; k < K; k++) out[n * K + k] += xi * W[i * K + k];
    }
  return out;
}

export function r2(Y: Float64Array, Yhat: Float64Array, N: number, K: number): number[] {
  const out: number[] = [];
  for (let k = 0; k < K; k++) {
    let mean = 0;
    for (let n = 0; n < N; n++) mean += Y[n * K + k];
    mean /= N;
    let ssRes = 0, ssTot = 0;
    for (let n = 0; n < N; n++) {
      const d = Y[n * K + k] - Yhat[n * K + k];
      ssRes += d * d;
      const e = Y[n * K + k] - mean;
      ssTot += e * e;
    }
    out.push(1 - ssRes / Math.max(ssTot, 1e-12));
  }
  return out;
}
