// Flat trace: one photo of a part lying on the mat -> its outline in true
// millimetres -> DXF.
//
// Written as plain functions taking dependencies explicitly, so this source is
// what goes into the notebook as cells.
//
// The whole thing rests on one asset nothing else has: THE BACKGROUND IS
// KNOWN. The mat is not "whatever was behind the object" -- it is a pattern we
// printed, whose appearance at any point on the plane can be evaluated in
// closed form. So instead of segmenting the object, we predict the mat and
// subtract it, and the object is what is left. No training, no chroma key, no
// assumption that the part differs from paper in colour.

// ---------------------------------------------------------------- plane <-> px
// A pixel maps to the plane through the calibrated lens and the fitted pose.
// Tracing happens in PIXEL space and only the finished contour is mapped to
// millimetres: resampling the image to a rectified raster first would blur the
// very edge we are trying to locate to a fraction of a pixel.
export function makePlaneMap(calib, I, pose) {
  const R = calib.rodrigues(pose.slice(0, 3));
  const t = [pose[3], pose[4], pose[5]];
  const rt = (i, j) => R[j][i];                       // R transpose
  // world = R^T (s*d - t) for a ray direction d; the world Z of that is
  // s*dz - (R^T t)_z, so landing on the plane Z=z means s = (z + (R^T t)_z)/dz.
  // toPlane is just the z=0 case and MUST agree with it there.
  const rtz = rt(2, 0) * t[0] + rt(2, 1) * t[1] + rt(2, 2) * t[2];
  const back = (u, v, z) => {
    const [xn, yn] = calib.unproject(I, u, v);
    const dz = rt(2, 0) * xn + rt(2, 1) * yn + rt(2, 2);
    if (Math.abs(dz) < 1e-12) return null;
    const s = (z + rtz) / dz;
    return [
      rt(0, 0) * (s * xn - t[0]) + rt(0, 1) * (s * yn - t[1]) + rt(0, 2) * (s - t[2]),
      rt(1, 0) * (s * xn - t[0]) + rt(1, 1) * (s * yn - t[1]) + rt(1, 2) * (s - t[2])
    ];
  };
  return {
    toPlane(u, v) { return back(u, v, 0); },
    // Back-project onto a plane at HEIGHT z above the mat. A part with
    // thickness shows its top face, not its footprint, and at tilt theta the
    // two differ by z*tan(theta) -- 0.5mm for a 3mm part at only 10 degrees.
    toPlaneAt(u, v, z) { return back(u, v, z); },
    toPixel(X, Y) { return calib.project(I, pose, X, Y); },
    tiltDeg: (Math.acos(Math.min(1, Math.abs(R[2][2]))) * 180) / Math.PI
  };
}

// ------------------------------------------------------------- expected mat
// The mat's grey level at a point on the plane, straight from the geometry we
// printed. Marks are nested discs; anywhere outside every mark is the flood.
export function makeMatSampler(T, manColor) {
  const L = T.layout;
  const scale = T.radiusMm / L.R;                     // mm per layout unit
  const R2 = T.radiusMm * T.radiusMm;
  // bucket marks so the lookup is not a scan of the whole sheet per pixel
  const cell = T.pitchMm;
  const key = (i, j) => i * 10007 + j;
  const grid = new Map();
  for (const m of T.marks) {
    const i = Math.floor(m.xMm / cell), j = Math.floor(m.yMm / cell);
    for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) {
      const k = key(i + di, j + dj);
      if (!grid.has(k)) grid.set(k, []);
      grid.get(k).push(m);
    }
  }
  const FLOOD = 0x80;
  return function matGray(X, Y) {
    const near = grid.get(key(Math.floor(X / cell), Math.floor(Y / cell)));
    if (near) {
      for (const m of near) {
        const dx = X - m.xMm, dy = Y - m.yMm;
        const d2 = dx * dx + dy * dy;
        if (d2 <= R2) return manColor(Math.sqrt(d2) / scale, m.bits, L);
      }
    }
    return FLOOD;
  };
}

