// The SHIPPED pipeline (better-of-two detection, scale filter, pose, mat
// residual) run against window.__frozen on a page that predates it.
(() => {
  const rt = window.__ojs_runtime;
  const m = rt.mains.get("@tomlarkworthy/flat-trace");
  const clt = rt.mains.get("@tomlarkworthy/coded-landmark-tracking");
  const G = (mod, n) => { const v = [...rt._variables].find(z => z._module === mod && z._name === n); return v && v._value; };
  const T = G(m, "matTarget"), calib = G(m, "calib"), mpm = G(m, "makePlaneMap");
  const S = G(m, "makeMatSampler")(), prof = G(m, "cameraProfile"), tf = G(m, "traceFrame");
  const afm = [G(m, "analyzeFrameMan"), G(clt, "analyzeFrameMan")].find(v => typeof v === "function");
  const F = window.__frozen, nw = F.w, nh = F.h, gray = F.gray;
  const den = (f, r) => {
    r = r ?? Math.max(1, Math.round(f.w / 540));
    const { gray, w, h } = f, t = new Uint8Array(w * h), o = new Uint8Array(w * h), n = 2 * r + 1;
    for (let y = 0; y < h; y++) { let s = 0;
      for (let x = -r; x <= r; x++) s += gray[y * w + Math.min(w - 1, Math.max(0, x))];
      for (let x = 0; x < w; x++) { t[y * w + x] = (s / n) | 0; s += gray[y * w + Math.min(w - 1, x + r + 1)] - gray[y * w + Math.max(0, x - r)]; } }
    for (let x = 0; x < w; x++) { let s = 0;
      for (let y = -r; y <= r; y++) s += t[Math.min(h - 1, Math.max(0, y)) * w + x];
      for (let y = 0; y < h; y++) { o[y * w + x] = (s / n) | 0; s += t[Math.min(h - 1, y + r + 1) * w + x] - t[Math.max(0, y - r) * w + x]; } }
    return { gray: o, w, h };
  };

  // better of the two reads
  const A = afm(F, { bothAxes: true }), B = afm(den(F), { bothAxes: true });
  const aOn = A.fused.filter((x) => T.byId.has(x.id)), bOn = B.fused.filter((x) => T.byId.has(x.id));
  const denoised = bOn.length > aOn.length;
  let on = denoised ? bOn : aOn;
  const readCounts = { raw: aOn.length, denoised: bOn.length, chose: denoised ? "denoised" : "raw" };

  // scale filter
  const ws = on.map((x) => x.wHalf).sort((a, b) => a - b);
  const medW = ws[ws.length >> 1];
  const keep = on.filter((x) => Math.abs(x.wHalf - medW) / medW <= 0.35);
  const scaleDropped = on.filter((x) => !keep.includes(x)).map((x) => ({ id: x.id, wHalf: Math.round(x.wHalf) }));
  if (keep.length >= 4) on = keep;

  // homography consensus
  let outliers = [];
  if (on.length >= 5) {
    const P = on.map((x) => { const k = T.byId.get(x.id); return { X: k.xMm, Y: k.yMm, u: x.xc, v: x.yc, f: x }; });
    const tol = Math.max(2, nw / 360);
    const n = P.length, quads = [];
    if (n <= 10) { for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) for (let c = b + 1; c < n; c++) for (let d = c + 1; d < n; d++) quads.push([a, b, c, d]); }
    else { let s2 = 1; for (let i = 0; i < 400; i++) { const q = []; while (q.length < 4) { s2 = (s2 * 1103515245 + 12345) & 0x7fffffff; const j = s2 % n; if (!q.includes(j)) q.push(j); } quads.push(q); } }
    let best = null;
    for (const q of quads) {
      const H = calib.fitH(q.map((i) => P[i]));
      if (!H) continue;
      let c2 = 0;
      for (const p of P) { const z = calib.applyH(H, p.X, p.Y); if (Math.hypot(z[0] - p.u, z[1] - p.v) <= tol) c2++; }
      if (!best || c2 > best.count) { best = { count: c2, H }; if (c2 === n) break; }
    }
    if (best && best.count >= 4 && best.count < n) {
      const inl = P.filter((p) => { const z = calib.applyH(best.H, p.X, p.Y); return Math.hypot(z[0] - p.u, z[1] - p.v) <= tol; });
      if (inl.length >= 4 && inl.length >= 0.5 * n) { outliers = P.filter((p) => !inl.includes(p)).map((p) => p.f.id); on = inl.map((p) => p.f); }
    }
  }

  const run = (I, label) => {
    const pairs = on.map((x) => { const k = T.byId.get(x.id); return { X: k.xMm, Y: k.yMm, u: x.xc, v: x.yc, id: x.id }; });
    const pose = calib.poseFor(I, pairs);
    if (!pose) return { label, err: "no pose" };
    const e = pairs.map((p) => { const q = calib.project(I, pose, p.X, p.Y); return Math.hypot(q[0] - p.u, q[1] - p.v); }).sort((a, b) => a - b);
    const map = mpm(I, pose);
    const hw = T.pageW / 2, hh = (T.pageH - T.legendMm) / 2;
    const pts = [];
    for (let y = 0; y < nh; y += 4) for (let x = 0; x < nw; x += 4) {
      const P = map.toPlane(x, y);
      if (!P || P[0] < -hw || P[0] > hw || P[1] < -hh || P[1] > hh) continue;
      pts.push([gray[y * nw + x], S(P[0], P[1])]);
    }
    let a = 1, b = 0;
    if (pts.length > 100) {
      let n = 0, sp = 0, so = 0, spp = 0, spo = 0;
      for (const [o2, p] of pts) { n++; sp += p; so += o2; spp += p * p; spo += p * o2; }
      const d = n * spp - sp * sp;
      if (Math.abs(d) > 1e-9) { a = (n * spo - sp * so) / d; b = (so - a * sp) / n; }
    }
    const over = pts.filter(([o2, p]) => Math.abs(o2 - (a * p + b)) > 24).length;
    return { label, marks: pairs.length, medPx: +e[e.length >> 1].toFixed(2), worstPx: +e[e.length - 1].toFixed(2),
             tiltDeg: +map.tiltDeg.toFixed(1), gain: +a.toFixed(2), offset: Math.round(b),
             matResidualPct: pts.length ? +(100 * over / pts.length).toFixed(1) : null };
  };

  const out = { native: [nw, nh], readCounts, medWHalf: Math.round(medW), scaleDropped, consensusOutliers: outliers, marksUsed: on.length, fits: [] };
  const guess = (k) => ({ f: k * nw, cx: nw / 2, cy: nh / 2, k1: 0, k2: 0, p1: 0, p2: 0 });
  if (prof && prof.w === nw) out.fits.push(run(prof, "stored profile"));
  for (const k of [0.9, 1.0, 1.1, 1.3, 1.5]) out.fits.push(run(guess(k), `guess f=${k}w`));

  // and the real cascade, best guess
  const best = out.fits.filter((f) => f.matResidualPct != null).sort((a, b) => a.matResidualPct - b.matResidualPct)[0];
  return out;
})()
