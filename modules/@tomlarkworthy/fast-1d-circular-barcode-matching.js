const _rqg12o = function _1(md){return(
md`# Fast 1D Circular Barcode Matching
## with the Möbius transform


The aim of this notebook is to prototype a way of quickly detecting the center and tilt of a circular barcode passing through a scan line. This will be a building block of a localization algorithm.

Part II of a long quest to create a cheap high speed optical localization system. Part I is [here](https://observablehq.com/@tomlarkworthy/circular-barcode-simulator).`
)};
const _16djjaz = function _3(md){return(
md`### Final Matched Barcode projection
It works! If the scanline passed through the centre of a circular barcode, this matches the pattern.`
)};
const _1o1419n = function _4(Plot,width,autoFitProjectedTemplate){return(
Plot.plot({
  width,
  height: 100,
  y: { axis: false },
  x: {
    domain: [0, width]
  },
  marks: [
    Plot.tickX(autoFitProjectedTemplate, {
      x: (d) => d.x
    })
  ]
})
)};
const _s99oxw = function _5($0){return(
$0
)};
const _1c88ng4 = function _6(canvas,htl){return(
htl.html`<div style="scale: 0.96">
  ${canvas}
</div>`
)};
const _1x7s9wa = function _7(md){return(
md`## Implementation`
)};
const _1jywh6e = function _8(md){return(
md`#### Pixel intensity through scan line`
)};
const _7i6etb = function _scanLinePlot(Plot,width,scanLineBuffer){return(
Plot.plot({
  width,
  marks: [Plot.tickX(scanLineBuffer, { x: (d, i) => i, stroke: (d) => d })]
})
)};
const _1uk6uik = (G, _) => G.input(_);
const _19cwf4f = function _scanLineBuffer(scanline){return(
new Uint8Array(scanline.map((p) => p.v))
)};
const _p8t4dn = function _scanEdges(edges1D,scanLineBuffer){return(
edges1D(scanLineBuffer, 20)
)};
const _1or7r4n = function _12(md){return(
md`#### (manual) Find three known edges`
)};
const _1p2gokx = async function _13(FileAttachment,md){return(
md`In the three charts below, click the leftmost side of the a barcode's circular pattern, the rightmost side and then the right of the middle as the three rings to fit mobius to. The larger point of this notebook is to figure out an efficient way to initialize the algorithm *without* manual initialization, but to get there it is useful to first concentrate on the easier problem of an already initialized fit.

<details>
  <summary>example</summary>
  ![image.png](${await FileAttachment("image.png").url()})
</details>`
)};
const _1k5n2da = function _leftmost(Plot,width,scanEdges){return(
Plot.plot({
  width,
  x: {
    domain: [0, width]
  },
  marks: [
    Plot.tickX(scanEdges, { x: (d) => d.x, stroke: (d) => d.s, tip: true }),
    Plot.dot(scanEdges, Plot.pointer({ x: (d) => d.x }))
  ]
})
)};
const _1su3eiy = (G, _) => G.input(_);
const _r6wqzq = function _rightmost(Plot,width,scanEdges){return(
Plot.plot({
  width,
  x: {
    domain: [0, width]
  },
  marks: [
    Plot.tickX(scanEdges, { x: (d) => d.x, stroke: (d) => d.s, tip: true }),
    Plot.dot(scanEdges, Plot.pointer({ x: (d) => d.x }))
  ]
})
)};
const _35rys7 = (G, _) => G.input(_);
const _1t9qch2 = function _middle_right(Plot,width,scanEdges){return(
Plot.plot({
  width,
  x: {
    domain: [0, width]
  },
  marks: [
    Plot.tickX(scanEdges, { x: (d) => d.x, stroke: (d) => d.s, tip: true }),
    Plot.dot(scanEdges, Plot.pointer({ x: (d) => d.x }))
  ]
})
)};
const _17uxcek = (G, _) => G.input(_);
const _1by6ej5 = function _17(md){return(
md`#### Initial Mobius Fit to 3 anchors`
)};
const _14bvwex = function _18(md){return(
md`Predicted template positions given pqrs fit to anchors.`
)};
const _jxmbv9 = function _19(Plot,width,template_projection){return(
Plot.plot({
  width,
  height: 100,
  y: { axis: false },
  x: {
    domain: [0, width]
  },
  marks: [
    Plot.tickX(template_projection, {
      x: (d) => d.x
    })
  ]
})
)};
const _148tv4m = function _20(md){return(
md`##### Residuals on initial template fit`
)};
const _plvrpg = function _21(Plot,width,initialAlignment){return(
Plot.plot({
  width,
  height: 100,
  color: {
    domain: [0, 1]
  },
  x: {
    domain: [0, width]
  },
  marks: [
    Plot.ruleX(initialAlignment.pairs, {
      x: (d) => d.xt,
      y: (d) => (d.cost == 20 ? 0 : d.cost),
      stroke: (d) => (d.cost == 20 ? 0 : d.cost)
    })
  ]
})
)};
const _g5aybm = function _22(md){return(
md`### Least squares Möbius fit to template match`
)};
const _1j19trh = function _23(Plot,width,mobiusLSFit){return(
Plot.plot({
  width,
  height: 100,
  y: { axis: false },
  x: {
    domain: [0, width]
  },
  marks: [
    Plot.tickX(mobiusLSFit.fittedProjection, {
      x: (d) => d.x
    })
  ]
})
)};
const _2eif1j = function _24(mobiusLSFit,md){return(
md`##### Residuals on LS template fit: kRMSE ${mobiusLSFit.kRMSE}`
)};
const _gd09vp = function _25(Plot,width,residualsLS){return(
Plot.plot({
  width,
  height: 100,
  color: {
    domain: [0, 1]
  },
  x: {
    domain: [0, width]
  },
  marks: [
    Plot.ruleX(residualsLS, {
      x: (d) => d.x,
      y: (d) => (d.cost == 20 ? 0 : d.cost),
      stroke: (d) => (d.cost == 20 ? 0 : d.cost)
    })
  ]
})
)};
const _1byj22z = function _26(md){return(
md`# Code`
)};
const _1e64kk9 = function _27(md){return(
md`### fit a Möbius transform to three points`
)};
const _pgr881 = function _fitMobius(){return(
function fitMobius(pairs) {
  if (pairs.length < 3) throw new Error("need >=3 pairs");
  const a = pairs[0],
    b = pairs[1],
    c = pairs[2];
  // guard degeneracies
  if (a.x === b.x || a.x === c.x || b.x === c.x)
    throw new Error("x must be distinct");
  if (b.k === a.k || b.k === c.k) throw new Error("k must satisfy B≠A and B≠C");

  const A = a.k,
    B = b.k,
    C = c.k;
  const alpha = (B - C) / (B - A);

  // M(z) = CR(z; a.x,b.x,c.x) = ((b-c)z - (b-c)a) / ((b-a)z - (b-a)c)
  const m11 = b.x - c.x;
  const m12 = -a.x * (b.x - c.x);
  const m21 = b.x - a.x;
  const m22 = -c.x * (b.x - a.x);

  // L(w) = (C w - alpha A) / (w - alpha)  maps {0,1,∞} -> {A,B,C}
  const l11 = C,
    l12 = -alpha * A,
    l21 = 1,
    l22 = -alpha;

  // Composition T = L ∘ M  ⇒  [p q; r s] = L · M  (up to scale)
  let p = l11 * m11 + l12 * m21;
  let q = l11 * m12 + l12 * m22;
  let r = l21 * m11 + l22 * m21;
  let s = l21 * m12 + l22 * m22;

  // normalize scale
  if (Math.abs(s) > 1e-12) {
    p /= s;
    q /= s;
    r /= s;
    s = 1;
  } else {
    const norm = Math.hypot(p, q, r, s) || 1;
    p /= norm;
    q /= norm;
    r /= norm;
    s /= norm;
  }
  return { p, q, r, s };
}
)};
const _1q7w5ww = function _pqrs(fitMobius,leftmost,middle_right,rightmost){return(
fitMobius([
  { ...leftmost, k: -27 },
  { ...middle_right, k: 5 },
  { ...rightmost, k: 27 }
])
)};
const _148jsv2 = function _30(md){return(
md`### Predict template edges given fit`
)};
const _mic2ph = function _template_edges(binaryToEdges,template){return(
binaryToEdges(template)
)};
const _1sqgm2r = function _xFromK(){return(
function xFromK(pqrs, k) {
  const denom = k * pqrs.r - pqrs.p;
  if (Math.abs(denom) < 1e-12) return NaN; // parallel / undefined
  return (pqrs.q - k * pqrs.s) / denom;
}
)};
const _15g998g = function _template_projection(template_edges,xFromK,pqrs){return(
template_edges.map((k) => ({ k, x: xFromK(pqrs, k) }))
)};
const _1acy93z = function _34(md){return(
md`### Obtain closest matching edges to initial Möbius estimate`
)};
const _13xv6pn = function _dpAlign(){return(
function dpAlign(template, scan, opts = {}) {
  // Needleman-Wunsch style dynamic programming alignment for 1D positions.
  // template: array of numbers or objects with .x and optional .s (polarity)
  // scan:     array of numbers or objects with .x and optional .s (polarity)
  // opts:
  //   gapPenalty (number) default 20
  //   polarityPenalty (number) default 50
  //   matchCost (fn) optional custom cost fn (xt, xs) -> number; defaults to abs difference
  //   matchThreshold (number) if provided, matches with cost > threshold are discouraged (treated normally by DP)
  const {
    gapPenalty = 20,
    polarityPenalty = 50,
    matchCost = (a, b) => Math.abs(a - b),
    matchThreshold = Infinity
  } = opts;

  const N = template.length,
    M = scan.length;
  // helpers to extract x and polarity
  const getX = (v) =>
    typeof v === "number" ? v : v && ("x" in v ? v.x : v.x === 0 ? 0 : v);
  const getS = (v) =>
    typeof v === "number"
      ? v
      : v && "s" in v
      ? v.s
      : v && "sign" in v
      ? v.sign
      : 0;

  // DP matrices: use flat arrays for speed
  const rows = N + 1,
    cols = M + 1;
  const D = new Float64Array(rows * cols); // cost matrix
  const PTR = new Int8Array(rows * cols); // 0 = diag, 1 = up (delete template / gap in scan), 2 = left (insert / gap in template)

  const idx = (i, j) => i * cols + j;

  // initialize
  for (let i = 1; i <= N; i++) {
    D[idx(i, 0)] = i * gapPenalty;
    PTR[idx(i, 0)] = 1; // from up
  }
  for (let j = 1; j <= M; j++) {
    D[idx(0, j)] = j * gapPenalty;
    PTR[idx(0, j)] = 2; // from left
  }

  // fill
  for (let i = 1; i <= N; i++) {
    const xt = getX(template[i - 1]);
    const st = getS(template[i - 1]);
    for (let j = 1; j <= M; j++) {
      const xs = getX(scan[j - 1]);
      const ss = getS(scan[j - 1]);
      let mcost = matchCost(xt, xs);
      // polarity penalty (if either side has a defined sign and they differ)
      if (st && ss && Math.sign(st) !== Math.sign(ss)) mcost += polarityPenalty;
      // match threshold can be used by caller to interpret results (we don't hard forbid >threshold here)
      const diag = D[idx(i - 1, j - 1)] + mcost;
      const up = D[idx(i - 1, j)] + gapPenalty; // skip template[i-1]
      const left = D[idx(i, j - 1)] + gapPenalty; // skip scan[j-1]
      // choose minimum (prefer diag on ties, then up)
      let best = diag,
        ptr = 0;
      if (up < best || (up === best && ptr !== 0 && ptr !== 1)) {
        best = up;
        ptr = 1;
      }
      if (left < best) {
        best = left;
        ptr = 2;
      }
      D[idx(i, j)] = best;
      PTR[idx(i, j)] = ptr;
    }
  }

  // backtrace
  let i = N,
    j = M;
  const pairs = []; // aligned pairs (ti, sj, cost)
  while (i > 0 || j > 0) {
    const p = PTR[idx(i, j)];
    if (p === 0) {
      // diagonal => match template[i-1] with scan[j-1]
      const xt = getX(template[i - 1]),
        xs = getX(scan[j - 1]);
      let c = matchCost(xt, xs);
      const st = getS(template[i - 1]),
        ss = getS(scan[j - 1]);
      if (st && ss && Math.sign(st) !== Math.sign(ss)) c += polarityPenalty;
      pairs.push({ ti: i - 1, sj: j - 1, cost: c, xt, xs, st, ss });
      i--;
      j--;
    } else if (p === 1) {
      // up => gap in scan (template element skipped)
      pairs.push({
        ti: i - 1,
        sj: null,
        cost: gapPenalty,
        xt: getX(template[i - 1]),
        xs: null,
        st: getS(template[i - 1]),
        ss: null
      });
      i--;
    } else {
      // left => gap in template (scan element skipped)
      pairs.push({
        ti: null,
        sj: j - 1,
        cost: gapPenalty,
        xt: null,
        xs: getX(scan[j - 1]),
        st: null,
        ss: getS(scan[j - 1])
      });
      j--;
    }
  }
  pairs.reverse();

  // Build template->scan mapping (one-to-one or null). If multiple matches to same scan occur (shouldn't for NW),
  // prefer the diagonal matches.
  const templateToScan = new Array(N).fill(null);
  const scanToTemplate = new Array(M).fill(null);
  for (const p of pairs) {
    if (p.ti != null && p.sj != null) {
      templateToScan[p.ti] = p.sj;
      scanToTemplate[p.sj] = p.ti;
    }
  }

  return {
    score: D[idx(N, M)],
    pairs,
    templateToScan,
    scanToTemplate,
    // expose DP dimensions so caller can inspect if desired
    N,
    M
  };
}
)};
const _898krp = function _initialAlignment(dpAlign,template_projection,scanEdges){return(
dpAlign(
  template_projection.map((t) => t.x),
  scanEdges.map((s) => s.x)
)
)};
const _ll5zgn = function _37(md){return(
md`### Least squares mobius fit to paired edges`
)};
const _xenhd5 = function _fitMobiusLS(SVD){return(
function fitMobiusLS(pairs) {
  const N = pairs.length;
  if (N < 3) throw new Error("need >=3 points");

  // Build A as N×4 array
  const A = new Array(N);
  for (let i = 0; i < N; i++) {
    const { x, k } = pairs[i];
    A[i] = [x, 1, -k * x, -k];
  }

  // SVD: A = U Σ Vᵀ
  const { v } = SVD(A);

  // v is 4×4; columns are right singular vectors
  // The column corresponding to the smallest singular value is the nullspace vector
  const smallestColIndex = 3; // svd-js returns singular values in descending order
  let p = v[0][smallestColIndex];
  let q = v[1][smallestColIndex];
  let r = v[2][smallestColIndex];
  let s = v[3][smallestColIndex];

  // normalize so s = 1
  if (Math.abs(s) > 1e-12) {
    p /= s;
    q /= s;
    r /= s;
    s = 1;
  }

  return { p, q, r, s };
}
)};
const _1tc6nqw = function _mobiusLSFit(initialAlignment,scanEdges,template_projection,fitMobiusLS,xFromK)
{
  const matches = initialAlignment.pairs.filter(
    (p) => p.ti != null && p.sj != null
  );
  const pairs = matches.map((p) => ({
    x: scanEdges[p.sj].x,
    k: template_projection[p.ti].k
  }));
  if (pairs.length < 3) throw new Error("need >=3 matched pairs for mobiusLS");
  const mobiusLS = fitMobiusLS(pairs);
  // compute residuals in k-space (mapped k from x) and attach diagnostics
  const { p, q, r, s } = mobiusLS;
  const kErrs = pairs.map(({ x, k }) => {
    const khat = (p * x + q) / (r * x + s);
    return khat - k;
  });
  const kRMSE = Math.sqrt(kErrs.reduce((a, b) => a + b * b, 0) / kErrs.length);
  const fittedProjection = template_projection.map((t) => ({
    k: t.k,
    x: xFromK(mobiusLS, t.k)
  }));
  mobiusLS.kRMSE = kRMSE;
  mobiusLS.pairsUsed = pairs.length;
  mobiusLS.fittedProjection = fittedProjection;
  return mobiusLS;
};
const _odlpzv = function _calculatLSResiduals(initialAlignment,template_projection,scanEdges){return(
function calculatLSResiduals(fitted) {
  const N = fitted.length;
  const map = initialAlignment.templateToScan || [];
  const out = new Array(N);
  for (let i = 0; i < N; i++) {
    const tplX = template_projection[i].x;
    const predX = fitted[i] ? fitted[i].x : NaN;
    const sj = map[i];
    if (sj != null) {
      const actualX = scanEdges[sj].x;
      out[i] = {
        x: tplX,
        cost: Math.abs(predX - actualX),
        matched: true,
        predictedX: predX,
        actualX
      };
    } else {
      out[i] = {
        x: tplX,
        cost: 20,
        matched: false,
        predictedX: predX,
        actualX: null
      };
    }
  }
  return out;
}
)};
const _kjfy08 = function _residualsLS(calculatLSResiduals,mobiusLSFit){return(
calculatLSResiduals(mobiusLSFit.fittedProjection)
)};
const _6srd6h = function _42(md){return(
md`## Auto fit anchors`
)};
const _1nr38p5 = function _computeAnchorCandidatesFast(fitMobiusLS){return(
function computeAnchorCandidatesFast(
  template_edges,
  scanEdges,
  opts = {}
) {
  const kSorted = template_edges.slice().sort((a, b) => a - b);
  if (kSorted.length < 4) throw new Error("need >=4 template edges");
  const kMin = kSorted[0],
    kMax = kSorted[kSorted.length - 1],
    kLeftInner = kSorted[1],
    kRightInner = kSorted[kSorted.length - 2];
  const sLen = scanEdges.length;
  if (sLen < 4) return [];
  const innerExpected = kSorted.length - 2;
  const minBetween = Math.max(2, opts.minBetween ?? innerExpected - 1);
  const maxBetween = Math.min(sLen - 2, opts.maxBetween ?? innerExpected + 1);
  const topK = opts.topK ?? 10;
  const scanX = scanEdges.map((e) => (typeof e === "number" ? e : e.x));
  const candidates = [];
  for (let i = 0; i < sLen - 1; i++) {
    const jMin = i + 1 + minBetween;
    const jMax = Math.min(sLen - 1, i + 1 + maxBetween);
    if (jMin >= sLen) continue;
    for (let j = jMin; j <= jMax; j++) {
      if (i + 1 >= j) continue;
      const pairs4 = [
        { x: scanX[i], k: kMin },
        { x: scanX[i + 1], k: kLeftInner },
        { x: scanX[j - 1], k: kRightInner },
        { x: scanX[j], k: kMax }
      ];
      let mob;
      try {
        mob = fitMobiusLS(pairs4);
        if (
          !(
            isFinite(mob.p) &&
            isFinite(mob.q) &&
            isFinite(mob.r) &&
            isFinite(mob.s)
          )
        )
          continue;
      } catch {
        continue;
      }
      const kErrs = new Array(pairs4.length);
      let bad = false;
      for (let t = 0; t < pairs4.length; t++) {
        const x = pairs4[t].x,
          k = pairs4[t].k;
        const den = mob.r * x + mob.s;
        if (Math.abs(den) < 1e-12) {
          bad = true;
          kErrs[t] = Infinity;
        } else {
          const khat = (mob.p * x + mob.q) / den;
          kErrs[t] = khat - k;
        }
      }
      const finiteErrs = kErrs.filter((v) => isFinite(v));
      const kRMSE = finiteErrs.length
        ? Math.sqrt(
            finiteErrs.reduce((a, b) => a + b * b, 0) / finiteErrs.length
          )
        : Infinity;
      candidates.push({
        startIndex: i,
        endIndex: j,
        pairs4,
        mobiusInitial: mob,
        kRMSE
      });
    }
  }
  candidates.sort((a, b) => {
    const ka = a.kRMSE === undefined ? Infinity : a.kRMSE;
    const kb = b.kRMSE === undefined ? Infinity : b.kRMSE;
    return ka - kb;
  });
  return candidates.slice(0, topK);
}
)};
const _gcrirj = function _anchorCandidatesFast(computeAnchorCandidatesFast,template_edges,scanEdges){return(
computeAnchorCandidatesFast(template_edges, scanEdges, {
  topK: 20
})
)};
const _u7zfvr = function _refineAnchorCandidates(xFromK,dpAlign,fitMobiusLS){return(
function refineAnchorCandidates(
  candidates,
  template_edges,
  scanEdges,
  opts = {}
) {
  const topK = opts.topK ?? candidates.length;
  if (!Array.isArray(candidates) || candidates.length === 0) return [];
  const kSorted = template_edges.slice().sort((a, b) => a - b);
  const scanX = scanEdges.map((e) => (typeof e === "number" ? e : e.x));
  const dpOpts = {
    gapPenalty: opts.gapPenalty ?? 20,
    polarityPenalty: opts.polarityPenalty ?? 0,
    matchCost: (a, b) => Math.abs(a - b),
    matchThreshold: Infinity
  };
  const out = [];
  for (const cand of candidates) {
    const mobInit = cand.mobiusInitial ?? cand.mobius;
    if (!mobInit) continue;
    const proj = kSorted.map((k) => {
      const x = xFromK(mobInit, k);
      return x;
    });
    const alignment = dpAlign(proj, scanX, dpOpts);
    const map = alignment.templateToScan || [];
    const matchedPairs = [];
    for (let t = 0; t < kSorted.length; t++) {
      const sIdx = map[t];
      if (sIdx != null) matchedPairs.push({ x: scanX[sIdx], k: kSorted[t] });
    }
    if (matchedPairs.length < 3) continue;
    let mobRefined;
    try {
      mobRefined = fitMobiusLS(matchedPairs);
    } catch {
      continue;
    }
    const { p, q, r, s } = mobRefined;
    const kErrs = [];
    const xErrs = [];
    for (let t = 0; t < kSorted.length; t++) {
      const sIdx = map[t];
      if (sIdx == null) continue;
      const x = scanX[sIdx];
      const kTrue = kSorted[t];
      const den = r * x + s;
      if (!isFinite(den) || Math.abs(den) < 1e-12) continue;
      const khat = (p * x + q) / den;
      kErrs.push(khat - kTrue);
      const predX = xFromK(mobRefined, kTrue);
      if (isFinite(predX)) xErrs.push(predX - x);
    }
    if (kErrs.length === 0) continue;
    const kRMSE = Math.sqrt(
      kErrs.reduce((a, b) => a + b * b, 0) / kErrs.length
    );
    const xRMSE = xErrs.length
      ? Math.sqrt(xErrs.reduce((a, b) => a + b * b, 0) / xErrs.length)
      : Infinity;
    out.push({
      startIndex: cand.startIndex,
      endIndex: cand.endIndex,
      pairs4: cand.pairs4,
      mobiusInitial: cand.mobiusInitial,
      mobiusRefined: mobRefined,
      kRMSE_full: kRMSE,
      xRMSE_full: xRMSE,
      pairsUsed: matchedPairs.length
    });
  }
  out.sort(
    (a, b) => a.kRMSE_full - b.kRMSE_full || a.xRMSE_full - b.xRMSE_full
  );
  return out.slice(0, topK);
}
)};
const _y073cq = function _autoFit(refineAnchorCandidates,anchorCandidatesFast,template_edges,scanEdges){return(
refineAnchorCandidates(
  anchorCandidatesFast,
  template_edges,
  scanEdges,
  {
    topK: 1
  }
)[0]
)};
const _jast58 = function _autoFitProjectedTemplate(autoFit,template_edges,xFromK)
{
  const mob =
    autoFit &&
    (autoFit.mobiusRefined ?? autoFit.mobiusInitial ?? autoFit.mobius);
  if (!mob) return [];
  return template_edges.map((k) => ({ k, x: xFromK(mob, k) }));
};
const _1t9w2wi = function _autoFitResiduals(autoFitProjectedTemplate,scanEdges,dpAlign)
{
  const projectedTemplate = autoFitProjectedTemplate;
  if (!projectedTemplate || projectedTemplate.length === 0) return [];
  const tplX = projectedTemplate.map((t) => t.x);
  const scanX = scanEdges.map((e) => (typeof e === "number" ? e : e.x));
  const alignment = dpAlign(tplX, scanX);
  const map = alignment.templateToScan || [];
  const out = new Array(projectedTemplate.length);
  for (let i = 0; i < projectedTemplate.length; i++) {
    const pred = projectedTemplate[i].x;
    const sj = map[i];
    if (sj != null) {
      const actual = scanX[sj];
      out[i] = {
        k: projectedTemplate[i].k,
        predictedX: pred,
        actualX: actual,
        cost: Math.abs(pred - actual),
        matched: true,
        sj
      };
    } else {
      out[i] = {
        k: projectedTemplate[i].k,
        predictedX: pred,
        actualX: null,
        cost: 20,
        matched: false,
        sj: null
      };
    }
  }
  return out;
};
const _1cyi05t = function _49(md){return(
md`## End to end function`
)};
const _1aahzmh = function _autoFitScanline(binaryToEdges,edges1D,computeAnchorCandidatesFast,refineAnchorCandidates,xFromK,dpAlign){return(
function autoFitScanline(scanLine, template, opts = {}) {
  if (!scanLine.length) throw new Error("scanLine must be an array");
  if (!Array.isArray(template))
    throw new Error(
      "template must be an array (either binary mask or template k-values)"
    );
  const edgeThr = opts.edgeThreshold ?? 6;
  const topK = opts.topK ?? 10;
  const topKRefine = opts.topKRefine ?? 5;
  const minBetween = opts.minBetween;
  const maxBetween = opts.maxBetween;
  const gapPenalty = opts.gapPenalty;
  const polarityPenalty = opts.polarityPenalty;
  let template_edges;
  if (opts.templateIsBinary === true) {
    template_edges = binaryToEdges(template);
  } else {
    const allZerosOnes = template.every((v) => v === 0 || v === 1);
    if (allZerosOnes) template_edges = binaryToEdges(template);
    else template_edges = template.slice();
  }
  const scanEdges = edges1D(scanLine, edgeThr);
  if (!scanEdges || scanEdges.length < 3)
    return {
      success: false,
      reason: "not_enough_scan_edges",
      scanEdges,
      template_edges
    };
  const candidates = computeAnchorCandidatesFast(template_edges, scanEdges, {
    topK,
    minBetween,
    maxBetween
  });
  const refined = refineAnchorCandidates(
    candidates,
    template_edges,
    scanEdges,
    {
      topK: topKRefine,
      gapPenalty,
      polarityPenalty
    }
  );
  const chosen =
    refined && refined.length
      ? refined[0]
      : candidates && candidates.length
      ? candidates[0]
      : null;
  const mob = chosen
    ? chosen.mobiusRefined ?? chosen.mobiusInitial ?? chosen.mobius
    : null;
  const projectedTemplate = mob
    ? template_edges.map((k) => ({ k, x: xFromK(mob, k) }))
    : [];
  const tplX = projectedTemplate.map((t) => t.x);
  const scanX = scanEdges.map((e) => (typeof e === "number" ? e : e.x));
  const alignment = dpAlign(tplX, scanX);
  const map = alignment.templateToScan || [];
  const residuals = projectedTemplate.map((t, i) => {
    const sj = map[i];
    if (sj != null) {
      const actual = scanX[sj];
      return {
        k: t.k,
        predictedX: t.x,
        actualX: actual,
        cost: Math.abs(t.x - actual),
        matched: true,
        sj
      };
    } else {
      return {
        k: t.k,
        predictedX: t.x,
        actualX: null,
        cost: 20,
        matched: false,
        sj: null
      };
    }
  });
  return {
    success: true,
    template_edges,
    scanEdges,
    candidates,
    refined,
    chosen,
    mobius: mob,
    projectedTemplate,
    alignment,
    residuals
  };
}
)};
const _1hbfvou = function _51(autoFitScanline,scanLineBuffer,template){return(
autoFitScanline(scanLineBuffer, template)
)};
const _16khtov = function _52(md){return(
md`---`
)};
const _13n9y5w = function _binaryToEdges(){return(
function binaryToEdges(arr) {
  const edges = [];
  const n = arr.length;

  // transitions
  for (let i = 1; i < n; i++) {
    if (arr[i] !== arr[i - 1]) edges.push(i);
  }

  return edges.map((i) => i - arr.length / 2);
}
)};
const _ezw55q = function _grey(renders,rgbaToGray,pixelBuffer)
{
  renders;
  return rgbaToGray(pixelBuffer);
};
const _gog39e = function _edges(renders,canny,grey,width)
{
  renders;
  return canny(grey, width);
};
const _j3mrme = function _test_fitMobius(fitMobius)
{
  // Ground truth params
  const p = 0.5,
    q = 2,
    r = 0.05,
    s = 1;

  // Make 4 points from the model
  const pts = [0, 10, 20, 30].map((x) => ({ x, k: (p * x + q) / (r * x + s) }));

  return fitMobius(pts);
};
const _besmmj = function _solve3(){return(
function solve3(A, b) {
  const [a, b1, c, d, e, f, g, h, i] = [
    A[0][0],
    A[0][1],
    A[0][2],
    A[1][0],
    A[1][1],
    A[1][2],
    A[2][0],
    A[2][1],
    A[2][2]
  ];
  const D = a * (e * i - f * h) - b1 * (d * i - f * g) + c * (d * h - e * g);
  if (Math.abs(D) < 1e-8) return [0, 0, 0];
  const dx =
    (b[0] * (e * i - f * h) -
      b1 * (b[1] * i - f * b[2]) +
      c * (b[1] * h - e * b[2])) /
    D;
  const dy =
    (a * (b[1] * i - f * b[2]) -
      b[0] * (d * i - f * g) +
      c * (d * b[2] - b[1] * g)) /
    D;
  const dz =
    (a * (e * b[2] - b[1] * h) -
      b1 * (d * b[2] - b[1] * g) +
      b[0] * (d * h - e * g)) /
    D;
  return [dx, dy, dz];
}
)};
const _1ue0q3u = function _sampleLine(){return(
function sampleLine(gray, w, cx, cy, theta, len) {
  const h = (gray.length / w) | 0;
  const dx = Math.cos(theta),
    dy = Math.sin(theta);
  const half = (len / 2) | 0;
  const out = new Float32Array(len);
  for (let t = -half, j = 0; j < len; t++, j++) {
    const xf = cx + t * dx,
      yf = cy + t * dy;
    const x0 = Math.floor(xf),
      y0 = Math.floor(yf);
    if (x0 < 0 || x0 >= w - 1 || y0 < 0 || y0 >= h - 1) {
      out[j] = 0;
      continue;
    }
    const a = xf - x0,
      b = yf - y0;
    const i = y0 * w + x0;
    const p00 = gray[i],
      p10 = gray[i + 1],
      p01 = gray[i + w],
      p11 = gray[i + w + 1];
    out[j] =
      (1 - a) * (1 - b) * p00 +
      a * (1 - b) * p10 +
      (1 - a) * b * p01 +
      a * b * p11;
  }
  return out;
}
)};
const _he5jvj = function _rgbaToGray(){return(
function rgbaToGray(rgba) {
  if (rgba.length % 4 !== 0) throw new Error("RGBA length not multiple of 4");
  const gray = new Uint8Array(rgba.length / 4);
  for (let i = 0, j = 0; i < rgba.length; i += 4, j++) {
    const r = rgba[i],
      g = rgba[i + 1],
      b = rgba[i + 2];
    gray[j] = (0.299 * r + 0.587 * g + 0.114 * b) | 0;
  }
  return gray;
}
)};
const _ejc6ez = function _canny(gaussianKernel1D,clamp){return(
function canny(src, w, opts = {}) {
  const { sigma = 1.0, low = 20, high = 60 } = opts;
  if (!Number.isInteger(w) || w <= 0)
    throw new Error("w must be positive integer");
  const h = (src.length / w) | 0;
  if (w * h !== src.length) throw new Error("buffer length not divisible by w");

  // 1) Gaussian blur, separable
  const k = gaussianKernel1D(sigma);
  const tmp = new Float32Array(w * h);
  const blur = new Float32Array(w * h);

  // horizontal
  for (let y = 0; y < h; y++) {
    const base = y * w;
    for (let x = 0; x < w; x++) {
      let acc = 0;
      for (let i = -k.half; i <= k.half; i++) {
        const xx = clamp(x + i, 0, w - 1);
        acc += k.data[i + k.half] * src[base + xx];
      }
      tmp[base + x] = acc;
    }
  }
  // vertical
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      let acc = 0;
      for (let i = -k.half; i <= k.half; i++) {
        const yy = clamp(y + i, 0, h - 1);
        acc += k.data[i + k.half] * tmp[yy * w + x];
      }
      blur[y * w + x] = acc;
    }
  }

  // 2) Sobel gradients
  const gx = new Float32Array(w * h);
  const gy = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    const ym1 = Math.max(0, y - 1),
      yp1 = Math.min(h - 1, y + 1);
    for (let x = 0; x < w; x++) {
      const xm1 = Math.max(0, x - 1),
        xp1 = Math.min(w - 1, x + 1);
      const a = blur[ym1 * w + xm1],
        b = blur[ym1 * w + x],
        c = blur[ym1 * w + xp1];
      const d = blur[y * w + xm1],
        /* e = blur[y*w + x] */ f = blur[y * w + xp1];
      const g = blur[yp1 * w + xm1],
        hh = blur[yp1 * w + x],
        i = blur[yp1 * w + xp1];
      gx[y * w + x] = c + 2 * f + i - (a + 2 * d + g);
      gy[y * w + x] = g + 2 * hh + i - (a + 2 * b + c);
    }
  }

  // gradient magnitude (L2), scaled to 0..255 for thresholding
  const mag = new Float32Array(w * h);
  let maxMag = 0;
  for (let idx = 0; idx < mag.length; idx++) {
    const m = Math.hypot(gx[idx], gy[idx]);
    mag[idx] = m;
    if (m > maxMag) maxMag = m;
  }
  const scale = maxMag > 0 ? 255 / maxMag : 0;

  // 3) Non-maximum suppression along quantized directions (0,45,90,135)
  const thin = new Uint8Array(w * h); // holds scaled magnitude at local maxima
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = y * w + x;
      const gxx = gx[idx],
        gyy = gy[idx];
      const m = mag[idx] * scale;

      // direction sector
      const angle = Math.atan2(gyy, gxx) * (180 / Math.PI);
      const a = angle < 0 ? angle + 180 : angle;
      let n1 = 0,
        n2 = 0;
      if ((a >= 0 && a < 22.5) || (a >= 157.5 && a < 180)) {
        n1 = mag[idx - 1] * scale;
        n2 = mag[idx + 1] * scale; // horizontal
      } else if (a >= 22.5 && a < 67.5) {
        n1 = mag[idx - w - 1] * scale;
        n2 = mag[idx + w + 1] * scale; // 45°
      } else if (a >= 67.5 && a < 112.5) {
        n1 = mag[idx - w] * scale;
        n2 = mag[idx + w] * scale; // vertical
      } else {
        // 112.5..157.5
        n1 = mag[idx - w + 1] * scale;
        n2 = mag[idx + w - 1] * scale; // 135°
      }
      thin[idx] = m >= n1 && m >= n2 ? m | 0 : 0;
    }
  }

  // 4) Hysteresis thresholding via stack flood fill
  const STRONG = 255;
  const WEAK = 128;
  const out = new Uint8Array(w * h);
  const stack = new Int32Array(w * h);
  let sp = 0;

  for (let i = 0; i < thin.length; i++) {
    const v = thin[i];
    if (v >= high) {
      out[i] = STRONG;
      stack[sp++] = i;
    } else if (v >= low) {
      out[i] = WEAK;
    }
  }

  // promote weak connected to strong (8-connectivity)
  while (sp > 0) {
    const idx = stack[--sp];
    const y = (idx / w) | 0,
      x = idx % w;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const xx = x + dx,
          yy = y + dy;
        if (xx < 0 || xx >= w || yy < 0 || yy >= h) continue;
        const j = yy * w + xx;
        if (out[j] === WEAK) {
          out[j] = STRONG;
          stack[sp++] = j;
        }
      }
    }
  }

  // suppress remaining weak
  for (let i = 0; i < out.length; i++) out[i] = out[i] === STRONG ? 255 : 0;
  return out;
}
)};
const _17sgzns = function _edges1D(){return(
function edges1D(sig, thr = 6) {
  const n = sig.length;
  const d = new Float32Array(n);
  for (let i = 1; i < n; i++) d[i] = sig[i] - sig[i - 1];
  const idx = [];
  for (let i = 2; i < n - 2; i++) {
    const v = d[i];
    if (Math.abs(v) < thr) continue;
    if (
      (v > 0 && d[i] >= d[i - 1] && d[i] >= d[i + 1]) ||
      (v < 0 && d[i] <= d[i - 1] && d[i] <= d[i + 1])
    ) {
      idx.push({ x: i, s: Math.sign(v) });
    }
  }
  return idx;
}
)};
const _1aw5gb6 = function _canvasFromGrayU8(){return(
function canvasFromGrayU8(gray, w) {
  if (!Number.isInteger(w) || w <= 0) throw new Error("w invalid");
  const h = (gray.length / w) | 0;
  if (w * h !== gray.length) throw new Error("buffer size mismatch");

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  const img = ctx.createImageData(w, h);
  const dst = img.data; // RGBA

  for (let i = 0, j = 0; i < gray.length; i++, j += 4) {
    const v = gray[i];
    dst[j] = v;
    dst[j + 1] = v;
    dst[j + 2] = v;
    dst[j + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}
)};
const _1oa5u5m = function _gaussianKernel1D(){return(
function gaussianKernel1D(sigma) {
  const s = Math.max(0.3, sigma);
  const half = Math.max(1, Math.round(s * 3));
  const size = 2 * half + 1;
  const data = new Float32Array(size);
  const a = 1 / (Math.sqrt(2 * Math.PI) * s);
  const twoSigma2 = 2 * s * s;
  let sum = 0;
  for (let i = -half; i <= half; i++) {
    const v = a * Math.exp(-(i * i) / twoSigma2);
    data[i + half] = v;
    sum += v;
  }
  for (let i = 0; i < size; i++) data[i] /= sum;
  return { data, half };
}
)};
const _1nqnv5z = function _64(md){return(
md`Here are several algorithms / strategies you can use to assign every template_edge to a subset of scan edges.  Which is best depends on constraints you want to enforce (ordering, polarity, one‑to‑one), the expected amount of outliers/missing edges, and how big the problem is.

...

4) Dynamic programming (sequence alignment) — preserves order, allows gaps
- If template edges must map in order to scan edges (monotone mapping) and you allow insertions/deletions, use DP (Needleman‑Wunsch style):
  cost(i,j) = min( cost(i-1,j-1) + match_cost(x_ti,x_sj),
                   cost(i-1,j) + gap_penalty,   // skip template
                   cost(i,j-1) + gap_penalty )  // skip scan
- match_cost could be |x_ti - x_sj| (possibly squared, and include polarity mismatch penalty).
- Complexity O(N*M) (N = #template edges, M = #scan edges).
- Pros: optimal under the chosen cost, enforces monotonicity, handles missing edges.
- Cons: quadratic; choose gap_penalty carefully.

...
`
)};
const _17r7psh = function _clamp(){return(
function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}
)};
const _1a5siut = function _66(overlay){return(
overlay
)};
const _1kzgm00 = async function _SVD(require)
{
  return (await require("svd-js")).SVD;
};
const _1kcua30 = function _69(robocoop){return(
robocoop
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };
  const fileAttachments = new Map(["image.png"].map((name) => {
    const module_name = "@tomlarkworthy/fast-1d-circular-barcode-matching";
    const {status, mime, bytes} = window.lopecode.contentSync(module_name + "/" + encodeURIComponent(name));
    const blob_url = URL.createObjectURL(new Blob([bytes], { type: mime}));
    return [name, {url: blob_url, mimeType: mime}]
  }));
  main.builtin("FileAttachment", runtime.fileAttachments(name => fileAttachments.get(name)));

  main.define("module @tomlarkworthy/circular-barcode-simulator", async () => runtime.module((await import("/@tomlarkworthy/circular-barcode-simulator.js?v=4")).default));  
  main.define("module @tomlarkworthy/robocoop-2", async () => runtime.module((await import("/@tomlarkworthy/robocoop-2.js?v=4")).default));  
  $def("_rqg12o", null, ["md"], _rqg12o);  
  main.define("viewof scanY", ["module @tomlarkworthy/circular-barcode-simulator", "@variable"], (_, v) => v.import("viewof scanY", _));  
  main.define("scanY", ["module @tomlarkworthy/circular-barcode-simulator", "@variable"], (_, v) => v.import("scanY", _));  
  main.define("canvas", ["module @tomlarkworthy/circular-barcode-simulator", "@variable"], (_, v) => v.import("canvas", _));  
  main.define("pixelBuffer", ["module @tomlarkworthy/circular-barcode-simulator", "@variable"], (_, v) => v.import("pixelBuffer", _));  
  main.define("renders", ["module @tomlarkworthy/circular-barcode-simulator", "@variable"], (_, v) => v.import("renders", _));  
  main.define("scanline", ["module @tomlarkworthy/circular-barcode-simulator", "@variable"], (_, v) => v.import("scanline", _));  
  main.define("overlay", ["module @tomlarkworthy/circular-barcode-simulator", "@variable"], (_, v) => v.import("overlay", _));  
  main.define("template", ["module @tomlarkworthy/circular-barcode-simulator", "@variable"], (_, v) => v.import("template", _));  
  $def("_16djjaz", null, ["md"], _16djjaz);  
  $def("_1o1419n", null, ["Plot","width","autoFitProjectedTemplate"], _1o1419n);  
  $def("_s99oxw", null, ["viewof scanY"], _s99oxw);  
  $def("_1c88ng4", null, ["canvas","htl"], _1c88ng4);  
  $def("_1x7s9wa", null, ["md"], _1x7s9wa);  
  $def("_1jywh6e", null, ["md"], _1jywh6e);  
  $def("_7i6etb", "viewof scanLinePlot", ["Plot","width","scanLineBuffer"], _7i6etb);  
  $def("_1uk6uik", "scanLinePlot", ["Generators","viewof scanLinePlot"], _1uk6uik);  
  $def("_19cwf4f", "scanLineBuffer", ["scanline"], _19cwf4f);  
  $def("_p8t4dn", "scanEdges", ["edges1D","scanLineBuffer"], _p8t4dn);  
  $def("_1or7r4n", null, ["md"], _1or7r4n);  
  $def("_1p2gokx", null, ["FileAttachment","md"], _1p2gokx);  
  $def("_1k5n2da", "viewof leftmost", ["Plot","width","scanEdges"], _1k5n2da);  
  $def("_1su3eiy", "leftmost", ["Generators","viewof leftmost"], _1su3eiy);  
  $def("_r6wqzq", "viewof rightmost", ["Plot","width","scanEdges"], _r6wqzq);  
  $def("_35rys7", "rightmost", ["Generators","viewof rightmost"], _35rys7);  
  $def("_1t9qch2", "viewof middle_right", ["Plot","width","scanEdges"], _1t9qch2);  
  $def("_17uxcek", "middle_right", ["Generators","viewof middle_right"], _17uxcek);  
  $def("_1by6ej5", null, ["md"], _1by6ej5);  
  $def("_14bvwex", null, ["md"], _14bvwex);  
  $def("_jxmbv9", null, ["Plot","width","template_projection"], _jxmbv9);  
  $def("_148tv4m", null, ["md"], _148tv4m);  
  $def("_plvrpg", null, ["Plot","width","initialAlignment"], _plvrpg);  
  $def("_g5aybm", null, ["md"], _g5aybm);  
  $def("_1j19trh", null, ["Plot","width","mobiusLSFit"], _1j19trh);  
  $def("_2eif1j", null, ["mobiusLSFit","md"], _2eif1j);  
  $def("_gd09vp", null, ["Plot","width","residualsLS"], _gd09vp);  
  $def("_1byj22z", null, ["md"], _1byj22z);  
  $def("_1e64kk9", null, ["md"], _1e64kk9);  
  $def("_pgr881", "fitMobius", [], _pgr881);  
  $def("_1q7w5ww", "pqrs", ["fitMobius","leftmost","middle_right","rightmost"], _1q7w5ww);  
  $def("_148jsv2", null, ["md"], _148jsv2);  
  $def("_mic2ph", "template_edges", ["binaryToEdges","template"], _mic2ph);  
  $def("_1sqgm2r", "xFromK", [], _1sqgm2r);  
  $def("_15g998g", "template_projection", ["template_edges","xFromK","pqrs"], _15g998g);  
  $def("_1acy93z", null, ["md"], _1acy93z);  
  $def("_13xv6pn", "dpAlign", [], _13xv6pn);  
  $def("_898krp", "initialAlignment", ["dpAlign","template_projection","scanEdges"], _898krp);  
  $def("_ll5zgn", null, ["md"], _ll5zgn);  
  $def("_xenhd5", "fitMobiusLS", ["SVD"], _xenhd5);  
  $def("_1tc6nqw", "mobiusLSFit", ["initialAlignment","scanEdges","template_projection","fitMobiusLS","xFromK"], _1tc6nqw);  
  $def("_odlpzv", "calculatLSResiduals", ["initialAlignment","template_projection","scanEdges"], _odlpzv);  
  $def("_kjfy08", "residualsLS", ["calculatLSResiduals","mobiusLSFit"], _kjfy08);  
  $def("_6srd6h", null, ["md"], _6srd6h);  
  $def("_1nr38p5", "computeAnchorCandidatesFast", ["fitMobiusLS"], _1nr38p5);  
  $def("_gcrirj", "anchorCandidatesFast", ["computeAnchorCandidatesFast","template_edges","scanEdges"], _gcrirj);  
  $def("_u7zfvr", "refineAnchorCandidates", ["xFromK","dpAlign","fitMobiusLS"], _u7zfvr);  
  $def("_y073cq", "autoFit", ["refineAnchorCandidates","anchorCandidatesFast","template_edges","scanEdges"], _y073cq);  
  $def("_jast58", "autoFitProjectedTemplate", ["autoFit","template_edges","xFromK"], _jast58);  
  $def("_1t9w2wi", "autoFitResiduals", ["autoFitProjectedTemplate","scanEdges","dpAlign"], _1t9w2wi);  
  $def("_1cyi05t", null, ["md"], _1cyi05t);  
  $def("_1aahzmh", "autoFitScanline", ["binaryToEdges","edges1D","computeAnchorCandidatesFast","refineAnchorCandidates","xFromK","dpAlign"], _1aahzmh);  
  $def("_1hbfvou", null, ["autoFitScanline","scanLineBuffer","template"], _1hbfvou);  
  $def("_16khtov", null, ["md"], _16khtov);  
  $def("_13n9y5w", "binaryToEdges", [], _13n9y5w);  
  $def("_ezw55q", "grey", ["renders","rgbaToGray","pixelBuffer"], _ezw55q);  
  $def("_gog39e", "edges", ["renders","canny","grey","width"], _gog39e);  
  $def("_j3mrme", "test_fitMobius", ["fitMobius"], _j3mrme);  
  $def("_besmmj", "solve3", [], _besmmj);  
  $def("_1ue0q3u", "sampleLine", [], _1ue0q3u);  
  $def("_he5jvj", "rgbaToGray", [], _he5jvj);  
  $def("_ejc6ez", "canny", ["gaussianKernel1D","clamp"], _ejc6ez);  
  $def("_17sgzns", "edges1D", [], _17sgzns);  
  $def("_1aw5gb6", "canvasFromGrayU8", [], _1aw5gb6);  
  $def("_1oa5u5m", "gaussianKernel1D", [], _1oa5u5m);  
  $def("_1nqnv5z", null, ["md"], _1nqnv5z);  
  $def("_17r7psh", "clamp", [], _17r7psh);  
  $def("_1a5siut", null, ["overlay"], _1a5siut);  
  $def("_1kzgm00", "SVD", ["require"], _1kzgm00);  
  main.define("robocoop", ["module @tomlarkworthy/robocoop-2", "@variable"], (_, v) => v.import("robocoop", _));  
  $def("_1kcua30", null, ["robocoop"], _1kcua30);
  return main;
}