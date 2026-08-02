// PROTOTYPE: solve the chord offset instead of sweeping for it.
//
// A mark is symmetric about its centre, so every ring is crossed twice, at +k
// and -k. A Mobius map sends that pairing to a projective INVOLUTION on the scan
// line, and an involution is fixed by its two fixed points P = M(0) (the mark's
// foot) and Q = M(inf) (the vanishing point). Crucially those depend only on the
// PAIRING of the four anchors -- (xi,xj) is one symmetric pair, (xa,xb) the other
// -- and NOT on d. So the involution can be computed before d is known.
//
// Put t = (x-P)/(x-Q). Then t sends P->0 and Q->inf, so t = c*k exactly. Hence
//     v := t^2 = c^2 * k^2 = c^2 * (r^2 - d^2) = A*r^2 + B,
// linear in r^2 with A = c^2 and B = -c^2 d^2. Two known correspondences give A
// and B in closed form, and
//     d = sqrt(-B/A).
// The outer anchor pair IS the rim (r=R) and the inner pair is one of the three
// mid radii, so there are exactly 3 hypotheses per window -- not 35 offsets x 3
// radii -- and d falls out of each as arithmetic.
const LAYOUT = await get("LAYOUT");
const windowCandidates = await get("windowCandidates");
const detectLandmarkRow = await get("detectLandmarkRow");
const edges1Dsub = await get("edges1Dsub");
const rowOf = await get("rowOf");
const edgeThreshold = await get("edgeThreshold");
const testFrameBank = await get("testFrameBank");
const scanLattice = await get("scanLattice");
const decodeLandmark = await get("decodeLandmark");
const xFromK = await get("xFromK");
const fitMobiusInto = await get("fitMobiusInto");

const MIDS = [LAYOUT.anchorRadii[1], 8, 6];
// every radius at which an edge CAN appear (band boundaries), used to score how
// much of the observed edge set a hypothesis explains
const ALLR = [...new Set(LAYOUT.bands.flatMap(([r0, r1]) => [r0, r1]))]
  .filter((r) => r > 0)
  .sort((a, b) => a - b);

