calRun = (async function* () {
  if (!calRunning) {
    yield null;
    await new Promise(() => {}); // park until the toggle re-runs this cell
  }
  const cap = window.document.createElement("canvas");
  cap.width = FRAME.w;
  cap.height = FRAME.h;
  const ctx = cap.getContext("2d", { willReadFrequently: true });
  const gray = new Uint8Array(FRAME.w * FRAME.h);
  const trace = []; // {t, x} detected orbit-mark x per frame
  let n = 0;
  let lastYield = 0;
  // margin 4, not the fusion-relaxed 0.8: crisp screen marks decode at the full
  // margin 8 on every in-band row, so anything below half of that is a rim-row
  // misread (P0 unreadable at d>7 leaves 7 bits, and 2-3 flipped outer cells
  // still clear a 0.8 bar with the wrong id)
  const pipeOpts = { minMargin: 4, minReadable: 4 };

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
    ctx.drawImage(src, 0, 0, FRAME.w, FRAME.h);
    const px = ctx.getImageData(0, 0, FRAME.w, FRAME.h).data;
    for (let i = 0, p = 0; i < gray.length; i++, p += 4) {
      gray[i] = (px[p] * 77 + px[p + 1] * 150 + px[p + 2] * 29) >> 8;
    }
    const t = window.performance.now();
    const frame = { gray, w: FRAME.w, h: FRAME.h, t, n };
    const run = runPipeline(frame, pipeOpts);
    const fused = fuseLandmarks(run.hits);
    if (calMode === "orbit" && fused.length) {
      trace.push({ t, x: fused[0].xc });
      if (trace.length > 240) trace.shift();
    }
    n++;
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
        traceLen: trace.length,
        latency: estimateLatency()
      };
    }
  }
}())