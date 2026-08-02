#!/usr/bin/env bun
// PROTOTYPE: self-locating payload marks — the code IS the detection pattern.
// See probe-shared.js (renderer + involution stage), man-design.js (Manchester
// family). Premise: in u = r² the per-row warp is affine after involution
// normalisation, so a code with affine-recognisable structure in r²-space is
// detected by EVERY payload edge, on every row, at every pose.
//
// This run: man8/man6 (sign-coded bits, boundary-edge ECC, direct-read FP
// gate) + ppm8 reference, vs the CURRENT detector on the CURRENT mark
// (kernel.js dump). Row grid, wrong-id tracking, 2000-row FP, per-row speed,
// and a frame-level fusion sim with vertical-scale (height) recovery — the
// pole-row payoff the ellipse work couldn't get from the old design.

globalThis.window = globalThis; // kernel.js calls window.performance.now
const K = await import("./kernel.js");
const { edges1Dsub, detectLandmarkRow, decodeLandmark, LAYOUT, codebook } = K;
import { DARK, LIGHT, BG, mulberry32, renderRow, findInvolution } from "./probe-shared.js";
import { makeMAN } from "./man-design.js";

// ------------------------------------------------------------- design: ppmN
// reference: pulse-position, one edge per cell at 1/3|2/3, alternating colors
function makePPM(nBits) {
  const c = 22.5 / (nBits + 0.65);
  const rGuard = 6 + nBits * c;
  return {
    name: `ppm${nBits}`, nBits, R: 28.5, c, rGuard,
    color(r, bits) {
      if (r >= 28.5) return BG;
      if (r < 6) return DARK;
      if (r >= rGuard) return (nBits - 1) % 2 === 0 ? LIGHT : DARK;
      const j = Math.floor((r - 6) / c);
      const frac = (r - 6) / c - j;
      const Xj = j % 2 === 0 ? LIGHT : DARK;
      const f = bits[j] === 1 ? 1 / 3 : 2 / 3;
      return frac < f ? Xj : Xj === LIGHT ? DARK : LIGHT;
    },
    solve(iv) {
      const { up } = iv;
      const n = this.nBits, c = this.c, rGuard = this.rGuard;
      const signOfCell = (j) => (j % 2 === 0 ? -1 : 1);
      const anchors = [
        { r: 6, sign: 1 }, { r: 28.5, sign: 1 }, { r: rGuard, sign: -1 },
        ...Array.from({ length: n }, (_, j) => ({ r: 6 + (j + 0.5) * c, sign: signOfCell(j) }))
      ].sort((a, b) => a.r - b.r);
      const uIn = up[0].u, uOut = up[up.length - 1].u;
      const classify = (r) => {
        if (Math.abs(r - 6) < Math.abs(r - rGuard) && Math.abs(r - 6) < c / 2 && r < 6 + c / 3)
          return { kind: "disc", rT: 6, sign: 1, err: Math.abs(r - 6) };
        if (r >= rGuard - c / 3) {
          const dg = Math.abs(r - rGuard), dr = Math.abs(r - 28.5);
          return dg < dr
            ? { kind: "guard", rT: rGuard, sign: -1, err: dg }
            : { kind: "rim", rT: 28.5, sign: 1, err: dr };
        }
        const j = Math.max(0, Math.min(n - 1, Math.floor((r - 6) / c)));
        const rA = 6 + (j + 1 / 3) * c, rB = 6 + (j + 2 / 3) * c;
        const eA = Math.abs(r - rA), eB = Math.abs(r - rB);
        return eA < eB
          ? { kind: "cell", j, bit: 1, rT: rA, sign: signOfCell(j), err: eA }
          : { kind: "cell", j, bit: 0, rT: rB, sign: signOfCell(j), err: eB };
      };
      let asg = null;
      for (const aOut of anchors.slice(-5))
        for (const aIn of anchors) {
          if (aIn.r >= aOut.r) continue;
          let A = (uOut - uIn) / (aOut.r * aOut.r - aIn.r * aIn.r);
          if (!(A > 0)) continue;
          let B = uIn - A * aIn.r * aIn.r;
          let fit = null;
          for (let round = 0; round < 3; round++) {
            const d2 = -B / A;
            if (d2 < -1.5) { fit = null; break; }
            const dHat = Math.sqrt(Math.max(0, d2));
            const hits = [];
            let sx = 0, sy = 0, sxx = 0, sxy = 0, m = 0;
            for (const p of up) {
              const r = Math.sqrt(Math.max(0, p.u / A + d2));
              const cls = classify(r);
              if (cls.err > 0.4) continue;
              hits.push([p, cls]);
              const x = cls.rT * cls.rT;
              sx += x; sy += p.u; sxx += x * x; sxy += x * p.u; m++;
            }
            if (m < 3) { fit = null; break; }
            const den = m * sxx - sx * sx;
            if (Math.abs(den) > 1e-9) {
              const A2 = (m * sxy - sx * sy) / den;
              if (A2 > 0) { A = A2; B = (sy - A * sx) / m; }
            }
            fit = { A, B, dHat, hits };
          }
          if (!fit) continue;
          let bad = false, resid = 0;
          const cells = new Map();
          for (const [p, cls] of fit.hits) {
            if (p.sR !== cls.sign) { bad = true; break; }
            resid += cls.err;
            if (cls.kind === "cell") {
              const prev = cells.get(cls.j);
              if (!prev || cls.err < prev.cls.err) cells.set(cls.j, { p, cls });
            }
          }
          if (bad) continue;
          const rHi = Math.sqrt(uOut / fit.A + Math.max(0, -fit.B / fit.A)) + 0.7;
          let missing = 0;
          for (let j = 0; j < n; j++) {
            const rC = 6 + (j + 0.5) * c;
            if (rC > fit.dHat + 0.8 && rC < rHi && !cells.has(j)) missing++;
          }
          const score = fit.hits.length - 0.8 * missing;
          if (!asg || score > asg.score || (score === asg.score && resid < asg.resid))
            asg = { ...fit, score, resid, cells, inliers: fit.hits.length };
        }
      if (!asg || asg.inliers < 3 || asg.inliers < up.length - 2) return { ok: false, why: "no-lattice" };
      const bits = new Array(n).fill(null);
      const d2f = Math.max(0, -asg.B / asg.A);
      for (const [j, { p }] of asg.cells) {
        const r = Math.sqrt(Math.max(0, p.u / asg.A + d2f));
        const frac = (r - 6) / c - j;
        if (frac > 0.05 && frac < 0.95 && Math.abs(frac - 0.5) > 0.06)
          bits[j] = frac < 0.5 ? 1 : 0;
      }
      const nVis = bits.filter((b) => b != null).length;
      return {
        ok: true, dHat: asg.dHat, A: asg.A, bits, nVis, viol: 0,
        id: nVis === n ? bits.reduce((a, b) => 2 * a + b, 0) : null
      };
    }
  };
}
const DESIGNS = [makeMAN(8), makeMAN(6), makePPM(8)];

