(() => {
  const rt = window.__ojs_runtime || (window.lopecode && window.lopecode.runtime);
  const mod = rt.mains.get("@tomlarkworthy/coded-landmark-tracking");
  if (!mod) return "module not booted";
  mod.redefine("liveStream", ["liveOn", "liveFacing", "invalidation"], async function _liveStream(liveOn,liveFacing,invalidation) {
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
        facingMode: liveFacing,
        frameRate: { ideal: 60 }
      }
    });
    invalidation.then(() => {
      for (const t of s.getTracks()) t.stop();
    });
    return s;
  } catch (e) {
    return { error: String((e && e.message) || e) };
  }
});
  return "liveStream redefined with frameRate ideal 60";
})()