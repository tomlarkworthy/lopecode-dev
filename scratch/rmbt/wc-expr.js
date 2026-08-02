windowCandidates = function windowCandidates(sx, opts = {}) {
  // Candidate generation, split out of detectLandmarkRow so strategies can be
  // swapped (opts.generator) against identical downstream code. Returns one
  // candidate per accepted window: the mirror-symmetric mid pair whose cross
  // ratio sits closest to the CR(d) curve.
  //
  //   "scan"    exhaustive over every (i,j). The reference.
  //   "vote"    sweep centres expanded directly into rim pairs. Fastest, but it
  //             finds fewer decodable rows per mark, and marks that then sit on
  //             the V-fit's 3-row minimum carry 2-7px of position error.
  //   "gated"   DEFAULT. The reflection sweep decides WHERE to enumerate; near a
  //             surviving centre the enumeration is exactly "scan", so the
  //             candidate set around a real mark -- and hence the accuracy -- is
  //             unchanged. A false centre costs a few wasted windows, never a
  //             wrong landmark; the cross-ratio and decode gates downstream
  //             still judge every window on its own merits.
  const n = sx.length;
  const minWidth = opts.minWidth ?? 24;
  const maxWidth = opts.maxWidth ?? 400;
  // 48 not 32: a large crisp mark crosses ~34 physical rings near its equator and
  // anti-aliasing can double-peak several of them; at 32 the enumeration break
  // fired before j reached the far rim, silently discarding the full-rim window
  // of exactly the biggest, easiest marks
  const maxEdges = opts.maxEdges ?? 48;
  const crTol = opts.crTol ?? 0.012;
  const generator = opts.generator ?? "gated";
  const cands = [];
  let windows = 0;

  // largest edge-free run inside a window, as a width fraction: a true mark is
  // edge-dense throughout (rings everywhere), while a window stitched across two
  // neighbouring marks contains the blank background between them
  const holeFracOf = (i, j, width) => {
    let mg = 0;
    for (let e = i; e < j; e++) {
      const gp = sx[e + 1] - sx[e];
      if (gp > mg) mg = gp;
    }
    return mg / width;
  };
  // given a rim pair (i,j), the best mid pair on the CR(d) curve
  const midPair = (i, j) => {
    const width = sx[j] - sx[i];
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
    return bestC;
  };
  const take = (i, j) => {
    windows++;
    const bestC = midPair(i, j);
    if (bestC) {
      bestC.holeFrac = holeFracOf(i, j, sx[j] - sx[i]);
      cands.push(bestC);
    }
  };

  if (generator === "scan") {
    for (let i = 0; i < n; i++) {
      for (let j = i + 7; j < n; j++) {
        const width = sx[j] - sx[i];
        if (width > maxWidth) break;
        if (j - i + 1 > maxEdges) break;
        if (width < minWidth) continue;
        take(i, j);
      }
    }
    return { cands, windows };
  }

  // Reflection sweep. A mark is concentric, so it is mirror-symmetric about its
  // centre and EVERY ring pair it contributes shares one midpoint. The key fact
  // (which took two broken histogram designs to see): the centre of a symmetric
  // edge set always lies BETWEEN its innermost mirror pair, so the only centre
  // hypotheses worth testing are the midpoints of near-adjacent edge pairs --
  // a linear sweep, not an O(n^2) vote. Each hypothesis is verified by walking
  // two pointers outward and counting mirrored offsets that agree within
  // mirrorTol; the count is a direct "how many ring pairs corroborate this
  // centre" statistic, where the histogram's raw pair-vote mostly measured
  // local edge density and let one busy stretch of the row starve real marks
  // out of a rank cap.
  //
  // mirrorTol is loose on purpose: a perspective image of a circle is NOT
  // exactly mirror-symmetric (that is why the decoder fits a Mobius map rather
  // than assuming symmetry), and matching mirrored edges to 2px lost the
  // foreshortened marks entirely.
  //
  // maxInnerGap kills most chimera centres for free: the midpoint between two
  // NEIGHBOURING marks is also a symmetry centre, but it sits in the blank
  // between them, so its nearest edges are far away -- whereas a real mark has
  // mid-sync edges close to its centre.
  //
  // No rank cap. Dense periodic texture (a 90-degree row through the screen
  // grid) is mirror-symmetric about every half-period point and produces fake
  // centres with pair counts far above any real mark's, so keeping the "best" N
  // centres is exactly backwards there. Fake centres are harmless to accuracy
  // -- they only admit windows the cross-ratio gate then rejects -- and after
  // suppression a typical row carries ~7 centres, so admitting all of them
  // still cuts enumeration hard.
  const mirrorTol = opts.mirrorTol ?? 5;
  const maxInnerGap = opts.maxInnerGap ?? 60;
  const minPairs = opts.minPairs ?? 5;
  const nmsPx = opts.centreSuppress ?? 20;
  const centreTol = opts.centreTol ?? 6;
  const raw = [];
  for (let i = 0; i < n - 1; i++) {
    for (let j = i + 1; j <= Math.min(i + 2, n - 1); j++) {
      if (sx[j] - sx[i] > maxInnerGap) continue;
      const c = (sx[i] + sx[j]) / 2;
      let l = i, r = j, pairs = 0;
      while (l >= 0 && r < n) {
        const dl = c - sx[l], dr = sx[r] - c;
        if (dl > maxWidth / 2 || dr > maxWidth / 2) break;
        if (Math.abs(dl - dr) <= mirrorTol) { pairs++; l--; r++; }
        else if (dl < dr) l--;
        else r++;
      }
      if (pairs >= minPairs) raw.push({ c, pairs });
    }
  }
  // suppression: the strongest corroboration wins its neighbourhood. 20px is
  // well under any plausible same-row mark spacing (marks are >=110px wide), so
  // it collapses one mark's cluster of near-identical hypotheses without ever
  // merging two real marks.
  raw.sort((a, b) => b.pairs - a.pairs);
  const centres = [];
  for (const cd of raw) {
    let near = false;
    for (const k of centres) if (Math.abs(k.c - cd.c) < nmsPx) { near = true; break; }
    if (!near) centres.push(cd);
  }

  if (generator === "gated") {
    // accept windows whose midpoint lands within centreTol of a sweep centre.
    // centreTol covers the perspective skew between a rim pair's midpoint and
    // the true centre (measured up to ~5px on the foreshortened marks).
    const accept = new Set();
    for (const k of centres) {
      const kc = Math.round(k.c);
      for (let o = -centreTol; o <= centreTol; o++) accept.add(kc + o);
    }
    for (let i = 0; i < n; i++) {
      for (let j = i + 7; j < n; j++) {
        const width = sx[j] - sx[i];
        if (width > maxWidth) break;
        if (j - i + 1 > maxEdges) break;
        if (width < minWidth) continue;
        if (!accept.has(Math.round((sx[i] + sx[j]) / 2))) continue;
        take(i, j);
      }
    }
    return { cands, windows };
  }

  // "vote": sweep centres expanded directly into the rim pairs centred there.
  // Everything downstream still has its say -- but see the header: fewer
  // decodable rows survive per mark, so this trades position accuracy for
  // speed and is not the default.
  const taken = new Set();
  for (const { c } of centres) {
    const pairs = [];
    for (let p = 0; p < n; p++) {
      const mirror = 2 * c - sx[p];
      if (mirror <= sx[p]) continue;
      let lo = p + 1, hi = n - 1, q = -1;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        if (Math.abs(sx[mid] - mirror) <= centreTol) { q = mid; break; }
        if (sx[mid] < mirror) lo = mid + 1; else hi = mid - 1;
      }
      if (q < 0) continue;
      const width = sx[q] - sx[p];
      if (width < minWidth || width > maxWidth) continue;
      if (q - p + 1 > maxEdges) continue;
      pairs.push({ p, q, width });
    }
    pairs.sort((a, b) => b.width - a.width);
    for (const { p, q } of pairs.slice(0, opts.pairsPerCentre ?? 6)) {
      const tag = p * 4096 + q;
      if (taken.has(tag)) continue;
      taken.add(tag);
      take(p, q);
    }
  }
  return { cands, windows };
}