// ------------------------------------------------------------- old baseline
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
{
  // calibrate polarity on the clean condition; the old detector's per-row
  // recall is erratic off-centre (documented behaviour)
  let ok = false;
  for (const flip of [false, true]) {
    OLD_ONE = flip ? DARK : LIGHT; OLD_ZERO = flip ? LIGHT : DARK;
    const r = renderRow({ color: (rr) => colorOld(rr, 5), R: LAYOUT.R, d: 0, W: 90, blur: 1, noise: 0, asym: 1.0, seed: 7 });
    const se = edges1Dsub(r.row, 12);
    for (const det of detectLandmarkRow(se, { nms: false })) {
      const dec = decodeLandmark({ y: 0, ...det }, { gray: r.row, w: r.Wimg }, {});
      if (dec && dec.id === 5 && dec.margin >= 4) ok = true;
    }
    if (ok) { console.log(`old polarity: 1=${flip ? "DARK" : "LIGHT"}`); break; }
  }
  if (!ok) { console.log("CALIBRATION FAILED"); process.exit(1); }
}
const oldRowId = (row, Wimg) => {
  const se = edges1Dsub(row, 12);
  let got = null;
  for (const det of detectLandmarkRow(se, { nms: false })) {
    const dec = decodeLandmark({ y: 0, ...det }, { gray: row, w: Wimg }, {});
    if (dec && dec.margin >= 4 && dec.readable >= 4 && (got == null || dec.margin > got.margin)) got = dec;
  }
  return got ? got.id : null;
};
const runDesign = (D, row, wantBits) => {
  const se = edges1Dsub(row, 12);
  const iv = findInvolution(se);
  if (!iv) return { geom: false, full: false, wrong: false, vis: 0, visOk: 0 };
  const r = D.solve(iv);
  if (!r.ok) return { geom: false, full: false, wrong: false, vis: 0, visOk: 0 };
  const want = wantBits.reduce((a, b) => 2 * a + b, 0);
  let vis = 0, visOk = 0;
  for (let j = 0; j < D.nBits; j++) if (r.bits[j] != null) { vis++; if (r.bits[j] === wantBits[j]) visOk++; }
  return {
    geom: true, full: r.id === want, wrong: r.id != null && r.id !== want,
    vis, visOk, dHat: r.dHat, r
  };
};

