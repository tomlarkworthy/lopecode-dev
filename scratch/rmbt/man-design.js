// Manchester-in-r mark family, parametrised by payload width.
//
// Layout: dark disc r<6; light framing half-cell; nBits Manchester cells (bit 1
// = dark,light going outward; mid-cell edge sign IS the bit); dark framing
// half-cell; R = 28.5. Teeth at r = 6 + half·m, m = 0..2n+2, half = 22.5/(2n+2).
// Guaranteed teeth regardless of payload: 0 (disc), mids 2+2j, 2n+2 (rim).
// Boundary tooth 3+2j present iff bits j and j+1 are EQUAL — payload-dependent
// edges that still feed detection, act as consistency checks, and repair
// erased bits.
//
// solve() consumes the shared involution result {up, ...} where each mirror
// pair carries u = c²(r²-d²) and the right-edge gradient sign sR.
import { DARK, LIGHT, BG } from "./probe-shared.js";

export function makeMAN(nBits) {
  const half = 22.5 / (2 * nBits + 2);
  const nT = 2 * nBits + 2; // max tooth index (rim)
  const teeth = Array.from({ length: nT + 1 }, (_, m) => 6 + half * m);
  const T2 = teeth.map((r) => r * r);
  const GUAR = new Set([0, nT, ...Array.from({ length: nBits }, (_, j) => 2 + 2 * j)]);
  return {
    name: `man${nBits}`, nBits, R: 28.5, half, teeth,
    color(r, bits) {
      if (r >= 28.5) return BG;
      if (r < 6) return DARK;
      const m = Math.floor((r - 6) / half);
      if (m <= 0) return LIGHT;
      if (m >= nT - 1) return DARK;
      const j = (m - 1) >> 1, firstHalf = (m - 1) % 2 === 0;
      return bits[j] === 1 ? (firstHalf ? DARK : LIGHT) : (firstHalf ? LIGHT : DARK);
    },
    solve(iv, opts = {}) {
      const T = teeth;
      const { up } = iv;
      const uIn = up[0].u, uOut = up[up.length - 1].u;
      const nPairs = up.length;
      let asg = null;
      for (let o = nT; o >= Math.max(4, nT - 10); o--)
        for (let ii = 0; ii < o; ii++) {
          // the assignment must offer roughly as many teeth as pairs observed
          if (o - ii + 1 < nPairs - 2 || o - ii > nPairs + 7) continue;
          let A = (uOut - uIn) / (T2[o] - T2[ii]);
          if (!(A > 0)) continue;
          let B = uIn - A * T2[ii];
          // LS refit rounds over ALL pairs with nearest-tooth assignment; the
          // extremal pairs alone mis-anchor when blur merges rim teeth
          let fit = null;
          for (let round = 0; round < 2; round++) {
            const d2 = -B / A;
            if (d2 < -1.5) { fit = null; break; }
            const dHat = Math.sqrt(Math.max(0, d2));
            const hits = [];
            let sx = 0, sy = 0, sxx = 0, sxy = 0, m = 0;
            for (const p of up) {
              const r = Math.sqrt(Math.max(0, p.u / A + d2));
              const t = Math.round((r - 6) / half);
              if (t < 0 || t > nT) continue;
              const err = Math.abs(r - T[t]);
              if (err < 0.45) {
                hits.push([p, t, err]);
                sx += T2[t]; sy += p.u; sxx += T2[t] * T2[t]; sxy += T2[t] * p.u; m++;
              }
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
          let bad = false;
          const claimed = new Set();
          let resid = 0;
          for (const [p, t, err] of fit.hits) {
            if ((t === 0 || t === nT) && p.sR <= 0) { bad = true; break; }
            claimed.add(t); resid += err;
          }
          if (bad) continue;
          const rHi = Math.sqrt(uOut / fit.A + Math.max(0, -fit.B / fit.A)) + 0.7;
          let missing = 0;
          for (const t of GUAR) if (T[t] > fit.dHat + 0.8 && T[t] < rHi && !claimed.has(t)) missing++;
          const score = fit.hits.length - 0.7 * missing;
          if (!asg || score > asg.score || (score === asg.score && resid < asg.resid))
            asg = { ...fit, score, resid, inliers: fit.hits.length };
        }
      if (!asg || asg.inliers < 3 || asg.inliers < up.length - 2) return { ok: false, why: "no-lattice" };
      const byTooth = new Map();
      for (const [p, t, err] of asg.hits) {
        const prev = byTooth.get(t);
        if (!prev || err < prev.err) byTooth.set(t, { ...p, err });
      }
      const bits = new Array(nBits).fill(null);
      for (let j = 0; j < nBits; j++) {
        const p = byTooth.get(2 + 2 * j);
        if (p) bits[j] = p.sR > 0 ? 1 : 0;
      }
      const nDirect = bits.filter((b) => b != null).length;
      // Manchester redundancy as erasure repair: boundary edge between cells j
      // and j+1 exists iff the bits are EQUAL, so a missing mid bit is
      // recoverable from a read neighbour plus the boundary indicator.
      const visible = (t) => T[t] > asg.dHat + 0.6;
      for (let pass = 0; pass < nBits; pass++) {
        let fixed = 0;
        for (let j = 0; j < nBits; j++) {
          if (bits[j] != null) continue;
          if (j > 0 && bits[j - 1] != null && visible(3 + 2 * (j - 1))) {
            bits[j] = byTooth.has(3 + 2 * (j - 1)) ? bits[j - 1] : 1 - bits[j - 1];
            fixed++;
          } else if (j < nBits - 1 && bits[j + 1] != null && visible(3 + 2 * j)) {
            bits[j] = byTooth.has(3 + 2 * j) ? bits[j + 1] : 1 - bits[j + 1];
            fixed++;
          }
        }
        if (!fixed) break;
      }
      let viol = 0, checks = 0;
      for (let j = 0; j + 1 < nBits; j++) {
        const t = 3 + 2 * j;
        if (bits[j] == null || bits[j + 1] == null || !visible(t)) continue;
        checks++;
        if (byTooth.has(t) !== (bits[j] === bits[j + 1])) viol++;
      }
      if (bits[0] != null && visible(1)) { checks++; if (byTooth.has(1) !== (bits[0] === 1)) viol++; }
      if (bits[nBits - 1] != null && visible(nT - 1)) {
        checks++;
        if (byTooth.has(nT - 1) !== (bits[nBits - 1] === 1)) viol++;
      }
      const nVis = bits.filter((b) => b != null).length;
      // FP gate: repair is circular with the boundary check that would catch a
      // bad repair, so an id needs mostly DIRECT reads and real check coverage
      const minDirect = opts.minDirect ?? nBits - 1;
      const emit = nVis === nBits && viol === 0 && nDirect >= minDirect && checks >= 3;
      return {
        ok: true, dHat: asg.dHat, A: asg.A, bits, nVis, nDirect, viol, checks,
        sup: asg.inliers,
        id: emit ? bits.reduce((a, b) => 2 * a + b, 0) : null
      };
    }
  };
}
