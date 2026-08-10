(() => {
  const rt = window.__ojs_runtime || (window.lopecode && window.lopecode.runtime);
  const mod = rt.mains.get("@tomlarkworthy/coded-landmark-tracking");
  if (!mod) return "module not booted";
  // Kernel first: redefining it rebuilds detectPool, which terminates the old
  // workers. analyzeFrameManAsync is independent of that teardown.
  mod.redefine("detectKernelSource",
    ["manLayout","edges1Dsub","findInvolution","solveMan","manRowGroups","detectRowMan","scanRowsMan","wasmOn","wasmKernelBytes","makeWasmDetectRow"],
    function _detectKernelSource(manLayout,edges1Dsub,findInvolution,solveMan,manRowGroups,detectRowMan,scanRowsMan,wasmOn,wasmKernelBytes,makeWasmDetectRow) {
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
});
  mod.redefine("analyzeFrameManAsync",
    ["rotateFrame","mergeManAxes","manScanRows","scanRowsMan","clusterManRows"],
    function _analyzeFrameManAsync(rotateFrame,mergeManAxes,manScanRows,scanRowsMan,clusterManRows) {return (async function analyzeFrameManAsync(frame, opts = {}) {
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
});});
  return "patched: per-dimension frame cache + concurrent axes";
})()