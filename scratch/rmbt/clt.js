const _ebocnh = function _headline_md(md) {return (md`# Coded Landmark Tracking

Point a camera at a printed sheet. The tracker finds each mark's centre, reads
its id, and recovers the plane the sheet is on — in the browser, at video rate,
with no marker library, no camera calibration and no training.

**Goals, in the order they constrain the design.**

1. **A wrong answer is worse than no answer.** A positioning system that
   occasionally invents a landmark is not usable. Every gate here is built to
   fail closed, and the evaluation in §3 reports invented marks separately from
   missed ones.
2. **Realtime on a laptop, from JavaScript.** The budget is one video frame,
   about 33ms, on a single thread.
3. **Survive perspective without knowing the camera.** No intrinsics, no
   distortion model, no calibration step the user has to perform.
4. **Print it on a home printer.** Paper, greyscale, no retroreflector.

The method is to scan a **sparse lattice of horizontal lines** instead of the
whole image. A concentric ring pattern crossed by any straight line gives a
one-dimensional signature that survives perspective, because a line through a
projective transform of concentric circles is still a projective transform of a
line. §4 builds that up from the encoding outwards.

Start at §1: print the target from §2, point a camera at it, and watch the
detector work. §3 is the evidence that it does.`);};
const _1h5er0z = function _hexRig_md(md) {return (md`## §1 &nbsp; The rig

Point the camera at the printed §2 sheet. This runs the full cascade on every
frame, fits the plane the sheet lies on, and grades all seven marks against that
plane — so a failure is named rather than counted.

It also **keeps the frames that fail**, with their pixels and their labels, so a
failure can be replayed offline later at other settings. That is the reason this
is the first thing on the page rather than a demo: tuning against a live camera
tunes against whatever you happened to be pointing at while you dragged a
slider, and a knob that looks better is indistinguishable from a hand that
moved. A stored frame is the same photons every time.

A frame is only worth keeping if it can be LABELLED, and the bar for that is the
fussiest part of the rig. Three conditions:

| | |
|---|---|
| \`read >= 5\` | four marks fit a homography exactly, so four says nothing about whether the fit is right |
| \`rms <= 4px\` | cheap, catches the obviously broken |
| \`LOO <= 0.3r\` | leave-one-out prediction error, worst over the detected marks, against the median predicted radius |

The third is the one that matters, and it is worth being precise about why. A
rendered frame with an rms of 1.39px carried label errors of 66px: with five
marks a homography has two spare degrees of freedom, so it absorbs a badly
measured centre instead of reporting it, and the residual it shows you is the
residual of the data it was fitted to. Leave-one-out asks a different question —
predict a mark the fit has not seen — and that one cannot be answered by
absorbing the error.

**Keep this frame** overrides the bar, for deliberately hard shots. Those are
the useful ones: auto-collect can only ever keep frames the detector already
half-solved, so left to itself it never samples its own worst failures.`);};
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
    // The detector needs ~2 image pixels per template unit, so 1280 rather than
    // the default 640 is the single cheapest thing that widens the usable
    // working distance. `max` as well as `ideal`, because a phone camera
    // offered a free hand will hand back 1920 or more, and the zero-copy
    // capture path in §5.2 needs the working width to EQUAL the camera width
    // (VideoFrame.copyTo crops, it cannot scale). Overshoot here costs ~20ms a
    // frame there.
    const s = await window.navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 1280, max: 1280 },
        height: { ideal: 960, max: 1280 },
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
const _1sh7vi3 = function _liveVideo(htl,liveStream,invalidation) {
  // Never shown: the rig canvas below draws these same pixels with the overlay
  // on top, so a raw feed is duplicate. It has to stay in the document to keep
  // decoding, so hide it with visibility (not display:none, which stops frame
  // delivery) and take it out of flow so the cell collapses.
  const v = htl.html`<video playsinline muted autoplay
    style="position:absolute;width:320px;height:240px;visibility:hidden;pointer-events:none"></video>`;
  if (liveStream && !liveStream.error) v.srcObject = liveStream;
  // Never await play(): an unsettled promise would leave this cell pending and
  // take the whole rig with it. A media element removed from its document is
  // paused by the UA and nothing resumes it, and a lopepage pane move detaches
  // us, so poll instead.
  const kick = () => {
    if (v.srcObject && v.paused && v.isConnected) v.play().catch(() => {});
  };
  kick();
  const resume = setInterval(kick, 500);
  invalidation.then(() => {
    clearInterval(resume);
    try {
      v.pause();
      v.srcObject = null;
    } catch (e) {}
  });
  return v;
};
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
  // Defaults to the TOP of its range on purpose. Lowering it does not just cost
  // resolution: the working width has to equal the camera's own width for the
  // zero-copy capture path (§5.2) to engage, so any value under the camera
  // resolution buys a smaller image at the price of a ~20ms/frame RGBA readback
  // -- a net loss on a phone. Cost tracks locked rows, not pixels (§5).
  maxWidth: Inputs.range([480, 1280], { step: 160, value: 1280, label: "working width (px)" }),
  // The odd one out: not a threshold to tune but a second scan of the same
  // frame, down the columns instead of across the rows (§11.1). It halves the
  // frame rate and it is off by default for that reason, but the rig is where
  // it earns its keep -- the labels it stores are a homography through these
  // centres, and the row scan MEASURES a centre's x while only extrapolating
  // its y. Turn it on before collecting cases you intend to trust.
  bothAxes: Inputs.toggle({ label: "scan both axes", value: false })
}));};
const _1pvjep3 = (G, _) => G.input(_);
const _1di846o = function _hexRigView(htl) {
  // The rig draws into its OWN canvas rather than laying an overlay over
  // liveVideo. A DOM node lives in one place at a time, so borrowing the video
  // element would take it out of §0's view; and the rig wants the frame it
  // actually analysed on screen, at working resolution, not the camera's.
  const cap = htl.html`<canvas style="display:block;width:100%;height:auto;background:#151515"></canvas>`;
  const overlay = htl.svg`<svg viewBox="0 0 960 540" preserveAspectRatio="none"
    style="position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none"></svg>`;
  const hud = htl.html`<div style="position:absolute;left:0;bottom:0;right:0;padding:4px 8px;
    background:rgba(0,0,0,0.6);color:#dfe;
    font:clamp(11px, 2.6vw, 13px)/1.5 ui-monospace,monospace"></div>`;
  const stage = htl.html`<div style="position:relative;max-width:760px;background:#1b1b1b;
    border-radius:6px;overflow:hidden">${cap}${overlay}${hud}</div>`;

  const keep = htl.html`<button style="font:13px system-ui;padding:5px 12px">keep this frame</button>`;
  const clear = htl.html`<button style="font:13px system-ui;padding:5px 12px">clear cases</button>`;
  // OFF by default. A keep costs a full-frame grayAll plus a PNG encode of the
  // whole canvas, which on a phone is tens of milliseconds -- enough to make
  // the live view visibly jerky and to dominate any frame-budget reading taken
  // while it runs. Collecting is a deliberate act, not a background one.
  const auto = htl.html`<label style="font:13px system-ui;display:flex;gap:5px;align-items:center">
    <input type="checkbox"> auto-collect hard cases</label>`;
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
const _lumcap0 = function _lumaCapture() {return (function makeLumaCapture() {
  // Getting the luma out of a camera, by the cheapest route the browser
  // actually offers rather than the one everyone writes.
  //
  // The obvious pipeline -- drawImage into a 2D canvas, getImageData, weighted
  // sum to gray -- costs 5.1 + 17.7 + 1.7 ms on a mid-range Android at
  // 960x1280. The 17.7 is a GPU-to-CPU readback of 4.9MB of RGBA. But a camera
  // does not produce RGBA: it produces I420 or NV12, whose FIRST PLANE IS THE
  // LUMA. WebCodecs will hand that over directly for 1.4ms. The whole detour
  // exists to reconstruct something the hardware already had.
  //
  // Everything here is capability-detected and falls back to the old path, so
  // a browser without WebCodecs, a camera that reports RGBA, or a frame the
  // caller wants at a different size all still work -- more slowly, and
  // saying so through `path`.
  const LUMA_FIRST = /^(I420|I422|I444|NV12|NV21)/;  // formats whose plane 0 is Y
  let W = 0, H = 0;
  let cvs = null, ctx = null;      // fallback surface
  let raw = null, packed = null;   // fast-path buffers
  let lut = null;
  let gray = null;
  let full = false;
  let src = null;                  // fast path: the luma plane grab() read from

  const size = (w, h) => {
    if (w === W && h === H) return;
    W = w; H = h;
    gray = new Uint8Array(W * H);
    raw = null; packed = null; cvs = null; ctx = null;
  };

  const fallbackSurface = () => {
    if (ctx) return;
    cvs = window.document.createElement("canvas");
    cvs.width = W; cvs.height = H;
    // willReadFrequently asks for a CPU-backed surface. It makes the readback
    // less catastrophic and the drawImage worse; on this path we do both, so
    // it is still the right side of that trade.
    ctx = cvs.getContext("2d", { willReadFrequently: true });
  };

  // BT.601 limited range (16-235) to full range. The old path derived luma
  // from RGB that the decoder had ALREADY expanded to full range, so without
  // this the two paths differ by a scale and an offset -- edge magnitudes
  // shrink by 219/255 and every tuned threshold, and every archived case,
  // quietly means something else. One table lookup per pixel is cheaper than
  // the three multiplies the old conversion cost, so correctness here is free.
  const buildLut = () => {
    lut = new Uint8Array(256);
    for (let v = 0; v < 256; v++) {
      const x = Math.round(((v - 16) * 255) / 219);
      lut[v] = x < 0 ? 0 : x > 255 ? 255 : x;
    }
  };

  const api = {
    path: "unknown",
    format: null,
    fullRange: null,
    why: "",
    ms: 0,

    // Fill `gray` for this frame. `rows` is only consulted on the fallback
    // path, where converting the whole frame costs real time and the scan
    // needs a quarter of it; the fast path always has every row and says so
    // through `full`, which is what lets bothAxes and case capture skip their
    // extra pass entirely.
    grab: async (video, w, h, rows) => {
      size(w, h);
      const t0 = window.performance.now();
      full = false;

      // The fast path cannot resize -- copyTo crops, it does not scale -- so a
      // caller asking for anything but the camera's own dimensions gets the
      // slow one. Worth stating rather than silently degrading.
      const native = video.videoWidth === W && video.videoHeight === H;
      if (typeof window.VideoFrame === "function" && native && api.path !== "getimagedata-forced") {
        let frame = null;
        try {
          frame = new window.VideoFrame(video);
          const fmt = frame.format || "";
          if (!LUMA_FIRST.test(fmt)) {
            api.why = `format ${fmt} has no luma plane`;
            frame.close();
          } else {
            const need = frame.allocationSize();
            if (!raw || raw.length < need) raw = new Uint8Array(need);
            const layout = await frame.copyTo(raw);
            const cs = frame.colorSpace;
            const fr = cs && cs.fullRange;
            frame.close();
            frame = null;
            const { offset, stride } = layout[0];
            // Plane 0 may be padded to a hardware-friendly stride, and often
            // is not. Only repack when it actually differs.
            let y;
            if (stride === W) {
              y = raw.subarray(offset, offset + W * H);
            } else {
              if (!packed || packed.length !== W * H) packed = new Uint8Array(W * H);
              for (let r = 0; r < H; r++)
                packed.set(raw.subarray(offset + r * stride, offset + r * stride + W), r * W);
              y = packed;
            }
            if (fr === false) {
              // The expansion is a per-pixel loop, and a profile on a phone put
              // it at 4.5ms/frame -- the whole remaining cost of capture, and
              // more than the copy it follows. The scan reads a quarter of the
              // rows at stride 4, so expand a quarter of the rows. Same trick
              // the RGB path always used, for the same reason.
              if (!lut) buildLut();
              src = y;
              if (rows) {
                for (const yy of rows) {
                  const b = yy * W;
                  for (let x = 0; x < W; x++) gray[b + x] = lut[y[b + x]];
                }
              } else {
                for (let i = 0, n = W * H; i < n; i++) gray[i] = lut[y[i]];
                full = true;
              }
            } else {
              // a bulk copy, not a loop -- cheap enough to always do whole
              gray.set(y);
              full = true;
            }
            api.path = "videoframe";
            api.format = fmt;
            api.fullRange = fr == null ? null : !!fr;
            api.why = "";
            api.ms = window.performance.now() - t0;
            return { gray, full, path: api.path };
          }
        } catch (e) {
          if (frame) try { frame.close(); } catch (e2) {}
          api.why = "VideoFrame: " + (e && e.message ? e.message : String(e));
        }
      } else if (!native) {
        api.why = `frame requested at ${W}x${H}, camera is ${video.videoWidth}x${video.videoHeight}`;
      } else if (typeof window.VideoFrame !== "function") {
        api.why = "no WebCodecs";
      }

      fallbackSurface();
      ctx.drawImage(video, 0, 0, W, H);
      const px = ctx.getImageData(0, 0, W, H).data;
      api._px = px;
      const row = (yy) => {
        const b = yy * W;
        for (let x = 0, p = b * 4; x < W; x++, p += 4)
          gray[b + x] = (px[p] * 77 + px[p + 1] * 150 + px[p + 2] * 29) >> 8;
      };
      if (rows) { for (const yy of rows) row(yy); }
      else { for (let yy = 0; yy < H; yy++) row(yy); full = true; }
      api._row = row;
      api.path = "getimagedata";
      api.format = "RGBA";
      api.ms = window.performance.now() - t0;
      return { gray, full, path: api.path };
    },

    // Fallback only: convert the rows grab() was allowed to skip. A no-op on
    // the fast path, which is the point -- callers stop having to know which
    // path they are on.
    ensureFull: () => {
      if (full) return gray;
      if (api.path === "videoframe") {
        for (let i = 0, n = W * H; i < n; i++) gray[i] = lut[src[i]];
      } else {
        for (let yy = 0; yy < H; yy++) api._row(yy);
      }
      full = true;
      return gray;
    },

    // Do the two paths agree? Same bar as poolAgreement: run both on ONE
    // frame and report the difference rather than assert a number nobody
    // measured. They cannot be identical -- the RGB path has been through
    // YUV->RGB->luma with rounding at each step -- so this reports the
    // distribution and lets the reader judge.
    compare: async (video, w, h) => {
      const a = await api.grab(video, w, h);
      if (a.path !== "videoframe") return { note: "fast path unavailable: " + api.why };
      const fast = gray.slice();
      const fmt = api.format, fr = api.fullRange;
      const was = api.path;
      api.path = "getimagedata-forced";
      await api.grab(video, w, h);
      api.path = was;
      api.format = fmt;
      const n = w * h;
      let max = 0, sum = 0, lo = 255, hi = 0;
      for (let i = 0; i < n; i++) {
        const d = Math.abs(fast[i] - gray[i]);
        if (d > max) max = d;
        sum += d;
        if (fast[i] < lo) lo = fast[i];
        if (fast[i] > hi) hi = fast[i];
      }
      gray.set(fast);
      full = true;
      const out = { format: fmt, fullRange: fr, range: lo + ".." + hi,
        maxDiff: max, meanDiff: +(sum / n).toFixed(3), px: n };
      // A lens-down phone makes both paths produce all zeros, and "identical"
      // then means nothing at all -- it is the most agreeable answer this
      // check can give and the only worthless one. Say so rather than pass.
      if (hi - lo < 32)
        out.note = `INCONCLUSIVE: frame spans only ${lo}..${hi}. Point the camera at a lit scene.`;
      return out;
    }
  };
  return api;
});};
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
const _1bfhbxi = async function* _hexRig(hexRigView,$0,liveOn,liveVideo,hexRigCfg,analyzeFrameMan,analyzeFrameManAsync,detectPool,hexRigOpts,fitHexPose,hexRigLoo,manScanRows,lumaCapture) {
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
    // Idle, but never on a promise that cannot settle. The runtime ends a
    // generator by calling return() on it, which lands at the next yield; a
    // cell parked on `new Promise(() => {})` has no next yield, so the
    // termination never completes and the whole update chain stops behind it
    // — not this cell alone. Ticking keeps the cell endable.
    while (true) {
      yield null;
      await new Promise((r) => window.setTimeout(r, 250));
    }
  }

  // No willReadFrequently: nothing reads this canvas back per frame any more,
  // so it stays a GPU surface and drawImage stays ~0.1ms.
  const ctxOut = view.cap.getContext("2d");
  const luma = lumaCapture();
  view.luma = luma;
  let W = 0, H = 0, gray = null;
  let lastCap = -1e9, lastYield = 0, n = 0, kept = 0;
  // The counter restarts at 0 in every tab, so a bare hexcase-NN silently
  // OVERWROTE earlier captures on the receiver -- four frames were lost that
  // way and only found again in git. A per-boot tag makes the name unique at
  // the granularity that actually collides: a second device, or a reload.
  const session = Math.floor(window.Date.now() / 1000).toString(36).slice(-4);
  const fps = [];
  // Where the frame actually goes. The headline number used to start AFTER the
  // capture and the luma conversion, so two pieces of main-thread work in the
  // middle of the budget -- a full-frame getImageData and a per-pixel loop over
  // a quarter of it -- were invisible in it. On a laptop that is a rounding
  // error and on a phone it is not, which is precisely the machine the number
  // was being read on. Same 20-frame window as fps, medians not means: one
  // stalled frame should not move a stage's number.
  const STAGES = ["cap", "gray", "scan", "fit", "draw"];
  const hist = {};
  for (const s of STAGES) hist[s] = [];
  const stage = (name, t0) => {
    const h = hist[name];
    h.push(window.performance.now() - t0);
    if (h.length > 20) h.shift();
  };
  const stageMed = (name) => {
    const h = hist[name];
    if (!h.length) return 0;
    return h.slice().sort((a, b) => a - b)[h.length >> 1];
  };
  // Read from the console or over CDP while the camera runs -- the HUD has room
  // for a summary, not for the evidence.
  view.stages = () => {
    const o = {};
    for (const s of STAGES) o[s] = +stageMed(s).toFixed(2);
    o.total = +Object.values(o).reduce((a, b) => a + b, 0).toFixed(2);
    o.workerMs = detectPool ? detectPool.lastWorkerMs : null;
    o.workerChunks = detectPool ? detectPool.lastWorkerChunks : null;
    o.px = W * H;
    return o;
  };
  // Stage 1 goes to the pool when there is one. analyzeFrameManAsync with no
  // runRows is analyzeFrameMan, so poolSize 0 is a real fallback and not a
  // second code path -- poolAgreement holds the two to 4dp.
  const poolOpts = detectPool
    ? { ...hexRigOpts, runRows: detectPool.runRows }
    : hexRigOpts;
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
      view.cap.width = W; view.cap.height = H;
      view.overlay.setAttribute("viewBox", `0 0 ${W} ${H}`);
    }
    // Capture and luma in one step when the browser allows it. `cap` is now
    // the whole cost of getting a gray buffer; on the fast path `gray` is
    // nothing, because there is no conversion left to do.
    const tCap = window.performance.now();
    const grabbed = await luma.grab(
      v, W, H, hexRigOpts.bothAxes ? null : manScanRows({ w: W, h: H }, hexRigOpts)
    );
    gray = grabbed.gray;
    stage("cap", tCap);
    const tGray = window.performance.now();
    // Convert only the rows the scan is going to read. At stride 4 that is a
    // quarter of the frame, and this is main-thread work sitting in the middle
    // of the frame budget -- the same argument that moved the scan itself into
    // workers. Two callers still need the whole frame: bothAxes reads it
    // transposed, and a captured case gets replayed at other strides, so both
    // ask for a full pass. Rows nobody converted keep whatever the previous
    // frame left there, which is why neither of those may read this buffer
    // without filling it first.
    const grayAll = () => luma.ensureFull();
    stage("gray", tGray);
    // Straight from the video to the visible canvas: 0.1ms, because it never
    // leaves the GPU. The old path drew the CPU-side copy here, which is only
    // necessary if you already paid to bring the pixels down.
    ctxOut.drawImage(v, 0, 0, W, H);

    const t = window.performance.now();
    const res = await analyzeFrameManAsync({ gray, w: W, h: H }, poolOpts);
    stage("scan", t);
    const tFit = window.performance.now();
    // Every frame is judged on its own evidence. Carrying a focal length (or
    // anything else) forward from an earlier frame belongs in a notebook about
    // exploiting similar frames under geometric constraints, not in the one
    // that defines what a single frame can establish.
    const pose = fitHexPose({ ...res, w: W, h: H });
    stage("fit", tFit);
    const dt = window.performance.now() - t;
    fps.push(dt);
    if (fps.length > 20) fps.shift();

    // ---- overlay ----
    // Frame pixels per CSS pixel of stage. The overlay is authored in frame
    // coordinates and stretched to the stage width, so on a phone a 3px stroke
    // arrives as barely one. Every WIDTH and TYPE SIZE below is multiplied by
    // this so it stays constant on screen; positions and radii are not, because
    // those are the measurement.
    const tDraw = window.performance.now();
    const k = W / (view.overlay.clientWidth || W);
    const sw = (n) => +(n * k).toFixed(2);
    const parts = [];
    if (pose.ok) {
      const ring = pose.marks.filter((m) => m.k != null);
      if (ring.length > 2)
        parts.push(
          `<polygon points="${ring.map((m) => `${m.predicted.x},${m.predicted.y}`).join(" ")}"
            fill="none" stroke="#5af" stroke-width="${sw(1.5)}"
            stroke-dasharray="${sw(4)} ${sw(6)}" opacity="0.8"/>`
        );
      for (const m of pose.marks) {
        const c = COL[m.state];
        const r = m.radiusPx;
        const dash = m.state === "read" ? "none"
          : m.state === "located" ? `${sw(7)} ${sw(5)}` : `${sw(2)} ${sw(6)}`;
        // the projected circle, not a circle: on a tilted sheet the two differ
        // by the tilt, and a ring that does not sit on its mark reads as a
        // tracking error rather than as a drawing one
        const top = m.outline ? Math.min(...m.outline.map((p) => p[1])) : m.predicted.y - r;
        const shape = m.outline
          ? `<polygon points="${m.outline.map((p) => p[0] + "," + p[1]).join(" ")}"`
          : `<circle cx="${m.predicted.x}" cy="${m.predicted.y}" r="${r.toFixed(1)}"`;
        parts.push(
          `${shape} fill="none"
            stroke="${c}" stroke-width="${sw(m.state === "read" ? 3 : 2)}" stroke-dasharray="${dash}"/>` +
          `<text x="${m.predicted.x}" y="${(top - sw(5)).toFixed(1)}"
            font-family="ui-monospace,monospace" font-size="${Math.max(sw(13), r * 0.45).toFixed(1)}"
            font-weight="700" fill="${c}" text-anchor="middle" paint-order="stroke"
            stroke="#000" stroke-width="${sw(4)}">${m.id}${m.state === "read" ? "" : " " + m.state[0]}</text>`
        );
      }
      for (const o of pose.offTarget)
        parts.push(
          `<g stroke="${COL.off}" stroke-width="${sw(3)}">
            <line x1="${o.x - sw(12)}" y1="${o.y - sw(12)}" x2="${o.x + sw(12)}" y2="${o.y + sw(12)}"/>
            <line x1="${o.x - sw(12)}" y1="${o.y + sw(12)}" x2="${o.x + sw(12)}" y2="${o.y - sw(12)}"/></g>
          <text x="${o.x}" y="${o.y - sw(16)}" font-family="ui-monospace,monospace"
            font-size="${sw(14)}" fill="${COL.off}" text-anchor="middle" paint-order="stroke"
            stroke="#000" stroke-width="${sw(4)}">${o.id}?</text>`
        );
    } else {
      // no plane: show the raw detections, otherwise there is nothing to aim by
      // No homography here, but fitManPose measured both semi-axes -- a along
      // the scan, b across it -- so an axis-aligned ellipse is still closer to
      // the mark than a circle of a.
      for (const f of res.fused) {
        const ra = f.a ?? f.wHalf ?? 24;
        parts.push(
          `<ellipse cx="${f.xc.toFixed(1)}" cy="${f.yc.toFixed(1)}"
            rx="${ra.toFixed(1)}" ry="${(f.b ?? ra).toFixed(1)}"
            fill="none" stroke="#8fa" stroke-width="${sw(2)}"/>`
        );
      }
    }
    view.overlay.innerHTML = parts.join("");
    stage("draw", tDraw);

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
      // a case is replayed at other strides, so it needs the rows this frame's
      // scan skipped
      if (!hexRigOpts.bothAxes) grayAll();
      push({
        name: `hexcase-${session}-${String(n).padStart(2, "0")}`,
        w: W, h: H,
        // a copy: the loop reuses this buffer every frame
        gray: gray.slice(),
        // the visible canvas holds exactly the analysed frame -- the overlay is
        // a sibling SVG, so nothing drawn on top can contaminate a stored case
        url: view.cap.toDataURL("image/png"),
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
    // cap+gray+scan+fit+draw, not just scan+fit. The difference between this
    // and `med` is exactly the work the old headline number did not count.
    const whole = STAGES.reduce((a, s) => a + stageMed(s), 0);
    const budget = STAGES.map((s) => s[0] + stageMed(s).toFixed(0)).join(" ");
    const c = pose.ok ? pose.counts : null;
    // On a phone the long form wraps to three lines and buries the bottom two
    // marks under the panel, so below ~560px say the same things shorter.
    const narrow = (view.overlay.clientWidth || W) < 560;
    view.hud.textContent = narrow
      ? `${W}×${H} ${whole.toFixed(0)}ms [${budget}] ${detectPool ? detectPool.size + "w" : "1t"}` +
        `${luma.path === "videoframe" ? " vf" : " gid"}  ` +
        (pose.ok
          ? `${c.read}r ${c.located}l ${c.missing}m ${c.misplaced}x` +
            (pose.offTarget.length ? ` ${pose.offTarget.length}?` : "") +
            ` rms${pose.rmsResidualPx}` + (loo ? ` loo${loo.worstPx}` : "") +
            (pose.pose ? `  ${pose.pose.distanceMm}mm ${Math.round(pose.pose.tiltDeg)}°` : ` (${pose.poseWhy})`)
          : `no plane, ${res.fused.length} read`) +
        `  ${kept}/${MAX}`
      : `${W}x${H} ${whole.toFixed(0)}ms frame (cap ${stageMed("cap").toFixed(1)}` +
        ` gray ${stageMed("gray").toFixed(1)} scan ${stageMed("scan").toFixed(1)}` +
        ` fit ${stageMed("fit").toFixed(1)} draw ${stageMed("draw").toFixed(1)})` +
        ` ${detectPool ? detectPool.size + "w" : "1t"}` +
        ` ${luma.path === "videoframe" ? "luma " + luma.format : "rgba readback" + (luma.why ? " (" + luma.why + ")" : "")}  ` +
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
        // the whole frame, stage by stage -- watchable from the pairing channel
        stages: view.stages(),
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
const _18kb3j3 = function _hexRigAutosave($0,htl,invalidation) {
  // Captured cases die with the tab. hexRigCases is an Inputs.input([]), so it
  // holds real pixels at runtime and exports as empty -- a reload, a crash or a
  // slow export throws away work that costs someone standing in front of a
  // camera holding a printed sheet at arm's length. This takes each case off
  // the page the moment it is kept.
  //
  // What gets sent is the `gray` buffer, which is exactly the bytes the
  // detector was handed, plus a sidecar of the frozen labels and the settings
  // that produced them. No image codec in either direction, so a restored case
  // is bit-identical to the captured one -- which matters here more than
  // anywhere, because a JPEG round trip moves measured centres by up to 10px
  // and these cases exist to BE the ground truth.
  //
  // It depends on the cases NODE, not the cases value. Depending on the value
  // would re-run this cell on every capture, rebuilding the panel and losing
  // track of what had already been sent; listening to the node's input event
  // leaves the cell running and stateful across captures.
  const node = $0;
  const sent = new Set();
  let sink = "http://127.0.0.1:8787";
  let auto = true;

  const el = htl.html`<div style="font:12px/1.5 ui-monospace,monospace;border:1px solid #0002;border-radius:6px;padding:8px 10px;margin:6px 0">
    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
      <label style="display:flex;gap:5px;align-items:center"><input type="checkbox" checked> autosave to</label>
      <input type="text" value="${sink}" size="26" style="font:inherit">
      <button>save all now</button>
      <button>download bundle</button>
      <span data-status style="opacity:.7"></span>
    </div>
    <div data-log style="opacity:.6;margin-top:4px;max-height:70px;overflow:auto;white-space:pre"></div>
  </div>`;
  const chk = el.querySelector("input[type=checkbox]");
  const box = el.querySelector("input[type=text]");
  const btns = el.querySelectorAll("button");
  const saveBtn = btns[0], dlBtn = btns[1];
  const status = el.querySelector("[data-status]");
  const log = el.querySelector("[data-log]");
  const say = (msg) => {
    log.textContent = (msg + "\n" + log.textContent).split("\n").slice(0, 12).join("\n");
  };
  chk.oninput = () => { auto = chk.checked; };
  box.oninput = () => { sink = box.value.trim(); sent.clear(); };

  const meta = (c) => ({
    name: c.name, w: c.w, h: c.h, labelled: c.labelled, pinned: c.pinned,
    difficulty: c.difficulty, truth: c.truth, cfg: c.cfg, capture: c.capture
  });

  const push = async (c) => {
    // gray first: if the sidecar lands without pixels the case is unusable, so
    // a half-finished transfer should leave the recoverable half on disk.
    const g = await window.fetch(sink + "/gray/" + encodeURIComponent(c.name), {
      method: "POST", body: c.gray
    });
    if (!g.ok) throw new Error("gray " + g.status);
    const j = await window.fetch(sink + "/meta/" + encodeURIComponent(c.name), {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify(meta(c), null, 1)
    });
    if (!j.ok) throw new Error("meta " + j.status);
  };

  const drain = async (force) => {
    if (!sink || (!auto && !force)) return 0;
    const cases = node.value ?? [];
    let n = 0, failed = 0;
    for (const c of cases) {
      if (!c.gray) continue;
      if (sent.has(c.name) && !force) continue;
      try {
        await push(c);
        sent.add(c.name);
        n++;
        say("saved " + c.name + " (" + c.gray.length.toLocaleString() + "B)");
      } catch (e) {
        failed++;
        say("FAILED " + c.name + ": " + e.message);
      }
    }
    status.textContent = sent.size + "/" + cases.length + " on disk" +
      (failed ? " — " + failed + " failed" : "");
    return n;
  };

  // A bundle for when no receiver is running: raw gray, gzipped, one file,
  // restorable without an image decoder.
  const bundle = async () => {
    const cases = node.value ?? [];
    const parts = [];
    for (const c of cases) {
      if (!c.gray) continue;
      const packed = await new window.Response(
        new window.Blob([c.gray]).stream().pipeThrough(new window.CompressionStream("gzip"))
      ).arrayBuffer();
      const b = new Uint8Array(packed);
      let s = "";
      for (let i = 0; i < b.length; i += 0x8000)
        s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000));
      parts.push({ ...meta(c), grayGzipB64: window.btoa(s) });
    }
    const a = window.document.createElement("a");
    a.href = URL.createObjectURL(new window.Blob(
      [JSON.stringify({ format: "hexrig-cases-1", cases: parts })],
      { type: "application/json" }
    ));
    a.download = "hexrig-cases.json";
    a.click();
    say("bundled " + parts.length + " case(s)");
  };

  saveBtn.onclick = () => drain(true);
  dlBtn.onclick = () => bundle();
  const onInput = () => drain(false);
  node.addEventListener("input", onInput);
  invalidation.then(() => node.removeEventListener("input", onInput));
  drain(false);
  return el;
};
const _js23sh = function _hexTarget_md(md,tex) {return (md`## §2 &nbsp; Print the target

Seven marks on a hexagonal lattice: one at the centre, six at ${tex`60°`}
spacing. Print this at 100% scale on A4 and you have a metric object — the
pitch is known, so a fit gives you distance in millimetres rather than in
arbitrary units.

Why a hexagon and not a grid. Three constraints decide it:

- **No three-in-a-row ambiguity.** A square grid seen at a slant has rows that
  can be mistaken for other rows. The hexagon's neighbours are all the same
  distance from the centre, so a wrong assignment moves a mark by a full pitch
  and is immediately visible in the residual.
- **Six marks is enough to over-determine a homography, seven leaves one
  spare.** That spare is what makes the leave-one-out check in §1 possible at
  all — with exactly the minimum, there is nothing left over to check with.
- **Every id is distinguishable from every other by three bit flips.** The seven
  ids are chosen pairwise Hamming distance 3 apart, so a misread is not a near
  miss of a correct answer; it is the detector asserting something no single
  flipped cell can explain.

The check below renders the sheet through the detector at a range of apparent
sizes, so you can see where it stops working before you print anything.`);};
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
const _1p7i4wb = function _manPrint_md(md) {return (md`### §2.1 &nbsp; Individual marks

The same encoding as a single mark, for sticking on things that are not a
calibration sheet.`);};
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
const _nb1x = function _eval_md(md) {return (md`## §3 &nbsp; Evaluation on the test set

Everything above this line is a claim. This section is the evidence.

Two test sets, and they answer different questions:

**Real frames** — captures from the §1 rig, replayed against the labels frozen
at the moment they were taken. Scoring a replay against a fresh fit would make
the yardstick a function of the thing being measured, so the labels never move.
This is the set that has real backgrounds in it, and therefore the only one
where latency means anything.

**Rendered scenes** — graded against the renderer's own truth, which the fit
never sees. This half exists because the real set structurally **cannot detect
an invented mark**: it has no ground truth for marks nobody detected, so a
detector that hallucinates a landmark in the foliage scores the same as one that
does not. The rendered set catches exactly that, and has done so in practice —
one segmentation change looked like a free win on the archive and put a spurious
mark on a rendered scene.

The report below replays every banked frame live and draws the outcome per mark:
a solid ring where the id was read at the predicted place, dashed where the mark
was located but not decoded, dotted where it was missed, and a magenta ✕ for a
detection that is not on the target at all. Nothing here is filtered on whether
the detector currently succeeds.`);};
const _1r6cx83 = function _testFrameFiles(FileAttachment) {return (new Map([
  // FileAttachment only accepts a literal string, so the bank cannot look one up
  // by name at runtime; this map is the indirection. Adding a frame means adding
  // a line here and an entry in testFrames (classic) or manFrames (§11).
  ["frame-man-phone.png", FileAttachment("frame-man-phone.png")],
  // §11.6's hex bank. NUMBERED SLOTS, not case names: which archived capture
  // sits in each slot is chosen offline and changes as more are collected, and
  // a name here would have to be edited every time. The slot's provenance
  // travels in hexframes.json instead.
  ["hexframe-1.png", FileAttachment("hexframe-1.png")],
  ["hexframe-2.png", FileAttachment("hexframe-2.png")],
  ["hexframe-3.png", FileAttachment("hexframe-3.png")],
  ["hexframe-4.png", FileAttachment("hexframe-4.png")],
  ["hexframe-5.png", FileAttachment("hexframe-5.png")],
  ["hexframe-6.png", FileAttachment("hexframe-6.png")],
  ["hexframe-7.png", FileAttachment("hexframe-7.png")],
  ["hexframe-8.png", FileAttachment("hexframe-8.png")],
  ["hexframe-9.png", FileAttachment("hexframe-9.png")],
  ["hexframe-10.png", FileAttachment("hexframe-10.png")],
  ["hexframe-11.png", FileAttachment("hexframe-11.png")],
  ["hexframe-12.png", FileAttachment("hexframe-12.png")],
  ["hexframe-13.png", FileAttachment("hexframe-13.png")],
  ["hexframe-14.png", FileAttachment("hexframe-14.png")],
  ["hexframe-15.png", FileAttachment("hexframe-15.png")],
  ["hexframe-16.png", FileAttachment("hexframe-16.png")],
  ["hexframes.json", FileAttachment("hexframes.json")]
]));};
const _1ffq68r = function _hexBank_md(md) {return (md`### §3.2 &nbsp; The frame bank

Sixteen captures, chosen out of the whole archive by picking, one at a time,
whichever remaining frame looks least like everything already picked. Two
devices, both orientations, a light sheet and a dark one, indoors and out, 161
to 979mm, 14° to 74° of tilt.

**They are whole frames.** Cropping to the target would halve the download and
ruin the test: the window bars, railings and leaves around the edges are the
structures a scanline detector fires on by mistake, and a bank cropped to the
marks can only ask whether the detector reads a mark it has been handed — never
whether it invents one. Stored as 8-bit greyscale PNG, and never resized,
because resampling costs marks outright.

The picker refuses a capture with the target running off the edge of the frame.
Those stay in the validation set, where a half-visible mark is a fair test, but
on the page they read as a photo that missed rather than as a detector that
coped. It also refuses anything not on an explicit publication allow-list — the
archive contains people who did not agree to be published, and consent to help
with an experiment is not consent to be on the internet.

The worst frame here reads four marks of seven, and seven of the sixteen read
fewer than six — below six a homography has nothing left over to check itself
with, so those frames get a pose with no way to tell whether it is right. They
are the most useful frames in the bank.`);};
const _qcfx2y = function _hexFrames(testFrameFiles) {return (testFrameFiles.get("hexframes.json").json());};
const _bw7jit = async function _hexFrameBank(hexFrames,testFrameFiles) {
  // Same decode as testFrameBank and manFrameBank, same luma weights, so a bank
  // frame is byte-for-byte the input the live rig would have handed the
  // detector. The greyscale PNG makes that exact rather than approximate: it
  // stores the luma the rig computed, so the decode is an identity.
  const bank = [];
  for (const spec of hexFrames) {
    const fa = testFrameFiles.get(spec.file);
    if (!fa) throw new Error(`hexFrames names ${spec.file}, which testFrameFiles does not map`);
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
    if (c.width !== spec.w || c.height !== spec.h)
      throw new Error(`${spec.file} is ${c.width}x${c.height}, the sidecar says ${spec.w}x${spec.h}`);
    bank.push({ ...spec, url: await fa.url(), frame: { gray, w: c.width, h: c.height } });
  }
  return bank;
};
const _1i43fis = function _hexFrameReport(hexFrameBank,analyzeFrameMan,fitHexPose,htl) {
  // Replay every banked frame through the shipping cascade and show what it
  // makes of each one. No pass/fail bars: this bank grows as more conditions get
  // photographed, and a bar per frame would mean setting one by hand on every
  // arrival and going red on the first genuinely hard capture. The rendered
  // scenes in §11.2 and the mirror bank in §3 are where the tripwires live; this
  // is where the ground truth about REAL optics lives, and its job is to be
  // looked at.
  const COL = {
    read: "#2fe08a", located: "#ffd23f", missing: "#ff5c5c",
    misplaced: "#ff9f1c", off: "#d264ff"
  };
  const cards = [];
  let nowRead = 0, thenRead = 0, marks = 0, spurious = 0;

  for (const b of hexFrameBank) {
    const t0 = window.performance.now();
    const res = analyzeFrameMan({ gray: b.frame.gray, w: b.frame.w, h: b.frame.h }, { stride: 4 });
    const pose = fitHexPose({ ...res, w: b.frame.w, h: b.frame.h });
    const ms = window.performance.now() - t0;

    const parts = [];
    if (pose.ok) {
      for (const m of pose.marks) {
        const c = COL[m.state];
        const dash = m.state === "read" ? "none" : m.state === "located" ? "7 5" : "2 6";
        parts.push(
          `<circle cx="${m.predicted.x}" cy="${m.predicted.y}" r="${m.radiusPx.toFixed(1)}"
            fill="none" stroke="${c}" stroke-width="${m.state === "read" ? 3 : 2}"
            stroke-dasharray="${dash}"/>` +
          `<text x="${m.predicted.x}" y="${(m.predicted.y - m.radiusPx - 6).toFixed(1)}"
            font-family="ui-monospace,monospace" font-size="${Math.max(28, m.radiusPx * 0.5).toFixed(0)}"
            font-weight="700" fill="${c}" text-anchor="middle" paint-order="stroke"
            stroke="#000" stroke-width="5">${m.id}</text>`
        );
      }
      // A detection that fits the involution but sits nowhere the plane goes is
      // the failure the background is in this bank to provoke, so it is drawn
      // rather than counted away.
      for (const o of pose.offTarget)
        parts.push(
          `<g stroke="${COL.off}" stroke-width="4">
            <line x1="${o.x - 16}" y1="${o.y - 16}" x2="${o.x + 16}" y2="${o.y + 16}"/>
            <line x1="${o.x - 16}" y1="${o.y + 16}" x2="${o.x + 16}" y2="${o.y - 16}"/></g>`
        );
      nowRead += pose.counts.read;
      spurious += pose.offTarget.length;
    } else {
      for (const f of res.fused)
        parts.push(
          `<circle cx="${f.xc.toFixed(1)}" cy="${f.yc.toFixed(1)}"
            r="${(f.a ?? f.wHalf ?? 24).toFixed(1)}" fill="none" stroke="#8fa" stroke-width="3"/>`
        );
    }
    thenRead += b.capture.read ?? 0;
    marks += (b.truth ?? []).length;

    // innerHTML rather than interpolation: htl escapes a string, and these are
    // built as SVG source
    const overlay = htl.svg`<svg viewBox="0 0 ${b.frame.w} ${b.frame.h}"
      style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none"></svg>`;
    overlay.innerHTML = parts.join("");

    const chip = (m) => htl.html`<span style="display:inline-block;padding:1px 5px;margin:1px;
      border-radius:3px;font:10px ui-monospace,monospace;color:#111;
      background:${COL[m.state] ?? "#888"}" title=${m.state}>${m.id}</span>`;

    cards.push(htl.html`<figure style="margin:0;width:280px">
      <div style="position:relative;background:#1b1b1b;border-radius:4px;overflow:hidden">
        <img src=${b.url} style="display:block;width:100%;height:auto">${overlay}
      </div>
      <figcaption style="font:11px/1.5 ui-monospace,monospace;padding-top:4px;
        color:var(--theme-foreground-muted,#888)">
        ${b.name} · ${b.frame.w}×${b.frame.h} · ${ms.toFixed(0)}ms<br>
        ${b.capture.distanceMm ? `${b.capture.distanceMm}mm · ${b.capture.tiltDeg}° · ` : ""}${
          pose.ok ? `${pose.counts.read}/7 read` : "no plane"}${
          pose.ok && pose.offTarget.length ? ` · ${pose.offTarget.length} off-target` : ""}
        <div>${pose.ok ? pose.marks.map(chip) : ""}</div>
      </figcaption>
    </figure>`);
  }

  return htl.html`<div>
    <div style="font:13px system-ui;margin-bottom:8px">
      ${nowRead} of ${marks} marks read now, ${thenRead} when captured${
        spurious ? `, ${spurious} off-target detection${spurious === 1 ? "" : "s"}` : ", no off-target detections"}.
      <span style="color:var(--theme-foreground-muted,#888)">solid = read · dashed = located, payload did not decode ·
      dotted = missing · ✕ = fitted an involution somewhere the plane does not go</span>
    </div>
    <div style="display:flex;gap:14px;flex-wrap:wrap">${cards}</div>
  </div>`;
};
const _tivpeh = function _manTestBank_md(md) {return (md`### §3.1 &nbsp; Single-mark frames

A smaller bank of single marks, kept separate because it isolates the row
cascade from the plane fit: a failure here is a decode failure, with no
homography in the way to absorb or amplify it.`);};
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
const _nb2x = function _sweep_md(md) {return (md`### §3.3 &nbsp; Self-tests and knob sweeps

The sweep is one-factor-at-a-time, not a grid, and it also applies every winning
single change together as one extra point — because winners do not compose here.
A previous round found single changes summing to +42 marks that delivered +26
when applied together.

The self-test grades rendered scenes twice: once by the rig's labelling bar, and
once against the renderer's truth the fit never sees. It checks that the bar
admits no false accept, that it is not vacuous, and that the offline scorer
reproduces the live one. It needs at least one rendered scene that is admitted
but does not read all seven marks — so when the detector improves, the scenes
have to get harder, and the test says so rather than quietly passing.`);};
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
  // One render pass, three consumers. The scenes have to straddle the size
  // where this cascade comes apart: bigger and it reads all seven, smaller and
  // it reads none, and neither teaches anything. hexRigSelfTest's checks C and
  // D need at least one ADMITTED case that reads fewer than seven, so if every
  // scene here is solved outright the self-test cannot run and says so.
  //
  // THAT LINE MOVES WHEN THE DETECTOR IMPROVES. It was ⌀110-130; manRowGroups'
  // groupCap took every one of those to 7/7, the partial-failure case
  // disappeared, and the self-test failed — correctly, and for a good reason.
  // The fix is a harder scene, never a softer bar: ⌀80-92 is where the cascade
  // now sits astride the labelling bar. Expect to move it again.
  const T = hexTarget;
  const LOO_FRAC = 0.3;
  const CANDIDATES = [
    { dPx: 80, blur: 1.1, yaw: 0, tilt: 25, seed: 9 },
    { dPx: 92, blur: 0.9, yaw: 10, tilt: 30, seed: 11 },
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
const _nb3x = function _algo_md(md,tex) {return (md`## §4 &nbsp; How it works

Four stages, each one narrowing what the next has to consider:

| | |
|---|---|
| §4.1 | **The encoding** — what is printed, and why that shape is detectable |
| §4.2 | **One scan row** — edges → candidate groups → involution → id |
| §4.3 | **A whole frame** — clustering rows into marks, voting on ids |
| §4.4 | **The plane** — seven marks to a pose in millimetres |

The organising idea is in §4.1 and everything else follows from it: the mark is
designed so that **every edge is load-bearing in both detection and decode**.
Most fiducial designs separate the two — a locator pattern to find the thing, a
payload region to read it — which means half the ink is dead weight during
detection and the other half is dead weight during decode.`);};
const _1566rx9 = function _redesign_md(md,tex) {return (md`### §4.1 &nbsp; The encoding, and why it is shaped like this

The key coordinate is ${tex`u = r^2`}. After normalising by the involution's
fixed points, ${tex`t = (x-P)/(x-Q)`} gives ${tex`t = c k`} exactly, so

${tex.block`u := t^2 = c^2(r^2 - d^2) = A r^2 + B.`}

**The whole per-row warp — chord offset and perspective together — collapses to
an affine map in ${tex`r^2`}-space.** That is the entire reason the design
looks the way it does. A code built from affine-recognisable structure in that
space is detectable on every row, at every pose, from every edge, and no part of
it needs to be reserved for finding the mark rather than reading it.

Four properties follow, and each is used by a stage in §4.2:

1. **Mirror pairing.** Ring edges come in pairs either side of the centre, and
   mirror pairs cannot cross. That bounds the enumeration to pairs taken from
   the ends inward, with opposite gradient signs required.
2. **The involution.** Two pairs determine it in closed form — no search. The
   gates are real fixed points, foot inside the run, vanishing point outside,
   and the result is verified against *all* edges rather than the two that
   produced it.
3. **Lattice correspondence.** Enumerate (outer, inner) tooth anchors, then
   least-squares refit of ${tex`(A, B)`} over every pair. The chord offset
   ${tex`d`} falls out as ${tex`\sqrt{-B/A}`} — measured per row, no
   sweep, no dynamic programming.
4. **Manchester in ${tex`r`}.** Each cell's guaranteed mid edge carries its
   bit as the **gradient sign**, so no intensity threshold is involved. The
   boundary edge between two cells exists if and only if their bits are equal —
   a payload-dependent edge that still feeds detection, acts as parity, and can
   repair an erased bit.

\`manLayout\` fixes six cells of pitch 3.21 (half-cell 1.607), giving 64 ids.
Teeth sit at ${tex`r = 6 + \text{half} \cdot m`}; tooth 0 is the dark
disc's edge, tooth ${tex`2n+2`} the rim, and the mids are guaranteed
regardless of payload.

**What it bought, measured against the previous design on identical synthetic
renders:** per-row full-id reads of 63% against 14% at 120px apparent width, and
29% against 0% at 70px. The geometric stage alone locks 98–100% of rows out to
${tex`d = 22`}. 114µs against 670µs per row. Zero false positives in 2000
clutter rows, against three.

**And the tilt angle comes back.** Rows near the poles now yield geometry, so
the per-row ${tex`\hat d`} feeds a V-fit in d-space whose slope is the
vertical scale — measured, not extrapolated. Under a real pinhole yaw, true
0/20/40/60° read back as 4.9/22.4/39.6/60.1° on a 120px mark.`);};
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
const _nb4x = function _row_md(md) {return (md`### §4.2 &nbsp; One scan row

A row of pixels becomes a list of sub-pixel edges, and then the work is to
decide which of those edges belong to the same mark.

**Edges.** First differences, peaks above a threshold, refined to sub-pixel by a
parabola through the peak. Integer edge positions cost about 0.03 of cross ratio
at 2px-per-template-unit scales, which is past the gate's tolerance — so the
quarter-pixel refinement is what lets small marks through detection at all.

**Grouping.** The involution fit enumerates its outer pair from the outermost
few edges of whatever it is handed, so it can only lock one mark per call. A
frame with several marks in a row must be segmented first. The rule is the
widest gap: inside a mark the widest gap is the dark disc, at most 0.21 of the
mark's own span, so a wider gap separates marks rather than rings.

That bound is about one mark **in isolation**, and on a dense target the failure
is the opposite one: two marks closer together than the threshold are never
separated, and then neither locks, because the outer pair straddles both. The
segmenter therefore cuts more aggressively than the isolated bound allows and
offers the **unsplit run alongside the halves**, letting lattice support decide.
A wrong split loses a mark; a wrong merge merely fails to lock and is discarded.

It also refuses to offer a group with more edges than one mark can physically
present. That single comparison is the largest single improvement measured on
this cascade — and it improves accuracy as well as speed, because an over-cap
group spans two marks, locks at a foot between them carrying an id belonging to
neither, and poisons the vote downstream.`);};
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
      // Nearest opposite-sign edge right of P. Counts DOWN from n-1 and takes
      // strictly-smaller distances only, so among equal distances the higher
      // index wins -- anything replacing this has to match that or the
      // detector answers differently.
      //
      // A binary search over sign-partitioned index lists was written, held to
      // all 42984 recorded calls bit-for-bit, and measured: 427ms against
      // 424ms. No gain. A row carries 13 edges at the median and 33 at the
      // most, and a linear walk of 13 contiguous doubles with a predictable
      // branch beats two binary searches with unpredictable ones. Asymptotics
      // need an n this problem does not have.
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
const _w574fm = function _manRowGroups(manLayout) {return (function manRowGroups(xs, opts = {}) {
  // Split one row's edge positions into candidate per-mark groups.
  //
  // findInvolution enumerates its outer pair from the outermost few edges of
  // whatever it is given, so it can only ever lock ONE mark per call: with two
  // marks in a row the outermost pair straddles both and no involution fits.
  // A live frame has several marks, so the row must be segmented first.
  //
  // The widest gap INSIDE a mark is the dark disc, crossed only near the
  // equator: 2*6 units of a 2*R span, so at most 0.21 of the mark's own span
  // (largest at d=0, and the disc is not crossed at all past d=6). A gap
  // wider than that separates marks, not rings. The edge-count cap is the
  // same argument from the other side: a man mark can present at most
  // 2*(nT+1) edges, so a group holding more than that plus slack is holding
  // more than one thing.
  //
  // gapFrac WAS 0.3, chosen as that 0.21 bound plus slack. That derivation is
  // about one mark IN ISOLATION, and it is the wrong half of the problem on a
  // dense target: two marks whose gap is narrower than gapFrac of the combined
  // span are never separated, and then NEITHER locks, because the outer pair
  // straddles both. The hex calibration sheet is exactly that regime.
  //
  // 0.2 sits BELOW the 0.21 intra-mark bound, so it WILL sometimes cut a mark
  // at its equator. offerWhole is what makes that safe: it offers the unsplit
  // run ALONGSIDE the halves, so a split that cuts a real mark does not delete
  // it. A split is a guess at how many marks are present; offering both lets
  // lattice support decide, which detectRowMan already does and which already
  // happened for count-forced splits. The asymmetry is real -- a wrong split
  // LOSES a mark, a wrong merge merely fails to lock and is discarded.
  //
  // THE TWO ARE A PAIR AND MUST SHIP TOGETHER. 0.2 on its own is faster than
  // the old 0.3 (33ms against 45ms, measured live on one frame) and reads 14
  // more marks across the archive, which makes it look like the better buy --
  // but on the rendered scene in manSceneTest it drops a mark at stride 4 and
  // invents a SPURIOUS one at stride 6. That is the equator cut, and no frame
  // rate is worth a false positive in a positioning system.
  //
  // Measured over the 36-case archive of printed-sheet captures (§11.5),
  // against 252 marks that should be read:
  //   gapFrac 0.3, offerWhole off  (was)  196 read, 0 wrong, median LOO 1.9px
  //   gapFrac 0.2, offerWhole off         210 read, 0 wrong  -- but see above
  //   gapFrac 0.2, offerWhole on   (now)  216 read, 0 wrong, median LOO 2.0px
  //
  // offerWhole also makes duplicate ids possible, since one mark can lock in
  // both the split and the unsplit group; analyzeFrameMan dedupes by id.
  //
  // ---- groupCap: never OFFER a group bigger than one mark can be ----------
  //
  // The 2*(nT+1) bound above was used only to decide to SPLIT, and then
  // offerWhole pushed the unsplit parent out anyway, at every level of the
  // recursion. So the groups the layout says cannot be one mark were still
  // handed to findInvolution -- and they are the expensive ones, because that
  // fit is O(pair hypotheses * n^2). Over the 70-frame archive the over-cap
  // parents are 19% of candidate groups and 72% of sum(n^2).
  //
  // Refusing to emit them is the single best change measured on this cascade,
  // and it is NOT only a speed change (70 archived frames, plus 10 captured
  // after the cap was written and never tuned against):
  //
  //   read 391/490 -> 412, wrong 6 -> 4, median 27.7ms -> 15.5, p90 47 -> 22.5
  //   held-out read 58/70 -> 61, worst leave-one-out 0.91 -> 0.26 radii
  //   rendered scenes 24 read / 5 wrong -> 37 / 0
  //
  // The reason accuracy IMPROVES is the interesting half. An over-cap group
  // spans two or more marks; when it locks at all it lands at a foot between
  // them carrying a decoded id belonging to neither, and that hit then poisons
  // the cluster's id vote and the duplicate-id dedup downstream. Those locks
  // looked like detections and were noise, which is why deleting 2055 of 7092
  // locking groups RAISES the number of marks read.
  //
  // Slack 3 rather than maxEdges' 6 because 32..35 is a flat plateau on read
  // and 33 is the cheapest of them; 30 (no slack) starts dropping real marks.
  // Four cheaper structural tests were measured and all failed -- sign
  // alternation keeps only 913 of 7092 locking groups, even parity 3722,
  // mirror-sign consistency 1574 -- because edges1Dsub at thr=12 emits
  // consecutive same-sign peaks freely and a real mark's group routinely
  // carries clutter edges the involution simply does not use.
  const L = opts.layout ?? manLayout;
  const gapFrac = opts.gapFrac ?? 0.2;
  const maxEdges = opts.maxEdges ?? 2 * (L.nT + 1) + 6;
  const groupCap = opts.groupCap ?? 2 * (L.nT + 1) + 3;
  const minEdges = opts.minEdges ?? 6;
  const minSpan = opts.minSpan ?? 14;
  const offerWhole = opts.offerWhole ?? true;
  const out = [];
  const emit = (lo, hi) => { if (hi - lo + 1 <= groupCap) out.push([lo, hi]); };
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
      if ((tooMany && !tooWide) || offerWhole) emit(lo, hi);
      return;
    }
    emit(lo, hi);
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
const _4liiby = function _cascade_md(md) {return (md`### §4.3 &nbsp; A whole frame

Scan a uniform lattice of rows. Each row yields zero or more locks, each with a
**foot** — the involution's fixed point, which is the mark's centre column for
that row.

**Cluster on the foot, not on the decoded id.** Geometry survives rows whose
payload does not, so clustering on ids would discard exactly the rows that make
the pose fit work.

A cluster is reported only if it survives **both** an id vote and a plausible
pose. The two are independent evidence — the payload gate lives in the decode's
boundary checks, the shape gate in the ellipse fit — so ordinary scene clutter,
which produces plenty of one and almost none of the other, does not reach the
caller as a mark.

One id means one piece of paper, so two clusters carrying the same id are
resolved rather than both emitted: handing the plane fit two positions for one
landmark gives the homography contradictory evidence about where that landmark
is, which is the exact instability this detector exists to remove.`);};
const _1jt47m8 = function _analyzeFrameMan(rotateFrame,mergeManAxes,manScanRows,clusterManRows,scanRowsMan) {return (function analyzeFrameMan(frame, opts = {}) {
  // Whole frame, several man marks, on this thread. Three stages:
  //
  //   manScanRows    which rows to look at
  //   scanRowsMan    rows -> per-row hits          (pure per row, parallelisable)
  //   clusterManRows hits -> marks with poses      (rows talk to each other)
  //
  // There is no coarse/fine split: the §4.2 cascade locks geometry on ~all
  // rows that cross a mark, so a single uniform lattice already puts many rows
  // through every mark. Coarse-to-fine existed because the older detector
  // decoded only near the equator.
  //
  // The split into stages is what analyzeFrameManAsync uses to put stage 1 on
  // a worker pool; this entry point stays synchronous so every test, sweep and
  // report that calls it keeps working unchanged.
  const t0 = window.performance.now();
  if (opts.bothAxes) {
    const single = { ...opts, bothAxes: false };
    const rows = analyzeFrameMan(frame, single);
    const rot = analyzeFrameMan(rotateFrame(frame, 1), single);
    return { ...mergeManAxes(rows, rot, frame, opts), ms: window.performance.now() - t0 };
  }
  const ys = manScanRows(frame, opts);
  const res = clusterManRows(scanRowsMan(frame, ys, opts), opts);
  return { ...res, rowsTried: ys.length, ms: window.performance.now() - t0 };
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

The centre estimate is anisotropic. Along a scan row the centre column is the
involution's fixed point: **measured**, on every row that reads. Across rows the
centre is wherever the d-space fit extrapolates ${""}|d| → 0, which no row ever
observes. Measured on one photograph turned four ways: 23px of spread on the
measured coordinate against 64px on the extrapolated one.

Scanning the transposed frame turns that around, so between them the two passes
measure both coordinates directly.

For a long time the measurements said the option was not worth having: over the
archive it never once found an extra mark and its median leave-one-out was
slightly worse than rows alone. **That verdict was an artefact of the archive.**
Every frame in it was held still. Motion blur is directional, and a smear along
${""}x destroys exactly the ring flanks a row crosses while leaving the arcs a
column crosses intact — so the frames where an orthogonal scan is worth
everything were the frames nobody had captured yet. Five arrived at once: the
row pass read **0** on all five and the column pass read 6 or 7 with a
leave-one-out of 1.6–2.7px.

It still read nothing, because the merge threw the answer away. A column-only
*sighting* inside a row-anchored frame is suspect — it carries an extrapolated
${""}x into a set of row-measured marks, and mixing provenance inside one
homography is what once took a static frame from 0.6px to 24.5px. A column-only
*frame* is not that animal at all: it is this detector with the image turned
ninety degrees, extrapolating ${""}x exactly as a rows-only frame extrapolates
${""}y, which is what ships on every frame. The old rule could not tell the two
apart, so a complete detection was filed under \`axisOnly\` and the frame
reported nothing.

Two other things the archive settled, both against the argument that sounded
better:

- **Gate the two disagreements separately, at the same fraction of the mark.**
  The asymmetry says ${""}dy should be the looser bound, since it is the row
  pass extrapolating ${""}y and is expected to be large. Sweeping them
  independently, equal fractions won and loosening ${""}dy lost: at 0.25 a
  single admitted fusion takes worst-case leave-one-out from 21px to 134px.
  What the gate actually asks is whether both passes found the *same object*,
  and that question has no preferred axis.
- **On a disagreement, keep the row pass** — not "whichever pass covered the
  mark better", which is the rule that sounds principled and measures worse
  (median 3.3 → 3.9px, worst 21 → 134px). The row pass is the one every gate,
  sweep and banked case here was tuned against, and that is a real asymmetry.

Over 156 archived cases, against the same detector scanning rows alone:
**851 → 889 marks, 149 → 155 frames posed, 5 dead frames → 0, worst-case
leave-one-out 23.9px → 21.3px**, median 3.1 → 3.3px, and no frame made worse by
more than 2px. It costs a second pass. It is still off by default, because that
second pass is the frame budget on a phone — but it is no longer off because it
does not work.`);};
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
  //
  // It IS close to a wash on real frames -- see §11.5, where bothAxes never
  // found an extra mark across the archive and its median leave-one-out was
  // worse than rows only. This scene is clean enough to show the mechanism
  // working; it is not evidence that the option earns its cost.
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
    // NOT "the column pass beats itself on its own scan axis". On a clean
    // render both of its errors are sub-pixel and which one wins is noise:
    // this passed on 1.01 vs 0.96 and flipped to 0.75 vs 0.97 the moment
    // segmentation improved the extrapolated coordinate. The load-bearing
    // claim is that the column pass measures y better than the ROW pass
    // does -- that is the asymmetry bothAxes exploits -- and it holds by ~3x.
    ["column scan measures y better than the row scan does", eC.yMean < eR.yMean],
    ["both-axes y beats row-only y", eB.yMean <= eR.yMean],
    ["both-axes x is no worse than row-only x", eB.xMean <= eR.xMean + 1e-9],
    ["both-axes finds no fewer marks", eB.found >= eR.found],
    ["no id conflicts on a clean scene", both.conflicts.length === 0],
    // One id is one piece of paper. offerWhole can lock a mark twice, so the
    // dedupe in analyzeFrameMan is load-bearing and gets asserted here.
    ["no duplicate ids", new Set(rows.fused.map((f) => f.id)).size === rows.fused.length],
    // The flag must be OFF unless asked for: every other consumer in this
    // notebook, and the realtime detector above all, calls analyzeFrameMan
    // without it and must be getting the single-pass result.
    ["default call is single-pass", rows.bothAxes === undefined && rows.axes === undefined]
  ];
  for (const [what, ok] of checks) out.push(`${ok ? "ok  " : "FAIL"} ${what}`);
  out.push("", checks.every(([, ok]) => ok) ? "PASS" : "FAIL");
  return out.join("\n");
};
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
const _nb5x = function _plane_md(md) {return (md`### §4.4 &nbsp; From marks to a pose

Seven known points on a rigid printed sheet, up to seven measured points in the
image: that is a homography, over-determined once six are read.

Because the sheet's geometry is known in millimetres, the fit returns metric
quantities — working distance and tilt — rather than arbitrary units. And
because it is over-determined, it can be checked: predict each mark from a fit
that did not use it, and compare. That leave-one-out residual is the number the
rig gates on in §1, and the reason is worth repeating: the ordinary fit residual
is computed against the very data the fit minimised, so it reports how well the
model absorbed its own errors, not how well it predicts.`);};
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
  // The mark is a CIRCLE on the plane, so under the homography it is an
  // ellipse -- tilted, and not axis aligned once the sheet is also rotated.
  // radiusAt above averages that anisotropy away, which is right for a
  // tolerance and wrong for anything drawn on top of the mark: at 24 degrees
  // of tilt a circle of the mean radius overshoots one way and undershoots
  // the other by the same amount, which is exactly what it looks like.
  //
  // Sampling the circle in plane millimetres and mapping each point is exact
  // for any tilt, any rotation and any perspective, and costs 24 multiplies
  // where fitting a conic would cost an argument about degenerate cases.
  const OUTLINE_N = 24;
  const outlineAt = (m) => {
    const pts = [];
    for (let i = 0; i < OUTLINE_N; i++) {
      const th = (2 * Math.PI * i) / OUTLINE_N;
      const [x, y] = fit.map(
        m.xMm + T.radiusMm * Math.cos(th),
        m.yMm + T.radiusMm * Math.sin(th)
      );
      pts.push([+x.toFixed(1), +y.toFixed(1)]);
    }
    return pts;
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
      // the mark's own projected shape; radiusPx stays the isotropic tolerance
      outline: outlineAt(m),
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
  const selfF = cands.length ? Math.sqrt(cands.reduce((s, v) => s + v, 0) / cands.length) : null;
  // The two f estimates come from two different constraints on the same
  // homography. When they agree, f means something; when they do not, their
  // AVERAGE means nothing, and averaging is exactly what hides that. Measured
  // near-frontal on a phone: f ~1900px with the two estimates 1300px apart,
  // and a distance printed to the millimetre that swung 245-993mm between
  // frames while mmPerPx held to 2%. The conditioning number was already being
  // computed and reported as `fSpread`; it was simply never acted on.
  const spread = cands.length === 2 ? Math.abs(Math.sqrt(f2a) - Math.sqrt(f2b)) : null;
  const maxSpreadFrac = opts.maxFSpreadFrac ?? 0.25;
  const selfOk = selfF != null && spread != null && spread <= maxSpreadFrac * selfF;
  const f = selfOk ? selfF : null;
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
        // how far the two f estimates disagreed -- the honest conditioning
        // number for everything above, and now the thing that decides whether
        // any of it is reported at all
        fSpread: spread == null ? null : +spread.toFixed(1)
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
    poseWhy: pose ? null
      : fit.affine ? "affine (3 marks)"
      : !cands.length ? "no valid f"
      : selfF && spread != null && !selfOk
        ? `f ill-conditioned (±${Math.round((spread / selfF) * 100)}% — tilt the sheet)`
        : "near-frontal: f ill-conditioned",
    counts, marks,
    offTarget: offTarget.map((f) => ({ id: f.id, x: Math.round(f.xc), y: Math.round(f.yc) }))
  };
});};
const _nb6x = function _next_md(md) {return (md`## §5 &nbsp; Next steps

**Adaptive tuning**, in its own notebook. The evaluation in §3 makes a fitness
function out of the frame bank: read count, invented marks, and time, on frames
with real backgrounds and frozen labels. That is enough to search the detector's
parameters automatically instead of by hand, and the sweep in §3.3 is the
manual, one-factor-at-a-time version of exactly that search.

Two findings from this notebook say what such a search has to be careful about.
Winners do not compose — six independent improvements claiming +102 marks
between them delivered +37 when stacked — so a search that optimises one knob at
a time will systematically overstate what it has found. And the real archive
cannot see an invented mark, so any fitness function built only from captures
will happily reward a detector that hallucinates; the rendered scenes have to
stay in the objective.

The other open thread is **cost**. Time tracks the number of locked rows, not
the number of pixels: correlation 0.87 against rows, 0.20 against frame area. A
busy background costs 1.7x the time for no change in accuracy. That points at
gating the scan to where a mark was last seen rather than at making the image
smaller — downscaling is the intuitive lever and the measurements say it is the
wrong one.

The pool in §4.5 buys about 2.4x of that cost and no accuracy. Handing chunks
out on demand has since closed its first lead — the frame no longer waits on
whichever worker drew a slow core. The second is still open: a **temporal gate**
would cut the row count itself, which is the quantity the cost actually tracks.
The two compose, because one makes rows cheaper to run and the other asks for
fewer of them.

A third lead came from the same measurement, was tried, and has been
**removed**. The main thread scans rows faster than any worker and spends the
whole frame awaiting them, so it could consume the same queue. A sampling
profile taken over the DevTools protocol on the phone itself made that look
obvious: the main thread sits **idle 37.9%** of every frame while all six
workers saturate.

Measured on one stored frame, arms interleaved and both warmed, it was **13.8%
slower** — 39.8ms against 45.3ms, on 8 cores with 6 workers. It was idle because
it was *waiting*. Scanning on it takes a core away from a worker and blocks the
replies those workers are trying to deliver, so it loses twice. An idle main
thread is not a spare core; idle percentages measure blocking, and only an A/B
measures spare capacity. The code is gone rather than left behind a flag,
because a flag would have preserved the wrong intuition along with it.

### §5.1 &nbsp; Why it used to start slow

The rig was reliably terrible for its first second and then fine, which is the
kind of thing that gets explained away as the camera settling. It was 8.4x, and
it was not the camera.

Timing every job from the very first on a fresh pool, and recording each
worker's *own* reported time next to wall clock, splits it in two — because
from outside, a job waiting in a queue and a job running interpreted look
exactly the same:

| jobs | wall | workers reported | |
|---|---|---|---|
| 1-17 | 28-47ms | 7-10ms | 25ms of **queueing** |
| 18 | 7.2ms | | \`poolAgreement\` resolved |
| 18-80 | falling | 7.0 → 4.0ms | **cold code**, tiering up |

The first half was self-inflicted. \`poolAgreement\` is the boot-time
correctness check, and it pushes all 16 bank frames through the very workers
the live loop needs, so live frames queued behind it. It now **defers while the
camera is running**: queueing 25.4ms → 0.4ms, first ten frames 33.4ms → 7.9ms,
converged at job 4 instead of job 41. Turn the camera off and the check runs.

The second half is real and has no cheap fix. The kernel is these cells put
through \`toString()\` and rebuilt with \`new Function()\` inside each worker,
so nothing of the main thread's JIT state crosses over and six workers each
tier up alone. A synthetic warm-up was tried and did nothing — it was 375x too
small, and sized to work it costs the same second of worker time the deferred
check was already spending. Ahead-of-time compilation is the only thing that
removes it outright.

### §5.2 &nbsp; Capture, and how it had to be tuned

On a phone, **getting the pixels cost more than looking at them**, and that went
unnoticed for a long time because the frame timer started after the capture. The
original path is the obvious one: \`drawImage\` the video into a 2D canvas,
\`getImageData\`, weighted-sum RGB to gray. On a mid-range Android at 960×1280
that is 5.1 + 17.7 + 1.7 = **24ms**, against 10-26ms for the detector it feeds.

But a camera does not produce RGBA. It produces **I420**, and plane 0 of an I420
frame *is* the luma — the exact buffer the detector wants, already computed by
the decoder. \`new VideoFrame(video).copyTo(buf)\` hands it over in **1.4ms**,
and the visible canvas takes the video directly on the GPU for 0.1ms instead of
receiving a CPU-side copy. Capture went ~22ms → ~1.5ms, and gray → 0.

Four things had to be right, and each is a way this can quietly regress:

- **Colour range.** I420 luma is BT.601 *limited* range (16-235); the old path
  derived luma from RGB the decoder had already expanded to full range.
  Uncorrected, every edge magnitude shrinks by 0.86 and every tuned threshold
  and every archived case silently means something else. Measured against the
  old path on a lit frame: raw Y differs by a mean of **11.5 levels**,
  LUT-corrected by **0.34**. The correction is a 256-entry lookup, cheaper than
  the three multiplies it replaces.
- **Expand lazily.** Converting all 1.2M pixels showed up in the next profile as
  its own cost, larger than the copy it followed. The scan reads a quarter of
  the rows, so only a quarter of the rows are expanded; anything wanting the
  whole frame asks for it (\`ensureFull\`).
- **\`copyTo\` cannot scale — it crops.** So the fast path requires the working
  width to equal the camera's own width. A \`maxWidth\` below the camera
  resolution silently drops back to the 22ms path. The camera is therefore
  requested at \`max: 1280\` and the working width defaults to 1280, so the two
  agree by construction. **If capture time jumps back to ~20ms, check this
  first.**
- **Stride may be padded.** Plane 0 can be wider than the image; the
  \`PlaneLayout\` returned by \`copyTo\` carries the real stride, and rows are
  repacked only when it differs from the width.

None of this is assumed to exist. WebCodecs, the pixel format and the frame size
are all capability-checked and the old path stays as a real fallback, which is
also what makes the two comparable — \`lumaCapture.compare()\` runs both on the
same live frame and reports the mean and max difference. The HUD says which path
is live (\`vf\` or \`gid\`) and, when it is the slow one, why: a 20ms difference
should never have to be guessed at.`);};
const _10in6wk = function _manScanRows() {return (function manScanRows(frame, opts = {}) {
  // The scan lattice. One line, its own cell, because two things need it and
  // they must agree exactly: the serial pass walks it, and the worker pool
  // deals it out. If they disagreed the pool would silently scan a different
  // set of rows and every comparison between them would be meaningless.
  const stride = opts.stride ?? 6;
  const ys = [];
  for (let y = Math.floor(stride / 2); y < frame.h; y += stride) ys.push(y);
  return ys;
});};
const _30gfrc = function _scanRowsMan(edges1Dsub,detectRowMan) {return (function scanRowsMan(frame, ys, opts = {}) {
  // Stage 1 of three, and the only expensive one: per row, find the edges and
  // run the §4.2 cascade over them.
  //
  // Pure per row. A row needs its own pixels and nothing else -- no
  // accumulator, no neighbouring row, no state carried between iterations.
  // That is not a convenience, it is the whole reason the detector can be
  // moved off the main thread at all, and it is why the seam is cut here
  // rather than anywhere else in the pipeline. Stage 2 (clustering) is where
  // rows first talk to each other, so stage 2 is where parallelism stops.
  const thr = opts.edgeThreshold ?? 12;
  const gray = frame.gray, w = frame.w;
  const out = [];
  for (let i = 0; i < ys.length; i++) {
    const y = ys[i];
    const se = edges1Dsub(gray.subarray(y * w, (y + 1) * w), thr);
    out.push({ y, hits: detectRowMan(se, opts) });
  }
  return out;
});};
const _ezke5v = function _clusterManRows(manLayout,fitManPose) {return (function clusterManRows(rowResults, opts = {}) {
  // Stage 2: rows into marks. Lifted verbatim out of analyzeFrameMan when the
  // pipeline was split for the worker pool -- there is still exactly one copy
  // of these rules, which is the only reason serial and pooled runs can be
  // required to agree to 4dp.
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
  // sweep them (§3.3). Every default below is the value that was hardcoded
  // here before, so an unparameterised call behaves exactly as it did.
  //
  // rowResults must arrive in ascending y: the neighbour test below is a
  // forward scan over a y-ordered stream, so a shuffled input would build
  // different clusters. The pool restores the order before calling this.
  const L = opts.layout ?? manLayout;
  const stride = opts.stride ?? 6;
  const minRows = opts.minRows ?? 3;      // rows before a cluster is a candidate
  const minVotes = opts.minVotes ?? 2;    // rows that must agree on the id
  const voteRatio = opts.voteRatio ?? 2;  // winner must beat runner-up by this
  const clusters = [];
  let rowHits = 0;
  for (const row of rowResults) {
    const y = row.y;
    for (const hit of row.hits) {
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

  // One id is one piece of paper. Two clusters carrying it means either a
  // mark was locked twice at slightly different feet -- which manRowGroups'
  // offerWhole makes possible, since it deliberately offers a split AND the
  // unsplit run -- or one of them is clutter that voted the same payload.
  // Either way, handing fitHexPose two points for a single landmark gives the
  // homography contradictory evidence about where that landmark is, which is
  // exactly the instability this detector is supposed to remove. Keep the
  // better-evidenced cluster (most rows, then vote margin, then coverage) and
  // demote the other rather than letting the fit arbitrate.
  const confirmed = all.filter((f) => f.id != null && f.posed);
  const rejected = all.filter((f) => !(f.id != null && f.posed));
  const byId = new Map();
  for (const f of confirmed) {
    const prev = byId.get(f.id);
    if (!prev) { byId.set(f.id, f); continue; }
    const wins =
      f.rows !== prev.rows ? f.rows > prev.rows
      : f.voteMargin !== prev.voteMargin ? f.voteMargin > prev.voteMargin
      : (f.cover ?? 0) > (prev.cover ?? 0);
    byId.set(f.id, wins ? f : prev);
    rejected.push({ ...(wins ? prev : f), why: "duplicate-id" });
  }

  return {
    fused: [...byId.values()],
    // located but not confirmed: kept separate so a caller can show them
    // (useful when aiming the camera) without treating them as detections
    unidentified: rejected,
    rowHits
  };
});};
const _1m3an4z = function _mergeManAxes(unrotatePoint) {return (function mergeManAxes(rows, rot, frame, opts = {}) {
  // The opts.bothAxes merge, lifted out of analyzeFrameMan so the serial and
  // pooled entry points share one copy of it rather than two that drift.
  //
  // The centre estimate is anisotropic. Along a scan row the centre column is
  // the involution's fixed point: MEASURED, on every row that reads. Across
  // rows the centre is wherever the d-space V-fit extrapolates |d| -> 0,
  // which no row ever observes. §4.3 measured the gap on one photograph
  // turned four ways: 23px of spread on the measured coordinate against 64px
  // on the extrapolated one. Scanning the transposed frame turns that around,
  // so between them the two passes measure both coordinates directly.
  //
  // Two corrections the real frames forced, both of which the rendered scene
  // in manAxesTest was too clean to expose:
  //
  // 1. A mark seen only by the COLUMN pass has a MEASURED y but an
  //    EXTRAPOLATED x -- precisely the quantity this option exists to stop
  //    trusting. Admitting those as detections re-imports the error the
  //    option was built to remove: one such mark took a static frame from 6
  //    marks at 0.6px leave-one-out to 7 at 24.5px. They go to `axisOnly`,
  //    reported but not fused.
  //
  // 2. "The column pass measured y, so its y is better" is only true when the
  //    column fit is itself sound. When the two passes disagree by a lot, one
  //    of them is wrong and nothing local says which, so taking the column's
  //    unconditionally is a coin flip on every frame -- it exploded two
  //    captures to 22px. Past `maxCrossPx` we keep the row pass, because that
  //    is the gated and banked one. Measured over the archive, the guard took
  //    worst-case leave-one-out from 22.20px to 5.70px, better than the
  //    11.20px the row scan manages alone.
  // The cross-check tolerance travels with the mark, like the matching radius
  // below. A mark 70px across can disagree by 10px between passes purely
  // through extrapolation; one 25px across cannot. A fixed pixel count only
  // ever suits one working distance.
  const maxCross = opts.maxCrossPx ?? 8;
  const crossFrac = opts.maxCrossFrac ?? 0.15;
  // Gate each disagreement separately, both as the same fraction of the mark.
  // The asymmetry argument said dy should be the looser of the two -- it is the
  // row pass extrapolating y, measured in §4.3 at 64px of spread against 23px
  // for a measured coordinate, so a large dy is expected rather than damning.
  // The archive disagreed: sweeping the two independently, equal fractions won
  // and loosening dy lost. At 0.25 a single bad fusion takes worst-case
  // leave-one-out from 21px to 134px. What the gate is really asking is "did
  // both passes find the SAME object", and that question has no preferred axis.
  const crossYFrac = opts.maxCrossYFrac ?? 0.15;
  // Four points fit a homography, so four is where a frame becomes usable.
  const minSet = opts.minAxisSet ?? 4;
  // Map the rotated pass back into frame coordinates. The ellipse axes swap
  // with the frame: what that pass measured along ITS scan is the extent in
  // image y.
  const back = (f) => {
    const p = unrotatePoint(f.xc, f.yc, 1, frame.w, frame.h);
    return { ...f, xc: p.x, yc: p.y, a: f.b, b: f.a };
  };
  const cols = rot.fused.map(back);
  const used = new Set();
  const fused = [], conflicts = [], axisOnly = [];
  let worstCross = 0, bothN = 0, crossRejected = 0;
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
    worstCross = Math.max(worstCross, bd);

    // Which disagreement indicts whom. The row pass MEASURED x and
    // extrapolated y; the column pass measured y and extrapolated x. So
    // dx is the column's extrapolation error and dy is the row's --
    // each is evidence about the coordinate that pass is about to have
    // TAKEN AWAY from it, not about the one it contributes.
    //
    // The old gate was on hypot(dx, dy), which is mostly dy on exactly the
    // frames this option exists for: a big dy IS the row pass extrapolating y
    // badly, and rejecting the fusion there throws away the fix at the moment
    // it is worth most. Gate on dx alone. A column pass that also puts the
    // mark in the right place along x is a column pass that found this mark
    // rather than something else, and that is the only thing worth checking.
    const dx = Math.abs(cols[m].xc - r.xc);
    const dy = Math.abs(cols[m].yc - r.yc);
    if (dx > Math.max(maxCross, crossFrac * size) || dy > crossYFrac * size) {
      // The two passes are looking at different things. Keep the row pass.
      //
      // Deciding this by evidence instead -- whichever pass covered the mark
      // better -- reads as the more principled rule and measures worse: over
      // the archive it took median leave-one-out from 3.3px to 3.9px and
      // worst-case from 21px to 134px. "Keep the row pass" is not a position
      // in the code, it is the pass that every gate, sweep and banked case in
      // this notebook was tuned against, and that is a real asymmetry between
      // them.
      crossRejected++;
      fused.push({ ...r, axis: "row",
        crossPx: +bd.toFixed(2), dxPx: +dx.toFixed(2), dyPx: +dy.toFixed(2),
        crossRejected: true });
      continue;
    }
    bothN++;
    // x from the row pass, y from the column pass: each coordinate comes from
    // the pass that measured it rather than the one that extrapolated it.
    fused.push({
      ...r, xc: r.xc, yc: cols[m].yc, a: r.a, b: cols[m].b ?? r.b,
      axis: "both", crossPx: +bd.toFixed(2),
      dxPx: +dx.toFixed(2), dyPx: +dy.toFixed(2)
    });
  }
  const rowIds = new Set(rows.fused.map((f) => f.id));
  const leftover = [];
  for (let i = 0; i < cols.length; i++) {
    if (used.has(i)) continue;
    if (rowIds.has(cols[i].id)) {
      // Both passes claim this id, too far apart to be the same mark. One of
      // them is wrong and nothing here says which, so keep the row pass --
      // that is what ships -- and report the disagreement rather than emitting
      // a duplicate id for fitHexPose to trip over.
      conflicts.push({ id: cols[i].id, x: +cols[i].xc.toFixed(1), y: +cols[i].yc.toFixed(1) });
      continue;
    }
    leftover.push({ ...cols[i], axis: "col" });
  }

  // TOLERATING A DEAD AXIS.
  //
  // A column-only SIGHTING inside a row-anchored frame is suspect, and that is
  // what sends `leftover` to axisOnly: it carries an extrapolated x into a set
  // of row-measured marks, and mixing provenance inside one homography is what
  // took a static frame from 0.6px to 24.5px leave-one-out.
  //
  // A column-only FRAME is a different animal, and the old rule could not tell
  // them apart. It is this detector with the image turned ninety degrees: it
  // extrapolates x exactly as a rows-only frame extrapolates y, which is a
  // thing we ship on every frame. Nothing about it is mixed.
  //
  // That distinction is not academic. Motion blur is directional, and a smear
  // along x destroys precisely the ring flanks a row crosses while leaving the
  // arcs a column crosses intact. On five such captures the row pass read 0
  // and the column pass read 6 or 7 with a leave-one-out of 1.6-2.7px -- and
  // the old rule filed all of it under axisOnly and reported nothing.
  const colSet = [...cols].map((c) => ({ ...c, axis: "col" }));
  const rowFallback = fused.length < minSet && colSet.length > fused.length;
  const out = rowFallback ? colSet : fused;
  return {
    fused: out,
    unidentified: [...rows.unidentified, ...rot.unidentified.map(back)],
    // seen by one scan alone: real sightings, but carrying the extrapolated
    // coordinate into a set measured the other way, so reported not fused
    axisOnly: rowFallback ? rows.fused.filter((r) => !colSet.some((c) => c.id === r.id))
        .map((r) => ({ ...r, axis: "row" }))
      : leftover,
    conflicts,
    // which axis carried the frame: "col" means the row pass could not
    axisUsed: rowFallback ? "col" : bothN ? "both" : "row",
    bothAxes: bothN,
    crossRejected,
    worstCrossPx: +worstCross.toFixed(2),
    axes: { rows, cols: rot },
    rowsTried: rows.rowsTried + rot.rowsTried,
    rowHits: rows.rowHits + rot.rowHits
  };
});};
const _13ae255 = function _detectKernelSource(manLayout,edges1Dsub,findInvolution,solveMan,manRowGroups,detectRowMan,scanRowsMan) {
  // The worker script, built from the LIVE cells rather than a hand-written
  // copy of them. Every function below is the same object this notebook calls
  // on the main thread, serialised with toString(); every constant is the same
  // value, serialised as a literal. So a worker cannot drift from the
  // notebook: edit a cell and the next pool build picks the edit up. This is
  // the only honest way to run notebook code off-thread -- a transcribed
  // kernel would be a second implementation to keep in step, and it would be
  // wrong within a week.
  //
  // What makes it possible at all is that stage 1 is per-row pure (see
  // scanRowsMan), so a worker can be handed a set of rows and nothing else.
  //
  // The list below is the one thing here that IS hand-maintained, and in the
  // previous incarnation of this pool it bit once: adding a precomputed table
  // broke every worker with "Can't find variable" while the main thread stayed
  // fine. A missing name fails loudly on the first job, which is the good case.
  //
  // The corollary: toString() carries the TEXT of a function, not its closure,
  // so anything a detector function reaches for must be reachable BY NAME
  // here. A lookup table hidden inside a closure would serialise to an
  // unbound identifier.
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

  return [
    // a worker has no window; nothing in stage 1 needs one, but a stray
    // performance.now() in a cell being edited should not take the pool down
    "var window = self;",
    emit("manLayout", manLayout),
    emit("edges1Dsub", edges1Dsub),
    emit("findInvolution", findInvolution),
    emit("solveMan", solveMan),
    emit("manRowGroups", manRowGroups),
    emit("detectRowMan", detectRowMan),
    emit("scanRowsMan", scanRowsMan),
    // The worker keeps a full-size frame buffer and writes only the rows of
    // the job into it, so every row is addressed by absolute y exactly as on
    // the main thread. Rows arrive packed and transferred, which moves ~1KB
    // per row rather than the whole frame.
    `
let FRAME = null;
self.onmessage = (e) => {
  const d = e.data;
  // The buffer is sized from the job, not from a separate init handshake. A
  // handshake needs a reply to pair with a request, and pairing it by a single
  // resolver slot loses one whenever two are in flight — which bothAxes makes
  // routine, since it alternates 960x720 and 720x960 every frame. A dropped
  // resolver is a promise that never settles, and one of those stops the whole
  // runtime, not just this pool.
  if (!FRAME || FRAME.w !== d.w || FRAME.h !== d.h)
    FRAME = { gray: new Uint8Array(d.w * d.h), w: d.w, h: d.h };
  const w = FRAME.w, ys = d.ys, px = d.px;
  for (let i = 0; i < ys.length; i++)
    FRAME.gray.set(px.subarray(i * w, (i + 1) * w), ys[i] * w);
  let rows = null, err = null;
  const t0 = performance.now();
  try {
    rows = scanRowsMan(FRAME, ys, d.opts);
  } catch (ex) {
    err = ex && ex.message ? ex.message : String(ex);
  }
  self.postMessage({ type: "done", id: d.id, rows, err, ms: performance.now() - t0 });
};`
  ].join("\n");
};
const _10l0bax = function _poolSize(Inputs) {return (Inputs.range([0, 12], {
  step: 1,
  value: Math.min(6, Math.max(0, (navigator.hardwareConcurrency || 4) - 2)),
  label: "detection workers (0 = main thread)"
}));};
const _1xat3lz = (G, _) => G.input(_);
const _l7r79y = function _detectPool(poolSize,detectKernelSource,invalidation) {
  // A fixed set of dedicated workers, handed row batches. Nothing reactive
  // crosses the boundary: a job is (rows, options) in and per-row hits out,
  // which is why the same code runs on the main thread with the pool switched
  // off (poolSize 0) and gives identical results rather than similar ones.
  if (!poolSize) return null;
  let dead = false;
  const url = URL.createObjectURL(
    new Blob([detectKernelSource], { type: "text/javascript" })
  );
  const ws = [];
  for (let i = 0; i < poolSize; i++) {
    const w = new Worker(url);
    w.pending = new Map();
    w.onmessage = (e) => {
      const d = e.data;
      const settle = w.pending.get(d.id);
      if (settle) { w.pending.delete(d.id); settle(d); }
    };
    // A worker that dies takes its jobs with it. Settling them as errors turns
    // that into a thrown exception at the call site instead of a caller parked
    // forever on a promise nobody will ever resolve.
    w.onerror = (e) => {
      for (const [, settle] of w.pending) settle({ err: "worker crashed: " + (e.message || e.type) });
      w.pending.clear();
    };
    ws.push(w);
  }
  // Rebuilt whenever poolSize or the kernel changes, so the old pool has to go
  // with it -- otherwise the workers outlive their cell and leak a thread each.
  //
  // Draining the queue here is not tidiness. Changing the worker count while a
  // frame is in flight terminates the workers that frame is waiting on, and
  // without this its promise never settles. Observable processes updates in one
  // chain, so that does not stall the rig alone -- it stalls the whole runtime,
  // with no error anywhere. Measured: after one such tear-down a freshly defined
  // cell of "1 + 1" never computed either.
  invalidation.then(() => {
    dead = true;
    for (const w of ws) {
      for (const [, settle] of w.pending) settle({ err: "pool rebuilt mid-job" });
      w.pending.clear();
      w.terminate();
    }
    URL.revokeObjectURL(url);
  });

  let seq = 0;
  const send = (w, msg, transfer) =>
    new Promise((res) => {
      const id = ++seq;
      w.pending.set(id, res);
      w.postMessage({ ...msg, id }, transfer || []);
    });

  const api = {
    size: ws.length,
    lastWorkerMs: [],
    lastWorkerChunks: [],
    runRows: async (frame, ys, opts) => {
      if (dead) throw new Error("detection pool was torn down");
      // opts crosses a structured clone, and the caller's opts is exactly the
      // object carrying runRows -- a function, which is not cloneable. Drop
      // every function rather than naming the one we know about: the next
      // callback added to opts would otherwise throw DataCloneError from
      // inside postMessage, a long way from whoever added it.
      const plain = {};
      for (const [k, v] of Object.entries(opts ?? {}))
        if (typeof v !== "function") plain[k] = v;

      // Hand chunks out on demand rather than dealing every row up front. The
      // reason is not uneven rows -- interleaving already averages those out --
      // it is uneven CORES. A phone and an Apple laptop both run a mix of
      // performance and efficiency cores, and the browser is free to put a
      // worker on either: six warm workers given identical work here split
      // 8/8/8/30/30/31ms, a clean 4x in two groups. A static deal waits for the
      // slowest of those every frame. A queue does not -- a worker on a fast
      // core simply comes back for more, and nobody has to know which core they
      // were given.
      //
      // Chunks are interleaved rather than contiguous so each still spans the
      // image. The queue would absorb a chunk full of marks anyway, but rows
      // differ in cost by ~100x and spreading them costs nothing.
      const NC = Math.min(ys.length, ws.length * 3);
      const chunks = [];
      for (let c = 0; c < NC; c++) {
        const rows = [];
        for (let i = c; i < ys.length; i += NC) rows.push(ys[i]);
        if (rows.length) chunks.push(rows);
      }
      const out = [];
      const ms = ws.map(() => 0), took = ws.map(() => 0);
      let cursor = 0;
      const consume = async (w, wi) => {
        while (cursor < chunks.length) {
          const rows = chunks[cursor++];
          // pack just this chunk; ~1KB per row, transferred not copied
          const px = new Uint8Array(rows.length * frame.w);
          rows.forEach((y, k) =>
            px.set(frame.gray.subarray(y * frame.w, (y + 1) * frame.w), k * frame.w)
          );
          const rep = await send(w, { type: "rows", w: frame.w, h: frame.h, ys: rows, px, opts: plain }, [px.buffer]);
          if (rep.err) throw new Error("detection worker: " + rep.err);
          ms[wi] += rep.ms ?? 0;
          took[wi]++;
          for (const r of rep.rows) out.push(r);
        }
      };
      // Workers only. Letting the main thread take chunks too was tried and
      // measured 13.8% SLOWER on a phone (39.8ms -> 45.3ms, 8 cores, 6
      // workers), because it takes a core away from a worker AND blocks the
      // replies those workers are trying to deliver. The 38% idle main thread
      // that suggested the idea was idle from WAITING, not from having nothing
      // to run on.
      await Promise.all(ws.map(consume));
      // Scan time per worker, and how many chunks each took. Unequal chunk
      // counts are the queue doing its job, not a fault; equal times with
      // unequal counts is what success looks like.
      api.lastWorkerMs = ms.map((m) => +m.toFixed(2));
      api.lastWorkerChunks = took;
      // Back into ascending y. clusterManRows is a forward scan over a
      // y-ordered stream, so returning arrival order would build different
      // clusters from the same hits -- the pool would not be wrong in any way
      // that shows up as an error, only in the answer.
      return out.sort((a, b) => a.y - b.y);
    }
  };

  // A cheap synthetic warm-up was tried here and did nothing: 256 rows of a
  // 96px pattern is 4k inner-loop iterations per worker, against the ~1.5M it
  // takes for the workers' reported time to fall 8.2ms -> 4.6ms. 375x short.
  // Sized to actually tier the code it costs about a second of worker time --
  // which is what poolAgreement already spends. There is no cheap warm-up:
  // either the workers do real work or they stay interpreted.
  return api;
};
const _p4hc5x = function _analyzeFrameManAsync(rotateFrame,mergeManAxes,manScanRows,scanRowsMan,clusterManRows) {return (async function analyzeFrameManAsync(frame, opts = {}) {
  // The same pipeline as analyzeFrameMan, with stage 1 allowed to happen
  // somewhere else. Pass opts.runRows (detectPool.runRows) and the row scan
  // goes to the worker pool; omit it and this is analyzeFrameMan with an
  // await in front, which is what makes "pool off" a real fallback rather
  // than a second code path.
  //
  // Stage 2 stays here. Clustering is where rows first see each other, and it
  // is cheap -- the cost is in the edge finding and the cascade, both of which
  // left the thread.
  const t0 = window.performance.now();
  if (opts.bothAxes) {
    const single = { ...opts, bothAxes: false };
    const rows = await analyzeFrameManAsync(frame, single);
    const rot = await analyzeFrameManAsync(rotateFrame(frame, 1), single);
    return { ...mergeManAxes(rows, rot, frame, opts), ms: window.performance.now() - t0 };
  }
  const ys = manScanRows(frame, opts);
  const rowResults = opts.runRows
    ? await opts.runRows(frame, ys, opts)
    : scanRowsMan(frame, ys, opts);
  const res = clusterManRows(rowResults, opts);
  return { ...res, rowsTried: ys.length, ms: window.performance.now() - t0 };
});};
const _1hgoegm = async function _poolAgreement(liveOn,detectPool,hexFrameBank,analyzeFrameMan,analyzeFrameManAsync) {
  // CORRECTNESS ONLY -- deliberately no timings here. This runs at boot, when
  // the page is busy computing everything else, and a stopwatch read under
  // that contention measures the boot, not the detector. Worse, it does not
  // measure both arms equally: the serial arm competes with the boot work on
  // this thread while the pool arm does not, so the ratio would move with how
  // loaded the page happens to be. Throughput is measured on demand instead
  // (poolBenchmark), when the page is idle and the number means something.
  //
  // What IS sound to check at any moment is agreement. Landmark centres must
  // match to 4dp -- not "close", identical: the workers execute the very same
  // serialised cells, so a disagreement is a real defect (a constant that
  // failed to serialise, a stale kernel, a lost row, rows delivered out of y
  // order), never floating-point drift, and that is true regardless of what
  // else the machine is doing.
  if (!detectPool) return { pool: 0, note: "pool off — nothing to compare" };
  // NOT while the camera is running. This pushes all 16 bank frames through
  // the very workers the live loop needs, and the live loop's frames queue
  // behind it: measured on a fresh pool, the first 17 frames took 28-47ms
  // wall while the workers reported only 7-10ms of actual work -- 25ms of
  // pure waiting, ending the instant this cell resolved. That is most of the
  // "starts slow, then gets fast" the rig is known for, and on a phone it
  // lasts proportionally longer. Turn the camera off and the check runs.
  if (liveOn)
    return { pool: detectPool.size, deferred: true,
      note: "deferred while the camera is live — it would queue ahead of the live frames. Turn the camera off to run it." };
  const key = (f) => `${f.id}@${f.xc.toFixed(4)},${f.yc.toFixed(4)}`;
  const rows = [];
  for (const spec of hexFrameBank) {
    const serial = analyzeFrameMan(spec.frame, {});
    const parallel = await analyzeFrameManAsync(spec.frame, { runRows: detectPool.runRows });
    rows.push({
      frame: spec.name,
      marks: serial.fused.length,
      poolMarks: parallel.fused.length,
      rowHits: serial.rowHits,
      poolRowHits: parallel.rowHits,
      identical:
        serial.fused.map(key).sort().join("|") === parallel.fused.map(key).sort().join("|")
    });
  }
  const bad = rows.filter((r) => !r.identical);
  return {
    pool: detectPool.size,
    frames: rows.length,
    allIdentical: bad.length === 0,
    disagreements: bad,
    rows
  };
};
const _fp9av3 = function _poolBenchGo(Inputs) {return (Inputs.button("measure pool throughput", { label: "benchmark" }));};
const _2jzm2c = (G, _) => G.input(_);
const _1ptv9em = async function _poolBenchmark(poolBenchGo,detectPool,hexFrameBank,analyzeFrameMan,analyzeFrameManAsync) {
  // On demand, not at boot. Inputs.button counts clicks and starts at 0, so
  // nothing is measured until asked -- see poolAgreement for why a throughput
  // number taken during boot would be a measurement of the boot.
  if (!poolBenchGo) return null;
  if (!detectPool) return { note: "pool off" };
  const reps = 5;
  // Median, with the spread reported next to it. Median rather than min
  // because min is the most flattering statistic available and this
  // comparison is not symmetric -- the main-thread arm loses time to anything
  // else running on this thread, the pool arm does not, so picking the
  // statistic picks the ratio. If min and median disagree much the machine was
  // busy and the run should be repeated rather than quietly reported.
  const bench = async (fn) => {
    await fn(); // untimed: the first pool job allocates each worker's frame buffer
    const ts = [];
    for (let i = 0; i < reps; i++) {
      const t0 = window.performance.now();
      await fn();
      ts.push(window.performance.now() - t0);
    }
    ts.sort((a, b) => a - b);
    return { med: +ts[reps >> 1].toFixed(1), min: +ts[0].toFixed(1), max: +ts[reps - 1].toFixed(1) };
  };
  const rows = [];
  for (const spec of hexFrameBank) {
    const serial = await bench(async () => analyzeFrameMan(spec.frame, {}));
    const parallel = await bench(() =>
      analyzeFrameManAsync(spec.frame, { runRows: detectPool.runRows })
    );
    rows.push({
      frame: spec.name,
      px: spec.frame.w + "x" + spec.frame.h,
      serialMs: serial.med,
      poolMs: parallel.med,
      speedup: +(serial.med / parallel.med).toFixed(2),
      fps: Math.round(1000 / parallel.med),
      // how much the five runs disagreed with each other, as a percentage of
      // the median: a noisy machine shows up here rather than in a wrong
      // headline number
      spread: +(Math.max(
        (serial.max - serial.min) / serial.med,
        (parallel.max - parallel.min) / parallel.med
      ) * 100).toFixed(0)
    });
  }
  const med = (xs) => xs.slice().sort((a, b) => a - b)[xs.length >> 1];
  return {
    workers: detectPool.size,
    serialMsMedian: med(rows.map((r) => r.serialMs)),
    poolMsMedian: med(rows.map((r) => r.poolMs)),
    speedupMedian: +med(rows.map((r) => r.speedup)).toFixed(2),
    worstSpreadPct: Math.max(...rows.map((r) => r.spread)),
    rows
  };
};
const _704z68 = function _poolReport(detectPool,poolAgreement,poolBenchmark,md) {
  const L = [];
  L.push(
    detectPool
      ? `${detectPool.size} worker(s) on ${navigator.hardwareConcurrency || "?"} logical cores`
      : "pool off — stage 1 runs on this thread"
  );
  if (poolAgreement && poolAgreement.deferred) L.push("agreement: " + poolAgreement.note);
  if (poolAgreement && poolAgreement.rows) {
    L.push(
      poolAgreement.allIdentical
        ? `agreement: all ${poolAgreement.frames} bank frames identical to 4dp, row hits equal worker-for-worker`
        : `DISAGREEMENT on ${poolAgreement.disagreements.length} frame(s): ` +
          poolAgreement.disagreements.map((d) => d.frame).join(", ")
    );
  }
  if (!poolBenchmark) L.push("throughput: press the button (not measured at boot — see poolAgreement)");
  else if (poolBenchmark.note) L.push("throughput: " + poolBenchmark.note);
  else {
    L.push(
      `throughput over ${poolBenchmark.rows.length} bank frames, median of 5:` +
      ` ${poolBenchmark.serialMsMedian}ms serial → ${poolBenchmark.poolMsMedian}ms pooled` +
      ` (${poolBenchmark.speedupMedian}x, ${Math.round(1000 / poolBenchmark.poolMsMedian)} fps)`
    );
    if (poolBenchmark.worstSpreadPct > 40)
      L.push(
        `run-to-run spread reached ${poolBenchmark.worstSpreadPct}% — the machine was busy,` +
        ` measure again before believing the ratio`
      );
  }
  if (detectPool && detectPool.lastWorkerMs.length)
    L.push(
      `last job, per worker: ${detectPool.lastWorkerMs.join(", ")}ms` +
      ` (slowest one is the frame's cost; the gap between it and their sum is the parallelism)`
    );
  return md`${L.map((s) => "- " + s).join("\n")}`;
};
const _1v692pi = function _pool_md(md) {return (md`## §4.5&nbsp; Off the main thread

Stage 1 is per-row pure, and that is worth something concrete: a scan row needs
its own pixels and nothing else, so the rows can be dealt to a set of workers
and the answers collected. Stage 2 is where rows first talk to each other, so
stage 2 stays here — it costs about 0.2ms against stage 1's 15 or 20, which is
why the seam is drawn where it is and not somewhere more ambitious.

**The worker is built from the cells above, not written out again.** The kernel
source is the live \`manLayout\`, \`edges1Dsub\`, \`findInvolution\`, \`solveMan\`,
\`manRowGroups\`, \`detectRowMan\` and \`scanRowsMan\`, serialised with
\`toString()\` and posted as a blob. Edit any of those cells and the next pool
build picks the edit up. A transcribed kernel would be a second implementation
of the detector to keep in step with this one, and it would be wrong within a
week.

Three details that are not obvious and were not free:

- **Rows are interleaved, not blocked.** Cost per row is wildly uneven — a row
  crossing three marks is worth a hundred crossing blank wall — so contiguous
  blocks hand one worker every mark and leave the rest idle.
- **Chunks are handed out on demand, not dealt up front.** Interleaving fixes
  uneven rows; it cannot fix uneven *cores*. A phone and a laptop both run a
  mix of performance and efficiency cores and the browser chooses: six warm
  workers given identical work here came back 8, 8, 8, 30, 30, 31ms, a clean
  4x in two groups. A static deal waits on the slow group every frame. A queue
  does not — a worker on a fast core simply comes back for more, and nobody
  needs to know which core they were given. \`detectPool.lastWorkerChunks\`
  shows it happening: unequal counts with equal times is what success looks
  like.
- **The replies are sorted back into ascending y.** Clustering is a forward
  scan over a y-ordered stream, so arrival order would build different clusters
  out of identical hits. That is the failure mode this design has to fear: not
  a crash, just a quietly different answer.

So the pool is held to the stronger of the two available bars. Not "close to"
the main thread — *identical*, to 4dp, on every frame in the bank, with row
hits equal worker for worker. The workers execute the very same serialised
functions, so a disagreement could only ever be a real defect: a constant that
failed to serialise, a stale kernel, a lost row, rows out of order. That check
runs at boot. Throughput does not, because a stopwatch read while the page is
still computing everything else measures the boot rather than the detector —
and it does not even measure both arms equally, since the main-thread arm
competes with that work and the pooled arm does not. Press the button when the
page is idle.

Measured here, 6 workers, the two arms interleaved frame by frame so drift in
machine load lands on both: **19ms → 8ms median over the 16 bank frames, 2.38x,
worst frame 31ms → 12ms.** Not 6x, and the per-worker times said why — with the
static deal a typical job read 3, 3, 3, 2, 3, 5ms, so one unlucky worker set the
frame's cost while the others waited.

The queue is what removes that tail, and it is worth being precise about how
much: on a machine whose cores are all alike it buys little, 11.5ms → 9.8ms
median with a run-to-run spread about a third of the difference. That is the
honest reading, because the case it exists for is the one that machine cannot
show. A pool split across performance and efficiency cores loses a factor of
four on the slow half, and there the difference is not a tail, it is the frame.

One more saving is on this thread rather than off it: the live loop converts
only the rows the scan is going to read. At stride 4 that is a quarter of the
frame, and the grayscale pass is main-thread work sitting in the middle of the
budget — the same argument that moved the scan into workers, applied one step
earlier. The rows nobody converted keep whatever the previous frame left there,
so the two callers that need the whole image — the transposed pass, and a
captured case, which gets replayed at other strides — ask for a full pass
explicitly.

The fallback is the same code. \`analyzeFrameManAsync\` without a \`runRows\` is
\`analyzeFrameMan\` with an await in front, so setting the worker count to 0 is
a real fallback and not a second implementation that drifts.`);};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };
  const fileAttachments = new Map(["frame-man-phone.png","hexframe-1.png","hexframe-2.png","hexframe-3.png","hexframe-4.png","hexframe-5.png","hexframe-6.png","hexframe-7.png","hexframe-8.png","hexframe-9.png","hexframe-10.png","hexframe-11.png","hexframe-12.png","hexframe-13.png","hexframe-14.png","hexframe-15.png","hexframe-16.png","hexframes.json"].map((name) => {
    const module_name = "@tomlarkworthy/coded-landmark-tracking";
    const {status, mime, bytes} = window.lopecode.contentSync(module_name + "/" + encodeURIComponent(name));
    const blob_url = URL.createObjectURL(new Blob([bytes], { type: mime}));
    return [name, {url: blob_url, mimeType: mime}]
  }));
  main.builtin("FileAttachment", runtime.fileAttachments(name => fileAttachments.get(name)));

  $def("_ebocnh", "headline_md", ["md"], _ebocnh);  
  $def("_1h5er0z", "hexRig_md", ["md"], _1h5er0z);  
  $def("_1ve7ka5", "viewof liveOn", ["Inputs"], _1ve7ka5);  
  $def("_1keow27", "liveOn", ["Generators","viewof liveOn"], _1keow27);  
  $def("_1kn5g73", "viewof liveFacing", ["Inputs"], _1kn5g73);  
  $def("_1ncd6hs", "liveFacing", ["Generators","viewof liveFacing"], _1ncd6hs);  
  $def("_xdtu1n", "liveStream", ["liveOn","liveFacing","invalidation"], _xdtu1n);  
  $def("_1sh7vi3", "liveVideo", ["htl","liveStream","invalidation"], _1sh7vi3);  
  $def("_ktbd9n", "viewof hexRigCfg", ["Inputs"], _ktbd9n);  
  $def("_1pvjep3", "hexRigCfg", ["Generators","viewof hexRigCfg"], _1pvjep3);  
  $def("_1di846o", "hexRigView", ["htl"], _1di846o);
  $def("_lumcap0", "lumaCapture", [], _lumcap0);  
  $def("_1lt19nm", "hexRigOpts", ["hexRigCfg","manLayout"], _1lt19nm);  
  $def("_gwo9xk", "hexRigLoo", ["hexTarget","fitHomography"], _gwo9xk);  
  $def("_1epdu7f", "hexRigScore", [], _1epdu7f);  
  $def("_q7egru", "viewof hexRigCases", ["Inputs"], _q7egru);  
  $def("_cih7ns", "hexRigCases", ["Generators","viewof hexRigCases"], _cih7ns);  
  $def("_1bfhbxi", "hexRig", ["hexRigView","viewof hexRigCases","liveOn","liveVideo","hexRigCfg","analyzeFrameMan","analyzeFrameManAsync","detectPool","hexRigOpts","fitHexPose","hexRigLoo","manScanRows","lumaCapture"], _1bfhbxi);  
  $def("_136sicf", "hexRigCasePanel", ["hexRigCases","htl"], _136sicf);  
  $def("_18kb3j3", "hexRigAutosave", ["viewof hexRigCases","htl","invalidation"], _18kb3j3);  
  $def("_js23sh", "hexTarget_md", ["md","tex"], _js23sh);  
  $def("_5xkwav", "makeHexTarget", ["manLayout"], _5xkwav);  
  $def("_5gg2ic", "hexTarget", ["makeHexTarget"], _5gg2ic);  
  $def("_q8nv1h", "hexTargetSvg", ["hexTarget","manColor"], _q8nv1h);  
  $def("_xt3mg6", "hexPrintPanel", ["hexTargetSvg","hexTarget","htl"], _xt3mg6);  
  $def("_13k4hcg", "hexPrintCheck", ["hexTarget","hexTargetSvg","analyzeFrameMan","fitHexPose"], _13k4hcg);  
  $def("_1p7i4wb", "manPrint_md", ["md"], _1p7i4wb);  
  $def("_19a2bc6", "manMarkSvgSource", ["manLayout","manColor"], _19a2bc6);  
  $def("_snxhn8", "manPrintPanel", ["manDemoCfg","manMarkSvgSource","manLayout","manColor","htl"], _snxhn8);  
  $def("_nb1x", "eval_md", ["md"], _nb1x);  
  $def("_1r6cx83", "testFrameFiles", ["FileAttachment"], _1r6cx83);  
  $def("_1ffq68r", "hexBank_md", ["md"], _1ffq68r);  
  $def("_qcfx2y", "hexFrames", ["testFrameFiles"], _qcfx2y);  
  $def("_bw7jit", "hexFrameBank", ["hexFrames","testFrameFiles"], _bw7jit);  
  $def("_1i43fis", "hexFrameReport", ["hexFrameBank","analyzeFrameMan","fitHexPose","htl"], _1i43fis);  
  $def("_tivpeh", "manTestBank_md", ["md"], _tivpeh);  
  $def("_rp63e7", "manFrames", [], _rp63e7);  
  $def("_1g7o2un", "manFrameBank", ["manFrames","testFrameFiles"], _1g7o2un);  
  $def("_nuw7s5", "manFrameResults", ["manFrameBank","rotateFrame","analyzeFrameMan","unrotatePoint"], _nuw7s5);  
  $def("_yy59on", "manFrameReport", ["htl","manFrameResults"], _yy59on);  
  $def("_nb2x", "sweep_md", ["md"], _nb2x);  
  $def("_16hxrfy", "viewof hexRigSweepGo", ["Inputs"], _16hxrfy);  
  $def("_5e077b", "hexRigSweepGo", ["Generators","viewof hexRigSweepGo"], _5e077b);  
  $def("_15xffv4", "hexRigSynthCases", ["hexTarget","renderHexScene","analyzeFrameMan","fitHexPose","hexRigLoo"], _15xffv4);  
  $def("_zoue8d", "hexRigSweep", ["hexRigSweepGo","hexRigCases","hexRigSynthCases","hexRigCfg","hexRigOpts","analyzeFrameMan","hexRigScore"], _zoue8d);  
  $def("_a0ribc", "hexRigSelfTest", ["hexRigSynthCases","hexRigScore","analyzeFrameMan"], _a0ribc);  
  $def("_1fdcn6e", "renderHexScene", ["hexTarget","manColor"], _1fdcn6e);  
  $def("_1kgvsyz", "hexRendererCheck", ["manLayout","renderManFrame","analyzeFrameMan","makeHexTarget","renderHexScene"], _1kgvsyz);  
  $def("_1au9ya6", "hexPitchSweep", ["makeHexTarget","renderHexScene","analyzeFrameMan","fitHexPose"], _1au9ya6);  
  $def("_nb3x", "algo_md", ["md","tex"], _nb3x);  
  $def("_1566rx9", "redesign_md", ["md","tex"], _1566rx9);  
  $def("_1jghxt5", "manLayout", [], _1jghxt5);  
  $def("_12dy4hh", "manColor", ["manLayout"], _12dy4hh);  
  $def("_4krul3", "renderManFrame", ["manLayout","manColor"], _4krul3);  
  $def("_og7api", "viewof manDemoCfg", ["Inputs"], _og7api);  
  $def("_1ewr3en", "manDemoCfg", ["Generators","viewof manDemoCfg"], _1ewr3en);  
  $def("_1tn1oj8", "manDemo", ["manDemoCfg","manLayout","renderManFrame","detectFrameMan"], _1tn1oj8);  
  $def("_ujkuco", "manScene", ["manLayout","renderManFrame"], _ujkuco);  
  $def("_nb4x", "row_md", ["md"], _nb4x);  
  $def("_1gmmbqf", "edges1Dsub", [], _1gmmbqf);  
  $def("_gg8jqp", "findInvolution", [], _gg8jqp);  
  $def("_1mszvx0", "solveMan", ["manLayout"], _1mszvx0);  
  $def("_w574fm", "manRowGroups", ["manLayout"], _w574fm);  
  $def("_rvt6ru", "detectRowMan", ["manLayout","manRowGroups","findInvolution","solveMan"], _rvt6ru);  
  $def("_1mnpthu", "detectFrameMan", ["manLayout","edges1Dsub","findInvolution","solveMan"], _1mnpthu);  
  $def("_4liiby", "cascade_md", ["md"], _4liiby);  
  $def("_10in6wk", "manScanRows", [], _10in6wk);  
  $def("_30gfrc", "scanRowsMan", ["edges1Dsub","detectRowMan"], _30gfrc);  
  $def("_ezke5v", "clusterManRows", ["manLayout","fitManPose"], _ezke5v);  
  $def("_1jt47m8", "analyzeFrameMan", ["rotateFrame","mergeManAxes","manScanRows","clusterManRows","scanRowsMan"], _1jt47m8);  
  $def("_138kml", "fitManPose", ["manLayout"], _138kml);  
  $def("_1xa2cta", "manSceneTest", ["manScene","analyzeFrameMan"], _1xa2cta);  
  $def("_11vsmkp", "axes_md", ["md"], _11vsmkp);  
  $def("_zghole", "rotateFrame", [], _zghole);  
  $def("_rtuzun", "unrotatePoint", [], _rtuzun);  
  $def("_1m3an4z", "mergeManAxes", ["unrotatePoint"], _1m3an4z);  
  $def("_9mkcus", "manAxesTest", ["manScene","analyzeFrameMan","rotateFrame","unrotatePoint"], _9mkcus);  
  $def("_1az419w", "viewof grabPanel", ["liveVideo"], _1az419w);  
  $def("_qag4z6", "grabPanel", ["Generators","viewof grabPanel"], _qag4z6);  
  $def("_nb5x", "plane_md", ["md"], _nb5x);  
  $def("_9ey4fu", "fitHomography", [], _9ey4fu);  
  $def("_1qa5emd", "fitHexPose", ["hexTarget","fitHomography"], _1qa5emd);  
  $def("_1v692pi", "pool_md", ["md"], _1v692pi);
  $def("_13ae255", "detectKernelSource", ["manLayout","edges1Dsub","findInvolution","solveMan","manRowGroups","detectRowMan","scanRowsMan"], _13ae255);  
  $def("_10l0bax", "viewof poolSize", ["Inputs"], _10l0bax);  
  $def("_1xat3lz", "poolSize", ["Generators","viewof poolSize"], _1xat3lz);  
  $def("_l7r79y", "detectPool", ["poolSize","detectKernelSource","invalidation"], _l7r79y);
  $def("_p4hc5x", "analyzeFrameManAsync", ["rotateFrame","mergeManAxes","manScanRows","scanRowsMan","clusterManRows"], _p4hc5x);  
  $def("_1hgoegm", "poolAgreement", ["liveOn","detectPool","hexFrameBank","analyzeFrameMan","analyzeFrameManAsync"], _1hgoegm);
  $def("_fp9av3", "viewof poolBenchGo", ["Inputs"], _fp9av3);  
  $def("_2jzm2c", "poolBenchGo", ["Generators","viewof poolBenchGo"], _2jzm2c);  
  $def("_1ptv9em", "poolBenchmark", ["poolBenchGo","detectPool","hexFrameBank","analyzeFrameMan","analyzeFrameManAsync"], _1ptv9em);  
  $def("_704z68", "poolReport", ["detectPool","poolAgreement","poolBenchmark","md"], _704z68);  
  $def("_nb6x", "next_md", ["md"], _nb6x);  
  return main;
}
