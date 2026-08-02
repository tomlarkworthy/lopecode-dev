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
