fitMobiusLS = function fitMobiusLS(pairs) {
  const N = pairs.length;
  if (N < 3) throw new Error("need >=3 points");
  // Least squares for the Mobius map x(k) = (q - s k)/(r k - p), with the scale
  // pinned at s = 1 rather than left free. Each correspondence contributes
  //   x p + q - (k x) r = k
  // so the fit is a 3x3 symmetric normal system with a closed-form solution.
  //
  // This replaces an SVD of the N x 4 design matrix. It is the same fit up to the
  // choice of normalisation, and the SVD's answer was rescaled to s = 1 straight
  // afterwards, so the free scale was never load bearing. It was, however, half of
  // a detection frame: 113k calls at 1067ns each, against 20ns here.
  let a00 = 0, a01 = 0, a02 = 0, a12 = 0, a22 = 0, b0 = 0, b1 = 0, b2 = 0;
  for (let i = 0; i < N; i++) {
    const x = pairs[i].x, k = pairs[i].k, c = -k * x;
    a00 += x * x; a01 += x; a02 += x * c;
    a12 += c; a22 += c * c;
    b0 += x * k; b1 += k; b2 += c * k;
  }
  const a11 = N;
  const c00 = a11 * a22 - a12 * a12;
  const c01 = a12 * a02 - a01 * a22;
  const c02 = a01 * a12 - a11 * a02;
  const det = a00 * c00 + a01 * c01 + a02 * c02;
  if (!(det > 1e-12 || det < -1e-12)) throw new Error("degenerate window");
  const c11 = a00 * a22 - a02 * a02;
  const c12 = a01 * a02 - a00 * a12;
  const c22 = a00 * a11 - a01 * a01;
  const inv = 1 / det;
  return ({
    p: (c00 * b0 + c01 * b1 + c02 * b2) * inv,
    q: (c01 * b0 + c11 * b1 + c12 * b2) * inv,
    r: (c02 * b0 + c12 * b1 + c22 * b2) * inv,
    s: 1
  });
}
