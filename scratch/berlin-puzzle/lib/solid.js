// Solid-model collision engine for assemblability verification.
// Each part is a 3mm prism: 2D region (outline minus holes) x thickness along
// its frame normal. All frames are axis-aligned, so world-space queries reduce
// to 2D point-in-region tests in the other part's local coords.
import { bbox, toWorld, toLocal } from "./geom.js";
import { P } from "./parts.js";

const ROW = 0.25; // scanline resolution (mm)

export class Solid {
  constructor(part) {
    this.part = part;
    const loops = [part.outline, ...part.holes];
    this.bb = bbox(part.outline);
    this.rows = [];
    this.y0 = this.bb.y0 - ROW;
    const n = Math.ceil((this.bb.y1 - this.y0) / ROW) + 2;
    for (let i = 0; i < n; i++) {
      const y = this.y0 + i * ROW;
      const xs = [];
      for (const loop of loops) {
        for (let j = 0; j < loop.length; j++) {
          const a = loop[j], b = loop[(j + 1) % loop.length];
          if ((a[1] > y) !== (b[1] > y)) {
            xs.push(a[0] + ((y - a[1]) / (b[1] - a[1])) * (b[0] - a[0]));
          }
        }
      }
      xs.sort((p, q) => p - q);
      this.rows.push(xs); // even-odd interval boundaries
    }
    // world AABB (computed from frame + local bbox + thickness)
    this.worldAABB = this.computeWorldAABB();
    this.samples = null;
  }

  computeWorldAABB(offset = [0, 0, 0]) {
    const { frame } = this.part;
    const c = [];
    for (const u of [this.bb.x0, this.bb.x1])
      for (const v of [this.bb.y0, this.bb.y1])
        for (const w of [0, P.T]) c.push(toWorld(frame, u, v, w));
    const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
    for (const p of c) for (let k = 0; k < 3; k++) {
      lo[k] = Math.min(lo[k], p[k] + offset[k]); hi[k] = Math.max(hi[k], p[k] + offset[k]);
    }
    return { lo, hi };
  }

  // is (u,v) strictly inside the 2D region by margin m (checks 3 nearby rows)
  inside2D(u, v, m) {
    for (const dv of [-m, 0, m]) {
      const i = Math.round((v + dv - this.y0) / ROW);
      if (i < 0 || i >= this.rows.length) return false;
      const xs = this.rows[i];
      let ok = false;
      for (let j = 0; j + 1 < xs.length; j += 2) {
        if (u >= xs[j] + m && u <= xs[j + 1] - m) { ok = true; break; }
      }
      if (!ok) return false;
    }
    return true;
  }

  // world-space material test with margin
  containsWorld(p, m) {
    const [u, v, w] = toLocal(this.part.frame, p);
    if (w < m || w > P.T - m) return false;
    return this.inside2D(u, v, m);
  }

  // sample points of this solid (local coords incl. w layers), cached
  samplePoints(step = 0.7) {
    if (this.samples) return this.samples;
    const out = [];
    for (let v = this.bb.y0 + step / 2; v <= this.bb.y1; v += step) {
      const i = Math.round((v - this.y0) / ROW);
      if (i < 0 || i >= this.rows.length) continue;
      const xs = this.rows[i];
      for (let j = 0; j + 1 < xs.length; j += 2) {
        for (let u = Math.max(xs[j] + 0.05, this.bb.x0 + step / 2); u <= xs[j + 1] - 0.05; u += step) {
          out.push([u, v]);
        }
      }
    }
    this.samples = out;
    return out;
  }
}

// Does solid A (displaced by offset) penetrate solid B by more than eps?
// Returns a sample point of penetration or null.
export function penetrates(A, B, offset, eps = 0.3) {
  const a = A.computeWorldAABB(offset), b = B.worldAABB;
  for (let k = 0; k < 3; k++) {
    if (a.lo[k] > b.hi[k] - eps || a.hi[k] < b.lo[k] + eps) return null;
  }
  const step = 0.6;
  const ws = [eps + 0.05, P.T / 2, P.T - eps - 0.05];
  for (const [u, v] of A.samplePoints(step)) {
    for (const w of ws) {
      const p = toWorld(A.part.frame, u, v, w);
      p[0] += offset[0]; p[1] += offset[1]; p[2] += offset[2];
      if (B.containsWorld(p, eps)) return { at: p, local: [u, v, w] };
    }
  }
  return null;
}
