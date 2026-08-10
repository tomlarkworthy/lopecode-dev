(() => {
  const rt = window.__ojs_runtime || (window.lopecode && window.lopecode.runtime);
  const mod = rt.mains.get("@tomlarkworthy/coded-landmark-tracking");
  if (!mod) return "module not booted";
  mod.redefine("analyzeFrameManAsync",
    ["rotateFrame","mergeManAxes","manScanRows","scanRowsMan","clusterManRows"], function _analyzeFrameManAsync(rotateFrame,mergeManAxes,manScanRows,scanRowsMan,clusterManRows) {return (async function analyzeFrameManAsync(frame, opts = {}) {
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
});});
  return "arm: SEQUENTIAL";
})()