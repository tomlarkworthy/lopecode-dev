// An AssemblyScript port of @tomlarkworthy/coded-landmark-tracking's
// detectRowMan and everything it calls: manRowGroups -> findInvolution ->
// solveMan, over the manLayout constants.
//
// This is 83% of the row scan (solveMan 46%, findInvolution 37%) and the
// boundary is one call per row, so the JS<->WASM crossing is paid ~120 times a
// frame rather than once per candidate group.
//
// Written to be BIT-IDENTICAL, not idiomatic. The notebook holds its worker
// pool to "identical to 4dp on every bank frame" and a WASM arm has to clear
// the same bar, so every guard, every strict-vs-non-strict comparison and
// every tie-break follows the JS exactly. Where the JS leans on IEEE behaviour
// that reads like a bug (a division by zero yielding an infinity that a later
// isFinite catches) this leans on it too.
//
// The data structures are the one place it departs, because AssemblyScript has
// no cheap Map/Set and this must not allocate per row:
//   JS `claimed` Set over tooth index  -> claimed[]  bool, nT+1 entries
//   JS `byTooth` Map<t, {...}>         -> btHas[]/btU[]/btSR[]/btErr[], nT+1
//   JS `bits` Array with nulls         -> bits[] i32 with -1 for null
//   JS `up` array of {u,e,f,sR}        -> parallel upU/upE/upF/upSR
// Every one is indexed by a small bounded integer, so the translation is
// mechanical rather than a redesign.
//
// BUILD (in a browser -- see ascc.ts):
//   bun scratch/rmbt/ascc.ts scratch/rmbt/detectrow.as.ts detectrow.wasm --O 3 --runtime stub
// VERIFY before trusting it:
//   bun scratch/rmbt/check-detectrow.ts --wasm detectrow.wasm

// ---- manLayout, as literals -----------------------------------------------
// nBits 6; half = 22.5/14; nT = 14; teeth[m] = 6 + half*m for m = 0..14.
const NBITS: i32 = 6;
const NT: i32 = 14;
const HALF: f64 = 22.5 / 14.0;
// Widest row over the 16 bank frames is 119 edges, so 96 was WRONG and would
// have silently returned no hits for the busiest rows -- exactly the rows a
// detector must not drop. Sized well past that, and every cap below reports
// itself through overflowed() instead of quietly disagreeing with the JS.
const MAXE: i32 = 512;
const MAXG: i32 = 64;   // a group is capped at groupCap = 2*(nT+1)+3 = 33
const MAXHIT: i32 = 64;
const MAXGROUPS: i32 = 1024;

let overflow: i32 = 0;
export function overflowed(): i32 { return overflow; }

const T = new StaticArray<f64>(NT + 1);
const T2 = new StaticArray<f64>(NT + 1);
// guaranteed teeth: [0, nT, 2, 4, 6, 8, 10, 12]
const GUAR = new StaticArray<i32>(NBITS + 2);

function initLayout(): void {
  for (let m = 0; m <= NT; m++) {
    const r = 6.0 + HALF * <f64>m;
    unchecked(T[m] = r);
    unchecked(T2[m] = r * r);
  }
  unchecked(GUAR[0] = 0);
  unchecked(GUAR[1] = NT);
  for (let j = 0; j < NBITS; j++) unchecked(GUAR[2 + j] = 2 + 2 * j);
}

// ---- row input, written from JS -------------------------------------------
const xs = new StaticArray<f64>(MAXE);
const ss = new StaticArray<i32>(MAXE);

// ---- per-group working copies ---------------------------------------------
const gxs = new StaticArray<f64>(MAXG);
const gss = new StaticArray<i32>(MAXG);

// ---- findInvolution output -------------------------------------------------
const upU = new StaticArray<f64>(MAXG);
const upE = new StaticArray<i32>(MAXG);
const upF = new StaticArray<i32>(MAXG);
const upSR = new StaticArray<i32>(MAXG);
let nUp: i32 = 0;
let ivP: f64 = 0;
let ivQ: f64 = 0;

// findInvolution scratch
const pe = new StaticArray<i32>(MAXG);
const pf = new StaticArray<i32>(MAXG);
const bpe = new StaticArray<i32>(MAXG);
const bpf = new StaticArray<i32>(MAXG);
let bnp: i32 = 0;
let bAffine: bool = false;
let haveBest: bool = false;
let bestInl: i32 = 0;
let bestP: f64 = 0;
let bestQ: f64 = 0;

