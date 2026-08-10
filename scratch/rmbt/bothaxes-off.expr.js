(() => {
  const rt = window.__ojs_runtime || (window.lopecode && window.lopecode.runtime);
  const mod = rt.mains.get("@tomlarkworthy/coded-landmark-tracking");
  if (!mod) return "module not booted";
  mod.redefine("hexRigOpts", ["hexRigCfg", "manLayout"], function _hexRigOpts(hexRigCfg,manLayout) {
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
});
  return "hexRigOpts redefined";
})()