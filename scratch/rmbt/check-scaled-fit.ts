// Does fitHomographyScaled recover a KNOWN plane where fitHomography cannot?
//
// Synthetic, so there is a ground truth to be wrong against: pick a homography,
// project the real target's marks through it, and hand the fit exactly what the
// row scan would have measured -- the centre, and a/b from the Jacobian of that
// same homography. Then ask for H back.
//
// The case that matters is the four-subset with a collinear triple, which is 12
// of the target's 35 and is what hexcase-5ivq-06 reads.
import { importNotebookModule } from "../../tools/notebook-import.ts";

// The module's define() resolves its wasm attachments through window.lopecode and
// runtime.fileAttachments at definition time, before any cell runs. Neither
// exists off the browser and nothing reached here needs them. Same package
// instance notebook-import loads, so patching the prototype takes.
import { Runtime } from "../../tools/node_modules/@observablehq/runtime/src/index.js";
(globalThis as any).window = {
  lopecode: { contentSync: () => ({ status: 404, mime: "application/octet-stream", bytes: new Uint8Array(0) }) }
};
(globalThis as any).URL.createObjectURL ??= () => "blob:stub";
(Runtime.prototype as any).fileAttachments ??= () => () => ({});

const m = await importNotebookModule("modules/@tomlarkworthy/coded-landmark-tracking.js");
const fitHomography: any = await m.value("fitHomography");
const fitHomographyScaled: any = await m.value("fitHomographyScaled");
const T: any = await m.value("hexTarget");

// tilt + perspective + rotation, nothing degenerate about the plane itself
const HT = [3.9, 0.62, 505, -0.55, 3.7, 300, 0.0016, -0.0009, 1];
const proj = (X: number, Y: number) => {
  const w = HT[6] * X + HT[7] * Y + 1;
  return { w, x: (HT[0] * X + HT[1] * Y + HT[2]) / w, y: (HT[3] * X + HT[4] * Y + HT[5]) / w };
};
const truthPair = (mk: any) => {
  const p = proj(mk.xMm, mk.yMm);
  const j11 = (HT[0] - p.x * HT[6]) / p.w, j12 = (HT[1] - p.x * HT[7]) / p.w;
  const j21 = (HT[3] - p.y * HT[6]) / p.w, j22 = (HT[4] - p.y * HT[7]) / p.w;
  return {
    id: mk.id, sx: mk.xMm, sy: mk.yMm, dx: p.x, dy: p.y,
    a: T.radiusMm * Math.hypot(j11, j12), b: T.radiusMm * Math.hypot(j21, j22), rMm: T.radiusMm
  };
};
const all = T.marks.map(truthPair);

// worst prediction error over ALL seven marks, which is the thing that actually
// went wrong on -06: the fit is exact on what it saw and wrong everywhere else
const worst = (fit: any) => {
  if (!fit) return NaN;
  let w = 0;
  for (const p of all) {
    const [x, y] = fit.map(p.sx, p.sy);
    w = Math.max(w, Math.hypot(x - p.dx, y - p.dy));
  }
  return w;
};

const combos = (n: number, k: number): number[][] => {
  const out: number[][] = [];
  const rec = (s: number, acc: number[]) => {
    if (acc.length === k) return out.push(acc.slice());
    for (let i = s; i < n; i++) { acc.push(i); rec(i + 1, acc); acc.pop(); }
  };
  rec(0, []); return out;
};
const area = (p: any, q: any, r: any) =>
  Math.abs((q.sx - p.sx) * (r.sy - p.sy) - (q.sy - p.sy) * (r.sx - p.sx)) / 2;
const degenerate = (s: any[]) =>
  combos(4, 3).some(([i, j, k]) => area(s[i], s[j], s[k]) < 1e-9);

let nDeg = 0;
const rows: string[] = [];
for (const c of combos(all.length, 4)) {
  const sub = c.map((i) => all[i]);
  const deg = degenerate(sub);
  if (deg) nDeg++;
  const a = worst(fitHomography(sub));
  const b = worst(fitHomographyScaled(sub));
  if (deg || a > 1 || b > 1)
    rows.push(`${deg ? "DEGEN" : "     "} ${sub.map((s: any) => s.id).join(",").padEnd(24)} ` +
      `centres ${(Number.isNaN(a) ? "no fit" : a.toFixed(1) + "px").padStart(9)}  ` +
      `+scale ${(Number.isNaN(b) ? "no fit" : b.toFixed(1) + "px").padStart(9)}`);
}
console.log(`4-subsets ${combos(all.length, 4).length}, degenerate ${nDeg}`);
console.log(rows.join("\n") || "(every subset recovered the plane to under 1px both ways)");

// and with noise on the widths, since the real ones are 5% off the model
const jitter = (k: number) => all.map((p: any, i: number) => ({
  ...p, a: p.a * (1 + k * Math.sin(i * 12.9898)), b: p.b * (1 + k * Math.cos(i * 78.233))
}));
console.log("\nnoise on a/b -> worst prediction over all 7 marks, degenerate subsets only:");
for (const k of [0, 0.02, 0.05, 0.1, 0.2]) {
  const noisy = jitter(k);
  const ws: number[] = [];
  for (const c of combos(all.length, 4)) {
    const sub = c.map((i) => noisy[i]);
    if (!degenerate(sub)) continue;
    const f = fitHomographyScaled(sub);
    if (!f) { ws.push(NaN); continue; }
    let w = 0;
    for (const p of all) { const [x, y] = f.map(p.sx, p.sy); w = Math.max(w, Math.hypot(x - p.dx, y - p.dy)); }
    ws.push(w);
  }
  const ok = ws.filter((v) => !Number.isNaN(v));
  console.log(`  +/-${(k * 100).toFixed(0).padStart(3)}%  median ${ok.sort((x, y) => x - y)[ok.length >> 1].toFixed(1)}px  worst ${Math.max(...ok).toFixed(1)}px`);
}