// ---- solveMan working state ------------------------------------------------
// current fit
const fitP = new StaticArray<i32>(MAXG);   // index into up
const fitT = new StaticArray<i32>(MAXG);
const fitErr = new StaticArray<f64>(MAXG);
let nFit: i32 = 0;
// best assignment
const asgP = new StaticArray<i32>(MAXG);
const asgT = new StaticArray<i32>(MAXG);
const asgErr = new StaticArray<f64>(MAXG);
let nAsg: i32 = 0;
let asgA: f64 = 0;
let asgDHat: f64 = 0;
let asgScore: f64 = 0;
let asgResid: f64 = 0;
let haveAsg: bool = false;

const claimed = new StaticArray<bool>(NT + 1);
const btHas = new StaticArray<bool>(NT + 1);
const btU = new StaticArray<f64>(NT + 1);
const btSR = new StaticArray<i32>(NT + 1);
const btErr = new StaticArray<f64>(NT + 1);
const bits = new StaticArray<i32>(NBITS);

// solveMan result
let sOk: bool = false;
let sDHat: f64 = 0;
let sSup: i32 = 0;
let sId: i32 = -1;

// ---- detectRowMan output ---------------------------------------------------
const hFoot = new StaticArray<f64>(MAXHIT);
const hD = new StaticArray<f64>(MAXHIT);
const hSup = new StaticArray<i32>(MAXHIT);
const hWHalf = new StaticArray<f64>(MAXHIT);
const hId = new StaticArray<i32>(MAXHIT);
const hX0 = new StaticArray<f64>(MAXHIT);
const hX1 = new StaticArray<f64>(MAXHIT);
let nHits: i32 = 0;

// group list from manRowGroups
const grLo = new StaticArray<i32>(MAXGROUPS);
const grHi = new StaticArray<i32>(MAXGROUPS);
let nGroups: i32 = 0;

export function xsPtr(): usize { return changetype<usize>(xs); }
export function ssPtr(): usize { return changetype<usize>(ss); }
export function footPtr(): usize { return changetype<usize>(hFoot); }
export function dPtr(): usize { return changetype<usize>(hD); }
export function supPtr(): usize { return changetype<usize>(hSup); }
export function wHalfPtr(): usize { return changetype<usize>(hWHalf); }
export function idPtr(): usize { return changetype<usize>(hId); }
export function x0Ptr(): usize { return changetype<usize>(hX0); }
export function x1Ptr(): usize { return changetype<usize>(hX1); }

// ---- manRowGroups ----------------------------------------------------------
// groupCap = 2*(nT+1)+3 = 33, maxEdges = 2*(nT+1)+6 = 36
const GROUPCAP: i32 = 2 * (NT + 1) + 3;
const MAXEDGES: i32 = 2 * (NT + 1) + 6;

function emitGroup(lo: i32, hi: i32): void {
  if (hi - lo + 1 > GROUPCAP) return;
  if (nGroups >= MAXGROUPS) { overflow |= 2; return; }
  unchecked(grLo[nGroups] = lo);
  unchecked(grHi[nGroups] = hi);
  nGroups++;
}

function splitGroup(lo: i32, hi: i32, depth: i32, gapFrac: f64, minEdges: i32, minSpan: f64): void {
  const n = hi - lo + 1;
  if (n < minEdges) return;
  const span = unchecked(xs[hi]) - unchecked(xs[lo]);
  if (span < minSpan) return;
  let worst: i32 = -1;
  let worstGap: f64 = 0;
  for (let i = lo; i < hi; i++) {
    const g = unchecked(xs[i + 1]) - unchecked(xs[i]);
    if (g > worstGap) { worstGap = g; worst = i; }
  }
  const tooWide = worstGap > gapFrac * span;
  const tooMany = n > MAXEDGES;
  if ((tooWide || tooMany) && worst >= lo && depth < 8) {
    splitGroup(lo, worst, depth + 1, gapFrac, minEdges, minSpan);
    splitGroup(worst + 1, hi, depth + 1, gapFrac, minEdges, minSpan);
    // offerWhole is true in the shipping config: a mark straddling the cut
    // would otherwise be lost, and lattice support decides between them.
    emitGroup(lo, hi);
    return;
  }
  emitGroup(lo, hi);
}