// ------------------------------------------------------------ the difference
// Predict the mat over the region of interest, fit ONE global gain and offset
// to the camera's exposure, and return the signed difference field. Fitting the
// exposure matters: a photo two stops down would otherwise read as an object
// covering the whole sheet.
export function matDifference(frame, map, matGray, opts = {}) {
  const { gray, w, h } = frame;
  const roiMm = opts.roiMm ?? null;                   // [xMin,yMin,xMax,yMax] on the plane
  const diff = new Float32Array(w * h);
  const inRoi = new Uint8Array(w * h);
  const pred = new Float32Array(w * h);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const p = map.toPlane(x + 0.5, y + 0.5);
      if (!p) continue;
      if (roiMm && (p[0] < roiMm[0] || p[0] > roiMm[2] || p[1] < roiMm[1] || p[1] > roiMm[3])) continue;
      inRoi[i] = 1;
      pred[i] = matGray(p[0], p[1]);
    }
  }
  // Least squares a*pred + b ~ actual, over the ROI, on a trimmed sample: the
  // object itself is in this data and would drag the exposure fit, so iterate
  // once with the worst residuals excluded.
  let a = 1, b = 0;
  for (let round = 0; round < 3; round++) {
    let sp = 0, sa = 0, spp = 0, spa = 0, n = 0;
    for (let i = 0; i < diff.length; i++) {
      if (!inRoi[i]) continue;
      if (round > 0 && Math.abs(gray[i] - (a * pred[i] + b)) > 40) continue;
      sp += pred[i]; sa += gray[i]; spp += pred[i] * pred[i]; spa += pred[i] * gray[i]; n++;
    }
    if (n < 50) break;
    const den = n * spp - sp * sp;
    if (Math.abs(den) < 1e-6) break;
    a = (n * spa - sp * sa) / den;
    b = (sa - a * sp) / n;
  }
  for (let i = 0; i < diff.length; i++) diff[i] = inRoi[i] ? gray[i] - (a * pred[i] + b) : 0;

  // A mark boundary is a 255-level step across one pixel, so a pose half a pixel
  // out makes every rim read as "not the mat".
  //
  // The obvious fix -- drop pixels where the PREDICTED image has a strong
  // gradient -- is wrong here, and wrong in a way worth recording. A man mark is
  // about fourteen concentric black/white rings a few pixels wide, so "near a
  // predicted edge" is the whole mark. Any part of the object lying on a mark
  // then becomes invisible, and a narrow feature that crosses one is severed
  // from the rest and thrown away by the largest-component step. Measured: a
  // 24mm tab sitting on the centre mark vanished, and the traced area came out
  // 49% low while the median error still looked like 0.34mm.
  //
  // Rim residuals are instead left in and killed by morphology: they are ONE
  // PIXEL WIDE, and an opening removes them while a solid part survives. The
  // gradient map is still computed, but only as a diagnostic and to weight the
  // sub-pixel interpolation.
  const gradThr = opts.gradThreshold ?? 30;
  const edge = new Uint8Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      if (!inRoi[i]) continue;
      const gx = Math.abs(pred[i + 1] - pred[i - 1]), gy = Math.abs(pred[i + w] - pred[i - w]);
      if (gx + gy > gradThr) edge[i] = 1;
    }
  }
  const r = opts.edgeDilate ?? 2;
  const edgeD = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let on = 0;
    for (let dy = -r; dy <= r && !on; dy++) for (let dx = -r; dx <= r && !on; dx++) {
      const yy = y + dy, xx = x + dx;
      if (yy >= 0 && yy < h && xx >= 0 && xx < w && edge[yy * w + xx]) on = 1;
    }
    edgeD[y * w + x] = on;
  }
  return { diff, inRoi, pred, edge: edgeD, gain: a, offset: b, w, h };
}