// nearest legal radius in O(1): r is bounded by R, so quantise to 1/8 unit and
// precompute the nearest band boundary for every bucket. The linear scan over
// ALLR this replaces was the prototype's dominant cost -- 15 comparisons per
// edge, per refit iteration, per arm.
const LUTQ = 8, LUTN = Math.ceil(LAYOUT.R * LUTQ) + 2;
const LUT_R = new Float64Array(LUTN);
for (let i = 0; i < LUTN; i++) {
  const r = i / LUTQ;
  let bd = Infinity, br = -1;
  for (const cand of ALLR) { const e = Math.abs(cand - r); if (e < bd) { bd = e; br = cand; } }
  LUT_R[i] = br;
}
const nearestR = (r) => {
  const i = (r * LUTQ + 0.5) | 0;
  return i >= 0 && i < LUTN ? LUT_R[i] : -1;
};
const fitX = new Float64Array(128), fitK = new Float64Array(128);
const fitX2 = new Float64Array(128), fitK2 = new Float64Array(128);
const SKIP = 0.55 * 0.55;   // cost of leaving an observed edge unexplained
const dp = new Float64Array(160 * 40), bp = new Uint8Array(160 * 40);
const ord = [];
const asgX = new Float64Array(128), asgR = new Float64Array(128), asgS = new Int8Array(128);
const mobOut = { p: 0, q: 0, r: 0, s: 0 };
const rmseOf = (mob, xs, ks, n) => {
  if (n < 2) return Infinity;
  let ss = 0;
  for (let i = 0; i < n; i++) {
    const den = ks[i] * mob.r - mob.p;
    if (!(Math.abs(den) > 1e-12)) return Infinity;
    const e = (mob.q - ks[i] * mob.s) / den - xs[i];
    ss += e * e;
  }
  return Math.sqrt(ss / n);
};
const rej = { xrmse: 0, degen: 0, elliptic: 0, foot: 0, tinf: 0, slope: 0, chord: 0, inliers: 0, carrier: 0, none: 0, kept: 0 };
function detectRowInvolution(scanEdges, opts = {}) {
  const out = [];
  const n = scanEdges ? scanEdges.length : 0;
  out.windows = 0; out.survived = 0;
  if (n < 8) return out;
  // edges1Dsub yields edge OBJECTS; every downstream routine wants plain numbers
  const sx = Float64Array.from(scanEdges, (e) => (typeof e === "number" ? e : e.x));
  const maxCands = opts.maxCands ?? 12;
  const minInliers = opts.minInliers ?? 7;
  const tolR = opts.tolR ?? 0.9;
  const minCarrier = opts.minCarrier ?? 3;
  const R = LAYOUT.R;
  const dMax = opts.dMax ?? 8.5;

  const gen = windowCandidates(sx, opts);
  out.windows = gen.windows;
  out.survived = gen.cands.length;
  const cands = gen.cands.slice();
  cands.sort(
    (p, q) =>
      (p.holeFrac > 0.24) - (q.holeFrac > 0.24) || q.width - p.width || p.crDist - q.crDist
  );
  const picked = [];
  for (const c of cands) {
    if (picked.length >= maxCands) break;
    const cx = (sx[c.i] + sx[c.j]) / 2;
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
    const xi = sx[c.i], xa = sx[c.a], xb = sx[c.b], xj = sx[c.j];
    // involution swapping (xi,xj) and (xa,xb):  A*x*x' + B*(x+x') + C = 0
    const S1 = xi + xj, P1 = xi * xj;
    const S2 = xa + xb, P2 = xa * xb;
    const al = S2 - S1, be = P1 - P2, ga = P2 * S1 - P1 * S2;
    const lo = Math.min(xi, xj), hi = Math.max(xi, xj);
    const span = hi - lo;
    let P, Q, affine = false;
    // al -> 0 is the AFFINE case, not a degeneracy: a frontal mark has
    // xi+xj == xa+xb exactly, the vanishing point is at infinity and the
    // involution is a plain reflection x + x' = -ga/be. Treating that as
    // degenerate rejects every unforeshortened mark, which is most of them.
    if (Math.abs(al) * span <= 1e-9 * Math.abs(be)) {
      if (Math.abs(be) < 1e-12) { rej.degen++; continue; }
      P = -ga / (2 * be);
      Q = Infinity;
      affine = true;
    } else {
      const disc = be * be - al * ga;
      if (!(disc > 0)) { rej.elliptic++; continue; } // no real fixed points
      const sq = Math.sqrt(disc);
      const f1 = (-be + sq) / al, f2 = (-be - sq) / al;
      const in1 = f1 > lo && f1 < hi, in2 = f2 > lo && f2 < hi;
      if (in1 && !in2) { P = f1; Q = f2; }
      else if (in2 && !in1) { P = f2; Q = f1; }
      else { rej.foot++; continue; }
    }
    const tOf = (x) => (affine ? x - P : (x - P) / (x - Q));

    // t for every edge in the window; v = t^2 must be linear in r^2
    const i0 = c.i, i1 = c.j;
    const m = i1 - i0 + 1;
    const v = new Float64Array(m);
    let ok = true;
    for (let s = 0; s < m; s++) {
      const t = tOf(sx[i0 + s]);
      if (!isFinite(t)) { ok = false; break; }
      v[s] = t * t;
    }
    if (!ok) { rej.tinf++; continue; }
    // The inner anchor is the noisy one, and seeding (A,B) from it produced a
    // bad CORRESPONDENCE -- which is what actually cost recall, not any
    // conditioning of d. It is not needed: the involution already fixes P and Q,
    // so for any trial d the remaining scale follows from the RIM alone,
    //     c = |t(rim)| / sqrt(R^2 - d^2),
    // and every ring position is then predicted. That makes d a clean 1-D scan
    // with no three-arm hypothesis at all. Measured: the x-residual over d is
    // sharply unimodal (12x dynamic range, minimum within 0.25-0.5 of the
    // photometrically decoded d), so a coarse scan then a refine finds it.
    const tRim = (Math.abs(tOf(xi)) + Math.abs(tOf(xj))) / 2;
    if (!(tRim > 0)) { rej.tinf++; continue; }
    const R2 = R * R;
    const scoreAt = (dTry) => {
      const w = R2 - dTry * dTry;
      if (!(w > 0)) return null;
      const cc = tRim / Math.sqrt(w);
      let hit = 0, ss = 0, carr = 0;
      const seen = new Set();
      for (let s2 = 0; s2 < m; s2++) {
        const k = tOf(sx[i0 + s2]) / cc;
        const r = Math.sqrt(k * k + dTry * dTry);
        const br = nearestR(r);
        if (br < 0) continue;
        const e = Math.abs(br - r);
        if (e > tolR) continue;
        hit++; ss += e * e;
        if (!seen.has(br)) { seen.add(br); if (LAYOUT.fixedEdges.includes(br)) carr++; }
      }
      if (!hit) return null;
      // explained fraction dominates: a wrong d explains far fewer edges
      return { d: dTry, cc, hit, carr, cost: ss / hit + 0.6 * (m - hit) / m };
    };
    // Coarse scan, then refine, keeping every LOCAL minimum rather than only the
    // global one. Correspondence is re-derived at each trial d from the rim scale
    // -- so unlike the bracket-around-a-seed version, a candidate is never
    // carrying the seed's mistaken edge->radius assignment. The decoder then
    // settles which of the surviving offsets is real, photometrically.
    const grid = [];
    for (let dTry = 0; dTry <= dMax; dTry += 0.5) grid.push(scoreAt(dTry));
    const peaks = [];
    for (let g = 0; g < grid.length; g++) {
      const cur = grid[g];
      if (!cur) continue;
      const prev = grid[g - 1], next = grid[g + 1];
      if ((prev && prev.cost < cur.cost) || (next && next.cost < cur.cost)) continue;
      // local minimum: refine it
      let bd2 = cur;
      for (let dTry = Math.max(0, cur.d - 0.5); dTry <= cur.d + 0.5 + 1e-9; dTry += 0.125) {
        const r2 = scoreAt(dTry);
        if (r2 && r2.cost < bd2.cost) bd2 = r2;
      }
      peaks.push(bd2);
    }
    if (!peaks.length) { rej.none++; continue; }
    peaks.sort((p1, p2) => p1.cost - p2.cost);
    const arms = [];
    for (const pk of peaks.slice(0, opts.maxOffsets ?? 4)) {
      if (pk.hit < minInliers || pk.carr < minCarrier) continue;
      let np = 0;
      for (let s2 = 0; s2 < m; s2++) {
        const xx = sx[i0 + s2];
        const k = tOf(xx) / pk.cc;
        const r = Math.sqrt(k * k + pk.d * pk.d);
        const br = nearestR(r);
        if (br < 0 || Math.abs(br - r) > tolR) continue;
        const kk = br * br - pk.d * pk.d;
        if (!(kk > 0)) continue;
        fitX[np] = xx;
        fitK[np] = (k < 0 ? -1 : 1) * Math.sqrt(kk);
        np++;
      }
      if (np < 5 || !fitMobiusInto(fitX, fitK, np, mobOut)) continue;
      const mobF = { p: mobOut.p, q: mobOut.q, r: mobOut.r, s: mobOut.s };
      const xrF = rmseOf(mobF, fitX, fitK, np);
      if (!(xrF <= (opts.maxXRMSE ?? 2.5))) continue;
      arms.push({ d: pk.d, mobius: mobF, xRMSE: xrF, pairsUsed: np,
                  score: xrF * (1 + (m - pk.hit) / m) });
    }
    if (!arms.length) { rej.xrmse++; continue; }
    arms.sort((p1, p2) => p1.score - p2.score);
    const best = arms[0];
    if (!best) { rej.none++; continue; }
    rej.kept++;
    const mob = best.mobius;
    // every arm that survived is offered to the decoder, which settles d
    // photometrically -- 3 candidates, where the sweep produced up to 9 bins
    arms.sort((p, q) => p.score - q.score);
    out.push({
      startIndex: c.i, endIndex: c.j,
      mobius: mob,
      dCandidates: arms.map((x) => ({ d: x.d, mobius: x.mobius, score: x.score, xRMSE: x.xRMSE })),
      anchors: [xi, xa, xb, xj],
      d: best.d, dSeed: c.dSeed, crDist: c.crDist, holeFrac: c.holeFrac,
      xRMSE: best.xRMSE, score: best.score,
      pairsUsed: best.pairsUsed, rings: m,
      footX: xFromK(mob, 0), leftX: xi, rightX: xj
    });
  }
  return out;
}

