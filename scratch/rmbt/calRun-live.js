calRun = async function* () {
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
  // The per-frame lattice phase dither is gone. It existed to give a mark that
  // straddled one phase's rows another chance on the NEXT frame, and it worked,
  // but analyzeFrame now locates marks geometrically and puts dense rows through
  // them within a single frame -- both better (6 of 6 marks rather than 3-4) and
  // no longer dependent on the scene holding still for four frames.
  // grid mode: exponential per-id accumulation of fused centres across frames —
  // the stimulus is static, so the homography should not depend on which subset
  // of marks a single frame's row phase happened to catch
  const acc = new Map(); // id -> {x, y, w, seen, vfit}
  const ACC_DECAY = 0.9;
  // Scan rows per uninterrupted block. Chunking keeps the tab responsive during
  // the dense grid sweep; orbit shows a single mark against a flat field and the
  // whole sweep costs ~9ms, well inside a frame, so chunking it buys nothing and
  // costs plenty — each setTimeout(0) is clamped to ~4ms, and 13 of them per
  // frame dragged capture from 60fps to 18, which is exactly the temporal
  // resolution the latency estimate is made of.
  // With workers the detection is not on this thread at all, so there is
  // nothing to yield to and chunking would only serialise the pool -- each
  // chunk is one round trip that finishes before the next is dealt.
  const ROW_CHUNK = calMode === "orbit" || detectPool ? Infinity : 20;
  const breathe = () => new Promise((r) => window.setTimeout(r, 0));
  // grid is a static scene: there is nothing to gain from detecting at display
  // rate, and the idle gap keeps the tab responsive and cool. Orbit runs flat
  // out because its whole point is temporal resolution.
  const IDLE_MS = 60;

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
    // one shared per-frame routine, also driven by the frame-bank tests, so the
    // regression suite cannot drift away from what the live rig actually runs
    const { run, fused } = await analyzeFrame(frame, {
      // grid is static and can afford the dense pass; orbit is one mark and is
      // spending its budget on temporal resolution, so it scans coarser
      coarseStride: calMode === "orbit" ? 24 : 16,
      fineStride: calMode === "orbit" ? 8 : 6,
      chunk: ROW_CHUNK,
      breathe,
      minMargin: 4,
      minReadable: 4,
      // same routine, rows dealt to the worker pool instead of run here
      ...(detectPool ? { runRows: detectPool.runRows } : {})
    });
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
}()
