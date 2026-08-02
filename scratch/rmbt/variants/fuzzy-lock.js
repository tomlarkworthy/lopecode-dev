// fuzzy-lock: the cluster confirmation gate becomes SCORED evidence.
//
// Reimplements ONLY analyzeFrameMan's cluster/confirm layer. Every measurement
// underneath it -- edges1Dsub, detectRowMan (and so manRowGroups/findInvolution/
// solveMan), fitManPose, manLayout -- is the real notebook cell, called through
// deps. Nothing is copied out of the notebook except the cluster bookkeeping
// this variant is arguing about.
//
// MODE "baseline" is the faithful reimplementation, used to prove the copy of
// the loop scores exactly zero delta before the rule is changed.
(deps) => {
  const MODE = "scored";
  const BAR = 3.4;

  return function analyzeFrameManFuzzy(frame, opts = {}) {
    if (opts.bothAxes) return deps.analyzeFrameMan(frame, opts);
    const L = opts.layout ?? deps.manLayout;
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
      const se = deps.edges1Dsub(gray.subarray(y * w, (y + 1) * w), thr);
      for (const hit of deps.detectRowMan(se, opts)) {
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
      const votedId = id;
      if (!(bestN >= minVotes && bestN >= voteRatio * secondN)) id = null;
      const pose = deps.fitManPose(c.rows, L);
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
        wHalf: c.wHalf,
        // extra evidence carried for the scored gate
        _votedId: votedId, _bestN: bestN, _secondN: secondN,
        _aSpread: pose ? pose.aSpread : null,
        // median rim half-width actually MEASURED on the rows: an estimate of
        // the mark's horizontal extent that owes nothing to the V-fit, so
        // b/wMed says whether the fitted vertical extent belongs to the thing
        // the rows saw or to a stack of different things.
        _bOverW: pose && pose.b ? pose.b / (c.rows.map((r) => r.wHalf).sort((x, z) => x - z)[c.rows.length >> 1] || 1) : null,
        _baseOk: !!(id != null && pose && pose.plausible)
      });
    }

    // ---- the gate ---------------------------------------------------------
    // Two INDEPENDENT channels -- the payload (solveMan's emit gate, which
    // measured 0 wrong ids and 0/2000 clutter false positives, so a single
    // emitted id is already evidence and not a coin flip) and the shape
    // (fitManPose's verdict). Baseline requires both to clear a hard bar
    // separately; here they are summed, so a corroborated payload plus
    // coherent geometry can carry a shape gate the cluster fails outright.
    // Every baseline accept scores >= 3.5, so the bar at 3.4 keeps all of
    // them -- this gate only ever WIDENS the shipping one, never demotes.
    // Measured (70 real frames, 6 synth): real read 391 -> 395, real wrong
    // 6 -> 6, synth read 24 -> 25, synth wrong 5 -> 5, rowHits unchanged.
    const decide = (f) => {
      if (MODE === "baseline") return { ok: f._baseOk, conf: f._baseOk ? 9 : 0, id: f._baseOk ? f.id : null };
      if (!f._bestN) return { ok: false, conf: 0, id: null };
      // Payload channel. solveMan's emit gate is strict, but over 70 archived
      // frames a LONE decode is not evidence: promoting single-vote clusters
      // bought 7 reads and 6 wrong ids (ids 24/57/60/10/58 are not even on
      // the target, and two of them landed on a frame with no target in it),
      // and nothing separated the good ones from the bad -- rows, cover,
      // aSpread and axis ratio all overlap. So corroboration stays mandatory,
      // and a contradicting runner-up is conflict, not partial support.
      const p = Math.min(f._bestN, 3)
        + (f._bestN >= 2 ? 0 : -3)
        + (f._secondN === 0 ? 0.5 : f._bestN >= voteRatio * f._secondN ? 0 : -4);
      // Shape channel: fitManPose's verdict, no longer fatal on its own.
      // An aspect failure is forgivable only when the MEASURED axis is the
      // long one (a > b). a comes from rim half-widths the rows measured; b
      // from the V-fit's extrapolation to |d| -> 0. b >> a means the
      // extrapolated axis ran away -- a merged or streaked cluster, which is
      // what the two false id-37 promotions were -- while a > b is a mark
      // that is genuinely flat in the scan direction.
      const shape = f.why === "no-fit" ? -2
        : f.posed ? 1.5
          : f.why === "aspect" && f.aspect != null && f.aspect > 1 ? 0.2
            : f.why === "cover" ? 0 : -3;
      // single-mark coherence -- two checks that are independent of the axis
      // ratio, because both bad promotions the synth set caught were clusters
      // that had merged several marks into one tall fit rather than genuinely
      // foreshortened ones.
      const coh = (f.cover != null && f.cover >= 0.55 ? 0.5 : -1)
        + (f._bOverW != null && f._bOverW <= 2.5 ? 0.5 : -1);
      // the classical double lock is itself strong evidence, and carries every
      // cluster the shipping gate accepts over the bar untouched
      const conf = p + shape + coh
        + (f.rows >= 8 ? 0.4 : 0)
        + (f._aSpread != null && f._aSpread <= 0.35 ? 0.4 : 0)
        + (f._baseOk ? 2 : 0);
      return { ok: conf >= BAR, conf, id: f._votedId };
    };

    const confirmed = [], rejected = [];
    for (const f of all) {
      const v = decide(f);
      if (v.ok) confirmed.push({ ...f, id: v.id, conf: v.conf, tier: f._baseOk ? 1 : 0 });
      else rejected.push(f);
    }
    const byId = new Map();
    for (const f of confirmed) {
      const prev = byId.get(f.id);
      if (!prev) { byId.set(f.id, f); continue; }
      const wins =
        f.tier !== prev.tier ? f.tier > prev.tier
        : f.rows !== prev.rows ? f.rows > prev.rows
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
}
