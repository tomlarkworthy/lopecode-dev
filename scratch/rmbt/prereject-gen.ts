// Emit variant arms from one template so every arm shares the same
// re-implementation of the row loop and differs ONLY in the pre-reject test.
// (detectRowMan/analyzeFrameMan have no injection point for a per-group gate,
// so the row loop has to be re-stated here; the `control` arm, whose gate is
// always false, is the proof that the re-statement is faithful.)
import { writeFileSync } from "node:fs";

const TEMPLATE = (name: string, gate: string) => `// ${name}
// Cheap O(1)/O(n) structural rejection in front of findInvolution.
// deps supplies every notebook cell; only the row loop is re-stated, because
// analyzeFrameMan -> detectRowMan -> findInvolution has no hook for a
// per-group gate. \`control\` (gate = false) proves the re-statement faithful.
(deps) => {
  const { manLayout, edges1Dsub, manRowGroups, findInvolution, solveMan, fitManPose } = deps;

  // ---- THE GATE: true = reject this group without running findInvolution --
  const reject = (xs, ss, lo, hi, L) => {
    const n = hi - lo + 1;
    ${gate}
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
`;

const ARMS: Record<string, string> = {
  cap33: `return n > 2 * (L.nT + 1) + 3;`,
  cap36: `return n > 2 * (L.nT + 1) + 6;`,
  cap40: `return n > 2 * (L.nT + 1) + 10;`,
  cap48: `return n > 2 * (L.nT + 1) + 18;`,
};

for (const [name, gate] of Object.entries(ARMS))
  writeFileSync(`scratch/rmbt/arm-${name}.js`, TEMPLATE(name, gate));
console.log("wrote", Object.keys(ARMS).map((n) => `scratch/rmbt/arm-${n}.js`).join(" "));
