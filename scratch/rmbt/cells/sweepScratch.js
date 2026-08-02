sweepScratch = {
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
    r: new Float64Array(nBins)
  };
}
