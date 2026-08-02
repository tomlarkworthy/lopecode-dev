const fitMobiusLS = function fitMobiusLS(pairs) {
  const N = pairs.length;
  if (N < 3) throw new Error("need >=3 points");
  let x0 = 0;
  for (let i = 0; i < N; i++) x0 += pairs[i].x;
  x0 /= N;
  let sc = 0;
  for (let i = 0; i < N; i++) { const e = pairs[i].x - x0; sc += e * e; }
  sc = Math.sqrt(sc / N) || 1;
  let a00 = 0, a01 = 0, a02 = 0, a12 = 0, a22 = 0, b0 = 0, b1 = 0, b2 = 0;
  for (let i = 0; i < N; i++) {
    const u = (pairs[i].x - x0) / sc, k = pairs[i].k, c = -k * u;
    a00 += u * u; a01 += u; a02 += u * c;
    a12 += c; a22 += c * c;
    b0 += u * k; b1 += k; b2 += c * k;
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
  const p = (c00 * b0 + c01 * b1 + c02 * b2) * inv;
  const q = (c01 * b0 + c11 * b1 + c12 * b2) * inv;
  const r = (c02 * b0 + c12 * b1 + c22 * b2) * inv;
  return { p, q: sc * q - x0 * p, r, s: sc - x0 * r };
};
