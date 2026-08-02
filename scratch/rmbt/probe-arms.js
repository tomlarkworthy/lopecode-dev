// Is d predictable from the cross ratio ONCE the mid-pair radius arm is known?
// dSeed uses the r=10 curve only, and overestimates systematically -- consistent
// with windows whose middle anchors actually sat at r=8 or r=6. Invert each arm's
// curve separately and see which arm explains the settled d, and how tightly.
const testFrameBank = await get("testFrameBank");
const runPipeline = await get("runPipeline");
const scanLattice = await get("scanLattice");
const crTable = await get("crTable");
const crDistance = await get("crDistance");
const crossRatio = await get("crossRatio");
const LAYOUT = await get("LAYOUT");

const ARMS = [LAYOUT.anchorRadii[1], 8, 6];
const out = [];
for (const entry of testFrameBank) {
  const frame = entry && entry.frame;
  if (!frame || !frame.gray) continue;
  const run = runPipeline(frame, { scanRows: scanLattice(frame.h, 6), minMargin: 4, minReadable: 4 });
  const per = ARMS.map(() => []);
  const bestArmCount = [0, 0, 0];
  let n = 0;
  for (const h of run.hits) {
    if (!h.anchors || h.d == null) continue;
    const [xi, xa, xb, xj] = h.anchors;
    const cr = crossRatio(xi, xa, xb, xj);
    let bestArm = -1, bestErr = Infinity;
    ARMS.forEach((rc, ri) => {
      // invert this arm's curve: offset whose predicted CR is closest to measured
      let bd = null, bdist = Infinity;
      for (let di = 0; di < crTable[ri].length; di++) {
        const pred = crTable[ri][di];
        if (!isFinite(pred)) continue;
        const dist = crDistance(cr, pred);
        if (dist < bdist) { bdist = dist; bd = di * 0.25; }
      }
      if (bd == null) return;
      const err = Math.abs(bd - h.d);
      per[ri].push(err);
      if (err < bestErr) { bestErr = err; bestArm = ri; }
    });
    if (bestArm >= 0) bestArmCount[bestArm]++;
    n++;
  }
  const stat = (a) => {
    const s = a.slice().sort((x, y) => x - y);
    return s.length ? { p50: +s[s.length >> 1].toFixed(2), p90: +s[Math.floor(s.length * 0.9)].toFixed(2) } : null;
  };
  // the error if we take the BEST arm per hit (an oracle over 3 discrete choices)
  const oracle = [];
  for (let i = 0; i < n; i++) {
    const cands = per.map((a) => a[i]).filter((v) => v != null);
    if (cands.length) oracle.push(Math.min(...cands));
  }
  out.push({
    file: entry.file,
    hits: n,
    perArm: ARMS.map((rc, ri) => ({ rc, ...stat(per[ri]) })),
    bestArmChosen: bestArmCount,
    oracleOverArms: stat(oracle)
  });
}
return out;
