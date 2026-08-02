runPipeline = function runPipeline(frame, opts = {}) {
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
    // who actually reads as a valid codeword, not by edge-alignment score alone
    // detectRow dispatches to the involution solver by default, or to the
    // original sweep with opts.solver === "sweep"
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
}
