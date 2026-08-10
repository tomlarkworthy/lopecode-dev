const _fhsc = function _fitHomographyScaled(fitHomography) {return (function fitHomographyScaled(pairs, opts = {}) {
  // A homography from centres AND apparent sizes.
  //
  // fitHomography uses two numbers per mark, the centre. The row scan measured
  // two more and they were thrown away: a and b, the half-extents of the imaged
  // ellipse along image x and y. A circle of radius R on the plane images to an
  // ellipse whose half-extents are R*|row 1 of J| and R*|row 2 of J|, for
  //
  //   J = (1/w) [[h11 - x*h31, h12 - x*h32],
  //              [h21 - y*h31, h22 - y*h32]]     w = h31*X + h32*Y + 1
  //
  // Checked against the frames rather than assumed: over the 9 bank frames that
  // read 6 or 7 marks, a/(R*|row1|) has median 0.996 and b/(R*|row2|) 1.003
  // (n=58 marks, p10-p90 about 0.90-1.05, measured 2026-08-10). So there is no
  // calibration factor to carry, and 5% is the noise SIG_REL below spends.
  //
  // Why bother. Four centres are 8 equations for 8 unknowns: the fit is exact,
  // rmsResidual is 0 by construction and measures nothing -- and if three of the
  // four marks are collinear it is not even determined. 12 of this target's 35
  // four-subsets are collinear (centre plus a diameter pair, by construction),
  // hexcase-5ivq-06 reads exactly one of them and its pose puts a mark 189px
  // from its label. Two scale equations per mark make four marks 16 equations,
  // and make the residual falsifiable for the first time.
  //
  // The scale terms are not linear in h, so this is Levenberg-Marquardt off a
  // linear start, not a closed form. Plain Gauss-Newton is not enough here for
  // the same reason it was not enough on the ring fit -- it needs the damping
  // and the step-acceptance test, and 4.7.2 records that dead end.
  if (!pairs || pairs.length < 4) return null;
  const SIG_POS = opts.sigmaPos ?? 1;         // px, about what a read centre is worth
  const SIG_REL = opts.sigmaScaleRel ?? 0.05; // the measured spread of a/b about the model
  // A mark whose row scan never got a width (why: "no-width") still contributes
  // its centre; it just adds no scale equation.
  const scaled = pairs.filter((p) => p.a > 0 && p.b > 0 && p.rMm > 0);

  const solveLin = (M, v, n) => {
    const A = M.map((row, i) => [...row, v[i]]);
    for (let c = 0; c < n; c++) {
      let p = c;
      for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
      // No epsilon bail: with LM damping the matrix is positive definite, and a
      // step from a badly conditioned solve fails the acceptance test below
      // rather than being silently believed.
      if (!(Math.abs(A[p][c]) > 0)) return null;
      [A[c], A[p]] = [A[p], A[c]];
      for (let r = 0; r < n; r++) {
        if (r === c) continue;
        const f = A[r][c] / A[c][c];
        for (let j = c; j <= n; j++) A[r][j] -= f * A[c][j];
      }
    }
    return A.map((row, i) => row[n] / row[i]);
  };

  const modelAt = (H, p) => {
    const w = H[6] * p.sx + H[7] * p.sy + 1;
    return { w, x: (H[0] * p.sx + H[1] * p.sy + H[2]) / w, y: (H[3] * p.sx + H[4] * p.sy + H[5]) / w };
  };
  const extents = (H, p, m) => {
    const j11 = (H[0] - m.x * H[6]) / m.w, j12 = (H[1] - m.x * H[7]) / m.w;
    const j21 = (H[3] - m.y * H[6]) / m.w, j22 = (H[4] - m.y * H[7]) / m.w;
    return [p.rMm * Math.hypot(j11, j12), p.rMm * Math.hypot(j21, j22)];
  };
  const residuals = (H) => {
    const r = [];
    for (const p of pairs) {
      const m = modelAt(H, p);
      // h33 = 1 puts w = 1 at the plane origin, so a negative w anywhere means
      // the sheet has folded through the camera. Reject rather than fit it.
      if (!(m.w > 0)) return null;
      r.push((m.x - p.dx) / SIG_POS, (m.y - p.dy) / SIG_POS);
    }
    for (const p of scaled) {
      const m = modelAt(H, p);
      const [ea, eb] = extents(H, p, m);
      r.push((ea - p.a) / (SIG_REL * p.a), (eb - p.b) / (SIG_REL * p.b));
    }
    return r;
  };
  const costOf = (r) => (r ? r.reduce((s, v) => s + v * v, 0) : Infinity);

  const affineStart = (ps) => {
    // Least squares over all of them, not three of them: this is the start that
    // survives the collinear case, where the DLT returns nonsense or nothing.
    const M = [[0, 0, 0], [0, 0, 0], [0, 0, 0]], vx = [0, 0, 0], vy = [0, 0, 0];
    for (const p of ps) {
      const u = [p.sx, p.sy, 1];
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) M[i][j] += u[i] * u[j];
        vx[i] += u[i] * p.dx;
        vy[i] += u[i] * p.dy;
      }
    }
    const ax = solveLin(M, vx, 3), ay = solveLin(M, vy, 3);
    if (!ax || !ay || !ax.every(Number.isFinite) || !ay.every(Number.isFinite)) return null;
    return [ax[0], ax[1], ax[2], ay[0], ay[1], ay[2], 0, 0, 1];
  };

  const N = 8;
  const refine = (H0) => {
    let H = H0.slice(0, 8);
    const full = (h) => [h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], 1];
    let r = residuals(full(H));
    if (!r) return null;
    let best = costOf(r);
    let lambda = 1e-3, done = false;
    for (let it = 0; it < (opts.maxIter ?? 60) && !done; it++) {
      // Numerical Jacobian. 8 columns times a few dozen residuals, at most 60
      // iterations, on at most 7 marks -- small enough that the algebra is not
      // worth the chance of getting it wrong.
      const J = [];
      for (let k = 0; k < N; k++) {
        const step = Math.max(1e-9, Math.abs(H[k]) * 1e-6);
        const Hp = H.slice();
        Hp[k] += step;
        const rp = residuals(full(Hp));
        if (!rp) { J.length = 0; break; }
        J.push(rp.map((v, i) => (v - r[i]) / step));
      }
      if (J.length < N) break;
      const A = Array.from({ length: N }, () => new Array(N).fill(0));
      const g = new Array(N).fill(0);
      for (let i = 0; i < N; i++) {
        for (let j = i; j < N; j++) {
          let s = 0;
          for (let t = 0; t < r.length; t++) s += J[i][t] * J[j][t];
          A[i][j] = s;
          A[j][i] = s;
        }
        let s = 0;
        for (let t = 0; t < r.length; t++) s += J[i][t] * r[t];
        g[i] = -s;
      }
      let stepped = false;
      for (let tries = 0; tries < 10 && !stepped; tries++) {
        const Ad = A.map((row, i) => { const z = row.slice(); z[i] *= 1 + lambda; return z; });
        const d = solveLin(Ad, g.slice(), N);
        if (d && d.every(Number.isFinite)) {
          const Hn = H.map((v, i) => v + d[i]);
          const rn = residuals(full(Hn));
          const cn = costOf(rn);
          if (cn < best) {
            done = (best - cn) / Math.max(best, 1e-12) < 1e-9;
            H = Hn;
            r = rn;
            best = cn;
            lambda = Math.max(lambda / 3, 1e-9);
            stepped = true;
          }
        }
        if (!stepped) lambda *= 4;
      }
      if (!stepped) break;
    }
    return { H: full(H), cost: best };
  };

  // Two starts, both cheap and direct, and keep whichever converges lower. The
  // DLT is the better start when the marks are in general position and is
  // undefined when they are not; the affine is always defined and is a worse
  // start under perspective. Racing them is cheaper than deciding which case
  // this is with a threshold on a condition number.
  const starts = [];
  const dlt = fitHomography(pairs);
  if (dlt) starts.push(dlt.H);
  const aff = affineStart(pairs);
  if (aff) starts.push(aff);
  let won = null;
  for (const s of starts) {
    const got = refine(s);
    if (got && Number.isFinite(got.cost) && (!won || got.cost < won.cost)) won = got;
  }
  if (!won) return dlt ? { ...dlt, scaled: false } : null;

  const H = won.H;
  const map = (sx, sy) => {
    const w = H[6] * sx + H[7] * sy + 1;
    return [(H[0] * sx + H[1] * sy + H[2]) / w, (H[3] * sx + H[4] * sy + H[5]) / w];
  };
  let ss = 0;
  for (const p of pairs) {
    const [px, py] = map(p.sx, p.sy);
    ss += (px - p.dx) ** 2 + (py - p.dy) ** 2;
  }
  let sa = 0;
  for (const p of scaled) {
    const m = modelAt(H, p);
    const [ea, eb] = extents(H, p, m);
    sa += (ea - p.a) ** 2 + (eb - p.b) ** 2;
  }
  return {
    H,
    map,
    mirrored: H[0] * H[4] - H[1] * H[3] < 0,
    // Position only, in px, because the caller's drop tolerance is written in
    // pixels and a chi-square would silently change what 3 * rmsResidual means.
    rmsResidual: Math.sqrt(ss / pairs.length),
    scaleRms: scaled.length ? Math.sqrt(sa / (2 * scaled.length)) : null,
    chi2: won.cost,
    pairs: pairs.length,
    nScale: scaled.length,
    scaled: scaled.length > 0
  };
});};
