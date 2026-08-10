// Is mat cancellation failing because the print is wrong, or because ONE global
// gain+offset cannot follow the light across the sheet? Fit the same predicted
// mat globally and per tile, and compare what is left over. If the tiled fit
// collapses the residual, the model is too rigid and the gate is not too fussy.
(async () => {
  const rt = window.__ojs_runtime;
  const m = rt.mains.get("@tomlarkworthy/flat-trace");
  const clt = rt.mains.get("@tomlarkworthy/coded-landmark-tracking");
  const G = (mod, n) => { const v = [...rt._variables].find(z => z._module === mod && z._name === n); return v && v._value; };
  const g = G(m, "grabber"), cv = G(m, "camVideo"), T = G(m, "matTarget");
  const calib = G(m, "calib"), mpm = G(m, "makePlaneMap"), mkSampler = G(m, "makeMatSampler"), prof = G(m, "cameraProfile");
  const afm = [G(m, "analyzeFrameMan"), G(clt, "analyzeFrameMan")].find(v => typeof v === "function");
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

  const F = window.__frozen;
  const nw = F.w, nh = F.h, gray = F.gray;
  let res = afm(F, { bothAxes: true });
  let on = res.fused.filter((f) => T.byId.has(f.id));
  const a = afm(den(F), { bothAxes: true }); const ao = a.fused.filter((f) => T.byId.has(f.id));
  if (ao.length > on.length) { res = a; on = ao; }
  if (on.length < 4) return { err: "only " + on.length + " marks" };

  const I = prof && prof.w === nw ? prof : { f: 1.1 * nw, cx: nw / 2, cy: nh / 2, k1: 0, k2: 0, p1: 0, p2: 0 };
  const pairs = on.map((f) => { const k = T.byId.get(f.id); return { X: k.xMm, Y: k.yMm, u: f.xc, v: f.yc, id: f.id }; });
  const pose = calib.poseFor(I, pairs);
  if (!pose) return { err: "no pose" };
  const map = mpm(I, pose);
  const perMark = pairs.map((p) => {
    const q = calib.project(I, pose, p.X, p.Y);
    return { id: p.id, px: +Math.hypot(q[0] - p.u, q[1] - p.v).toFixed(1) };
  }).sort((a, b) => b.px - a.px);

  // predicted mat over the ROI, subsampled
  const S = mkSampler();
  const hw = T.pageW / 2, hh = (T.pageH - T.legendMm) / 2;
  const step = 3;
  const pts = [];
  for (let y = 0; y < nh; y += step) for (let x = 0; x < nw; x += step) {
    const P = map.toPlane(x, y);
    if (!P || P[0] < -hw || P[0] > hw || P[1] < -hh || P[1] > hh) continue;
    pts.push({ x, y, o: gray[y * nw + x], p: S(P[0], P[1]) });
  }
  if (pts.length < 500) return { err: "roi too small: " + pts.length, marks: on.length };

  const fit = (arr) => {
    let n = 0, sp = 0, so = 0, spp = 0, spo = 0;
    for (const q of arr) { n++; sp += q.p; so += q.o; spp += q.p * q.p; spo += q.p * q.o; }
    const d = n * spp - sp * sp;
    if (Math.abs(d) < 1e-9) return null;
    const a = (n * spo - sp * so) / d, b = (so - a * sp) / n;
    return { a, b };
  };
  const resid = (arr, f) => {
    const e = arr.map((q) => Math.abs(q.o - (f.a * q.p + f.b)));
    e.sort((x, y) => x - y);
    return { med: +e[e.length >> 1].toFixed(1), p90: +e[Math.floor(0.9 * e.length)].toFixed(1) };
  };

  const gfit = fit(pts);
  const gres = resid(pts, gfit);
  // over-threshold share, the number the gate actually uses
  const thr = 24;
  const gOver = +(100 * pts.filter((q) => Math.abs(q.o - (gfit.a * q.p + gfit.b)) > thr).length / pts.length).toFixed(1);

  const NT = 8;
  const tiles = new Map();
  for (const q of pts) {
    const k = (Math.min(NT - 1, (q.y * NT / nh) | 0)) * NT + Math.min(NT - 1, (q.x * NT / nw) | 0);
    if (!tiles.has(k)) tiles.set(k, []);
    tiles.get(k).push(q);
  }
  let over = 0, tot = 0;
  const as = [], bs = [];
  const allErr = [];
  for (const [, arr] of tiles) {
    if (arr.length < 60) continue;
    const f = fit(arr) ?? gfit;
    if (!(f.a > 0.05 && f.a < 20)) continue;
    as.push(f.a); bs.push(f.b);
    for (const q of arr) { const e = Math.abs(q.o - (f.a * q.p + f.b)); allErr.push(e); tot++; if (e > thr) over++; }
  }
  allErr.sort((x, y) => x - y);
  const q = (p) => allErr.length ? +allErr[Math.floor(p * allErr.length)].toFixed(1) : null;
  const mm = (arr) => ({ min: +Math.min(...arr).toFixed(2), max: +Math.max(...arr).toFixed(2) });

  return {
    marks: on.length, tiltDeg: +map.tiltDeg.toFixed(1), roiPts: pts.length,
    ids: on.map((f) => f.id), poseAllMarksPx: perMark,
    global: { gain: +gfit.a.toFixed(3), offset: +gfit.b.toFixed(1), ...gres, overThrPct: gOver },
    tiled: { tiles: as.length, med: q(0.5), p90: q(0.9),
             overThrPct: +(100 * over / Math.max(1, tot)).toFixed(1),
             gainRange: mm(as), offsetRange: mm(bs) }
  };
})()
