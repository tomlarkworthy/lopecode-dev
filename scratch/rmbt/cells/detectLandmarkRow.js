detectLandmarkRow = function detectLandmarkRow(scanEdges, opts = {}) {
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
  const binPairs = S.pairs, binRings = S.rings, binP = S.p, binQ = S.q, binR = S.r;
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
        const aIn = Math.sqrt(rc * rc - d * d);
        seedX[0] = xi; seedK[0] = -aOut;
        seedX[1] = xa; seedK[1] = -aIn;
        seedX[2] = xb; seedK[2] = aIn;
        seedX[3] = xj; seedK[3] = aOut;
        if (!fitMobiusInto(seedX, seedK, 4, mob)) continue;
        const mp = mob.p, mq = mob.q, mr = mob.r;
        let ok = true;
        for (let t = 0; t < N; t++) {
          const den = kS[t] * mr - mp;
          if (den > -1e-12 && den < 1e-12) { ok = false; break; }
          const v = (mq - kS[t]) / den;
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
        const rp = mobR.p, rq = mobR.q, rr = mobR.r;
        let ss = 0;
        for (let t = 0; t < np; t++) {
          const den = pairK[t] * rr - rp;
          if (den > -1e-12 && den < 1e-12) { ss = NaN; break; }
          const e = (rq - pairK[t]) / den - pairX[t];
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
        binP[bin] = rp; binQ[bin] = rq; binR[bin] = rr;
      }
    }
    if (!anyBin) continue;
    const dCands = [];
    for (let b = 0; b < nBins; b++) {
      if (!binUsed[b]) continue;
      dCands.push({
        d: binD[b], score: binScore[b], xRMSE: binRMSE[b],
        mobius: { p: binP[b], q: binQ[b], r: binR[b], s: 1 },
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
}
