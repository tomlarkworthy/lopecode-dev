// The scan mat: a hexagonal LATTICE of man marks covering a whole sheet.
//
// Written as plain functions taking their dependencies explicitly, so the same
// source is what gets pasted into the notebook as `makeMatTarget` /
// `matTargetSvg` cells. Testing a re-typed copy tests the copy.
//
// Why a lattice rather than the seven-mark cluster:
//
//  - The part being traced SITS ON the mat and hides whatever is under it. A
//    cluster has one centre mark and six neighbours, so a part of any size
//    covers the middle of the target. A lattice just loses the marks it covers
//    and the rest still determine the plane.
//  - Radial distortion grows as r^3, so it is only measurable where marks reach
//    the CORNERS of the frame. Measured on the existing archive, marks sit at a
//    median radius of 199px in a frame whose corner is 600px, and the fitted
//    lens is consequently worth nothing: bootstrapping over half the views
//    swings k1 from -0.035 to +0.288. A sheet-filling lattice is what puts
//    marks out where the lens actually bends.
//
// Ids are the EVEN-PARITY six-bit codewords, 32 of them. A single misread cell
// flips the parity, so the id lands on an odd word that is not on the mat at
// all and is discarded as off-target rather than silently becoming a different
// landmark somewhere else on the sheet.

export function makeMatTarget(L, opts = {}) {
  const diameterMm = opts.diameterMm ?? 32;
  const pitchFactor = opts.pitchFactor ?? 1.45;   // the value hexPitchSweep settled on
  const rollDeg = opts.rollDeg ?? 30;             // and the rotation it settled on
  const pageW = opts.pageW ?? 297;                // A4 landscape
  const pageH = opts.pageH ?? 210;
  const marginMm = opts.marginMm ?? 5;
  const legendMm = opts.legendMm ?? 15;           // bottom strip kept clear of marks
  const parityGuard = opts.parityGuard ?? true;

  const pitchMm = +(diameterMm * pitchFactor).toFixed(3);
  const radiusMm = diameterMm / 2;
  const mmPerUnit = radiusMm / L.R;

  const parity = (v) => { let p = 0; for (let i = 0; i < L.nBits; i++) p ^= (v >> i) & 1; return p; };
  const pool = [];
  for (let v = 0; v < (1 << L.nBits); v++) if (!parityGuard || parity(v) === 0) pool.push(v);

  // usable rectangle for mark CENTRES, in page millimetres
  const halfW = pageW / 2 - marginMm - radiusMm;
  const topLimit = pageH / 2 - marginMm - radiusMm;
  const botLimit = pageH / 2 - marginMm - legendMm - radiusMm;

  // hex lattice in axial coordinates, then rotated as a whole
  const ro = (rollDeg * Math.PI) / 180;
  const cos = Math.cos(ro), sin = Math.sin(ro);
  const reach = Math.ceil(Math.max(pageW, pageH) / pitchMm) + 2;
  const sites = [];
  for (let q = -reach; q <= reach; q++) {
    for (let r = -reach; r <= reach; r++) {
      const ux = pitchMm * (q + r / 2);
      const uy = pitchMm * (Math.sqrt(3) / 2) * r;
      const xMm = ux * cos - uy * sin;
      const yMm = ux * sin + uy * cos;
      if (Math.abs(xMm) > halfW) continue;
      if (yMm > topLimit || yMm < -botLimit) continue;
      sites.push({ q, r, xMm: +xMm.toFixed(4), yMm: +yMm.toFixed(4) });
    }
  }
  // centre-outward, so growing or shrinking the page keeps existing ids put
  sites.sort((a, b) => Math.hypot(a.xMm, a.yMm) - Math.hypot(b.xMm, b.yMm));
  const truncated = Math.max(0, sites.length - pool.length);
  const kept = sites.slice(0, pool.length);

  // Assign ids so that ADJACENT marks are far apart in Hamming distance. The
  // parity guard already turns a single-bit slip into an off-target discard;
  // this is about the two-bit case, where the only thing standing between a
  // misread and a wrong landmark is that the wrong landmark is nowhere near.
  const ham = (a, b) => { let d = 0, x = a ^ b; while (x) { d += x & 1; x >>= 1; } return d; };
  const neighbours = kept.map((s, i) =>
    kept.map((t, j) => (j === i ? -1 : Math.hypot(s.xMm - t.xMm, s.yMm - t.yMm)))
      .map((d, j) => ({ j, d }))
      .filter((o) => o.d > 0 && o.d < pitchMm * 1.2)
      .map((o) => o.j)
  );
  const used = new Array(kept.length).fill(null);
  const taken = new Set();
  for (let i = 0; i < kept.length; i++) {
    let best = null, bestScore = -1;
    for (const id of pool) {
      if (taken.has(id)) continue;
      let score = Infinity;
      for (const j of neighbours[i]) if (used[j] != null) score = Math.min(score, ham(id, used[j]));
      if (score === Infinity) score = L.nBits; // no assigned neighbour yet
      if (score > bestScore) { bestScore = score; best = id; }
    }
    used[i] = best; taken.add(best);
  }

  const marks = kept.map((s, i) => ({
    id: used[i], q: s.q, r: s.r, xMm: s.xMm, yMm: s.yMm,
    bits: Array.from({ length: L.nBits }, (_, j) => (used[i] >> (L.nBits - 1 - j)) & 1)
  }));

  // The clearance that manRowGroups has to work with: the smallest horizontal
  // gap among marks whose row bands overlap. Below about one dark disc no gap
  // rule can separate two marks, and neither of them locks.
  let minRowGapMm = Infinity;
  for (let i = 0; i < marks.length; i++)
    for (let j = i + 1; j < marks.length; j++) {
      if (Math.abs(marks[i].yMm - marks[j].yMm) >= diameterMm) continue;
      minRowGapMm = Math.min(minRowGapMm, Math.abs(marks[i].xMm - marks[j].xMm) - diameterMm);
    }

  return {
    marks, byId: new Map(marks.map((m) => [m.id, m])),
    diameterMm, radiusMm, pitchMm, pitchFactor, rollDeg, mmPerUnit, layout: L,
    pageW, pageH, marginMm, legendMm, parityGuard,
    idsAvailable: pool.length, sitesTruncated: truncated,
    minRowGapMm: Number.isFinite(minRowGapMm) ? +minRowGapMm.toFixed(2) : null,
    rowGapInDiscs: Number.isFinite(minRowGapMm) ? +(minRowGapMm / (2 * 6 * mmPerUnit)).toFixed(2) : null,
    widthMm: +(2 * Math.max(...marks.map((m) => Math.abs(m.xMm))) + diameterMm).toFixed(2),
    heightMm: +(Math.max(...marks.map((m) => m.yMm)) - Math.min(...marks.map((m) => m.yMm)) + diameterMm).toFixed(2)
  };
}

