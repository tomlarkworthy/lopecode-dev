#!/usr/bin/env bun
// 2-D validation of the Manchester mark family: render marks under a REAL
// pinhole homography (yaw tilt about the vertical axis), run the per-row
// cascade + frame fusion, and measure the thing Part IV had to refuse to
// ship — a tilt angle. Old-design baseline runs the ACTUAL current pipeline
// (kernel.js analyzeFrame) on old-mark frames under the same homography.
//
// Tilt recovery: per-row |d̂| in r-units is measured directly by the lattice
// solve, so the quadratic fit d̂² over y gives the vertical scale S_v and
// hence the vertical semi-axis b = S_v·R — measured, not extrapolated from
// the equator. Horizontal semi-axis a from rim pair half-widths. tilt =
// acos(a/b).

globalThis.window = globalThis;
const K = await import("./kernel.js");
const { edges1Dsub, analyzeFrame, LAYOUT, codebook } = K;
import { DARK, LIGHT, BG, mulberry32, findInvolution } from "./probe-shared.js";
import { makeMAN } from "./man-design.js";

const man6 = makeMAN(6), man8 = makeMAN(8);

let OLD_ONE = LIGHT, OLD_ZERO = DARK;
const colorOld = (r, id) => {
  if (r >= LAYOUT.R) return BG;
  for (const [a, b, v] of LAYOUT.bands) {
    if (r >= a && r < b) {
      const bit = typeof v === "number" ? v : codebook[id][+String(v).slice(1)];
      return bit ? OLD_ONE : OLD_ZERO;
    }
  }
  return BG;
};
const oldIds = Object.keys(codebook).map(Number).filter((i) => i >= 1 && i <= 14);

// ------------------------------------------------------------- 2-D renderer
// Mark plane spanned by u=(cosφ,0,sinφ), v=(0,1,0) at distance Z; pinhole f.
// Inverse map: xm = a1·Z/(cosφ - a1·sinφ), ym = b1·(Z + xm·sinφ).
function renderFrame({ color, R, W, phi, blur, noise, seed }) {
  const Z = 400;
  const f = (W * Z) / R;
  const c = Math.cos(phi), s = Math.sin(phi);
  // image extents of the rim
  const xPlus = (f * R * c) / (Z + R * s), xMinus = (-f * R * c) / (Z - R * s);
  const bV = (f * R) / Z;
  const mx = 25;
  const w = Math.ceil(xPlus - xMinus + 2 * mx);
  const h = Math.ceil(2 * bV + 2 * mx);
  const cx = mx - xMinus, cy = h / 2;
  const SS = 2;
  const hi = new Float64Array(w * SS * h * SS);
  for (let py = 0; py < h * SS; py++) {
    const b1 = ((py + 0.5) / SS - cy) / f;
    for (let px = 0; px < w * SS; px++) {
      const a1 = ((px + 0.5) / SS - cx) / f;
      const den = c - a1 * s;
      let v = BG;
      if (Math.abs(den) > 1e-9) {
        const xm = (a1 * Z) / den;
        const ym = b1 * (Z + xm * s);
        v = color(Math.hypot(xm, ym));
      }
      hi[py * w * SS + px] = v;
    }
  }
  // box down SS, separable Gaussian blur, noise
  const img = new Float64Array(w * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let sAcc = 0;
      for (let dy = 0; dy < SS; dy++)
        for (let dx = 0; dx < SS; dx++) sAcc += hi[(y * SS + dy) * w * SS + x * SS + dx];
      img[y * w + x] = sAcc / (SS * SS);
    }
  const rad = Math.max(1, Math.ceil(3 * blur));
  const ker = new Float64Array(2 * rad + 1);
  let ks = 0;
  for (let i = -rad; i <= rad; i++) ks += ker[i + rad] = Math.exp((-i * i) / (2 * blur * blur));
  const tmp = new Float64Array(w * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let sAcc = 0;
      for (let i = -rad; i <= rad; i++) sAcc += img[y * w + Math.min(w - 1, Math.max(0, x + i))] * ker[i + rad];
      tmp[y * w + x] = sAcc / ks;
    }
  const gray = new Uint8Array(w * h);
  const rnd = mulberry32(seed);
  const gauss = () => {
    const u = Math.max(1e-12, rnd()), v2 = rnd();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v2);
  };
  for (let x = 0; x < w; x++)
    for (let y = 0; y < h; y++) {
      let sAcc = 0;
      for (let i = -rad; i <= rad; i++) sAcc += tmp[Math.min(h - 1, Math.max(0, y + i)) * w + x] * ker[i + rad];
      gray[y * w + x] = Math.max(0, Math.min(255, Math.round(sAcc / ks + noise * gauss())));
    }
  // ground truth
  const aTrue = (xPlus - xMinus) / 2, bTrue = bV;
  return { gray, w, h, cx, cy, aTrue, bTrue };
}

