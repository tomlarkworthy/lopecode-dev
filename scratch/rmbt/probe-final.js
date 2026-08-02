// FINAL candidate for the notebook: involution + u=k^2, bracketed.
// Reproduces the best measured variant (28/29 decoded rows, ~1.9x) so the exact
// code that gets ported is the exact code that was measured.
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
const ALLR = [...new Set(LAYOUT.bands.flatMap(([r0, r1]) => [r0, r1]))]
  .filter((r) => r > 0).sort((a, b) => a - b);
const LUTQ = 8, LUTN = Math.ceil(LAYOUT.R * LUTQ) + 2;
const LUT_R = new Float64Array(LUTN);
for (let i = 0; i < LUTN; i++) {
  const r = i / LUTQ;
  let bd = Infinity, br = -1;
  for (const cand of ALLR) { const e = Math.abs(cand - r); if (e < bd) { bd = e; br = cand; } }
  LUT_R[i] = br;
}
const nearestR = (r) => { const i = (r * LUTQ + 0.5) | 0; return i >= 0 && i < LUTN ? LUT_R[i] : -1; };

const S = {
  v: new Float64Array(256),
  fitX: new Float64Array(256), fitK: new Float64Array(256),
  fitX2: new Float64Array(256), fitK2: new Float64Array(256),
  asgX: new Float64Array(256), asgR: new Float64Array(256), asgS: new Int8Array(256),
  mob: { p: 0, q: 0, r: 0, s: 0 }
};
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

