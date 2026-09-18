(async () => { try {
  const get = (n) => { for (const v of window.__ojs_runtime._variables) if (v._name === n) return v._value; };
  const stat = (arr) => { let nan = 0, sum = 0; for (let i = 0; i < arr.length; i++) { const v = arr[i]; if (Number.isNaN(v)) nan++; else sum += v; } return { nan, sum: +sum.toFixed(2) }; };
  const out = [];
  for (const [w, h] of [[128, 96], [208, 380], [256, 256], [200, 200], [208, 96], [64, 380]]) {
    const t = get("createTray")(w, h);
    const snap = (label) => ({ size: [w, h], label, film: stat(t.read("film")), velocity: stat(t.read("velocity")), pressure: stat(t.read("pressure")) });
    t.fill(3, 0.1); out.push(snap("fill"));
    t.step({ cycles: 0, transportSteps: 1 }); out.push(snap("c0 t1"));
    t.step({ cycles: 1, transportSteps: 1 }); out.push(snap("c1 t1"));
    t.dispose && t.dispose();
  }
  return JSON.stringify(out);
} catch (e) { return "ERR " + e.stack; } })()
