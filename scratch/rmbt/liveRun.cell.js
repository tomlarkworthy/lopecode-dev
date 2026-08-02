liveRun = {
  if (!liveOn) {
    yield null;
    await new Promise(() => {}); // park until the toggle re-runs this cell
  }
  if (liveStream && liveStream.error) {
    liveView.hud.textContent = "camera unavailable: " + liveStream.error;
    yield { error: liveStream.error };
    await new Promise(() => {});
  }
  const overlay = liveView.overlay;
  const cap = window.document.createElement("canvas");
  let W = 0, H = 0, ctx = null, gray = null;
  let n = 0, lastYield = 0;
  const fps = [];
  const esc = (s) => String(s).replace(/[<&]/g, (c) => (c === "<" ? "&lt;" : "&amp;"));

  while (true) {
    await new Promise((r) => window.requestAnimationFrame(r));
    const v = liveVideo;
    if (!v || v.readyState < 2 || !v.videoWidth) continue;
    // Cap the working resolution rather than using whatever the camera gives:
    // detection cost is per row and per window, so a 1920 capture costs triple
    // a 960 one for marks that are already far above the pixel floor.
    const tw = Math.min(960, v.videoWidth);
    const th = Math.round((v.videoHeight * tw) / v.videoWidth);
    if (tw !== W || th !== H) {
      W = tw; H = th;
      cap.width = W; cap.height = H;
      ctx = cap.getContext("2d", { willReadFrequently: true });
      gray = new Uint8Array(W * H);
      overlay.setAttribute("viewBox", `0 0 ${W} ${H}`);
    }
    ctx.drawImage(v, 0, 0, W, H);
    const px = ctx.getImageData(0, 0, W, H).data;
    for (let i = 0, p = 0; i < gray.length; i++, p += 4)
      gray[i] = (px[p] * 77 + px[p + 1] * 150 + px[p + 2] * 29) >> 8;

    const t = window.performance.now();
    const { run, fused } = await analyzeFrame(
      { gray, w: W, h: H, t, n },
      {
        coarseStride: 16,
        fineStride: 6,
        minMargin: 4,
        minReadable: 4,
        ...(detectPool ? { runRows: detectPool.runRows } : {})
      }
    );
    const dt = window.performance.now() - t;
    fps.push(dt);
    if (fps.length > 20) fps.shift();

    // radius: the V-fit's apparent radius when it engaged, else half the median
    // window width, which is what the rows actually measured
    const radiusOf = (f) => {
      if (f.apparentRadiusY) return f.apparentRadiusY;
      const s = f.hits
        .map((h) => Math.abs(h.rightX - h.leftX))
        .filter((x) => isFinite(x) && x > 1)
        .sort((a, b) => a - b);
      return s.length ? s[s.length >> 1] / 2 : 24;
    };
    overlay.innerHTML = fused
      .map((f) => {
        const r = radiusOf(f);
        const x = f.xc, y = f.yc;
        const lab = Math.max(14, r * 0.55);
        return `<g>
<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="none" stroke="#2fe08a" stroke-width="3"/>
<line x1="${(x - r * 0.5).toFixed(1)}" y1="${y.toFixed(1)}" x2="${(x + r * 0.5).toFixed(1)}" y2="${y.toFixed(1)}" stroke="#2fe08a" stroke-width="2"/>
<line x1="${x.toFixed(1)}" y1="${(y - r * 0.5).toFixed(1)}" x2="${x.toFixed(1)}" y2="${(y + r * 0.5).toFixed(1)}" stroke="#2fe08a" stroke-width="2"/>
<text x="${x.toFixed(1)}" y="${(y - r - 6).toFixed(1)}" font-family="ui-monospace,monospace" font-size="${lab.toFixed(0)}" font-weight="700" fill="#2fe08a" text-anchor="middle" paint-order="stroke" stroke="#000" stroke-width="4">${esc(f.id)}</text>
</g>`;
      })
      .join("");

    const med = fps.slice().sort((a, b) => a - b)[fps.length >> 1] ?? dt;
    // apparent diameter of the smallest mark being read, in capture pixels.
    // This is the number that decides how far away a mark still works, and it is
    // measurable here — unlike a working distance, which depends on the lens.
    const dias = fused.map((f) => 2 * radiusOf(f)).sort((a, b) => a - b);
    liveView.hud.textContent =
      `${W}x${H}  ${med.toFixed(0)} ms/frame (${(1000 / med).toFixed(0)} fps)  ` +
      `${fused.length} mark${fused.length === 1 ? "" : "s"}` +
      (fused.length ? "  ids " + fused.map((f) => f.id).join(",") : "") +
      (dias.length ? `  smallest \u2300${dias[0].toFixed(0)}px` : "") +
      (detectPool ? `  ${detectPool.size} workers` : "  main thread");
    n++;
    if (t - lastYield > 250) {
      lastYield = t;
      yield {
        n,
        w: W,
        h: H,
        msMedian: +med.toFixed(1),
        marks: fused.map((f) => ({
          id: f.id,
          x: +f.xc.toFixed(1),
          y: +f.yc.toFixed(1),
          rows: f.rows,
          voteMargin: f.voteMargin,
          vFit: f.vFit
        })),
        rowHits: run.hits.length
      };
    }
  }
}
