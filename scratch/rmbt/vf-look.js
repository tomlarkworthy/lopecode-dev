// What is the camera actually delivering? Tone stats plus a coarse ramp, so a
// "detector found nothing" result can be separated into "nothing to find" and
// "the detector is failing on a good frame" without shipping an image.
(async () => {
  const rt = window.__ojs_runtime;
  const m = rt.mains.get("@tomlarkworthy/flat-trace");
  const get = (n) => { const v = [...rt._variables].find(z => z._module === m && z._name === n); return v && v._value; };
  const g = get("grabber"), cv = get("camVideo");
  if (!cv || !cv.videoWidth) return { camOff: true };
  const nw = cv.videoWidth, nh = cv.videoHeight;
  await g.grab(cv, nw, nh);
  const gray = g.ensureFull();

  const hist = new Uint32Array(16);
  let mn = 255, mx = 0, sum = 0;
  for (let i = 0; i < gray.length; i++) { const v = gray[i]; hist[v >> 4]++; if (v < mn) mn = v; if (v > mx) mx = v; sum += v; }

  // Focus proxy: mean |Laplacian| on a subsample. A blurred frame kills the
  // ring edges the decoder needs long before it looks wrong to a person.
  let lap = 0, ln = 0;
  for (let y = 2; y < nh - 2; y += 4) for (let x = 2; x < nw - 2; x += 4) {
    const i = y * nw + x;
    lap += Math.abs(4 * gray[i] - gray[i - 1] - gray[i + 1] - gray[i - nw] - gray[i + nw]); ln++;
  }

  const W = 14, H = 24, ramp = " .:-=+*#%@";
  const rows = [];
  for (let ry = 0; ry < H; ry++) {
    let line = "";
    for (let rx = 0; rx < W; rx++) {
      let s = 0, n = 0;
      const x0 = Math.floor(rx * nw / W), x1 = Math.floor((rx + 1) * nw / W);
      const y0 = Math.floor(ry * nh / H), y1 = Math.floor((ry + 1) * nh / H);
      for (let y = y0; y < y1; y += 4) for (let x = x0; x < x1; x += 4) { s += gray[y * nw + x]; n++; }
      line += ramp[Math.min(9, ((s / n) * 10 / 256) | 0)];
    }
    rows.push(line);
  }
  const track = cv.srcObject && cv.srcObject.getVideoTracks && cv.srcObject.getVideoTracks()[0];
  return {
    native: [nw, nh], mean: +(sum / gray.length).toFixed(0), min: mn, max: mx,
    focusLap: +(lap / ln).toFixed(1),
    hist16: [...hist].map((c) => +(100 * c / gray.length).toFixed(1)),
    settings: track && track.getSettings ? track.getSettings() : null,
    ascii: rows
  };
})()
