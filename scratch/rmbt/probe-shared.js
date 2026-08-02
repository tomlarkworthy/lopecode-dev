// Shared pieces of the mark-redesign prototype: colors, seeded rng, the
// synthetic scan-line renderer, and the involution stage (mirror pairing +
// fixed points), which is design-independent.
export const DARK = 25, LIGHT = 230, BG = 128; // whole page mid-gray

export const mulberry32 = (a) => () => {
  a |= 0; a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

// x(k) = xc + S·k/(1 - eps·k); asym = right/left apparent halfwidth at the rim
export function renderRow({ color, R, d, W, blur, noise, asym, seed }) {
  const kR = Math.sqrt(Math.max(0, R * R - d * d));
  if (kR < 0.5) return null;
  const eps = (asym - 1) / ((asym + 1) * kR);
  const S = (W * (1 - eps * kR)) / kR;
  const xL = (S * kR) / (1 + eps * kR), xR = (S * kR) / (1 - eps * kR);
  const pad = 25;
  const Wimg = Math.ceil(xL + xR + 2 * pad);
  const xc = pad + xL;
  const SS = 4;
  const hi = new Float64Array(Wimg * SS);
  for (let i = 0; i < Wimg * SS; i++) {
    const x = (i + 0.5) / SS - xc;
    const den = S + eps * x;
    let v = BG;
    if (Math.abs(den) > 1e-9) {
      const k = x / den;
      if (Math.abs(eps * k) < 0.999) v = color(Math.sqrt(k * k + d * d));
    }
    hi[i] = v;
  }
  const row = new Float64Array(Wimg);
  for (let i = 0; i < Wimg; i++) {
    let s = 0;
    for (let j = 0; j < SS; j++) s += hi[i * SS + j];
    row[i] = s / SS;
  }
  const rad = Math.max(1, Math.ceil(3 * blur));
  const ker = new Float64Array(2 * rad + 1);
  let ks = 0;
  for (let i = -rad; i <= rad; i++) ks += ker[i + rad] = Math.exp((-i * i) / (2 * blur * blur));
  const out = new Uint8Array(Wimg);
  const rnd = mulberry32(seed);
  const gauss = () => {
    const u = Math.max(1e-12, rnd()), v = rnd();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  for (let i = 0; i < Wimg; i++) {
    let s = 0;
    for (let j = -rad; j <= rad; j++) {
      const ii = Math.min(Wimg - 1, Math.max(0, i + j));
      s += row[ii] * ker[j + rad];
    }
    out[i] = Math.max(0, Math.min(255, Math.round(s / ks + noise * gauss())));
  }
  return { row: out, xc, S, eps, Wimg };
}

// ---------------------------------------------------------- involution stage
const involutionFrom = (x1, x1p, x2, x2p) => {
  const r1 = [x1 * x1p, x1 + x1p, 1];
  const r2 = [x2 * x2p, x2 + x2p, 1];
  return [
    r1[1] * r2[2] - r1[2] * r2[1],
    r1[2] * r2[0] - r1[0] * r2[2],
    r1[0] * r2[1] - r1[1] * r2[0]
  ];
};
const fixedPoints = ([al, be, ga], span) => {
  if (Math.abs(al) * span < 1e-4 * Math.abs(be)) return { P: -ga / (2 * be), Q: Infinity };
  const disc = be * be - al * ga;
  if (disc <= 0) return null;
  const sq = Math.sqrt(disc);
  return { P: (-be + sq) / al, Q: (-be - sq) / al };
};
// mirror pairing + involution: bounded enumeration from the ends inward,
// opposite gradient signs, non-crossing; P-inside/Q-outside gates; verified
// against every edge. Returns pairs with u = c²(r²-d²) and right-edge sign.
export function findInvolution(edges, opts = {}) {
  const n = edges.length;
  if (n < 6) return null;
  const xs = edges.map((e) => e.x), ss = edges.map((e) => e.s);
  const span = xs[n - 1] - xs[0];
  const tolPx = opts.tolPx ?? 1.1;
  const minInliers = opts.minInliers ?? 6;
  let best = null;
  const consider = (i, j, a, b) => {
    if (ss[i] === ss[j] || ss[a] === ss[b]) return;
    const inv = involutionFrom(xs[i], xs[j], xs[a], xs[b]);
    const fp = fixedPoints(inv, span);
    if (!fp) return;
    let { P, Q } = fp;
    const mid = (xs[i] + xs[j]) / 2;
    if (isFinite(Q) && Math.abs(P - mid) > Math.abs(Q - mid)) { const t = P; P = Q; Q = t; }
    if (!(P > xs[i] && P < xs[j] && P > xs[a] && P < xs[b])) return;
    if (isFinite(Q) && Q > xs[i] - 0.02 * span && Q < xs[j] + 0.02 * span) return;
    const affine = !isFinite(Q);
    const img = affine ? (x) => 2 * P - x : (x) => -(inv[1] * x + inv[2]) / (inv[0] * x + inv[1]);
    let inl = 0;
    const pairs = [];
    for (let e = 0; e < n; e++) {
      if (xs[e] >= P) break;
      const y = img(xs[e]);
      if (!isFinite(y)) continue;
      let bi = -1, bd = Infinity;
      for (let f = n - 1; f >= 0 && xs[f] > P; f--) {
        const dd = Math.abs(xs[f] - y);
        if (dd < bd && ss[f] === -ss[e]) { bd = dd; bi = f; }
      }
      if (bi >= 0 && bd <= tolPx) { inl += 2; pairs.push([e, bi]); }
    }
    if (inl >= minInliers && (!best || inl > best.inl)) best = { P, Q, affine, inl, pairs };
  };
  for (let i = 0; i < Math.min(3, n); i++)
    for (let j = n - 1; j >= Math.max(n - 3, i + 3); j--) {
      if (ss[i] === ss[j]) continue;
      for (let a = i + 1; a <= Math.min(i + 4, j - 2); a++)
        for (let b = j - 1; b >= Math.max(j - 4, a + 1); b--) consider(i, j, a, b);
    }
  if (!best) return null;
  const { P, Q, affine } = best;
  const tOf = affine ? (x) => x - P : (x) => (x - P) / (x - Q);
  const up = best.pairs
    .map(([e, f]) => ({ u: -tOf(xs[e]) * tOf(xs[f]), e, f, sR: ss[f] }))
    .filter((p) => p.u > 0)
    .sort((a, b) => a.u - b.u);
  return up.length >= 3 ? { P, Q, up, inl: best.inl, xs, ss } : null;
}
