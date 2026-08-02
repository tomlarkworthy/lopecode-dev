fitMobiusInto = function fitMobiusInto(xs, ks, n, out) {
  // fitMobiusLS's arithmetic against caller-owned buffers, writing into a
  // caller-owned object, so the sweep allocates neither its inputs nor its
  // output. Same 3x3 normal system, same answer.
  let a00 = 0, a01 = 0, a02 = 0, a12 = 0, a22 = 0, b0 = 0, b1 = 0, b2 = 0;
  for (let i = 0; i < n; i++) {
    const x = xs[i], k = ks[i], c = -k * x;
    a00 += x * x; a01 += x; a02 += x * c;
    a12 += c; a22 += c * c;
    b0 += x * k; b1 += k; b2 += c * k;
  }
  const a11 = n;
  const c00 = a11 * a22 - a12 * a12;
  const c01 = a12 * a02 - a01 * a22;
  const c02 = a01 * a12 - a11 * a02;
  const det = a00 * c00 + a01 * c01 + a02 * c02;
  if (!(det > 1e-12 || det < -1e-12)) return false;
  const c11 = a00 * a22 - a02 * a02;
  const c12 = a01 * a02 - a00 * a12;
  const c22 = a00 * a11 - a01 * a01;
  const inv = 1 / det;
  out.p = (c00 * b0 + c01 * b1 + c02 * b2) * inv;
  out.q = (c01 * b0 + c11 * b1 + c12 * b2) * inv;
  out.r = (c02 * b0 + c12 * b1 + c22 * b2) * inv;
  out.s = 1;
  return isFinite(out.p) && isFinite(out.q) && isFinite(out.r);
}
