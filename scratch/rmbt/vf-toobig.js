// Marks read AND whether their ids agree with the geometry, across working
// resolutions. A count alone cannot tell a good read from a confidently wrong
// one, so grade on the spread of image-distance / model-distance over every
// pair: constant if the ids are right, scattered if they are not.
(async () => {
  const rt = window.__ojs_runtime;
  const m = rt.mains.get("@tomlarkworthy/flat-trace");
  const clt = rt.mains.get("@tomlarkworthy/coded-landmark-tracking");
  const G = (mod, n) => { const v = [...rt._variables].find(z => z._module === mod && z._name === n); return v && v._value; };
  const g = G(m, "grabber"), cv = G(m, "camVideo"), T = G(m, "matTarget");
  const afm = [G(m, "analyzeFrameMan"), G(clt, "analyzeFrameMan")].find(v => typeof v === "function");
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

  const nw = cv.videoWidth, nh = cv.videoHeight;
  await g.grab(cv, nw, nh);
  const src = g.ensureFull().slice();

  const grade = (on) => {
    if (on.length < 3) return { consistent: null, spread: null };
    const rr = [];
    for (let i = 0; i < on.length; i++) for (let j = i + 1; j < on.length; j++) {
      const a = T.byId.get(on[i].id), b = T.byId.get(on[j].id);
      const dm = Math.hypot(a.xMm - b.xMm, a.yMm - b.yMm);
      if (dm < 1) continue;
      rr.push(Math.hypot(on[i].xc - on[j].xc, on[i].yc - on[j].yc) / dm);
    }
    if (!rr.length) return { consistent: null, spread: null };
    rr.sort((x, y) => x - y);
    const med = rr[rr.length >> 1];
    // a pair is consistent if its scale is within 15% of the median
    const okPairs = rr.filter((v) => Math.abs(v - med) / med < 0.15).length;
    return { spread: +(rr[rr.length - 1] / rr[0]).toFixed(2), pairOkPct: Math.round(100 * okPairs / rr.length) };
  };

  const rows = [];
  for (const W of [1080, 800, 640, 540, 440, 360]) {
    const f = W === nw ? { gray: src, w: nw, h: nh } : shrink(src, nw, nh, W);
    for (const blur of [false, true]) {
      const r = afm(blur ? den(f) : f, {});
      const on = r.fused.filter((x) => T.byId.has(x.id));
      const wh = on.map((x) => 2 * x.wHalf).sort((a, b) => a - b);
      rows.push({ W, blur, marks: on.length,
                  markPx: wh.length ? Math.round(wh[wh.length >> 1]) : null, ...grade(on) });
    }
  }
  return { native: [nw, nh], rows };
})()
