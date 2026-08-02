// FRAME-level noise-proportional threshold. p75 of |first difference| over the
// scanned rows is a pure noise/texture statistic (it sits far below any mark
// edge: measured 1-4 on all 20 archive frames, 7-8 on the rendered scenes), so
// K*p75 tracks the sensor rather than the scene content. Floored at the
// shipping constant because every measured threshold below 12 loses real reads
// (12->118, 11->112, 10->109, 9->113).
(deps) => (frame, opts = {}) => {
  const gray = frame.gray, w = frame.w, h = frame.h;
  const stride = opts.stride ?? 6;
  const thrBase = opts.edgeThreshold ?? 12;
  const K = 3, Q = 0.75, HI = 26;
  const hist = new Int32Array(256);
  let c = 0;
  for (let y = (stride >> 1); y < h; y += stride) {
    const base = y * w;
    for (let x = 1; x < w; x++) {
      let v = gray[base + x] - gray[base + x - 1];
      if (v < 0) v = -v; if (v > 255) v = 255;
      hist[v | 0]++; c++;
    }
  }
  let acc = 0, p = 0;
  for (let v = 0; v < 256; v++) { acc += hist[v]; if (acc >= Q * c) { p = v; break; } }
  const thr = Math.min(HI, Math.max(thrBase, K * p));
  return deps.analyzeFrameMan(frame, { ...opts, edgeThreshold: thr });
}
