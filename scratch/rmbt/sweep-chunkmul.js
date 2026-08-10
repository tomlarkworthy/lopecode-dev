// Sweep the deal size. Order is baseline-first and baseline-last: a phone warms
// up over a sweep, and without the repeat a monotonic thermal drift reads as a
// monotonic effect of the knob.
(async () => {
  const rt = window.__ojs_runtime || (window.lopecode && window.lopecode.runtime);
  const mod = rt.mains.get("@tomlarkworthy/coded-landmark-tracking");
  const view = [...rt._variables].find((z) => z._module === mod && z._name === "hexRigView")._value;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const med = (a) => { const s = a.slice().sort((x, y) => x - y); return +s[s.length >> 1].toFixed(1); };

  const out = [];
  for (const mul of [3, 1, 1.5, 2, 4, 6, 3]) {
    window.__chunkMul = mul;
    await sleep(1600); // 20-frame median window is ~0.7s at 30fps; refill it twice over
    const tot = [], scan = [], wmax = [], wsum = [];
    for (let i = 0; i < 6; i++) {
      const s = view.stages();
      tot.push(s.total); scan.push(s.scan);
      if (s.workerMs && s.workerMs.length) {
        wmax.push(Math.max(...s.workerMs));
        wsum.push(s.workerMs.reduce((a, b) => a + b, 0));
      }
      await sleep(260);
    }
    out.push({
      mul, chunks: Math.max(1, Math.round(6 * mul)),
      total: med(tot), scan: med(scan),
      workerMax: wmax.length ? med(wmax) : null,
      workerSum: wsum.length ? med(wsum) : null
    });
  }
  window.__chunkMul = 3;
  return out;
})()
