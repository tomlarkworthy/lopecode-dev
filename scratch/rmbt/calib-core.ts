// Camera calibration primitives, shared by the fitter and its self-test.
//
// One copy on purpose. A self-test that re-implements the maths tests the
// re-implementation, and the two drift the moment either is touched.

export type Intr = { f: number; cx: number; cy: number; k1: number; k2: number; p1: number; p2: number };
export type Pose = number[]; // [rx,ry,rz, tx,ty,tz] rodrigues + mm
export type Pair = { X: number; Y: number; u: number; v: number; id?: number };
export type View = { name: string; pairs: Pair[]; pose: Pose };

const solve = (A: number[][], b: number[]): number[] | null => {
  const n = b.length;
  const M = A.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    if (Math.abs(M[p][c]) < 1e-14) return null;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const k = M[r][c] / M[c][c];
      if (k === 0) continue;
      for (let j = c; j <= n; j++) M[r][j] -= k * M[c][j];
    }
  }
  // r[i] is the pivot on this row's diagonal after full Gauss-Jordan; r[n] is
  // the augmented right-hand side.
  const x = M.map((r, i) => r[n] / r[i]);
  // A pivot can clear an ABSOLUTE threshold and still be negligible relative to
  // the matrix, and then the "solution" comes back as 1e300 or Infinity. Left
  // unchecked that propagates into the Schur complement as Inf - Inf = NaN,
  // which looks like a broken objective rather than a singular block. Failing
  // here instead lets Levenberg-Marquardt do its job and raise the damping.
  return x.every((v) => Number.isFinite(v)) ? x : null;
};

