(async () => {
  const rt = window.__ojs_runtime;
  const m = rt.mains.get("@tomlarkworthy/flat-trace");
  const clt = rt.mains.get("@tomlarkworthy/coded-landmark-tracking");
  const get = (mod, n) => { const v = [...rt._variables].find(z => z._module === mod && z._name === n); return v && v._value; };
  const g = get(m, "grabber"), cv = get(m, "camVideo"), afm = get(clt, "analyzeFrameMan");
  if (!cv || !cv.videoWidth) return { camOff: true, camOn: get(m, "camOn") };
  const nw = cv.videoWidth, nh = cv.videoHeight;
  const scale = Math.min(1, 800 / nw), w = Math.round(nw * scale), h = Math.round(nh * scale);
  const med = ts => { ts.sort((a, b) => a - b); return +ts[ts.length >> 1].toFixed(1); };
  const timeGrab = async (W, H, n) => { const ts = []; for (let i = 0; i < n; i++) { const t = performance.now(); await g.grab(cv, W, H); g.ensureFull(); ts.push(performance.now() - t); } return med(ts); };
  const timeSync = (fn, n) => { const ts = []; for (let i = 0; i < n; i++) { const t = performance.now(); fn(); ts.push(performance.now() - t); } return med(ts); };
  const gLive = await timeGrab(w, h, 8);
  await g.grab(cv, w, h); const gray = g.ensureFull();
  const tDet = timeSync(() => afm({ gray, w, h }, {}), 5);
  const tBoth = timeSync(() => afm({ gray, w, h }, { bothAxes: true }), 3);
  const el = get(m, "viewfinder"); const ctx = el.querySelector("canvas").getContext("2d");
  const tPaint = timeSync(() => {
    const im = ctx.createImageData(w, h);
    for (let i = 0, q = 0; i < gray.length; i++, q += 4) { im.data[q] = im.data[q + 1] = im.data[q + 2] = gray[i]; im.data[q + 3] = 255; }
    ctx.putImageData(im, 0, 0);
  }, 5);
  const gNative = await timeGrab(nw, nh, 4);
  let tTrace = null;
  try {
    const tf = get(m, "traceFrame"), prof = get(m, "cameraProfile"), ms = get(m, "makeMatSampler");
    await g.grab(cv, nw, nh);
    const full = { gray: g.ensureFull(), w: nw, h: nh };
    const I = prof && prof.w === nw && prof.h === nh ? prof : { f: 1.1 * nw, cx: nw / 2, cy: nh / 2, k1: 0, k2: 0, p1: 0, p2: 0 };
    const t = performance.now(); const r = tf(full, I, { matGray: ms(), tolMm: 0.2 }); tTrace = { ms: +(performance.now() - t).toFixed(0), ok: r.ok, why: r.ok ? null : String(r.why).slice(0, 90) };
  } catch (e) { tTrace = { err: String(e).slice(0, 120) }; }
  return {
    live: [w, h], native: [nw, nh], path: g.path, why: g.why,
    cores: navigator.hardwareConcurrency, dpr: devicePixelRatio,
    ms: { grabLive: gLive, detect: tDet, detectBoth: tBoth, paint: tPaint, grabNative: gNative, sleep: 60 },
    loopSum: +(gLive + tDet + tPaint + 60).toFixed(1),
    trace: tTrace
  };
})()
