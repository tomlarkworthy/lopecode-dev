// 2D/3D geometry utilities for the Berlin puzzle generator. Units: mm.

export const v2 = (x, y) => [x, y];
export const add2 = (a, b) => [a[0] + b[0], a[1] + b[1]];
export const sub2 = (a, b) => [a[0] - b[0], a[1] - b[1]];
export const scale2 = (a, s) => [a[0] * s, a[1] * s];
export const len2 = (a) => Math.hypot(a[0], a[1]);
export const norm2 = (a) => scale2(a, 1 / (len2(a) || 1));
export const perp2 = (a) => [-a[1], a[0]];
export const dot2 = (a, b) => a[0] * b[0] + a[1] * b[1];
export const cross2 = (a, b) => a[0] * b[1] - a[1] * b[0];
export const lerp2 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

export const add3 = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub3 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const scale3 = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
export const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

// Catmull-Rom through points -> polyline. closed loops wrap.
export function catmullRom(pts, { closed = true, seg = 8, tension = 0.5 } = {}) {
  const n = pts.length;
  const out = [];
  const P = (i) => pts[((i % n) + n) % n];
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = closed ? P(i - 1) : pts[Math.max(0, i - 1)];
    const p1 = P(i);
    const p2 = closed ? P(i + 1) : pts[Math.min(n - 1, i + 1)];
    const p3 = closed ? P(i + 2) : pts[Math.min(n - 1, i + 2)];
    for (let j = 0; j < seg; j++) {
      const t = j / seg;
      const t2 = t * t, t3 = t2 * t;
      const q = [0, 1].map((k) =>
        tension * ((2 * p1[k]) + (-p0[k] + p2[k]) * t +
          (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 +
          (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3));
      out.push(q);
    }
  }
  if (!closed) out.push(pts[n - 1]);
  return out;
}

// Offset an open polyline by signed distance d (left of travel = +).
export function offsetPolyline(pts, d, miterLimit = 4) {
  const n = pts.length;
  const out = [];
  for (let i = 0; i < n; i++) {
    const pPrev = pts[Math.max(0, i - 1)];
    const pNext = pts[Math.min(n - 1, i + 1)];
    const dirIn = norm2(sub2(pts[i], pPrev));
    const dirOut = norm2(sub2(pNext, pts[i]));
    const nIn = perp2(dirIn), nOut = perp2(dirOut);
    let m = norm2(add2(nIn, nOut));
    let scaleM = 1 / Math.max(0.25, dot2(m, nIn) || 1);
    scaleM = Math.min(scaleM, miterLimit);
    out.push(add2(pts[i], scale2(m, d * scaleM)));
  }
  return out;
}

export function bbox(pts) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of pts) {
    if (x < x0) x0 = x; if (y < y0) y0 = y;
    if (x > x1) x1 = x; if (y > y1) y1 = y;
  }
  return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0 };
}

export function polyArea(pts) {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i], q = pts[(i + 1) % pts.length];
    a += p[0] * q[1] - q[0] * p[1];
  }
  return a / 2;
}

export function ensureCCW(pts) {
  return polyArea(pts) < 0 ? pts.slice().reverse() : pts;
}

export function pointInPoly(pt, poly) {
  let inside = false;
  const [x, y] = pt;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export function distPointSeg(p, a, b) {
  const ab = sub2(b, a);
  const t = Math.max(0, Math.min(1, dot2(sub2(p, a), ab) / (dot2(ab, ab) || 1)));
  return len2(sub2(p, add2(a, scale2(ab, t))));
}

export function distPointPoly(p, poly) {
  let d = Infinity;
  for (let i = 0; i < poly.length; i++) {
    d = Math.min(d, distPointSeg(p, poly[i], poly[(i + 1) % poly.length]));
  }
  return d;
}

// Signed containment: positive depth if inside region (outline minus holes), else -distance.
export function materialDepth(pt, outline, holes = []) {
  const dOut = distPointPoly(pt, outline);
  if (!pointInPoly(pt, outline)) return -dOut;
  let d = dOut;
  for (const h of holes) {
    const dh = distPointPoly(pt, h);
    if (pointInPoly(pt, h)) return -dh;
    d = Math.min(d, dh);
  }
  return d;
}

// Axis-aligned rect polygon, CCW.
export const rect = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
export const rectC = (cx, cy, w, h) => rect(cx - w / 2, cy - h / 2, w, h);

export function circle(cx, cy, r, n = 24) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    out.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return out;
}

export function translatePoly(poly, dx, dy) {
  return poly.map(([x, y]) => [x + dx, y + dy]);
}
export function rotatePoly(poly, deg, cx = 0, cy = 0) {
  const a = (deg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
  return poly.map(([x, y]) => [cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c]);
}
export function scalePoly(poly, sx, sy = sx, cx = 0, cy = 0) {
  return poly.map(([x, y]) => [cx + (x - cx) * sx, cy + (y - cy) * sy]);
}

// 45-degree corner relief spikes for the internal corners of an axis-aligned
// slot/notch. Returns spike segments {p:[x,y], ang} cut LEN into the material.
export const RELIEF_LEN = 0.15;
export function reliefSpike(p, angDeg) {
  return { p, ang: angDeg };
}
// For a rectangular hole: all 4 corners are internal; spikes point diagonally
// outward from the rect (into the surrounding material).
export function rectHoleSpikes(x, y, w, h) {
  return [
    reliefSpike([x, y], 225),
    reliefSpike([x + w, y], 315),
    reliefSpike([x + w, y + h], 45),
    reliefSpike([x, y + h], 135),
  ];
}

// Local (u,v,w) -> world for a part. frame = {O, U, V, N}; w in [0, T].
export function toWorld(frame, u, vv, w) {
  const { O, U, V, N } = frame;
  return [
    O[0] + u * U[0] + vv * V[0] + w * N[0],
    O[1] + u * U[1] + vv * V[1] + w * N[1],
    O[2] + u * U[2] + vv * V[2] + w * N[2],
  ];
}
// world -> local (assumes orthonormal frame)
export function toLocal(frame, p) {
  const d = sub3(p, frame.O);
  return [dot3(d, frame.U), dot3(d, frame.V), dot3(d, frame.N)];
}
