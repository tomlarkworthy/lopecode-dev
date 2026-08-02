function _detectLandmarkRow(LAYOUT,crCurve,crossRatio,crDistance,templateAtOffset,carrierTemplate,fitMobiusLS,xFromK,dpScratch,dpAlignFast) {return (function detectLandmarkRow(scanEdges, opts = {}) {
  const out = [];
  out.windows = 0;
  out.survived = 0;
  const n = scanEdges ? scanEdges.length : 0;
  if (n < 8) return out;
  const sx = Float64Array.from(scanEdges, (e) => (typeof e === "number" ? e : e.x));

  const minWidth = opts.minWidth ?? 24;
  const maxWidth = opts.maxWidth ?? 400;
  const maxEdges = opts.maxEdges ?? 32;
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
        