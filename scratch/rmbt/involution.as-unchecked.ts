// An AssemblyScript port of @tomlarkworthy/coded-landmark-tracking's
// findInvolution, to be measured against the JS it came from and against the
// Zig port beside it (involution.zig).
//
// The reason to prefer this over Zig is not speed, it is that it is a LITERAL
// transcription. Compare the two ports on the same loop:
//
//   JS    for (let f = n - 1; f >= 0 && xs[f] > P; f--)
//   AS    for (let f = n - 1; f >= 0 && xs[f] > P; f--)
//   Zig   var f: usize = n; while (f > 0) { f -= 1; if (!(xs[f] > P)) break; ... }
//
// Zig's usize is unsigned, so every countdown loop needs an underflow guard
// and stops looking like the thing it is a port of. That matters because
// poolAgreement's job is to convince a reader that two implementations are the
// same algorithm; a reader can diff this against the cell, and mostly cannot
// diff the Zig against anything.
//
// BUILD -- in a browser, which is the point (see ascc.ts):
//   bun scratch/rmbt/ascc.ts scratch/rmbt/involution.as.ts out.wasm -O3 --runtime stub
//
// Verify before trusting any rebuild:
//   bun scratch/rmbt/bench-involution.ts --wasm out.wasm
// which checks agreement against 42984 recorded real calls BEFORE reporting a
// speed, because a faster wrong answer is not interesting.

const MAXE: i32 = 64;

// Fixed buffers, written from JS through the exported pointers below. Nothing
// is allocated per call: a detector that allocates per row on a phone is not a
// detector worth having, and `--runtime stub` means there is no collector to
// hand it back to anyway.
const xs = new StaticArray<f64>(MAXE);
const ss = new StaticArray<i32>(MAXE);
const uOut = new StaticArray<f64>(MAXE);
const pe = new StaticArray<i32>(MAXE);
const pf = new StaticArray<i32>(MAXE);
const bpe = new StaticArray<i32>(MAXE);
const bpf = new StaticArray<i32>(MAXE);

let outP: f64 = 0;
let outQ: f64 = 0;
let nUp: i32 = 0;

let haveBest: bool = false;
let bestInl: i32 = 0;
let bestP: f64 = 0;
let bestQ: f64 = 0;
let bAffine: bool = false;
let bnp: i32 = 0;

export function xsPtr(): usize { return changetype<usize>(xs); }
export function ssPtr(): usize { return changetype<usize>(ss); }
export function uPtr(): usize { return changetype<usize>(uOut); }
export function getP(): f64 { return outP; }
export function getQ(): f64 { return outQ; }
export function getNUp(): i32 { return nUp; }

