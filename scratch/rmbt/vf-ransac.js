// How many of the read marks agree on ONE homography? A homography absorbs any
// perspective, any uniform scale, any print-scale error — so whatever it cannot
// fit is a wrong correspondence, i.e. a mark whose id does not belong at the mm
// position the model puts it. A large consistent subset means a few bad ids and
// RANSAC is the fix; no large subset means the printed sheet's id-to-site map is
// not the one this build holds, and only a reprint fixes it.
(() => {
  const rt = window.__ojs_runtime;
  const m = rt.mains.get("@tomlarkworthy/flat-trace");
  const clt = rt.mains.get("@tomlarkworthy/coded-landmark-tracking");
  const G = (mod, n) => { const v = [...rt._variables].find(z => z._module === mod && z._name === n); return v && v._value; };
  const T = G(m, "matTarget"), calib = G(m, "calib");
  const afm = [G(m, "analyzeFrameMan"), G(clt, "analyzeFrameMan")].find(v => typeof v === "function");
  const F = window.__frozen;
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

  const combos4 = (n) => {
    const out = [];
    for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) for (let c = b + 1; c < n; c++) for (let d = c + 1; d < n; d++) out.push([a, b, c, d]);
    return out;
  };

  const ransac = (pairs, tol) => {
    if (pairs.length < 4) return null;
    let best = null;
    for (const idx of combos4(pairs.length)) {
      const H = calib.fitH(idx.map((i) => pairs[i]));
      if (!H) continue;
      const inl = [];
      for (const p of pairs) {
        const q = calib.applyH(H, p.X, p.Y);
        if (Math.hypot(q[0] - p.u, q[1] - p.v) <= tol) inl.push(p);
      }
      if (!best || inl.length > best.inl.length) best = { inl, H };
    }
    if (!best) return null;
    // refit on the inliers
    const H2 = best.inl.length >= 4 ? calib.fitH(best.inl) : best.H;
    const e = best.inl.map((p) => { const q = calib.applyH(H2, p.X, p.Y); return Math.hypot(q[0] - p.u, q[1] - p.v); }).sort((a, b) => a - b);
    return { inliers: best.inl.length, ids: best.inl.map((p) => p.id).sort((a, b) => a - b),
             medPx: e.length ? +e[e.length >> 1].toFixed(2) : null, worstPx: e.length ? +e[e.length - 1].toFixed(2) : null };
  };

  const build = (on) => {
    const ws = on.map((x) => x.wHalf).sort((a, b) => a - b);
    const medW = ws[ws.length >> 1];
    return on.filter((x) => Math.abs(x.wHalf - medW) / medW <= 0.35)
      .map((x) => { const k = T.byId.get(x.id); return { X: k.xMm, Y: k.yMm, u: x.xc, v: x.yc, id: x.id }; });
  };

  const out = {};
  for (const [name, f] of [["raw", F], ["denoised", den(F)]]) {
    const r = afm(f, { bothAxes: true });
    const on = r.fused.filter((x) => T.byId.has(x.id));
    const pairs = build(on);
    out[name] = { read: on.length, afterScaleFilter: pairs.length, allIds: pairs.map((p) => p.id).sort((a, b) => a - b) };
    for (const tol of [2, 4, 8]) out[name]["ransac_tol" + tol] = ransac(pairs, tol);
  }
  return out;
})()
