// inputs: manLayout
function fitRingLattice(obs, init, opts = {}) {
  // One mark's whole ring lattice, fitted at once:
  //
  //     |A (p - c)| = teeth[t] + delta * polarity
  //
  // c is the centre in the image and A the inverse of the local plane-to-image map.
  // delta is one ink-bleed offset in mm. It is identifiable rather than degenerate with
  // scale because the involution pairs require ss[f] === -ss[e]: growing the ink moves a
  // dark->light boundary out and a light->dark boundary in, and consecutive teeth
  // alternate polarity, so delta warps the radial lattice in a way A cannot absorb.
  //
  // An affine A is not quite enough. Concentric circles map to NON-concentric ellipses
  // under a homography -- the image ellipse of a ring drifts toward the vanishing point
  // as the ring grows -- so on a tilted sheet the affine model carries a bias of a few
  // tenths of a pixel that no amount of data removes. Two more parameters divide out
  // that drift and it goes away.
  const n = obs.length;
  if (n < 40) return null;
  const usePersp = opts.perspective !== false;
  const s = init.radiusPx ? manLayout.R / init.radiusPx : 1;   // px -> mm, isotropic seed
  const eps = [0.01, 0.01, 1e-5, 1e-5, 1e-5, 1e-5, 1e-3, 1e-8, 1e-8];

  const resid = (t, np, i) => {
    const o = obs[i];
    const dx = o[0] - t[0], dy = o[1] - t[1];
    let qx = t[2] * dx + t[3] * dy, qy = t[4] * dx + t[5] * dy;
    if (np > 7) { const wg = 1 + t[7] * dx + t[8] * dy; qx /= wg; qy /= wg; }
    return Math.hypot(qx, qy) - (o[2] + t[6] * o[3]);
  };
  const cost = (t, np, wts) => {
    let sse = 0, sw = 0;
    for (let i = 0; i < n; i++) { const r = resid(t, np, i); sse += wts[i] * r * r; sw += wts[i]; }
    return sse / Math.max(1e-9, sw);
  };
  const solveLin = (JTJ, JTr, np, lam) => {
    const M = JTJ.map((row, i) => Float64Array.from([...row, JTr[i]]));
    for (let a = 0; a < np; a++) M[a][a] *= 1 + lam;
    for (let c = 0; c < np; c++) {
      let piv = c;
      for (let r = c + 1; r < np; r++) if (Math.abs(M[r][c]) > Math.abs(M[piv][c])) piv = r;
      if (Math.abs(M[piv][c]) < 1e-18) return null;
      const tmp = M[c]; M[c] = M[piv]; M[piv] = tmp;
      for (let r = 0; r < np; r++) {
        if (r === c) continue;
        const f = M[r][c] / M[c][c];
        for (let k = c; k <= np; k++) M[r][k] -= f * M[c][k];
      }
    }
    return Array.from({ length: np }, (_, a) => M[a][np] / M[a][a]);
  };
  // Levenberg-Marquardt with step ACCEPTANCE, not just damping: plain Gauss-Newton
  // diverged on about one mark in twenty and threw the centre a thousand pixels. A step
  // that does not lower the weighted cost has to be refused.
  const solve = (np, th0) => {
    let th = th0.slice();
    let wts = new Float64Array(n).fill(1);
    let lam = 1e-3, cur = cost(th, np, wts);
    for (let iter = 0; iter < 60; iter++) {
      const JTJ = Array.from({ length: np }, () => new Float64Array(np));
      const JTr = new Float64Array(np);
      const g = new Float64Array(np);
      for (let i = 0; i < n; i++) {
        const r0 = resid(th, np, i);
        for (let k = 0; k < np; k++) {
          const t2 = th.slice(); t2[k] += eps[k];
          g[k] = (resid(t2, np, i) - r0) / eps[k];
        }
        const w = wts[i];
        for (let a = 0; a < np; a++) {
          JTr[a] += w * g[a] * r0;
          for (let b = a; b < np; b++) JTJ[a][b] += w * g[a] * g[b];
        }
      }
      for (let a = 0; a < np; a++) for (let b = 0; b < a; b++) JTJ[a][b] = JTJ[b][a];
      let took = false;
      for (let attempt = 0; attempt < 8; attempt++) {
        const d = solveLin(JTJ.map((r) => Float64Array.from(r)), JTr, np, lam);
        if (!d) { lam *= 10; continue; }
        const t2 = th.slice();
        for (let a = 0; a < np; a++) t2[a] -= d[a];
        const c2 = cost(t2, np, wts);
        if (c2 < cur) { th = t2; cur = c2; lam = Math.max(1e-9, lam / 3); took = true; break; }
        lam *= 10;
        if (lam > 1e12) break;
      }
      if (!took) break;
      // Huber on the mm residual: a crossing assigned to the neighbouring tooth is half a
      // tooth out and would otherwise drag the centre with it.
      const rs = new Float64Array(n);
      for (let i = 0; i < n; i++) rs[i] = Math.abs(resid(th, np, i));
      const srt = Float64Array.from(rs).sort();
      const mad = Math.max(0.02, srt[n >> 1]);
      for (let i = 0; i < n; i++) { const q = rs[i] / (2 * mad); wts[i] = q <= 1 ? 1 : 1 / q; }
      cur = cost(th, np, wts);
    }
    return { th, rms: Math.sqrt(cur) };
  };

  const aff = solve(7, [init.x, init.y, s, 0, 0, s, 0, 0, 0]);
  // A refinement that ran away from the measurement it was refining is a failed solve,
  // not a better centre.
  if (!isFinite(aff.rms) || aff.rms > 1.5 ||
      Math.hypot(aff.th[0] - init.x, aff.th[1] - init.y) > (init.radiusPx ?? 40) * 0.5) return null;

  let th = aff.th, rms = aff.rms, model = "affine";
  if (usePersp) {
    const per = solve(9, [...aff.th.slice(0, 7), 0, 0]);
    // The perspective pair is the weakest constrained direction in the problem, so a solve
    // that lands far from the affine one has found a different minimum rather than a better
    // one. "Far" is a question about the MARK, so it scales with the mark: the correction
    // runs 1-3% of the radius whatever the frame, and a fixed pixel bound turns that into a
    // rejection for every large mark. At the 1px this used to be, close-up frames lost the
    // perspective fit on 32 of 40 marks -- 29 of which it had improved, by a median 82% --
    // and silently fell back to affine, which is the model carrying the tilt bias the
    // perspective pair exists to remove. The rms condition beside it already rejects a
    // solve that is merely worse, so this bound only has to catch divergence.
    const jumpMax = Math.max(1, 0.04 * (init.radiusPx ?? 40));
    const jump = Math.hypot(per.th[0] - aff.th[0], per.th[1] - aff.th[1]);
    if (isFinite(per.rms) && per.rms <= aff.rms && jump <= jumpMax) {
      th = per.th; rms = per.rms; model = "perspective";
    }
  }
  return {
    x: th[0], y: th[1], delta: th[6], rms, n, model,
    // px -> LAYOUT UNITS (teeth are layout units); the caller converts with mmPerUnit
    A: [th[2], th[3], th[4], th[5]],
    moved: Math.hypot(th[0] - init.x, th[1] - init.y)
  };
}