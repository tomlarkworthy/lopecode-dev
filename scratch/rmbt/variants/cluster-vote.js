// cluster-vote -- split a cluster that is two marks before the id vote runs.
//
// Reimplements ONLY analyzeFrameMan's cross-row clustering / vote / dedupe
// stage. edges1Dsub, detectRowMan (and the whole per-row cascade under it),
// fitManPose and manLayout are called through deps, unmodified. The row loop,
// the foot-match rule, minRows/minVotes/voteRatio and the dedupe are byte-for
// -byte the shipping ones; an arm with both splits disabled scores exactly
// baseline (measured: real 118/0, synth 24/5 on --subset 20).
//
// WHAT WAS WRONG. The foot match keeps the LAST row's foot as the cluster
// centre, and admits a hit within max(10, 0.35*wHalf) of it. Each accepted hit
// moves the centre, so a cluster WALKS: a chain of hits crosses arbitrary
// distance and swallows the next mark. Instrumented over the archive, the
// dominant failure is one cluster holding two or three marks --
//   phone-hexcase-07   82 rows, votes {56:14, 51:11}, rejected "aspect"
//   hexcase-5iap-13    62 rows, votes {51:8, 56:7, 22:4}, rejected "aspect"
//   synth-160          57 rows, votes {46:4, 56:3, 37:3}
// -- which loses BOTH marks (the merged shape fails the pose gate) or keeps
// one at the merged centroid (misplaced: synth-130 was 66px out, synth-120
// 51px). The vote gate was rarely the binding constraint; the cluster was.
//
// Two splits, both applied before any gate:
//
// 1. VOTE-SEEDED PARTITION. A row decodes near its own mark's equator, so each
//    id's voting rows sit at that mark's centre. Seed on the per-id (foot, y)
//    centroids, keep seeds more than one median rim half-width apart, then
//    reassign EVERY row -- voting or not -- to the nearest seed, two Lloyd
//    steps, recentring on decoded rows only. Two ids on ONE mark (a misread)
//    land on the same centroid and the separation test drops the second, so a
//    misread cannot split a good cluster. Seeds are ranked by summed lattice
//    support, which is what "weight votes by hit.sup" turned out to be good
//    for; as a *gate* sup weighting was worse than counting (measured below).
//
// 2. CHORD-OFFSET TREND SPLIT. Down one mark |d| runs R -> 0 -> R: one valley.
//    A chain gives two valleys with a rim-height peak between them, and needs
//    no vote to see, so it catches the chains where only one of the two marks
//    ever decoded -- which is what (1) cannot touch. Cut at the peak.
//
// MEASURED, 70 archived frames x 3 reps + the 6 rendered scenes:
//                       real read  wrong | synth read  wrong
//   baseline               391/490    6  |     24/42     5
//   this                   412/490    6  |     34/42     1
// rowHits identical (13417): nothing here changes what the row cascade does,
// so the cost is the same candidate groups, plus one pass over the hits.
// Two frames get worse: hexcase-213 6->5 read, hexcase-5ivq-06 2->3 wrong.
// looMax rises 0.91 -> 6.19, which is the known leave-one-out blow-up on a
// frame that now poses at all with a near-minimal point set, not a new error
// on a frame that already posed.
//
// WHAT DID NOT WORK, measured on --subset 20 against real 118 / synth 24,5:
//   median-of-last-5 foot as the cluster centre, instead of the last row's:
//     real 118, synth 12 (-12). The foot genuinely drifts down a tilted mark;
//     a lagging median rejects the true continuation and fragments the
//     cluster, so this is the one idea in the brief that is simply wrong.
//   sup-weighted vote GATE (id = argmax of summed sup, threshold on sup):
//     synth wrong 5 -> 2 but real read 118 -> 119 only, and it dropped reads
//     on three real frames. The count gate plus the splits beats it.
//   accepting a single vote when its row has high support: +7 real read for
//     +4 real wrong (391/6 -> 419/10). Net negative at the 3x weight on a
//     wrong id, so it is out.
//   offering the unsplit cluster alongside the parts, capping assignment
//     distance, a minimum row count for split parts, and dedupe by vote margin
//     before rows: all exactly inert on the full set (412/6, 34/1).
((deps) => {
  const { edges1Dsub, detectRowMan, fitManPose, manLayout } = deps;

  const SEP_FRAC = 1.0;     // seed separation, in median rim half-widths
  const LLOYD = 2;          // reassignment passes after seeding
  const D_VALLEY = 0.55;    // |d|/R below this is "at an equator"
  const D_PEAK = 0.65;      // |d|/R above this is "at a rim"
  const D_RISE = 0.20;      // |d|/R that must be climbed to count as a turn

  const median = (a) => (a.length ? a.slice().sort((x, z) => x - z)[a.length >> 1] : 0);

  const voteSplit = (c) => {
    const g = new Map();
    for (const r of c.rows) {
      if (r.id == null) continue;
      let e = g.get(r.id);
      if (!e) g.set(r.id, (e = { n: 0, sup: 0, sx: 0, sy: 0 }));
      e.n++; e.sup += r.sup; e.sx += r.foot; e.sy += r.y;
    }
    if (g.size < 2) return [c];
    const wRef = Math.max(median(c.rows.map((r) => r.wHalf)), 8);
    const sep = SEP_FRAC * wRef;
    const seeds = [];
    for (const s of [...g.entries()]
      .map(([id, e]) => ({ id, n: e.n, sup: e.sup, x: e.sx / e.n, y: e.sy / e.n }))
      .sort((a, b) => b.sup - a.sup || b.n - a.n)) {
      if (seeds.some((p) => Math.hypot(p.x - s.x, p.y - s.y) < sep)) continue;
      seeds.push(s);
    }
    if (seeds.length < 2) return [c];
    const cx = seeds.map((s) => s.x), cy = seeds.map((s) => s.y);
    let out = null;
    for (let it = 0; it <= LLOYD; it++) {
      out = seeds.map(() => ({ rows: [], votes: new Map(), wHalf: 0 }));
      for (const r of c.rows) {
        let bi = 0, bd = Infinity;
        for (let i = 0; i < seeds.length; i++) {
          const d = Math.hypot(cx[i] - r.foot, cy[i] - r.y);
          if (d < bd) { bd = d; bi = i; }
        }
        const t = out[bi];
        t.rows.push(r);
        if (r.id != null) t.votes.set(r.id, (t.votes.get(r.id) ?? 0) + 1);
        if (r.wHalf > t.wHalf) t.wHalf = r.wHalf;
      }
      if (it === LLOYD) break;
      // recentre on decoded rows only: a rim row of a neighbour that got
      // mis-assigned would drag a plain centroid off its own mark.
      for (let i = 0; i < seeds.length; i++) {
        const v = out[i].rows.filter((r) => r.id != null);
        const use = v.length >= 2 ? v : out[i].rows;
        if (!use.length) continue;
        cx[i] = use.reduce((a, r) => a + r.foot, 0) / use.length;
        cy[i] = use.reduce((a, r) => a + r.y, 0) / use.length;
      }
    }
    return out.filter((t) => t.rows.length);
  };

  const dSplit = (c, L, minRows) => {
    const R = L.R;
    const seq = [];
    for (const r of c.rows.slice().sort((a, b) => a.y - b.y)) {
      const last = seq[seq.length - 1];
      if (last && last.y === r.y) { if (r.d < last.d) last.d = r.d; }
      else seq.push({ y: r.y, d: r.d });
    }
    if (seq.length < 2 * minRows) return [c];
    const vTh = D_VALLEY * R, pTh = D_PEAK * R, rise = D_RISE * R;
    const cuts = [];
    let minD = seq[0].d, maxD = -1, maxI = -1, climbing = false;
    for (let i = 1; i < seq.length; i++) {
      const d = seq[i].d;
      if (!climbing) {
        if (d < minD) minD = d;
        else if (minD <= vTh && d > minD + rise) { climbing = true; maxD = d; maxI = i; }
      } else {
        if (d > maxD) { maxD = d; maxI = i; }
        else if (maxD >= pTh && d < maxD - rise) { cuts.push(seq[maxI].y); climbing = false; minD = d; }
      }
    }
    if (!cuts.length) return [c];
    const parts = [];
    let lo = -Infinity;
    for (const cut of [...cuts, Infinity]) {
      const rs = c.rows.filter((r) => r.y > lo && r.y <= cut);
      lo = cut;
      if (!rs.length) continue;
      const votes = new Map();
      let wHalf = 0;
      for (const r of rs) {
        if (r.id != null) votes.set(r.id, (votes.get(r.id) ?? 0) + 1);
        if (r.wHalf > wHalf) wHalf = r.wHalf;
      }
      parts.push({ rows: rs, votes, wHalf });
    }
    return parts.length ? parts : [c];
  };

  return function analyzeFrameManClusterVote(frame, opts = {}) {
    const L = opts.layout ?? manLayout;
    const stride = opts.stride ?? 6;
    const thr = opts.edgeThreshold ?? 12;
    const minRows = opts.minRows ?? 3;
    const minVotes = opts.minVotes ?? 2;
    const voteRatio = opts.voteRatio ?? 2;
    const gray = frame.gray, w = frame.w, h = frame.h;
    const t0 = window.performance.now();
    const clusters = [];
    let rowsTried = 0, rowHits = 0;
    for (let y = Math.floor(stride / 2); y < h; y += stride) {
      rowsTried++;
      const se = edges1Dsub(gray.subarray(y * w, (y + 1) * w), thr);
      for (const hit of detectRowMan(se, opts)) {
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
        // id is carried on the row now: the split needs to know which row said
        // what, which the aggregate vote map cannot answer.
        best.rows.push({ y, d: hit.d, sup: hit.sup, wHalf: hit.wHalf, foot: hit.foot, id: hit.id });
        if (hit.id != null) best.votes.set(hit.id, (best.votes.get(hit.id) ?? 0) + 1);
        best.lastY = y;
        best.foot = hit.foot;
        best.wHalf = Math.max(best.wHalf, hit.wHalf);
      }
    }

    let parts = [];
    for (const c of clusters) parts.push(...voteSplit(c));
    const split = [];
    for (const c of parts) split.push(...dSplit(c, L, minRows));
    parts = split;

    const all = [];
    for (const c of parts) {
      if (c.rows.length < minRows) continue;
      let id = null, bestN = 0, secondN = 0;
      for (const [k, v] of c.votes) {
        if (v > bestN) { secondN = bestN; bestN = v; id = k; }
        else if (v > secondN) secondN = v;
      }
      if (!(bestN >= minVotes && bestN >= voteRatio * secondN)) id = null;
      const pose = fitManPose(c.rows, L);
      const ys = c.rows.map((r) => r.y);
      all.push({
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
      });
    }

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
      unidentified: rejected,
      rowsTried, rowHits, ms: window.performance.now() - t0
    };
  };
})
