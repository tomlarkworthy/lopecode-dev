// ADAPTIVE EDGE THRESHOLD -- two parts, both measured, both load-bearing.
//
//  (1) thr0 = clamp(K * p75(|first difference|), thrBase, 26), per FRAME.
//      p75 of |d| over the scanned rows is a pure noise/texture statistic: it
//      sits far below any mark edge, so it tracks the sensor and the lighting
//      rather than the scene content. Measured on the archive it is 1-4 on
//      every one of the 20 subset frames and 7-8 on the rendered scenes, so
//      with K=3 it is EXACTLY 12 (a no-op) on every real frame and 21-24 on
//      the synthetic ones.
//      Floored at the shipping constant because the threshold sweep says every
//      value below 12 loses real reads: 12->118, 11->112, 10->109, 9->113,
//      8->108 (subset 20).
//
//  (2) a second pass at 2*thr0 whose marks are merged in BY ID -- it may only
//      add ids the base pass did not read, never move or replace one.
//      This is the two-level idea, with the levels as whole passes rather than
//      a seed/continuation rule inside edges1Dsub (which cannot be reached
//      without forking that cell). The direction is the measured one: the
//      per-frame oracle threshold is ABOVE 12 for the frames that lose marks,
//      because a higher threshold deletes the clutter edges that split a group,
//      not the mark's own teeth. phone-hexcase-07 reads 5/7 at thr 12 and 7/7
//      at thr 20-24; hexcase-5iap-13 reads 3 at 12 and 4 at 24, and the union
//      is 6 -- the two levels see different marks.
//
// WHICH PAYOFF THIS IS: recall, not cost. rowHits goes 13417 -> 22368 on the
// full archive (1.67x). Trading the second pass's stride for cost (stride x2)
// gets 1.33x but gives back 10 of the 23 real reads, so it is not kept.
//
// HOW IT IS IMPLEMENTED: entirely through opts.edgeThreshold on the real
// analyzeFrameMan. Nothing is copied or reimplemented -- edges1Dsub,
// manRowGroups, findInvolution, solveMan, fitManPose, the clustering and the
// id dedupe are all the shipping cells, reached through deps.
//
// MEASURED, full 70-frame archive + 6 rendered scenes, one rep:
//   baseline   real 391 read / 6 wrong,  synth 24 read / 5 wrong, rowHits 13417
//   this       real 414 read / 7 wrong,  synth 42 read / 0 wrong, rowHits 22368
//   score (read - 3*wrong): real 373 -> 393, synth 9 -> 42
// The one extra real "wrong" is on hexcase-5ivq-08, which already emits 2 at
// baseline; no frame lost a read and no frame's leave-one-out got worse (the
// looMax 0.91 -> 2.30 is a frame that had NO valid pose at baseline and now
// has one).
//
// WHAT DID NOT WORK, so it is not repeated: per-ROW and per-BLOCK adaptation.
// A row crossing a big mark has a high |d| quantile BECAUSE of the mark, so the
// rule raises that row's own threshold and deletes the thing it is looking at:
// per-row q90 scored real 106 (-12), per-block 93 (-25), and a peak-strength
// (rank) local normalisation, which is immune to that feedback, still scored
// 108-115. Local adaptation loses on real frames at every setting tried.
(deps) => {
  const K = 3;            // thr per unit of noise; 3 * p75max(=4) == the shipped 12
  const Q = 0.75;         // quantile of |d| used as the noise statistic
  const HI = 26;          // never raise the base pass past this
  const MULT = 2.0;       // second level, relative to the adaptive base
  const SAME = 0.8;       // an added mark this close to a placed one is the same paper

  return function analyzeAdaptiveThreshold(frame, opts = {}) {
    const gray = frame.gray, w = frame.w, h = frame.h;
    const stride = opts.stride ?? 6;
    const thrBase = opts.edgeThreshold ?? 12;

    // ---- frame noise statistic (0.33ms at 960x720, stride 4) --------------
    const hist = new Int32Array(256);
    let c = 0;
    for (let y = (stride >> 1); y < h; y += stride) {
      const base = y * w;
      for (let x = 1; x < w; x++) {
        let v = gray[base + x] - gray[base + x - 1];
        if (v < 0) v = -v;
        if (v > 255) v = 255;
        hist[v | 0]++; c++;
      }
    }
    let acc = 0, p = 0;
    for (let v = 0; v < 256; v++) { acc += hist[v]; if (acc >= Q * c) { p = v; break; } }
    const thr0 = Math.min(HI, Math.max(thrBase, K * p));

    // ---- base level -------------------------------------------------------
    const A = deps.analyzeFrameMan(frame, { ...opts, edgeThreshold: thr0 });

    // ---- second, cleaner level: may only ADD ids ---------------------------
    const B = deps.analyzeFrameMan(frame, { ...opts, edgeThreshold: thr0 * MULT });
    const fused = A.fused.slice();
    const ids = new Set(fused.map((f) => f.id));
    for (const m of B.fused) {
      if (ids.has(m.id)) continue;
      const near = fused.some((f) => {
        const size = f.a ?? f.wHalf ?? 24;
        return Math.hypot(f.xc - m.xc, f.yc - m.yc) < SAME * size;
      });
      if (near) continue;             // same piece of paper, disagreeing ids
      ids.add(m.id);
      fused.push({ ...m, level: 2 });
    }

    return {
      fused,
      unidentified: [...A.unidentified, ...B.unidentified],
      thr0,
      rowsTried: A.rowsTried + B.rowsTried,
      rowHits: A.rowHits + B.rowHits,
      ms: A.ms + B.ms
    };
  };
}