function detectRowInvolution(scanEdges, opts = {}) {
  const out = [];
  out.windows = 0; out.survived = 0;
  const n = scanEdges ? scanEdges.length : 0;
  if (n < 8) return out;
  const sx = Float64Array.from(scanEdges, (e) => (typeof e === "number" ? e : e.x));
  const maxCands = opts.maxCands ?? 12;
  const minPairs = opts.minPairs ?? 7;
  const tolR = opts.tolR ?? 0.9;
  const minCarrier = opts.minCarrier ?? 3;
  const maxXRMSE = opts.maxXRMSE ?? 2.5;
  const bracket = opts.bracket ?? 2;
  const R = LAYOUT.R;
  const { v, fitX, fitK, fitX2, fitK2, asgX, asgR, asgS, mob: mobOut } = S;

  const gen = windowCandidates(sx, opts);
  out.windows = gen.windows;
  out.survived = gen.cands.length;
  const cands = gen.cands.slice();
  cands.sort((p, q) =>
    (p.holeFrac > 0.24) - (q.holeFrac > 0.24) || q.width - p.width || p.crDist - q.crDist);
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
    const S1 = xi + xj, P1 = xi * xj, S2 = xa + xb, P2 = xa * xb;
    const al = S2 - S1, be = P1 - P2, ga = P2 * S1 - P1 * S2;
    const lo = Math.min(xi, xj), hi = Math.max(xi, xj);
    let P, Q, affine = false;
    if (Math.abs(al) * (hi - lo) <= 1e-9 * Math.abs(be)) {
      if (Math.abs(be) < 1e-12) continue;
      P = -ga / (2 * be); Q = Infinity; affine = true;
    } else {
      const disc = be * be - al * ga;
      if (!(disc > 0)) continue;
      const sq = Math.sqrt(disc);
      const f1 = (-be + sq) / al, f2 = (-be - sq) / al;
      const in1 = f1 > lo && f1 < hi, in2 = f2 > lo && f2 < hi;
      if (in1 && !in2) { P = f1; Q = f2; }
      else if (in2 && !in1) { P = f2; Q = f1; }
      else continue;
    }
    const tOf = (x) => (affine ? x - P : (x - P) / (x - Q));
    const i0 = c.i, m = c.j - c.i + 1;
    if (m > v.length) continue;
    let ok = true;
    for (let s = 0; s < m; s++) {
      const t = tOf(sx[i0 + s]);
      if (!isFinite(t)) { ok = false; break; }
      v[s] = t * t;
    }
    if (!ok) continue;
    const vOut = tOf(xi) ** 2, vIn = tOf(xa) ** 2;

    const arms = [];
    for (const rc of MIDS) {
      const A0 = (vOut - vIn) / (R * R - rc * rc);
      if (!(A0 > 0)) continue;
      const B0 = vOut - R * R * A0;
      if (!(-B0 / A0 >= 0) || -B0 / A0 >= rc * rc) continue;
      let a = A0, b = B0, inl = 0, carr = 0;
      for (let iter = 0; iter < 3; iter++) {
        let n1 = 0, sX = 0, sY = 0, sXX = 0, sXY = 0, cc2 = 0;
        const seen = new Set();
        for (let s = 0; s < m; s++) {
          const rr = (v[s] - b) / a;
          if (!(rr > 0)) continue;
          const r = Math.sqrt(rr), br = nearestR(r);
          if (br < 0 || Math.abs(br - r) > tolR) continue;
          const X = br * br, Y = v[s];
          n1++; sX += X; sY += Y; sXX += X * X; sXY += X * Y;
          if (!seen.has(br)) { seen.add(br); if (LAYOUT.fixedEdges.includes(br)) cc2++; }
        }
        inl = n1; carr = cc2;
        if (n1 < 3) break;
        const den2 = n1 * sXX - sX * sX;
        if (Math.abs(den2) < 1e-12) break;
        const aN = (n1 * sXY - sX * sY) / den2;
        if (!(aN > 0)) break;
        const bN = (sY - aN * sX) / n1;
        const conv = Math.abs(aN - a) < 1e-12 * Math.abs(a);
        a = aN; b = bN;
        if (conv) break;
      }
      const d2 = -b / a;
      if (!(d2 >= 0) || d2 >= rc * rc) continue;
      const d = Math.sqrt(d2);
      if (inl < minPairs || carr < minCarrier) continue;

      let np = 0;
      for (let s = 0; s < m; s++) {
        const rr = (v[s] - b) / a;
        if (!(rr > 0)) continue;
        const r = Math.sqrt(rr), br = nearestR(r);
        if (br < 0 || Math.abs(br - r) > tolR) continue;
        const kk = br * br - d * d;
        if (!(kk > 0)) continue;
        const xx = sx[i0 + s], sgn = tOf(xx) < 0 ? -1 : 1;
        fitX[np] = xx; fitK[np] = sgn * Math.sqrt(kk);
        asgX[np] = xx; asgR[np] = br; asgS[np] = sgn;
        np++;
      }
      if (np < 5) continue;
      const np0 = np;
      const push = (dd, xs2, ks2, q2) => {
        if (q2 < 5 || !fitMobiusInto(xs2, ks2, q2, mobOut)) return;
        const mm = { p: mobOut.p, q: mobOut.q, r: mobOut.r, s: mobOut.s };
        const xr = rmseOf(mm, xs2, ks2, q2);
        if (!(xr <= maxXRMSE)) return;
        arms.push({ rc, d: dd, mobius: mm, xRMSE: xr, pairsUsed: q2,
                    score: xr * (1 + (m - inl) / m) });
      };
      push(d, fitX, fitK, np0);
      // The involution pins the map; the remaining uncertainty is a narrow
      // window in d. Offer those offsets too and let the photometric decode
      // choose -- 17 offsets around a solved estimate, not 35 blind ones, and
      // no DP alignment: the correspondence is already known.
      for (let dd = d - bracket; dd <= d + bracket + 1e-9; dd += 0.25) {
        if (dd < 0 || dd >= rc || Math.abs(dd - d) < 1e-9) continue;
        let q2 = 0;
        for (let s = 0; s < np0; s++) {
          const kk = asgR[s] * asgR[s] - dd * dd;
          if (!(kk > 0)) continue;
          fitX2[q2] = asgX[s]; fitK2[q2] = asgS[s] * Math.sqrt(kk); q2++;
        }
        push(dd, fitX2, fitK2, q2);
      }
    }
    if (!arms.length) continue;
    arms.sort((p, q) => p.score - q.score);
    const best = arms[0];
    out.push({
      startIndex: c.i, endIndex: c.j,
      mobius: best.mobius,
      dCandidates: arms.map((x) => ({ d: x.d, mobius: x.mobius, score: x.score, xRMSE: x.xRMSE })),
      anchors: [xi, xa, xb, xj],
      d: best.d, dSeed: c.dSeed, crDist: c.crDist, holeFrac: c.holeFrac,
      xRMSE: best.xRMSE, score: best.score,
      pairsUsed: best.pairsUsed, rings: m,
      footX: xFromK(best.mobius, 0), leftX: xi, rightX: xj
    });
  }
  return out;
}

const results = [];
for (const entry of testFrameBank) {
  const frame = entry && entry.frame;
  if (!frame || !frame.gray) continue;
  const rows = scanLattice(frame.h, 6);
  const edgesPerRow = rows.map((y) => edges1Dsub(rowOf(frame, y), edgeThreshold));
  const decodeAll = (fn) => {
    let decoded = 0;
    const ids = new Set();
    for (let i = 0; i < rows.length; i++)
      for (const det of fn(edgesPerRow[i])) {
        const dec = decodeLandmark({ y: rows[i], ...det }, frame, {});
        if (dec && dec.margin >= 4 && dec.readable >= 4) { decoded++; ids.add(dec.id); }
      }
    return { decoded, ids: [...ids].sort((a, b) => a - b) };
  };
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
  const tB = rep((se) => detectLandmarkRow(se, { nms: false }));
  const tI = rep((se) => detectRowInvolution(se, { nms: false }));
  results.push({
    file: entry.file,
    baselineMs: tB.med, baselineSpread: tB.spread + "%",
    involutionMs: tI.med, involutionSpread: tI.spread + "%",
    speedup: +(tB.med / tI.med).toFixed(2),
    baseline: decodeAll((se) => detectLandmarkRow(se, { nms: false })),
    involution: decodeAll((se) => detectRowInvolution(se, { nms: false }))
  });
}
return results;
