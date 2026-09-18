((LOAD, SIZE, VARIANTS) => {
  const get = (n) => { for (const v of window.__ojs_runtime._variables) if (v._name === n) return v._value; };
  const params = get("params"), createTray = get("createTray");
  const speed = (tray) => { const v = tray.read("velocity"); let max = 0, sum = 0; for (let i = 0; i < v.length; i += 4) { const s = Math.hypot(v[i], v[i + 1]); sum += s; if (s > max) max = s; } return +max.toPrecision(3); };
  const out = {};
  for (const [label, o] of Object.entries(VARIANTS)) {
    const tray = createTray(SIZE[0], SIZE[1]); tray.fill(3, 0.1);
    const p = { ...params, ...o };
    for (let n = 0; n < LOAD; n++) { tray.brush({ x: SIZE[0] / 2, y: SIZE[1] / 2, fluid: 0, pressure: 5, radius: 6, rate: 0.8 }); tray.step(p); }
    for (let n = 0; n < LOAD; n++) { tray.brush({ x: SIZE[0] / 2, y: SIZE[1] / 2, fluid: 3, pressure: 8, radius: 6, rate: 0.8 }); tray.step(p); }
    const series = []; for (let n = 0; n < 400; n++) { tray.step(p); if (n % 25 === 24) series.push(speed(tray)); }
    out[label] = series; tray.dispose();
  }
  return out;
})
