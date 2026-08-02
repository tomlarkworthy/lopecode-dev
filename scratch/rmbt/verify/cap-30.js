// row-budget: bound the work one scan row may hand to findInvolution.
//
// WHAT IS REIMPLEMENTED, AND WHY
//   Only manRowGroups' internals are changed -- that is the function this
//   variant is arguing about. detectRowMan and analyzeFrameMan's row loop are
//   restated verbatim here ONLY because both close over the module's
//   manRowGroups and there is no way to inject a different one through opts.
//   Everything else (edges1Dsub, findInvolution, solveMan, fitManPose,
//   manLayout) is the real cell, called through deps.
//
// THE COST MODEL THIS ATTACKS
//   findInvolution is ~O(k * n^2) in the edge count n of the group it is
//   handed (up to 3*3*4*4 outer/inner quadruples, each verified against every
//   edge with an inner backward scan). manRowGroups' offerWhole pushes the
//   UNSPLIT run alongside the halves at every level, including the level-0
//   run, so a railing/foliage row with 200 edges hands findInvolution a
//   200-edge group -- ~40000 verification steps per candidate quadruple --
//   for a run that CANNOT be a single mark: a man mark presents at most
//   2*(nT+1)=30 edges, which is the same argument maxEdges (=36) already
//   makes when it forces a split.
//
// THE CHANGE (one line: `emit` refuses a group bigger than maxEdges)
//   Never emit a group with more than maxEdges edges. offerWhole still offers
//   the unsplit run wherever it can help -- a mark cut at its equator by the
//   gapFrac 0.2 split, which is what offerWhole exists for, is by
//   construction a run of at most one mark's worth of edges -- but the giant
//   runs that only exist because the row is busy are dropped.
//
// MEASURED (try-variant, reps 3; timings contended, treat as directional)
//   --subset 20   baseline 118 read / 0 wrong, rowHits 3671, ms_tot 536
//                 capped   122 read / 0 wrong, rowHits 3705, ms_tot 347
//                 synth    24/5 wrong  ->  35/1 wrong;  no frame worse
//   full 70       baseline 391 read / 6 wrong, rowHits 13417, med 29.5 p90 49.1
//                 capped   410 read / 4 wrong, rowHits 13535, med 16.9 p90 26.1
//                 one frame worse (phone-hexcase-08, 5->4)
//   Worst frame 72.4ms -> 30.6ms; the six worst frames are all busy-background
//   ones and all of them lose more than half their time.
//
//   READ GOES UP, WHICH IS NOT A SIDE EFFECT. detectRowMan resolves
//   overlapping locks by lattice support, so a spurious lock found in a
//   200-edge run suppresses the real mark's hit on that row whenever its `sup`
//   is higher. Removing the runs that cannot be a mark removes the
//   suppressors: +19 real reads, -2 real wrong, synth wrong 5 -> 1.
//
//   Cap value swept (subset 20): 30 -> 121 read, 2 frames worse; 36 (=maxEdges)
//   -> 122, none worse; 40 -> 118; 48 -> 118. maxEdges is both the best and the
//   only value with a derivation behind it, so no new constant is introduced.
//
//   looMax rises (0.91 -> 6.04 on the full set) and this is a confound, not a
//   regression: frames like hexcase-06-pre had NO pose at all under the
//   baseline (looR null, 3 marks) and now fit one from 5 marks. The frames that
//   had a fit before either hold or improve (synth-120 21.34 -> 1.85).
(deps) => {
  const { edges1Dsub, findInvolution, solveMan, fitManPose, manLayout } = deps;

  // ---- manRowGroups, with the size bound -------------------------------
  function rowGroups(xs, opts = {}) {
    const L = opts.layout ?? manLayout;
    const gapFrac = opts.gapFrac ?? 0.2;
    const maxEdges = opts.maxEdges ?? 2 * (L.nT + 1) + 6;
    const minEdges = opts.minEdges ?? 6;
    const minSpan = opts.minSpan ?? 14;
    const offerWhole = opts.offerWhole ?? true;
    const cap = 30;
    const out = [];
    const emit = (lo, hi) => { if (hi - lo + 1 <= cap) out.push([lo, hi]); };
    const split = (lo, hi, depth) => {
      const n = hi - lo + 1;
      if (n < minEdges) return;
      const span = xs[hi] - xs[lo];
      if (span < minSpan) return;
      let worst = -1, worstGap = 0;
      for (let i = lo; i < hi; i++) {
        const g = xs[i + 1] - xs[i];
        if (g > worstGap) { worstGap = g; worst = i; }
      }
      const tooWide = worstGap > gapFrac * span;
      const tooMany = n > maxEdges;
      if ((tooWide || tooMany) && worst >= lo && depth < 8) {
        split(lo, worst, depth + 1);
        split(worst + 1, hi, depth + 1);
        if ((tooMany && !tooWide) || offerWhole) emit(lo, hi);
        return;
      }
      emit(lo, hi);
    };
    split(0, xs.length - 1, 0);
    // A CAP ON THE NUMBER OF GROUPS PER ROW IS NOT A LEVER -- MEASURED, DEAD.
    // Keeping only the rowCap largest runs looked free on --subset 20 (real
    // 122, wrong 0, ms_tot 351 -> 323 at rowCap 6) and cost 12 reads on the
    // full 70: 410 -> 398 with six frames worse, all of one sitting
    // (hexcase-5iap-06/08/10/11/12). Rows already average 5-8 groups after the
    // size bound, so the cap only ever binds on the busy rows, and on those the
    // real mark is not the largest run in the row.
    return out;
  }

  // ---- detectRowMan, verbatim except for the groups call ---------------
  function detectRow(scanEdges, opts = {}, tally) {
    const L = opts.layout ?? manLayout;
    const n = scanEdges.length;
    if (n < 6) return [];
    const xs = new Float64Array(n), ss = new Int8Array(n);
    for (let i = 0; i < n; i++) {
      const e = scanEdges[i];
      xs[i] = typeof e === "number" ? e : e.x;
      ss[i] = typeof e === "number" ? 1 : e.s;
    }
    const groups = rowGroups(xs, opts);
    if (tally) { tally.groups += groups.length; for (const [lo, hi] of groups) tally.edges += (hi - lo + 1) * (hi - lo + 1); }
    const hits = [];
    for (const [lo, hi] of groups) {
      const sub = [];
      for (let i = lo; i <= hi; i++) sub.push({ x: xs[i], s: ss[i] });
      const iv = findInvolution(sub, opts);
      if (!iv) continue;
      const r = solveMan(iv, L, opts);
      if (!r.ok || r.sup < 5) continue;
      const pOut = iv.up[iv.up.length - 1];
      const wHalf = (iv.xs[pOut.f] - iv.xs[pOut.e]) / 2;
      hits.push({
        foot: iv.P, d: r.dHat, sup: r.sup, wHalf, id: r.id,
        x0: iv.xs[0], x1: iv.xs[iv.xs.length - 1]
      });
    }
    hits.sort((a, b) => b.sup - a.sup);
    const kept = [];
    for (const h of hits)
      if (!kept.some((k) => Math.abs(k.foot - h.foot) < 0.6 * Math.max(k.wHalf, h.wHalf)))
        kept.push(h);
    return kept;
  }

  // ---- analyzeFrameMan's row path, verbatim ----------------------------
  return function analyzeFrameManBudgeted(frame, opts = {}) {
    const L = opts.layout ?? manLayout;
    const stride = opts.stride ?? 6;
    const thr = opts.edgeThreshold ?? 12;
    const minRows = opts.minRows ?? 3;
    const minVotes = opts.minVotes ?? 2;
    const voteRatio = opts.voteRatio ?? 2;
    const gray = frame.gray, w = frame.w, h = frame.h;
    const t0 = window.performance.now();
    const clusters = [];
    const tally = { groups: 0, edges: 0 };
    let rowsTried = 0, rowHits = 0;
    for (let y = Math.floor(stride / 2); y < h; y += stride) {
      rowsTried++;
      const se = edges1Dsub(gray.subarray(y * w, (y + 1) * w), thr);
      for (const hit of detectRow(se, opts, tally)) {
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
        best.rows.push({ y, d: hit.d, sup: hit.sup, wHalf: hit.wHalf, foot: hit.foot });
        if (hit.id != null) best.votes.set(hit.id, (best.votes.get(hit.id) ?? 0) + 1);
        best.lastY = y;
        best.foot = hit.foot;
        best.wHalf = Math.max(best.wHalf, hit.wHalf);
      }
    }
    const all = [];
    for (const c of clusters) {
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
      rowsTried, rowHits,
      groups: tally.groups, groupEdges: tally.edges,
      ms: window.performance.now() - t0
    };
  };
}
