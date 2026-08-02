detectLandmarkRow = function detectLandmarkRow(scanEdges, opts = {}) {
  const out = [];
  out.windows = 0;
  out.survived = 0;
  const n = scanEdges ? scanEdges.length : 0;
  if (n < 8) return out;
  const sx = Float64Array.from(scanEdges, (e) => (typeof e === "number" ? e : e.x));

  const minWidth = opts.minWidth ?? 24;
  const maxWidth = opts.maxWidth ?? 400;
  // 48 not 32: a large crisp mark crosses ~34 physical rings near its equator and
  // anti-aliasing can double-peak several of them; at 32 the enumeration break
  // fired before j reached the far rim, silently discarding the full-rim window
  // of exactly the biggest, easiest marks
  const maxEdges = opts.maxEdges ?? 48;
  const crTol = opts.crTol ?? 0.012;
  const maxCands = opts.maxCands ?? 12; // fine-sweep budget per row
  const maxXRMSE = opts.maxXRMSE ?? 2.5;
  const minPairs = opts.minPairs ?? 7;
  const gapFrac = opts.gapFrac ?? 0.04; // gap penalty as a fraction of window width
  const rOut = LAYOUT.R;
  const rIn = LAYOUT.anchorRadii[1];
  const dMax = crCurve[crCurve.length - 1].d;

  // one candidate per window (i,j): the mirror-symmetric mid pair whose cross
  // ratio sits closest to the CR(d) curve
  const cands = [];
  for (let i = 0; i < n; i++) {
    for (let j = i + 7; j < n; j++) {
      const width = sx[j] - sx[i];
      if (width > maxWidth) break;
      if (j - i + 1 > maxEdges) break;
      if (width < minWidth) continue;
      out.windows++;
      const aLo = sx[i] + 0.26 * width, aHi = sx[i] + 0.48 * width;
      const bLo = sx[i] + 0.52 * width, bHi = sx[i] + 0.74 * width;
      let bestC = null;
      for (let a = i + 1; a < j; a++) {
        if (sx[a] < aLo) continue;
        if (sx[a] > aHi) break;
        const fa = (sx[a] - sx[i]) / width;
        for (let b = a + 1; b < j; b++) {
          if (sx[b] < bLo) continue;
          if (sx[b] > bHi) break;
          const fb = (sx[b] - sx[i]) / width;
          if (Math.abs(fa - (1 - fb)) > 0.06) continue; // not mirror-symmetric
          const cr = crossRatio(sx[i], sx[a], sx[b], sx[j]);
          let bestT = null, bestDist = Infinity;
          for (const t of crCurve) {
            const dist = crDistance(cr, t.cr);
            if (dist < bestDist) { bestDist = dist; bestT = t; }
          }
          if (bestDist > crTol) continue;
          if (!bestC || bestDist < bestC.crDist)
            bestC = { i, a, b, j, width, cr, crDist: bestDist, dSeed: bestT.d };
        }
      }
      if (bestC) {
        // largest edge-free run inside the window, as a width fraction: a true
        // mark is edge-dense throughout (rings everywhere), while a window
        // stitched across two neighbouring marks contains the blank background
        // between them
        let mg = 0;
        for (let e = i; e < j; e++) {
          const gp = sx[e + 1] - sx[e];
          if (gp > mg) mg = gp;
        }
        bestC.holeFrac = mg / width;
        cands.push(bestC);
      }
    }
  }
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

  for (const c of picked) {
    // full-band sweep over d: at each offset, derive the anchor map, align the
    // carrier template, refit on the matches. Alignment alone cannot pick d —
    // payload clutter lets a wrong offset align almost as well as the truth — so
    // the best hypothesis *per 1-unit d bin* is kept and the decoder's photometric
    // check (§4) makes the final call.
    // The mid pair's radius is itself ambiguous: (rim, r) quadruples sit on the
    // CR(d) curve not only for the designed r=10 but also for payload edges at
    // r=8 and r=6 (their cross ratios alias to wrong-d points on the curve), so
    // each d tries all three interpretations of the measured mid pair.
    const gapPenalty = gapFrac * c.width;
    const scan = sx.subarray(c.i, c.j + 1);
    const M = scan.length;
    const byBin = new Map();
    for (let d = 0; d <= dMax + 1e-9; d += 0.25) {
      const aOut = Math.sqrt(rOut * rOut - d * d);
      const kS = templateAtOffset(carrierTemplate, d);
      const N = kS.length;
      for (const rc of [rIn, 8, 6]) {
        if (d > rc - 0.5) continue;
        const aIn = Math.sqrt(rc * rc - d * d);
        let mob;
        try {
          mob = fitMobiusLS([
            { x: sx[c.i], k: -aOut },
            { x: sx[c.a], k: -aIn },
            { x: sx[c.b], k: aIn },
            { x: sx[c.j], k: aOut }
          ]);
        } catch { continue; }
        if (![mob.p, mob.q, mob.r, mob.s].every(isFinite)) continue;
        const proj = kS.map((k) => xFromK(mob, k));
        if (!proj.every(isFinite)) continue;
        dpScratch.ensure((N + 1) * (M + 1), Math.max(N, M));
        dpAlignFast(proj, N, scan, M, gapPenalty, dpScratch.map);
        const pairs = [];
        for (let t = 0; t < N; t++) {
          const s = dpScratch.map[t];
          if (s >= 0) pairs.push({ x: scan[s], k: kS[t] });
        }
        if (pairs.length < minPairs) continue;
        let mobR;
        try { mobR = fitMobiusLS(pairs); } catch { continue; }
        if (![mobR.p, mobR.q, mobR.r, mobR.s].every(isFinite)) continue;
        let ss = 0;
        for (const p of pairs) {
          const e = xFromK(mobR, p.k) - p.x;
          ss += e * e;
        }
        const xRMSE = Math.sqrt(ss / pairs.length);
        if (xRMSE > maxXRMSE) continue;
        const unmatched = N - pairs.length;
        const score = xRMSE * (1 + (2 * unmatched) / N);
        if (!isFinite(score)) continue;
        const bin = Math.floor(d);
        const cur = byBin.get(bin);
        if (!cur || score < cur.score)
          byBin.set(bin, { d, score, xRMSE, mobius: mobR, pairsUsed: pairs.length, rings: N });
      }
    }
    if (!byBin.size) continue;
    const dCands = [...byBin.values()].sort((p, q) => p.score - q.score);
    const best = dCands[0];
    out.push({
      startIndex: c.i,
      endIndex: c.j,
      mobius: best.mobius,
      dCandidates: dCands,
      anchors: [sx[c.i], sx[c.a], sx[c.b], sx[c.j]],
      d: best.d,
      dSeed: c.dSeed,
      crDist: c.crDist,
      holeFrac: c.holeFrac,
      xRMSE: best.xRMSE,
      score: best.score,
      pairsUsed: best.pairsUsed,
      rings: best.rings,
      footX: xFromK(best.mobius, 0),
      leftX: sx[c.i],
      rightX: sx[c.j]
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