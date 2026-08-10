// One native frame; for each working resolution and each pre-blur radius, how
// many mat marks come back and what it costs. Picks LIVE_W and the filter from
// the same scene instead of trading one off against the other blind.
(async () => {
  const rt = window.__ojs_runtime;
  const m = rt.mains.get("@tomlarkworthy/flat-trace");
  const clt = rt.mains.get("@tomlarkworthy/coded-landmark-tracking");
  const G = (mod, n) => { const v = [...rt._variables].find(z => z._module === mod && z._name === n); return v && v._value; };
  const g = G(m, "grabber"), cv = G(m, "camVideo"), T = G(m, "matTarget");
  const afm = [G(m, "analyzeFrameMan"), G(clt, "analyzeFrameMan")].find(v => typeof v === "function");
  const nw = cv.videoWidth, nh = cv.videoHeight;
  await g.grab(cv, nw, nh);
  const src = g.ensureFull().slice();

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
  const blur = (px, w, h, r) => {
    const tmp = new Uint8Array(w * h), out = new Uint8Array(w * h), n = 2 * r + 1;
    for (let y = 0; y < h; y++) {
      let s = 0;
      for (let x = -r; x <= r; x++) s += px[y * w + Math.min(w - 1, Math.max(0, x))];
      for (let x = 0; x < w; x++) { tmp[y * w + x] = (s / n) | 0; s += px[y * w + Math.min(w - 1, x + r + 1)] - px[y * w + Math.max(0, x - r)]; }
    }
    for (let x = 0; x < w; x++) {
      let s = 0;
      for (let y = -r; y <= r; y++) s += tmp[Math.min(h - 1, Math.max(0, y)) * w + x];
      for (let y = 0; y < h; y++) { out[y * w + x] = (s / n) | 0; s += tmp[Math.min(h - 1, y + r + 1) * w + x] - tmp[Math.max(0, y - r) * w + x]; }
    }
    return out;
  };

  const rows = [];
  for (const W of [1080, 800, 640, 540, 440]) {
    const t0 = performance.now();
    const f = W === nw ? { gray: src, w: nw, h: nh } : shrink(src, nw, nh, W);
    const shrinkMs = +(performance.now() - t0).toFixed(1);
    for (const r of [0, 1, 2, 3]) {
      const tb = performance.now();
      const px = r ? blur(f.gray, f.w, f.h, r) : f.gray;
      const blurMs = +(performance.now() - tb).toFixed(1);
      const td = performance.now();
      const res = afm({ gray: px, w: f.w, h: f.h }, {});
      const detMs = +(performance.now() - td).toFixed(1);
      const on = res.fused.filter((x) => T.byId.has(x.id)).length;
      rows.push({ W, r, onMat: on, cand: res.unidentified.length + res.fused.length,
                  shrinkMs, blurMs, detMs, totalMs: +(shrinkMs + blurMs + detMs).toFixed(1) });
    }
  }
  return { native: [nw, nh], matMarks: T.marks.length, rows };
})()