export function matTargetSvg(T, manColor, opts = {}) {
  // Same print conventions as the seven-mark sheet: the page floods mid-gray,
  // each mark is nested full discs drawn outside-in, and no text goes anywhere
  // near the pattern -- a glyph in the gap between two marks puts edges exactly
  // where the row segmenter is trying to find background.
  const L = T.layout;
  const { pageW, pageH } = T;
  const cx0 = pageW / 2, cy0 = (pageH - T.legendMm) / 2;
  const scale = T.radiusMm / L.R;
  const parts = [];
  for (const m of T.marks) {
    const mx = cx0 + m.xMm;
    const my = cy0 - m.yMm;                     // sheet y is up, SVG y is down
    const bounds = [0, ...L.teeth];
    for (let i = bounds.length - 1; i >= 1; i--) {
      const mid = (bounds[i - 1] + bounds[i]) / 2;
      const dark = manColor(mid, m.bits, L) < 128;
      parts.push(`<circle cx="${mx.toFixed(2)}" cy="${my.toFixed(2)}" r="${(bounds[i] * scale).toFixed(2)}" fill="${dark ? "#000000" : "#ffffff"}"/>`);
    }
  }
  const ly = pageH - T.legendMm + 5;
  const legend = [
    `<text x="${T.marginMm + 2}" y="${ly}" font-family="monospace" font-size="3.6" fill="#2a2a2a">man scan mat &#183; ${T.marks.length} marks &#183; ${T.diameterMm}mm &#183; pitch ${T.pitchMm}mm &#183; rotated ${T.rollDeg}&#176; &#183; PRINT AT 100%, not "fit to page"</text>`,
    `<rect x="${T.marginMm + 2}" y="${ly + 4}" width="100" height="0.7" fill="#2a2a2a"/>`,
    `<rect x="${T.marginMm + 2}" y="${ly + 2}" width="0.7" height="4.7" fill="#2a2a2a"/>`,
    `<rect x="${T.marginMm + 101.3}" y="${ly + 2}" width="0.7" height="4.7" fill="#2a2a2a"/>`,
    `<text x="${T.marginMm + 106}" y="${ly + 6}" font-family="monospace" font-size="3.4" fill="#3a3a3a">100 mm &#8212; measure this with a ruler; if it is not 100mm every distance below is wrong by that factor</text>`,
    `<text x="${T.marginMm + 2}" y="${ly + 11}" font-family="monospace" font-size="3.2" fill="#4a4a4a">origin at the centre of the pattern, +y up. The gray is part of the pattern &#8212; do not trim.</text>`
  ];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${pageW}mm" height="${pageH}mm" viewBox="0 0 ${pageW} ${pageH}">
<rect width="${pageW}" height="${pageH}" fill="#808080"/>
${parts.join("\n")}
${legend.join("\n")}
</svg>`;
}

// Where a mark sits on the rasterised page, in pixels -- the truth the print
// check grades against, derived from the millimetre geometry rather than from
// anything the detector said.
export function matMarkPagePx(T, m, pxPerMm) {
  const cx0 = T.pageW / 2, cy0 = (T.pageH - T.legendMm) / 2;
  return { x: (cx0 + m.xMm) * pxPerMm, y: (cy0 - m.yMm) * pxPerMm };
}
