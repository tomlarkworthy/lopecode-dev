calRun = (async function* () {
  if (!calRunning) {
    yield null;
    await new Promise(() => {}); // park until the toggle re-runs this cell
  }
  const cap = window.document.createElement("canvas");
  cap.width = CAL_FRAME.w;
  cap.height = CAL_FRAME.h;
  const ctx = cap.getContext("2d", { willReadFrequently: true });
  const gray = new Uint8Array(CAL_FRAME.w * CAL_FRAME.h);
  const trace = []; // {t, x} detected orbit-mark x per frame
  let n = 0;
  let lastYield = 0;
  // margin 4, not the fusion-relaxed 0.8: crisp screen marks decode at the full
  // margin 8 on every in-band row, so anything below half of that is a rim-row
  // misread (P0 unreadable at d>7 leaves 7 bits, and 2-3 flipped outer cells
  // still clear a 0.8 bar with the wrong id)
  const pipeOpts = { minMargin: 4, minReadable: 4 };
  // temporal scan dither: alternate the row-lattice phase each frame so a mark
  // whose centre falls badly against one phase (its readable band clipped to a
  // single row) is sampled at complementary offsets on the next frames
  const dith = calRows.length > 1 ? calRows[1] - calRows[0] : 12;
  const phases = [0, 0.5, 0.75, 0.25].map((f) =>
    calRows.map((y) => y - Math.round(f * dith)).filter((y) => y >= 0)
  );
  // grid mode: exponential per-id accumulation of fused centres across frames —
  // the stimulus is static, so the homography should not depend on which subset
  // of marks a single frame's row phase happened to catch
  const acc = new Map(); // id -> {x, y, w, seen}
  const ACC_DECAY = 0.9;
  // Scan rows per uninterrupted block. Chunking exists to keep the tab
  // responsive during the dense grid sweep; orbit shows a single mark against a
  // flat field and the whole sweep costs ~9ms, well inside a frame, so chunking
  // it buys nothing and costs plenty — each setTimeout(0) is clamped to ~4ms,
  // and 13 of them per frame dragged capture from 60fps to 18, which is exactly
  // the temporal resolution the latency estimate is made of.
  const ROW_CHUNK = calMode === "orbit" ? calRows.length : 3;
  // grid is a static scene: there is nothing to gain from detecting at display
  // rate, and the idle gap keeps the tab responsive and cool. Orbit runs flat
  // out because its whole point is temporal resolution.
  const IDLE_MS = 60;
  const mergeRuns = (a, b) => ({
    ...b,
    hits: a.hits.concat(b.hits),
    rawHits: a.rawHits + b.rawHits,
    rejectedByDecode: a.rejectedByDecode + b.rejectedByDecode,
    windows: a.windows + b.windows,
    survived: a.survived + b.survived,
    scanEdges: a.scanEdges + b.scanEdges,
    rowsTouched: a.rowsTouched + b.rowsTouched,
    msDetect: a.msDetect + b.msDetect,
    msDecode: a.msDecode + b.msDecode,
    ms: a.ms + b.ms
  });

  // commanded x at time t, linearly interpolated from the stimulus history
  const cmdX = (t) => {
    const h = stimulusBus.history;
    if (h.length < 2 || t < h[0].t || t > h[h.length - 1].t) return null;
    let lo = 0, hi = h.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (h[mid].t <= t) lo = mid;
      else hi = mid;
    }
    const a = h[lo], b = h[hi];
    const f = (t - a.t) / (b.t - a.t || 1);
    return a.marks[0].x * (1 - f) + b.marks[0].x * f;
  };

  // lag maximising |normalized correlation| between detected and commanded x.
  // Scale/offset/mirror invariant, so it needs no homography.
  const estimateLatency = () => {
    if (calMode !== "orbit" || trace.length < 60) return null;
    let best = null;
    for (let lag = 0; lag <= 400; lag += 8) {
      let sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0, m = 0;
      for (const p of trace) {
        const c = cmdX(p.t - lag);
        if (c == null) continue;
        sx += p.x; sy += c; sxx += p.x * p.x; syy += c * c; sxy += p.x * c;
        m++;
      }
      if (m < 30) continue;
      const cov = sxy - (sx * sy) / m;
      const vx = sxx - (sx * sx) / m;
      const vy = syy - (sy * sy) / m;
      if (vx <= 0 || vy <= 0) continue;
      const r = cov / Math.sqrt(vx * vy);
      if (!best || Math.abs(r) > Math.abs(best.r)) best = { lagMs: lag, r, samples: m };
    }
    return best;
  };

  while (true) {
    await new Promise((r) => window.requestAnimationFrame(r));
    const src = calSource === "camera" ? calVideo : stimulusView.canvas;
    if (calSource === "camera" && (!calVideo || calVideo.readyState < 2)) continue;
    ctx.drawImage(src, 0, 0, CAL_FRAME.w, CAL_FRAME.h);
    const px = ctx.getImageData(0, 0, CAL_FRAME.w, CAL_FRAME.h).data;
    for (let i = 0, p = 0; i < gray.length; i++, p += 4) {
      gray[i] = (px[p] * 77 + px[p + 1] * 150 + px[p + 2] * 29) >> 8;
    }
    const t = window.performance.now();
    const frame = { gray, w: CAL_FRAME.w, h: CAL_FRAME.h, t, n };
    // Sweep the row lattice in chunks, yielding to the event loop between them.
    // A 40-row sweep is ~85ms of synchronous work; run once per animation frame
    // that pins the main thread and scrolling visibly stutters. Rows are
    // independent — NMS is intra-row — so chunking is exactly equivalent to one
    // call, it just caps each uninterrupted block at roughly one frame budget.
    const frameRows = phases[n % phases.length];
    let run = null;
    for (let r0 = 0; r0 < frameRows.length; r0 += ROW_CHUNK) {
      const part = runPipeline(frame, {
        ...pipeOpts,
        scanRows: frameRows.slice(r0, r0 + ROW_CHUNK)
      });
      run = run ? mergeRuns(run, part) : part;
      if (r0 + ROW_CHUNK < frameRows.length)
        await new Promise((r) => window.setTimeout(r, 0));
    }
    // Coarse rows locate marks; sub-row-stride yc needs fuseCluster's V-fit,
    // which needs three rows of the WINNING id. A mark seen through the mirror
    // spans only ~6 coarse rows and its outer ones do not decode, so it lands on
    // the 2-row fallback — where yc degrades to the centroid of whichever rows
    // happened to fire (measured against loopback truth: 29px rms and a -15px
    // BIAS, versus 1.9px rms and no bias once the V-fit engages; a bias frame
    // averaging cannot remove). So rescan a fine lattice inside the band of each
    // mark that fell back, which costs rows in proportion to the marks that
    // actually need help rather than doubling the whole sweep.
    let fused = fuseLandmarks(run.hits);
    const weak = fused.filter((f) => !f.vFit);
    if (weak.length) {
      const extra = new Set();
      // Tried scaling these offsets to the mark's apparent radius, on the theory
      // that rows near the V's apex carry little vertical information. Measured
      // worse on every axis (rmsY 7.6 -> 15.0, V-fit share 100% -> 86%, 136ms ->
      // 750ms per frame): pushed out that far the rows stop decoding, so the
      // mark stays weak, gets re-refined every frame, and the V-fit loses the
      // very rows it needed. Row-stride offsets it is.
      for (const f of weak)
        for (const o of [-2, -1, 1, 2]) {
          const y = Math.round(f.yc + (o * dith) / 3);
          if (y >= 0 && y < CAL_FRAME.h) extra.add(y);
        }
      for (const y of frameRows) extra.delete(y);
      const refineRows = [...extra].sort((a, b) => a - b);
      if (refineRows.length) {
        // chunked like the coarse sweep: an unchunked refinement block is the
        // same main-thread stall, just later in the frame
        for (let r0 = 0; r0 < refineRows.length; r0 += ROW_CHUNK) {
          run = mergeRuns(run, runPipeline(frame, {
            ...pipeOpts,
            scanRows: refineRows.slice(r0, r0 + ROW_CHUNK)
          }));
          if (r0 + ROW_CHUNK < refineRows.length)
            await new Promise((r) => window.setTimeout(r, 0));
        }
        fused = fuseLandmarks(run.hits);
      }
    }
    if (calMode === "grid") {
      for (const [, a] of acc) a.w *= ACC_DECAY;
      for (const f of fused) {
        const a = acc.get(f.id) ?? { x: 0, y: 0, w: 0, seen: 0, vfit: 0 };
        const wNew = f.rows;
        a.x = (a.x * a.w + f.xc * wNew) / (a.w + wNew);
        a.y = (a.y * a.w + f.yc * wNew) / (a.w + wNew);
        a.w += wNew;
        a.seen++;
        if (f.vFit) a.vfit++;
        acc.set(f.id, a);
      }
    }
    if (calMode === "orbit" && fused.length) {
      trace.push({ t, x: fused[0].xc });
      if (trace.length > 240) trace.shift();
    }
    n++;
    if (calMode === "grid") await new Promise((r) => window.setTimeout(r, IDLE_MS));
    // yield ~4x/s so the dataflow is not saturated by 60Hz updates
    if (t - lastYield > 250) {
      lastYield = t;
      yield {
        t,
        n,
        source: calSource,
        mode: calMode,
        capture: cap,
        run,
        fused,
        // accumulated landmarks: ids with meaningful surviving weight only
        landmarks: [...acc.entries()]
          .filter(([, a]) => a.w > 1)
          .map(([id, a]) => ({
            id, xc: a.x, yc: a.y, weight: a.w, seen: a.seen,
            // fraction of contributing frames whose yc came from the V-fit
            // rather than the biased row-centroid fallback
            vFitFrac: a.seen ? a.vfit / a.seen : 0
          })),
        traceLen: trace.length,
        latency: estimateLatency()
      };
    }
  }
}())
