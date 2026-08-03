// Motion blur is directional, and this detector scans one direction. If the
// smear runs along the rows, the edges a row would cross are the ones that got
// destroyed and the ones a column would cross survived — which would make the
// existing bothAxes toggle the whole fix. Measure it: gradient energy along x
// against along y, per case, next to whether the case detected.
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const DIR = resolve("data/hexcases");
const match = process.argv[2] ?? "";
const names = readdirSync(DIR).filter((f) => f.endsWith(".gray") && f.includes(match))
  .map((f) => f.slice(0, -5)).sort();

const rows: any[] = [];
for (const n of names) {
  const m = JSON.parse(readFileSync(resolve(DIR, n + ".json"), "utf8"));
  const g = new Uint8Array(readFileSync(resolve(DIR, n + ".gray")));
  const W = m.w, H = m.h;

  // Only where the marks are. Over the whole frame a dark wall dilutes both
  // axes equally and the ratio survives, but the magnitudes stop meaning
  // anything — and "is there any signal left" needs the magnitude.
  const x0 = W >> 3, x1 = W - (W >> 3), y0 = H >> 3, y1 = H - (H >> 3);
  let sx = 0, sy = 0, nx = 0, hi = 0, lo = 255;
  // strong edges only: blur lowers gradient everywhere, but what the detector
  // needs is edges above its threshold, so count those
  const THR = 12;
  let ex = 0, ey = 0;
  for (let y = y0 + 1; y < y1 - 1; y++)
    for (let x = x0 + 1; x < x1 - 1; x++) {
      const i = y * W + x;
      const dx = Math.abs(g[i + 1] - g[i - 1]);
      const dy = Math.abs(g[i + W] - g[i - W]);
      sx += dx; sy += dy; nx++;
      if (dx >= THR) ex++;
      if (dy >= THR) ey++;
      const v = g[i];
      if (v > hi) hi = v;
      if (v < lo) lo = v;
    }
  const c = m.capture ?? {};
  rows.push({
    name: n.replace("hexcase-", ""),
    read: c.counts?.read ?? 0,
    lab: m.labelled,
    // mean |dI/dx| and |dI/dy| over the mark region
    gx: +(sx / nx).toFixed(2),
    gy: +(sy / nx).toFixed(2),
    // >1 means horizontal detail survived better than vertical, i.e. the smear
    // runs vertically and ROWS are the good axis
    xOverY: +(sx / sy).toFixed(2),
    edgesX: ex, edgesY: ey,
    edgeRatio: +(ex / Math.max(1, ey)).toFixed(2),
    range: hi - lo
  });
}
const pad = (s: any, n: number) => String(s).padEnd(n);
console.log(pad("case", 10) + pad("read", 5) + pad("lab", 6) + pad("gx", 7) + pad("gy", 7) +
  pad("gx/gy", 7) + pad("edgesX", 9) + pad("edgesY", 9) + pad("eX/eY", 7) + "range");
for (const r of rows)
  console.log(pad(r.name, 10) + pad(r.read, 5) + pad(r.lab, 6) + pad(r.gx, 7) + pad(r.gy, 7) +
    pad(r.xOverY, 7) + pad(r.edgesX, 9) + pad(r.edgesY, 9) + pad(r.edgeRatio, 7) + r.range);
