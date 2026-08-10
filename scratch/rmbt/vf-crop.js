// Crop a patch of the live native frame and hand it back as a JPEG, so a real
// printed mark can be put next to the one the notebook thinks it printed.
(async () => {
  const rt = window.__ojs_runtime;
  const m = rt.mains.get("@tomlarkworthy/flat-trace");
  const get = (n) => { const v = [...rt._variables].find(z => z._module === m && z._name === n); return v && v._value; };
  const g = get("grabber"), cv = get("camVideo");
  const nw = cv.videoWidth, nh = cv.videoHeight;
  await g.grab(cv, nw, nh);
  const gray = g.ensureFull();
  const cx = Math.round(nw * (window.__cropX ?? 0.5)), cy = Math.round(nh * (window.__cropY ?? 0.42));
  const R = window.__cropR ?? 160;
  const x0 = Math.max(0, cx - R), y0 = Math.max(0, cy - R);
  const w = Math.min(nw - x0, 2 * R), h = Math.min(nh - y0, 2 * R);
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const ctx = c.getContext("2d");
  const im = ctx.createImageData(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const v = gray[(y0 + y) * nw + (x0 + x)], q = (y * w + x) * 4;
    im.data[q] = im.data[q + 1] = im.data[q + 2] = v; im.data[q + 3] = 255;
  }
  ctx.putImageData(im, 0, 0);
  return c.toDataURL("image/png");
})()
