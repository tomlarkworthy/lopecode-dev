((SIZE, o) => {
  const get = (n) => { for (const v of window.__ojs_runtime._variables) if (v._name === n) return v._value; };
  const params = { ...get("params"), ...o }, tray = get("createTray")(SIZE[0], SIZE[1]);
  const stat = (a) => { let nan = 0, max = 0; for (let i = 0; i < a.length; i++) { const v = a[i]; if (Number.isNaN(v)) nan++; else if (Math.abs(v) > max) max = Math.abs(v); } return nan ? "NaN×" + nan : +max.toPrecision(3); };
  const snap = () => ({ film: stat(tray.read("film")), vel: stat(tray.read("velocity")), p: stat(tray.read("pressure")) });
  tray.fill(3, 0.1);
  const out = [];
  for (let n = 0; n < 60; n++) {
    if (n < 4) tray.brush({ x: SIZE[0] / 2, y: SIZE[1] / 2, fluid: 0, pressure: 5, radius: 6, rate: 0.8 });
    tray.step(params); const s = snap(); out.push([n, s.film, s.vel, s.p]);
    if (String(s.film).startsWith("NaN") || String(s.p).startsWith("NaN")) break;
  }
  tray.dispose(); return out;
})
