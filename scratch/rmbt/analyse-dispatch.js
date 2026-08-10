// Split the dispatch log into frames and ask, per frame, where the wall time
// went. A frame is a burst: the pool starts all workers at once, so a post that
// follows a quiet period longer than any in-frame turnaround opens a new frame.
(() => {
  const L = window.__dispatchProbe.log.slice();
  const posts = new Map();
  for (const e of L) if (e.k === "post") posts.set(e.id, e);

  // frame boundary: a post whose predecessor event is >6ms earlier
  const frames = [];
  let cur = null, prevT = -1e9;
  for (const e of L) {
    if (e.k === "post" && e.t - prevT > 6) { cur = []; frames.push(cur); }
    if (cur) cur.push(e);
    prevT = e.t;
  }

  const rows = [];
  for (const f of frames) {
    const ps = f.filter((e) => e.k === "post"), rs = f.filter((e) => e.k === "recv");
    if (ps.length < 6 || rs.length < ps.length) continue; // partial frame at either end
    const t0 = ps[0].t, wall = Math.max(...rs.map((e) => e.t)) - t0;
    const busy = rs.reduce((a, e) => a + (e.ms || 0), 0);
    // first chunk each worker got: latency it could not have spent working
    const first = new Map();
    for (const e of ps) if (!first.has(e.w)) first.set(e.w, e);
    let lat = [];
    for (const [w, p] of first) {
      const r = rs.find((x) => x.id === p.id);
      if (r) lat.push(r.t - p.t - (r.ms || 0));
    }
    // turnaround: main-thread time between a reply landing and that worker's next post
    const turn = [];
    for (const w of new Set(ps.map((e) => e.w))) {
      const seq = f.filter((e) => e.w === w);
      for (let i = 1; i < seq.length; i++)
        if (seq[i - 1].k === "recv" && seq[i].k === "post") turn.push(seq[i].t - seq[i - 1].t);
    }
    // late chunks: round-trip minus work, excluding each worker's first
    const lateOh = [];
    for (const r of rs) {
      const p = posts.get(r.id);
      if (p && first.get(p.w) !== p) lateOh.push(r.t - p.t - (r.ms || 0));
    }
    rows.push({
      chunks: ps.length, wall: +wall.toFixed(1), busy: +busy.toFixed(1),
      util: +(busy / (wall * 6)).toFixed(2),
      firstLat: +(lat.reduce((a, b) => a + b, 0) / lat.length).toFixed(1),
      lateOh: +(lateOh.reduce((a, b) => a + b, 0) / (lateOh.length || 1)).toFixed(2),
      turn: +(turn.reduce((a, b) => a + b, 0) / (turn.length || 1)).toFixed(2)
    });
  }
  const med = (a) => { const s = a.slice().sort((x, y) => x - y); return +s[s.length >> 1].toFixed(2); };
  // frame period, from each frame's first post
  const starts = frames.filter((f) => f.length).map((f) => f[0].t);
  const periods = starts.slice(1).map((t, i) => t - starts[i]);
  return {
    frames: rows.length,
    period: med(periods),
    wall: med(rows.map((r) => r.wall)),
    busy: med(rows.map((r) => r.busy)),
    util: med(rows.map((r) => r.util)),
    firstChunkLatency: med(rows.map((r) => r.firstLat)),
    lateChunkOverhead: med(rows.map((r) => r.lateOh)),
    mainThreadTurnaround: med(rows.map((r) => r.turn)),
    chunks: med(rows.map((r) => r.chunks)),
    sample: rows.slice(0, 6)
  };
})()
