// TEMPLATE -- build-cv.ts substitutes the CFG placeholder, one variant per config.
//
// Reimplements ONLY analyzeFrameMan's cross-row clustering / id vote / dedupe
// stage. Everything upstream (edges1Dsub, detectRowMan and the whole per-row
// cascade underneath it) and downstream (fitManPose, manLayout) is called
// through deps, unmodified.
((deps) => {
  const { edges1Dsub, detectRowMan, fitManPose, manLayout } = deps;
  const CFG = {"footMode":"last","footK":5,"split":true,"sepFrac":1,"seedMinVotes":1,"assignFrac":0,"lloyd":2,"dSplit":true,"dValley":0.55,"dPeak":0.65,"dRise":0.2,"soloSup":10,"soloRows":5};

  const median = (a) => a.length ? a.slice().sort((x, z) => x - z)[a.length >> 1] : 0;

  // Cluster centre used for the foot match. Baseline uses the LAST row's foot,
  // which lets a cluster walk: each hit moves the centre by up to tol, so a
  // chain of hits crosses arbitrary distance and swallows the next mark.
  const centreOf = (c) =>
    CFG.footMode === "last" ? c.foot
      : median(c.feet.length > CFG.footK ? c.feet.slice(-CFG.footK) : c.feet);

  // Vote-seeded partition. A cluster that carries two well-separated id
  // centroids is two marks chained together, not one mark with a misread: the
  // rows that decode DO so near their own equator, so each id's voting rows
  // sit at that mark's centre. Seed on those centroids and reassign every row
  // (voting or not) to the nearest one. Two ids on ONE mark land on the same
  // centroid and are rejected by the separation test, so a misread cannot
  // split a good cluster.
  const splitCluster = (c) => {
    const g = new Map();
    for (const r of c.rows) {
      if (r.id == null) continue;
      let e = g.get(r.id);
      if (!e) g.set(r.id, e = { n: 0, sup: 0, sx: 0, sy: 0 });
      e.n++; e.sup += r.sup; e.sx += r.foot; e.sy += r.y;
    }
    if (g.size < 2) return [c];
    const cands = [...g.entries()]
      .map(([id, e]) => ({ id, n: e.n, sup: e.sup, x: e.sx / e.n, y: e.sy / e.n }))
      .sort((a, b) => (b.sup - a.sup) || (b.n - a.n));
    const wRef = Math.max(median(c.rows.map((r) => r.wHalf)), 8);
    const sep = CFG.sepFrac * wRef;
    const seeds = [];
    for (const s of cands) {
      if (s.n < CFG.seedMinVotes) continue;
      if (seeds.some((p) => Math.hypot(p.x - s.x, p.y - s.y) < sep)) continue;
      seeds.push(s);
    }
    if (seeds.length < 2) return [c];
    let cx = seeds.map((s) => s.x), cy = seeds.map((s) => s.y);
    let out = null;
    for (let it = 0; it <= (CFG.lloyd ?? 0); it++) {
      out = seeds.map(() => ({ rows: [], votes: new Map(), wHalf: 0 }));
      for (const r of c.rows) {
        let bi = -1, bd = Infinity;
        for (let i = 0; i < seeds.length; i++) {
          const d = Math.hypot(cx[i] - r.foot, cy[i] - r.y);
          if (d < bd) { bd = d; bi = i; }
        }
        if (CFG.assignFrac && bd > CFG.assignFrac * wRef) continue;
        const t = out[bi];
        t.rows.push(r);
        if (r.id != null) t.votes.set(r.id, (t.votes.get(r.id) ?? 0) + 1);
        t.wHalf = Math.max(t.wHalf, r.wHalf);
      }
      if (it === (CFG.lloyd ?? 0)) break;
      // recentre on the members, but only on rows that decoded: a rim row of a
      // neighbouring mark that got mis-assigned would drag a plain centroid.
      for (let i = 0; i < seeds.length; i++) {
        const v = out[i].rows.filter((r) => r.id != null);
        const use = v.length >= 2 ? v : out[i].rows;
        if (!use.length) continue;
        cx[i] = use.reduce((a, r) => a + r.foot, 0) / use.length;
        cy[i] = use.reduce((a, r) => a + r.y, 0) / use.length;
      }
    }
    const kept = out.filter((t) => t.rows.length);
    return CFG.offerWhole ? [...kept, c] : kept;
  };

  // Chord-offset trend split. Down one mark |d| runs R -> 0 -> R: one valley.
  // Two marks chained by the foot match give two valleys with a rim-height
  // peak between them, and no vote is needed to see it -- it works on the
  // chain where only one of the two marks ever decoded, which is what the
  // vote-seeded split cannot touch.
  const dSplit = (c, L, minRows) => {
    const R = L.R;
    const rows = c.rows.slice().sort((a, b) => a.y - b.y);
    const seq = [];
    for (const r of rows) {
      const last = seq[seq.length - 1];
      if (last && last.y === r.y) { if (r.d < last.d) last.d = r.d; }
      else seq.push({ y: r.y, d: r.d });
    }
    if (seq.length < 2 * minRows) return [c];
    const vTh = CFG.dValley * R, pTh = CFG.dPeak * R, rise = CFG.dRise * R;
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

  return function analyzeFrameManV(frame, opts = {}) {
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
          const dx = Math.abs(centreOf(c) - hit.foot);
          const tol = Math.max(10, 0.35 * Math.max(c.wHalf, hit.wHalf));
          if (dx < tol && dx < bestD) { bestD = dx; best = c; }
        }
        if (!best) {
          best = { rows: [], votes: new Map(), foot: hit.foot, feet: [], wHalf: hit.wHalf, lastY: y };
          clusters.push(best);
        }
        best.rows.push({ y, d: hit.d, sup: hit.sup, wHalf: hit.wHalf, foot: hit.foot, id: hit.id });
        if (hit.id != null) best.votes.set(hit.id, (best.votes.get(hit.id) ?? 0) + 1);
        best.lastY = y;
        best.foot = hit.foot;
        best.feet.push(hit.foot);
        best.wHalf = Math.max(best.wHalf, hit.wHalf);
      }
    }

    let parts = CFG.split ? [].concat(...clusters.map(splitCluster)) : clusters;
    if (CFG.dSplit) parts = [].concat(...parts.map((c) => dSplit(c, L, minRows)));

    const all = [];
    for (const c of parts) {
      if (c.rows.length < minRows) continue;
      let id = null, bestN = 0, secondN = 0;
      for (const [k, v] of c.votes) {
        if (v > bestN) { secondN = bestN; bestN = v; id = k; }
        else if (v > secondN) secondN = v;
      }
      let ok = bestN >= minVotes && bestN >= voteRatio * secondN;
      if (CFG.voteMode || CFG.soloSup) {
        // Weight a vote by the lattice support that produced it. A row that
        // matched 12 teeth is not the same evidence as one that matched 5,
        // and the count gate treats them alike.
        const sw = new Map(), smax = new Map();
        for (const r of c.rows) {
          if (r.id == null) continue;
          sw.set(r.id, (sw.get(r.id) ?? 0) + r.sup);
          smax.set(r.id, Math.max(smax.get(r.id) ?? 0, r.sup));
        }
        if (CFG.voteMode === "sup") {
          let bid = null, bS = 0, sS = 0;
          for (const [k, v] of sw) {
            if (v > bS) { sS = bS; bS = v; bid = k; }
            else if (v > sS) sS = v;
          }
          id = bid;
          ok = bS >= CFG.minSup && bS >= voteRatio * sS;
        } else if (CFG.voteMode === "both") {
          ok = ok && (sw.get(id) ?? 0) >= CFG.minSup;
          if (!ok && bestN === 1 && secondN === 0 && CFG.soloSup &&
              (smax.get(id) ?? 0) >= CFG.soloSup && c.rows.length >= (CFG.soloRows ?? 0)) ok = true;
        } else if (!ok && bestN === 1 && secondN === 0 &&
                   (smax.get(id) ?? 0) >= CFG.soloSup && c.rows.length >= (CFG.soloRows ?? 0)) {
          ok = true;
        }
      }
      if (!ok) id = null;
      const pose = fitManPose(c.rows, L);
      const ys = c.rows.map((r) => r.y);
      all.push({
        id,
        xc: pose ? pose.xc : median(c.rows.map((r) => r.foot)),
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
