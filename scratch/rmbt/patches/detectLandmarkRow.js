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
const detectLandmarkRow = function detectLandmarkRow(scanEdges, opts = {}) {
  const out = [];
  out.windows = 0;
  out.survived = 0;
  const n = scanEdges ? scanEdges.length : 0;
  if (n < 8) return out;
  const sx = Float64Array.from(scanEdges, (e) => (typeof e === "number" ? e : e.x));

  const maxCands = opts.maxCands ?? 12; // fine-sweep budget per row
  const maxXRMSE = opts.maxXRMSE ?? 2.5;
  const minPairs = opts.minPairs ?? 7;
  const gapFrac = opts.gapFrac ?? 0.04; // gap penalty as a fraction of window width
  // How far a swept offset's predicted cross ratio may sit from the window's
  // measured one before the offset is skipped. Deliberately five times the
  // tolerance the window was ADMITTED under: the measured cross ratio picks the
  // right neighbourhood but not the right offset within it, and at the admission
  // tolerance the gate cut decodable rows (95 -> 58 on the angled frame) and put
  // 3px into the fused centres. At 0.06 the swept set is a superset of what wins,
  // and both frames decode MORE rows than the ungated sweep managed before the
  // fit was preconditioned.
  const dGateTol = opts.dGateTol ?? 0.06;
  const rOut = LAYOUT.R;
  const rIn = LAYOUT.anchorRadii[1];
  const dMax = crCurve[crCurve.length - 1].d;

  // candidate generation lives in windowCandidates so the exhaustive scan and
  // the reflection vote can be swapped (opts.generator) against identical
  // downstream code
  const gen = windowCandidates(sx, opts);
  const cands = gen.cands;
  out.windows = gen.windows;
  out.survived = cands.length;
  // spend the expensive alignment on the WIDEST curve-consistent windows: a real
  // mark's full-rim window is wider than any of its internal accidental windows,
  // and accidental quadruples routinely beat true ones on cross-ratio distance
  // (edge noise puts the truth at ~0.003; chance alignments can hit 0.0001).
  // Two refinements, both learned from mark-dense scenes: windows with a large
  // internal hole rank AFTER hole-free ones (they are usually stitched across
  // two marks — and on a symmetric grid such a chimera is centred exactly on the
  // mark between its parts), and at most 2 candidates may share an x-locality so
  // one busy region cannot starve the rest of the row.
  cands.sort(
    (p, q) =>
      (p.holeFrac > 0.24) - (q.holeFrac > 0.24) ||
      q.width - p.width ||
      p.crDist - q.crDist
  );
  const picked = [];
  for (const c of cands) {
    if (picked.length >= maxCands) break;
    const cx = (sx[c.i] + sx[c.j]) / 2;
    // anti-aliasing double-peaks rim edges, minting several near-identical
    // copies of the same window (same centre, width within a few px). Copies
    // must not count against the locality quota or they alone fill it — on a
    // symmetric grid the wide stitched window over marks A and C is centred
    // exactly on mark B, and its AA twins were evicting B's true window.
    let near = 0, twin = false;
    for (const k of picked) {
      if (Math.abs(k.cx - cx) >= 24) continue;
      if (Math.abs(k.width - c.width) < 0.08 * k.width) { twin = true; break; }
      near++;
    }
    if (twin || near >= 2) continue;
    c.cx = cx;
    picked.push(c);
  }

  const S = sweepScratch;
  const midRadii = S.midRadii, proj = S.proj, pairX = S.pairX, pairK = S.pairK;
  const seedX = S.seedX, seedK = S.seedK, mob = S.mob, mobR = S.mobR;
  const binUsed = S.used, binD = S.d, binScore = S.score, binRMSE = S.rmse;
  const binPairs = S.pairs, binRings = S.rings, binP = S.p, binQ = S.q, binR = S.r, binS = S.s;
  const nBins = S.nBins;
  // The d-sweep, on preallocated scratch. Semantics are unchanged from the
  // straightforward version: same offsets, same three mid-pair radii, same gates,
  // same best-per-1-unit-d-bin. What is gone is the allocation -- a template array,
  // a projection array, one object per matched ring and one per bin, all minted
  // ~85k times a frame. That churn, not the arithmetic, was over half the frame.
  for (const c of picked) {
    const gapPenalty = gapFrac * c.width;
    const scan = sx.subarray(c.i, c.j + 1);
    const M = scan.length;
    const xi = sx[c.i], xa = sx[c.a], xb = sx[c.b], xj = sx[c.j];
    binUsed.fill(0, 0, nBins);
    let anyBin = false;
    for (let di = 0; di < carrierTable.length; di++) {
      const d = di * 0.25;
      const aOut = Math.sqrt(rOut * rOut - d * d);
      const kS = carrierTable[di];
      const N = kS.length;
      dpScratch.ensure((N + 1) * (M + 1), N > M ? N : M);
      const bin = Math.floor(d);
      for (let ri = 0; ri < 3; ri++) {
        const rc = midRadii[ri];
        if (d > rc - 0.5) continue;
        if (crDistance(c.cr, crTable[ri][di]) > dGateTol) continue;
        const aIn = Math.sqrt(rc * rc - d * d);
        seedX[0] = xi; seedK[0] = -aOut;
        seedX[1] = xa; seedK[1] = -aIn;
        seedX[2] = xb; seedK[2] = aIn;
        seedX[3] = xj; seedK[3] = aOut;
        if (!fitMobiusInto(seedX, seedK, 4, mob)) continue;
        const mp = mob.p, mq = mob.q, mr = mob.r, ms = mob.s;
        let ok = true;
        for (let t = 0; t < N; t++) {
          const den = kS[t] * mr - mp;
          if (den > -1e-12 && den < 1e-12) { ok = false; break; }
          const v = (mq - kS[t] * ms) / den;
          if (!isFinite(v)) { ok = false; break; }
          proj[t] = v;
        }
        if (!ok) continue;
        dpAlignFast(proj, N, scan, M, gapPenalty, dpScratch.map);
        let np = 0;
        for (let t = 0; t < N; t++) {
          const s = dpScratch.map[t];
          if (s >= 0) { pairX[np] = scan[s]; pairK[np] = kS[t]; np++; }
        }
        if (np < minPairs) continue;
        if (!fitMobiusInto(pairX, pairK, np, mobR)) continue;
        const rp = mobR.p, rq = mobR.q, rr = mobR.r, rs = mobR.s;
        let ss = 0;
        for (let t = 0; t < np; t++) {
          const den = pairK[t] * rr - rp;
          if (den > -1e-12 && den < 1e-12) { ss = NaN; break; }
          const e = (rq - pairK[t] * rs) / den - pairX[t];
          ss += e * e;
        }
        const xRMSE = Math.sqrt(ss / np);
        if (!(xRMSE <= maxXRMSE)) continue;
        const score = xRMSE * (1 + (2 * (N - np)) / N);
        if (!isFinite(score)) continue;
        if (binUsed[bin] && binScore[bin] <= score) continue;
        binUsed[bin] = 1; anyBin = true;
        binD[bin] = d; binScore[bin] = score; binRMSE[bin] = xRMSE;
        binPairs[bin] = np; binRings[bin] = N;
        binP[bin] = rp; binQ[bin] = rq; binR[bin] = rr; binS[bin] = rs;
      }
    }
    if (!anyBin) continue;
    const dCands = [];
    for (let b = 0; b < nBins; b++) {
      if (!binUsed[b]) continue;
      dCands.push({
        d: binD[b], score: binScore[b], xRMSE: binRMSE[b],
        mobius: { p: binP[b], q: binQ[b], r: binR[b], s: binS[b] },
        pairsUsed: binPairs[b], rings: binRings[b]
      });
    }
    dCands.sort((p, q) => p.score - q.score);
    const best = dCands[0];
    out.push({
      startIndex: c.i,
      endIndex: c.j,
      mobius: best.mobius,
      dCandidates: dCands,
      anchors: [xi, xa, xb, xj],
      d: best.d,
      dSeed: c.dSeed,
      crDist: c.crDist,
      holeFrac: c.holeFrac,
      xRMSE: best.xRMSE,
      score: best.score,
      pairsUsed: best.pairsUsed,
      rings: best.rings,
      footX: xFromK(best.mobius, 0),
      leftX: xi,
      rightX: xj
    });
  }

  // non-maximum suppression by coverage then residual. runPipeline defers this
  // until after decoding (opts.nms === false) so a junk window cannot eclipse a
  // decodable one purely on edge-alignment merit.
  if (opts.nms !== false) {
    out.sort((p, q) => q.pairsUsed - p.pairsUsed || p.score - q.score);
    const accepted = [];
    for (const c of out) {
      const clash = accepted.some(
        (a) => !(c.endIndex < a.startIndex || c.startIndex > a.endIndex)
      );
      if (!clash) accepted.push(c);
    }
    accepted.windows = out.windows;
    accepted.survived = out.survived;
    return accepted;
  }
  return out;
};
