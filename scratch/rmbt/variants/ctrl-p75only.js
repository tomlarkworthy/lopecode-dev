// CONTROL (verifier): the per-frame adaptive threshold ALONE, no second pass.
// Isolates whether the synth gain is the noise statistic or the merge.
(deps) => {
  const K = 3, Q = 0.75, HI = 26;
  return function ctrlP75(frame, opts = {}) {
    const gray = frame.gray, w = frame.w, h = frame.h;
    const stride = opts.stride ?? 6;
    const thrBase = opts.edgeThreshold ?? 12;
    const hist = new Int32Array(256); let c = 0;
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
    const thr0 = Math.min(HI, Math.max(thrBase, K * p));
    return deps.analyzeFrameMan(frame, { ...opts, edgeThreshold: thr0 });
  };
}
