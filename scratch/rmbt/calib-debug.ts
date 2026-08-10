// Diagnose the calibration init stage by stage, before trusting any fit.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const data = JSON.parse(readFileSync(resolve("scratch/rmbt/calib-obs.json"), "utf8"));
const mmById = new Map<number, any>(data.geom.marks.map((m: any) => [m.id, m]));

// reuse the fitter's pieces by importing them would need exports; this file
// deliberately re-derives the two suspect steps in isolation.
const solve = (A: number[][], b: number[]): number[] | null => {
  const n = b.length; const M = A.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    if (Math.abs(M[p][c]) < 1e-14) return null;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = 0; r < n; r++) { if (r === c) continue; const k = M[r][c] / M[c][c]; for (let j = c; j <= n; j++) M[r][j] -= k * M[c][j]; }
  }
  return M.map((r, i) => r[n] / r[i][i]);
};
const smallestEigVec = (S: number[][]): number[] => {
  const n = S.length; const A = S.map((r) => [...r]);
  const V = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)));
  for (let sweep = 0; sweep < 200; sweep++) {
    let off = 0;
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) off += A[i][j] * A[i][j];
    if (off < 1e-30) break;
    for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) {
      if (Math.abs(A[p][q]) < 1e-20) continue;
      const th = (A[q][q] - A[p][p]) / (2 * A[p][q]);
      const t = Math.sign(th || 1) / (Math.abs(th) + Math.sqrt(th * th + 1));
      const c = 1 / Math.sqrt(t * t + 1), s = t * c;
      for (let k = 0; k < n; k++) { const a = A[k][p], b = A[k][q]; A[k][p] = c * a - s * b; A[k][q] = s * a + c * b; }
      for (let k = 0; k < n; k++) { const a = A[p][k], b = A[q][k]; A[p][k] = c * a - s * b; A[q][k] = s * a + c * b; }
      for (let k = 0; k < n; k++) { const a = V[k][p], b = V[k][q]; V[k][p] = c * a - s * b; V[k][q] = s * a + c * b; }
    }
  }
  let best = 0;
  for (let i = 1; i < n; i++) if (Math.abs(A[i][i]) < Math.abs(A[best][best])) best = i;
  return V.map((r) => r[best]);
};
const fitH = (pairs: any[]) => {
  const norm = (get: (p: any) => [number, number]) => {
    let mx = 0, my = 0;
    for (const p of pairs) { const [a, b] = get(p); mx += a; my += b; }
    mx /= pairs.length; my /= pairs.length;
    let d = 0; for (const p of pairs) { const [a, b] = get(p); d += Math.hypot(a - mx, b - my); }
    d = d / pairs.length || 1; return { s: Math.SQRT2 / d, mx, my };
  };
  const A = norm((p) => [p.X, p.Y]); const B = norm((p) => [p.u, p.v]);
  const M: number[][] = [];
  for (const p of pairs) {
    const x = A.s * (p.X - A.mx), y = A.s * (p.Y - A.my);
    const u = B.s * (p.u - B.mx), v = B.s * (p.v - B.my);
    M.push([-x, -y, -1, 0, 0, 0, u * x, u * y, u]);
    M.push([0, 0, 0, -x, -y, -1, v * x, v * y, v]);
  }
  const S = Array.from({ length: 9 }, (_, i) => Array.from({ length: 9 }, (_, j) => { let s = 0; for (const r of M) s += r[i] * r[j]; return s; }));
  const h = smallestEigVec(S);
  const Hn = [h.slice(0, 3), h.slice(3, 6), h.slice(6, 9)];
  const Ta = [[A.s, 0, -A.s * A.mx], [0, A.s, -A.s * A.my], [0, 0, 1]];
  const Bi = [[1 / B.s, 0, B.mx], [0, 1 / B.s, B.my], [0, 0, 1]];
  const mul = (P: number[][], Q: number[][]) => P.map((r) => Q[0].map((_, j) => r.reduce((s, v, k) => s + v * Q[k][j], 0)));
  const H = mul(mul(Bi, Hn), Ta).flat();
  return H.map((v) => v / (H[8] || 1));
};
const applyH = (H: number[], X: number, Y: number) => {
  const w = H[6] * X + H[7] * Y + H[8];
  return [(H[0] * X + H[1] * Y + H[2]) / w, (H[3] * X + H[4] * Y + H[5]) / w];
};

const views: any[] = [];
for (const c of data.cases) {
  if (c.w !== 960 || c.h !== 720) continue;
  const pairs = (c.both ?? []).map((o: any) => { const m = mmById.get(o.id); return { X: m.xMm, Y: m.yMm, u: o.x, v: o.y }; });
  if (pairs.length >= 4) views.push({ name: c.name, pairs });
}
console.log(`${views.length} views`);

