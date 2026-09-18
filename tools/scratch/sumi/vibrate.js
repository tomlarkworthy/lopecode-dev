(async () => {
  const get = (n) => { for (const v of window.__ojs_runtime._variables) if (v._name === n) return v._value; };
  const tray = get("tray");
  const speed = () => { const v = tray.read("velocity"); let max = 0, sum = 0; for (let i = 0; i < v.length; i += 4) { const s = Math.hypot(v[i], v[i + 1]); sum += s; if (s > max) max = s; } return { max: +max.toPrecision(3), mean: +(sum / (v.length / 4)).toPrecision(3) }; };
  const series = []; const t0 = performance.now();
  for (let k = 0; k < 12; k++) { series.push(speed()); await new Promise(r => setTimeout(r, 500)); }
  return { grid: [tray.width, tray.height], series, seconds: +((performance.now() - t0) / 1000).toFixed(1) };
})()
