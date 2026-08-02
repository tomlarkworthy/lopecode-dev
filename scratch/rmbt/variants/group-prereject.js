// group-prereject: an O(1) edge-count bound in front of findInvolution.
//
// manRowGroups' own comment already states the physical bound -- "a man mark
// can present at most 2*(nT+1) edges, so a group holding more than that plus
// slack is holding more than one thing" -- and uses it (maxEdges) to decide to
// SPLIT. But offerWhole then pushes the unsplit run out ALONGSIDE the halves at
// every level of the recursion, so those over-cap parents are handed to
// findInvolution anyway, and they are the expensive ones: findInvolution is
// O(#pair-hypotheses * n^2). Over the 20-frame subset the parents above the cap
// are 18.7% of candidate groups but 72.1% of sum(n^2); on the rendered scenes,
// 41.1% of groups and 91.0% of the cost.
//
// So: keep offerWhole (it is worth +6 reads), but do not run the involution fit
// on a group that the layout says cannot be one mark. The gate is
//
//     n > 2*(L.nT + 1) + 3      (= 33 for the shipping layout)
//
// Slack 3 rather than manRowGroups' 6 because it measured better; 32..35 is a
// flat plateau (real 122 on the subset for all four), 30 (no slack) is too
// tight -- it drops real marks and takes worst leave-one-out to 2.69.
//
// It does NOT just buy time. Full 70-frame archive, against baseline:
//     read 391 -> 412, wrong 6 -> 4, ms_med 29.4 -> 16.0, rowHits 13417 -> 13023
//     synth   read 24 -> 37, wrong 5 -> 0
// An over-cap group spans two or more marks, and when it locks it contributes a
// hit at a foot between them carrying a decoded id from neither. That poisons
// the cluster vote (voteRatio 2) and the duplicate-id dedup, which is why
// removing them RAISES read instead of lowering it. One frame regresses:
// phone-hexcase-08 5 -> 4 (does not come back until slack 18, which costs 13
// reads elsewhere). The looMax 0.91 -> 6.04 is not a degradation: it is
// hexcase-06-pre going from 3 marks and NO pose at all to 5 marks with a poor
// one.
//
// RULED OUT by measurement, on 17231 real / 7969 synth candidate groups
// (scratch/rmbt/prereject-study.ts), all of them because locking groups do not
// have the clean structure the idea assumes -- edges1Dsub at thr=12 emits
// consecutive same-sign gradient peaks freely, and a locking group routinely
// carries clutter edges that findInvolution simply does not use as inliers:
//   sign alternation (no two adjacent equal signs) keeps 913 of 7092 locks
//   alternation with 3 violations allowed          3732 of 7092
//   even edge count (the parity a fully mirrored,  3722 of 7092
//     strictly alternating group must have)
//   mirror sign consistency ss[lo+k] == -ss[hi-k]  1574 of 7092
//   outermost pair oriented dark-in/dark-out       2374 of 7092
//   >=3 mirror matches about the group midpoint at 6884 of 7092, and it removes
//     10% of span (a cheap affine stand-in for the  only 2.5% of sum(n^2) --
//     involution)                                   it rejects small groups,
//                                                   and cost is all in big ones
//
// deps supplies every notebook cell; only the row loop is re-stated, because
// analyzeFrameMan -> detectRowMan -> findInvolution has no hook for a per-group
// gate. The same file generated with `reject` = false scores EXACTLY zero delta
// on every column against baseline, which is the proof the re-statement is
// faithful (scratch/rmbt/prereject-gen.ts, arm `control`).
(deps) => {
  const { manLayout, edges1Dsub, manRowGroups, findInvolution, solveMan, fitManPose } = deps;

  // ---- THE GATE: true = reject this group without running findInvolution --
  const reject = (xs, ss, lo, hi, L) => {
    const n = hi - lo + 1;
    return n > 2 * (L.nT + 1) + 3;
  };

  const detectRow = (scanEdges, opts, L, stat) => {
    const n = scanEdges.length;
    if (n < 6) return [];
    const xs = new Float64Array(n), ss = new Int8Array(n);
    for (let i = 0; i < n; i++) {
      const e = scanEdges[i];
      xs[i] = typeof e === "number" ? e : e.x;
      ss[i] = typeof e === "number" ? 1 : e.s;
    }
    const groups = manRowGroups(xs, opts);
    const hits = [];
    for (const [lo, hi] of groups) {
      stat.groups++;
      if (reject(xs, ss, lo, hi, L)) { stat.rejected++; continue; }
      const sub = [];
      for (let i = lo; i <= hi; i++) sub.push({ x: xs[i], s: ss[i] });
      const iv = findInvolution(sub, opts);
      if (!iv) continue;
      const r = solveMan(iv, L, opts);
      if (!r.ok || r.sup < 5) continue;
      const pOut = iv.up[iv.up.length - 1];
      const wHalf = (iv.xs[pOut.f] - iv.xs[pOut.e]) / 2;
      hits.push({ foot: iv.P, d: r.dHat, sup: r.sup, wHalf, id: r.id,
                  x0: iv.xs[0], x1: iv.xs[iv.xs.length - 1] });
    }
    hits.sort((a, b) => b.sup - a.sup);
    const kept = [];
    for (const h of hits)
      if (!kept.some((k) => Math.abs(k.foot - h.foot) < 0.6 * Math.max(k.wHalf, h.wHalf)))
        kept.push(h);
    return kept;
  };

  return function analyze(frame, opts = {}) {
    const L = opts.layout ?? manLayout;
    const stride = opts.stride ?? 6;
    const thr = opts.edgeThreshold ?? 12;
    const minRows = opts.minRows ?? 3;
    const minVotes = opts.minVotes ?? 2;
    const voteRatio = opts.voteRatio ?? 2;
    const gray = frame.gray, w = frame.w, h = frame.h;
    const t0 = window.performance.now();
    const clusters = [];
    const stat = { groups: 0, rejected: 0 };
    let rowsTried = 0, rowHits = 0;
    for (let y = Math.floor(stride / 2); y < h; y += stride) {
      rowsTried++;
      const se = edges1Dsub(gray.subarray(y * w, (y + 1) * w), thr);
      for (const hit of detectRow(se, opts, L, stat)) {
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
      groupsSeen: stat.groups, groupsRejected: stat.rejected,
      rowsTried, rowHits, ms: window.performance.now() - t0
    };
  };
}