// ------------------------------------------------------------------- debug
if (Bun.env.MDEBUG) {
  for (const D of DESIGNS) {
    console.log(`--- ${D.name}`);
    let i = 0;
    for (const W of [60, 90]) for (const blur of [1, 2]) for (const asym of [1.0, 1.3]) for (const d of [0, 2, 4, 6]) {
      const rnd = mulberry32(11 + i++);
      const bits = Array.from({ length: D.nBits }, () => (rnd() < 0.5 ? 1 : 0));
      const rn = renderRow({ color: (r) => D.color(r, bits), R: D.R, d, W, blur, noise: 3, asym, seed: 100 + i });
      const res = runDesign(D, rn.row, bits);
      const tag = `d=${d} W=${W} b=${blur} a=${asym}`;
      if (!res.geom) console.log(`  ${tag}  FAIL`);
      else {
        const gotS = res.r.bits.map((b) => (b == null ? "." : b)).join("");
        console.log(`  ${tag}  ${res.full ? "OK " : res.wrong ? "WRONG" : "..."} want ${bits.join("")} got ${gotS} dHat ${res.dHat.toFixed(1)}`);
      }
    }
  }
  process.exit(0);
}

// --------------------------------------------------------------------- grid
const Ws = [14, 22, 35, 60, 90];
const grid = [];
let seed = 1000;
for (const W of Ws) for (const blur of [1.0, 2.0]) for (const asym of [1.0, 1.3]) {
  for (let d = 0; d <= 26; d += 2) {
    const cell = { W, blur, asym, d, tries: 0, oldFull: 0 };
    for (const D of DESIGNS) cell[D.name] = { full: 0, wrong: 0, geom: 0, vis: 0, visOk: 0 };
    for (let t = 0; t < 6; t++) {
      seed++;
      const rnd = mulberry32(seed * 7 + 3);
      const oldId = oldIds[Math.floor(rnd() * oldIds.length)];
      const ro = renderRow({ color: (r) => colorOld(r, oldId), R: LAYOUT.R, d: d * (LAYOUT.R / 28.5), W, blur, noise: 3, asym, seed: seed + 5000 });
      if (!ro) continue;
      cell.tries++;
      if (oldRowId(ro.row, ro.Wimg) === oldId) cell.oldFull++;
      for (const D of DESIGNS) {
        const bits = Array.from({ length: D.nBits }, () => (rnd() < 0.5 ? 1 : 0));
        const rn = renderRow({ color: (r) => D.color(r, bits), R: D.R, d, W, blur, noise: 3, asym, seed });
        if (!rn) continue;
        const res = runDesign(D, rn.row, bits);
        const g = cell[D.name];
        if (res.full) g.full++;
        if (res.wrong) g.wrong++;
        if (res.geom) g.geom++;
        g.vis += res.vis; g.visOk += res.visOk;
      }
    }
    grid.push(cell);
  }
}
const agg = [];
for (const W of Ws) {
  const rows = grid.filter((g) => g.W === W);
  const fullRows = rows.filter((g) => g.d <= 6);
  const st = fullRows.reduce((a, g) => a + g.tries, 0);
  const geomRows = rows.filter((g) => g.d <= 22);
  const gt = geomRows.reduce((a, g) => a + g.tries, 0);
  const out = { W, old: +((100 * fullRows.reduce((a, g) => a + g.oldFull, 0)) / st).toFixed(1) };
  for (const D of DESIGNS) {
    out[`${D.name}`] = +((100 * fullRows.reduce((a, g) => a + g[D.name].full, 0)) / st).toFixed(1);
    out[`${D.name}Wrong`] = fullRows.reduce((a, g) => a + g[D.name].wrong, 0) +
      rows.filter((g) => g.d > 6).reduce((a, g) => a + g[D.name].wrong, 0);
    out[`${D.name}Geom`] = +((100 * geomRows.reduce((a, g) => a + g[D.name].geom, 0)) / gt).toFixed(1);
  }
  agg.push(out);
}
console.log("\nper-row full-id % (d<=6), wrong-id count (all d), geometric detect % (d<=22):");
console.table(agg);