// ---- compare against the shipped detector, on identical rows -----------------
const results = [];
for (const entry of testFrameBank) {
  const frame = entry && entry.frame;
  if (!frame || !frame.gray) continue;
  const rows = scanLattice(frame.h, 6);
  const edgesPerRow = rows.map((y) => edges1Dsub(rowOf(frame, y), edgeThreshold));

  const timeIt = (fn) => {
    const t0 = performance.now();
    let wins = 0;
    const per = [];
    for (let i = 0; i < rows.length; i++) {
      const dets = fn(edgesPerRow[i]);
      wins += dets.length;
      per.push(dets);
    }
    return { ms: performance.now() - t0, wins, per };
  };
  const base = timeIt((se) => detectLandmarkRow(se, { nms: false }));
  const novs = {};
  novs.profile = timeIt((se) => detectRowInvolution(se, { nms: false }));
  // warm up, then median of repeats with the spread reported -- a single run of
  // either detector varies by more than the difference between them
  const rep = (fn) => {
    for (let w = 0; w < 3; w++) for (const se of edgesPerRow) fn(se);
    const ts = [];
    for (let k = 0; k < 9; k++) {
      const t0 = performance.now();
      for (const se of edgesPerRow) fn(se);
      ts.push(performance.now() - t0);
    }
    ts.sort((a, b) => a - b);
    return { med: +ts[4].toFixed(2), spread: +(((ts[8] - ts[0]) / ts[4]) * 100).toFixed(0) };
  };
  const tBase = rep((se) => detectLandmarkRow(se, { nms: false }));
  const tNov = rep((se) => detectRowInvolution(se, { nms: false }));

  const decodeAll = (per) => {
    let decoded = 0;
    const ids = new Set();
    for (let i = 0; i < rows.length; i++)
      for (const det of per[i]) {
        const dec = decodeLandmark({ y: rows[i], ...det }, frame, {});
        if (dec && dec.margin >= 4 && dec.readable >= 4) { decoded++; ids.add(dec.id); }
      }
    return { decoded, ids: [...ids].sort((a, b) => a - b) };
  };
  const row = {
    file: entry.file,
    timing: { baselineMs: tBase.med, baselineSpread: tBase.spread + "%", involutionMs: tNov.med, involutionSpread: tNov.spread + "%", speedup: +(tBase.med / tNov.med).toFixed(2) },
    baseline: { ms: +base.ms.toFixed(1), windows: base.wins, ...decodeAll(base.per) }
  };
  for (const [k, nv] of Object.entries(novs))
    row[k] = { ms: +nv.ms.toFixed(1), windows: nv.wins, ...decodeAll(nv.per) };
  results.push(row);
}
return results;
