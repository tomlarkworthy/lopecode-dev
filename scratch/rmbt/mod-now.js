const _ebocnh = function _anonymous(md) {return (md`# Fast Multi-Target Circular Barcode Pose Tracking`);};
const _toc = function _toc(sectionIndex, htl) {
  const items = [...sectionIndex.values()].map((s) => htl.html`<li style="
      margin:0; padding:1px 0; list-style:none;
      padding-left:${(s.level - 2) * 1.2}em;
      font-weight:${s.level === 2 ? 600 : 400};
      opacity:${s.level > 3 ? 0.75 : 1};
    "><a href="#sec-${s.key}" style="text-decoration:none" onclick=${(ev) => {
      ev.preventDefault();
      const el = document.getElementById(`sec-${s.key}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }}>${s.num === null ? "" : `§${s.num}  `}${s.title}</a></li>`);
  return htl.html`<nav style="
    border:1px solid rgba(128,128,128,0.35); border-radius:6px;
    padding:10px 14px; margin:8px 0; font-size:14px; line-height:1.45;
    columns:2; column-gap:28px;
  "><ul style="margin:0; padding:0">${items}</ul></nav>`;
};
const _sec_scanner = function _anonymous(sec) {return (sec("scanner"));};
const _0d8v3u6 = function _anonymous(md,sec) {return (md`${sec('about')}

Part V of a super long \\[[1](https://www.youtube.com/watch?app=desktop&v=Y1KQNuUBxAk&t=93s)\\] and infrequently worked on project for fast optical localization. In this installation I added

* Detect multiple circular barcodes in the scene
* Decode them so each has an unambiguous code for matching
* Compile into WASM via AssemblyScript for fast performance
* Use Web Workers for parallelism
* Fuse multiple barcodes to get a pose

Less than 2ms per frame on Macbook, 16ms on phone 🤙 which is complete overkill for the browser as both max out at 30f.p.s. for webcams, however, the long term aim is for hardware.

There are lots of optical tracking system, including circular barcodes. The unique thing about this one is the design around single scan lines, so barcodes can be recognized with appropriate hardware as pixels leave the camera's MPI. This is potentially hundreds of times faster than the frames per second rating of a camera. `);};
const _ns9hhpe = function _anonymous(md,ref) {return (md`This lets you run the barcode matcher a few ways

* wave your mobile displaying the ${ref("multi", "pattern")} infront of your webcam on a laptop running this notebook
* print out the ${ref("multi", "pattern")} on paper and track with this notebook on your mobile
* connect Claude Code to the notebook live on your Laptop and let it drive and take measurements (also \`/remote-control\` from Claude Code from mobile)
* download the notebook as a single file and let Claude Code choose how to edit and run it`);};
const _tastr = async function _hexTaster(whenVisible,invalidation,hexFrameBank,analyzeFrameMan,fitHexPose,hexOverlay,ref,htl) {
  // One photograph, read by the shipping cascade, before the reader is asked to
  // point a camera at anything. The rig below needs a webcam and a printout; this
  // needs neither, and it is the same detector.
  //
  // The frame is chosen by NAME and never by index. The rest of the bank is
  // photographs of other people, and a reorder must not be able to put one of them
  // at the top of the page.
  await whenVisible("hexTaster", invalidation);
  const b = hexFrameBank.find((f) => /-04$/.test(f.name));
  if (!b) return htl.html`<div style="font:12px ui-monospace,monospace;color:#c96a6a">taster frame not in the bank</div>`;
  const t0 = window.performance.now();
  const res = analyzeFrameMan({ gray: b.frame.gray, w: b.frame.w, h: b.frame.h }, { stride: 4 });
  const pose = fitHexPose({ ...res, w: b.frame.w, h: b.frame.h });
  const ms = window.performance.now() - t0;

  const overlay = htl.svg`<svg viewBox="0 0 ${b.frame.w} ${b.frame.h}"
    style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none"></svg>`;
  overlay.innerHTML = hexOverlay.parts(pose, res);

  return htl.html`<figure style="margin:12px 0;max-width:520px">
    <div style="position:relative;background:#1b1b1b;border-radius:4px;overflow:hidden">
      <img src=${b.url} style="display:block;width:100%;height:auto">${overlay}
    </div>
    <figcaption style="font:11px/1.5 ui-monospace,monospace;color:var(--theme-foreground-muted,#888);margin-top:4px">
      ${b.name}, ${b.frame.w}×${b.frame.h}, read here in <b>${ms.toFixed(0)}ms</b> at stride 4:
      ${pose.ok ? `${pose.counts.read} of 7 marks decoded` : "no plane"}${
        pose.ok && pose.offTarget.length ? `, ${pose.offTarget.length} off-target` : ""}.
      Solid rings carry an id, dashed located but did not decode. The whole bank, and what the
      settings above cost it, is ${ref("eval")}.
    </figcaption>
  </figure>`;
};
const _1ve7ka5 = function _liveOn(Inputs) {return (Inputs.toggle({ label: "live camera", value: false }));};
const _1keow27 = (G, _) => G.input(_);
const _1di846o = function _hexRigView(htl) {
  // The rig draws into its OWN canvas rather than laying an overlay over
  // liveVideo. A DOM node lives in one place at a time, so borrowing the video
  // element would take it out of The Scanner's view; and the rig wants the frame it
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
  // resolution: the working width has to equal the width the camera's frames
  // ARRIVE at for the zero-copy capture path to engage, so any value
  // under that buys a smaller image at the price of a ~20ms/frame RGBA readback
  // -- a net loss on a phone. Cost tracks locked rows, not pixels.
  //
  // The top is 1920, not the 1280 the camera is requested at, because the two
  // are not the same number. A track constrained to 1280 can still deliver
  // 1440x1080 frames and let the browser scale them down for display, and the
  // rig sizes itself to what arrives.
  maxWidth: Inputs.range([480, 1920], { step: 160, value: 1920, label: "working width (px)" }),
  // The odd one out: not a threshold to tune but a second scan of the same
  // frame, down the columns instead of across the rows (§4.3). The row scan
  // MEASURES a centre's x while only extrapolating its y, so the column scan
  // supplies the coordinate the row scan guessed.
  //
  // On by default (§4.3). It used to halve the frame rate, which is why it was
  // not; the two passes now run concurrently across the worker pool and cost
  // ~26ms against a 33.3ms budget on the phone, inside the 30fps camera cap.
  // It finds 4 more marks across the bank with no false positives, and now
  // that the merge fuses by decode margin it no longer costs placement to get
  // them.
  bothAxes: Inputs.toggle({ label: "scan both axes", value: true })
}));};
const _1pvjep3 = (G, _) => G.input(_);
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
    // capture path needs the working width to EQUAL the camera width
    // (VideoFrame.copyTo crops, it cannot scale). Overshoot here costs ~20ms a
    // frame there.
    const s = await window.navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 1280, max: 1280 },
        height: { ideal: 960, max: 1280 },
        facingMode: liveFacing
      }
    });
    // Hold the screen awake for as long as the camera is on, and no longer.
    // Tracking is minutes of not touching the phone, and Android then blanks
    // the screen -- which hides the tab, and a hidden tab fires no rAF, so the
    // rig stops dead. Tying it to the stream rather than to a toggle of its own
    // means an idle notebook can never pin someone's display on.
    let lock = null, done = false;
    const hold = async () => {
      // request() rejects outright while the page is not visible, so this has
      // to be retried on visibilitychange rather than attempted once here.
      if (done || lock || !window.navigator.wakeLock) return;
      if (window.document.visibilityState !== "visible") return;
      try {
        lock = await window.navigator.wakeLock.request("screen");
        // The UA drops the lock every time the page hides and does NOT restore
        // it on return; clearing the handle is what lets onVisible re-take it.
        lock.addEventListener("release", () => { lock = null; });
      } catch (e) {
        lock = null; // a refusal must never take the camera down with it
      }
    };
    const onVisible = () => { if (window.document.visibilityState === "visible") hold(); };
    window.document.addEventListener("visibilitychange", onVisible);
    hold();
    invalidation.then(() => {
      done = true;
      window.document.removeEventListener("visibilitychange", onVisible);
      if (lock) lock.release().catch(() => {});
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
  // of the thing you are scoring. Here the labels are frozen -- measured once,
  // offline, by the §4.7 relabelling pass at twelve directions and stride 1 with
  // ring-lattice refinement -- and every replay at every setting is scored
  // against those same seven positions.
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

    // What copyTo will ACTUALLY deliver, which is not what the video element
    // reports. `videoWidth` is the DISPLAY size, after any scaling the browser
    // applied to satisfy the track constraints; `visibleRect` is the frame the
    // camera really hands over. On a 1920x1080 sensor centre-cropped to 4:3
    // they read 1280x960 and 1440x1080 -- and since copyTo crops rather than
    // scales, a caller sizing itself from the element analyses the top-left
    // 1280x960 of a 1440x1080 image while showing the whole thing scaled: an
    // overlay wrong by 1440/1280 everywhere, growing with distance from the
    // origin. Ask the frame, once per size change, and size to its answer.
    probe: (video) => {
      if (typeof window.VideoFrame !== "function" || !video || !video.videoWidth) return null;
      let f = null;
      try {
        f = new window.VideoFrame(video);
        const fmt = f.format || "";
        const r = f.visibleRect;
        return {
          w: r ? r.width : f.codedWidth,
          h: r ? r.height : f.codedHeight,
          format: fmt,
          luma: LUMA_FIRST.test(fmt)
        };
      } catch (e) {
        return null;
      } finally {
        if (f) try { f.close(); } catch (e2) {}
      }
    },

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
      // caller asking for anything but the size the frame arrives at gets the
      // slow one. That test has to be made against the FRAME, not the video
      // element: the element reports the display size, which the browser may
      // have scaled down from what copyTo delivers, and a mismatch there is
      // invisible -- the repack loop reads the extra width as stride padding
      // and silently analyses a crop. See `probe`.
      if (typeof window.VideoFrame === "function" && api.path !== "getimagedata-forced") {
        let frame = null;
        try {
          frame = new window.VideoFrame(video);
          const fmt = frame.format || "";
          const vr = frame.visibleRect;
          const fw = vr ? vr.width : frame.codedWidth;
          const fh = vr ? vr.height : frame.codedHeight;
          if (!LUMA_FIRST.test(fmt)) {
            api.why = `format ${fmt} has no luma plane`;
            frame.close();
          } else if (fw !== W || fh !== H) {
            api.why = `frame requested at ${W}x${H}, copyTo delivers ${fw}x${fh}`;
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
const _1bfhbxi = async function* _hexRig(hexRigView,$0,liveOn,liveVideo,hexRigCfg,analyzeFrameMan,analyzeFrameManAsync,detectPool,hexRigOpts,fitHexPose,hexRigLoo,manScanRows,lumaCapture) {
  // The calibration rig. Point the camera at the printed hexTargetSvg sheet and it
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
    view.hud.textContent = "camera off — turn it on in The Scanner, at the top";
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
  // Probing builds and closes a VideoFrame, so do it only when the element's
  // own dimensions move -- a camera does not change what it delivers without
  // changing those too. But the first frames of a track can refuse to make a
  // VideoFrame at all, and caching that null pinned the rig to the fallback
  // path for the whole session while `probe` answered correctly the moment
  // anyone asked it by hand. So a failed probe is not an answer: retry until
  // one succeeds, bounded so a camera that can never do it stops paying.
  let probed = null, probedFor = { w: 0, h: 0 }, probeLeft = 0;
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
    // Size to the frame the camera DELIVERS, not to the one the element
    // displays. Those differ whenever the browser scales a track to satisfy a
    // constraint -- a 1920x1080 sensor cropped to 4:3 and constrained to 1280
    // hands copyTo a 1440x1080 frame while `videoWidth` reads 1280. Sizing
    // from the element there put the analysis in a different coordinate space
    // from the canvas beside it: the fast path crops rather than scales, so
    // the detector saw the top-left 1280x960 of the frame, the canvas showed
    // all of it shrunk, and every overlay landed 1440/1280 out. Adopting the
    // delivered size keeps both the fast path and one coordinate space.
    // Above maxWidth we fall back to the display size, which loses the fast
    // path -- lumaCapture says so through `why` -- but stays consistent.
    if (v.videoWidth !== probedFor.w || v.videoHeight !== probedFor.h) {
      probedFor = { w: v.videoWidth, h: v.videoHeight };
      probed = null;
      probeLeft = 60;
    }
    if (!probed && probeLeft > 0) {
      probed = luma.probe(v);
      if (!probed) probeLeft--;
    }
    const srcW = probed && probed.luma && probed.w <= hexRigCfg.maxWidth ? probed.w : v.videoWidth;
    const srcH = probed && probed.luma && probed.w <= hexRigCfg.maxWidth ? probed.h : v.videoHeight;
    const tw = Math.min(hexRigCfg.maxWidth, srcW);
    const th = Math.round((srcH * tw) / srcW);
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
const _sec_mark = function _anonymous(sec) {return (sec("mark"));};
const _ro0bjp = function _barcodeId(Inputs) {return (Inputs.range([0, 63], { step: 1, value: 45, label: "id (6 bits)" }));};
const _baxx27 = (G, _) => G.input(_);
const _phlah3 = function _barcodeDemo(manLayout,barcodeId,manMarkSvgSource,htl,manColor) {
  const L = manLayout;
  const bits = Array.from({ length: L.nBits }, (_, j) => (barcodeId >> (L.nBits - 1 - j)) & 1);

  const svg = manMarkSvgSource(barcodeId, { diameterMm: 60, label: false });
  const img = htl.html`<img src=${"data:image/svg+xml;utf8," + window.encodeURIComponent(svg)}
    style="width:190px;height:190px;display:block;border-radius:4px">`;
  // labelled variant for print: the same mark hexTargetSvg's A4 page lays out
  const printSvg = manMarkSvgSource(barcodeId, { diameterMm: 60 });
  const printHref = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(printSvg);

  // manColor is piecewise constant between teeth, so one band per tooth
  // interval is exact -- this strip IS the radial profile, not a sampling of it.
  const W = 520, H = 46, R = L.R;
  const x = (r) => (r / R) * W;
  const bounds = [0, ...L.teeth];
  const bands = [];
  for (let i = 1; i < bounds.length; i++) {
    const g = manColor((bounds[i - 1] + bounds[i]) / 2, bits, L);
    bands.push(`<rect x="${x(bounds[i - 1]).toFixed(2)}" y="0" width="${(x(bounds[i]) - x(bounds[i - 1])).toFixed(2)}" height="${H}" fill="rgb(${g},${g},${g})"/>`);
  }

  // Which edges exist for THIS payload: ask manColor either side of each tooth
  // rather than re-deriving the rule and risking disagreeing with the renderer.
  const eps = 1e-3;
  const ticks = [];
  let nMid = 0, nBoundary = 0;
  for (let m = 0; m <= L.nT; m++) {
    const r = L.teeth[m];
    const here = manColor(r - eps, bits, L) !== manColor(r + eps, bits, L);
    const mid = L.guaranteed.indexOf(m) >= 0;
    if (here && mid) nMid++;
    if (here && !mid) nBoundary++;
    if (!here) continue;
    ticks.push(`<rect x="${(x(r) - 1).toFixed(2)}" y="${H}" width="2" height="9" fill="${mid ? "#4ade80" : "#facc15"}"/>`);
  }

  const strip = htl.html`<div style="max-width:520px"></div>`;
  strip.innerHTML = `<svg viewBox="0 0 ${W} ${H + 9}" style="width:100%;display:block">${bands.join("")}${ticks.join("")}</svg>`;

  const key = (c, t) => htl.html`<span style="display:inline-flex;align-items:center;gap:5px;margin-right:14px">
    <span style="width:9px;height:9px;background:${c};display:inline-block;border-radius:1px"></span>${t}</span>`;

  return htl.html`<div style="display:flex;gap:20px;flex-wrap:wrap;align-items:flex-start;margin:8px 0">
    <div>
      ${img}
      <div style="font:12px ui-monospace,monospace;padding:4px 0">
        <a href=${printHref} download=${`man-${barcodeId}-60mm.svg`}>download man ${barcodeId} (60mm)</a>
      </div>
    </div>
    <div style="flex:1;min-width:300px">
      <div style="font:12px ui-monospace,monospace;color:var(--theme-foreground-muted,#888);margin-bottom:4px">
        radius →&nbsp; centre to rim
      </div>
      ${strip}
      <div style="font:12px ui-monospace,monospace;margin-top:8px">
        id ${barcodeId} &nbsp;=&nbsp; bits <b>${bits.join("")}</b>
      </div>
      <div style="font:12px ui-monospace,monospace;margin-top:6px">
        ${key("#4ade80", `${nMid} mid edges — one per cell, always`)}${key("#facc15", `${nBoundary} cell boundaries`)}
      </div>
      <div style="font:12px ui-monospace,monospace;margin-top:4px;color:var(--theme-foreground-muted,#888)">
        ${nMid + nBoundary} edges to position against on this scan line
      </div>
    </div>
  </div>`;
};
const _1duxrlh = function _anonymous(md) {return (md`A circular barcode is a set of concentric rings. With Manchester Encoding of 6 bits, every bit has at least one intensity change (an edge). These edges can help position the barcode ion a scan line and also double as a digital label.`);};
const _sec_multi = function _anonymous(sec) {return (sec("multi"));};
const _js23sh = function _hexTarget_md(md) {return (md`If the layout of the barcodes is known, their combination gives a homography estimate. There is no matching ambiguity because the barcodes label themselves. `);};
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
const _q8nv1h = function _hexTargetSvg(hexTarget,manColor,manPageLevel) {return (function hexTargetSvg(opts = {}) {
  // The calibration target as one A4 page, mm-sized, same print conventions as
  // manMarkSvgSource: white page, each mark nested full discs drawn outside-in.
  // Page level comes from manPageLevel -- see manMarkSvgSource for the
  // measurement behind white, and for what is still unvalidated.
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
  // Default from manPageLevel so the printed sheet and the synthetic benches
  // cannot drift apart.
  const g = manPageLevel.toString(16).padStart(2, "0");
  const pageFill = opts.pageFill ?? `#${g}${g}${g}`;
  const flooded = pageFill.toLowerCase() !== "#ffffff" && pageFill.toLowerCase() !== "#fff";
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
    `<text x="${cx0}" y="${legendY + 28 + rows.length * 4.4 + 5}" font-family="monospace" font-size="3.2" fill="#4a4a4a" text-anchor="middle">millimetres from the centre mark, +y up.${flooded ? " The gray is part of the pattern &#8212; do not trim." : ""}</text>`
  );
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${pageW}mm" height="${pageH}mm" viewBox="0 0 ${pageW} ${pageH}">
<rect width="${pageW}" height="${pageH}" fill="${pageFill}"/>
${parts.join("\n")}
${legend.join("\n")}
</svg>`;
});};
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
const _sec_eval = function _anonymous(sec) {return (sec("eval"));};
const _sec_labels = function _anonymous(sec) {return (sec("labels"));};
const _vlfyqr = function _anonymous(md,ref) {return (md`Each banked frame is labelled with the correct mark centers, and ${ref('score')} scores the fast detector against them. The correct centers were determined with a much more expensive algorithm, concentric ring matching under perspective, and eye balled for correctness of fit, see ${ref('relabel')}.`);};
const _sec_nearmiss = function _anonymous(sec) {return (sec("nearmiss"));};
const _1ffq68r = function _anonymous(md) {return (md`The banked frame was captured by the rig's auto capture, looking for hard cases where some of the marks were correct but not all. Taken in a few different cluttered environments, including barcode-like features such as venetian blinds and railings.`);};
const _hxovl = function _hexOverlay() {
  // The detection overlay, in one place. Lifted verbatim out of hexFrameReport on
  // 2026-08-10 when the taster at the top needed the same picture: two copies of
  // this would drift, and a taster that draws a mark differently from the report
  // below it is worse than no taster.
  const COL = {
    read: "#2fe08a", located: "#ffd23f", missing: "#ff5c5c",
    misplaced: "#ff9f1c", off: "#d264ff"
  };
  // Returns SVG source, not nodes -- the caller sets innerHTML, because htl would
  // escape a string built as markup.
  const parts = (pose, res) => {
      const parts = [];
      if (pose.ok) {
        for (const m of pose.marks) {
          const c = COL[m.state];
          const r = m.radiusPx;
          const dash = m.state === "read" ? "none" : m.state === "located" ? "7 5" : "2 6";
          // Same shape the rig draws: the projected circle, not a circle. On a
          // tilted sheet the two differ by the tilt, and a ring that does not sit
          // on its mark reads as a tracking error rather than as a drawing one.
          const top = m.outline ? Math.min(...m.outline.map((p) => p[1])) : m.predicted.y - r;
          const shape = m.outline
            ? `<polygon points="${m.outline.map((p) => p[0] + "," + p[1]).join(" ")}"`
            : `<circle cx="${m.predicted.x}" cy="${m.predicted.y}" r="${r.toFixed(1)}"`;
          parts.push(
            `${shape} fill="none" stroke="${c}"
              stroke-width="${m.state === "read" ? 3 : 2}" stroke-dasharray="${dash}"/>` +
            `<text x="${m.predicted.x}" y="${(top - 6).toFixed(1)}"
              font-family="ui-monospace,monospace" font-size="${Math.max(28, r * 0.5).toFixed(0)}"
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
      } else {
        // No homography here, but fitManPose measured both semi-axes -- a along
        // the scan, b across it -- so an axis-aligned ellipse is still closer to
        // the mark than a circle of a.
        for (const f of res.fused) {
          const ra = f.a ?? f.wHalf ?? 24;
          parts.push(
            `<ellipse cx="${f.xc.toFixed(1)}" cy="${f.yc.toFixed(1)}"
              rx="${ra.toFixed(1)}" ry="${(f.b ?? ra).toFixed(1)}"
              fill="none" stroke="#8fa" stroke-width="3"/>`
          );
        }
      }

    return parts.join("");
  };
  return { COL, parts };
};
const _1i43fis = async function _hexFrameReport(whenVisible,invalidation,hexFrameBank,analyzeFrameMan,fitHexPose,hexOverlay,htl) {
  // Replay every banked frame through the shipping cascade and show what it
  // makes of each one. No pass/fail bars: this bank grows as more conditions get
  // photographed, and a bar per frame would mean setting one by hand on every
  // arrival and going red on the first genuinely hard capture. The rendered
  // rendered scenes and the mirror bank in §3 are where the tripwires live; this
  // is where the ground truth about REAL optics lives, and its job is to be
  // looked at.
  // Seconds of work that nothing above it reads: hold it until the cell is on screen.
  await whenVisible("hexFrameReport", invalidation);
  const COL = hexOverlay.COL;
  const cards = [];
  let nowRead = 0, thenRead = 0, marks = 0, spurious = 0;

  for (const b of hexFrameBank) {
    const t0 = window.performance.now();
    const res = analyzeFrameMan({ gray: b.frame.gray, w: b.frame.w, h: b.frame.h }, { stride: 4 });
    const pose = fitHexPose({ ...res, w: b.frame.w, h: b.frame.h });
    const ms = window.performance.now() - t0;

    // One copy of the drawing, shared with the taster at the top: hexOverlay.parts.
    const parts = hexOverlay.parts(pose, res);
    if (pose.ok) {
      nowRead += pose.counts.read;
      spurious += pose.offTarget.length;
    }
    // Why a bad frame is bad, measured on the frame rather than asserted about it.
    // "missing" means missing FROM THE PREDICTION, and with four detections the
    // prediction is an extrapolation off an exactly-determined homography -- so
    // this asks the two questions the count cannot: how far the prediction landed
    // from the recorded label, and whether a posed-but-unread cluster is sitting
    // at the label anyway.
    //
    // hexcase-5ivq-06 is the frame that prompted it (2026-08-10): 4 of 7 read, the
    // other three predicted 149/160/189px from their labels at radii 6/6/35px
    // against a true 34/38/39 -- and mark 51 had a 15-row posed cluster 1px from
    // its label the whole time. It fires on 7 of the 16 frames.
    let diag = "";
    if (pose.ok && pose.counts.missing) {
      const truthById = new Map((b.truth ?? []).map((t) => [t.id, t]));
      const lines = [];
      for (const m of pose.marks) {
        if (m.state !== "missing") continue;
        const t = truthById.get(m.id);
        if (!t) continue;
        const off = Math.hypot(m.predicted.x - t.x, m.predicted.y - t.y);
        let near = null;
        for (const u of res.unidentified) {
          const d = Math.hypot(u.xc - t.x, u.yc - t.y);
          if (!near || d < near.d) near = { d, u };
        }
        lines.push(
          `${m.id}: predicted ${off.toFixed(0)}px from its label` +
            (near && near.d < (t.radiusPx ?? 40)
              ? `, but a cluster of ${near.u.rows} rows sits ${near.d.toFixed(0)}px from it`
              : ", and nothing is at the label either")
        );
      }
      if (lines.length) diag = lines.join(" · ");
    }

    thenRead += b.capture.read ?? 0;
    marks += (b.truth ?? []).length;

    // innerHTML rather than interpolation: htl escapes a string, and these are
    // built as SVG source
    const overlay = htl.svg`<svg viewBox="0 0 ${b.frame.w} ${b.frame.h}"
      style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none"></svg>`;
    overlay.innerHTML = parts;

    const chip = (m) => htl.html`<span style="display:inline-block;padding:1px 5px;margin:1px;
      border-radius:3px;font:10px ui-monospace,monospace;color:#111;
      background:${COL[m.state] ?? "#888"}" title=${m.state}>${m.id}</span>`;

    cards.push({
      portrait: b.frame.h > b.frame.w,
      node: htl.html`<figure style="margin:0;width:280px">
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
          ${diag ? htl.html`<div style="color:${COL.missing};margin-top:2px">${diag}</div>` : ""}
        </figcaption>
      </figure>`
    });
  }

  // Cards are a fixed width, so a wrapped row is as tall as its tallest member
  // and a landscape frame beside a portrait one pays for the difference in white
  // space. Grouping by orientation makes every row homogeneous except the seam.
  const ordered = [
    ...cards.filter((c) => !c.portrait),
    ...cards.filter((c) => c.portrait)
  ].map((c) => c.node);

  return htl.html`<div>
    <div style="font:13px system-ui;margin-bottom:8px">
      ${nowRead} of ${marks} marks read now, ${thenRead} when captured${
        spurious ? `, ${spurious} off-target detection${spurious === 1 ? "" : "s"}` : ", no off-target detections"}.
      <span style="color:var(--theme-foreground-muted,#888)">solid = read · dashed = located, payload did not decode ·
      dotted = missing · ✕ = fitted an involution somewhere the plane does not go</span>
    </div>
    <div style="display:flex;gap:14px;flex-wrap:wrap;align-items:flex-start">${ordered}</div>
  </div>`;
};
const _whybad = function _whyBad_md(md,ref) {return (md`hexcase-5ivq-06 reads four of seven, and the reason is not the photograph. Three of the four it decodes are the target's centre and two opposite vertices — 37, 56 and 11 lie on a diameter, collinear to **0.000mm** by construction. A homography needs four points in general position; with three of them collinear the eight-equation system is rank deficient and the plane is not determined at all. Twelve of the thirty-five four-mark subsets of this target are degenerate the same way.

\`fitHexPose\` reported that fit as ok with zero residual, because an exact fit through four points has nothing left to disagree with. What it produced before 2026-08-10, against what the row scan measured on the same frame in the same call:

~~~
mark    pose says      row scan measured
56        r 47px         a 36.2   b 42.4
11        r 97px         a 38.7   b 44.3
29        r 24px         a 37.7   b 43.2
37        r 44px         a 32.8   b 40.0
46, 51    r  6px         not decoded; labels say 34 and 38
~~~

Every mark is about the same size, as it must be on one sheet at one depth. The plane claimed a four-fold range. The three unread marks came out predicted 149, 160 and 189px from their labels, which is why the accounting called them missing — a cluster sat within 30px of each of those labels, and 1px from mark 51's, with 15 rows behind it. The card above now predicts 22 and 46 to within **1px** and accounts for 51, so what is left on this frame is a detection failure and not a geometric one.

The fix was cheaper than it looks and it is now in. \`a\` and \`b\` are the half-extents of the imaged circle along and across the scan, so every detected mark already carries two entries of its own local metric for free — the diagonal of \`J·Jᵀ\` — and until 2026-08-10 \`fitHexPose\` passed only centres to \`fitHomography\`. \`fitHomographyScaled\` adds them as two more equations per mark, so four marks are sixteen equations for eight unknowns and a collinear triple stops mattering. Both arms below share one detector pass per frame, so nothing but the fit differs:

~~~
                          centres   + widths
worst prediction on -06     189px      1.3px
worst on any frame           34px       33px   hexcase-04-pre, nothing to do with degeneracy
sum of worst-per-frame      306px      115px
missing marks over 16         13         12
fit cost per frame         0.09ms     0.49ms
~~~

No frame lost more than 1px. Widths are believed only out to two sigma, past which they count linearly: a mark clipped by the frame edge or sitting on a fold reports a width no plane can explain, and under plain squared error that one number moved the whole plane — phone-hexcase-01 and hexcase-04-pre were 3 and 2px worse than centres alone until the loss was capped, and are level with it now. Centres keep plain least squares; the drop loop already handles a bad one. \`opts.useScale: false\` still fits centres alone, which is what every number recorded here before that date was measured on.

${ref('constrains')} is the same idea taken further: the ring fit recovers the third, off-diagonal number as well, and to a precision a row scan cannot reach. That one is still offline only.`);};
const _sec_score = function _anonymous(sec) {return (sec("score"));};
const _tkkz5a = function _anonymous(md,ref) {return (md`Every frame above, replayed at rig's current controls, scored against ${ref('labels')}'s labels.`);};
const _1mzjoz4 = async function _hexBankScores(whenVisible,invalidation,hexFrameBank,analyzeFrameMan,hexRigOpts,hexRigScore,htl) {
  // Scored against the frozen labels, not against a plane fitted to this
  // frame's own detections -- the same distinction the rig makes (see
  // hexRigScore). fitHexPose is right for the live overlay and circular for
  // tuning, so §3.2's cards and this table will disagree, and the disagreement
  // is the point: a mark can be placed consistently with the other six and
  // still be in the wrong place.
  //
  // Reads hexRigOpts, so it is the rig's controls that move it, not a second
  // set of knobs. Costs a full cascade pass over sixteen frames; hold it until
  // it is on screen.
  await whenVisible("hexBankScores", invalidation);
  const rows = [];
  const tot = { marks: 0, read: 0, located: 0, missing: 0, misplaced: 0, off: 0, score: 0, ms: 0 };
  for (const b of hexFrameBank) {
    const res = analyzeFrameMan({ gray: b.frame.gray, w: b.frame.w, h: b.frame.h }, hexRigOpts);
    const s = hexRigScore(res, b.truth);
    // Residuals over every mark the cascade placed, misplaced ones included:
    // dropping those would flatter the median by exactly the marks that matter.
    const d = s.marks.map((m) => m.residualPx).filter((x) => x != null).sort((x, y) => x - y);
    const row = {
      name: b.name,
      size: b.frame.w + "×" + b.frame.h,
      read: s.counts.read,
      located: s.counts.located,
      missing: s.counts.missing,
      misplaced: s.counts.misplaced,
      off: s.offTarget.length,
      p50: d.length ? +d[d.length >> 1].toFixed(1) : null,
      worst: d.length ? +d[d.length - 1].toFixed(1) : null,
      ms: Math.round(res.ms),
      score: s.score
    };
    rows.push(row);
    tot.marks += b.truth.length;
    for (const k of ["read", "located", "missing", "misplaced", "off", "score", "ms"]) tot[k] += row[k];
  }

  const num = (v, bad) => htl.html`<td style="text-align:right;padding:2px 7px;
    font-variant-numeric:tabular-nums;${bad ? "color:#ff5c5c;font-weight:600" : ""}">${v == null ? "–" : v}</td>`;
  const th = (t, title) => htl.html`<th title=${title}
    style="text-align:right;padding:2px 7px;font-weight:600;border-bottom:1px solid currentColor">${t}</th>`;

  return htl.html`<div style="overflow-x:auto">
    <table style="border-collapse:collapse;font:12px ui-monospace,monospace">
      <thead><tr>
        <th style="text-align:left;padding:2px 7px;font-weight:600;border-bottom:1px solid currentColor">frame</th>
        ${th("size", "frame the label set was measured on")}
        ${th("read", "id decoded and centre within 0.6 of the label's radius")}
        ${th("loc", "involution fitted at the mark, payload did not decode")}
        ${th("miss", "nothing fitted there")}
        ${th("wrong", "id decoded but the centre is not at that label")}
        ${th("off", "id decoded somewhere the target has no mark")}
        ${th("p50 px", "median distance from label, over every mark placed")}
        ${th("worst px", "largest such distance")}
        ${th("ms", "one cascade pass over the whole frame")}
        ${th("score", "read − 3 × (wrong + off): a false id costs more than a miss")}
      </tr></thead>
      <tbody>${rows.map((r) => htl.html`<tr>
        <td style="padding:2px 7px">${r.name}</td>
        <td style="text-align:right;padding:2px 7px;color:var(--theme-foreground-muted,#888)">${r.size}</td>
        ${num(r.read + "/7", r.read < 7)}${num(r.located)}${num(r.missing, r.missing > 0)}
        ${num(r.misplaced, r.misplaced > 0)}${num(r.off, r.off > 0)}
        ${num(r.p50)}${num(r.worst, r.worst > 4)}${num(r.ms)}${num(r.score, r.score < 7)}
      </tr>`)}</tbody>
      <tfoot><tr style="font-weight:700">
        <td style="padding:3px 7px;border-top:1px solid currentColor">16 frames</td>
        <td style="border-top:1px solid currentColor"></td>
        ${htl.html`<td style="text-align:right;padding:3px 7px;border-top:1px solid currentColor">${tot.read}/${tot.marks}</td>`}
        ${[tot.located, tot.missing, tot.misplaced, tot.off, "", "", tot.ms, tot.score].map((v) =>
          htl.html`<td style="text-align:right;padding:3px 7px;border-top:1px solid currentColor">${v}</td>`)}
      </tr></tfoot>
    </table>
    <div style="font:11px ui-monospace,monospace;padding-top:6px;color:var(--theme-foreground-muted,#888)">
      stride ${hexRigOpts.stride} · edge threshold ${hexRigOpts.edgeThreshold} ·
      min rows ${hexRigOpts.minRows} · min votes ${hexRigOpts.minVotes} ·
      ${hexRigOpts.bothAxes ? "both axes" : "rows only"}
    </div>
  </div>`;
};
const _sec_detect = function _anonymous(sec) {return (sec("detect"));};
const _nb3x = function _anonymous(md,ref) {return (md`|   |   |
| --- | --- |
| ${ref('pattern')} | **The circular encoding** |
| ${ref('scanline')} | **One scanline** |
| ${ref('combine')} | **Frame** fusion |
| ${ref('pose')} | **The plane** |

The mark is designed so it is easy to recognize and localize from a single scan line of pixels. The encoding gives it a label and edges for sharp positioning.`);};
const _sec_pattern = function _anonymous(sec) {return (sec("pattern"));};
const _vzqosp = function _encodingCfg(Inputs) {return (Inputs.form({
  row: Inputs.range([-0.92, 0.80], { step: 0.01, value: 0.42, label: "scan row" }),
  yaw: Inputs.range([-70, 70], { step: 1, value: 38, label: "yaw (°)" }),
  tilt: Inputs.range([-70, 70], { step: 1, value: 24, label: "tilt (°)" }),
  id: Inputs.range([0, 63], { step: 1, value: 45, label: "id" })
}));};
const _156p83f = (G, _) => G.input(_);
const _1w60xe0 = function _encodingDiagram(manLayout,encodingCfg,manColor,htl) {
  // The u = r^2 claim, computed rather than drawn. A real pinhole pose puts the
  // mark on a plane at some yaw and tilt; a HORIZONTAL image row cuts it; the
  // crossings that row sees are plotted against the tooth lattice. Nothing is
  // placed by hand -- if the claim is wrong the points bend, and the residual
  // alongside says so.
  //
  // Not every tooth shows up as an edge: the boundary between two cells exists
  // only where their bits agree, so the lattice positions that carry no edge
  // are drawn faint. Those are the ones a detector cannot see, and they are
  // excluded from the fit.
  const L = manLayout;
  const cfg = encodingCfg;
  const bits = Array.from({ length: L.nBits }, (_, j) => (cfg.id >> (L.nBits - 1 - j)) & 1);
  const rad = Math.PI / 180;

  // ---- pose ---------------------------------------------------------------
  const ps = cfg.yaw * rad, th = cfg.tilt * rad;
  const c1 = [Math.cos(ps), Math.sin(ps) * Math.sin(th), -Math.sin(ps) * Math.cos(th)];
  const c2 = [0, Math.cos(th), Math.sin(th)];
  const FL = 600, Z0 = 240;
  const H = [
    [FL * c1[0], FL * c2[0], 0],
    [FL * c1[1], FL * c2[1], 0],
    [c1[2], c2[2], Z0]
  ];
  const inv3 = (m) => {
    const [[a, b, c], [d, e, f], [g, h, i]] = m;
    const A0 = e * i - f * h, B0 = -(d * i - f * g), C0 = d * h - e * g;
    const det = a * A0 + b * B0 + c * C0;
    return [
      [A0 / det, -(b * i - c * h) / det, (b * f - c * e) / det],
      [B0 / det, (a * i - c * g) / det, -(a * f - c * d) / det],
      [C0 / det, -(a * h - b * g) / det, (a * e - b * d) / det]
    ];
  };
  const ap = (m, v) => [
    m[0][0] * v[0] + m[0][1] * v[1] + m[0][2] * v[2],
    m[1][0] * v[0] + m[1][1] * v[1] + m[1][2] * v[2],
    m[2][0] * v[0] + m[2][1] * v[1] + m[2][2] * v[2]
  ];
  const Hi = inv3(H);
  const fwd = (X, Y) => { const q = ap(H, [X, Y, 1]); return [q[0] / q[2], q[1] / q[2]]; };
  const back = (x, y) => { const q = ap(Hi, [x, y, 1]); return [q[0] / q[2], q[1] / q[2]]; };

  const NA = 160;
  const ringPts = (r) => Array.from({ length: NA }, (_, i) => {
    const a2 = (i / NA) * 2 * Math.PI;
    return fwd(r * Math.cos(a2), r * Math.sin(a2));
  });
  const poly = (r) => ringPts(r).map((p) => p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ");
  const rim = ringPts(L.R);
  const xs0 = rim.map((p) => p[0]), ys0 = rim.map((p) => p[1]);
  const bx0 = Math.min(...xs0), bx1 = Math.max(...xs0);
  const by0 = Math.min(...ys0), by1 = Math.max(...ys0);
  const ctr = fwd(0, 0);
  const rowY = ctr[1] + cfg.row * Math.min(ctr[1] - by0, by1 - ctr[1]);

  // a homography takes a line to a line, so two pullbacks fix the chord exactly
  const pA = back(bx0 - 40, rowY), pB = back(bx1 + 40, rowY);
  const ex0 = pB[0] - pA[0], ey0 = pB[1] - pA[1];
  const en = Math.hypot(ex0, ey0), ex = ex0 / en, ey = ey0 / en;
  const along = pA[0] * ex + pA[1] * ey;
  const footX = pA[0] - along * ex, footY = pA[1] - along * ey;
  const d = Math.hypot(footX, footY);

  const Pimg = fwd(footX, footY)[0];
  const qh = ap(H, [ex, ey, 0]);
  const qFinite = Math.abs(qh[2]) > 1e-9;
  const Qimg = qFinite ? qh[0] / qh[2] : null;
  const norm = (x) => (qFinite ? (x - Pimg) / (x - Qimg) : (x - Pimg) * 1e-3);

  const eps = 1e-4;
  const pts = [];
  for (let m = 0; m <= L.nT; m++) {
    const r = L.teeth[m];
    if (r <= d) continue;
    const s = Math.sqrt(r * r - d * d);
    const R1 = fwd(footX + s * ex, footY + s * ey);
    const R2 = fwd(footX - s * ex, footY - s * ey);
    const uR = norm(R1[0]) ** 2, uL = norm(R2[0]) ** 2;
    pts.push({
      m, r, r2: r * r, s, pR: R1, pL: R2,
      u: (uR + uL) / 2, uGap: Math.abs(uR - uL),
      // does this tooth actually produce an intensity step for this payload?
      edge: manColor(r - eps, bits, L) !== manColor(r + eps, bits, L)
    });
  }

  const MUT = "var(--theme-foreground-muted,#888)";
  const FG = "var(--theme-foreground,#ccc)";
  const GRN = "#2fe08a", YEL = "#f5a524", GHOST = "#7a7a7a";
  const svgEl = (vb, body) => {
    const el = htl.html`<div></div>`;
    el.innerHTML = `<svg viewBox="${vb}" style="display:block;width:100%;height:auto;overflow:visible">${body}</svg>`;
    return el;
  };
  const txt = (x, y, s, o = {}) =>
    `<text x="${x}" y="${y}" font-family="ui-monospace,monospace" font-size="${o.size || 6}"
      fill="${o.fill || MUT}" text-anchor="${o.anchor || "middle"}"${o.style ? ` font-style="${o.style}"` : ""}>${s}</text>`;

  if (pts.length < 3)
    return htl.html`<div style="font:12px ui-monospace,monospace;color:${MUT};padding:10px 0">
      the row misses the mark at this pose — move the scan row slider back toward 0</div>`;

  const seen = pts.filter((p) => p.edge);
  const fitOn = seen.length >= 3 ? seen : pts;

  // ---- A: the mark as the camera sees it, with the row across it ----------
  // A FIXED box, not the pose's bounding box: the mark centre always projects
  // to the origin, and 78 clears the widest projection the sliders can reach
  // (worst half-extent 71.8px, face-on 71.25px), so the panel never resizes.
  // The extra 14 below is the caption strip.
  const HALF = 78;
  const vbA = `${-HALF} ${-HALF} ${2 * HALF} ${2 * HALF + 14}`;
  // the outermost ring is black and so is the page, so the mark's rim needs
  // something to sit against
  let a = `<polygon points="${poly(L.R * 1.06)}" fill="#5c5c5c"/>`;
  const bounds = [0, ...L.teeth];
  for (let i = bounds.length - 1; i >= 1; i--) {
    const g = manColor((bounds[i - 1] + bounds[i]) / 2, bits, L);
    a += `<polygon points="${poly(bounds[i])}" fill="rgb(${g},${g},${g})"/>`;
  }
  a += `<line x1="${-HALF}" y1="${rowY.toFixed(1)}" x2="${HALF}" y2="${rowY.toFixed(1)}"
    stroke="#5af" stroke-width="1.2"/>`;
  // d is the offset: centre to the row, measured perpendicular ON THE MARK,
  // which is why the segment is drawn from the centre and not straight up
  const footImg = fwd(footX, footY);
  a += `<line x1="${ctr[0].toFixed(1)}" y1="${ctr[1].toFixed(1)}" x2="${footImg[0].toFixed(1)}" y2="${footImg[1].toFixed(1)}"
    stroke="#5af" stroke-width="0.8" stroke-dasharray="2 2"/>`;
  const tick = (x, col, len, w) =>
    `<line x1="${x.toFixed(1)}" y1="${(rowY - len).toFixed(1)}" x2="${x.toFixed(1)}" y2="${(rowY + len).toFixed(1)}"
      stroke="${col}" stroke-width="${w}"/>`;
  for (const p of pts) {
    if (p.edge) {
      a += tick(p.pR[0], GRN, 6, 1.8) + tick(p.pL[0], YEL, 6, 1.8);
    } else {
      a += tick(p.pR[0], GHOST, 3, 0.8) + tick(p.pL[0], GHOST, 3, 0.8);
    }
  }
  a += `<circle cx="${ctr[0].toFixed(1)}" cy="${ctr[1].toFixed(1)}" r="1.4" fill="#5af"/>`;
  a += `<circle cx="${footImg[0].toFixed(1)}" cy="${footImg[1].toFixed(1)}" r="2.6" fill="none" stroke="#5af" stroke-width="1.2"/>`;
  // label the segment, on the side of it away from the mark's centre
  {
    const mxd = (ctr[0] + footImg[0]) / 2, myd = (ctr[1] + footImg[1]) / 2;
    const vx = footImg[0] - ctr[0], vy = footImg[1] - ctr[1];
    const vn = Math.hypot(vx, vy) || 1;
    const nx = -vy / vn, ny = vx / vn;
    a += txt(mxd + nx * 7, myd + ny * 7 + 2, "d", { fill: "#5af", size: 8, style: "italic" });
  }
  a += txt(footImg[0] + 9, footImg[1] - 4, "P", { fill: "#5af", size: 7 });
  a += txt(0, HALF + 10, `yaw ${cfg.yaw}° · tilt ${cfg.tilt}° · d = ${d.toFixed(2)}`, { size: 7 });

  // ---- B: the crossings as the row delivers them --------------------------
  const rxs = pts.flatMap((p) => [p.pL[0], p.pR[0]]);
  const mnx = Math.min(...rxs, Pimg), mxx = Math.max(...rxs, Pimg);
  const bw = 250, sxb = (x) => 4 + ((x - mnx) / (mxx - mnx || 1)) * (bw - 8);
  // headroom above the row for the pairing arcs
  const AH = 40;
  let b = `<line x1="0" y1="24" x2="${bw}" y2="24" stroke="${MUT}" stroke-width="0.5"/>`;
  // The involution, drawn. One arc per ring, joining that ring's two crossings: a single
  // projective map on this row carries every left crossing to its right one, the same map
  // for all of them, and P is one of the two points it leaves alone.
  pts.forEach((p, i) => {
    const x1 = sxb(p.pL[0]), x2 = sxb(p.pR[0]);
    const hh = 8 + (i / Math.max(1, pts.length - 1)) * 26;
    b += `<path d="M ${x1.toFixed(1)} 24 Q ${((x1 + x2) / 2).toFixed(1)} ${(24 - 2 * hh).toFixed(1)} ${x2.toFixed(1)} 24"
      fill="none" stroke="#5af" stroke-width="${p.edge ? 0.8 : 0.5}" stroke-opacity="${p.edge ? 0.65 : 0.28}"/>`;
  });
  for (const p of pts) {
    const c1c = p.edge ? GRN : GHOST, c2c = p.edge ? YEL : GHOST;
    const h = p.edge ? 7 : 3.5, w = p.edge ? 1.5 : 0.7;
    b += `<line x1="${sxb(p.pR[0]).toFixed(1)}" y1="${24 - h}" x2="${sxb(p.pR[0]).toFixed(1)}" y2="24" stroke="${c1c}" stroke-width="${w}"/>`;
    b += `<line x1="${sxb(p.pL[0]).toFixed(1)}" y1="24" x2="${sxb(p.pL[0]).toFixed(1)}" y2="${24 + h}" stroke="${c2c}" stroke-width="${w}"/>`;
  }
  // P runs the full height of the arc stack -- the arcs nest about it because it is fixed
  b += `<line x1="${sxb(Pimg).toFixed(1)}" y1="-14" x2="${sxb(Pimg).toFixed(1)}" y2="36" stroke="#5af" stroke-width="0.7" stroke-dasharray="2 2"/>`;
  b += txt(sxb(Pimg), -18, "P", { fill: "#5af", size: 6 });
  b += txt(0, -30, "each arc joins one ring's two crossings", { size: 6, anchor: "start", fill: "#5af" });
  b += txt(bw, 44, qFinite ? `Q at x = ${Qimg.toFixed(0)}` : "Q at infinity", { fill: "#5af", size: 6, anchor: "end" });
  b += txt(0, 44, "one image row — the lattice is gone", { size: 6, anchor: "start" });

  // ---- C: u against the lattice ------------------------------------------
  const n = fitOn.length;
  const mx = fitOn.reduce((s2, p) => s2 + p.r2, 0) / n;
  const my = fitOn.reduce((s2, p) => s2 + p.u, 0) / n;
  const A = fitOn.reduce((s2, p) => s2 + (p.r2 - mx) * (p.u - my), 0) /
            fitOn.reduce((s2, p) => s2 + (p.r2 - mx) ** 2, 0);
  const B = my - A * mx;
  const resid = Math.max(...fitOn.map((p) => Math.abs(p.u - (A * p.r2 + B))));
  const us = fitOn.map((p) => p.u);
  const span = Math.max(...us) - Math.min(...us);
  const pairGap = Math.max(...fitOn.map((p) => p.uGap));
  const dHat = Math.sqrt(Math.max(0, -B / A));

  const cw = 330, ch = 158, padL = 30, padB = 30;
  const rx1 = L.R * L.R * 1.05, uy1 = Math.max(...pts.map((p) => p.u)) * 1.08;
  const px = (v) => padL + (v / rx1) * (cw - padL - 6);
  const py = (v) => ch - padB - (v / uy1) * (ch - padB - 12);
  let c = `<line x1="${padL}" y1="${ch - padB}" x2="${cw - 4}" y2="${ch - padB}" stroke="${MUT}" stroke-width="0.5"/>` +
          `<line x1="${padL}" y1="8" x2="${padL}" y2="${ch - padB}" stroke="${MUT}" stroke-width="0.5"/>`;
  c += `<line x1="${px(0)}" y1="${py(B)}" x2="${px(rx1)}" y2="${py(A * rx1 + B)}" stroke="#5af" stroke-width="1"/>`;
  c += `<line x1="${px(d * d)}" y1="${py(0)}" x2="${px(d * d)}" y2="${py(0) + 5}" stroke="#5af" stroke-width="0.9"/>`;
  c += txt(px(d * d), py(0) + 12, "d² = -B/A", { fill: "#5af", size: 6 });
  for (const p of pts) {
    const X = px(p.r2), Y = py(p.u);
    if (!p.edge) {
      c += `<circle cx="${X.toFixed(1)}" cy="${Y.toFixed(1)}" r="2" fill="none" stroke="${GHOST}" stroke-width="0.8"/>`;
      continue;
    }
    const R2 = 4.2;
    c += `<path d="M ${X} ${Y - R2} A ${R2} ${R2} 0 0 0 ${X} ${Y + R2} Z" fill="${YEL}"/>`;
    c += `<path d="M ${X} ${Y - R2} A ${R2} ${R2} 0 0 1 ${X} ${Y + R2} Z" fill="${GRN}"/>`;
    c += `<line x1="${X}" y1="${Y - R2}" x2="${X}" y2="${Y + R2}" stroke="#0009" stroke-width="0.6"/>`;
  }
  c += txt((cw + padL) / 2, ch - 8, "r²  —  the tooth lattice, known in advance", { size: 6.5 });
  c += `<text x="10" y="${(ch - padB) / 2}" font-family="ui-monospace,monospace" font-size="6.5"
    fill="${MUT}" text-anchor="middle" transform="rotate(-90 10 ${(ch - padB) / 2})">u = t²  measured</text>`;

  const stat = (label, value) => htl.html`<div style="margin-bottom:3px">
    <span style="color:${MUT}">${label}</span> <b style="color:${FG}">${value}</b></div>`;

  return htl.html`<figure style="margin:12px 0">
    <div style="display:flex;gap:18px;align-items:flex-start;flex-wrap:wrap">
      <div style="width:190px;flex:none">${svgEl(vbA, a)}</div>
      <div style="flex:1;min-width:290px">
        ${svgEl(`0 ${-AH} ${bw} ${48 + AH}`, b)}
        <div style="margin-top:6px">${svgEl(`0 0 ${cw} ${ch}`, c)}</div>
      </div>
      <div style="font:11px/1.5 ui-monospace,monospace;min-width:210px;flex:none">
        ${stat("rings crossed", `${pts.length} of ${L.nT + 1}`)}
        ${stat("of those, edges", `${seen.length}${seen.length < 3 ? " (too few — fitting all)" : ""}`)}
        ${stat("A", A.toExponential(4))}
        ${stat("B", B.toExponential(4))}
        ${stat("d recovered", `${dHat.toFixed(6)}  (true ${d.toFixed(6)})`)}
        ${stat("max residual / span", resid === 0 ? "0" : (resid / span).toExponential(1))}
        ${stat("max |u_left - u_right|", pairGap.toExponential(1))}
        <div style="color:${MUT};margin-top:8px"><b style="color:#5af">d</b> is the offset — centre
        of the mark to the scan row, measured on the mark, in the same units as the tooth radii.
        It is the one pose quantity the row gives back on its own, as
        <b style="color:#5af">√(-B/A)</b>.</div>
        <div style="color:${MUT};margin-top:6px">A tooth only shows an edge where
        the two cells either side of it carry the same bit; the rest are drawn
        <b style="color:${GHOST}">faint</b> and left out of the fit. Each solid marker is
        <b style="color:${GRN}">half green</b> / <b style="color:${YEL}">half orange</b> —
        the ring's two crossings, at opposite ends of the row, landing on one u.
        Move the sliders: the row changes completely, the line does not.</div>
      </div>
    </div>
  </figure>`;
};
const _1566rx9 = function _anonymous(md,tex) {return (md`A scan row cuts every ring twice, and one projective map on that row carries each ring's first crossing to its second — the *same* map for every ring, because they are concentric. That map is an **involution**: it is its own inverse, so applying it twice returns the point you started from. Two points on the row are left alone by it — ${tex`P`}, where the row passes closest to the mark's centre, and ${tex`Q`}, the vanishing point of the row's direction. Those two fixed points are all it takes to undo the perspective along that row.

The key coordinate is ${tex`u = r^2`}. After normalising by the involution's fixed points, ${tex`t = (x-P)/(x-Q)`} gives ${tex`t = c k`} exactly, so

${tex.block`u := t^2 = c^2(r^2 - d^2) = A r^2 + B.`}

**The whole per-row warp — chord offset and perspective together — collapses to an affine map in ${tex`r^2`}-space.** A code built from affine-recognisable structure in that space is detectable on every row, at every pose, from every edge, and no part of it needs to be reserved for finding the mark rather than reading it.`);};
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
const _manPageLevel = function _manPageLevel() {
  // The gray level of the page the marks sit on, 0-255. ONE definition: the
  // printed sheet, the single-mark renderer, the synthetic scene and the target
  // renderer all derive from it, so a print and its test bench cannot disagree.
  // They used to hold four separate literal 128s, and while measuring the white
  // flip I patched the wrong one twice -- taking only renderManFrame's fallback
  // leaves a gray halo around every tile, which reads as white failing.
  //
  // White since 2026-08-09; see manMarkSvgSource for the measurement and the
  // caveat. Setting this to 128 restores the old gray sheet everywhere at once.
  return 255;
};
const _12dy4hh = function _manColor(manLayout,manPageLevel) {return (function manColor(r, bits, L = manLayout) {
  // radial gray profile of a man mark: 25 dark, 230 light, page beyond the rim
  if (r >= L.R) return manPageLevel;
  if (r < 6) return 25;
  const m = Math.floor((r - 6) / L.half);
  if (m <= 0) return 230;
  if (m >= L.nT - 1) return 25;
  const j = (m - 1) >> 1, firstHalf = (m - 1) % 2 === 0;
  return bits[j] === 1 ? (firstHalf ? 25 : 230) : (firstHalf ? 230 : 25);
});};
const _19a2bc6 = function _manMarkSvgSource(manLayout,manColor,manPageLevel) {return (function manMarkSvgSource(id, opts = {}) {
  // A man mark as standalone SVG, mm-sized: page flood, nested full discs
  // outside-in. ALL 64 ids are usable -- Manchester guarantees a transition
  // per cell, so no payload ever resembles featureless paint.
  //
  // The page is white. The mark ends in a dark framing half-cell, so its rim
  // edge never needed a gray page -- on white that edge is 25->255 rather than
  // 25->128, larger and the same polarity. Rendered, white measures BETTER:
  // over nine poses of renderHexScene scored against the renderer's own truth,
  // 63 marks read against 60, and worst-case residual 9.4px -> 2.2px at
  // yaw45/tilt20. It also stops flooding a whole A4 sheet with ink.
  //
  // The mid-gray it replaced had no recorded motivation anywhere -- not in the
  // prose, not in the comments, not in the commit that designed this mark
  // family. Nothing in the detector reads the page level.
  //
  // STILL UNVALIDATED ON PAPER (2026-08-09): all 174 archived captures are of a
  // gray sheet, so what auto-exposure does with a frame full of white paper is
  // measured by nobody. Set manPageLevel back to 128 to print the old sheet AND
  // score it on the synthetic benches, if a capture session says the flood was
  // earning something after all.
  const L = opts.layout ?? manLayout;
  const bits = Array.from({ length: L.nBits }, (_, j) => (id >> (L.nBits - 1 - j)) & 1);
  const dMm = opts.diameterMm ?? 60;
  const padFrac = opts.padFrac ?? 0.35;
  const label = opts.label !== false;
  // Default from manPageLevel so the printed sheet and the synthetic benches
  // cannot drift apart.
  const g = manPageLevel.toString(16).padStart(2, "0");
  const pageFill = opts.pageFill ?? `#${g}${g}${g}`;
  // Label contrast has to follow the page, or a white sheet prints a white label.
  const pageLum = ((v) => (0.299 * ((v >> 16) & 255) + 0.587 * ((v >> 8) & 255) + 0.114 * (v & 255)))(
    parseInt(pageFill.replace("#", ""), 16) || 0);
  const labelFill = pageLum > 160 ? "#4a4a4a" : "#e8e8e8";
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
<rect width="${w}" height="${h}" fill="${pageFill}"/>
${discs.join("\n")}
${label ? `<text x="${half.toFixed(3)}" y="${(h - 1.6).toFixed(3)}" font-family="monospace" font-size="4" fill="${labelFill}" text-anchor="middle">man ${id}</text>` : ""}
</svg>`;
});};
const _4krul3 = function _renderManFrame(manLayout,manColor,manPageLevel) {return (function renderManFrame(bits, opts = {}) {
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
      let v = manPageLevel; // degenerate ray: the page, not the mark
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
const _ujkuco = function _manScene(manLayout,renderManFrame,manPageLevel) {
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
  const gray = new Uint8Array(W * H).fill(manPageLevel);
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
const _sec_scanline = function _anonymous(sec) {return (sec("scanline"));};
const _nb4x = function _row_md(md) {return (md`One scanline is enough to determine 3 of the 6 position/orientation degrees of freedom for the barcode in 3D space.

| barcode on line | geometric |
|-|-|
| center position along line | x offset |
| width on line | z offset|
| yaw | rotation around y | 

3 scanlines on the same barcode can retreive a homography (5DOF), and if the size of the barcode is fixed and the camera field of view known, all 6 (albiet some of them are pretty noisy).

The first step to towards pose retreival is edge detection`);};
const _2dhvou = function _rowWalkCfg(Inputs,hexFrameBank) {return (Inputs.form({
  frame: Inputs.select(Array.from({ length: hexFrameBank.length }, (_, i) => i), {
    value: 2,
    label: "bank frame",
    format: (i) => `${i + 1}. ${hexFrameBank[i].name}`
  }),
  rowFrac: Inputs.range([0, 1], { step: 0.001, value: 0.571, label: "scan row" }),
  thr: Inputs.range([4, 30], { step: 1, value: 12, label: "edge threshold" })
}));};
const _e4xx4t = (G, _) => G.input(_);
const _erd4p7 = function _rowWalkScan(hexFrameBank,rowWalkCfg,manScanRows,scanRowsMan) {
  // Stage 1 over the WHOLE frame, at the detector's own row stride. Only used
  // to say which rows lock, so the reader can aim the slider at one instead of
  // hunting for it. Returns counts and rows only -- the frame buffer stays in
  // hexFrameBank rather than being copied into every downstream value.
  const b = hexFrameBank[rowWalkCfg.frame];
  const ys = manScanRows(b.frame, {});
  const rows = scanRowsMan(b.frame, ys, { edgeThreshold: rowWalkCfg.thr });
  return { rows, locked: rows.filter((r) => r.hits.length).length, total: rows.length };
};
const _ra002j = function _rowWalkRow(hexFrameBank,rowWalkCfg,edges1Dsub,detectRowMan,manRowGroups,findInvolution,solveMan,manLayout) {
  // One row, every stage kept rather than thrown away. This runs the SAME
  // functions the detector runs -- edges1Dsub, manRowGroups, findInvolution,
  // solveMan -- so nothing here can drift from what §4.2 describes.
  const b = hexFrameBank[rowWalkCfg.frame];
  const { gray, w, h } = b.frame;
  const y = Math.max(0, Math.min(h - 1, Math.round(rowWalkCfg.rowFrac * (h - 1))));
  const thr = rowWalkCfg.thr;

  const edges = edges1Dsub(gray.subarray(y * w, (y + 1) * w), thr);
  const xs = new Float64Array(edges.length), ss = new Int8Array(edges.length);
  edges.forEach((e, i) => { xs[i] = e.x; ss[i] = e.s; });

  const kept = detectRowMan(edges, {});
  const claimed = new Set();
  const groups = manRowGroups(xs, {}).map(([lo, hi], gi) => {
    const sub = [];
    for (let i = lo; i <= hi; i++) sub.push({ x: xs[i], s: ss[i] });
    const iv = findInvolution(sub, {});
    const sol = iv ? solveMan(iv, manLayout, {}) : null;
    // detectRowMan's own gates, restated so the display can say WHY a group died
    let why = !iv ? "no involution fits" : !sol.ok ? "no lattice assignment"
      : sol.sup < 5 ? `lattice support ${sol.sup} < 5` : null;
    let survives = false;
    if (!why) {
      const pOut = iv.up[iv.up.length - 1];
      const wHalf = (iv.xs[pOut.f] - iv.xs[pOut.e]) / 2;
      // Two different ways a passing group still yields nothing, and they are
      // not the same thing. offerWhole submits one run twice (whole and split),
      // so the second copy is the SAME lock at the same foot. A different foot
      // inside a taken lock's span is a rival, dropped by detectRowMan's
      // overlap rule -- ties go to whichever it reached first.
      const same = kept.findIndex((t, ti) => !claimed.has(ti) && Math.abs(t.foot - iv.P) < 1e-9);
      if (same >= 0) { claimed.add(same); survives = true; }
      else {
        const rival = kept.find((t) => Math.abs(t.foot - iv.P) < 0.6 * Math.max(t.wHalf, wHalf));
        why = rival
          ? Math.abs(rival.foot - iv.P) < 1e-9
            ? "same lock as an earlier group (whole and split both offered)"
            : `overlaps a lock already taken (support ${rival.sup} vs ${sol.sup})`
          : "dropped in overlap resolution";
      }
    }
    return { gi, x0: xs[lo], x1: xs[hi], n: hi - lo + 1, iv, sol, why, survives };
  });
  return { y, w, h, edges, groups, kept, thr };
};
const _rwbox = function _rowWalkBox(rowWalkRow) {
  // One box for the three row-aligned figures -- the frame, the edge ticks and the
  // group brackets. They are read against each other, so one image pixel has to be
  // the same distance on screen in all three or a bracket does not sit under the
  // mark it cut.
  //
  // They did not agree. The frame and the groups chart carried the 30px strip in
  // their viewBox and the edges chart did not, and only the groups chart lifted the
  // default 640px figure cap -- so its x axis ran wider than the two figures either
  // side of it, which is what the annotation on 2026-08-10 reported.
  //
  // The cap is lifted rather than restored: at 640 this ${rowWalkRow.w}px row draws
  // at two thirds size and takes the type and the lane pitch down with it.
  const STRIP = 30;   // the right-hand strip on the frame; in every viewBox, drawn on one
  const boxW = rowWalkRow.w + STRIP;
  return { STRIP, w: rowWalkRow.w, boxW, style: `margin:12px 0;max-width:${boxW}px` };
};
const _1ta8m6l = function _rowWalkFrame(hexFrameBank,rowWalkCfg,rowWalkRow,rowWalkBox,rowWalkScan,htl,$0,Event) {
  // Where the row is. The strip down the right says what the detector gets out of
  // each row, so the slider can be aimed rather than hunted with. It carries the
  // circles' colours because locating a mark is not decoding one: a strip that goes
  // green on a hit reads as success on rows that returned no id at all.
  const b = hexFrameBank[rowWalkCfg.frame];
  const { y, w, h, kept } = rowWalkRow;
  const rows = rowWalkScan.rows;
  const MUT = "var(--theme-foreground-muted,#888)";
  const { STRIP, boxW } = rowWalkBox;
  let s = `<image href="${b.url}" x="0" y="0" width="${w}" height="${h}"/>`;
  // The recorded labels, not detections. They were faint white, which reads as one more
  // overlay rather than as a different KIND of thing -- so they get their own hue and a
  // dashed stroke, and green and amber stay reserved for what this row measured.
  for (const t of b.truth)
    s += `<circle cx="${t.x}" cy="${t.y}" r="${t.radiusPx}" fill="none"
      stroke="#e05ad0" stroke-opacity="0.8" stroke-width="2" stroke-dasharray="6 4"/>`;
  s += `<line x1="0" y1="${y}" x2="${w}" y2="${y}" stroke="#5af" stroke-width="2"/>`;
  for (const k of kept)
    s += `<circle cx="${k.foot.toFixed(1)}" cy="${y}" r="7" fill="none"
      stroke="${k.id != null ? "#2fe08a" : "#f5a524"}" stroke-width="3"/>`;
  for (const r of rows) {
    const idd = r.hits.some((hit) => hit.id != null);
    const on = r.hits.length > 0;
    s += `<rect x="${w + 10}" y="${r.y - 1}" width="${idd ? 16 : on ? 11 : 6}" height="3"
      fill="${idd ? "#2fe08a" : on ? "#f5a524" : "#777"}"/>`;
  }
  s += `<rect x="${w + 8}" y="${y - 3}" width="20" height="7" fill="none" stroke="#5af" stroke-width="2"/>`;

  const el = htl.html`<div></div>`;
  el.innerHTML = `<svg viewBox="0 0 ${boxW} ${h}"
    style="display:block;width:100%;height:auto;cursor:crosshair;touch-action:none">${s}</svg>`;

  // Click or drag anywhere on the frame to put the scan row there. Drives the
  // slider rather than shadowing it, so the two can never disagree. Write to
  // the Inputs.range FORM, not its <input> -- the form's setter is what holds
  // the value the rest is re-synced from it.
  const svg = el.firstChild;
  const rowForm = $0.querySelectorAll("input[type=range]")[0]?.closest("form");
  const aim = (ev) => {
    const ctm = svg.getScreenCTM();
    if (!ctm || !rowForm) return;
    const pt = svg.createSVGPoint();
    pt.x = ev.clientX;
    pt.y = ev.clientY;
    const frac = pt.matrixTransform(ctm.inverse()).y / (h - 1);
    rowForm.value = +Math.min(1, Math.max(0, frac)).toFixed(3);
    rowForm.dispatchEvent(new Event("input", { bubbles: true }));
  };
  svg.addEventListener("pointerdown", (ev) => {
    svg.setPointerCapture(ev.pointerId);
    aim(ev);
  });
  svg.addEventListener("pointermove", (ev) => {
    if (svg.hasPointerCapture(ev.pointerId)) aim(ev);
  });
  svg.addEventListener("pointerup", (ev) => svg.releasePointerCapture(ev.pointerId));

  const dec = kept.filter((k) => k.id != null).length;
  const rowsDecoded = rows.filter((r) => r.hits.some((hit) => hit.id != null)).length;
  return htl.html`<figure style="${rowWalkBox.style}">
    ${el}
    <figcaption style="font:11px/1.5 ui-monospace,monospace;color:${MUT};margin-top:6px">
      <b>${b.name}</b> · ${w}×${h} · row y = <b>${y}</b> ·
      ${rowWalkScan.locked} of ${rowWalkScan.total} scanned rows lock at least one mark,
      ${rowsDecoded} of them decode an id ·
      this row locks <b>${kept.length}</b>${dec ? `, ${dec} of them with an id` : ", none with an id"}.
      Click or drag on the frame to move the scan row.
      Green carries an id, amber is located but undecoded — for the circles and for the
      strip alike. Magenta dashed circles are the frame's recorded labels: ground truth,
      not something the detector produced.
    </figcaption>
  </figure>`;
};
const _eihwp8 = function _rowWalkEdges(hexFrameBank,rowWalkCfg,rowWalkRow,rowWalkBox,htl) {
  // Stage A. The row is one line of grey; the detector never sees more than
  // this. First differences, peaks past the threshold, each refined by a
  // parabola through the peak — which is the whole of edges1Dsub.
  const b = hexFrameBank[rowWalkCfg.frame];
  const { y, w, edges, thr } = rowWalkRow;
  const sig = b.frame.gray.subarray(y * w, (y + 1) * w);
  const MUT = "var(--theme-foreground-muted,#888)";
  const RISE = "#5ac8fa", FALL = "#ffb454";
  const TOP = 10, H1 = 58, GAP = 18, H2 = 64;
  const yI = (v) => TOP + H1 - (v / 255) * H1;
  let mx = thr * 1.5;
  const diff = new Float32Array(w);
  for (let i = 1; i < w; i++) { diff[i] = sig[i] - sig[i - 1]; mx = Math.max(mx, Math.abs(diff[i])); }
  const base = TOP + H1 + GAP + H2 / 2;
  const yD = (v) => base - (v / mx) * (H2 / 2);

  const pts = (get) => {
    const a = [];
    for (let i = 0; i < w; i++) a.push(i + "," + get(i).toFixed(2));
    return a.join(" ");
  };
  let s = `<polyline points="${pts((i) => yI(sig[i]))}" fill="none" stroke="#9fb0c0" stroke-width="0.8"/>`;
  s += `<line x1="0" y1="${base}" x2="${w}" y2="${base}" stroke="${MUT}" stroke-width="0.5"/>`;
  for (const t of [thr, -thr])
    s += `<line x1="0" y1="${yD(t)}" x2="${w}" y2="${yD(t)}" stroke="#888" stroke-width="0.6" stroke-dasharray="4 4"/>`;
  s += `<polyline points="${pts((i) => yD(diff[i]))}" fill="none" stroke="#c8c8c8" stroke-width="0.7"/>`;
  for (const e of edges) {
    const c = e.s > 0 ? RISE : FALL;
    s += `<line x1="${e.x.toFixed(2)}" y1="${base - (e.s > 0 ? 40 : 0)}" x2="${e.x.toFixed(2)}"
      y2="${base + (e.s > 0 ? 0 : 40)}" stroke="${c}" stroke-width="1" stroke-opacity="0.75"/>`;
  }
  const lab = (x, ly, t) => `<text x="${x}" y="${ly}" font-family="ui-monospace,monospace"
    font-size="11" fill="${MUT}">${t}</text>`;
  s += lab(4, TOP + 10, "intensity along the row (0-255)");
  s += lab(4, TOP + H1 + GAP + 10, `first difference · dashed = ±${thr} threshold`);

  const el = htl.html`<div></div>`;
  // boxW, not w: the frame above reserves 30px on the right for its strip, and an edge
  // tick has to land under the pixel it came from.
  el.innerHTML = `<svg viewBox="0 0 ${rowWalkBox.boxW} ${base + H2 / 2 + 6}" style="display:block;width:100%;height:auto">${s}</svg>`;
  return htl.html`<figure style="${rowWalkBox.style}">
    ${el}
    <figcaption style="font:11px/1.5 ui-monospace,monospace;color:${MUT};margin-top:4px">
      <b>${edges.length}</b> edges out of ${w} pixels.
      <b style="color:${RISE}">Blue</b> rises, <b style="color:${FALL}">amber</b> falls — the sign is
      not decoration, it is what carries the bit at a mid tooth. Sub-pixel positions are worth
      the trouble: integer ones cost about 0.03 of cross ratio at small mark scales, which is past
      what the gate downstream tolerates.
    </figcaption>
  </figure>`;
};
const _sf5orsi = function _anonymous(md) {return (md`After edge detection, adjacent edges are grouped. Barcode geometry bounds the problem space.`);};
const _wlt2av = function _rowWalkGroups(rowWalkRow,rowWalkBox,htl) {
  // Stage B. findInvolution can only lock one mark per call, so the row is cut
  // first. Groups overlap on purpose: the segmenter cuts below the isolated
  // bound and offers the unsplit run alongside the halves, letting lattice
  // support settle it. That is why two brackets here can cover the same edges.
  const { edges, groups, w } = rowWalkRow;
  const MUT = "var(--theme-foreground-muted,#888)";
  const GRN = "#2fe08a", AMB = "#f5a524", DIM = "#8a8a8a";
  // Lane pitch was 26 against 11px type, which left 4px of clear space between a
  // label's descenders and the bracket under it -- reported as bunched on 2026-08-10.
  // 36 gives 14. LEAD is the gap from the edge ticks down to the first lane.
  const LANE = 36, TICK = 16, LEAD = 16, FONT = 11;
  const { boxW } = rowWalkBox;
  // Lanes are packed against the LABEL, not the bracket. A label is several times wider than the
  // span it describes, so packing by span alone put two of them on the same line overlapping.
  const CH = FONT * 0.6; // monospace advance
  for (const g of groups) {
    g.txt = g.why
      ? `${g.n} edges · dropped: ${g.why}`
      : g.sol.id != null
      ? `${g.n} edges · id ${g.sol.id} · support ${g.sol.sup} · d = ${g.sol.dHat.toFixed(1)}`
      : `${g.n} edges · located, no id · support ${g.sol.sup} · d = ${g.sol.dHat.toFixed(1)}`;
    const half = (g.txt.length * CH) / 2;
    g.cx = Math.min(w - half, Math.max(half, (g.x0 + g.x1) / 2));
    g.lx0 = Math.min(g.x0, g.cx - half);
    g.lx1 = Math.max(g.x1, g.cx + half);
  }
  const lanes = [];
  for (const g of groups) {
    let li = lanes.findIndex((L) => L.every((o) => g.lx0 > o.lx1 + 8 || g.lx1 < o.lx0 - 8));
    if (li < 0) { lanes.push([]); li = lanes.length - 1; }
    lanes[li].push(g);
    g.lane = li;
  }
  let s = "";
  for (const e of edges)
    s += `<line x1="${e.x.toFixed(2)}" y1="2" x2="${e.x.toFixed(2)}" y2="${TICK}"
      stroke="${e.s > 0 ? "#5ac8fa" : "#ffb454"}" stroke-width="1"/>`;
  for (const g of groups) {
    const y = TICK + LEAD + g.lane * LANE;
    const col = g.sol && g.sol.id != null ? GRN : g.survives ? AMB : DIM;
    const dash = g.survives ? "none" : "4 3";
    s += `<path d="M ${g.x0.toFixed(1)} ${y + 7} L ${g.x0.toFixed(1)} ${y} L ${g.x1.toFixed(1)} ${y} L ${g.x1.toFixed(1)} ${y + 7}"
      fill="none" stroke="${col}" stroke-width="1.6" stroke-dasharray="${dash}"/>`;
    s += `<text x="${g.cx.toFixed(1)}" y="${y - 4}" font-family="ui-monospace,monospace"
      font-size="${FONT}" fill="${col}" text-anchor="middle">${g.txt}</text>`;
  }
  const H = TICK + LEAD + lanes.length * LANE + 6;
  const el = htl.html`<div></div>`;
  el.innerHTML = `<svg viewBox="0 0 ${boxW} ${H}" style="display:block;width:100%;height:auto">${s}</svg>`;
  const locked = groups.filter((g) => g.survives).length;
  // Box, viewBox and cap all come from rowWalkBox, which the frame and the edge ticks
  // above also use -- see that cell for why they have to be the same.
  return htl.html`<figure style="${rowWalkBox.style}">
    ${el}
    <figcaption style="font:11px/1.5 ui-monospace,monospace;color:${MUT};margin-top:4px">
      ${groups.length} candidate groups, ${locked} of them lock.
      The split rule is the widest gap: inside one mark the widest gap is the dark disc, at most
      0.21 of the mark's own span, so anything wider separates marks rather than rings.
      The threshold sits <i>below</i> that bound on purpose, which sometimes cuts a real mark in
      half — so the unsplit run is offered as well, and brackets overlap.
      A wrong split loses a mark; a wrong merge just fails to lock and is discarded.
    </figcaption>
  </figure>`;
};
const _y9u9t68 = function _anonymous(md) {return (md`surving groups have a clear involution around a reflection point P, a very distinctive pattern stemming from the properties of an orientated set of concentric rings, that is preserved even if the scanline is off-center to the barcode.`);};
const _7ch6id = function _rowWalkLock(rowWalkRow,manLayout,htl) {
  // Stages C-E for each group that survived: the involution's mirror pairs and
  // its fixed point P, then those pairs' u values against the tooth lattice,
  // then the payload. r is recovered from the fit itself -- u = A r² + B with
  // B = -A d², so r̂ = sqrt(u/A + d²) -- and the point of the middle chart is
  // whether those r̂ land on teeth or between them.
  const { groups, y } = rowWalkRow;
  const L = manLayout;
  const MUT = "var(--theme-foreground-muted,#888)";
  const FG = "var(--theme-foreground,#ccc)";
  const RISE = "#5ac8fa", FALL = "#ffb454", GRN = "#2fe08a", BLU = "#5af";
  const locks = groups.filter((g) => g.survives);
  if (!locks.length)
    return htl.html`<div style="font:12px ui-monospace,monospace;color:${MUT};padding:8px 0">
      Nothing locks on row ${y}. Move the scan row to a green tick in the strip beside the frame.</div>`;

  const panel = (g) => {
    const iv = g.iv, sol = g.sol, d = sol.dHat, A = sol.A, B = -A * d * d;
    const pairs = iv.up.map((p) => {
      const rHat = Math.sqrt(Math.max(0, p.u / A + d * d));
      let k = 0;
      for (let i = 1; i < L.teeth.length; i++)
        if (Math.abs(L.teeth[i] - rHat) < Math.abs(L.teeth[k] - rHat)) k = i;
      return { ...p, rHat, k, err: (rHat - L.teeth[k]) / L.half };
    });
    const worst = Math.max(...pairs.map((p) => Math.abs(p.err)));

    const W = 690, H = 152;
    const pad = (g.x1 - g.x0) * 0.06 + 2;
    const lo = g.x0 - pad, hi = g.x1 + pad;
    const sx = (x) => 10 + ((x - lo) / (hi - lo)) * 310;
    const BASE = 118;
    let s = `<line x1="10" y1="${BASE}" x2="320" y2="${BASE}" stroke="${MUT}" stroke-width="0.5"/>`;
    for (let i = 0; i < iv.xs.length; i++)
      s += `<line x1="${sx(iv.xs[i]).toFixed(1)}" y1="${BASE - 5}" x2="${sx(iv.xs[i]).toFixed(1)}"
        y2="${BASE + 5}" stroke="${iv.ss[i] > 0 ? RISE : FALL}" stroke-width="1.1"/>`;
    pairs.forEach((p, i) => {
      const a = sx(iv.xs[p.e]), b2 = sx(iv.xs[p.f]);
      const h = 10 + (i / Math.max(1, pairs.length - 1)) * 78;
      s += `<path d="M ${a.toFixed(1)} ${BASE - 5} Q ${((a + b2) / 2).toFixed(1)} ${(BASE - 5 - h * 1.6).toFixed(1)}
        ${b2.toFixed(1)} ${BASE - 5}" fill="none" stroke="${GRN}" stroke-width="0.8" stroke-opacity="0.75"/>`;
    });
    if (iv.P > lo && iv.P < hi)
      s += `<line x1="${sx(iv.P).toFixed(1)}" y1="${BASE - 100}" x2="${sx(iv.P).toFixed(1)}"
        y2="${BASE + 10}" stroke="${BLU}" stroke-width="0.9" stroke-dasharray="3 3"/>
        <text x="${sx(iv.P).toFixed(1)}" y="${BASE + 20}" font-family="ui-monospace,monospace"
          font-size="9" fill="${BLU}" text-anchor="middle">P</text>`;
    s += `<text x="10" y="14" font-family="ui-monospace,monospace" font-size="9" fill="${MUT}">
      ${pairs.length} mirror pairs · ${iv.xs.length} edges · ${isFinite(iv.Q) ? `Q at ${iv.Q.toFixed(0)}` : "Q at infinity"}</text>`;

    const X0 = 390, X1 = 676, Y0 = 118, Y1 = 26;
    const xmax = L.R * L.R * 1.06;
    const ymax = Math.max(...pairs.map((p) => p.u)) * 1.12;
    const px = (v) => X0 + (v / xmax) * (X1 - X0);
    const py = (v) => Y0 - (v / ymax) * (Y0 - Y1);
    s += `<line x1="${X0}" y1="${Y0}" x2="${X1}" y2="${Y0}" stroke="${MUT}" stroke-width="0.5"/>`;
    s += `<line x1="${X0}" y1="${Y1 - 4}" x2="${X0}" y2="${Y0}" stroke="${MUT}" stroke-width="0.5"/>`;
    for (const t2 of L.teeth2)
      s += `<line x1="${px(t2).toFixed(1)}" y1="${Y0}" x2="${px(t2).toFixed(1)}" y2="${Y0 + 4}"
        stroke="${MUT}" stroke-width="0.8"/>`;
    s += `<line x1="${px(d * d).toFixed(1)}" y1="${py(0)}" x2="${px(xmax).toFixed(1)}"
      y2="${py(A * xmax + B).toFixed(1)}" stroke="${BLU}" stroke-width="1"/>`;
    for (const p of pairs)
      s += `<circle cx="${px(L.teeth2[p.k]).toFixed(1)}" cy="${py(p.u).toFixed(1)}" r="2.6"
        fill="none" stroke="${Math.abs(p.err) > 0.35 ? FALL : GRN}" stroke-width="1.2"/>`;
    s += `<text x="${X0}" y="14" font-family="ui-monospace,monospace" font-size="9" fill="${MUT}">
      u against the tooth lattice · ticks are the ${L.teeth2.length} teeth · worst miss ${worst.toFixed(2)} of a half-cell</text>`;

    const el = htl.html`<div></div>`;
    el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" style="display:block;width:100%;height:auto">${s}</svg>`;
    const bit = (v) => htl.html`<span style="display:inline-block;width:15px;text-align:center;
      border:1px solid ${v ? GRN : MUT};color:${v ? GRN : MUT};margin-right:2px">${v}</span>`;
    return htl.html`<figure style="margin:14px 0;padding-top:8px;border-top:1px solid #8884">
      ${el}
      <figcaption style="font:11px/1.6 ui-monospace,monospace;color:${MUT};margin-top:4px">
        ${sol.id != null
          ? htl.html`<b style="color:${FG}">id ${sol.id}</b> ${sol.bits.map(bit)} ·`
          : htl.html`<b style="color:${FALL}">no id emitted</b> ·`}
        support ${sol.sup} · d = ${d.toFixed(2)} · ${sol.nDirect} of ${L.nBits} bits read directly,
        ${sol.viol} violations, ${sol.checks} checks ·
        A = ${A.toExponential(3)}, B = ${B.toExponential(3)}
      </figcaption>
    </figure>`;
  };

  return htl.html`<div>${locks.map(panel)}</div>`;
};
const _7l3m08s = function _anonymous(md) {return (md`Once P is cracked the slope is a fit and the barcode can be fully read if all its edges are observable. It is probably true that *some* of the bits of the barcode can be decoded even if the scan is off-center, but not tried here.`);};
const _1gmmbqf = function _edges1Dsub() {return (function edges1Dsub(sig, thr = 6) {
  // Part II's edges1D with parabolic sub-pixel refinement of each gradient peak.
  // Integer edge positions cost ~0.03 of cross ratio at 2px-per-template-unit
  // mark scales — past the CR gate's tolerance — so the quarter-pixel accuracy
  // here is what lets small on-screen marks through detection at all.
  //
  // d is a BACKWARD difference, so d[i] is the gradient at i - 0.5 and the
  // parabola through |d[i-1..i+1]| has its vertex there too. Reporting the peak
  // at i put every edge half a pixel late along the scan. Because the 12 scan
  // directions of §4.7 span 180° and not 360°, that bias does not cancel: it
  // lands as (0, 4b/π) ≈ 0.64px on an intersected centre. The correction is a
  // translation of a whole row, so involutions, cross ratios and decoded bits
  // are untouched — the bank reads 85/112 either way — only positions move.
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
      idx.push({ x: i - 0.5 + Math.max(-0.5, Math.min(0.5, off)), s: Math.sign(v) });
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
  // Measured over a 36-case archive of printed-sheet captures, against 252
  // marks that should be read:
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
    // maxEdges triggers the SPLIT, groupCap is what emit refuses above, and they
    // were derived independently -- 2*(nT+1)+6 against +3. That left a dead band:
    // a node of 34..36 edges is not tooMany, so it never splits, and is over cap,
    // so it is never emitted. It was dropped whole, taking every mark inside it.
    // Observed on hexcase-5ivq-04 row 429: the 36-edge node at x 503..760 held
    // BOTH marks and no candidate group was offered for either. If a node cannot
    // be emitted, keep splitting it.
    //
    // Measured over the 16-frame bank, against the frozen per-frame truth:
    //   marks read 88/112 -> 88/112, wrong 0 -> 0, spurious 5 -> 5
    //   rows that lock at least one mark RISE on 11 of 16 frames (e.g. 90 -> 97)
    //   whole-frame time about 8% higher (16.2 -> 18.5ms on hexcase-5ivq-04)
    // So this buys redundancy per mark, not new marks, on this bank. It is
    // kept because a node vanishing whole is a correctness hole, not a tuning
    // choice: which marks it eats depends on where clutter lands in the row.
    const tooMany = n > Math.min(maxEdges, groupCap);
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
  // One scan row, any number of man marks: segment, then run the scanline
  // cascade per group. Overlapping locks are resolved by lattice support, so a group
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
const _sec_combine = function _anonymous(sec) {return (sec("combine"));};
const _4liiby = function _cascade_md(md) {return (md`Adjacent parrallel scanlines can be joined if their P are close

Rows arrive in ascending y, and each lock carries its P — the involution's fixed point, which is the mark's centre column for that row — together with the rim half-width it decoded at. A lock joins the nearest open cluster whose last row is no more than \`4 · stride\` above it and whose last P is within \`max(10px, 0.35 · wHalf)\`, taking the larger of the two half-widths; if none qualifies it opens a cluster of its own.

The join is on P and never on the decoded id. Geometry survives rows whose payload does not, and those rows are exactly what the ellipse fit needs, so grouping by id would throw away the evidence the pose is built from.

A cluster becomes a mark only if three independent things hold: at least 3 rows, an id with at least 2 votes that beats the runner-up 2:1, and a pose \`fitManPose\` calls plausible. Clutter reliably produces one of the three and rarely two. One id is then one piece of paper — if two clusters carry the same id the better-evidenced one keeps it, on rows, then vote margin, then coverage, and the other is demoted rather than handed to the homography as a second position for the same landmark.`);};
const _cmbdg = function _combineDiagram(manScene,manScanRows,scanRowsMan,clusterManRows,htl) {
  // The join rule, run rather than drawn: this is the shipping stage 1 and stage 2
  // over the same synthetic scene manSceneTest uses, so if the rule changes the
  // picture changes with it and nothing here has to be kept in step by hand.
  const stride = 6;
  const frame = { gray: manScene.gray, w: manScene.w, h: manScene.h };
  const rowResults = scanRowsMan(frame, manScanRows(frame, { stride }), { stride });
  const res = clusterManRows(rowResults, { stride, keepRows: true });

  const GRN = "#2fe08a", AMB = "#f5a524", DIM = "#8a8a8a", BLU = "#5ac8fa";
  const MUT = "var(--theme-foreground-muted,#888)";
  const txt = (x, y, str, o = {}) =>
    `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" font-family="ui-monospace,monospace"
      font-size="${o.size ?? 9}" fill="${o.fill ?? MUT}" text-anchor="${o.anchor ?? "middle"}">${str}</text>`;

  // The frame's own pixels behind the marks: a dot at a foot means nothing without
  // the mark it sits on.
  const cv = htl.html`<canvas width=${frame.w} height=${frame.h}>`;
  const cx2 = cv.getContext("2d");
  const im = cx2.createImageData(frame.w, frame.h);
  for (let i = 0; i < frame.gray.length; i++) {
    const g = frame.gray[i];
    im.data[4 * i] = g; im.data[4 * i + 1] = g; im.data[4 * i + 2] = g; im.data[4 * i + 3] = 255;
  }
  cx2.putImageData(im, 0, 0);
  const href = cv.toDataURL();

  const marks = [
    ...res.fused.map((f) => ({ ...f, col: GRN })),
    ...res.unidentified.map((f) => ({ ...f, col: AMB }))
  ].filter((m) => m.memberRows);
  const grouped = new Set();
  for (const m of marks) for (const r of m.memberRows) grouped.add(`${r.y}:${r.foot.toFixed(3)}`);

  // ---- A: the whole frame, every lock coloured by what it joined -----------
  let a = `<image href="${href}" x="0" y="0" width="${frame.w}" height="${frame.h}" opacity="0.85"/>`;
  for (const row of rowResults)
    for (const hit of row.hits)
      if (!grouped.has(`${row.y}:${hit.foot.toFixed(3)}`))
        // Locks that never reached three rows. They are the reason the minRows gate
        // exists and they are invisible in any picture drawn from the output alone.
        a += `<circle cx="${hit.foot.toFixed(1)}" cy="${row.y}" r="2.6" fill="none"
          stroke="${DIM}" stroke-width="1.1"/>`;
  for (const m of marks) {
    const pts = [...m.memberRows].sort((p, q) => p.y - q.y);
    a += `<polyline points="${pts.map((r) => `${r.foot.toFixed(1)},${r.y}`).join(" ")}"
      fill="none" stroke="${m.col}" stroke-width="1.2" stroke-opacity="0.7"/>`;
    for (const r of pts)
      a += `<circle cx="${r.foot.toFixed(1)}" cy="${r.y}" r="3" fill="${m.col}"/>`;
    if (m.a != null)
      a += `<ellipse cx="${m.xc.toFixed(1)}" cy="${m.yc.toFixed(1)}" rx="${m.a.toFixed(1)}"
        ry="${m.b.toFixed(1)}" fill="none" stroke="${m.col}" stroke-width="1.6"/>`;
    // 26 in a 960-wide viewBox that lands at about half that on screen. At 13 the
    // ids were there and unreadable, which is the same as not drawing them.
    a += txt(m.xc, m.yc - (m.b ?? 20) - 10, m.id != null ? `id ${m.id}` : "no id",
      { fill: m.col, size: 26 });
  }

  // ---- B: one mark, close up ----------------------------------------------
  const big = marks.filter((m) => m.a != null).sort((p, q) => q.memberRows.length - p.memberRows.length)[0];
  let b = "";
  let vbB = "0 0 10 10", tol = 0, PAD = 0;
  if (big) {
    const pts = [...big.memberRows].sort((p, q) => p.y - q.y);
    PAD = Math.max(big.a, big.b) * 1.55;
    const x0 = big.xc - PAD, y0 = big.yc - PAD, S = PAD * 2;
    vbB = `${x0.toFixed(1)} ${y0.toFixed(1)} ${S.toFixed(1)} ${S.toFixed(1)}`;
    tol = Math.max(10, 0.35 * big.wHalf);
    // Its own small raster, not the frame's. Reusing href would put a second copy of
    // the whole 960x540 PNG in the page -- and in the baked prerender, which is where
    // it costs: the export grew 307KB before this, for a thumbnail.
    const cw = Math.ceil(S), chh = Math.ceil(S), ox = Math.round(x0), oy = Math.round(y0);
    const bc = htl.html`<canvas width=${cw} height=${chh}>`;
    const bx = bc.getContext("2d");
    const bim = bx.createImageData(cw, chh);
    for (let yy = 0; yy < chh; yy++)
      for (let xx = 0; xx < cw; xx++) {
        const sx = ox + xx, sy = oy + yy;
        const g = sx >= 0 && sx < frame.w && sy >= 0 && sy < frame.h ? frame.gray[sy * frame.w + sx] : 255;
        const i = 4 * (yy * cw + xx);
        bim.data[i] = g; bim.data[i + 1] = g; bim.data[i + 2] = g; bim.data[i + 3] = 255;
      }
    bx.putImageData(bim, 0, 0);
    b += `<image href="${bc.toDataURL()}" x="${ox}" y="${oy}" width="${cw}" height="${chh}"/>`;
    for (const r of pts) {
      b += `<line x1="${x0}" y1="${r.y}" x2="${x0 + S}" y2="${r.y}" stroke="${BLU}"
        stroke-width="0.5" stroke-opacity="0.55"/>`;
      b += `<circle cx="${r.foot.toFixed(1)}" cy="${r.y}" r="${(S / 90).toFixed(2)}" fill="${big.col}"/>`;
    }
    // The rule itself, on the row it applies to: P within tol of the running centre,
    // and no more than 4 strides below the last row that joined.
    const last = pts[pts.length - 1];
    b += `<line x1="${(last.foot - tol).toFixed(1)}" y1="${last.y}" x2="${(last.foot + tol).toFixed(1)}"
      y2="${last.y}" stroke="${BLU}" stroke-width="${(S / 180).toFixed(2)}"/>`;
    for (const sx of [last.foot - tol, last.foot + tol])
      b += `<line x1="${sx.toFixed(1)}" y1="${(last.y - S / 40).toFixed(1)}" x2="${sx.toFixed(1)}"
        y2="${(last.y + S / 40).toFixed(1)}" stroke="${BLU}" stroke-width="${(S / 180).toFixed(2)}"/>`;
    b += txt(last.foot, last.y + S / 13, `± ${tol.toFixed(0)}px`, { fill: BLU, size: S / 22 });
    b += `<ellipse cx="${big.xc.toFixed(1)}" cy="${big.yc.toFixed(1)}" rx="${big.a.toFixed(1)}"
      ry="${big.b.toFixed(1)}" fill="none" stroke="${big.col}" stroke-width="${(S / 150).toFixed(2)}"/>`;
    b += `<line x1="${big.xc.toFixed(1)}" y1="${(big.yc - big.b).toFixed(1)}" x2="${big.xc.toFixed(1)}"
      y2="${(big.yc + big.b).toFixed(1)}" stroke="${big.col}" stroke-width="${(S / 300).toFixed(2)}"
      stroke-dasharray="${(S / 60).toFixed(1)} ${(S / 60).toFixed(1)}"/>`;
  }

  const svg = (vb, body) => {
    const d = htl.html`<div></div>`;
    d.innerHTML = `<svg viewBox="${vb}" style="display:block;width:100%;height:auto">${body}</svg>`;
    return d;
  };

  const dropped = res.rowHits - grouped.size;
  return htl.html`<figure style="margin:12px 0">
    <div style="display:flex;gap:14px;align-items:flex-start;flex-wrap:wrap">
      <div style="flex:3;min-width:320px">${svg("0 0 " + frame.w + " " + frame.h, a)}</div>
      <div style="flex:1;min-width:170px">${svg(vbB, b)}</div>
    </div>
    <figcaption style="font:11px/1.5 ui-monospace,monospace;color:${MUT};margin-top:6px">
      Stage 1 returned <b>${res.rowHits}</b> locks over ${Math.ceil(frame.h / stride)} rows at
      stride ${stride}. Stage 2 joined ${grouped.size} of them into
      <b style="color:${GRN}">${res.fused.length}</b> marks and
      <b style="color:${AMB}">${res.unidentified.filter((f) => f.memberRows).length}</b> that
      located but did not decode; <b style="color:${DIM}">${dropped}</b> never reached three
      rows and are dropped. The polyline is not part of the algorithm — it just shows which locks
      ended up in the same group. Right: the largest mark, one blue line per scanned row, its P as
      a dot, and the join window <b style="color:${BLU}">± ${tol.toFixed(0)}px</b> drawn on the last
      row to join. The ellipse is what the group becomes — fitted from the rows' own chord offsets,
      axis-aligned because a row scan recovers two half-axes and not a rotation.
    </figcaption>
  </figure>`;
};
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
    const out = {
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
    };
    // Which rows joined this cluster, opt-in. The combine diagram needs membership
    // back to draw it; every other caller would carry ~10 row objects per mark for
    // nothing, and this object is what the pool hands on. Off by default, so no
    // existing call site changes shape.
    if (opts.keepRows) out.memberRows = c.rows;
    all.push(out);
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
const _sec_ortho = function _anonymous(sec) {return (sec("ortho"));};
const _11vsmkp = function _axes_md(md) {
  // Coloured because the ranking is the point and six right-aligned numbers do not
  // show it. Three colours only, and each one means something: blue is the floor
  // nothing can beat, green is the rule that ships, grey is a rule that was tried.
  const ORACLE = "#5ac8fa", SHIP = "#2fe08a", DIM = "#8a8a8a";
  const rows = [
    ["oracle", 14.2, ORACLE],
    ["by vote margin", 18.3, SHIP],
    ["by scanline count", 25.5, DIM],
    ["by coverage", 34.6, DIM],
    ["always the column pass", 45.1, DIM],
    ["always the row pass", 49.9, DIM]
  ];
  const worst = Math.max(...rows.map((r) => r[1]));
  const table = `<table style="border-collapse:collapse;width:100%;max-width:520px;font:12px/1.6 ui-monospace,monospace">
    ${rows
      .map(
        ([rule, px, col]) => `<tr>
      <td style="padding:3px 12px 3px 0;white-space:nowrap;color:${col}">${rule}</td>
      <td style="padding:3px 12px 3px 0;text-align:right;color:${col};font-variant-numeric:tabular-nums">${px.toFixed(1)}px</td>
      <td style="width:100%;padding:3px 0"><div style="height:9px;border-radius:2px;background:${col};opacity:0.85;width:${((px / worst) * 100).toFixed(1)}%"></div></td>
    </tr>`
      )
      .join("")}
  </table>`;

  return md`A row scan measures a mark's x and extrapolates its y. The x comes from the involution fit along the scanline; the y only from adjacent scanlines. Scanning the same frame down its columns inverts that: measured y, extrapolated x.

Both passes cost two scans. For performance they run concurrently across the web worker pool, but often they disagree on the precise center.

**Which pass to believe?** Both passes decode the mark independently, and must agree on its id to be paired at all — so the id match is a precondition but doesn't say which pass was more precise. However, internally the quality of the fit is related to the internal vote margins which can be interpreted as the decode's own confidence. The merge takes the column pass's y unless the row pass decoded with a strictly larger margin.

Against an oracle that always picks whichever pass is closer to the frozen label, summed absolute y error over the 37 marks the bank fuses from both passes:

${table}

<span style="color:${ORACLE}">Blue</span> is the oracle — it reads the answer key, so it is a floor and not a rule. <span style="color:${SHIP}">Green</span> is what the merge does. Measured against the better fixed pass — always the column pass, 45.1px — the margin rule closes 87% of the distance to the floor. The two rules that look like proxies for the same thing close 63% (scanline count) and 34% (coverage).`;
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
    //
    // ...unless the decodes disagree about which pass READ it better. Both
    // passes decoded this mark independently and agreed on the id -- that
    // agreement is a precondition for being here, so it cannot separate them --
    // but their voteMargins differ, and the margin is the decode's own
    // confidence. A mark read with a wide margin was scanned cleanly enough
    // that where it says the mark is can be trusted, extrapolated or not.
    //
    // Held out over the 149 archive cases the bank does not contain: mean
    // residual 2.251 -> 2.194px, -0.057px/mark, 95% CI [-0.090, -0.025],
    // clustered bootstrap over cases p ~ 9e-4. 64 cases better, 35 worse.
    // Recall is untouched -- this only moves marks already found.
    //
    // Do NOT key this on the size of the disagreement instead: |dy| says the
    // passes disagree, not which is wrong, and at large dy the outcome is
    // bimodal. Measured, a monotone weight in |dy| is net worse -- it
    // down-weights the column pass in exactly the cases it was fixing.
    // Coverage is chance (18/37), as the gate above also found.
    //
    // axisPick: "col" restores the unconditional swap.
    const vr = r.voteMargin, vc = cols[m].voteMargin;
    const takeCol = opts.axisPick === "col" || !(vr > 0 && vc > 0) || vc >= vr;
    fused.push({
      ...r, xc: r.xc, yc: takeCol ? cols[m].yc : r.yc,
      a: r.a, b: cols[m].b ?? r.b,
      axis: "both", crossPx: +bd.toFixed(2), pickedCol: takeCol,
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
  // It is NOT a wash on real frames, though it read as one for a while. On the
  // 36-case archive of the time bothAxes never found an extra mark and its
  // median leave-one-out was worse than rows only. Re-measured over the 163
  // gradable cases the archive now holds, and with the merge fusing by decode
  // margin (§4.3) rather than always taking the column pass: 941 marks read
  // against 874, 89 missing against 155, misplaced and off-target unchanged,
  // and residual mean 2.423 -> 2.286px (-0.136px/mark, p ~ 2e-3 bootstrapped
  // over cases). Leave-one-out remains a wash. This scene is still a clean
  // demonstration of the mechanism rather than the evidence; the archive is
  // the evidence.
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
const _sec_pose = function _anonymous(sec) {return (sec("pose"));};
const _nb5x = function _anonymous(md,ref) {return (md`As the barcodes have labels the hexagonal grid of 7 barcodes can be trivially fitted allowing more spatial fusion for pose estimation in 6 DOF space.

A mark turned out to be worth more than the two numbers of its centre. The ring fit also returns \`A\`, the local plane-to-image map, and its metric \`AᵀA\` is three further constraints on the same eight-parameter homography — five per mark, so two marks over-determine a plane that four centres only just fix. That is ${ref('constrains')}. It runs in the offline labeller; the live pose below fuses centres alone.`);};
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
const _fhsc = function _fitHomographyScaled(fitHomography) {return (function fitHomographyScaled(pairs, opts = {}) {
  // A homography from centres AND apparent sizes.
  //
  // fitHomography uses two numbers per mark, the centre. The row scan measured
  // two more and they were thrown away: a and b, the half-extents of the imaged
  // ellipse along image x and y. A circle of radius R on the plane images to an
  // ellipse whose half-extents are R*|row 1 of J| and R*|row 2 of J|, for
  //
  //   J = (1/w) [[h11 - x*h31, h12 - x*h32],
  //              [h21 - y*h31, h22 - y*h32]]     w = h31*X + h32*Y + 1
  //
  // Checked against the frames rather than assumed: over the 9 bank frames that
  // read 6 or 7 marks, a/(R*|row1|) has median 0.996 and b/(R*|row2|) 1.003
  // (n=58 marks, p10-p90 about 0.90-1.05, measured 2026-08-10). So there is no
  // calibration factor to carry, and 5% is the noise SIG_REL below spends.
  //
  // Why bother. Four centres are 8 equations for 8 unknowns: the fit is exact,
  // rmsResidual is 0 by construction and measures nothing -- and if three of the
  // four marks are collinear it is not even determined. 12 of this target's 35
  // four-subsets are collinear (centre plus a diameter pair, by construction),
  // hexcase-5ivq-06 reads exactly one of them and its pose puts a mark 189px
  // from its label. Two scale equations per mark make four marks 16 equations,
  // and make the residual falsifiable for the first time.
  //
  // The scale terms are not linear in h, so this is Levenberg-Marquardt off a
  // linear start, not a closed form. Plain Gauss-Newton is not enough here for
  // the same reason it was not enough on the ring fit -- it needs the damping
  // and the step-acceptance test, and 4.7.2 records that dead end.
  if (!pairs || pairs.length < 4) return null;
  const SIG_POS = opts.sigmaPos ?? 1;         // px, about what a read centre is worth
  const SIG_REL = opts.sigmaScaleRel ?? 0.05; // the measured spread of a/b about the model
  // A mark whose row scan never got a width (why: "no-width") still contributes
  // its centre; it just adds no scale equation.
  const scaled = pairs.filter((p) => p.a > 0 && p.b > 0 && p.rMm > 0);

  const solveLin = (M, v, n) => {
    const A = M.map((row, i) => [...row, v[i]]);
    for (let c = 0; c < n; c++) {
      let p = c;
      for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
      // No epsilon bail: with LM damping the matrix is positive definite, and a
      // step from a badly conditioned solve fails the acceptance test below
      // rather than being silently believed.
      if (!(Math.abs(A[p][c]) > 0)) return null;
      [A[c], A[p]] = [A[p], A[c]];
      for (let r = 0; r < n; r++) {
        if (r === c) continue;
        const f = A[r][c] / A[c][c];
        for (let j = c; j <= n; j++) A[r][j] -= f * A[c][j];
      }
    }
    return A.map((row, i) => row[n] / row[i]);
  };

  const modelAt = (H, p) => {
    const w = H[6] * p.sx + H[7] * p.sy + 1;
    return { w, x: (H[0] * p.sx + H[1] * p.sy + H[2]) / w, y: (H[3] * p.sx + H[4] * p.sy + H[5]) / w };
  };
  const extents = (H, p, m) => {
    const j11 = (H[0] - m.x * H[6]) / m.w, j12 = (H[1] - m.x * H[7]) / m.w;
    const j21 = (H[3] - m.y * H[6]) / m.w, j22 = (H[4] - m.y * H[7]) / m.w;
    return [p.rMm * Math.hypot(j11, j12), p.rMm * Math.hypot(j21, j22)];
  };
  const residuals = (H) => {
    const r = [];
    for (const p of pairs) {
      const m = modelAt(H, p);
      // h33 = 1 puts w = 1 at the plane origin, so a negative w anywhere means
      // the sheet has folded through the camera. Reject rather than fit it.
      if (!(m.w > 0)) return null;
      r.push((m.x - p.dx) / SIG_POS, (m.y - p.dy) / SIG_POS);
    }
    for (const p of scaled) {
      const m = modelAt(H, p);
      const [ea, eb] = extents(H, p, m);
      r.push(soft((ea - p.a) / (SIG_REL * p.a)), soft((eb - p.b) / (SIG_REL * p.b)));
    }
    return r;
  };
  const costOf = (r) => (r ? r.reduce((s, v) => s + v * v, 0) : Infinity);

  // Soft L1 on the SCALE residuals only, past KNEE sigma. A centre is worth
  // believing; a width sometimes is not -- a mark clipped by the frame edge or
  // sitting on a fold reports a width no plane can explain, and squared error
  // lets that one number move the whole plane. Positions keep plain least
  // squares, which is what the drop loop above already handles.
  const KNEE = opts.knee ?? 2;
  const soft = opts.robust === false ? (v) => v : (v) => {
    const m = Math.abs(v);
    return m <= KNEE ? v : Math.sign(v) * Math.sqrt(2 * KNEE * m - KNEE * KNEE);
  };

  const affineStart = (ps) => {
    // Least squares over all of them, not three of them: this is the start that
    // survives the collinear case, where the DLT returns nonsense or nothing.
    const M = [[0, 0, 0], [0, 0, 0], [0, 0, 0]], vx = [0, 0, 0], vy = [0, 0, 0];
    for (const p of ps) {
      const u = [p.sx, p.sy, 1];
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) M[i][j] += u[i] * u[j];
        vx[i] += u[i] * p.dx;
        vy[i] += u[i] * p.dy;
      }
    }
    const ax = solveLin(M, vx, 3), ay = solveLin(M, vy, 3);
    if (!ax || !ay || !ax.every(Number.isFinite) || !ay.every(Number.isFinite)) return null;
    return [ax[0], ax[1], ax[2], ay[0], ay[1], ay[2], 0, 0, 1];
  };

  const N = 8;
  const refine = (H0) => {
    let H = H0.slice(0, 8);
    const full = (h) => [h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], 1];
    let r = residuals(full(H));
    if (!r) return null;
    let best = costOf(r);
    let lambda = 1e-3, done = false;
    for (let it = 0; it < (opts.maxIter ?? 60) && !done; it++) {
      // Numerical Jacobian. 8 columns times a few dozen residuals, at most 60
      // iterations, on at most 7 marks -- small enough that the algebra is not
      // worth the chance of getting it wrong.
      const J = [];
      for (let k = 0; k < N; k++) {
        const step = Math.max(1e-9, Math.abs(H[k]) * 1e-6);
        const Hp = H.slice();
        Hp[k] += step;
        const rp = residuals(full(Hp));
        if (!rp) { J.length = 0; break; }
        J.push(rp.map((v, i) => (v - r[i]) / step));
      }
      if (J.length < N) break;
      const A = Array.from({ length: N }, () => new Array(N).fill(0));
      const g = new Array(N).fill(0);
      for (let i = 0; i < N; i++) {
        for (let j = i; j < N; j++) {
          let s = 0;
          for (let t = 0; t < r.length; t++) s += J[i][t] * J[j][t];
          A[i][j] = s;
          A[j][i] = s;
        }
        let s = 0;
        for (let t = 0; t < r.length; t++) s += J[i][t] * r[t];
        g[i] = -s;
      }
      let stepped = false;
      for (let tries = 0; tries < 10 && !stepped; tries++) {
        const Ad = A.map((row, i) => { const z = row.slice(); z[i] *= 1 + lambda; return z; });
        const d = solveLin(Ad, g.slice(), N);
        if (d && d.every(Number.isFinite)) {
          const Hn = H.map((v, i) => v + d[i]);
          const rn = residuals(full(Hn));
          const cn = costOf(rn);
          if (cn < best) {
            done = (best - cn) / Math.max(best, 1e-12) < 1e-9;
            H = Hn;
            r = rn;
            best = cn;
            lambda = Math.max(lambda / 3, 1e-9);
            stepped = true;
          }
        }
        if (!stepped) lambda *= 4;
      }
      if (!stepped) break;
    }
    return { H: full(H), cost: best };
  };

  // Two starts, both cheap and direct, and keep whichever converges lower. The
  // DLT is the better start when the marks are in general position and is
  // undefined when they are not; the affine is always defined and is a worse
  // start under perspective. Racing them is cheaper than deciding which case
  // this is with a threshold on a condition number.
  const starts = [];
  const dlt = fitHomography(pairs);
  if (dlt) starts.push(dlt.H);
  const aff = affineStart(pairs);
  if (aff) starts.push(aff);
  let won = null;
  for (const s of starts) {
    const got = refine(s);
    if (got && Number.isFinite(got.cost) && (!won || got.cost < won.cost)) won = got;
  }
  if (!won) return dlt ? { ...dlt, scaled: false } : null;

  const H = won.H;
  const map = (sx, sy) => {
    const w = H[6] * sx + H[7] * sy + 1;
    return [(H[0] * sx + H[1] * sy + H[2]) / w, (H[3] * sx + H[4] * sy + H[5]) / w];
  };
  let ss = 0;
  for (const p of pairs) {
    const [px, py] = map(p.sx, p.sy);
    ss += (px - p.dx) ** 2 + (py - p.dy) ** 2;
  }
  let sa = 0;
  for (const p of scaled) {
    const m = modelAt(H, p);
    const [ea, eb] = extents(H, p, m);
    sa += (ea - p.a) ** 2 + (eb - p.b) ** 2;
  }
  return {
    H,
    map,
    mirrored: H[0] * H[4] - H[1] * H[3] < 0,
    // Position only, in px, because the caller's drop tolerance is written in
    // pixels and a chi-square would silently change what 3 * rmsResidual means.
    rmsResidual: Math.sqrt(ss / pairs.length),
    scaleRms: scaled.length ? Math.sqrt(sa / (2 * scaled.length)) : null,
    chi2: won.cost,
    pairs: pairs.length,
    nScale: scaled.length,
    scaled: scaled.length > 0
  };
});};
const _1qa5emd = function _fitHexPose(hexTarget,fitHomography,fitHomographyScaled) {return (function fitHexPose(res, opts = {}) {
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
    // a and b are the row scan's half-extents of the imaged ellipse; rMm turns
    // them into a constraint on the plane. Null when the scan got no width.
    return { sx: m.xMm, sy: m.yMm, dx: f.xc, dy: f.yc, id: f.id, a: f.a, b: f.b, rMm: T.radiusMm };
  };
  let pairs = onTarget.map(pairFor);
  let fit = null, dropped = [];
  const maxDrop = opts.maxDrop ?? 2;
  // Centres and widths by default. opts.useScale === false is the control arm:
  // it is what every number in this notebook before 2026-08-10 was measured on.
  const useScale = opts.useScale !== false;
  const fitPlane = (ps) => (useScale ? fitHomographyScaled(ps, opts.fit) : fitHomography(ps));
  if (pairs.length >= 4) {
    fit = fitPlane(pairs);
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
      fit = fitPlane(pairs);
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
const _sec_fast = function _anonymous(sec) {return (sec("fast"));};
const _1v692pi = function _anonymous(md) {return (md`Multiple scan lines can be processed in parrallel. In this notebook we farm out the work to web workers to make use of multi-core computation available on laptops and mobiles.`);};
const _10l0bax = function _poolSize(Inputs) {return (Inputs.range([0, 12], {
  step: 1,
  value: Math.min(6, Math.max(0, (navigator.hardwareConcurrency || 4) - 2)),
  label: "detection workers (0 = main thread)"
}));};
const _1xat3lz = (G, _) => G.input(_);
const _13ae255 = function _detectKernelSource(manLayout,edges1Dsub,findInvolution,solveMan,manRowGroups,detectRowMan,scanRowsMan,wasmOn,wasmKernelBytes,makeWasmDetectRow) {
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
  // 6.9KB of wasm is 9.2KB of base64 and 27KB through lit(), which would
  // serialise it a byte at a time as decimal
  const b64 = (u8) => {
    let s = "";
    for (let i = 0; i < u8.length; i += 4096)
      s += String.fromCharCode.apply(null, u8.subarray(i, i + 4096));
    return window.btoa(s);
  };

  return [
    // a worker has no window; nothing in stage 1 needs one, but a stray
    // performance.now() in a cell being edited should not take the pool down
    "var window = self;",
    emit("manLayout", manLayout),
    emit("edges1Dsub", edges1Dsub),
    emit("findInvolution", findInvolution),
    emit("solveMan", solveMan),
    emit("manRowGroups", manRowGroups),
    // detectRowMan is the one binding a worker can get from somewhere other
    // than a cell. The JS crosses over regardless, as detectRowManJS -- the
    // wasm glue falls back into it -- and the name scanRowsMan calls is bound
    // to whichever the toggle selects. scanRowsMan is unaware either way,
    // which is why the seam is here and not inside it.
    //
    // The binary travels as base64 in the kernel text rather than as a
    // separate message: the pool already rebuilds whenever this string
    // changes, so flipping the toggle rebuilds the workers, and there is no
    // second init handshake to lose a reply to.
    emit("detectRowManJS", detectRowMan),
    wasmOn && wasmKernelBytes
      ? [
          `const WASM_B64 = ${JSON.stringify(b64(wasmKernelBytes))};`,
          emit("makeWasmDetectRow", makeWasmDetectRow),
          "const detectRowMan = makeWasmDetectRow(",
          "  new WebAssembly.Module(Uint8Array.from(atob(WASM_B64), (c) => c.charCodeAt(0))),",
          "  detectRowManJS\n);"
        ].join("\n")
      : "const detectRowMan = detectRowManJS;",
    emit("scanRowsMan", scanRowsMan),
    // The worker keeps a full-size frame buffer and writes only the rows of
    // the job into it, so every row is addressed by absolute y exactly as on
    // the main thread. Rows arrive packed and transferred, which moves ~1KB
    // per row rather than the whole frame.
    `
const FRAMES = new Map();
self.onmessage = (e) => {
  const d = e.data;
  // The buffer is sized from the job, not from a separate init handshake. A
  // handshake needs a reply to pair with a request, and pairing it by a single
  // resolver slot loses one whenever two are in flight — which bothAxes makes
  // routine, since it alternates 960x720 and 720x960 every frame. A dropped
  // resolver is a promise that never settles, and one of those stops the whole
  // runtime, not just this pool.
  //
  // Keyed by dimensions rather than one slot, because bothAxes runs its two
  // passes CONCURRENTLY: a worker alternates 960x1280 and 1280x960 chunk by
  // chunk, and a single slot would reallocate and zero 1.2MB every time --
  // ~43MB a frame. Two buffers per worker instead of one costs ~7MB total.
  const key = d.w + "x" + d.h;
  let FRAME = FRAMES.get(key);
  if (!FRAME) {
    FRAME = { gray: new Uint8Array(d.w * d.h), w: d.w, h: d.h };
    FRAMES.set(key, FRAME);
  }
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
    // Both passes at once, not one after the other. They are independent --
    // different buffers, merged only at the end -- and a single pass leaves the
    // pool 48% idle (53.7ms of work in a 19ms wall across 6 workers). Almost
    // all of that idle is a worker asleep waiting to be handed its next chunk:
    // ~1.2ms per chunk, ~3.2ms for the first. With two streams in flight a
    // worker finishing a chunk usually finds the next message already queued
    // and never sleeps, so the second axis costs far less than the first.
    //
    // The transpose is hoisted out because it is main-thread work: doing it
    // here starts both streams together instead of stalling pass 2 behind it.
    // Requires the per-dimension frame cache in the worker kernel -- without it
    // the alternating job sizes reallocate the worker's buffer every chunk.
    const rotated = rotateFrame(frame, 1);
    const [rows, rot] = await Promise.all([
      analyzeFrameManAsync(frame, single),
      analyzeFrameManAsync(rotated, single)
    ]);
    return { ...mergeManAxes(rows, rot, frame, opts), ms: window.performance.now() - t0 };
  }
  const ys = manScanRows(frame, opts);
  const rowResults = opts.runRows
    ? await opts.runRows(frame, ys, opts)
    : scanRowsMan(frame, ys, opts);
  const res = clusterManRows(rowResults, opts);
  return { ...res, rowsTried: ys.length, ms: window.performance.now() - t0 };
});};
const _1hgoegm = async function _poolAgreement(whenVisible,invalidation,liveOn,detectPool,hexFrameBank,analyzeFrameMan,analyzeFrameManAsync) {
  // Since §4.6 this covers more than it did. The serial path is deliberately
  // left in JS, so with the wasm toggle on this compares serial-JS against
  // pooled-wasm end to end -- a whole-pipeline identity test sitting on top of
  // the per-row one wasmAgreement runs.
  //
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
  await whenVisible("poolAgreement", invalidation);
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
const _704z68 = function _poolReport(detectPool,poolAgreement,poolBenchmark,wasmOn,wasmAgreement,md) {
  const L = [];
  L.push(
    detectPool
      ? `${detectPool.size} worker(s) on ${navigator.hardwareConcurrency || "?"} logical cores` +
        (wasmOn ? ", row cascade in wasm" : ", row cascade in JS")
      : "pool off — stage 1 runs on this thread"
  );
  if (wasmAgreement) L.push("wasm: " + wasmAgreement.note);
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
const _sec_faster = function _anonymous(sec) {return (sec("faster"));};
const _wsmw0 = function _anonymous(md) {return (md`AI rewrote the web worker algorithms in Assembly Script and shipped a an in-browser Assembly Script Compiler. This makes it faster, and avoid the initial slow down you get with unoptimized Javascript when first run on a page.

The compiler is not a copy sitting in this page. It is imported as \`toolchain\` from [@tomlarkworthy/assembly-script](https://observablehq.com/@tomlarkworthy/assembly-script), which owns \`asc\`, \`assemblyscript\`, \`long\` and \`binaryen\`, and carries the slim binaryen build — a 2.0MB wasm binary plus a 50KB loader, against the 3.4MB SINGLE_FILE build this notebook used to embed, which is the same wasm escaped into a JS string. \`detectrow.as.ts\` below is the authority and it recompiles in the page, so editing the AssemblyScript here changes the accelerator the detector runs.`);};
const _wsmc1 = function _warmupCurve() {return ({
  // Two independent runs of scratch/rmbt/js-pool-curve.ts. Recorded rather
  // than measured live: it needs 160 uninterrupted passes over the bank with
  // two cold pool rebuilds, which is minutes of work and exactly the sort of
  // thing §4.5 refuses to do at boot.
  measured: "2026-08-04 · headless Chromium 136 · 14 cores, 6 workers · stride 4 · 16 bank frames",
  script: "scratch/rmbt/js-pool-curve.ts",
  runs: [
    { run: 1, impl: "JavaScript", ms: [13.23, 12.28, 11.2, 8.02, 7.43, 6.56, 4.48, 5.21, 4.44, 4.29, 4.78, 4.9, 4.46, 4.71, 4.8, 4.26, 4.61, 4.49, 4.39, 4.73, 4.51, 4.43, 4.13, 4.29, 4.5, 4.26, 4.33, 4.43, 4.51, 4.48, 3.59, 3.68, 3.73, 3.29, 2.88, 2.95, 2.89, 2.94, 2.88, 2.97] },
    { run: 1, impl: "WebAssembly", ms: [3.17, 1.88, 1.63, 1.56, 1.57, 1.57, 1.59, 1.57, 1.53, 1.54, 1.56, 1.56, 1.62, 1.82, 1.58, 1.57, 1.59, 1.59, 1.57, 1.58, 1.55, 1.61, 1.56, 1.57, 1.57, 1.57, 1.6, 1.56, 1.54, 1.55, 1.52, 1.57, 1.57, 1.68, 1.57, 1.58, 1.59, 1.53, 1.55, 1.59] },
    { run: 2, impl: "JavaScript", ms: [12.93, 7.86, 7.68, 7.48, 7.48, 7.62, 7.89, 7.41, 7.82, 7.99, 7.59, 7.12, 7.05, 7.05, 6.83, 6.75, 6.77, 6.72, 6.44, 6.59, 6.91, 6.88, 6.85, 6.52, 5.86, 5.18, 4.49, 4.52, 4.7, 4.55, 4.38, 4.61, 4.58, 4.46, 4.35, 4.61, 4.73, 3.8, 3.85, 3.71] },
    { run: 2, impl: "WebAssembly", ms: [2.98, 1.93, 1.62, 1.61, 1.56, 1.53, 1.57, 1.6, 1.53, 1.53, 1.59, 1.57, 1.57, 1.56, 1.65, 1.57, 1.56, 1.57, 1.61, 1.57, 1.54, 1.62, 1.57, 1.6, 1.55, 1.57, 1.56, 1.64, 1.61, 1.63, 1.57, 1.6, 1.55, 1.62, 2.1, 1.69, 1.6, 1.59, 1.63, 1.62] }
  ]
})};
const _wsmc2 = function _warmupCurveChart(warmupCurve,Plot,htl) {
  const FRAMES = 16;
  const rows = warmupCurve.runs.flatMap((r) =>
    r.ms.map((ms, i) => ({ pass: i + 1, frames: (i + 1) * FRAMES, ms, impl: r.impl, series: r.impl + " " + r.run }))
  );
  const last = (impl) => {
    const v = rows.filter((d) => d.impl === impl && d.pass > 35).map((d) => d.ms).sort((a, b) => a - b);
    return v[v.length >> 1];
  };
  const chart = Plot.plot({
    width: 720, height: 340,
    marginLeft: 54, marginBottom: 44, marginRight: 118,
    x: { label: "frames scanned since the pool was built →", grid: true, domain: [FRAMES, 40 * FRAMES] },
    y: { label: "↑ ms per frame", domain: [0, 14], grid: true },
    color: {
      domain: ["JavaScript", "WebAssembly"],
      range: ["#c4463a", "#2b6cb0"],
      legend: true
    },
    marks: [
      Plot.ruleY([0]),
      // the wasm floor, drawn across the whole plot so the JS curve can be
      // read against the thing it is trying to reach
      Plot.ruleY([last("WebAssembly")], { stroke: "#2b6cb0", strokeDasharray: "3,4", strokeOpacity: 0.55 }),
      Plot.line(rows, { x: "frames", y: "ms", stroke: "impl", z: "series", strokeWidth: 1.7, curve: "monotone-x" }),
      Plot.dot(rows.filter((d) => d.pass === 1), { x: "frames", y: "ms", fill: "impl", r: 3.5 }),
      Plot.text(rows.filter((d) => d.pass === 40), {
        x: "frames", y: "ms", text: (d) => d.ms.toFixed(1) + " ms",
        dx: 9, textAnchor: "start", fontSize: 11, fill: "impl"
      }),
      Plot.text([{ x: 3 * FRAMES, y: 13.4, t: "cold" }], { x: "x", y: "y", text: "t", fontSize: 11, fill: "#777" })
    ]
  });
  return htl.html`<figure style="margin:0 0 1rem 0">
  ${chart}
  <figcaption style="font:12px/1.6 var(--sans-serif); color:#555; max-width:700px">
    <b>Warm-up, pooled, two independent runs of each implementation.</b>
    One pass is the 16-frame bank; a fresh pool is built at frame 0 and then
    left alone. JavaScript starts around 13 ms/frame and descends a
    <i>staircase</i> — the plateaus are V8 promoting the kernel through its
    compiler tiers — taking several hundred frames to approach its floor, and
    the two runs disagree about where that floor is (2.9 vs 3.7 ms). At 30fps
    the flat part of the red curve is ten to twenty seconds away.
    WebAssembly is at its floor by the third pass in both runs and stays there.
    ${warmupCurve.measured}.
  </figcaption>
</figure>`;
};
const _rv4ces = function _wasmShippedBytes(FileAttachment) {return (
  // The binary as it was last saved into this file. It is not what runs -- the kernel is compiled
  // from detectrow.as.ts at boot -- it is what that compile is checked against, and the fallback
  // if the compiler is not there.
  FileAttachment("detectrow.wasm").arrayBuffer().then((b) => new Uint8Array(b))
)};
const _wsmb1 = function _wasmKernelBytes(wasmBuild,wasmShippedBytes) {return (
  // What the detector actually runs: this page's compile of detectrow.as.ts, or the saved binary
  // if that compile failed.
  wasmBuild.bytes || wasmShippedBytes
)};
const _wsmb2 = function _makeWasmDetectRow(manLayout) {return (function makeWasmDetectRow(mod, jsDetectRow) {
  // Bind a compiled detectrow.wasm to a detectRowMan-shaped function.
  //
  // The binary is an accelerator, never an authority. It is a port of five
  // cells (manRowGroups, findInvolution, solveMan, detectRowMan and the layout
  // they read), and everything the port does NOT model routes back to those
  // cells rather than being approximated here: a caller-supplied layout, the
  // three group knobs the port bakes in as literals, a row wider than the
  // fixed input buffer, or a capacity overflow inside. The JS is the reference
  // and stays reachable at every call.
  //
  // Takes a WebAssembly.Module, not bytes, because the caller decides how to
  // compile it: a worker can construct one synchronously, the main thread
  // cannot above 4KB and has to await WebAssembly.compile.
  let ex;
  try {
    ex = new window.WebAssembly.Instance(mod, {
      env: { abort: () => { throw new Error("wasm abort"); } }
    }).exports;
  } catch (e) {
    return jsDetectRow;
  }
  const buf = ex.memory.buffer;
  const XS = new Float64Array(buf, ex.xsPtr(), 512);
  const SS = new Int32Array(buf, ex.ssPtr(), 512);
  const FOOT = new Float64Array(buf, ex.footPtr(), 64);
  const D = new Float64Array(buf, ex.dPtr(), 64);
  const SUP = new Int32Array(buf, ex.supPtr(), 64);
  const WH = new Float64Array(buf, ex.wHalfPtr(), 64);
  const ID = new Int32Array(buf, ex.idPtr(), 64);
  const X0 = new Float64Array(buf, ex.x0Ptr(), 64);
  const X1 = new Float64Array(buf, ex.x1Ptr(), 64);
  // The port bakes manLayout in as literals, so a caller-supplied layout has
  // to be checked rather than refused: hexRigOpts passes layout on EVERY call,
  // and it is manLayout. Refusing it outright sent every row to JS while the
  // toggle still said wasm -- and the agreement check passed, because it was
  // comparing JS to JS. Hence fn.ran below: a gate nothing can satisfy without
  // executing the binary.
  const sameLayout = (L) => {
    if (!L || L === manLayout) return true;
    if (L.nBits !== manLayout.nBits || L.nT !== manLayout.nT ||
        L.R !== manLayout.R || L.half !== manLayout.half) return false;
    const t = L.teeth, u = manLayout.teeth;
    if (!t || t.length !== u.length) return false;
    for (let i = 0; i < t.length; i++) if (t[i] !== u[i]) return false;
    const g = L.guaranteed, h = manLayout.guaranteed;
    if (!g || g.length !== h.length) return false;
    for (let i = 0; i < g.length; i++) if (g[i] !== h[i]) return false;
    return true;
  };
  const fn = function detectRowMan(scanEdges, opts = {}) {
    if (opts.groupCap !== undefined || opts.maxEdges !== undefined ||
        opts.offerWhole !== undefined || !sameLayout(opts.layout)) {
      fn.fellBack++;
      return jsDetectRow(scanEdges, opts);
    }
    const n = scanEdges.length;
    if (n < 6) return [];
    if (n > 512) { fn.fellBack++; return jsDetectRow(scanEdges, opts); }
    for (let i = 0; i < n; i++) {
      const e = scanEdges[i];
      XS[i] = typeof e === "number" ? e : e.x;
      SS[i] = typeof e === "number" ? 1 : e.s;
    }
    const k = ex.detectRow(
      n,
      opts.tolPx ?? 1.1, opts.minInliers ?? 6, opts.gapFrac ?? 0.2,
      opts.minEdges ?? 6, opts.minSpan ?? 14, opts.minDirect ?? 5
    );
    // Every buffer inside is fixed-size, so a scene this has not seen can run
    // out of one. It is reported and handed back to JS, not clamped: a clamped
    // answer would be a quietly different detector, which is the failure mode
    // that is hardest to notice and hardest to explain later.
    if (ex.overflowed()) { fn.fellBack++; return jsDetectRow(scanEdges, opts); }
    fn.ran++;
    const out = new Array(k);
    for (let h = 0; h < k; h++)
      out[h] = {
        foot: FOOT[h], d: D[h], sup: SUP[h], wHalf: WH[h],
        id: ID[h] < 0 ? null : ID[h], x0: X0[h], x1: X1[h]
      };
    return out;
  };
  fn.fellBack = 0;
  fn.ran = 0;
  fn.wasm = true;
  return fn;
})};
const _wsmb3 = async function _wasmDetectRowMan(wasmKernelBytes,makeWasmDetectRow,detectRowMan) {
  // Main-thread instance, for the serial path and for wasmAgreement. Async
  // because synchronous compilation is capped at 4KB off-worker and this is
  // 6.9KB.
  return makeWasmDetectRow(await window.WebAssembly.compile(wasmKernelBytes), detectRowMan);
};
const _wsmb4 = function _viewof_wasmOn(Inputs) {return (Inputs.toggle({
  label: "wasm row cascade",
  value: true
}));};
const _wsmb5 = (G, _) => G.input(_);
const _wsmb6 = async function _wasmAgreement(whenVisible,invalidation,liveOn,wasmOn,wasmDetectRowMan,detectRowMan,hexFrameBank,manScanRows,edges1Dsub,hexRigOpts) {
  // The binary and the cells, on every row of all 16 bank frames, required to
  // be identical rather than close.
  //
  // This is the only thing tying detectrow.wasm to the source it claims to
  // implement. A second implementation of 284 lines of geometry cannot be held
  // together by reading it, and "the marks still show up" is not a check --
  // the detector is a vote over many rows, so a port could disagree on a
  // tenth of them and still put a box in the right place.
  //
  // Deferred while the camera is live for the same reason poolAgreement is:
  // it is a second of work that would queue ahead of the live frames.
  await whenVisible("wasmAgreement", invalidation);
  if (liveOn)
    return { deferred: true, note: "deferred while the camera is live. Turn the camera off to run it." };
  const opts = { ...hexRigOpts, bothAxes: false };
  const thr = opts.edgeThreshold ?? 12;
  let rows = 0, hits = 0, bad = 0, fellBack = 0;
  const worst = [];
  const eq = (a, b) => a === b || (Math.abs(a - b) <= 1e-12 * Math.max(1, Math.abs(a), Math.abs(b)));
  for (const spec of hexFrameBank) {
    const frame = spec.frame;
    for (const y of manScanRows(frame, opts)) {
      const se = edges1Dsub(frame.gray.subarray(y * frame.w, (y + 1) * frame.w), thr);
      const a = detectRowMan(se, opts);
      const b = wasmDetectRowMan(se, opts);
      rows++;
      hits += a.length;
      if (a.length !== b.length) {
        bad++;
        if (worst.length < 5) worst.push(`${spec.name ?? "frame"} y=${y}: ${a.length} hits -> ${b.length}`);
        continue;
      }
      for (let i = 0; i < a.length; i++) {
        const p = a[i], q = b[i];
        if (p.id === q.id && p.sup === q.sup && eq(p.foot, q.foot) && eq(p.d, q.d) &&
            eq(p.wHalf, q.wHalf) && eq(p.x0, q.x0) && eq(p.x1, q.x1)) continue;
        bad++;
        if (worst.length < 5) worst.push(`${spec.name ?? "frame"} y=${y} hit ${i}: id ${p.id}/${q.id} foot ${p.foot}/${q.foot}`);
        break;
      }
    }
  }
  fellBack = wasmDetectRowMan.fellBack ?? 0;
  const ran = wasmDetectRowMan.ran ?? 0;
  // Ran-zero is a FAILURE, not a pass. Every bail routes to the JS function,
  // so a binding that refuses every call answers correctly on all 3720 rows
  // and reports perfect agreement while the binary sits unexecuted. That is
  // exactly what happened when the layout check was a refusal rather than a
  // comparison, and nothing in the output said so.
  return {
    on: !!wasmOn, rows, hits, bad, ran, fellBack, worst,
    note: !ran
      ? `NOT RUNNING — every one of ${rows} rows was handed back to JS, so this proves nothing`
      : bad
        ? `DISAGREES on ${bad} of ${rows} rows`
        : `identical to the cells on all ${rows} rows (${hits} hits, ${ran} in wasm)` +
          (fellBack ? `, ${fellBack} handed back to JS` : "")
  };
};
const _wsmr1 = function _wasmSourceText(FileAttachment) {return (
  // The AssemblyScript the kernel is compiled from. It is the source of truth for the accelerator:
  // edit it and the binary the detector runs is rebuilt from it.
  FileAttachment("detectrow.as.ts").text()
)};
const _wsmr2 = function _wasmRebuildGo(Inputs) {return (Inputs.button("recompile detectrow.as.ts", {
  label: "after editing the source"
}));};
const _wsmr3 = (G, _) => G.input(_);
const _wsmr4 = async function _wasmBuild(wasmRebuildGo,toolchain,wasmSourceText,wasmShippedBytes) {
  // detectrow.as.ts is the authority, not detectrow.wasm. Compiling it here, at boot, is what
  // makes the source editable: change the AssemblyScript in this page and the accelerator the
  // detector runs -- and the binary baked into an exported kernel -- change with it. The
  // alternative is asking a reader to build a .wasm elsewhere and paste the bytes back in.
  wasmRebuildGo; // the button recompiles without a reload

  // The compiler is @tomlarkworthy/assembly-script's, not a second copy here. That notebook
  // already owns asc, assemblyscript, long and binaryen, and it uses the SLIM binaryen build --
  // a 2.0MB wasm binary plus a 50KB loader, against the 3.4MB SINGLE_FILE build this notebook
  // used to carry, which is the same wasm escaped into a JS string.
  const asc = toolchain.asc;
  const out = {};
  const t1 = window.performance.now();
  let error = null, stderr = "";
  try {
    const r = await asc.main(
      ["main.ts", "--outFile", "main.wasm", "-O3", "--runtime", "stub"],
      {
        readFile: (n) => (n === "main.ts" ? wasmSourceText : null),
        writeFile: (n, d) => { out[n] = d; },
        listFiles: () => []
      }
    );
    error = r.error ? String(r.error.message || r.error) : null;
    stderr = String(r.stderr && r.stderr.toString ? r.stderr.toString() : "").slice(0, 2000);
  } catch (e) {
    error = String((e && e.message) || e);
  }
  const built = out["main.wasm"] ? new Uint8Array(out["main.wasm"]) : null;
  // Same source, same compiler, same flags, so a difference against the saved binary means the two
  // have drifted apart, and the report says so.
  let same = null, firstDiff = -1;
  if (built && wasmShippedBytes) {
    same = built.length === wasmShippedBytes.length;
    if (same)
      for (let i = 0; i < built.length; i++)
        if (built[i] !== wasmShippedBytes[i]) { same = false; firstDiff = i; break; }
  }
  return {
    bytes: built, error, stderr,
    version: asc.version,
    compileMs: Math.round(window.performance.now() - t1),
    builtBytes: built ? built.length : 0,
    shippedBytes: wasmShippedBytes ? wasmShippedBytes.length : 0,
    identical: same, firstDiff
  };
};
const _wsmr5 = function _wasmRebuildReport(wasmBuild,md) {
  const w = wasmBuild;
  if (w.error)
    return md`**Compile failed** — running the binary saved in this file instead. \`${w.error}\`

~~~
${w.stderr || "(no stderr)"}
~~~`;
  return md`asc ${w.version} · compiled in ${w.compileMs}ms

${w.identical
  ? `**Byte for byte identical** to the binary saved in this file — ${w.builtBytes} bytes.`
  : `**Differs from the binary saved in this file** — built ${w.builtBytes} bytes against
     ${w.shippedBytes} saved${w.firstDiff >= 0 ? `, first difference at byte ${w.firstDiff}` : ""}.
     The compile above is what is running; the saved binary is only the fallback.`}`;
};
const _sec_relabel = function _anonymous(sec) {return (sec("relabel"));};
const _whdwrzx = function _anonymous(md,ref) {return (md`The bank's reference labels (${ref('labels')}) are not the tracker's own output. They come from a slower offline procedure, stride 1 instead of 4, a sweep over the edge threshold, and a sub-pixel refinement stage. ${ref('score')} then scores the shipping cascade against them.

1. **The edge threshold is chosen per frame**.
2. **Every centre is refined on its own ring lattice**
3. **The plane is fitted by exhaustive RANSAC over the 4-subsets**,
4. **The plane may flag a measurement, but not replace one.**`);};
const _io8z64 = function _resampleAlong() {return (function resampleAlong(frame, deg) {
  // Resample the frame so that the direction u = (cos deg, sin deg) becomes the scan
  // direction. Bilinear, clamped at the border so the padding carries no edges of its
  // own -- a hard margin would read as a mark boundary on every row that crosses it.
  // Comes back with the one scalar the fusion needs: a centre at rotated x = xc
  // satisfies p.u = xc + off in the ORIGINAL image, so nothing has to be un-rotated.
  // The perpendicular (vx, vy, offY) is carried too, because §4.7's refinement wants
  // whole POINTS back in the original frame and not just a coordinate along u:
  // p = (X + off) u + (Y + offY) v.
  const th = (deg * Math.PI) / 180, c = Math.cos(th), s = Math.sin(th);
  const ux = c, uy = s, vx = -s, vy = c;
  const gray = frame.gray, w = frame.w, h = frame.h;
  let X0 = Infinity, X1 = -Infinity, Y0 = Infinity, Y1 = -Infinity;
  for (const [x, y] of [[0, 0], [w - 1, 0], [0, h - 1], [w - 1, h - 1]]) {
    const X = x * ux + y * uy, Y = x * vx + y * vy;
    if (X < X0) X0 = X;
    if (X > X1) X1 = X;
    if (Y < Y0) Y0 = Y;
    if (Y > Y1) Y1 = Y;
  }
  const nw = Math.ceil(X1 - X0) + 1, nh = Math.ceil(Y1 - Y0) + 1;
  const out = new Uint8Array(nw * nh);
  for (let Y = 0; Y < nh; Y++) {
    const Yy = Y + Y0;
    for (let X = 0; X < nw; X++) {
      const Xx = X + X0;
      let px = Xx * ux + Yy * vx, py = Xx * uy + Yy * vy;
      if (px < 0) px = 0; else if (px > w - 1) px = w - 1;
      if (py < 0) py = 0; else if (py > h - 1) py = h - 1;
      const x0 = px | 0, y0 = py | 0;
      const x1 = x0 + 1 < w ? x0 + 1 : x0, y1 = y0 + 1 < h ? y0 + 1 : y0;
      const fx = px - x0, fy = py - y0;
      const a = gray[y0 * w + x0], b = gray[y0 * w + x1];
      const cc = gray[y1 * w + x0], d = gray[y1 * w + x1];
      const top = a + (b - a) * fx, bot = cc + (d - cc) * fx;
      out[Y * nw + X] = (top + (bot - top) * fy + 0.5) | 0;
    }
  }
  return { gray: out, w: nw, h: nh, ux, uy, vx, vy, off: X0, offY: Y0, deg };
});};
const _11kt00d = function _denseRotations(resampleAlong) {return (function denseRotations(frame, nDir = 12) {
  // nDir evenly spaced directions over 180 degrees -- a line has no head or tail, so
  // deg and deg+180 are the same measurement. deg 0 is the frame itself: resampling it
  // would cost a bilinear pass to reproduce what is already there.
  return Array.from({ length: nDir }, (_, i) => (i * 180) / nDir).map((deg) =>
    deg === 0
      ? { ...frame, ux: 1, uy: 0, vx: 0, vy: 1, off: 0, offY: 0, deg: 0 }
      : resampleAlong(frame, deg));
});};
const _tdcvy7 = function _intersectLines() {return (function intersectLines(lines) {
  // K lines { p : p.u = c } through one centre, by weighted least squares, then two
  // Huber passes so one bad direction cannot drag the point. Two lines always meet
  // somewhere, which is why a mark seen in only two directions is not yet checked.
  const solve = (wts) => {
    let a11 = 0, a12 = 0, a22 = 0, b1 = 0, b2 = 0;
    lines.forEach((L, i) => {
      const wI = wts[i];
      a11 += wI * L.ux * L.ux; a12 += wI * L.ux * L.uy; a22 += wI * L.uy * L.uy;
      b1 += wI * L.c * L.ux; b2 += wI * L.c * L.uy;
    });
    const det = a11 * a22 - a12 * a12;
    if (Math.abs(det) < 1e-9) return null;
    return { x: (b1 * a22 - b2 * a12) / det, y: (a11 * b2 - a12 * b1) / det };
  };
  let wts = lines.map((L) => L.w ?? 1);
  let p = solve(wts);
  if (!p) return null;
  for (let it = 0; it < 2; it++) {
    const res = lines.map((L) => Math.abs(p.x * L.ux + p.y * L.uy - L.c));
    const srt = res.slice().sort((x, y) => x - y);
    const mad = Math.max(0.5, srt[srt.length >> 1]);
    wts = lines.map((L, i) => {
      const r = res[i] / (1.5 * mad);
      return (L.w ?? 1) * (r <= 1 ? 1 : 1 / r);
    });
    const q = solve(wts);
    if (!q) break;
    p = q;
  }
  const res = lines.map((L) => p.x * L.ux + p.y * L.uy - L.c);
  const rms = Math.sqrt(res.reduce((s, r) => s + r * r, 0) / res.length);
  return { x: p.x, y: p.y, rms, n: lines.length };
});};
const _f2jo8h = function _denseLabel(denseRotations,clusterManRows,scanRowsMan,manScanRows,intersectLines) {return (function denseLabel(frame, opts = {}) {
  // One frame -> one position per id, from nDir directions at the given stride.
  //
  // Only the MEASURED coordinate of each direction is used. clusterManRows returns xc
  // as the median of that direction's per-row involution feet -- observed on every row
  // that locks -- and yc from the V-fit extrapolating |d| to 0, which no row ever
  // observes (§4.3: 23px of spread against 64px). xc alone is the line p.u = c in the
  // original image, and nDir of those lines through one centre is an intersection, not
  // an arbitration. mergeManAxes has nothing left to do here.
  //
  // rots is accepted so a threshold sweep resamples once rather than once per threshold.
  const nDir = opts.nDir ?? 12;
  const stride = opts.stride ?? 1;
  const rots = opts.rots ?? denseRotations(frame, nDir);
  const t0 = window.performance.now();
  const byId = new Map();
  const perDir = [];
  for (const R of rots) {
    const scanOpts = { ...opts.detector, stride, bothAxes: false };
    const res = clusterManRows(scanRowsMan(R, manScanRows(R, scanOpts), scanOpts), scanOpts);
    perDir.push({ deg: R.deg, read: res.fused.map((f) => f.id) });
    for (const f of res.fused) {
      if (f.id == null) continue;
      if (!byId.has(f.id)) byId.set(f.id, []);
      byId.get(f.id).push({ ux: R.ux, uy: R.uy, c: f.xc + R.off, a: f.a, deg: R.deg, rows: f.rows });
    }
  }
  const marks = [];
  for (const [id, lines] of byId) {
    const dirs = new Set(lines.map((l) => l.deg)).size;
    const p = dirs >= 2 ? intersectLines(lines) : null;
    const as = lines.map((l) => l.a).filter((x) => x != null).sort((x, y) => x - y);
    marks.push({
      id, dirs,
      x: p ? +p.x.toFixed(2) : null,
      y: p ? +p.y.toFixed(2) : null,
      rms: p ? +p.rms.toFixed(2) : null,
      radiusPx: as.length ? +as[as.length >> 1].toFixed(1) : null,
      rowsTotal: lines.reduce((s, l) => s + l.rows, 0)
    });
  }
  return {
    marks: marks.sort((a, b) => a.id - b.id),
    perDir,
    ms: Math.round(window.performance.now() - t0)
  };
});};
const _sec_lattice = function _anonymous(sec) {return (sec("lattice"));};
const _1k65scp = function _anonymous(md) {return (md`The line intersection above keeps one number per scan direction — the median involution foot — and throws away every edge crossing that produced it. But \`solveMan\` has already assigned each involution pair a tooth, so each crossing is a point lying at a radius the barcode itself names. One mark yields three to twenty thousand of them.

Fit the whole set at once:

~~~
|A (p − c)| = teeth[t] + δ · polarity
~~~

\`c\` is the centre in the image, \`A\` the inverse of the local plane-to-image map, and δ a single ink-bleed offset. Seven parameters against thousands of observations, where the line intersection had twelve numbers against twelve.

**δ is identifiable, not degenerate with scale.** Thickening the ink moves a dark→light boundary outward and a light→dark boundary inward. The involution pairs require \`ss[f] === -ss[e]\`, so both edges of a pair take the same signed shift, and consecutive teeth alternate polarity — a warp of the radial lattice that no choice of \`A\` can absorb. On clean rendered frames it comes back at 0.002mm. Dilate the ink by 0.6px and it comes back at 0.246mm and halves the residual scatter. Across the bank it sits near −0.06mm, so the printed ink is some tens of microns thinner than nominal.

**An affine \`A\` is not enough.** Under a homography concentric circles map to ellipses that are not concentric: the imaged ellipse of a ring drifts toward the vanishing point as the ring grows. An affine fit has no term for that, so on a tilted sheet it carries a bias no quantity of observations removes. Two perspective parameters divide the drift out, solved as a second stage off the converged affine fit — from a cold start that pair is the weakest-constrained direction in the problem and finds other minima.

Measured against a renderer's exact centres, adding this stage takes the relabelling from a median error of 0.118px to **0.010px**, and its worst case from 0.721px to 0.027px.`);};
const _rlatd = async function _ringLatticeDiagram(whenVisible,invalidation,manScene,manLayout,denseRotations,ringObservations,htl) {
  // What "the whole set" actually is, drawn from the set itself. ringObservations
  // is the shipping function, run here over a crop of the same synthetic scene the
  // detector is tested on, so the dots are the observations the fit consumes and
  // not an artist's impression of them.
  //
  // A crop and not the whole frame: twelve resampled rotations of 960x540 costs
  // most of a second and the picture is one mark either way.
  await whenVisible("ringLatticeDiagram", invalidation);
  const t = manScene.truth.find((m) => m.id === 62) ?? manScene.truth[0];
  const R = Math.ceil(Math.max(t.aTrue ?? 40, t.bTrue ?? 40) * 1.7);
  const x0 = Math.max(0, Math.round(t.xc - R)), y0 = Math.max(0, Math.round(t.yc - R));
  const x1 = Math.min(manScene.w, Math.round(t.xc + R)), y1 = Math.min(manScene.h, Math.round(t.yc + R));
  const w = x1 - x0, h = y1 - y0;
  const gray = new Uint8Array(w * h);
  for (let y = 0; y < h; y++)
    gray.set(manScene.gray.subarray((y0 + y) * manScene.w + x0, (y0 + y) * manScene.w + x1), y * w);

  const t0 = window.performance.now();
  const obs = ringObservations(denseRotations({ gray, w, h }, 12), { stride: 1 });
  const pts = obs.get(t.id) ?? [];
  const ms = window.performance.now() - t0;

  const MUT = "var(--theme-foreground-muted,#888)";

  // Canvas and not SVG. There are twelve thousand of these; as <circle> elements
  // they render fine and then the exporter clones every one of them into the baked
  // prerender, which is about a megabyte of markup for a picture. One raster is a
  // few tens of KB and looks the same.
  const SC = 3;   // dots are sub-pixel at 1:1, so draw the crop up and the dots on it
  const src = htl.html`<canvas width=${w} height=${h}>`;
  const sctx = src.getContext("2d");
  const im = sctx.createImageData(w, h);
  for (let i = 0; i < gray.length; i++) {
    const g = gray[i];
    im.data[4 * i] = g; im.data[4 * i + 1] = g; im.data[4 * i + 2] = g; im.data[4 * i + 3] = 255;
  }
  sctx.putImageData(im, 0, 0);
  const cv = htl.html`<canvas width=${w * SC} height=${h * SC} style="display:block;width:100%;height:auto">`;
  const cx2 = cv.getContext("2d");
  cx2.imageSmoothingEnabled = false;
  cx2.drawImage(src, 0, 0, w * SC, h * SC);

  // Colour IS the tooth. Two dots the same colour are claimed to lie on the same
  // circle in the mark plane, which is the whole content of the constraint.
  const rMax = manLayout.teeth[manLayout.teeth.length - 1];
  for (const [px, py, rad] of pts) {
    cx2.fillStyle = `hsl(${(205 + 145 * (rad / rMax)).toFixed(0)}deg 95% 55%)`;
    cx2.fillRect(px * SC - 1, py * SC - 1, 2.2, 2.2);
  }
  const el = cv;

  const rings = new Set(pts.map((q) => q[2].toFixed(3))).size;
  return htl.html`<figure style="margin:12px 0;max-width:420px">
    ${el}
    <figcaption style="font:11px/1.5 ui-monospace,monospace;color:${MUT};margin-top:4px">
      <b>${pts.length}</b> crossings on one mark, from 12 directions at stride 1 over this
      ${w}×${h} crop, in ${ms.toFixed(0)}ms. Every dot is an edge the scan already found and
      then discarded; its colour is the tooth <code>solveMan</code> assigned it, so same colour
      means same circle in the mark plane — ${rings} distinct radii here. The line intersection
      keeps one number per direction out of all of this, twelve in total. The fit below keeps
      them all and solves seven parameters against them.
    </figcaption>
  </figure>`;
};
const _dozrc3 = function _ringObservations(manLayout,edges1Dsub,manRowGroups,findInvolution,solveMan) {return (function ringObservations(rots, opts = {}) {
  // What the scan already found and then threw away.
  //
  // §4.7 keeps ONE number per direction -- clusterManRows' xc, the median involution
  // foot -- and discards the crossings that produced it. But solveMan assigns every
  // involution pair a tooth, so each crossing is a point at a KNOWN radius teeth[t] in
  // the mark plane. Twelve directions over a 1MP frame yield several thousand of them
  // per mark, against the twelve numbers the line intersection gets.
  //
  // solveMan does not return its tooth hits, but they are a pure function of the A and
  // dHat it does return, so this reproduces the assignment rather than guessing it:
  // the involution coordinate u maps back through r = sqrt(u/A + dHat^2).
  const stride = opts.stride ?? 1;
  const thr = opts.edgeThreshold ?? 12;
  const L = manLayout;
  const byId = new Map();
  for (const R of rots) {
    const w = R.w, h = R.h;
    const vx = R.vx ?? -R.uy, vy = R.vy ?? R.ux, offY = R.offY ?? 0;
    for (let y = stride >> 1; y < h; y += stride) {
      const se = edges1Dsub(R.gray.subarray(y * w, (y + 1) * w), thr);
      if (se.length < 6) continue;
      const n = se.length;
      const xs = new Float64Array(n), ss = new Int8Array(n);
      for (let i = 0; i < n; i++) { xs[i] = se[i].x; ss[i] = se[i].s; }
      for (const [lo, hi] of manRowGroups(xs, opts)) {
        const sub = [];
        for (let i = lo; i <= hi; i++) sub.push({ x: xs[i], s: ss[i] });
        const iv = findInvolution(sub, opts);
        if (!iv) continue;
        const r = solveMan(iv, L, opts);
        if (!r.ok || r.sup < 5 || r.id == null) continue;
        const d2 = r.dHat * r.dHat;
        let list = byId.get(r.id);
        if (!list) { list = []; byId.set(r.id, list); }
        for (const p of iv.up) {
          const rad = Math.sqrt(Math.max(0, p.u / r.A + d2));
          const t = Math.round((rad - 6) / L.half);
          if (t < 0 || t > L.nT) continue;
          // a crossing that does not sit on a tooth is a mis-pairing, not a measurement
          if (Math.abs(rad - L.teeth[t]) >= 0.45) continue;
          // BOTH edges of the pair: the involution guarantees they are the same ring
          for (const idx of [p.e, p.f]) {
            const X = iv.xs[idx] + R.off, Y = y + offY;
            list.push([X * R.ux + Y * vx, X * R.uy + Y * vy, L.teeth[t], p.sR]);
          }
        }
      }
    }
  }
  return byId;
});};
const _1878ruu = function _fitRingLattice(manLayout) {return (function fitRingLattice(obs, init, opts = {}) {
  // One mark's whole ring lattice, fitted at once:
  //
  //     |A (p - c)| = teeth[t] + delta * polarity
  //
  // c is the centre in the image and A the inverse of the local plane-to-image map.
  // delta is one ink-bleed offset in mm. It is identifiable rather than degenerate with
  // scale because the involution pairs require ss[f] === -ss[e]: growing the ink moves a
  // dark->light boundary out and a light->dark boundary in, and consecutive teeth
  // alternate polarity, so delta warps the radial lattice in a way A cannot absorb.
  //
  // An affine A is not quite enough. Concentric circles map to NON-concentric ellipses
  // under a homography -- the image ellipse of a ring drifts toward the vanishing point
  // as the ring grows -- so on a tilted sheet the affine model carries a bias of a few
  // tenths of a pixel that no amount of data removes. Two more parameters divide out
  // that drift and it goes away.
  const n = obs.length;
  if (n < 40) return null;
  const usePersp = opts.perspective !== false;
  const s = init.radiusPx ? manLayout.R / init.radiusPx : 1;   // px -> mm, isotropic seed
  const eps = [0.01, 0.01, 1e-5, 1e-5, 1e-5, 1e-5, 1e-3, 1e-8, 1e-8];

  const resid = (t, np, i) => {
    const o = obs[i];
    const dx = o[0] - t[0], dy = o[1] - t[1];
    let qx = t[2] * dx + t[3] * dy, qy = t[4] * dx + t[5] * dy;
    if (np > 7) { const wg = 1 + t[7] * dx + t[8] * dy; qx /= wg; qy /= wg; }
    return Math.hypot(qx, qy) - (o[2] + t[6] * o[3]);
  };
  const cost = (t, np, wts) => {
    let sse = 0, sw = 0;
    for (let i = 0; i < n; i++) { const r = resid(t, np, i); sse += wts[i] * r * r; sw += wts[i]; }
    return sse / Math.max(1e-9, sw);
  };
  const solveLin = (JTJ, JTr, np, lam) => {
    const M = JTJ.map((row, i) => Float64Array.from([...row, JTr[i]]));
    for (let a = 0; a < np; a++) M[a][a] *= 1 + lam;
    for (let c = 0; c < np; c++) {
      let piv = c;
      for (let r = c + 1; r < np; r++) if (Math.abs(M[r][c]) > Math.abs(M[piv][c])) piv = r;
      if (Math.abs(M[piv][c]) < 1e-18) return null;
      const tmp = M[c]; M[c] = M[piv]; M[piv] = tmp;
      for (let r = 0; r < np; r++) {
        if (r === c) continue;
        const f = M[r][c] / M[c][c];
        for (let k = c; k <= np; k++) M[r][k] -= f * M[c][k];
      }
    }
    return Array.from({ length: np }, (_, a) => M[a][np] / M[a][a]);
  };
  // Levenberg-Marquardt with step ACCEPTANCE, not just damping: plain Gauss-Newton
  // diverged on about one mark in twenty and threw the centre a thousand pixels. A step
  // that does not lower the weighted cost has to be refused.
  const solve = (np, th0) => {
    let th = th0.slice();
    let wts = new Float64Array(n).fill(1);
    let lam = 1e-3, cur = cost(th, np, wts);
    for (let iter = 0; iter < 60; iter++) {
      const JTJ = Array.from({ length: np }, () => new Float64Array(np));
      const JTr = new Float64Array(np);
      const g = new Float64Array(np);
      for (let i = 0; i < n; i++) {
        const r0 = resid(th, np, i);
        for (let k = 0; k < np; k++) {
          const t2 = th.slice(); t2[k] += eps[k];
          g[k] = (resid(t2, np, i) - r0) / eps[k];
        }
        const w = wts[i];
        for (let a = 0; a < np; a++) {
          JTr[a] += w * g[a] * r0;
          for (let b = a; b < np; b++) JTJ[a][b] += w * g[a] * g[b];
        }
      }
      for (let a = 0; a < np; a++) for (let b = 0; b < a; b++) JTJ[a][b] = JTJ[b][a];
      let took = false;
      for (let attempt = 0; attempt < 8; attempt++) {
        const d = solveLin(JTJ.map((r) => Float64Array.from(r)), JTr, np, lam);
        if (!d) { lam *= 10; continue; }
        const t2 = th.slice();
        for (let a = 0; a < np; a++) t2[a] -= d[a];
        const c2 = cost(t2, np, wts);
        if (c2 < cur) { th = t2; cur = c2; lam = Math.max(1e-9, lam / 3); took = true; break; }
        lam *= 10;
        if (lam > 1e12) break;
      }
      if (!took) break;
      // Huber on the mm residual: a crossing assigned to the neighbouring tooth is half a
      // tooth out and would otherwise drag the centre with it.
      const rs = new Float64Array(n);
      for (let i = 0; i < n; i++) rs[i] = Math.abs(resid(th, np, i));
      const srt = Float64Array.from(rs).sort();
      const mad = Math.max(0.02, srt[n >> 1]);
      for (let i = 0; i < n; i++) { const q = rs[i] / (2 * mad); wts[i] = q <= 1 ? 1 : 1 / q; }
      cur = cost(th, np, wts);
    }
    return { th, rms: Math.sqrt(cur) };
  };

  const aff = solve(7, [init.x, init.y, s, 0, 0, s, 0, 0, 0]);
  // A refinement that ran away from the measurement it was refining is a failed solve,
  // not a better centre.
  if (!isFinite(aff.rms) || aff.rms > 1.5 ||
      Math.hypot(aff.th[0] - init.x, aff.th[1] - init.y) > (init.radiusPx ?? 40) * 0.5) return null;

  let th = aff.th, rms = aff.rms, model = "affine";
  if (usePersp) {
    const per = solve(9, [...aff.th.slice(0, 7), 0, 0]);
    // The perspective pair is the weakest constrained direction in the problem, so a solve
    // that lands far from the affine one has found a different minimum rather than a better
    // one. "Far" is a question about the MARK, so it scales with the mark: the correction
    // runs 1-3% of the radius whatever the frame, and a fixed pixel bound turns that into a
    // rejection for every large mark. At the 1px this used to be, close-up frames lost the
    // perspective fit on 32 of 40 marks -- 29 of which it had improved, by a median 82% --
    // and silently fell back to affine, which is the model carrying the tilt bias the
    // perspective pair exists to remove. The rms condition beside it already rejects a
    // solve that is merely worse, so this bound only has to catch divergence.
    const jumpMax = Math.max(1, 0.04 * (init.radiusPx ?? 40));
    const jump = Math.hypot(per.th[0] - aff.th[0], per.th[1] - aff.th[1]);
    if (isFinite(per.rms) && per.rms <= aff.rms && jump <= jumpMax) {
      th = per.th; rms = per.rms; model = "perspective";
    }
  }
  return {
    x: th[0], y: th[1], delta: th[6], rms, n, model,
    // px -> LAYOUT UNITS (teeth are layout units); the caller converts with mmPerUnit
    A: [th[2], th[3], th[4], th[5]],
    moved: Math.hypot(th[0] - init.x, th[1] - init.y)
  };
});};
const _sec_constrains = function _anonymous(sec) {return (sec("constrains"));};
const _h0321j = function _anonymous(md,ref) {return (md`A homography from a plane has eight degrees of freedom. A mark reduced to its centre supplies two, so four marks fit one exactly — which is why a four-point consensus at rms 0 is not evidence of anything, and why the RANSAC below originally demanded five.

But the ring fit returns more than a centre. It returns \`A\`, the local plane-to-image map at that mark, and \`A\` is not free: it is the Jacobian of the homography evaluated there,

~~~
J = (1/w) · [[h11 − x·h31, h12 − x·h32],
             [h21 − y·h31, h22 − y·h32]],    w = h31·X + h32·Y + h33
~~~

so a measured \`A\` is four more equations on the same eight numbers.

Not four, though. The rings are concentric, so the pattern is invariant under rotation about its own centre and \`|A d|\` is unchanged if \`A\` is composed with any rotation. Rotation is exactly the part of \`A\` the mark cannot see. What it determines is the metric \`AᵀA\` — symmetric, **three** numbers.

A mark is therefore worth five constraints, not two. \`fitPlaneMetric\` fits the eight parameters against centres and metrics together and reports the redundancy as \`2·pairs + 3·metrics − 8\`: 27 on a seven-mark bank frame where the centres alone give 6, and 12 on a four-mark frame where the centres alone give none. Two marks now over-determine the plane.

The difference is not cosmetic. Predict a held-out mark from four centres alone and the worst of 414 synthetic trials reaches 47000px — an exact fit is an interpolation, and asking it for a fifth point extrapolates through a near-singular solve. From the same four centres plus their metrics, the worst held-out prediction is 1.1px.

This section still sits under ${ref('relabel')} rather than beside the cascade, because a *full* metric costs a per-mark ring fit that the offline labeller can afford and a frame budget cannot — \`analyzeFrameMan\` reaches 14 cells and \`fitPlaneMetric\` is not one of them. But only the third, off-diagonal number needs the ring. The row scan already measures the other two as each mark's \`a\` and \`b\`, for nothing, and on 2026-08-10 \`fitHexPose\` started using them: \`fitHomographyScaled\` is this argument with two of the five constraints per mark instead of five, which is what the live detector can pay for. What it bought is measured in ${ref('nearmiss')}.`);};
const _1tm4zrn = function _fitPlaneMetric(hexTarget) {return (function fitPlaneMetric(pairs, seedH, opts = {}) {
  // A homography from the sheet has 8 degrees of freedom, and reducing a mark to its
  // centre gives 2 constraints -- which is why four marks fit EXACTLY and no residual
  // can expose a bad fit. But a decoded barcode fixes more than a point: the tooth
  // widths give metric scale and their foreshortening gives the local linear map, and
  // for a homography that map is a known function of H,
  //
  //     J = (1/w) [[h11 - x h31, h12 - x h32], [h21 - y h31, h22 - y h32]]
  //
  // with w = h31 X + h32 Y + 1. Concentric rings cannot see their own orientation, so
  // |A d| is invariant under any rotation of A and only the metric A'A is measured --
  // 3 numbers, not 4. That still makes a mark worth 2 + 3 = 5 constraints, so TWO marks
  // over-determine the plane and four are three-fold redundant.
  //
  // Comparing entries of A instead of lengths fits one arbitrary number and lands the
  // plane a hundred pixels out; comparing lengths is the whole trick.
  const T = hexTarget;
  const withA = pairs.filter((p) => p.Amm && p.radiusPx);
  if (pairs.length < 3 && withA.length < 2) return null;
  const DIRS = [[1, 0], [Math.SQRT1_2, Math.SQRT1_2], [0, 1], [-Math.SQRT1_2, Math.SQRT1_2]];
  const len = (M, dx, dy) => Math.hypot(M[0] * dx + M[1] * dy, M[2] * dx + M[3] * dy);
  const inv2 = (M) => {
    const d = M[0] * M[3] - M[1] * M[2];
    return Math.abs(d) < 1e-12 ? null : [M[3] / d, -M[1] / d, -M[2] / d, M[0] / d];
  };
  const project = (h, X, Y) => {
    const w = h[6] * X + h[7] * Y + 1;
    return [(h[0] * X + h[1] * Y + h[2]) / w, (h[3] * X + h[4] * Y + h[5]) / w];
  };
  const jac = (h, X, Y) => {
    const w = h[6] * X + h[7] * Y + 1;
    const [x, y] = project(h, X, Y);
    return [(h[0] - x * h[6]) / w, (h[1] - x * h[7]) / w,
            (h[3] - y * h[6]) / w, (h[4] - y * h[7]) / w];
  };
  // A length error of one mm at the rim is worth radiusPx/radiusMm pixels of position,
  // which is what puts the two kinds of residual in the same units.
  const resid = (h) => {
    const out = [];
    for (const p of pairs) {
      const [px, py] = project(h, p.sx, p.sy);
      out.push(px - p.dx, py - p.dy);
    }
    for (const p of withA) {
      const ji = inv2(jac(h, p.sx, p.sy));
      if (!ji) { out.push(0, 0, 0, 0); continue; }
      const k = p.radiusPx / T.radiusMm;
      for (const u of DIRS) {
        const dx = u[0] * p.radiusPx, dy = u[1] * p.radiusPx;
        out.push((len(ji, dx, dy) - len(p.Amm, dx, dy)) * k);
      }
    }
    return out;
  };

  let h = seedH.slice(0, 8);
  const eps = [1e-4, 1e-4, 1e-2, 1e-4, 1e-4, 1e-2, 1e-9, 1e-9];
  const sse = (v) => v.reduce((a, b) => a + b * b, 0);
  let cur = sse(resid(h)), lam = 1e-3;
  for (let iter = 0; iter < 60; iter++) {
    const r0 = resid(h), n = r0.length, np = 8;
    const J = [];
    for (let k = 0; k < np; k++) {
      const h2 = h.slice(); h2[k] += eps[k];
      const r2 = resid(h2);
      J.push(r2.map((v, i) => (v - r0[i]) / eps[k]));
    }
    const JTJ = Array.from({ length: np }, () => new Float64Array(np));
    const JTr = new Float64Array(np);
    for (let a = 0; a < np; a++) {
      for (let i = 0; i < n; i++) JTr[a] += J[a][i] * r0[i];
      for (let b = a; b < np; b++) { let s = 0; for (let i = 0; i < n; i++) s += J[a][i] * J[b][i]; JTJ[a][b] = s; }
    }
    for (let a = 0; a < np; a++) for (let b = 0; b < a; b++) JTJ[a][b] = JTJ[b][a];
    let took = false;
    for (let attempt = 0; attempt < 8; attempt++) {
      const M = JTJ.map((row, i) => Float64Array.from([...row, JTr[i]]));
      for (let a = 0; a < np; a++) M[a][a] *= 1 + lam;
      let ok = true;
      for (let c = 0; c < np && ok; c++) {
        let piv = c;
        for (let r = c + 1; r < np; r++) if (Math.abs(M[r][c]) > Math.abs(M[piv][c])) piv = r;
        if (Math.abs(M[piv][c]) < 1e-20) { ok = false; break; }
        const tmp = M[c]; M[c] = M[piv]; M[piv] = tmp;
        for (let r = 0; r < np; r++) {
          if (r === c) continue;
          const f = M[r][c] / M[c][c];
          for (let k = c; k <= np; k++) M[r][k] -= f * M[c][k];
        }
      }
      if (!ok) { lam *= 10; continue; }
      const h2 = h.slice();
      for (let a = 0; a < np; a++) h2[a] -= M[a][np] / M[a][a];
      const c2 = sse(resid(h2));
      if (c2 < cur) { h = h2; cur = c2; lam = Math.max(1e-9, lam / 3); took = true; break; }
      lam *= 10;
    }
    if (!took) break;
  }

  const H = [...h, 1];
  const map = (sx, sy) => {
    const w = H[6] * sx + H[7] * sy + 1;
    return [(H[0] * sx + H[1] * sy + H[2]) / w, (H[3] * sx + H[4] * sy + H[5]) / w];
  };
  let ssPt = 0;
  for (const p of pairs) { const [x, y] = map(p.sx, p.sy); ssPt += (x - p.dx) ** 2 + (y - p.dy) ** 2; }
  let ssM = 0, nM = 0;
  for (const p of withA) {
    const ji = inv2(jac(h, p.sx, p.sy));
    if (!ji) continue;
    for (const u of DIRS) {
      const dx = u[0] * p.radiusPx, dy = u[1] * p.radiusPx;
      ssM += (len(ji, dx, dy) - len(p.Amm, dx, dy)) ** 2; nM++;
    }
  }
  return {
    H, map, mirrored: H[0] * H[4] - H[1] * H[3] < 0,
    rmsResidual: Math.sqrt(ssPt / pairs.length),
    rmsMetricMm: nM ? Math.sqrt(ssM / nM) : null,
    nMetric: withA.length,
    // 2 constraints per centre, 3 per measured metric, against 8 unknowns
    redundancy: 2 * pairs.length + 3 * withA.length - 8,
    pairs: pairs.length
  };
});};
const _56yy58 = function _fitPlaneRansac(hexTarget,fitHomography,fitPlaneMetric) {return (function fitPlaneRansac(marks, tol = 4) {
  // Exhaustive RANSAC over the 4-subsets, rather than iteratively dropping the worst
  // point. A mark decoded under the WRONG id sits perfectly on its own ink and a whole
  // pitch from where that id belongs; with seven points it drags a least-squares fit
  // far enough that the innocent marks look as guilty as it does. C(7,4) = 35 subsets,
  // so every one can simply be tried and the largest consistent set kept.
  const T = hexTarget;
  const pairs = marks.filter((m) => m.x != null && T.byId.has(m.id)).map((m) => {
    const mk = T.byId.get(m.id);
    return { sx: mk.xMm, sy: mk.yMm, dx: m.x, dy: m.y, id: m.id, Amm: m.Amm, radiusPx: m.radiusPx };
  });
  if (pairs.length < 4) return null;
  const resid = (fit, p) => { const [x, y] = fit.map(p.sx, p.sy); return Math.hypot(x - p.dx, y - p.dy); };
  let best = null;
  for (let a = 0; a < pairs.length; a++)
    for (let b = a + 1; b < pairs.length; b++)
      for (let c = b + 1; c < pairs.length; c++)
        for (let d = c + 1; d < pairs.length; d++) {
          const fit = fitHomography([pairs[a], pairs[b], pairs[c], pairs[d]]);
          if (!fit) continue;
          const inl = pairs.filter((p) => resid(fit, p) < tol);
          if (inl.length < 4) continue;
          const ref = fitHomography(inl);
          if (!ref) continue;
          const rms = Math.sqrt(inl.reduce((s, p) => s + resid(ref, p) ** 2, 0) / inl.length);
          if (!best || inl.length > best.inl.length || (inl.length === best.inl.length && rms < best.rms))
            best = { fit: ref, inl, rms };
        }
  if (!best) return null;

  // Polish on the ring metric where the refinement measured one. Each metric adds 3
  // constraints on top of the centre's 2, so the fit stops being an interpolation and
  // starts being an estimate: predicting a held-out mark off four centres alone reached
  // 47000px in the worst of 414 synthetic trials, and off four centres PLUS their
  // metrics it never exceeded 1.1px.
  const withMetric = best.inl.filter((p) => p.Amm && p.radiusPx).length;
  let fit = best.fit, rms = best.rms, metric = null;
  if (withMetric >= 2) {
    const pol = fitPlaneMetric(best.inl, best.fit.H);
    if (pol && isFinite(pol.rmsResidual)) {
      fit = pol; rms = pol.rmsResidual;
      metric = { n: pol.nMetric, rmsMm: pol.rmsMetricMm, redundancy: pol.redundancy };
    }
  }

  // FOUR POINTS ALWAYS FIT A HOMOGRAPHY EXACTLY, so a 4-inlier consensus at rms 0 is
  // not evidence of anything -- on one archived case it locked a self-consistent but
  // wrong id assignment and threw out the three marks that were right. Five inliers is
  // the first count that can be contradicted... unless the marks carry their metrics,
  // in which case four of them supply 20 constraints for 8 unknowns and the fit is
  // over-determined on its own. The rule is really about redundancy, not about points.
  const enough = best.inl.length >= 5 || (metric && metric.redundancy >= 8 && withMetric === best.inl.length);
  if (!enough) return null;
  const keep = new Set(best.inl.map((p) => p.id));
  return {
    fit, used: [...keep], rms: +rms.toFixed(2), metric,
    rejected: pairs.filter((p) => !keep.has(p.id)).map((p) => p.id)
  };
});};
const _vq3w1d = function _markContrast() {return (function markContrast(frame, cx, cy, R) {
  // Detector-independent evidence that a position is on a mark. manColor prints a dark
  // disc at r < 6mm inside a light framing ring out of R = 28.5mm, so a mark IS a dark
  // core inside a light collar: large and positive on ink, near zero on clutter that
  // happened to vote an id. Used as a veto, never as the measurement.
  if (!(R > 4)) return null;
  const gray = frame.gray, w = frame.w, h = frame.h;
  const ring = (r0, r1) => {
    let s = 0, n = 0;
    const Rc = Math.ceil(r1);
    for (let dy = -Rc; dy <= Rc; dy++) for (let dx = -Rc; dx <= Rc; dx++) {
      const d = Math.hypot(dx, dy);
      if (d < r0 || d > r1) continue;
      const x = Math.round(cx + dx), y = Math.round(cy + dy);
      if (x < 0 || y < 0 || x >= w || y >= h) continue;
      s += gray[y * w + x]; n++;
    }
    return n ? s / n : null;
  };
  const core = ring(0, Math.max(1.5, 0.12 * R));
  const collar = ring(0.25 * R, 0.32 * R);
  return core == null || collar == null ? null : +(collar - core).toFixed(1);
});};
const _1w91i3j = function _relabelCase(hexTarget,denseRotations,denseLabel,fitPlaneRansac,ringObservations,fitRingLattice,markContrast) {return (async function relabelCase(frame, opts = {}) {
  // The whole procedure on one frame. Nothing the frame already carries is read: the
  // labels being replaced came from a single-axis stride-4 run and a plane fitted to
  // it, so consulting them -- even as a fallback -- would put the thing being replaced
  // back into its own replacement.
  const nDir = opts.nDir ?? 12;
  const stride = opts.stride ?? 1;
  const thrs = opts.thresholds ?? [8, 12, 16, 20, 24, 30, 36];
  const minScore = opts.minScore ?? 22;
  const refine = opts.refine !== false;
  const tick = opts.tick;
  const T = hexTarget;
  const rots = denseRotations(frame, nDir);
  if (tick) await tick(`resampled ${nDir} directions`);

  // The edge threshold is the one detector setting chosen per frame. Clutter scales
  // with the imaged size of the mark, so no single value serves a 30px mark and an 80px
  // one; across the shipped bank the chosen values span 8 to 36. Most marks ON THE PLANE
  // wins, and a tie goes to the tighter plane -- the only evidence that the extra mark
  // is real rather than clutter that happened to vote an id.
  const tries = [];
  for (const thr of thrs) {
    const d = denseLabel(frame, { nDir, stride, rots, detector: { ...opts.detector, edgeThreshold: thr } });
    const good = d.marks.filter((m) => m.x != null && m.dirs >= 3 && T.byId.has(m.id));
    const p = fitPlaneRansac(good);
    tries.push({ thr, n: good.length, nUsed: p ? p.used.length : 0,
      planeRms: p ? p.rms : null, marks: good, ms: d.ms });
    if (tick) await tick(`threshold ${thr}: ${good.length} marks${p ? `, ${p.used.length} on the plane, rms ${p.rms}` : ""}`);
  }
  // Rank on marks the plane USED, not marks measured. A threshold that measures seven and
  // then has one thrown out by RANSAC scores a tight plane BECAUSE the inconsistent mark
  // was discarded, so ranking on measured-count plus rms rewards exactly the frame whose
  // label set will end up carrying a prediction. hexcase-159 chose thr 20 (6 used, one
  // mark overruled) over thr 16 and thr 30, both of which measure all seven consistently.
  const best = tries.slice().sort((a, b) =>
    b.nUsed - a.nUsed || b.n - a.n || (a.planeRms ?? 9) - (b.planeRms ?? 9))[0];

  // Refinement, on the marks the sweep already found. The line intersection above uses
  // one number per direction; the ring lattice uses every crossing the same scan made,
  // thousands of them, each at a radius the barcode itself names. It cannot find a mark
  // and it cannot rescue one -- it only sharpens a centre that already exists, so it
  // runs at the chosen threshold and never touches the decision about what is there.
  // It goes BEFORE the plane so the plane is fitted to the better centres, and it hands
  // the plane each mark's local metric, which is worth 3 more constraints than a centre.
  const refined = new Map();
  let refineMs = 0;
  if (refine && best.marks.length) {
    if (tick) await tick(`refining ${best.marks.length} centres on the ring lattice`);
    const t0 = window.performance.now();
    const ring = ringObservations(rots, { ...opts.detector, stride, edgeThreshold: best.thr });
    for (const m of best.marks) {
      const obs = ring.get(m.id);
      if (!obs) continue;
      const f = fitRingLattice(obs, m, opts.ring);
      if (!f) continue;
      refined.set(m.id, {
        n: f.n, rms: +f.rms.toFixed(3), deltaMm: +f.delta.toFixed(3),
        model: f.model, movedPx: +f.moved.toFixed(2)
      });
      m.x = +f.x.toFixed(2);
      m.y = +f.y.toFixed(2);
      // A is px -> layout units; the target is in mm and mmPerUnit = radiusMm / L.R
      m.Amm = f.A.map((v) => v * T.mmPerUnit);
    }
    refineMs = Math.round(window.performance.now() - t0);
    if (tick) await tick(`refined ${refined.size} of ${best.marks.length}`);
  }

  const plane = fitPlaneRansac(best.marks);
  const measured = new Map(best.marks.map((m) => [m.id, m]));

  // Mark spacing in THIS image, so "wrong place" is judged in units of the thing
  // itself rather than a pixel count that only ever suits one working distance.
  const pts = best.marks.map((m) => [m.x, m.y]);
  const nn = pts.map(([x, y]) => Math.min(...pts.filter((p) => p[0] !== x || p[1] !== y)
    .map((p) => Math.hypot(p[0] - x, p[1] - y))));
  const pitchPx = nn.length ? nn.slice().sort((a, b) => a - b)[nn.length >> 1] : 0;

  const labels = [];
  for (const [id, mk] of T.byId) {
    const m = measured.get(id);
    // The plane may FLAG a measurement; it may not quietly replace one. A hand-held
    // sheet at a grazing angle is not planar to 4px, and a fit that rejects a mark the
    // pixels endorse is the model being wrong rather than the measurement. The two
    // failures separate by MAGNITUDE: paper curl moves a mark a few px, a mark decoded
    // under the wrong id sits a whole pitch away. So a measurement is overruled only at
    // a residual on the order of the spacing, or when the pixels refuse it as well.
    const resid0 = plane && m
      ? (() => { const p = plane.fit.map(mk.xMm, mk.yMm); return Math.hypot(p[0] - m.x, p[1] - m.y); })()
      : null;
    const mScore = m ? markContrast(frame, m.x, m.y, m.radiusPx) : null;
    const rejected = !!plane && !!m && resid0 != null &&
      (resid0 > Math.max(25, 0.35 * pitchPx) || (resid0 > 3 && (mScore == null || mScore < minScore)));

    const rf = refined.get(id);
    let x = null, y = null, radiusPx = null, src = "none";
    if (m && !rejected) { x = m.x; y = m.y; radiusPx = m.radiusPx; src = rf ? "refined" : "measured"; }
    else if (plane) {
      const p = plane.fit.map(mk.xMm, mk.yMm);
      x = +p[0].toFixed(1); y = +p[1].toFixed(1);
      src = rejected ? "plane-rejected" : "predicted";
    }
    if (x == null) { labels.push({ id, x: null, y: null, radiusPx: null, src, dirs: m ? m.dirs : 0 }); continue; }
    if (radiusPx == null && plane) {
      // apparent radius off the same homography: project the rim and halve the chord
      const p0 = plane.fit.map(mk.xMm - T.radiusMm, mk.yMm);
      const p1 = plane.fit.map(mk.xMm + T.radiusMm, mk.yMm);
      radiusPx = +(Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) / 2).toFixed(1);
    }
    // The rim as it actually images: a circle on a tilted sheet is an ellipse, and
    // radiusPx -- the median half-width over the scan directions -- is one number where
    // the shape needs two. Take the SHAPE from the plane and the POSITION from the
    // measurement, so a ring that misses the ink is a bad measurement rather than a
    // drawing artefact.
    let outline = null;
    if (plane) {
      const c = plane.fit.map(mk.xMm, mk.yMm);
      outline = Array.from({ length: 48 }, (_, i) => {
        const th = (i / 48) * 2 * Math.PI;
        const p = plane.fit.map(mk.xMm + T.radiusMm * Math.cos(th), mk.yMm + T.radiusMm * Math.sin(th));
        return [+(p[0] - c[0] + x).toFixed(1), +(p[1] - c[1] + y).toFixed(1)];
      });
    }
    const inFrame = x >= 0 && y >= 0 && x < frame.w && y < frame.h;
    const score = inFrame ? markContrast(frame, x, y, radiusPx ?? 0) : null;
    // Residual against the plane. For a measured mark this is independent evidence:
    // the plane is determined by the other marks as much as by this one.
    let planeResid = null;
    if (plane) { const p = plane.fit.map(mk.xMm, mk.yMm); planeResid = +Math.hypot(p[0] - x, p[1] - y).toFixed(2); }
    labels.push({
      id, x: +x.toFixed(2), y: +y.toFixed(2), radiusPx, outline, src,
      dirs: m ? m.dirs : 0, lineRms: m ? m.rms : null,
      ringN: rf ? rf.n : null, ringRms: rf ? rf.rms : null, deltaMm: rf ? rf.deltaMm : null,
      ringModel: rf ? rf.model : null, refinedPx: rf ? rf.movedPx : null,
      planeResid, score, inFrame, ok: score != null && score >= minScore
    });
  }
  const deltas = [...refined.values()].map((r) => r.deltaMm).sort((a, b) => a - b);
  return {
    thr: best.thr,
    tries: tries.map((t) => ({ thr: t.thr, n: t.n, nUsed: t.nUsed, planeRms: t.planeRms, ms: t.ms })),
    plane: plane
      ? { rms: plane.rms, used: plane.used, rejected: plane.rejected, metric: plane.metric }
      : null,
    labels: labels.sort((a, b) => a.id - b.id),
    refine: refine
      ? { n: refined.size, ms: refineMs, deltaMm: deltas.length ? deltas[deltas.length >> 1] : null }
      : null,
    nDir, stride, minScore,
    ms: tries.reduce((s, t) => s + t.ms, 0) + refineMs
  };
});};
const _1stieyf = function _relabelCfg(Inputs,hexFrameBank) {return (Inputs.form({
  // Defaults to none. Twelve resamples and seven threshold passes over a 1MP frame is
  // seconds of work, and a page that spends them the moment it loads has spent them on
  // a reader who did not ask for them.
  frame: Inputs.select([null, ...Array.from({ length: hexFrameBank.length }, (_, i) => i)], {
    label: "bank frame",
    value: null,
    format: (i) => (i == null ? "none" : `${i + 1}. ${hexFrameBank[i].name}`)
  }),
  // The defaults are the settings the shipped labels were measured at. Lower them to
  // see the procedure degrade: at 6 directions and stride 2 a mark still lands within a
  // px of its label, but the weaker ones fall back to the plane's prediction.
  nDir: Inputs.range([2, 18], { step: 1, value: 12, label: "directions" }),
  stride: Inputs.range([1, 4], { step: 1, value: 1, label: "stride (rows)" }),
  minScore: Inputs.range([0, 60], { step: 1, value: 22, label: "min contrast" })
}));};
const _1duclsl = (G, _) => G.input(_);
const _1wcv97b = function _relabelGo(Inputs) {return (Inputs.button("relabel this frame", { value: 0, reduce: (v) => v + 1 }));};
const _13t348l = (G, _) => G.input(_);
const _o7cs5i = function _relabelProgress(htl,relabelStatus) {return (htl.html`<div style="font:11px ui-monospace,monospace;min-height:1.4em;
  color:var(--theme-foreground-muted,#888)">${relabelStatus === "idle" ? "" : relabelStatus}</div>`);};
const _1nbl9h5 = function _relabelStatus() {return ("idle");};
const _7sp7oz = (M, _) => new M(_);
const _np1y0e = _ => _.generator;
const _9og0ba = async function _relabelRun(relabelCfg,relabelGo,hexFrameBank,relabelCase,$0) {
  // Two gates, both meaning "not unless asked": no frame selected, and no press. The
  // button alone would not be enough on a reload -- a select that remembered a frame
  // would put seconds of work on the page before the reader had chosen anything.
  if (relabelCfg.frame == null || !relabelGo) return null;
  const b = hexFrameBank[relabelCfg.frame];
  const frame = { gray: b.frame.gray, w: b.frame.w, h: b.frame.h };
  const t0 = window.performance.now();
  const r = await relabelCase(frame, {
    nDir: relabelCfg.nDir,
    stride: relabelCfg.stride,
    minScore: relabelCfg.minScore,
    // Hand the frame back between passes: a frozen page during a ten second sweep
    // looks like a crash, and the live rig above is probably still running.
    tick: async (msg) => {
      $0.value = msg;
      await new Promise((res) => window.setTimeout(res, 0));
    }
  });
  $0.value = "idle";
  return { name: b.name, url: b.url, w: b.frame.w, h: b.frame.h, shipped: b.truth, ...r,
    wallMs: Math.round(window.performance.now() - t0) };
};
const _vh398d = function _relabelReport(relabelRun,htl,relabelStatus,relabelCfg,hexFrameBank) {
  if (!relabelRun) return htl.html`<div style="font:12px ui-monospace,monospace;color:var(--theme-foreground-muted,#888)">
    ${relabelStatus !== "idle" ? relabelStatus
      : relabelCfg.frame == null ? "choose a bank frame, then press the button"
      : "press the button to relabel " + hexFrameBank[relabelCfg.frame].name}</div>`;
  const r = relabelRun;
  const COL = { refined: "#2fe08a", measured: "#b8e04a", predicted: "#5ad8f5", "plane-rejected": "#e05ad0", none: "#888" };
  const shipped = new Map(r.shipped.map((t) => [t.id, t]));

  const parts = [];
  for (const L of r.labels) {
    if (L.x == null) continue;
    const c = COL[L.src] ?? "#888";
    const R = L.radiusPx ?? 20;
    // The rim projected through the plane, not a circle of the median half-width: on a
    // tilted sheet the two differ by the tilt, and a ring that does not sit on its mark
    // then reads as a bad measurement rather than as a bad drawing.
    const top = L.outline ? Math.min(...L.outline.map((p) => p[1])) : L.y - R;
    const shape = L.outline
      ? `<polygon points="${L.outline.map((p) => p[0] + "," + p[1]).join(" ")}"`
      : `<circle cx="${L.x}" cy="${L.y}" r="${R.toFixed(1)}"`;
    parts.push(
      `${shape} fill="none" stroke="${c}" stroke-width="3"
        stroke-dasharray="${L.src === "refined" || L.src === "measured" ? "none" : "9 6"}"/>` +
      `<g stroke="${c}" stroke-width="2"><line x1="${L.x - 10}" y1="${L.y}" x2="${L.x + 10}" y2="${L.y}"/>
        <line x1="${L.x}" y1="${L.y - 10}" x2="${L.x}" y2="${L.y + 10}"/></g>` +
      `<text x="${L.x}" y="${(top - 6).toFixed(1)}" font-family="ui-monospace,monospace"
        font-size="${Math.max(20, R * 0.55).toFixed(0)}" font-weight="700" fill="${c}"
        text-anchor="middle" paint-order="stroke" stroke="#000" stroke-width="4">${L.id}</text>`
    );
    // the label this frame ships with, so a disagreement is visible rather than tabulated
    const s = shipped.get(L.id);
    if (s) parts.push(`<circle cx="${s.x}" cy="${s.y}" r="4" fill="none" stroke="#fff" stroke-width="2"/>`);
  }
  const overlay = htl.svg`<svg viewBox="0 0 ${r.w} ${r.h}"
    style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none"></svg>`;
  overlay.innerHTML = parts.join("");

  const td = (v, style = "") => htl.html`<td style="text-align:right;padding:2px 7px;
    font-variant-numeric:tabular-nums;${style}">${v == null ? "–" : v}</td>`;
  const rows = r.labels.map((L) => {
    const s = shipped.get(L.id);
    const moved = s && L.x != null ? +Math.hypot(L.x - s.x, L.y - s.y).toFixed(1) : null;
    return htl.html`<tr>
      ${td(L.id)}
      <td style="padding:2px 7px;color:${COL[L.src] ?? "#888"}">${L.src}</td>
      ${td(L.dirs || null)}${td(L.lineRms)}
      ${td(L.ringN)}${td(L.ringRms)}${td(L.deltaMm)}${td(L.refinedPx)}
      ${td(L.planeResid, L.planeResid > 4 ? "color:#ff9f1c" : "")}
      ${td(L.score, L.ok ? "" : "color:#ff5c5c")}${td(moved, moved > 4 ? "color:#ff9f1c" : "")}
    </tr>`;
  });

  return htl.html`<div>
    <div style="display:flex;gap:16px;flex-wrap:wrap;align-items:flex-start">
      <div style="position:relative;width:460px;max-width:100%;background:#1b1b1b;border-radius:4px;overflow:hidden">
        <img src=${r.url} style="display:block;width:100%;height:auto">${overlay}
      </div>
      <div>
        <table style="border-collapse:collapse;font:12px ui-monospace,monospace">
          <thead><tr>
            ${["id", "source", "dirs", "line rms", "ring n", "ring rms", "δ mm", "refine px", "plane px", "contrast", "moved px"].map((t, i) =>
              htl.html`<th style="text-align:${i === 1 ? "left" : "right"};padding:2px 7px;font-weight:600;
                border-bottom:1px solid currentColor">${t}</th>`)}
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <div style="font:11px/1.6 ui-monospace,monospace;padding-top:8px;color:var(--theme-foreground-muted,#888)">
          ${r.name} · ${r.w}×${r.h} · ${r.nDir} directions · stride ${r.stride} · ${r.wallMs}ms<br>
          threshold sweep ${r.tries.map((t) => `${t.thr}:${t.nUsed ?? t.n}${t.planeRms == null ? "" : "/" + t.planeRms}`).join("  ")}
          → chose ${r.thr} <span style="opacity:0.7">(marks the plane used, then the tighter plane)</span><br>
          ${r.refine
            ? `ring lattice refined ${r.refine.n} centres in ${r.refine.ms}ms${r.refine.deltaMm == null ? "" : `, median ink offset δ ${r.refine.deltaMm}mm`}`
            : "refinement off: centres are the line intersection alone"}<br>
          ${r.plane
            ? `plane rms ${r.plane.rms}px on ${r.plane.used.length} marks${r.plane.metric ? `, redundancy ${r.plane.metric.redundancy}` : ""}${r.plane.rejected.length ? `, flagged ${r.plane.rejected.join(",")}` : ""}`
            : "no trusted plane: too few marks agree on one, and their measured metrics do not make up the difference"}<br>
          ring = the mark's rim projected through the plane, centred on the result ·
          green = refined on the ring lattice · olive = line intersection only ·
          cyan = predicted off the plane · magenta = measured somewhere the geometry refuses ·
          small white ring = the label this frame ships with
        </div>
      </div>
    </div>
  </div>`;
};
const _nb2x = function _anonymous(md) {return (md`Some helpers for development`);};
const _16hxrfy = function _hexRigSweepGo(Inputs) {return (Inputs.button("run sweep over collected cases", {
  value: 0,
  reduce: (v) => v + 1
}));};
const _5e077b = (G, _) => G.input(_);
const _1fdcn6e = function _renderHexScene(hexTarget,manColor,manPageLevel) {return (function renderHexScene(opts = {}) {
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
              val = manPageLevel;
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
const _15xffv4 = async function _hexRigSynthCases(whenVisible,invalidation,hexTarget,renderHexScene,analyzeFrameMan,fitHexPose,hexRigLoo) {
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
  await whenVisible("hexRigSynthCases", invalidation);
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
const _a0ribc = async function _hexRigSelfTest(whenVisible,invalidation,hexRigSynthCases,hexRigScore,analyzeFrameMan) {
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
  await whenVisible("hexRigSelfTest", invalidation);
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
const _1kgvsyz = async function _hexRendererCheck(whenVisible,invalidation,manLayout,renderManFrame,analyzeFrameMan,makeHexTarget,renderHexScene,manPageLevel) {
  // Is the low read rate the detector or my renderer? Same id, same apparent
  // diameter, same detector -- rendered two ways. renderManFrame is the one
  // manSceneTest already passes with, so it is the control.
  await whenVisible("hexRendererCheck", invalidation);
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
  const g1 = new Uint8Array(W * H).fill(manPageLevel);
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
const _1au9ya6 = async function _hexPitchSweep(whenVisible,invalidation,makeHexTarget,renderHexScene,analyzeFrameMan,fitHexPose) {
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
  await whenVisible("hexPitchSweep", invalidation);
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
const _sec_next = function _anonymous(sec) {return (sec("next"));};
const _nb6x = function _next_md(md) {return (md`What can we build with this already?

We should try seeing if we can exploit variable scan lines for high speed post tracking in hardware like the \`Arducam 100fps Mono Global Shutter USB Camera, 720P OV9281 UVC Webcam Module\
`);};
const _1visgate = function _whenVisible(IntersectionObserver,localStorage) {return (function whenVisible(cellName, invalidation) {
  // The runtime has a `visibility` input for exactly this, and it is inert in a lopecode page:
  // variable_intersector reads variable._observer._node at COMPUTE time, and a notebook booted
  // with "headless": true gets a node-less {} as every cell's observer, so `visible = !node`
  // resolves it immediately. The visualizer's own inspectors do carry a node -- it stamps
  // cell="<name>" on each one -- but they are not mounted until seconds later. So wait for the
  // node to APPEAR rather than asking for it once.
  if (typeof IntersectionObserver !== "function") return Promise.resolve();
  // A gated cell occupies 17px until it computes, so filling it in shoves the rest of the page
  // down under whatever the reader was looking at. Reserve the height it will need first. The
  // numbers are what these cells measured at 1400px wide, and they are only a first guess: a
  // report that wraps is 1467px on a laptop and 5478px on a phone, so each cell records its own
  // rendered height per width bucket and that wins on the next load.
  const DEFAULT = { hexFrameReport: 1467, hexRigSelfTest: 319, hexRendererCheck: 88 };
  const bucket = Math.round(window.innerWidth / 200) * 200;
  const key = (c) => "lazyReserve:" + c + ":" + bucket;
  const stored = (c) => { try { return +localStorage.getItem(key(c)) || 0; } catch (_) { return 0; } };
  // Write EVERY reservation on the first call, not just this cell's: a gated cell that waits on
  // another gated cell never runs, so it would never get to reserve its own space. A stylesheet
  // rather than an inline style because the inspector replaces the node when the value lands, and
  // !important because lopepage-2's `#lopepage-2 .lope-viz .observablehq{min-height:17px}`
  // outranks a bare attribute selector.
  if (!document.getElementById("lazy-reserve-style")) {
    const sheet = document.createElement("style");
    sheet.id = "lazy-reserve-style";
    sheet.textContent = Object.keys(DEFAULT)
      .map((c) => '[cell="' + c + '"]{min-height:' + (stored(c) || DEFAULT[c]) + 'px !important}')
      .join("\n");
    document.head.appendChild(sheet);
  }
  return new Promise((resolve) => {
    let io, timer, done = false, waitedForNode = 0;
    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      if (io) io.disconnect();
      // Learn this width's real height for next time, once the content has settled.
      if (DEFAULT[cellName]) setTimeout(() => {
        const el = document.querySelector('[cell="' + cellName + '"]');
        const h = el && Math.round(el.getBoundingClientRect().height);
        try { if (h > 40) localStorage.setItem(key(cellName), String(h)); } catch (_) {}
      }, 3000);
      resolve();
    };
    // Settle on invalidation too: a promise that never settles takes the whole runtime with it.
    if (invalidation && invalidation.then) invalidation.then(finish, finish);
    io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) return finish();
    });
    const seen = new WeakSet();
    const scan = () => {
      if (done) return;
      // Panes are built late and rebuilt on layout change, so keep picking up new nodes.
      const nodes = document.querySelectorAll('[cell="' + cellName + '"]');
      for (const n of nodes) if (!seen.has(n)) { seen.add(n); io.observe(n); }
      // Never rendered at all (an export, a headless run): degrade open, as the runtime does.
      if (!nodes.length && (waitedForNode += 250) > 8000) return finish();
      timer = setTimeout(scan, 250);
    };
    scan();
  });
});};
const _sections = function _sections() {return ([
  // The document's spine. Position in THIS array is the section number; nothing
  // else assigns one. Moving a section is moving its line, and every heading,
  // cross-reference and the contents list follow.
  //
  // Written because they did not follow. Hand-numbered headings had drifted
  // from the references pointing at them: on 2026-08-09 the source carried
  // live references to §0, §2.1, §5.2, §10, §11, §11.2, §11.4 and §11.5, none
  // of which the document still had. A reader following one landed nowhere.
  //
  // `num: null` is a section that is deliberately unnumbered -- front matter
  // the reader meets before the argument starts. It still gets an anchor, so
  // `ref` can link to it.
  { key: "scanner", title: "The Scanner", num: null },
  { key: "about", title: "About", num: null, parent: "scanner" },

  { key: "mark", title: "The barcode mark" },
  { key: "multi", title: "Multiple Barcodes" },

  { key: "eval", title: "Evaluation" },
  { key: "labels", title: "The label set", parent: "eval" },
  { key: "nearmiss", title: "Near misses", parent: "eval" },
  { key: "score", title: "Score at the current settings", parent: "eval" },

  { key: "detect", title: "Detection" },
  { key: "pattern", title: "The circular barcode pattern", parent: "detect" },
  { key: "scanline", title: "One scanline", parent: "detect" },
  { key: "combine", title: "Combine Scanlines", parent: "detect" },
  { key: "ortho", title: "Scanning orthogonally", parent: "combine" },
  { key: "pose", title: "From marks to a pose", parent: "detect" },
  { key: "fast", title: "Making it fast", parent: "detect" },
  { key: "faster", title: "Making it even faster, and fast to start", parent: "detect" },
  { key: "relabel", title: "Relabelling", parent: "detect" },
  // Both of these ran under "Next steps" until 2026-08-10, which read as future
  // work. They are neither future nor detector: the forward cone of
  // analyzeFrameMan is 14 cells and contains neither fitRingLattice nor
  // fitPlaneMetric; relabelCase's is 23 and contains both. They are the offline
  // labeller, so they belong under it -- which is also where their heading cells
  // have physically sat all along, between denseLabel and fitPlaneRansac.
  { key: "lattice", title: "The ring lattice", parent: "relabel" },
  { key: "constrains", title: "What one mark constrains", parent: "relabel" },
  // "overlay" (was 3.4) and "tests" (was 4.8) removed 2026-08-10. Their heading
  // cells were deleted in an earlier drafting round and the declarations were
  // left behind, so the contents listed two sections the document did not have
  // and a reader following either landed nowhere. Nothing ref()s them. Both were
  // last in their group, so no other number moved.

  { key: "next", title: "Next steps" }
]);};
const _sectionIndex = function _sectionIndex(sections) {
  // key -> { num, title, level, key }. Depth comes from the parent chain rather
  // than a declared level, so a section cannot claim a heading level that
  // disagrees with where it sits.
  const index = new Map();
  const counter = new Map();   // parent key (or "" for top) -> count so far
  for (const s of sections) {
    const parent = s.parent ? index.get(s.parent) : null;
    if (s.parent && !parent) throw new Error(`section ${s.key} has unknown parent ${s.parent}`);
    if (index.has(s.key)) throw new Error(`duplicate section key ${s.key}`);
    const level = parent ? parent.level + 1 : 2;
    // An unnumbered section, and anything under one, stays unnumbered.
    const unnumbered = s.num === null || (parent && parent.num === null);
    let num = null;
    if (!unnumbered) {
      const bucket = s.parent ?? "";
      const n = (counter.get(bucket) ?? 0) + 1;
      counter.set(bucket, n);
      num = parent ? `${parent.num}.${n}` : String(n);
    }
    index.set(s.key, { key: s.key, num, title: s.title, level });
  }
  return index;
};
const _sec = function _sec(sectionIndex, htl) {return ((key) => {
  const s = sectionIndex.get(key);
  if (!s) return htl.html`<h2 style="color:#c96a6a">[missing section: ${key}]</h2>`;
  const text = s.num === null ? s.title : `§${s.num}   ${s.title}`;
  // htl.html cannot take a dynamic tag name, so the heading is built directly.
  const h = document.createElement(`h${Math.min(s.level, 6)}`);
  h.id = `sec-${key}`;
  h.textContent = text;
  return h;
});};
const _ref = function _ref(sectionIndex,htl) {return ((key, label) => {
  const s = sectionIndex.get(key);
  // Loud on purpose. A cross-reference that no longer resolves is the failure
  // this machinery exists to prevent, so it must not render as ordinary text.
  if (!s) return htl.html`<strong style="color:#c96a6a">[missing section: ${key}]</strong>`;
  // Default label is the number. Pass one to make a word in the prose the link
  // itself -- "print out the pattern" reads better than "print out the §2".
  // The key is still resolved either way, so a dead reference is still loud.
  const text = label ?? (s.num === null ? s.title : `§${s.num}`);
  return htl.html`<a href="#sec-${key}" title="${s.num === null ? s.title : `§${s.num} ${s.title}`}"
    onclick=${(ev) => {
      ev.preventDefault();
      const el = document.getElementById(`sec-${key}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }}>${text}</a>`;
});};
const _sectionAudit = function _sectionAudit(htl,sectionIndex) {
  // The numbering is only self-maintaining if nothing writes a number by hand.
  // This reads the module's own source and asserts that.
  //
  // It reads SOURCE rather than the rendered page. A first version walked the
  // DOM and was wrong twice over: it computed before the other cells had
  // mounted their nodes, and document.body contains the <script type="text/plain">
  // module blocks, so it read this very source as if it were prose.
  //
  // It exists because the hand-numbered version rotted invisibly -- on
  // 2026-08-09 eight distinct references pointed at sections the document did
  // not have, and nothing failed.
  const blob = window.lopecode?.contentSync?.("@tomlarkworthy/coded-landmark-tracking");
  if (!blob) return htl.html`<pre>sectionAudit: module source unavailable</pre>`;
  const src = new TextDecoder().decode(blob.bytes);

  const declared = new Set(sectionIndex.keys());
  // ['"] not " -- a single-quoted call was invisible here, so the audit
  // reported a section as headless when it had a heading. The ref check below
  // always accepted both; this one did not, and the mismatch was the bug.
  //
  // Do NOT write an example call in this comment. This function reads the
  // module's own source, so a literal one counts as a second heading and the
  // audit fails on itself -- which is exactly what happened when it was fixed.
  const used = [...src.matchAll(/\bsec\(['"](\w+)['"]\)/g)].map((m) => m[1]);
  const counts = new Map();
  for (const k of used) counts.set(k, (counts.get(k) ?? 0) + 1);
  const noHeading = [...declared].filter((k) => !counts.get(k));
  const twice = [...counts].filter(([, n]) => n > 1).map(([k]) => k);
  const unknown = used.filter((k) => !declared.has(k));
  // Trailing [,)] not ) -- ref takes an optional label, and a pattern that
  // insisted on the closing paren would skip every labelled reference silently,
  // which is the one failure mode this check exists to catch.
  const badRefs = [...src.matchAll(/\bref\(['"](\w+)['"]\s*[,)]/g)]
    .map((m) => m[1]).filter((k) => !declared.has(k));

  // Literal section numbers inside md prose. Walks each md template honouring
  // backslash escapes and ${} holes, so a backtick in the prose cannot end it
  // early -- one cell's prose does contain one.
  const handWritten = [];
  for (const m of src.matchAll(/function \w+\([^)]*\) \{return \(md`/g)) {
    let i = m.index + m[0].length, depth = 0;
    const from = i;
    for (; i < src.length; i++) {
      const c = src[i];
      if (c === "\\") { i++; continue; }
      if (c === "$" && src[i + 1] === "{") { depth++; i++; continue; }
      if (c === "}" && depth) { depth--; continue; }
      if (c === "`" && !depth) break;
    }
    const body = src.slice(from, i);
    const hit = body.match(/§\s*\d[\d.]*/g);
    if (hit) handWritten.push(...hit);
  }

  // Order, not just existence. `sections` IS the numbering, so a heading cell
  // sitting somewhere else makes the contents lie about the document -- and none
  // of the checks above can see it. Reported 2026-08-10: About was declared under
  // The Scanner and rendered above it, and the audit passed that check while it
  // was wrong.
  //
  // Document order is the $def sequence and NOT the order the consts appear in.
  // A cell moves by moving its $def line alone, which is exactly how About was
  // moved, so an audit reading const order would have called the fix a no-op.
  const defAt = new Map();
  [...src.matchAll(/\$def\("(\w+)"/g)].forEach((m, i) => { if (!defAt.has(m[1])) defAt.set(m[1], i); });
  const heads = [...src.matchAll(/^const (\w+) = /gm)];
  const pidOfKey = new Map();
  for (let i = 0; i < heads.length; i++) {
    const body = src.slice(heads[i].index, i + 1 < heads.length ? heads[i + 1].index : src.length);
    for (const q of body.matchAll(/\bsec\(['"](\w+)['"]\)/g))
      if (!pidOfKey.has(q[1])) pidOfKey.set(q[1], heads[i][1]);
  }
  const placed = [...declared]
    .filter((k) => defAt.has(pidOfKey.get(k)))
    .map((k) => ({ k, at: defAt.get(pidOfKey.get(k)) }));
  const misordered = [];
  for (let i = 1; i < placed.length; i++)
    if (placed[i].at < placed[i - 1].at)
      misordered.push(`${placed[i - 1].k} is declared before ${placed[i].k} but comes after it`);

  const checks = [
    ["every section has a heading cell", noHeading.length === 0, noHeading],
    ["headings appear in declared order", misordered.length === 0, misordered],
    ["no section has two heading cells", twice.length === 0, twice],
    ["every sec() key is declared", unknown.length === 0, unknown],
    ["every ref() key is declared", badRefs.length === 0, badRefs],
    ["no hand-written section number in prose", handWritten.length === 0, handWritten]
  ];
  const out = checks.map(([what, ok, detail]) =>
    `${ok ? "ok  " : "FAIL"} ${what}${ok || !detail.length ? "" : "  -> " + JSON.stringify(detail)}`);
  out.push("", `${declared.size} sections`, checks.every(([, ok]) => ok) ? "PASS" : "FAIL");
  return htl.html`<pre style="font-size:12px;line-height:1.4">${out.join("\n")}</pre>`;
};
const _annotation_a2kghjrqqn_note = function _anonymous(md) {return (md`can we reuse hexcase…-04 as a taster image at the top?`);};
const _annotation_a2kghjrqqn = function _annotation_a2kghjrqqn(annotation) {return (annotation({
 "anchor": {
  "surface": "text",
  "module": "@tomlarkworthy/coded-landmark-tracking",
  "region": "cell",
  "afterIndex": 0,
  "cell": "hexFrameReport",
  "pid": "_1i43fis",
  "quote": {
   "prefix": "651\n        \n        \n          ",
   "exact": "hexcase-5ivq-04",
   "suffix": " · 960×720 · 32ms\n          345m"
  },
  "hint": {
   "start": 451,
   "end": 466
  },
  "cellHash": "v2nzjn"
 },
 "createdAt": "2026-08-10T17:07:45.423Z"
}));};
const _annotation_a2agktsxix_note = function _anonymous(md) {return (md`can we color this`);};
const _annotation_a2agktsxix = function _annotation_a2agktsxix(annotation) {return (annotation({
 "anchor": {
  "surface": "text",
  "module": "@tomlarkworthy/coded-landmark-tracking",
  "region": "cell",
  "afterIndex": 0,
  "cell": "axes_md",
  "pid": "_11vsmkp",
  "quote": {
   "prefix": " errororacle14.2pxby vote margin",
   "exact": "18.3px",
   "suffix": "by scanline count25.5pxby covera"
  },
  "hint": {
   "start": 1014,
   "end": 1020
  },
  "cellHash": "mxmex7"
 },
 "createdAt": "2026-08-10T17:30:11.584Z"
}));};
const _annotation_a2bejw88hq_note = function _anonymous(md) {return (md`We ended up with a lot more to this, i.e. extra parameters over a single coordinate fused`);};
const _annotation_a2bejw88hq = function _annotation_a2bejw88hq(annotation) {return (annotation({
 "anchor": {
  "surface": "text",
  "module": "@tomlarkworthy/coded-landmark-tracking",
  "region": "cell",
  "afterIndex": 0,
  "cell": "plane_md",
  "pid": "_nb5x",
  "quote": {
   "prefix": "ial fusion for pose estimation i",
   "exact": "n 6 DOF space.",
   "suffix": " "
  },
  "hint": {
   "start": 135,
   "end": 149
  },
  "cellHash": "68qk4z"
 },
 "createdAt": "2026-08-10T17:30:52.739Z"
}));};
const _annotation_a2yafwfo0f_note = function _anonymous(md) {return (md`aside to the internal module`);};
const _annotation_a2yafwfo0f = function _annotation_a2yafwfo0f(annotation) {return (annotation({
 "anchor": {
  "surface": "text",
  "module": "@tomlarkworthy/coded-landmark-tracking",
  "region": "cell",
  "afterIndex": 0,
  "cell": "wasm_md",
  "pid": "_wsmw0",
  "quote": {
   "prefix": "ipt and shipped a an in-browser ",
   "exact": "Assembly Script Compiler.",
   "suffix": " This makes it faster, and avoid"
  },
  "hint": {
   "start": 84,
   "end": 109
  },
  "cellHash": "8379az"
 },
 "createdAt": "2026-08-10T18:05:55.320Z"
}));};
const _annotation_a2u4x6cyjv_note = function _anonymous(md) {return (md`we need to mention why this one is so screwed up. Readers will wonder.`);};
const _annotation_a2u4x6cyjv = function _annotation_a2u4x6cyjv(annotation) {return (annotation({
 "anchor": {
  "surface": "text",
  "module": "@tomlarkworthy/coded-landmark-tracking",
  "region": "cell",
  "afterIndex": 0,
  "cell": "hexFrameReport",
  "pid": "_1i43fis",
  "quote": {
   "prefix": "651\n        \n        \n          ",
   "exact": "hexcase-5ivq-06",
   "suffix": " · 960×720 · 25ms\n          4/7 "
  },
  "hint": {
   "start": 1130,
   "end": 1145
  },
  "cellHash": "1e732he"
 },
 "createdAt": "2026-08-10T20:12:19.727Z"
}));};
const _annotation_a2ffdnyu3w_note = function _anonymous(md) {return (md`the About seems out of order`);};
const _annotation_a2ffdnyu3w = function _annotation_a2ffdnyu3w(annotation) {return (annotation({
 "anchor": {
  "surface": "text",
  "module": "@tomlarkworthy/coded-landmark-tracking",
  "region": "cell",
  "afterIndex": 0,
  "cell": "toc",
  "pid": "_toc",
  "quote": {
   "prefix": "The Scanner",
   "exact": "About",
   "suffix": "§1  The barcode mark§2  Multiple"
  },
  "hint": {
   "start": 11,
   "end": 16
  },
  "cellHash": "zkl0q9"
 },
 "createdAt": "2026-08-10T20:14:59.710Z"
}));};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };
  const fileAttachments = new Map(["detectrow.wasm","detectrow.as.ts"].map((name) => {
    const module_name = "@tomlarkworthy/coded-landmark-tracking";
    const {status, mime, bytes} = window.lopecode.contentSync(module_name + "/" + encodeURIComponent(name));
    const blob_url = URL.createObjectURL(new Blob([bytes], { type: mime}));
    return [name, {url: blob_url, mimeType: mime}]
  }));
  main.builtin("FileAttachment", runtime.fileAttachments(name => fileAttachments.get(name)));

  $def("_ebocnh", "headline_md", ["md"], _ebocnh);  
  $def("_toc", "toc", ["sectionIndex","htl"], _toc);  
  $def("_sec_scanner", null, ["sec"], _sec_scanner);  
  $def("_0d8v3u6", null, ["md","sec"], _0d8v3u6);  
  $def("_ns9hhpe", null, ["md","ref"], _ns9hhpe);  
  $def("_tastr", "hexTaster", ["whenVisible","invalidation","hexFrameBank","analyzeFrameMan","fitHexPose","hexOverlay","ref","htl"], _tastr);  
  $def("_1ve7ka5", "viewof liveOn", ["Inputs"], _1ve7ka5);  
  $def("_1keow27", "liveOn", ["Generators","viewof liveOn"], _1keow27);  
  $def("_1di846o", "hexRigView", ["htl"], _1di846o);  
  $def("_ktbd9n", "viewof hexRigCfg", ["Inputs"], _ktbd9n);  
  $def("_1pvjep3", "hexRigCfg", ["Generators","viewof hexRigCfg"], _1pvjep3);  
  $def("_1kn5g73", "viewof liveFacing", ["Inputs"], _1kn5g73);  
  $def("_1ncd6hs", "liveFacing", ["Generators","viewof liveFacing"], _1ncd6hs);  
  $def("_xdtu1n", "liveStream", ["liveOn","liveFacing","invalidation"], _xdtu1n);  
  $def("_1sh7vi3", "liveVideo", ["htl","liveStream","invalidation"], _1sh7vi3);  
  $def("_18kb3j3", "hexRigAutosave", ["viewof hexRigCases","htl","invalidation"], _18kb3j3);  
  $def("_1lt19nm", "hexRigOpts", ["hexRigCfg","manLayout"], _1lt19nm);  
  $def("_gwo9xk", "hexRigLoo", ["hexTarget","fitHomography"], _gwo9xk);  
  $def("_1epdu7f", "hexRigScore", [], _1epdu7f);  
  $def("_q7egru", "viewof hexRigCases", ["Inputs"], _q7egru);  
  $def("_cih7ns", "hexRigCases", ["Generators","viewof hexRigCases"], _cih7ns);  
  $def("_lumcap0", "lumaCapture", [], _lumcap0);  
  $def("_1bfhbxi", "hexRig", ["hexRigView","viewof hexRigCases","liveOn","liveVideo","hexRigCfg","analyzeFrameMan","analyzeFrameManAsync","detectPool","hexRigOpts","fitHexPose","hexRigLoo","manScanRows","lumaCapture"], _1bfhbxi);  
  $def("_136sicf", "hexRigCasePanel", ["hexRigCases","htl"], _136sicf);  
  $def("_sec_mark", null, ["sec"], _sec_mark);  
  $def("_ro0bjp", "viewof barcodeId", ["Inputs"], _ro0bjp);  
  $def("_baxx27", "barcodeId", ["Generators","viewof barcodeId"], _baxx27);  
  $def("_phlah3", "barcodeDemo", ["manLayout","barcodeId","manMarkSvgSource","htl","manColor"], _phlah3);  
  $def("_1duxrlh", "barcodeEncoding_md", ["md"], _1duxrlh);  
  $def("_sec_multi", null, ["sec"], _sec_multi);  
  $def("_js23sh", "hexTarget_md", ["md"], _js23sh);  
  $def("_xt3mg6", "hexPrintPanel", ["hexTargetSvg","hexTarget","htl"], _xt3mg6);  
  $def("_q8nv1h", "hexTargetSvg", ["hexTarget","manColor","manPageLevel"], _q8nv1h);  
  $def("_5xkwav", "makeHexTarget", ["manLayout"], _5xkwav);  
  $def("_5gg2ic", "hexTarget", ["makeHexTarget"], _5gg2ic);  
  $def("_13k4hcg", "hexPrintCheck", ["hexTarget","hexTargetSvg","analyzeFrameMan","fitHexPose"], _13k4hcg);  
  $def("_sec_eval", null, ["sec"], _sec_eval);  
  $def("_sec_labels", null, ["sec"], _sec_labels);  
  $def("_vlfyqr", null, ["md","ref"], _vlfyqr);  
  $def("_sec_nearmiss", null, ["sec"], _sec_nearmiss);  
  $def("_1ffq68r", "hexBank_md", ["md"], _1ffq68r);  
  $def("_hxovl", "hexOverlay", [], _hxovl);  
  $def("_1i43fis", "hexFrameReport", ["whenVisible","invalidation","hexFrameBank","analyzeFrameMan","fitHexPose","hexOverlay","htl"], _1i43fis);  
  $def("_whybad", "whyBad_md", ["md","ref"], _whybad);  
  $def("_sec_score", null, ["sec"], _sec_score);  
  $def("_tkkz5a", null, ["md","ref"], _tkkz5a);  
  $def("_1mzjoz4", "hexBankScores", ["whenVisible","invalidation","hexFrameBank","analyzeFrameMan","hexRigOpts","hexRigScore","htl"], _1mzjoz4);  
  $def("_sec_detect", null, ["sec"], _sec_detect);  
  $def("_nb3x", "algo_md", ["md","ref"], _nb3x);  
  $def("_sec_pattern", null, ["sec"], _sec_pattern);  
  $def("_vzqosp", "viewof encodingCfg", ["Inputs"], _vzqosp);  
  $def("_156p83f", "encodingCfg", ["Generators","viewof encodingCfg"], _156p83f);  
  $def("_1w60xe0", "encodingDiagram", ["manLayout","encodingCfg","manColor","htl"], _1w60xe0);  
  $def("_1566rx9", "redesign_md", ["md","tex"], _1566rx9);  
  $def("_1jghxt5", "manLayout", [], _1jghxt5);  
  $def("_manPageLevel", "manPageLevel", [], _manPageLevel);  
  $def("_12dy4hh", "manColor", ["manLayout","manPageLevel"], _12dy4hh);  
  $def("_19a2bc6", "manMarkSvgSource", ["manLayout","manColor","manPageLevel"], _19a2bc6);  
  $def("_4krul3", "renderManFrame", ["manLayout","manColor","manPageLevel"], _4krul3);  
  $def("_ujkuco", "manScene", ["manLayout","renderManFrame","manPageLevel"], _ujkuco);  
  $def("_sec_scanline", null, ["sec"], _sec_scanline);  
  $def("_nb4x", "row_md", ["md"], _nb4x);  
  $def("_2dhvou", "viewof rowWalkCfg", ["Inputs","hexFrameBank"], _2dhvou);  
  $def("_e4xx4t", "rowWalkCfg", ["Generators","viewof rowWalkCfg"], _e4xx4t);  
  $def("_erd4p7", "rowWalkScan", ["hexFrameBank","rowWalkCfg","manScanRows","scanRowsMan"], _erd4p7);  
  $def("_ra002j", "rowWalkRow", ["hexFrameBank","rowWalkCfg","edges1Dsub","detectRowMan","manRowGroups","findInvolution","solveMan","manLayout"], _ra002j);  
  $def("_rwbox", "rowWalkBox", ["rowWalkRow"], _rwbox);  
  $def("_1ta8m6l", "rowWalkFrame", ["hexFrameBank","rowWalkCfg","rowWalkRow","rowWalkBox","rowWalkScan","htl","viewof rowWalkCfg","Event"], _1ta8m6l);  
  $def("_eihwp8", "rowWalkEdges", ["hexFrameBank","rowWalkCfg","rowWalkRow","rowWalkBox","htl"], _eihwp8);  
  $def("_sf5orsi", null, ["md"], _sf5orsi);  
  $def("_wlt2av", "rowWalkGroups", ["rowWalkRow","rowWalkBox","htl"], _wlt2av);  
  $def("_y9u9t68", null, ["md"], _y9u9t68);  
  $def("_7ch6id", "rowWalkLock", ["rowWalkRow","manLayout","htl"], _7ch6id);  
  $def("_7l3m08s", null, ["md"], _7l3m08s);  
  $def("_1gmmbqf", "edges1Dsub", [], _1gmmbqf);  
  $def("_gg8jqp", "findInvolution", [], _gg8jqp);  
  $def("_1mszvx0", "solveMan", ["manLayout"], _1mszvx0);  
  $def("_w574fm", "manRowGroups", ["manLayout"], _w574fm);  
  $def("_rvt6ru", "detectRowMan", ["manLayout","manRowGroups","findInvolution","solveMan"], _rvt6ru);  
  $def("_1mnpthu", "detectFrameMan", ["manLayout","edges1Dsub","findInvolution","solveMan"], _1mnpthu);  
  $def("_sec_combine", null, ["sec"], _sec_combine);  
  $def("_4liiby", "cascade_md", ["md"], _4liiby);  
  $def("_cmbdg", "combineDiagram", ["manScene","manScanRows","scanRowsMan","clusterManRows","htl"], _cmbdg);  
  $def("_10in6wk", "manScanRows", [], _10in6wk);  
  $def("_30gfrc", "scanRowsMan", ["edges1Dsub","detectRowMan"], _30gfrc);  
  $def("_ezke5v", "clusterManRows", ["manLayout","fitManPose"], _ezke5v);  
  $def("_1jt47m8", "analyzeFrameMan", ["rotateFrame","mergeManAxes","manScanRows","clusterManRows","scanRowsMan"], _1jt47m8);  
  $def("_138kml", "fitManPose", ["manLayout"], _138kml);  
  $def("_1xa2cta", "manSceneTest", ["manScene","analyzeFrameMan"], _1xa2cta);  
  $def("_sec_ortho", null, ["sec"], _sec_ortho);  
  $def("_11vsmkp", "axes_md", ["md"], _11vsmkp);  
  $def("_zghole", "rotateFrame", [], _zghole);  
  $def("_rtuzun", "unrotatePoint", [], _rtuzun);  
  $def("_1m3an4z", "mergeManAxes", ["unrotatePoint"], _1m3an4z);  
  $def("_9mkcus", "manAxesTest", ["manScene","analyzeFrameMan","rotateFrame","unrotatePoint"], _9mkcus);  
  $def("_1az419w", "viewof grabPanel", ["liveVideo"], _1az419w);  
  $def("_qag4z6", "grabPanel", ["Generators","viewof grabPanel"], _qag4z6);  
  $def("_sec_pose", null, ["sec"], _sec_pose);  
  $def("_nb5x", "plane_md", ["md","ref"], _nb5x);  
  $def("_9ey4fu", "fitHomography", [], _9ey4fu);  
  $def("_fhsc", "fitHomographyScaled", ["fitHomography"], _fhsc);  
  $def("_1qa5emd", "fitHexPose", ["hexTarget","fitHomography","fitHomographyScaled"], _1qa5emd);  
  $def("_sec_fast", null, ["sec"], _sec_fast);  
  $def("_1v692pi", "pool_md", ["md"], _1v692pi);  
  $def("_10l0bax", "viewof poolSize", ["Inputs"], _10l0bax);  
  $def("_1xat3lz", "poolSize", ["Generators","viewof poolSize"], _1xat3lz);  
  $def("_13ae255", "detectKernelSource", ["manLayout","edges1Dsub","findInvolution","solveMan","manRowGroups","detectRowMan","scanRowsMan","wasmOn","wasmKernelBytes","makeWasmDetectRow"], _13ae255);  
  $def("_l7r79y", "detectPool", ["poolSize","detectKernelSource","invalidation"], _l7r79y);  
  $def("_p4hc5x", "analyzeFrameManAsync", ["rotateFrame","mergeManAxes","manScanRows","scanRowsMan","clusterManRows"], _p4hc5x);  
  $def("_1hgoegm", "poolAgreement", ["whenVisible","invalidation","liveOn","detectPool","hexFrameBank","analyzeFrameMan","analyzeFrameManAsync"], _1hgoegm);  
  $def("_fp9av3", "viewof poolBenchGo", ["Inputs"], _fp9av3);  
  $def("_2jzm2c", "poolBenchGo", ["Generators","viewof poolBenchGo"], _2jzm2c);  
  $def("_1ptv9em", "poolBenchmark", ["poolBenchGo","detectPool","hexFrameBank","analyzeFrameMan","analyzeFrameManAsync"], _1ptv9em);  
  $def("_704z68", "poolReport", ["detectPool","poolAgreement","poolBenchmark","wasmOn","wasmAgreement","md"], _704z68);  
  $def("_sec_faster", null, ["sec"], _sec_faster);  
  $def("_wsmw0", "wasm_md", ["md"], _wsmw0);  
  $def("_wsmc1", "warmupCurve", [], _wsmc1);  
  $def("_wsmc2", "warmupCurveChart", ["warmupCurve","Plot","htl"], _wsmc2);  
  $def("_rv4ces", "wasmShippedBytes", ["FileAttachment"], _rv4ces);  
  $def("_wsmb1", "wasmKernelBytes", ["wasmBuild","wasmShippedBytes"], _wsmb1);  
  $def("_wsmb2", "makeWasmDetectRow", ["manLayout"], _wsmb2);  
  $def("_wsmb3", "wasmDetectRowMan", ["wasmKernelBytes","makeWasmDetectRow","detectRowMan"], _wsmb3);  
  $def("_wsmb4", "viewof wasmOn", ["Inputs"], _wsmb4);  
  $def("_wsmb5", "wasmOn", ["Generators","viewof wasmOn"], _wsmb5);  
  $def("_wsmb6", "wasmAgreement", ["whenVisible","invalidation","liveOn","wasmOn","wasmDetectRowMan","detectRowMan","hexFrameBank","manScanRows","edges1Dsub","hexRigOpts"], _wsmb6);  
  $def("_wsmr1", "wasmSourceText", ["FileAttachment"], _wsmr1);  
  $def("_wsmr2", "viewof wasmRebuildGo", ["Inputs"], _wsmr2);  
  $def("_wsmr3", "wasmRebuildGo", ["Generators","viewof wasmRebuildGo"], _wsmr3);  
  $def("_wsmr4", "wasmBuild", ["wasmRebuildGo","toolchain","wasmSourceText","wasmShippedBytes"], _wsmr4);  
  $def("_wsmr5", "wasmRebuildReport", ["wasmBuild","md"], _wsmr5);  
  $def("_sec_relabel", null, ["sec"], _sec_relabel);  
  $def("_whdwrzx", null, ["md","ref"], _whdwrzx);  
  $def("_io8z64", "resampleAlong", [], _io8z64);  
  $def("_11kt00d", "denseRotations", ["resampleAlong"], _11kt00d);  
  $def("_tdcvy7", "intersectLines", [], _tdcvy7);  
  $def("_f2jo8h", "denseLabel", ["denseRotations","clusterManRows","scanRowsMan","manScanRows","intersectLines"], _f2jo8h);  
  $def("_sec_lattice", null, ["sec"], _sec_lattice);  
  $def("_1k65scp", null, ["md"], _1k65scp);  
  $def("_rlatd", "ringLatticeDiagram", ["whenVisible","invalidation","manScene","manLayout","denseRotations","ringObservations","htl"], _rlatd);  
  $def("_dozrc3", "ringObservations", ["manLayout","edges1Dsub","manRowGroups","findInvolution","solveMan"], _dozrc3);  
  $def("_1878ruu", "fitRingLattice", ["manLayout"], _1878ruu);  
  $def("_sec_constrains", null, ["sec"], _sec_constrains);  
  $def("_h0321j", null, ["md","ref"], _h0321j);  
  $def("_1tm4zrn", "fitPlaneMetric", ["hexTarget"], _1tm4zrn);  
  $def("_56yy58", "fitPlaneRansac", ["hexTarget","fitHomography","fitPlaneMetric"], _56yy58);  
  $def("_vq3w1d", "markContrast", [], _vq3w1d);  
  $def("_1w91i3j", "relabelCase", ["hexTarget","denseRotations","denseLabel","fitPlaneRansac","ringObservations","fitRingLattice","markContrast"], _1w91i3j);  
  $def("_1stieyf", "viewof relabelCfg", ["Inputs","hexFrameBank"], _1stieyf);  
  $def("_1duclsl", "relabelCfg", ["Generators","viewof relabelCfg"], _1duclsl);  
  $def("_1wcv97b", "viewof relabelGo", ["Inputs"], _1wcv97b);  
  $def("_13t348l", "relabelGo", ["Generators","viewof relabelGo"], _13t348l);  
  $def("_o7cs5i", "relabelProgress", ["htl","relabelStatus"], _o7cs5i);  
  $def("_1nbl9h5", "initial relabelStatus", [], _1nbl9h5);  
  $def("_7sp7oz", "mutable relabelStatus", ["Mutable","initial relabelStatus"], _7sp7oz);  
  $def("_np1y0e", "relabelStatus", ["mutable relabelStatus"], _np1y0e);  
  $def("_9og0ba", "relabelRun", ["relabelCfg","relabelGo","hexFrameBank","relabelCase","mutable relabelStatus"], _9og0ba);  
  $def("_vh398d", "relabelReport", ["relabelRun","htl","relabelStatus","relabelCfg","hexFrameBank"], _vh398d);  
  $def("_nb2x", null, ["md"], _nb2x);  
  $def("_16hxrfy", "viewof hexRigSweepGo", ["Inputs"], _16hxrfy);  
  $def("_5e077b", "hexRigSweepGo", ["Generators","viewof hexRigSweepGo"], _5e077b);  
  $def("_1fdcn6e", "renderHexScene", ["hexTarget","manColor","manPageLevel"], _1fdcn6e);  
  $def("_15xffv4", "hexRigSynthCases", ["whenVisible","invalidation","hexTarget","renderHexScene","analyzeFrameMan","fitHexPose","hexRigLoo"], _15xffv4);  
  $def("_zoue8d", "hexRigSweep", ["hexRigSweepGo","hexRigCases","hexRigSynthCases","hexRigCfg","hexRigOpts","analyzeFrameMan","hexRigScore"], _zoue8d);  
  $def("_a0ribc", "hexRigSelfTest", ["whenVisible","invalidation","hexRigSynthCases","hexRigScore","analyzeFrameMan"], _a0ribc);  
  $def("_1kgvsyz", "hexRendererCheck", ["whenVisible","invalidation","manLayout","renderManFrame","analyzeFrameMan","makeHexTarget","renderHexScene","manPageLevel"], _1kgvsyz);  
  $def("_1au9ya6", "hexPitchSweep", ["whenVisible","invalidation","makeHexTarget","renderHexScene","analyzeFrameMan","fitHexPose"], _1au9ya6);  
  $def("_sec_next", null, ["sec"], _sec_next);  
  $def("_nb6x", "next_md", ["md"], _nb6x);  
  $def("_1visgate", "whenVisible", ["IntersectionObserver","localStorage"], _1visgate);  
  main.define("module @tomlarkworthy/editable-md", async () => runtime.module((await import("/@tomlarkworthy/editable-md.js?v=4")).default));  
  main.define("module @tomlarkworthy/assembly-script", async () => runtime.module((await import("/@tomlarkworthy/assembly-script.js?v=4")).default));  
  main.define("module @tomlarkworthy/coded-landmark-tracking-data", async () => runtime.module((await import("/@tomlarkworthy/coded-landmark-tracking-data.js?v=4")).default));  
  main.define("md", ["module @tomlarkworthy/editable-md", "@variable"], (_, v) => v.import("md", _));  
  main.define("hexFrameBank", ["module @tomlarkworthy/coded-landmark-tracking-data", "@variable"], (_, v) => v.import("hexFrameBank", _));  
  main.define("toolchain", ["module @tomlarkworthy/assembly-script", "@variable"], (_, v) => v.import("toolchain", _));  
  main.define("module @tomlarkworthy/annotate", async () => runtime.module((await import("/@tomlarkworthy/annotate.js?v=4")).default));  
  main.define("annotation", ["module @tomlarkworthy/annotate", "@variable"], (_, v) => v.import("annotation", _));  
  $def("_sections", "sections", [], _sections);  
  $def("_sectionIndex", "sectionIndex", ["sections"], _sectionIndex);  
  $def("_sec", "sec", ["sectionIndex","htl"], _sec);  
  $def("_ref", "ref", ["sectionIndex","htl"], _ref);  
  $def("_sectionAudit", "sectionAudit", ["htl","sectionIndex"], _sectionAudit);  
  $def("_annotation_a2kghjrqqn_note", "annotation_a2kghjrqqn_note", ["md"], _annotation_a2kghjrqqn_note);  
  $def("_annotation_a2kghjrqqn", "annotation_a2kghjrqqn", ["annotation"], _annotation_a2kghjrqqn);  
  $def("_annotation_a2agktsxix_note", "annotation_a2agktsxix_note", ["md"], _annotation_a2agktsxix_note);  
  $def("_annotation_a2agktsxix", "annotation_a2agktsxix", ["annotation"], _annotation_a2agktsxix);  
  $def("_annotation_a2bejw88hq_note", "annotation_a2bejw88hq_note", ["md"], _annotation_a2bejw88hq_note);  
  $def("_annotation_a2bejw88hq", "annotation_a2bejw88hq", ["annotation"], _annotation_a2bejw88hq);  
  $def("_annotation_a2yafwfo0f_note", "annotation_a2yafwfo0f_note", ["md"], _annotation_a2yafwfo0f_note);  
  $def("_annotation_a2yafwfo0f", "annotation_a2yafwfo0f", ["annotation"], _annotation_a2yafwfo0f);  
  $def("_annotation_a2u4x6cyjv_note", "annotation_a2u4x6cyjv_note", ["md"], _annotation_a2u4x6cyjv_note);  
  $def("_annotation_a2u4x6cyjv", "annotation_a2u4x6cyjv", ["annotation"], _annotation_a2u4x6cyjv);  
  $def("_annotation_a2ffdnyu3w_note", "annotation_a2ffdnyu3w_note", ["md"], _annotation_a2ffdnyu3w_note);  
  $def("_annotation_a2ffdnyu3w", "annotation_a2ffdnyu3w", ["annotation"], _annotation_a2ffdnyu3w);
  return main;
}
