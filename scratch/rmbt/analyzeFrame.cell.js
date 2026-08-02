analyzeFrame = async function analyzeFrame(frame, opts = {}) {
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

  // pass 1 -- coarse, and harvest the geometry
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
}
