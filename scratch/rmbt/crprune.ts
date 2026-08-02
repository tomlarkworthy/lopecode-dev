const K: any = await import("./kernel.js");
const R = K.LAYOUT.R, tol = 0.012;
const ds: number[] = [];
for (let d = 0; d <= 8.5 + 1e-9; d += 0.25) ds.push(d);
// CR(d) for each mid-pair radius interpretation, same construction as crCurve
const curve = (rc: number) => ds.map((d) => {
  if (d > rc - 0.5) return NaN;
  const aOut = Math.sqrt(R * R - d * d), aIn = Math.sqrt(rc * rc - d * d);
  return K.crossRatio(-aOut, -aIn, aIn, aOut);
});
const rows: any[] = [];
for (const rc of [10, 8, 6]) {
  const c = curve(rc);
  const valid = c.filter((v) => !isNaN(v)).length;
  let tot = 0, n = 0;
  for (let i = 0; i < c.length; i++) {
    if (isNaN(c[i])) continue;
    let m = 0;
    for (let j = 0; j < c.length; j++) if (!isNaN(c[j]) && K.crDistance(c[i], c[j]) <= tol) m++;
    tot += m; n++;
  }
  rows.push({ rc, offsets: valid, avgAdmissible: +(tot / n).toFixed(1), pruneTo: +((tot / n / valid) * 100).toFixed(0) + "%" });
}
console.table(rows);
console.log("cr range per rc:", [10, 8, 6].map((rc) => { const c = curve(rc).filter((v) => !isNaN(v)); return `rc${rc}: ${c[0].toFixed(3)}..${c[c.length-1].toFixed(3)}`; }).join("  "));
