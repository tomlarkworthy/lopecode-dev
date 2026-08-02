// CONTROL (verifier): the adaptive part removed. Fixed base 12 + second pass at
// 24, merged by id only -- identical merge code to adaptive-threshold. On the
// REAL set this is byte-for-byte what adaptive-threshold does (thr0 clamps to
// 12 on every archive frame), so it isolates the real gain. On the SYNTH set it
// exercises the merge at the real operating point, which adaptive-threshold
// never does because it raises its own base there.
(deps) => {
  const MULT = 2.0, SAME = 0.8;
  return function ctrlUnion(frame, opts = {}) {
    const thr0 = opts.edgeThreshold ?? 12;
    const A = deps.analyzeFrameMan(frame, { ...opts, edgeThreshold: thr0 });
    const B = deps.analyzeFrameMan(frame, { ...opts, edgeThreshold: thr0 * MULT });
    const fused = A.fused.slice();
    const ids = new Set(fused.map((f) => f.id));
    for (const m of B.fused) {
      if (ids.has(m.id)) continue;
      const near = fused.some((f) => {
        const size = f.a ?? f.wHalf ?? 24;
        return Math.hypot(f.xc - m.xc, f.yc - m.yc) < SAME * size;
      });
      if (near) continue;
      ids.add(m.id);
      fused.push({ ...m, level: 2 });
    }
    return { fused, unidentified: [...A.unidentified, ...B.unidentified],
      rowsTried: A.rowsTried + B.rowsTried, rowHits: A.rowHits + B.rowHits, ms: A.ms + B.ms };
  };
}
