// One native frame, detected at several working resolutions. Gives the whole
// framerate-vs-marks-read trade-off from a single scene, so the two questions
// ("why is it slow" and "why does it not match") are answered on the same data.
(async () => {
  const rt = window.__ojs_runtime;
  const m = rt.mains.get("@tomlarkworthy/flat-trace");
  const clt = rt.mains.get("@tomlarkworthy/coded-landmark-tracking");
  const get = (mod, n) => { const v = [...rt._variables].find(z => z._module === mod && z._name === n); return v && v._value; };
  const g = get(m, "grabber"), cv = get(m, "camVideo"), T = get(m, "matTarget");
  const afm = [get(m, "analyzeFrameMan"), get(clt, "analyzeFrameMan")].find(v => typeof v === "function");
  if (!cv || !cv.videoWidth) return { camOff: true };
  const nw = cv.videoWidth, nh = cv.videoHeight;

  const t0 = performance.now();
  await g.grab(cv, nw, nh);
  const full = g.ensureFull().slice();
  const grabNativeMs = +(performance.now() - t0).toFixed(1);

  // Box-downscale the luma by an integer-ish factor, in plain JS, so the cost
  // of doing it ourselves is measured rather than assumed.
  const shrink = (src, sw, sh, dw) => {
    const dh = Math.round(sh * dw / sw), out = new Uint8Array(dw * dh);
    const fx = sw / dw, fy = sh / dh;
    for (let y = 0; y < dh; y++) {
      const y0 = (y * fy) | 0, y1 = Math.min(sh, ((y + 1) * fy) | 0) || y0 + 1;
      for (let x = 0; x < dw; x++) {
        const x0 = (x * fx) | 0, x1 = Math.min(sw, ((x + 1) * fx) | 0) || x0 + 1;
        let s = 0, n = 0;
        for (let yy = y0; yy < y1; yy++) { const row = yy * sw; for (let xx = x0; xx < x1; xx++) { s += src[row + xx]; n++; } }
        out[y * dw + x] = n ? (s / n) | 0 : src[y0 * sw + x0];
      }
    }
    return { gray: out, w: dw, h: dh };
  };

  const rows = [];
  for (const W of [1080, 800, 640, 540, 480, 400, 320]) {
    const ts = performance.now();
    const f = W === nw ? { gray: full, w: nw, h: nh } : shrink(full, nw, nh, W);
    const shrinkMs = +(performance.now() - ts).toFixed(1);
    const td = performance.now();
    const res = afm(f, {});
    const detectMs = +(performance.now() - td).toFixed(1);
    const tb = performance.now();
    afm(f, { bothAxes: true });
    const bothMs = +(performance.now() - tb).toFixed(1);
    const on = res.fused.filter((x) => T.byId.has(x.id)).length;
    rows.push({ W, px: +(f.w * f.h / 1e6).toFixed(2), shrinkMs, detectMs, bothMs,
                found: res.fused.length, onMat: on, rejected: res.fused.length - on });
  }
  return { native: [nw, nh], grabNativeMs, matMarks: T.marks.length, rows };
})()