// ------------------------------------------------------------ false positives
const fpRandom = { old: 0 };
for (const D of DESIGNS) fpRandom[D.name] = 0;
const NFP = 2000;
for (let t = 0; t < NFP; t++) {
  const rnd = mulberry32(90000 + t);
  const Wimg = 260;
  const row = new Uint8Array(Wimg);
  let x = 0, v = Math.floor(rnd() * 256);
  while (x < Wimg) {
    const w = 2 + Math.floor(rnd() * 24);
    for (let i = x; i < Math.min(Wimg, x + w); i++) row[i] = v;
    x += w; v = Math.floor(rnd() * 256);
  }
  const se = edges1Dsub(row, 12);
  const iv = findInvolution(se);
  if (iv) for (const D of DESIGNS) {
    const r = D.solve(iv);
    if (r.ok && r.id != null) fpRandom[D.name]++;
  }
  for (const det of detectLandmarkRow(se, { nms: false })) {
    const dec = decodeLandmark({ y: 0, ...det }, { gray: row, w: Wimg }, {});
    if (dec && dec.margin >= 4 && dec.readable >= 4) { fpRandom.old++; break; }
  }
}
console.log(`false positives on ${NFP} random rows:`, JSON.stringify(fpRandom));

// ---------------------------------------------------------------------- speed
{
  const rows = [];
  for (let t = 0; t < 60; t++) {
    const rnd = mulberry32(555 + t);
    const d = t % 9;
    const perD = {};
    for (const D of DESIGNS) {
      const bits = Array.from({ length: D.nBits }, () => (rnd() < 0.5 ? 1 : 0));
      const rn = renderRow({ color: (r) => D.color(r, bits), R: D.R, d, W: 35, blur: 1, noise: 3, asym: 1.2, seed: t });
      perD[D.name] = edges1Dsub(rn.row, 12);
    }
    const ro = renderRow({ color: (r) => colorOld(r, oldIds[t % 14]), R: LAYOUT.R, d, W: 35, blur: 1, noise: 3, asym: 1.2, seed: t });
    rows.push({ perD, ose: edges1Dsub(ro.row, 12), or: ro });
  }
  const med = (fn) => {
    const ts = [];
    for (let rep = 0; rep < 9; rep++) {
      const t0 = performance.now();
      for (const r of rows) fn(r);
      ts.push(performance.now() - t0);
    }
    ts.sort((a, b) => a - b);
    return (ts[4] / rows.length) * 1000;
  };
  const out = {};
  for (const D of DESIGNS)
    out[D.name] = +med((r) => { const iv = findInvolution(r.perD[D.name]); if (iv) D.solve(iv); }).toFixed(1);
  out.old = +med((r) => {
    for (const det of detectLandmarkRow(r.ose, { nms: false }))
      decodeLandmark({ y: 0, ...det }, { gray: r.or.row, w: r.or.Wimg }, {});
  }).toFixed(1);
  console.log("per-row detect+decode µs:", JSON.stringify(out));
}