// STEP 1 -- is the homography itself good?
let worst = 0, sum = 0, n = 0;
for (const v of views) {
  const H = fitH(v.pairs);
  v.H = H;
  let e2 = 0;
  for (const p of v.pairs) { const [u, q] = applyH(H, p.X, p.Y); const d = Math.hypot(u - p.u, q - p.v); e2 += d * d; worst = Math.max(worst, d); }
  const rms = Math.sqrt(e2 / v.pairs.length); v.rms = rms; sum += rms; n++;
}
console.log(`STEP1 homography self-RMS: mean ${(sum / n).toFixed(2)}px  worst single residual ${worst.toFixed(1)}px`);

// STEP 2 -- Zhang, raw and normalised, side by side
const zhang = (Hs: number[][], W: number, H: number, normalise: boolean) => {
  const s = normalise ? Math.max(W, H) : 1;
  const cx0 = normalise ? W / 2 : 0, cy0 = normalise ? H / 2 : 0;
  const wScale = normalise ? 100 : 1;
  const rows: number[][] = [];
  const vij = (h: number[], i: number, j: number) => {
    const hi = [h[i], h[i + 3], h[i + 6]], hj = [h[j], h[j + 3], h[j + 6]];
    return [hi[0] * hj[0], hi[0] * hj[1] + hi[1] * hj[0], hi[1] * hj[1],
      hi[2] * hj[0] + hi[0] * hj[2], hi[2] * hj[1] + hi[1] * hj[2], hi[2] * hj[2]];
  };
  for (const H0 of Hs) {
    // N * H * diag(wScale, wScale, 1): image into normalised units, world into decimetres
    const h = [
      (H0[0] - cx0 * H0[6]) / s * wScale, (H0[1] - cx0 * H0[7]) / s * wScale, (H0[2] - cx0 * H0[8]) / s,
      (H0[3] - cy0 * H0[6]) / s * wScale, (H0[4] - cy0 * H0[7]) / s * wScale, (H0[5] - cy0 * H0[8]) / s,
      H0[6] * wScale, H0[7] * wScale, H0[8]
    ];
    const v01 = vij(h, 0, 1), v00 = vij(h, 0, 0), v11 = vij(h, 1, 1);
    const push = (r: number[]) => { const m = Math.hypot(...r) || 1; rows.push(r.map((x) => x / m)); };
    push(v01); push(v00.map((x, i) => x - v11[i]));
  }
  const S = Array.from({ length: 6 }, (_, i) => Array.from({ length: 6 }, (_, j) => { let t = 0; for (const r of rows) t += r[i] * r[j]; return t; }));
  const b = smallestEigVec(S);
  const [B11, B12, B22, B13, B23, B33] = b;
  const den = B11 * B22 - B12 * B12;
  const cy = (B12 * B13 - B11 * B23) / den;
  const lam = B33 - (B13 * B13 + cy * (B12 * B13 - B11 * B23)) / B11;
  const fx = Math.sqrt(Math.abs(lam / B11)), fy = Math.sqrt(Math.abs((lam * B11) / den));
  const cx = (-B13 * fx * fx) / lam;
  return { f: ((fx + fy) / 2) * s, fx: fx * s, fy: fy * s, cx: cx * s + cx0, cy: cy * s + cy0, lam };
};
const Hs = views.map((v) => v.H);
console.log("STEP2 zhang raw       ", JSON.stringify(zhang(Hs, 960, 720, false), (k, v) => typeof v === "number" ? +v.toFixed(2) : v));
console.log("STEP2 zhang normalised", JSON.stringify(zhang(Hs, 960, 720, true), (k, v) => typeof v === "number" ? +v.toFixed(2) : v));