// ------------------------------------------------------- frame-level detect
function detectFrameMAN(D, frame, wantBits) {
  const { gray, w, h } = frame;
  const votes = new Map();
  const geo = [];
  for (let y = 3; y < h; y += 6) {
    const se = edges1Dsub(gray.subarray(y * w, (y + 1) * w), 12);
    const iv = findInvolution(se);
    if (!iv) continue;
    const r = D.solve(iv);
    if (!r.ok) continue;
    if (r.sup >= 5) {
      // rim pair half-width for the horizontal axis estimate
      const pOut = iv.up[iv.up.length - 1];
      geo.push({ y, d2: r.dHat * r.dHat, dHat: r.dHat, sup: r.sup, wHalf: (iv.xs[pOut.f] - iv.xs[pOut.e]) / 2 });
    }
    if (r.id != null) votes.set(r.id, (votes.get(r.id) ?? 0) + 1);
  }
  let bestId = null, bestN = 0, secondN = 0;
  for (const [id, n] of votes) {
    if (n > bestN) { secondN = bestN; bestN = n; bestId = id; }
    else if (n > secondN) secondN = n;
  }
  const want = wantBits.reduce((a, b) => 2 * a + b, 0);
  const accept = bestN >= 2 && bestN >= 2 * secondN;
  // V-fit in d-space: |d̂| = |y - yc|/S_v. Errors in d̂ are roughly uniform, so
  // fitting d (not d²) keeps far rows from dominating; yc by grid search,
  // then MAD trim and refit. This is the notebook's V-fit but fed a MEASURED
  // per-row chord offset instead of an apparent-width proxy.
  const vFit = (pts) => {
    let best = null;
    const yLo = Math.min(...pts.map((g) => g.y)), yHi = Math.max(...pts.map((g) => g.y));
    for (let yc = yLo; yc <= yHi; yc += 1) {
      let sz2 = 0, szd = 0;
      for (const g of pts) { const z = Math.abs(g.y - yc); sz2 += z * z; szd += z * g.d; }
      if (sz2 < 1e-9) continue;
      const gSlope = szd / sz2; // 1/S_v
      if (!(gSlope > 0)) continue;
      let rss = 0;
      for (const g of pts) { const e = g.d - Math.abs(g.y - yc) * gSlope; rss += e * e; }
      if (!best || rss < best.rss) best = { yc, gSlope, rss };
    }
    return best;
  };
  let aEst = null, bEst = null, ycEst = null;
  // wHalf is an INDEPENDENT measurement of the row's chord offset: with a
  // horizontal scale S_h (median over high-support rows), the rim half-width
  // implies d. A row whose lattice d̂ disagrees is a translated lock — reject
  // it before the fit. This is what kills the residual b-axis inflation.
  let geoV = geo;
  {
    const shs = geo
      .filter((g) => g.sup >= 9 && g.dHat < D.R - 3)
      .map((g) => g.wHalf / Math.sqrt(D.R * D.R - g.dHat * g.dHat))
      .sort((x, z) => x - z);
    if (shs.length >= 3) {
      const sh = shs[shs.length >> 1];
      geoV = geo.filter((g) => {
        const q = D.R * D.R - (g.wHalf / sh) ** 2;
        const dImp = Math.sqrt(Math.max(0, q));
        return Math.abs(g.dHat - dImp) < 3;
      });
      if (geoV.length < 5) geoV = geo;
    }
  }
  if (geoV.length >= 5) {
    const pts0 = geoV.map((g) => ({ y: g.y, d: Math.sqrt(g.d2), wHalf: g.wHalf }));
    let fit = vFit(pts0), pts = pts0;
    if (fit) {
      const resid = pts.map((g) => Math.abs(g.d - Math.abs(g.y - fit.yc) * fit.gSlope));
      const mad = resid.slice().sort((x, z) => x - z)[resid.length >> 1] || 0.5;
      const kept = pts.filter((g, i) => resid[i] <= 2.5 * mad);
      if (kept.length >= 5) { pts = kept; fit = vFit(pts) ?? fit; }
      bEst = D.R / fit.gSlope;
      ycEst = fit.yc;
      // horizontal semi-axis: rim half-width corrected for row height
      const ws = [];
      for (const g of pts) {
        const q = 1 - ((g.y - ycEst) / bEst) ** 2;
        if (q > 0.15) ws.push(g.wHalf / Math.sqrt(q));
      }
      if (ws.length >= 3) aEst = ws.sort((x, z) => x - z)[ws.length >> 1];
    }
  }
  const tiltEst = aEst != null && bEst != null ? (Math.acos(Math.min(1, aEst / bEst)) * 180) / Math.PI : null;
  return { idOk: accept && bestId === want, idWrong: accept && bestId !== want, geoRows: geo.length, aEst, bEst, tiltEst };
}

