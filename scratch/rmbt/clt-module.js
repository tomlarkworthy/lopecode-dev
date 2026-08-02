const _ebocnh = function _headline_md(md) {return (md`# Coded Landmark Tracking

Point a camera at a printed mark. The tracker finds its centre and reads its id,
in the browser, at video rate — no marker library, no calibration, no training.

It works by scanning a **sparse lattice of horizontal lines** rather than the
whole image. A concentric ring pattern crossed by any straight line produces a
one-dimensional signature that survives perspective, because a line through a
projective transform is still a line: whatever the mark's tilt, a scan row sees
the rings in the same order, distorted by a Möbius map on that row alone. Solving
that map per row recovers where the row cut the mark and how far off centre it
was, and the rows that agree fuse into one detection.

Turn the camera on, point it at a mark, and the overlay draws the centre and the
decoded id.`);};
const _n93g8p = function _path_md(md,tex) {return (md`### The path this notebook took

It is a build log, and it is in order. Two mark designs live here: the first one
is built, measured, and then **condemned by its own measurements**, which is why
the sections that build it are still here.

| | |
|---|---|
| **§0–§2** | The problem, and the first mark. A fixed **carrier** for detection plus a **payload band** for identity, so the codebook does not multiply the per-row cost. 14 usable ids. |
| **§3** | Detection from a scan row: ten guaranteed carrier edges, a cross-ratio gate. **§3.1** then replaces the brute offset sweep with a closed-form **involution** solve — the idea everything later is built on. |
| **§4–§6** | Decode without running an edge detector at all; fuse rows into marks; score the whole pipeline against simulator ground truth. |
| **§7–§9** | Off the simulator. A mirror rig that grades the tracker against positions the notebook itself chose, a worker pool, and a per-frame profile. |
| **§10** | Marks you can print. |
| **§11** | **The redesign.** The fault the first ten sections expose: the payload is dead weight during detection, and the geometry bootstrap hangs off one noisy anchor pair. The fix is to design the code in ${tex`r^2`}-space, where the per-row warp collapses to an affine map, so that *every* edge is evidence. 64 ids instead of 14, 63% of rows read against 14% at 120 px, ~6× faster per row — and the tilt angle §0.1 had to refuse comes back, because the mark's vertical extent is now measured rather than extrapolated. |
| **§11.1–§11.5** | What it took to trust that. One row becomes a whole frame; printable marks; a bank of real camera frames; a seven-mark calibration target whose millimetres are known; and a rig that collects its own hard cases and tunes against them. |

The live demo at the top runs the **§11** mark. The toggle in §11.1 switches it
back to the §1 one — existing printed sheets keep working, which is what the
switch is for.`);};
const _1ve7ka5 = function _liveOn(Inputs) {return (Inputs.toggle({ label: "live camera", value: false }));};
const _1keow27 = (G, _) => G.input(_);
const _1kn5g73 = function _liveFacing(Inputs) {return (Inputs.radio(["environment", "user"], {
  label: "lens",
  value: "environment",
  format: (x) => (x === "environment" ? "rear / external" : "front")
}));};
const _1ncd6hs = (G, _) => G.input(_);
const _xdtu1n = async function _liveStream(liveOn,liveFacing,invalidation) {
  if (!liveOn) return null;
  try {
    // Ask for more than we will use: the detector needs ~2 image pixels per
    // template unit, and asking for 1280 rather than the default 640 is the
    // single cheapest thing that widens the usable working distance.
    const s = await window.navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 1280 },
        height: { ideal: 960 },
        facingMode: liveFacing
      }
    });
    invalidation.then(() => {
      for (const t of s.getTracks()) t.stop();
    });
    return s;
  } catch (e) {
    return { error: String((e && e.message) || e) };
  }
};
const _1sh7vi3 = async function _liveVideo(htl,liveStream,invalidation) {
  const v = htl.html`<video playsinline muted autoplay style="display:block;width:100%;height:auto"></video>`;
  if (liveStream && !liveStream.error) {
    v.srcObject = liveStream;
    try {
      await v.play();
    } catch (e) {
      // autoplay policy can reject; the element still decodes once visible
    }
  }
  invalidation.then(() => {
    try {
      v.pause();
      v.srcObject = null;
    } catch (e) {}
  });
  return v;
};
const _1v7uxcr = function _liveSolver(Inputs) {return (Inputs.radio(["involution", "sweep"], {
  label: "solver",
  value: "involution",
  format: (x) =>
    x === "involution" ? "involution (faster)" : "sweep (holds tilt longer)"
}));};
const _lsv1nput = (G, _) => G.input(_);
const _1emy5ow = function _liveView(htl,liveOn,liveVideo) {
  // The overlay is an SVG in CAPTURE coordinates (its viewBox is set to the
  // capture size by liveRun) laid over the video at 100%/100%, so detector
  // pixel coordinates need no rescaling to become screen coordinates -- the
  // viewBox does it, and it stays correct when the video box is resized.
  const overlay = htl.svg`<svg viewBox="0 0 640 480" preserveAspectRatio="none"
    style="position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none"></svg>`;
  const hud = htl.html`<div style="position:absolute;left:0;bottom:0;right:0;padding:4px 8px;
    background:rgba(0,0,0,0.55);color:#dfe;font:12px/1.5 ui-monospace,monospace"></div>`;
  const idle = htl.html`<div style="padding:2em 1em;text-align:center;color:#bbb;
    font:13px/1.6 system-ui,sans-serif">camera off</div>`;
  const wrap = htl.html`<div style="position:relative;max-width:760px;background:#1b1b1b;
    border-radius:6px;overflow:hidden">${liveOn ? liveVideo : idle}${liveOn ? overlay : ""}${liveOn ? hud : ""}</div>`;
  wrap.overlay = overlay;
  wrap.hud = hud;
  return wrap;
};
const _1tf4dro = async function* _liveRun(liveOn,liveStream,liveView,liveVideo,markFamily,analyzeFrameMan,analyzeFrame,liveSolver,detectPool,markEllipse) {
  // The headline rig, for either mark family.
  //
  //   man     §11's cascade (analyzeFrameMan). 64 ids, and because every row
  //           that crosses a mark locks geometry -- including the near-pole
  //           rows -- the vertical extent is measured, so this arm reports a
  //           TILT ANGLE. Main thread: the per-row cost is ~10x below §3's,
  //           and the worker kernel only carries the classic detector.
  //   classic §1's mark through analyzeFrame + the worker pool. No tilt angle;
  //           see markEllipse for why that number is not available here.
  //
  // Existing printed sheets keep working -- that is what the toggle is for.
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
    // one shape for the overlay, whichever detector produced it:
    // {id, x, y, a, b, s, tilt, rows}; id null = located but not identified
    let shapes = [], rowHits = 0, engine = "";
    if (markFamily === "man") {
      // stride 4, not §3's 6: a man row costs a fraction of a classic row, and
      // the extra rows are what carry small marks over fusion's two-vote bar --
      // on the four-mark ground-truth scene (manSceneTest), stride 6 reads 3
      // of 4 and stride 4 reads 4 of 4, for 4 -> 10 ms.
      const res = analyzeFrameMan({ gray, w: W, h: H }, { stride: 4 });
      rowHits = res.rowHits;
      engine = "man · main thread";
      for (const f of [
        ...res.fused,
        // A camera on an ordinary scene locks a lattice on ~40 rows a frame,
        // so showing every unconfirmed cluster would bury the marks in
        // dashes. Show only the ones whose SHAPE passed -- "there is a mark
        // here, the payload did not read" is useful while aiming; "these
        // edges happened to fit an involution" is not.
        ...res.unidentified.filter((u) => u.posed)
      ])
        shapes.push({
          id: f.id, x: f.xc, y: f.yc,
          a: f.a, b: f.b, s: 0, tilt: f.tiltDeg,
          rows: f.rows, fallback: f.a == null ? f.wHalf : null
        });
    } else {
      const { run, fused } = await analyzeFrame(
        { gray, w: W, h: H, t, n },
        {
          coarseStride: 16,
          fineStride: 6,
          minMargin: 4,
          minReadable: 4,
          solver: liveSolver,
          ...(detectPool ? { runRows: detectPool.runRows } : {})
        }
      );
      rowHits = run.hits.length;
      engine = `classic · ${liveSolver} · ` + (detectPool ? `${detectPool.size} workers` : "main thread");
      for (const f of fused) {
        const el = markEllipse(f);
        let fallback = null;
        if (!el) {
          const s = f.hits
            .map((h) => Math.abs(h.rightX - h.leftX))
            .filter((x) => isFinite(x) && x > 1)
            .sort((a, b) => a - b);
          fallback = s.length ? s[s.length >> 1] / 2 : 24;
        }
        shapes.push({
          id: f.id, x: f.xc, y: f.yc,
          a: el ? el.a : null, b: el ? el.b : null, s: el ? el.s : 0,
          // classic marks get no tilt angle -- measured wrong by 10-25°
          tilt: null,
          rows: f.rows, fallback
        });
      }
    }
    const dt = window.performance.now() - t;
    fps.push(dt);
    if (fps.length > 20) fps.shift();

    const dias = [];
    overlay.innerHTML = shapes
      .map((m) => {
        const known = m.id != null;
        const col = known ? "#2fe08a" : "#ffd23f";
        const r = m.a != null ? Math.max(m.a, m.b) : m.fallback ?? 24;
        if (known) dias.push(2 * r);
        const lab = Math.max(13, r * 0.5);
        let outline;
        if (m.a != null) {
          // [[a, s·b],[0, b]] drawn as an SVG shear about the centre, so the
          // curve IS the fitted map of the unit circle rather than an
          // axis/rotation re-derivation of it. non-scaling-stroke keeps the
          // shear off the pen.
          outline =
            `<g transform="translate(${m.x.toFixed(1)} ${m.y.toFixed(1)}) matrix(1 0 ${(m.s ?? 0).toFixed(4)} 1 0 0)">` +
            `<ellipse cx="0" cy="0" rx="${m.a.toFixed(1)}" ry="${m.b.toFixed(1)}" fill="none" stroke="${col}" stroke-width="3" ` +
            `stroke-dasharray="${known ? "none" : "7 5"}" vector-effect="non-scaling-stroke"/></g>`;
        } else {
          // dashed = position only, geometry not resolved
          outline = `<circle cx="${m.x.toFixed(1)}" cy="${m.y.toFixed(1)}" r="${r.toFixed(1)}" fill="none" stroke="${col}" stroke-width="2" stroke-dasharray="6 5"/>`;
        }
        const text = known
          ? esc(m.id) + (m.tilt != null ? ` · ${m.tilt.toFixed(0)}°` : "")
          : "?";
        return `<g>
${outline}
<line x1="${(m.x - r * 0.3).toFixed(1)}" y1="${m.y.toFixed(1)}" x2="${(m.x + r * 0.3).toFixed(1)}" y2="${m.y.toFixed(1)}" stroke="${col}" stroke-width="2"/>
<line x1="${m.x.toFixed(1)}" y1="${(m.y - r * 0.3).toFixed(1)}" x2="${m.x.toFixed(1)}" y2="${(m.y + r * 0.3).toFixed(1)}" stroke="${col}" stroke-width="2"/>
<text x="${m.x.toFixed(1)}" y="${(m.y - r - 6).toFixed(1)}" font-family="ui-monospace,monospace" font-size="${lab.toFixed(0)}" font-weight="700" fill="${col}" text-anchor="middle" paint-order="stroke" stroke="#000" stroke-width="4">${text}</text>
</g>`;
      })
      .join("");

    const med = fps.slice().sort((a, b) => a - b)[fps.length >> 1] ?? dt;
    // Apparent diameter of the smallest mark being read, in capture pixels.
    // That is the number that decides how far away a mark still works, and it
    // is measurable right here — unlike a working distance, which depends on
    // the lens the reader happens to have.
    dias.sort((a, b) => a - b);
    const named = shapes.filter((m) => m.id != null);
    const anon = shapes.length - named.length;
    liveView.hud.textContent =
      `${W}x${H}  ${med.toFixed(0)} ms/frame (${(1000 / med).toFixed(0)} fps)  ` +
      `${named.length} mark${named.length === 1 ? "" : "s"}` +
      (anon ? ` +${anon} unread` : "") +
      (named.length ? "  ids " + named.map((m) => m.id).join(",") : "") +
      (dias.length ? `  smallest ⌀${dias[0].toFixed(0)}px` : "") +
      `  ${engine}`;
    n++;
    if (t - lastYield > 250) {
      lastYield = t;
      yield {
        n,
        w: W,
        h: H,
        family: markFamily,
        msMedian: +med.toFixed(1),
        marks: named.map((m) => ({
          id: m.id,
          x: +m.x.toFixed(1),
          y: +m.y.toFixed(1),
          rows: m.rows,
          a: m.a == null ? null : +m.a.toFixed(1),
          b: m.b == null ? null : +m.b.toFixed(1),
          tiltDeg: m.tilt == null ? null : +m.tilt.toFixed(1)
        })),
        unread: anon,
        rowHits
      };
    }
  }
};
const _bcrpkq = function _targetId(Inputs,usableIds) {return (Inputs.select(usableIds, {
  label: "mark to show",
  value: 3,
  format: (id) => "id " + id
}));};
const _1tf3qak = (G, _) => G.input(_);
const _kksuf6 = function _targetPanel(markFamily,manMarkSvgSource,targetId,markSvgSource,markSheetSvg,usableIds,htl) {
  // Something to point the camera AT, without leaving the page: the selected
  // mark at screen size for a second device's camera, plus the two files worth
  // printing. Both links are data: URIs — a blob: URL is refused as a resource
  // by a page served from file://, and this notebook is meant to run from disk.
  //
  // Follows the family toggle, because a man mark and a classic mark share no
  // ring layout: pointing the camera at the wrong one reads as nothing at all.
  const man = markFamily === "man";
  const mark = man
    ? manMarkSvgSource(targetId, { diameterMm: 60, label: false })
    : markSvgSource(targetId, { diameterMm: 60, label: false });
  const sheet = man ? null : markSheetSvg(usableIds, { diameterMm: 60 });
  const uri = (svg) =>
    "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  const box = htl.html`<div style="display:flex;gap:18px;align-items:center;flex-wrap:wrap">
    <div style="width:260px;height:260px;flex:0 0 auto">${(() => {
      const d = window.document.createElement("div");
      d.style.cssText = "width:100%;height:100%";
      d.innerHTML = mark;
      const s = d.firstElementChild;
      s.setAttribute("width", "100%");
      s.setAttribute("height", "100%");
      return d;
    })()}</div>
    <div style="font:13px/1.7 system-ui,sans-serif;min-width:16em">
      <div><b>${man ? "man" : "classic"} id ${targetId}</b> at screen size — point a phone at it.</div>
      <div style="margin-top:.5em">
        <a download="${man ? "man" : "mark"}-${targetId}.svg" href="${uri(mark)}">${man ? "man" : "mark"} ${targetId} (60&thinsp;mm)</a><br>
        ${man
          ? htl.html`<span style="color:var(--theme-foreground-muted,#888)">all 64 man ids, and the A4 sheet, are in §11.2</span>`
          : htl.html`<a download="mark-sheet.svg" href="${uri(sheet)}">all ${usableIds.length} marks, A4 sheet</a>`}
      </div>
      <div style="margin-top:.6em;color:var(--theme-foreground-muted,#888)">
        Print the sheet as-is: the whole page is mid-gray on purpose. White paper
        around a black rim is itself a strong edge, and windows anchor on it
        instead of on the mark. Mid-gray paper with the background switched off
        does the same job without the toner.
      </div>
    </div>
  </div>`;
  return box;
};
const _1031r80 = function _pose_md(md) {return (md`### §0.1 The outline is an ellipse, and what it does not tell you

A circle photographed at an angle is an ellipse, so the overlay fits and draws one
rather than the circle it used to. For the **classic** mark that is \`markEllipse\`:
width comes from the rim half-widths the rows measured, height from fusion's V-fit
slope, and a shear from the foot drifting sideways down the rows; together they
are the linear map taking the unit circle to the mark's image. Below is the same
overlay on a still frame.

**The classic mark does not report a tilt angle, deliberately.** Checked against the
simulator with the rotation set exactly, \`acos(minor/major)\` reads **23° on a mark
that is dead frontal**, and stays 10–25° out to 40°. The cause is structural rather
than a bad fit: only the middle of a mark yields rows at all — measured, \`|d|\` spans
±8 of ±28, because chords near the poles cross too few rings — so the mark's
*height* is always an extrapolation from its equator while its *width* is measured
directly. Harvesting the pre-decode geometric windows instead does not rescue it;
they stop being found before the poles too, and the height estimate then swings
between 97 and 384 px on a 206 px mark. On top of that \`acos\` is at its most
sensitive near frontal, where a 1% error in the axis ratio is ~8° of angle.

So for the classic family the outline is honest about extent and foreshortening,
and silent about pose. The diagnosis named the fix — *rows nearer the poles* — and
that is not a threshold to loosen, it is a property of the mark. §11 redesigns the
rings so a chord anywhere across the mark still solves, and the **man** family does
report a tilt angle for exactly that reason: with pole rows contributing, the
height is measured rather than extrapolated. Measured there: 4.9 / 22.4 / 39.6 /
60.1° against a true 0 / 20 / 40 / 60°. Small marks stay noisy — an 80 px-wide mark
at 30° reads anywhere from 0 to 59° — so the angle is worth trusting on marks that
fill a decent part of the frame, not on distant ones.`);};
const _1dft8bc = async function _poseDemo(testFrameBank,htl,analyzeFrame,liveSolver,markEllipse) {
  // The outline the live demo draws, on a still frame, so it can be checked
  // without a camera in the loop.
  const entry = testFrameBank.find((e) => e && e.frame && e.frame.gray && /angled/.test(e.file));
  if (!entry) return htl.html`<div>no angled frame in the bank</div>`;
  const frame = entry.frame;
  const { fused } = await analyzeFrame(frame, {
    coarseStride: 16, fineStride: 6, minMargin: 4, minReadable: 4, solver: liveSolver
  });
  const cv = window.document.createElement("canvas");
  cv.width = frame.w; cv.height = frame.h;
  cv.style.cssText = "display:block;width:100%;height:auto";
  const ctx = cv.getContext("2d");
  const img = ctx.createImageData(frame.w, frame.h);
  for (let i = 0, p = 0; i < frame.gray.length; i++, p += 4) {
    const g = frame.gray[i];
    img.data[p] = g; img.data[p + 1] = g; img.data[p + 2] = g; img.data[p + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const shapes = fused
    .map((f) => {
      const el = markEllipse(f);
      if (!el) return "";
      return `<g transform="translate(${el.cx.toFixed(1)} ${el.cy.toFixed(1)}) matrix(1 0 ${el.s.toFixed(4)} 1 0 0)">
  <ellipse cx="0" cy="0" rx="${el.a.toFixed(1)}" ry="${el.b.toFixed(1)}" fill="none" stroke="#2fe08a" stroke-width="3" vector-effect="non-scaling-stroke"/>
</g>
<text x="${el.cx.toFixed(1)}" y="${(el.cy - el.major - 8).toFixed(1)}" font-family="ui-monospace,monospace" font-size="26" font-weight="700" fill="#2fe08a" text-anchor="middle" paint-order="stroke" stroke="#000" stroke-width="5">${f.id}</text>`;
    })
    .join("\n");
  const svg = htl.svg`<svg viewBox="0 0 ${frame.w} ${frame.h}" preserveAspectRatio="none"
    style="position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none"></svg>`;
  svg.innerHTML = shapes;
  const rows = fused
    .map((f) => {
      const el = markEllipse(f);
      return el
        ? `id ${f.id}: ${el.rows} rows, ${(2 * el.a).toFixed(0)}w × ${(2 * el.b).toFixed(0)}h px`
        : `id ${f.id}: ${f.rows} rows, no ellipse`;
    })
    .sort();
  return htl.html`<div>
  <div style="position:relative;max-width:900px;background:#111;border-radius:6px;overflow:hidden">${cv}${svg}</div>
  <div style="font:12px/1.7 ui-monospace,monospace;margin-top:.5em;color:var(--theme-foreground-muted,#888)">${rows.join(" · ")}</div>
</div>`;
};
const _1nlpgtu = function _markEllipse(LAYOUT,xFromK) {return (function markEllipse(f, opts = {}) {
  // The image of a circle under a perspective camera is an ellipse, so a circle
  // is the wrong outline to draw over a tilted mark. This returns the ellipse.
  //
  //   b — vertical semi-axis, from fusion's V-fit. |d| against y is a V whose
  //       slope converts image rows into template units, so R/slope is the
  //       mark's half-height.
  //   a — horizontal semi-axis. Each row's rim half-width w is foreshortened by
  //       that row's own height: w = a·√(1 − (Y/b)²). Invert per row, take the
  //       median, so one bad row cannot set the size.
  //   s — shear, d(footX)/dy: in-plane rotation makes the foot of the
  //       perpendicular drift sideways as the rows descend.
  //
  // [[a, s·b], [0, b]] is the linear map taking the unit circle to the mark's
  // image, so its singular values are the semi-axes.
  //
  // READ THIS BEFORE TRUSTING major/minor AS A POSE. The outline is sound; the
  // ANGLE you could compute from it is not, and that is why no tilt angle is
  // returned. Checked against the simulator with the tilt set exactly:
  // acos(minor/major) reads 23° on a mark that is dead frontal, and the error
  // stays in the 10–25° band out to 40°. Two reasons, both structural:
  //
  //   1. Only the middle of a mark produces rows at all. Measured, |d| spans
  //      ±8 of ±28 — chords near the poles cross too few rings to decode, and
  //      windows stop being found there too, so harvesting the geometric
  //      windows instead does not rescue it (tried; b then swings 97→384 px).
  //      Every estimate of the mark's HEIGHT is therefore an extrapolation from
  //      its equator, while its WIDTH is measured directly.
  //   2. acos is at its most sensitive exactly where marks usually sit. Near
  //      frontal, a 1% error in the axis ratio moves the angle by ~8°, so the
  //      small biases in 1 arrive amplified.
  //
  // Fixing it means getting rows nearer the poles — a detector gate that admits
  // short chords — not a better fit to the rows we have.
  const R = opts.R ?? LAYOUT.R;
  const b = f.apparentRadiusY;
  if (!(b > 0) || !f.hits || f.hits.length < 3) return null;
  const widths = [];
  let n = 0, sY = 0, sX = 0, sYY = 0, sXY = 0;
  for (const h of f.hits) {
    const Y = h.y - f.yc;
    const a2 = R * R - h.d * h.d;
    // rows within ~11% of the pole are all width and no information: u → 0
    // makes the division by √u explode
    const u = 1 - (Y / b) * (Y / b);
    if (a2 > 0 && u > 0.04) {
      const k = Math.sqrt(a2);
      const w = Math.abs(xFromK(h.mobius, k) - xFromK(h.mobius, -k)) / 2;
      if (isFinite(w) && w > 1) widths.push(w / Math.sqrt(u));
    }
    if (isFinite(h.footX)) { n++; sY += Y; sX += h.footX; sYY += Y * Y; sXY += Y * h.footX; }
  }
  if (!widths.length || n < 3) return null;
  widths.sort((p, q) => p - q);
  const a = widths[widths.length >> 1];
  const den = n * sYY - sY * sY;
  const s = Math.abs(den) > 1e-9 ? (n * sXY - sY * sX) / den : 0;
  if (!(a > 0) || !isFinite(s)) return null;
  // singular values of M = [[a, s·b], [0, b]]
  const fro = a * a + s * s * b * b + b * b;
  const det = Math.abs(a * b);
  const disc = Math.max(0, fro * fro - 4 * det * det);
  const rt = Math.sqrt(disc);
  const major = Math.sqrt((fro + rt) / 2);
  const minor = Math.sqrt(Math.max(0, (fro - rt) / 2));
  const axisRad = 0.5 * Math.atan2(2 * s * b * b, a * a + s * s * b * b - b * b);
  return {
    cx: f.xc,
    cy: f.yc,
    a, b, s,
    major, minor,
    axisDeg: ((axisRad * 180) / Math.PI + 180) % 180,
    rows: f.hits.length
  };
});};
const _1dvf37e = function _anonymous(md) {return (md`---
## §0 Why put identity in the rings

**Part IV of the realtime optical positioning series.** Parts I–III could find circular barcodes — several at once, at arbitrary chord offsets, on live pixels — but every barcode was the *same* barcode. A detection told you *where*, never *which*. For robotic navigation that is only half a landmark: a map is a set of labelled positions, and the label is what lets a robot know which corridor it is looking down.

This notebook puts a few bits of identity into the rings. The design constraint that shaped everything else: **the payload must not make detection more expensive.** The naive approach — one template per codeword, run Part III's detector once per template — multiplies the per-row cost by the codebook size. Instead the barcode is split into two roles:

- a **fixed carrier**: a handful of rings identical for every codeword, giving detection a payload-independent template;
- a **payload band**: rings whose colour encodes bits, which detection treats as clutter and *decoding* reads afterwards — not by finding edges, but by sampling image intensity at positions predicted by the already-fitted Möbius map.

Detection cost stays where Part III left it. Decoding is a handful of array lookups per row, and — the property worth the whole exercise — its cost is **independent of how many codewords exist**, because the codebook is only consulted once per row, after the bits are read.

The bits carry an error-correcting code, and that buys a second thing for free: a detection whose bits decode to no valid codeword is a *false positive*, so the payload doubles as a verification gate the earlier parts never had. Two of the sixteen codewords are never assigned: id 0 and id 15 are all-black and all-white, which is exactly what a misplaced window over featureless paint reads. Reserving them as sinks leaves **14 usable ids**.
`);};
const _106dc0v = function _anonymous(md,tex) {return (md`---
## §1 A code you can read along any chord

The radius is divided into bands. Everything is in **template units**, radius 0 at the centre, 28 at the rim — the same scale Parts II and III used.

| radius | role | colour |
|---|---|---|
| 0–4 | core (white reference) | white |
| 4–6 | inner carrier ring | black |
| 6–8 | payload cell **P0** | data |
| 8–9 | guard (white reference) | white |
| 9–10 | **mid-sync ring** | black |
| 10–11 | guard (white reference) | white |
| 11–25 | payload cells **P1–P7**, 2 units each | data |
| 25–26 | guard (white reference) | white |
| 26–28 | rim carrier ring | black |

Two properties are load-bearing.

**The carrier's edges exist for every codeword.** A payload cell can be black or white, so the edge *between* a payload cell and its neighbour may or may not exist — but the edges at radii **4, 9, 10, 26 and 28** sit between bands whose colours are fixed. Ten guaranteed edges per diameter, whatever the bits say. That is the detection template.

**The mid-sync ring is where it is for the cross ratio.** Part III learned the hard way that anchor quadruples clustered near the rim have a cross ratio a hair from the degenerate value 1. The anchors here are the rim and mid-sync edges, ${tex`(-28, -10, +10, +28)`}, whose cross ratio is **1.289** at zero chord offset — comfortably informative. And because the anchor radii are known, the cross ratio as a function of chord offset ${tex`d`} is known too: it climbs to 2.14 by ${tex`d = 9`}. Matching a window's cross ratio against that curve does not just *gate* candidates the way §3 of Part III did — **it reads off a coarse estimate of the offset for free**, before any alignment has run.

The white guards around every black carrier ring are not decoration: they are photometric references. Any chord that crosses the carrier crosses known-white and known-black paint at known radii, which is exactly what decoding needs to threshold the payload samples under whatever lighting the row actually has.

Eight payload cells carry an **extended Hamming [8,4] code**: 16 codewords, minimum distance 4 — every landmark ID survives one misread cell and *detects* two. Two of the sixteen are **reserved as invalid**: id 0 (payload all black) and id 15 (payload all white). A window that lands on featureless paint reads a constant stripe pattern, and a constant correlates *perfectly* with one of those two words — margin alone cannot reject it. Declaring the constant words non-ids turns the most dangerous false positive into a structural impossibility, leaving **14 usable identities** — enough for a room-scale landmark map, and §6 shows why the ceiling is a policy choice, not a performance one.
`);};
const _lu0qkj = function _LAYOUT() {
  // radial bands [r0, r1, kind] — kind: 1 white, 0 black, "p<i>" payload cell i
  const bands = [
    [0, 4, 1],
    [4, 6, 0],
    [6, 8, "p0"],
    [8, 9, 1],
    [9, 10, 0],
    [10, 11, 1],
    [11, 13, "p1"],
    [13, 15, "p2"],
    [15, 17, "p3"],
    [17, 19, "p4"],
    [19, 21, "p5"],
    [21, 23, "p6"],
    [23, 25, "p7"],
    [25, 26, 1],
    [26, 28, 0]
  ];
  const cells = bands
    .filter(([, , k]) => typeof k === "string")
    .map(([r0, r1, k]) => ({ i: +k.slice(1), r0, r1, rm: (r0 + r1) / 2 }));
  return {
    R: 28,
    bands,
    cells,
    // edges between bands of fixed colour — the payload-independent carrier
    fixedEdges: [4, 9, 10, 26, 28],
    anchorRadii: [28, 10],
    whiteRefs: [2, 8.5, 10.5, 25.5],
    blackRefs: [5, 9.5, 27]
  };
};
const _dwk66l = function _codebook() {
  // extended Hamming [8,4]: 16 codewords, minimum distance 4
  const words = [];
  for (let id = 0; id < 16; id++) {
    const d = [id & 1, (id >> 1) & 1, (id >> 2) & 1, (id >> 3) & 1];
    const p0 = d[0] ^ d[1] ^ d[3];
    const p1 = d[0] ^ d[2] ^ d[3];
    const p2 = d[1] ^ d[2] ^ d[3];
    const w = [p0, p1, d[0], p2, d[1], d[2], d[3], 0];
    w[7] = w.slice(0, 7).reduce((a, b) => a ^ b, 0);
    words.push(Uint8Array.from(w));
  }
  return words;
};
const _1p6gckl = function _codebookCheck(codebook) {
  // verify the claimed minimum distance — a wrong codebook silently halves robustness
  let dmin = 8;
  for (let a = 0; a < 16; a++)
    for (let b = a + 1; b < 16; b++) {
      let dist = 0;
      for (let i = 0; i < 8; i++) dist += codebook[a][i] ^ codebook[b][i];
      dmin = Math.min(dmin, dist);
    }
  if (dmin !== 4) throw new Error(`codebook minimum distance ${dmin}, expected 4`);
  return { codewords: 16, bits: 8, dataBits: 4, minDistance: dmin };
};
const _1wej8fk = function _radialColor(LAYOUT) {return (function radialColor(r, word) {
  // 1 = white, 0 = black, for radius r in template units, given a payload word
  if (r >= LAYOUT.R) return null; // outside the mark
  for (const [r0, r1, k] of LAYOUT.bands) {
    if (r >= r0 && r < r1) {
      if (typeof k === "number") return k;
      return word[+k.slice(1)]; // payload cell: the bit is the colour
    }
  }
  return null;
});};
const _1i5b3d0 = function _codewordGallery(LAYOUT,codebook) {
  // all 16 marks side by side — payload rings differ, carrier rings are identical
  const cell = 72, pad = 6, cols = 8;
  const rows = Math.ceil(16 / cols);
  const c = window.document.createElement("canvas");
  c.width = cols * (cell + pad) + pad;
  c.height = rows * (cell + pad + 14) + pad;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#2a2a2a";
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.font = "11px monospace";
  ctx.textAlign = "center";
  for (let id = 0; id < 16; id++) {
    const gx = pad + (id % cols) * (cell + pad);
    const gy = pad + Math.floor(id / cols) * (cell + pad + 14);
    const cx = gx + cell / 2, cy = gy + cell / 2;
    const scale = cell / 2 / LAYOUT.R;
    // each band drawn as an annulus (outer disc minus inner disc, evenodd fill)
    for (const [r0, r1, k] of LAYOUT.bands) {
      const bit = typeof k === "number" ? k : codebook[id][+k.slice(1)];
      ctx.fillStyle = bit ? "#fff" : "#000";
      ctx.beginPath();
      ctx.arc(cx, cy, r1 * scale, 0, 2 * Math.PI);
      ctx.arc(cx, cy, r0 * scale, 0, 2 * Math.PI, true);
      ctx.fill("evenodd");
    }
    ctx.fillStyle = "#9ad";
    ctx.fillText(`id ${id}`, cx, gy + cell + 11);
  }
  c.style.maxWidth = "100%";
  return c;
};
const _4gz48s = function _anonymous(md) {return (md`---
## §2 A scene of labelled landmarks

The simulator is Part III's rig with one change: each target carries its **own** codeword texture, and the ground truth records which. Everything downstream can then be scored on the question that actually matters for navigation: *did we read the right label at the right place?*

Targets cycle through the 16 codewords deterministically (target \`i\` shows codeword \`i mod 16\`), so every run exercises the whole codebook.`);};
const _faupuu = function _codewordTextures(LAYOUT,codebook,THREE,invalidation) {
  // one CanvasTexture per codeword, painted band-by-band as annuli
  const S = 512;
  const scale = S / 2 / LAYOUT.R;
  const textures = codebook.map((word) => {
    const c = window.document.createElement("canvas");
    c.width = S;
    c.height = S;
    const ctx = c.getContext("2d");
    for (const [r0, r1, k] of LAYOUT.bands) {
      const bit = typeof k === "number" ? k : word[+k.slice(1)];
      ctx.fillStyle = bit ? "#ffffff" : "#000000";
      ctx.beginPath();
      ctx.arc(S / 2, S / 2, r1 * scale, 0, 2 * Math.PI);
      ctx.arc(S / 2, S / 2, r0 * scale, 0, 2 * Math.PI, true);
      ctx.fill("evenodd");
    }
    const tex = new THREE.CanvasTexture(c);
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;
    return tex;
  });
  invalidation.then(() => textures.forEach((t) => t.dispose()));
  return textures;
};
const _nfwsus = function _nLandmarks(Inputs) {return (Inputs.range([1, 16], { step: 1, value: 6, label: "landmarks" }));};
const _zsvxn7 = (G, _) => G.input(_);
const _15fbbws = function _simRig(FRAME,THREE,codewordTextures,nLandmarks,invalidation) {
  // Part III's rig, but each target gets its own codeword material and records trueId.
  // Ids 0 and 15 are reserved (§4), so targets cycle through the 14 usable codewords.
  const w = FRAME.w;
  const h = FRAME.h;
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(w, h);
  renderer.setPixelRatio(1);
  const rt = new THREE.WebGLRenderTarget(w, h);
  const gl = renderer.getContext();

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x2a2a2a);
  const camera = new THREE.PerspectiveCamera(50, w / h, 0.01, 100);
  camera.position.set(0, 0, 5);
  camera.lookAt(new THREE.Vector3(0, 0, 0));

  // deterministic per-target pseudo-randomness so the scene is reproducible
  const rnd = (i, k) => {
    const s = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
    return s - Math.floor(s);
  };

  const geo = new THREE.PlaneGeometry(1, 1);
  const mats = codewordTextures.map(
    (tex) =>
      new THREE.MeshBasicMaterial({
        map: tex,
        side: THREE.DoubleSide,
        transparent: true
      })
  );

  const targets = [];
  for (let i = 0; i < nLandmarks; i++) {
    const trueId = 1 + (i % 14);
    const mesh = new THREE.Mesh(geo, mats[trueId]);
    scene.add(mesh);
    targets.push({
      id: i,
      trueId,
      mesh,
      cx: (rnd(i, 1) - 0.5) * 3.4,
      cy: (rnd(i, 2) - 0.5) * 2.4,
      cz: -rnd(i, 3) * 2.5,
      ax: rnd(i, 4) * 0.9 - 0.45,
      ay: rnd(i, 5) * 0.9 - 0.45,
      sp: 0.4 + rnd(i, 6),
      ph: rnd(i, 7) * 6.283,
      sc: 0.75 + rnd(i, 8) * 0.7
    });
  }

  const rgba = new Uint8Array(w * h * 4);
  const gray = new Uint8Array(w * h);

  // m = motion amount, passed in so the slider does not rebuild the GL context
  const step = (t, m) => {
    for (const b of targets) {
      b.mesh.position.set(
        b.cx + m * 0.5 * Math.sin(t * b.sp + b.ph),
        b.cy + m * 0.4 * Math.cos(t * b.sp * 0.8 + b.ph),
        b.cz + m * 0.6 * Math.sin(t * b.sp * 0.5)
      );
      b.mesh.rotation.set(
        b.ax + m * 0.5 * Math.sin(t * 0.6 + b.ph),
        b.ay + m * 0.6 * Math.cos(t * 0.5 + b.ph),
        m * 0.3 * t * b.sp
      );
      b.mesh.scale.set(b.sc, b.sc, 1);
    }
    renderer.setRenderTarget(rt);
    renderer.render(scene, camera);
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, rgba);
    renderer.setRenderTarget(null);
    renderer.render(scene, camera);
    // readPixels is bottom-up; flip so row 0 is the top of the image
    for (let y = 0; y < h; y++) {
      const src = (h - 1 - y) * w * 4;
      const dst = y * w;
      for (let x = 0; x < w; x++) {
        const o = src + x * 4;
        gray[dst + x] = (rgba[o] + rgba[o + 1] + rgba[o + 2]) / 3;
      }
    }
    return gray;
  };

  invalidation.then(() => {
    rt.dispose();
    geo.dispose();
    mats.forEach((m) => m.dispose());
    renderer.dispose();
  });

  return { w, h, canvas: renderer.domElement, step, targets, camera, scene };
};
const _j6jmhh = function _running(Inputs) {return (Inputs.toggle({ label: "run", value: false }));};
const _u5lzp = (G, _) => G.input(_);
const _frwygv = function _motion(Inputs) {return (Inputs.range([0, 1], { step: 0.05, value: 0.3, label: "motion" }));};
const _13kodma = (G, _) => G.input(_);
const _1hy8mdc = async function* _simFrame(running,simRig,motion) {
  const t0 = window.performance.now();
  let n = 0;
  while (true) {
    const t = running ? (window.performance.now() - t0) / 1000 : 0;
    const gray = simRig.step(t, running ? motion : 0);
    yield { gray, w: simRig.w, h: simRig.h, t, n: n++, source: "sim" };
    // paused: park until `running` flips, which re-runs this cell
    if (!running) await new Promise(() => {});
  }
};
const _tl97yc = function _overlaySvg(htl,FRAME) {return (htl.svg`<svg viewBox="0 0 ${FRAME.w} ${FRAME.h}" style="position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none"></svg>`);};
const _xwbf17 = function _sceneView(simRig,htl,FRAME,overlaySvg) {
  const canvas = simRig.canvas;
  canvas.style.width = "100%";
  canvas.style.height = "auto";
  canvas.style.display = "block";
  const div = htl.html`<div style="position:relative;width:100%;max-width:${FRAME.w}px;border:1px solid var(--theme-foreground-faintest,#888)"></div>`;
  div.appendChild(canvas);
  div.appendChild(overlaySvg);
  return div;
};
const _2pll7q = function _rowStride(Inputs) {return (Inputs.range([2, 64], { step: 1, value: 12, label: "row stride (px)" }));};
const _1jjclm3 = (G, _) => G.input(_);
const _1svyp0z = function _scanRows(rowStride,FRAME) {
  const rows = [];
  for (let y = Math.floor(rowStride / 2); y < FRAME.h; y += rowStride) rows.push(y);
  return rows;
};
const _y17nqa = function _groundTruth(simFrame,simRig,THREE) {
  simFrame; // recompute each frame
  const camera = simRig.camera;
  const w = simRig.w;
  const h = simRig.h;
  camera.updateMatrixWorld();
  const toPx = (v) => {
    const p = v.clone().project(camera);
    // flip y: our frame rows run top-down
    return { x: (p.x * 0.5 + 0.5) * w, y: (1 - (p.y * 0.5 + 0.5)) * h, z: p.z };
  };
  return simRig.targets.map((t) => {
    t.mesh.updateMatrixWorld();
    const M = t.mesh.matrixWorld;
    const c = new THREE.Vector3().setFromMatrixPosition(M);
    // the plane's own axes, already carrying its scale
    const ax = new THREE.Vector3().setFromMatrixColumn(M, 0);
    const ay = new THREE.Vector3().setFromMatrixColumn(M, 1);
    const pc = toPx(c);
    const pu = toPx(c.clone().addScaledVector(ax, 0.5));
    const pv = toPx(c.clone().addScaledVector(ay, 0.5));
    // the disk projects to an ellipse with semi-axis vectors u and v
    const u = { x: pu.x - pc.x, y: pu.y - pc.y };
    const v = { x: pv.x - pc.x, y: pv.y - pc.y };
    const xExtent = Math.hypot(u.x, v.x);
    const yExtent = Math.hypot(u.y, v.y);
    return {
      id: t.id,
      trueId: t.trueId, // the codeword the landmark displays — the decode target
      cx: pc.x,
      cy: pc.y,
      u,
      v,
      xExtent,
      yExtent,
      onScreen:
        pc.z < 1 &&
        pc.x > -xExtent &&
        pc.x < w + xExtent &&
        pc.y > -yExtent &&
        pc.y < h + yExtent
    };
  });
};
const _1aqjzs8 = function _anonymous(md) {return (md`---
## §3 Detecting the carrier, ignoring the payload

Detection must work for *every* codeword without knowing which one it is looking at. The carrier gives it exactly ten guaranteed edges per diameter (±4, ±9, ±10, ±26, ±28 in template units). The payload contributes up to sixteen *extra* edges that may or may not exist — from the detector's point of view they are structured clutter.

The pipeline per scan row:

1. **Window enumeration, gated by a reflection sweep.** Any pair of edges could be the two rim crossings, so enumeration is quadratic in the edges on the row. The enumeration *loop* is not the expensive part — it is ~10 ms for a whole frame's rows, and edge extraction is ~0.01 ms per row. What costs is what each surviving window then pays for in step 3. The exploitable structure is that a mark is *concentric*, so it is mirror-symmetric about its centre and **every** ring pair it contributes shares one midpoint. Better still, the centre of a symmetric edge set always lies *between its innermost mirror pair*, so the only centre hypotheses worth testing are the midpoints of near-adjacent edge pairs — a **linear sweep**, not a quadratic vote. Each hypothesis is verified by walking two pointers outward and counting mirrored offsets that agree within a tolerance; hypotheses with enough corroborating pairs survive, and only windows whose midpoint lands near a surviving centre are enumerated — exhaustively and exactly as the full scan would.
2. **Cross-ratio gate — which also reads the offset.** Inside a candidate window, the mid-sync edges are searched for near their expected span fractions. The cross ratio of \`(rim, mid, mid, rim)\` is projectively invariant, and because the anchor radii are fixed it is a known function of the chord offset \`d\` alone. A window whose cross ratio sits nowhere on that curve is rejected; one that sits on it hands back a **seed estimate of \`d\`** before any fitting.
3. **Anchor fit + carrier alignment, over the offsets the cross ratio allows.** Four anchors give an initial Möbius map. The ten carrier edges (fewer once \`d\` starts dropping inner rings) are projected into the image and aligned against the window's edges with Part III's \`dpAlignFast\` — the payload edges simply go unmatched, at a gap cost — then the map is refitted on the matches and scored by residual. This runs once per (offset, mid-pair-radius) hypothesis, and the hypotheses are the cost of the whole detector. The offset is *not* read straight off the seed: the cross ratio picks the right neighbourhood but not the right offset within it, and the mid pair's radius is itself ambiguous, because payload edges at \`r=8\` and \`r=6\` alias onto the curve. So the sweep still covers the band at 0.25 and keeps the best hypothesis per 1-unit bin, for the decoder's photometric check (§4) to settle. What it skips are the offsets whose *predicted* cross ratio cannot be reconciled with the window's *measured* one, at five times the tolerance the window was admitted under. That is most of them: 89 hypotheses per candidate become about 20.
4. **Gates + non-maximum suppression.** Residual and match-count gates, then overlapping windows resolve by residual.

The gate in step 1 is worth being precise about, because two cheaper-looking designs failed first. Using the symmetry *alone* — take each centre, read the mark straight off its rim pairs — is much faster still, but it loses decoded rows per mark and moves landmark centres by 2–7 px: a window spanning two *neighbouring* marks is symmetric too, about the gap between them, and a perspective image of a circle is not exactly mirror-symmetric in the first place (which is why the decoder fits a Möbius map rather than assuming symmetry). A midpoint *histogram* — vote every pair's midpoint into bins, keep the best-voted bins — fails more subtly: a raw pair count mostly measures local edge density, so one busy stretch of the row takes every slot and starves real marks out of the cap; that surfaced as a decodable mark's bin ranking 37th against a cut-off of 24. The sweep's matched-pair count is the corroboration statistic those designs were missing, and because it needs no rank cap, dense periodic texture — which is mirror-symmetric about every half-period point, and out-votes any real mark — cannot displace a true centre; it only adds windows for the cross-ratio gate to reject.

Measured against the exhaustive scan on the frame bank, per 1280×960 frame: **windows 57k → 12k and surviving candidates 9,625 → 3,014**. The blank negative control drops from 2,160 windows and 20 ms to 129 and **2 ms**. On the quarter-turn frames — three times the edges per row — it **recovers marks the exhaustive scan misses entirely**, because with fewer chance windows surviving, the true ones are no longer starved out of the per-row candidate budget.

### What a frame actually costs

A frame was 220 ms and is now **33 ms**, single threaded, for the same six landmarks — and it decodes *more* rows than before (95 against 63 on the angled capture), so the fused centres are better, not merely cheaper: upright-vs-180 agreement went from 1.05 px to **0.98 px**. Three things were wrong, and only the third was an algorithm:

- **The Möbius fit was an SVD.** \`fitMobiusLS\` ran a full singular value decomposition of an N×4 design matrix to extract a nullspace, 113k times a frame, at ~1070 ns a call — **over half the frame**. Pinning the scale turns it into a 3×3 symmetric normal system with a closed-form solution, ~30 ns. The scale was never load bearing: the SVD's answer was rescaled to \`s = 1\` on the next line. It does have to be *preconditioned* — \`x\` is in pixels and \`k\` in template units, so the raw design matrix is badly scaled and the pinned solution is not the free one; centring and scaling \`x\` first (exact, since a Möbius map composed with an affine map is still Möbius) is the difference between 1.29 px agreement and 0.98 px.
- **The sweep allocated.** A template array, a projection array, one object per matched ring and one per bin, all minted ~85k times a frame. Against preallocated buffers, and with the ~35 chord templates precomputed once instead of rebuilt per hypothesis, that churn disappears. It was worth more than the arithmetic it surrounded.
- **Most swept offsets were already excluded by the evidence** — the cross-ratio gate in step 3 above.

Profiling this needs a *single-frame trigger* (the button in §9) rather than the live rig: with the rig free-running, a frame that takes 33 ms of CPU reads as 200 ms of wall clock, because the measurement is competing with everything else the page is doing.

The detection band is \`d ≲ 9\`: past that the chord no longer crosses the mid-sync ring and the cross-ratio anchors are gone. That is a real trade — Part III could detect out to \`d ≈ 20\` — and §5 leans on row fusion to compensate: a barcode 60 px tall still puts several scan rows inside the band.`);};
const _c33xmx = function _carrierTemplate(LAYOUT) {
  // signed radial positions of the carrier edges, ascending — the detection template
  const ks = [];
  for (const r of LAYOUT.fixedEdges) { ks.push(-r); ks.push(r); }
  return ks.sort((a, b) => a - b);
};
const _7u0e3a = function _crCurve(LAYOUT,crossRatio) {
  // cross ratio of the anchor quadruple (−aOut, −aIn, +aIn, +aOut) as a function of
  // chord offset d, where aOut = √(28²−d²), aIn = √(10²−d²). Capped at d = 8.5: past
  // that the mid-sync crossing is so shallow the template degenerates (see §3 notes).
  const [rOut, rIn] = [LAYOUT.R, LAYOUT.anchorRadii[1]];
  const rows = [];
  for (let d = 0; d <= 8.5; d += 0.25) {
    const aOut = Math.sqrt(rOut * rOut - d * d);
    const aIn = Math.sqrt(rIn * rIn - d * d);
    const cr = crossRatio(-aOut, -aIn, aIn, aOut);
    rows.push({ d, aOut, aIn, cr, fIn: (aOut - aIn) / (2 * aOut) });
  }
  return rows;
};
const _t28eph = function _detectLandmarkRow(LAYOUT,crCurve,windowCandidates,sweepScratch,carrierTable,dpScratch,crDistance,crTable,fitMobiusInto,dpAlignFast,xFromK) {return (function detectLandmarkRow(scanEdges, opts = {}) {
  const out = [];
  out.windows = 0;
  out.survived = 0;
  const n = scanEdges ? scanEdges.length : 0;
  if (n < 8) return out;
  const sx = Float64Array.from(scanEdges, (e) => (typeof e === "number" ? e : e.x));

  const maxCands = opts.maxCands ?? 12; // fine-sweep budget per row
  const maxXRMSE = opts.maxXRMSE ?? 2.5;
  const minPairs = opts.minPairs ?? 7;
  const gapFrac = opts.gapFrac ?? 0.04; // gap penalty as a fraction of window width
  // How far a swept offset's predicted cross ratio may sit from the window's
  // measured one before the offset is skipped. Deliberately five times the
  // tolerance the window was ADMITTED under: the measured cross ratio picks the
  // right neighbourhood but not the right offset within it, and at the admission
  // tolerance the gate cut decodable rows (95 -> 58 on the angled frame) and put
  // 3px into the fused centres. At 0.06 the swept set is a superset of what wins.
  const dGateTol = opts.dGateTol ?? 0.06;
  const rOut = LAYOUT.R;
  const rIn = LAYOUT.anchorRadii[1];
  const dMax = crCurve[crCurve.length - 1].d;

  // candidate generation lives in windowCandidates so the exhaustive scan and
  // the reflection vote can be swapped (opts.generator) against identical
  // downstream code
  const gen = windowCandidates(sx, opts);
  const cands = gen.cands;
  out.windows = gen.windows;
  out.survived = cands.length;
  // spend the expensive alignment on the WIDEST curve-consistent windows: a real
  // mark's full-rim window is wider than any of its internal accidental windows,
  // and accidental quadruples routinely beat true ones on cross-ratio distance
  // (edge noise puts the truth at ~0.003; chance alignments can hit 0.0001).
  // Two refinements, both learned from mark-dense scenes: windows with a large
  // internal hole rank AFTER hole-free ones (they are usually stitched across
  // two marks — and on a symmetric grid such a chimera is centred exactly on the
  // mark between its parts), and at most 2 candidates may share an x-locality so
  // one busy region cannot starve the rest of the row.
  cands.sort(
    (p, q) =>
      (p.holeFrac > 0.24) - (q.holeFrac > 0.24) ||
      q.width - p.width ||
      p.crDist - q.crDist
  );
  const picked = [];
  for (const c of cands) {
    if (picked.length >= maxCands) break;
    const cx = (sx[c.i] + sx[c.j]) / 2;
    // anti-aliasing double-peaks rim edges, minting several near-identical
    // copies of the same window (same centre, width within a few px). Copies
    // must not count against the locality quota or they alone fill it — on a
    // symmetric grid the wide stitched window over marks A and C is centred
    // exactly on mark B, and its AA twins were evicting B's true window.
    let near = 0, twin = false;
    for (const k of picked) {
      if (Math.abs(k.cx - cx) >= 24) continue;
      if (Math.abs(k.width - c.width) < 0.08 * k.width) { twin = true; break; }
      near++;
    }
    if (twin || near >= 2) continue;
    c.cx = cx;
    picked.push(c);
  }

  const S = sweepScratch;
  const midRadii = S.midRadii, proj = S.proj, pairX = S.pairX, pairK = S.pairK;
  const seedX = S.seedX, seedK = S.seedK, mob = S.mob, mobR = S.mobR;
  const binUsed = S.used, binD = S.d, binScore = S.score, binRMSE = S.rmse;
  const binPairs = S.pairs, binRings = S.rings, binP = S.p, binQ = S.q, binR = S.r, binS = S.s;
  const nBins = S.nBins;
  // The d-sweep. Still the full-band search: same 0.25 offsets, same three
  // mid-pair radii (the mid pair's radius is ambiguous, because payload edges at
  // r=8 and r=6 alias onto the CR(d) curve), same gates, and still the best
  // hypothesis per 1-unit d bin, because alignment alone cannot pick d and the
  // decoder's photometric check in §4 makes the final call.
  //
  // Two things are gone. The allocation: a template array, a projection array,
  // one object per matched ring and one per bin, all minted ~85k times a frame --
  // that churn, not the arithmetic, was over half the frame. And the offsets whose
  // predicted cross ratio cannot be reconciled with the window's measured one,
  // which were most of them.
  for (const c of picked) {
    const gapPenalty = gapFrac * c.width;
    const scan = sx.subarray(c.i, c.j + 1);
    const M = scan.length;
    const xi = sx[c.i], xa = sx[c.a], xb = sx[c.b], xj = sx[c.j];
    binUsed.fill(0, 0, nBins);
    let anyBin = false;
    for (let di = 0; di < carrierTable.length; di++) {
      const d = di * 0.25;
      const aOut = Math.sqrt(rOut * rOut - d * d);
      const kS = carrierTable[di];
      const N = kS.length;
      dpScratch.ensure((N + 1) * (M + 1), N > M ? N : M);
      const bin = Math.floor(d);
      for (let ri = 0; ri < 3; ri++) {
        const rc = midRadii[ri];
        if (d > rc - 0.5) continue;
        if (crDistance(c.cr, crTable[ri][di]) > dGateTol) continue;
        const aIn = Math.sqrt(rc * rc - d * d);
        seedX[0] = xi; seedK[0] = -aOut;
        seedX[1] = xa; seedK[1] = -aIn;
        seedX[2] = xb; seedK[2] = aIn;
        seedX[3] = xj; seedK[3] = aOut;
        if (!fitMobiusInto(seedX, seedK, 4, mob)) continue;
        const mp = mob.p, mq = mob.q, mr = mob.r, ms = mob.s;
        let ok = true;
        for (let t = 0; t < N; t++) {
          const den = kS[t] * mr - mp;
          if (den > -1e-12 && den < 1e-12) { ok = false; break; }
          const v = (mq - kS[t] * ms) / den;
          if (!isFinite(v)) { ok = false; break; }
          proj[t] = v;
        }
        if (!ok) continue;
        dpAlignFast(proj, N, scan, M, gapPenalty, dpScratch.map);
        let np = 0;
        for (let t = 0; t < N; t++) {
          const s = dpScratch.map[t];
          if (s >= 0) { pairX[np] = scan[s]; pairK[np] = kS[t]; np++; }
        }
        if (np < minPairs) continue;
        if (!fitMobiusInto(pairX, pairK, np, mobR)) continue;
        const rp = mobR.p, rq = mobR.q, rr = mobR.r, rs = mobR.s;
        let ss = 0;
        for (let t = 0; t < np; t++) {
          const den = pairK[t] * rr - rp;
          if (den > -1e-12 && den < 1e-12) { ss = NaN; break; }
          const e = (rq - pairK[t] * rs) / den - pairX[t];
          ss += e * e;
        }
        const xRMSE = Math.sqrt(ss / np);
        if (!(xRMSE <= maxXRMSE)) continue;
        const score = xRMSE * (1 + (2 * (N - np)) / N);
        if (!isFinite(score)) continue;
        if (binUsed[bin] && binScore[bin] <= score) continue;
        binUsed[bin] = 1; anyBin = true;
        binD[bin] = d; binScore[bin] = score; binRMSE[bin] = xRMSE;
        binPairs[bin] = np; binRings[bin] = N;
        binP[bin] = rp; binQ[bin] = rq; binR[bin] = rr; binS[bin] = rs;
      }
    }
    if (!anyBin) continue;
    const dCands = [];
    for (let b = 0; b < nBins; b++) {
      if (!binUsed[b]) continue;
      dCands.push({
        d: binD[b], score: binScore[b], xRMSE: binRMSE[b],
        mobius: { p: binP[b], q: binQ[b], r: binR[b], s: binS[b] },
        pairsUsed: binPairs[b], rings: binRings[b]
      });
    }
    dCands.sort((p, q) => p.score - q.score);
    const best = dCands[0];
    out.push({
      startIndex: c.i,
      endIndex: c.j,
      mobius: best.mobius,
      dCandidates: dCands,
      anchors: [xi, xa, xb, xj],
      d: best.d,
      dSeed: c.dSeed,
      crDist: c.crDist,
      holeFrac: c.holeFrac,
      xRMSE: best.xRMSE,
      score: best.score,
      pairsUsed: best.pairsUsed,
      rings: best.rings,
      footX: xFromK(best.mobius, 0),
      leftX: xi,
      rightX: xj
    });
  }

  // non-maximum suppression by coverage then residual. runPipeline defers this
  // until after decoding (opts.nms === false) so a junk window cannot eclipse a
  // decodable one purely on edge-alignment merit.
  if (opts.nms !== false) {
    out.sort((p, q) => q.pairsUsed - p.pairsUsed || p.score - q.score);
    const accepted = [];
    for (const c of out) {
      const clash = accepted.some(
        (a) => !(c.endIndex < a.startIndex || c.startIndex > a.endIndex)
      );
      if (!clash) accepted.push(c);
    }
    accepted.windows = out.windows;
    accepted.survived = out.survived;
    return accepted;
  }
  return out;
});};
const _1w8wvjm = function _edgeThreshold(Inputs) {return (Inputs.range([2, 40], { step: 1, value: 12, label: "edge threshold" }));};
const _ck7l4a = (G, _) => G.input(_);
const _hqfg1d = function _runDetection(scanRows,edges1D,rowOf,edgeThreshold,detectLandmarkRow) {return (function runDetection(frame, opts = {}) {
  const t0 = window.performance.now();
  const hits = [];
  let windows = 0, survived = 0, edges = 0;
  for (const y of scanRows) {
    const se = edges1D(rowOf(frame, y), opts.edgeThreshold ?? edgeThreshold);
    edges += se.length;
    const dets = detectLandmarkRow(se, opts);
    windows += dets.windows;
    survived += dets.survived;
    for (const det of dets) hits.push({ y, ...det });
  }
  return {
    frame: frame.n,
    hits,
    ms: window.performance.now() - t0,
    rowsTouched: scanRows.length,
    scanEdges: edges,
    windows,
    survived
  };
});};
const _10cyklf = function _edgeRadii(LAYOUT) {
  // every radius at which an edge CAN appear: the band boundaries. The carrier
  // ones are always present; payload boundaries appear only where adjacent bits
  // differ. A hypothesis is scored by how much of the observed edge set lands on
  // this set.
  const rs = new Set();
  for (const [r0, r1] of LAYOUT.bands) { if (r0 > 0) rs.add(r0); if (r1 > 0) rs.add(r1); }
  return [...rs].sort((a, b) => a - b);
};
const _1jss6my = function _radiusLUT(LAYOUT,edgeRadii) {
  // The nearest-legal-radius answer for every 1/8-unit bucket up to the rim,
  // held as DATA rather than baked into a closure. A closure would serialise to
  // the worker pool as a function with unbound `table`/`N` in it — the kernel
  // builds itself out of toString(), so anything a detector function needs must
  // be reachable by NAME.
  const q = 8, n = Math.ceil(LAYOUT.R * q) + 2;
  const table = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const r = i / q;
    let bd = Infinity, br = -1;
    for (const cand of edgeRadii) {
      const e = Math.abs(cand - r);
      if (e < bd) { bd = e; br = cand; }
    }
    table[i] = br;
  }
  return { q, table };
};
const _xg16eo = function _nearestEdgeRadius(radiusLUT) {return (function nearestEdgeRadius(r) {
  // Nearest legal edge radius in O(1): quantise to 1/8 of a template unit and
  // read the precomputed answer. The linear scan over the 15 legal radii that
  // this replaces was the single dominant cost of the involution solver — 15
  // comparisons per edge, per refit iteration, per radius arm.
  const t = radiusLUT.table;
  const i = (r * radiusLUT.q + 0.5) | 0;
  return i >= 0 && i < t.length ? t[i] : -1;
});};
const _1kf19es = function _involutionScratch(LAYOUT) {
  // preallocated working set for detectRowInvolution, same discipline as
  // sweepScratch: nothing in the per-window loop allocates
  const N = 256;
  return {
    midRadii: [LAYOUT.anchorRadii[1], 8, 6],
    v: new Float64Array(N),
    fitX: new Float64Array(N), fitK: new Float64Array(N),
    fitX2: new Float64Array(N), fitK2: new Float64Array(N),
    asgX: new Float64Array(N), asgR: new Float64Array(N), asgS: new Int8Array(N),
    mob: { p: 0, q: 0, r: 0, s: 0 },
    cap: N
  };
};
const _pxtcwi = function _detectRowInvolution(LAYOUT,involutionScratch,windowCandidates,nearestEdgeRadius,fitMobiusInto,xFromK) {return (function detectRowInvolution(scanEdges, opts = {}) {
  // Solve the chord offset instead of sweeping for it.
  //
  // A mark is symmetric about its centre, so every ring is crossed twice, at +k
  // and -k. A Mobius map sends that pairing to a projective INVOLUTION on the
  // scan line, and an involution is fixed by its two fixed points: P = M(0), the
  // mark's foot, and Q = M(inf), the vanishing point. Those depend only on how
  // the four anchors PAIR UP -- (xi,xj) is one symmetric pair, (xa,xb) the other
  // -- and not on d at all, so the involution is known before d is.
  //
  // Put t = (x-P)/(x-Q). It sends P to 0 and Q to infinity, so t = c*k exactly,
  // and therefore
  //     v := t^2 = c^2 k^2 = c^2 (r^2 - d^2) = A r^2 + B,
  // linear in r^2. The rim and one mid pair give A and B in closed form; a few
  // least-squares refits over every edge that lands on a legal radius turn those
  // four anchor points into ~15. There is no d-sweep and no DP alignment: the
  // correspondence falls out of the linearisation.
  //
  // Measured against the sweep on the frame bank: 2.1x / 1.9x faster, same six
  // ids on the angled frame, no false positives on blank -- but 28/33 and 29/32
  // decoded rows. The lost rows are the price; see the bracket note below.
  const out = [];
  out.windows = 0;
  out.survived = 0;
  const n = scanEdges ? scanEdges.length : 0;
  if (n < 8) return out;
  const sx = Float64Array.from(scanEdges, (e) => (typeof e === "number" ? e : e.x));
  const maxCands = opts.maxCands ?? 12;
  const minPairs = opts.minPairs ?? 7;
  const tolR = opts.tolR ?? 0.9;
  const minCarrier = opts.minCarrier ?? 3;
  const maxXRMSE = opts.maxXRMSE ?? 2.5;
  const bracket = opts.bracket ?? 2;
  const R = LAYOUT.R;
  const S = involutionScratch;
  const v = S.v, fitX = S.fitX, fitK = S.fitK, fitX2 = S.fitX2, fitK2 = S.fitK2;
  const asgX = S.asgX, asgR = S.asgR, asgS = S.asgS, mobOut = S.mob;

  const rmseOf = (mob, xs, ks, q) => {
    if (q < 2) return Infinity;
    let ss = 0;
    for (let i = 0; i < q; i++) {
      const den = ks[i] * mob.r - mob.p;
      if (!(den > 1e-12 || den < -1e-12)) return Infinity;
      const e = (mob.q - ks[i] * mob.s) / den - xs[i];
      ss += e * e;
    }
    return Math.sqrt(ss / q);
  };

  const gen = windowCandidates(sx, opts);
  out.windows = gen.windows;
  out.survived = gen.cands.length;
  const cands = gen.cands.slice();
  cands.sort(
    (p, q) =>
      (p.holeFrac > 0.24) - (q.holeFrac > 0.24) || q.width - p.width || p.crDist - q.crDist
  );
  const picked = [];
  for (const c of cands) {
    if (picked.length >= maxCands) break;
    const cx = (sx[c.i] + sx[c.j]) / 2;
    let near = 0, twin = false;
    for (const k of picked) {
      if (Math.abs(k.cx - cx) >= 24) continue;
      if (Math.abs(k.width - c.width) < 0.08 * k.width) { twin = true; break; }
      near++;
    }
    if (twin || near >= 2) continue;
    c.cx = cx;
    picked.push(c);
  }

  for (const c of picked) {
    const xi = sx[c.i], xa = sx[c.a], xb = sx[c.b], xj = sx[c.j];
    // the involution swapping (xi,xj) and (xa,xb):  al*x*x' + be*(x+x') + ga = 0
    const S1 = xi + xj, P1 = xi * xj, S2 = xa + xb, P2 = xa * xb;
    const al = S2 - S1, be = P1 - P2, ga = P2 * S1 - P1 * S2;
    const lo = Math.min(xi, xj), hi = Math.max(xi, xj);
    let P, Q, affine = false;
    // al -> 0 is the AFFINE case, not a degeneracy: a frontal mark has
    // xi+xj == xa+xb exactly, its vanishing point is at infinity and the
    // involution is a plain reflection. Rejecting it rejects unforeshortened
    // marks, which is most of them.
    if (Math.abs(al) * (hi - lo) <= 1e-9 * Math.abs(be)) {
      if (Math.abs(be) < 1e-12) continue;
      P = -ga / (2 * be);
      Q = Infinity;
      affine = true;
    } else {
      const disc = be * be - al * ga;
      if (!(disc > 0)) continue; // elliptic involution: no real fixed points
      const sq = Math.sqrt(disc);
      const f1 = (-be + sq) / al, f2 = (-be - sq) / al;
      const in1 = f1 > lo && f1 < hi, in2 = f2 > lo && f2 < hi;
      if (in1 && !in2) { P = f1; Q = f2; }
      else if (in2 && !in1) { P = f2; Q = f1; }
      else continue; // the foot must be the one inside the window
    }
    const tOf = (x) => (affine ? x - P : (x - P) / (x - Q));
    const i0 = c.i, m = c.j - c.i + 1;
    if (m > S.cap) continue;
    let ok = true;
    for (let s = 0; s < m; s++) {
      const t = tOf(sx[i0 + s]);
      if (!isFinite(t)) { ok = false; break; }
      v[s] = t * t;
    }
    if (!ok) continue;
    const vOut = tOf(xi) ** 2, vIn = tOf(xa) ** 2;

    const arms = [];
    for (const rc of S.midRadii) {
      const A0 = (vOut - vIn) / (R * R - rc * rc);
      if (!(A0 > 0)) continue; // t^2 must grow with r^2
      const B0 = vOut - R * R * A0;
      if (!(-B0 / A0 >= 0) || -B0 / A0 >= rc * rc) continue;
      // the two anchor pairs only SEED (A,B); refit on every edge that lands on
      // a legal radius, which is what turns 4 points into ~15
      let a = A0, b = B0, inl = 0, carr = 0;
      for (let iter = 0; iter < 3; iter++) {
        let n1 = 0, sX = 0, sY = 0, sXX = 0, sXY = 0, cc2 = 0;
        const seen = new Set();
        for (let s = 0; s < m; s++) {
          const rr = (v[s] - b) / a;
          if (!(rr > 0)) continue;
          const r = Math.sqrt(rr), br = nearestEdgeRadius(r);
          if (br < 0 || Math.abs(br - r) > tolR) continue;
          const X = br * br, Y = v[s];
          n1++; sX += X; sY += Y; sXX += X * X; sXY += X * Y;
          if (!seen.has(br)) { seen.add(br); if (LAYOUT.fixedEdges.includes(br)) cc2++; }
        }
        inl = n1; carr = cc2;
        if (n1 < 3) break;
        const den2 = n1 * sXX - sX * sX;
        if (!(den2 > 1e-12 || den2 < -1e-12)) break;
        const aN = (n1 * sXY - sX * sY) / den2;
        if (!(aN > 0)) break;
        const bN = (sY - aN * sX) / n1;
        const conv = Math.abs(aN - a) < 1e-12 * Math.abs(a);
        a = aN; b = bN;
        if (conv) break;
      }
      const d2 = -b / a;
      if (!(d2 >= 0) || d2 >= rc * rc) continue;
      const d = Math.sqrt(d2);
      if (inl < minPairs || carr < minCarrier) continue;

      let np = 0;
      for (let s = 0; s < m; s++) {
        const rr = (v[s] - b) / a;
        if (!(rr > 0)) continue;
        const r = Math.sqrt(rr), br = nearestEdgeRadius(r);
        if (br < 0 || Math.abs(br - r) > tolR) continue;
        const kk = br * br - d * d;
        if (!(kk > 0)) continue;
        const xx = sx[i0 + s], sgn = tOf(xx) < 0 ? -1 : 1;
        fitX[np] = xx; fitK[np] = sgn * Math.sqrt(kk);
        asgX[np] = xx; asgR[np] = br; asgS[np] = sgn;
        np++;
      }
      if (np < 5) continue;
      const np0 = np;
      const push = (dd, xs2, ks2, q2) => {
        if (q2 < 5 || !fitMobiusInto(xs2, ks2, q2, mobOut)) return;
        const mm = { p: mobOut.p, q: mobOut.q, r: mobOut.r, s: mobOut.s };
        const xr = rmseOf(mm, xs2, ks2, q2);
        if (!(xr <= maxXRMSE)) return;
        arms.push({
          rc, d: dd, mobius: mm, xRMSE: xr, pairsUsed: q2,
          score: xr * (1 + (m - inl) / m)
        });
      };
      push(d, fitX, fitK, np0);
      // The involution pins the map; what remains uncertain is a narrow window
      // in d, and the photometric decode is what settles it (see §4). Offer
      // those offsets too -- 17 around a SOLVED estimate, against the sweep's
      // 35 blind ones, and with no DP alignment because the correspondence is
      // already known. Dropping the bracket costs 10 decoded rows.
      for (let dd = d - bracket; dd <= d + bracket + 1e-9; dd += 0.25) {
        if (dd < 0 || dd >= rc || Math.abs(dd - d) < 1e-9) continue;
        let q2 = 0;
        for (let s = 0; s < np0; s++) {
          const kk = asgR[s] * asgR[s] - dd * dd;
          if (!(kk > 0)) continue;
          fitX2[q2] = asgX[s]; fitK2[q2] = asgS[s] * Math.sqrt(kk); q2++;
        }
        push(dd, fitX2, fitK2, q2);
      }
    }
    if (!arms.length) continue;
    arms.sort((p, q) => p.score - q.score);
    const best = arms[0];
    out.push({
      startIndex: c.i,
      endIndex: c.j,
      mobius: best.mobius,
      dCandidates: arms.map((x) => ({ d: x.d, mobius: x.mobius, score: x.score, xRMSE: x.xRMSE })),
      anchors: [xi, xa, xb, xj],
      d: best.d,
      dSeed: c.dSeed,
      crDist: c.crDist,
      holeFrac: c.holeFrac,
      xRMSE: best.xRMSE,
      score: best.score,
      pairsUsed: best.pairsUsed,
      rings: m,
      footX: xFromK(best.mobius, 0),
      leftX: xi,
      rightX: xj
    });
  }
  return out;
});};
const _1th0q4j = function _detectRow(detectLandmarkRow,detectRowInvolution) {return (function detectRow(scanEdges, opts = {}) {
  // Which solver turns a row of edges into landmark hypotheses.
  //
  //   "involution"  DEFAULT. Solves the chord offset from the projective
  //                 involution the mark's own symmetry induces (detectRowInvolution).
  //   "sweep"       The original: enumerate 35 offsets x 3 mid radii, DP-align the
  //                 carrier template against each (detectLandmarkRow). Kept as the
  //                 reference implementation -- §3 measures against it.
  //
  // Same shape in, same shape out, so the pipeline, the worker pool and the
  // frame-bank tests can switch between them with one option.
  const solver = opts.solver ?? "involution";
  const out =
    solver === "sweep"
      ? detectLandmarkRow(scanEdges, { ...opts, nms: false })
      : detectRowInvolution(scanEdges, opts);
  if (opts.nms === false) return out;
  // non-maximum suppression by coverage then residual. runPipeline defers this
  // until after decoding (opts.nms === false) so a junk window cannot eclipse a
  // decodable one purely on edge-alignment merit.
  out.sort((p, q) => q.pairsUsed - p.pairsUsed || p.score - q.score);
  const accepted = [];
  for (const c of out) {
    const clash = accepted.some(
      (a) => !(c.endIndex < a.startIndex || c.startIndex > a.endIndex)
    );
    if (!clash) accepted.push(c);
  }
  accepted.windows = out.windows;
  accepted.survived = out.survived;
  return accepted;
});};
const _1kb5zti = function _solver_md(md,tex) {return (md`### §3.1 Solving the chord offset instead of sweeping for it

The sweep above is honest but brute: it tries 35 offsets × 3 candidate mid-pair radii per window and lets alignment pick. The offset can be *solved* instead.

A mark is symmetric about its centre, so every ring is crossed twice on any row, at \`+k\` and \`−k\`. A Möbius map takes that pairing to a projective **involution** on the scan line — a map \`M∘σ∘M⁻¹\` of order two, where \`σ(k) = −k\`. An involution on a line is fixed by its two fixed points, here \`P = M(0)\` (the foot of the perpendicular from the centre) and \`Q = M(∞)\` (the vanishing point of the mark's axis). Both come from the four anchor crossings alone: with \`x_i, x_j\` one symmetric pair and \`x_a, x_b\` the other,

${tex.block`\alpha\,x x' + \beta\,(x + x') + \gamma = 0,\qquad
\alpha = S_2 - S_1,\; \beta = P_1 - P_2,\; \gamma = P_2 S_1 - P_1 S_2`}

with \`S₁ = x_i+x_j, P₁ = x_i x_j, S₂ = x_a+x_b, P₂ = x_a x_b\`, and \`P, Q\` the roots of \`α x² + 2β x + γ = 0\`. **None of this involves \`d\`** — the involution is known before the offset is.

Now change coordinates: \`t = (x − P)/(x − Q)\` sends \`P → 0\` and \`Q → ∞\`, which forces \`t = c·k\` exactly. Squaring kills the sign ambiguity that made the correspondence hard, and \`k² = r² − d²\` gives

${tex.block`v := t^2 = c^2 (r^2 - d^2) = A\,r^2 + B, \qquad d = \sqrt{-B/A}`}

— **linear in \`r²\`**. The rim and one mid pair give \`A, B\` in closed form; a few least-squares refits over every edge that lands on a legal radius (\`nearestEdgeRadius\`, an O(1) lookup) turn four anchors into ~15 points. No offset sweep and no DP alignment: the correspondence falls out of the linearisation.

When \`α → 0\` the mark is frontal, the vanishing point is at infinity, and the right chart is the affine one \`t = x − P\` with \`P = −γ/2β\`. That is not a degeneracy — reject it and you reject most of the marks a phone actually sees.

\`detectRow\` dispatches between the two (\`opts.solver\`, default \`"involution"\`); the sweep stays as the reference implementation. The table below runs both on the same frames.`);};
const _1hslwo6 = function _solverComparison(testFrameBank,scanLattice,runPipeline,Inputs) {
  // Both solvers, same frames, same thresholds, on a 6px lattice so the row
  // count is high enough that the solver — not edge extraction — dominates.
  // Warm-up then median of 9, and the spread is reported: above ~25% a row is
  // measurement noise, not a result.
  const med = (fn) => {
    for (let w = 0; w < 4; w++) fn();
    const ts = [];
    for (let k = 0; k < 9; k++) {
      const t = window.performance.now();
      fn();
      ts.push(window.performance.now() - t);
    }
    ts.sort((a, b) => a - b);
    return { ms: ts[4], spread: (ts[8] - ts[0]) / (ts[4] || 1) };
  };
  const rows = [];
  for (const entry of testFrameBank) {
    const frame = entry && entry.frame;
    if (!frame || !frame.gray) continue;
    const o = { scanRows: scanLattice(frame.h, 6) };
    const sweep = runPipeline(frame, { ...o, solver: "sweep" });
    const invol = runPipeline(frame, o);
    const tS = med(() => runPipeline(frame, { ...o, solver: "sweep" }));
    const tI = med(() => runPipeline(frame, o));
    const ids = (r) => [...new Set(r.hits.map((h) => h.id))].sort((a, b) => a - b).join(" ");
    rows.push({
      frame: entry.file.replace(/^frame-|\.png$/g, ""),
      rows: o.scanRows.length,
      "sweep ms": +tS.ms.toFixed(1),
      "involution ms": +tI.ms.toFixed(1),
      speedup: +(tS.ms / tI.ms).toFixed(2),
      "spread": Math.round(100 * Math.max(tS.spread, tI.spread)) + "%",
      "sweep rows decoded": sweep.hits.length,
      "involution rows decoded": invol.hits.length,
      "sweep ids": ids(sweep),
      "involution ids": ids(invol)
    });
  }
  return Inputs.table(rows, { maxWidth: 1100, layout: "auto" });
};
const _wmmqxi = function _solver_result_md(md) {return (md`What the table says, and what it does not.

**It is faster, by less than the maths suggests.** Timed in isolation on pre-extracted edges the involution solver runs about 2× the sweep. Through the whole pipeline the gain is smaller, because the sweep was never the whole frame: edge extraction and window generation are untouched, and window generation alone was measured at 4.4 ms of a 14.1 ms detect. Replacing the sweep therefore caps out near 3× no matter how good the solver gets — after which \`windowCandidates\` is the thing to attack.

**It trades recall for it.** Fewer rows decode (roughly 32→27 and 34→28 on these frames). The angled frame keeps all six ids; the flat frame drops one real id and picks up a spurious one — and the sweep has a spurious id of its own, so neither is clean at the per-row level. Fusion is what makes this survivable: single-row errors do not cluster, and §5's vote discards them.

**Where the remaining loss lives.** Profiling the x-residual against \`d\`, with the correspondence taken from an already-decoded row, gives a sharply unimodal curve — ~12× dynamic range, minimum 0.26–0.52 px, argmin within half a unit of the decoded offset. So \`d\` *is* strongly identifiable from edge positions and the model fits well; what the solver loses is not conditioning but the bootstrap, the initial edge→radius correspondence taken from the noisy inner anchor. That is why the solved offset is offered to the decoder as a small bracket rather than a single answer, and why the decoder — the one stage with photometric evidence — still makes the final call.`);};
const _1p863gb = function _tilt_md(md) {return (md`### §3.2 How far a mark can lean

The simulator can set a mark's rotation exactly, so "does it cope with tilt" is a
measurement rather than an impression. One mark, centred, alone in frame, rotated
about the vertical axis (yaw) and about the horizontal one (pitch):

| tilt | 0° | 15° | 30° | 40° | 50° | 60° | 65° |
|---|---|---|---|---|---|---|---|
| involution | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | **miss** |
| sweep | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

Both hold to 60° on both axes. Past that the involution solver drops the mark
while the sweep still reads it, which is the same recall gap §3.1 measured on the
frame bank showing up as an angle: across 55–70° the involution produces about a
third fewer raw hypotheses per row than the sweep (38 vs 50, 34 vs 47, 28 vs 42).
Fusion absorbs most of that — on both mirror frames the two solvers fuse the same
six marks — but at extreme tilt there is no longer enough margin to absorb.

Hence the solver control in §0. The involution is the better default; if you are
working a mark at a steep angle, the sweep is what to reach for.

Worth separating two failure modes that both feel like "tilt does not work":

- **Yaw** squeezes the mark horizontally. Rows still cross it, each row just has
  a more extreme Möbius map. This is the case the geometry handles well.
- **Pitch** squeezes it vertically, so *fewer rows cross the mark at all*. A
  scan-line detector is asymmetric here by construction, and the fix is row
  density (\`fineStride\`), not a better per-row solver.`);};
const _1v5ujxb = function _anonymous(md) {return (md`---
## §4 Reading the bits without finding any edges

Decoding never runs an edge detector. The fitted Möbius map plus the recovered offset \`d\` predict exactly where each payload cell's midline radius crosses the scan row: radius \`r\` is crossed at \`k = ±√(r²−d²)\`, and \`xFromK\` turns that into a pixel coordinate. Reading a bit is two array lookups (both sides of the centre, averaged).

Raw intensities are meaningless without references — lighting, exposure and the renderer's antialiasing all move them. The white guards and black carrier rings are at *known radii*, so the same sampling trick reads them too: every decode carries its own photometric calibration, per row, for free.

Each payload cell becomes a **soft bit** in [−1, 1] (black → −1, white → +1, normalised between the measured references). A cell whose midline radius the chord cannot reach (\`rm ≤ d\`) is an **erasure** — score 0, no vote either way. Then the codebook is scored by correlation: the codeword maximising \`Σ softᵢ·(2wᵢ−1)\` wins, and the gap to the runner-up is the **decode margin**.

Because the minimum distance of the code is 4, a decode that lands close to two codewords at once has a small margin — that is either heavy occlusion or a false-positive detection. The margin gate is the verification step: **a window that aligned well but reads as no valid codeword is rejected**, something Parts I–III could never do.

Cost per decode: ~30 samples and 16 dot products of length 8 — and the codebook is consulted once *after* the bits are read, so growing the codebook from 16 to 256 ids changes nothing upstream of this line.`);};
const _18v6hzh = function _decodeLandmark(xFromK,LAYOUT,codebook) {return (function decodeLandmark(hit, frame, opts = {}) {
  const g = frame.gray;
  const W = frame.w;
  const row = hit.y * W;
  const radialMargin = opts.radialMargin ?? 0.3;

  const sample = (mob, k) => {
    const x = xFromK(mob, k);
    if (!isFinite(x) || x < 0 || x > W - 2) return null;
    const ix = Math.floor(x);
    const f = x - ix;
    return g[row + ix] * (1 - f) + g[row + ix + 1] * f;
  };
  // radius r is crossed at k = ±√(r²−d²); average the two sides when both land
  const both = (mob, d, r) => {
    if (r <= d + radialMargin) return null;
    const k = Math.sqrt(r * r - d * d);
    const a = sample(mob, k);
    const b = sample(mob, -k);
    if (a == null && b == null) return null;
    return a == null ? b : b == null ? a : (a + b) / 2;
  };
  // photometric consistency of a hypothesised (map, offset): a correct pair reads
  // every white reference brighter than every black one
  const refEval = (mob, d, dr) => {
    const ws = LAYOUT.whiteRefs.map((r) => both(mob, d, r + dr)).filter((v) => v != null);
    const bs = LAYOUT.blackRefs.map((r) => both(mob, d, r + dr)).filter((v) => v != null);
    if (ws.length < 2 || bs.length < 2) return null;
    return {
      sep: Math.min(...ws) - Math.max(...bs),
      wSpread: Math.max(...ws) - Math.min(...ws),
      bSpread: Math.max(...bs) - Math.min(...bs),
      wRef: ws.reduce((a, b) => a + b, 0) / ws.length,
      bRef: bs.reduce((a, b) => a + b, 0) / bs.length
    };
  };

  // Each detector hypothesis is decoded IN FULL and judged on its decode margin —
  // the final criterion — rather than on reference separation alone. On crisp
  // marks the references read cleanly even at a wrong offset (thick rings forgive
  // radius error), so separation saturates while the payload bits scramble; the
  // margin collapses exactly when that happens, and it costs only ~30 samples and
  // 16 dot products per hypothesis to measure it directly.
  //
  // ringOffsets can widen the search with δ-ring-shifted rereads of each
  // hypothesis (the quasi-periodic ring lattice makes off-by-one DP locks
  // conceivable). Default is [0]: in testing the shifted rereads never rescued a
  // failing row but did surface coherent wrong-id reads at low margin, so the
  // wider sweep is opt-in.
  const hyps = hit.dCandidates ?? [{ d: hit.d, mobius: hit.mobius }];
  const ringOffsets = opts.ringOffsets ?? [0];
  let best = null;
  for (const h of hyps) {
    for (const dr of ringOffsets) {
      const r = refEval(h.mobius, h.d, dr);
      if (!r) continue;
      const contrast = r.wRef - r.bRef;
      if (contrast < (opts.minContrast ?? 30)) continue;
      // stitched-chimera killer: a window spanning two neighbouring marks reads
      // some references off the background between them, which collapses the
      // worst-case class separation (sep) far below the mean contrast. A true
      // mark keeps sep comparable to contrast even when anti-aliasing smears
      // individual rings — the sep RATIO is the discriminator. The spread gate
      // is deliberately loose (0.75·contrast): a single mis-registered
      // reference inflates spread on an otherwise perfect margin-8 decode, and
      // tightening it was observed to reject exactly those clean reads.
      if (r.sep < (opts.minSepFrac ?? 0.25) * contrast) continue;
      const maxSpread = (opts.maxRefSpread ?? 0.75) * contrast;
      if (r.wSpread > maxSpread || r.bSpread > maxSpread) continue;

      // soft bits: black → −1, white → +1, erasure → 0
      const soft = new Array(8).fill(0);
      for (const c of LAYOUT.cells) {
        const v = both(h.mobius, h.d, c.rm + dr);
        if (v == null) continue;
        const t = (2 * (v - r.bRef)) / (r.wRef - r.bRef) - 1;
        soft[c.i] = Math.max(-1, Math.min(1, t));
      }
      const readable = soft.filter((x) => x !== 0).length;

      // correlation decode over the whole codebook — the only place codebook size enters
      let bestSc = -Infinity, second = -Infinity, bestId = -1;
      for (let id = 0; id < codebook.length; id++) {
        const w = codebook[id];
        let sc = 0;
        for (let i = 0; i < 8; i++) sc += soft[i] * (2 * w[i] - 1);
        if (sc > bestSc) { second = bestSc; bestSc = sc; bestId = id; }
        else if (sc > second) second = sc;
      }
      // ids 0 and 15 are reserved: their payloads are all-black / all-white, which
      // is exactly what a misplaced window over featureless paint reads
      if (bestId === 0 || bestId === 15) continue;
      const margin = bestSc - second;
      if (!best || margin > best.margin || (margin === best.margin && r.sep > best.sep)) {
        best = {
          id: bestId,
          score: bestSc,
          margin,
          readable,
          soft,
          d: h.d,
          ringOffset: dr,
          sep: r.sep,
          mobius: h.mobius,
          wRef: r.wRef,
          bRef: r.bRef
        };
      }
    }
  }
  return best;
});};
const _1bz0j2c = function _minMargin(Inputs) {return (Inputs.range([0, 8], { step: 0.25, value: 2, label: "decode margin gate" }));};
const _14a2hls = (G, _) => G.input(_);
const _101f5yy = function _runPipeline(minMargin,scanRows,edges1Dsub,rowOf,edgeThreshold,detectRow,decodeLandmark,xFromK) {return (function runPipeline(frame, opts = {}) {
  const t0 = window.performance.now();
  const mm = opts.minMargin ?? minMargin;
  const minReadable = opts.minReadable ?? 5;
  // callers may re-phase the scan lattice (opts.scanRows): a static scene can be
  // temporally dithered so a mark that straddles one phase's rows badly is caught
  // by the next frame's offset rows
  const rows = opts.scanRows ?? scanRows;
  // opts.collectWindows hands back the pre-decode windows. They are the detector's
  // GEOMETRIC evidence, and geometry survives rows whose payload will not decode,
  // so a caller can use them to find where the marks are before spending any
  // photometry there. Collected here rather than by a second pass because the
  // edges are already extracted at this point.
  const winList = opts.collectWindows ? [] : null;
  const hits = [];
  let rawHits = 0, rejected = 0, windows = 0, survived = 0, edges = 0;
  let msDetect = 0, msDecode = 0;
  for (const y of rows) {
    const tA = window.performance.now();
    const se = edges1Dsub(rowOf(frame, y), opts.edgeThreshold ?? edgeThreshold);
    edges += se.length;
    // decode BEFORE non-maximum suppression: overlapping windows are resolved by
    // who actually reads as a valid codeword, not by edge-alignment score alone.
    // detectRow dispatches to the involution solver by default, or back to the
    // original sweep with opts.solver === "sweep".
    const dets = detectRow(se, { ...opts, nms: false });
    windows += dets.windows;
    survived += dets.survived;
    rawHits += dets.length;
    if (winList)
      for (const d of dets)
        winList.push({
          y,
          cx: (d.leftX + d.rightX) / 2,
          w: d.rightX - d.leftX,
          holeFrac: d.holeFrac
        });
    const tB = window.performance.now();
    msDetect += tB - tA;
    const decoded = [];
    for (const det of dets) {
      const hit = { y, ...det };
      const dec = decodeLandmark(hit, frame, opts);
      if (!dec || dec.margin < mm || dec.readable < minReadable) {
        rejected++;
        continue;
      }
      decoded.push({
        ...hit,
        mobius: dec.mobius,
        d: dec.d,
        footX: xFromK(dec.mobius, 0),
        id: dec.id,
        decodeMargin: dec.margin,
        refSep: dec.sep,
        readable: dec.readable,
        soft: dec.soft
      });
    }
    // NMS among decodable hits: strongest decode wins overlaps
    decoded.sort((p, q) => q.decodeMargin - p.decodeMargin || p.xRMSE - q.xRMSE);
    for (const c of decoded) {
      const clash = hits.some(
        (a) => a.y === c.y && !(c.endIndex < a.startIndex || c.startIndex > a.endIndex)
      );
      if (!clash) hits.push(c);
      else rejected++;
    }
    msDecode += window.performance.now() - tB;
  }
  return {
    frame: frame.n,
    hits,
    windowList: winList,
    rawHits,
    rejectedByDecode: rejected,
    windows,
    survived,
    scanEdges: edges,
    rowsTouched: rows.length,
    msDetect,
    msDecode,
    ms: window.performance.now() - t0
  };
});};
const _w7qboo = function _frameLandmarks(runPipeline,simFrame) {return (runPipeline(simFrame, {}));};
const _16dv5r5 = function _detectionLayer(htl,groundTruth,frameLandmarks,overlaySvg,invalidation) {
  const g = htl.svg`<g></g>`;
  // ground truth: projected ellipse + true id
  for (const b of groundTruth) {
    if (!b.onScreen) continue;
    const ang = (Math.atan2(b.u.y, b.u.x) * 180) / Math.PI;
    const ru = Math.hypot(b.u.x, b.u.y);
    const rv = Math.hypot(b.v.x, b.v.y);
    g.appendChild(
      htl.svg`<ellipse cx="${b.cx}" cy="${b.cy}" rx="${ru}" ry="${rv}" transform="rotate(${ang} ${b.cx} ${b.cy})" fill="none" stroke="#4fd1c5" stroke-width="1" stroke-dasharray="4 3" opacity="0.85"/>`
    );
    g.appendChild(
      htl.svg`<text x="${b.cx}" y="${b.cy - rv - 4}" fill="#4fd1c5" font-size="11" font-family="monospace" text-anchor="middle">id ${b.trueId}</text>`
    );
  }
  // decoded landmark rows: span, foot, and the id that was read
  for (const h of frameLandmarks.hits) {
    if (!isFinite(h.leftX) || !isFinite(h.rightX) || !isFinite(h.footX)) continue;
    g.appendChild(
      htl.svg`<line x1="${h.leftX}" y1="${h.y}" x2="${h.rightX}" y2="${h.y}" stroke="#ffd166" stroke-width="2" opacity="0.9"/>`
    );
    g.appendChild(
      htl.svg`<circle cx="${h.footX}" cy="${h.y}" r="3" fill="none" stroke="#ffd166" stroke-width="1.5"/>`
    );
    g.appendChild(
      htl.svg`<text x="${h.rightX + 5}" y="${h.y + 4}" fill="#ffd166" font-size="11" font-family="monospace">${h.id}</text>`
    );
  }
  overlaySvg.appendChild(g);
  invalidation.then(() => g.remove());
  return;
};
const _16xqu3c = function _landmarkTable(Inputs,frameLandmarks) {return (Inputs.table(
  frameLandmarks.hits.map((h) => ({
    y: h.y,
    id: h.id,
    footX: +h.footX.toFixed(1),
    d: +h.d.toFixed(2),
    margin: +h.decodeMargin.toFixed(2),
    refSep: +h.refSep.toFixed(0),
    readable: h.readable,
    xRMSE: +h.xRMSE.toFixed(3)
  })),
  { layout: "auto" }
));};
const _134ceh = function _scoreLandmarks(groundTruth) {return (function scoreLandmarks(run) {
  const gt = groundTruth.filter((b) => b.onScreen);
  const rows = [];
  const foundIds = new Set();
  let idCorrect = 0;
  for (const hit of run.hits) {
    let best = null;
    let bestDist = Infinity;
    for (const b of gt) {
      const r = Math.hypot(
        (hit.footX - b.cx) / b.xExtent,
        (hit.y - b.cy) / b.yExtent
      );
      if (r < bestDist) {
        bestDist = r;
        best = b;
      }
    }
    const ok = best && bestDist <= 1;
    const idOk = ok && hit.id === best.trueId;
    if (ok) foundIds.add(best.id);
    if (idOk) idCorrect++;
    rows.push({
      y: hit.y,
      decodedId: hit.id,
      trueId: ok ? best.trueId : null,
      idOk: ok ? idOk : null,
      footX: +hit.footX.toFixed(2),
      errX: ok ? +(hit.footX - best.cx).toFixed(3) : null,
      margin: +hit.decodeMargin.toFixed(2)
    });
  }
  const matched = rows.filter((r) => r.trueId !== null);
  const rms = (xs) =>
    xs.length ? Math.sqrt(xs.reduce((a, b) => a + b * b, 0) / xs.length) : null;
  const rx = rms(matched.map((r) => r.errX));
  return {
    landmarksOnScreen: gt.length,
    landmarksFound: foundIds.size,
    rowHits: rows.length,
    idCorrect,
    idWrong: matched.length - idCorrect,
    falsePositives: rows.length - matched.length,
    rmsErrX_px: rx == null ? null : +rx.toFixed(3),
    msPerFrame: +run.ms.toFixed(1),
    perRow: rows
  };
});};
const _vhmell = function _frameScore(scoreLandmarks,frameLandmarks) {
  const s = scoreLandmarks(frameLandmarks);
  return {
    landmarksOnScreen: s.landmarksOnScreen,
    landmarksFound: s.landmarksFound,
    rowHits: s.rowHits,
    idCorrect: s.idCorrect,
    idWrong: s.idWrong,
    falsePositives: s.falsePositives,
    rmsErrX_px: s.rmsErrX_px,
    msPerFrame: s.msPerFrame
  };
};
const _d8xg2l = function _anonymous(md,minMargin) {return (md`---
## §5 Fusing rows into labelled landmarks

A single scan row gives one reading: a position, a chord offset \`d\`, and a decoded id with a margin. Rows are cheap, and a mark spans many of them, so the natural unit of output is not a row hit but a *landmark*: the cluster of row hits that belong to one mark, fused into a 2D centre and a single voted id.

Two things change relative to the per-row pipeline of §4:

1. **The gate relaxes.** Per-row we demanded a decode margin ≥ ${minMargin} because a lone row has nothing to corroborate it. For fusion we drop the bar (margin ≥ 0.8, readable ≥ 4) and let corroboration do the work: a wrong low-margin read is out-voted by its neighbours, and junk windows do not cluster — they land at scattered positions and fail the minimum-rows test.

2. **The id becomes a vote.** Each row hit contributes its decode margin as weight to its id. The cluster's id is the heaviest; the vote margin (best minus runner-up weight) is the landmark's confidence. This is the payoff of soft-decision decoding — a marginal row still contributes evidence instead of being rounded to a hard yes/no.

Geometry reuses Part III's V-fit unchanged (\`fuseCluster\`, imported): \`|d|\` versus \`y\` forms a V whose apex is the mark centre, giving a sub-row-stride vertical position from purely horizontal scans.`);};
const _1kcdtq1 = function _fuseLandmarks(rowStride,fuseCluster) {return (function fuseLandmarks(hits, opts = {}) {
  const xTol = opts.xTol ?? 0.6;
  const maxRowGap = opts.maxRowGap ?? 3;
  const minRows = opts.minRows ?? 2;
  // cluster: same greedy row-major sweep as Part III, keyed on footX proximity
  // relative to the window's own apparent half-width
  const sorted = hits
    .filter((h) => isFinite(h.footX) && isFinite(h.d))
    .sort((a, b) => a.y - b.y || a.footX - b.footX);
  const clusters = [];
  for (const h of sorted) {
    const span = Math.abs(h.rightX - h.leftX);
    const half = isFinite(span) && span > 1 ? span / 2 : 30;
    let best = null;
    let bestDx = Infinity;
    for (const c of clusters) {
      const last = c[c.length - 1];
      if (h.y - last.y > maxRowGap * rowStride) continue;
      const dx = Math.abs(h.footX - last.footX);
      if (dx > xTol * half) continue;
      if (dx < bestDx) {
        bestDx = dx;
        best = c;
      }
    }
    if (best) best.push(h);
    else clusters.push([h]);
  }
  const fuseOne = (c) => {
    if (c.length < minRows) return null;
    // margin-weighted id vote across the cluster's rows
    const votes = new Map();
    for (const h of c) votes.set(h.id, (votes.get(h.id) ?? 0) + h.decodeMargin);
    const ranked = [...votes.entries()].sort((p, q) => q[1] - p[1]);
    const [id, voteWeight] = ranked[0];
    const voteMargin = voteWeight - (ranked[1]?.[1] ?? 0);
    // geometry from winner rows only: a row that decoded to a losing id got its
    // position from a wrong map, and would drag the centre fit
    const geo = c.filter((h) => h.id === id);
    // the WINNER needs corroboration, not just the cluster: two disagreeing
    // low-margin rows form a 2-row cluster whose "winner" is a coin toss — a
    // wrong-id landmark is worse for navigation than no landmark, so demand
    // minRows rows of the winning id itself
    if (geo.length < minRows) return null;
    const fit = geo.length >= 3 ? fuseCluster(geo) : null;
    let xc, yc;
    if (fit) {
      xc = fit.xc;
      yc = fit.yc;
    } else {
      let w = 0, sx = 0, sy = 0;
      for (const h of geo) {
        w += h.decodeMargin;
        sx += h.decodeMargin * h.footX;
        sy += h.decodeMargin * h.y;
      }
      xc = sx / w;
      yc = sy / w;
    }
    return {
      id,
      xc,
      yc,
      voteWeight: +voteWeight.toFixed(2),
      voteMargin: +voteMargin.toFixed(2),
      rows: c.length,
      geoRows: geo.length,
      vFit: !!fit,
      apparentRadiusY: fit ? fit.apparentRadiusY : null,
      hits: c
    };
  };
  const out = [];
  for (const c of clusters) {
    const f = fuseOne(c);
    if (f) out.push(f);
  }
  // Same mark, two clusters. Decodes through a mark are erratic, so a run of
  // undecodable rows longer than the sweep's maxRowGap can split one physical
  // mark's rows into two clusters — observed once the reflection gate thinned
  // the decoded row set, which emitted the same id twice at the same spot. Two
  // landmarks with the same id whose centres sit within half a mark width ARE
  // one mark; re-fuse their combined rows so the geometry uses all of them.
  // Half a mark width cannot merge two genuinely distinct same-id marks: they
  // would have to physically overlap.
  const widthOf = (f) => {
    const spans = f.hits
      .map((h) => Math.abs(h.rightX - h.leftX))
      .filter((s) => isFinite(s) && s > 1)
      .sort((a, b) => a - b);
    return spans.length ? spans[spans.length >> 1] : 60;
  };
  let merged = true;
  while (merged) {
    merged = false;
    outer: for (let a = 0; a < out.length; a++) {
      for (let b = a + 1; b < out.length; b++) {
        if (out[a].id !== out[b].id) continue;
        const lim = Math.max(widthOf(out[a]), widthOf(out[b])) / 2;
        if (Math.hypot(out[a].xc - out[b].xc, out[a].yc - out[b].yc) > lim) continue;
        const f = fuseOne(out[a].hits.concat(out[b].hits));
        out.splice(b, 1);
        if (f) out[a] = f;
        else out.splice(a, 1);
        merged = true;
        break outer;
      }
    }
  }
  return out.sort((p, q) => q.voteWeight - p.voteWeight);
});};
const _1whsoz5 = function _fusedLandmarks(runPipeline,simFrame,scanRows,fuseLandmarks) {
  // relaxed per-row gate: corroboration across rows replaces margin strictness.
  // Two scan phases: a static frame costs nothing to rescan offset by half a
  // stride, and a mark whose centre falls badly against one row lattice (its
  // readable band clipped to a single row) gets complementary rows from the
  // other phase — the same temporal dither the §7 rig uses, collapsed into one
  // frame because there is no motion to respect.
  const opts = { minMargin: 0.8, minReadable: 4 };
  const a = runPipeline(simFrame, opts);
  const b = runPipeline(simFrame, {
    ...opts,
    scanRows: scanRows.map((y) => y - 6).filter((y) => y >= 0)
  });
  return fuseLandmarks([...a.hits, ...b.hits]);
};
const _1cm1mhn = function _fusedTable(Inputs,fusedLandmarks) {return (Inputs.table(
  fusedLandmarks.map((f) => ({
    id: f.id,
    xc: +f.xc.toFixed(1),
    yc: +f.yc.toFixed(1),
    rows: f.rows,
    geoRows: f.geoRows,
    vFit: f.vFit,
    voteWeight: f.voteWeight,
    voteMargin: f.voteMargin
  })),
  { layout: "auto" }
));};
const _g4km08 = function _fusedLayer(fusedLandmarks,overlaySvg,invalidation) {
  const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
  for (const f of fusedLandmarks) {
    const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    c.setAttribute("cx", f.xc);
    c.setAttribute("cy", f.yc);
    c.setAttribute("r", 6);
    c.setAttribute("fill", "none");
    c.setAttribute("stroke", "#ff5cf4");
    c.setAttribute("stroke-width", 2.5);
    g.append(c);
    const t = document.createElementNS("http://www.w3.org/2000/svg", "text");
    t.setAttribute("x", f.xc + 10);
    t.setAttribute("y", f.yc - 8);
    t.setAttribute("fill", "#ff5cf4");
    t.setAttribute("font-size", "15");
    t.setAttribute("font-weight", "bold");
    t.textContent = `id ${f.id} ×${f.rows}`;
    g.append(t);
  }
  overlaySvg.append(g);
  invalidation.then(() => g.remove());
};
const _hl8v3v = function _anonymous(md) {return (md`---
## §6 Scoring against ground truth

The simulator knows exactly where every mark is and what id it carries, so the whole pipeline can be scored end-to-end. Two levels:

- **Per row** (\`frameScore\`): every surviving row hit is matched to the nearest ground-truth mark in normalized ellipse distance; a hit inside the ellipse (distance ≤ 1) whose decoded id equals the mark's id counts as correct.
- **Per landmark** (\`fusionScore\`): each fused cluster is matched the same way on its centre estimate.

Occlusion bounds recall: the scene deliberately overlaps marks, and a mark that is partially behind another loses its edge structure on exactly the rows that cross the occluder — no amount of per-row cleverness reads a mark that is not visible. The detector's job is to read every *visible* mark and to say nothing about the rest; false positives are the failure mode that matters, because a robot that trusts a phantom landmark navigates with a corrupted map.

Decode cost does not grow with the codebook. The correlation decode is Σ softᵢ·(2wᵢ−1) per codeword — 16 multiply-adds over 8 bits — and everything before it (windowing, alignment, photometric sampling) is codebook-blind. Doubling the payload to 16 bits would double the sample count per row, not the search space: this is the practical difference between *labelled* landmarks and template-matched ones, where each new template multiplies detection cost.`);};
const _1uuc46l = function _fusionScore(groundTruth,fusedLandmarks) {
  const gt = groundTruth.filter((b) => b.onScreen);
  let idCorrect = 0, wrong = 0, fp = 0;
  const rows = fusedLandmarks.map((f) => {
    let best = null, bd = Infinity;
    for (const b of gt) {
      const r = Math.hypot((f.xc - b.cx) / b.xExtent, (f.yc - b.cy) / b.yExtent);
      if (r < bd) { bd = r; best = b; }
    }
    const ok = best && bd <= 1;
    if (!ok) fp++;
    else if (f.id === best.trueId) idCorrect++;
    else wrong++;
    return {
      id: f.id,
      trueId: ok ? best.trueId : null,
      errX: ok ? +(f.xc - best.cx).toFixed(2) : null,
      errY: ok ? +(f.yc - best.cy).toFixed(2) : null,
      rows: f.rows,
      voteMargin: f.voteMargin
    };
  });
  return {
    landmarksOnScreen: gt.length,
    landmarksIdentified: idCorrect,
    idWrong: wrong,
    falsePositives: fp,
    perLandmark: rows
  };
};
const _d5ljip = function _anonymous(md) {return (md`---
## §7 Mirror calibration rig

Point the laptop at a mirror and the machine can see its own screen: the notebook draws marks at positions *it chose*, the camera reports positions *it measured*, and both ends share one \`performance.now()\` clock. That closes the loop that §6's simulator closed in software — but through real optics, real screen persistence, real camera latency.

Two properties make the mirror harmless:

- **The code is radial.** A mirror flips the image left-right, but every ring is a ring after reflection — carrier edges, payload bands and photometric references are all functions of radius only. Decoding is untouched.
- **A homography absorbs the flip.** The screen-to-camera mapping (mirror included) is projective; fitting it makes no assumption about orientation, so the reflection just shows up as a negative determinant.

The rig has two stimulus modes and two capture sources:

| | measures |
|---|---|
| **grid** — six static marks at known positions | screen→camera **homography** (camera calibration), static id accuracy |
| **orbit** — one mark on a Lissajous path, speed adjustable | **end-to-end latency**, tracking under motion, speed limits |

Latency needs no calibration at all: the commanded x-position and the detected x-position are the same sinusoid up to scale, offset and mirror-flip, so cross-correlating the two normalized signals over a lag grid reads the delay directly. The homography is only needed when you want *metric* answers (where is the camera, how distorted is the lens).

The **loopback** source pipes the stimulus canvas straight into the detector — no camera, no mirror. It exists so the rig can verify itself: loopback latency should be a frame or two, the loopback homography is a known pure scale, and any id error in loopback is a bug, not physics. Switch to **camera** with the mirror in place and every number that moves is measuring the physical channel.`);};
const _13fbguf = function _drawLandmark(LAYOUT,codebook) {return (function drawLandmark(ctx, cx, cy, R, id) {
  // no quiet zone: an extra white disc outside the rim adds a strong edge at
  // 1.15R that windows anchor on, stretching every sampled radius by 1.15x and
  // landing the photometric references in the wrong bands. The mid-gray
  // background gives the black rim all the contrast the edge detector needs.
  const scale = R / LAYOUT.R;
  for (const [r0, r1, k] of LAYOUT.bands) {
    const bit = typeof k === "number" ? k : codebook[id][+k.slice(1)];
    ctx.fillStyle = bit ? "#fff" : "#000";
    ctx.beginPath();
    ctx.arc(cx, cy, r1 * scale, 0, 2 * Math.PI);
    ctx.arc(cx, cy, r0 * scale, 0, 2 * Math.PI, true);
    ctx.fill("evenodd");
  }
});};
const _c4vxv2 = function _calMode(Inputs) {return (Inputs.radio(["grid", "orbit"], { label: "stimulus", value: "grid" }));};
const _trjtqx = (G, _) => G.input(_);
const _ohzx5w = function _calRunning(Inputs) {return (Inputs.toggle({ label: "calibration rig", value: false }));};
const _mmw90r = (G, _) => G.input(_);
const _ntgvpx = function _calSpeed(Inputs) {return (Inputs.range([0.05, 2], { step: 0.05, value: 0.25, label: "orbit speed (Hz)" }));};
const _73cqhr = (G, _) => G.input(_);
const _5pnclc = function _stimulusBus() {
  // stable shared handle between the stimulus animator and the capture loop —
  // the capture generator reads history without re-instantiating per frame
  return { history: [], marks: [], t: 0 };
};
const _1g04xsf = function _stimulusView() {
  const c = window.document.createElement("canvas");
  c.width = 960;
  c.height = 600;
  c.style.width = "100%";
  c.style.maxWidth = "960px";
  c.style.display = "block";
  c.style.background = "#888";
  const btn = window.document.createElement("button");
  btn.textContent = "fullscreen (for the mirror)";
  btn.style.margin = "4px 0";
  btn.onclick = () => c.requestFullscreen();
  const div = window.document.createElement("div");
  div.append(btn, c);
  div.canvas = c;
  return div;
};
const _xfbe8z = function _stimulusRun(calRunning,stimulusView,calMode,calSpeed,drawLandmark,stimulusBus) {return (async function* () {
  if (!calRunning) {
    yield "stimulus off";
    await new Promise(() => {}); // park until the toggle re-runs this cell
  }
  const c = stimulusView.canvas;
  const ctx = c.getContext("2d");
  const w = c.width, h = c.height;
  let n = 0;
  while (true) {
    await new Promise((r) => window.requestAnimationFrame(r));
    const t = window.performance.now();
    let marks;
    if (calMode === "grid") {
      // six static marks at known positions — one frame of these fits a homography.
      // The middle column is staggered vertically: on a symmetric 3-collinear row
      // the stitched window spanning the outer marks is centred exactly on the
      // middle one and its scan rows fight the neighbours' for detector slots.
      // Staggering removes the shared latitude band (and a non-collinear 6-point
      // constellation conditions the homography better anyway).
      marks = [];
      const R = 100;
      const stagger = [0, 0.13, 0]; // per-column y offset, as a fraction of h
      for (let i = 0; i < 6; i++) {
        const col = i % 3;
        marks.push({
          id: 1 + i,
          x: w * (0.18 + 0.32 * col),
          y: h * ((i < 3 ? 0.2 : 0.66) + stagger[col]),
          R
        });
      }
    } else {
      // orbit: one mark on a Lissajous path, frequency from the speed slider
      const f = (2 * Math.PI * calSpeed * t) / 1000;
      marks = [
        {
          id: 7,
          x: w / 2 + 0.32 * w * Math.sin(f),
          y: h / 2 + 0.22 * h * Math.sin(0.63 * f + 1),
          R: 110
        }
      ];
    }
    ctx.fillStyle = "#888";
    ctx.fillRect(0, 0, w, h);
    for (const m of marks) drawLandmark(ctx, m.x, m.y, m.R, m.id);
    stimulusBus.t = t;
    stimulusBus.marks = marks;
    stimulusBus.history.push({ t, marks });
    if (stimulusBus.history.length > 600) stimulusBus.history.shift();
    if (n % 600 === 0) yield `stimulus ${calMode} frame ${n}`;
    n++;
  }
}());};
const _12d6o8 = function _calSource(Inputs) {return (Inputs.radio(["loopback", "camera"], { label: "capture source", value: "loopback" }));};
const _1dh1pen = (G, _) => G.input(_);
const _1i4d397 = async function _calStream(calRunning,calSource,CAL_FRAME,invalidation) {
  if (!calRunning || calSource !== "camera") return null;
  try {
    const stream = await window.navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: CAL_FRAME.w },
        height: { ideal: CAL_FRAME.h },
        facingMode: "user" // the screen-facing camera is the one that sees the mirror
      }
    });
    invalidation.then(() => {
      for (const t of stream.getTracks()) t.stop();
    });
    return stream;
  } catch (e) {
    return { error: String((e && e.message) || e) };
  }
};
const _1itgjy2 = async function _calVideo(htl,calStream,invalidation) {
  const v = htl.html`<video playsinline muted autoplay style="display:none"></video>`;
  if (calStream && !calStream.error) {
    v.srcObject = calStream;
    try {
      await v.play();
    } catch (e) {
      // autoplay policy can reject; the element still decodes once visible
    }
  }
  invalidation.then(() => {
    try {
      v.pause();
      v.srcObject = null;
    } catch (e) {}
  });
  return v;
};
const _uxbtt2 = function _calRun(calRunning,CAL_FRAME,calRows,calMode,stimulusBus,calSource,calVideo,stimulusView,analyzeFrame,detectPool) {return (async function* () {
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
}());};
const _9ey4fu = function _fitHomography() {return (function fitHomography(pairs) {
  // least-squares homography (h33 = 1): [sx,sy] -> [dx,dy], 8 unknowns,
  // normal equations solved by Gaussian elimination. Reflections (the mirror)
  // come out as a negative determinant of the affine part — no special casing.
  if (pairs.length < 4) return null;
  const A = Array.from({ length: 8 }, () => new Float64Array(9));
  for (const { sx, sy, dx, dy } of pairs) {
    const r1 = [sx, sy, 1, 0, 0, 0, -sx * dx, -sy * dx, dx];
    const r2 = [0, 0, 0, sx, sy, 1, -sx * dy, -sy * dy, dy];
    for (const r of [r1, r2]) {
      for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) A[i][j] += r[i] * r[j];
        A[i][8] += r[i] * r[8];
      }
    }
  }
  for (let c = 0; c < 8; c++) {
    let p = c;
    for (let r = c + 1; r < 8; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    if (Math.abs(A[p][c]) < 1e-12) return null;
    [A[c], A[p]] = [A[p], A[c]];
    for (let r = 0; r < 8; r++) {
      if (r === c) continue;
      const f = A[r][c] / A[c][c];
      for (let j = c; j < 9; j++) A[r][j] -= f * A[c][j];
    }
  }
  const h = A.map((row, i) => row[8] / row[i]);
  const H = [h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], 1];
  const map = (sx, sy) => {
    const w = H[6] * sx + H[7] * sy + 1;
    return [(H[0] * sx + H[1] * sy + H[2]) / w, (H[3] * sx + H[4] * sy + H[5]) / w];
  };
  let ss = 0;
  for (const { sx, sy, dx, dy } of pairs) {
    const [px, py] = map(sx, sy);
    ss += (px - dx) ** 2 + (py - dy) ** 2;
  }
  return {
    H,
    map,
    mirrored: H[0] * H[4] - H[1] * H[3] < 0,
    rmsResidual: Math.sqrt(ss / pairs.length),
    pairs: pairs.length
  };
});};
const _nnfn1b = function _calHomography(calRun,stimulusBus,fitHomography) {
  // grid mode: id-match the ACCUMULATED landmark centres (not one frame's fused
  // subset) to the commanded marks — the scan-phase dither means different frames
  // see different mark subsets, and the accumulator merges them
  if (!calRun || calRun.mode !== "grid") return null;
  const cmd = new Map(stimulusBus.marks.map((m) => [m.id, m]));
  const pairs = [];
  for (const f of calRun.landmarks ?? []) {
    const m = cmd.get(f.id);
    if (m) pairs.push({ sx: m.x, sy: m.y, dx: f.xc, dy: f.yc });
  }
  return fitHomography(pairs);
};
const _1gnnqz3 = function _calStats(calRun,md,stimulusBus,calHomography,htl) {
  if (!calRun) return md`*rig off — toggle "calibration rig" to start*`;
  const rows = [
    ["mode / source", `${calRun.mode} / ${calRun.source}`],
    ["frames processed", calRun.n],
    ["pipeline ms", calRun.run.ms.toFixed(1)],
    ["row hits", calRun.run.hits.length],
    ["fused this frame", calRun.fused.map((f) => `id${f.id}×${f.rows}`).join(" ") || "—"]
  ];
  if (calRun.mode === "grid") {
    const cmdIds = new Set(stimulusBus.marks.map((m) => m.id));
    const lm = calRun.landmarks ?? [];
    const good = lm.filter((f) => cmdIds.has(f.id)).length;
    rows.push([
      "accumulated landmarks",
      lm.map((f) => `id${f.id}(${f.seen}f)`).join(" ") || "—"
    ]);
    rows.push(["ids matched", `${good}/${stimulusBus.marks.length}`]);
    if (calHomography) {
      rows.push(
        ["homography residual", `${calHomography.rmsResidual.toFixed(2)} px (${calHomography.pairs} pts)`],
        ["mirrored", String(calHomography.mirrored)],
        ["scale x/y", `${calHomography.H[0].toFixed(3)} / ${calHomography.H[4].toFixed(3)}`]
      );
    } else rows.push(["homography", "needs ≥4 id-matched marks"]);
  }
  if (calRun.mode === "orbit") {
    rows.push([
      "latency",
      calRun.latency
        ? `${calRun.latency.lagMs} ms (|r|=${Math.abs(calRun.latency.r).toFixed(3)}, ${calRun.latency.samples} samples${calRun.latency.r < 0 ? ", mirrored" : ""})`
        : `collecting trace… ${calRun.traceLen}/60`
    ]);
  }
  return htl.html`<table style="font:13px monospace">${rows.map(
    ([k, v]) => htl.html`<tr><td style="padding:1px 12px 1px 0;opacity:.7">${k}</td><td>${v}</td></tr>`
  )}</table>`;
};
const _1gmmbqf = function _edges1Dsub() {return (function edges1Dsub(sig, thr = 6) {
  // Part II's edges1D with parabolic sub-pixel refinement of each gradient peak.
  // Integer edge positions cost ~0.03 of cross ratio at 2px-per-template-unit
  // mark scales — past the CR gate's tolerance — so the quarter-pixel accuracy
  // here is what lets small on-screen marks through detection at all.
  const n = sig.length;
  const d = new Float32Array(n);
  for (let i = 1; i < n; i++) d[i] = sig[i] - sig[i - 1];
  const idx = [];
  for (let i = 2; i < n - 2; i++) {
    const v = d[i];
    if (Math.abs(v) < thr) continue;
    if (
      (v > 0 && d[i] >= d[i - 1] && d[i] >= d[i + 1]) ||
      (v < 0 && d[i] <= d[i - 1] && d[i] <= d[i + 1])
    ) {
      const y1 = Math.abs(d[i - 1]), y2 = Math.abs(d[i]), y3 = Math.abs(d[i + 1]);
      const den = y1 - 2 * y2 + y3;
      const off = Math.abs(den) > 1e-6 ? (0.5 * (y1 - y3)) / den : 0;
      idx.push({ x: i + Math.max(-0.5, Math.min(0.5, off)), s: Math.sign(v) });
    }
  }
  return idx;
});};
const _vui5kg = function _CAL_FRAME(FRAME) {
  // Measured through the mirror: a screen mark lands ~70px wide in a 640x480
  // capture, i.e. 1.25 pixels per template unit — under the ~2 the cross ratio
  // needs, so only the odd lucky row decoded. The camera reports a 1920 max, so
  // the resolution was ours to ask for. The sim rig keeps FRAME; oversampling
  // is confined to the calibration capture path.
  return { w: FRAME.w * 2, h: FRAME.h * 2 };
};
const _4iv3z6 = function _calRows(rowStride,CAL_FRAME,FRAME) {
  // scanRows at CAL_FRAME scale: the stride grows with the frame so a mark is
  // crossed by the same number of rows as before, and the sweep costs the same
  // number of rows rather than four times as many
  const stride = rowStride * (CAL_FRAME.h / FRAME.h);
  const rows = [];
  for (let y = Math.floor(stride / 2); y < CAL_FRAME.h; y += stride) rows.push(y);
  return rows;
};
const _ocjkzi = async function _cameraSample(FileAttachment,htl) {
  // A real 1280x960 frame off the machine camera, kept as a file attachment so
  // the mirror rig has a fixed reference image that needs no camera, no mirror
  // and no permission prompt to look at.
  const img = await FileAttachment("frame-mirror-angled.png").image({ width: 640 });
  img.style.border = "1px solid var(--theme-foreground-faintest, #888)";
  return htl.html`<figure style="margin:0">
    ${img}
    <figcaption style="font:12px/1.5 var(--sans-serif, system-ui); opacity:0.7">
      Sample capture from the calibration camera at CAL_FRAME resolution
      (1280&times;960), shown at half size.
    </figcaption>
  </figure>`;
};
const _uio2e6 = function _analyzeFrame(runPipeline,scanLattice,clusterWindows,fuseLandmarks) {return (async function analyzeFrame(frame, opts = {}) {
  // One frame, coarse-to-fine.
  //
  // The old shape was a single uniform lattice, and it topped out at 3-4 of 6
  // marks. The reason was not detection and not the candidate budget (raising
  // maxCands changes nothing): it is that fusion demands two rows of the WINNING
  // id before it will emit a landmark, and a uniform lattice sparse enough to be
  // affordable puts only one decodable row through a mark. Rows through a mark
  // decode erratically -- one row can read the full margin 8 while its immediate
  // neighbours read nothing -- so "enough rows" has to mean many, and paying for
  // many everywhere is what we cannot afford.
  //
  // So: locate geometrically, then decode densely only where a mark actually is.
  // Windows are found on rows that will never decode, which makes them a much
  // better locator than decodes are.
  const coarseStride = opts.coarseStride ?? 16;
  const fineStride = opts.fineStride ?? 6;
  const maxFineRows = opts.maxFineRows ?? 260;
  const chunk = opts.chunk ?? Infinity;
  const breathe = opts.breathe ?? null;
  // Where rows actually get processed. The default runs them here; a worker pool
  // supplies its own and returns the same run records from another thread. This
  // is an injection point rather than a second copy of the routine on purpose --
  // a parallel analyzeFrame would be a fork of the passage below, and the two
  // would drift.
  const runRows =
    opts.runRows ??
    ((f, rows, o) => [runPipeline(f, { ...o, scanRows: rows })]);
  // everything not consumed here is forwarded to the pipeline, so detector
  // options (generator, minMargin, ...) reach it without this cell having to
  // know about each one. runRows and breathe are functions and must NOT be
  // forwarded -- they would be posted to a worker and fail to clone.
  const {
    coarseStride: _a, fineStride: _b, maxFineRows: _c, chunk: _d, breathe: _e,
    maxBands: _f, scanRows: _g, runRows: _h, ...forward
  } = opts;
  const pipeOpts = { minMargin: 4, minReadable: 4, ...forward };
  const merge = (a, b) =>
    !a ? b : {
      ...b,
      hits: a.hits.concat(b.hits),
      windowList: (a.windowList ?? []).concat(b.windowList ?? []),
      rawHits: a.rawHits + b.rawHits,
      rejectedByDecode: a.rejectedByDecode + b.rejectedByDecode,
      windows: a.windows + b.windows,
      survived: a.survived + b.survived,
      scanEdges: a.scanEdges + b.scanEdges,
      rowsTouched: a.rowsTouched + b.rowsTouched,
      msDetect: a.msDetect + b.msDetect,
      msDecode: a.msDecode + b.msDecode,
      ms: a.ms + b.ms
    };
  const sweep = async (list, acc, extra = {}) => {
    let run = acc;
    for (let i = 0; i < list.length; i += chunk) {
      const parts = await runRows(frame, list.slice(i, i + chunk), {
        ...pipeOpts,
        ...extra
      });
      for (const part of parts) run = merge(run, part);
      if (breathe && i + chunk < list.length) await breathe();
    }
    return run;
  };
  const lattice = (from, to, step) => {
    const out = [];
    for (let y = Math.max(0, Math.round(from)); y <= Math.min(frame.h - 1, to); y += step)
      out.push(y);
    return out;
  };

  // pass 1 -- coarse, and harvest the geometry. Only this pass collects windows:
  // harvesting them on the fine pass too was tried, to give the pose fit a taller
  // sample of the mark, and it does not help. Windows stop being found well before
  // the poles -- a chord up there crosses too few rings to anchor on -- so even the
  // geometric evidence spans only the middle ~40% of a mark's height, and the
  // allocation is then paid for nothing. See markEllipse.
  const coarseRows = opts.scanRows ?? scanLattice(frame.h, coarseStride);
  let run = await sweep(coarseRows, null, { collectWindows: true });
  const bands = clusterWindows(run.windowList ?? [], {
    stride: coarseStride,
    maxBands: opts.maxBands ?? 12
  });

  // pass 2 -- dense, but only inside a band. Cost tracks the number of marks in
  // view, not the frame area, so an empty scene costs the coarse pass alone.
  const seen = new Set(coarseRows);
  const fine = [];
  for (const b of bands)
    for (const y of lattice(b.y0 - b.w * 0.55, b.y1 + b.w * 0.55, fineStride))
      if (!seen.has(y)) { seen.add(y); fine.push(y); }
  fine.sort((a, b) => a - b);
  const fineRows = fine.slice(0, maxFineRows);
  if (fineRows.length) run = await sweep(fineRows, run);
  let fused = fuseLandmarks(run.hits);

  // pass 3 -- a mark still short of the V-fit's three rows gets its own rescan.
  // Sub-row-stride yc needs the V-fit; without it yc degrades to the centroid of
  // whichever rows fired, measured at 29px rms and a -15px BIAS against loopback
  // truth, versus 1.9px and no bias once the fit engages.
  const weak = fused.filter((f) => f.geoRows < 3);
  let refinedRows = 0;
  if (weak.length) {
    const extra = [];
    for (const f of weak)
      for (const y of lattice(f.yc - fineStride * 3, f.yc + fineStride * 3, 2))
        if (!seen.has(y)) { seen.add(y); extra.push(y); }
    extra.sort((a, b) => a - b);
    refinedRows = extra.length;
    if (extra.length) {
      run = await sweep(extra, run);
      fused = fuseLandmarks(run.hits);
    }
  }
  return { run, fused, bands: bands.length, refinedRows };
});};
const _k6d86f = function _testFrames() {return ([
  // Real captures through the mirror, kept so the detector can be regression
  // tested with no camera, no mirror and no permission prompt. Thresholds are
  // set at or just under what the current pipeline achieves: they are a floor to
  // notice regressions against, not a target. Raise them when the detector
  // genuinely improves -- as happened when coarse-to-fine scanning took the
  // upright yield from 3-4 of 6 marks to 6 of 6 (minIds 3/4 -> 6/6), and again
  // when the reflection sweep replaced the histogram gate (maxRotDisagreePx
  // 12 -> 3: the quarter turns went from one ~8.5px sighting to several
  // V-fit-accurate ones).
  //
  // Each frame is also replayed at all four quarter turns. That costs nothing to
  // store -- a rotation is an exact index permutation of the pixels already
  // here, no resampling, no second image -- and it buys a geometric self-check
  // that needs no hand-set number, plus the knowledge that a turn cannot
  // manufacture a detection on a blank screen.
  //
  // TWO agreement bounds, because they measure different things.
  // maxPrimaryDisagreePx is upright vs 180 only. Both are full-quality views of
  // the same marks, they agree to ~1.05px, and roughly 1px of that is the
  // pixel-boundary convention under a flip rather than estimator error. This is
  // the tight one, and it is the only threshold here that needs no reference
  // data and no number carried over from a previous run, so it cannot rot.
  // maxRotDisagreePx spans all four turns and is looser. A 90 degree scan
  // crosses three times the edges; those turns used to find nothing at all and
  // now recover several marks, currently agreeing to ~2.1px once unrotated.
  //
  // STORED AS 8-BIT GREYSCALE PNG, and it has to stay that way.
  // Greyscale is free: the pipeline only ever reads luma, so collapsing colour
  // with the weights it already uses (77/150/29 >> 8) is lossless by
  // construction -- checked as zero differing bytes over all 1.23M pixels. Note
  // canvas.toBlob cannot write this; it always emits RGBA, which is twice the
  // size for the same pixels.
  // JPEG cannot be used at any quality. It costs decoded rows, which drops marks
  // below the V-fit's three-row minimum onto the fallback and its -15px bias:
  // measured centres moved up to 10px, against an estimator whose own error is
  // 1.7px. It is not even monotonic in quality (q85 clean, q92 at 33% V-fit),
  // because the damage depends on where a mark lands against the 8x8 block grid.
  // Downscaling is worse still: half resolution takes 6 ids to 0-3, which is the
  // whole point of the "flat and far" frame below.
  {
    file: "frame-mirror-angled.png",
    name: "mirror / angled",
    note: "Screen fills the frame at a slant, so the fitted homography carries real projective content rather than near-pure scale. Marks 110-170px wide. The two most foreshortened marks are the ones the old uniform lattice missed.",
    expect: {
      minIds: 6,
      minUprightVFitShare: 0.9,
      minUnionIds: 6,
      maxIds: 6,
      maxPrimaryDisagreePx: 1.3,
      maxRotDisagreePx: 3
    }
  },
  {
    file: "frame-mirror-flat.png",
    name: "mirror / flat and far",
    note: "Mirror further back and nearly fronto-parallel, marks around 2.1 pixels per template unit. This is the scale floor: below roughly 2px per template unit the cross ratio stops separating true windows from chance ones.",
    expect: {
      minIds: 6,
      minUprightVFitShare: 0.9,
      minUnionIds: 6,
      maxIds: 6,
      maxPrimaryDisagreePx: 1.3,
      maxRotDisagreePx: 3
    }
  },
  {
    file: "frame-blank.png",
    name: "negative control / blank screen",
    note: "Same rig and mirror, stimulus not running, so the screen is uniform white. Every raw candidate must be rejected; any id reported is a false positive. This is the frame that vetoes loosening the decode margin -- at minMargin 2 the mirror frames start reporting a DUPLICATE id, two clusters claiming one landmark, which for navigation is a wrong fix rather than a missing one.",
    expect: { minIds: 0, maxIds: 0 }
  }
]);};
const _1c1rmua = async function _testFrameBank(testFrames,testFrameFiles) {
  // Decode each attachment to the same {gray, w, h} the live capture path
  // builds, using the identical luma weights, so a bank frame is byte-for-byte
  // the input calRun would have handed the detector.
  const bank = [];
  for (const spec of testFrames) {
    const fa = testFrameFiles.get(spec.file);
    if (!fa) throw new Error(`testFrames names ${spec.file}, which testFrameFiles does not map`);
    const img = await fa.image();
    const c = window.document.createElement("canvas");
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);
    const px = ctx.getImageData(0, 0, c.width, c.height).data;
    const gray = new Uint8Array(c.width * c.height);
    for (let i = 0, p = 0; i < gray.length; i++, p += 4) {
      gray[i] = (px[p] * 77 + px[p + 1] * 150 + px[p + 2] * 29) >> 8;
    }
    bank.push({ ...spec, frame: { gray, w: c.width, h: c.height } });
  }
  return bank;
};
const _1r6cx83 = function _testFrameFiles(FileAttachment) {return (new Map([
  // FileAttachment only accepts a literal string, so the bank cannot look one up
  // by name at runtime; this map is the indirection. Adding a frame means adding
  // a line here and an entry in testFrames (classic) or manFrames (§11).
  ["frame-mirror-angled.png", FileAttachment("frame-mirror-angled.png")],
  ["frame-mirror-flat.png", FileAttachment("frame-mirror-flat.png")],
  ["frame-blank.png", FileAttachment("frame-blank.png")],
  ["frame-man-phone.png", FileAttachment("frame-man-phone.png")]
]));};
const _s8m851 = async function _testFrameResults(testFrameBank,rotateFrame,analyzeFrame) {
  // Replay the bank through the same analyzeFrame the live rig uses. Nothing
  // here touches a camera, a mirror or a permission prompt, so it reruns on any
  // machine and gives the same answer -- which is the point of a frame bank.
  //
  // One call per quarter turn. The lattice-phase sweep this used to do is gone:
  // analyzeFrame now picks its own rows, densely and only where the geometry
  // says a mark is, which is both cheaper and strictly better than replaying
  // four fixed phases.
  const TURNS = [0, 1, 2, 3];
  // inverse of rotateFrame's index permutation, taking a point measured in the
  // rotated frame back into original-frame coordinates. w,h are the ORIGINAL
  // dimensions. Exact up to the pixel-boundary convention: subpixel edge
  // positions come back with a constant ~1px offset under a flip, because an
  // edge lying between pixels i and i+1 is not the same continuous coordinate
  // as the flipped index of pixel i.
  const unrotate = (x, y, t, w, h) =>
    t === 1 ? { x: y, y: h - 1 - x }
    : t === 2 ? { x: w - 1 - x, y: h - 1 - y }
    : t === 3 ? { x: w - 1 - y, y: x }
    : { x, y };

  const out = [];
  for (const spec of testFrameBank) {
    const t0 = window.performance.now();
    const { w, h } = spec.frame;
    const turns = [];
    for (const t of TURNS) {
      const fr = rotateFrame(spec.frame, t);
      const tt = window.performance.now();
      const r = await analyzeFrame(fr);
      const seen = r.fused;
      turns.push({
        turn: t,
        deg: t * 90,
        ids: seen.map((f) => f.id).sort((a, b) => a - b),
        landmarks: seen.length,
        vFitShare: seen.length ? seen.filter((f) => f.vFit).length / seen.length : 0,
        medRows: seen.length
          ? seen.map((f) => f.geoRows).sort((a, b) => a - b)[seen.length >> 1]
          : 0,
        bands: r.bands,
        rowsTouched: r.run.rowsTouched,
        rawHits: r.run.rawHits,
        windows: r.run.windows,
        refinedRows: r.refinedRows,
        ms: window.performance.now() - tt,
        at: new Map(seen.map((f) => [f.id, unrotate(f.xc, f.yc, t, w, h)]))
      });
    }

    // A mark's position must not depend on which way up the frame was, so the
    // turns cross-check each other with no reference data and no threshold
    // pulled from a previous run.
    //
    // Two bounds, because the turns are not equivalent. 0 and 180 scan along the
    // same image axis and are the regime the rig actually runs in; they agree to
    // about a pixel, and that is the bound worth defending. A quarter turn scans
    // ACROSS the display's texture instead of along it, raises three times the
    // edges, and the sightings it does manage are correspondingly loose -- 7px
    // on this bank. Folding that into one number would only mean carrying a
    // tolerance too slack to catch a real regression in the case we care about.
    const pairDist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
    const ids = new Set(turns.flatMap((r) => r.ids));
    let worstDisagreePx = 0, agreedIds = 0;
    let primaryDisagreePx = 0, primaryIds = 0;
    for (const id of ids) {
      const pts = turns.filter((r) => r.at.has(id)).map((r) => r.at.get(id));
      if (pts.length >= 2) {
        agreedIds++;
        for (let i = 0; i < pts.length; i++)
          for (let j = i + 1; j < pts.length; j++)
            worstDisagreePx = Math.max(worstDisagreePx, pairDist(pts[i], pts[j]));
      }
      const a = turns[0].at.get(id), b = turns[2].at.get(id);
      if (a && b) {
        primaryIds++;
        primaryDisagreePx = Math.max(primaryDisagreePx, pairDist(a, b));
      }
    }

    const up = turns[0];
    const unionIds = [...ids].sort((a, b) => a - b);
    const e = spec.expect ?? {};
    const failures = [];
    if (e.minIds != null && up.ids.length < e.minIds)
      failures.push(`upright wanted >=${e.minIds} ids, got ${up.ids.length} (${up.ids.join(",")})`);
    if (e.minUnionIds != null && unionIds.length < e.minUnionIds)
      failures.push(`wanted >=${e.minUnionIds} ids over all turns, got ${unionIds.length}`);
    if (e.minUprightVFitShare != null && up.landmarks && up.vFitShare < e.minUprightVFitShare)
      failures.push(`upright wanted >=${Math.round(e.minUprightVFitShare * 100)}% V-fit, got ${Math.round(up.vFitShare * 100)}%`);
    // a duplicated id means two clusters claim one landmark -- for navigation
    // that is a wrong fix, not a missing one, so it fails at every turn
    for (const r of turns) {
      if (new Set(r.ids).size !== r.ids.length)
        failures.push(`${r.deg}deg reported a duplicate id (${r.ids.join(",")})`);
      if (e.maxIds != null && r.ids.length > e.maxIds)
        failures.push(`${r.deg}deg wanted <=${e.maxIds} ids, got ${r.ids.length} (${r.ids.join(",")})`);
    }
    if (e.maxPrimaryDisagreePx != null && primaryIds && primaryDisagreePx > e.maxPrimaryDisagreePx)
      failures.push(`0/180 disagree by ${primaryDisagreePx.toFixed(2)}px, allowed ${e.maxPrimaryDisagreePx}`);
    if (e.maxRotDisagreePx != null && agreedIds && worstDisagreePx > e.maxRotDisagreePx)
      failures.push(`turns disagree by ${worstDisagreePx.toFixed(2)}px, allowed ${e.maxRotDisagreePx}`);

    out.push({
      name: spec.name,
      file: spec.file,
      note: spec.note,
      ids: up.ids,
      unionIds,
      landmarks: up.landmarks,
      vFitShare: up.vFitShare,
      medRows: up.medRows,
      rawHits: up.rawHits,
      turns,
      agreedIds,
      worstDisagreePx,
      primaryIds,
      primaryDisagreePx,
      ms: window.performance.now() - t0,
      failures,
      pass: failures.length === 0
    });
  }
  return out;
};
const _zghole = function _rotateFrame() {return (function rotateFrame(frame, turns) {
  // Quarter turns only, done as an index permutation rather than through a
  // canvas: no resampling, so a rotated frame carries exactly the original
  // pixels and any change in the result is the detector's doing, not a
  // filter's. Rotation is free storage-wise -- the bank keeps one image and
  // derives the rest.
  const t = ((turns % 4) + 4) % 4;
  if (t === 0) return frame;
  const { gray, w, h } = frame;
  const nw = t === 2 ? w : h;
  const nh = t === 2 ? h : w;
  const out = new Uint8Array(gray.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let nx, ny;
      if (t === 1) { nx = h - 1 - y; ny = x; }
      else if (t === 2) { nx = w - 1 - x; ny = h - 1 - y; }
      else { nx = y; ny = w - 1 - x; }
      out[ny * nw + nx] = gray[y * w + x];
    }
  }
  return { gray: out, w: nw, h: nh };
});};
const _tavtr3 = function _scanLattice() {return (function scanLattice(height, stride) {
  // calRows fixed to CAL_FRAME; this is the same construction for any height,
  // which a rotated frame needs since a quarter turn swaps the dimensions
  const rows = [];
  for (let y = Math.floor(stride / 2); y < height; y += stride) rows.push(y);
  return rows;
});};
const _7u6ljb = function _testFrameReport(htl,testFrameResults) {return (htl.html`<div style="font:13px/1.5 system-ui,sans-serif">
  <div style="margin:0 0 8px 0;opacity:.7">Frame bank for the <b>classic</b> (§1) mark, run through <code>analyzeFrame</code>.
    The man family has its own bank in §11.3 — a different mark needs a different detector and different frames.</div>
  ${testFrameResults.map((r) => htl.html`<div style="margin:0 0 14px 0;padding:8px 10px;border-left:3px solid ${r.pass ? "#2a7" : "#c33"};background:#0001">
    <div><b>${r.pass ? "PASS" : "FAIL"}</b> &nbsp;${r.name}
      <span style="opacity:.6">&nbsp;upright [${r.ids.join(", ")}] &middot; all turns [${r.unionIds.join(", ")}] &middot; ${Math.round(r.ms)}ms</span></div>
    <table style="border-collapse:collapse;margin:6px 0 0 0;font-variant-numeric:tabular-nums">
      <tr style="opacity:.6;text-align:left"><th style="padding-right:14px">turn</th><th style="padding-right:14px">ids</th><th style="padding-right:14px">V-fit</th><th style="padding-right:14px">med rows</th><th style="padding-right:14px">bands</th><th style="padding-right:14px">rows scanned</th><th>ms</th></tr>
      ${r.turns.map((t) => htl.html`<tr>
        <td style="padding-right:14px">${t.deg}&deg;</td>
        <td style="padding-right:14px">${t.ids.length ? t.ids.join(", ") : "—"}</td>
        <td style="padding-right:14px">${t.landmarks ? Math.round(t.vFitShare * 100) + "%" : "—"}</td>
        <td style="padding-right:14px">${t.medRows || "—"}</td>
        <td style="padding-right:14px">${t.bands}</td>
        <td style="padding-right:14px">${t.rowsTouched}</td>
        <td>${Math.round(t.ms)}</td></tr>`)}
    </table>
    <div style="opacity:.6;margin-top:4px">${r.agreedIds
      ? `${r.agreedIds} id${r.agreedIds > 1 ? "s" : ""} seen at more than one turn, worst cross-turn disagreement ${r.worstDisagreePx.toFixed(2)}px`
      : "no id seen at more than one turn, so no cross-turn geometry check"}</div>
    ${r.failures.map((f) => htl.html`<div style="color:#c33">${f}</div>`)}
  </div>`)}
</div>`);};
const _1dpzurc = function _clusterWindows() {return (function clusterWindows(windows, opts = {}) {
  // Where does the row detector keep finding a compact window at a consistent x?
  // That question is pure geometry, so it is still answerable on rows whose
  // payload will not decode -- which is the situation every mark near the scale
  // floor is in. Locating marks this way and only then spending photometry on
  // them is what lets the fine pass be dense without being global.
  const maxHole = opts.maxHole ?? 0.2; // a chimera spans two marks, so it contains background
  const rowGap = opts.rowGap ?? 4;
  const minRows = opts.minRows ?? 2;
  const maxBands = opts.maxBands ?? 12;
  const stride = opts.stride ?? 12;
  const cl = [];
  for (const p of windows) {
    if (!(p.holeFrac <= maxHole)) continue;
    let best = null, bd = Infinity;
    for (const c of cl) {
      const dx = Math.abs(c.cx - p.cx);
      if (dx > 0.5 * p.w) continue;
      if (Math.abs(c.yLast - p.y) > rowGap * stride) continue;
      if (dx < bd) { bd = dx; best = c; }
    }
    if (best) {
      best.n++;
      best.cx = (best.cx * (best.n - 1) + p.cx) / best.n;
      best.yLast = p.y;
      best.y0 = Math.min(best.y0, p.y);
      best.y1 = Math.max(best.y1, p.y);
      best.w = Math.max(best.w, p.w);
    } else cl.push({ cx: p.cx, w: p.w, n: 1, y0: p.y, y1: p.y, yLast: p.y });
  }
  // Ranked and capped, not just filtered. A cluttered scene (or a frame scanned
  // across its texture rather than along it) throws up many weakly supported
  // bands, and an uncapped fine pass would then cost seconds. Bounded worst-case
  // work matters more than the last band.
  return cl
    .filter((c) => c.n >= minRows)
    .sort((a, b) => b.n - a.n || b.w - a.w)
    .slice(0, maxBands);
});};
const _a2pm83 = function _windowCandidates(crossRatio,crCurve,crDistance) {return (function windowCandidates(sx, opts = {}) {
  // Candidate generation, split out of detectLandmarkRow so strategies can be
  // swapped (opts.generator) against identical downstream code. Returns one
  // candidate per accepted window: the mirror-symmetric mid pair whose cross
  // ratio sits closest to the CR(d) curve.
  //
  //   "scan"    exhaustive over every (i,j). The reference.
  //   "vote"    sweep centres expanded directly into rim pairs. Fastest, but it
  //             finds fewer decodable rows per mark, and marks that then sit on
  //             the V-fit's 3-row minimum carry 2-7px of position error.
  //   "gated"   DEFAULT. The reflection sweep decides WHERE to enumerate; near a
  //             surviving centre the enumeration is exactly "scan", so the
  //             candidate set around a real mark -- and hence the accuracy -- is
  //             unchanged. A false centre costs a few wasted windows, never a
  //             wrong landmark; the cross-ratio and decode gates downstream
  //             still judge every window on its own merits.
  const n = sx.length;
  const minWidth = opts.minWidth ?? 24;
  const maxWidth = opts.maxWidth ?? 400;
  // 48 not 32: a large crisp mark crosses ~34 physical rings near its equator and
  // anti-aliasing can double-peak several of them; at 32 the enumeration break
  // fired before j reached the far rim, silently discarding the full-rim window
  // of exactly the biggest, easiest marks
  const maxEdges = opts.maxEdges ?? 48;
  const crTol = opts.crTol ?? 0.012;
  const generator = opts.generator ?? "gated";
  const cands = [];
  let windows = 0;

  // largest edge-free run inside a window, as a width fraction: a true mark is
  // edge-dense throughout (rings everywhere), while a window stitched across two
  // neighbouring marks contains the blank background between them
  const holeFracOf = (i, j, width) => {
    let mg = 0;
    for (let e = i; e < j; e++) {
      const gp = sx[e + 1] - sx[e];
      if (gp > mg) mg = gp;
    }
    return mg / width;
  };
  // given a rim pair (i,j), the best mid pair on the CR(d) curve
  const midPair = (i, j) => {
    const width = sx[j] - sx[i];
    const aLo = sx[i] + 0.26 * width, aHi = sx[i] + 0.48 * width;
    const bLo = sx[i] + 0.52 * width, bHi = sx[i] + 0.74 * width;
    let bestC = null;
    for (let a = i + 1; a < j; a++) {
      if (sx[a] < aLo) continue;
      if (sx[a] > aHi) break;
      const fa = (sx[a] - sx[i]) / width;
      for (let b = a + 1; b < j; b++) {
        if (sx[b] < bLo) continue;
        if (sx[b] > bHi) break;
        const fb = (sx[b] - sx[i]) / width;
        if (Math.abs(fa - (1 - fb)) > 0.06) continue; // not mirror-symmetric
        const cr = crossRatio(sx[i], sx[a], sx[b], sx[j]);
        let bestT = null, bestDist = Infinity;
        for (const t of crCurve) {
          const dist = crDistance(cr, t.cr);
          if (dist < bestDist) { bestDist = dist; bestT = t; }
        }
        if (bestDist > crTol) continue;
        if (!bestC || bestDist < bestC.crDist)
          bestC = { i, a, b, j, width, cr, crDist: bestDist, dSeed: bestT.d };
      }
    }
    return bestC;
  };
  const take = (i, j) => {
    windows++;
    const bestC = midPair(i, j);
    if (bestC) {
      bestC.holeFrac = holeFracOf(i, j, sx[j] - sx[i]);
      cands.push(bestC);
    }
  };

  if (generator === "scan") {
    for (let i = 0; i < n; i++) {
      for (let j = i + 7; j < n; j++) {
        const width = sx[j] - sx[i];
        if (width > maxWidth) break;
        if (j - i + 1 > maxEdges) break;
        if (width < minWidth) continue;
        take(i, j);
      }
    }
    return { cands, windows };
  }

  // Reflection sweep. A mark is concentric, so it is mirror-symmetric about its
  // centre and EVERY ring pair it contributes shares one midpoint. The key fact
  // (which took two broken histogram designs to see): the centre of a symmetric
  // edge set always lies BETWEEN its innermost mirror pair, so the only centre
  // hypotheses worth testing are the midpoints of near-adjacent edge pairs --
  // a linear sweep, not an O(n^2) vote. Each hypothesis is verified by walking
  // two pointers outward and counting mirrored offsets that agree within
  // mirrorTol; the count is a direct "how many ring pairs corroborate this
  // centre" statistic, where the histogram's raw pair-vote mostly measured
  // local edge density and let one busy stretch of the row starve real marks
  // out of a rank cap.
  //
  // mirrorTol is loose on purpose: a perspective image of a circle is NOT
  // exactly mirror-symmetric (that is why the decoder fits a Mobius map rather
  // than assuming symmetry), and matching mirrored edges to 2px lost the
  // foreshortened marks entirely.
  //
  // maxInnerGap kills most chimera centres for free: the midpoint between two
  // NEIGHBOURING marks is also a symmetry centre, but it sits in the blank
  // between them, so its nearest edges are far away -- whereas a real mark has
  // mid-sync edges close to its centre.
  //
  // No rank cap. Dense periodic texture (a 90-degree row through the screen
  // grid) is mirror-symmetric about every half-period point and produces fake
  // centres with pair counts far above any real mark's, so keeping the "best" N
  // centres is exactly backwards there. Fake centres are harmless to accuracy
  // -- they only admit windows the cross-ratio gate then rejects -- and after
  // suppression a typical row carries ~7 centres, so admitting all of them
  // still cuts enumeration hard.
  const mirrorTol = opts.mirrorTol ?? 5;
  const maxInnerGap = opts.maxInnerGap ?? 60;
  const minPairs = opts.minPairs ?? 5;
  const nmsPx = opts.centreSuppress ?? 20;
  const centreTol = opts.centreTol ?? 6;
  const raw = [];
  for (let i = 0; i < n - 1; i++) {
    for (let j = i + 1; j <= Math.min(i + 2, n - 1); j++) {
      if (sx[j] - sx[i] > maxInnerGap) continue;
      const c = (sx[i] + sx[j]) / 2;
      let l = i, r = j, pairs = 0;
      while (l >= 0 && r < n) {
        const dl = c - sx[l], dr = sx[r] - c;
        if (dl > maxWidth / 2 || dr > maxWidth / 2) break;
        if (Math.abs(dl - dr) <= mirrorTol) { pairs++; l--; r++; }
        else if (dl < dr) l--;
        else r++;
      }
      if (pairs >= minPairs) raw.push({ c, pairs });
    }
  }
  // suppression: the strongest corroboration wins its neighbourhood. 20px is
  // well under any plausible same-row mark spacing (marks are >=110px wide), so
  // it collapses one mark's cluster of near-identical hypotheses without ever
  // merging two real marks.
  raw.sort((a, b) => b.pairs - a.pairs);
  const centres = [];
  for (const cd of raw) {
    let near = false;
    for (const k of centres) if (Math.abs(k.c - cd.c) < nmsPx) { near = true; break; }
    if (!near) centres.push(cd);
  }

  if (generator === "gated") {
    // accept windows whose midpoint lands within centreTol of a sweep centre.
    // centreTol covers the perspective skew between a rim pair's midpoint and
    // the true centre (measured up to ~5px on the foreshortened marks).
    const accept = new Set();
    for (const k of centres) {
      const kc = Math.round(k.c);
      for (let o = -centreTol; o <= centreTol; o++) accept.add(kc + o);
    }
    for (let i = 0; i < n; i++) {
      for (let j = i + 7; j < n; j++) {
        const width = sx[j] - sx[i];
        if (width > maxWidth) break;
        if (j - i + 1 > maxEdges) break;
        if (width < minWidth) continue;
        if (!accept.has(Math.round((sx[i] + sx[j]) / 2))) continue;
        take(i, j);
      }
    }
    return { cands, windows };
  }

  // "vote": sweep centres expanded directly into the rim pairs centred there.
  // Everything downstream still has its say -- but see the header: fewer
  // decodable rows survive per mark, so this trades position accuracy for
  // speed and is not the default.
  const taken = new Set();
  for (const { c } of centres) {
    const pairs = [];
    for (let p = 0; p < n; p++) {
      const mirror = 2 * c - sx[p];
      if (mirror <= sx[p]) continue;
      let lo = p + 1, hi = n - 1, q = -1;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        if (Math.abs(sx[mid] - mirror) <= centreTol) { q = mid; break; }
        if (sx[mid] < mirror) lo = mid + 1; else hi = mid - 1;
      }
      if (q < 0) continue;
      const width = sx[q] - sx[p];
      if (width < minWidth || width > maxWidth) continue;
      if (q - p + 1 > maxEdges) continue;
      pairs.push({ p, q, width });
    }
    pairs.sort((a, b) => b.width - a.width);
    for (const { p, q } of pairs.slice(0, opts.pairsPerCentre ?? 6)) {
      const tag = p * 4096 + q;
      if (taken.has(tag)) continue;
      taken.add(tag);
      take(p, q);
    }
  }
  return { cands, windows };
});};
const _15g2ti2 = function _detectKernelSource(SVD,LAYOUT,crCurve,carrierTemplate,codebook,minMargin,edgeThreshold,dpScratch,crossRatio,crDistance,xFromK,templateAtOffset,fitMobiusLS,fitMobiusInto,dpAlignFast,carrierTable,crTable,sweepScratch,radiusLUT,nearestEdgeRadius,involutionScratch,windowCandidates,detectLandmarkRow,detectRowInvolution,detectRow,decodeLandmark,edges1Dsub,rowOf,runPipeline) {
  // The worker script, built from the LIVE cells rather than a hand-written copy
  // of them. Every function below is the same object this notebook calls on the
  // main thread, serialised with toString(); every constant is the same value,
  // serialised as a literal. So a worker cannot drift from the notebook: edit a
  // cell and the next pool build picks the edit up. This is the only honest way
  // to run notebook code off-thread — a transcribed kernel would be a second
  // implementation to keep in step, and it would be wrong within a week.
  //
  // What makes it possible at all is that the detector is per-row pure: a scan
  // row needs only its own pixels (decodeLandmark indexes hit.y * W and never
  // leaves that row), so a worker can be handed a set of rows and nothing else.
  //
  // The list below is the one thing here that IS hand-maintained, and it has
  // already bitten once: adding the sweep's precomputed tables broke every worker
  // with "Can't find variable: sweepScratch" while the main thread was fine. A
  // missing name fails loudly on the first job, which is the good case.
  //
  // The corollary is the reason `radiusLUT` is a data cell: toString() carries
  // the TEXT of a function, not its closure, so anything a detector function
  // reaches for must be reachable by NAME here. A lookup table hidden inside a
  // closure would serialise to an unbound identifier.
  const lit = (v) => {
    if (ArrayBuffer.isView(v))
      return `new ${v.constructor.name}([${Array.from(v).join(",")}])`;
    if (Array.isArray(v)) return `[${v.map(lit).join(",")}]`;
    if (typeof v === "number")
      return Number.isFinite(v) ? String(v) : Number.isNaN(v) ? "NaN" : v > 0 ? "Infinity" : "-Infinity";
    if (v && typeof v === "object")
      return `({${Object.entries(v).map(([k, x]) => JSON.stringify(k) + ":" + lit(x)).join(",")}})`;
    return JSON.stringify(v);
  };
  const emit = (name, value) =>
    typeof value === "function"
      ? `const ${name} = ${value.toString()};`
      : `const ${name} = ${lit(value)};`;

  const parts = [
    // runPipeline times itself with window.performance; a worker has no window
    "var window = self;",
    // runPipeline's fallback row list, always overridden by the job's rows
    "const scanRows = [];",
    // svd-js's export, checked to be self-contained under toString()
    emit("SVD", SVD),
    emit("LAYOUT", LAYOUT),
    emit("crCurve", crCurve),
    emit("carrierTemplate", carrierTemplate),
    emit("codebook", codebook),
    emit("minMargin", minMargin),
    emit("edgeThreshold", edgeThreshold),
    // dpScratch is a set of reused buffers; its own ensure() allocates every one
    // of them on first use, so the worker only needs the empty shell plus that
    // method -- no buffer list to copy and get out of date
    `const dpScratch = (function () { const s = { cells: 0, n: 0 }; s.ensure = ${dpScratch.ensure.toString()}; return s; })();`,
    emit("crossRatio", crossRatio),
    emit("crDistance", crDistance),
    emit("xFromK", xFromK),
    emit("templateAtOffset", templateAtOffset),
    emit("fitMobiusLS", fitMobiusLS),
    emit("fitMobiusInto", fitMobiusInto),
    emit("dpAlignFast", dpAlignFast),
    // the sweep's precomputed tables and its scratch. Each worker gets its own
    // copy of the buffers, which is what makes sharing them safe at all.
    emit("carrierTable", carrierTable),
    emit("crTable", crTable),
    emit("sweepScratch", sweepScratch),
    // the involution solver's table and scratch, same discipline
    emit("radiusLUT", radiusLUT),
    emit("nearestEdgeRadius", nearestEdgeRadius),
    emit("involutionScratch", involutionScratch),
    emit("windowCandidates", windowCandidates),
    emit("detectLandmarkRow", detectLandmarkRow),
    emit("detectRowInvolution", detectRowInvolution),
    emit("detectRow", detectRow),
    emit("decodeLandmark", decodeLandmark),
    emit("edges1Dsub", edges1Dsub),
    emit("rowOf", rowOf),
    emit("runPipeline", runPipeline),
    // The worker keeps a full-size frame buffer and writes only the rows of the
    // job into it, so rowOf and decodeLandmark address pixels by absolute y
    // exactly as they do on the main thread. Rows arrive packed and transferred,
    // which is ~1.3KB per row moved rather than the whole 1.2MB frame.
    `
let FRAME = null;
self.onmessage = (e) => {
  const d = e.data;
  if (d.type === "init") {
    FRAME = { gray: new Uint8Array(d.w * d.h), w: d.w, h: d.h };
    self.postMessage({ type: "ready" });
    return;
  }
  const w = FRAME.w, ys = d.ys, px = d.px;
  for (let i = 0; i < ys.length; i++)
    FRAME.gray.set(px.subarray(i * w, (i + 1) * w), ys[i] * w);
  let run = null, err = null;
  try {
    run = runPipeline(FRAME, Object.assign({}, d.opts, { scanRows: ys }));
  } catch (ex) {
    err = ex && ex.message ? ex.message : String(ex);
  }
  self.postMessage({ type: "done", id: d.id, run, err });
};`
  ];
  return parts.join("\n");
};
const _rqclgc = function _poolSize(Inputs) {return (Inputs.range([0, 12], {
  step: 1,
  value: Math.min(8, Math.max(1, (navigator.hardwareConcurrency || 4) - 2)),
  label: "detection workers (0 = main thread)"
}));};
const _1xat3lz = (G, _) => G.input(_);
const _91k4wy = function _detectPool(poolSize,detectKernelSource,invalidation) {
  // A fixed set of dedicated workers, handed row batches round robin. Nothing
  // reactive crosses the boundary: a job is (rows, options) in and one run
  // record out, which is why the same code can run on the main thread with the
  // pool switched off (poolSize 0) and give byte-identical results.
  if (!poolSize) return null;
  const url = URL.createObjectURL(
    new Blob([detectKernelSource], { type: "text/javascript" })
  );
  const ws = [];
  for (let i = 0; i < poolSize; i++) {
    const w = new Worker(url);
    w.pending = new Map();
    w.onmessage = (e) => {
      const d = e.data;
      // init acknowledgement carries no job id; every other reply does
      if (d.type === "ready") { if (w.onReady) w.onReady(); return; }
      const settle = w.pending.get(d.id);
      if (settle) { w.pending.delete(d.id); settle(d); }
    };
    ws.push(w);
  }
  // rebuilt whenever poolSize changes, so the old pool has to go with it --
  // otherwise the workers outlive their cell and leak a thread each
  invalidation.then(() => {
    for (const w of ws) w.terminate();
    URL.revokeObjectURL(url);
  });

  let seq = 0;
  let next = 0;
  let dims = null;
  const send = (w, msg, transfer) =>
    new Promise((res) => {
      const id = ++seq;
      w.pending.set(id, res);
      w.postMessage({ ...msg, id }, transfer || []);
    });
  // each worker keeps a full-size frame buffer so absolute y indexing works
  // unchanged inside it; only a size change forces a reallocation
  const ensure = async (frame) => {
    if (dims && dims.w === frame.w && dims.h === frame.h) return;
    dims = { w: frame.w, h: frame.h };
    await Promise.all(
      ws.map(
        (w) =>
          new Promise((res) => {
            w.onReady = res;
            w.postMessage({ type: "init", w: frame.w, h: frame.h });
          })
      )
    );
  };

  return {
    size: ws.length,
    // Deal rows round robin rather than in contiguous blocks. Cost per row is
    // wildly uneven -- a row crossing three marks is worth a hundred crossing
    // blank screen -- so contiguous blocks would hand one worker every mark and
    // leave the rest idle. Interleaving averages the marks out across the pool
    // for free, with no work-stealing machinery.
    runRows: async (frame, rows, opts) => {
      await ensure(frame);
      const buckets = ws.map(() => []);
      rows.forEach((y, i) => buckets[(next + i) % ws.length].push(y));
      next = (next + rows.length) % ws.length;
      const jobs = [];
      for (let i = 0; i < ws.length; i++) {
        const ys = buckets[i];
        if (!ys.length) continue;
        // pack just this worker's rows; ~1.3KB each, transferred not copied
        const px = new Uint8Array(ys.length * frame.w);
        ys.forEach((y, k) =>
          px.set(frame.gray.subarray(y * frame.w, (y + 1) * frame.w), k * frame.w)
        );
        jobs.push(send(ws[i], { type: "rows", ys, px, opts }, [px.buffer]));
      }
      const parts = await Promise.all(jobs);
      const failed = parts.find((p) => p.err);
      if (failed) throw new Error("detection worker: " + failed.err);
      return parts.map((p) => p.run);
    }
  };
};
const _1qdzl86 = function _anonymous(md) {return (md`---
## §8 Running it on more than one thread

§3 said the detector's cost is ~25 µs per window that clears the cross-ratio gate. That number is the case for workers: it is arithmetic on a few dozen floats, there are thousands of them per frame, and **no two rows interact**. A scan row needs its own pixels and nothing else — \`decodeLandmark\` indexes \`hit.y * W\` and never leaves the row — so rows can be dealt out to a pool and the results concatenated. Fusion, which *is* cross-row, stays on the main thread where it costs nothing.

The pool is deliberately dumb: a fixed set of dedicated workers, rows dealt **round robin**, one message per worker per pass. No work stealing, no queue, no shared memory. Round robin rather than contiguous blocks because per-row cost is wildly uneven — a row crossing three marks is worth a hundred crossing blank screen — and interleaving averages the marks across the pool for free. (Shared memory is not an option here anyway: \`SharedArrayBuffer\` needs cross-origin isolation, which a notebook opened from a file cannot have. Instead each job packs just its own rows, ~1.3 KB apiece, and *transfers* them.)

The part worth stealing for other notebooks is **how the worker gets its code**. It is not transcribed. \`detectKernelSource\` walks the live cells and serialises them — functions through \`toString()\`, constants through \`JSON.stringify\` — so the worker runs the same \`detectLandmarkRow\`, the same \`windowCandidates\`, the same \`crCurve\` this page is running. Edit a cell and the next pool build picks the edit up. A hand-written kernel would be a second implementation of the detector, and it would be wrong within a week; this one cannot disagree with the notebook because it *is* the notebook. The only piece that needed checking was \`SVD\`, which comes from a package rather than a cell — its \`toString()\` turns out to be self-contained, which is verified rather than assumed.

Two things make this safe to believe. \`analyzeFrame\` takes the row runner as an argument (\`opts.runRows\`) instead of having a parallel twin, so there is exactly one copy of the coarse-to-fine logic and the pool is just a different way of executing it. And the agreement check below re-runs the frame bank through both paths and compares fused landmark positions to four decimal places — a worker that drifts fails it.

**Agreement is checked on every load; throughput is not.** They need opposite conditions. Agreement is a property of the output and holds whatever else the machine is doing, so it can be asserted at boot. A stopwatch cannot: at boot this page is still computing, and the contention does not fall on both arms equally — the main-thread arm competes with that work while the pool arm does not, so a benchmark taken then reports a *larger* speedup than the truth. Measured during boot the angled frame read 36×; measured on an idle page it is 5.8×. Hence the button, five runs, an untimed warm-up, and a **spread** column: if the fastest and slowest of the five disagree by much, the machine was busy and the row should not be quoted.`);};
const _1gsq49k = async function _poolAgreement(testFrameBank,analyzeFrame,detectPool) {
  // CORRECTNESS ONLY -- deliberately no timings here. This runs at boot, when
  // the page is busy computing everything else, and a stopwatch read under that
  // contention measures the boot, not the detector. Worse, it does not measure
  // both arms equally: the serial arm competes with the boot work on this
  // thread while the pool arm does not, so the ratio moves with how loaded the
  // page happens to be. Throughput is measured on demand instead (poolBenchmark
  // below), when the page is idle and the number means something.
  //
  // What IS sound to check at any moment is agreement. Landmark centres must
  // match to 4dp -- not "close", identical: the workers execute the very same
  // serialised cells, so a disagreement is a real defect (a constant that failed
  // to serialise, a stale kernel, a lost row), never floating-point drift, and
  // it is true regardless of what else the machine is doing.
  const key = (f) => `${f.id}@${f.xc.toFixed(4)},${f.yc.toFixed(4)}`;
  const rows = [];
  for (const spec of testFrameBank) {
    const serial = await analyzeFrame(spec.frame, {});
    const parallel = detectPool
      ? await analyzeFrame(spec.frame, { runRows: detectPool.runRows })
      : null;
    rows.push({
      frame: spec.name,
      marks: serial.fused.length,
      poolMarks: parallel ? parallel.fused.length : null,
      identical: parallel
        ? serial.fused.map(key).sort().join("|") ===
          parallel.fused.map(key).sort().join("|")
        : null
    });
  }
  return rows;
};
const _rqwdsc = function _poolReport(poolBenchmark,htl,detectPool,poolAgreement) {
  const cell = "padding:2px 12px 2px 0";
  const timing = poolBenchmark
    ? new Map(poolBenchmark.map((b) => [b.frame, b]))
    : null;
  return htl.html`<table style="border-collapse:collapse;font:13px/1.5 system-ui,sans-serif">
  <thead><tr style="text-align:left;border-bottom:1px solid currentColor">
    <th style=${cell}>frame</th>
    <th style=${cell}>marks</th>
    <th style=${cell}>main thread</th>
    <th style=${cell}>${detectPool ? detectPool.size + " workers" : "pool off"}</th>
    <th style=${cell}>speedup</th>
    <th style=${cell}>fps</th>
    <th style=${cell}>spread</th>
    <th style=${cell}>agrees</th>
  </tr></thead>
  <tbody>${poolAgreement.map((r) => {
    const t = timing ? timing.get(r.frame) : null;
    return htl.html`<tr>
      <td style=${cell}>${r.frame}</td>
      <td style=${cell}>${r.marks}${
        r.poolMarks != null && r.poolMarks !== r.marks ? " / " + r.poolMarks : ""
      }</td>
      <td style=${cell}>${t ? Math.round(t.serial.med) + " ms" : "—"}</td>
      <td style=${cell}>${t && t.parallel ? Math.round(t.parallel.med) + " ms" : "—"}</td>
      <td style=${cell}>${t && t.speedup ? t.speedup + "×" : "—"}</td>
      <td style=${cell}>${t ? t.fps : "—"}</td>
      <td style=${cell};color:${t && t.spread > 25 ? "#d33" : "inherit"}>${
        t ? t.spread + "%" : "—"
      }</td>
      <td style="${cell};color:${
        r.identical == null ? "inherit" : r.identical ? "#28a745" : "#d33"
      }">${r.identical == null ? "—" : r.identical ? "identical" : "DIFFERS"}</td>
    </tr>`;
  })}</tbody>
  <caption style="caption-side:bottom;text-align:left;padding-top:6px;opacity:0.7">
    ${timing
      ? htl.html`Timings are the median of 5 runs after an untimed warm-up. <b>spread</b> is how much the five disagreed — above ~25% the machine was busy and the row is not worth quoting.`
      : htl.html`Agreement is checked on every load; it does not depend on timing. Press <b>measure detection throughput</b> for the speed columns — benchmarking at boot would measure the boot, and would penalise the main-thread arm more than the pool.`}
  </caption>
</table>`;
};
const _1pno4rs = function _benchGo2(Inputs) {return (Inputs.button("measure detection throughput", {
  description: "run when the page is idle — a benchmark taken during boot measures the boot"
}));};
const _1vdscoi = (G, _) => G.input(_);
const _1kj72ix = async function _poolBenchmark(benchGo2,testFrameBank,analyzeFrame,detectPool) {
  // On demand, not at boot. Inputs.button counts clicks and starts at 0, so
  // nothing is measured until asked.
  if (!benchGo2) return null;
  const reps = 5;
  // Median, and the spread is reported alongside it. Median rather than min
  // because min is the most flattering statistic available and this comparison
  // is not symmetric -- the main-thread arm loses time to anything else running
  // on this thread, the pool arm does not, so picking the statistic picks the
  // ratio. If min and median disagree much, the machine was busy and the run
  // should be repeated rather than quietly reported.
  const bench = async (fn) => {
    await fn(); // untimed: first pool job allocates each worker's frame buffer
    const ts = [];
    for (let i = 0; i < reps; i++) {
      const t0 = window.performance.now();
      await fn();
      ts.push(window.performance.now() - t0);
    }
    ts.sort((a, b) => a - b);
    return { med: ts[reps >> 1], min: ts[0], max: ts[reps - 1] };
  };
  const rows = [];
  for (const spec of testFrameBank) {
    const serial = await bench(() => analyzeFrame(spec.frame, {}));
    const parallel = detectPool
      ? await bench(() => analyzeFrame(spec.frame, { runRows: detectPool.runRows }))
      : null;
    rows.push({
      frame: spec.name,
      serial,
      parallel,
      speedup: parallel ? +(serial.med / parallel.med).toFixed(2) : null,
      fps: Math.round(1000 / (parallel ? parallel.med : serial.med)),
      // how much the five runs disagreed with each other, as a fraction of the
      // median: a noisy machine shows up here rather than in a wrong headline
      spread: +(
        Math.max(
          (serial.max - serial.min) / serial.med,
          parallel ? (parallel.max - parallel.min) / parallel.med : 0
        ) * 100
      ).toFixed(0)
    });
  }
  return rows;
};
const _rxnc36 = function _carrierTable(crCurve,templateAtOffset,carrierTemplate) {
  // The chord template at each swept offset. Offsets are quantised to 0.25, so
  // there are ~35 of them, and rebuilding one per hypothesis -- 33k times a
  // frame -- was pure waste.
  const out = [];
  for (let d = 0; d <= crCurve[crCurve.length - 1].d + 1e-9; d += 0.25)
    out.push(Float64Array.from(templateAtOffset(carrierTemplate, d)));
  return out;
};
const _1q031k7 = function _fitMobiusInto() {return (function fitMobiusInto(xs, ks, n, out) {
  // fitMobiusLS's arithmetic against caller-owned buffers, writing into a
  // caller-owned object, so the sweep allocates neither its inputs nor its
  // output. Same normalisation, same answer.
  let x0 = 0;
  for (let i = 0; i < n; i++) x0 += xs[i];
  x0 /= n;
  let sc = 0;
  for (let i = 0; i < n; i++) { const e = xs[i] - x0; sc += e * e; }
  sc = Math.sqrt(sc / n) || 1;
  let a00 = 0, a01 = 0, a02 = 0, a12 = 0, a22 = 0, b0 = 0, b1 = 0, b2 = 0;
  for (let i = 0; i < n; i++) {
    const u = (xs[i] - x0) / sc, k = ks[i], c = -k * u;
    a00 += u * u; a01 += u; a02 += u * c;
    a12 += c; a22 += c * c;
    b0 += u * k; b1 += k; b2 += c * k;
  }
  const a11 = n;
  const c00 = a11 * a22 - a12 * a12;
  const c01 = a12 * a02 - a01 * a22;
  const c02 = a01 * a12 - a11 * a02;
  const det = a00 * c00 + a01 * c01 + a02 * c02;
  if (!(det > 1e-12 || det < -1e-12)) return false;
  const c11 = a00 * a22 - a02 * a02;
  const c12 = a01 * a02 - a00 * a12;
  const c22 = a00 * a11 - a01 * a01;
  const inv = 1 / det;
  const p = (c00 * b0 + c01 * b1 + c02 * b2) * inv;
  const q = (c01 * b0 + c11 * b1 + c12 * b2) * inv;
  const r = (c02 * b0 + c12 * b1 + c22 * b2) * inv;
  out.p = p; out.q = sc * q - x0 * p; out.r = r; out.s = sc - x0 * r;
  return isFinite(out.p) && isFinite(out.q) && isFinite(out.r) && isFinite(out.s);
});};
const _1h4j3jf = function _sweepScratch(carrierTemplate,crCurve,LAYOUT) {
  // One set of buffers for the whole d-sweep. Safe to share because a row is
  // scanned start to finish on one thread with no await inside; a worker gets
  // its own copy of the module and therefore its own buffers.
  const rings = carrierTemplate.length;
  const nBins = Math.floor(crCurve[crCurve.length - 1].d) + 1;
  return {
    midRadii: [LAYOUT.anchorRadii[1], 8, 6],
    proj: new Float64Array(rings),
    pairX: new Float64Array(rings),
    pairK: new Float64Array(rings),
    seedX: new Float64Array(4),
    seedK: new Float64Array(4),
    mob: { p: 0, q: 0, r: 0, s: 1 },
    mobR: { p: 0, q: 0, r: 0, s: 1 },
    nBins,
    used: new Uint8Array(nBins),
    d: new Float64Array(nBins),
    score: new Float64Array(nBins),
    rmse: new Float64Array(nBins),
    pairs: new Int32Array(nBins),
    rings: new Int32Array(nBins),
    p: new Float64Array(nBins),
    q: new Float64Array(nBins),
    r: new Float64Array(nBins),
    s: new Float64Array(nBins)
  };
};
const _n2tfv9 = function _crTable(LAYOUT,carrierTable,crossRatio) {
  // Predicted cross ratio of the (rim, mid) quadruple at each swept offset, one
  // row per mid-pair radius interpretation. A window is only admitted in the
  // first place because its measured cross ratio sits on the r=10 curve, so most
  // of the offsets the sweep used to try were inconsistent with the very
  // measurement that admitted it: 89 hypotheses per candidate, of which about 20
  // are consistent. The three curves barely overlap in range (r=10 spans
  // 1.289-1.815, r=8 1.446-2.948, r=6 1.720-3.384), so a measured cross ratio
  // usually settles which radius interpretation is even in play.
  const R = LAYOUT.R;
  return [LAYOUT.anchorRadii[1], 8, 6].map((rc) =>
    Float64Array.from(carrierTable, (_, di) => {
      const d = di * 0.25;
      if (d > rc - 0.5) return NaN;
      const aOut = Math.sqrt(R * R - d * d), aIn = Math.sqrt(rc * rc - d * d);
      return crossRatio(-aOut, -aIn, aIn, aOut);
    })
  );
};
const _scjdu6 = function _anonymous(md) {return (md`---
## §9 Profiling one frame

Press the button, get one frame's cost. That is the whole feature, and it exists because the obvious alternative — read the timings off the live rig — measures the wrong thing. The rig runs flat out, so a detection competes with the capture, the overlay, the accumulator and every other cell downstream of them; the same frame that costs 33 ms of CPU reads as 200 ms of wall clock, and the error is not noise but a bias that moves with whatever else you happen to have open.

\`wallMs\` and \`detectMs\` agreeing is the signal that the number is worth believing. If they diverge, something else on the page is being timed, and the answer is to stop it rather than to average more runs.

The counts are here for the same reason: \`windows\` and \`survived\` say how much work the row enumeration handed downstream, and \`hits\` says how many rows actually decoded. A change that halves the time and halves \`hits\` is not an optimisation — it has moved cost onto §5's fusion, which needs three rows of an id before it will fit a centre.`);};
const _1ctuoxf = function _profileWhich(Inputs) {return (Inputs.select(["frame-mirror-angled.png", "frame-mirror-flat.png", "frame-blank.png"], { label: "profile frame" }));};
const _osi1qe = (G, _) => G.input(_);
const _mwngic = function _profileRun(Inputs) {return (Inputs.button("profile one frame"));};
const _jrzngy = (G, _) => G.input(_);
const _10eic8o = async function _profileFrameCost(profileRun,testFrameBank,profileWhich,analyzeFrame) {
  profileRun;
  const b = testFrameBank.find((x) => x.file === profileWhich);
  if (!b) return null;
  // one frame, on demand, through exactly the routine the live rig runs
  const t0 = window.performance.now();
  const out = await analyzeFrame(b.frame, { minMargin: 4, minReadable: 4 });
  const wall = window.performance.now() - t0;
  return ({
    file: b.file,
    wallMs: +wall.toFixed(1),
    detectMs: +out.run.msDetect.toFixed(1),
    decodeMs: +out.run.msDecode.toFixed(1),
    ids: out.fused.length,
    rows: out.run.rowsTouched,
    windows: out.run.windows,
    survived: out.run.survived,
    hits: out.run.hits.length
  });
};
const _14j5tuk = function _print_md(md,usableIds) {return (md`---
## §10 Marks you can print

The demo at the top needs something to look at. \`markSvgSource\` emits one mark as standalone SVG sized in millimetres; \`markSheetSvg\` lays the ${usableIds.length} usable ids out on A4. The bands tile \`[0, R]\` contiguously, so the whole pattern is nested full discs drawn outside-in — no annulus paths, no stroke widths to get wrong at print resolution.

Two things about them are not cosmetic.

**The surround is mid-gray, and the whole page is flooded with it.** White paper outside a black rim is itself a strong edge at \`r > R\`, and windows anchor on it — every sampled radius stretches and the photometric references land in the wrong bands. Measured: a 200 px mark in a 640×480 frame goes from 36 decoded rows on a matched field to *zero* when the page around a gray tile is white. A gray tile does not fix it either; the tile boundary is a fresh competing edge pair on every row that crosses it. Flooding the page removes the boundary. Printing on mid-gray paper with \`background: false\` is the same thing without the toner.

**Only ${usableIds.length} of the 16 codewords are offered.** Ids 0 and 15 are all-black and all-white payloads, which is exactly what a misplaced window over featureless paint reads, so \`decodeLandmark\` refuses to emit them. Handing a user a mark that can never be read back would be a strange kind of joke.

**How small can it be?** That is a property of the image, not the paper: the detector needs roughly two capture pixels per template unit, so a mark wants to span on the order of a hundred pixels across. Rather than convert that into a working distance — which depends on your lens — the live HUD reports the apparent diameter of the smallest mark it is currently reading. Walk backwards until it stops and read the number off.`);};
const _9txbgx = function _markSvgSource(LAYOUT,codebook) {return (function markSvgSource(id, opts = {}) {
  // A mark as standalone SVG text, sized in millimetres, ready to print.
  //
  // The surround is mid-gray and NOT white, for the same reason drawLandmark
  // draws no quiet zone: white paper outside a black rim is itself a strong
  // edge at r > R, and windows anchor on it, stretching every sampled radius
  // and landing the photometric references in the wrong bands. Gray gives the
  // rim all the contrast the edge detector needs and nothing extra to latch on.
  //
  // The bands tile [0, R] contiguously, so nested full discs drawn outside-in
  // reproduce them exactly -- no annulus paths needed.
  const dMm = opts.diameterMm ?? 60;
  const padFrac = opts.padFrac ?? 0.35;
  const label = opts.label !== false;
  const scale = dMm / 2 / LAYOUT.R;
  const half = LAYOUT.R * (1 + padFrac) * scale;
  const w = +(2 * half).toFixed(3);
  const labelMm = label ? 6 : 0;
  const h = +(w + labelMm).toFixed(3);
  const discs = LAYOUT.bands
    .slice()
    .reverse()
    .map(([r0, r1, k]) => {
      const bit = typeof k === "number" ? k : codebook[id][+k.slice(1)];
      return `<circle cx="${half.toFixed(3)}" cy="${half.toFixed(3)}" r="${(r1 * scale).toFixed(3)}" fill="${bit ? "#ffffff" : "#000000"}"/>`;
    })
    .join("\n");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}mm" height="${h}mm" viewBox="0 0 ${w} ${h}">
<rect width="${w}" height="${h}" fill="#808080"/>
${discs}
${label ? `<text x="${half.toFixed(3)}" y="${(h - 1.6).toFixed(3)}" font-family="monospace" font-size="4" fill="#e8e8e8" text-anchor="middle">id ${id}</text>` : ""}
</svg>`;
});};
const _1xbdrtd = function _markSheetSvg(LAYOUT,codebook) {return (function markSheetSvg(ids, opts = {}) {
  // An A4 sheet of marks, in millimetres, for printing.
  //
  // The WHOLE PAGE is mid-gray, not a gray tile per mark on white paper. A tile
  // border is itself a strong edge pair on every row that crosses it, and it
  // competes with the rim for windows -- measured, a 200px mark in a 640x480
  // frame goes from 36 decoded rows on a matched field to zero when the page
  // around the tile is white. Flooding the page removes the boundary entirely.
  // It costs toner; printing on mid-gray paper with no background fill is the
  // same thing for free (set background:false).
  const dMm = opts.diameterMm ?? 60;
  const padFrac = opts.padFrac ?? 0.35;
  const pageW = opts.pageW ?? 210, pageH = opts.pageH ?? 297;
  const margin = opts.margin ?? 10;
  const background = opts.background !== false;
  const tile = dMm * (1 + padFrac);
  const labelMm = 6;
  const cols = Math.max(1, Math.floor((pageW - 2 * margin) / tile));
  const scale = dMm / 2 / LAYOUT.R;
  const parts = [];
  ids.forEach((id, n) => {
    const cx = margin + (n % cols) * tile + tile / 2;
    const cy = margin + Math.floor(n / cols) * (tile + labelMm) + tile / 2;
    for (const [r0, r1, k] of LAYOUT.bands.slice().reverse()) {
      const bit = typeof k === "number" ? k : codebook[id][+k.slice(1)];
      parts.push(`<circle cx="${cx.toFixed(2)}" cy="${cy.toFixed(2)}" r="${(r1 * scale).toFixed(2)}" fill="${bit ? "#ffffff" : "#000000"}"/>`);
    }
    parts.push(`<text x="${cx.toFixed(2)}" y="${(cy + tile / 2 + 4.2).toFixed(2)}" font-family="monospace" font-size="4" fill="#3a3a3a" text-anchor="middle">id ${id} &#183; ${dMm}mm</text>`);
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${pageW}mm" height="${pageH}mm" viewBox="0 0 ${pageW} ${pageH}">
${background ? `<rect width="${pageW}" height="${pageH}" fill="#808080"/>` : ""}
${parts.join("\n")}
</svg>`;
});};
const _3l7snp = function _usableIds(codebook) {
  // decodeLandmark refuses to emit ids 0 and 15: their payloads are all-black
  // and all-white, which is exactly what a misplaced window over featureless
  // paint reads, so they are reserved as false-positive sinks rather than
  // assigned to landmarks. Anything that offers a mark to a user -- the print
  // sheet, the phone display -- must offer only the 14 that can come back.
  const ids = [];
  for (let id = 0; id < codebook.length; id++) if (id !== 0 && id !== 15) ids.push(id);
  return ids;
};
const _1566rx9 = function _redesign_md(md,tex) {return (md`---
## §11 Redesign: the code is the detection pattern

Everything above works around one structural fault: the payload bands are dead
weight during detection, and the geometry bootstrap hangs off a single noisy
anchor pair. This section prototypes the next mark generation, designed so that
**every edge is load-bearing in both detection and decode**.

The key coordinate is ${tex`u = r^2`}. §3.1 showed that after normalising by the
involution's fixed points, ${tex`t = (x-P)/(x-Q)`} gives ${tex`t = c k`}
exactly, so

${tex.block`u := t^2 = c^2(r^2 - d^2) = A r^2 + B.`}

The whole per-row warp — chord offset *and* perspective — collapses to an
**affine map in r²-space**. So a code built from affine-recognisable structure
in that space is detectable on every row, at every pose, from every edge:

1. **Mirror pairing** — bounded enumeration from the ends inward (mirror pairs
   cannot cross), opposite gradient signs required.
2. **Involution** — two pairs determine it in closed form; gates: real fixed
   points, foot inside, vanishing point outside; verified against *all* edges.
3. **Lattice correspondence** — enumerate (outer, inner) tooth anchors, then
   least-squares refit of ${tex`(A, B)`} over all pairs. ${tex`d`} falls out as
   ${tex`\sqrt{-B/A}`} — measured per row, no sweep, no DP.
4. **Payload** — Manchester in r: each cell's guaranteed mid edge carries its
   bit as the **gradient sign** (no intensity threshold), and the boundary edge
   between cells exists iff the bits are equal — payload-dependent edges that
   still feed detection, act as parity, and repair erased bits.

\`manLayout\` fixes 6 cells of pitch 3.21 (half-cell 1.607): 64 ids against
today's 14. Offline measurement against this notebook's own detector (identical
synthetic renderer, per-row full-id on centred rows): 63% vs 14% at 120 px
apparent width, 29% vs 0% at 70 px; the geometric stage alone locks 98–100% of
rows out to ${tex`d = 22`} where §3's detector is long dead. 114 µs vs 670 µs
per row. Zero false positives in 2000 clutter rows with the direct-read gate
(the current detector: 3).

**And the tilt angle §0.1 refused to ship comes back.** Rows near the poles now
yield geometry, so the per-row ${tex`\hat d`} feeds a V-fit in d-space whose
slope is the vertical scale — measured, not extrapolated. On 2-D frames under a
real pinhole yaw: true 0/20/40/60° read back as 4.9/22.4/39.6/60.1° (120 px
mark). The demo below runs the full cascade live on a synthetic frame; §11.2
has the printable marks.`);};
const _1jghxt5 = function _manLayout() {
  // Manchester-in-r layout: dark disc r<6; light framing half-cell; nBits
  // cells (bit 1 = dark,light going outward); dark framing half-cell; R=28.5.
  // Teeth at r = 6 + half*m, m = 0..2n+2. Guaranteed regardless of payload:
  // tooth 0 (disc edge), the mids 2+2j, and 2n+2 (rim). Boundary tooth 3+2j
  // exists iff bits j and j+1 are equal.
  const nBits = 6;
  const half = 22.5 / (2 * nBits + 2);
  const nT = 2 * nBits + 2;
  const teeth = Array.from({ length: nT + 1 }, (_, m) => 6 + half * m);
  return {
    nBits,
    half,
    nT,
    R: 28.5,
    teeth,
    teeth2: teeth.map((r) => r * r),
    guaranteed: [0, nT, ...Array.from({ length: nBits }, (_, j) => 2 + 2 * j)]
  };
};
const _12dy4hh = function _manColor(manLayout) {return (function manColor(r, bits, L = manLayout) {
  // radial gray profile of a man mark: 25 dark, 230 light, 128 page gray
  if (r >= L.R) return 128;
  if (r < 6) return 25;
  const m = Math.floor((r - 6) / L.half);
  if (m <= 0) return 230;
  if (m >= L.nT - 1) return 25;
  const j = (m - 1) >> 1, firstHalf = (m - 1) % 2 === 0;
  return bits[j] === 1 ? (firstHalf ? 25 : 230) : (firstHalf ? 230 : 25);
});};
const _gg8jqp = function _findInvolution() {return (function findInvolution(edges, opts = {}) {
  // Stage 1+2 of the redesign cascade: mirror pairing + involution, design-
  // independent (any symmetric ring pattern induces one).
  //
  // Hypotheses are GEOMETRY-BOUNDED, not blind RANSAC: mirror pairs cannot
  // cross, so candidates come only from the ends inward (outer pair from the
  // outermost 3 edges each side, second pair from the next 4 inward), and a
  // pair must have opposite gradient signs. Each 2-pair involution is gated
  // -- real fixed points, foot P inside both pairs, vanishing point Q outside
  // the outer pair -- before verification against every edge.
  const involutionFrom = (x1, x1p, x2, x2p) => {
    const r1 = [x1 * x1p, x1 + x1p, 1];
    const r2 = [x2 * x2p, x2 + x2p, 1];
    return [
      r1[1] * r2[2] - r1[2] * r2[1],
      r1[2] * r2[0] - r1[0] * r2[2],
      r1[0] * r2[1] - r1[1] * r2[0]
    ];
  };
  const fixedPoints = (co, span) => {
    const al = co[0], be = co[1], ga = co[2];
    if (Math.abs(al) * span < 1e-4 * Math.abs(be)) return { P: -ga / (2 * be), Q: Infinity };
    const disc = be * be - al * ga;
    if (disc <= 0) return null;
    const sq = Math.sqrt(disc);
    return { P: (-be + sq) / al, Q: (-be - sq) / al };
  };
  const n = edges.length;
  if (n < 6) return null;
  const xs = edges.map((e) => (typeof e === "number" ? e : e.x));
  const ss = edges.map((e) => (typeof e === "number" ? 1 : e.s));
  const span = xs[n - 1] - xs[0];
  const tolPx = opts.tolPx ?? 1.1;
  const minInliers = opts.minInliers ?? 6;
  let best = null;
  const consider = (i, j, a, b) => {
    if (ss[i] === ss[j] || ss[a] === ss[b]) return;
    const inv = involutionFrom(xs[i], xs[j], xs[a], xs[b]);
    const fp = fixedPoints(inv, span);
    if (!fp) return;
    let P = fp.P, Q = fp.Q;
    const mid = (xs[i] + xs[j]) / 2;
    if (isFinite(Q) && Math.abs(P - mid) > Math.abs(Q - mid)) { const t = P; P = Q; Q = t; }
    if (!(P > xs[i] && P < xs[j] && P > xs[a] && P < xs[b])) return;
    if (isFinite(Q) && Q > xs[i] - 0.02 * span && Q < xs[j] + 0.02 * span) return;
    const affine = !isFinite(Q);
    const img = affine
      ? (x) => 2 * P - x
      : (x) => -(inv[1] * x + inv[2]) / (inv[0] * x + inv[1]);
    let inl = 0;
    const pairs = [];
    for (let e = 0; e < n; e++) {
      if (xs[e] >= P) break;
      const y = img(xs[e]);
      if (!isFinite(y)) continue;
      let bi = -1, bd = Infinity;
      for (let f = n - 1; f >= 0 && xs[f] > P; f--) {
        const dd = Math.abs(xs[f] - y);
        if (dd < bd && ss[f] === -ss[e]) { bd = dd; bi = f; }
      }
      if (bi >= 0 && bd <= tolPx) { inl += 2; pairs.push([e, bi]); }
    }
    if (inl >= minInliers && (!best || inl > best.inl)) best = { P, Q, affine, inl, pairs };
  };
  for (let i = 0; i < Math.min(3, n); i++)
    for (let j = n - 1; j >= Math.max(n - 3, i + 3); j--) {
      if (ss[i] === ss[j]) continue;
      for (let a = i + 1; a <= Math.min(i + 4, j - 2); a++)
        for (let b = j - 1; b >= Math.max(j - 4, a + 1); b--) consider(i, j, a, b);
    }
  if (!best) return null;
  const P = best.P, Q = best.Q;
  const tOf = best.affine ? (x) => x - P : (x) => (x - P) / (x - Q);
  // u per mirror pair via the geometric mean: t_L = -c k, t_R = +c k
  const up = best.pairs
    .map(([e, f]) => ({ u: -tOf(xs[e]) * tOf(xs[f]), e, f, sR: ss[f] }))
    .filter((p) => p.u > 0)
    .sort((a, b) => a.u - b.u);
  return up.length >= 3 ? { P, Q, up, inl: best.inl, xs, ss } : null;
});};
const _1mszvx0 = function _solveMan(manLayout) {return (function solveMan(iv, L = manLayout, opts = {}) {
  // Stage 3+4: tooth correspondence + payload for the Manchester lattice.
  //
  // (outer, inner) tooth anchors are enumerated, but each candidate (A,B) is
  // then LEAST-SQUARES REFIT over all mirror pairs with nearest-tooth
  // reassignment -- anchoring on the two extremal pairs alone runs away when
  // blur merges rim teeth. Scoring: lattice inliers minus a penalty for
  // guaranteed teeth (mids, framing) the assignment says should be visible
  // but aren't; sign gates on the payload-independent framing teeth.
  //
  // Payload: mid-tooth gradient sign = bit. Boundary teeth repair erasures
  // (present iff neighbours equal) -- but repair is circular with the check
  // that would catch a bad repair, so an id is only EMITTED with nBits-1
  // direct reads, zero violations, and >=3 checks. That gate measured 0 wrong
  // ids and 0/2000 clutter false positives.
  const T = L.teeth, T2 = L.teeth2, nT = L.nT, nBits = L.nBits, half = L.half;
  const up = iv.up;
  const uIn = up[0].u, uOut = up[up.length - 1].u;
  const nPairs = up.length;
  let asg = null;
  for (let o = nT; o >= Math.max(4, nT - 10); o--)
    for (let ii = 0; ii < o; ii++) {
      if (o - ii + 1 < nPairs - 2 || o - ii > nPairs + 7) continue;
      let A = (uOut - uIn) / (T2[o] - T2[ii]);
      if (!(A > 0)) continue;
      let B = uIn - A * T2[ii];
      let fit = null;
      for (let round = 0; round < 2; round++) {
        const d2 = -B / A;
        if (d2 < -1.5) { fit = null; break; }
        const dHat = Math.sqrt(Math.max(0, d2));
        const hits = [];
        let sx = 0, sy = 0, sxx = 0, sxy = 0, m = 0;
        for (const p of up) {
          const r = Math.sqrt(Math.max(0, p.u / A + d2));
          const t = Math.round((r - 6) / half);
          if (t < 0 || t > nT) continue;
          const err = Math.abs(r - T[t]);
          if (err < 0.45) {
            hits.push([p, t, err]);
            sx += T2[t]; sy += p.u; sxx += T2[t] * T2[t]; sxy += T2[t] * p.u; m++;
          }
        }
        if (m < 3) { fit = null; break; }
        const den = m * sxx - sx * sx;
        if (Math.abs(den) > 1e-9) {
          const A2 = (m * sxy - sx * sy) / den;
          if (A2 > 0) { A = A2; B = (sy - A * sx) / m; }
        }
        fit = { A, B, dHat, hits };
      }
      if (!fit) continue;
      let bad = false;
      const claimed = new Set();
      let resid = 0;
      for (const [p, t, err] of fit.hits) {
        if ((t === 0 || t === nT) && p.sR <= 0) { bad = true; break; }
        claimed.add(t); resid += err;
      }
      if (bad) continue;
      const rHi = Math.sqrt(uOut / fit.A + Math.max(0, -fit.B / fit.A)) + 0.7;
      let missing = 0;
      for (const t of L.guaranteed)
        if (T[t] > fit.dHat + 0.8 && T[t] < rHi && !claimed.has(t)) missing++;
      const score = fit.hits.length - 0.7 * missing;
      if (!asg || score > asg.score || (score === asg.score && resid < asg.resid))
        asg = { A: fit.A, B: fit.B, dHat: fit.dHat, hits: fit.hits, score, resid, inliers: fit.hits.length };
    }
  if (!asg || asg.inliers < 3 || asg.inliers < up.length - 2) return { ok: false, why: "no-lattice" };
  const byTooth = new Map();
  for (const [p, t, err] of asg.hits) {
    const prev = byTooth.get(t);
    if (!prev || err < prev.err) byTooth.set(t, { u: p.u, e: p.e, f: p.f, sR: p.sR, err });
  }
  const bits = new Array(nBits).fill(null);
  for (let j = 0; j < nBits; j++) {
    const p = byTooth.get(2 + 2 * j);
    if (p) bits[j] = p.sR > 0 ? 1 : 0;
  }
  const nDirect = bits.filter((b) => b != null).length;
  const visible = (t) => T[t] > asg.dHat + 0.6;
  for (let pass = 0; pass < nBits; pass++) {
    let fixed = 0;
    for (let j = 0; j < nBits; j++) {
      if (bits[j] != null) continue;
      if (j > 0 && bits[j - 1] != null && visible(3 + 2 * (j - 1))) {
        bits[j] = byTooth.has(3 + 2 * (j - 1)) ? bits[j - 1] : 1 - bits[j - 1];
        fixed++;
      } else if (j < nBits - 1 && bits[j + 1] != null && visible(3 + 2 * j)) {
        bits[j] = byTooth.has(3 + 2 * j) ? bits[j + 1] : 1 - bits[j + 1];
        fixed++;
      }
    }
    if (!fixed) break;
  }
  let viol = 0, checks = 0;
  for (let j = 0; j + 1 < nBits; j++) {
    const t = 3 + 2 * j;
    if (bits[j] == null || bits[j + 1] == null || !visible(t)) continue;
    checks++;
    if (byTooth.has(t) !== (bits[j] === bits[j + 1])) viol++;
  }
  if (bits[0] != null && visible(1)) { checks++; if (byTooth.has(1) !== (bits[0] === 1)) viol++; }
  if (bits[nBits - 1] != null && visible(nT - 1)) {
    checks++;
    if (byTooth.has(nT - 1) !== (bits[nBits - 1] === 1)) viol++;
  }
  const nVis = bits.filter((b) => b != null).length;
  const minDirect = opts.minDirect ?? nBits - 1;
  const emit = nVis === nBits && viol === 0 && nDirect >= minDirect && checks >= 3;
  return {
    ok: true, dHat: asg.dHat, A: asg.A, bits, nVis, nDirect, viol, checks,
    sup: asg.inliers,
    id: emit ? bits.reduce((a, b) => 2 * a + b, 0) : null
  };
});};
const _4krul3 = function _renderManFrame(manLayout,manColor) {return (function renderManFrame(bits, opts = {}) {
  // Synthetic 2-D frame of one man mark under a pinhole yaw homography.
  // Mark plane spanned by u=(cos p,0,sin p), v=(0,1,0) at distance Z.
  // Inverse map: xm = a1 Z/(cos p - a1 sin p), ym = b1 (Z + xm sin p).
  // Seeded noise so a given (bits, opts) is reproducible.
  const L = opts.layout ?? manLayout;
  const W = opts.W ?? 60;                       // apparent halfwidth at frontal, px
  const phi = ((opts.yawDeg ?? 0) * Math.PI) / 180;
  const blur = opts.blur ?? 1.0;
  const noise = opts.noise ?? 3;
  const seed = opts.seed ?? 1;
  const R = L.R, Z = 400;
  const f = (W * Z) / R;
  const c = Math.cos(phi), s = Math.sin(phi);
  const xPlus = (f * R * c) / (Z + R * s), xMinus = (-f * R * c) / (Z - R * s);
  const bV = (f * R) / Z;
  const mx = 25;
  const w = Math.ceil(xPlus - xMinus + 2 * mx);
  const h = Math.ceil(2 * bV + 2 * mx);
  const cx = mx - xMinus, cy = h / 2;
  const SS = 2;
  const hi = new Float64Array(w * SS * h * SS);
  for (let py = 0; py < h * SS; py++) {
    const b1 = ((py + 0.5) / SS - cy) / f;
    for (let px = 0; px < w * SS; px++) {
      const a1 = ((px + 0.5) / SS - cx) / f;
      const den = c - a1 * s;
      let v = 128;
      if (Math.abs(den) > 1e-9) {
        const xm = (a1 * Z) / den;
        const ym = b1 * (Z + xm * s);
        v = manColor(Math.hypot(xm, ym), bits, L);
      }
      hi[py * w * SS + px] = v;
    }
  }
  const img = new Float64Array(w * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let acc = 0;
      for (let dy = 0; dy < SS; dy++)
        for (let dx = 0; dx < SS; dx++) acc += hi[(y * SS + dy) * w * SS + x * SS + dx];
      img[y * w + x] = acc / (SS * SS);
    }
  const rad = Math.max(1, Math.ceil(3 * blur));
  const ker = new Float64Array(2 * rad + 1);
  let ks = 0;
  for (let i = -rad; i <= rad; i++) ks += ker[i + rad] = Math.exp((-i * i) / (2 * blur * blur));
  const tmp = new Float64Array(w * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let acc = 0;
      for (let i = -rad; i <= rad; i++) acc += img[y * w + Math.min(w - 1, Math.max(0, x + i))] * ker[i + rad];
      tmp[y * w + x] = acc / ks;
    }
  // mulberry32 + Box-Muller, seeded
  let st = seed | 0;
  const rnd = () => {
    st = (st + 0x6d2b79f5) | 0;
    let t = Math.imul(st ^ (st >>> 15), 1 | st);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const gauss = () => {
    const u = Math.max(1e-12, rnd()), v2 = rnd();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v2);
  };
  const gray = new Uint8Array(w * h);
  for (let x = 0; x < w; x++)
    for (let y = 0; y < h; y++) {
      let acc = 0;
      for (let i = -rad; i <= rad; i++) acc += tmp[Math.min(h - 1, Math.max(0, y + i)) * w + x] * ker[i + rad];
      gray[y * w + x] = Math.max(0, Math.min(255, Math.round(acc / ks + noise * gauss())));
    }
  return { gray, w, h, cx, cy, aTrue: (xPlus - xMinus) / 2, bTrue: bV, yawDeg: opts.yawDeg ?? 0 };
});};
const _1mnpthu = function _detectFrameMan(manLayout,edges1Dsub,findInvolution,solveMan) {return (function detectFrameMan(frame, opts = {}) {
  // Frame-level fusion for man marks: rows at fineStride, id by vote with a
  // 2x margin over the runner-up, then geometry.
  //
  // The pose fit is the section's payoff. Each geometry-locked row measures
  // its chord offset |d| directly, so a V-fit in d-space gives the vertical
  // scale and centre: |d| = |y - yc| / S_v, b = S_v R. Fit in d (not d^2) --
  // d^2 residuals grow with d, far rows dominate, and MAD trimming gets
  // masked. Rows whose d disagrees with the d implied by their own rim
  // half-width (via a global S_h) are translated lattice locks -- two
  // independent measurements of the same quantity, so disagreement identifies
  // a bad lock with no tuning. This is what makes acos(a/b) usable: measured
  // yaw tracked true yaw to a few degrees from 0 to 60.
  const L = opts.layout ?? manLayout;
  const stride = opts.stride ?? 6;
  const thr = opts.edgeThreshold ?? 12;
  const gray = frame.gray, w = frame.w, h = frame.h;
  const votes = new Map();
  const geo = [];
  let rowsTried = 0, rowsLocked = 0;
  for (let y = Math.floor(stride / 2); y < h; y += stride) {
    rowsTried++;
    const se = edges1Dsub(gray.subarray(y * w, (y + 1) * w), thr);
    const iv = findInvolution(se);
    if (!iv) continue;
    const r = solveMan(iv, L, opts);
    if (!r.ok) continue;
    rowsLocked++;
    if (r.sup >= 5) {
      const pOut = iv.up[iv.up.length - 1];
      geo.push({
        y,
        d: r.dHat,
        dHat: r.dHat,
        sup: r.sup,
        foot: iv.P,
        wHalf: (iv.xs[pOut.f] - iv.xs[pOut.e]) / 2
      });
    }
    if (r.id != null) votes.set(r.id, (votes.get(r.id) ?? 0) + 1);
  }
  let bestId = null, bestN = 0, secondN = 0;
  for (const [id, n] of votes) {
    if (n > bestN) { secondN = bestN; bestN = n; bestId = id; }
    else if (n > secondN) secondN = n;
  }
  const id = bestN >= 2 && bestN >= 2 * secondN ? bestId : null;
  // reject translated locks via the wHalf cross-check
  let geoV = geo;
  const shs = geo
    .filter((g) => g.sup >= 9 && g.dHat < L.R - 3)
    .map((g) => g.wHalf / Math.sqrt(L.R * L.R - g.dHat * g.dHat))
    .sort((x, z) => x - z);
  if (shs.length >= 3) {
    const sh = shs[shs.length >> 1];
    const filtered = geo.filter((g) => {
      const q = L.R * L.R - (g.wHalf / sh) * (g.wHalf / sh);
      return Math.abs(g.dHat - Math.sqrt(Math.max(0, q))) < 3;
    });
    if (filtered.length >= 5) geoV = filtered;
  }
  // V-fit in d-space: yc by grid search, slope by LS, MAD trim, refit
  const vFit = (pts) => {
    let best = null;
    const yLo = Math.min(...pts.map((g) => g.y)), yHi = Math.max(...pts.map((g) => g.y));
    for (let yc = yLo; yc <= yHi; yc += 1) {
      let sz2 = 0, szd = 0;
      for (const g of pts) { const z = Math.abs(g.y - yc); sz2 += z * z; szd += z * g.d; }
      if (sz2 < 1e-9) continue;
      const gS = szd / sz2;
      if (!(gS > 0)) continue;
      let rss = 0;
      for (const g of pts) { const e = g.d - Math.abs(g.y - yc) * gS; rss += e * e; }
      if (!best || rss < best.rss) best = { yc, gS, rss };
    }
    return best;
  };
  let aEst = null, bEst = null, ycEst = null, xcEst = null, tiltDeg = null;
  if (geoV.length >= 5) {
    let pts = geoV, fit = vFit(pts);
    if (fit) {
      const resid = pts.map((g) => Math.abs(g.d - Math.abs(g.y - fit.yc) * fit.gS));
      const mad = resid.slice().sort((x, z) => x - z)[resid.length >> 1] || 0.5;
      const kept = pts.filter((g, i) => resid[i] <= 2.5 * mad);
      if (kept.length >= 5) { pts = kept; fit = vFit(pts) ?? fit; }
      bEst = L.R / fit.gS;
      ycEst = fit.yc;
      const feet = pts.map((g) => g.foot).sort((x, z) => x - z);
      xcEst = feet[feet.length >> 1];
      const ws = [];
      for (const g of pts) {
        const q = 1 - ((g.y - ycEst) / bEst) ** 2;
        if (q > 0.15) ws.push(g.wHalf / Math.sqrt(q));
      }
      if (ws.length >= 3) {
        aEst = ws.sort((x, z) => x - z)[ws.length >> 1];
        tiltDeg = (Math.acos(Math.min(1, aEst / bEst)) * 180) / Math.PI;
      }
    }
  }
  return { id, votes: bestN, rowsTried, rowsLocked, geoRows: geoV.length, xcEst, ycEst, aEst, bEst, tiltDeg };
});};
const _og7api = function _manDemoCfg(Inputs) {return (Inputs.form({
  id: Inputs.range([0, 63], { label: "id (6 bits)", step: 1, value: 45 }),
  yawDeg: Inputs.range([0, 70], { label: "true yaw °", step: 5, value: 40 }),
  W: Inputs.range([30, 120], { label: "apparent halfwidth px", step: 5, value: 70 }),
  blur: Inputs.range([0.5, 2.5], { label: "blur σ px", step: 0.25, value: 1 })
}));};
const _1ewr3en = (G, _) => G.input(_);
const _1tn1oj8 = function _manDemo(manDemoCfg,manLayout,renderManFrame,detectFrameMan) {
  // The §11 cascade end to end on one synthetic frame: render a man mark
  // under the chosen yaw, detect it, and draw what the detector measured
  // over what the renderer knows. The overlay ellipse and the tilt readout
  // come entirely from per-row geometry -- no access to the render truth.
  const cfg = manDemoCfg;
  const bits = Array.from({ length: manLayout.nBits }, (_, j) =>
    (cfg.id >> (manLayout.nBits - 1 - j)) & 1
  );
  const frame = renderManFrame(bits, {
    W: cfg.W, yawDeg: cfg.yawDeg, blur: cfg.blur, noise: 3, seed: 42
  });
  const t0 = window.performance.now();
  const det = detectFrameMan(frame);
  const ms = window.performance.now() - t0;
  const canvas = window.document.createElement("canvas");
  canvas.width = frame.w; canvas.height = frame.h;
  canvas.style.maxWidth = "100%";
  const ctx = canvas.getContext("2d");
  const im = ctx.createImageData(frame.w, frame.h);
  for (let i = 0; i < frame.gray.length; i++) {
    const v = frame.gray[i];
    im.data[i * 4] = v; im.data[i * 4 + 1] = v; im.data[i * 4 + 2] = v; im.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(im, 0, 0);
  if (det.aEst != null) {
    ctx.strokeStyle = det.id === cfg.id ? "#2fe08a" : "#ff5f5f";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(det.xcEst, det.ycEst, det.aEst, det.bEst, 0, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(det.xcEst - 6, det.ycEst); ctx.lineTo(det.xcEst + 6, det.ycEst);
    ctx.moveTo(det.xcEst, det.ycEst - 6); ctx.lineTo(det.xcEst, det.ycEst + 6);
    ctx.stroke();
  }
  const ok = det.id === cfg.id;
  const line = (k, v) => `<div><span style="opacity:.6">${k}</span> ${v}</div>`;
  const readout = window.document.createElement("div");
  readout.style.cssText = "font-family:ui-monospace,monospace;font-size:13px;display:flex;gap:1.5em;flex-wrap:wrap;padding:4px 0";
  readout.innerHTML =
    line("id", det.id == null ? "—" : `${det.id} ${ok ? "✓" : "✗ (true " + cfg.id + ")"}`) +
    line("votes", det.votes) +
    line("rows locked", `${det.rowsLocked}/${det.rowsTried}`) +
    line("tilt̂", det.tiltDeg == null ? "—" : `${det.tiltDeg.toFixed(1)}° (true ${cfg.yawDeg}°)`) +
    line("b̂", det.bEst == null ? "—" : `${det.bEst.toFixed(1)}px (true ${frame.bTrue.toFixed(1)})`) +
    line("ms", ms.toFixed(1));
  const root = window.document.createElement("div");
  root.appendChild(canvas);
  root.appendChild(readout);
  return root;
};
const _4liiby = function _cascade_md(md,tex) {return (md`### §11.1 From one row to a whole frame

§11 solves **one row over one mark**. A camera gives a frame with several marks
in it, most rows crossing nothing, and a great deal of furniture that is not a
mark at all. Three things have to be added, and each is a place the obvious
implementation is wrong.

**1. Segment the row before solving it.** \`findInvolution\` takes its outer
pair from the extremes of whatever it is handed, so it can only ever lock *one*
mark per call — given two, the outermost pair straddles both and no involution
fits. \`manRowGroups\` splits the row's edge list at its widest gap first.

The threshold is a property of the layout, not a tuned constant. The widest gap
*inside* a man mark is the dark centre disc: 12 units of a 57-unit span, so at
most **0.21** of the mark's own width — and it is only crossed near the equator
at all. A gap wider than **0.30** of the span therefore separates two marks
rather than two rings. The edge count says the same thing from the other side: a
man mark can present at most 2(nT+1) edges, so a run holding more than that
holds more than one thing. When a split is forced by *count* alone the whole run
is offered as well, because a mark straddling the cut would otherwise be lost.
Two groups that lock onto the same place are resolved by lattice support.

**2. Cluster on the foot, not on the id.** The foot is the involution's fixed
point — the mark's centre column *for that row*. Rows are associated to a
cluster by foot proximity, with a tolerance that scales with the mark's own
half-width, and a cluster that goes four strides without a hit is closed.

Clustering on the decoded id would be the obvious choice and it throws away the
evidence. Geometry survives rows whose payload does not: a row near the pole
locks a lattice and reads no bits. Those are exactly the rows the pose fit needs
— they are the ones that measure the mark's vertical extent.

**3. Require two independent kinds of evidence.** A cluster is reported only if
it survives **both** an id vote (a winner with at least 2 rows and twice the
runner-up) and a plausible **shape**. The payload gate lives in \`solveMan\`'s
boundary checks; the shape gate lives in \`fitManPose\`'s verdict. They are
independent, and that is the whole point: ordinary scene clutter produces plenty
of one and almost none of the other. This was not a theoretical concern —
**a real camera pointed at an ordinary desk locks a lattice on around forty rows
a frame.** "A fit exists" is not evidence. With both gates, twelve frames of
clutter produced zero detections.

#### The pose fit

\`fitManPose\` turns a cluster of geometry-locked rows into an ellipse and a
verdict on it. Each row has already measured its own chord offset ${tex`|d|`} in
mark units and its rim half-width in pixels, so:

${tex.block`|d| = |y - y_c| / S_v`}

is a fit in ${tex`d`}-space — **not** ${tex`d^2`}-space. That is not a detail:
${tex`d^2`} residuals grow with ${tex`d`}, so the far rows dominate the fit and
MAD trimming gets masked by them. ${tex`y_c`} is searched over the row range and
the slope is closed-form at each candidate; ${tex`b = R/S_v`} is the semi-minor
axis, **measured** rather than extrapolated from the equator, which is the whole
reason a tilt angle is available here and was not for the §1 mark.

The rim half-width is then a *second, independent* measurement of the same
quantity: with one global horizontal scale ${tex`S_h`}, a row's half-width
implies its own ${tex`d`}. A row whose lattice ${tex`d`} disagrees has locked a
translated lattice. Two measurements of one quantity means a bad row identifies
itself — no threshold to tune.

The semi-major axis ${tex`a`} comes from the per-row widths de-foreshortened by
${tex`\sqrt{1-((y-y_c)/b)^2}`}, taken as a median. Then:

| quantity | what it is | how it is used |
|---|---|---|
| \`axisRatio\` = min(a,b)/max(a,b) | ${tex`\cos(\text{tilt})`} | gate: below 1/3 the minor axis is too short to carry 14 rings, so it could not have been read anyway |
| \`aSpread\` | IQR of the width samples over their median — ${tex`a`}'s own uncertainty, in ${tex`a`}'s units | gates the **angle** only |
| \`cover\` | (yHi−yLo)/b | reported, not gated |

Three corrections here came from real frames rather than the simulator, and all
three went the same way — a guard that looked clean in simulation was wrong on
photographs:

- The aspect guard was one-sided at first (${tex`a \le b`}, since a circle cannot
  image wider than tall). That holds only for rotation about a *vertical* axis. A
  hand holding a phone rotates about both, and on a photo of a tipped sheet the
  one-sided guard threw out correct ids at ${tex`a/b`} 1.2–2.3. The ratio is the
  invariant; its direction is not.
- \`cover\` was a gate and is now only a report: across the same frames it
  rejected three correct reads and not one false one. Clutter covers 0.48–1.36
  and real marks 0.41–1.59, so it never separated anything.
- The angle gets its own bar because id and centre survive a shaky width fit and
  the angle does not. A scattered width still puts the mark in the right place.

**The centre estimate is anisotropic, and it matters downstream.** ${tex`x_c`}
is the median foot — measured directly, on every row. ${tex`y_c`} is where the
V-fit extrapolates ${tex`|d| \to 0`}. Those are not the same quality of number,
which §11.3's frame bank measures (23 px against 64 px) and §11.4's target has
to live with.

\`manSceneTest\` is the ground-truth regression for all of it: four marks of
different sizes and yaws composited into one 960×540 frame, checked for id,
centre and tilt. Run it after any change to the gates — it is what proved they
cost no recall.`);};
const _w574fm = function _manRowGroups(manLayout) {return (function manRowGroups(xs, opts = {}) {
  // Split one row's edge positions into candidate per-mark groups.
  //
  // findInvolution enumerates its outer pair from the outermost few edges of
  // whatever it is given, so it can only ever lock ONE mark per call: with two
  // marks in a row the outermost pair straddles both and no involution fits.
  // A live frame has several marks, so the row must be segmented first.
  //
  // The segmentation is a property of the layout rather than a tuned constant.
  // The widest gap INSIDE a mark is the dark disc, crossed only near the
  // equator: 2*6 units of a 2*R span, so at most 0.21 of the mark's own span
  // (largest at d=0, and the disc is not crossed at all past d=6). A gap
  // wider than 0.30 of the span therefore separates marks, not rings. The
  // edge-count cap is the same argument from the other side: a man mark can
  // present at most 2*(nT+1) edges, so a group holding more than that plus
  // slack is holding more than one thing.
  const L = opts.layout ?? manLayout;
  const gapFrac = opts.gapFrac ?? 0.3;
  const maxEdges = opts.maxEdges ?? 2 * (L.nT + 1) + 6;
  const minEdges = opts.minEdges ?? 6;
  const minSpan = opts.minSpan ?? 14;
  const out = [];
  const split = (lo, hi, depth) => {
    const n = hi - lo + 1;
    if (n < minEdges) return;
    const span = xs[hi] - xs[lo];
    if (span < minSpan) return;
    let worst = -1, worstGap = 0;
    for (let i = lo; i < hi; i++) {
      const g = xs[i + 1] - xs[i];
      if (g > worstGap) { worstGap = g; worst = i; }
    }
    const tooWide = worstGap > gapFrac * span;
    const tooMany = n > maxEdges;
    if ((tooWide || tooMany) && worst >= lo && depth < 8) {
      split(lo, worst, depth + 1);
      split(worst + 1, hi, depth + 1);
      // a mark straddling the cut would be lost, so also offer the whole run
      // when the split was forced by count alone
      if (tooMany && !tooWide) out.push([lo, hi]);
      return;
    }
    out.push([lo, hi]);
  };
  split(0, xs.length - 1, 0);
  return out;
});};
const _rvt6ru = function _detectRowMan(manLayout,manRowGroups,findInvolution,solveMan) {return (function detectRowMan(scanEdges, opts = {}) {
  // One scan row, any number of man marks: segment, then run the §11 cascade
  // per group. Overlapping locks are resolved by lattice support, so a group
  // offered twice (the count-split fallback) cannot yield the mark twice.
  const L = opts.layout ?? manLayout;
  const n = scanEdges.length;
  if (n < 6) return [];
  const xs = new Float64Array(n), ss = new Int8Array(n);
  for (let i = 0; i < n; i++) {
    const e = scanEdges[i];
    xs[i] = typeof e === "number" ? e : e.x;
    ss[i] = typeof e === "number" ? 1 : e.s;
  }
  const groups = manRowGroups(xs, opts);
  const hits = [];
  for (const [lo, hi] of groups) {
    const sub = [];
    for (let i = lo; i <= hi; i++) sub.push({ x: xs[i], s: ss[i] });
    const iv = findInvolution(sub, opts);
    if (!iv) continue;
    const r = solveMan(iv, L, opts);
    if (!r.ok || r.sup < 5) continue;
    const pOut = iv.up[iv.up.length - 1];
    const wHalf = (iv.xs[pOut.f] - iv.xs[pOut.e]) / 2;
    hits.push({
      foot: iv.P, d: r.dHat, sup: r.sup, wHalf, id: r.id,
      x0: iv.xs[0], x1: iv.xs[iv.xs.length - 1]
    });
  }
  // strongest lattice support wins an overlap
  hits.sort((a, b) => b.sup - a.sup);
  const kept = [];
  for (const h of hits)
    if (!kept.some((k) => Math.abs(k.foot - h.foot) < 0.6 * Math.max(k.wHalf, h.wHalf)))
      kept.push(h);
  return kept;
});};
const _138kml = function _fitManPose(manLayout) {return (function fitManPose(geo, L = manLayout) {
  // Pose from a cluster of geometry-locked rows. Each row measured its own
  // chord offset |d| (in mark units) and its rim half-width (in pixels), so
  // the mark's vertical extent is MEASURED rather than extrapolated from the
  // equator -- which is the whole reason a tilt angle is available here and
  // not for the §1 mark (see markEllipse).
  //
  // Returns the measurement AND a verdict on it; the caller decides.
  //   1. Fit |d| = |y - yc| / Sv in d-space, NOT d^2. d^2 residuals grow with
  //      d, so far rows dominate the fit and MAD trimming gets masked.
  //   2. wHalf is an INDEPENDENT measurement of the same chord offset: with a
  //      global horizontal scale Sh, a rim half-width implies its own d. A row
  //      whose lattice d disagrees is a translated lattice lock -- two
  //      measurements of one quantity, so disagreement identifies a bad row
  //      with no threshold to tune.
  //   3. axisRatio = min(a,b)/max(a,b) = cos(tilt). A circle's image is an
  //      ellipse; WHICH axis is short depends on the rotation axis, and a
  //      hand holding a phone rotates about both. Gate on the ratio being a
  //      readable foreshortening, not on the sign of it.
  //   4. aSpread: the interquartile spread of the per-row width samples over
  //      their median -- `a`'s own uncertainty, in `a`'s own units. It is
  //      what separates a measured axis from a fitted one.
  //
  // Two corrections, both from real camera frames rather than the simulator:
  //
  // Guard 3 was one-sided at first (`a <= b`, since a circle cannot be wider
  // than tall). That holds only for rotation about a VERTICAL axis. Desk
  // clutter did measure a/b 1.13-11.3 against 0.51-1.10 simulated, which
  // looked like clean separation -- but that asymmetry is an artefact of
  // scanning by ROWS, since a spurious cluster is a horizontal streak, wide
  // by construction. On a photo of a tipped phone it threw out correct ids at
  // a/b 1.2-2.3. The ratio is the invariant; its direction is not.
  //
  // `cover` was a gate and is now only a report. Across the same frames it
  // rejected three correct reads and not one false one -- clutter covers
  // 0.48-1.36, real marks 0.41-1.59, so it never separated anything. It
  // survives as a floor against a degenerate huddle, nothing more.
  if (!geo || geo.length < 5) return null;
  let pts = geo;
  const shs = geo
    .filter((g) => g.sup >= 9 && g.d < L.R - 3)
    .map((g) => g.wHalf / Math.sqrt(L.R * L.R - g.d * g.d))
    .sort((x, z) => x - z);
  if (shs.length >= 3) {
    const sh = shs[shs.length >> 1];
    const keep = geo.filter((g) => {
      const q = L.R * L.R - (g.wHalf / sh) * (g.wHalf / sh);
      return Math.abs(g.d - Math.sqrt(Math.max(0, q))) < 3;
    });
    if (keep.length >= 5) pts = keep;
  }
  const vFit = (list) => {
    let best = null;
    let yLo = Infinity, yHi = -Infinity;
    for (const g of list) { if (g.y < yLo) yLo = g.y; if (g.y > yHi) yHi = g.y; }
    for (let yc = yLo; yc <= yHi; yc += 1) {
      let sz2 = 0, szd = 0;
      for (const g of list) { const z = Math.abs(g.y - yc); sz2 += z * z; szd += z * g.d; }
      if (sz2 < 1e-9) continue;
      const gS = szd / sz2;
      if (!(gS > 0)) continue;
      let rss = 0;
      for (const g of list) { const e = g.d - Math.abs(g.y - yc) * gS; rss += e * e; }
      if (!best || rss < best.rss) best = { yc, gS, rss };
    }
    return best;
  };
  let fit = vFit(pts);
  if (!fit) return null;
  const resid = pts.map((g) => Math.abs(g.d - Math.abs(g.y - fit.yc) * fit.gS));
  const mad = resid.slice().sort((x, z) => x - z)[resid.length >> 1] || 0.5;
  const kept = pts.filter((g, i) => resid[i] <= 2.5 * mad);
  if (kept.length >= 5) { pts = kept; fit = vFit(pts) ?? fit; }
  const b = L.R / fit.gS;
  const yc = fit.yc;
  let yLo = Infinity, yHi = -Infinity;
  for (const g of pts) { if (g.y < yLo) yLo = g.y; if (g.y > yHi) yHi = g.y; }
  const cover = (yHi - yLo) / b;
  const feet = pts.map((g) => g.foot).sort((x, z) => x - z);
  const xc = feet[feet.length >> 1];
  const ws = [];
  for (const g of pts) {
    const q = 1 - ((g.y - yc) / b) ** 2;
    if (q > 0.15) ws.push(g.wHalf / Math.sqrt(q));
  }
  ws.sort((x, z) => x - z);
  const a = ws.length >= 3 ? ws[ws.length >> 1] : null;
  const aSpread = a == null ? null
    : (ws[Math.min(ws.length - 1, Math.round(0.75 * (ws.length - 1)))]
      - ws[Math.round(0.25 * (ws.length - 1))]) / a;
  const aspect = a == null ? null : a / b;                        // signed, for diagnostics
  const axisRatio = a == null ? null : Math.min(a, b) / Math.max(a, b);
  // A mark foreshortened past ~1:3 has a minor axis too short to carry 14
  // rings, so it could not have been read anyway -- the floor is readability,
  // not geometry.
  const why =
    a == null ? "no-width"
      : axisRatio < (L.minAxisRatio ?? 1 / 3) ? "aspect"
        : cover < (L.minCover ?? 0.3) ? "cover"
          : null;
  // id and centre survive a shaky width; the ANGLE does not, so it gets its
  // own bar. A scattered width fit still puts the mark in the right place.
  const angleOk = aSpread != null && aSpread <= (L.maxASpread ?? 0.35);
  return {
    xc, yc, a, b, cover, aspect, axisRatio, aSpread,
    tiltDeg: a == null || !angleOk ? null : (Math.acos(axisRatio) * 180) / Math.PI,
    rows: pts.length,
    plausible: why === null,
    why
  };
});};
const _1jt47m8 = function _analyzeFrameMan(rotateFrame,unrotatePoint,manLayout,edges1Dsub,detectRowMan,fitManPose) {return (function analyzeFrameMan(frame, opts = {}) {
  // Whole frame, several man marks. Same shape as analyzeFrame so the live
  // rig can dispatch on mark family, but there is no coarse/fine split: the
  // §11 cascade locks geometry on ~all rows that cross a mark, so a single
  // uniform lattice already puts many rows through every mark. Coarse-to-fine
  // existed because §3's detector decoded only near the equator.
  //
  // Clustering is on the FOOT (the involution's fixed point = the mark's
  // centre column for that row), not on decoded ids: geometry survives rows
  // whose payload does not, so clustering on ids would discard the rows that
  // make the pose fit work.
  //
  // A cluster is reported only if it survives BOTH an id vote and a plausible
  // pose. The two are independent evidence -- the payload gate lives in
  // solveMan's boundary checks, the shape gate in fitManPose's verdict -- so
  // ordinary scene clutter, which produces plenty of one and almost none of
  // the other, does not reach the caller as a mark.
  //
  // The cluster rules are exposed as options ONLY so the calibration rig can
  // sweep them (§11.5). Every default below is the value that was hardcoded
  // here before, so an unparameterised call behaves exactly as it did; the
  // pose gates live on the layout object and are overridden the same way, by
  // passing a modified opts.layout.

  // ---- opts.bothAxes: scan the columns as well -------------------------
  //
  // The centre estimate is anisotropic, and the asymmetry is structural, not
  // noise. Along a scan row the centre column is the involution's fixed
  // point: MEASURED, on every row that reads. Across rows the centre is
  // wherever the d-space V-fit extrapolates |d| -> 0, which no row ever
  // observes. §11.3 measured the gap on one photograph turned four ways:
  // 23px of spread on the measured coordinate against 64px on the
  // extrapolated one.
  //
  // Scanning the transposed frame turns that around, so between them the two
  // passes measure both coordinates directly. Each keeps the coordinate it
  // measured and discards the one it guessed.
  //
  // This is DELIBERATELY off by default: it is two full passes for one frame
  // and the realtime detector cannot afford it. It is for the in-notebook
  // demos and the calibration rig, where the frame rate does not matter and a
  // stable centre does -- the rig's labels come from a homography through
  // these centres, so a 6px error in y is 6px of error in the ground truth
  // every later sweep is scored against.
  //
  // The second pass also pays for itself twice: where both passes see a mark,
  // their disagreement is an ERROR BAR measured against an independent set of
  // measurements rather than a self-assessment. On the §11.1 test scene the
  // worst disagreement was 5.2px against a true worst y error of 6.0px, so it
  // is the right size to believe.
  //
  // rotateFrame is an exact index permutation -- no resampling, so the second
  // pass sees the same photons and not an interpolation of them.
  if (opts.bothAxes) {
    const single = { ...opts, bothAxes: false };
    const t0 = window.performance.now();
    const rows = analyzeFrameMan(frame, single);
    const rot = analyzeFrameMan(rotateFrame(frame, 1), single);
    // Map the rotated pass back into frame coordinates. The ellipse axes swap
    // with the frame: what that pass measured along ITS scan is the extent in
    // image y.
    const back = (f) => {
      const p = unrotatePoint(f.xc, f.yc, 1, frame.w, frame.h);
      return { ...f, xc: p.x, yc: p.y, a: f.b, b: f.a };
    };
    const cols = rot.fused.map(back);
    const used = new Set();
    const fused = [], conflicts = [];
    let worstCross = 0, bothN = 0;
    for (const r of rows.fused) {
      // Same id, and close enough to be the same piece of paper. The tolerance
      // is a fraction of the mark's own size so it travels with the working
      // distance instead of being a pixel count that only suits one.
      const size = r.a ?? r.wHalf ?? 24;
      let m = -1, bd = Infinity;
      for (let i = 0; i < cols.length; i++) {
        if (used.has(i) || cols[i].id !== r.id) continue;
        const d = Math.hypot(cols[i].xc - r.xc, cols[i].yc - r.yc);
        if (d < 0.8 * size && d < bd) { bd = d; m = i; }
      }
      if (m < 0) { fused.push({ ...r, axis: "row" }); continue; }
      used.add(m);
      bothN++;
      worstCross = Math.max(worstCross, bd);
      // x from the row pass, y from the column pass: each coordinate comes
      // from the pass that measured it rather than the one that extrapolated
      // it. Same for the two ellipse axes.
      fused.push({
        ...r, xc: r.xc, yc: cols[m].yc, a: r.a, b: cols[m].b ?? r.b,
        axis: "both", crossPx: +bd.toFixed(2)
      });
    }
    const rowIds = new Set(rows.fused.map((f) => f.id));
    for (let i = 0; i < cols.length; i++) {
      if (used.has(i)) continue;
      if (rowIds.has(cols[i].id)) {
        // Both passes claim this id, too far apart to be the same mark. One of
        // them is wrong and there is nothing here that says which, so keep the
        // row pass -- that is what ships -- and report the disagreement rather
        // than emitting a duplicate id for fitHexPose to trip over.
        conflicts.push({ id: cols[i].id, x: +cols[i].xc.toFixed(1), y: +cols[i].yc.toFixed(1) });
        continue;
      }
      fused.push({ ...cols[i], axis: "col" });
    }
    return {
      fused,
      unidentified: [...rows.unidentified, ...rot.unidentified.map(back)],
      conflicts,
      bothAxes: bothN,
      worstCrossPx: +worstCross.toFixed(2),
      axes: { rows, cols: rot },
      rowsTried: rows.rowsTried + rot.rowsTried,
      rowHits: rows.rowHits + rot.rowHits,
      ms: window.performance.now() - t0
    };
  }

  const L = opts.layout ?? manLayout;
  const stride = opts.stride ?? 6;
  const thr = opts.edgeThreshold ?? 12;
  const minRows = opts.minRows ?? 3;      // rows before a cluster is a candidate
  const minVotes = opts.minVotes ?? 2;    // rows that must agree on the id
  const voteRatio = opts.voteRatio ?? 2;  // winner must beat runner-up by this
  const gray = frame.gray, w = frame.w, h = frame.h;
  const t0 = window.performance.now();
  const clusters = [];
  let rowsTried = 0, rowHits = 0;
  for (let y = Math.floor(stride / 2); y < h; y += stride) {
    rowsTried++;
    const se = edges1Dsub(gray.subarray(y * w, (y + 1) * w), thr);
    for (const hit of detectRowMan(se, opts)) {
      rowHits++;
      let best = null, bestD = Infinity;
      for (const c of clusters) {
        if (y - c.lastY > 4 * stride) continue;
        const dx = Math.abs(c.foot - hit.foot);
        const tol = Math.max(10, 0.35 * Math.max(c.wHalf, hit.wHalf));
        if (dx < tol && dx < bestD) { bestD = dx; best = c; }
      }
      if (!best) {
        best = { rows: [], votes: new Map(), foot: hit.foot, wHalf: hit.wHalf, lastY: y };
        clusters.push(best);
      }
      best.rows.push({ y, d: hit.d, sup: hit.sup, wHalf: hit.wHalf, foot: hit.foot });
      if (hit.id != null) best.votes.set(hit.id, (best.votes.get(hit.id) ?? 0) + 1);
      best.lastY = y;
      best.foot = hit.foot;
      best.wHalf = Math.max(best.wHalf, hit.wHalf);
    }
  }
  const all = [];
  for (const c of clusters) {
    if (c.rows.length < minRows) continue;
    let id = null, bestN = 0, secondN = 0;
    for (const [k, v] of c.votes) {
      if (v > bestN) { secondN = bestN; bestN = v; id = k; }
      else if (v > secondN) secondN = v;
    }
    if (!(bestN >= minVotes && bestN >= voteRatio * secondN)) id = null;
    const pose = fitManPose(c.rows, L);
    const ys = c.rows.map((r) => r.y);
    all.push({
      id,
      xc: pose ? pose.xc : c.rows.map((r) => r.foot).sort((a, b) => a - b)[c.rows.length >> 1],
      yc: pose ? pose.yc : (Math.min(...ys) + Math.max(...ys)) / 2,
      a: pose ? pose.a : null,
      b: pose ? pose.b : null,
      tiltDeg: pose && pose.plausible ? pose.tiltDeg : null,
      cover: pose ? pose.cover : null,
      aspect: pose ? pose.aspect : null,
      axisRatio: pose ? pose.axisRatio : null,
      posed: !!(pose && pose.plausible),
      why: pose ? pose.why : "no-fit",
      rows: c.rows.length,
      voteMargin: bestN - secondN,
      wHalf: c.wHalf
    });
  }
  return {
    fused: all.filter((f) => f.id != null && f.posed),
    // located but not confirmed: kept separate so a caller can show them
    // (useful when aiming the camera) without treating them as detections
    unidentified: all.filter((f) => !(f.id != null && f.posed)),
    rowsTried, rowHits, ms: window.performance.now() - t0
  };
});};
const _ujkuco = function _manScene(manLayout,renderManFrame) {
  // One 960x540 frame with four man marks of different sizes and yaws, plus the
  // truth the renderer used to draw them. Shared by every whole-frame check
  // that wants a known answer (manSceneTest, manAxesTest) so they cannot end up
  // measuring subtly different scenes and disagreeing for the wrong reason.
  const SCENE = [
    { id: 45, W: 55, yaw: 0, x: 150, y: 140 },
    { id: 9, W: 40, yaw: 30, x: 430, y: 130 },
    { id: 62, W: 70, yaw: 50, x: 700, y: 300 },
    { id: 21, W: 33, yaw: 15, x: 300, y: 400 }
  ];
  const W = 960, H = 540;
  const gray = new Uint8Array(W * H).fill(128);
  const truth = [];
  for (const m of SCENE) {
    const bits = [];
    for (let i = manLayout.nBits - 1; i >= 0; i--) bits.push((m.id >> i) & 1);
    const f = renderManFrame(bits, { W: m.W, yawDeg: m.yaw, blur: 1.0, noise: 3, seed: m.id });
    for (let y = 0; y < f.h; y++) {
      const ty = m.y + y;
      if (ty < 0 || ty >= H) continue;
      for (let x = 0; x < f.w; x++) {
        const tx = m.x + x;
        if (tx < 0 || tx >= W) continue;
        gray[ty * W + tx] = f.gray[y * f.w + x];
      }
    }
    truth.push({ ...m, xc: m.x + f.cx, yc: m.y + f.cy, aTrue: f.aTrue, bTrue: f.bTrue });
  }
  return { gray, w: W, h: H, truth };
};
const _1xa2cta = function _manSceneTest(manScene,analyzeFrameMan) {
  // Ground-truth regression for the whole-frame cascade: four man marks of
  // different sizes and yaws composited into one 960x540 scene. Checks id,
  // centre and tilt against what was rendered, so a change to the pose guards
  // (aspect / cover) cannot quietly trade recall for a clean FP count.
  //
  // The scene itself lives in manScene, so this and manAxesTest grade the same
  // pixels. Two regressions quietly drifting apart on two nearly-identical
  // scenes is a way to have neither of them mean anything.
  const { gray, w: W, h: H, truth } = manScene;
  const lines = [];
  const runs = [
    { stride: 6 },
    { stride: 4 },
    // The orthogonal option, on the same scene, so its cost and its benefit
    // sit next to the default rather than in a separate note.
    { stride: 4, bothAxes: true }
  ];
  for (const opts of runs) {
    const res = analyzeFrameMan({ gray, w: W, h: H }, opts);
    let ok = 0;
    const rows = truth.map((t) => {
      const hit = res.fused.find((f) => Math.hypot(f.xc - t.xc, f.yc - t.yc) < 0.5 * t.bTrue);
      if (hit && hit.id === t.id) ok++;
      return hit
        ? `#${t.id}${hit.id === t.id ? "" : `!=${hit.id}`} W${t.W} yaw${t.yaw}` +
          ` -> tilt ${hit.tiltDeg.toFixed(0)} b ${hit.b.toFixed(0)}/${t.bTrue.toFixed(0)}` +
          ` cov ${hit.cover.toFixed(2)} asp ${hit.aspect.toFixed(2)}` +
          ` err ${Math.hypot(hit.xc - t.xc, hit.yc - t.yc).toFixed(1)}px`
        : `#${t.id} W${t.W} yaw${t.yaw} -> MISSED`;
    });
    const wrong = res.fused.filter(
      (f) => !truth.some((t) => Math.hypot(f.xc - t.xc, f.yc - t.yc) < 0.5 * t.bTrue)
    );
    lines.push(
      `stride ${opts.stride}${opts.bothAxes ? " bothAxes" : ""}: ` +
      `${ok}/${truth.length} correct, ${wrong.length} spurious,` +
      ` ${res.unidentified.filter((u) => u.posed).length} located-unread, ${res.ms.toFixed(0)}ms\n  ` +
      rows.join("\n  ") +
      (wrong.length ? "\n  SPURIOUS: " + wrong.map((f) => `#${f.id}@${f.xc | 0},${f.yc | 0}`).join(" ") : "")
    );
  }
  return lines.join("\n");
};
const _11vsmkp = function _axes_md(md) {return (md`#### Scanning the other way

Everything above scans **rows**, and that leaves the two coordinates of a centre
measured very differently. Along a row the centre column is the involution's
fixed point — a number the solve produces directly, on every row that reads.
The centre *row* is never observed by anything: it is where the V-fit
extrapolates $|d| \\to 0$, off the end of the rows that actually saw the mark.
§11.3 caught this with one photograph turned four ways, and the two coordinates
disagreed by 23px and 64px respectively.

So \`analyzeFrameMan\` takes **\`bothAxes\`**: run the cascade again on the
transposed frame and let each coordinate come from the pass that measured it.
\`rotateFrame\` is an exact index permutation, so the second pass sees the same
photons rather than an interpolation of them.

On the four-mark scene (\`manAxesTest\`, graded against the renderer's truth,
which neither pass sees):

| | x mean | x worst | y mean | y worst |
|---|---|---|---|---|
| rows only | 0.12px | 0.31px | 2.75px | 6.00px |
| columns only | 1.01px | 1.53px | 0.96px | 1.23px |
| **bothAxes** | **0.12px** | **0.31px** | **0.96px** | **1.23px** |

Each pass is good at one coordinate and poor at the other, exactly as the
argument predicts, and taking each from its own measurer costs nothing in
recall. The same thing happens to the ellipse: rows-only reported the 40px mark
as \`b\` 32, and with both axes every mark's minor axis comes back exact
(\`manSceneTest\`). That matters more than it looks, because \`fitHexPose\` turns
\`b\` into the \`radiusPx\` it grades marks against.

It is **off by default**. It is two full passes for one frame, and the realtime
detector cannot spend that — this is for the demos and for §11.5's rig, where
the frame rate is irrelevant and the stored ground truth is a homography
through these very centres.

The second pass pays once more, in a currency the single pass has none of:
where both passes see the same mark, **their disagreement is an error bar**
built from an independent set of measurements rather than from the fit's
opinion of itself. On this scene the worst disagreement was 5.5px against a
true worst y error of 6.0px — the right size to believe. Compare
[§11.5](#hexRig_md), where a fit's own residual claimed 1.39px while the labels
it produced were 66px out.`);};
const _9mkcus = function _manAxesTest(manScene,analyzeFrameMan,rotateFrame,unrotatePoint) {
  // Does scanning the other way actually buy anything? Measured against the
  // renderer's truth, which neither pass sees, on the same four-mark scene the
  // cascade regression uses.
  //
  // The prediction the anisotropy argument makes is specific, and it is the
  // only thing worth checking: the ROW scan should be good in x and poor in y,
  // the COLUMN scan the other way round, and taking each coordinate from the
  // pass that measured it should beat both. A wash would mean the anisotropy
  // is not the dominant error at this scale and the second pass is not worth
  // its 2x.
  const S = manScene;
  const opts = { stride: 4 };
  // Warm up before timing anything. Without this the first call carries the
  // JIT and the two-pass version appears FASTER than the one-pass version,
  // which is nonsense and exactly the kind of number that gets quoted later.
  analyzeFrameMan(S, opts);
  analyzeFrameMan(rotateFrame(S, 1), opts);

  const t1 = window.performance.now();
  const rows = analyzeFrameMan(S, opts);
  const msRows = window.performance.now() - t1;
  const cols = analyzeFrameMan(rotateFrame(S, 1), opts).fused.map((f) => {
    const p = unrotatePoint(f.xc, f.yc, 1, S.w, S.h);
    return { ...f, xc: p.x, yc: p.y, a: f.b, b: f.a };
  });
  const t2 = window.performance.now();
  const both = analyzeFrameMan(S, { ...opts, bothAxes: true });
  const msBoth = window.performance.now() - t2;

  const err = (list) => {
    const dx = [], dy = [];
    let found = 0;
    for (const t of S.truth) {
      const hit = list.find((f) => f.id === t.id);
      if (!hit) continue;
      found++;
      dx.push(Math.abs(hit.xc - t.xc));
      dy.push(Math.abs(hit.yc - t.yc));
    }
    const worst = (v) => (v.length ? Math.max(...v) : null);
    const mean = (v) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : null);
    return { found, xWorst: worst(dx), xMean: mean(dx), yWorst: worst(dy), yMean: mean(dy) };
  };
  const f2 = (v) => (v == null ? "—" : v.toFixed(2));
  const line = (name, e, extra) =>
    `${name.padEnd(22)} ${e.found}/4 marks   x ${f2(e.xMean)} mean / ${f2(e.xWorst)} worst   ` +
    `y ${f2(e.yMean)} mean / ${f2(e.yWorst)} worst${extra ?? ""}`;

  const eR = err(rows.fused), eC = err(cols), eB = err(both.fused);
  const out = [
    line("rows only (default)", eR, `   ${msRows.toFixed(0)}ms`),
    line("columns only", eC),
    line("bothAxes: true", eB, `   ${msBoth.toFixed(0)}ms — it is two passes, and it costs two`),
    "",
    `${both.bothAxes}/${both.fused.length} detections seen by both passes; ` +
    `${both.conflicts.length} id conflict(s); ` +
    `worst cross-pass disagreement ${both.worstCrossPx}px`,
    `(that disagreement is the same size as the row scan's actual worst y error, ` +
    `${f2(eR.yWorst)}px — so it is a usable error bar and not just a number)`,
    ""
  ];

  // The claim being tested, stated as pass/fail rather than left to the reader.
  const checks = [
    ["row scan is better in x than in y", eR.yMean > eR.xMean],
    ["column scan is better in y than in x", eC.xMean > eC.yMean],
    ["both-axes y beats row-only y", eB.yMean <= eR.yMean],
    ["both-axes x is no worse than row-only x", eB.xMean <= eR.xMean + 1e-9],
    ["both-axes finds no fewer marks", eB.found >= eR.found],
    ["no id conflicts on a clean scene", both.conflicts.length === 0],
    // The flag must be OFF unless asked for: every other consumer in this
    // notebook, and the realtime detector above all, calls analyzeFrameMan
    // without it and must be getting the single-pass result.
    ["default call is single-pass", rows.bothAxes === undefined && rows.axes === undefined]
  ];
  for (const [what, ok] of checks) out.push(`${ok ? "ok  " : "FAIL"} ${what}`);
  out.push("", checks.every(([, ok]) => ok) ? "PASS" : "FAIL");
  return out.join("\n");
};
const _15441wy = function _markFamily(Inputs) {return (Inputs.radio(["man", "classic"], {
  label: "mark family",
  value: "man",
  format: (x) =>
    x === "man" ? "man (§11) — 64 ids, reports tilt" : "classic (§1) — 14 ids"
}));};
const _gbwp1t = (G, _) => G.input(_);
const _1az419w = function _grabPanel(liveVideo) {
  // Capture bench: grab the live camera frame and keep it, so real-world
  // frames can be collected without a second device. A programmatic download
  // is blocked on a file:// page, so saving is a click on a real link.
  const shots = [];
  const el = window.document.createElement("div");
  el.style.cssText = "font:13px system-ui,sans-serif";
  const bar = window.document.createElement("div");
  bar.style.cssText = "display:flex;gap:10px;align-items:center;margin-bottom:8px";
  const btn = window.document.createElement("button");
  btn.textContent = "grab frame";
  btn.style.cssText = "font:13px system-ui;padding:5px 12px";
  const note = window.document.createElement("span");
  note.style.cssText = "color:var(--theme-foreground-muted,#888)";
  const strip = window.document.createElement("div");
  strip.style.cssText = "display:flex;gap:10px;flex-wrap:wrap";
  bar.append(btn, note);
  el.append(bar, strip);

  const grab = (url, w, h) => {
    const n = shots.length + 1;
    const name = `man-frame-${String(n).padStart(2, "0")}-${w}x${h}.png`;
    shots.push({ name, url, w, h });
    const card = window.document.createElement("div");
    card.style.cssText = "width:150px";
    const a = window.document.createElement("a");
    a.href = url;
    a.download = name;
    a.title = "click to save";
    const img = window.document.createElement("img");
    img.src = url;
    img.style.cssText = "width:150px;display:block;border:1px solid #4444";
    a.appendChild(img);
    const cap = window.document.createElement("div");
    cap.style.cssText = "font:11px ui-monospace,monospace;padding-top:3px";
    cap.textContent = name;
    card.append(a, cap);
    strip.appendChild(card);
    note.textContent = `${shots.length} frame${shots.length === 1 ? "" : "s"} — click a thumbnail to save`;
    el.value = shots;
    el.dispatchEvent(new window.Event("input", { bubbles: true }));
  };

  // adopt the frame already grabbed by hand
  if (window.__lastGrab) {
    const im = new window.Image();
    im.onload = () => grab(window.__lastGrab, im.naturalWidth, im.naturalHeight);
    im.src = window.__lastGrab;
  }

  btn.onclick = () => {
    const v = liveVideo;
    if (!v || v.readyState < 2 || !v.videoWidth) { note.textContent = "no video"; return; }
    const w = v.videoWidth, h = v.videoHeight;
    const cv = window.document.createElement("canvas");
    cv.width = w; cv.height = h;
    cv.getContext("2d").drawImage(v, 0, 0, w, h);
    grab(cv.toDataURL("image/png"), w, h);
  };
  el.value = shots;
  return el;
};
const _qag4z6 = (G, _) => G.input(_);
const _1p7i4wb = function _manPrint_md(md) {return (md`### §11.2 Printable man marks

Same print rules as §10 — the whole page floods mid-gray, nested discs, mm
sizing. Two differences worth having. **All 64 ids are usable**: Manchester
guarantees a transition in every cell, so no payload can resemble featureless
paint and nothing needs reserving. **The mark shown tracks the demo's id
slider**, so what the detector above is reading is what you would print. The
loop-closing test — print one, point the §0 camera at it — needs the live
tracker switched to the man cascade, which is the next step once these marks
exist on paper.`);};
const _19a2bc6 = function _manMarkSvgSource(manLayout,manColor) {return (function manMarkSvgSource(id, opts = {}) {
  // A man mark as standalone SVG, mm-sized, same conventions as §10:
  // mid-gray page flood, nested full discs outside-in. Unlike the old code,
  // ALL 64 ids are usable -- Manchester guarantees a transition per cell, so
  // no payload ever resembles featureless paint.
  const L = opts.layout ?? manLayout;
  const bits = Array.from({ length: L.nBits }, (_, j) => (id >> (L.nBits - 1 - j)) & 1);
  const dMm = opts.diameterMm ?? 60;
  const padFrac = opts.padFrac ?? 0.35;
  const label = opts.label !== false;
  const scale = dMm / 2 / L.R;
  const half = L.R * (1 + padFrac) * scale;
  const w = +(2 * half).toFixed(3);
  const labelMm = label ? 6 : 0;
  const h = +(w + labelMm).toFixed(3);
  // band boundaries 0, teeth..., R; color from the radial profile midpoint
  const bounds = [0, ...L.teeth];
  const discs = [];
  for (let i = bounds.length - 1; i >= 1; i--) {
    const mid = (bounds[i - 1] + bounds[i]) / 2;
    const dark = manColor(mid, bits, L) < 128;
    discs.push(
      `<circle cx="${half.toFixed(3)}" cy="${half.toFixed(3)}" r="${(bounds[i] * scale).toFixed(3)}" fill="${dark ? "#000000" : "#ffffff"}"/>`
    );
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}mm" height="${h}mm" viewBox="0 0 ${w} ${h}">
<rect width="${w}" height="${h}" fill="#808080"/>
${discs.join("\n")}
${label ? `<text x="${half.toFixed(3)}" y="${(h - 1.6).toFixed(3)}" font-family="monospace" font-size="4" fill="#e8e8e8" text-anchor="middle">man ${id}</text>` : ""}
</svg>`;
});};
const _snxhn8 = function _manPrintPanel(manDemoCfg,manMarkSvgSource,manLayout,manColor,htl) {
  // The demo id as a printable mark, plus an A4 sheet of the first 12 ids.
  // data: URIs, not blob: -- a file:// page refuses blob: as a resource.
  const id = manDemoCfg.id;
  const one = manMarkSvgSource(id, { diameterMm: 60 });
  const sheetIds = Array.from({ length: 12 }, (_, i) => i + 1);
  const dMm = 60, padFrac = 0.35, pageW = 210, pageH = 297, margin = 10;
  const tile = dMm * (1 + padFrac), labelMm = 6;
  const cols = Math.max(1, Math.floor((pageW - 2 * margin) / tile));
  const parts = [];
  sheetIds.forEach((sid, n) => {
    const cx = margin + (n % cols) * tile + tile / 2;
    const cy = margin + Math.floor(n / cols) * (tile + labelMm) + tile / 2;
    const scale = dMm / 2 / manLayout.R;
    const bits = Array.from({ length: manLayout.nBits }, (_, j) => (sid >> (manLayout.nBits - 1 - j)) & 1);
    const bounds = [0, ...manLayout.teeth];
    for (let i = bounds.length - 1; i >= 1; i--) {
      const mid = (bounds[i - 1] + bounds[i]) / 2;
      const dark = manColor(mid, bits) < 128;
      parts.push(`<circle cx="${cx.toFixed(2)}" cy="${cy.toFixed(2)}" r="${(bounds[i] * scale).toFixed(2)}" fill="${dark ? "#000000" : "#ffffff"}"/>`);
    }
    parts.push(`<text x="${cx.toFixed(2)}" y="${(cy + tile / 2 + 4.2).toFixed(2)}" font-family="monospace" font-size="4" fill="#3a3a3a" text-anchor="middle">man ${sid} &#183; ${dMm}mm</text>`);
  });
  const sheet = `<svg xmlns="http://www.w3.org/2000/svg" width="${pageW}mm" height="${pageH}mm" viewBox="0 0 ${pageW} ${pageH}">
<rect width="${pageW}" height="${pageH}" fill="#808080"/>
${parts.join("\n")}
</svg>`;
  const uri = (svg) => "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  return htl.html`<div style="display:flex;gap:1.5em;align-items:flex-start;flex-wrap:wrap">
  <div>
    <img src=${uri(one)} style="width:220px;display:block"/>
    <div style="font:12px ui-monospace,monospace;padding:4px 0">
      <a href=${uri(one)} download=${`man-${id}-60mm.svg`}>download man ${id} (60mm)</a>
    </div>
  </div>
  <div style="font:13px ui-monospace,monospace">
    <div><a href=${uri(sheet)} download="man-sheet-a4.svg">download A4 sheet (ids 1–12, 60mm)</a></div>
    <div style="opacity:.65;max-width:28em;padding-top:6px">Print at 100% scale. The gray flood is part of the mark — do not trim to the rim.</div>
  </div>
</div>`;
};
const _tivpeh = function _manTestBank_md(md) {return (md`### §11.3 A frame bank for the man family

The bank further up this notebook is the **classic** mark's: real captures of §1
marks through the mirror rig, replayed through \`analyzeFrame\`. Switching the
live demo to the man family left it testing a detector the headline no longer
runs, so §11 needs its own — same idea, different mark, different pipeline
(\`analyzeFrameMan\`), and one frame so far.

That frame is a hand-held webcam capture of the §11.2 sheet displayed on a phone
screen, tipped away from the camera. It is stored as a **760×540 crop** of the
1280×960 original, and the crop is the point: a man mark needs roughly four
pixels per tooth, so resizing 1280→960 to save space took the same frame from
five marks read to two. A downscaled bank frame measures the resize filter, not
the detector. Crop, never resample.

**The rotation trick applies more than ever.** Each frame is replayed at four
quarter turns, which costs no storage — a quarter turn is an exact index
permutation of the pixels already here. For a detector that reads along *rows*
that is not a repeat measurement: every turn puts different chords through every
mark, different specular streaks along the scan line, different neighbours in
each row. Upright this frame yields 5 of 6 ids; 180° yields 3; 270° yields all 6.
The union is 6/6 from one photograph.

**And the four turns expose an anisotropy worth naming.** Within a row, a mark's
centre is the involution's fixed point — measured directly, on every row that
crosses the mark. Across rows it is where the V-fit says the chord offset reaches
zero — an *extrapolation* from rows that never touch the centre. Turns 0 and 180
scan along the image's x, turns 90 and 270 along its y, so comparing x at 0 vs
180 compares two direct measurements while comparing y at 0 vs 180 compares two
extrapolations. On this frame those disagree by **23 px and 64 px** respectively.
Rolling them into one number would have hidden which half is weak.

So the bank checks them separately, and the weak half pays for itself: taking
each coordinate from the pair of turns that measured it *directly* gives a fused
fix better than any single turn of the same photograph. Ids seen at all four
turns get one.

The thresholds below are floors set at what the pipeline currently achieves, not
targets — the same convention as the classic bank. \`maxAcrossPx\` is deliberately
the loose one: it bounds an extrapolation, and tightening it would only discover
that the extrapolation is still an extrapolation.`);};
const _rtuzun = function _unrotatePoint() {return (function unrotatePoint(x, y, turns, w, h) {
  // Inverse of rotateFrame's index permutation: a point measured in the ROTATED
  // frame, back in original-frame coordinates. w,h are the ORIGINAL dimensions.
  //
  // Exact up to the pixel-boundary convention: subpixel edge positions come
  // back with a constant ~1px offset under a flip, because an edge lying
  // between pixels i and i+1 is not the same continuous coordinate as the
  // flipped index of pixel i. Both frame banks use this, so the two cannot
  // drift apart on the one piece of arithmetic they share.
  const t = ((turns % 4) + 4) % 4;
  return t === 1 ? { x: y, y: h - 1 - x }
    : t === 2 ? { x: w - 1 - x, y: h - 1 - y }
      : t === 3 ? { x: w - 1 - y, y: x }
        : { x, y };
});};
const _rp63e7 = function _manFrames() {return ([
  {
    file: "frame-man-phone.png",
    name: "man sheet on a phone screen, hand-held and tipped",
    truthIds: [1, 2, 3, 4, 5, 6],
    note:
      "A 760x540 crop of a 1280x960 webcam frame: the §11.2 A4 sheet (ids 1-6) " +
      "displayed on a phone, held in a hand, tipped about a roughly horizontal " +
      "axis, with a specular streak across the lower right and one mark clipped " +
      "by the crop. Cropped, never resized -- a man mark needs about 4 pixels " +
      "per tooth, and resampling 1280 to 960 took this same frame from five " +
      "marks read to two, so a resized bank frame would measure the filter " +
      "rather than the detector. " +
      "It is here because it caught two things the simulator could not. The " +
      "pose foreshortens VERTICALLY, which the renderer never produced, and " +
      "the aspect gate was rejecting correct ids for being wider than tall. " +
      "And replaying it through four quarter turns showed the centre estimate " +
      "is not isotropic: along the scan direction it is measured, across it is " +
      "extrapolated, and the two differ by 23px against 64px here.",
    // Bars set from what this frame measures, as regression tripwires rather
    // than accuracy claims. maxAcrossPx is deliberately the loose one: it is
    // bounding an extrapolation, and tightening it would only mean discovering
    // that the extrapolation is still an extrapolation.
    expect: { minUprightIds: 4, minUnionIds: 6, maxSpurious: 0, maxAlongPx: 25, maxAcrossPx: 80 }
  }
]);};
const _1g7o2un = async function _manFrameBank(manFrames,testFrameFiles) {
  // Same decode as testFrameBank, same luma weights, so a bank frame is
  // byte-for-byte the input liveRun would have handed the detector.
  const bank = [];
  for (const spec of manFrames) {
    const fa = testFrameFiles.get(spec.file);
    if (!fa) throw new Error(`manFrames names ${spec.file}, which testFrameFiles does not map`);
    const img = await fa.image();
    const c = window.document.createElement("canvas");
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);
    const px = ctx.getImageData(0, 0, c.width, c.height).data;
    const gray = new Uint8Array(c.width * c.height);
    for (let i = 0, p = 0; i < gray.length; i++, p += 4)
      gray[i] = (px[p] * 77 + px[p + 1] * 150 + px[p + 2] * 29) >> 8;
    bank.push({ ...spec, frame: { gray, w: c.width, h: c.height } });
  }
  return bank;
};
const _nuw7s5 = function _manFrameResults(manFrameBank,rotateFrame,analyzeFrameMan,unrotatePoint) {
  // Replay the man bank through the same analyzeFrameMan the live rig uses.
  // No camera, no permission prompt, same answer on any machine.
  //
  // Each frame is run at four quarter turns. That is not padding: this
  // detector reads along ROWS, so a quarter turn is a genuinely different
  // instrument pointed at the same optics -- different chords through every
  // mark, different specular streaks, different neighbours in each scan line.
  // Four turns of one photograph is closer to four experiments than to one,
  // which is what makes a hand-held frame worth the megabyte it costs.
  //
  // The checks need no reference data except the id set, which for a printed
  // sheet is known: an id outside it is a false positive however confident the
  // fit was, and a mark's position cannot depend on which way up the frame is.
  //
  // The position check is SPLIT along and across the scan direction, because
  // the two are not the same measurement. Within a row the mark's centre is
  // the involution's fixed point -- measured directly, on every row. Across
  // rows it is where the V-fit says |d| reaches zero -- an extrapolation.
  // Turns 0 and 180 scan along the image's x; turns 90 and 270 scan along its
  // y. So x0-vs-x180 and y90-vs-y270 compare two DIRECT measurements, while
  // y0-vs-y180 and x90-vs-x270 compare two extrapolations. Rolling both into
  // one number would hide which half is weak, and the weak half is the useful
  // finding -- it is also why fusedAt exists: take each coordinate from the
  // pair of turns that measured it directly and one photograph yields a fix
  // better than any single turn of it.
  const TURNS = [0, 1, 2, 3];
  const out = [];
  for (const spec of manFrameBank) {
    const { w, h } = spec.frame;
    const truth = new Set(spec.truthIds ?? []);
    const turns = [];
    for (const t of TURNS) {
      const fr = rotateFrame(spec.frame, t);
      const r = analyzeFrameMan(fr, { stride: 4 });
      turns.push({
        turn: t,
        deg: t * 90,
        ids: r.fused.map((f) => f.id).sort((a, b) => a - b),
        spurious: r.fused.map((f) => f.id).filter((id) => !truth.has(id)),
        withAngle: r.fused.filter((f) => f.tiltDeg != null).length,
        located: r.unidentified.filter((u) => u.posed).length,
        rowHits: r.rowHits,
        ms: r.ms,
        at: new Map(r.fused.map((f) => [f.id, unrotatePoint(f.xc, f.yc, t, w, h)]))
      });
    }
    const ids = new Set(turns.flatMap((r) => r.ids));
    const unionIds = [...ids].sort((a, b) => a - b);
    const [t0, t90, t180, t270] = turns;
    let along = 0, across = 0, alongN = 0, acrossN = 0, fusedN = 0;
    const perId = [];
    for (const id of ids) {
      const seen = turns.filter((r) => r.at.has(id));
      const A = t0.at.get(id), B = t180.at.get(id);
      const C = t90.at.get(id), D = t270.at.get(id);
      const dx = A && B ? Math.abs(A.x - B.x) : null;   // direct vs direct
      const dy = C && D ? Math.abs(C.y - D.y) : null;   // direct vs direct
      const ex = C && D ? Math.abs(C.x - D.x) : null;   // extrapolated pair
      const ey = A && B ? Math.abs(A.y - B.y) : null;   // extrapolated pair
      for (const v of [dx, dy]) if (v != null) { along = Math.max(along, v); alongN++; }
      for (const v of [ex, ey]) if (v != null) { across = Math.max(across, v); acrossN++; }
      // one coordinate from each pair of turns that measured it directly
      const fused = dx != null && dy != null
        ? { x: (A.x + B.x) / 2, y: (C.y + D.y) / 2 } : null;
      if (fused) fusedN++;
      perId.push({
        id, turnsSeen: seen.length, spurious: !truth.has(id),
        alongPx: dx == null && dy == null ? null : +Math.max(dx ?? 0, dy ?? 0).toFixed(1),
        acrossPx: ex == null && ey == null ? null : +Math.max(ex ?? 0, ey ?? 0).toFixed(1),
        fusedAt: fused ? { x: +fused.x.toFixed(1), y: +fused.y.toFixed(1) } : null
      });
    }
    perId.sort((a, b) => a.id - b.id);

    const e = spec.expect ?? {};
    const failures = [];
    if (e.minUprightIds != null && t0.ids.length < e.minUprightIds)
      failures.push(`upright wanted >=${e.minUprightIds} ids, got ${t0.ids.length} (${t0.ids.join(",")})`);
    if (e.minUnionIds != null && unionIds.length < e.minUnionIds)
      failures.push(`wanted >=${e.minUnionIds} ids over all turns, got ${unionIds.length} (${unionIds.join(",")})`);
    for (const r of turns) {
      // a duplicated id means two clusters claim one landmark: a wrong fix
      if (new Set(r.ids).size !== r.ids.length)
        failures.push(`${r.deg}deg reported a duplicate id (${r.ids.join(",")})`);
      if (e.maxSpurious != null && r.spurious.length > e.maxSpurious)
        failures.push(`${r.deg}deg read ${r.spurious.length} id(s) not on the sheet: ${r.spurious.join(",")}`);
    }
    if (e.maxAlongPx != null && alongN && along > e.maxAlongPx)
      failures.push(`along-scan disagreement ${along.toFixed(1)}px, allowed ${e.maxAlongPx}`);
    if (e.maxAcrossPx != null && acrossN && across > e.maxAcrossPx)
      failures.push(`across-scan disagreement ${across.toFixed(1)}px, allowed ${e.maxAcrossPx}`);

    out.push({
      name: spec.name,
      file: spec.file,
      note: spec.note,
      size: `${w}x${h}`,
      uprightIds: t0.ids,
      unionIds,
      truthIds: spec.truthIds,
      perTurn: turns.map((r) => ({
        deg: r.deg, ids: r.ids, withAngle: r.withAngle,
        located: r.located, rowHits: r.rowHits, ms: +r.ms.toFixed(1)
      })),
      perId,
      alongScanPx: +along.toFixed(1),
      acrossScanPx: +across.toFixed(1),
      fusedIds: fusedN,
      pass: failures.length === 0,
      failures
    });
  }
  return out;
};
const _yy59on = function _manFrameReport(htl,manFrameResults) {return (htl.html`<div style="font:13px/1.5 system-ui,sans-serif">
  ${manFrameResults.map((r) => htl.html`<div style="margin:0 0 14px 0;padding:8px 10px;border-left:3px solid ${r.pass ? "#2a7" : "#c33"};background:#0001">
    <div><b>${r.pass ? "PASS" : "FAIL"}</b> &nbsp;${r.name}
      <span style="opacity:.6">&nbsp;${r.size} &middot; sheet carries [${r.truthIds.join(", ")}]</span></div>
    <table style="border-collapse:collapse;margin:6px 0 0 0;font-variant-numeric:tabular-nums">
      <tr style="opacity:.6;text-align:left">
        <th style="padding-right:14px">turn</th><th style="padding-right:14px">ids read</th>
        <th style="padding-right:14px">with angle</th><th style="padding-right:14px">located, unread</th>
        <th style="padding-right:14px">row locks</th><th>ms</th></tr>
      ${r.perTurn.map((t) => htl.html`<tr>
        <td style="padding-right:14px">${t.deg}&deg;</td>
        <td style="padding-right:14px">${t.ids.length ? t.ids.join(", ") : "—"}</td>
        <td style="padding-right:14px">${t.withAngle}</td>
        <td style="padding-right:14px">${t.located || "—"}</td>
        <td style="padding-right:14px">${t.rowHits}</td>
        <td>${t.ms}</td></tr>`)}
    </table>
    <div style="margin-top:6px">${r.unionIds.length}/${r.truthIds.length} ids over all turns,
      ${r.uprightIds.length}/${r.truthIds.length} upright
      <span style="opacity:.6">&mdash; a quarter turn is a different instrument, not a repeat</span></div>
    <table style="border-collapse:collapse;margin:6px 0 0 0;font-variant-numeric:tabular-nums">
      <tr style="opacity:.6;text-align:left">
        <th style="padding-right:14px">id</th><th style="padding-right:14px">turns</th>
        <th style="padding-right:14px" title="direct vs direct: the involution's fixed point, measured on every row">along scan</th>
        <th style="padding-right:14px" title="extrapolation vs extrapolation: where the V-fit says |d| reaches zero">across scan</th>
        <th>fused fix</th></tr>
      ${r.perId.map((p) => htl.html`<tr style="${p.spurious ? "color:#c33" : ""}">
        <td style="padding-right:14px">#${p.id}${p.spurious ? " ✗" : ""}</td>
        <td style="padding-right:14px">${p.turnsSeen}</td>
        <td style="padding-right:14px">${p.alongPx == null ? "—" : p.alongPx + "px"}</td>
        <td style="padding-right:14px;opacity:.7">${p.acrossPx == null ? "—" : p.acrossPx + "px"}</td>
        <td>${p.fusedAt ? `${p.fusedAt.x}, ${p.fusedAt.y}` : "—"}</td></tr>`)}
    </table>
    <div style="opacity:.6;margin-top:4px">worst along-scan ${r.alongScanPx}px, worst across-scan ${r.acrossScanPx}px
      &middot; ${r.fusedIds} id${r.fusedIds === 1 ? "" : "s"} seen at all four turns, so ${r.fusedIds === 1 ? "one gets" : "those get"} a fused fix taking each coordinate from the pair of turns that measured it directly</div>
    ${r.failures.map((f) => htl.html`<div style="color:#c33">${f}</div>`)}
  </div>`)}
</div>`);};
const _js23sh = function _hexTarget_md(md) {return (md`### §11.4 A calibration target you can print

Everything so far detects marks one at a time. A detection on its own is
unfalsifiable: the cascade says "id 46, here, this big", and nothing in the
frame disagrees. Seven marks whose relative positions are known in millimetres
change that. Four detections determine the plane's homography; every detection
past the fourth is a residual — an independent statement about whether the
others were right. So the target does not just find marks, it **accounts for all
seven**:

- **read** — id detected where the plane says it should be
- **misplaced** — id detected somewhere else, a wrong read rather than a miss
- **located** — no id, but a posed-but-unread cluster sits at the prediction:
  the geometry worked and the payload did not
- **missing** — nothing there at all

*located* is the state worth having. Two failures that a detection count cannot
tell apart — a mark too small or too blurred to decode, and a mark the row scan
never locked onto — are different problems with different fixes.

The seven ids are the non-zero codewords of a [6,3] linear code, pairwise
Hamming distance 3, so **no single misread cell can turn one member of the
target into another**. A misread lands on an id that is not on the sheet, where
it is discarded as off-target rather than silently swapping two landmarks.

**The cluster is printed rotated 30°, and that is worth more than the pitch is.**
Three poses at each setting, apparent diameter held fixed, marks read out of 7:

| pitch | row clearance | upright | rotated 30° |
|---|---|---|---|
| 1.25⌀ | 0.4 / 1.2 discs | 3/6/4, 3 wrong-place | 3/7/5, 1 wrong-place |
| 1.45⌀ | 1.2 / 2.1 discs | 3/3/3, 2 wrong-place | **7/7/7, none** |
| 1.70⌀ | 2.2 / 3.3 discs | 2/2/2 | 7/7/7, none |

The effect is large, consistent across pitch, and reproduces on a cold boot.
**Why it happens I do not know**, and two tidy explanations died against this
same table. *Rotation breaks up collinear triples* is backwards — upright, no
three marks share a row; rotated, the middle three do. *Rotation widens the
tightest along-row clearance* is true and necessary but not sufficient: it
explains why 1.25 is poor either way, yet upright at 1.70⌀ has more clearance
than rotated at 1.45⌀ and still reads 2/2/2. So 30° is an empirical setting, not
a derived one, and something about the upright arrangement specifically defeats
the row cascade. That is a fact about the detector rather than about this sheet,
and it deserves chasing down.

Pitch 1.45⌀ is then the tightest that reads everything once rotated, and 1.70⌀
buys nothing for the extra paper.

**What gets tested is what gets printed.** \`hexPitchSweep\` renders the target
through its own plane renderer, which is right for sweeping poses but shares no
code with the SVG behind the download button — a wrong radius or a mark at the
wrong millimetre would sail through it. \`hexPrintCheck\` rasterises the actual A4
file instead and reads that: 7/7 at 144, 96 and 72 pixel marks, no off-target
ids, centres within 1 px of the millimetre geometry, and the recovered scale
within 0.3% of the rasterisation.

One more thing falls out of a known plane. A single view of it constrains the
focal length — with square pixels and the principal point at the image centre,
r₁·r₂ = 0 and |r₁| = |r₂| each give an equation in f² — so the target
**self-calibrates the camera** and the pose comes back in millimetres. Both
equations degenerate as the view approaches frontal, where the plane stops
saying anything about depth, so \`fitHexPose\` returns a verdict rather than a
number when the conditioning is gone. Without f there is still a scale in mm per
pixel, which is what most uses actually need.

Print at 100%, not "fit to page": the millimetre geometry *is* the calibration,
and every distance reported is in units of it. The 100 mm bar in the legend is
there to be measured.`);};
const _5xkwav = function _makeHexTarget(manLayout) {return (function makeHexTarget(opts = {}) {
  // A calibration target: seven man marks at KNOWN positions on one sheet of
  // paper, in a hexagonal cluster (one centre, six at 60 degree spacing).
  //
  // Why a cluster of known geometry rather than seven loose marks. A single
  // mark gives a centre, a size and (when the fit is good) a tilt magnitude --
  // but no orientation, no scale in world units, and no way to tell a bad fit
  // from a good one. Seven coplanar marks whose relative positions are known
  // in millimetres give a HOMOGRAPHY: four detections determine the plane
  // pose, and every detection past the fourth is a residual, an independent
  // statement about whether the others were right. That is what makes it
  // useful in a cluttered scene -- it can say which marks read, which did not,
  // and where the missing ones should have been.
  //
  // The ids are not arbitrary. They are the seven non-zero codewords of a
  // [6,3] linear code, pairwise Hamming distance 3, so a single misread cell
  // cannot turn one member of the target into another. A misread lands on an
  // id that is not on the sheet, where it is discarded as off-target rather
  // than silently swapping two landmarks.
  //
  // THE CLUSTER IS PRINTED ROTATED 30 DEGREES, and that matters more than the
  // pitch. Measured over three poses at each setting (hexPitchSweep, apparent
  // diameter held fixed), marks read out of 7:
  //
  //     pitch    upright        rotated 30
  //     1.25     3/6/4          3/7/5
  //     1.45     3/3/3          7/7/7
  //     1.70     2/2/2          7/7/7
  //
  // The effect is large, consistent across pitch, and reproduces on a cold
  // boot. WHY it happens is not established. Two plausible mechanisms have
  // already been tried and killed by this same table:
  //   - "rotation breaks up collinear triples" is backwards. Upright, no three
  //     marks share a row; rotated, the middle three do.
  //   - "rotation widens the tightest along-row clearance" is necessary but
  //     not sufficient. It is true (minRowGapMm below, 12.3mm -> 21.6mm at
  //     pitch 1.45) and it does explain why 1.25 is poor either way, but
  //     upright at pitch 1.70 has MORE clearance (22.7mm) than rotated at 1.45
  //     and still reads 2/2/2.
  // So minRowGapMm is kept as a diagnostic, not as the explanation. Something
  // about the upright arrangement specifically defeats the row cascade, and
  // finding out what is worth a section of its own -- it is a statement about
  // the detector, not about this sheet.
  const L = opts.layout ?? manLayout;
  const ids = opts.ids ?? [56, 11, 22, 29, 37, 46, 51]; // centre, then ring k=0..5
  const diameterMm = opts.diameterMm ?? 48;
  const pitchFactor = opts.pitchFactor ?? 1.45;
  const rollDeg = opts.rollDeg ?? 30;
  const pitchMm = +(diameterMm * pitchFactor).toFixed(3);
  const radiusMm = diameterMm / 2;
  const mmPerUnit = radiusMm / L.R;
  const bitsOf = (id) =>
    Array.from({ length: L.nBits }, (_, j) => (id >> (L.nBits - 1 - j)) & 1);
  // ring index k at angle 90 + 60k + roll, in sheet coordinates (+y up,
  // millimetres, origin at the centre mark)
  const marks = ids.map((id, i) => {
    if (i === 0) return { id, k: null, xMm: 0, yMm: 0, bits: bitsOf(id) };
    const k = i - 1;
    const a = ((90 + 60 * k + rollDeg) * Math.PI) / 180;
    return {
      id, k,
      xMm: +(pitchMm * Math.cos(a)).toFixed(4),
      yMm: +(pitchMm * Math.sin(a)).toFixed(4),
      bits: bitsOf(id)
    };
  });
  // Smallest horizontal clearance among pairs whose row bands overlap, i.e.
  // pairs that can land in one scan row together. This is the quantity
  // manRowGroups has to work with, and it is NOT the pitch: a mark can sit
  // between two others that are offset vertically. Compare it against the dark
  // disc (12 of 57 layout units), the widest gap a single mark may contain --
  // below about one disc, no gap rule can tell two marks from one.
  let minRowGapMm = Infinity;
  for (let i = 0; i < marks.length; i++) {
    for (let j = i + 1; j < marks.length; j++) {
      if (Math.abs(marks[i].yMm - marks[j].yMm) >= diameterMm) continue; // bands miss
      minRowGapMm = Math.min(minRowGapMm, Math.abs(marks[i].xMm - marks[j].xMm) - diameterMm);
    }
  }
  const ext = (sel) => Math.max(...marks.map((m) => Math.abs(sel(m))));
  return {
    ids, marks, diameterMm, radiusMm, pitchMm, pitchFactor, rollDeg, mmPerUnit, layout: L,
    byId: new Map(marks.map((m) => [m.id, m])),
    minRowGapMm: Number.isFinite(minRowGapMm) ? +minRowGapMm.toFixed(2) : null,
    rowGapInDiscs: Number.isFinite(minRowGapMm)
      ? +(minRowGapMm / (2 * 6 * mmPerUnit)).toFixed(2)
      : null,
    // bounding box of the printed cluster, marks included -- computed from the
    // rotated positions, since the rotation changes which way it is widest
    widthMm: +(2 * ext((m) => m.xMm) + diameterMm).toFixed(2),
    heightMm: +(2 * ext((m) => m.yMm) + diameterMm).toFixed(2)
  };
});};
const _5gg2ic = function _hexTarget(makeHexTarget) {return (makeHexTarget());};
const _1fdcn6e = function _renderHexScene(hexTarget,manColor) {return (function renderHexScene(opts = {}) {
  // The whole target as one plane under a pinhole camera, rather than seven
  // marks pasted in as axis-aligned tiles the way manSceneTest composites.
  // The difference matters here: the point of the target is that its marks are
  // coplanar, so they must be rendered through ONE homography or a pose fitted
  // to them is fitting the compositor. The true plane-to-image homography is
  // returned, which is what makes this a test of fitHexPose and not just of
  // the detector.
  const T = opts.target ?? hexTarget;
  const L = T.layout;
  const W = opts.W ?? 960, H = opts.H ?? 540;
  const rad = (d) => (d * Math.PI) / 180;
  const yaw = rad(opts.yawDeg ?? 0), tilt = rad(opts.tiltDeg ?? 0), roll = rad(opts.rollDeg ?? 0);
  const Z = opts.Zmm ?? 1000;
  const fill = opts.fill ?? 0.8;          // sheet height as a fraction of image height
  const blur = opts.blur ?? 1.0;
  const noise = opts.noise ?? 3;
  const clutter = opts.clutter ?? 0;
  const seed = opts.seed ?? 1;
  const paperMm = opts.paperMm ?? { w: 210, h: 297 };
  const f = (fill * H * Z) / T.heightMm;
  const cx = W / 2 + (opts.shiftX ?? 0), cy = H / 2 + (opts.shiftY ?? 0);

  // R = Rz(roll) Rx(tilt) Ry(yaw); plane is z=0 in sheet coords, so the
  // homography needs only the first two columns and the translation
  const cy_ = Math.cos(yaw), sy_ = Math.sin(yaw);
  const cx_ = Math.cos(tilt), sx_ = Math.sin(tilt);
  const cz_ = Math.cos(roll), sz_ = Math.sin(roll);
  const Ry = [[cy_, 0, sy_], [0, 1, 0], [-sy_, 0, cy_]];
  const Rx = [[1, 0, 0], [0, cx_, -sx_], [0, sx_, cx_]];
  const Rz = [[cz_, -sz_, 0], [sz_, cz_, 0], [0, 0, 1]];
  const mul = (A, B) => A.map((r, i) => B[0].map((_, j) => r.reduce((s, v, k) => s + v * B[k][j], 0)));
  const R = mul(Rz, mul(Rx, Ry));
  // sheet y is up, image y is down
  const M = [
    [R[0][0], -R[0][1], opts.tx ?? 0],
    [R[1][0], -R[1][1], opts.ty ?? 0],
    [R[2][0], -R[2][1], Z]
  ];
  const K = [[f, 0, cx], [0, f, cy], [0, 0, 1]];
  const Hm = mul(K, M);                    // [xMm, yMm, 1] -> image, up to scale
  const det =
    Hm[0][0] * (Hm[1][1] * Hm[2][2] - Hm[1][2] * Hm[2][1]) -
    Hm[0][1] * (Hm[1][0] * Hm[2][2] - Hm[1][2] * Hm[2][0]) +
    Hm[0][2] * (Hm[1][0] * Hm[2][1] - Hm[1][1] * Hm[2][0]);
  const co = (a, b, c, d) => a * d - b * c;
  const Hinv = [
    [co(Hm[1][1], Hm[1][2], Hm[2][1], Hm[2][2]) / det, -co(Hm[0][1], Hm[0][2], Hm[2][1], Hm[2][2]) / det, co(Hm[0][1], Hm[0][2], Hm[1][1], Hm[1][2]) / det],
    [-co(Hm[1][0], Hm[1][2], Hm[2][0], Hm[2][2]) / det, co(Hm[0][0], Hm[0][2], Hm[2][0], Hm[2][2]) / det, -co(Hm[0][0], Hm[0][2], Hm[1][0], Hm[1][2]) / det],
    [co(Hm[1][0], Hm[1][1], Hm[2][0], Hm[2][1]) / det, -co(Hm[0][0], Hm[0][1], Hm[2][0], Hm[2][1]) / det, co(Hm[0][0], Hm[0][1], Hm[1][0], Hm[1][1]) / det]
  ];
  const project = (xMm, yMm) => {
    const u = Hm[0][0] * xMm + Hm[0][1] * yMm + Hm[0][2];
    const v = Hm[1][0] * xMm + Hm[1][1] * yMm + Hm[1][2];
    const w = Hm[2][0] * xMm + Hm[2][1] * yMm + Hm[2][2];
    return { x: u / w, y: v / w };
  };

  let st = seed | 0;
  const rnd = () => {
    st = (st + 0x6d2b79f5) | 0;
    let t = Math.imul(st ^ (st >>> 15), 1 | st);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  // desk, not a void: a mid-dark textured ground the sheet sits on
  const SS = 2;
  const img = new Float64Array(W * H);
  const bg = opts.bgLevel ?? 70;
  for (let py = 0; py < H; py++) {
    for (let px = 0; px < W; px++) {
      let acc = 0;
      for (let sy2 = 0; sy2 < SS; sy2++) {
        for (let sx2 = 0; sx2 < SS; sx2++) {
          const u = px + (sx2 + 0.5) / SS, v = py + (sy2 + 0.5) / SS;
          const a = Hinv[0][0] * u + Hinv[0][1] * v + Hinv[0][2];
          const b = Hinv[1][0] * u + Hinv[1][1] * v + Hinv[1][2];
          const c = Hinv[2][0] * u + Hinv[2][1] * v + Hinv[2][2];
          let val = bg;
          if (Math.abs(c) > 1e-12) {
            const xm = a / c, ym = b / c;
            if (Math.abs(xm) <= paperMm.w / 2 && Math.abs(ym) <= paperMm.h / 2) {
              val = 128;
              for (const m of T.marks) {
                const dr = Math.hypot(xm - m.xMm, ym - m.yMm);
                if (dr <= T.radiusMm) { val = manColor(dr / T.mmPerUnit, m.bits, L); break; }
              }
            }
          }
          acc += val;
        }
      }
      img[py * W + px] = acc / (SS * SS);
    }
  }

  // occluders and distractors, drawn in image space because that is where a
  // hand, a mug or a cable lives -- over the sheet, not on it
  for (let i = 0; i < clutter; i++) {
    const kind = rnd();
    const g = 20 + Math.floor(rnd() * 200);
    const ox = rnd() * W, oy = rnd() * H;
    if (kind < 0.4) {
      const rr = 8 + rnd() * 40;
      for (let y = Math.max(0, oy - rr | 0); y < Math.min(H, oy + rr); y++)
        for (let x = Math.max(0, ox - rr | 0); x < Math.min(W, ox + rr); x++)
          if (Math.hypot(x - ox, y - oy) < rr) img[y * W + x] = g;
    } else if (kind < 0.8) {
      const ww = 10 + rnd() * 120, hh = 6 + rnd() * 60;
      for (let y = Math.max(0, oy | 0); y < Math.min(H, oy + hh); y++)
        for (let x = Math.max(0, ox | 0); x < Math.min(W, ox + ww); x++) img[y * W + x] = g;
    } else {
      // a straight edge: the thing most likely to fake a lattice on a row
      const ww = 40 + rnd() * 300, th = 2 + rnd() * 8;
      for (let y = Math.max(0, oy | 0); y < Math.min(H, oy + th); y++)
        for (let x = Math.max(0, ox | 0); x < Math.min(W, ox + ww); x++) img[y * W + x] = g;
    }
  }

  const rr = Math.max(1, Math.ceil(3 * blur));
  const ker = new Float64Array(2 * rr + 1);
  let ks = 0;
  for (let i = -rr; i <= rr; i++) ks += ker[i + rr] = Math.exp((-i * i) / (2 * blur * blur));
  const tmp = new Float64Array(W * H);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      let acc = 0;
      for (let i = -rr; i <= rr; i++) acc += img[y * W + Math.min(W - 1, Math.max(0, x + i))] * ker[i + rr];
      tmp[y * W + x] = acc / ks;
    }
  const gray = new Uint8Array(W * H);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      let acc = 0;
      for (let i = -rr; i <= rr; i++) acc += tmp[Math.min(H - 1, Math.max(0, y + i)) * W + x] * ker[i + rr];
      let v = acc / ks;
      if (noise) {
        const u1 = Math.max(1e-12, rnd()), u2 = rnd();
        v += noise * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      }
      gray[y * W + x] = Math.max(0, Math.min(255, Math.round(v)));
    }

  return {
    gray, w: W, h: H, H: Hm, target: T,
    truth: T.marks.map((m) => ({ id: m.id, ...project(m.xMm, m.yMm) })),
    // apparent diameter of the centre mark, the scale number that matters
    dPx: Math.hypot(
      project(T.radiusMm, 0).x - project(-T.radiusMm, 0).x,
      project(T.radiusMm, 0).y - project(-T.radiusMm, 0).y
    )
  };
});};
const _1qa5emd = function _fitHexPose(hexTarget,fitHomography) {return (function fitHexPose(res, opts = {}) {
  // Given what the cascade found in one frame, fit the plane the target is
  // printed on and then account for all seven marks.
  //
  // The accounting is the reason the target exists. A detection on its own is
  // unfalsifiable -- it is a claim with nothing to check it against. Four
  // detections determine the plane, and then every OTHER mark has a predicted
  // image position, so each one lands in exactly one of four states:
  //
  //   read       id detected where the plane says it should be
  //   misplaced  id detected somewhere else -- a wrong read, not a miss
  //   located    no id, but a posed-but-unread cluster sits at the prediction:
  //              the geometry worked and the payload did not
  //   missing    nothing at all there
  //
  // "located" is the state worth having. It separates the two failures that
  // look identical from a detection count -- a mark too small or too blurred
  // to decode is a different problem from one the row scan never locked onto.
  const T = opts.target ?? hexTarget;
  const fused = Array.isArray(res) ? res : res.fused ?? [];
  const unread = (Array.isArray(res) ? [] : res.unidentified ?? []).filter((u) => u.posed);
  const onTarget = fused.filter((f) => T.byId.has(f.id));
  const offTarget = fused.filter((f) => !T.byId.has(f.id));

  const solve3 = (M, v) => {
    // 3x3 Gaussian elimination, used for the 3-detection affine fallback
    const A = M.map((r, i) => [...r, v[i]]);
    for (let c = 0; c < 3; c++) {
      let p = c;
      for (let r = c + 1; r < 3; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
      if (Math.abs(A[p][c]) < 1e-12) return null;
      [A[c], A[p]] = [A[p], A[c]];
      for (let r = 0; r < 3; r++) {
        if (r === c) continue;
        const k = A[r][c] / A[c][c];
        for (let j = c; j < 4; j++) A[r][j] -= k * A[c][j];
      }
    }
    return [A[0][3] / A[0][0], A[1][3] / A[1][1], A[2][3] / A[2][2]];
  };
  const affineFrom = (pts) => {
    const M = pts.map((p) => [p.sx, p.sy, 1]);
    const ax = solve3(M, pts.map((p) => p.dx));
    const ay = solve3(M, pts.map((p) => p.dy));
    if (!ax || !ay) return null;
    const H = [ax[0], ax[1], ax[2], ay[0], ay[1], ay[2], 0, 0, 1];
    return {
      H,
      map: (sx, sy) => [H[0] * sx + H[1] * sy + H[2], H[3] * sx + H[4] * sy + H[5]],
      mirrored: H[0] * H[4] - H[1] * H[3] < 0,
      rmsResidual: 0,
      pairs: 3,
      affine: true
    };
  };

  const pairFor = (f) => {
    const m = T.byId.get(f.id);
    return { sx: m.xMm, sy: m.yMm, dx: f.xc, dy: f.yc, id: f.id };
  };
  let pairs = onTarget.map(pairFor);
  let fit = null, dropped = [];
  const maxDrop = opts.maxDrop ?? 2;
  if (pairs.length >= 4) {
    fit = fitHomography(pairs);
    // one wildly wrong centre drags a least-squares homography everywhere, so
    // drop the worst while there is still redundancy to spare
    for (let it = 0; it < maxDrop && fit && pairs.length > 4; it++) {
      let worst = null, wd = 0;
      for (const p of pairs) {
        const [px, py] = fit.map(p.sx, p.sy);
        const d = Math.hypot(px - p.dx, py - p.dy);
        if (d > wd) { wd = d; worst = p; }
      }
      const tol = opts.dropPx ?? Math.max(6, 3 * fit.rmsResidual);
      if (!worst || wd <= tol) break;
      dropped.push({ id: worst.id, px: +wd.toFixed(1) });
      pairs = pairs.filter((p) => p !== worst);
      fit = fitHomography(pairs);
    }
  } else if (pairs.length === 3) {
    fit = affineFrom(pairs);
  }
  if (!fit) {
    return {
      ok: false, why: pairs.length ? "too few marks for a plane" : "no target marks read",
      nRead: onTarget.length, offTarget: offTarget.map((f) => f.id),
      marks: T.marks.map((m) => ({ id: m.id, state: onTarget.some((f) => f.id === m.id) ? "read" : "missing" }))
    };
  }

  // apparent mark radius from the fit itself, so the match tolerance scales
  // with the view rather than being a pixel constant
  const radiusAt = (m) => {
    const [x0, y0] = fit.map(m.xMm, m.yMm);
    const [x1, y1] = fit.map(m.xMm + T.radiusMm, m.yMm);
    const [x2, y2] = fit.map(m.xMm, m.yMm + T.radiusMm);
    return (Math.hypot(x1 - x0, y1 - y0) + Math.hypot(x2 - x0, y2 - y0)) / 2;
  };
  const tolFrac = opts.tolFrac ?? 0.6;
  const marks = T.marks.map((m) => {
    const [px, py] = fit.map(m.xMm, m.yMm);
    const rp = radiusAt(m);
    const tol = tolFrac * rp;
    const hit = onTarget.find((f) => f.id === m.id);
    const near = unread.find((u) => Math.hypot(u.xc - px, u.yc - py) <= tol);
    const resid = hit ? Math.hypot(hit.xc - px, hit.yc - py) : null;
    const state = hit ? (resid <= tol ? "read" : "misplaced") : near ? "located" : "missing";
    return {
      id: m.id, k: m.k, state,
      predicted: { x: +px.toFixed(1), y: +py.toFixed(1) },
      radiusPx: +rp.toFixed(1),
      residualPx: resid == null ? null : +resid.toFixed(1),
      tiltDeg: hit && hit.tiltDeg != null ? +hit.tiltDeg.toFixed(1) : null,
      dropped: dropped.some((d) => d.id === m.id)
    };
  });

  // Self-calibration. A single view of a plane constrains the focal length
  // (Zhang): with square pixels and the principal point at the image centre,
  // r1.r2 = 0 and |r1| = |r2| each give an equation in f^2. Both degenerate as
  // the view approaches frontal -- the third row of H goes to zero and the
  // plane stops telling you anything about depth -- so this returns a verdict
  // instead of a number when the conditioning is gone. Without f there is
  // still a scale (mm per pixel at the centre mark), which is the part most
  // uses actually need.
  const cx = opts.cx ?? (res.w ?? opts.W ?? 0) / 2;
  const cy = opts.cy ?? (res.h ?? opts.H ?? 0) / 2;
  const Hm = fit.H;
  const h = [
    [Hm[0] - cx * Hm[6], Hm[3] - cy * Hm[6], Hm[6]],
    [Hm[1] - cx * Hm[7], Hm[4] - cy * Hm[7], Hm[7]],
    [Hm[2] - cx * 1, Hm[5] - cy * 1, 1]
  ];
  const [h1, h2, h3] = h;
  const f2a = -(h1[0] * h2[0] + h1[1] * h2[1]) / (h1[2] * h2[2]);
  const f2b = (h1[0] * h1[0] + h1[1] * h1[1] - h2[0] * h2[0] - h2[1] * h2[1]) /
    (h2[2] * h2[2] - h1[2] * h1[2]);
  const cands = [f2a, f2b].filter((v) => Number.isFinite(v) && v > 1);
  const f = cands.length ? Math.sqrt(cands.reduce((s, v) => s + v, 0) / cands.length) : null;
  const centrePx = fit.map(0, 0);
  const mmPerPx = T.radiusMm / radiusAt(T.marks[0]);
  let pose = null;
  if (f && cands.length === 2) {
    const Ki = (v) => [v[0] / f, v[1] / f, v[2]];
    const k1 = Ki(h1), k2 = Ki(h2), k3 = Ki(h3);
    const n1 = Math.hypot(k1[0], k1[1], k1[2]);
    const lam = n1 > 1e-12 ? 1 / n1 : null;
    if (lam) {
      const r1 = k1.map((v) => v * lam);
      const r2 = k2.map((v) => v * lam);
      let t = k3.map((v) => v * lam);
      const r3 = [
        r1[1] * r2[2] - r1[2] * r2[1],
        r1[2] * r2[0] - r1[0] * r2[2],
        r1[0] * r2[1] - r1[1] * r2[0]
      ];
      if (t[2] < 0) t = t.map((v) => -v);
      const nz = Math.min(1, Math.abs(r3[2]) / Math.hypot(r3[0], r3[1], r3[2]));
      pose = {
        focalPx: +f.toFixed(1),
        distanceMm: +Math.hypot(t[0], t[1], t[2]).toFixed(0),
        // angle between the sheet normal and the optical axis
        tiltDeg: +((Math.acos(nz) * 180) / Math.PI).toFixed(1),
        rollDeg: +((Math.atan2(r1[1], r1[0]) * 180) / Math.PI).toFixed(1),
        // how far the two f estimates disagreed, as a fraction -- the honest
        // conditioning number for everything above
        fSpread: +Math.abs(Math.sqrt(f2a) - Math.sqrt(f2b)).toFixed(1)
      };
    }
  }

  const counts = { read: 0, located: 0, misplaced: 0, missing: 0 };
  for (const m of marks) counts[m.state]++;
  return {
    ok: true,
    fit, affine: !!fit.affine,
    nUsed: pairs.length, dropped,
    rmsResidualPx: +fit.rmsResidual.toFixed(2),
    centrePx: { x: +centrePx[0].toFixed(1), y: +centrePx[1].toFixed(1) },
    mmPerPx: +mmPerPx.toFixed(3),
    mirrored: fit.mirrored,
    pose,
    poseWhy: pose ? null : fit.affine ? "affine (3 marks)" : cands.length ? "near-frontal: f ill-conditioned" : "no valid f",
    counts, marks,
    offTarget: offTarget.map((f) => ({ id: f.id, x: Math.round(f.xc), y: Math.round(f.yc) }))
  };
});};
const _q8nv1h = function _hexTargetSvg(hexTarget,manColor) {return (function hexTargetSvg(opts = {}) {
  // The calibration target as one A4 page, mm-sized, same print conventions as
  // §10 and §11.2: the whole page floods mid-gray and each mark is nested full
  // discs drawn outside-in.
  //
  // No labels inside the cluster. A man mark reads by finding edges along a
  // scan row, and text sitting in the gap between two marks puts edges exactly
  // where the segmenter is trying to find background. The legend goes in the
  // bottom margin, outside the pattern, where it can do no harm.
  //
  // PRINT AT 100%. "Fit to page" silently rescales the sheet, and the
  // millimetre geometry IS the calibration -- every distance the pose fit
  // reports is in units of it. The 100 mm bar in the legend is there to be
  // measured with a real ruler: if it is not 100 mm, the print was scaled and
  // the reported distances are wrong by that factor.
  const T = opts.target ?? hexTarget;
  const L = T.layout;
  const pageW = opts.pageW ?? 210, pageH = opts.pageH ?? 297;
  const cx0 = opts.cx ?? pageW / 2;
  const cy0 = opts.cy ?? 110;                 // cluster centre, leaving a legend below
  const scale = T.radiusMm / L.R;             // mm per layout unit
  const parts = [];
  for (const m of T.marks) {
    const mx = cx0 + m.xMm;
    const my = cy0 - m.yMm;                   // sheet y is up, SVG y is down
    const bounds = [0, ...L.teeth];
    for (let i = bounds.length - 1; i >= 1; i--) {
      const mid = (bounds[i - 1] + bounds[i]) / 2;
      const dark = manColor(mid, m.bits, L) < 128;
      parts.push(
        `<circle cx="${mx.toFixed(2)}" cy="${my.toFixed(2)}" r="${(bounds[i] * scale).toFixed(2)}" fill="${dark ? "#000000" : "#ffffff"}"/>`
      );
    }
  }
  const legendY = cy0 + T.heightMm / 2 + 18;
  const rows = T.marks.map(
    (m) => `id ${String(m.id).padStart(2)}  ${m.k == null ? "centre" : "ring " + m.k}  x ${m.xMm.toFixed(1).padStart(6)}  y ${m.yMm.toFixed(1).padStart(6)}`
  );
  const legend = [
    `<text x="${cx0}" y="${legendY}" font-family="monospace" font-size="4.5" fill="#2a2a2a" text-anchor="middle">man hex calibration target &#183; ${T.diameterMm}mm marks &#183; pitch ${T.pitchMm}mm &#183; rotated ${T.rollDeg}&#176;</text>`,
    `<text x="${cx0}" y="${legendY + 6}" font-family="monospace" font-size="3.6" fill="#3a3a3a" text-anchor="middle">PRINT AT 100% &#8212; not "fit to page". The bar below must measure 100mm.</text>`,
    // ruler bar with end ticks
    `<rect x="${cx0 - 50}" y="${legendY + 11}" width="100" height="0.7" fill="#2a2a2a"/>`,
    `<rect x="${cx0 - 50}" y="${legendY + 9}" width="0.7" height="4.7" fill="#2a2a2a"/>`,
    `<rect x="${cx0 + 49.3}" y="${legendY + 9}" width="0.7" height="4.7" fill="#2a2a2a"/>`,
    `<text x="${cx0}" y="${legendY + 20}" font-family="monospace" font-size="3.4" fill="#3a3a3a" text-anchor="middle">100 mm</text>`
  ];
  rows.forEach((r, i) => {
    legend.push(
      `<text x="${cx0}" y="${legendY + 28 + i * 4.4}" font-family="monospace" font-size="3.4" fill="#3a3a3a" text-anchor="middle" xml:space="preserve">${r}</text>`
    );
  });
  legend.push(
    `<text x="${cx0}" y="${legendY + 28 + rows.length * 4.4 + 5}" font-family="monospace" font-size="3.2" fill="#4a4a4a" text-anchor="middle">millimetres from the centre mark, +y up. The gray is part of the pattern &#8212; do not trim.</text>`
  );
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${pageW}mm" height="${pageH}mm" viewBox="0 0 ${pageW} ${pageH}">
<rect width="${pageW}" height="${pageH}" fill="#808080"/>
${parts.join("\n")}
${legend.join("\n")}
</svg>`;
});};
const _xt3mg6 = function _hexPrintPanel(hexTargetSvg,hexTarget,htl) {
  // data: URIs, not blob: -- a file:// page refuses blob: as a resource
  const svg = hexTargetSvg({ target: hexTarget });
  const uri = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  const T = hexTarget;
  const px = (mm, dPx) => Math.round((mm * dPx) / T.diameterMm);
  return htl.html`<div style="display:flex;gap:1.5em;align-items:flex-start;flex-wrap:wrap;font:13px ui-monospace,monospace">
  <div>
    <img src=${uri} style="width:260px;display:block;border:1px solid #0002"/>
    <div style="padding:6px 0"><a href=${uri} download="man-hex-target-a4.svg">download A4 target</a></div>
  </div>
  <div style="max-width:34em">
    <div><b>${T.ids.length} marks</b>, ids ${T.ids.join(", ")} &mdash; the seven non-zero codewords of a [6,3] code,
      so no single misread cell can turn one member into another.</div>
    <div style="padding-top:6px">${T.diameterMm}mm marks, ${T.pitchMm}mm pitch, cluster rotated ${T.rollDeg}&deg;,
      sheet ${T.widthMm} &times; ${T.heightMm}mm on A4. Tightest clearance between marks that can share a
      scan row: ${T.minRowGapMm}mm (${T.rowGapInDiscs}&times; the dark disc it has to beat).</div>
    <div style="padding-top:6px;opacity:.75">The rotation is not decoration &mdash; it is worth more than the pitch is.
      Over three poses each, rotated reads <b>7/7/7</b> marks against <b>3/3/3</b> upright at this pitch.
      <i>Why</i> is not established: the obvious explanations (collinear triples, along-row clearance) are both
      contradicted by the same table, so this is an empirical setting, not a derived one.</div>
    <div style="padding-top:10px;opacity:.75">Working distance: a mark needs roughly 4 pixels per tooth, so keep the
      whole cluster in frame with each mark above ~<b>${px(T.diameterMm, 60)}px</b>. On a 1280-wide camera that is
      roughly <b>0.4&ndash;1.2 m</b> from the sheet.</div>
    <div style="padding-top:10px;color:#a33">Print at 100%, not "fit to page" &mdash; the millimetre geometry is the
      calibration. Measure the 100mm bar to check.</div>
  </div>
</div>`;
};
const _13k4hcg = async function _hexPrintCheck(hexTarget,hexTargetSvg,analyzeFrameMan,fitHexPose) {
  // Read the THING THAT GETS PRINTED, not a parallel model of it.
  //
  // hexPitchSweep renders the target through its own plane renderer, which is
  // the right tool for sweeping poses but shares no code with hexTargetSvg.
  // A wrong radius, a mark at the wrong millimetre, or a legend that strays
  // into the pattern would sail straight through it. So this rasterises the
  // actual A4 SVG the download button hands over, and checks the cascade reads
  // it and lands where the millimetre geometry says it should.
  const T = hexTarget;
  const svg = hexTargetSvg({ target: T });
  const pageW = 210, pageH = 297, cx0 = pageW / 2, cy0 = 110; // must match hexTargetSvg
  const uri = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  const img = new window.Image();
  await new Promise((res, rej) => {
    img.onload = res;
    img.onerror = () => rej(new Error("could not rasterise the target SVG"));
    img.src = uri;
  });
  const out = [];
  for (const pxPerMm of [3, 2, 1.5]) {
    const W = Math.round(pageW * pxPerMm), H = Math.round(pageH * pxPerMm);
    const cv = window.document.createElement("canvas");
    cv.width = W; cv.height = H;
    const ctx = cv.getContext("2d");
    ctx.drawImage(img, 0, 0, W, H);
    const px = ctx.getImageData(0, 0, W, H).data;
    const gray = new Uint8Array(W * H);
    for (let i = 0, p = 0; i < gray.length; i++, p += 4)
      gray[i] = (px[p] * 77 + px[p + 1] * 150 + px[p + 2] * 29) >> 8;
    const res = analyzeFrameMan({ gray, w: W, h: H }, { stride: 4 });
    const pose = fitHexPose({ ...res, w: W, h: H }, { target: T });
    // where each mark must be, straight from the mm layout and the raster scale
    const truth = new Map(
      T.marks.map((m) => [m.id, { x: (cx0 + m.xMm) * pxPerMm, y: (cy0 - m.yMm) * pxPerMm }])
    );
    const onTarget = res.fused.filter((f) => truth.has(f.id));
    const errs = onTarget.map((f) =>
      Math.hypot(f.xc - truth.get(f.id).x, f.yc - truth.get(f.id).y)
    );
    out.push({
      pxPerMm,
      raster: `${W}x${H}`,
      markPx: Math.round(T.diameterMm * pxPerMm),
      read: onTarget.length,
      ids: onTarget.map((f) => f.id).sort((a, b) => a - b),
      offTarget: res.fused.filter((f) => !truth.has(f.id)).map((f) => f.id),
      worstErrPx: errs.length ? +Math.max(...errs).toFixed(2) : null,
      // the scale the fit recovers, against the scale we rasterised at
      mmPerPx: pose.ok ? pose.mmPerPx : null,
      mmPerPxTrue: +(1 / pxPerMm).toFixed(3),
      located: pose.ok ? pose.counts.located : null,
      missing: pose.ok ? pose.counts.missing : null,
      rms: pose.ok ? pose.rmsResidualPx : null,
      ms: +res.ms.toFixed(0)
    });
  }
  return out;
};
const _1kgvsyz = function _hexRendererCheck(manLayout,renderManFrame,analyzeFrameMan,makeHexTarget,renderHexScene) {
  // Is the low read rate the detector or my renderer? Same id, same apparent
  // diameter, same detector -- rendered two ways. renderManFrame is the one
  // manSceneTest already passes with, so it is the control.
  const id = 56;
  const bits = Array.from({ length: manLayout.nBits }, (_, j) => (id >> (manLayout.nBits - 1 - j)) & 1);
  const out = [];
  const scanOf = (gray, w, h, cx, cy) => {
    const row = [];
    for (let x = Math.max(0, Math.round(cx) - 44); x < Math.min(w, Math.round(cx) + 44); x++)
      row.push(gray[Math.round(cy) * w + x]);
    return row;
  };

  // control: the existing single-mark renderer, halfwidth 38 -> ~76px across
  const f = renderManFrame(bits, { W: 38, yawDeg: 0, blur: 1.0, noise: 3, seed: 3 });
  const W = 400, H = 300;
  const g1 = new Uint8Array(W * H).fill(128);
  const ox = 100, oy = 60;
  for (let y = 0; y < f.h; y++)
    for (let x = 0; x < f.w; x++) {
      const ty = oy + y, tx = ox + x;
      if (ty >= 0 && ty < H && tx >= 0 && tx < W) g1[ty * W + tx] = f.gray[y * f.w + x];
    }
  const r1 = analyzeFrameMan({ gray: g1, w: W, h: H }, { stride: 4 });
  out.push(`renderManFrame W38 (${(2 * f.bTrue).toFixed(0)}px): rowHits=${r1.rowHits} read=[${r1.fused.map((z) => z.id)}] posed=${r1.unidentified.filter((u) => u.posed).length}`);
  out.push("  scan " + scanOf(g1, W, H, ox + f.cx, oy + f.cy).join(","));

  // mine: one mark on a plane, frontal, matched to the same diameter
  const T = makeHexTarget({ ids: [id] });
  const sc = renderHexScene({
    target: T, W, H, tiltDeg: 0, blur: 1.0, noise: 3, seed: 3,
    fill: (2 * f.bTrue) / H * (T.heightMm / T.diameterMm)
  });
  const r2 = analyzeFrameMan({ gray: sc.gray, w: sc.w, h: sc.h }, { stride: 4 });
  out.push(`renderHexScene (${sc.dPx.toFixed(0)}px): rowHits=${r2.rowHits} read=[${r2.fused.map((z) => z.id)}] posed=${r2.unidentified.filter((u) => u.posed).length}`);
  out.push("  scan " + scanOf(sc.gray, sc.w, sc.h, sc.truth[0].x, sc.truth[0].y).join(","));
  return out.join("\n");
};
const _1au9ya6 = function _hexPitchSweep(makeHexTarget,renderHexScene,analyzeFrameMan,fitHexPose) {
  // What the printed pattern's two free parameters are actually worth.
  //
  // The result: the print ROTATION dominates, and the pitch only matters once
  // the rotation is right. Rotated 30 degrees the cascade reads every mark at
  // pitch 1.45 and 1.70; upright it reads 2-4 of 7 at every pitch tried.
  //
  // I cannot say why. The mechanism is not in this table, and two candidates
  // that sounded right are refuted BY this table:
  //   - "rotation breaks up collinear triples": backwards. Upright, no three
  //     marks share a scan row (two rows of two, centre alone); rotated, the
  //     middle three are collinear.
  //   - "rotation widens the tightest along-row clearance": true, necessary,
  //     not sufficient. minRowGapMm doubles at every pitch, and it does
  //     explain why 1.25 is poor either way -- but upright at 1.70 has MORE
  //     clearance than rotated at 1.45 and still reads 2/2/2.
  // So minRowGapMm is reported here as a diagnostic, not as the cause.
  //
  // EACH CELL IS THREE POSES, not one. A single pose confounds the question
  // with luck: on identical geometry one setting read 1 of 7 and another read
  // 7 of 7, purely from where the scan rows fell. The poses vary yaw and tilt;
  // the camera is level, so the only rotation in play is the printed one.
  //
  // Two controls an earlier version of this sweep got wrong, both of which
  // manufactured zeros: apparent diameter is held FIXED (pitch changes the
  // sheet size, so a fixed fill shrank the marks as the pitch grew), and the
  // frame is sized per case so the whole target is inside it (at pitch 2.0 the
  // outer marks had simply fallen off the image).
  const dPx = 100;
  const POSES = [
    { yawDeg: 0, tiltDeg: 25 },
    { yawDeg: 12, tiltDeg: 35 },
    { yawDeg: -10, tiltDeg: 17 }
  ];
  const rows = [];
  for (const pitchFactor of [1.25, 1.45, 1.7]) {
    for (const rollDeg of [0, 30]) {
      const T = makeHexTarget({ pitchFactor, rollDeg });
      const scale = dPx / T.diameterMm;
      const H = Math.round((Math.max(T.heightMm, T.widthMm) * scale) / 0.8);
      const W = Math.round((H * 16) / 9);
      const trials = [];
      for (const [i, p] of POSES.entries()) {
        const scene = renderHexScene({
          target: T, W, H, fill: (T.heightMm * scale) / H,
          yawDeg: p.yawDeg, tiltDeg: p.tiltDeg, rollDeg: 0,
          blur: 1.0, noise: 3, seed: 7 + i
        });
        const res = analyzeFrameMan({ gray: scene.gray, w: scene.w, h: scene.h }, { stride: 4 });
        const pose = fitHexPose({ ...res, w: scene.w, h: scene.h }, { target: T });
        const byId = new Map(scene.truth.map((t) => [t.id, t]));
        const onTarget = res.fused.filter((f) => byId.has(f.id));
        // a detection more than half a mark from where that id really is has
        // locked onto the wrong thing -- worse than a miss, and invisible in a
        // detection count
        const wrongPlace = onTarget.filter(
          (f) => Math.hypot(f.xc - byId.get(f.id).x, f.yc - byId.get(f.id).y) > 0.5 * dPx
        ).length;
        trials.push({
          detected: onTarget.length, wrongPlace,
          offTarget: res.fused.length - onTarget.length,
          located: pose.ok ? pose.counts.located : 0,
          poseTilt: pose.pose ? pose.pose.tiltDeg : null,
          trueTilt: +(
            (Math.acos(
              Math.cos((p.tiltDeg * Math.PI) / 180) * Math.cos((p.yawDeg * Math.PI) / 180)
            ) * 180) / Math.PI
          ).toFixed(1),
          ms: +res.ms.toFixed(0)
        });
      }
      const det = trials.map((t) => t.detected);
      rows.push({
        pitchFactor,
        printRollDeg: rollDeg,
        rowGapMm: T.minRowGapMm,
        rowGapInDiscs: T.rowGapInDiscs,
        sheetMm: `${T.widthMm}x${T.heightMm}`,
        detected: det.join("/"),
        mean: +(det.reduce((a, b) => a + b, 0) / det.length).toFixed(1),
        worst: Math.min(...det),
        wrongPlace: trials.reduce((a, t) => a + t.wrongPlace, 0),
        offTarget: trials.reduce((a, t) => a + t.offTarget, 0),
        located: trials.reduce((a, t) => a + t.located, 0),
        tiltFit: trials.map((t) => (t.poseTilt == null ? "–" : `${t.poseTilt}/${t.trueTilt}`)).join(" "),
        ms: Math.round(trials.reduce((a, t) => a + t.ms, 0) / trials.length)
      });
    }
  }
  return rows;
};
const _1h5er0z = function _hexRig_md(md) {return (md`### §11.5 Calibration rig

The §11.4 target knows where its seven marks are, in millimetres. Four
detections fix the plane, so every other mark has a predicted image position
and a verdict — **read**, **misplaced**, **located**, **missing**. That makes a
frame of the printed sheet self-labelling, and a self-labelling frame is a test
case.

The rig turns that into a loop: point the camera at the sheet, and frames that
read most of the target and still fail on part of it are **kept**, with their
labels, their settings and their pixels. Afterwards the same failures can be
replayed at other settings without the camera, the sheet, or the hand that was
holding it.

**Use it.** Print §11.4 at 100%. Turn the camera on in §0. Aim at the sheet and
move around — angle, distance, glare, shadow. Hard frames collect themselves;
\`keep this frame\` takes one by hand. Then press **run sweep**.

**What makes a frame keepable.** Not "did it detect something". Three
conditions, and the third does the work:

| bar | why |
|---|---|
| 5+ marks read | four marks fit a homography *exactly* — four tells you nothing about whether the fit is right |
| rms ≤ 4px | cheap, catches the obviously broken |
| leave-one-out ≤ 0.3 radii | refit without each mark, predict it, take the worst |

The rms of the fit is **not** evidence that the labels are right, and this is
measurable rather than theoretical: a rendered frame with rms **1.39px** carried
label errors of **66px**. With five marks a homography has two spare degrees of
freedom, so it absorbs a badly measured centre instead of reporting it — and
the centres here are known to be anisotropic, measured directly along a scan row
and extrapolated across rows (§11.3). Leave-one-out asks the question rms only
appears to answer, and it is the same question an unread mark's label is in:
predict this mark *without* using it. Across six rendered frames it admitted
exactly the one whose labels were good (true error 0.06 radii) and rejected
every frame that was off by 0.4 radii or more. \`hexRigSelfTest\` checks that
against the renderer's own truth, which the fit never sees.

**The sweep** replays the collected cases with one knob moved at a time, scored
against the labels frozen at capture — never against a fresh fit, which would
make the yardstick a function of the thing being measured. It is a coordinate
sweep, so it cannot see interactions; it gives the derivative in each direction
from where you are standing, and applies every winning single change together
as one extra point to check whether they compose.

With no captures it falls back to rendered cases so the machinery is
demonstrable without a printed sheet. On that one rendered frame, raising the
edge threshold from 12 to 16 takes 5 of 7 marks to 7 of 7 with no wrong reads
and runs 2.5× faster — fewer noise edges to sort. **One synthetic frame is not
grounds to move a shipped default**; it is a hypothesis for the printed sheet to
answer.`);};
const _ktbd9n = function _hexRigCfg(Inputs) {return (Inputs.form({
  // EVERY default here is the value the shipping detector already uses, so the
  // rig at rest measures the detector as deployed rather than a near miss of
  // it. The three pose gates are the ones to watch: their defaults are `??`
  // fallbacks inside fitManPose (1/3, 0.3, 0.35), not fields on manLayout, so
  // they cannot be read off the layout and are mirrored here by hand. If
  // fitManPose's fallbacks change, change these with them.
  //
  // min axis ratio steps by 1/60 rather than 0.01 for one reason: a range
  // input snaps its value onto the min+k*step grid, and 1/3 is not on a
  // hundredths grid -- the slider quietly reported 0.33 and the rig would have
  // been measuring a detector nobody ships.
  stride: Inputs.range([2, 10], { step: 1, value: 4, label: "stride (rows)" }),
  edgeThreshold: Inputs.range([2, 30], { step: 1, value: 12, label: "edge threshold" }),
  minRows: Inputs.range([2, 8], { step: 1, value: 3, label: "min rows / cluster" }),
  minVotes: Inputs.range([1, 6], { step: 1, value: 2, label: "min id votes" }),
  voteRatio: Inputs.range([1, 4], { step: 0.5, value: 2, label: "vote margin x" }),
  minAxisRatio: Inputs.range([0, 0.9], { step: 1 / 60, value: 1 / 3, label: "min axis ratio" }),
  minCover: Inputs.range([0, 0.9], { step: 0.05, value: 0.3, label: "min cover" }),
  maxASpread: Inputs.range([0.05, 1.5], { step: 0.05, value: 0.35, label: "max width spread" }),
  gapFrac: Inputs.range([0.15, 0.6], { step: 0.05, value: 0.3, label: "row split gap frac" }),
  maxWidth: Inputs.range([480, 1280], { step: 160, value: 960, label: "working width (px)" }),
  // The odd one out: not a threshold to tune but a second scan of the same
  // frame, down the columns instead of across the rows (§11.1). It halves the
  // frame rate and it is off by default for that reason, but the rig is where
  // it earns its keep -- the labels it stores are a homography through these
  // centres, and the row scan MEASURES a centre's x while only extrapolating
  // its y. Turn it on before collecting cases you intend to trust.
  bothAxes: Inputs.toggle({ label: "scan both axes", value: false })
}));};
const _1pvjep3 = (G, _) => G.input(_);
const _1lt19nm = function _hexRigOpts(hexRigCfg,manLayout) {
  // One options object, used by BOTH the live loop and the offline sweep.
  // Sharing it is the point: a knob the sweep can move but the live view
  // cannot would let the two disagree about what is being measured.
  //
  // The pose gates are not top-level options — they live on the layout object
  // (fitManPose takes L), so overriding them means passing a modified copy of
  // the layout. Everything else is a plain opt that analyzeFrameMan forwards
  // down through detectRowMan to manRowGroups.
  //
  // bothAxes goes through the same channel, which is why nothing downstream of
  // here needed changing to gain the option: analyzeFrameMan dispatches on it
  // itself, so the live rig, the sweep and every replay pick it up together.
  // It costs a second full pass and is worth it HERE specifically — the rig's
  // ground truth is a homography through these centres, and the centre's weak
  // coordinate is the one the row scan extrapolates rather than measures.
  const c = hexRigCfg;
  return {
    stride: c.stride,
    edgeThreshold: c.edgeThreshold,
    minRows: c.minRows,
    minVotes: c.minVotes,
    voteRatio: c.voteRatio,
    gapFrac: c.gapFrac,
    bothAxes: c.bothAxes,
    layout: {
      ...manLayout,
      minAxisRatio: c.minAxisRatio,
      minCover: c.minCover,
      maxASpread: c.maxASpread
    }
  };
};
const _gwo9xk = function _hexRigLoo(hexTarget,fitHomography) {return (function hexRigLoo(res, target) {
  // Leave-one-out prediction error over the detected target marks.
  //
  // This exists because the fit's own rms residual cannot be trusted to say
  // whether the labels are any good. A homography has 8 degrees of freedom; 4
  // marks fit it exactly, and 5 leave only 2 residual degrees, so a badly
  // measured centre is absorbed by the fit rather than shown by it. Measured:
  // a frame with rms 1.39px carried label errors up to 66px, on marks that
  // were READ, not extrapolated.
  //
  // LOO asks the question the rms only appears to answer -- refit without one
  // mark, then predict it -- and every one of those predictions is made
  // without the data it is checked against. That is exactly the situation
  // every unread mark's label is in.
  const T = target ?? hexTarget;
  const pairs = (res.fused ?? [])
    .filter((f) => T.byId.has(f.id))
    .map((f) => {
      const m = T.byId.get(f.id);
      return { sx: m.xMm, sy: m.yMm, dx: f.xc, dy: f.yc, id: f.id };
    });
  // 4 points fit exactly, so LOO needs a fifth to have anything to hold out
  if (pairs.length < 5) return null;
  let worstPx = 0, id = null;
  const each = [];
  for (const p of pairs) {
    const fit = fitHomography(pairs.filter((q) => q !== p));
    if (!fit) return null;
    const [px, py] = fit.map(p.sx, p.sy);
    const d = Math.hypot(px - p.dx, py - p.dy);
    each.push({ id: p.id, px: +d.toFixed(1) });
    if (d > worstPx) { worstPx = d; id = p.id; }
  }
  return { worstPx: +worstPx.toFixed(1), id, n: pairs.length, each };
});};
const _1epdu7f = function _hexRigScore() {return (function hexRigScore(res, truth, tolFrac = 0.6) {
  // Score one cascade result against a FROZEN label set.
  //
  // This is the difference between the rig and fitHexPose. fitHexPose fits the
  // plane from the detections in the frame it is given, which is right for a
  // live view but circular for tuning: change a setting, lose a mark, and the
  // plane moves under you, so the thing you are scoring against is a function
  // of the thing you are scoring. Here the labels were fixed once, at capture
  // time, by a fit that met a quality bar (see hexRig), and every replay at
  // every setting is scored against those same seven predicted positions.
  //
  // States match fitHexPose's vocabulary so the live overlay and the sweep
  // table mean the same thing by the same word.
  const fused = res.fused ?? [];
  const unread = (res.unidentified ?? []).filter((u) => u.posed);
  const known = new Set(truth.map((t) => t.id));
  const marks = truth.map((t) => {
    const tol = tolFrac * t.radiusPx;
    const hit = fused.find((f) => f.id === t.id);
    const near = unread.find((u) => Math.hypot(u.xc - t.x, u.yc - t.y) <= tol);
    const resid = hit ? Math.hypot(hit.xc - t.x, hit.yc - t.y) : null;
    return {
      id: t.id,
      state: hit ? (resid <= tol ? "read" : "misplaced") : near ? "located" : "missing",
      residualPx: resid == null ? null : +resid.toFixed(1)
    };
  });
  const counts = { read: 0, misplaced: 0, located: 0, missing: 0 };
  for (const m of marks) counts[m.state]++;
  const offTarget = fused.filter((f) => !known.has(f.id));
  // A wrong id costs more than a miss. The target's seven ids are pairwise
  // Hamming distance 3 apart, so a false read is not a near miss of a correct
  // one -- it is the detector asserting something no single flipped cell can
  // explain. Weight 3 is a judgement, and it is the only judgement in here;
  // every other number reported is a count.
  const wrong = counts.misplaced + offTarget.length;
  return {
    marks, counts,
    offTarget: offTarget.map((f) => ({ id: f.id, x: Math.round(f.xc), y: Math.round(f.yc) })),
    wrong,
    score: counts.read - 3 * wrong
  };
});};
const _q7egru = function _hexRigCases(Inputs) {return (Inputs.input([]));};
const _cih7ns = (G, _) => G.input(_);
const _1di846o = function _hexRigView(htl) {
  // The rig draws into its OWN canvas rather than laying an overlay over
  // liveVideo. A DOM node lives in one place at a time, so borrowing the video
  // element would take it out of §0's view; and the rig wants the frame it
  // actually analysed on screen, at working resolution, not the camera's.
  const cap = htl.html`<canvas style="display:block;width:100%;height:auto;background:#151515"></canvas>`;
  const overlay = htl.svg`<svg viewBox="0 0 960 540" preserveAspectRatio="none"
    style="position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none"></svg>`;
  const hud = htl.html`<div style="position:absolute;left:0;bottom:0;right:0;padding:4px 8px;
    background:rgba(0,0,0,0.6);color:#dfe;font:12px/1.5 ui-monospace,monospace"></div>`;
  const stage = htl.html`<div style="position:relative;max-width:760px;background:#1b1b1b;
    border-radius:6px;overflow:hidden">${cap}${overlay}${hud}</div>`;

  const keep = htl.html`<button style="font:13px system-ui;padding:5px 12px">keep this frame</button>`;
  const clear = htl.html`<button style="font:13px system-ui;padding:5px 12px">clear cases</button>`;
  const auto = htl.html`<label style="font:13px system-ui;display:flex;gap:5px;align-items:center">
    <input type="checkbox" checked> auto-collect hard cases</label>`;
  const note = htl.html`<span style="color:var(--theme-foreground-muted,#888);font:12px ui-monospace,monospace"></span>`;
  const bar = htl.html`<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:8px 0">
    ${keep}${clear}${auto}${note}</div>`;

  const el = htl.html`<div>${stage}${bar}</div>`;
  // The buttons only raise flags; hexRig reads and clears them. It is the one
  // cell that holds the frame, the labels and the settings that produced them
  // together, and a case missing any of the three cannot be replayed -- so it
  // owns every write to the case store.
  el.wantKeep = false;
  el.wantClear = false;
  el.autoCollect = () => auto.firstElementChild.checked;
  el.cap = cap;
  el.overlay = overlay;
  el.hud = hud;
  el.note = note;
  keep.onclick = () => { el.wantKeep = true; };
  clear.onclick = () => { el.wantClear = true; };
  return el;
};
const _1bfhbxi = async function* _hexRig(hexRigView,$0,liveOn,liveVideo,hexRigCfg,analyzeFrameMan,hexRigOpts,fitHexPose,hexRigLoo) {
  // The calibration rig. Point the camera at the printed §11.4 sheet and it
  // does three things at once:
  //
  //   1. runs the cascade at whatever hexRigCfg currently says,
  //   2. fits the sheet's plane and grades all seven marks against it, so the
  //      failures are named rather than counted,
  //   3. KEEPS the frames that fail, with their labels, so the failure can be
  //      replayed offline at other settings (hexRigSweep).
  //
  // Point 3 is the reason it exists. Tuning against a live camera tunes
  // against whatever you happened to be pointing at while you dragged the
  // slider; a knob that looks better is indistinguishable from a hand that
  // moved. A stored case is the same photons every time.
  //
  // A frame is only worth keeping if it can be LABELLED, and the bar for that
  // is the fussiest part of this cell, because a mislabelled case is worse
  // than no case: it teaches the sweep the wrong thing and never announces
  // itself. Three conditions, and the third is the one that matters:
  //
  //   read >= 5     4 marks fit a homography exactly, so 4 tells you nothing
  //                 about whether the fit is right.
  //   rms <= 4px    cheap, catches the obviously broken.
  //   LOO <= 0.3r   leave-one-out prediction error, worst over the detected
  //                 marks, against the median predicted radius.
  //
  // The rms bar alone is not enough and measurably so: a rendered frame with
  // rms 1.39px carried label errors of 66px. With 5 marks a homography has 2
  // spare degrees of freedom, so it absorbs a badly measured centre instead of
  // reporting it, and the residual it shows you is the residual of the data it
  // was fitted to. Across 12 rendered frames the LOO bar admitted exactly the
  // one whose labels were actually good (true error 0.06 radii) and rejected
  // every frame whose labels were off by 0.4 radii or more -- see
  // hexRigSelfTest, which checks that against the renderer's own truth.
  const view = hexRigView;
  const store = $0;
  const MAX = 12;
  const MIN_GAP_MS = 1200;
  const LOO_FRAC = 0.3;

  if (!liveOn) {
    view.hud.textContent = "camera off — turn it on in §0";
    yield null;
    await new Promise(() => {}); // park; the toggle re-runs this cell
  }

  const ctxOut = view.cap.getContext("2d");
  const work = window.document.createElement("canvas");
  let W = 0, H = 0, ctx = null, gray = null;
  let lastCap = -1e9, lastYield = 0, n = 0, kept = 0;
  const fps = [];
  const COL = {
    read: "#2fe08a", located: "#ffd23f", missing: "#ff5c5c",
    misplaced: "#ff9f1c", off: "#d264ff"
  };

  const push = (kase) => {
    // Pinned (hand-kept) cases outrank collected ones, then hardest first.
    // Something kept on purpose should never be evicted by the auto-collector.
    const next = [...store.value, kase]
      .sort((a, b) => (b.pinned - a.pinned) || (b.difficulty - a.difficulty))
      .slice(0, MAX);
    store.value = next;
    store.dispatchEvent(new window.Event("input", { bubbles: true }));
    kept = next.length;
  };

  while (true) {
    await new Promise((r) => window.requestAnimationFrame(r));
    if (view.wantClear) {
      view.wantClear = false;
      store.value = [];
      store.dispatchEvent(new window.Event("input", { bubbles: true }));
      kept = 0;
    }
    const v = liveVideo;
    if (!v || v.readyState < 2 || !v.videoWidth) continue;
    const tw = Math.min(hexRigCfg.maxWidth, v.videoWidth);
    const th = Math.round((v.videoHeight * tw) / v.videoWidth);
    if (tw !== W || th !== H) {
      W = tw; H = th;
      work.width = W; work.height = H;
      view.cap.width = W; view.cap.height = H;
      ctx = work.getContext("2d", { willReadFrequently: true });
      gray = new Uint8Array(W * H);
      view.overlay.setAttribute("viewBox", `0 0 ${W} ${H}`);
    }
    ctx.drawImage(v, 0, 0, W, H);
    const px = ctx.getImageData(0, 0, W, H).data;
    for (let i = 0, p = 0; i < gray.length; i++, p += 4)
      gray[i] = (px[p] * 77 + px[p + 1] * 150 + px[p + 2] * 29) >> 8;
    ctxOut.drawImage(work, 0, 0);

    const t = window.performance.now();
    const res = analyzeFrameMan({ gray, w: W, h: H }, hexRigOpts);
    const pose = fitHexPose({ ...res, w: W, h: H });
    const dt = window.performance.now() - t;
    fps.push(dt);
    if (fps.length > 20) fps.shift();

    // ---- overlay ----
    const parts = [];
    if (pose.ok) {
      const ring = pose.marks.filter((m) => m.k != null);
      if (ring.length > 2)
        parts.push(
          `<polygon points="${ring.map((m) => `${m.predicted.x},${m.predicted.y}`).join(" ")}"
            fill="none" stroke="#5af" stroke-width="1.5" stroke-dasharray="4 6" opacity="0.8"/>`
        );
      for (const m of pose.marks) {
        const c = COL[m.state];
        const r = m.radiusPx;
        const dash = m.state === "read" ? "none" : m.state === "located" ? "7 5" : "2 6";
        parts.push(
          `<circle cx="${m.predicted.x}" cy="${m.predicted.y}" r="${r.toFixed(1)}" fill="none"
            stroke="${c}" stroke-width="${m.state === "read" ? 3 : 2}" stroke-dasharray="${dash}"/>` +
          `<text x="${m.predicted.x}" y="${(m.predicted.y - r - 5).toFixed(1)}"
            font-family="ui-monospace,monospace" font-size="${Math.max(12, r * 0.45).toFixed(0)}"
            font-weight="700" fill="${c}" text-anchor="middle" paint-order="stroke"
            stroke="#000" stroke-width="4">${m.id}${m.state === "read" ? "" : " " + m.state[0]}</text>`
        );
      }
      for (const o of pose.offTarget)
        parts.push(
          `<g stroke="${COL.off}" stroke-width="3">
            <line x1="${o.x - 12}" y1="${o.y - 12}" x2="${o.x + 12}" y2="${o.y + 12}"/>
            <line x1="${o.x - 12}" y1="${o.y + 12}" x2="${o.x + 12}" y2="${o.y - 12}"/></g>
          <text x="${o.x}" y="${o.y - 16}" font-family="ui-monospace,monospace" font-size="14"
            fill="${COL.off}" text-anchor="middle" paint-order="stroke" stroke="#000"
            stroke-width="4">${o.id}?</text>`
        );
    } else {
      // no plane: show the raw detections, otherwise there is nothing to aim by
      for (const f of res.fused)
        parts.push(
          `<circle cx="${f.xc.toFixed(1)}" cy="${f.yc.toFixed(1)}" r="${(f.a ?? f.wHalf ?? 24).toFixed(1)}"
            fill="none" stroke="#8fa" stroke-width="2"/>`
        );
    }
    view.overlay.innerHTML = parts.join("");

    // ---- collect ----
    const loo = pose.ok ? hexRigLoo(res) : null;
    const rMed = pose.ok
      ? pose.marks.map((m) => m.radiusPx).sort((a, b) => a - b)[3]
      : null;
    const looOk = !!(loo && loo.worstPx <= LOO_FRAC * rMed);
    const labelled = pose.ok && pose.counts.read >= 5 && pose.rmsResidualPx <= 4 && looOk;
    const difficulty = pose.ok
      ? 4 * (pose.counts.misplaced + pose.offTarget.length) +
        2 * pose.counts.located + pose.counts.missing
      : 0;
    const manual = view.wantKeep;
    view.wantKeep = false;
    const auto = view.autoCollect() && labelled && difficulty > 0 && t - lastCap > MIN_GAP_MS;
    if (manual || auto) {
      lastCap = t;
      n++;
      push({
        name: `hexcase-${String(n).padStart(2, "0")}`,
        w: W, h: H,
        // a copy: the loop reuses this buffer every frame
        gray: gray.slice(),
        url: work.toDataURL("image/png"),
        labelled,
        pinned: manual,
        difficulty,
        // Frozen at capture. Every later replay is scored against THESE, not
        // against a fresh fit -- see hexRigScore for why that matters. The
        // capture-time state rides along on each mark so the panel can show
        // WHICH mark failed, which is the part a count throws away.
        truth: pose.ok
          ? pose.marks.map((m) => ({
              id: m.id, x: m.predicted.x, y: m.predicted.y,
              radiusPx: m.radiusPx, state: m.state
            }))
          : [],
        cfg: { ...hexRigCfg },
        capture: {
          counts: pose.ok ? { ...pose.counts } : null,
          offTarget: pose.ok ? pose.offTarget.length : 0,
          rmsPx: pose.ok ? pose.rmsResidualPx : null,
          looPx: loo ? loo.worstPx : null,
          looFrac: loo ? +(loo.worstPx / rMed).toFixed(3) : null,
          mmPerPx: pose.ok ? pose.mmPerPx : null,
          distanceMm: pose.pose ? pose.pose.distanceMm : null,
          tiltDeg: pose.pose ? pose.pose.tiltDeg : null,
          ms: +dt.toFixed(1)
        }
      });
    }

    const med = fps.slice().sort((a, b) => a - b)[fps.length >> 1] ?? dt;
    const c = pose.ok ? pose.counts : null;
    view.hud.textContent =
      `${W}x${H} ${med.toFixed(0)}ms  ` +
      (pose.ok
        ? `read ${c.read} located ${c.located} missing ${c.missing} misplaced ${c.misplaced}` +
          (pose.offTarget.length ? ` off ${pose.offTarget.length}` : "") +
          `  rms ${pose.rmsResidualPx}px` +
          (loo ? ` loo ${loo.worstPx}px` : "") +
          `  ${pose.mmPerPx}mm/px` +
          (pose.pose ? `  ${pose.pose.distanceMm}mm  tilt ${pose.pose.tiltDeg}°` : `  (${pose.poseWhy})`)
        : `no plane — ${res.fused.length} read, need 4 target marks`) +
      `  cases ${kept}/${MAX}`;
    view.note.textContent = labelled
      ? `frame is labellable (difficulty ${difficulty})`
      : !pose.ok
        ? "not labellable: no plane"
        : pose.counts.read < 5
          ? `not labellable: only ${pose.counts.read} read — move closer, 5 is the minimum`
          : !looOk
            ? `not labellable: leave-one-out ${loo ? loo.worstPx + "px" : "n/a"}` +
              ` vs ${(LOO_FRAC * rMed).toFixed(0)}px allowed — the plane does not predict its own marks`
            : `not labellable: rms ${pose.rmsResidualPx}px`;

    if (t - lastYield > 250) {
      lastYield = t;
      yield {
        w: W, h: H,
        msMedian: +med.toFixed(1),
        counts: pose.ok ? pose.counts : null,
        offTarget: pose.ok ? pose.offTarget.length : 0,
        rmsPx: pose.ok ? pose.rmsResidualPx : null,
        looPx: loo ? loo.worstPx : null,
        mmPerPx: pose.ok ? pose.mmPerPx : null,
        pose: pose.pose,
        labelled, difficulty, cases: kept
      };
    }
  }
};
const _136sicf = function _hexRigCasePanel(hexRigCases,htl) {
  // What the rig collected, and a way to get it off the page. A case is only
  // useful later if the LABELS travel with the pixels, so the JSON link
  // carries the frozen truth positions, the per-mark verdict and the settings
  // that produced them -- a bare PNG would have to be re-labelled by hand,
  // which is the work the target exists to avoid.
  //
  // The per-mark chips are the point of the strip. Seven ids in fixed print
  // positions means "the same mark fails every time" and "a different one
  // fails each time" look completely different at a glance, and they are
  // different problems: the first is the sheet or the optics, the second is
  // the detector's margin.
  const cases = hexRigCases;
  const COL = {
    read: "#2fe08a", located: "#ffd23f", missing: "#ff5c5c", misplaced: "#ff9f1c"
  };
  if (!cases.length)
    return htl.html`<div style="font:13px system-ui;color:var(--theme-foreground-muted,#888);
      padding:8px 0">No cases yet. Aim the camera at the printed sheet with the rig running:
      frames that read 5+ marks and still fail on at least one are collected automatically.</div>`;

  const bundle = cases.map((c) => ({
    name: c.name, w: c.w, h: c.h, labelled: c.labelled, pinned: c.pinned,
    difficulty: c.difficulty, truth: c.truth, cfg: c.cfg, capture: c.capture
  }));
  const jsonHref = "data:application/json," + encodeURIComponent(JSON.stringify(bundle, null, 1));

  const chip = (t) => htl.html`<span style="display:inline-block;padding:1px 4px;margin:1px;
    border-radius:3px;font:10px ui-monospace,monospace;color:#111;
    background:${COL[t.state] ?? "#888"}" title=${t.state}>${t.id}</span>`;

  const card = (c) => htl.html`<div style="width:210px;font:12px system-ui">
    <a href=${c.url} download=${c.name + ".png"} title="click to save the frame">
      <img src=${c.url} style="width:210px;display:block;border:1px solid #4444;border-radius:3px">
    </a>
    <div style="font:11px ui-monospace,monospace;padding-top:3px">
      ${c.name} ${c.w}x${c.h}${c.pinned ? " · kept" : ""}
    </div>
    <div>${c.truth.map(chip)}</div>
    <div style="font:11px ui-monospace,monospace;color:var(--theme-foreground-muted,#888)">
      ${c.capture.rmsPx != null ? `rms ${c.capture.rmsPx}px · ${c.capture.mmPerPx}mm/px` : "unlabelled"}${
        c.capture.distanceMm != null ? ` · ${c.capture.distanceMm}mm · ${c.capture.tiltDeg}°` : ""}${
        c.capture.offTarget ? ` · ${c.capture.offTarget} off-target` : ""}
    </div>
  </div>`;

  const nLabelled = cases.filter((c) => c.labelled).length;
  return htl.html`<div style="font:13px system-ui">
    <div style="margin-bottom:8px">
      ${cases.length} case${cases.length === 1 ? "" : "s"}, ${nLabelled} labelled —
      <a href=${jsonHref} download="hexcases.json">download labels</a>
      <span style="color:var(--theme-foreground-muted,#888)">
        (frames save one at a time; click a thumbnail)</span>
    </div>
    <div style="display:flex;gap:12px;flex-wrap:wrap">${cases.map(card)}</div>
  </div>`;
};
const _16hxrfy = function _hexRigSweepGo(Inputs) {return (Inputs.button("run sweep over collected cases", {
  value: 0,
  reduce: (v) => v + 1
}));};
const _5e077b = (G, _) => G.input(_);
const _15xffv4 = function _hexRigSynthCases(hexTarget,renderHexScene,analyzeFrameMan,fitHexPose,hexRigLoo) {
  // Rendered stand-ins for camera frames, graded by the rig's own labelling
  // bar, with the renderer's truth kept alongside so the bar itself can be
  // checked (hexRigSelfTest) and the sweep has something to chew on before
  // anyone has printed the sheet (hexRigSweep falls back to these).
  //
  // One render pass, three consumers. The scenes are all near ⌀110-130 marks
  // because that is where this cascade comes apart: bigger and it reads all
  // seven, smaller and it reads none, and neither teaches anything.
  const T = hexTarget;
  const LOO_FRAC = 0.3;
  const CANDIDATES = [
    { dPx: 110, blur: 1.0, yaw: 10, tilt: 30, seed: 11 },
    { dPx: 120, blur: 1.0, yaw: 10, tilt: 30, seed: 11 },
    { dPx: 130, blur: 1.0, yaw: 10, tilt: 30, seed: 11 },
    { dPx: 110, blur: 0.9, yaw: 10, tilt: 30, seed: 11 },
    { dPx: 100, blur: 1.0, yaw: 10, tilt: 30, seed: 11 },
    { dPx: 125, blur: 1.1, yaw: 0, tilt: 25, seed: 9 }
  ];
  const OPTS = { stride: 4 };
  const graded = [], cases = [];

  for (const c of CANDIDATES) {
    const scale = c.dPx / T.diameterMm;
    const H = Math.round((Math.max(T.heightMm, T.widthMm) * scale) / 0.8);
    const W = Math.round((H * 16) / 9);
    const scene = renderHexScene({
      target: T, W, H, fill: (T.heightMm * scale) / H,
      yawDeg: c.yaw, tiltDeg: c.tilt, rollDeg: 0, blur: c.blur, noise: 4, seed: c.seed
    });
    const res = analyzeFrameMan({ gray: scene.gray, w: scene.w, h: scene.h }, OPTS);
    const pose = fitHexPose({ ...res, w: scene.w, h: scene.h });
    const loo = pose.ok ? hexRigLoo(res) : null;
    const rMed = pose.ok ? pose.marks.map((m) => m.radiusPx).sort((a, b) => a - b)[3] : null;
    const admitted =
      pose.ok && pose.counts.read >= 5 && pose.rmsResidualPx <= 4 &&
      !!loo && loo.worstPx <= LOO_FRAC * rMed;

    // what the renderer knows and the pose fit never sees
    let trueErr = null;
    if (pose.ok) {
      const byId = new Map(scene.truth.map((t) => [t.id, t]));
      trueErr = 0;
      for (const m of pose.marks) {
        const s = byId.get(m.id);
        if (s) trueErr = Math.max(trueErr, Math.hypot(m.predicted.x - s.x, m.predicted.y - s.y));
      }
      trueErr = +(trueErr / rMed).toFixed(2);
    }
    const name = `synth-${c.dPx}-b${c.blur}`;
    graded.push({
      ...c, name, admitted, trueErr,
      read: pose.ok ? pose.counts.read : 0,
      rmsPx: pose.ok ? pose.rmsResidualPx : null,
      looR: loo && rMed ? +(loo.worstPx / rMed).toFixed(2) : null,
      why: pose.ok ? null : `no plane (${res.fused.length} read)`
    });
    if (admitted && pose.counts.read < 7)
      cases.push({
        name, synthetic: true, labelled: true,
        w: scene.w, h: scene.h, gray: scene.gray,
        truth: pose.marks.map((m) => ({
          id: m.id, x: m.predicted.x, y: m.predicted.y, radiusPx: m.radiusPx, state: m.state
        })),
        pose, res
      });
  }
  return { graded, cases, looFrac: LOO_FRAC, opts: OPTS };
};
const _zoue8d = async function* _hexRigSweep(hexRigSweepGo,hexRigCases,hexRigSynthCases,hexRigCfg,hexRigOpts,analyzeFrameMan,hexRigScore) {
  // Replay every collected case at one changed knob at a time, scored against
  // the labels frozen when the case was captured.
  //
  // ONE AT A TIME is a real limitation, stated up front: this is a coordinate
  // sweep, not a grid, so it cannot see interactions. A stride that only pays
  // off once the edge threshold drops will not show up here. The full grid of
  // these nine knobs is ~200k combinations per case, which is not a thing to
  // run in a page; what this does buy is the derivative in each direction from
  // where you are standing, which is the question a tuning session actually
  // asks.
  //
  // With no collected cases it falls back to the rendered ones, so the
  // machinery is demonstrable without a printed sheet — flagged in the result,
  // because a synthetic frame is a statement about the renderer's idea of a
  // mark and a camera frame is not.
  //
  // Button-gated: it replays every stored frame, which costs seconds.
  //
  // maxWidth is not swept: it changes the INPUT, not the detector, and the
  // stored frames are fixed at the width they were captured at. Comparing a
  // detector setting across two different downsamples of the same photo would
  // be comparing two experiments. bothAxes is not swept either, for a
  // different reason: it is not a tuning knob but a choice about how much
  // compute to spend, and sweeping nine knobs at two passes each doubles the
  // sweep for an answer already given by manAxesTest.
  //
  // Everything here is YIELDED, never returned. A generator cell's return
  // value is discarded by the runtime — only yields become the cell's value —
  // so a `return "no cases yet"` guard shows up as a blank cell.
  if (!hexRigSweepGo) {
    yield "press ‘run sweep over collected cases’ (uses rendered cases if you have collected none)";
    return;
  }
  const collected = hexRigCases.filter((c) => c.labelled && c.truth.length);
  const synthetic = !collected.length;
  const cases = synthetic ? hexRigSynthCases.cases : collected;
  if (!cases.length) {
    yield "no cases at all — not even a rendered one admitted by the labelling bar";
    return;
  }

  const base = hexRigCfg;
  // Derived from hexRigOpts, not rebuilt beside it. The two used to be
  // assembled independently from hexRigCfg, which meant any option added to
  // one was silently missing from the other — the sweep would then be
  // measuring a different detector from the live rig and say nothing about it.
  // Spreading means a new option is carried here for free, and only the swept
  // knobs are overridden.
  const optsFor = (over) => {
    const c = { ...base, ...over };
    return {
      ...hexRigOpts,
      stride: c.stride, edgeThreshold: c.edgeThreshold, minRows: c.minRows,
      minVotes: c.minVotes, voteRatio: c.voteRatio, gapFrac: c.gapFrac,
      layout: {
        ...hexRigOpts.layout,
        minAxisRatio: c.minAxisRatio, minCover: c.minCover, maxASpread: c.maxASpread
      }
    };
  };
  const evalCfg = (over) => {
    const tot = { read: 0, located: 0, missing: 0, misplaced: 0, off: 0, score: 0, ms: 0 };
    for (const k of cases) {
      const res = analyzeFrameMan({ gray: k.gray, w: k.w, h: k.h }, optsFor(over));
      const s = hexRigScore(res, k.truth);
      tot.read += s.counts.read;
      tot.located += s.counts.located;
      tot.missing += s.counts.missing;
      tot.misplaced += s.counts.misplaced;
      tot.off += s.offTarget.length;
      tot.score += s.score;
      tot.ms += res.ms;
    }
    tot.ms = +(tot.ms / cases.length).toFixed(1);
    return tot;
  };

  const GRID = {
    stride: [2, 3, 4, 5, 6, 8],
    edgeThreshold: [6, 8, 10, 12, 16, 20, 25],
    minRows: [2, 3, 4, 5],
    minVotes: [1, 2, 3],
    voteRatio: [1, 1.5, 2, 3],
    minAxisRatio: [0.2, 0.25, 1 / 3, 0.45, 0.6],
    minCover: [0, 0.15, 0.3, 0.45],
    maxASpread: [0.2, 0.35, 0.5, 0.8],
    gapFrac: [0.2, 0.25, 0.3, 0.35, 0.45]
  };
  const total = Object.values(GRID).reduce((a, v) => a + v.length, 0);
  const maxRead = 7 * cases.length;
  const source =
    (synthetic ? "RENDERED cases (no camera captures yet)" : "captured cases") +
    (hexRigOpts.bothAxes ? ", scanning both axes" : "");

  const baseline = evalCfg({});
  const rows = [];
  let done = 0;
  yield { source, status: `0/${total}`, cases: cases.length, baseline };
  for (const [knob, vals] of Object.entries(GRID)) {
    for (const v of vals) {
      const r = evalCfg({ [knob]: v });
      rows.push({
        knob, value: v,
        here: Math.abs(v - base[knob]) < 1e-9 ? "<<" : "",
        read: `${r.read}/${maxRead}`,
        located: r.located, missing: r.missing,
        wrong: r.misplaced + r.off,
        score: r.score,
        dScore: r.score - baseline.score,
        ms: r.ms
      });
      done++;
    }
    // hand the frame back between knobs: the live rig is probably still
    // running and a frozen page during a 15 s sweep looks like a crash
    yield { source, status: `${done}/${total} — ${knob}`, cases: cases.length, baseline, rows: rows.slice() };
    await new Promise((r) => window.setTimeout(r, 0));
  }

  // Every single-knob change that helped, applied together. This does NOT
  // rescue the OFAT limitation — it is one point, not a search — but it is the
  // cheapest possible check on whether the improvements compose, and when it
  // lands below the sum of its parts that itself is the finding.
  const best = {};
  for (const [knob, vals] of Object.entries(GRID)) {
    let bv = base[knob], bs = baseline.score;
    for (const v of vals) {
      const row = rows.find((r) => r.knob === knob && r.value === v);
      if (row.score > bs) { bs = row.score; bv = v; }
    }
    if (Math.abs(bv - base[knob]) > 1e-9) best[knob] = bv;
  }
  const combined = Object.keys(best).length ? evalCfg(best) : null;

  yield {
    source,
    cases: cases.length,
    frames: cases.map((c) => c.name).join(" "),
    baseline: {
      read: `${baseline.read}/${maxRead}`, located: baseline.located,
      missing: baseline.missing, wrong: baseline.misplaced + baseline.off,
      score: baseline.score, ms: baseline.ms
    },
    rows: rows.sort((a, b) => b.dScore - a.dScore),
    bestSingles: best,
    combined: combined
      ? {
          settings: best,
          read: `${combined.read}/${maxRead}`,
          wrong: combined.misplaced + combined.off,
          score: combined.score,
          dScore: combined.score - baseline.score,
          sumOfParts: Object.entries(best).reduce(
            (a, [k, v]) => a + rows.find((r) => r.knob === k && r.value === v).dScore, 0
          ),
          ms: combined.ms
        }
      : "no single-knob change beat the current settings"
  };
};
const _a0ribc = function _hexRigSelfTest(hexRigSynthCases,hexRigScore,analyzeFrameMan) {
  // The rig's regression, run without a camera.
  //
  // The thing under test is the LABELLING BAR. Everything downstream — which
  // knob looks good, which mark is blamed, which frames are worth keeping —
  // is downstream of "are these labels right", and on a real camera there is
  // nothing to check that claim against. On a rendered scene there is: the
  // renderer knows where it put each mark, and the pose fit never sees it.
  //
  // Each candidate is graded twice. The rig's bar (read >= 5, rms <= 4px,
  // leave-one-out <= 0.3 radii) decides whether to trust the frame; the
  // renderer's truth says whether it should have.
  //
  //   A  no false accept — an admitted frame's true label error is small
  //   B  the bar is not vacuous — it rejects frames whose labels are bad
  //   C  hexRigScore reproduces fitHexPose on the admitted frames
  //   D  the sweep responds to a knob at all
  //
  // A is the one that would hurt, and note what it costs to get right: rms
  // ALONE admits ⌀180/blur1.8 at 1.39px while its labels are off by 66px,
  // because 5 points leave a homography 2 spare degrees of freedom to hide a
  // bad centre in. LOO refits without each mark and predicts it — the
  // situation every UNREAD mark's label is in — and separates these frames by
  // a factor of five where rms does not separate them at all.
  const { graded, cases, opts } = hexRigSynthCases;
  const lines = graded.map(
    (g) =>
      `⌀${g.dPx} blur ${g.blur} yaw ${g.yaw} tilt ${g.tilt}: ` +
      (g.why
        ? `${g.why} → reject`
        : `read ${g.read} rms ${g.rmsPx}px loo ${g.looR == null ? "n/a" : g.looR + "r"} → ` +
          `${g.admitted ? "ADMIT" : "reject"}, true label err ${g.trueErr}r`)
  );

  // A — no false accept
  const accepted = graded.filter((g) => g.admitted);
  const worstAccepted = accepted.length ? Math.max(...accepted.map((g) => g.trueErr)) : null;
  const noFalseAccept = accepted.length > 0 && worstAccepted <= 0.15;
  lines.push(
    "",
    `A no false accept: ${accepted.length} admitted, worst true label error ` +
    `${worstAccepted == null ? "n/a" : worstAccepted + "r"} — ` +
    `${accepted.length === 0 ? "FAIL (admitted nothing)" : noFalseAccept ? "ok" : "FAIL (>0.15r)"}`
  );

  // B — the bar has teeth
  const badRejected = graded.filter((g) => !g.admitted && g.trueErr != null && g.trueErr > 0.3);
  lines.push(
    `B bar has teeth: rejected ${badRejected.length} frame(s) whose labels were off by >0.3r ` +
    `(worst ${badRejected.length ? Math.max(...badRejected.map((g) => g.trueErr)) + "r" : "-"}) — ` +
    `${badRejected.length ? "ok" : "FAIL (rejected nothing bad — bar may be vacuous)"}`
  );

  if (!cases.length) {
    lines.push("", "no admitted partial-failure case — C and D could not run", "FAIL");
    return lines.join("\n");
  }

  // C — the two labelling paths agree
  const mismatches = [];
  for (const k of cases) {
    const s = hexRigScore(k.res, k.truth);
    for (const key of ["read", "located", "missing", "misplaced"])
      if (s.counts[key] !== k.pose.counts[key])
        mismatches.push(`${k.name}.${key}: score ${s.counts[key]} vs pose ${k.pose.counts[key]}`);
  }
  lines.push(
    "C frozen score vs live pose: " +
    (mismatches.length ? "MISMATCH " + mismatches.join("; ") : "identical on all cases")
  );

  // D — the sweep machinery responds
  const at = (over) => {
    let read = 0, score = 0;
    for (const k of cases) {
      const r = analyzeFrameMan({ gray: k.gray, w: k.w, h: k.h }, { ...opts, ...over });
      const s = hexRigScore(r, k.truth);
      read += s.counts.read;
      score += s.score;
    }
    return { read, score };
  };
  const b = at({}), coarse = at({ stride: 8 }), fine = at({ stride: 2 });
  const responds = coarse.score !== b.score || fine.score !== b.score;
  lines.push(
    `D sweep responds: stride 2 → ${fine.read} read, 4 → ${b.read}, 8 → ${coarse.read} ` +
    `(score ${fine.score}/${b.score}/${coarse.score}) — ${responds ? "ok" : "FAIL (flat)"}`
  );

  const pass = noFalseAccept && badRejected.length > 0 && !mismatches.length && responds;
  lines.push("", pass ? "PASS" : "FAIL");
  return lines.join("\n");
};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };
  const fileAttachments = new Map(["frame-mirror-angled.png","frame-mirror-flat.png","frame-blank.png","frame-man-phone.png"].map((name) => {
    const module_name = "@tomlarkworthy/coded-landmark-tracking";
    const {status, mime, bytes} = window.lopecode.contentSync(module_name + "/" + encodeURIComponent(name));
    const blob_url = URL.createObjectURL(new Blob([bytes], { type: mime}));
    return [name, {url: blob_url, mimeType: mime}]
  }));
  main.builtin("FileAttachment", runtime.fileAttachments(name => fileAttachments.get(name)));

  $def("_ebocnh", "headline_md", ["md"], _ebocnh);  
  $def("_n93g8p", "path_md", ["md","tex"], _n93g8p);  
  $def("_1ve7ka5", "viewof liveOn", ["Inputs"], _1ve7ka5);  
  $def("_1keow27", "liveOn", ["Generators","viewof liveOn"], _1keow27);  
  $def("_1kn5g73", "viewof liveFacing", ["Inputs"], _1kn5g73);  
  $def("_1ncd6hs", "liveFacing", ["Generators","viewof liveFacing"], _1ncd6hs);  
  $def("_xdtu1n", "liveStream", ["liveOn","liveFacing","invalidation"], _xdtu1n);  
  $def("_1sh7vi3", "liveVideo", ["htl","liveStream","invalidation"], _1sh7vi3);  
  $def("_1v7uxcr", "viewof liveSolver", ["Inputs"], _1v7uxcr);  
  $def("_lsv1nput", "liveSolver", ["Generators","viewof liveSolver"], _lsv1nput);  
  $def("_1emy5ow", "liveView", ["htl","liveOn","liveVideo"], _1emy5ow);  
  $def("_1tf4dro", "liveRun", ["liveOn","liveStream","liveView","liveVideo","markFamily","analyzeFrameMan","analyzeFrame","liveSolver","detectPool","markEllipse"], _1tf4dro);  
  $def("_bcrpkq", "viewof targetId", ["Inputs","usableIds"], _bcrpkq);  
  $def("_1tf3qak", "targetId", ["Generators","viewof targetId"], _1tf3qak);  
  $def("_kksuf6", "targetPanel", ["markFamily","manMarkSvgSource","targetId","markSvgSource","markSheetSvg","usableIds","htl"], _kksuf6);  
  $def("_1031r80", "pose_md", ["md"], _1031r80);  
  $def("_1dft8bc", "poseDemo", ["testFrameBank","htl","analyzeFrame","liveSolver","markEllipse"], _1dft8bc);  
  $def("_1nlpgtu", "markEllipse", ["LAYOUT","xFromK"], _1nlpgtu);  
  $def("_1dvf37e", null, ["md"], _1dvf37e);  
  main.define("module @tomlarkworthy/fast-1d-circular-barcode-matching", async () => runtime.module((await import("/@tomlarkworthy/fast-1d-circular-barcode-matching.js?v=4")).default));  
  main.define("edges1D", ["module @tomlarkworthy/fast-1d-circular-barcode-matching", "@variable"], (_, v) => v.import("edges1D", _));  
  main.define("fitMobiusLS", ["module @tomlarkworthy/fast-1d-circular-barcode-matching", "@variable"], (_, v) => v.import("fitMobiusLS", _));  
  main.define("xFromK", ["module @tomlarkworthy/fast-1d-circular-barcode-matching", "@variable"], (_, v) => v.import("xFromK", _));  
  main.define("module @tomlarkworthy/realtime-multi-barcode-tracking", async () => runtime.module((await import("/@tomlarkworthy/realtime-multi-barcode-tracking.js?v=4")).default));  
  main.define("dpScratch", ["module @tomlarkworthy/realtime-multi-barcode-tracking", "@variable"], (_, v) => v.import("dpScratch", _));  
  main.define("dpAlignFast", ["module @tomlarkworthy/realtime-multi-barcode-tracking", "@variable"], (_, v) => v.import("dpAlignFast", _));  
  main.define("FRAME", ["module @tomlarkworthy/realtime-multi-barcode-tracking", "@variable"], (_, v) => v.import("FRAME", _));  
  main.define("rowOf", ["module @tomlarkworthy/realtime-multi-barcode-tracking", "@variable"], (_, v) => v.import("rowOf", _));  
  main.define("crossRatio", ["module @tomlarkworthy/realtime-multi-barcode-tracking", "@variable"], (_, v) => v.import("crossRatio", _));  
  main.define("crDistance", ["module @tomlarkworthy/realtime-multi-barcode-tracking", "@variable"], (_, v) => v.import("crDistance", _));  
  main.define("fuseCluster", ["module @tomlarkworthy/realtime-multi-barcode-tracking", "@variable"], (_, v) => v.import("fuseCluster", _));  
  main.define("module @tomlarkworthy/circular-barcode-simulator", async () => runtime.module((await import("/@tomlarkworthy/circular-barcode-simulator.js?v=4")).default));  
  main.define("THREE", ["module @tomlarkworthy/circular-barcode-simulator", "@variable"], (_, v) => v.import("THREE", _));  
  $def("_106dc0v", null, ["md","tex"], _106dc0v);  
  $def("_lu0qkj", "LAYOUT", [], _lu0qkj);  
  $def("_dwk66l", "codebook", [], _dwk66l);  
  $def("_1p6gckl", "codebookCheck", ["codebook"], _1p6gckl);  
  $def("_1wej8fk", "radialColor", ["LAYOUT"], _1wej8fk);  
  $def("_1i5b3d0", "codewordGallery", ["LAYOUT","codebook"], _1i5b3d0);  
  $def("_4gz48s", null, ["md"], _4gz48s);  
  $def("_faupuu", "codewordTextures", ["LAYOUT","codebook","THREE","invalidation"], _faupuu);  
  $def("_nfwsus", "viewof nLandmarks", ["Inputs"], _nfwsus);  
  $def("_zsvxn7", "nLandmarks", ["Generators","viewof nLandmarks"], _zsvxn7);  
  $def("_15fbbws", "simRig", ["FRAME","THREE","codewordTextures","nLandmarks","invalidation"], _15fbbws);  
  $def("_j6jmhh", "viewof running", ["Inputs"], _j6jmhh);  
  $def("_u5lzp", "running", ["Generators","viewof running"], _u5lzp);  
  $def("_frwygv", "viewof motion", ["Inputs"], _frwygv);  
  $def("_13kodma", "motion", ["Generators","viewof motion"], _13kodma);  
  $def("_1hy8mdc", "simFrame", ["running","simRig","motion"], _1hy8mdc);  
  $def("_tl97yc", "overlaySvg", ["htl","FRAME"], _tl97yc);  
  $def("_xwbf17", "sceneView", ["simRig","htl","FRAME","overlaySvg"], _xwbf17);  
  $def("_2pll7q", "viewof rowStride", ["Inputs"], _2pll7q);  
  $def("_1jjclm3", "rowStride", ["Generators","viewof rowStride"], _1jjclm3);  
  $def("_1svyp0z", "scanRows", ["rowStride","FRAME"], _1svyp0z);  
  $def("_y17nqa", "groundTruth", ["simFrame","simRig","THREE"], _y17nqa);  
  main.define("templateAtOffset", ["module @tomlarkworthy/realtime-multi-barcode-tracking", "@variable"], (_, v) => v.import("templateAtOffset", _));  
  $def("_1aqjzs8", null, ["md"], _1aqjzs8);  
  $def("_c33xmx", "carrierTemplate", ["LAYOUT"], _c33xmx);  
  $def("_7u0e3a", "crCurve", ["LAYOUT","crossRatio"], _7u0e3a);  
  $def("_t28eph", "detectLandmarkRow", ["LAYOUT","crCurve","windowCandidates","sweepScratch","carrierTable","dpScratch","crDistance","crTable","fitMobiusInto","dpAlignFast","xFromK"], _t28eph);  
  $def("_1w8wvjm", "viewof edgeThreshold", ["Inputs"], _1w8wvjm);  
  $def("_ck7l4a", "edgeThreshold", ["Generators","viewof edgeThreshold"], _ck7l4a);  
  $def("_hqfg1d", "runDetection", ["scanRows","edges1D","rowOf","edgeThreshold","detectLandmarkRow"], _hqfg1d);  
  $def("_10cyklf", "edgeRadii", ["LAYOUT"], _10cyklf);  
  $def("_1jss6my", "radiusLUT", ["LAYOUT","edgeRadii"], _1jss6my);  
  $def("_xg16eo", "nearestEdgeRadius", ["radiusLUT"], _xg16eo);  
  $def("_1kf19es", "involutionScratch", ["LAYOUT"], _1kf19es);  
  $def("_pxtcwi", "detectRowInvolution", ["LAYOUT","involutionScratch","windowCandidates","nearestEdgeRadius","fitMobiusInto","xFromK"], _pxtcwi);  
  $def("_1th0q4j", "detectRow", ["detectLandmarkRow","detectRowInvolution"], _1th0q4j);  
  $def("_1kb5zti", "solver_md", ["md","tex"], _1kb5zti);  
  $def("_1hslwo6", "solverComparison", ["testFrameBank","scanLattice","runPipeline","Inputs"], _1hslwo6);  
  $def("_wmmqxi", "solver_result_md", ["md"], _wmmqxi);  
  $def("_1p863gb", "tilt_md", ["md"], _1p863gb);  
  $def("_1v5ujxb", null, ["md"], _1v5ujxb);  
  $def("_18v6hzh", "decodeLandmark", ["xFromK","LAYOUT","codebook"], _18v6hzh);  
  $def("_1bz0j2c", "viewof minMargin", ["Inputs"], _1bz0j2c);  
  $def("_14a2hls", "minMargin", ["Generators","viewof minMargin"], _14a2hls);  
  $def("_101f5yy", "runPipeline", ["minMargin","scanRows","edges1Dsub","rowOf","edgeThreshold","detectRow","decodeLandmark","xFromK"], _101f5yy);  
  $def("_w7qboo", "frameLandmarks", ["runPipeline","simFrame"], _w7qboo);  
  $def("_16dv5r5", "detectionLayer", ["htl","groundTruth","frameLandmarks","overlaySvg","invalidation"], _16dv5r5);  
  $def("_16xqu3c", "landmarkTable", ["Inputs","frameLandmarks"], _16xqu3c);  
  $def("_134ceh", "scoreLandmarks", ["groundTruth"], _134ceh);  
  $def("_vhmell", "frameScore", ["scoreLandmarks","frameLandmarks"], _vhmell);  
  $def("_d8xg2l", null, ["md","minMargin"], _d8xg2l);  
  $def("_1kcdtq1", "fuseLandmarks", ["rowStride","fuseCluster"], _1kcdtq1);  
  $def("_1whsoz5", "fusedLandmarks", ["runPipeline","simFrame","scanRows","fuseLandmarks"], _1whsoz5);  
  $def("_1cm1mhn", "fusedTable", ["Inputs","fusedLandmarks"], _1cm1mhn);  
  $def("_g4km08", "fusedLayer", ["fusedLandmarks","overlaySvg","invalidation"], _g4km08);  
  $def("_hl8v3v", null, ["md"], _hl8v3v);  
  $def("_1uuc46l", "fusionScore", ["groundTruth","fusedLandmarks"], _1uuc46l);  
  $def("_d5ljip", null, ["md"], _d5ljip);  
  $def("_13fbguf", "drawLandmark", ["LAYOUT","codebook"], _13fbguf);  
  $def("_c4vxv2", "viewof calMode", ["Inputs"], _c4vxv2);  
  $def("_trjtqx", "calMode", ["Generators","viewof calMode"], _trjtqx);  
  $def("_ohzx5w", "viewof calRunning", ["Inputs"], _ohzx5w);  
  $def("_mmw90r", "calRunning", ["Generators","viewof calRunning"], _mmw90r);  
  $def("_ntgvpx", "viewof calSpeed", ["Inputs"], _ntgvpx);  
  $def("_73cqhr", "calSpeed", ["Generators","viewof calSpeed"], _73cqhr);  
  $def("_5pnclc", "stimulusBus", [], _5pnclc);  
  $def("_1g04xsf", "stimulusView", [], _1g04xsf);  
  $def("_xfbe8z", "stimulusRun", ["calRunning","stimulusView","calMode","calSpeed","drawLandmark","stimulusBus"], _xfbe8z);  
  $def("_12d6o8", "viewof calSource", ["Inputs"], _12d6o8);  
  $def("_1dh1pen", "calSource", ["Generators","viewof calSource"], _1dh1pen);  
  $def("_1i4d397", "calStream", ["calRunning","calSource","CAL_FRAME","invalidation"], _1i4d397);  
  $def("_1itgjy2", "calVideo", ["htl","calStream","invalidation"], _1itgjy2);  
  $def("_uxbtt2", "calRun", ["calRunning","CAL_FRAME","calRows","calMode","stimulusBus","calSource","calVideo","stimulusView","analyzeFrame","detectPool"], _uxbtt2);  
  $def("_9ey4fu", "fitHomography", [], _9ey4fu);  
  $def("_nnfn1b", "calHomography", ["calRun","stimulusBus","fitHomography"], _nnfn1b);  
  $def("_1gnnqz3", "calStats", ["calRun","md","stimulusBus","calHomography","htl"], _1gnnqz3);  
  $def("_1gmmbqf", "edges1Dsub", [], _1gmmbqf);  
  $def("_vui5kg", "CAL_FRAME", ["FRAME"], _vui5kg);  
  $def("_4iv3z6", "calRows", ["rowStride","CAL_FRAME","FRAME"], _4iv3z6);  
  $def("_ocjkzi", "cameraSample", ["FileAttachment","htl"], _ocjkzi);  
  $def("_uio2e6", "analyzeFrame", ["runPipeline","scanLattice","clusterWindows","fuseLandmarks"], _uio2e6);  
  $def("_k6d86f", "testFrames", [], _k6d86f);  
  $def("_1c1rmua", "testFrameBank", ["testFrames","testFrameFiles"], _1c1rmua);  
  $def("_1r6cx83", "testFrameFiles", ["FileAttachment"], _1r6cx83);  
  $def("_s8m851", "testFrameResults", ["testFrameBank","rotateFrame","analyzeFrame"], _s8m851);  
  $def("_zghole", "rotateFrame", [], _zghole);  
  $def("_tavtr3", "scanLattice", [], _tavtr3);  
  $def("_7u6ljb", "testFrameReport", ["htl","testFrameResults"], _7u6ljb);  
  $def("_1dpzurc", "clusterWindows", [], _1dpzurc);  
  $def("_a2pm83", "windowCandidates", ["crossRatio","crCurve","crDistance"], _a2pm83);  
  main.define("SVD", ["module @tomlarkworthy/fast-1d-circular-barcode-matching", "@variable"], (_, v) => v.import("SVD", _));  
  $def("_15g2ti2", "detectKernelSource", ["SVD","LAYOUT","crCurve","carrierTemplate","codebook","minMargin","edgeThreshold","dpScratch","crossRatio","crDistance","xFromK","templateAtOffset","fitMobiusLS","fitMobiusInto","dpAlignFast","carrierTable","crTable","sweepScratch","radiusLUT","nearestEdgeRadius","involutionScratch","windowCandidates","detectLandmarkRow","detectRowInvolution","detectRow","decodeLandmark","edges1Dsub","rowOf","runPipeline"], _15g2ti2);  
  $def("_rqclgc", "viewof poolSize", ["Inputs"], _rqclgc);  
  $def("_1xat3lz", "poolSize", ["Generators","viewof poolSize"], _1xat3lz);  
  $def("_91k4wy", "detectPool", ["poolSize","detectKernelSource","invalidation"], _91k4wy);  
  $def("_1qdzl86", null, ["md"], _1qdzl86);  
  $def("_1gsq49k", "poolAgreement", ["testFrameBank","analyzeFrame","detectPool"], _1gsq49k);  
  $def("_rqwdsc", "poolReport", ["poolBenchmark","htl","detectPool","poolAgreement"], _rqwdsc);  
  $def("_1pno4rs", "viewof benchGo2", ["Inputs"], _1pno4rs);  
  $def("_1vdscoi", "benchGo2", ["Generators","viewof benchGo2"], _1vdscoi);  
  $def("_1kj72ix", "poolBenchmark", ["benchGo2","testFrameBank","analyzeFrame","detectPool"], _1kj72ix);  
  $def("_rxnc36", "carrierTable", ["crCurve","templateAtOffset","carrierTemplate"], _rxnc36);  
  $def("_1q031k7", "fitMobiusInto", [], _1q031k7);  
  $def("_1h4j3jf", "sweepScratch", ["carrierTemplate","crCurve","LAYOUT"], _1h4j3jf);  
  $def("_n2tfv9", "crTable", ["LAYOUT","carrierTable","crossRatio"], _n2tfv9);  
  $def("_scjdu6", null, ["md"], _scjdu6);  
  $def("_1ctuoxf", "viewof profileWhich", ["Inputs"], _1ctuoxf);  
  $def("_osi1qe", "profileWhich", ["Generators","viewof profileWhich"], _osi1qe);  
  $def("_mwngic", "viewof profileRun", ["Inputs"], _mwngic);  
  $def("_jrzngy", "profileRun", ["Generators","viewof profileRun"], _jrzngy);  
  $def("_10eic8o", "profileFrameCost", ["profileRun","testFrameBank","profileWhich","analyzeFrame"], _10eic8o);  
  $def("_14j5tuk", "print_md", ["md","usableIds"], _14j5tuk);  
  $def("_9txbgx", "markSvgSource", ["LAYOUT","codebook"], _9txbgx);  
  $def("_1xbdrtd", "markSheetSvg", ["LAYOUT","codebook"], _1xbdrtd);  
  $def("_3l7snp", "usableIds", ["codebook"], _3l7snp);  
  $def("_1566rx9", "redesign_md", ["md","tex"], _1566rx9);  
  $def("_1jghxt5", "manLayout", [], _1jghxt5);  
  $def("_12dy4hh", "manColor", ["manLayout"], _12dy4hh);  
  $def("_gg8jqp", "findInvolution", [], _gg8jqp);  
  $def("_1mszvx0", "solveMan", ["manLayout"], _1mszvx0);  
  $def("_4krul3", "renderManFrame", ["manLayout","manColor"], _4krul3);  
  $def("_1mnpthu", "detectFrameMan", ["manLayout","edges1Dsub","findInvolution","solveMan"], _1mnpthu);  
  $def("_og7api", "viewof manDemoCfg", ["Inputs"], _og7api);  
  $def("_1ewr3en", "manDemoCfg", ["Generators","viewof manDemoCfg"], _1ewr3en);  
  $def("_1tn1oj8", "manDemo", ["manDemoCfg","manLayout","renderManFrame","detectFrameMan"], _1tn1oj8);  
  $def("_4liiby", "cascade_md", ["md","tex"], _4liiby);  
  $def("_w574fm", "manRowGroups", ["manLayout"], _w574fm);  
  $def("_rvt6ru", "detectRowMan", ["manLayout","manRowGroups","findInvolution","solveMan"], _rvt6ru);  
  $def("_138kml", "fitManPose", ["manLayout"], _138kml);  
  $def("_1jt47m8", "analyzeFrameMan", ["rotateFrame","unrotatePoint","manLayout","edges1Dsub","detectRowMan","fitManPose"], _1jt47m8);  
  $def("_ujkuco", "manScene", ["manLayout","renderManFrame"], _ujkuco);  
  $def("_1xa2cta", "manSceneTest", ["manScene","analyzeFrameMan"], _1xa2cta);  
  $def("_11vsmkp", "axes_md", ["md"], _11vsmkp);  
  $def("_9mkcus", "manAxesTest", ["manScene","analyzeFrameMan","rotateFrame","unrotatePoint"], _9mkcus);  
  $def("_15441wy", "viewof markFamily", ["Inputs"], _15441wy);  
  $def("_gbwp1t", "markFamily", ["Generators","viewof markFamily"], _gbwp1t);  
  $def("_1az419w", "viewof grabPanel", ["liveVideo"], _1az419w);  
  $def("_qag4z6", "grabPanel", ["Generators","viewof grabPanel"], _qag4z6);  
  $def("_1p7i4wb", "manPrint_md", ["md"], _1p7i4wb);  
  $def("_19a2bc6", "manMarkSvgSource", ["manLayout","manColor"], _19a2bc6);  
  $def("_snxhn8", "manPrintPanel", ["manDemoCfg","manMarkSvgSource","manLayout","manColor","htl"], _snxhn8);  
  $def("_tivpeh", "manTestBank_md", ["md"], _tivpeh);  
  $def("_rtuzun", "unrotatePoint", [], _rtuzun);  
  $def("_rp63e7", "manFrames", [], _rp63e7);  
  $def("_1g7o2un", "manFrameBank", ["manFrames","testFrameFiles"], _1g7o2un);  
  $def("_nuw7s5", "manFrameResults", ["manFrameBank","rotateFrame","analyzeFrameMan","unrotatePoint"], _nuw7s5);  
  $def("_yy59on", "manFrameReport", ["htl","manFrameResults"], _yy59on);  
  $def("_js23sh", "hexTarget_md", ["md"], _js23sh);  
  $def("_5xkwav", "makeHexTarget", ["manLayout"], _5xkwav);  
  $def("_5gg2ic", "hexTarget", ["makeHexTarget"], _5gg2ic);  
  $def("_1fdcn6e", "renderHexScene", ["hexTarget","manColor"], _1fdcn6e);  
  $def("_1qa5emd", "fitHexPose", ["hexTarget","fitHomography"], _1qa5emd);  
  $def("_q8nv1h", "hexTargetSvg", ["hexTarget","manColor"], _q8nv1h);  
  $def("_xt3mg6", "hexPrintPanel", ["hexTargetSvg","hexTarget","htl"], _xt3mg6);  
  $def("_13k4hcg", "hexPrintCheck", ["hexTarget","hexTargetSvg","analyzeFrameMan","fitHexPose"], _13k4hcg);  
  $def("_1kgvsyz", "hexRendererCheck", ["manLayout","renderManFrame","analyzeFrameMan","makeHexTarget","renderHexScene"], _1kgvsyz);  
  $def("_1au9ya6", "hexPitchSweep", ["makeHexTarget","renderHexScene","analyzeFrameMan","fitHexPose"], _1au9ya6);  
  $def("_1h5er0z", "hexRig_md", ["md"], _1h5er0z);  
  $def("_ktbd9n", "viewof hexRigCfg", ["Inputs"], _ktbd9n);  
  $def("_1pvjep3", "hexRigCfg", ["Generators","viewof hexRigCfg"], _1pvjep3);  
  $def("_1lt19nm", "hexRigOpts", ["hexRigCfg","manLayout"], _1lt19nm);  
  $def("_gwo9xk", "hexRigLoo", ["hexTarget","fitHomography"], _gwo9xk);  
  $def("_1epdu7f", "hexRigScore", [], _1epdu7f);  
  $def("_q7egru", "viewof hexRigCases", ["Inputs"], _q7egru);  
  $def("_cih7ns", "hexRigCases", ["Generators","viewof hexRigCases"], _cih7ns);  
  $def("_1di846o", "hexRigView", ["htl"], _1di846o);  
  $def("_1bfhbxi", "hexRig", ["hexRigView","viewof hexRigCases","liveOn","liveVideo","hexRigCfg","analyzeFrameMan","hexRigOpts","fitHexPose","hexRigLoo"], _1bfhbxi);  
  $def("_136sicf", "hexRigCasePanel", ["hexRigCases","htl"], _136sicf);  
  $def("_16hxrfy", "viewof hexRigSweepGo", ["Inputs"], _16hxrfy);  
  $def("_5e077b", "hexRigSweepGo", ["Generators","viewof hexRigSweepGo"], _5e077b);  
  $def("_15xffv4", "hexRigSynthCases", ["hexTarget","renderHexScene","analyzeFrameMan","fitHexPose","hexRigLoo"], _15xffv4);  
  $def("_zoue8d", "hexRigSweep", ["hexRigSweepGo","hexRigCases","hexRigSynthCases","hexRigCfg","hexRigOpts","analyzeFrameMan","hexRigScore"], _zoue8d);  
  $def("_a0ribc", "hexRigSelfTest", ["hexRigSynthCases","hexRigScore","analyzeFrameMan"], _a0ribc);
  return main;
}