// ---- findInvolution --------------------------------------------------------
function consider(n: i32, span: f64, i: i32, j: i32, a: i32, b: i32, tolPx: f64, minInliers: i32): void {
  if (unchecked(gss[i]) == unchecked(gss[j]) || unchecked(gss[a]) == unchecked(gss[b])) return;

  const x1 = unchecked(gxs[i]), x1p = unchecked(gxs[j]);
  const x2 = unchecked(gxs[a]), x2p = unchecked(gxs[b]);
  const r10 = x1 * x1p, r11 = x1 + x1p;
  const r20 = x2 * x2p, r21 = x2 + x2p;
  const al = r11 - r21;
  const be = r20 - r10;
  const ga = r10 * r21 - r11 * r20;

  let P: f64, Q: f64;
  if (Math.abs(al) * span < 1e-4 * Math.abs(be)) {
    P = -ga / (2 * be);
    Q = Infinity;
  } else {
    const disc = be * be - al * ga;
    if (!(disc > 0)) return;
    const sq = Math.sqrt(disc);
    P = (-be + sq) / al;
    Q = (-be - sq) / al;
  }

  const mid = (unchecked(gxs[i]) + unchecked(gxs[j])) / 2;
  if (isFinite(Q) && Math.abs(P - mid) > Math.abs(Q - mid)) { const t = P; P = Q; Q = t; }
  if (!(P > unchecked(gxs[i]) && P < unchecked(gxs[j]) && P > unchecked(gxs[a]) && P < unchecked(gxs[b]))) return;
  if (isFinite(Q) && Q > unchecked(gxs[i]) - 0.02 * span && Q < unchecked(gxs[j]) + 0.02 * span) return;
  const affine = !isFinite(Q);

  let inl: i32 = 0;
  let np: i32 = 0;
  for (let e = 0; e < n; e++) {
    if (unchecked(gxs[e]) >= P) break;
    const xe = unchecked(gxs[e]);
    const y = affine ? 2 * P - xe : -(be * xe + ga) / (al * xe + be);
    if (!isFinite(y)) continue;
    // counts DOWN from n-1 taking strictly-smaller distances, so among equal
    // distances the HIGHER index wins
    let bi: i32 = -1;
    let bd: f64 = Infinity;
    for (let f = n - 1; f >= 0 && unchecked(gxs[f]) > P; f--) {
      const dd = Math.abs(unchecked(gxs[f]) - y);
      if (dd < bd && unchecked(gss[f]) == -unchecked(gss[e])) { bd = dd; bi = f; }
    }
    if (bi >= 0 && bd <= tolPx) {
      inl += 2;
      unchecked(pe[np] = e);
      unchecked(pf[np] = bi);
      np++;
    }
  }
  if (inl >= minInliers && (!haveBest || inl > bestInl)) {
    haveBest = true; bestInl = inl; bestP = P; bestQ = Q; bAffine = affine; bnp = np;
    for (let c = 0; c < np; c++) {
      unchecked(bpe[c] = unchecked(pe[c]));
      unchecked(bpf[c] = unchecked(pf[c]));
    }
  }
}

// fills upU/upE/upF/upSR, returns nUp (0 == the JS `null`)
function findInvolution(n: i32, tolPx: f64, minInliers: i32): i32 {
  nUp = 0;
  haveBest = false; bestInl = 0; bnp = 0;
  if (n < 6) return 0;
  const span = unchecked(gxs[n - 1]) - unchecked(gxs[0]);
  const iMax = n < 3 ? n : 3;
  for (let i = 0; i < iMax; i++) {
    const loJ = n - 3 > i + 3 ? n - 3 : i + 3;
    for (let j = n - 1; j >= loJ; j--) {
      if (unchecked(gss[i]) == unchecked(gss[j])) continue;
      const aMax = i + 4 < j - 2 ? i + 4 : j - 2;
      for (let a = i + 1; a <= aMax; a++) {
        const loB = j - 4 > a + 1 ? j - 4 : a + 1;
        for (let b = j - 1; b >= loB; b--) consider(n, span, i, j, a, b, tolPx, minInliers);
      }
    }
  }
  if (!haveBest) return 0;

  let m: i32 = 0;
  for (let k = 0; k < bnp; k++) {
    const ei = unchecked(bpe[k]), fi = unchecked(bpf[k]);
    const xe = unchecked(gxs[ei]), xf = unchecked(gxs[fi]);
    const te = bAffine ? xe - bestP : (xe - bestP) / (xe - bestQ);
    const tf = bAffine ? xf - bestP : (xf - bestP) / (xf - bestQ);
    const u = -te * tf;
    if (u > 0) {
      unchecked(upU[m] = u);
      unchecked(upE[m] = ei);
      unchecked(upF[m] = fi);
      unchecked(upSR[m] = unchecked(gss[fi]));
      m++;
    }
  }
  // ascending by u. The JS uses Array.prototype.sort, which is stable, and
  // carries e/f/sR along with u -- so this sorts all four together.
  for (let p = 1; p < m; p++) {
    const vu = unchecked(upU[p]), ve = unchecked(upE[p]), vf = unchecked(upF[p]), vs = unchecked(upSR[p]);
    let q = p;
    while (q > 0 && unchecked(upU[q - 1]) > vu) {
      unchecked(upU[q] = unchecked(upU[q - 1]));
      unchecked(upE[q] = unchecked(upE[q - 1]));
      unchecked(upF[q] = unchecked(upF[q - 1]));
      unchecked(upSR[q] = unchecked(upSR[q - 1]));
      q--;
    }
    unchecked(upU[q] = vu); unchecked(upE[q] = ve);
    unchecked(upF[q] = vf); unchecked(upSR[q] = vs);
  }
  if (m < 3) return 0;
  ivP = bestP; ivQ = bestQ; nUp = m;
  return m;
}

