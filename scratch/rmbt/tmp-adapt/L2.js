// LOCAL adaptive edge threshold.
//
// The threshold is expressed as a per-pixel GAIN on the first difference, and
// the gained row is handed back to the shipping cascade as luma:
//
//   out[0] = 0 ;  out[i] = out[i-1] + g(i) * (gray[i] - gray[i-1])
//
// so d_out[i] === g(i) * d[i] EXACTLY -- no phantom gradient from the gain
// ramp (which a naive out = gray*g does have: d_out = g*d + gray*dg, and
// gray~128 makes dg=0.01/px a phantom edge of 1.3). Thresholding g*d at 12 is
// thresholding d at 12/g, i.e. a per-pixel adaptive threshold, and every stage
// after edges1Dsub -- manRowGroups, findInvolution, solveMan, fitManPose, the
// clustering and the id dedupe -- is the real cell, reached through
// deps.analyzeFrameMan. Nothing is copied.
//
// The local statistic is the qp-quantile of the PEAK strengths in a window of
// +-B px (peaks found the same way edges1Dsub finds them), not a quantile of
// all |d|: a quantile of all |d| is dominated by the flat pixels between the
// teeth, and it made a row crossing a big mark raise its own threshold until
// the mark disappeared (measured: -25 real read).
(deps) => {
  const CFG = {"B":48,"qp":0.5,"beta":0.5,"LO":12,"HI":28,"minPeak":4,"minPeaks":6,"win":1};
  const { analyzeFrameMan } = deps;

  return function analyzeLocalAdaptive(frame, opts = {}) {
    const gray = frame.gray, w = frame.w, h = frame.h;
    const stride = opts.stride ?? 6;
    const thrBase = opts.edgeThreshold ?? 12;
    const B = CFG.B, qp = CFG.qp, beta = CFG.beta, LO = CFG.LO, HI = CFG.HI;
    const minPeak = CFG.minPeak, minPeaks = CFG.minPeaks, win = CFG.win;
    const nb = Math.max(1, Math.ceil(w / B));

    const out = new Float32Array(w * h);
    const d = new Float32Array(w);
    const pxB = new Int32Array(4096);      // peak block index
    const pS = new Float32Array(4096);     // peak strength
    const thrB = new Float64Array(nb);
    const cnt = new Int32Array(nb);
    const start = new Int32Array(nb + 1);
    const buf = new Float32Array(4096);
    const tmp = new Float32Array(512);
    const fill = new Int32Array(nb);

    for (let y = (stride >> 1); y < h; y += stride) {
      const base = y * w;
      for (let i = 1; i < w; i++) d[i] = gray[base + i] - gray[base + i - 1];
      d[0] = 0;

      // ---- peaks, same rule as edges1Dsub, floored at minPeak -------------
      let np = 0;
      for (let i = 2; i < w - 2 && np < 4096; i++) {
        const v = d[i];
        const a = v < 0 ? -v : v;
        if (a < minPeak) continue;
        if ((v > 0 && v >= d[i - 1] && v >= d[i + 1]) ||
            (v < 0 && v <= d[i - 1] && v <= d[i + 1])) {
          let b = (i / B) | 0; if (b >= nb) b = nb - 1;
          pxB[np] = b; pS[np] = a; np++;
        }
      }
      // bucket peaks by block (counting sort)
      cnt.fill(0);
      for (let k = 0; k < np; k++) cnt[pxB[k]]++;
      start[0] = 0;
      for (let b = 0; b < nb; b++) start[b + 1] = start[b] + cnt[b];
      fill.fill(0);
      for (let k = 0; k < np; k++) { const b = pxB[k]; buf[start[b] + fill[b]++] = pS[k]; }

      // ---- per-block threshold from the peak-strength quantile in +-win ----
      for (let b = 0; b < nb; b++) {
        const b0 = Math.max(0, b - win), b1 = Math.min(nb - 1, b + win);
        const n = start[b1 + 1] - start[b0];
        let t;
        if (n < minPeaks) {
          t = thrBase;                      // no structure here: leave it alone
        } else {
          const m = Math.min(n, tmp.length);
          for (let k = 0; k < m; k++) tmp[k] = buf[start[b0] + k];
          const sl = tmp.subarray(0, m);
          sl.sort();
          t = beta * sl[Math.min(m - 1, Math.floor(qp * m))];
        }
        thrB[b] = t < LO ? LO : t > HI ? HI : t;
      }

      // ---- integrate the gained difference --------------------------------
      let acc = 0;
      out[base] = 0;
      for (let x = 1; x < w; x++) {
        const t = (x - B * 0.5) / B;
        let b0 = Math.floor(t);
        const f = t - b0;
        if (b0 < 0) b0 = 0; else if (b0 > nb - 1) b0 = nb - 1;
        const b1 = Math.min(nb - 1, b0 + 1);
        const th = thrB[b0] + (thrB[b1] - thrB[b0]) * (b0 === b1 ? 0 : f);
        acc += (thrBase / th) * d[x];
        out[base + x] = acc;
      }
    }
    return analyzeFrameMan({ gray: out, w, h }, opts);
  };
}