const smallestEigVec = (S: number[][]): number[] => {
  const n = S.length;
  const A = S.map((r) => [...r]);
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

// Hartley-normalised DLT. Without it the 9x9 is conditioned by the pixel
// magnitudes and the solve quietly loses most of its digits.
const fitH = (pairs: Pair[]): number[] | null => {
  if (pairs.length < 4) return null;
  const norm = (get: (p: Pair) => [number, number]) => {
    let mx = 0, my = 0;
    for (const p of pairs) { const [a, b] = get(p); mx += a; my += b; }
    mx /= pairs.length; my /= pairs.length;
    let d = 0;
    for (const p of pairs) { const [a, b] = get(p); d += Math.hypot(a - mx, b - my); }
    d = d / pairs.length || 1;
    return { s: Math.SQRT2 / d, mx, my };
  };
  const A = norm((p) => [p.X, p.Y]);
  const B = norm((p) => [p.u, p.v]);
  const M: number[][] = [];
  for (const p of pairs) {
    const x = A.s * (p.X - A.mx), y = A.s * (p.Y - A.my);
    const u = B.s * (p.u - B.mx), v = B.s * (p.v - B.my);
    M.push([-x, -y, -1, 0, 0, 0, u * x, u * y, u]);
    M.push([0, 0, 0, -x, -y, -1, v * x, v * y, v]);
  }
  const S = Array.from({ length: 9 }, (_, i) => Array.from({ length: 9 }, (_, j) => {
    let s = 0; for (const r of M) s += r[i] * r[j]; return s;
  }));
  const h = smallestEigVec(S);
  const Hn = [h.slice(0, 3), h.slice(3, 6), h.slice(6, 9)];
  const Ta = [[A.s, 0, -A.s * A.mx], [0, A.s, -A.s * A.my], [0, 0, 1]];
  const Bi = [[1 / B.s, 0, B.mx], [0, 1 / B.s, B.my], [0, 0, 1]];
  const mul = (P: number[][], Q: number[][]) =>
    P.map((r) => Q[0].map((_, j) => r.reduce((s, v, k) => s + v * Q[k][j], 0)));
  const H = mul(mul(Bi, Hn), Ta).flat();
  const n = H[8] || 1;
  return H.map((v) => v / n);
};

const applyH = (H: number[], X: number, Y: number): [number, number] => {
  const w = H[6] * X + H[7] * Y + H[8];
  return [(H[0] * X + H[1] * Y + H[2]) / w, (H[3] * X + H[4] * Y + H[5]) / w];
};

const rodrigues = (r: number[]): number[][] => {
  const th = Math.hypot(r[0], r[1], r[2]);
  if (th < 1e-12) return [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  const k = r.map((v) => v / th);
  const c = Math.cos(th), s = Math.sin(th), C = 1 - c;
  const [x, y, z] = k;
  return [
    [c + x * x * C, x * y * C - z * s, x * z * C + y * s],
    [y * x * C + z * s, c + y * y * C, y * z * C - x * s],
    [z * x * C - y * s, z * y * C + x * s, c + z * z * C]
  ];
};

const rodriguesInv = (R: number[][]): number[] => {
  const tr = R[0][0] + R[1][1] + R[2][2];
  const th = Math.acos(Math.max(-1, Math.min(1, (tr - 1) / 2)));
  if (th < 1e-8) return [0, 0, 0];
  if (Math.PI - th < 1e-6) {
    // near 180 degrees the antisymmetric part vanishes; take the axis from the
    // diagonal instead of dividing by a sine that is on its way to zero
    const d = [R[0][0], R[1][1], R[2][2]];
    let i = 0; for (let k = 1; k < 3; k++) if (d[k] > d[i]) i = k;
    const ax = [0, 0, 0];
    ax[i] = Math.sqrt(Math.max(0, (d[i] + 1) / 2));
    const j = (i + 1) % 3, k = (i + 2) % 3;
    ax[j] = R[i][j] / (2 * ax[i]); ax[k] = R[i][k] / (2 * ax[i]);
    const n = Math.hypot(...ax) || 1;
    return ax.map((v) => (v / n) * th);
  }
  const s = 2 * Math.sin(th);
  return [(R[2][1] - R[1][2]) / s * th, (R[0][2] - R[2][0]) / s * th, (R[1][0] - R[0][1]) / s * th];
};

const project = (I: Intr, P: Pose, X: number, Y: number): [number, number] => {
  const R = rodrigues(P.slice(0, 3));
  const Z = R[2][0] * X + R[2][1] * Y + P[5];
  const xn = (R[0][0] * X + R[0][1] * Y + P[3]) / Z;
  const yn = (R[1][0] * X + R[1][1] * Y + P[4]) / Z;
  const r2 = xn * xn + yn * yn;
  const rad = 1 + I.k1 * r2 + I.k2 * r2 * r2;
  const xd = xn * rad + 2 * I.p1 * xn * yn + I.p2 * (r2 + 2 * xn * xn);
  const yd = yn * rad + I.p1 * (r2 + 2 * yn * yn) + 2 * I.p2 * xn * yn;
  return [I.f * xd + I.cx, I.f * yd + I.cy];
};

// pixel -> undistorted normalised, by the standard fixed-point iteration
const unproject = (I: Intr, u: number, v: number): [number, number] => {
  const x0 = (u - I.cx) / I.f, y0 = (v - I.cy) / I.f;
  let x = x0, y = y0;
  for (let i = 0; i < 12; i++) {
    const r2 = x * x + y * y;
    const rad = 1 + I.k1 * r2 + I.k2 * r2 * r2;
    const dx = 2 * I.p1 * x * y + I.p2 * (r2 + 2 * x * x);
    const dy = I.p1 * (r2 + 2 * y * y) + 2 * I.p2 * x * y;
    x = (x0 - dx) / rad; y = (y0 - dy) / rad;
  }
  return [x, y];
};

const poseFromH = (I: Intr, H: number[]): Pose | null => {
  const Ki = (c: number[]) => [(c[0] - I.cx * c[2]) / I.f, (c[1] - I.cy * c[2]) / I.f, c[2]];
  const c1 = Ki([H[0], H[3], H[6]]);
  const c2 = Ki([H[1], H[4], H[7]]);
  const c3 = Ki([H[2], H[5], H[8]]);
  const n1 = Math.hypot(c1[0], c1[1], c1[2]);
  const n2 = Math.hypot(c2[0], c2[1], c2[2]);
  if (!(n1 > 1e-12) || !(n2 > 1e-12)) return null;
  const lam = 2 / (n1 + n2);
  let r1 = c1.map((v) => v * lam), r2 = c2.map((v) => v * lam), t = c3.map((v) => v * lam);
  if (t[2] < 0) { r1 = r1.map((v) => -v); r2 = r2.map((v) => -v); t = t.map((v) => -v); }
  const d = r1[0] * r2[0] + r1[1] * r2[1] + r1[2] * r2[2];
  r2 = r2.map((v, i) => v - d * r1[i]);
  const m1 = Math.hypot(r1[0], r1[1], r1[2]), m2 = Math.hypot(r2[0], r2[1], r2[2]);
  if (!(m1 > 1e-12) || !(m2 > 1e-12)) return null;
  r1 = r1.map((v) => v / m1); r2 = r2.map((v) => v / m2);
  const r3 = [r1[1] * r2[2] - r1[2] * r2[1], r1[2] * r2[0] - r1[0] * r2[2], r1[0] * r2[1] - r1[1] * r2[0]];
  const R = [[r1[0], r2[0], r3[0]], [r1[1], r2[1], r3[1]], [r1[2], r2[2], r3[2]]];
  const rv = rodriguesInv(R);
  return [rv[0], rv[1], rv[2], t[0], t[1], t[2]];
};

const refinePose = (I: Intr, P0: Pose, pairs: Pair[], rounds = 80): Pose => {
  let P = [...P0];
  const resid = (Q: Pose) => {
    const r: number[] = [];
    for (const p of pairs) { const [u, v] = project(I, Q, p.X, p.Y); r.push(u - p.u, v - p.v); }
    return r;
  };
  let lam = 1e-3;
  let r = resid(P), E = r.reduce((s, v) => s + v * v, 0);
  if (!Number.isFinite(E)) return P;
  for (let it = 0; it < rounds; it++) {
    const J: number[][] = [];
    for (let k = 0; k < 6; k++) {
      const h = k < 3 ? 1e-6 : Math.max(1e-5, Math.abs(P[k]) * 1e-6);
      const Q = [...P]; Q[k] += h;
      const r2 = resid(Q);
      J.push(r2.map((v, i) => (v - r[i]) / h));
    }
    const A = Array.from({ length: 6 }, (_, i) => Array.from({ length: 6 }, (_, j) =>
      J[i].reduce((s, v, k) => s + v * J[j][k], 0)));
    const g = J.map((row) => -row.reduce((s, v, k) => s + v * r[k], 0));
    let ok = false;
    for (let tries = 0; tries < 12 && !ok; tries++) {
      const Ad = A.map((row, i) => row.map((v, j) => (i === j ? v * (1 + lam) + 1e-12 : v)));
      const d = solve(Ad, g);
      if (!d || d.some((x) => !Number.isFinite(x))) { lam *= 10; continue; }
      const Q = P.map((v, i) => v + d[i]);
      const rq = resid(Q), Eq = rq.reduce((s, v) => s + v * v, 0);
      if (Number.isFinite(Eq) && Eq < E) { P = Q; r = rq; E = Eq; lam = Math.max(1e-10, lam / 3); ok = true; }
      else lam *= 10;
    }
    if (!ok) break;
  }
  return P;
};

// Zhang's closed form for K, in NORMALISED units.
//
// Done in raw pixels and millimetres the six-vector b spans about fourteen
// orders of magnitude (h3 components are ~1e-3 where h1 components are ~50),
// and the 6x6 normal equations lose every digit that matters. Scaling the
// image by max(W,H) and the world into decimetres puts every entry near 1.
// The world scale is a free choice: it multiplies both plane columns of H
// equally, which is exactly the invariance Zhang's two constraints have.
const zhangK = (Hs: number[][], W: number, H: number) => {
  const s = Math.max(W, H), cx0 = W / 2, cy0 = H / 2, wScale = 100;
  const rows: number[][] = [];
  const vij = (h: number[], i: number, j: number) => {
    const hi = [h[i], h[i + 3], h[i + 6]], hj = [h[j], h[j + 3], h[j + 6]];
    return [
      hi[0] * hj[0], hi[0] * hj[1] + hi[1] * hj[0], hi[1] * hj[1],
      hi[2] * hj[0] + hi[0] * hj[2], hi[2] * hj[1] + hi[1] * hj[2], hi[2] * hj[2]
    ];
  };
  for (const H0 of Hs) {
    if (!H0) continue;
    const h = [
      (H0[0] - cx0 * H0[6]) / s * wScale, (H0[1] - cx0 * H0[7]) / s * wScale, (H0[2] - cx0 * H0[8]) / s,
      (H0[3] - cy0 * H0[6]) / s * wScale, (H0[4] - cy0 * H0[7]) / s * wScale, (H0[5] - cy0 * H0[8]) / s,
      H0[6] * wScale, H0[7] * wScale, H0[8]
    ];
    const v01 = vij(h, 0, 1), v00 = vij(h, 0, 0), v11 = vij(h, 1, 1);
    // each view contributes two constraints; normalise them so a distant view
    // with a small |H| does not simply count for less
    const push = (r: number[]) => { const m = Math.hypot(...r) || 1; rows.push(r.map((x) => x / m)); };
    push(v01);
    push(v00.map((x, i) => x - v11[i]));
  }
  const S = Array.from({ length: 6 }, (_, i) => Array.from({ length: 6 }, (_, j) => {
    let t = 0; for (const r of rows) t += r[i] * r[j]; return t;
  }));
  const b = smallestEigVec(S);
  const [B11, B12, B22, B13, B23, B33] = b;
  const den = B11 * B22 - B12 * B12;
  const cyN = (B12 * B13 - B11 * B23) / den;
  const lamv = B33 - (B13 * B13 + cyN * (B12 * B13 - B11 * B23)) / B11;
  const fx = Math.sqrt(Math.abs(lamv / B11));
  const fy = Math.sqrt(Math.abs((lamv * B11) / den));
  const cxN = (-B13 * fx * fx) / lamv;
  const f = ((fx + fy) / 2) * s, cx = cxN * s + cx0, cy = cyN * s + cy0;
  // Zhang's form assumes no distortion; on a wide lens it can still land
  // somewhere absurd, and seeding a bundle from noise is worse than seeding it
  // from a guess. Say which happened rather than hiding it.
  const sane = Number.isFinite(f) && f > 0.3 * s && f < 6 * s
    && Number.isFinite(cx) && Math.abs(cx - cx0) < 0.4 * W
    && Number.isFinite(cy) && Math.abs(cy - cy0) < 0.4 * H;
  return sane ? { f, cx, cy, fallback: false } : { f: 1.2 * W, cx: cx0, cy: cy0, fallback: true };
};

// Sparse bundle adjustment: global intrinsics + one pose per view, with the
// per-view blocks eliminated by Schur complement so only a tiny system is
// actually solved.
const bundle = (I0: Intr, views: View[], free: (keyof Intr)[], rounds = 60, log?: (s: string) => void) => {
  let I: Intr = { ...I0 };
  const gk = free;
  const NG = gk.length;
  const cost = (Ii: Intr, vs: View[]) => {
    let E = 0, n = 0;
    for (const v of vs) for (const p of v.pairs) {
      const [u, q] = project(Ii, v.pose, p.X, p.Y);
      E += (u - p.u) ** 2 + (q - p.v) ** 2; n++;
    }
    return { E, rms: Math.sqrt(E / Math.max(1, n)) };
  };
  let lam = 1e-3;
  let E = cost(I, views).E;
  const dotv = (x: number[], y: number[]) => x.reduce((s, v, i) => s + v * y[i], 0);
  for (let it = 0; it < rounds; it++) {
    const U = Array.from({ length: NG }, () => new Array(NG).fill(0));
    const rg = new Array(NG).fill(0);
    const blocks: { V: number[][]; W: number[][]; rp: number[] }[] = [];
    for (const view of views) {
      const base: number[] = [];
      for (const p of view.pairs) { const [u, v] = project(I, view.pose, p.X, p.Y); base.push(u - p.u, v - p.v); }
      const A: number[][] = [], B: number[][] = [];
      for (let k = 0; k < NG; k++) {
        const key = gk[k];
        const h = Math.max(1e-7, Math.abs(I[key]) * 1e-6);
        const Ii = { ...I, [key]: I[key] + h } as Intr;
        const col: number[] = [];
        for (const p of view.pairs) { const [u, v] = project(Ii, view.pose, p.X, p.Y); col.push(u - p.u, v - p.v); }
        A.push(col.map((v, i) => (v - base[i]) / h));
      }
      for (let k = 0; k < 6; k++) {
        const h = k < 3 ? 1e-6 : Math.max(1e-5, Math.abs(view.pose[k]) * 1e-6);
        const Q = [...view.pose]; Q[k] += h;
        const col: number[] = [];
        for (const p of view.pairs) { const [u, v] = project(I, Q, p.X, p.Y); col.push(u - p.u, v - p.v); }
        B.push(col.map((v, i) => (v - base[i]) / h));
      }
      for (let i = 0; i < NG; i++) {
        rg[i] -= dotv(A[i], base);
        for (let j = 0; j < NG; j++) U[i][j] += dotv(A[i], A[j]);
      }
      blocks.push({
        V: Array.from({ length: 6 }, (_, i) => Array.from({ length: 6 }, (_, j) => dotv(B[i], B[j]))),
        W: Array.from({ length: NG }, (_, i) => Array.from({ length: 6 }, (_, j) => dotv(A[i], B[j]))),
        rp: B.map((row) => -dotv(row, base))
      });
    }
    let applied = false;
    for (let tries = 0; tries < 12 && !applied; tries++) {
      const S = U.map((row, i) => row.map((v, j) => (i === j ? v * (1 + lam) + 1e-12 : v)));
      const rs = [...rg];
      const invs: (number[][] | null)[] = [];
      let bad = false;
      for (const b of blocks) {
        const Vd = b.V.map((row, i) => row.map((v, j) => (i === j ? v * (1 + lam) + 1e-12 : v)));
        const cols = Array.from({ length: 6 }, (_, c) => solve(Vd, Array.from({ length: 6 }, (_, r) => (r === c ? 1 : 0))));
        if (cols.some((c) => !c)) { bad = true; invs.push(null); continue; }
        const Vinv = Array.from({ length: 6 }, (_, r) => Array.from({ length: 6 }, (_, c) => (cols[c] as number[])[r]));
        invs.push(Vinv);
        const WV = b.W.map((row) => Array.from({ length: 6 }, (_, j) => row.reduce((s, v, k) => s + v * Vinv[k][j], 0)));
        for (let i = 0; i < NG; i++) {
          for (let j = 0; j < NG; j++) S[i][j] -= WV[i].reduce((s, v, k) => s + v * b.W[j][k], 0);
          rs[i] -= WV[i].reduce((s, v, k) => s + v * b.rp[k], 0);
        }
      }
      if (bad) { log?.(`    lam=${lam.toExponential(1)} singular pose block`); lam *= 10; continue; }
      const dg = NG ? solve(S, rs) : [];
      if (!dg || dg.some((x) => !Number.isFinite(x))) { log?.(`    lam=${lam.toExponential(1)} singular schur`); lam *= 10; continue; }
      const Itry: Intr = { ...I };
      gk.forEach((key, i) => { (Itry as any)[key] = I[key] + dg[i]; });
      const tryPoses = views.map((v, vi) => {
        const b = blocks[vi], Vinv = invs[vi] as number[][];
        const rhs = b.rp.map((val, r) => val - b.W.reduce((s, row, i) => s + row[r] * dg[i], 0));
        const dp = Array.from({ length: 6 }, (_, r) => Vinv[r].reduce((s, v, c) => s + v * rhs[c], 0));
        return v.pose.map((val, i) => val + dp[i]);
      });
      const Et = cost(Itry, views.map((v, i) => ({ ...v, pose: tryPoses[i] }))).E;
      if (Number.isFinite(Et) && Et < E) {
        I = Itry;
        tryPoses.forEach((p, i) => { views[i].pose = p; });
        log?.(`  it${it} lam=${lam.toExponential(1)} E ${E.toExponential(3)} -> ${Et.toExponential(3)} dg=[${dg.map((x) => x.toExponential(1)).join(",")}]`);
        E = Et; lam = Math.max(1e-10, lam / 3); applied = true;
      } else lam *= 10;
    }
    if (!applied) { log?.(`  it${it} STALLED at E=${E.toExponential(3)} lam=${lam.toExponential(1)}`); break; }
  }
  return { I, rms: cost(I, views).rms };
};

export const calib = {
  solve, smallestEigVec, fitH, applyH, rodrigues, rodriguesInv,
  project, unproject, poseFromH, refinePose, zhangK, bundle
};