// ---- solveMan --------------------------------------------------------------
function solveMan(minDirect: i32): void {
  sOk = false; sDHat = 0; sSup = 0; sId = -1;
  const uIn = unchecked(upU[0]);
  const uOutV = unchecked(upU[nUp - 1]);
  const nPairs = nUp;
  haveAsg = false; nAsg = 0;

  const oLo = 4 > NT - 10 ? 4 : NT - 10;
  for (let o = NT; o >= oLo; o--) {
    for (let ii = 0; ii < o; ii++) {
      if (o - ii + 1 < nPairs - 2 || o - ii > nPairs + 7) continue;
      let A = (uOutV - uIn) / (unchecked(T2[o]) - unchecked(T2[ii]));
      if (!(A > 0)) continue;
      let B = uIn - A * unchecked(T2[ii]);
      let haveFit: bool = false;
      let fitA: f64 = 0, fitDHat: f64 = 0;

      for (let round = 0; round < 2; round++) {
        const d2 = -B / A;
        if (d2 < -1.5) { haveFit = false; break; }
        const dHat = Math.sqrt(Math.max(0, d2));
        nFit = 0;
        let sx: f64 = 0, sy: f64 = 0, sxx: f64 = 0, sxy: f64 = 0;
        let mm: i32 = 0;
        for (let pi = 0; pi < nUp; pi++) {
          const pu = unchecked(upU[pi]);
          const r = Math.sqrt(Math.max(0, pu / A + d2));
          const t = <i32>Math.round((r - 6) / HALF);
          if (t < 0 || t > NT) continue;
          const err = Math.abs(r - unchecked(T[t]));
          if (err < 0.45) {
            unchecked(fitP[nFit] = pi);
            unchecked(fitT[nFit] = t);
            unchecked(fitErr[nFit] = err);
            nFit++;
            const t2 = unchecked(T2[t]);
            sx += t2; sy += pu; sxx += t2 * t2; sxy += t2 * pu; mm++;
          }
        }
        if (mm < 3) { haveFit = false; break; }
        const den = <f64>mm * sxx - sx * sx;
        if (Math.abs(den) > 1e-9) {
          const A2 = (<f64>mm * sxy - sx * sy) / den;
          if (A2 > 0) { A = A2; B = (sy - A * sx) / <f64>mm; }
        }
        haveFit = true; fitA = A; fitDHat = dHat;
      }
      if (!haveFit) continue;

      let bad: bool = false;
      for (let t = 0; t <= NT; t++) unchecked(claimed[t] = false);
      let resid: f64 = 0;
      for (let k = 0; k < nFit; k++) {
        const t = unchecked(fitT[k]);
        const pi = unchecked(fitP[k]);
        if ((t == 0 || t == NT) && unchecked(upSR[pi]) <= 0) { bad = true; break; }
        unchecked(claimed[t] = true);
        resid += unchecked(fitErr[k]);
      }
      if (bad) continue;

      // fit.A and fit.B are both the values AFTER the last round's refit (the
      // JS rebuilds `fit` from the live A and B at the end of each round), so
      // B is read here rather than a saved copy. dHat is NOT: it is computed
      // from the pre-refit A/B of that round. That asymmetry is in the JS and
      // is reproduced rather than tidied.
      const rHi = Math.sqrt(uOutV / fitA + Math.max(0, -B / fitA)) + 0.7;
      let missing: i32 = 0;
      for (let gi = 0; gi < NBITS + 2; gi++) {
        const t = unchecked(GUAR[gi]);
        if (unchecked(T[t]) > fitDHat + 0.8 && unchecked(T[t]) < rHi && !unchecked(claimed[t])) missing++;
      }
      const score = <f64>nFit - 0.7 * <f64>missing;
      if (!haveAsg || score > asgScore || (score == asgScore && resid < asgResid)) {
        haveAsg = true;
        asgA = fitA; asgDHat = fitDHat; asgScore = score; asgResid = resid;
        nAsg = nFit;
        for (let k = 0; k < nFit; k++) {
          unchecked(asgP[k] = unchecked(fitP[k]));
          unchecked(asgT[k] = unchecked(fitT[k]));
          unchecked(asgErr[k] = unchecked(fitErr[k]));
        }
      }
    }
  }

  if (!haveAsg || nAsg < 3 || nAsg < nUp - 2) return;

  for (let t = 0; t <= NT; t++) unchecked(btHas[t] = false);
  for (let k = 0; k < nAsg; k++) {
    const t = unchecked(asgT[k]);
    const pi = unchecked(asgP[k]);
    const err = unchecked(asgErr[k]);
    if (!unchecked(btHas[t]) || err < unchecked(btErr[t])) {
      unchecked(btHas[t] = true);
      unchecked(btU[t] = unchecked(upU[pi]));
      unchecked(btSR[t] = unchecked(upSR[pi]));
      unchecked(btErr[t] = err);
    }
  }

  for (let j = 0; j < NBITS; j++) {
    const t = 2 + 2 * j;
    unchecked(bits[j] = unchecked(btHas[t]) ? (unchecked(btSR[t]) > 0 ? 1 : 0) : -1);
  }
  let nDirect: i32 = 0;
  for (let j = 0; j < NBITS; j++) if (unchecked(bits[j]) >= 0) nDirect++;

  for (let pass = 0; pass < NBITS; pass++) {
    let fixed: i32 = 0;
    for (let j = 0; j < NBITS; j++) {
      if (unchecked(bits[j]) >= 0) continue;
      if (j > 0 && unchecked(bits[j - 1]) >= 0 && unchecked(T[3 + 2 * (j - 1)]) > asgDHat + 0.6) {
        const prev = unchecked(bits[j - 1]);
        unchecked(bits[j] = unchecked(btHas[3 + 2 * (j - 1)]) ? prev : 1 - prev);
        fixed++;
      } else if (j < NBITS - 1 && unchecked(bits[j + 1]) >= 0 && unchecked(T[3 + 2 * j]) > asgDHat + 0.6) {
        const nxt = unchecked(bits[j + 1]);
        unchecked(bits[j] = unchecked(btHas[3 + 2 * j]) ? nxt : 1 - nxt);
        fixed++;
      }
    }
    if (fixed == 0) break;
  }

  let viol: i32 = 0, checks: i32 = 0;
  for (let j = 0; j + 1 < NBITS; j++) {
    const t = 3 + 2 * j;
    if (unchecked(bits[j]) < 0 || unchecked(bits[j + 1]) < 0 || !(unchecked(T[t]) > asgDHat + 0.6)) continue;
    checks++;
    if (unchecked(btHas[t]) != (unchecked(bits[j]) == unchecked(bits[j + 1]))) viol++;
  }
  if (unchecked(bits[0]) >= 0 && unchecked(T[1]) > asgDHat + 0.6) {
    checks++;
    if (unchecked(btHas[1]) != (unchecked(bits[0]) == 1)) viol++;
  }
  if (unchecked(bits[NBITS - 1]) >= 0 && unchecked(T[NT - 1]) > asgDHat + 0.6) {
    checks++;
    if (unchecked(btHas[NT - 1]) != (unchecked(bits[NBITS - 1]) == 1)) viol++;
  }

  let nVis: i32 = 0;
  for (let j = 0; j < NBITS; j++) if (unchecked(bits[j]) >= 0) nVis++;
  const emit = nVis == NBITS && viol == 0 && nDirect >= minDirect && checks >= 3;

  sOk = true;
  sDHat = asgDHat;
  sSup = nAsg;
  if (emit) {
    let id: i32 = 0;
    for (let j = 0; j < NBITS; j++) id = 2 * id + unchecked(bits[j]);
    sId = id;
  } else sId = -1;
}

