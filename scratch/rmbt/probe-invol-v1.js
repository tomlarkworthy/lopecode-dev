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
    const vOut = tOf(xi) ** 2;                    // rim, r = R

    let best = null;
    const arms = [];
    for (const rc of MIDS) {
      const vIn = tOf(xa) ** 2;
      const den = R * R - rc * rc;
      const A = (vOut - vIn) / den;
      if (!(A > 0)) { rej.slope++; continue; }    // t^2 must grow with r^2
      const B = vOut - R * R * A;
      const d2 = -B / A;
      if (!(d2 >= 0) || d2 >= rc * rc) { rej.chord++; continue; }
      // The two anchor pairs only SEED (A,B) -- they are the same four noisy
      // points whose cross ratio cannot pin d. Refit on every edge that lands
      // near a legal radius: v = A r^2 + B is linear, so this is one ordinary
      // least squares per iteration, and it is what turns 4 points into ~15.
      let a = A, b = B, inliers = 0, ss = 0, carrier = 0;
      for (let iter = 0; iter < 3; iter++) {
        // Greedy nearest-radius. A monotone DP assignment was tried here --
        // order-preserving, no two edges claiming one ring -- and measured
        // WORSE on both axes (26 vs 28 decoded rows, 1.45x vs 1.95x). The
        // correspondence was not the thing costing recall.
        let n1 = 0, sX = 0, sY = 0, sXX = 0, sXY = 0, sse = 0, carr = 0;
        const seen = new Set();
        for (let s = 0; s < m; s++) {
          const rr = (v[s] - b) / a;
          if (!(rr > 0)) continue;
          const r = Math.sqrt(rr);
          const br = nearestR(r);
          if (br < 0) continue;
          const bd = Math.abs(br - r);
          if (bd > tolR) continue;
          const X = br * br, Y = v[s];
          n1++; sX += X; sY += Y; sXX += X * X; sXY += X * Y; sse += bd * bd;
          if (!seen.has(br)) { seen.add(br); if (LAYOUT.fixedEdges.includes(br)) carr++; }
        }
        inliers = n1; ss = sse; carrier = carr;
        if (n1 < 3) break;
        const den2 = n1 * sXX - sX * sX;
        if (Math.abs(den2) < 1e-12) break;
        const aNew = (n1 * sXY - sX * sY) / den2;
        const bNew = (sY - aNew * sX) / n1;
        if (!(aNew > 0)) break;
        const conv = Math.abs(aNew - a) < 1e-12 * Math.abs(a);
        a = aNew; b = bNew;
        if (conv) break;
      }
      const d2r = -b / a;
      if (!(d2r >= 0) || d2r >= rc * rc) { rej.chord++; continue; }
      const d = Math.sqrt(d2r);
      if (inliers < minInliers) { rej.inliers++; continue; }
      if (carrier < minCarrier) { rej.carrier++; continue; }
      // The involution came from four noisy anchors and is never itself
      // refined, so the map is good enough to establish the CORRESPONDENCE but
      // not to sample photometry with. Do the baseline's own final step -- one
      // least-squares Mobius fit in x-space on the matched (x,k) pairs -- once,
      // instead of once per swept offset.
      let mob = affine
        ? { p: -1, q: P, r: 0, s: -Math.sqrt(a) }
        : { p: -1, q: P, r: -Math.sqrt(a), s: Math.sqrt(a) * Q };
      let np = 0;
      for (let s = 0; s < m; s++) {
        const rr = (v[s] - b) / a;
        if (!(rr > 0)) continue;
        const r = Math.sqrt(rr);
        const br = nearestR(r);
        if (br < 0) continue;
        if (Math.abs(br - r) > tolR) continue;
        const kk = br * br - d * d;
        if (!(kk > 0)) continue;
        // sign of k follows which side of the foot the edge fell on
        fitX[np] = sx[i0 + s];
        fitK[np] = (tOf(sx[i0 + s]) < 0 ? -1 : 1) * Math.sqrt(kk);
        asgX[np] = sx[i0 + s];
        asgR[np] = br;
        asgS[np] = tOf(sx[i0 + s]) < 0 ? -1 : 1;
        np++;
      }
      const np0 = np;
      let xr = rmseOf(mob, fitX, fitK, np);
      if (np >= 5 && fitMobiusInto(fitX, fitK, np, mobOut)) {
        const cand = { p: mobOut.p, q: mobOut.q, r: mobOut.r, s: mobOut.s };
        const xr2 = rmseOf(cand, fitX, fitK, np);
        if (isFinite(xr2) && xr2 < xr) { mob = cand; xr = xr2; }
      }
      if (!(xr <= (opts.maxXRMSE ?? 2.5))) { rej.xrmse++; continue; }
      const score = xr * (1 + (m - inliers) / m);
      arms.push({ rc, d, mobius: mob, score, xRMSE: xr, pairsUsed: np });
      if (!best || score < best.score) best = arms[arms.length - 1];
      // PROFILE LIKELIHOOD in d. The model x = M(+-sqrt(r^2-d^2)) is exact and
      // the noise lives in x, so that is where the residual belongs -- not in
      // v = t^2, whose variance grows like 4 t^2 sigma^2 and lets the rim edges
      // dominate an unweighted fit. For any fixed d, M is a CLOSED-FORM linear
      // solve, so d is a one-dimensional profile: evaluate E(d), and search it.
      // Golden section from the involution's estimate, ~10 linear solves,
      // instead of a 35-point grid each carrying a DP alignment.
      const Ed = (dTry) => {
        let q2 = 0;
        for (let s2 = 0; s2 < np0; s2++) {
          const kk2 = asgR[s2] * asgR[s2] - dTry * dTry;
          if (!(kk2 > 0)) continue;
          fitX2[q2] = asgX[s2];
          fitK2[q2] = asgS[s2] * Math.sqrt(kk2);
          q2++;
        }
        if (q2 < 5 || !fitMobiusInto(fitX2, fitK2, q2, mobOut)) return null;
        const cand2 = { p: mobOut.p, q: mobOut.q, r: mobOut.r, s: mobOut.s };
        const e = rmseOf(cand2, fitX2, fitK2, q2);
        return isFinite(e) ? { e, mob: cand2, n: q2, d: dTry } : null;
      };
      let loD = Math.max(0, d - 2.5), hiD = Math.min(rc - 0.5, d + 2.5);
      if (hiD > loD) {
        const PHI = 0.6180339887;
        let x1 = hiD - PHI * (hiD - loD), x2 = loD + PHI * (hiD - loD);
        let e1 = Ed(x1), e2 = Ed(x2);
        for (let it = 0; it < 10 && hiD - loD > 0.02; it++) {
          const v1 = e1 ? e1.e : Infinity, v2 = e2 ? e2.e : Infinity;
          if (v1 <= v2) { hiD = x2; x2 = x1; e2 = e1; x1 = hiD - PHI * (hiD - loD); e1 = Ed(x1); }
          else { loD = x1; x1 = x2; e1 = e2; x2 = loD + PHI * (hiD - loD); e2 = Ed(x2); }
        }
        for (const cand of [e1, e2, Ed(d)]) {
          if (!cand) continue;
          if (!(cand.e <= (opts.maxXRMSE ?? 2.5))) continue;
          arms.push({ rc, d: cand.d, mobius: cand.mob, score: cand.e * (1 + (m - inliers) / m), xRMSE: cand.e, pairsUsed: cand.n });
        }
        arms.sort((p1, p2) => p1.score - p2.score);
        if (arms.length && (!best || arms[0].score < best.score)) best = arms[0];
      }
    }
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
