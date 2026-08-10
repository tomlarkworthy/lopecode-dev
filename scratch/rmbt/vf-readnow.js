// Run the SHIPPED strategy against the live camera on a page that predates it:
// grab native, shrink to 640, detect raw, rescue with one box blur, then hand
// the winning detection to traceFrame via opts.detection so the whole cascade
// runs. Answers "does it read the mat now" without a reload.
(async () => {
  const rt = window.__ojs_runtime;
  const m = rt.mains.get("@tomlarkworthy/flat-trace");
  const clt = rt.mains.get("@tomlarkworthy/coded-landmark-tracking");
  const G = (mod, n) => { const v = [...rt._variables].find(z => z._module === mod && z._name === n); return v && v._value; };
  const g = G(m, "grabber"), cv = G(m, "camVideo"), T = G(m, "matTarget");
  const tf = G(m, "traceFrame"), prof = G(m, "cameraProfile"), mkSampler = G(m, "makeMatSampler");
  const afm = [G(m, "analyzeFrameMan"), G(clt, "analyzeFrameMan")].find(v => typeof v === "function");
  if (!cv || !cv.videoWidth) return { camOff: true };
  const nw = cv.videoWidth, nh = cv.videoHeight;

  const shrink = (px, sw, sh, dw) => {
    const dh = Math.round(sh * dw / sw), out = new Uint8Array(dw * dh);
    const fx = sw / dw, fy = sh / dh;
    for (let y = 0; y < dh; y++) {
      const y0 = (y * fy) | 0, y1 = Math.max(y0 + 1, Math.min(sh, ((y + 1) * fy) | 0));
      for (let x = 0; x < dw; x++) {
        const x0 = (x * fx) | 0, x1 = Math.max(x0 + 1, Math.min(sw, ((x + 1) * fx) | 0));
        let s = 0, n = 0;
        for (let yy = y0; yy < y1; yy++) { const row = yy * sw; for (let xx = x0; xx < x1; xx++) { s += px[row + xx]; n++; } }
        out[y * dw + x] = (s / n) | 0;
      }
    }
    return { gray: out, w: dw, h: dh };
  };
  const denoise = (f, radius) => {
    const r = radius ?? Math.max(1, Math.round(f.w / 540));
    const { gray, w, h } = f, tmp = new Uint8Array(w * h), out = new Uint8Array(w * h), n = 2 * r + 1;
    for (let y = 0; y < h; y++) {
      let s = 0;
      for (let x = -r; x <= r; x++) s += gray[y * w + Math.min(w - 1, Math.max(0, x))];
      for (let x = 0; x < w; x++) { tmp[y * w + x] = (s / n) | 0; s += gray[y * w + Math.min(w - 1, x + r + 1)] - gray[y * w + Math.max(0, x - r)]; }
    }
    for (let x = 0; x < w; x++) {
      let s = 0;
      for (let y = -r; y <= r; y++) s += tmp[Math.min(h - 1, Math.max(0, y)) * w + x];
      for (let y = 0; y < h; y++) { out[y * w + x] = (s / n) | 0; s += tmp[Math.min(h - 1, y + r + 1) * w + x] - tmp[Math.max(0, y - r) * w + x]; }
    }
    return { gray: out, w, h };
  };

  const t0 = performance.now();
  await g.grab(cv, nw, nh);
  const native = { gray: g.ensureFull().slice(), w: nw, h: nh };
  const grabMs = +(performance.now() - t0).toFixed(0);

  // --- the LIVE pass, exactly as shipped ---
  const t1 = performance.now();
  const small = shrink(native.gray, nw, nh, 640);
  let live = afm(small, {});
  let liveOn = live.fused.filter((f) => T.byId.has(f.id));
  let rescued = false;
  if (liveOn.length < 4) {
    const alt = afm(denoise(small), {});
    const altOn = alt.fused.filter((f) => T.byId.has(f.id));
    if (altOn.length > liveOn.length) { live = alt; liveOn = altOn; rescued = true; }
  }
  const liveMs = +(performance.now() - t1).toFixed(0);

  // --- the SHOT, at native, same rescue, through the real cascade ---
  const t2 = performance.now();
  let shot = afm(native, { bothAxes: true });
  let shotOn = shot.fused.filter((f) => T.byId.has(f.id));
  let shotRescued = false;
  if (shotOn.length < 4) {
    const alt = afm(denoise(native), { bothAxes: true });
    const altOn = alt.fused.filter((f) => T.byId.has(f.id));
    if (altOn.length > shotOn.length) { shot = alt; shotOn = altOn; shotRescued = true; }
  }
  const detectMs = +(performance.now() - t2).toFixed(0);

  const I = prof && prof.w === nw && prof.h === nh
    ? prof : { f: 1.1 * nw, cx: nw / 2, cy: nh / 2, k1: 0, k2: 0, p1: 0, p2: 0 };
  const t3 = performance.now();
  const r = tf(native, I, { detection: shot, matGray: mkSampler(), tolMm: 0.2 });
  const traceMs = +(performance.now() - t3).toFixed(0);

  return {
    native: [nw, nh], calibrated: !!(prof && prof.w === nw && prof.h === nh),
    live: { at640: liveOn.length, of: T.marks.length, rescued, ms: liveMs, fps: +(1000 / (grabMs + liveMs)).toFixed(1) },
    shot: { marks: shotOn.length, of: T.marks.length, rescued: shotRescued, ms: detectMs },
    trace: r.ok
      ? { ok: true, ms: traceMs, sizeMm: r.sizeMm, marks: r.marks, rmsPx: r.rmsPx,
          matResidualPct: r.matResidualPct, tiltDeg: r.tiltDeg, areaMm2: r.areaMm2, points: r.outline.length }
      : { ok: false, ms: traceMs, why: String(r.why).slice(0, 140), marks: r.marks,
          rmsPx: r.rmsPx, matResidualPct: r.matResidualPct }
  };
})()