// --------------------------------------------------------------- the mask
// A pixel belongs to the object when it does not look like the mat. The mat has
// hard black/white edges of its own, so the raw difference spikes wherever the
// predicted mark edge is a pixel off; requiring a MINIMUM REGION SIZE and
// filling holes is what separates a part from that ringing.
// Otsu's threshold on |difference|, over the pixels that carry information.
// A fixed threshold is a guess about the part's tone: a dark part clears 28
// easily and a pale one never does, and "no object found" is the wrong answer
// to a photo that plainly contains one. The mat's own residual piles up near
// zero and the part forms a second mode, which is exactly what Otsu splits.
export function autoThreshold(field, opts = {}) {
  const { diff, inRoi, edge } = field;
  const CAP = 128, hist = new Float64Array(CAP + 1);
  let n = 0;
  for (let i = 0; i < diff.length; i++) {
    if (!inRoi[i] || (edge && edge[i])) continue;
    hist[Math.min(CAP, Math.round(Math.abs(diff[i])))]++; n++;
  }
  if (n < 100) return opts.fallback ?? 28;
  let sum = 0;
  for (let t = 0; t <= CAP; t++) sum += t * hist[t];
  let wB = 0, sumB = 0, best = -1, bestT = opts.fallback ?? 28;
  for (let t = 0; t <= CAP; t++) {
    wB += hist[t];
    if (!wB) continue;
    const wF = n - wB;
    if (!wF) break;
    sumB += t * hist[t];
    const between = (wB * wF) * ((sumB / wB) - ((sum - sumB) / wF)) ** 2;
    if (between > best) { best = between; bestT = t; }
  }
  // never go below the noise the mat itself produces
  return Math.max(opts.minThreshold ?? 10, bestT);
}

export function objectMask(field, opts = {}) {
  const { diff, inRoi, edge, w, h } = field;
  const thr = opts.threshold ?? autoThreshold(field);
  const minAreaPx = opts.minAreaPx ?? 400;
  const raw = new Uint8Array(w * h);
  for (let i = 0; i < raw.length; i++) raw[i] = inRoi[i] && Math.abs(diff[i]) > thr ? 1 : 0;

  // morphological close then open, to bridge mark-edge ringing and drop specks
  const dilate = (src, r) => {
    const out = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let on = 0;
      for (let dy = -r; dy <= r && !on; dy++) for (let dx = -r; dx <= r && !on; dx++) {
        const yy = y + dy, xx = x + dx;
        if (yy < 0 || yy >= h || xx < 0 || xx >= w) continue;
        if (src[yy * w + xx]) on = 1;
      }
      out[y * w + x] = on;
    }
    return out;
  };
  const erode = (src, r) => {
    const out = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let all = 1;
      for (let dy = -r; dy <= r && all; dy++) for (let dx = -r; dx <= r && all; dx++) {
        const yy = y + dy, xx = x + dx;
        if (yy < 0 || yy >= h || xx < 0 || xx >= w) { all = 0; continue; }
        if (!src[yy * w + xx]) all = 0;
      }
      out[y * w + x] = all;
    }
    return out;
  };
  // OPEN FIRST, then close. The mark rims survive as one-pixel rings, and an
  // opening is what removes them; closing first would fatten and merge them
  // into a lattice-wide blob before anything had a chance to delete them.
  const r = opts.openRadius ?? 2;
  const rc = opts.closeRadius ?? 3;
  let m = dilate(erode(raw, r), r);
  m = erode(dilate(m, rc), rc);

  // keep the largest connected component; a trace has one part in it
  const lab = new Int32Array(w * h).fill(-1);
  let best = -1, bestN = 0, next = 0;
  const stack = [];
  for (let s = 0; s < m.length; s++) {
    if (!m[s] || lab[s] >= 0) continue;
    const id = next++; let n = 0;
    stack.push(s); lab[s] = id;
    while (stack.length) {
      const i = stack.pop(); n++;
      const x = i % w, y = (i / w) | 0;
      if (x > 0 && m[i - 1] && lab[i - 1] < 0) { lab[i - 1] = id; stack.push(i - 1); }
      if (x < w - 1 && m[i + 1] && lab[i + 1] < 0) { lab[i + 1] = id; stack.push(i + 1); }
      if (y > 0 && m[i - w] && lab[i - w] < 0) { lab[i - w] = id; stack.push(i - w); }
      if (y < h - 1 && m[i + w] && lab[i + w] < 0) { lab[i + w] = id; stack.push(i + w); }
    }
    if (n > bestN) { bestN = n; best = id; }
  }
  const out = new Uint8Array(w * h);
  if (best >= 0 && bestN >= minAreaPx) for (let i = 0; i < out.length; i++) out[i] = lab[i] === best ? 1 : 0;

  // Fill interior holes. Wherever the part happens to match the mat's local
  // grey it drops out of the difference, and where it covers a mark the
  // excluded edge ring leaves a gap. Neither is a hole in the PART, so anything
  // not reachable from the image border is inside.
  const outside = new Uint8Array(w * h);
  const st = [];
  for (let x = 0; x < w; x++) { st.push(x, (h - 1) * w + x); }
  for (let y = 0; y < h; y++) { st.push(y * w, y * w + w - 1); }
  while (st.length) {
    const i = st.pop();
    if (outside[i] || out[i]) continue;
    outside[i] = 1;
    const x = i % w, y = (i / w) | 0;
    if (x > 0) st.push(i - 1);
    if (x < w - 1) st.push(i + 1);
    if (y > 0) st.push(i - w);
    if (y < h - 1) st.push(i + w);
  }
  let area = 0;
  for (let i = 0; i < out.length; i++) { if (!outside[i]) { out[i] = 1; area++; } }
  return { mask: out, areaPx: bestN >= minAreaPx ? area : 0, w, h };
}

