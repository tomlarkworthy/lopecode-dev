carrierTable = {
  // The chord template at each swept offset. Offsets are quantised to 0.25, so
  // there are ~35 of them, and rebuilding one per hypothesis -- 33k times a
  // frame -- was pure waste.
  const out = [];
  for (let d = 0; d <= crCurve[crCurve.length - 1].d + 1e-9; d += 0.25)
    out.push(Float64Array.from(templateAtOffset(carrierTemplate, d)));
  return out;
}