// ---- detectRowMan ----------------------------------------------------------
export function detectRow(n: i32, tolPx: f64, minInliers: i32, gapFrac: f64,
                          minEdges: i32, minSpan: f64, minDirect: i32): i32 {
  nHits = 0;
  overflow = 0;
  if (n < 6) return 0;
  if (n > MAXE) { overflow |= 1; return 0; }

  nGroups = 0;
  splitGroup(0, n - 1, 0, gapFrac, minEdges, minSpan);

  for (let g = 0; g < nGroups; g++) {
    const lo = unchecked(grLo[g]), hi = unchecked(grHi[g]);
    const gn = hi - lo + 1;
    if (gn > MAXG) { overflow |= 4; continue; }
    for (let i = 0; i < gn; i++) {
      unchecked(gxs[i] = unchecked(xs[lo + i]));
      unchecked(gss[i] = unchecked(ss[lo + i]));
    }
    if (findInvolution(gn, tolPx, minInliers) == 0) continue;
    solveMan(minDirect);
    if (!sOk || sSup < 5) continue;
    if (nHits >= MAXHIT) { overflow |= 8; continue; }
    const lastE = unchecked(upE[nUp - 1]);
    const lastF = unchecked(upF[nUp - 1]);
    unchecked(hFoot[nHits] = ivP);
    unchecked(hD[nHits] = sDHat);
    unchecked(hSup[nHits] = sSup);
    unchecked(hWHalf[nHits] = (unchecked(gxs[lastF]) - unchecked(gxs[lastE])) / 2);
    unchecked(hId[nHits] = sId);
    unchecked(hX0[nHits] = unchecked(gxs[0]));
    unchecked(hX1[nHits] = unchecked(gxs[gn - 1]));
    nHits++;
  }

  // strongest lattice support wins an overlap. JS sorts descending by sup with
  // Array.prototype.sort (stable), then keeps greedily.
  for (let p = 1; p < nHits; p++) {
    const f = unchecked(hFoot[p]), d = unchecked(hD[p]), s = unchecked(hSup[p]);
    const w = unchecked(hWHalf[p]), id = unchecked(hId[p]);
    const a0 = unchecked(hX0[p]), a1 = unchecked(hX1[p]);
    let q = p;
    while (q > 0 && unchecked(hSup[q - 1]) < s) {
      unchecked(hFoot[q] = unchecked(hFoot[q - 1])); unchecked(hD[q] = unchecked(hD[q - 1]));
      unchecked(hSup[q] = unchecked(hSup[q - 1])); unchecked(hWHalf[q] = unchecked(hWHalf[q - 1]));
      unchecked(hId[q] = unchecked(hId[q - 1])); unchecked(hX0[q] = unchecked(hX0[q - 1]));
      unchecked(hX1[q] = unchecked(hX1[q - 1]));
      q--;
    }
    unchecked(hFoot[q] = f); unchecked(hD[q] = d); unchecked(hSup[q] = s);
    unchecked(hWHalf[q] = w); unchecked(hId[q] = id);
    unchecked(hX0[q] = a0); unchecked(hX1[q] = a1);
  }

  let kept: i32 = 0;
  for (let p = 0; p < nHits; p++) {
    const f = unchecked(hFoot[p]), w = unchecked(hWHalf[p]);
    let clash: bool = false;
    for (let k = 0; k < kept; k++) {
      const kw = unchecked(hWHalf[k]);
      const bigger = kw > w ? kw : w;
      if (Math.abs(unchecked(hFoot[k]) - f) < 0.6 * bigger) { clash = true; break; }
    }
    if (clash) continue;
    if (kept != p) {
      unchecked(hFoot[kept] = f); unchecked(hD[kept] = unchecked(hD[p]));
      unchecked(hSup[kept] = unchecked(hSup[p])); unchecked(hWHalf[kept] = w);
      unchecked(hId[kept] = unchecked(hId[p])); unchecked(hX0[kept] = unchecked(hX0[p]));
      unchecked(hX1[kept] = unchecked(hX1[p]));
    }
    kept++;
  }
  nHits = kept;
  return kept;
}

initLayout();