// ------------------------------------------------------- sub-pixel contour
// Marching squares on the SIGNED FIELD, not on the binary mask. The mask says
// which cells the boundary crosses; the field says where in the cell it
// crosses, which is the difference between a staircase and an edge located to
// a fraction of a pixel.
export function traceContour(field, maskObj, opts = {}) {
  const { diff, w, h } = field;
  const { mask } = maskObj;
  const thr = opts.threshold ?? 28;
  const lvl = (i) => Math.abs(diff[i]) - thr;         // zero crossing IS the edge

  const segs = [];
  const at = (x, y) => (mask[y * w + x] ? 1 : 0);
  // Near a predicted mark rim the difference was excluded, so its magnitude
  // says nothing about where the boundary is. Fall back to the mask there and
  // accept half-pixel placement on those few cells rather than interpolating
  // on a number that is not a measurement.
  const excl = field.edge;
  const lvlAt = (i) => (excl && excl[i] && !mask[i] ? -1 : excl && excl[i] && mask[i] ? 1 : lvl(i));
  const interp = (x0, y0, x1, y1) => {
    const a = lvlAt(y0 * w + x0), b = lvlAt(y1 * w + x1);
    const t = Math.abs(b - a) < 1e-9 ? 0.5 : a / (a - b);
    const tc = Math.max(0, Math.min(1, t));
    return [x0 + 0.5 + tc * (x1 - x0), y0 + 0.5 + tc * (y1 - y0)];
  };
  for (let y = 0; y < h - 1; y++) {
    for (let x = 0; x < w - 1; x++) {
      const c = at(x, y) | (at(x + 1, y) << 1) | (at(x + 1, y + 1) << 2) | (at(x, y + 1) << 3);
      if (c === 0 || c === 15) continue;
      const T = () => interp(x, y, x + 1, y);
      const R = () => interp(x + 1, y, x + 1, y + 1);
      const B = () => interp(x, y + 1, x + 1, y + 1);
      const Lf = () => interp(x, y, x, y + 1);
      const push = (p, q) => segs.push([p, q]);
      switch (c) {
        case 1: case 14: push(Lf(), T()); break;
        case 2: case 13: push(T(), R()); break;
        case 3: case 12: push(Lf(), R()); break;
        case 4: case 11: push(R(), B()); break;
        case 6: case 9: push(T(), B()); break;
        case 7: case 8: push(Lf(), B()); break;
        case 5: push(Lf(), T()); push(R(), B()); break;
        case 10: push(T(), R()); push(Lf(), B()); break;
      }
    }
  }
  // Stitch segments into rings by CONSUMING them. Marching-squares endpoints on
  // a shared cell edge are computed from the same two samples, so they agree
  // exactly and can be matched by key; walking by "unvisited point" instead
  // lets a ring jump tracks wherever two boundaries touch.
  const key = (p) => `${Math.round(p[0] * 16)},${Math.round(p[1] * 16)}`;
  const adj = new Map();
  segs.forEach(([p, q], i) => {
    for (const a of [p, q]) {
      const k = key(a);
      if (!adj.has(k)) adj.set(k, []);
      adj.get(k).push(i);
    }
  });
  const used = new Uint8Array(segs.length);
  const rings = [];
  // Walk BOTH ways from the seed. The seed is almost never the start of the
  // boundary, so growing only from its tail stops at whichever end comes first
  // and hands back half a ring -- which then gets closed by a straight chord
  // across the part, and the area comes out about half right.
  const grow = (ring) => {
    for (let guard = 0; guard < segs.length + 4; guard++) {
      const tail = ring[ring.length - 1];
      const cand = (adj.get(key(tail)) ?? []).find((i) => !used[i]);
      if (cand == null) return false;
      used[cand] = 1;
      const [a, b] = segs[cand];
      ring.push(key(a) === key(tail) ? b : a);
      if (key(ring[ring.length - 1]) === key(ring[0])) return true;
    }
    return false;
  };
  for (let s = 0; s < segs.length; s++) {
    if (used[s]) continue;
    used[s] = 1;
    const ring = [segs[s][0], segs[s][1]];
    const closed = grow(ring);
    if (!closed) { ring.reverse(); grow(ring); }
    if (ring.length >= 8) rings.push(ring);
  }
  // Order by enclosed area, not by point count: a stray open chain along a mark
  // rim can carry more points than the part's own outline.
  const area = (r) => {
    let a = 0;
    for (let i = 0, j = r.length - 1; i < r.length; j = i++) a += r[j][0] * r[i][1] - r[i][0] * r[j][1];
    return Math.abs(a) / 2;
  };
  rings.sort((a, b) => area(b) - area(a));
  return rings;
}

