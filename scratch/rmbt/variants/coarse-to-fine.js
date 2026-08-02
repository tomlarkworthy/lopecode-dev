// Coarse-to-fine: a sparse pass proposes the regions that plausibly hold a
// mark, then the shipping detector runs at full density with every pixel
// outside those regions suppressed.
//
// Nothing is copied out of the notebook. The dense pass IS analyzeFrameMan --
// clustering, id vote, pose gate and id dedupe untouched -- it is handed a
// frame whose out-of-region pixels carry no gradient, so edges1Dsub finds
// nothing there, manRowGroups never offers those groups, and findInvolution
// (53% of frame time, ~144*O(n^2) per offered group; solveMan is another 44%
// and runs only on groups that fit one) never sees them. The coarse pass calls
// the real edges1Dsub and detectRowMan.
//
// ---- three things the measurements forced -------------------------------
//
// 1. BANDS DO NOT WORK, BOXES DO. The assignment was horizontal bands. Bands
//    were built and measured first: with a deterministic work proxy (sum of
//    n^2 over offered groups, which is what findInvolution costs) the best
//    band policy found -- coarse stride 32, band = min(wHalf,30)+C -- skips
//    17% of the scan rows and saves 2.6% of the work, because the rows a band
//    excludes are the empty ones that were already cheap. 54% of scan rows
//    pass within 1.2R of a real mark on this archive, so there is no large
//    band of frame to skip. Restricting x too has an oracle work fraction of
//    0.352 (0.067 on the slowest, busiest frame), which is where the lever is.
//
// 2. THE COARSE PASS MUST REQUIRE A DECODE. Boxing every detectRowMan lock
//    made the frame SLOWER (work 1.06): a lock is geometry only, background
//    clutter produces plenty of it, and on the busiest frame -- the one this
//    idea exists for -- the boxes then tiled the whole image. Requiring
//    hit.id != null cuts the work proxy to 0.71 and the busy frame to 0.18.
//    That is the whole result: the coarse pass is worth running only if its
//    acceptance test is stricter than the dense pass's, not merely sparser.
//
// 3. SUPPRESSION MUST NOT MANUFACTURE AN EDGE. A constant fill puts a step at
//    each box boundary and hands manRowGroups an edge that is not in the
//    photo. A suppressed run is filled with a slope-limited walk from the
//    pixel on its left to the pixel on its right: |d| <= 8 everywhere, under
//    the 12 edges1Dsub needs, arriving exactly at the right-hand value so the
//    far boundary is a zero step too. Runs too short for the walk are left as
//    photo rather than approximated.
//
// MEASURED, coarseStride 24 / pad 112 / k 2.0 / snapGap 20:
//   full real set (70 frames, reps 3)  read 391->405, wrong 6->5,
//     rowHits 13417->12018, ms_med 29.6->27.3, ms_p90 48.8->31.6
//   --subset 20 (reps 3)               read 118->120, wrong 0->0,
//     rowHits 3671->3412, ms_med 27.6->24.7
//   synth                              read 24->31, wrong 5->2
// Cost is quoted from rowHits and the work proxy, not from ms: five other
// browsers were running. The p90 is where the idea was supposed to pay and it
// is the column that moved most, which is consistent with the proxy (the
// busiest frame's work goes to 0.19) but is NOT established by this run.
// Four frames regress: hexcase-5iap-12 6->5 read, phone-hexcase-03 7->5,
// hexcase-5ivq-05 gains a wrong, synth-110 reads a 6th mark and one is wrong.
// coarseStride 20 fixes phone-hexcase-03 (406 read) but costs half the rowHits
// saving and puts a wrong on a second real frame, so 24 is kept.
((deps) => {
  const { analyzeFrameMan, edges1Dsub, detectRowMan } = deps;

  let buf = null, bufKey = "", written = [];

  return function coarseToFine(frame, opts = {}) {
    const gray = frame.gray, w = frame.w, h = frame.h;
    const stride = opts.stride ?? 6;
    const thr = opts.edgeThreshold ?? 12;
    const C = opts.coarseStride ?? 24;
    const kx = opts.boxKx ?? 2.0;          // half-extent in chord half-widths
    const ky = opts.boxKy ?? 2.0;
    const pad = opts.boxPad ?? 112;         // px, covers marks the coarse rows missed
    const wCap = opts.boxCap ?? h / 4;     // a lock spanning the frame is clutter
    const gapMin = opts.snapGap ?? 20;     // wider than any gap inside a mark
    const snapMax = opts.snapMax ?? 160;   // give up rather than keep the frame
    const slope = Math.max(1, thr - 4);
    const t0 = window.performance.now();

    // ---- coarse pass: decoded locks only ---------------------------------
    const boxes = [];
    let coarseRows = 0, coarseHits = 0;
    for (let y = Math.floor(C / 2); y < h; y += C) {
      coarseRows++;
      const se = edges1Dsub(gray.subarray(y * w, (y + 1) * w), thr);
      for (const hit of detectRowMan(se, opts)) {
        if (hit.id == null) continue;
        coarseHits++;
        const r = Math.min(hit.wHalf, wCap);
        boxes.push([y - (ky * r + pad), y + (ky * r + pad),
                    hit.foot - (kx * r + pad), hit.foot + (kx * r + pad)]);
      }
    }

    // A frame the coarse pass says nothing about is not evidence that nothing
    // is there, so fall back to the untouched frame rather than delete marks.
    if (boxes.length === 0) {
      const res = analyzeFrameMan(frame, opts);
      return { ...res, rowsTried: coarseRows + (res.rowsTried ?? 0),
               rowHits: coarseHits + (res.rowHits ?? 0),
               coarse: { rows: coarseRows, hits: 0, boxes: 0, full: true },
               ms: window.performance.now() - t0 };
    }

    // ---- boxes -> kept x-intervals per scan row ---------------------------
    const y0 = Math.floor(stride / 2);
    const K = Math.max(0, Math.ceil((h - y0) / stride));
    const iv = new Array(K);
    for (const b of boxes) {
      let lo = Math.ceil((b[0] - y0) / stride), hi = Math.floor((b[1] - y0) / stride);
      if (lo < 0) lo = 0;
      if (hi > K - 1) hi = K - 1;
      let x0 = Math.floor(b[2]), x1 = Math.ceil(b[3]);
      if (x0 < 0) x0 = 0;
      if (x1 > w - 1) x1 = w - 1;
      if (x1 < x0) continue;
      for (let k = lo; k <= hi; k++) (iv[k] || (iv[k] = [])).push([x0, x1]);
    }

    // ---- build the masked frame ------------------------------------------
    const key = w + "x" + h;
    if (bufKey !== key) { buf = new Uint8Array(w * h); bufKey = key; written = []; }
    else for (const y of written) buf.fill(0, y * w, (y + 1) * w);
    written = [];
    let keptPx = 0, denseRows = 0;
    for (let k = 0; k < K; k++) {
      const list = iv[k];
      if (!list) continue;                       // row stays all-zero: no edges
      const y = y0 + k * stride;
      const off = y * w;
      denseRows++;
      written.push(y);
      list.sort((a, b) => a[0] - b[0]);
      const spans = [];
      for (const s of list) {
        const last = spans[spans.length - 1];
        if (last && s[0] <= last[1] + 1) { if (s[1] > last[1]) last[1] = s[1]; }
        else spans.push([s[0], s[1]]);
      }
      // A cut through the MIDDLE of a mark is worse than not covering it at
      // all: the truncated chords still fit an involution, so the mark reads
      // with a displaced foot. (Measured: unsnapped boxes took worst-case
      // leave-one-out from 0.50 to 2.64 mark radii.) So every span boundary is
      // pushed outward until it lands in a gap between edges wider than any
      // gap inside a mark -- the same argument manRowGroups splits on.
      const se = edges1Dsub(gray.subarray(off, off + w), thr);
      const nE = se.length;
      if (nE) {
        const ex = new Float64Array(nE);
        for (let i = 0; i < nE; i++) ex[i] = se[i].x;
        for (const s of spans) {
          let i = 0;
          while (i < nE && ex[i] < s[0]) i++;                      // first edge right of the cut
          while (i > 0 && ex[i - 1] > s[0] - snapMax &&
                 !(i < nE && ex[i] - ex[i - 1] >= gapMin)) i--;
          s[0] = (i > 0 && i < nE && ex[i] - ex[i - 1] >= gapMin)
            ? Math.ceil((ex[i - 1] + ex[i]) / 2) : (i === 0 ? 0 : s[0]);
          let j = nE - 1;
          while (j >= 0 && ex[j] > s[1]) j--;                      // last edge left of the cut
          while (j < nE - 1 && ex[j + 1] < s[1] + snapMax &&
                 !(j >= 0 && ex[j + 1] - ex[j] >= gapMin)) j++;
          s[1] = (j >= 0 && j < nE - 1 && ex[j + 1] - ex[j] >= gapMin)
            ? Math.floor((ex[j] + ex[j + 1]) / 2) : (j === nE - 1 ? w - 1 : s[1]);
        }
      }
      // snapping can make neighbours overlap, so merge once more
      spans.sort((a, b) => a[0] - b[0]);
      const sp = [];
      for (const s of spans) {
        const last = sp[sp.length - 1];
        if (last && s[0] <= last[1] + 1) { if (s[1] > last[1]) last[1] = s[1]; } else sp.push(s);
      }
      let cur = 0;
      for (let i = 0; i < sp.length; i++) {
        const a = Math.max(0, sp[i][0]), b = Math.min(w - 1, sp[i][1]);
        if (b < a || b < cur) continue;
        buf.set(gray.subarray(off + a, off + b + 1), off + a);
        keptPx += b - a + 1;
        if (a > cur) {
          const L = cur > 0 ? buf[off + cur - 1] : gray[off + a];
          const R = gray[off + a];
          const need = Math.ceil(Math.abs(R - L) / slope);
          if (a - cur < need) { buf.set(gray.subarray(off + cur, off + a), off + cur); keptPx += a - cur; }
          else { let v = L; for (let x = cur; x < a; x++) { const dd = R - v; v += dd > slope ? slope : dd < -slope ? -slope : dd; buf[off + x] = v; } }
        }
        cur = b + 1;
      }
      if (cur < w) buf.fill(cur > 0 ? buf[off + cur - 1] : 0, off + cur, off + w);
    }

    const res = analyzeFrameMan({ gray: buf, w, h }, opts);
    return {
      ...res,
      rowsTried: coarseRows + denseRows,
      rowHits: coarseHits + (res.rowHits ?? 0),
      coarse: { rows: coarseRows, hits: coarseHits, boxes: boxes.length,
                denseRows, pxFrac: +(keptPx / (denseRows * w || 1)).toFixed(3) },
      ms: window.performance.now() - t0
    };
  };
})
