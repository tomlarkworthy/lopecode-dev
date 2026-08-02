// How well does the 4-anchor cross ratio alone predict the chord offset d?
// dSeed is the CR-derived offset computed by windowCandidates; d is the offset
// the full sweep + photometric decode finally settled on. If |d - dSeed| is
// tight, the 35-offset sweep is mostly wasted work.
const testFrameBank = await get("testFrameBank");
const runPipeline = await get("runPipeline");
const scanLattice = await get("scanLattice");

const out = [];
for (const entry of testFrameBank) {
  const frame = entry && entry.frame;
  if (!frame || !frame.gray) continue;
  const rows = scanLattice(frame.h, 6);
  const run = runPipeline(frame, { scanRows: rows, minMargin: 4, minReadable: 4 });
  const errs = [];
  for (const h of run.hits) {
    if (h.dSeed == null || h.d == null) continue;
    errs.push({ d: h.d, dSeed: h.dSeed, err: h.d - h.dSeed, id: h.id, crDist: h.crDist });
  }
  errs.sort((a, b) => a.err - b.err);
  const abs = errs.map((e) => Math.abs(e.err)).sort((a, b) => a - b);
  const q = (p) => (abs.length ? abs[Math.min(abs.length - 1, Math.floor(p * abs.length))] : null);
  out.push({
    file: entry.file ?? "?",
    hits: errs.length,
    absErr_p50: q(0.5),
    absErr_p90: q(0.9),
    absErr_max: abs.length ? abs[abs.length - 1] : null,
    dRange: errs.length ? [errs[0].d, errs[errs.length - 1].d] : null,
    sample: errs.slice(0, 6).map((e) => `d=${e.d} seed=${e.dSeed.toFixed(2)} err=${e.err.toFixed(2)}`)
  });
}
return out;
