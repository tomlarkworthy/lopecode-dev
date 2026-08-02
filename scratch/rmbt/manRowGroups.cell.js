manRowGroups = function manRowGroups(xs, opts = {}) {
  // Split one row's edge positions into candidate per-mark groups.
  //
  // findInvolution enumerates its outer pair from the outermost few edges of
  // whatever it is given, so it can only ever lock ONE mark per call: with two
  // marks in a row the outermost pair straddles both and no involution fits.
  // A live frame has several marks, so the row must be segmented first.
  //
  // The widest gap INSIDE a mark is the dark disc, crossed only near the
  // equator: 2*6 units of a 2*R span, so at most 0.21 of the mark's own span
  // (largest at d=0, and the disc is not crossed at all past d=6). A gap
  // wider than that separates marks, not rings. The edge-count cap is the
  // same argument from the other side: a man mark can present at most
  // 2*(nT+1) edges, so a group holding more than that plus slack is holding
  // more than one thing.
  //
  // gapFrac WAS 0.3, chosen as that 0.21 bound plus slack. That derivation is
  // about one mark IN ISOLATION, and it is the wrong half of the problem on a
  // dense target: two marks whose gap is narrower than gapFrac of the combined
  // span are never separated, and then NEITHER locks, because the outer pair
  // straddles both. The hex calibration sheet is exactly that regime.
  //
  // 0.2 sits BELOW the 0.21 intra-mark bound, so it WILL sometimes cut a mark
  // at its equator. offerWhole is what makes that safe: it offers the unsplit
  // run ALONGSIDE the halves, so a split that cuts a real mark does not delete
  // it. A split is a guess at how many marks are present; offering both lets
  // lattice support decide, which detectRowMan already does and which already
  // happened for count-forced splits. The asymmetry is real -- a wrong split
  // LOSES a mark, a wrong merge merely fails to lock and is discarded.
  //
  // THE TWO ARE A PAIR AND MUST SHIP TOGETHER. 0.2 on its own is faster than
  // the old 0.3 (33ms against 45ms, measured live on one frame) and reads 14
  // more marks across the archive, which makes it look like the better buy --
  // but on the rendered scene in manSceneTest it drops a mark at stride 4 and
  // invents a SPURIOUS one at stride 6. That is the equator cut, and no frame
  // rate is worth a false positive in a positioning system.
  //
  // Measured over the 36-case archive of printed-sheet captures (§11.5),
  // against 252 marks that should be read:
  //   gapFrac 0.3, offerWhole off  (was)  196 read, 0 wrong, median LOO 1.9px
  //   gapFrac 0.2, offerWhole off         210 read, 0 wrong  -- but see above
  //   gapFrac 0.2, offerWhole on   (now)  216 read, 0 wrong, median LOO 2.0px
  // The pair costs roughly 1.7x the old segmentation (76ms against 45ms live,
  // 26.5ms against 21.7ms headless). Pass offerWhole:false to buy that back
  // where a false positive is cheaper than a dropped frame.
  //
  // offerWhole also makes duplicate ids possible, since one mark can lock in
  // both the split and the unsplit group; analyzeFrameMan dedupes by id.
  const L = opts.layout ?? manLayout;
  const gapFrac = opts.gapFrac ?? 0.2;
  const maxEdges = opts.maxEdges ?? 2 * (L.nT + 1) + 6;
  const minEdges = opts.minEdges ?? 6;
  const minSpan = opts.minSpan ?? 14;
  const offerWhole = opts.offerWhole ?? true;
  const out = [];
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
      // a mark straddling the cut would be lost, so also offer the whole run
      if ((tooMany && !tooWide) || offerWhole) out.push([lo, hi]);
      return;
    }
    out.push([lo, hi]);
  };
  split(0, xs.length - 1, 0);
  return out;
}