// ------------------------------------------------------- frame-level fusion
// Rows across the mark at the live pipeline's fineStride (6px). Frame id =
// majority vote needing >=2 agreeing rows (the old pipeline's own rule).
// Height recovery: rows with geometry lock give |d̂| directly; fit
// d̂² = a·y² + b·y + c  =>  S = 1/sqrt(a), yc = -b/2a. The vertical semi-axis
// is S·28.5 — measured, where the old design extrapolates it from the equator.
function fuseFrame(D, bits, { W, blur, asym, seed }) {
  const S = W / 28.5;
  const stride = 6;
  const votes = new Map();
  const geo = [];
  let rows = 0;
  const phase = Math.floor(mulberry32(seed)() * stride);
  for (let y = -Math.ceil(28.5 * S) + phase; y <= 28.5 * S; y += stride) {
    const d = Math.abs(y) / S;
    if (d >= 28) continue;
    rows++;
    const rn = renderRow({ color: (r) => D.color(r, bits), R: D.R, d, W, blur, noise: 3, asym, seed: seed + 31 * y });
    if (!rn) continue;
    const res = runDesign(D, rn.row, bits);
    // geometry rows for the height fit need real lattice support: sparse pole
    // rows can lock a translated assignment whose d̂ is systematically off
    if (res.geom && (res.r.sup == null || res.r.sup >= 5)) geo.push({ y, d2: res.dHat * res.dHat });
    if (res.r && res.r.id != null) votes.set(res.r.id, (votes.get(res.r.id) ?? 0) + 1);
  }
  let bestId = null, bestN = 0, secondN = 0;
  for (const [id, n] of votes) {
    if (n > bestN) { secondN = bestN; bestN = n; bestId = id; }
    else if (n > secondN) secondN = n;
  }
  const want = bits.reduce((a, b) => 2 * a + b, 0);
  const accept = bestN >= 2 && bestN >= 2 * secondN; // vote margin vs runner-up
  const idOk = accept && bestId === want;
  const idWrong = accept && bestId !== want;
  // robust quadratic LS fit of d̂² over y: fit, trim residuals > 2.5·MAD, refit
  const quadFit = (pts) => {
    let s0 = 0, s1 = 0, s2 = 0, s3 = 0, s4 = 0, sy0 = 0, sy1 = 0, sy2 = 0;
    for (const g of pts) {
      const y = g.y, y2 = y * y;
      s0++; s1 += y; s2 += y2; s3 += y2 * y; s4 += y2 * y2;
      sy0 += g.d2; sy1 += g.d2 * y; sy2 += g.d2 * y2;
    }
    const M = [[s4, s3, s2, sy2], [s3, s2, s1, sy1], [s2, s1, s0, sy0]];
    for (let col = 0; col < 3; col++) {
      let piv = col;
      for (let r2 = col + 1; r2 < 3; r2++) if (Math.abs(M[r2][col]) > Math.abs(M[piv][col])) piv = r2;
      [M[col], M[piv]] = [M[piv], M[col]];
      if (Math.abs(M[col][col]) < 1e-12) return null;
      for (let r2 = 0; r2 < 3; r2++) {
        if (r2 === col) continue;
        const f = M[r2][col] / M[col][col];
        for (let cc = col; cc < 4; cc++) M[r2][cc] -= f * M[col][cc];
      }
    }
    return [M[0][3] / M[0][0], M[1][3] / M[1][1], M[2][3] / M[2][2]];
  };
  let heightErrPct = null;
  if (geo.length >= 5) {
    let pts = geo, co = quadFit(pts);
    if (co) {
      const resid = pts.map((g) => Math.abs(g.d2 - (co[0] * g.y * g.y + co[1] * g.y + co[2])));
      const mad = resid.slice().sort((a, b) => a - b)[resid.length >> 1] || 1;
      const kept = pts.filter((g, i) => resid[i] <= 2.5 * mad);
      if (kept.length >= 5) { pts = kept; co = quadFit(pts) ?? co; }
      if (co[0] > 0) {
        const Sest = 1 / Math.sqrt(co[0]);
        heightErrPct = (Math.abs(Sest * 28.5 - S * 28.5) / (S * 28.5)) * 100;
      }
    }
  }
  return { rows, geoRows: geo.length, idOk, idWrong, votes: bestN, heightErrPct };
}
function fuseFrameOld(oldId, { W, blur, asym, seed }) {
  const S = W / LAYOUT.R;
  const stride = 6;
  const votes = new Map();
  const phase = Math.floor(mulberry32(seed)() * stride);
  for (let y = -Math.ceil(LAYOUT.R * S) + phase; y <= LAYOUT.R * S; y += stride) {
    const d = Math.abs(y) / S;
    if (d >= LAYOUT.R - 0.5) continue;
    const ro = renderRow({ color: (r) => colorOld(r, oldId), R: LAYOUT.R, d, W, blur, noise: 3, asym, seed: seed + 31 * y });
    if (!ro) continue;
    const id = oldRowId(ro.row, ro.Wimg);
    if (id != null) votes.set(id, (votes.get(id) ?? 0) + 1);
  }
  let bestId = null, bestN = 0;
  for (const [id, n] of votes) if (n > bestN) { bestN = n; bestId = id; }
  return { idOk: bestN >= 2 && bestId === oldId, idWrong: bestN >= 2 && bestId !== oldId };
}

