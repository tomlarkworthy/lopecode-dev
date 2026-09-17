(async () => { const get = (n) => { for (const v of window.__ojs_runtime._variables) if (v._name === n) return v._value; };
 const tray = get("tray"), lines = get("contourPainter"); const T = {}; const N = {};
 const wrap = (o, name) => { const f = o[name].bind(o); o[name] = (...a) => { const t = performance.now(); const r = f(...a); T[name] = (T[name]||0) + performance.now() - t; N[name] = (N[name]||0)+1; return r; }; };
 wrap(tray, "step"); wrap(tray, "brush"); wrap(lines, "advect"); wrap(lines, "respace"); wrap(lines, "paint");
 let frames = 0; const t0 = performance.now(); await new Promise(r => { const f = () => { frames++; performance.now() - t0 < 3000 ? requestAnimationFrame(f) : r(); }; requestAnimationFrame(f); });
 const out = { frames, fps: frames/3, vertices: tray.contours.count() }; for (const k in T) out[k] = { calls: N[k], msEach: +(T[k]/N[k]).toFixed(2), msPerSec: +(T[k]/3).toFixed(0) }; return out; })()
