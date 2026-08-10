// Can this camera beat 30fps? getSettings().frameRate is what the driver was
// ASKED for; presentedFrames from requestVideoFrameCallback is what actually
// arrived. Only the second one is evidence.
//
// Reconfigures the live track in place rather than opening a second stream:
// Android will not hand out the same camera twice, and a second getUserMedia
// can silently reconfigure the one the rig is already reading.
//
// Every step is deadlined and the restore runs in a finally. The first version
// of this had neither, hung for two minutes inside applyConstraints, and left
// the camera in whatever state it had reached.
(async () => {
  const v = [...document.querySelectorAll("video")].find((x) => x.srcObject && x.videoWidth);
  if (!v) return { err: "no live video element" };
  if (!v.requestVideoFrameCallback) return { err: "no requestVideoFrameCallback on this build" };
  const track = v.srcObject.getVideoTracks()[0];
  const original = track.getSettings();
  const log = [];

  const deadline = (p, ms, what) =>
    Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error("timeout: " + what)), ms))]);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // presentedFrames counts what the compositor received, so it survives a busy
  // main thread that misses callbacks.
  const measure = (ms) => new Promise((res) => {
    let first = null, t0 = 0, last = 0, n = 0;
    const done = () => res({ fps: n > 1 ? +(((last - first) / (performance.now() - t0)) * 1000).toFixed(1) : null, cb: n });
    const guard = setTimeout(done, ms + 1500); // a stalled camera fires no callbacks at all
    const tick = (now, meta) => {
      if (first === null) { first = meta.presentedFrames; t0 = now; }
      last = meta.presentedFrames; n++;
      if (now - t0 < ms) v.requestVideoFrameCallback(tick);
      else { clearTimeout(guard); done(); }
    };
    v.requestVideoFrameCallback(tick);
  });

  const attempt = async (label, constraints) => {
    let err = null;
    try { await deadline(track.applyConstraints(constraints), 4000, "applyConstraints " + label); }
    catch (e) { err = (e.name || "Error") + ": " + e.message; }
    await sleep(800);
    const s = track.getSettings();
    const m = await measure(1800);
    return { label, err, w: s.width, h: s.height, askedFps: s.frameRate, realFps: m.fps, cb: m.cb };
  };

  try {
    log.push(await attempt("baseline (no change)", {}));
    log.push(await attempt("60 @ current res", { frameRate: { ideal: 60 } }));
    log.push(await attempt("60 @ 720x1280", { width: { ideal: 720 }, height: { ideal: 1280 }, frameRate: { ideal: 60 } }));
    log.push(await attempt("60 @ 480x640", { width: { ideal: 480 }, height: { ideal: 640 }, frameRate: { ideal: 60 } }));
    log.push(await attempt("min 50 (throws if unsupported)", { frameRate: { min: 50 } }));
  } catch (e) {
    log.push({ label: "ABORTED", err: String(e && e.message) });
  } finally {
    try {
      await deadline(track.applyConstraints({
        width: { ideal: original.width }, height: { ideal: original.height },
        frameRate: { ideal: original.frameRate }
      }), 5000, "restore");
    } catch (e) { log.push({ label: "RESTORE FAILED", err: String(e && e.message) }); }
    await sleep(800);
  }
  const s = track.getSettings();
  log.push({ label: "final state", w: s.width, h: s.height, askedFps: s.frameRate, vw: v.videoWidth, vh: v.videoHeight });
  return log;
})()