// ------------------------------------------------------------- to millimetres
export function contourToMm(ring, map, heightMm = 0) {
  const out = [];
  for (const [u, v] of ring) {
    const p = heightMm ? map.toPlaneAt(u, v, heightMm) : map.toPlane(u, v);
    if (p) out.push(p);
  }
  return out;
}

// Douglas-Peucker with the tolerance in MILLIMETRES, because that is the unit
// the answer is specified in.
//
// A closed ring has to be split before it is simplified. Run DP straight down a
// ring and the very first baseline joins the start point to itself: the segment
// has zero length, every perpendicular distance is measured against a
// degenerate line, and the whole outline collapses to two points. Splitting at
// the two furthest-apart points gives two open chains, which is what DP is for.
export function simplifyMm(pts, tolMm = 0.1) {
  if (pts.length < 4) return pts;
  const closed = Math.hypot(pts[0][0] - pts[pts.length - 1][0], pts[0][1] - pts[pts.length - 1][1]) < tolMm;
  if (closed) {
    const ring = pts.slice(0, pts.length - 1);
    let far = 0, fd = -1;
    for (let i = 1; i < ring.length; i++) {
      const d = Math.hypot(ring[i][0] - ring[0][0], ring[i][1] - ring[0][1]);
      if (d > fd) { fd = d; far = i; }
    }
    const a = simplifyOpen(ring.slice(0, far + 1), tolMm);
    const b = simplifyOpen(ring.slice(far).concat([ring[0]]), tolMm);
    return a.concat(b.slice(1));
  }
  return simplifyOpen(pts, tolMm);
}