function consider(n: i32, span: f64, i: i32, j: i32, a: i32, b: i32, tolPx: f64, minInliers: i32): void {
  if (unchecked(ss[i]) == unchecked(ss[j]) || unchecked(ss[a]) == unchecked(ss[b])) return;

  // involutionFrom(x1, x1p, x2, x2p), with r = [x*x', x+x', 1] and the third
  // component of each row constant at 1, so the cross product collapses.
  const x1 = unchecked(xs[i]), x1p = unchecked(xs[j]), x2 = unchecked(xs[a]), x2p = unchecked(xs[b]);
  const r10 = x1 * x1p, r11 = x1 + x1p;
  const r20 = x2 * x2p, r21 = x2 + x2p;
  const al = r11 - r21;
  const be = r20 - r10;
  const ga = r10 * r21 - r11 * r20;

  // fixedPoints
  let P: f64, Q: f64;
  if (Math.abs(al) * span < 1e-4 * Math.abs(be)) {
    P = -ga / (2 * be);
    Q = Infinity;
  } else {
    const disc = be * be - al * ga;
    if (!(disc > 0)) return; // JS: disc <= 0 -> null. NaN falls out here too.
    const sq = Math.sqrt(disc);
    P = (-be + sq) / al;
    Q = (-be - sq) / al;
  }

  const mid = (unchecked(xs[i]) + unchecked(xs[j])) / 2;
  if (isFinite(Q) && Math.abs(P - mid) > Math.abs(Q - mid)) {
    const t = P; P = Q; Q = t;
  }
  if (!(P > unchecked(xs[i]) && P < unchecked(xs[j]) && P > unchecked(xs[a]) && P < unchecked(xs[b]))) return;
  if (isFinite(Q) && Q > unchecked(xs[i]) - 0.02 * span && Q < unchecked(xs[j]) + 0.02 * span) return;
  const affine = !isFinite(Q);

  let inl: i32 = 0;
  let np: i32 = 0;
  for (let e = 0; e < n; e++) {
    if (unchecked(xs[e]) >= P) break;
    const y = affine ? 2 * P - unchecked(xs[e]) : -(be * unchecked(xs[e]) + ga) / (al * unchecked(xs[e]) + be);
    if (!isFinite(y)) continue;
    // Nearest opposite-sign edge right of P. Counts DOWN from n-1 taking
    // strictly-smaller distances, so among equal distances the HIGHER index
    // wins. A binary search here was tried in the JS and was not faster.
    let bi: i32 = -1;
    let bd: f64 = Infinity;
    for (let f = n - 1; f >= 0 && unchecked(xs[f]) > P; f--) {
      const dd = Math.abs(unchecked(xs[f]) - y);
      if (dd < bd && unchecked(ss[f]) == -unchecked(ss[e])) { bd = dd; bi = f; }
    }
    if (bi >= 0 && bd <= tolPx) { inl += 2; unchecked(pe[np] = e); unchecked(pf[np] = bi); np++; }
  }
  if (inl >= minInliers && (!haveBest || inl > bestInl)) {
    haveBest = true;
    bestInl = inl;
    bestP = P;
    bestQ = Q;
    bAffine = affine;
    bnp = np;
    for (let c = 0; c < np; c++) { unchecked(bpe[c] = unchecked(pe[c])); unchecked(bpf[c] = unchecked(pf[c])); }
  }
}

// Returns the inlier count, or -1 for the JS `null`.
export function run(n: i32, tolPx: f64, minInliers: i32): i32 {
  outP = 0; outQ = 0; nUp = 0;
  haveBest = false; bestInl = 0; bnp = 0;
  if (n < 6 || n > MAXE) return -1;

  const span = unchecked(xs[n - 1]) - unchecked(xs[0]);
  const iMax = n < 3 ? n : 3;
  for (let i = 0; i < iMax; i++) {
    const loJ = n - 3 > i + 3 ? n - 3 : i + 3;
    for (let j = n - 1; j >= loJ; j--) {
      if (unchecked(ss[i]) == unchecked(ss[j])) continue;
      const aMax = i + 4 < j - 2 ? i + 4 : j - 2;
      for (let a = i + 1; a <= aMax; a++) {
        const loB = j - 4 > a + 1 ? j - 4 : a + 1;
        for (let b = j - 1; b >= loB; b--) consider(n, span, i, j, a, b, tolPx, minInliers);
      }
    }
  }
  if (!haveBest) return -1;

  // u per mirror pair via the geometric mean: t_L = -c k, t_R = +c k
  let m: i32 = 0;
  for (let k = 0; k < bnp; k++) {
    const xe = unchecked(xs[unchecked(bpe[k])]), xf = unchecked(xs[unchecked(bpf[k])]);
    const te = bAffine ? xe - bestP : (xe - bestP) / (xe - bestQ);
    const tf = bAffine ? xf - bestP : (xf - bestP) / (xf - bestQ);
    const u = -te * tf;
    if (u > 0) { unchecked(uOut[m] = u); m++; }
  }
  // ascending by u; insertion sort, stable, m is tiny
  for (let p = 1; p < m; p++) {
    const v = unchecked(uOut[p]);
    let q = p;
    while (q > 0 && unchecked(uOut[q - 1]) > v) { unchecked(uOut[q] = unchecked(uOut[q - 1])); q--; }
    unchecked(uOut[q] = v);
  }
  if (m < 3) return -1;

  outP = bestP;
  outQ = bestQ;
  nUp = m;
  return bestInl;
}
