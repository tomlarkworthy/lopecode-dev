// The chord template at each swept offset. Offsets are quantised to 0.25, so
// there are ~35 of them and rebuilding one per hypothesis (33k times a frame)
// was pure waste.
const carrierTable = (function () {
  const out = [];
  for (let d = 0; d <= crCurve[crCurve.length - 1].d + 1e-9; d += 0.25)
    out.push(Float64Array.from(templateAtOffset(carrierTemplate, d)));
  return out;
})();
// Predicted cross ratio of the (rim, mid) quadruple at each swept offset, one row
// per mid-pair radius interpretation. A window is only admitted in the first place
// because its measured cross ratio sits on the r=10 curve, so most of the offsets
// the sweep used to try were inconsistent with the very measurement that admitted
// it -- 89 hypotheses per candidate, of which about 20 are consistent.
const crTable = (function () {
  const R = LAYOUT.R;
  return [LAYOUT.anchorRadii[1], 8, 6].map((rc) =>
    Float64Array.from(carrierTable, (_, di) => {
      const d = di * 0.25;
      if (d > rc - 0.5) return NaN;
      const aOut = Math.sqrt(R * R - d * d), aIn = Math.sqrt(rc * rc - d * d);
      return crossRatio(-aOut, -aIn, aIn, aOut);
    })
  );
})();
// fitMobiusLS's arithmetic against caller-owned buffers, writing into a caller-owned
// object, so the sweep allocates neither its inputs nor its output.
const fitMobiusInto = function fitMobiusInto(xs, ks, n, out) {
  let x0 = 0;
  for (let i = 0; i < n; i++) x0 += xs[i];
  x0 /= n;
  let sc = 0;
  for (let i = 0; i < n; i++) { const e = xs[i] - x0; sc += e * e; }
  sc = Math.sqrt(sc / n) || 1;
  let a00 = 0, a01 = 0, a02 = 0, a12 = 0, a22 = 0, b0 = 0, b1 = 0, b2 = 0;
  for (let i = 0; i < n; i++) {
    const u = (xs[i] - x0) / sc, k = ks[i], c = -k * u;
    a00 += u * u; a01 += u; a02 += u * c;
    a12 += c; a22 += c * c;
    b0 += u * k; b1 += k; b2 += c * k;
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
  const p = (c00 * b0 + c01 * b1 + c02 * b2) * inv;
  const q = (c01 * b0 + c11 * b1 + c12 * b2) * inv;
  const r = (c02 * b0 + c12 * b1 + c22 * b2) * inv;
  out.p = p; out.q = sc * q - x0 * p; out.r = r; out.s = sc - x0 * r;
  return isFinite(out.p) && isFinite(out.q) && isFinite(out.r) && isFinite(out.s);
};
// One set of buffers for the whole sweep. Safe to share because a row is scanned
// start to finish on one thread with no await inside; a worker gets its own copy
// of the module and therefore its own buffers.
const sweepScratch = (function () {
  const rings = carrierTemplate.length;
  const nBins = Math.floor(crCurve[crCurve.length - 1].d) + 1;
  return {
    midRadii: [LAYOUT.anchorRadii[1], 8, 6],
    proj: new Float64Array(rings),
    pairX: new Float64Array(rings),
    pairK: new Float64Array(rings),
    seedX: new Float64Array(4),
    seedK: new Float64Array(4),
    mob: { p: 0, q: 0, r: 0, s: 1 },
    mobR: { p: 0, q: 0, r: 0, s: 1 },
    nBins,
    used: new Uint8Array(nBins),
    d: new Float64Array(nBins),
    score: new Float64Array(nBins),
    rmse: new Float64Array(nBins),
    pairs: new Int32Array(nBins),
    rings: new Int32Array(nBins),
    p: new Float64Array(nBins),
    q: new Float64Array(nBins),
    r: new Float64Array(nBins),
    s: new Float64Array(nBins)
  };
})();