function simplifyOpen(pts, tolMm) {
  if (pts.length < 3) return pts;
  const keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [i0, i1] = stack.pop();
    const [x0, y0] = pts[i0], [x1, y1] = pts[i1];
    const dx = x1 - x0, dy = y1 - y0;
    const len = Math.hypot(dx, dy) || 1;
    let worst = -1, wd = tolMm;
    for (let i = i0 + 1; i < i1; i++) {
      const d = Math.abs((pts[i][0] - x0) * dy - (pts[i][1] - y0) * dx) / len;
      if (d > wd) { wd = d; worst = i; }
    }
    if (worst > 0) { keep[worst] = 1; stack.push([i0, worst], [worst, i1]); }
  }
  return pts.filter((_, i) => keep[i]);
}

export function polylineLengthMm(pts) {
  let s = 0;
  for (let i = 1; i < pts.length; i++) s += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  return s;
}
export function polygonAreaMm2(pts) {
  let a = 0;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++)
    a += pts[j][0] * pts[i][1] - pts[i][0] * pts[j][1];
  return Math.abs(a) / 2;
}

// ------------------------------------------------------------------- DXF
// R12 ASCII with POLYLINE/VERTEX rather than LWPOLYLINE: LWPOLYLINE is R14 and
// up, and the point of exporting DXF at all is that everything opens it.
// Units are millimetres, $INSUNITS 4, so CAD does not ask on import.
export function toDxf(rings, opts = {}) {
  const layer = opts.layer ?? "TRACE";
  const g = (code, val) => `${code}\n${val}`;
  const out = [
    g(0, "SECTION"), g(2, "HEADER"),
    g(9, "$INSUNITS"), g(70, 4),
    g(9, "$MEASUREMENT"), g(70, 1),
    g(0, "ENDSEC"),
    g(0, "SECTION"), g(2, "ENTITIES")
  ];
  for (const ring of rings) {
    if (ring.length < 2) continue;
    out.push(g(0, "POLYLINE"), g(8, layer), g(66, 1), g(70, 1), g(10, 0), g(20, 0), g(30, 0));
    for (const [x, y] of ring) out.push(g(0, "VERTEX"), g(8, layer), g(10, x.toFixed(4)), g(20, y.toFixed(4)), g(30, "0.0"));
    out.push(g(0, "SEQEND"), g(8, layer));
  }
  out.push(g(0, "ENDSEC"), g(0, "EOF"));
  return out.join("\n") + "\n";
}

export function toSvgMm(rings, opts = {}) {
  if (!rings.length) return "";
  const all = rings.flat();
  const xs = all.map((p) => p[0]), ys = all.map((p) => p[1]);
  const pad = opts.padMm ?? 5;
  const x0 = Math.min(...xs) - pad, x1 = Math.max(...xs) + pad;
  const y0 = Math.min(...ys) - pad, y1 = Math.max(...ys) + pad;
  const w = x1 - x0, h = y1 - y0;
  const paths = rings.map((r) =>
    `<path d="${r.map((p, i) => `${i ? "L" : "M"}${(p[0] - x0).toFixed(3)},${(y1 - p[1]).toFixed(3)}`).join("")}Z" fill="none" stroke="#000" stroke-width="0.2"/>`
  );
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w.toFixed(2)}mm" height="${h.toFixed(2)}mm" viewBox="0 0 ${w.toFixed(3)} ${h.toFixed(3)}">
${paths.join("\n")}
</svg>`;
}