// STEP 3 -- does a pose fit at all, given a plausible f?
const rodrigues = (r: number[]) => {
  const th = Math.hypot(r[0], r[1], r[2]);
  if (th < 1e-12) return [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  const k = r.map((v) => v / th); const c = Math.cos(th), s = Math.sin(th), C = 1 - c;
  const [x, y, z] = k;
  return [[c + x * x * C, x * y * C - z * s, x * z * C + y * s],
    [y * x * C + z * s, c + y * y * C, y * z * C - x * s],
    [z * x * C - y * s, z * y * C + x * s, c + z * z * C]];
};
const project = (I: any, P: number[], X: number, Y: number) => {
  const R = rodrigues(P.slice(0, 3));
  const Z = R[2][0] * X + R[2][1] * Y + P[5];
  const xn = (R[0][0] * X + R[0][1] * Y + P[3]) / Z, yn = (R[1][0] * X + R[1][1] * Y + P[4]) / Z;
  const r2 = xn * xn + yn * yn, rad = 1 + I.k1 * r2 + I.k2 * r2 * r2;
  return [I.f * xn * rad + I.cx, I.f * yn * rad + I.cy];
};
const poseFromH = (I: any, H: number[]) => {
  const Ki = (c: number[]) => [(c[0] - I.cx * c[2]) / I.f, (c[1] - I.cy * c[2]) / I.f, c[2]];
  const c1 = Ki([H[0], H[3], H[6]]), c2 = Ki([H[1], H[4], H[7]]), c3 = Ki([H[2], H[5], H[8]]);
  const n1 = Math.hypot(...c1), n2 = Math.hypot(...c2);
  const lam = 2 / (n1 + n2);
  let r1 = c1.map((v) => v * lam), r2 = c2.map((v) => v * lam), t = c3.map((v) => v * lam);
  if (t[2] < 0) { r1 = r1.map((v) => -v); r2 = r2.map((v) => -v); t = t.map((v) => -v); }
  const d = r1[0] * r2[0] + r1[1] * r2[1] + r1[2] * r2[2];
  r2 = r2.map((v, i) => v - d * r1[i]);
  const m1 = Math.hypot(...r1), m2 = Math.hypot(...r2);
  r1 = r1.map((v) => v / m1); r2 = r2.map((v) => v / m2);
  const r3 = [r1[1] * r2[2] - r1[2] * r2[1], r1[2] * r2[0] - r1[0] * r2[2], r1[0] * r2[1] - r1[1] * r2[0]];
  const R = [[r1[0], r2[0], r3[0]], [r1[1], r2[1], r3[1]], [r1[2], r2[2], r3[2]]];
  const tr = R[0][0] + R[1][1] + R[2][2];
  const th = Math.acos(Math.max(-1, Math.min(1, (tr - 1) / 2)));
  let rv = [0, 0, 0];
  if (th > 1e-8) { const s = 2 * Math.sin(th); rv = [(R[2][1] - R[1][2]) / s * th, (R[0][2] - R[2][0]) / s * th, (R[1][0] - R[0][1]) / s * th]; }
  return [rv[0], rv[1], rv[2], t[0], t[1], t[2]];
};
const refine = (I: any, P0: number[], pairs: any[]) => {
  let P = [...P0];
  const resid = (Q: number[]) => { const r: number[] = []; for (const p of pairs) { const [u, v] = project(I, Q, p.X, p.Y); r.push(u - p.u, v - p.v); } return r; };
  let lam = 1e-3, r = resid(P), E = r.reduce((s, v) => s + v * v, 0);
  for (let it = 0; it < 80; it++) {
    const J: number[][] = [];
    for (let k = 0; k < 6; k++) {
      const h = Math.max(1e-7, Math.abs(P[k]) * 1e-6); const Q = [...P]; Q[k] += h;
      const r2 = resid(Q); J.push(r2.map((v, i) => (v - r[i]) / h));
    }
    const A = Array.from({ length: 6 }, (_, i) => Array.from({ length: 6 }, (_, j) => J[i].reduce((s, v, k) => s + v * J[j][k], 0)));
    const g = J.map((row) => -row.reduce((s, v, k) => s + v * r[k], 0));
    let ok = false;
    for (let t = 0; t < 10 && !ok; t++) {
      const Ad = A.map((row, i) => row.map((v, j) => (i === j ? v * (1 + lam) : v)));
      const d = solve(Ad, g); if (!d) { lam *= 10; continue; }
      const Q = P.map((v, i) => v + d[i]); const rq = resid(Q); const Eq = rq.reduce((s, v) => s + v * v, 0);
      if (Eq < E) { P = Q; r = rq; E = Eq; lam = Math.max(1e-9, lam / 3); ok = true; } else lam *= 10;
    }
    if (!ok) break;
  }
  return { P, rms: Math.sqrt(E / pairs.length) };
};

for (const f of [900, 1000, 1100, 1152, 1300]) {
  const I = { f, cx: 480, cy: 360, k1: 0, k2: 0 };
  let sum2 = 0, cnt = 0, bad = 0, dists: number[] = [];
  for (const v of views) {
    const P0 = poseFromH(I, v.H);
    const { P, rms } = refine(I, P0, v.pairs);
    if (!Number.isFinite(rms)) { bad++; continue; }
    sum2 += rms; cnt++; dists.push(Math.hypot(P[3], P[4], P[5]));
  }
  dists.sort((a, b) => a - b);
  console.log(`STEP3 f=${f}: mean pose RMS ${(sum2 / cnt).toFixed(2)}px over ${cnt} views (${bad} bad), dist med ${dists[dists.length >> 1].toFixed(0)}mm`);
}
