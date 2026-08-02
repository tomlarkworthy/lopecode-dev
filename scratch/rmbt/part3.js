const _rmc2bw = function _anonymous(md) {return (md`# Realtime Multi-Barcode Tracking
## Part III — many barcodes, and live frames

[Part I](https://observablehq.com/@tomlarkworthy/circular-barcode-simulator) established the geometry: a circular barcode reads the same along any chord through its centre, so a 2D pose problem becomes a 1D pattern match on a single row of pixels. [Part II](https://observablehq.com/@tomlarkworthy/fast-1d-circular-barcode-matching) built the matcher: scan-line edges relate to template positions by a **Möbius transform** — the exact 1D projective map — recovered automatically from an anchor search, a DP alignment, and a least-squares refit.

Part II finds *one* barcode, on *one* row, of a *simulated* frame. This notebook removes all three limits:

1. **One barcode → many.** The anchor search already works on contiguous runs of scan edges, so a barcode is a local phenomenon. Detection becomes: keep every candidate that survives a residual test, then suppress overlaps.
2. **One row → a row set.** A chord only reads the template pattern if it passes near the centre. With several barcodes no single row centres them all, so we scan a strided set of rows and let the residual pick the best row per barcode.
3. **Simulated → live.** A webcam supplies real optics, noise and motion blur. It is *not* the speed target — there is no scan-line access to a webcam. It is a realism test for the algorithm.

The endgame is still a sensor streaming one row at a time at kHz rates, so the figure of merit is not frames per second. It is **rows touched per detection** and **microseconds per row**. Both stay on screen throughout.`);};
const _kw4vas = function _anonymous(md) {return (md`---
## §1 A scene with several barcodes

Part I's simulator renders one textured cube and lets you orbit it. Here we want *several* barcodes at independent poses, because that is what forces every remaining problem in this notebook: overlapping edge runs, barcodes at different scales, and — most importantly — the fact that no single scan row passes through all their centres.

The barcode texture is Part I's \`synthetic\` cell: concentric rings drawn straight from the 56-bit \`template\`, so the simulated target and the matcher's template are guaranteed to agree by construction.`);};
const _s6irrw = function _FRAME() {return ({ w: 640, h: 480 });};
const _jryoj3 = function _nBarcodes(Inputs) {return (Inputs.range([1, 6], { step: 1, value: 3, label: "barcodes in scene" }));};
const _i48s7l = (G, _) => G.input(_);
const _12np1sq = function _motion(Inputs) {return (Inputs.range([0, 1], { step: 0.01, value: 0.35, label: "scene motion" }));};
const _13kodma = (G, _) => G.input(_);
const _y6hmmm = function _barcodeTexture(template,THREE,invalidation) {
  // Part I's `synthetic` SVG rasterises empty once serialised to a blob URL, so the
  // rings are drawn straight onto a canvas instead — same `template`, higher resolution.
  const N = template.length;
  const half = N / 2;
  const S = 512;
  const c = document.createElement("canvas");
  c.width = S;
  c.height = S;
  const ctx = c.getContext("2d");
  const scale = S / N;
  for (let i = 0; i <= half; i++) {
    const r = Math.abs(half - i);
    if (r <= 0) continue;
    ctx.beginPath();
    ctx.arc(S / 2, S / 2, r * scale, 0, 2 * Math.PI);
    ctx.fillStyle = template[i] ? "#ffffff" : "#000000";
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  invalidation.then(() => tex.dispose());
  return tex;
};
const _4uleeg = function _simRig(FRAME,THREE,barcodeTexture,nBarcodes,invalidation) {
  const w = FRAME.w;
  const h = FRAME.h;
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(w, h);
  renderer.setPixelRatio(1);
  const rt = new THREE.WebGLRenderTarget(w, h);
  const gl = renderer.getContext();

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x2a2a2a);
  const camera = new THREE.PerspectiveCamera(50, w / h, 0.01, 100);
  camera.position.set(0, 0, 5);
  camera.lookAt(new THREE.Vector3(0, 0, 0));

  // deterministic per-target pseudo-randomness so the scene is reproducible
  const rnd = (i, k) => {
    const s = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
    return s - Math.floor(s);
  };

  const geo = new THREE.PlaneGeometry(1, 1);
  const mat = new THREE.MeshBasicMaterial({
    map: barcodeTexture,
    side: THREE.DoubleSide,
    transparent: true
  });

  const targets = [];
  for (let i = 0; i < nBarcodes; i++) {
    const mesh = new THREE.Mesh(geo, mat);
    scene.add(mesh);
    targets.push({
      id: i,
      mesh,
      cx: (rnd(i, 1) - 0.5) * 3.4,
      cy: (rnd(i, 2) - 0.5) * 2.4,
      cz: -rnd(i, 3) * 2.5,
      ax: rnd(i, 4) * 0.9 - 0.45,
      ay: rnd(i, 5) * 0.9 - 0.45,
      sp: 0.4 + rnd(i, 6),
      ph: rnd(i, 7) * 6.283,
      sc: 0.75 + rnd(i, 8) * 0.7
    });
  }

  const rgba = new Uint8Array(w * h * 4);
  const gray = new Uint8Array(w * h);

  // m = motion amount, passed in so the slider does not rebuild the GL context
  const step = (t, m) => {
    for (const b of targets) {
      b.mesh.position.set(
        b.cx + m * 0.5 * Math.sin(t * b.sp + b.ph),
        b.cy + m * 0.4 * Math.cos(t * b.sp * 0.8 + b.ph),
        b.cz + m * 0.6 * Math.sin(t * b.sp * 0.5)
      );
      b.mesh.rotation.set(
        b.ax + m * 0.5 * Math.sin(t * 0.6 + b.ph),
        b.ay + m * 0.6 * Math.cos(t * 0.5 + b.ph),
        m * 0.3 * t * b.sp
      );
      b.mesh.scale.set(b.sc, b.sc, 1);
    }
    renderer.setRenderTarget(rt);
    renderer.render(scene, camera);
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, rgba);
    renderer.setRenderTarget(null);
    renderer.render(scene, camera);
    // readPixels is bottom-up; flip so row 0 is the top of the image
    for (let y = 0; y < h; y++) {
      const src = (h - 1 - y) * w * 4;
      const dst = y * w;
      for (let x = 0; x < w; x++) {
        const o = src + x * 4;
        gray[dst + x] = (rgba[o] + rgba[o + 1] + rgba[o + 2]) / 3;
      }
    }
    return gray;
  };

  invalidation.then(() => {
    rt.dispose();
    geo.dispose();
    mat.dispose();
    renderer.dispose();
  });

  return { w, h, canvas: renderer.domElement, step, targets, camera, scene };
};
const _j6jmhh = function _running(Inputs) {return (Inputs.toggle({ label: "run", value: false }));};
const _u5lzp = (G, _) => G.input(_);
const _1drityg = async function* _simFrame(running,simRig,motion) {
  const t0 = performance.now();
  let n = 0;
  while (true) {
    const t = running ? (performance.now() - t0) / 1000 : 0;
    const gray = simRig.step(t, running ? motion : 0);
    yield { gray, w: simRig.w, h: simRig.h, t, n: n++, source: "sim" };
    // paused: park until `running` flips, which re-runs this cell
    if (!running) await new Promise(() => {});
  }
};
const _tl97yc = function _overlaySvg(htl,FRAME) {return (htl.svg`<svg viewBox="0 0 ${FRAME.w} ${FRAME.h}" style="position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none"></svg>`);};
const _xwbf17 = function _sceneView(simRig,htl,FRAME,overlaySvg) {
  const canvas = simRig.canvas;
  canvas.style.width = "100%";
  canvas.style.height = "auto";
  canvas.style.display = "block";
  const div = htl.html`<div style="position:relative;width:100%;max-width:${FRAME.w}px;border:1px solid var(--theme-foreground-faintest,#888)"></div>`;
  div.appendChild(canvas);
  div.appendChild(overlaySvg);
  return div;
};
const _1qsnkun = function _anonymous(md) {return (md`---
## §2 Which rows to scan

Part II assumed the scan line passes through the barcode's centre. That assumption is load-bearing: a chord at perpendicular distance \`d\` from the centre cuts a ring of radius \`r\` at \`±√(r² − d²)\`, so an off-centre chord reads a *compressed* pattern that is no longer the template. With one barcode you can hunt for the right row. With several, no single row centres them all.

The cheap fix, and the one that keeps the scan-line thesis intact, is to scan a **strided set of rows** and let the residual decide. Each barcode is then near-centred on at least one row, provided the stride is smaller than the barcode's radius. Nothing else in the pipeline changes, and the cost is exactly linear in rows touched — the quantity we care about.

(§7 revisits this with the proper generalisation: put \`d\` into the model so *any* row works.)`);};
const _2pll7q = function _rowStride(Inputs) {return (Inputs.range([2, 64], { step: 1, value: 12, label: "row stride (px)" }));};
const _1jjclm3 = (G, _) => G.input(_);
const _1svyp0z = function _scanRows(rowStride,FRAME) {
  const rows = [];
  for (let y = Math.floor(rowStride / 2); y < FRAME.h; y += rowStride) rows.push(y);
  return rows;
};
const _vp2x4g = function _rowsLayer(htl,scanRows,FRAME,overlaySvg,invalidation) {
  const g = htl.svg`<g></g>`;
  for (const y of scanRows) {
    g.appendChild(
      htl.svg`<line x1="0" y1="${y}" x2="${FRAME.w}" y2="${y}" stroke="#ff5375" stroke-width="0.6" opacity="0.35"/>`
    );
  }
  overlaySvg.appendChild(g);
  invalidation.then(() => g.remove());
  return; // side-effect cell: the node lives in overlaySvg, not here
};
const _1vob7s8 = function _anonymous(md,tex) {return (md`---
## §3 Replacing the anchor SVD with a cross-ratio test

Part II's \`computeAnchorCandidatesFast\` is the inner loop of the whole system. For every contiguous window of scan edges \`(i, j)\` whose edge count is plausible, it takes four correspondences — the two outermost template edges and the two next-innermost — fits a Möbius transform by SVD least-squares, and scores the window by the residual.

That is doing a lot of work to learn one number. A Möbius map

${tex.block`k \; = \; \frac{p\,x + q}{r\,x + s}`}

has **four parameters defined up to scale, so three degrees of freedom**. Four correspondences impose four constraints. The fit therefore has exactly *one* excess constraint, and the SVD residual on those same four points is measuring precisely that one scalar.

That scalar has a name. The **cross ratio** of four collinear points is the complete projective invariant of the configuration — unchanged by any Möbius map:

${tex.block`\mathrm{CR}(a,b,c,d) \; = \; \frac{(a-c)\,(b-d)}{(b-c)\,(a-d)}`}

So a window admits a Möbius map onto the template anchors **if and only if** its cross ratio equals the template's. We compute the template's cross ratio *once*, reject windows with a handful of floating-point operations, and run the SVD only on survivors.

This is not an approximation of Part II's test — it is the same test, evaluated directly instead of via a matrix decomposition.`);};
const _lms9td = function _crossRatio() {return (function crossRatio(a, b, c, d) {
  return ((a - c) * (b - d)) / ((b - c) * (a - d));
});};
const _11ivtm = function _crDistance() {return (function crDistance(u, v) {
  // chordal distance on the Riemann sphere: bounded in [0,1] and well behaved
  // when a cross ratio runs off to infinity (a degenerate, near-coincident window)
  if (!isFinite(u) || !isFinite(v)) return isFinite(u) === isFinite(v) ? 0 : 1;
  return Math.abs(u - v) / Math.sqrt((1 + u * u) * (1 + v * v));
});};
const _1mbckod = function _computeAnchorCandidatesCR(crossRatio,crDistance,fitMobiusLS) {return (function computeAnchorCandidatesCR(
  template_edges,
  scanEdges,
  opts = {}
) {
  const kSorted = template_edges.slice().sort((a, b) => a - b);
  const N = kSorted.length;
  if (N < 4) throw new Error("need >=4 template edges");

  // Anchors spread through the template, NOT clustered at its ends. Part II used
  // (kMin, kLeftInner, kRightInner, kMax); because the two inner anchors sit one
  // step from the outer ones, that 4-tuple's cross ratio is ~1.0004 — the degenerate
  // value — so it discriminates nothing. Thirds give a cross ratio well away from 1.
  const fa = opts.anchorFractions ?? [1 / 3, 2 / 3];
  const iA = Math.round(fa[0] * (N - 1));
  const iB = Math.round(fa[1] * (N - 1));
  const crTpl = crossRatio(kSorted[0], kSorted[iA], kSorted[iB], kSorted[N - 1]);

  const sLen = scanEdges.length;
  if (sLen < 4) {
    const empty = [];
    empty.windows = 0;
    empty.survived = 0;
    return empty;
  }
  const innerExpected = N - 2;
  const minBetween = Math.max(2, opts.minBetween ?? innerExpected - 1);
  const maxBetween = Math.min(sLen - 2, opts.maxBetween ?? innerExpected + 1);
  const topK = opts.topK ?? 10;
  const crTol = opts.crTol ?? 0.02;
  const scanX = scanEdges.map((e) => (typeof e === "number" ? e : e.x));

  const candidates = [];
  let windows = 0;
  let survived = 0;
  for (let i = 0; i < sLen - 1; i++) {
    const jMin = i + 1 + minBetween;
    const jMax = Math.min(sLen - 1, i + 1 + maxBetween);
    if (jMin >= sLen) continue;
    for (let j = jMin; j <= jMax; j++) {
      if (i + 1 >= j) continue;
      windows++;
      // map template anchor indices into the window proportionally; exact when the
      // window holds the expected edge count, close enough to gate on otherwise
      const span = j - i;
      const a = i + Math.round((iA * span) / (N - 1));
      const b = i + Math.round((iB * span) / (N - 1));
      const cr = crossRatio(scanX[i], scanX[a], scanX[b], scanX[j]);
      // NaN-safe: a failed comparison rejects the window
      if (!(crDistance(cr, crTpl) <= crTol)) continue;
      survived++;

      // the same spread anchors also give a better-conditioned initial fit
      const pairs4 = [
        { x: scanX[i], k: kSorted[0] },
        { x: scanX[a], k: kSorted[iA] },
        { x: scanX[b], k: kSorted[iB] },
        { x: scanX[j], k: kSorted[N - 1] }
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
      let se = 0;
      let cnt = 0;
      for (const pr of pairs4) {
        const den = mob.r * pr.x + mob.s;
        if (Math.abs(den) < 1e-12) continue;
        const e = (mob.p * pr.x + mob.q) / den - pr.k;
        se += e * e;
        cnt++;
      }
      const kRMSE = cnt ? Math.sqrt(se / cnt) : Infinity;
      candidates.push({
        startIndex: i,
        endIndex: j,
        pairs4,
        mobiusInitial: mob,
        kRMSE,
        cr,
        crDist: crDistance(cr, crTpl)
      });
    }
  }
  candidates.sort((a, b) => (a.kRMSE ?? Infinity) - (b.kRMSE ?? Infinity));
  const out = candidates.slice(0, topK);
  out.windows = windows;
  out.survived = survived;
  out.crTpl = crTpl;
  return out;
});};
const _1a9n4je = function _template_edges(binaryToEdges,template) {
  // `binaryToEdges` reports transitions *inside* the ring array, so it misses the
  // disk's outer rim against the background — which is both a real feature of the
  // target and the highest-contrast edge in the image. Its radius is half the
  // template length. Without it the chord-offset search is biased: every candidate
  // offset leaves the two rim edges unexplained and gets charged for them.
  const inner = binaryToEdges(template);
  const rim = template.length / 2;
  return [...inner, -rim, rim].sort((a, b) => a - b);
};
const _b6alah = function _rowOf() {return (function rowOf(frame, y) {
  return frame.gray.subarray(y * frame.w, (y + 1) * frame.w);
});};
const _1w8wvjm = function _edgeThreshold(Inputs) {return (Inputs.range([2, 40], { step: 1, value: 12, label: "edge threshold" }));};
const _ck7l4a = (G, _) => G.input(_);
const _54mjsc = function _crTol(Inputs) {return (Inputs.range([0.001, 0.1], { step: 0.001, value: 0.02, label: "cross-ratio tolerance" }));};
const _uj1cdm = (G, _) => G.input(_);
const _1d6bne6 = function _benchGo(Inputs) {return (Inputs.button("run A/B benchmark"));};
const _d7zud6 = (G, _) => G.input(_);
const _1mfst8u = function _benchFrame(benchGo,simRig) {
  benchGo; // re-render a deterministic static frame on demand
  const gray = simRig.step(0, 0).slice();
  return { gray, w: simRig.w, h: simRig.h };
};
const _p87wwn = function _crBenchmark(scanRows,edges1D,rowOf,benchFrame,edgeThreshold,crTol,computeAnchorCandidatesFast,template_edges,computeAnchorCandidatesCR) {
  const rows = scanRows.map((y) => edges1D(rowOf(benchFrame, y), edgeThreshold));
  const optsA = { topK: 20 };
  const optsB = { topK: 20, crTol };
  const REPS = 60; // the gate is fast enough that a handful of reps hits timer resolution

  // warm-up so the JIT has settled before either arm is timed
  for (const se of rows) {
    computeAnchorCandidatesFast(template_edges, se, optsA);
    computeAnchorCandidatesCR(template_edges, se, optsB);
  }

  let t = performance.now();
  for (let r = 0; r < REPS; r++)
    for (const se of rows) computeAnchorCandidatesFast(template_edges, se, optsA);
  const msSVD = (performance.now() - t) / REPS;

  t = performance.now();
  for (let r = 0; r < REPS; r++)
    for (const se of rows) computeAnchorCandidatesCR(template_edges, se, optsB);
  const msCR = (performance.now() - t) / REPS;

  let windows = 0;
  let survived = 0;
  for (const se of rows) {
    const B = computeAnchorCandidatesCR(template_edges, se, optsB);
    windows += B.windows;
    survived += B.survived;
  }

  return {
    rowsScanned: rows.length,
    scanEdgesTotal: rows.reduce((a, b) => a + b.length, 0),
    windowsTested: windows,
    survivedCrGate: survived,
    rejectedByGate: windows
      ? +((1 - survived / windows) * 100).toFixed(1) + "%"
      : "n/a",
    msPerFrame_SVD: +msSVD.toFixed(3),
    msPerFrame_CR: +msCR.toFixed(3),
    speedup: msCR > 0 ? +(msSVD / msCR).toFixed(1) : "n/a",
    usPerRow_SVD: +((msSVD * 1000) / rows.length).toFixed(2),
    usPerRow_CR: +((msCR * 1000) / rows.length).toFixed(2)
  };
};
const _yo7gw4 = function _groundTruth(simFrame,simRig,THREE) {
  simFrame; // recompute each frame
  const camera = simRig.camera;
  const w = simRig.w;
  const h = simRig.h;
  camera.updateMatrixWorld();
  const toPx = (v) => {
    const p = v.clone().project(camera);
    // flip y: our frame rows run top-down
    return { x: (p.x * 0.5 + 0.5) * w, y: (1 - (p.y * 0.5 + 0.5)) * h, z: p.z };
  };
  return simRig.targets.map((t) => {
    t.mesh.updateMatrixWorld();
    const M = t.mesh.matrixWorld;
    const c = new THREE.Vector3().setFromMatrixPosition(M);
    // the plane's own axes, already carrying its scale
    const ax = new THREE.Vector3().setFromMatrixColumn(M, 0);
    const ay = new THREE.Vector3().setFromMatrixColumn(M, 1);
    const pc = toPx(c);
    const pu = toPx(c.clone().addScaledVector(ax, 0.5));
    const pv = toPx(c.clone().addScaledVector(ay, 0.5));
    // the disk projects to an ellipse with semi-axis vectors u and v
    const u = { x: pu.x - pc.x, y: pu.y - pc.y };
    const v = { x: pv.x - pc.x, y: pv.y - pc.y };
    // extent of that ellipse along each image axis
    const xExtent = Math.hypot(u.x, v.x);
    const yExtent = Math.hypot(u.y, v.y);
    return {
      id: t.id,
      cx: pc.x,
      cy: pc.y,
      u,
      v,
      xExtent,
      yExtent,
      onScreen:
        pc.z < 1 &&
        pc.x > -xExtent &&
        pc.x < w + xExtent &&
        pc.y > -yExtent &&
        pc.y < h + yExtent
    };
  });
};
const _1uyfo0m = function _anonymous(md,tex) {return (md`### What the benchmark actually showed

The first version of this gate rejected **0%** of windows and bought a 1.5× speedup that was pure noise. The reason turned out to be a property of Part II's anchor choice, not of the idea.

Part II anchors on \`(kMin, kLeftInner, kRightInner, kMax)\` — but \`kLeftInner\` is one step from \`kMin\`, and \`kRightInner\` is one step from \`kMax\`. Two tightly-spaced pairs, far apart. The cross ratio of such a configuration is

${tex.block`\mathrm{CR}(-27,\,-26,\,26,\,27) \; = \; \frac{2809}{2808} \; \approx \; 1.0004`}

which is a hair from **1** — one of the three degenerate values of the cross ratio. Every window whose first two edges are close together and whose last two edges are close together lands in the same place, so the invariant carries almost no information. Part II's SVD residual on those four points was measuring a quantity that barely varies.

Moving the two inner anchors to the **thirds** of the template fixes it: ${tex`\mathrm{CR}(-27,\,-13,\,13,\,27) = 1.1396`}, far enough from 1 to discriminate. With ground truth from the simulator, the three genuinely centre-crossing rows score cross-ratio distances of **0.005, 0.008 and 0.009** — all well inside a 0.02 tolerance — while two thirds of all windows are rejected outright.

The same spread anchors also give a better-conditioned initial Möbius fit than four points bunched at the interval ends, so the change pays twice.

> The \`topWindowAgreement\` figure above is no longer a meaningful check: the windows the two methods now disagree on are mostly off-centre rows where Part II returns a *spurious* fit. §5 replaces it with a precision/recall measurement against ground truth.`);};
const _15sbo1e = function _anonymous(md,tex) {return (md`---
## §4 From one detection to many

Part II ends with \`refineAnchorCandidates(...)[0]\` — it takes the single best window and discards the rest. But the candidate list is already a ranked set of *disjoint or overlapping edge-index intervals*, and a second barcode on the same row is simply another interval further along. Nothing about the search needs to change.

So multi-instance detection is three rules applied to the ranked list:

1. **Accept** a candidate only if its full-template residual is small enough and it matched enough template edges (occlusion and blur drop some, so this is a fraction, not equality).
2. **Suppress** any candidate whose edge-index interval overlaps one already accepted — the classic non-max suppression, made cheap here because a barcode occupies a contiguous run of scan edges.
3. **Report the centre**, which the fit hands us for free: \`binaryToEdges\` centres the template on zero, so the barcode's centre in the image is exactly ${tex`x = \texttt{xFromK}(\text{mobius},\, 0)`}.

That last point is worth dwelling on. We are not estimating the centre from the extent of the detection — we are reading it off the recovered projective map, which is what makes it sub-pixel-capable and robust to a partially occluded rim.`);};
const _629twe = function _detectRow(computeAnchorCandidatesCR,refineCandidatesFast,xFromK) {return (function detectRow(scanEdges, template_edges, opts = {}) {
  const empty = [];
  empty.windows = 0;
  empty.survived = 0;
  if (!scanEdges || scanEdges.length < 4) return empty;

  const cands = computeAnchorCandidatesCR(template_edges, scanEdges, {
    topK: opts.topK ?? 40,
    crTol: opts.crTol,
    minBetween: opts.minBetween,
    maxBetween: opts.maxBetween,
    anchorFractions: opts.anchorFractions
  });

  const kSorted = template_edges.slice().sort((a, b) => a - b);
  const scanXArr = Float64Array.from(scanEdges, (e) =>
    typeof e === "number" ? e : e.x
  );
  const refined = refineCandidatesFast(cands, kSorted, scanXArr, {
    topK: opts.topKRefine ?? 40,
    gapPenalty: opts.gapPenalty,
    closedForm: opts.closedForm
  });

  const maxRMSE = opts.maxRMSE ?? 1.5;
  const maxXRMSE = opts.maxXRMSE ?? 3;
  const minPairFraction = opts.minPairFraction ?? 0.6;
  const minPairs = Math.floor(kSorted.length * minPairFraction);

  const accepted = [];
  for (const c of refined) {
    if (!(c.kRMSE_full <= maxRMSE)) continue;
    if (!(c.xRMSE_full <= maxXRMSE)) continue;
    if (c.pairsUsed < minPairs) continue;
    const clash = accepted.some(
      (a) => !(c.endIndex < a.startIndex || c.startIndex > a.endIndex)
    );
    if (clash) continue;
    const mob = c.mobiusRefined;
    accepted.push({
      startIndex: c.startIndex,
      endIndex: c.endIndex,
      mobius: mob,
      kRMSE: c.kRMSE_full,
      xRMSE: c.xRMSE_full,
      pairsUsed: c.pairsUsed,
      centreX: xFromK(mob, 0),
      leftX: xFromK(mob, kSorted[0]),
      rightX: xFromK(mob, kSorted[kSorted.length - 1]),
      spanX: [scanXArr[c.startIndex], scanXArr[c.endIndex]]
    });
  }
  accepted.windows = cands.windows;
  accepted.survived = cands.survived;
  return accepted;
});};
const _1klkdit = function _maxRMSE(Inputs) {return (Inputs.range([0.1, 5], { step: 0.1, value: 1.5, label: "max residual (k units)" }));};
const _dl657l = (G, _) => G.input(_);
const _196wxrn = function _frameDetections(runPipeline,simFrame,crTol,maxRMSE) {return (runPipeline(simFrame, { crTol, maxRMSE }));};
const _1jv8efs = function _detectionLayer(htl,groundTruth,frameDetections,overlaySvg,invalidation) {
  const g = htl.svg`<g></g>`;
  // ground truth: the projected ellipse of each simulated barcode
  for (const b of groundTruth) {
    if (!b.onScreen) continue;
    const ang = (Math.atan2(b.u.y, b.u.x) * 180) / Math.PI;
    const ru = Math.hypot(b.u.x, b.u.y);
    const rv = Math.hypot(b.v.x, b.v.y);
    g.appendChild(
      htl.svg`<ellipse cx="${b.cx}" cy="${b.cy}" rx="${ru}" ry="${rv}" transform="rotate(${ang} ${b.cx} ${b.cy})" fill="none" stroke="#4fd1c5" stroke-width="1" stroke-dasharray="4 3" opacity="0.85"/>`
    );
  }
  // detections: fitted span, and the foot of the perpendicular read off the map
  for (const d of frameDetections.hits) {
    if (!isFinite(d.leftX) || !isFinite(d.rightX) || !isFinite(d.footX)) continue;
    g.appendChild(
      htl.svg`<line x1="${d.leftX}" y1="${d.y}" x2="${d.rightX}" y2="${d.y}" stroke="#ffd166" stroke-width="2" opacity="0.9"/>`
    );
    g.appendChild(
      htl.svg`<circle cx="${d.footX}" cy="${d.y}" r="3" fill="none" stroke="#ffd166" stroke-width="1.5"/>`
    );
  }
  overlaySvg.appendChild(g);
  invalidation.then(() => g.remove());
  return;
};
const _9v4y1i = function _detectionAccuracy(scoreHits,frameDetections) {return (scoreHits(frameDetections));};
const _f7ii28 = function _anonymous(md,tex) {return (md`---
## §5 Putting the chord offset into the model

Everything so far inherits Part II's assumption that the scan line passes through the barcode's centre. §2 worked around it by scanning many rows and letting the residual pick the best one. That is a workaround: it quantises the answer to the row grid, and it throws away every row that *nearly* hit the centre.

The honest fix is to admit that the chord is offset and put that in the model.

Write ${tex`k`} for a template edge — and note that in Part II's coordinates ${tex`|k|`} **is the ring radius**, because \`binaryToEdges\` centres the template on zero. A chord at perpendicular distance ${tex`d`} from the centre meets the ring of radius ${tex`|k|`} at

${tex.block`k_{\text{eff}} \; = \; \mathrm{sign}(k)\,\sqrt{k^{2} - d^{2}}, \qquad |k| > |d|`}

and **misses it entirely** when ${tex`|k| \le |d|`}. So an off-centre chord does two things at once: it compresses the pattern toward the ends, and it drops the innermost rings. The second effect is the more useful one — the number of surviving rings is itself a strong function of ${tex`d`}.

This is a one-parameter family of templates, so the fit gains a fourth unknown alongside the three Möbius degrees of freedom. Two consequences:

- The map from chord to image is *still* an exact Möbius transform. The offset changes the **template**, not the projection. So all of Part II's machinery applies unchanged to ${tex`k_{\text{eff}}`} — this is a change of input, not of algorithm.
- ${tex`d`} enters only as ${tex`d^{2}`}, so a single chord can never tell you which *side* of the centre it passed. That sign ambiguity is what §6 resolves by combining rows.`);};
const _1mr12zq = function _templateAtOffset() {return (function templateAtOffset(template_edges, d) {
  // |k| is the ring radius; a chord at perpendicular distance d meets it at
  // sign(k)*sqrt(k^2 - d^2), and misses the ring entirely when |k| <= |d|
  const ad = Math.abs(d);
  const out = [];
  for (const k of template_edges) {
    const r = Math.abs(k);
    if (r <= ad) continue;
    out.push(Math.sign(k) * Math.sqrt(r * r - ad * ad));
  }
  return out;
});};
const _1yxwsqp = function _refineOffset(templateAtOffset,fitMobiusLS,refineAnchorCandidates) {return (function refineOffset(det, scanEdges, template_edges, opts = {}) {
  const steps = opts.steps ?? 40;
  let kMaxR = 0;
  for (const k of template_edges) kMaxR = Math.max(kMaxR, Math.abs(k));
  const dMin = Math.max(0, opts.dMin ?? 0);
  const dMax = Math.min(0.9 * kMaxR, opts.dMax ?? 0.9 * kMaxR);
  const unmatchedWeight = opts.unmatchedWeight ?? 2;
  const sx = scanEdges.map((e) => (typeof e === "number" ? e : e.x));
  const si = det.startIndex;
  const ei = det.endIndex;
  const span = ei - si;
  const windowEdges = Math.max(1, span + 1);

  let best = null;
  const trace = [];
  for (let g = 0; g <= steps; g++) {
    const d = dMin + ((dMax - dMin) * g) / steps;
    const kS = templateAtOffset(template_edges, d).sort((a, b) => a - b);
    const M = kS.length;
    if (M < 8) continue;

    // Re-derive the initial Möbius for THIS offset from the window's own anchors.
    // Carrying the coarse fit's map across offsets does not work: it is expressed
    // in a different effective-k coordinate, so the projection lands far enough off
    // that the least-squares refit goes degenerate.
    const ia = Math.round((M - 1) / 3);
    const ib = Math.round((2 * (M - 1)) / 3);
    const pairs4 = [
      { x: sx[si], k: kS[0] },
      { x: sx[si + Math.round((ia * span) / (M - 1))], k: kS[ia] },
      { x: sx[si + Math.round((ib * span) / (M - 1))], k: kS[ib] },
      { x: sx[ei], k: kS[M - 1] }
    ];
    if (pairs4.some((p) => p.x === undefined)) continue;
    let mobInit;
    try {
      mobInit = fitMobiusLS(pairs4);
      if (![mobInit.p, mobInit.q, mobInit.r, mobInit.s].every(isFinite)) continue;
    } catch {
      continue;
    }

    const r = refineAnchorCandidates(
      [{ startIndex: si, endIndex: ei, mobiusInitial: mobInit }],
      kS,
      scanEdges,
      {
        topK: 1,
        gapPenalty: opts.gapPenalty,
        polarityPenalty: opts.polarityPenalty
      }
    )[0];
    if (!r) continue;

    const unmatched = Math.max(0, windowEdges - r.pairsUsed);
    const score =
      r.xRMSE_full * (1 + (unmatchedWeight * unmatched) / windowEdges);
    trace.push({
      d: +d.toFixed(2),
      rings: M,
      pairs: r.pairsUsed,
      xRMSE: +r.xRMSE_full.toFixed(3),
      score: +score.toFixed(3)
    });
    if (isFinite(score) && (!best || score < best.score))
      best = {
        d,
        score,
        kRMSE: r.kRMSE_full,
        xRMSE: r.xRMSE_full,
        mobius: r.mobiusRefined,
        pairsUsed: r.pairsUsed,
        rings: M
      };
  }
  if (best) best.trace = trace;
  return best;
});};
const _1y7rwsn = function _detectRowOffsets(templateAtOffset,detectRow) {return (function detectRowOffsets(scanEdges, template_edges, opts = {}) {
  // A coarse sweep over chord offset. At each d the template is a different set of
  // ring crossings, so this is just detectRow run against a small family of templates.
  const dGrid = opts.dGrid ?? [0, 4, 8, 12, 16, 20];
  const minRings = opts.minRings ?? 16;
  const all = [];
  let windows = 0;
  let survived = 0;
  for (const d of dGrid) {
    const te = templateAtOffset(template_edges, d);
    if (te.length < minRings) continue;
    const dets = detectRow(scanEdges, te, opts);
    windows += dets.windows;
    survived += dets.survived;
    for (const det of dets) {
      det.dCoarse = d;
      det.rings = te.length;
      all.push(det);
    }
  }
  // xRMSE is in pixels, so it is comparable across templates of different sizes
  // (kRMSE is not — fewer rings would flatter a wrong offset)
  all.sort((a, b) => a.xRMSE - b.xRMSE);
  const accepted = [];
  for (const c of all) {
    const clash = accepted.some(
      (a) => !(c.endIndex < a.startIndex || c.startIndex > a.endIndex)
    );
    if (clash) continue;
    accepted.push(c);
  }
  accepted.windows = windows;
  accepted.survived = survived;
  return accepted;
});};
const _11le2b7 = function _anonymous(md,tex) {return (md`### What the offset model bought, and what it cost

Putting ${tex`d`} into the search — a coarse sweep over offsets at detection time, then a local refinement — changed the numbers on the static test frame like this:

| | centre-only (§4) | with chord offset (§5) |
|---|---|---|
| barcodes found (of 3) | 2 | **3** |
| row hits | 3 | **13** |
| false positives | 0 | 0 |
| cost per frame | 8 ms | 63 ms |

The recovered offset tracks the truth closely over most of each barcode. For the mid-sized target the fitted ${tex`d`} runs 16.7, 10.7, 4.7, 1.3, 7.3, 19.3 against a true 16.8, 10.8, 4.8, 1.2, 7.2, 19.1 as the rows sweep down through it — including the turning point, which is the centre. Errors are mostly under 0.2 template units.

Three findings worth recording, two of them mistakes:

**The rim edge was missing from the template.** \`binaryToEdges\` only reports transitions *inside* the ring array, so the disk's outer boundary against the background — the highest-contrast edge in the whole image — was absent. Every candidate offset was therefore charged for two scan edges it could never explain, which biased the search low: one row fitted ${tex`d = 4.25`} where the truth was ${tex`6.13`}. Adding ${tex`\pm N/2`} to the template fixed that row to ${tex`6.30`}, and as a side effect lifted the cross-ratio gate's rejection rate from 66.7% to **82.6%**.

**A fitted Möbius map cannot be carried between offsets.** The first refinement re-used the coarse fit's map as the initialiser at every ${tex`d`}. But that map is expressed in the *effective* coordinate ${tex`k_{\text{eff}}`} of the offset it was fitted at, so at a different offset the projection lands far enough away that the least-squares refit goes degenerate — image residuals of 15 to 24 pixels, and two confident detections at the left edge of a frame that contained nothing there. Re-deriving the initial map per offset from the window's own anchors removed both phantoms and found the third barcode.

**There is a genuine ambiguity at the resolution limit.** The smallest barcode packs 56 rings into a 32 px radius, so its inner rings are not resolved by the edge detector at all. The detector cannot distinguish *"the chord missed those rings"* from *"the camera cannot see those rings"* — both predict the same missing edges. That is why its offsets are the worst in the table (one row fits ${tex`d = 12`} where the truth is ${tex`0.63`}) even though its centre is still located to within a pixel or so. The fix is not a better search: it is to make the model resolution-aware, so a missing ring only counts as evidence for an offset when the ring would have been resolvable.`);};
const _6tvw19 = function _anonymous(md) {return (md`---
## §6 Making it fast enough to mean something

Putting the offset in the search cost 8 ms → 63 ms per frame. Before optimising anything, here is where that time actually went, measured over one frame of 40 rows:

| stage | ms | calls |
|---|---|---|
| \`refineAnchorCandidates\` | **31** | 240 calls / 506 candidates |
| \`refineOffset\` (mostly the same DP again) | 12 | 13 |
| \`edges1D\` | 2 | 40 |
| \`computeAnchorCandidatesCR\` | 2 | 240 |
| \`templateAtOffset\` | ~0 | 240 |

So ~90% of the frame is the DP alignment and its least-squares refit, at about **61 µs per candidate**. The cross-ratio work from §3 is already down in the noise — optimising it further would have been chasing the wrong number, which is exactly why it was worth profiling first.

Reading Part II's \`dpAlign\` shows why it is slow, and none of the reasons are the algorithm:

- \`matchCost\` is a **callback invoked per DP cell**, and \`getX\`/\`getS\` run \`typeof\` plus the \`in\` operator per cell — roughly 1 700 cells per candidate.
- Two typed arrays are **allocated per call** (~16 KB), so ~8 MB of garbage per frame.
- The backtrace builds a **seven-field object per aligned pair**, then reverses the array — but \`refineAnchorCandidates\` only ever reads \`templateToScan\`.

\`dpAlignFast\` fixes all three: scratch buffers reused across candidates, the cost inlined, and only an \`Int32Array\` of scan indices emitted. Part II's original stays imported as the **oracle**, and \`refineOracleCheck\` runs both over every row and every coarse offset of the benchmark frame: **51 of 51 windows identical, zero difference in either residual**. Same answers, **63 ms → 15 ms**.

### The refit that looked like a free win and was not

\`fitMobiusLS\` runs a full SVD per candidate to solve what, once the scale is fixed at \`s = 1\`, is a 3×3 normal-equation system. \`fitMobius3\` does that in closed form, and on 500 synthetic noise-free fits it matched the truth to ~1e-12 while the SVD blew up on 2.4% of cases. That looked conclusive. It was not — noise-free data has an exact solution, which is the one regime where the two objectives agree.

They are not the same objective. The SVD takes the unit-norm null vector of \`[x, 1, −kx, −k]\`, minimising an **algebraic** residual over all four parameters — total least squares, which treats error in \`x\` and in \`k\` symmetrically. Pinning \`s = 1\` and solving normal equations minimises the \`k\`-residual only. On real scan edges, with mismatched and missing rings, they land in different places — and each one looks better when scored by its own residual, so no comparison of \`kRMSE\` against \`kRMSE\` can settle it.

The cell below settles it the only way that is not self-referential: run the whole pipeline under each solver and score against the simulator's ground truth.

The closed form is nearly twice as fast and its *matched* rows are more precise — but it finds one barcode fewer and invents five false detections at the left frame edge. Recall and precision are what the detector is for, so **the SVD stays**, and the speedup is taken entirely from the DP. That is still a 4× frame, with output identical to Part II's to the last bit.

> While reading \`dpAlign\` I found a latent bug worth reporting upstream. \`getS\` returns the value itself when the input is a plain number, so for the numeric arrays \`refineAnchorCandidates\` passes it, a point's *position* is used as its *polarity*, and \`Math.sign(st) !== Math.sign(ss)\` fires on any pair straddling the origin. It is harmless today only because \`refineAnchorCandidates\` hard-codes \`polarityPenalty: 0\`.
`);};
const _1sco5vm = function _dpScratch() {
  // buffers reused across every candidate in every row; grown, never per-call allocated
  const s = {
    D: new Float64Array(0),
    P: new Int8Array(0),
    map: new Int32Array(0),
    proj: new Float64Array(0),
    px: new Float64Array(0),
    pk: new Float64Array(0),
    cells: 0,
    n: 0
  };
  s.ensure = function ensure(cells, n) {
    if (cells > s.cells) {
      s.cells = cells;
      s.D = new Float64Array(cells);
      s.P = new Int8Array(cells);
    }
    if (n > s.n) {
      s.n = n;
      s.map = new Int32Array(n);
      s.proj = new Float64Array(n);
      s.px = new Float64Array(n);
      s.pk = new Float64Array(n);
    }
  };
  return s;
};
const _1sw43f2 = function _dpAlignFast(dpScratch) {return (function dpAlignFast(tplX, N, scanX, M, gapPenalty, map) {
  // Needleman-Wunsch on 1D image positions. Same recurrence and tie-breaking as
  // Part II's dpAlign, but on flat reused buffers with the cost inlined, and it
  // emits only templateToScan (as an Int32Array, -1 for unmatched) because that
  // is the only field the refit consumes.
  const cols = M + 1;
  dpScratch.ensure((N + 1) * cols, Math.max(N, M));
  const D = dpScratch.D;
  const P = dpScratch.P;

  D[0] = 0;
  P[0] = 0;
  for (let i = 1; i <= N; i++) {
    D[i * cols] = i * gapPenalty;
    P[i * cols] = 1;
  }
  for (let j = 1; j <= M; j++) {
    D[j] = j * gapPenalty;
    P[j] = 2;
  }

  for (let i = 1; i <= N; i++) {
    const xt = tplX[i - 1];
    const base = i * cols;
    const prev = base - cols;
    for (let j = 1; j <= M; j++) {
      let m = xt - scanX[j - 1];
      if (m < 0) m = -m;
      let best = D[prev + j - 1] + m;
      let ptr = 0;
      const up = D[prev + j] + gapPenalty;
      if (up < best) {
        best = up;
        ptr = 1;
      }
      const left = D[base + j - 1] + gapPenalty;
      if (left < best) {
        best = left;
        ptr = 2;
      }
      D[base + j] = best;
      P[base + j] = ptr;
    }
  }

  for (let t = 0; t < N; t++) map[t] = -1;
  let i = N;
  let j = M;
  while (i > 0 || j > 0) {
    if (i === 0) {
      j--;
      continue;
    }
    if (j === 0) {
      i--;
      continue;
    }
    const p = P[i * cols + j];
    if (p === 0) {
      map[i - 1] = j - 1;
      i--;
      j--;
    } else if (p === 1) {
      i--;
    } else {
      j--;
    }
  }
  return D[N * cols + M];
});};
const _kzvmqd = function _fitMobius3() {return (function fitMobius3(xs, ks, n) {
  // k = (p x + q) / (r x + s). Fixing s = 1 makes this linear:
  //   [x, 1, -k x] . [p, q, r] = k
  // so the fit is a 3x3 normal-equation solve instead of an SVD. Returns null if
  // the system is ill-conditioned, so the caller can fall back to the SVD version.
  let a00 = 0, a01 = 0, a02 = 0, a11 = 0, a12 = 0, a22 = 0;
  let b0 = 0, b1 = 0, b2 = 0;
  for (let i = 0; i < n; i++) {
    const x = xs[i];
    const k = ks[i];
    const c = -k * x;
    a00 += x * x;
    a01 += x;
    a02 += x * c;
    a11 += 1;
    a12 += c;
    a22 += c * c;
    b0 += x * k;
    b1 += k;
    b2 += c * k;
  }
  // symmetric 3x3 by Cramer's rule, inlined to avoid per-candidate allocation
  const m00 = a11 * a22 - a12 * a12;
  const m01 = a01 * a22 - a12 * a02;
  const m02 = a01 * a12 - a11 * a02;
  const det = a00 * m00 - a01 * m01 + a02 * m02;
  if (!isFinite(det) || Math.abs(det) < 1e-9) return null;
  const p = (b0 * m00 - a01 * (b1 * a22 - a12 * b2) + a02 * (b1 * a12 - a11 * b2)) / det;
  const q = (a00 * (b1 * a22 - a12 * b2) - b0 * m01 + a02 * (a01 * b2 - b1 * a02)) / det;
  const r = (a00 * (a11 * b2 - b1 * a12) - a01 * (a01 * b2 - b1 * a02) + b0 * m02) / det;
  if (!isFinite(p) || !isFinite(q) || !isFinite(r)) return null;
  return { p, q, r, s: 1 };
});};
const _heushe = function _refineCandidatesFast(dpScratch,dpAlignFast,fitMobius3,fitMobiusLS) {return (function refineCandidatesFast(candidates, kSorted, scanX, opts = {}) {
  // Behavioural copy of Part II's refineAnchorCandidates, specialised: flat reused
  // buffers, inlined xFromK, no per-pair objects. `closedForm` selects the refit
  // solver — see the A/B below for why it defaults off.
  const N = kSorted.length;
  const M = scanX.length;
  if (!candidates.length || N < 3 || M < 3) return [];
  const gapPenalty = opts.gapPenalty ?? 20;
  const topK = opts.topK ?? candidates.length;
  const closedForm = opts.closedForm ?? false;
  dpScratch.ensure((N + 1) * (M + 1), Math.max(N, M));
  const proj = dpScratch.proj;
  const map = dpScratch.map;
  const px = dpScratch.px;
  const pk = dpScratch.pk;

  const out = [];
  for (const cand of candidates) {
    const mob = cand.mobiusInitial ?? cand.mobius;
    if (!mob) continue;
    const mp = mob.p, mq = mob.q, mr = mob.r, ms = mob.s;
    for (let t = 0; t < N; t++) {
      const k = kSorted[t];
      const den = k * mr - mp;
      proj[t] = Math.abs(den) < 1e-12 ? NaN : (mq - k * ms) / den;
    }
    dpAlignFast(proj, N, scanX, M, gapPenalty, map);

    let n = 0;
    for (let t = 0; t < N; t++) {
      const sj = map[t];
      if (sj >= 0) {
        px[n] = scanX[sj];
        pk[n] = kSorted[t];
        n++;
      }
    }
    if (n < 3) continue;

    let mobR = closedForm ? fitMobius3(px, pk, n) : null;
    if (!mobR) {
      const arr = new Array(n);
      for (let i = 0; i < n; i++) arr[i] = { x: px[i], k: pk[i] };
      try {
        mobR = fitMobiusLS(arr);
      } catch {
        continue;
      }
    }

    const { p, q, r, s } = mobR;
    let se = 0, sx = 0, cnt = 0, cntx = 0;
    for (let t = 0; t < N; t++) {
      const sj = map[t];
      if (sj < 0) continue;
      const x = scanX[sj];
      const kT = kSorted[t];
      const den = r * x + s;
      if (!isFinite(den) || Math.abs(den) < 1e-12) continue;
      const e = (p * x + q) / den - kT;
      se += e * e;
      cnt++;
      const dx = kT * r - p;
      if (Math.abs(dx) >= 1e-12) {
        const predX = (q - kT * s) / dx;
        if (isFinite(predX)) {
          const ex = predX - x;
          sx += ex * ex;
          cntx++;
        }
      }
    }
    if (cnt === 0) continue;
    out.push({
      startIndex: cand.startIndex,
      endIndex: cand.endIndex,
      pairs4: cand.pairs4,
      mobiusInitial: cand.mobiusInitial,
      mobiusRefined: mobR,
      kRMSE_full: Math.sqrt(se / cnt),
      xRMSE_full: cntx ? Math.sqrt(sx / cntx) : Infinity,
      pairsUsed: n
    });
  }
  out.sort((a, b) => a.kRMSE_full - b.kRMSE_full || a.xRMSE_full - b.xRMSE_full);
  return out.slice(0, topK);
});};
const _xe0wrc = function _refineOracleCheck(scanRows,edges1D,rowOf,benchFrame,edgeThreshold,templateAtOffset,template_edges,computeAnchorCandidatesCR,crTol,refineAnchorCandidates,refineCandidatesFast) {
  // Part II's refineAnchorCandidates is the reference. Run both over every row and
  // every coarse offset of the benchmark frame and compare the chosen windows.
  const dGrid = [0, 4, 8, 12, 16, 20];
  let compared = 0;
  let sameWindow = 0;
  let maxKDiff = 0;
  let maxXDiff = 0;
  let fastNull = 0;
  const disagreements = [];
  for (const y of scanRows) {
    const se = edges1D(rowOf(benchFrame, y), edgeThreshold);
    if (se.length < 4) continue;
    const scanXArr = Float64Array.from(se, (e) => e.x);
    for (const d of dGrid) {
      const te = templateAtOffset(template_edges, d);
      if (te.length < 16) continue;
      const kSorted = te.slice().sort((a, b) => a - b);
      const cands = computeAnchorCandidatesCR(te, se, { topK: 20, crTol });
      if (!cands.length) continue;
      const ref = refineAnchorCandidates(cands, te, se, { topK: 20 });
      const fast = refineCandidatesFast(cands, kSorted, scanXArr, { topK: 20 });
      compared++;
      if (!ref.length && !fast.length) {
        sameWindow++;
        continue;
      }
      if (!ref.length || !fast.length) {
        fastNull++;
        continue;
      }
      const a = ref[0];
      const b = fast[0];
      if (a.startIndex === b.startIndex && a.endIndex === b.endIndex) {
        sameWindow++;
        maxKDiff = Math.max(maxKDiff, Math.abs(a.kRMSE_full - b.kRMSE_full));
        if (isFinite(a.xRMSE_full) && isFinite(b.xRMSE_full))
          maxXDiff = Math.max(maxXDiff, Math.abs(a.xRMSE_full - b.xRMSE_full));
      } else if (disagreements.length < 6) {
        disagreements.push({
          y,
          d,
          orig: [a.startIndex, a.endIndex, +a.kRMSE_full.toFixed(3), +a.xRMSE_full.toFixed(2)],
          fast: [b.startIndex, b.endIndex, +b.kRMSE_full.toFixed(3), +b.xRMSE_full.toFixed(2)]
        });
      }
    }
  }
  return {
    comparisons: compared,
    identicalTopWindow: sameWindow,
    oneSideEmpty: fastNull,
    maxAbs_kRMSE_diff: +maxKDiff.toExponential(2),
    maxAbs_xRMSE_diff: +maxXDiff.toExponential(2),
    disagreements
  };
};
const _1cvajvr = function _runPipeline(scanRows,edges1D,rowOf,edgeThreshold,detectRowOffsets,template_edges,refineOffset,xFromK) {return (function runPipeline(frame, opts = {}) {
  const t0 = performance.now();
  const hits = [];
  let windows = 0;
  let survived = 0;
  let edges = 0;
  for (const y of scanRows) {
    const se = edges1D(rowOf(frame, y), opts.edgeThreshold ?? edgeThreshold);
    edges += se.length;
    const dets = detectRowOffsets(se, template_edges, opts);
    windows += dets.windows;
    survived += dets.survived;
    for (const det of dets) {
      // local fine search around the coarse offset that won
      const fine = refineOffset(det, se, template_edges, {
        steps: 12,
        dMin: Math.max(0, det.dCoarse - 4),
        dMax: det.dCoarse + 4
      });
      const mob = fine ? fine.mobius : det.mobius;
      hits.push({
        y,
        startIndex: det.startIndex,
        endIndex: det.endIndex,
        mobius: mob,
        d: fine ? fine.d : det.dCoarse,
        dCoarse: det.dCoarse,
        kRMSE: fine ? fine.kRMSE : det.kRMSE,
        xRMSE: fine ? fine.xRMSE : det.xRMSE,
        pairsUsed: fine ? fine.pairsUsed : det.pairsUsed,
        // k_eff = 0 is the foot of the perpendicular from the centre onto the chord
        footX: xFromK(mob, 0),
        leftX: det.leftX,
        rightX: det.rightX
      });
    }
  }
  const ms = performance.now() - t0;
  return {
    frame: frame.n,
    hits,
    ms,
    rowsTouched: scanRows.length,
    pixelsTouched: scanRows.length * frame.w,
    frameArea: frame.w * frame.h,
    scanEdges: edges,
    windows,
    survived
  };
});};
const _1hazhn = function _scoreHits(groundTruth,template_edges) {return (function scoreHits(run) {
  const gt = groundTruth.filter((b) => b.onScreen);
  let rimR = 0;
  for (const k of template_edges) rimR = Math.max(rimR, Math.abs(k));
  const rows = [];
  const foundIds = new Set();
  for (const hit of run.hits) {
    let best = null;
    let bestDist = Infinity;
    for (const b of gt) {
      const r = Math.hypot(
        (hit.footX - b.cx) / b.xExtent,
        (hit.y - b.cy) / b.yExtent
      );
      if (r < bestDist) {
        bestDist = r;
        best = b;
      }
    }
    const ok = best && bestDist <= 1;
    if (ok) foundIds.add(best.id);
    // ground-truth chord offset in template units (fronto-parallel approximation:
    // the rim radius maps to the ellipse's vertical extent)
    const dTrue = ok ? (rimR * (hit.y - best.cy)) / best.yExtent : null;
    rows.push({
      y: hit.y,
      gtId: ok ? best.id : null,
      footX: +hit.footX.toFixed(2),
      errX: ok ? +(hit.footX - best.cx).toFixed(3) : null,
      dFit: +hit.d.toFixed(2),
      dTrue: ok ? +dTrue.toFixed(2) : null,
      errD: ok ? +(hit.d - Math.abs(dTrue)).toFixed(2) : null,
      xRMSE: +hit.xRMSE.toFixed(3)
    });
  }
  const matched = rows.filter((r) => r.gtId !== null);
  const rms = (xs) =>
    xs.length ? Math.sqrt(xs.reduce((a, b) => a + b * b, 0) / xs.length) : null;
  const rx = rms(matched.map((r) => r.errX));
  const rd = rms(matched.map((r) => r.errD));
  return {
    barcodesOnScreen: gt.length,
    barcodesFound: foundIds.size,
    rowHits: rows.length,
    falsePositives: rows.length - matched.length,
    rmsErrX_px: rx == null ? null : +rx.toFixed(3),
    rmsErrD_templateUnits: rd == null ? null : +rd.toFixed(3),
    msPerFrame: +run.ms.toFixed(1),
    perRow: rows
  };
});};
const _1pqqej3 = function _solverAB(runPipeline,simFrame,crTol,maxRMSE,scoreHits) {
  // The only non-self-referential test. Each solver minimises a different objective,
  // so each looks best under its own residual — comparing kRMSE against kRMSE cannot
  // settle it. Run the whole pipeline under each and score against ground truth.
  const arms = [
    { name: "SVD (Part II) — total least squares", closedForm: false },
    { name: "closed form — 3x3 normal equations, s=1", closedForm: true }
  ];
  const rows = [];
  for (const arm of arms) {
    runPipeline(simFrame, { crTol, maxRMSE, closedForm: arm.closedForm }); // warm up
    const run = runPipeline(simFrame, {
      crTol,
      maxRMSE,
      closedForm: arm.closedForm
    });
    const s = scoreHits(run);
    rows.push({
      solver: arm.name,
      found: `${s.barcodesFound}/${s.barcodesOnScreen}`,
      rowHits: s.rowHits,
      falsePos: s.falsePositives,
      errX_px: s.rmsErrX_px,
      errD: s.rmsErrD_templateUnits,
      ms: s.msPerFrame
    });
  }
  return rows;
};
const _1xi1t3n = function _anonymous(Inputs,solverAB) {return (Inputs.table(solverAB, {
  header: {
    solver: "refit solver",
    found: "barcodes",
    rowHits: "row hits",
    falsePos: "false pos",
    errX_px: "rms err x (px)",
    errD: "rms err d",
    ms: "ms/frame"
  },
  width: { solver: 260 }
}));};
const _17g7uf6 = function _anonymous(md,tex) {return (md`---
## §7 From rows to a centre

Everything so far is per-row. A row hit gives two numbers: \`footX\`, the image x of the foot of the perpendicular from the barcode centre onto that scan line, and \`d\`, the perpendicular distance from the centre to that line — but in **template units**, and only its magnitude. §5 showed why the sign is gone: the chord meets the ring of radius \`k\` at \`±sqrt(k² − d²)\`, and only \`d²\` appears, so one chord cannot tell above from below.

Stack the rows and it comes back. If the centre is at image row \`y_c\` and the barcode images at \`s\` pixels per template unit vertically, then every row obeys

${tex`|y_c - y_i| = s\,d_i`}

which is a **V** in \`(y, d)\` — and the rows above the centre sit on one arm, the rows below on the other. Two unknowns, one equation per row, so three rows already over-determine it, and the sign ambiguity is resolved by the fit rather than assumed away.

The V is only piecewise linear, but it is linear once you commit to which rows are above the centre. Sort by \`y\` and there are just \`n+1\` such splits, each an exact two-parameter least squares — no search, no initialisation, no local minima. Take the split with the lowest residual that is self-consistent.

\`s\` is not a nuisance parameter, it is the second thing you wanted: pixels per template unit is apparent size, and apparent size is range.

For x, \`footX\` is very nearly constant down a barcode, but not exactly — under tilt it drifts a little with \`y\`. So fit a line through \`footX\` against \`y\` and read it at \`y_c\` rather than averaging.
`);};
const _152ks9q = function _clusterHits(rowStride) {return (function clusterHits(hits, opts = {}) {
  // Group row hits that plausibly belong to the same barcode: close in footX
  // relative to the barcode's own apparent width, and not too many rows apart.
  const xTol = opts.xTol ?? 0.6;
  const maxRowGap = opts.maxRowGap ?? 3;
  const minRows = opts.minRows ?? 3;
  const sorted = hits
    .filter((h) => isFinite(h.footX) && isFinite(h.d))
    .sort((a, b) => a.y - b.y || a.footX - b.footX);
  const clusters = [];
  for (const h of sorted) {
    const span = Math.abs(h.rightX - h.leftX);
    const half = isFinite(span) && span > 1 ? span / 2 : 30;
    let best = null;
    let bestDx = Infinity;
    for (const c of clusters) {
      const last = c[c.length - 1];
      if (h.y - last.y > maxRowGap * rowStride) continue;
      const dx = Math.abs(h.footX - last.footX);
      if (dx > xTol * half) continue;
      if (dx < bestDx) {
        bestDx = dx;
        best = c;
      }
    }
    if (best) best.push(h);
    else clusters.push([h]);
  }
  return clusters.filter((c) => c.length >= minRows);
});};
const _1czkbg9 = function _fuseCluster(template_edges) {return (function fuseCluster(cluster, opts = {}) {
  const robust = opts.robust ?? true;
  const maxPasses = opts.maxPasses ?? 3;

  // |y_c - y_i| = s * d_i. Commit to a split (which rows are above the centre)
  // and the model is linear: y_i = y_c + sigma_i * s * d_i. There are only n+1
  // splits, so enumerate them exactly instead of searching.
  const fitV = (rows) => {
    const n = rows.length;
    if (n < 3) return null;
    const ys = rows.map((h) => h.y);
    const ds = rows.map((h) => Math.abs(h.d));
    let best = null;
    for (let k = 0; k <= n; k++) {
      // rows [0,k) above the centre (sigma = -1), [k,n) below (sigma = +1)
      let A = 0, B = 0, Y = 0, C = 0;
      for (let i = 0; i < n; i++) {
        const sg = i < k ? -1 : 1;
        A += sg * ds[i];
        B += ds[i] * ds[i];
        Y += ys[i];
        C += sg * ds[i] * ys[i];
      }
      const det = n * B - A * A;
      if (!isFinite(det) || Math.abs(det) < 1e-9) continue;
      const yc = (Y * B - A * C) / det;
      const s = (n * C - A * Y) / det;
      if (!isFinite(yc) || !isFinite(s) || s <= 0) continue;
      // the split has to agree with where the fit actually put the centre
      let consistent = true;
      for (let i = 0; i < n && consistent; i++) {
        if (ys[i] < yc !== i < k) consistent = false;
      }
      if (!consistent) continue;
      let sse = 0;
      for (let i = 0; i < n; i++) {
        const r = Math.abs(yc - ys[i]) - s * ds[i];
        sse += r * r;
      }
      if (!best || sse < best.sse) best = { yc, s, sse, split: k };
    }
    return best;
  };

  const all = cluster.slice().sort((a, b) => a.y - b.y);
  let v = fitV(all);
  if (!v) return null;
  let rows = all;

  // A single row whose offset search landed on the wrong d drags the whole V.
  // Re-select from *all* rows each pass rather than only from the survivors: the
  // first cut is computed against a contaminated fit, so it also rejects good rows
  // that the refit then vindicates.
  if (robust && all.length > 3) {
    for (let pass = 0; pass < maxPasses; pass++) {
      const res = all.map((h) => Math.abs(v.yc - h.y) - v.s * Math.abs(h.d));
      const abs = res.map(Math.abs).sort((a, b) => a - b);
      const med = abs[Math.floor(abs.length / 2)];
      const cut = Math.max(opts.minCut ?? 1.5, (opts.cutFactor ?? 2.5) * med);
      const keep = all.filter((h, i) => Math.abs(res[i]) <= cut);
      if (keep.length < 3) break;
      if (keep.length === rows.length && keep.every((h, i) => h === rows[i]))
        break;
      const v2 = fitV(keep);
      if (!v2) break;
      rows = keep;
      v = v2;
    }
  }

  // x: footX drifts slightly with y under tilt, so fit a line and read it at y_c
  const n = rows.length;
  let sy = 0, sx = 0, syy = 0, sxy = 0;
  for (const h of rows) {
    const t = h.y - v.yc;
    sy += t;
    sx += h.footX;
    syy += t * t;
    sxy += t * h.footX;
  }
  const denom = n * syy - sy * sy;
  let xc, slope;
  if (Math.abs(denom) < 1e-9) {
    xc = sx / n;
    slope = 0;
  } else {
    slope = (n * sxy - sy * sx) / denom;
    xc = (sx - slope * sy) / n;
  }

  let rimR = 0;
  for (const k of template_edges) rimR = Math.max(rimR, Math.abs(k));
  return {
    xc,
    yc: v.yc,
    pxPerTemplateUnit: v.s,
    apparentRadiusY: v.s * rimR,
    xSlope: slope,
    rows: n,
    dropped: all.length - n,
    yResidual: Math.sqrt(v.sse / n),
    yRange: [rows[0].y, rows[n - 1].y]
  };
});};
const _hp712 = function _fusedCentres(clusterHits,frameDetections,fuseCluster) {return (clusterHits(frameDetections.hits)
  .map((c) => {
    const f = fuseCluster(c);
    return f ? { ...f, hits: c } : null;
  })
  .filter(Boolean));};
const _chuiga = function _fusionAccuracy(groundTruth,fusedCentres) {
  const gt = groundTruth.filter((b) => b.onScreen);
  const claimed = new Set();
  const rows = fusedCentres.map((f) => {
    let best = null;
    let bestDist = Infinity;
    for (const b of gt) {
      const r = Math.hypot(
        (f.xc - b.cx) / b.xExtent,
        (f.yc - b.cy) / b.yExtent
      );
      if (r < bestDist) {
        bestDist = r;
        best = b;
      }
    }
    const ok = best && bestDist <= 1;
    if (ok) claimed.add(best.id);
    return {
      gtId: ok ? best.id : null,
      rows: f.rows,
      xc: +f.xc.toFixed(2),
      yc: +f.yc.toFixed(2),
      errX_px: ok ? +(f.xc - best.cx).toFixed(3) : null,
      errY_px: ok ? +(f.yc - best.cy).toFixed(3) : null,
      radiusY_px: +f.apparentRadiusY.toFixed(2),
      radiusY_true: ok ? +best.yExtent.toFixed(2) : null,
      errRadius_px: ok ? +(f.apparentRadiusY - best.yExtent).toFixed(2) : null,
      yResidual_px: +f.yResidual.toFixed(2)
    };
  });
  const matched = rows.filter((r) => r.gtId !== null);
  const rms = (xs) =>
    xs.length ? Math.sqrt(xs.reduce((a, b) => a + b * b, 0) / xs.length) : null;
  const rx = rms(matched.map((r) => r.errX_px));
  const ry = rms(matched.map((r) => r.errY_px));
  return {
    barcodesOnScreen: gt.length,
    centresFused: rows.length,
    matched: matched.length,
    missed: gt.filter((b) => !claimed.has(b.id)).map((b) => b.id),
    rmsErrX_px: rx == null ? null : +rx.toFixed(3),
    rmsErrY_px: ry == null ? null : +ry.toFixed(3),
    perBarcode: rows
  };
};
const _306jxo = function _fusionLayer(htl,fusedCentres,overlaySvg,invalidation) {
  const g = htl.svg`<g></g>`;
  for (const f of fusedCentres) {
    if (!isFinite(f.xc) || !isFinite(f.yc)) continue;
    const r = isFinite(f.apparentRadiusY) ? f.apparentRadiusY : 0;
    // vertical extent is what the V actually measured — draw only that
    g.appendChild(
      htl.svg`<line x1="${f.xc}" y1="${f.yc - r}" x2="${f.xc}" y2="${f.yc + r}" stroke="#a78bfa" stroke-width="1" opacity="0.7"/>`
    );
    for (const yy of [f.yc - r, f.yc + r]) {
      g.appendChild(
        htl.svg`<line x1="${f.xc - 5}" y1="${yy}" x2="${f.xc + 5}" y2="${yy}" stroke="#a78bfa" stroke-width="1" opacity="0.7"/>`
      );
    }
    g.appendChild(
      htl.svg`<line x1="${f.xc - 9}" y1="${f.yc}" x2="${f.xc + 9}" y2="${f.yc}" stroke="#a78bfa" stroke-width="1.6"/>`
    );
    g.appendChild(
      htl.svg`<line x1="${f.xc}" y1="${f.yc - 9}" x2="${f.xc}" y2="${f.yc + 9}" stroke="#a78bfa" stroke-width="1.6"/>`
    );
  }
  overlaySvg.appendChild(g);
  invalidation.then(() => g.remove());
  return; // side-effect cell: the node lives in overlaySvg, not here
};
const _8h39vn = function _anonymous(md) {return (md`### What the V bought, and what it did not

Fusing rows is worth more than it looks. The per-row x readings scatter by 1.372 px rms; the fused centres sit **0.34 px** in x and **0.26 px** in y from truth, and the apparent radius comes out at 56.00 px against a true 56.10 — from scan lines 12 px apart. Sub-pixel in both axes, from a detector that only ever looked at 8% of the rows.

Two honest qualifications.

**The zero residual is quantisation, not perfection.** \`refineOffset\` sweeps \`d\` on a fixed grid, so the fitted offsets land on multiples of ⅔ of a template unit. For the large barcode the true V happens to pass exactly through those grid points, and the residual collapses to 1e-14. That is the *discretisation* agreeing with itself. The residual is a useful outlier detector — it is what catches the bad row — but it is not a measure of absolute accuracy. The ground-truth columns are.

**One bad row costs several pixels.** Row \`y=270\` fits \`d=18.67\` where the truth is 13.15, and it drags the whole V: without the robust pass the radius comes out 4.4 px short and \`y_c\` is 1.5 px off. The first cut is computed against a fit that the outlier has already contaminated, so it also rejects a good row (\`y=282\`, whose own \`d\` was accurate to 0.19). Re-selecting from *all* rows against each refit vindicates that row on the next pass — which is why the loop reconsiders every row rather than only the survivors.

The third barcode is still missing. It survives detection on only two rows, and two points cannot pin a V that has two parameters — \`minRows\` is 3. This is the same resolution limit as §5: 56 rings inside a 32 px radius, where "the chord missed those rings" and "the camera cannot resolve those rings" predict identical evidence. More scan rows would fix it; a better search would not.

And the shape estimate is deliberately one-sided. The V measures the *vertical* scale, because horizontal scan lines only ever sample vertical offsets. Nothing here recovers the horizontal extent, so nothing here recovers tilt — the crosshair is drawn with a vertical extent bar and no ellipse, because an ellipse would be claiming more than was measured. That is what a vertical scan pass is for.
`);};
const _13t455s = function _anonymous(md) {return (md`---
## §8 Real pixels

Everything up to here ran on a simulator, which is what made the numbers meaningful: every claim in §4–§7 is checked against a pose the renderer actually used. A camera has no ground truth, so this section proves something different — that the detector works on pixels nobody generated for it. Real optics, real noise, real motion blur, real rolling shutter.

It is not a speed test. A webcam hands over whole frames, so reading 40 rows out of one costs exactly as much as reading all 480 — the saving this whole line of work is built on only materialises when the *sensor* can be told which rows to read out. The figure to watch is still **rows touched** and **µs per row**, not frames per second. What the camera tests is whether the 1D matcher survives contact with a real image.

Nothing below requests the camera until you turn it on.
`);};
const _1ptfs7b = function _cameraOn(Inputs) {return (Inputs.toggle({
  label: "camera",
  value: false
}));};
const _13xr3f6 = (G, _) => G.input(_);
const _rdku58 = async function _cameraStream(cameraOn,FRAME,invalidation) {
  if (!cameraOn) return null;
  try {
    const stream = await window.navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: FRAME.w },
        height: { ideal: FRAME.h },
        facingMode: "environment"
      }
    });
    invalidation.then(() => {
      for (const t of stream.getTracks()) t.stop();
    });
    return stream;
  } catch (e) {
    return { error: String((e && e.message) || e) };
  }
};
const _1b8pqpk = async function _cameraVideo(htl,cameraStream,invalidation) {
  const v = htl.html`<video playsinline muted autoplay style="display:none"></video>`;
  if (cameraStream && !cameraStream.error) {
    v.srcObject = cameraStream;
    try {
      await v.play();
    } catch (e) {
      // autoplay policy can reject; the element still decodes once visible
    }
  }
  invalidation.then(() => {
    try {
      v.pause();
      v.srcObject = null;
    } catch (e) {}
  });
  return v;
};
const _h3lb04 = function _cameraCanvas(htl,FRAME) {return (htl.html`<canvas width=${FRAME.w} height=${FRAME.h} style="width:100%;height:auto;display:block;background:#111"></canvas>`);};
const _fqnxzy = async function* _cameraFrame(cameraStream,cameraCanvas,FRAME,cameraVideo) {
  if (!cameraStream || cameraStream.error) {
    yield null;
    await new Promise(() => {}); // park until the toggle re-runs this cell
  }
  const ctx = cameraCanvas.getContext("2d", { willReadFrequently: true });
  const gray = new Uint8Array(FRAME.w * FRAME.h);
  const t0 = performance.now();
  let n = 0;
  while (true) {
    await new Promise((r) => window.requestAnimationFrame(r));
    if (cameraVideo.readyState < 2) continue;
    ctx.drawImage(cameraVideo, 0, 0, FRAME.w, FRAME.h);
    const px = ctx.getImageData(0, 0, FRAME.w, FRAME.h).data;
    // ITU-R 601 luma, integer weights summing to 256
    for (let i = 0, p = 0; i < gray.length; i++, p += 4) {
      gray[i] = (px[p] * 77 + px[p + 1] * 150 + px[p + 2] * 29) >> 8;
    }
    yield {
      gray,
      w: FRAME.w,
      h: FRAME.h,
      t: (performance.now() - t0) / 1000,
      n: n++,
      source: "camera"
    };
  }
};
const _1mlmqdk = function _cameraOverlaySvg(htl,FRAME) {return (htl.svg`<svg viewBox="0 0 ${FRAME.w} ${FRAME.h}" style="position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none"></svg>`);};
const _if9vzt = function _cameraView(htl,FRAME,cameraCanvas,cameraOverlaySvg,cameraVideo) {
  const div = htl.html`<div style="position:relative;width:100%;max-width:${FRAME.w}px;border:1px solid var(--theme-foreground-faintest,#888)"></div>`;
  div.appendChild(cameraCanvas);
  div.appendChild(cameraOverlaySvg);
  div.appendChild(cameraVideo);
  return div;
};
const _3h2tue = function _cameraDetections(cameraFrame,runPipeline,crTol,maxRMSE) {return (cameraFrame
  ? runPipeline(cameraFrame, { crTol, maxRMSE })
  : null);};
