(() => {
  const rt = window.__ojs_runtime || (window.lopecode && window.lopecode.runtime);
  const mod = rt.mains.get("@tomlarkworthy/coded-landmark-tracking");
  if (!mod) return "module not booted";
  window.__chunkMul = window.__chunkMul ?? 3;
  mod.redefine("detectPool", ["poolSize", "detectKernelSource", "invalidation"], function _detectPool(poolSize,detectKernelSource,invalidation) {
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
      const NC = Math.min(ys.length, Math.max(1, Math.round(ws.length * (window.__chunkMul ?? 3))));
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
});
  return "detectPool redefined with chunkMul knob";
})()