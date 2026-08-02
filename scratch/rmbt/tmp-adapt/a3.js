// Adaptive edge threshold, expressed as a per-row / per-block GAIN on the luma
// instead of a reimplementation of edges1Dsub. edges1Dsub thresholds the first
// difference at an absolute `thr`; multiplying a row by g is exactly equivalent
// to thresholding at thr/g, and it leaves the parabolic sub-pixel offset
// untouched (the parabola is fitted to |d| values, which all scale by the same
// g, and the vertex of a scaled parabola is the same vertex). So the whole
// shipping cascade -- edges1Dsub, detectRowMan, manRowGroups, findInvolution,
// solveMan, fitManPose, the clustering and the id dedupe -- runs unmodified
// from deps.analyzeFrameMan. Nothing is copied.
(deps) => {
  const CFG = {"blockPx":0,"q":0.9,"K":1.6,"B":0,"LO":5,"HI":30,"smooth":false};
  const { analyzeFrameMan } = deps;

  return function analyzeAdaptive(frame, opts = {}) {
    const gray = frame.gray, w = frame.w, h = frame.h;
    const stride = opts.stride ?? 6;
    const thrBase = opts.edgeThreshold ?? 12;
    const bw = CFG.blockPx > 0 ? Math.min(CFG.blockPx, w) : w;
    const nb = Math.max(1, Math.ceil(w / bw));
    const q = CFG.q, K = CFG.K, LO = CFG.LO, HI = CFG.HI;

    const out = new Float32Array(w * h);   // rows we never scan stay 0, never read
    const hist = new Int32Array(256);
    const gain = new Float64Array(nb + 2);
    const stat = new Float64Array(nb);

    for (let y = (stride >> 1); y < h; y += stride) {
      const base = y * w;
      for (let b = 0; b < nb; b++) {
        const x0 = Math.max(1, b * bw), x1 = Math.min(w, (b + 1) * bw);
        let c = 0;
        for (let x = x0; x < x1; x++) {
          let v = gray[base + x] - gray[base + x - 1];
          if (v < 0) v = -v;
          if (v > 255) v = 255;
          hist[v | 0]++; c++;
        }
        let p = 0;
        if (c > 0) {
          const target = q * c;
          let acc = 0;
          for (let v = 0; v < 256; v++) { acc += hist[v]; if (acc >= target) { p = v; break; } }
          for (let x = x0; x < x1; x++) {           // O(block) clear
            let v = gray[base + x] - gray[base + x - 1];
            if (v < 0) v = -v; if (v > 255) v = 255;
            hist[v | 0] = 0;
          }
        }
        stat[b] = p;
      }
      // optional smoothing of the block statistic along x
      if (CFG.smooth && nb > 2) {
        let prev = stat[0];
        for (let b = 0; b < nb; b++) {
          const nxt = b + 1 < nb ? stat[b + 1] : stat[b];
          const s = 0.25 * prev + 0.5 * stat[b] + 0.25 * nxt;
          prev = stat[b];
          stat[b] = s;
        }
      }
      for (let b = 0; b < nb; b++) {
        let t = K * stat[b] + CFG.B;
        if (t < LO) t = LO; else if (t > HI) t = HI;
        gain[b + 1] = thrBase / t;
      }
      gain[0] = gain[1];
      gain[nb + 1] = gain[nb];

      if (nb === 1) {
        const g = gain[1];
        for (let x = 0; x < w; x++) out[base + x] = gray[base + x] * g;
      } else {
        for (let x = 0; x < w; x++) {
          const t = (x - bw * 0.5) / bw;          // block-centre coordinate
          const b0 = Math.floor(t);
          const f = t - b0;
          const g0 = gain[Math.min(nb + 1, Math.max(0, b0 + 1))];
          const g1 = gain[Math.min(nb + 1, Math.max(0, b0 + 2))];
          out[base + x] = gray[base + x] * (g0 + (g1 - g0) * f);
        }
      }
    }
    return analyzeFrameMan({ gray: out, w, h }, opts);
  };
}