const _jkixb7 = function _cameraFused(cameraDetections,clusterHits,fuseCluster) {return (cameraDetections
  ? clusterHits(cameraDetections.hits)
      .map((c) => fuseCluster(c))
      .filter(Boolean)
  : []);};
const _1mhec6j = function _cameraLayer(htl,scanRows,FRAME,cameraDetections,cameraFused,cameraOverlaySvg) {
  const g = htl.svg`<g></g>`;
  for (const y of scanRows) {
    g.appendChild(
      htl.svg`<line x1="0" y1="${y}" x2="${FRAME.w}" y2="${y}" stroke="#ff5375" stroke-width="0.6" opacity="0.2"/>`
    );
  }
  if (cameraDetections) {
    for (const d of cameraDetections.hits) {
      if (!isFinite(d.leftX) || !isFinite(d.rightX) || !isFinite(d.footX))
        continue;
      g.appendChild(
        htl.svg`<line x1="${d.leftX}" y1="${d.y}" x2="${d.rightX}" y2="${d.y}" stroke="#ffd166" stroke-width="2" opacity="0.9"/>`
      );
      g.appendChild(
        htl.svg`<circle cx="${d.footX}" cy="${d.y}" r="3" fill="none" stroke="#ffd166" stroke-width="1.5"/>`
      );
    }
  }
  for (const f of cameraFused) {
    if (!isFinite(f.xc) || !isFinite(f.yc)) continue;
    const r = isFinite(f.apparentRadiusY) ? f.apparentRadiusY : 0;
    g.appendChild(
      htl.svg`<line x1="${f.xc}" y1="${f.yc - r}" x2="${f.xc}" y2="${f.yc + r}" stroke="#a78bfa" stroke-width="1" opacity="0.7"/>`
    );
    g.appendChild(
      htl.svg`<line x1="${f.xc - 9}" y1="${f.yc}" x2="${f.xc + 9}" y2="${f.yc}" stroke="#a78bfa" stroke-width="1.6"/>`
    );
    g.appendChild(
      htl.svg`<line x1="${f.xc}" y1="${f.yc - 9}" x2="${f.xc}" y2="${f.yc + 9}" stroke="#a78bfa" stroke-width="1.6"/>`
    );
  }
  cameraOverlaySvg.replaceChildren(g);
  return; // side-effect cell: the node lives in cameraOverlaySvg
};
const _12edsor = function _cameraStats(cameraStream,cameraDetections,FRAME,cameraFused) {
  if (!cameraStream) return { camera: "off" };
  if (cameraStream.error) return { camera: "denied or unavailable", detail: cameraStream.error };
  if (!cameraDetections) return { camera: "starting" };
  const d = cameraDetections;
  return {
    camera: "live",
    frame: d.frame,
    rowsTouched: d.rowsTouched,
    frameRows: FRAME.h,
    fractionOfFrame: +((d.rowsTouched / FRAME.h) * 100).toFixed(1) + "%",
    usPerRow: +((d.ms * 1000) / d.rowsTouched).toFixed(1),
    msPerFrame: +d.ms.toFixed(1),
    scanEdges: d.scanEdges,
    windows: d.windows,
    survivedCrossRatio: d.survived,
    rowHits: d.hits.length,
    barcodesTracked: cameraFused.length
  };
};
const _e6l2ks = function _barcodeTarget(barcodeTexture,htl) {
  // the same rings the simulator textures its planes with, at print size —
  // show this on another screen (or print it) and point the camera at it
  const src = barcodeTexture.image;
  const c = htl.html`<canvas width=${src.width} height=${src.height} style="width:100%;max-width:340px;height:auto;display:block;background:#fff"></canvas>`;
  c.getContext("2d").drawImage(src, 0, 0);
  return c;
};
const _yko5dl = function _anonymous(md) {return (md`Turn the camera on and point it at \`barcodeTarget\` above — on a second screen, a phone, or printed. The overlay is the same three layers as the simulator: faint red scan rows, amber per-row fits with a ring on the foot of each perpendicular, and a violet crosshair with a vertical extent bar wherever three or more rows fuse into a centre.

Nothing about the detector changed for this section. \`runPipeline\` takes a frame, and a frame is \`{gray, w, h}\` — the camera path just fills that shape from \`getImageData\` instead of from WebGL. The same \`clusterHits\` and \`fuseCluster\` from §7 run on the result.

Two things to expect that the simulator never showed. The rings are painted with hard black-and-white edges, so a real lens and a real sensor will soften them; if \`rowHits\` stays at zero, \`edgeThreshold\` is the first knob to reach for, not the matcher. And the barcode has to be large enough in frame — the §5 resolution limit is not a simulation artifact, and a barcode 60 px across on a webcam is the same 56-rings-in-30-pixels problem that lost the third barcode in §7.
`);};
const _azcir1 = function _cameraBestState() {return ({ best: null, framesSeen: 0, framesWithHits: 0 });};
const _zacj47 = function _cameraBest(cameraBestState,cameraDetections,cameraFused,FRAME) {
  // A live readout is gone the moment the target leaves frame, so keep the best
  // frame of the session. Deliberately stateful — it is a measuring instrument,
  // not part of the dataflow; it resets on reload.
  const st = cameraBestState;
  if (cameraDetections) {
    st.framesSeen++;
    const hits = cameraDetections.hits.length;
    if (hits > 0) st.framesWithHits++;
    const score = cameraFused.length * 1000 + hits;
    if (!st.best || score > st.best.score) {
      st.best = {
        score,
        frame: cameraDetections.frame,
        rowHits: hits,
        barcodesTracked: cameraFused.length,
        usPerRow: +((cameraDetections.ms * 1000) / cameraDetections.rowsTouched).toFixed(1),
        msPerFrame: +cameraDetections.ms.toFixed(1),
        rowsTouched: cameraDetections.rowsTouched,
        fractionOfFrame: +((cameraDetections.rowsTouched / FRAME.h) * 100).toFixed(1),
        scanEdges: cameraDetections.scanEdges,
        windows: cameraDetections.windows,
        survivedCrossRatio: cameraDetections.survived,
        centres: cameraFused.map((f) => ({
          rows: f.rows,
          dropped: f.dropped,
          xc: +f.xc.toFixed(1),
          yc: +f.yc.toFixed(1),
          radiusY: +f.apparentRadiusY.toFixed(1),
          yResidual: +f.yResidual.toFixed(2)
        }))
      };
    }
  }
  return {
    framesSeen: st.framesSeen,
    framesWithAnyHit: st.framesWithHits,
    hitRate:
      st.framesSeen > 0
        ? +((st.framesWithHits / st.framesSeen) * 100).toFixed(1) + "%"
        : null,
    best: st.best
  };
};
const _17zazhe = function _anonymous(md) {return (md`### What the camera actually did

First run against a real lens, handheld, barcode shown on a second screen — 354 frames:

| | |
|---|---|
| frames with at least one row hit | **334 / 354 — 94.4%** |
| best frame | 9 row hits, 2 centres fused |
| rows touched | 40 of 480 — **8.3% of the frame** |
| time | **75 µs per row**, 3 ms per frame |
| cross-ratio gate | 1392 windows → 130 survived (**90.7% rejected**) |

Three things are worth reading off that.

The detector survives contact with real optics without a single parameter changed from the simulator — same \`edgeThreshold\`, same \`crTol\`, same \`maxRMSE\`. A 94% frame hit rate handheld is not a marginal result.

The cross-ratio pre-filter works *harder* on camera than on synthetic frames — 90.7% of windows rejected versus 82.6% in §3. Real images produce far more spurious edges, so there are many more windows to reject, and almost all of them fail an invariant that costs four subtractions to check. That is exactly the shape of thing you want in front of an expensive matcher.

And the frame is **3 ms** rather than the simulator's 15, because so little survives to reach the DP. The per-row cost is what to quote — 75 µs, against 40 rows — since that is the number that would still hold if the sensor handed over only those rows.

The fit residuals are honest about the change of régime: the fused centres came back with \`yResidual\` of 4.9 and 7.6 px, against 0.56 in simulation. Nothing here has ground truth, so those residuals are the only quality signal available — and unlike §7 they cannot be checked against a known pose. The two centres in the best frame have apparent radii of 126 px and 21 px, so at most one of them is the barcode that was actually being held up. Without ground truth this section can demonstrate that the pipeline runs and locks on; it cannot certify what it locked on to. That is the price of leaving the simulator, and it is why §4–§7 were measured before this section existed.
`);};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  $def("_rmc2bw", "_rmc2bw", ["md"], _rmc2bw);  
  main.define("module @tomlarkworthy/fast-1d-circular-barcode-matching", async () => runtime.module((await import("/@tomlarkworthy/fast-1d-circular-barcode-matching.js?v=4")).default));  
  main.define("template", ["module @tomlarkworthy/fast-1d-circular-barcode-matching", "@variable"], (_, v) => v.import("template", _));  
  main.define("edges1D", ["module @tomlarkworthy/fast-1d-circular-barcode-matching", "@variable"], (_, v) => v.import("edges1D", _));  
  main.define("binaryToEdges", ["module @tomlarkworthy/fast-1d-circular-barcode-matching", "@variable"], (_, v) => v.import("binaryToEdges", _));  
  main.define("dpAlign", ["module @tomlarkworthy/fast-1d-circular-barcode-matching", "@variable"], (_, v) => v.import("dpAlign", _));  
  main.define("fitMobiusLS", ["module @tomlarkworthy/fast-1d-circular-barcode-matching", "@variable"], (_, v) => v.import("fitMobiusLS", _));  
  main.define("xFromK", ["module @tomlarkworthy/fast-1d-circular-barcode-matching", "@variable"], (_, v) => v.import("xFromK", _));  
  main.define("solve3", ["module @tomlarkworthy/fast-1d-circular-barcode-matching", "@variable"], (_, v) => v.import("solve3", _));  
  main.define("computeAnchorCandidatesFast", ["module @tomlarkworthy/fast-1d-circular-barcode-matching", "@variable"], (_, v) => v.import("computeAnchorCandidatesFast", _));  
  main.define("refineAnchorCandidates", ["module @tomlarkworthy/fast-1d-circular-barcode-matching", "@variable"], (_, v) => v.import("refineAnchorCandidates", _));  
  main.define("autoFitScanline", ["module @tomlarkworthy/fast-1d-circular-barcode-matching", "@variable"], (_, v) => v.import("autoFitScanline", _));  
  $def("_kw4vas", "_kw4vas", ["md"], _kw4vas);  
  main.define("module @tomlarkworthy/circular-barcode-simulator", async () => runtime.module((await import("/@tomlarkworthy/circular-barcode-simulator.js?v=4")).default));  
  main.define("THREE", ["module @tomlarkworthy/circular-barcode-simulator", "@variable"], (_, v) => v.import("THREE", _));  
  main.define("synthetic", ["module @tomlarkworthy/circular-barcode-simulator", "@variable"], (_, v) => v.import("synthetic", _));  
  $def("_s6irrw", "FRAME", [], _s6irrw);  
  $def("_jryoj3", "viewof nBarcodes", ["Inputs"], _jryoj3);  
  $def("_i48s7l", "nBarcodes", ["Generators","viewof nBarcodes"], _i48s7l);  
  $def("_12np1sq", "viewof motion", ["Inputs"], _12np1sq);  
  $def("_13kodma", "motion", ["Generators","viewof motion"], _13kodma);  
  $def("_y6hmmm", "barcodeTexture", ["template","THREE","invalidation"], _y6hmmm);  
  $def("_4uleeg", "simRig", ["FRAME","THREE","barcodeTexture","nBarcodes","invalidation"], _4uleeg);  
  $def("_j6jmhh", "viewof running", ["Inputs"], _j6jmhh);  
  $def("_u5lzp", "running", ["Generators","viewof running"], _u5lzp);  
  $def("_1drityg", "simFrame", ["running","simRig","motion"], _1drityg);  
  $def("_tl97yc", "overlaySvg", ["htl","FRAME"], _tl97yc);  
  $def("_xwbf17", "sceneView", ["simRig","htl","FRAME","overlaySvg"], _xwbf17);  
  $def("_1qsnkun", "_1qsnkun", ["md"], _1qsnkun);  
  $def("_2pll7q", "viewof rowStride", ["Inputs"], _2pll7q);  
  $def("_1jjclm3", "rowStride", ["Generators","viewof rowStride"], _1jjclm3);  
  $def("_1svyp0z", "scanRows", ["rowStride","FRAME"], _1svyp0z);  
  $def("_vp2x4g", "rowsLayer", ["htl","scanRows","FRAME","overlaySvg","invalidation"], _vp2x4g);  
  $def("_1vob7s8", "_1vob7s8", ["md","tex"], _1vob7s8);  
  $def("_lms9td", "crossRatio", [], _lms9td);  
  $def("_11ivtm", "crDistance", [], _11ivtm);  
  $def("_1mbckod", "computeAnchorCandidatesCR", ["crossRatio","crDistance","fitMobiusLS"], _1mbckod);  
  $def("_1a9n4je", "template_edges", ["binaryToEdges","template"], _1a9n4je);  
  $def("_b6alah", "rowOf", [], _b6alah);  
  $def("_1w8wvjm", "viewof edgeThreshold", ["Inputs"], _1w8wvjm);  
  $def("_ck7l4a", "edgeThreshold", ["Generators","viewof edgeThreshold"], _ck7l4a);  
  $def("_54mjsc", "viewof crTol", ["Inputs"], _54mjsc);  
  $def("_uj1cdm", "crTol", ["Generators","viewof crTol"], _uj1cdm);  
  $def("_1d6bne6", "viewof benchGo", ["Inputs"], _1d6bne6);  
  $def("_d7zud6", "benchGo", ["Generators","viewof benchGo"], _d7zud6);  
  $def("_1mfst8u", "benchFrame", ["benchGo","simRig"], _1mfst8u);  
  $def("_p87wwn", "crBenchmark", ["scanRows","edges1D","rowOf","benchFrame","edgeThreshold","crTol","computeAnchorCandidatesFast","template_edges","computeAnchorCandidatesCR"], _p87wwn);  
  $def("_yo7gw4", "groundTruth", ["simFrame","simRig","THREE"], _yo7gw4);  
  $def("_1uyfo0m", "_1uyfo0m", ["md","tex"], _1uyfo0m);  
  $def("_15sbo1e", "_15sbo1e", ["md","tex"], _15sbo1e);  
  $def("_629twe", "detectRow", ["computeAnchorCandidatesCR","refineCandidatesFast","xFromK"], _629twe);  
  $def("_1klkdit", "viewof maxRMSE", ["Inputs"], _1klkdit);  
  $def("_dl657l", "maxRMSE", ["Generators","viewof maxRMSE"], _dl657l);  
  $def("_196wxrn", "frameDetections", ["runPipeline","simFrame","crTol","maxRMSE"], _196wxrn);  
  $def("_1jv8efs", "detectionLayer", ["htl","groundTruth","frameDetections","overlaySvg","invalidation"], _1jv8efs);  
  $def("_9v4y1i", "detectionAccuracy", ["scoreHits","frameDetections"], _9v4y1i);  
  $def("_f7ii28", "_f7ii28", ["md","tex"], _f7ii28);  
  $def("_1mr12zq", "templateAtOffset", [], _1mr12zq);  
  $def("_1yxwsqp", "refineOffset", ["templateAtOffset","fitMobiusLS","refineAnchorCandidates"], _1yxwsqp);  
  $def("_1y7rwsn", "detectRowOffsets", ["templateAtOffset","detectRow"], _1y7rwsn);  
  $def("_11le2b7", "_11le2b7", ["md","tex"], _11le2b7);  
  $def("_6tvw19", "_6tvw19", ["md"], _6tvw19);  
  $def("_1sco5vm", "dpScratch", [], _1sco5vm);  
  $def("_1sw43f2", "dpAlignFast", ["dpScratch"], _1sw43f2);  
  $def("_kzvmqd", "fitMobius3", [], _kzvmqd);  
  $def("_heushe", "refineCandidatesFast", ["dpScratch","dpAlignFast","fitMobius3","fitMobiusLS"], _heushe);  
  $def("_xe0wrc", "refineOracleCheck", ["scanRows","edges1D","rowOf","benchFrame","edgeThreshold","templateAtOffset","template_edges","computeAnchorCandidatesCR","crTol","refineAnchorCandidates","refineCandidatesFast"], _xe0wrc);  
  $def("_1cvajvr", "runPipeline", ["scanRows","edges1D","rowOf","edgeThreshold","detectRowOffsets","template_edges","refineOffset","xFromK"], _1cvajvr);  
  $def("_1hazhn", "scoreHits", ["groundTruth","template_edges"], _1hazhn);  
  $def("_1pqqej3", "solverAB", ["runPipeline","simFrame","crTol","maxRMSE","scoreHits"], _1pqqej3);  
  $def("_1xi1t3n", "_1xi1t3n", ["Inputs","solverAB"], _1xi1t3n);  
  $def("_17g7uf6", "_17g7uf6", ["md","tex"], _17g7uf6);  
  $def("_152ks9q", "clusterHits", ["rowStride"], _152ks9q);  
  $def("_1czkbg9", "fuseCluster", ["template_edges"], _1czkbg9);  
  $def("_hp712", "fusedCentres", ["clusterHits","frameDetections","fuseCluster"], _hp712);  
  $def("_chuiga", "fusionAccuracy", ["groundTruth","fusedCentres"], _chuiga);  
  $def("_306jxo", "fusionLayer", ["htl","fusedCentres","overlaySvg","invalidation"], _306jxo);  
  $def("_8h39vn", "_8h39vn", ["md"], _8h39vn);  
  $def("_13t455s", null, ["md"], _13t455s);  
  $def("_1ptfs7b", "viewof cameraOn", ["Inputs"], _1ptfs7b);  
  $def("_13xr3f6", "cameraOn", ["Generators","viewof cameraOn"], _13xr3f6);  
  $def("_rdku58", "cameraStream", ["cameraOn","FRAME","invalidation"], _rdku58);  
  $def("_1b8pqpk", "cameraVideo", ["htl","cameraStream","invalidation"], _1b8pqpk);  
  $def("_h3lb04", "cameraCanvas", ["htl","FRAME"], _h3lb04);  
  $def("_fqnxzy", "cameraFrame", ["cameraStream","cameraCanvas","FRAME","cameraVideo"], _fqnxzy);  
  $def("_1mlmqdk", "cameraOverlaySvg", ["htl","FRAME"], _1mlmqdk);  
  $def("_if9vzt", "cameraView", ["htl","FRAME","cameraCanvas","cameraOverlaySvg","cameraVideo"], _if9vzt);  
  $def("_3h2tue", "cameraDetections", ["cameraFrame","runPipeline","crTol","maxRMSE"], _3h2tue);  
  $def("_jkixb7", "cameraFused", ["cameraDetections","clusterHits","fuseCluster"], _jkixb7);  
  $def("_1mhec6j", "cameraLayer", ["htl","scanRows","FRAME","cameraDetections","cameraFused","cameraOverlaySvg"], _1mhec6j);  
  $def("_12edsor", "cameraStats", ["cameraStream","cameraDetections","FRAME","cameraFused"], _12edsor);  
  $def("_e6l2ks", "barcodeTarget", ["barcodeTexture","htl"], _e6l2ks);  
  $def("_yko5dl", null, ["md"], _yko5dl);  
  $def("_azcir1", "cameraBestState", [], _azcir1);  
  $def("_zacj47", "cameraBest", ["cameraBestState","cameraDetections","cameraFused","FRAME"], _zacj47);  
  $def("_17zazhe", null, ["md"], _17zazhe);
  return main;
}
