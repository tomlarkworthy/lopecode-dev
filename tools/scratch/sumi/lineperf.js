(async () => { const get = (n) => { for (const v of window.__ojs_runtime._variables) if (v._name === n) return v._value; };
 const tray = get("tray"), lines = get("contourPainter"), c = tray.contours; const gl = document.querySelector("canvas").getContext("webgl2");
 const time = (f, n=10) => { tray.read("pressure"); const t=performance.now(); for (let i=0;i<n;i++) f(); tray.read("pressure"); return +((performance.now()-t)/n).toFixed(2); };
 return { curves: c.curves.length, vertices: c.count(), spacing: +c.spacing.toFixed(3),
   stepMs: time(() => tray.step()), advectMs: time(() => lines.advect(c, tray, 0)), respaceMs: time(() => { lines.advect(c, tray, 0); lines.respace(c); }), paintMs: time(() => lines.paint(c, [1,1,1])) }; })()
