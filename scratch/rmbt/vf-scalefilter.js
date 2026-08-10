// Does dropping marks whose measured SCALE disagrees with their neighbours fix
// the pose? Every mark on the mat is the same physical size, so under a mildly
// oblique view their pixel widths must agree; one that does not has been misread
// however confident its id looks. Needs no pose, so it can run before one.
(() => {
  const rt = window.__ojs_runtime;
  const m = rt.mains.get("@tomlarkworthy/flat-trace");
  const clt = rt.mains.get("@tomlarkworthy/coded-landmark-tracking");
  const G = (mod, n) => { const v = [...rt._variables].find(z => z._module === mod && z._name === n); return v && v._value; };
  const T = G(m, "matTarget"), calib = G(m, "calib"), mpm = G(m, "makePlaneMap");
  const S = G(m, "makeMatSampler")(), prof = G(m, "cameraProfile");
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

  const r = afm(den(F), { bothAxes: true });
  const on = r.fused.filter((x) => T.byId.has(x.id));
  const I = prof && prof.w === nw ? prof : { f: 1.1 * nw, cx: nw / 2, cy: nh / 2, k1: 0, k2: 0, p1: 0, p2: 0 };

  const evaluate = (set, label) => {
    if (set.length < 4) return { label, marks: set.length, err: "too few" };
    const pairs = set.map((x) => { const k = T.byId.get(x.id); return { X: k.xMm, Y: k.yMm, u: x.xc, v: x.yc, id: x.id }; });
    const pose = calib.poseFor(I, pairs);
    if (!pose) return { label, marks: set.length, err: "no pose" };
    const res = pairs.map((p) => { const q = calib.project(I, pose, p.X, p.Y); return Math.hypot(q[0] - p.u, q[1] - p.v); });
    res.sort((a, b) => a - b);
    const map = mpm(I, pose);
    // mat residual, the number the gate uses
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
    return { label, marks: set.length, medResidPx: +res[res.length >> 1].toFixed(2),
             worstResidPx: +res[res.length - 1].toFixed(2), tiltDeg: +map.tiltDeg.toFixed(1),
             gain: +a.toFixed(2), matResidualPct: pts.length ? +(100 * over / pts.length).toFixed(1) : null };
  };

  const w = on.map((x) => x.wHalf).sort((a, b) => a - b);
  const medW = w[w.length >> 1];
  const out = { medWHalf: +medW.toFixed(0), all: on.map((x) => ({ id: x.id, wHalf: +x.wHalf.toFixed(0) })), runs: [] };
  out.runs.push(evaluate(on, "no filter"));
  for (const tol of [0.5, 0.35, 0.25, 0.15]) {
    const keep = on.filter((x) => Math.abs(x.wHalf - medW) / medW <= tol);
    out.runs.push(evaluate(keep, `wHalf within ${Math.round(tol * 100)}%`));
  }
  return out;
})()
