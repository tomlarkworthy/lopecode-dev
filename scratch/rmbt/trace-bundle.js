(() => {
  var __defProp = Object.defineProperty;
  var __returnValue = (v) => v;
  function __exportSetter(name, newValue) {
    this[name] = __returnValue.bind(null, newValue);
  }
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, {
        get: all[name],
        enumerable: true,
        configurable: true,
        set: __exportSetter.bind(all, name)
      });
  };

  // scratch/rmbt/calib-core.ts
  var solve = (A, b) => {
    const n = b.length;
    const M = A.map((r, i) => [...r, b[i]]);
    for (let c = 0;c < n; c++) {
      let p = c;
      for (let r = c + 1;r < n; r++)
        if (Math.abs(M[r][c]) > Math.abs(M[p][c]))
          p = r;
      if (Math.abs(M[p][c]) < 0.00000000000001)
        return null;
      [M[c], M[p]] = [M[p], M[c]];
      for (let r = 0;r < n; r++) {
        if (r === c)
          continue;
        const k = M[r][c] / M[c][c];
        if (k === 0)
          continue;
        for (let j = c;j <= n; j++)
          M[r][j] -= k * M[c][j];
      }
    }
    const x = M.map((r, i) => r[n] / r[i]);
    return x.every((v) => Number.isFinite(v)) ? x : null;
  };
  var smallestEigVec = (S) => {
    const n = S.length;
    const A = S.map((r) => [...r]);
    const V = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_2, j) => i === j ? 1 : 0));
    for (let sweep = 0;sweep < 200; sweep++) {
      let off = 0;
      for (let i = 0;i < n; i++)
        for (let j = i + 1;j < n; j++)
          off += A[i][j] * A[i][j];
      if (off < 0.000000000000000000000000000001)
        break;
      for (let p = 0;p < n; p++)
        for (let q = p + 1;q < n; q++) {
          if (Math.abs(A[p][q]) < 0.00000000000000000001)
            continue;
          const th = (A[q][q] - A[p][p]) / (2 * A[p][q]);
          const t = Math.sign(th || 1) / (Math.abs(th) + Math.sqrt(th * th + 1));
          const c = 1 / Math.sqrt(t * t + 1), s = t * c;
          for (let k = 0;k < n; k++) {
            const a = A[k][p], b = A[k][q];
            A[k][p] = c * a - s * b;
            A[k][q] = s * a + c * b;
          }
          for (let k = 0;k < n; k++) {
            const a = A[p][k], b = A[q][k];
            A[p][k] = c * a - s * b;
            A[q][k] = s * a + c * b;
          }
          for (let k = 0;k < n; k++) {
            const a = V[k][p], b = V[k][q];
            V[k][p] = c * a - s * b;
            V[k][q] = s * a + c * b;
          }
        }
    }
    let best = 0;
    for (let i = 1;i < n; i++)
      if (Math.abs(A[i][i]) < Math.abs(A[best][best]))
        best = i;
    return V.map((r) => r[best]);
  };
  var fitH = (pairs) => {
    if (pairs.length < 4)
      return null;
    const norm = (get) => {
      let mx = 0, my = 0;
      for (const p of pairs) {
        const [a, b] = get(p);
        mx += a;
        my += b;
      }
      mx /= pairs.length;
      my /= pairs.length;
      let d = 0;
      for (const p of pairs) {
        const [a, b] = get(p);
        d += Math.hypot(a - mx, b - my);
      }
      d = d / pairs.length || 1;
      return { s: Math.SQRT2 / d, mx, my };
    };
    const A = norm((p) => [p.X, p.Y]);
    const B = norm((p) => [p.u, p.v]);
    const M = [];
    for (const p of pairs) {
      const x = A.s * (p.X - A.mx), y = A.s * (p.Y - A.my);
      const u = B.s * (p.u - B.mx), v = B.s * (p.v - B.my);
      M.push([-x, -y, -1, 0, 0, 0, u * x, u * y, u]);
      M.push([0, 0, 0, -x, -y, -1, v * x, v * y, v]);
    }
    const S = Array.from({ length: 9 }, (_, i) => Array.from({ length: 9 }, (_2, j) => {
      let s = 0;
      for (const r of M)
        s += r[i] * r[j];
      return s;
    }));
    const h = smallestEigVec(S);
    const Hn = [h.slice(0, 3), h.slice(3, 6), h.slice(6, 9)];
    const Ta = [[A.s, 0, -A.s * A.mx], [0, A.s, -A.s * A.my], [0, 0, 1]];
    const Bi = [[1 / B.s, 0, B.mx], [0, 1 / B.s, B.my], [0, 0, 1]];
    const mul = (P, Q) => P.map((r) => Q[0].map((_, j) => r.reduce((s, v, k) => s + v * Q[k][j], 0)));
    const H = mul(mul(Bi, Hn), Ta).flat();
    const n = H[8] || 1;
    return H.map((v) => v / n);
  };
  var applyH = (H, X, Y) => {
    const w = H[6] * X + H[7] * Y + H[8];
    return [(H[0] * X + H[1] * Y + H[2]) / w, (H[3] * X + H[4] * Y + H[5]) / w];
  };
  var rodrigues = (r) => {
    const th = Math.hypot(r[0], r[1], r[2]);
    if (th < 0.000000000001)
      return [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
    const k = r.map((v) => v / th);
    const c = Math.cos(th), s = Math.sin(th), C = 1 - c;
    const [x, y, z] = k;
    return [
      [c + x * x * C, x * y * C - z * s, x * z * C + y * s],
      [y * x * C + z * s, c + y * y * C, y * z * C - x * s],
      [z * x * C - y * s, z * y * C + x * s, c + z * z * C]
    ];
  };
  var rodriguesInv = (R) => {
    const tr = R[0][0] + R[1][1] + R[2][2];
    const th = Math.acos(Math.max(-1, Math.min(1, (tr - 1) / 2)));
    if (th < 0.00000001)
      return [0, 0, 0];
    if (Math.PI - th < 0.000001) {
      const d = [R[0][0], R[1][1], R[2][2]];
      let i = 0;
      for (let k2 = 1;k2 < 3; k2++)
        if (d[k2] > d[i])
          i = k2;
      const ax = [0, 0, 0];
      ax[i] = Math.sqrt(Math.max(0, (d[i] + 1) / 2));
      const j = (i + 1) % 3, k = (i + 2) % 3;
      ax[j] = R[i][j] / (2 * ax[i]);
      ax[k] = R[i][k] / (2 * ax[i]);
      const n = Math.hypot(...ax) || 1;
      return ax.map((v) => v / n * th);
    }
    const s = 2 * Math.sin(th);
    return [(R[2][1] - R[1][2]) / s * th, (R[0][2] - R[2][0]) / s * th, (R[1][0] - R[0][1]) / s * th];
  };
  var project = (I, P, X, Y) => {
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
  var unproject = (I, u, v) => {
    const x0 = (u - I.cx) / I.f, y0 = (v - I.cy) / I.f;
    let x = x0, y = y0;
    for (let i = 0;i < 12; i++) {
      const r2 = x * x + y * y;
      const rad = 1 + I.k1 * r2 + I.k2 * r2 * r2;
      const dx = 2 * I.p1 * x * y + I.p2 * (r2 + 2 * x * x);
      const dy = I.p1 * (r2 + 2 * y * y) + 2 * I.p2 * x * y;
      x = (x0 - dx) / rad;
      y = (y0 - dy) / rad;
    }
    return [x, y];
  };
  var poseFromH = (I, H) => {
    const Ki = (c) => [(c[0] - I.cx * c[2]) / I.f, (c[1] - I.cy * c[2]) / I.f, c[2]];
    const c1 = Ki([H[0], H[3], H[6]]);
    const c2 = Ki([H[1], H[4], H[7]]);
    const c3 = Ki([H[2], H[5], H[8]]);
    const n1 = Math.hypot(c1[0], c1[1], c1[2]);
    const n2 = Math.hypot(c2[0], c2[1], c2[2]);
    if (!(n1 > 0.000000000001) || !(n2 > 0.000000000001))
      return null;
    const lam = 2 / (n1 + n2);
    let r1 = c1.map((v) => v * lam), r2 = c2.map((v) => v * lam), t = c3.map((v) => v * lam);
    if (t[2] < 0) {
      r1 = r1.map((v) => -v);
      r2 = r2.map((v) => -v);
      t = t.map((v) => -v);
    }
    const d = r1[0] * r2[0] + r1[1] * r2[1] + r1[2] * r2[2];
    r2 = r2.map((v, i) => v - d * r1[i]);
    const m1 = Math.hypot(r1[0], r1[1], r1[2]), m2 = Math.hypot(r2[0], r2[1], r2[2]);
    if (!(m1 > 0.000000000001) || !(m2 > 0.000000000001))
      return null;
    r1 = r1.map((v) => v / m1);
    r2 = r2.map((v) => v / m2);
    const r3 = [r1[1] * r2[2] - r1[2] * r2[1], r1[2] * r2[0] - r1[0] * r2[2], r1[0] * r2[1] - r1[1] * r2[0]];
    const R = [[r1[0], r2[0], r3[0]], [r1[1], r2[1], r3[1]], [r1[2], r2[2], r3[2]]];
    const rv = rodriguesInv(R);
    return [rv[0], rv[1], rv[2], t[0], t[1], t[2]];
  };
  var refinePose = (I, P0, pairs, rounds = 80) => {
    let P = [...P0];
    const resid = (Q) => {
      const r2 = [];
      for (const p of pairs) {
        const [u, v] = project(I, Q, p.X, p.Y);
        r2.push(u - p.u, v - p.v);
      }
      return r2;
    };
    let lam = 0.001;
    let r = resid(P), E = r.reduce((s, v) => s + v * v, 0);
    if (!Number.isFinite(E))
      return P;
    for (let it = 0;it < rounds; it++) {
      const J = [];
      for (let k = 0;k < 6; k++) {
        const h = k < 3 ? 0.000001 : Math.max(0.00001, Math.abs(P[k]) * 0.000001);
        const Q = [...P];
        Q[k] += h;
        const r2 = resid(Q);
        J.push(r2.map((v, i) => (v - r[i]) / h));
      }
      const A = Array.from({ length: 6 }, (_, i) => Array.from({ length: 6 }, (_2, j) => J[i].reduce((s, v, k) => s + v * J[j][k], 0)));
      const g = J.map((row) => -row.reduce((s, v, k) => s + v * r[k], 0));
      let ok = false;
      for (let tries = 0;tries < 12 && !ok; tries++) {
        const Ad = A.map((row, i) => row.map((v, j) => i === j ? v * (1 + lam) + 0.000000000001 : v));
        const d = solve(Ad, g);
        if (!d || d.some((x) => !Number.isFinite(x))) {
          lam *= 10;
          continue;
        }
        const Q = P.map((v, i) => v + d[i]);
        const rq = resid(Q), Eq = rq.reduce((s, v) => s + v * v, 0);
        if (Number.isFinite(Eq) && Eq < E) {
          P = Q;
          r = rq;
          E = Eq;
          lam = Math.max(0.0000000001, lam / 3);
          ok = true;
        } else
          lam *= 10;
      }
      if (!ok)
        break;
    }
    return P;
  };
  var zhangK = (Hs, W, H) => {
    const s = Math.max(W, H), cx0 = W / 2, cy0 = H / 2, wScale = 100;
    const rows = [];
    const vij = (h, i, j) => {
      const hi = [h[i], h[i + 3], h[i + 6]], hj = [h[j], h[j + 3], h[j + 6]];
      return [
        hi[0] * hj[0],
        hi[0] * hj[1] + hi[1] * hj[0],
        hi[1] * hj[1],
        hi[2] * hj[0] + hi[0] * hj[2],
        hi[2] * hj[1] + hi[1] * hj[2],
        hi[2] * hj[2]
      ];
    };
    for (const H0 of Hs) {
      if (!H0)
        continue;
      const h = [
        (H0[0] - cx0 * H0[6]) / s * wScale,
        (H0[1] - cx0 * H0[7]) / s * wScale,
        (H0[2] - cx0 * H0[8]) / s,
        (H0[3] - cy0 * H0[6]) / s * wScale,
        (H0[4] - cy0 * H0[7]) / s * wScale,
        (H0[5] - cy0 * H0[8]) / s,
        H0[6] * wScale,
        H0[7] * wScale,
        H0[8]
      ];
      const v01 = vij(h, 0, 1), v00 = vij(h, 0, 0), v11 = vij(h, 1, 1);
      const push = (r) => {
        const m = Math.hypot(...r) || 1;
        rows.push(r.map((x) => x / m));
      };
      push(v01);
      push(v00.map((x, i) => x - v11[i]));
    }
    const S = Array.from({ length: 6 }, (_, i) => Array.from({ length: 6 }, (_2, j) => {
      let t = 0;
      for (const r of rows)
        t += r[i] * r[j];
      return t;
    }));
    const b = smallestEigVec(S);
    const [B11, B12, B22, B13, B23, B33] = b;
    const den = B11 * B22 - B12 * B12;
    const cyN = (B12 * B13 - B11 * B23) / den;
    const lamv = B33 - (B13 * B13 + cyN * (B12 * B13 - B11 * B23)) / B11;
    const fx = Math.sqrt(Math.abs(lamv / B11));
    const fy = Math.sqrt(Math.abs(lamv * B11 / den));
    const cxN = -B13 * fx * fx / lamv;
    const f = (fx + fy) / 2 * s, cx = cxN * s + cx0, cy = cyN * s + cy0;
    const sane = Number.isFinite(f) && f > 0.3 * s && f < 6 * s && Number.isFinite(cx) && Math.abs(cx - cx0) < 0.4 * W && Number.isFinite(cy) && Math.abs(cy - cy0) < 0.4 * H;
    return sane ? { f, cx, cy, fallback: false } : { f: 1.2 * W, cx: cx0, cy: cy0, fallback: true };
  };
  var bundle = (I0, views, free, rounds = 60, log) => {
    let I = { ...I0 };
    const gk = free;
    const NG = gk.length;
    const cost = (Ii, vs) => {
      let E2 = 0, n = 0;
      for (const v of vs)
        for (const p of v.pairs) {
          const [u, q] = project(Ii, v.pose, p.X, p.Y);
          E2 += (u - p.u) ** 2 + (q - p.v) ** 2;
          n++;
        }
      return { E: E2, rms: Math.sqrt(E2 / Math.max(1, n)) };
    };
    let lam = 0.001;
    let E = cost(I, views).E;
    const dotv = (x, y) => x.reduce((s, v, i) => s + v * y[i], 0);
    for (let it = 0;it < rounds; it++) {
      const U = Array.from({ length: NG }, () => new Array(NG).fill(0));
      const rg = new Array(NG).fill(0);
      const blocks = [];
      for (const view of views) {
        const base = [];
        for (const p of view.pairs) {
          const [u, v] = project(I, view.pose, p.X, p.Y);
          base.push(u - p.u, v - p.v);
        }
        const A = [], B = [];
        for (let k = 0;k < NG; k++) {
          const key = gk[k];
          const h = Math.max(0.0000001, Math.abs(I[key]) * 0.000001);
          const Ii = { ...I, [key]: I[key] + h };
          const col = [];
          for (const p of view.pairs) {
            const [u, v] = project(Ii, view.pose, p.X, p.Y);
            col.push(u - p.u, v - p.v);
          }
          A.push(col.map((v, i) => (v - base[i]) / h));
        }
        for (let k = 0;k < 6; k++) {
          const h = k < 3 ? 0.000001 : Math.max(0.00001, Math.abs(view.pose[k]) * 0.000001);
          const Q = [...view.pose];
          Q[k] += h;
          const col = [];
          for (const p of view.pairs) {
            const [u, v] = project(I, Q, p.X, p.Y);
            col.push(u - p.u, v - p.v);
          }
          B.push(col.map((v, i) => (v - base[i]) / h));
        }
        for (let i = 0;i < NG; i++) {
          rg[i] -= dotv(A[i], base);
          for (let j = 0;j < NG; j++)
            U[i][j] += dotv(A[i], A[j]);
        }
        blocks.push({
          V: Array.from({ length: 6 }, (_, i) => Array.from({ length: 6 }, (_2, j) => dotv(B[i], B[j]))),
          W: Array.from({ length: NG }, (_, i) => Array.from({ length: 6 }, (_2, j) => dotv(A[i], B[j]))),
          rp: B.map((row) => -dotv(row, base))
        });
      }
      let applied = false;
      for (let tries = 0;tries < 12 && !applied; tries++) {
        const S = U.map((row, i) => row.map((v, j) => i === j ? v * (1 + lam) + 0.000000000001 : v));
        const rs = [...rg];
        const invs = [];
        let bad = false;
        for (const b of blocks) {
          const Vd = b.V.map((row, i) => row.map((v, j) => i === j ? v * (1 + lam) + 0.000000000001 : v));
          const cols = Array.from({ length: 6 }, (_, c) => solve(Vd, Array.from({ length: 6 }, (_2, r) => r === c ? 1 : 0)));
          if (cols.some((c) => !c)) {
            bad = true;
            invs.push(null);
            continue;
          }
          const Vinv = Array.from({ length: 6 }, (_, r) => Array.from({ length: 6 }, (_2, c) => cols[c][r]));
          invs.push(Vinv);
          const WV = b.W.map((row) => Array.from({ length: 6 }, (_, j) => row.reduce((s, v, k) => s + v * Vinv[k][j], 0)));
          for (let i = 0;i < NG; i++) {
            for (let j = 0;j < NG; j++)
              S[i][j] -= WV[i].reduce((s, v, k) => s + v * b.W[j][k], 0);
            rs[i] -= WV[i].reduce((s, v, k) => s + v * b.rp[k], 0);
          }
        }
        if (bad) {
          log?.(`    lam=${lam.toExponential(1)} singular pose block`);
          lam *= 10;
          continue;
        }
        const dg = NG ? solve(S, rs) : [];
        if (!dg || dg.some((x) => !Number.isFinite(x))) {
          log?.(`    lam=${lam.toExponential(1)} singular schur`);
          lam *= 10;
          continue;
        }
        const Itry = { ...I };
        gk.forEach((key, i) => {
          Itry[key] = I[key] + dg[i];
        });
        const tryPoses = views.map((v, vi) => {
          const b = blocks[vi], Vinv = invs[vi];
          const rhs = b.rp.map((val, r) => val - b.W.reduce((s, row, i) => s + row[r] * dg[i], 0));
          const dp = Array.from({ length: 6 }, (_, r) => Vinv[r].reduce((s, v2, c) => s + v2 * rhs[c], 0));
          return v.pose.map((val, i) => val + dp[i]);
        });
        const Et = cost(Itry, views.map((v, i) => ({ ...v, pose: tryPoses[i] }))).E;
        if (Number.isFinite(Et) && Et < E) {
          I = Itry;
          tryPoses.forEach((p, i) => {
            views[i].pose = p;
          });
          log?.(`  it${it} lam=${lam.toExponential(1)} E ${E.toExponential(3)} -> ${Et.toExponential(3)} dg=[${dg.map((x) => x.toExponential(1)).join(",")}]`);
          E = Et;
          lam = Math.max(0.0000000001, lam / 3);
          applied = true;
        } else
          lam *= 10;
      }
      if (!applied) {
        log?.(`  it${it} STALLED at E=${E.toExponential(3)} lam=${lam.toExponential(1)}`);
        break;
      }
    }
    return { I, rms: cost(I, views).rms };
  };
  var calib = {
    solve,
    smallestEigVec,
    fitH,
    applyH,
    rodrigues,
    rodriguesInv,
    project,
    unproject,
    poseFromH,
    refinePose,
    zhangK,
    bundle
  };

  // scratch/rmbt/mat-target.js
  function makeMatTarget(L, opts = {}) {
    const diameterMm = opts.diameterMm ?? 32;
    const pitchFactor = opts.pitchFactor ?? 1.45;
    const rollDeg = opts.rollDeg ?? 30;
    const pageW = opts.pageW ?? 297;
    const pageH = opts.pageH ?? 210;
    const marginMm = opts.marginMm ?? 5;
    const legendMm = opts.legendMm ?? 15;
    const parityGuard = opts.parityGuard ?? true;
    const pitchMm = +(diameterMm * pitchFactor).toFixed(3);
    const radiusMm = diameterMm / 2;
    const mmPerUnit = radiusMm / L.R;
    const parity = (v) => {
      let p = 0;
      for (let i = 0;i < L.nBits; i++)
        p ^= v >> i & 1;
      return p;
    };
    const pool = [];
    for (let v = 0;v < 1 << L.nBits; v++)
      if (!parityGuard || parity(v) === 0)
        pool.push(v);
    const halfW = pageW / 2 - marginMm - radiusMm;
    const topLimit = pageH / 2 - marginMm - radiusMm;
    const botLimit = pageH / 2 - marginMm - legendMm - radiusMm;
    const ro = rollDeg * Math.PI / 180;
    const cos = Math.cos(ro), sin = Math.sin(ro);
    const reach = Math.ceil(Math.max(pageW, pageH) / pitchMm) + 2;
    const sites = [];
    for (let q = -reach;q <= reach; q++) {
      for (let r = -reach;r <= reach; r++) {
        const ux = pitchMm * (q + r / 2);
        const uy = pitchMm * (Math.sqrt(3) / 2) * r;
        const xMm = ux * cos - uy * sin;
        const yMm = ux * sin + uy * cos;
        if (Math.abs(xMm) > halfW)
          continue;
        if (yMm > topLimit || yMm < -botLimit)
          continue;
        sites.push({ q, r, xMm: +xMm.toFixed(4), yMm: +yMm.toFixed(4) });
      }
    }
    sites.sort((a, b) => Math.hypot(a.xMm, a.yMm) - Math.hypot(b.xMm, b.yMm));
    const truncated = Math.max(0, sites.length - pool.length);
    const kept = sites.slice(0, pool.length);
    const ham = (a, b) => {
      let d = 0, x = a ^ b;
      while (x) {
        d += x & 1;
        x >>= 1;
      }
      return d;
    };
    const neighbours = kept.map((s, i) => kept.map((t, j) => j === i ? -1 : Math.hypot(s.xMm - t.xMm, s.yMm - t.yMm)).map((d, j) => ({ j, d })).filter((o) => o.d > 0 && o.d < pitchMm * 1.2).map((o) => o.j));
    const used = new Array(kept.length).fill(null);
    const taken = new Set;
    for (let i = 0;i < kept.length; i++) {
      let best = null, bestScore = -1;
      for (const id of pool) {
        if (taken.has(id))
          continue;
        let score = Infinity;
        for (const j of neighbours[i])
          if (used[j] != null)
            score = Math.min(score, ham(id, used[j]));
        if (score === Infinity)
          score = L.nBits;
        if (score > bestScore) {
          bestScore = score;
          best = id;
        }
      }
      used[i] = best;
      taken.add(best);
    }
    const marks = kept.map((s, i) => ({
      id: used[i],
      q: s.q,
      r: s.r,
      xMm: s.xMm,
      yMm: s.yMm,
      bits: Array.from({ length: L.nBits }, (_, j) => used[i] >> L.nBits - 1 - j & 1)
    }));
    let minRowGapMm = Infinity;
    for (let i = 0;i < marks.length; i++)
      for (let j = i + 1;j < marks.length; j++) {
        if (Math.abs(marks[i].yMm - marks[j].yMm) >= diameterMm)
          continue;
        minRowGapMm = Math.min(minRowGapMm, Math.abs(marks[i].xMm - marks[j].xMm) - diameterMm);
      }
    return {
      marks,
      byId: new Map(marks.map((m) => [m.id, m])),
      diameterMm,
      radiusMm,
      pitchMm,
      pitchFactor,
      rollDeg,
      mmPerUnit,
      layout: L,
      pageW,
      pageH,
      marginMm,
      legendMm,
      parityGuard,
      idsAvailable: pool.length,
      sitesTruncated: truncated,
      minRowGapMm: Number.isFinite(minRowGapMm) ? +minRowGapMm.toFixed(2) : null,
      rowGapInDiscs: Number.isFinite(minRowGapMm) ? +(minRowGapMm / (2 * 6 * mmPerUnit)).toFixed(2) : null,
      widthMm: +(2 * Math.max(...marks.map((m) => Math.abs(m.xMm))) + diameterMm).toFixed(2),
      heightMm: +(Math.max(...marks.map((m) => m.yMm)) - Math.min(...marks.map((m) => m.yMm)) + diameterMm).toFixed(2)
    };
  }
  function matTargetSvg(T, manColor, opts = {}) {
    const L = T.layout;
    const { pageW, pageH } = T;
    const cx0 = pageW / 2, cy0 = (pageH - T.legendMm) / 2;
    const scale = T.radiusMm / L.R;
    const parts = [];
    for (const m of T.marks) {
      const mx = cx0 + m.xMm;
      const my = cy0 - m.yMm;
      const bounds = [0, ...L.teeth];
      for (let i = bounds.length - 1;i >= 1; i--) {
        const mid = (bounds[i - 1] + bounds[i]) / 2;
        const dark = manColor(mid, m.bits, L) < 128;
        parts.push(`<circle cx="${mx.toFixed(2)}" cy="${my.toFixed(2)}" r="${(bounds[i] * scale).toFixed(2)}" fill="${dark ? "#000000" : "#ffffff"}"/>`);
      }
    }
    const ly = pageH - T.legendMm + 5;
    const legend = [
      `<text x="${T.marginMm + 2}" y="${ly}" font-family="monospace" font-size="3.6" fill="#2a2a2a">man scan mat &#183; ${T.marks.length} marks &#183; ${T.diameterMm}mm &#183; pitch ${T.pitchMm}mm &#183; rotated ${T.rollDeg}&#176; &#183; PRINT AT 100%, not "fit to page"</text>`,
      `<rect x="${T.marginMm + 2}" y="${ly + 4}" width="100" height="0.7" fill="#2a2a2a"/>`,
      `<rect x="${T.marginMm + 2}" y="${ly + 2}" width="0.7" height="4.7" fill="#2a2a2a"/>`,
      `<rect x="${T.marginMm + 101.3}" y="${ly + 2}" width="0.7" height="4.7" fill="#2a2a2a"/>`,
      `<text x="${T.marginMm + 106}" y="${ly + 6}" font-family="monospace" font-size="3.4" fill="#3a3a3a">100 mm &#8212; measure this with a ruler; if it is not 100mm every distance below is wrong by that factor</text>`,
      `<text x="${T.marginMm + 2}" y="${ly + 11}" font-family="monospace" font-size="3.2" fill="#4a4a4a">origin at the centre of the pattern, +y up. The gray is part of the pattern &#8212; do not trim.</text>`
    ];
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${pageW}mm" height="${pageH}mm" viewBox="0 0 ${pageW} ${pageH}">
<rect width="${pageW}" height="${pageH}" fill="#808080"/>
${parts.join(`
`)}
${legend.join(`
`)}
</svg>`;
  }
  function matMarkPagePx(T, m, pxPerMm) {
    const cx0 = T.pageW / 2, cy0 = (T.pageH - T.legendMm) / 2;
    return { x: (cx0 + m.xMm) * pxPerMm, y: (cy0 - m.yMm) * pxPerMm };
  }

  // scratch/rmbt/trace-core.js
  var exports_trace_core = {};
  __export(exports_trace_core, {
    traceContour: () => traceContour,
    toSvgMm: () => toSvgMm,
    toDxf: () => toDxf,
    simplifyMm: () => simplifyMm,
    polylineLengthMm: () => polylineLengthMm,
    polygonAreaMm2: () => polygonAreaMm2,
    objectMask: () => objectMask,
    matDifference: () => matDifference,
    makePlaneMap: () => makePlaneMap,
    makeMatSampler: () => makeMatSampler,
    contourToMm: () => contourToMm,
    autoThreshold: () => autoThreshold
  });
  function makePlaneMap(calib2, I, pose) {
    const R = calib2.rodrigues(pose.slice(0, 3));
    const t = [pose[3], pose[4], pose[5]];
    const rt = (i, j) => R[j][i];
    const rtz = rt(2, 0) * t[0] + rt(2, 1) * t[1] + rt(2, 2) * t[2];
    const back = (u, v, z) => {
      const [xn, yn] = calib2.unproject(I, u, v);
      const dz = rt(2, 0) * xn + rt(2, 1) * yn + rt(2, 2);
      if (Math.abs(dz) < 0.000000000001)
        return null;
      const s = (z + rtz) / dz;
      return [
        rt(0, 0) * (s * xn - t[0]) + rt(0, 1) * (s * yn - t[1]) + rt(0, 2) * (s - t[2]),
        rt(1, 0) * (s * xn - t[0]) + rt(1, 1) * (s * yn - t[1]) + rt(1, 2) * (s - t[2])
      ];
    };
    return {
      toPlane(u, v) {
        return back(u, v, 0);
      },
      toPlaneAt(u, v, z) {
        return back(u, v, z);
      },
      toPixel(X, Y) {
        return calib2.project(I, pose, X, Y);
      },
      tiltDeg: Math.acos(Math.min(1, Math.abs(R[2][2]))) * 180 / Math.PI
    };
  }
  function makeMatSampler(T, manColor) {
    const L = T.layout;
    const scale = T.radiusMm / L.R;
    const R2 = T.radiusMm * T.radiusMm;
    const cell = T.pitchMm;
    const key = (i, j) => i * 10007 + j;
    const grid = new Map;
    for (const m of T.marks) {
      const i = Math.floor(m.xMm / cell), j = Math.floor(m.yMm / cell);
      for (let di = -1;di <= 1; di++)
        for (let dj = -1;dj <= 1; dj++) {
          const k = key(i + di, j + dj);
          if (!grid.has(k))
            grid.set(k, []);
          grid.get(k).push(m);
        }
    }
    const FLOOD = 128;
    return function matGray(X, Y) {
      const near = grid.get(key(Math.floor(X / cell), Math.floor(Y / cell)));
      if (near) {
        for (const m of near) {
          const dx = X - m.xMm, dy = Y - m.yMm;
          const d2 = dx * dx + dy * dy;
          if (d2 <= R2)
            return manColor(Math.sqrt(d2) / scale, m.bits, L);
        }
      }
      return FLOOD;
    };
  }
  function matDifference(frame, map, matGray, opts = {}) {
    const { gray, w, h } = frame;
    const roiMm = opts.roiMm ?? null;
    const diff = new Float32Array(w * h);
    const inRoi = new Uint8Array(w * h);
    const pred = new Float32Array(w * h);
    for (let y = 0;y < h; y++) {
      for (let x = 0;x < w; x++) {
        const i = y * w + x;
        const p = map.toPlane(x + 0.5, y + 0.5);
        if (!p)
          continue;
        if (roiMm && (p[0] < roiMm[0] || p[0] > roiMm[2] || p[1] < roiMm[1] || p[1] > roiMm[3]))
          continue;
        inRoi[i] = 1;
        pred[i] = matGray(p[0], p[1]);
      }
    }
    let a = 1, b = 0;
    for (let round = 0;round < 3; round++) {
      let sp = 0, sa = 0, spp = 0, spa = 0, n = 0;
      for (let i = 0;i < diff.length; i++) {
        if (!inRoi[i])
          continue;
        if (round > 0 && Math.abs(gray[i] - (a * pred[i] + b)) > 40)
          continue;
        sp += pred[i];
        sa += gray[i];
        spp += pred[i] * pred[i];
        spa += pred[i] * gray[i];
        n++;
      }
      if (n < 50)
        break;
      const den = n * spp - sp * sp;
      if (Math.abs(den) < 0.000001)
        break;
      a = (n * spa - sp * sa) / den;
      b = (sa - a * sp) / n;
    }
    for (let i = 0;i < diff.length; i++)
      diff[i] = inRoi[i] ? gray[i] - (a * pred[i] + b) : 0;
    const gradThr = opts.gradThreshold ?? 30;
    const edge = new Uint8Array(w * h);
    for (let y = 1;y < h - 1; y++) {
      for (let x = 1;x < w - 1; x++) {
        const i = y * w + x;
        if (!inRoi[i])
          continue;
        const gx = Math.abs(pred[i + 1] - pred[i - 1]), gy = Math.abs(pred[i + w] - pred[i - w]);
        if (gx + gy > gradThr)
          edge[i] = 1;
      }
    }
    const r = opts.edgeDilate ?? 2;
    const edgeD = new Uint8Array(w * h);
    for (let y = 0;y < h; y++)
      for (let x = 0;x < w; x++) {
        let on = 0;
        for (let dy = -r;dy <= r && !on; dy++)
          for (let dx = -r;dx <= r && !on; dx++) {
            const yy = y + dy, xx = x + dx;
            if (yy >= 0 && yy < h && xx >= 0 && xx < w && edge[yy * w + xx])
              on = 1;
          }
        edgeD[y * w + x] = on;
      }
    return { diff, inRoi, pred, edge: edgeD, gain: a, offset: b, w, h };
  }
  function autoThreshold(field, opts = {}) {
    const { diff, inRoi, edge } = field;
    const CAP = 128, hist = new Float64Array(CAP + 1);
    let n = 0;
    for (let i = 0;i < diff.length; i++) {
      if (!inRoi[i] || edge && edge[i])
        continue;
      hist[Math.min(CAP, Math.round(Math.abs(diff[i])))]++;
      n++;
    }
    if (n < 100)
      return opts.fallback ?? 28;
    let sum = 0;
    for (let t = 0;t <= CAP; t++)
      sum += t * hist[t];
    let wB = 0, sumB = 0, best = -1, bestT = opts.fallback ?? 28;
    for (let t = 0;t <= CAP; t++) {
      wB += hist[t];
      if (!wB)
        continue;
      const wF = n - wB;
      if (!wF)
        break;
      sumB += t * hist[t];
      const between = wB * wF * (sumB / wB - (sum - sumB) / wF) ** 2;
      if (between > best) {
        best = between;
        bestT = t;
      }
    }
    return Math.max(opts.minThreshold ?? 10, bestT);
  }
  function objectMask(field, opts = {}) {
    const { diff, inRoi, edge, w, h } = field;
    const thr = opts.threshold ?? autoThreshold(field);
    const minAreaPx = opts.minAreaPx ?? 400;
    const raw = new Uint8Array(w * h);
    for (let i = 0;i < raw.length; i++)
      raw[i] = inRoi[i] && Math.abs(diff[i]) > thr ? 1 : 0;
    const dilate = (src, r2) => {
      const out2 = new Uint8Array(w * h);
      for (let y = 0;y < h; y++)
        for (let x = 0;x < w; x++) {
          let on = 0;
          for (let dy = -r2;dy <= r2 && !on; dy++)
            for (let dx = -r2;dx <= r2 && !on; dx++) {
              const yy = y + dy, xx = x + dx;
              if (yy < 0 || yy >= h || xx < 0 || xx >= w)
                continue;
              if (src[yy * w + xx])
                on = 1;
            }
          out2[y * w + x] = on;
        }
      return out2;
    };
    const erode = (src, r2) => {
      const out2 = new Uint8Array(w * h);
      for (let y = 0;y < h; y++)
        for (let x = 0;x < w; x++) {
          let all = 1;
          for (let dy = -r2;dy <= r2 && all; dy++)
            for (let dx = -r2;dx <= r2 && all; dx++) {
              const yy = y + dy, xx = x + dx;
              if (yy < 0 || yy >= h || xx < 0 || xx >= w) {
                all = 0;
                continue;
              }
              if (!src[yy * w + xx])
                all = 0;
            }
          out2[y * w + x] = all;
        }
      return out2;
    };
    const r = opts.openRadius ?? 2;
    const rc = opts.closeRadius ?? 3;
    let m = dilate(erode(raw, r), r);
    m = erode(dilate(m, rc), rc);
    const lab = new Int32Array(w * h).fill(-1);
    let best = -1, bestN = 0, next = 0;
    const stack = [];
    for (let s = 0;s < m.length; s++) {
      if (!m[s] || lab[s] >= 0)
        continue;
      const id = next++;
      let n = 0;
      stack.push(s);
      lab[s] = id;
      while (stack.length) {
        const i = stack.pop();
        n++;
        const x = i % w, y = i / w | 0;
        if (x > 0 && m[i - 1] && lab[i - 1] < 0) {
          lab[i - 1] = id;
          stack.push(i - 1);
        }
        if (x < w - 1 && m[i + 1] && lab[i + 1] < 0) {
          lab[i + 1] = id;
          stack.push(i + 1);
        }
        if (y > 0 && m[i - w] && lab[i - w] < 0) {
          lab[i - w] = id;
          stack.push(i - w);
        }
        if (y < h - 1 && m[i + w] && lab[i + w] < 0) {
          lab[i + w] = id;
          stack.push(i + w);
        }
      }
      if (n > bestN) {
        bestN = n;
        best = id;
      }
    }
    const out = new Uint8Array(w * h);
    if (best >= 0 && bestN >= minAreaPx)
      for (let i = 0;i < out.length; i++)
        out[i] = lab[i] === best ? 1 : 0;
    const outside = new Uint8Array(w * h);
    const st = [];
    for (let x = 0;x < w; x++) {
      st.push(x, (h - 1) * w + x);
    }
    for (let y = 0;y < h; y++) {
      st.push(y * w, y * w + w - 1);
    }
    while (st.length) {
      const i = st.pop();
      if (outside[i] || out[i])
        continue;
      outside[i] = 1;
      const x = i % w, y = i / w | 0;
      if (x > 0)
        st.push(i - 1);
      if (x < w - 1)
        st.push(i + 1);
      if (y > 0)
        st.push(i - w);
      if (y < h - 1)
        st.push(i + w);
    }
    let area = 0;
    for (let i = 0;i < out.length; i++) {
      if (!outside[i]) {
        out[i] = 1;
        area++;
      }
    }
    return { mask: out, areaPx: bestN >= minAreaPx ? area : 0, w, h };
  }
  function traceContour(field, maskObj, opts = {}) {
    const { diff, w, h } = field;
    const { mask } = maskObj;
    const thr = opts.threshold ?? 28;
    const lvl = (i) => Math.abs(diff[i]) - thr;
    const segs = [];
    const at = (x, y) => mask[y * w + x] ? 1 : 0;
    const excl = field.edge;
    const lvlAt = (i) => excl && excl[i] && !mask[i] ? -1 : excl && excl[i] && mask[i] ? 1 : lvl(i);
    const interp = (x0, y0, x1, y1) => {
      const a = lvlAt(y0 * w + x0), b = lvlAt(y1 * w + x1);
      const t = Math.abs(b - a) < 0.000000001 ? 0.5 : a / (a - b);
      const tc = Math.max(0, Math.min(1, t));
      return [x0 + 0.5 + tc * (x1 - x0), y0 + 0.5 + tc * (y1 - y0)];
    };
    for (let y = 0;y < h - 1; y++) {
      for (let x = 0;x < w - 1; x++) {
        const c = at(x, y) | at(x + 1, y) << 1 | at(x + 1, y + 1) << 2 | at(x, y + 1) << 3;
        if (c === 0 || c === 15)
          continue;
        const T = () => interp(x, y, x + 1, y);
        const R = () => interp(x + 1, y, x + 1, y + 1);
        const B = () => interp(x, y + 1, x + 1, y + 1);
        const Lf = () => interp(x, y, x, y + 1);
        const push = (p, q) => segs.push([p, q]);
        switch (c) {
          case 1:
          case 14:
            push(Lf(), T());
            break;
          case 2:
          case 13:
            push(T(), R());
            break;
          case 3:
          case 12:
            push(Lf(), R());
            break;
          case 4:
          case 11:
            push(R(), B());
            break;
          case 6:
          case 9:
            push(T(), B());
            break;
          case 7:
          case 8:
            push(Lf(), B());
            break;
          case 5:
            push(Lf(), T());
            push(R(), B());
            break;
          case 10:
            push(T(), R());
            push(Lf(), B());
            break;
        }
      }
    }
    const key = (p) => `${Math.round(p[0] * 16)},${Math.round(p[1] * 16)}`;
    const adj = new Map;
    segs.forEach(([p, q], i) => {
      for (const a of [p, q]) {
        const k = key(a);
        if (!adj.has(k))
          adj.set(k, []);
        adj.get(k).push(i);
      }
    });
    const used = new Uint8Array(segs.length);
    const rings = [];
    const grow = (ring) => {
      for (let guard = 0;guard < segs.length + 4; guard++) {
        const tail = ring[ring.length - 1];
        const cand = (adj.get(key(tail)) ?? []).find((i) => !used[i]);
        if (cand == null)
          return false;
        used[cand] = 1;
        const [a, b] = segs[cand];
        ring.push(key(a) === key(tail) ? b : a);
        if (key(ring[ring.length - 1]) === key(ring[0]))
          return true;
      }
      return false;
    };
    for (let s = 0;s < segs.length; s++) {
      if (used[s])
        continue;
      used[s] = 1;
      const ring = [segs[s][0], segs[s][1]];
      const closed = grow(ring);
      if (!closed) {
        ring.reverse();
        grow(ring);
      }
      if (ring.length >= 8)
        rings.push(ring);
    }
    const area = (r) => {
      let a = 0;
      for (let i = 0, j = r.length - 1;i < r.length; j = i++)
        a += r[j][0] * r[i][1] - r[i][0] * r[j][1];
      return Math.abs(a) / 2;
    };
    rings.sort((a, b) => area(b) - area(a));
    return rings;
  }
  function contourToMm(ring, map, heightMm = 0) {
    const out = [];
    for (const [u, v] of ring) {
      const p = heightMm ? map.toPlaneAt(u, v, heightMm) : map.toPlane(u, v);
      if (p)
        out.push(p);
    }
    return out;
  }
  function simplifyMm(pts, tolMm = 0.1) {
    if (pts.length < 4)
      return pts;
    const closed = Math.hypot(pts[0][0] - pts[pts.length - 1][0], pts[0][1] - pts[pts.length - 1][1]) < tolMm;
    if (closed) {
      const ring = pts.slice(0, pts.length - 1);
      let far = 0, fd = -1;
      for (let i = 1;i < ring.length; i++) {
        const d = Math.hypot(ring[i][0] - ring[0][0], ring[i][1] - ring[0][1]);
        if (d > fd) {
          fd = d;
          far = i;
        }
      }
      const a = simplifyOpen(ring.slice(0, far + 1), tolMm);
      const b = simplifyOpen(ring.slice(far).concat([ring[0]]), tolMm);
      return a.concat(b.slice(1));
    }
    return simplifyOpen(pts, tolMm);
  }
  function simplifyOpen(pts, tolMm) {
    if (pts.length < 3)
      return pts;
    const keep = new Uint8Array(pts.length);
    keep[0] = keep[pts.length - 1] = 1;
    const stack = [[0, pts.length - 1]];
    while (stack.length) {
      const [i0, i1] = stack.pop();
      const [x0, y0] = pts[i0], [x1, y1] = pts[i1];
      const dx = x1 - x0, dy = y1 - y0;
      const len = Math.hypot(dx, dy) || 1;
      let worst = -1, wd = tolMm;
      for (let i = i0 + 1;i < i1; i++) {
        const d = Math.abs((pts[i][0] - x0) * dy - (pts[i][1] - y0) * dx) / len;
        if (d > wd) {
          wd = d;
          worst = i;
        }
      }
      if (worst > 0) {
        keep[worst] = 1;
        stack.push([i0, worst], [worst, i1]);
      }
    }
    return pts.filter((_, i) => keep[i]);
  }
  function polylineLengthMm(pts) {
    let s = 0;
    for (let i = 1;i < pts.length; i++)
      s += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    return s;
  }
  function polygonAreaMm2(pts) {
    let a = 0;
    for (let i = 0, j = pts.length - 1;i < pts.length; j = i++)
      a += pts[j][0] * pts[i][1] - pts[i][0] * pts[j][1];
    return Math.abs(a) / 2;
  }
  function toDxf(rings, opts = {}) {
    const layer = opts.layer ?? "TRACE";
    const g = (code, val) => `${code}
${val}`;
    const out = [
      g(0, "SECTION"),
      g(2, "HEADER"),
      g(9, "$INSUNITS"),
      g(70, 4),
      g(9, "$MEASUREMENT"),
      g(70, 1),
      g(0, "ENDSEC"),
      g(0, "SECTION"),
      g(2, "ENTITIES")
    ];
    for (const ring of rings) {
      if (ring.length < 2)
        continue;
      out.push(g(0, "POLYLINE"), g(8, layer), g(66, 1), g(70, 1), g(10, 0), g(20, 0), g(30, 0));
      for (const [x, y] of ring)
        out.push(g(0, "VERTEX"), g(8, layer), g(10, x.toFixed(4)), g(20, y.toFixed(4)), g(30, "0.0"));
      out.push(g(0, "SEQEND"), g(8, layer));
    }
    out.push(g(0, "ENDSEC"), g(0, "EOF"));
    return out.join(`
`) + `
`;
  }
  function toSvgMm(rings, opts = {}) {
    if (!rings.length)
      return "";
    const all = rings.flat();
    const xs = all.map((p) => p[0]), ys = all.map((p) => p[1]);
    const pad = opts.padMm ?? 5;
    const x0 = Math.min(...xs) - pad, x1 = Math.max(...xs) + pad;
    const y0 = Math.min(...ys) - pad, y1 = Math.max(...ys) + pad;
    const w = x1 - x0, h = y1 - y0;
    const paths = rings.map((r) => `<path d="${r.map((p, i) => `${i ? "L" : "M"}${(p[0] - x0).toFixed(3)},${(y1 - p[1]).toFixed(3)}`).join("")}Z" fill="none" stroke="#000" stroke-width="0.2"/>`);
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w.toFixed(2)}mm" height="${h.toFixed(2)}mm" viewBox="0 0 ${w.toFixed(3)} ${h.toFixed(3)}">
${paths.join(`
`)}
</svg>`;
  }

  // scratch/rmbt/trace-bundle-entry.js
  globalThis.TRACE = { calib, makeMatTarget, matTargetSvg, matMarkPagePx, ...exports_trace_core };
})();