const fusion = [];
let fseed = 40000;
for (const W of [25, 35, 45, 60, 90]) for (const blur of [1.0, 1.5, 2.0]) {
  const asym = 1.2;
  const row = { W, blur, oldOk: 0, oldWrong: 0, trials: 5 };
  for (const D of DESIGNS) row[D.name] = { ok: 0, wrong: 0, hErr: [] };
  for (let t = 0; t < 5; t++) {
    fseed++;
    const rnd = mulberry32(fseed);
    const oldId = oldIds[Math.floor(rnd() * oldIds.length)];
    const o = fuseFrameOld(oldId, { W, blur, asym, seed: fseed + 100000 });
    if (o.idOk) row.oldOk++;
    if (o.idWrong) row.oldWrong++;
    for (const D of DESIGNS) {
      const bits = Array.from({ length: D.nBits }, () => (rnd() < 0.5 ? 1 : 0));
      const f = fuseFrame(D, bits, { W, blur, asym, seed: fseed });
      if (f.idOk) row[D.name].ok++;
      if (f.idWrong) row[D.name].wrong++;
      if (f.heightErrPct != null) row[D.name].hErr.push(f.heightErrPct);
    }
  }
  const out = { W, blur, old: `${row.oldOk}/5${row.oldWrong ? ` W${row.oldWrong}` : ""}` };
  for (const D of DESIGNS) {
    const g = row[D.name];
    const h = g.hErr.length ? g.hErr.sort((a, b) => a - b)[g.hErr.length >> 1].toFixed(1) : "-";
    out[D.name] = `${g.ok}/5${g.wrong ? ` W${g.wrong}` : ""}`;
    out[`${D.name}H%`] = h;
  }
  fusion.push(out);
}
console.log("\nframe-level id (votes>=2 rule, asym 1.2) and median height-recovery error %:");
console.table(fusion);