// --------------------------------------------------------------- experiment
if (Bun.env.D2DEBUG) {
  // per-row d̂ vs truth on one frontal frame
  const D = man6;
  const rnd = mulberry32(1);
  const bits = Array.from({ length: D.nBits }, () => (rnd() < 0.5 ? 1 : 0));
  const fm = renderFrame({ color: (rr) => D.color(rr, bits), R: D.R, W: 60, phi: 0, blur: 1, noise: 3, seed: 2 });
  const Sv = fm.bTrue / D.R;
  console.log(`frame ${fm.w}x${fm.h} cy=${fm.cy} bTrue=${fm.bTrue.toFixed(1)} Sv=${Sv.toFixed(3)}`);
  for (let y = 3; y < fm.h; y += 6) {
    const se = edges1Dsub(fm.gray.subarray(y * fm.w, (y + 1) * fm.w), 12);
    const iv = findInvolution(se);
    const r = iv ? D.solve(iv) : null;
    const dTrue = Math.abs(y - fm.cy) / Sv;
    if (r && r.ok) {
      const pOut = iv.up[iv.up.length - 1];
      const wHalf = (iv.xs[pOut.f] - iv.xs[pOut.e]) / 2;
      const kTrue = Math.sqrt(Math.max(0, D.R * D.R - dTrue * dTrue));
      console.log(`y=${y} dTrue=${dTrue.toFixed(1)} dHat=${r.dHat.toFixed(1)} sup=${r.sup} id=${r.id} wHalf=${wHalf.toFixed(1)} rimHalfTrue=${(kTrue * Sv).toFixed(1)}`);
    } else console.log(`y=${y} dTrue=${dTrue.toFixed(1)} ${iv ? "no-lattice" : "no-inv"} (${se.length} edges)`);
  }
  const out = detectFrameMAN(D, fm, bits);
  console.log("frame:", JSON.stringify({ ...out, aTrue: +fm.aTrue.toFixed(1), bTrue: +fm.bTrue.toFixed(1) }));
  process.exit(0);
}
console.log("2-D frames, pinhole yaw homography, stride 6, noise 3\n");
const rows = [];
let seed = 60000;
for (const W of [60, 90]) for (const blur of [1.0, 1.5]) for (const phiDeg of [0, 20, 40, 60]) {
  const phi = (phiDeg * Math.PI) / 180;
  const r = { W, blur, phi: phiDeg, old: 0, man6: 0, man8: 0, wrong: 0, tiltA: [], bErrA: [] };
  const T = 4;
  for (let t = 0; t < T; t++) {
    seed++;
    const rnd = mulberry32(seed);
    // old baseline through the real pipeline
    const oldId = oldIds[Math.floor(rnd() * oldIds.length)];
    const fo = renderFrame({ color: (rr) => colorOld(rr, oldId), R: LAYOUT.R, W, phi, blur, noise: 3, seed: seed + 5e5 });
    const res = await analyzeFrame({ gray: fo.gray, w: fo.w, h: fo.h, n: 0 }, { minMargin: 4, minReadable: 4, coarseStride: 8, fineStride: 6 });
    if (res.fused.some((m) => m.id === oldId)) r.old++;
    for (const [D, key] of [[man6, "man6"], [man8, "man8"]]) {
      const bits = Array.from({ length: D.nBits }, () => (rnd() < 0.5 ? 1 : 0));
      const fm = renderFrame({ color: (rr) => D.color(rr, bits), R: D.R, W, phi, blur, noise: 3, seed });
      const out = detectFrameMAN(D, fm, bits);
      if (out.idOk) r[key]++;
      if (out.idWrong) r.wrong++;
      if (key === "man6" && out.tiltEst != null) {
        r.tiltA.push(out.tiltEst);
        r.bErrA.push((Math.abs(out.bEst - fm.bTrue) / fm.bTrue) * 100);
      }
    }
  }
  const med = (a) => (a.length ? a.sort((x, z) => x - z)[a.length >> 1] : null);
  rows.push({
    W, blur, "yaw°": phiDeg,
    old: `${r.old}/${T}`, man6: `${r.man6}/${T}`, man8: `${r.man8}/${T}`,
    wrong: r.wrong,
    "tilt̂°(man6)": med(r.tiltA) != null ? med(r.tiltA).toFixed(1) : "-",
    "bErr%": med(r.bErrA) != null ? med(r.bErrA).toFixed(1) : "-"
  });
}
console.table(rows);
