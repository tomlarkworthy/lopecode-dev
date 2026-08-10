// Count ring crossings along a radius, for a mark in the LIVE frame and for the
// mark the notebook thinks it printed. A mark is a bit pattern in r-space, so
// the number of crossings is the one number that says whether the sheet on the
// desk is the sheet this build decodes.
(async () => {
  const rt = window.__ojs_runtime;
  const m = rt.mains.get("@tomlarkworthy/flat-trace");
  const get = (n) => { const v = [...rt._variables].find(z => z._module === m && z._name === n); return v && v._value; };
  const g = get("grabber"), cv = get("camVideo"), T = get("matTarget");

  // profile: mean of 24 radial rays out of (cx,cy), then count sign changes
  const profileOf = (px, w, h, cx, cy, R) => {
    const prof = new Float64Array(R);
    for (let r = 0; r < R; r++) {
      let s = 0, n = 0;
      for (let a = 0; a < 24; a++) {
        const th = a * Math.PI / 12;
        const x = Math.round(cx + r * Math.cos(th)), y = Math.round(cy + r * Math.sin(th));
        if (x >= 0 && y >= 0 && x < w && y < h) { s += px[y * w + x]; n++; }
      }
      prof[r] = n ? s / n : 0;
    }
    let lo = 255, hi = 0;
    for (const v of prof) { if (v < lo) lo = v; if (v > hi) hi = v; }
    const mid = (lo + hi) / 2, band = (hi - lo) * 0.15;
    let state = prof[0] > mid ? 1 : -1, crossings = 0;
    for (let r = 1; r < R; r++) {
      if (state === 1 && prof[r] < mid - band) { state = -1; crossings++; }
      else if (state === -1 && prof[r] > mid + band) { state = 1; crossings++; }
    }
    return { crossings, lo: Math.round(lo), hi: Math.round(hi),
             profile: [...prof].filter((_, i) => i % 4 === 0).map((v) => Math.round(v)) };
  };

  // --- the mark the notebook would print ---
  const svg = get("matTargetSvg");
  const s = typeof svg === "function" ? svg() : svg;
  const src = typeof s === "string" ? s : s.outerHTML;
  const img = new Image();
  await new Promise((r, j) => { img.onload = r; img.onerror = j; img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(src))); });
  const RW = 1200, c = document.createElement("canvas");
  c.width = RW; c.height = Math.round(img.naturalHeight * RW / img.naturalWidth);
  const cx2 = c.getContext("2d");
  cx2.fillStyle = "#fff"; cx2.fillRect(0, 0, c.width, c.height);
  cx2.drawImage(img, 0, 0, c.width, c.height);
  const d = cx2.getImageData(0, 0, c.width, c.height).data;
  const gray = new Uint8Array(c.width * c.height);
  for (let i = 0; i < gray.length; i++) gray[i] = d[i * 4];
  const ppm = c.width / T.pageW;
  const mk = T.marks[Math.floor(T.marks.length / 2)];
  const ex = profileOf(gray, c.width, c.height,
    c.width / 2 + mk.xMm * ppm, (T.pageH - T.legendMm) / 2 * ppm + mk.yMm * ppm,
    Math.round(0.62 * T.diameterMm * ppm));

  // --- a mark in the live frame, centred wherever the caller points ---
  const nw = cv.videoWidth, nh = cv.videoHeight;
  await g.grab(cv, nw, nh);
  const live = g.ensureFull();
  // Find a mark instead of aiming at one: a mark centre is a solid black disc,
  // so the darkest small box in the frame is on one.
  let bx = 0, by = 0, best = 1e9;
  const B = 12;
  for (let y = B; y < nh - B; y += 8) for (let x = B; x < nw - B; x += 8) {
    let s2 = 0;
    for (let yy = y - B; yy <= y + B; yy += 4) for (let xx = x - B; xx <= x + B; xx += 4) s2 += live[yy * nw + xx];
    if (s2 < best) { best = s2; bx = x; by = y; }
  }
  const lx = bx, ly = by;
  const lr = window.__markR ?? 90;
  const rl = profileOf(live, nw, nh, lx, ly, lr);

  return {
    expected: { diaPx: Math.round(T.diameterMm * ppm), radiusSampled: Math.round(0.62 * T.diameterMm * ppm), ...ex },
    live: { at: [lx, ly], radiusSampled: lr, ...rl },
    matDiaMm: T.diameterMm, matMarks: T.marks.length, pitchMm: T.pitchMm
  };
})()
