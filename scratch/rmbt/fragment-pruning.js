const _prunt = function _pruningTable(rowWalkRow,manRowGroups,manLayout,ref,htl) {
  // Every geometric gate between "edges on a row" and "a mark locked", with its
  // value and what it costs ON THE ROW THE FIGURES ABOVE ARE SHOWING. Move the
  // frame or row slider and these numbers move with it.
  //
  // Nothing here restates a constant by hand. The values are recomputed from
  // manLayout exactly as manRowGroups computes them, and the counts come from
  // re-running the REAL manRowGroups with one gate relaxed and diffing, so a
  // gate that changes in the code changes here too. That is the whole point --
  // a table of hand-copied thresholds is wrong the first time anyone tunes one.
  const L = manLayout;
  const { edges, groups, kept } = rowWalkRow;
  const xs = new Float64Array(edges.length);
  edges.forEach((e, i) => { xs[i] = e.x; });

  const base = manRowGroups(xs, {}).length;
  const withOpt = (o) => manRowGroups(xs, o).length;

  const MUT = "var(--theme-foreground-muted,#888)";
  const FG = "var(--theme-foreground,#ccc)";
  const GRN = "#2fe08a", AMB = "#f5a524";

  // A relaxed gate can add groups (it was refusing them) or remove them (it was
  // forcing a split). The sign is the interesting part, so it is shown, not
  // hidden behind an absolute "removed N".
  const seg = [
    ["minEdges", 6, withOpt({ minEdges: 0 }),
     "an involution needs three pairs, so five edges cannot lock whatever they are"],
    ["minSpan", "14px", withOpt({ minSpan: 0 }),
     "a mark narrower than this has its rings inside one pixel of each other"],
    ["gapFrac", 0.2, withOpt({ gapFrac: 1 }),
     `the widest gap INSIDE one mark is the dark disc, 2·${L.teeth[0]} of a 2·${L.R} span — at most 0.21 of it, so a wider gap separates marks rather than rings`],
    ["maxEdges", 2 * (L.nT + 1) + 6, withOpt({ maxEdges: Infinity }),
     `one mark presents at most 2·(nT+1) = ${2 * (L.nT + 1)} edges; more than that plus slack is more than one mark, so split`],
    ["groupCap", 2 * (L.nT + 1) + 3, withOpt({ groupCap: Infinity }),
     "the same bound as a refusal to OFFER: an over-cap run cannot be one mark, and fitting it is the expensive case"]
  ];

  const why = (m) => groups.filter((g) => g.why && m.test(g.why)).length;
  const perGroup = [
    ["opposite signs, P inside both pairs, Q outside the span ±2%, tolPx 1.1, ≥6 inliers",
     why(/no involution/), "no involution fits"],
    [`tooth index within [0, ${L.nT}], positive slope, ≥3 lattice inliers and within 2 of the pairs offered`,
     why(/no lattice/), "no lattice assignment"],
    ["lattice support ≥ 5", why(/lattice support/), "too little support"],
    ["one lock per foot: |Δfoot| < 0.6 · max(wHalf)", why(/overlap|same lock|dropped in overlap/), "duplicate or rival"]
  ];

  const th = (s, w) => htl.html`<th style="text-align:left;font-weight:normal;color:${MUT};padding:2px 10px 2px 0;border-bottom:1px solid #4444;${w ? `width:${w}` : ""}">${s}</th>`;
  const td = (s, o = {}) => htl.html`<td style="padding:2px 10px 2px 0;vertical-align:top;color:${o.c || FG};${o.mono ? "font-family:ui-monospace,monospace;" : ""}">${s}</td>`;
  const delta = (n) => {
    const d = n - base;
    if (d === 0) return htl.html`<span style="color:${MUT}">no change</span>`;
    return htl.html`<span style="color:${d > 0 ? AMB : GRN}">${d > 0 ? "+" : ""}${d}</span>`;
  };

  return htl.html`<figure style="margin:12px 0">
    <div style="font:11px/1.6 ui-monospace,monospace">
      <div style="color:${MUT};margin-bottom:6px">
        On the row above: <b style="color:${FG}">${edges.length}</b> edges →
        <b style="color:${FG}">${base}</b> candidate groups →
        <b style="color:${GRN}">${kept.length}</b> locked.
      </div>
      <table style="border-collapse:collapse;width:100%">
        <tr>${th("segmentation gate", "9em")}${th("value", "6em")}${th("groups if relaxed", "9em")}${th("why the geometry says so")}</tr>
        ${seg.map(([name, val, relaxed, reason]) => htl.html`<tr>
          ${td(name, { mono: true })}${td(val, { mono: true })}${td(delta(relaxed))}${td(reason, { c: MUT })}</tr>`)}
      </table>
      <table style="border-collapse:collapse;width:100%;margin-top:10px">
        <tr>${th("per-group gate", "18em")}${th("killed here", "6em")}${th("reported as")}</tr>
        ${perGroup.map(([name, n, label]) => htl.html`<tr>
          ${td(name, { c: n ? FG : MUT })}${td(n || "—", { mono: true, c: n ? AMB : MUT })}${td(label, { c: MUT })}</tr>`)}
      </table>
    </div>
    <figcaption style="font:11px/1.5 ui-monospace,monospace;color:${MUT};margin-top:6px">
      Relaxing a gate can ADD groups it was refusing or REMOVE ones it was forcing a
      split into, which is why the column is signed. Values are recomputed from the
      layout, not copied. The stages themselves are drawn in ${ref("scanline")}.
    </figcaption>
  </figure>`;
};
