// Frame-adaptive base threshold + a second, HIGHER-threshold pass that may only
// add ids the base pass did not read. Two-level, but the levels are whole
// passes rather than a seed/continuation rule inside edges1Dsub -- which is the
// only two-level scheme reachable without forking edges1Dsub.
//
// Direction of the second level is the measured one: on the archive the
// per-frame oracle threshold is ABOVE 12 for the frames that lose marks at 12
// (phone-hexcase-07 reads 5/7 at 12 and 7/7 at 20-24), because a higher
// threshold deletes the clutter edges that break a group, not the mark's teeth.
(deps) => {
  const CFG = {"Q":0.75,"K":3,"HI":26,"mult":2,"samePaper":0.8,"strideMult":2};
  const { analyzeFrameMan } = deps;
  return function analyzeTwoLevel(frame, opts = {}) {
    const gray = frame.gray, w = frame.w, h = frame.h;
    const stride = opts.stride ?? 6;
    const thrBase = opts.edgeThreshold ?? 12;

    // frame noise statistic: p75 of |first difference| over the scanned rows
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
    for (let v = 0; v < 256; v++) { acc += hist[v]; if (acc >= CFG.Q * c) { p = v; break; } }
    const thr0 = Math.min(CFG.HI, Math.max(thrBase, CFG.K * p));

    const A = analyzeFrameMan(frame, { ...opts, edgeThreshold: thr0 });
    if (!CFG.mult) return A;
    // optional gate: only spend the second pass when the first left a cluster
    // that posed but did not decode -- evidence of a mark it could not read
    if (CFG.gate === "unread" && !(A.unidentified ?? []).some((u) => u.posed)) return A;
    const B = analyzeFrameMan(frame, {
      ...opts, edgeThreshold: thr0 * CFG.mult,
      stride: CFG.strideMult > 1 ? Math.round(stride * CFG.strideMult) : stride
    });

    const fused = A.fused.slice();
    const ids = new Set(fused.map((f) => f.id));
    for (const m of B.fused) {
      if (ids.has(m.id)) continue;
      // not a second reading of a mark the base pass already placed
      const near = fused.some((f) => {
        const size = f.a ?? f.wHalf ?? 24;
        return Math.hypot(f.xc - m.xc, f.yc - m.yc) < CFG.samePaper * size;
      });
      if (near) continue;
      ids.add(m.id);
      fused.push({ ...m, pass: 2 });
    }
    return {
      fused,
      unidentified: [...A.unidentified, ...B.unidentified],
      rowsTried: A.rowsTried + B.rowsTried,
      rowHits: A.rowHits + B.rowHits,
      thr0,
      ms: A.ms + B.ms
    };
  };
}
