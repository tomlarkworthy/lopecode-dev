const _1dvf37e = function _anonymous(md) {return (md`# Coded Landmark Tracking

**Part IV of the realtime optical positioning series.** Parts I–III could find circular barcodes — several at once, at arbitrary chord offsets, on live pixels — but every barcode was the *same* barcode. A detection told you *where*, never *which*. For robotic navigation that is only half a landmark: a map is a set of labelled positions, and the label is what lets a robot know which corridor it is looking down.

This notebook puts a few bits of identity into the rings. The design constraint that shaped everything else: **the payload must not make detection more expensive.** The naive approach — one template per codeword, run Part III's detector once per template — multiplies the per-row cost by the codebook size. Instead the barcode is split into two roles:

- a **fixed carrier**: a handful of rings identical for every codeword, giving detection a payload-independent template;
- a **payload band**: rings whose colour encodes bits, which detection treats as clutter and *decoding* reads afterwards — not by finding edges, but by sampling image intensity at positions predicted by the already-fitted Möbius map.

Detection cost stays where Part III left it. Decoding is a handful of array lookups per row, and — the property worth the whole exercise — its cost is **independent of how many codewords exist**, because the codebook is only consulted once per row, after the bits are read.

The bits carry an error-correcting code, and that buys a second thing for free: a detection whose bits decode to no valid codeword is a *false positive*, so the payload doubles as a verification gate the earlier parts never had.
`);};
const _106dc0v = function _anonymous(md,tex) {return (md`---
## §1 A code you can read along any chord

The radius is divided into bands. Everything is in **template units**, radius 0 at the centre, 28 at the rim — the same scale Parts II and III used.

| radius | role | colour |
|---|---|---|
| 0–4 | core (white reference) | white |
| 4–6 | inner carrier ring | black |
| 6–8 | payload cell **P0** | data |
| 8–9 | guard (white reference) | white |
| 9–10 | **mid-sync ring** | black |
| 10–11 | guard (white reference) | white |
| 11–25 | payload cells **P1–P7**, 2 units each | data |
| 25–26 | guard (white reference) | white |
| 26–28 | rim carrier ring | black |

Two properties are load-bearing.

**The carrier's edges exist for every codeword.** A payload cell can be black or white, so the edge *between* a payload cell and its neighbour may or may not exist — but the edges at radii **4, 9, 10, 26 and 28** sit between bands whose colours are fixed. Ten guaranteed edges per diameter, whatever the bits say. That is the detection template.

**The mid-sync ring is where it is for the cross ratio.** Part III learned the hard way that anchor quadruples clustered near the rim have a cross ratio a hair from the degenerate value 1. The anchors here are the rim and mid-sync edges, ${tex`(-28, -10, +10, +28)`}, whose cross ratio is **1.289** at zero chord offset — comfortably informative. And because the anchor radii are known, the cross ratio as a function of chord offset ${tex`d`} is known too: it climbs to 2.14 by ${tex`d = 9`}. Matching a window's cross ratio against that curve does not just *gate* candidates the way §3 of Part III did — **it reads off a coarse estimate of the offset for free**, before any alignment has run.

The white guards around every black carrier ring are not decoration: they are photometric references. Any chord that crosses the carrier crosses known-white and known-black paint at known radii, which is exactly what decoding needs to threshold the payload samples under whatever lighting the row actually has.

Eight payload cells carry an **extended Hamming [8,4] code**: 16 codewords, minimum distance 4 — every landmark ID survives one misread cell and *detects* two. Two of the sixteen are **reserved as invalid**: id 0 (payload all black) and id 15 (payload all white). A window that lands on featureless paint reads a constant stripe pattern, and a constant correlates *perfectly* with one of those two words — margin alone cannot reject it. Declaring the constant words non-ids turns the most dangerous false positive into a structural impossibility, leaving **14 usable identities** — enough for a room-scale landmark map, and §6 shows why the ceiling is a policy choice, not a performance one.
`);};
const _lu0qkj = function _LAYOUT() {
  // radial bands [r0, r1, kind] — kind: 1 white, 0 black, "p<i>" payload cell i
  const bands = [
    [0, 4, 1],
    [4, 6, 0],
    [6, 8, "p0"],
    [8, 9, 1],
    [9, 10, 0],
    [10, 11, 1],
    [11, 13, "p1"],
    [13, 15, "p2"],
    [15, 17, "p3"],
    [17, 19, "p4"],
    [19, 21, "p5"],
    [21, 23, "p6"],
    [23, 25, "p7"],
    [25, 26, 1],
    [26, 28, 0]
  ];
  const cells = bands
    .filter(([, , k]) => typeof k === "string")
    .map(([r0, r1, k]) => ({ i: +k.slice(1), r0, r1, rm: (r0 + r1) / 2 }));
  return {
    R: 28,
    bands,
    cells,
    // edges between bands of fixed colour — the payload-independent carrier
    fixedEdges: [4, 9, 10, 26, 28],
    anchorRadii: [28, 10],
    whiteRefs: [2, 8.5, 10.5, 25.5],
    blackRefs: [5, 9.5, 27]
  };
};
const _dwk66l = function _codebook() {
  // extended Hamming [8,4]: 16 codewords, minimum distance 4
  const words = [];
  for (let id = 0; id < 16; id++) {
    const d = [id & 1, (id >> 1) & 1, (id >> 2) & 1, (id >> 3) & 1];
    const p0 = d[0] ^ d[1] ^ d[3];
    const p1 = d[0] ^ d[2] ^ d[3];
    const p2 = d[1] ^ d[2] ^ d[3];
    const w = [p0, p1, d[0], p2, d[1], d[2], d[3], 0];
    w[7] = w.slice(0, 7).reduce((a, b) => a ^ b, 0);
    words.push(Uint8Array.from(w));
  }
  return words;
};
const _1p6gckl = function _codebookCheck(codebook) {
  // verify the claimed minimum distance — a wrong codebook silently halves robustness
  let dmin = 8;
  for (let a = 0; a < 16; a++)
    for (let b = a + 1; b < 16; b++) {
      let dist = 0;
      for (let i = 0; i < 8; i++) dist += codebook[a][i] ^ codebook[b][i];
      dmin = Math.min(dmin, dist);
    }
  if (dmin !== 4) throw new Error(`codebook minimum distance ${dmin}, expected 4`);
  return { codewords: 16, bits: 8, dataBits: 4, minDistance: dmin };
};
const _1wej8fk = function _radialColor(LAYOUT) {return (function radialColor(r, word) {
  // 1 = white, 0 = black, for radius r in template units, given a payload word
  if (r >= LAYOUT.R) return null; // outside the mark
  for (const [r0, r1, k] of LAYOUT.bands) {
    if (r >= r0 && r < r1) {
      if (typeof k === "number") return k;
      return word[+k.slice(1)]; // payload cell: the bit is the colour
    }
  }
  return null;
});};
const _1i5b3d0 = function _codewordGallery(LAYOUT,codebook) {
  // all 16 marks side by side — payload rings differ, carrier rings are identical
  const cell = 72, pad = 6, cols = 8;
  const rows = Math.ceil(16 / cols);
  const c = window.document.createElement("canvas");
  c.width = cols * (cell + pad) + pad;
  c.height = rows * (cell + pad + 14) + pad;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#2a2a2a";
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.font = "11px monospace";
  ctx.textAlign = "center";
  for (let id = 0; id < 16; id++) {
    const gx = pad + (id % cols) * (cell + pad);
    const gy = pad + Math.floor(id / cols) * (cell + pad + 14);
    const cx = gx + cell / 2, cy = gy + cell / 2;
    const scale = cell / 2 / LAYOUT.R;
    // each band drawn as an annulus (outer disc minus inner disc, evenodd fill)
    for (const [r0, r1, k] of LAYOUT.bands) {
      const bit = typeof k === "number" ? k : codebook[id][+k.slice(1)];
      ctx.fillStyle = bit ? "#fff" : "#000";
      ctx.beginPath();
      ctx.arc(cx, cy, r1 * scale, 0, 2 * Math.PI);
      ctx.arc(cx, cy, r0 * scale, 0, 2 * Math.PI, true);
      ctx.fill("evenodd");
    }
    ctx.fillStyle = "#9ad";
    ctx.fillText(`id ${id}`, cx, gy + cell + 11);
  }
  c.style.maxWidth = "100%";
  return c;
};
const _4gz48s = function _anonymous(md) {return (md`---
## §2 A scene of labelled landmarks

The simulator is Part III's rig with one change: each target carries its **own** codeword texture, and the ground truth records which. Everything downstream can then be scored on the question that actually matters for navigation: *did we read the right label at the right place?*

Targets cycle through the 16 codewords deterministically (target \`i\` shows codeword \`i mod 16\`), so every run exercises the whole codebook.`);};
const _faupuu = function _codewordTextures(LAYOUT,codebook,THREE,invalidation) {
  // one CanvasTexture per codeword, painted band-by-band as annuli
  const S = 512;
  const scale = S / 2 / LAYOUT.R;
  const textures = codebook.map((word) => {
    const c = window.document.createElement("canvas");
    c.width = S;
    c.height = S;
    const ctx = c.getContext("2d");
    for (const [r0, r1, k] of LAYOUT.bands) {
      const bit = typeof k === "number" ? k : word[+k.slice(1)];
      ctx.fillStyle = bit ? "#ffffff" : "#000000";
      ctx.beginPath();
      ctx.arc(S / 2, S / 2, r1 * scale, 0, 2 * Math.PI);
      ctx.arc(S / 2, S / 2, r0 * scale, 0, 2 * Math.PI, true);
      ctx.fill("evenodd");
    }
    const tex = new THREE.CanvasTexture(c);
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;
    return tex;
  });
  invalidation.then(() => textures.forEach((t) => t.dispose()));
  return textures;
};
const _nfwsus = function _nLandmarks(Inputs) {return (Inputs.range([1, 16], { step: 1, value: 6, label: "landmarks" }));};
const _zsvxn7 = (G, _) => G.input(_);
const _15fbbws = function _simRig(FRAME,THREE,codewordTextures,nLandmarks,invalidation) {
  // Part III's rig, but each target gets its own codeword material and records trueId.
  // Ids 0 and 15 are reserved (§4), so targets cycle through the 14 usable codewords.
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
  const mats = codewordTextures.map(
    (tex) =>
      new THREE.MeshBasicMaterial({
        map: tex,
        side: THREE.DoubleSide,
        transparent: true
      })
  );

  const targets = [];
  for (let i = 0; i < nLandmarks; i++) {
    const trueId = 1 + (i % 14);
    const mesh = new THREE.Mesh(geo, mats[trueId]);
    scene.add(mesh);
    targets.push({
      id: i,
      trueId,
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
    mats.forEach((m) => m.dispose());
    renderer.dispose();
  });

  return { w, h, canvas: renderer.domElement, step, targets, camera, scene };
};
const _j6jmhh = function _running(Inputs) {return (Inputs.toggle({ label: "run", value: false }));};
const _u5lzp = (G, _) => G.input(_);
const _frwygv = function _motion(Inputs) {return (Inputs.range([0, 1], { step: 0.05, value: 0.3, label: "motion" }));};
const _13kodma = (G, _) => G.input(_);
const _1hy8mdc = async function* _simFrame(running,simRig,motion) {
  const t0 = window.performance.now();
  let n = 0;
  while (true) {
    const t = running ? (window.performance.now() - t0) / 1000 : 0;
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
const _2pll7q = function _rowStride(Inputs) {return (Inputs.range([2, 64], { step: 1, value: 12, label: "row stride (px)" }));};
const _1jjclm3 = (G, _) => G.input(_);
const _1svyp0z = function _scanRows(rowStride,FRAME) {
  const rows = [];
  for (let y = Math.floor(rowStride / 2); y < FRAME.h; y += rowStride) rows.push(y);
  return rows;
};
const _y17nqa = function _groundTruth(simFrame,simRig,THREE) {
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
    const xExtent = Math.hypot(u.x, v.x);
    const yExtent = Math.hypot(u.y, v.y);
    return {
      id: t.id,
      trueId: t.trueId, // the codeword the landmark displays — the decode target
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
const _1aqjzs8 = function _anonymous(md) {return (md`---
## §3 Detecting the carrier, ignoring the payload

Detection must work for *every* codeword without knowing which one it is looking at. The carrier gives it exactly ten guaranteed edges per diameter (±4, ±9, ±10, ±26, ±28 in template units). The payload contributes up to sixteen *extra* edges that may or may not exist — from the detector's point of view they are structured clutter.

The pipeline per scan row:

1. **Window enumeration.** Any pair of edges could be the two rim crossings. Windows are pruned by width and by edge count before anything expensive runs.
2. **Cross-ratio gate — which also reads the offset.** Inside a candidate window, the mid-sync edges are searched for near their expected span fractions. The cross ratio of \`(rim, mid, mid, rim)\` is projectively invariant, and because the anchor radii are fixed it is a known function of the chord offset \`d\` alone. A window whose cross ratio sits nowhere on that curve is rejected; one that sits on it hands back a **seed estimate of \`d\`** before any fitting.
3. **Anchor fit + carrier alignment.** Four anchors give an initial Möbius map. The ten carrier edges (fewer once \`d\` starts dropping inner rings) are projected into the image and aligned against the window's edges with Part III's \`dpAlignFast\` — the payload edges simply go unmatched, at a gap cost. A small sweep around the seeded \`d\` re-derives the anchors and keeps the best-scoring offset.
4. **Gates + non-maximum suppression.** Residual and match-count gates, then overlapping windows resolve by residual.

The detection band is \`d ≲ 9\`: past that the chord no longer crosses the mid-sync ring and the cross-ratio anchors are gone. That is a real trade — Part III could detect out to \`d ≈ 20\` — and §5 leans on row fusion to compensate: a barcode 60 px tall still puts several scan rows inside the band.`);};
const _c33xmx = function _carrierTemplate(LAYOUT) {
  // signed radial positions of the carrier edges, ascending — the detection template
  const ks = [];
  for (const r of LAYOUT.fixedEdges) { ks.push(-r); ks.push(r); }
  return ks.sort((a, b) => a - b);
};
const _7u0e3a = function _crCurve(LAYOUT,crossRatio) {
  // cross ratio of the anchor quadruple (−aOut, −aIn, +aIn, +aOut) as a function of
  // chord offset d, where aOut = √(28²−d²), aIn = √(10²−d²). Capped at d = 8.5: past
  // that the mid-sync crossing is so shallow the template degenerates (see §3 notes).
  const [rOut, rIn] = [LAYOUT.R, LAYOUT.anchorRadii[1]];
  const rows = [];
  for (let d = 0; d <= 8.5; d += 0.25) {
    const aOut = Math.sqrt(rOut * rOut - d * d);
    const aIn = Math.sqrt(rIn * rIn - d * d);
    const cr = crossRatio(-aOut, -aIn, aIn, aOut);
    rows.push({ d, aOut, aIn, cr, fIn: (aOut - aIn) / (2 * aOut) });
  }
  return rows;
};
const _t28eph = function _detectLandmarkRow(LAYOUT,crCurve,crossRatio,crDistance,templateAtOffset,carrierTemplate,fitMobiusLS,xFromK,dpScratch,dpAlignFast) {return (function detectLandmarkRow(scanEdges, opts = {}) {
  const out = [];
  out.windows = 0;
  out.survived = 0;
  const n = scanEdges ? scanEdges.length : 0;
  if (n < 8) return out;
  const sx = Float64Array.from(scanEdges, (e) => (typeof e === "number" ? e : e.x));

  const minWidth = opts.minWidth ?? 24;
  const maxWidth = opts.maxWidth ?? 400;
  // 48 not 32: a large crisp mark crosses ~34 physical rings near its equator and
  // anti-aliasing can double-peak several of them; at 32 the enumeration break
  // fired before j reached the far rim, silently discarding the full-rim window
  // of exactly the biggest, easiest marks
  const maxEdges = opts.maxEdges ?? 48;
  const crTol = opts.crTol ?? 0.012;
  const maxCands = opts.maxCands ?? 12; // fine-sweep budget per row
  const maxXRMSE = opts.maxXRMSE ?? 2.5;
  const minPairs = opts.minPairs ?? 7;
  const gapFrac = opts.gapFrac ?? 0.04; // gap penalty as a fraction of window width
  const rOut = LAYOUT.R;
  const rIn = LAYOUT.anchorRadii[1];
  const dMax = crCurve[crCurve.length - 1].d;

  // one candidate per window (i,j): the mirror-symmetric mid pair whose cross
  // ratio sits closest to the CR(d) curve
  const cands = [];
  for (let i = 0; i < n; i++) {
    for (let j = i + 7; j < n; j++) {
      const width = sx[j] - sx[i];
      if (width > maxWidth) break;
      if (j - i + 1 > maxEdges) break;
      if (width < minWidth) continue;
      out.windows++;
      const aLo = sx[i] + 0.26 * width, aHi = sx[i] + 0.48 * width;
      const bLo = sx[i] + 0.52 * width, bHi = sx[i] + 0.74 * width;
      let bestC = null;
      for (let a = i + 1; a < j; a++) {
        if (sx[a] < aLo) continue;
        if (sx[a] > aHi) break;
        const fa = (sx[a] - sx[i]) / width;
        for (let b = a + 1; b < j; b++) {
          if (sx[b] < bLo) continue;
          if (sx[b] > bHi) break;
          const fb = (sx[b] - sx[i]) / width;
          if (Math.abs(fa - (1 - fb)) > 0.06) continue; // not mirror-symmetric
          const cr = crossRatio(sx[i], sx[a], sx[b], sx[j]);
          let bestT = null, bestDist = Infinity;
          for (const t of crCurve) {
            const dist = crDistance(cr, t.cr);
            if (dist < bestDist) { bestDist = dist; bestT = t; }
          }
          if (bestDist > crTol) continue;
          if (!bestC || bestDist < bestC.crDist)
            bestC = { i, a, b, j, width, cr, crDist: bestDist, dSeed: bestT.d };
        }
      }
      if (bestC) {
        // largest edge-free run inside the window, as a width fraction: a true
        // mark is edge-dense throughout (rings everywhere), while a window
        // stitched across two neighbouring marks contains the blank background
        // between them
        let mg = 0;
        for (let e = i; e < j; e++) {
          const gp = sx[e + 1] - sx[e];
          if (gp > mg) mg = gp;
        }
        bestC.holeFrac = mg / width;
        cands.push(bestC);
      }
    }
  }
  out.survived = cands.length;
  // spend the expensive alignment on the WIDEST curve-consistent windows: a real
  // mark's full-rim window is wider than any of its internal accidental windows,
  // and accidental quadruples routinely beat true ones on cross-ratio distance
  // (edge noise puts the truth at ~0.003; chance alignments can hit 0.0001).
  // Two refinements, both learned from mark-dense scenes: windows with a large
  // internal hole rank AFTER hole-free ones (they are usually stitched across
  // two marks — and on a symmetric grid such a chimera is centred exactly on the
  // mark between its parts), and at most 2 candidates may share an x-locality so
  // one busy region cannot starve the rest of the row.
  cands.sort(
    (p, q) =>
      (p.holeFrac > 0.24) - (q.holeFrac > 0.24) ||
      q.width - p.width ||
      p.crDist - q.crDist
  );
  const picked = [];
  for (const c of cands) {
    if (picked.length >= maxCands) break;
    const cx = (sx[c.i] + sx[c.j]) / 2;
    // anti-aliasing double-peaks rim edges, minting several near-identical
    // copies of the same window (same centre, width within a few px). Copies
    // must not count against the locality quota or they alone fill it — on a
    // symmetric grid the wide stitched window over marks A and C is centred
    // exactly on mark B, and its AA twins were evicting B's true window.
    let near = 0, twin = false;
    for (const k of picked) {
      if (Math.abs(k.cx - cx) >= 24) continue;
      if (Math.abs(k.width - c.width) < 0.08 * k.width) { twin = true; break; }
      near++;
    }
    if (twin || near >= 2) continue;
    c.cx = cx;
    picked.push(c);
  }

  for (const c of picked) {
    // full-band sweep over d: at each offset, derive the anchor map, align the
    // carrier template, refit on the matches. Alignment alone cannot pick d —
    // payload clutter lets a wrong offset align almost as well as the truth — so
    // the best hypothesis *per 1-unit d bin* is kept and the decoder's photometric
    // check (§4) makes the final call.
    // The mid pair's radius is itself ambiguous: (rim, r) quadruples sit on the
    // CR(d) curve not only for the designed r=10 but also for payload edges at
    // r=8 and r=6 (their cross ratios alias to wrong-d points on the curve), so
    // each d tries all three interpretations of the measured mid pair.
    const gapPenalty = gapFrac * c.width;
    const scan = sx.subarray(c.i, c.j + 1);
    const M = scan.length;
    const byBin = new Map();
    for (let d = 0; d <= dMax + 1e-9; d += 0.25) {
      const aOut = Math.sqrt(rOut * rOut - d * d);
      const kS = templateAtOffset(carrierTemplate, d);
      const N = kS.length;
      for (const rc of [rIn, 8, 6]) {
        if (d > rc - 0.5) continue;
        const aIn = Math.sqrt(rc * rc - d * d);
        let mob;
        try {
          mob = fitMobiusLS([
            { x: sx[c.i], k: -aOut },
            { x: sx[c.a], k: -aIn },
            { x: sx[c.b], k: aIn },
            { x: sx[c.j], k: aOut }
          ]);
        } catch { continue; }
        if (![mob.p, mob.q, mob.r, mob.s].every(isFinite)) continue;
        const proj = kS.map((k) => xFromK(mob, k));
        if (!proj.every(isFinite)) continue;
        dpScratch.ensure((N + 1) * (M + 1), Math.max(N, M));
        dpAlignFast(proj, N, scan, M, gapPenalty, dpScratch.map);
        const pairs = [];
        for (let t = 0; t < N; t++) {
          const s = dpScratch.map[t];
          if (s >= 0) pairs.push({ x: scan[s], k: kS[t] });
        }
        if (pairs.length < minPairs) continue;
        let mobR;
        try { mobR = fitMobiusLS(pairs); } catch { continue; }
        if (![mobR.p, mobR.q, mobR.r, mobR.s].every(isFinite)) continue;
        let ss = 0;
        for (const p of pairs) {
          const e = xFromK(mobR, p.k) - p.x;
          ss += e * e;
        }
        const xRMSE = Math.sqrt(ss / pairs.length);
        if (xRMSE > maxXRMSE) continue;
        const unmatched = N - pairs.length;
        const score = xRMSE * (1 + (2 * unmatched) / N);
        if (!isFinite(score)) continue;
        const bin = Math.floor(d);
        const cur = byBin.get(bin);
        if (!cur || score < cur.score)
          byBin.set(bin, { d, score, xRMSE, mobius: mobR, pairsUsed: pairs.length, rings: N });
      }
    }
    if (!byBin.size) continue;
    const dCands = [...byBin.values()].sort((p, q) => p.score - q.score);
    const best = dCands[0];
    out.push({
      startIndex: c.i,
      endIndex: c.j,
      mobius: best.mobius,
      dCandidates: dCands,
      anchors: [sx[c.i], sx[c.a], sx[c.b], sx[c.j]],
      d: best.d,
      dSeed: c.dSeed,
      crDist: c.crDist,
      holeFrac: c.holeFrac,
      xRMSE: best.xRMSE,
      score: best.score,
      pairsUsed: best.pairsUsed,
      rings: best.rings,
      footX: xFromK(best.mobius, 0),
      leftX: sx[c.i],
      rightX: sx[c.j]
    });
  }

  // non-maximum suppression by coverage then residual. runPipeline defers this
  // until after decoding (opts.nms === false) so a junk window cannot eclipse a
  // decodable one purely on edge-alignment merit.
  if (opts.nms !== false) {
    out.sort((p, q) => q.pairsUsed - p.pairsUsed || p.score - q.score);
    const accepted = [];
    for (const c of out) {
      const clash = accepted.some(
        (a) => !(c.endIndex < a.startIndex || c.startIndex > a.endIndex)
      );
      if (!clash) accepted.push(c);
    }
    accepted.windows = out.windows;
    accepted.survived = out.survived;
    return accepted;
  }
  return out;
});};
const _1w8wvjm = function _edgeThreshold(Inputs) {return (Inputs.range([2, 40], { step: 1, value: 12, label: "edge threshold" }));};
const _ck7l4a = (G, _) => G.input(_);
const _hqfg1d = function _runDetection(scanRows,edges1D,rowOf,edgeThreshold,detectLandmarkRow) {return (function runDetection(frame, opts = {}) {
  const t0 = window.performance.now();
  const hits = [];
  let windows = 0, survived = 0, edges = 0;
  for (const y of scanRows) {
    const se = edges1D(rowOf(frame, y), opts.edgeThreshold ?? edgeThreshold);
    edges += se.length;
    const dets = detectLandmarkRow(se, opts);
    windows += dets.windows;
    survived += dets.survived;
    for (const det of dets) hits.push({ y, ...det });
  }
  return {
    frame: frame.n,
    hits,
    ms: window.performance.now() - t0,
    rowsTouched: scanRows.length,
    scanEdges: edges,
    windows,
    survived
  };
});};
const _1v5ujxb = function _anonymous(md) {return (md`---
## §4 Reading the bits without finding any edges

Decoding never runs an edge detector. The fitted Möbius map plus the recovered offset \`d\` predict exactly where each payload cell's midline radius crosses the scan row: radius \`r\` is crossed at \`k = ±√(r²−d²)\`, and \`xFromK\` turns that into a pixel coordinate. Reading a bit is two array lookups (both sides of the centre, averaged).

Raw intensities are meaningless without references — lighting, exposure and the renderer's antialiasing all move them. The white guards and black carrier rings are at *known radii*, so the same sampling trick reads them too: every decode carries its own photometric calibration, per row, for free.

Each payload cell becomes a **soft bit** in [−1, 1] (black → −1, white → +1, normalised between the measured references). A cell whose midline radius the chord cannot reach (\`rm ≤ d\`) is an **erasure** — score 0, no vote either way. Then the codebook is scored by correlation: the codeword maximising \`Σ softᵢ·(2wᵢ−1)\` wins, and the gap to the runner-up is the **decode margin**.

Because the minimum distance of the code is 4, a decode that lands close to two codewords at once has a small margin — that is either heavy occlusion or a false-positive detection. The margin gate is the verification step: **a window that aligned well but reads as no valid codeword is rejected**, something Parts I–III could never do.

Cost per decode: ~30 samples and 16 dot products of length 8 — and the codebook is consulted once *after* the bits are read, so growing the codebook from 16 to 256 ids changes nothing upstream of this line.`);};
const _18v6hzh = function _decodeLandmark(xFromK,LAYOUT,codebook) {return (function decodeLandmark(hit, frame, opts = {}) {
  const g = frame.gray;
  const W = frame.w;
  const row = hit.y * W;
  const radialMargin = opts.radialMargin ?? 0.3;

  const sample = (mob, k) => {
    const x = xFromK(mob, k);
    if (!isFinite(x) || x < 0 || x > W - 2) return null;
    const ix = Math.floor(x);
    const f = x - ix;
    return g[row + ix] * (1 - f) + g[row + ix + 1] * f;
  };
  // radius r is crossed at k = ±√(r²−d²); average the two sides when both land
  const both = (mob, d, r) => {
    if (r <= d + radialMargin) return null;
    const k = Math.sqrt(r * r - d * d);
    const a = sample(mob, k);
    const b = sample(mob, -k);
    if (a == null && b == null) return null;
    return a == null ? b : b == null ? a : (a + b) / 2;
  };
  // photometric consistency of a hypothesised (map, offset): a correct pair reads
  // every white reference brighter than every black one
  const refEval = (mob, d, dr) => {
    const ws = LAYOUT.whiteRefs.map((r) => both(mob, d, r + dr)).filter((v) => v != null);
    const bs = LAYOUT.blackRefs.map((r) => both(mob, d, r + dr)).filter((v) => v != null);
    if (ws.length < 2 || bs.length < 2) return null;
    return {
      sep: Math.min(...ws) - Math.max(...bs),
      wSpread: Math.max(...ws) - Math.min(...ws),
      bSpread: Math.max(...bs) - Math.min(...bs),
      wRef: ws.reduce((a, b) => a + b, 0) / ws.length,
      bRef: bs.reduce((a, b) => a + b, 0) / bs.length
    };
  };

  // Each detector hypothesis is decoded IN FULL and judged on its decode margin —
  // the final criterion — rather than on reference separation alone. On crisp
  // marks the references read cleanly even at a wrong offset (thick rings forgive
  // radius error), so separation saturates while the payload bits scramble; the
  // margin collapses exactly when that happens, and it costs only ~30 samples and
  // 16 dot products per hypothesis to measure it directly.
  //
  // ringOffsets can widen the search with δ-ring-shifted rereads of each
  // hypothesis (the quasi-periodic ring lattice makes off-by-one DP locks
  // conceivable). Default is [0]: in testing the shifted rereads never rescued a
  // failing row but did surface coherent wrong-id reads at low margin, so the
  // wider sweep is opt-in.
  const hyps = hit.dCandidates ?? [{ d: hit.d, mobius: hit.mobius }];
  const ringOffsets = opts.ringOffsets ?? [0];
  let best = null;
  for (const h of hyps) {
    for (const dr of ringOffsets) {
      const r = refEval(h.mobius, h.d, dr);
      if (!r) continue;
      const contrast = r.wRef - r.bRef;
      if (contrast < (opts.minContrast ?? 30)) continue;
      // stitched-chimera killer: a window spanning two neighbouring marks reads
      // some references off the background between them, which collapses the
      // worst-case class separation (sep) far below the mean contrast. A true
      // mark keeps sep comparable to contrast even when anti-aliasing smears
      // individual rings — the sep RATIO is the discriminator. The spread gate
      // is deliberately loose (0.75·contrast): a single mis-registered
      // reference inflates spread on an otherwise perfect margin-8 decode, and
      // tightening it was observed to reject exactly those clean reads.
      if (r.sep < (opts.minSepFrac ?? 0.25) * contrast) continue;
      const maxSpread = (opts.maxRefSpread ?? 0.75) * contrast;
      if (r.wSpread > maxSpread || r.bSpread > maxSpread) continue;

      // soft bits: black → −1, white → +1, erasure → 0
      const soft = new Array(8).fill(0);
      for (const c of LAYOUT.cells) {
        const v = both(h.mobius, h.d, c.rm + dr);
        if (v == null) continue;
        const t = (2 * (v - r.bRef)) / (r.wRef - r.bRef) - 1;
        soft[c.i] = Math.max(-1, Math.min(1, t));
      }
      const readable = soft.filter((x) => x !== 0).length;

      // correlation decode over the whole codebook — the only place codebook size enters
      let bestSc = -Infinity, second = -Infinity, bestId = -1;
      for (let id = 0; id < codebook.length; id++) {
        const w = codebook[id];
        let sc = 0;
        for (let i = 0; i < 8; i++) sc += soft[i] * (2 * w[i] - 1);
        if (sc > bestSc) { second = bestSc; bestSc = sc; bestId = id; }
        else if (sc > second) second = sc;
      }
      // ids 0 and 15 are reserved: their payloads are all-black / all-white, which
      // is exactly what a misplaced window over featureless paint reads
      if (bestId === 0 || bestId === 15) continue;
      const margin = bestSc - second;
      if (!best || margin > best.margin || (margin === best.margin && r.sep > best.sep)) {
        best = {
          id: bestId,
          score: bestSc,
          margin,
          readable,
          soft,
          d: h.d,
          ringOffset: dr,
          sep: r.sep,
          mobius: h.mobius,
          wRef: r.wRef,
          bRef: r.bRef
        };
      }
    }
  }
  return best;
});};
const _1bz0j2c = function _minMargin(Inputs) {return (Inputs.range([0, 8], { step: 0.25, value: 2, label: "decode margin gate" }));};
const _14a2hls = (G, _) => G.input(_);
const _101f5yy = function _runPipeline(minMargin,scanRows,edges1Dsub,rowOf,edgeThreshold,detectLandmarkRow,decodeLandmark,xFromK) {return (function runPipeline(frame, opts = {}) {
  const t0 = window.performance.now();
  const mm = opts.minMargin ?? minMargin;
  const minReadable = opts.minReadable ?? 5;
  // callers may re-phase the scan lattice (opts.scanRows): a static scene can be
  // temporally dithered so a mark that straddles one phase's rows badly is caught
  // by the next frame's offset rows
  const rows = opts.scanRows ?? scanRows;
  const hits = [];
  let rawHits = 0, rejected = 0, windows = 0, survived = 0, edges = 0;
  let msDetect = 0, msDecode = 0;
  for (const y of rows) {
    const tA = window.performance.now();
    const se = edges1Dsub(rowOf(frame, y), opts.edgeThreshold ?? edgeThreshold);
    edges += se.length;
    // decode BEFORE non-maximum suppression: overlapping windows are resolved by
    // who actually reads as a valid codeword, not by edge-alignment score alone
    const dets = detectLandmarkRow(se, { ...opts, nms: false });
    windows += dets.windows;
    survived += dets.survived;
    rawHits += dets.length;
    const tB = window.performance.now();
    msDetect += tB - tA;
    const decoded = [];
    for (const det of dets) {
      const hit = { y, ...det };
      const dec = decodeLandmark(hit, frame, opts);
      if (!dec || dec.margin < mm || dec.readable < minReadable) {
        rejected++;
        continue;
      }
      decoded.push({
        ...hit,
        mobius: dec.mobius,
        d: dec.d,
        footX: xFromK(dec.mobius, 0),
        id: dec.id,
        decodeMargin: dec.margin,
        refSep: dec.sep,
        readable: dec.readable,
        soft: dec.soft
      });
    }
    // NMS among decodable hits: strongest decode wins overlaps
    decoded.sort((p, q) => q.decodeMargin - p.decodeMargin || p.xRMSE - q.xRMSE);
    for (const c of decoded) {
      const clash = hits.some(
        (a) => a.y === c.y && !(c.endIndex < a.startIndex || c.startIndex > a.endIndex)
      );
      if (!clash) hits.push(c);
      else rejected++;
    }
    msDecode += window.performance.now() - tB;
  }
  return {
    frame: frame.n,
    hits,
    rawHits,
    rejectedByDecode: rejected,
    windows,
    survived,
    scanEdges: edges,
    rowsTouched: rows.length,
    msDetect,
    msDecode,
    ms: window.performance.now() - t0
  };
});};
const _w7qboo = function _frameLandmarks(runPipeline,simFrame) {return (runPipeline(simFrame, {}));};
const _16dv5r5 = function _detectionLayer(htl,groundTruth,frameLandmarks,overlaySvg,invalidation) {
  const g = htl.svg`<g></g>`;
  // ground truth: projected ellipse + true id
  for (const b of groundTruth) {
    if (!b.onScreen) continue;
    const ang = (Math.atan2(b.u.y, b.u.x) * 180) / Math.PI;
    const ru = Math.hypot(b.u.x, b.u.y);
    const rv = Math.hypot(b.v.x, b.v.y);
    g.appendChild(
      htl.svg`<ellipse cx="${b.cx}" cy="${b.cy}" rx="${ru}" ry="${rv}" transform="rotate(${ang} ${b.cx} ${b.cy})" fill="none" stroke="#4fd1c5" stroke-width="1" stroke-dasharray="4 3" opacity="0.85"/>`
    );
    g.appendChild(
      htl.svg`<text x="${b.cx}" y="${b.cy - rv - 4}" fill="#4fd1c5" font-size="11" font-family="monospace" text-anchor="middle">id ${b.trueId}</text>`
    );
  }
  // decoded landmark rows: span, foot, and the id that was read
  for (const h of frameLandmarks.hits) {
    if (!isFinite(h.leftX) || !isFinite(h.rightX) || !isFinite(h.footX)) continue;
    g.appendChild(
      htl.svg`<line x1="${h.leftX}" y1="${h.y}" x2="${h.rightX}" y2="${h.y}" stroke="#ffd166" stroke-width="2" opacity="0.9"/>`
    );
    g.appendChild(
      htl.svg`<circle cx="${h.footX}" cy="${h.y}" r="3" fill="none" stroke="#ffd166" stroke-width="1.5"/>`
    );
    g.appendChild(
      htl.svg`<text x="${h.rightX + 5}" y="${h.y + 4}" fill="#ffd166" font-size="11" font-family="monospace">${h.id}</text>`
    );
  }
  overlaySvg.appendChild(g);
  invalidation.then(() => g.remove());
  return;
};
const _16xqu3c = function _landmarkTable(Inputs,frameLandmarks) {return (Inputs.table(
  frameLandmarks.hits.map((h) => ({
    y: h.y,
    id: h.id,
    footX: +h.footX.toFixed(1),
    d: +h.d.toFixed(2),
    margin: +h.decodeMargin.toFixed(2),
    refSep: +h.refSep.toFixed(0),
    readable: h.readable,
    xRMSE: +h.xRMSE.toFixed(3)
  })),
  { layout: "auto" }
));};
const _134ceh = function _scoreLandmarks(groundTruth) {return (function scoreLandmarks(run) {
  const gt = groundTruth.filter((b) => b.onScreen);
  const rows = [];
  const foundIds = new Set();
  let idCorrect = 0;
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
    const idOk = ok && hit.id === best.trueId;
    if (ok) foundIds.add(best.id);
    if (idOk) idCorrect++;
    rows.push({
      y: hit.y,
      decodedId: hit.id,
      trueId: ok ? best.trueId : null,
      idOk: ok ? idOk : null,
      footX: +hit.footX.toFixed(2),
      errX: ok ? +(hit.footX - best.cx).toFixed(3) : null,
      margin: +hit.decodeMargin.toFixed(2)
    });
  }
  const matched = rows.filter((r) => r.trueId !== null);
  const rms = (xs) =>
    xs.length ? Math.sqrt(xs.reduce((a, b) => a + b * b, 0) / xs.length) : null;
  const rx = rms(matched.map((r) => r.errX));
  return {
    landmarksOnScreen: gt.length,
    landmarksFound: foundIds.size,
    rowHits: rows.length,
    idCorrect,
    idWrong: matched.length - idCorrect,
    falsePositives: rows.length - matched.length,
    rmsErrX_px: rx == null ? null : +rx.toFixed(3),
    msPerFrame: +run.ms.toFixed(1),
    perRow: rows
  };
});};
const _vhmell = function _frameScore(scoreLandmarks,frameLandmarks) {
  const s = scoreLandmarks(frameLandmarks);
  return {
    landmarksOnScreen: s.landmarksOnScreen,
    landmarksFound: s.landmarksFound,
    rowHits: s.rowHits,
    idCorrect: s.idCorrect,
    idWrong: s.idWrong,
    falsePositives: s.falsePositives,
    rmsErrX_px: s.rmsErrX_px,
    msPerFrame: s.msPerFrame
  };
};
const _d8xg2l = function _anonymous(md,minMargin) {return (md`## 5. Fusing rows into labelled landmarks

A single scan row gives one reading: a position, a chord offset \`d\`, and a decoded id with a margin. Rows are cheap, and a mark spans many of them, so the natural unit of output is not a row hit but a *landmark*: the cluster of row hits that belong to one mark, fused into a 2D centre and a single voted id.

Two things change relative to the per-row pipeline of §4:

1. **The gate relaxes.** Per-row we demanded a decode margin ≥ ${minMargin} because a lone row has nothing to corroborate it. For fusion we drop the bar (margin ≥ 0.8, readable ≥ 4) and let corroboration do the work: a wrong low-margin read is out-voted by its neighbours, and junk windows do not cluster — they land at scattered positions and fail the minimum-rows test.

2. **The id becomes a vote.** Each row hit contributes its decode margin as weight to its id. The cluster's id is the heaviest; the vote margin (best minus runner-up weight) is the landmark's confidence. This is the payoff of soft-decision decoding — a marginal row still contributes evidence instead of being rounded to a hard yes/no.

Geometry reuses Part III's V-fit unchanged (\`fuseCluster\`, imported): \`|d|\` versus \`y\` forms a V whose apex is the mark centre, giving a sub-row-stride vertical position from purely horizontal scans.`);};
const _1kcdtq1 = function _fuseLandmarks(rowStride,fuseCluster) {return (function fuseLandmarks(hits, opts = {}) {
  const xTol = opts.xTol ?? 0.6;
  const maxRowGap = opts.maxRowGap ?? 3;
  const minRows = opts.minRows ?? 2;
  // cluster: same greedy row-major sweep as Part III, keyed on footX proximity
  // relative to the window's own apparent half-width
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
  const out = [];
  for (const c of clusters) {
    if (c.length < minRows) continue;
    // margin-weighted id vote across the cluster's rows
    const votes = new Map();
    for (const h of c) votes.set(h.id, (votes.get(h.id) ?? 0) + h.decodeMargin);
    const ranked = [...votes.entries()].sort((p, q) => q[1] - p[1]);
    const [id, voteWeight] = ranked[0];
    const voteMargin = voteWeight - (ranked[1]?.[1] ?? 0);
    // geometry from winner rows only: a row that decoded to a losing id got its
    // position from a wrong map, and would drag the centre fit
    const geo = c.filter((h) => h.id === id);
    // the WINNER needs corroboration, not just the cluster: two disagreeing
    // low-margin rows form a 2-row cluster whose "winner" is a coin toss — a
    // wrong-id landmark is worse for navigation than no landmark, so demand
    // minRows rows of the winning id itself
    if (geo.length < minRows) continue;
    const fit = geo.length >= 3 ? fuseCluster(geo) : null;
    let xc, yc;
    if (fit) {
      xc = fit.xc;
      yc = fit.yc;
    } else {
      let w = 0, sx = 0, sy = 0;
      for (const h of geo) {
        w += h.decodeMargin;
        sx += h.decodeMargin * h.footX;
        sy += h.decodeMargin * h.y;
      }
      xc = sx / w;
      yc = sy / w;
    }
    out.push({
      id,
      xc,
      yc,
      voteWeight: +voteWeight.toFixed(2),
      voteMargin: +voteMargin.toFixed(2),
      rows: c.length,
      geoRows: geo.length,
      vFit: !!fit,
      apparentRadiusY: fit ? fit.apparentRadiusY : null,
      hits: c
    });
  }
  return out.sort((p, q) => q.voteWeight - p.voteWeight);
});};
const _1whsoz5 = function _fusedLandmarks(runPipeline,simFrame,scanRows,fuseLandmarks) {
  // relaxed per-row gate: corroboration across rows replaces margin strictness.
  // Two scan phases: a static frame costs nothing to rescan offset by half a
  // stride, and a mark whose centre falls badly against one row lattice (its
  // readable band clipped to a single row) gets complementary rows from the
  // other phase — the same temporal dither the §7 rig uses, collapsed into one
  // frame because there is no motion to respect.
  const opts = { minMargin: 0.8, minReadable: 4 };
  const a = runPipeline(simFrame, opts);
  const b = runPipeline(simFrame, {
    ...opts,
    scanRows: scanRows.map((y) => y - 6).filter((y) => y >= 0)
  });
  return fuseLandmarks([...a.hits, ...b.hits]);
};
const _1cm1mhn = function _fusedTable(Inputs,fusedLandmarks) {return (Inputs.table(
  fusedLandmarks.map((f) => ({
    id: f.id,
    xc: +f.xc.toFixed(1),
    yc: +f.yc.toFixed(1),
    rows: f.rows,
    geoRows: f.geoRows,
    vFit: f.vFit,
    voteWeight: f.voteWeight,
    voteMargin: f.voteMargin
  })),
  { layout: "auto" }
));};
const _g4km08 = function _fusedLayer(fusedLandmarks,overlaySvg,invalidation) {
  const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
  for (const f of fusedLandmarks) {
    const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    c.setAttribute("cx", f.xc);
    c.setAttribute("cy", f.yc);
    c.setAttribute("r", 6);
    c.setAttribute("fill", "none");
    c.setAttribute("stroke", "#ff5cf4");
    c.setAttribute("stroke-width", 2.5);
    g.append(c);
    const t = document.createElementNS("http://www.w3.org/2000/svg", "text");
    t.setAttribute("x", f.xc + 10);
    t.setAttribute("y", f.yc - 8);
    t.setAttribute("fill", "#ff5cf4");
    t.setAttribute("font-size", "15");
    t.setAttribute("font-weight", "bold");
    t.textContent = `id ${f.id} ×${f.rows}`;
    g.append(t);
  }
  overlaySvg.append(g);
  invalidation.then(() => g.remove());
};
const _hl8v3v = function _anonymous(md) {return (md`## 6. Scoring against ground truth

The simulator knows exactly where every mark is and what id it carries, so the whole pipeline can be scored end-to-end. Two levels:

- **Per row** (\`frameScore\`): every surviving row hit is matched to the nearest ground-truth mark in normalized ellipse distance; a hit inside the ellipse (distance ≤ 1) whose decoded id equals the mark's id counts as correct.
- **Per landmark** (\`fusionScore\`): each fused cluster is matched the same way on its centre estimate.

Occlusion bounds recall: the scene deliberately overlaps marks, and a mark that is partially behind another loses its edge structure on exactly the rows that cross the occluder — no amount of per-row cleverness reads a mark that is not visible. The detector's job is to read every *visible* mark and to say nothing about the rest; false positives are the failure mode that matters, because a robot that trusts a phantom landmark navigates with a corrupted map.

Decode cost does not grow with the codebook. The correlation decode is Σ softᵢ·(2wᵢ−1) per codeword — 16 multiply-adds over 8 bits — and everything before it (windowing, alignment, photometric sampling) is codebook-blind. Doubling the payload to 16 bits would double the sample count per row, not the search space: this is the practical difference between *labelled* landmarks and template-matched ones, where each new template multiplies detection cost.`);};
const _1uuc46l = function _fusionScore(groundTruth,fusedLandmarks) {
  const gt = groundTruth.filter((b) => b.onScreen);
  let idCorrect = 0, wrong = 0, fp = 0;
  const rows = fusedLandmarks.map((f) => {
    let best = null, bd = Infinity;
    for (const b of gt) {
      const r = Math.hypot((f.xc - b.cx) / b.xExtent, (f.yc - b.cy) / b.yExtent);
      if (r < bd) { bd = r; best = b; }
    }
    const ok = best && bd <= 1;
    if (!ok) fp++;
    else if (f.id === best.trueId) idCorrect++;
    else wrong++;
    return {
      id: f.id,
      trueId: ok ? best.trueId : null,
      errX: ok ? +(f.xc - best.cx).toFixed(2) : null,
      errY: ok ? +(f.yc - best.cy).toFixed(2) : null,
      rows: f.rows,
      voteMargin: f.voteMargin
    };
  });
  return {
    landmarksOnScreen: gt.length,
    landmarksIdentified: idCorrect,
    idWrong: wrong,
    falsePositives: fp,
    perLandmark: rows
  };
};
const _d5ljip = function _anonymous(md) {return (md`---
## §7 Mirror calibration rig

Point the laptop at a mirror and the machine can see its own screen: the notebook draws marks at positions *it chose*, the camera reports positions *it measured*, and both ends share one \`performance.now()\` clock. That closes the loop that §6's simulator closed in software — but through real optics, real screen persistence, real camera latency.

Two properties make the mirror harmless:

- **The code is radial.** A mirror flips the image left-right, but every ring is a ring after reflection — carrier edges, payload bands and photometric references are all functions of radius only. Decoding is untouched.
- **A homography absorbs the flip.** The screen-to-camera mapping (mirror included) is projective; fitting it makes no assumption about orientation, so the reflection just shows up as a negative determinant.

The rig has two stimulus modes and two capture sources:

| | measures |
|---|---|
| **grid** — six static marks at known positions | screen→camera **homography** (camera calibration), static id accuracy |
| **orbit** — one mark on a Lissajous path, speed adjustable | **end-to-end latency**, tracking under motion, speed limits |

Latency needs no calibration at all: the commanded x-position and the detected x-position are the same sinusoid up to scale, offset and mirror-flip, so cross-correlating the two normalized signals over a lag grid reads the delay directly. The homography is only needed when you want *metric* answers (where is the camera, how distorted is the lens).

The **loopback** source pipes the stimulus canvas straight into the detector — no camera, no mirror. It exists so the rig can verify itself: loopback latency should be a frame or two, the loopback homography is a known pure scale, and any id error in loopback is a bug, not physics. Switch to **camera** with the mirror in place and every number that moves is measuring the physical channel.`);};
const _13fbguf = function _drawLandmark(LAYOUT,codebook) {return (function drawLandmark(ctx, cx, cy, R, id) {
  // no quiet zone: an extra white disc outside the rim adds a strong edge at
  // 1.15R that windows anchor on, stretching every sampled radius by 1.15x and
  // landing the photometric references in the wrong bands. The mid-gray
  // background gives the black rim all the contrast the edge detector needs.
  const scale = R / LAYOUT.R;
  for (const [r0, r1, k] of LAYOUT.bands) {
    const bit = typeof k === "number" ? k : codebook[id][+k.slice(1)];
    ctx.fillStyle = bit ? "#fff" : "#000";
    ctx.beginPath();
    ctx.arc(cx, cy, r1 * scale, 0, 2 * Math.PI);
    ctx.arc(cx, cy, r0 * scale, 0, 2 * Math.PI, true);
    ctx.fill("evenodd");
  }
});};
const _c4vxv2 = function _calMode(Inputs) {return (Inputs.radio(["grid", "orbit"], { label: "stimulus", value: "grid" }));};
const _trjtqx = (G, _) => G.input(_);
const _ohzx5w = function _calRunning(Inputs) {return (Inputs.toggle({ label: "calibration rig", value: false }));};
const _mmw90r = (G, _) => G.input(_);
const _ntgvpx = function _calSpeed(Inputs) {return (Inputs.range([0.05, 2], { step: 0.05, value: 0.25, label: "orbit speed (Hz)" }));};
const _73cqhr = (G, _) => G.input(_);
const _5pnclc = function _stimulusBus() {
  // stable shared handle between the stimulus animator and the capture loop —
  // the capture generator reads history without re-instantiating per frame
  return { history: [], marks: [], t: 0 };
};
const _1g04xsf = function _stimulusView() {
  const c = window.document.createElement("canvas");
  c.width = 960;
  c.height = 600;
  c.style.width = "100%";
  c.style.maxWidth = "960px";
  c.style.display = "block";
  c.style.background = "#888";
  const btn = window.document.createElement("button");
  btn.textContent = "fullscreen (for the mirror)";
  btn.style.margin = "4px 0";
  btn.onclick = () => c.requestFullscreen();
  const div = window.document.createElement("div");
  div.append(btn, c);
  div.canvas = c;
  return div;
};
const _xfbe8z = function _stimulusRun(calRunning,stimulusView,calMode,calSpeed,drawLandmark,stimulusBus) {return (async function* () {
  if (!calRunning) {
    yield "stimulus off";
    await new Promise(() => {}); // park until the toggle re-runs this cell
  }
  const c = stimulusView.canvas;
  const ctx = c.getContext("2d");
  const w = c.width, h = c.height;
  let n = 0;
  while (true) {
    await new Promise((r) => window.requestAnimationFrame(r));
    const t = window.performance.now();
    let marks;
    if (calMode === "grid") {
      // six static marks at known positions — one frame of these fits a homography.
      // The middle column is staggered vertically: on a symmetric 3-collinear row
      // the stitched window spanning the outer marks is centred exactly on the
      // middle one and its scan rows fight the neighbours' for detector slots.
      // Staggering removes the shared latitude band (and a non-collinear 6-point
      // constellation conditions the homography better anyway).
      marks = [];
      const R = 100;
      const stagger = [0, 0.13, 0]; // per-column y offset, as a fraction of h
      for (let i = 0; i < 6; i++) {
        const col = i % 3;
        marks.push({
          id: 1 + i,
          x: w * (0.18 + 0.32 * col),
          y: h * ((i < 3 ? 0.2 : 0.66) + stagger[col]),
          R
        });
      }
    } else {
      // orbit: one mark on a Lissajous path, frequency from the speed slider
      const f = (2 * Math.PI * calSpeed * t) / 1000;
      marks = [
        {
          id: 7,
          x: w / 2 + 0.32 * w * Math.sin(f),
          y: h / 2 + 0.22 * h * Math.sin(0.63 * f + 1),
          R: 110
        }
      ];
    }
    ctx.fillStyle = "#888";
    ctx.fillRect(0, 0, w, h);
    for (const m of marks) drawLandmark(ctx, m.x, m.y, m.R, m.id);
    stimulusBus.t = t;
    stimulusBus.marks = marks;
    stimulusBus.history.push({ t, marks });
    if (stimulusBus.history.length > 600) stimulusBus.history.shift();
    if (n % 600 === 0) yield `stimulus ${calMode} frame ${n}`;
    n++;
  }
}());};
const _12d6o8 = function _calSource(Inputs) {return (Inputs.radio(["loopback", "camera"], { label: "capture source", value: "loopback" }));};
const _1dh1pen = (G, _) => G.input(_);
const _1i4d397 = async function _calStream(calRunning,calSource,CAL_FRAME,invalidation) {
  if (!calRunning || calSource !== "camera") return null;
  try {
    const stream = await window.navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: CAL_FRAME.w },
        height: { ideal: CAL_FRAME.h },
        facingMode: "user" // the screen-facing camera is the one that sees the mirror
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
const _1itgjy2 = async function _calVideo(htl,calStream,invalidation) {
  const v = htl.html`<video playsinline muted autoplay style="display:none"></video>`;
  if (calStream && !calStream.error) {
    v.srcObject = calStream;
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
const _uxbtt2 = function _calRun(calRunning,CAL_FRAME,calRows,calMode,stimulusBus,calSource,calVideo,stimulusView,runPipeline,fuseLandmarks) {return (async function* () {
  if (!calRunning) {
    yield null;
    await new Promise(() => {}); // park until the toggle re-runs this cell
  }
  const cap = window.document.createElement("canvas");
  cap.width = CAL_FRAME.w;
  cap.height = CAL_FRAME.h;
  const ctx = cap.getContext("2d", { willReadFrequently: true });
  const gray = new Uint8Array(CAL_FRAME.w * CAL_FRAME.h);
  const trace = []; // {t, x} detected orbit-mark x per frame
  let n = 0;
  let lastYield = 0;
  // margin 4, not the fusion-relaxed 0.8: crisp screen marks decode at the full
  // margin 8 on every in-band row, so anything below half of that is a rim-row
  // misread (P0 unreadable at d>7 leaves 7 bits, and 2-3 flipped outer cells
  // still clear a 0.8 bar with the wrong id)
  const pipeOpts = { minMargin: 4, minReadable: 4 };
  // temporal scan dither: alternate the row-lattice phase each frame so a mark
  // whose centre falls badly against one phase (its readable band clipped to a
  // single row) is sampled at complementary offsets on the next frames
  const dith = calRows.length > 1 ? calRows[1] - calRows[0] : 12;
  const phases = [0, 0.5, 0.75, 0.25].map((f) =>
    calRows.map((y) => y - Math.round(f * dith)).filter((y) => y >= 0)
  );
  // grid mode: exponential per-id accumulation of fused centres across frames —
  // the stimulus is static, so the homography should not depend on which subset
  // of marks a single frame's row phase happened to catch
  const acc = new Map(); // id -> {x, y, w, seen, vfit}
  const ACC_DECAY = 0.9;
  // Scan rows per uninterrupted block. Chunking exists to keep the tab
  // responsive during the dense grid sweep; orbit shows a single mark against a
  // flat field and the whole sweep costs ~9ms, well inside a frame, so chunking
  // it buys nothing and costs plenty — each setTimeout(0) is clamped to ~4ms,
  // and 13 of them per frame dragged capture from 60fps to 18, which is exactly
  // the temporal resolution the latency estimate is made of.
  const ROW_CHUNK = calMode === "orbit" ? calRows.length : 3;
  // grid is a static scene: there is nothing to gain from detecting at display
  // rate, and the idle gap keeps the tab responsive and cool. Orbit runs flat
  // out because its whole point is temporal resolution.
  const IDLE_MS = 60;
  const mergeRuns = (a, b) => ({
    ...b,
    hits: a.hits.concat(b.hits),
    rawHits: a.rawHits + b.rawHits,
    rejectedByDecode: a.rejectedByDecode + b.rejectedByDecode,
    windows: a.windows + b.windows,
    survived: a.survived + b.survived,
    scanEdges: a.scanEdges + b.scanEdges,
    rowsTouched: a.rowsTouched + b.rowsTouched,
    msDetect: a.msDetect + b.msDetect,
    msDecode: a.msDecode + b.msDecode,
    ms: a.ms + b.ms
  });

  // commanded x at time t, linearly interpolated from the stimulus history
  const cmdX = (t) => {
    const h = stimulusBus.history;
    if (h.length < 2 || t < h[0].t || t > h[h.length - 1].t) return null;
    let lo = 0, hi = h.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (h[mid].t <= t) lo = mid;
      else hi = mid;
    }
    const a = h[lo], b = h[hi];
    const f = (t - a.t) / (b.t - a.t || 1);
    return a.marks[0].x * (1 - f) + b.marks[0].x * f;
  };

  // lag maximising |normalized correlation| between detected and commanded x.
  // Scale/offset/mirror invariant, so it needs no homography.
  const estimateLatency = () => {
    if (calMode !== "orbit" || trace.length < 60) return null;
    let best = null;
    for (let lag = 0; lag <= 400; lag += 8) {
      let sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0, m = 0;
      for (const p of trace) {
        const c = cmdX(p.t - lag);
        if (c == null) continue;
        sx += p.x; sy += c; sxx += p.x * p.x; syy += c * c; sxy += p.x * c;
        m++;
      }
      if (m < 30) continue;
      const cov = sxy - (sx * sy) / m;
      const vx = sxx - (sx * sx) / m;
      const vy = syy - (sy * sy) / m;
      if (vx <= 0 || vy <= 0) continue;
      const r = cov / Math.sqrt(vx * vy);
      if (!best || Math.abs(r) > Math.abs(best.r)) best = { lagMs: lag, r, samples: m };
    }
    return best;
  };

  while (true) {
    await new Promise((r) => window.requestAnimationFrame(r));
    const src = calSource === "camera" ? calVideo : stimulusView.canvas;
    if (calSource === "camera" && (!calVideo || calVideo.readyState < 2)) continue;
    ctx.drawImage(src, 0, 0, CAL_FRAME.w, CAL_FRAME.h);
    const px = ctx.getImageData(0, 0, CAL_FRAME.w, CAL_FRAME.h).data;
    for (let i = 0, p = 0; i < gray.length; i++, p += 4) {
      gray[i] = (px[p] * 77 + px[p + 1] * 150 + px[p + 2] * 29) >> 8;
    }
    const t = window.performance.now();
    const frame = { gray, w: CAL_FRAME.w, h: CAL_FRAME.h, t, n };
    // Sweep the row lattice in chunks, yielding to the event loop between them.
    // A 40-row sweep is ~85ms of synchronous work; run once per animation frame
    // that pins the main thread and scrolling visibly stutters. Rows are
    // independent — NMS is intra-row — so chunking is exactly equivalent to one
    // call, it just caps each uninterrupted block at roughly one frame budget.
    const frameRows = phases[n % phases.length];
    let run = null;
    for (let r0 = 0; r0 < frameRows.length; r0 += ROW_CHUNK) {
      const part = runPipeline(frame, {
        ...pipeOpts,
        scanRows: frameRows.slice(r0, r0 + ROW_CHUNK)
      });
      run = run ? mergeRuns(run, part) : part;
      if (r0 + ROW_CHUNK < frameRows.length)
        await new Promise((r) => window.setTimeout(r, 0));
    }
    // Coarse rows locate marks; sub-row-stride yc needs fuseCluster's V-fit,
    // which needs three rows of the WINNING id. A mark seen through the mirror
    // spans only ~6 coarse rows and its outer ones do not decode, so it lands on
    // the 2-row fallback — where yc degrades to the centroid of whichever rows
    // happened to fire (measured against loopback truth: 29px rms and a -15px
    // BIAS, versus 1.9px rms and no bias once the V-fit engages; a bias frame
    // averaging cannot remove). So rescan a fine lattice inside the band of each
    // mark that fell back, which costs rows in proportion to the marks that
    // actually need help rather than doubling the whole sweep.
    let fused = fuseLandmarks(run.hits);
    const weak = fused.filter((f) => !f.vFit);
    if (weak.length) {
      const extra = new Set();
      // Tried scaling these offsets to the mark's apparent radius, on the theory
      // that rows near the V's apex carry little vertical information. Measured
      // worse on every axis (rmsY 7.6 -> 15.0, V-fit share 100% -> 86%, 136ms ->
      // 750ms per frame): pushed out that far the rows stop decoding, so the
      // mark stays weak, gets re-refined every frame, and the V-fit loses the
      // very rows it needed. Row-stride offsets it is.
      for (const f of weak)
        for (const o of [-2, -1, 1, 2]) {
          const y = Math.round(f.yc + (o * dith) / 3);
          if (y >= 0 && y < CAL_FRAME.h) extra.add(y);
        }
      for (const y of frameRows) extra.delete(y);
      const refineRows = [...extra].sort((a, b) => a - b);
      if (refineRows.length) {
        // chunked like the coarse sweep: an unchunked refinement block is the
        // same main-thread stall, just later in the frame
        for (let r0 = 0; r0 < refineRows.length; r0 += ROW_CHUNK) {
          run = mergeRuns(run, runPipeline(frame, {
            ...pipeOpts,
            scanRows: refineRows.slice(r0, r0 + ROW_CHUNK)
          }));
          if (r0 + ROW_CHUNK < refineRows.length)
            await new Promise((r) => window.setTimeout(r, 0));
        }
        fused = fuseLandmarks(run.hits);
      }
    }
    if (calMode === "grid") {
      for (const [, a] of acc) a.w *= ACC_DECAY;
      for (const f of fused) {
        const a = acc.get(f.id) ?? { x: 0, y: 0, w: 0, seen: 0, vfit: 0 };
        const wNew = f.rows;
        a.x = (a.x * a.w + f.xc * wNew) / (a.w + wNew);
        a.y = (a.y * a.w + f.yc * wNew) / (a.w + wNew);
        a.w += wNew;
        a.seen++;
        if (f.vFit) a.vfit++;
        acc.set(f.id, a);
      }
    }
    if (calMode === "orbit" && fused.length) {
      trace.push({ t, x: fused[0].xc });
      if (trace.length > 240) trace.shift();
    }
    n++;
    if (calMode === "grid") await new Promise((r) => window.setTimeout(r, IDLE_MS));
    // yield ~4x/s so the dataflow is not saturated by 60Hz updates
    if (t - lastYield > 250) {
      lastYield = t;
      yield {
        t,
        n,
        source: calSource,
        mode: calMode,
        capture: cap,
        run,
        fused,
        // accumulated landmarks: ids with meaningful surviving weight only
        landmarks: [...acc.entries()]
          .filter(([, a]) => a.w > 1)
          .map(([id, a]) => ({
            id, xc: a.x, yc: a.y, weight: a.w, seen: a.seen,
            // fraction of contributing frames whose yc came from the V-fit
            // rather than the biased row-centroid fallback
            vFitFrac: a.seen ? a.vfit / a.seen : 0
          })),
        traceLen: trace.length,
        latency: estimateLatency()
      };
    }
  }
}());};
const _9ey4fu = function _fitHomography() {return (function fitHomography(pairs) {
  // least-squares homography (h33 = 1): [sx,sy] -> [dx,dy], 8 unknowns,
  // normal equations solved by Gaussian elimination. Reflections (the mirror)
  // come out as a negative determinant of the affine part — no special casing.
  if (pairs.length < 4) return null;
  const A = Array.from({ length: 8 }, () => new Float64Array(9));
  for (const { sx, sy, dx, dy } of pairs) {
    const r1 = [sx, sy, 1, 0, 0, 0, -sx * dx, -sy * dx, dx];
    const r2 = [0, 0, 0, sx, sy, 1, -sx * dy, -sy * dy, dy];
    for (const r of [r1, r2]) {
      for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) A[i][j] += r[i] * r[j];
        A[i][8] += r[i] * r[8];
      }
    }
  }
  for (let c = 0; c < 8; c++) {
    let p = c;
    for (let r = c + 1; r < 8; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    if (Math.abs(A[p][c]) < 1e-12) return null;
    [A[c], A[p]] = [A[p], A[c]];
    for (let r = 0; r < 8; r++) {
      if (r === c) continue;
      const f = A[r][c] / A[c][c];
      for (let j = c; j < 9; j++) A[r][j] -= f * A[c][j];
    }
  }
  const h = A.map((row, i) => row[8] / row[i]);
  const H = [h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], 1];
  const map = (sx, sy) => {
    const w = H[6] * sx + H[7] * sy + 1;
    return [(H[0] * sx + H[1] * sy + H[2]) / w, (H[3] * sx + H[4] * sy + H[5]) / w];
  };
  let ss = 0;
  for (const { sx, sy, dx, dy } of pairs) {
    const [px, py] = map(sx, sy);
    ss += (px - dx) ** 2 + (py - dy) ** 2;
  }
  return {
    H,
    map,
    mirrored: H[0] * H[4] - H[1] * H[3] < 0,
    rmsResidual: Math.sqrt(ss / pairs.length),
    pairs: pairs.length
  };
});};
const _nnfn1b = function _calHomography(calRun,stimulusBus,fitHomography) {
  // grid mode: id-match the ACCUMULATED landmark centres (not one frame's fused
  // subset) to the commanded marks — the scan-phase dither means different frames
  // see different mark subsets, and the accumulator merges them
  if (!calRun || calRun.mode !== "grid") return null;
  const cmd = new Map(stimulusBus.marks.map((m) => [m.id, m]));
  const pairs = [];
  for (const f of calRun.landmarks ?? []) {
    const m = cmd.get(f.id);
    if (m) pairs.push({ sx: m.x, sy: m.y, dx: f.xc, dy: f.yc });
  }
  return fitHomography(pairs);
};
const _1gnnqz3 = function _calStats(calRun,md,stimulusBus,calHomography,htl) {
  if (!calRun) return md`*rig off — toggle "calibration rig" to start*`;
  const rows = [
    ["mode / source", `${calRun.mode} / ${calRun.source}`],
    ["frames processed", calRun.n],
    ["pipeline ms", calRun.run.ms.toFixed(1)],
    ["row hits", calRun.run.hits.length],
    ["fused this frame", calRun.fused.map((f) => `id${f.id}×${f.rows}`).join(" ") || "—"]
  ];
  if (calRun.mode === "grid") {
    const cmdIds = new Set(stimulusBus.marks.map((m) => m.id));
    const lm = calRun.landmarks ?? [];
    const good = lm.filter((f) => cmdIds.has(f.id)).length;
    rows.push([
      "accumulated landmarks",
      lm.map((f) => `id${f.id}(${f.seen}f)`).join(" ") || "—"
    ]);
    rows.push(["ids matched", `${good}/${stimulusBus.marks.length}`]);
    if (calHomography) {
      rows.push(
        ["homography residual", `${calHomography.rmsResidual.toFixed(2)} px (${calHomography.pairs} pts)`],
        ["mirrored", String(calHomography.mirrored)],
        ["scale x/y", `${calHomography.H[0].toFixed(3)} / ${calHomography.H[4].toFixed(3)}`]
      );
    } else rows.push(["homography", "needs ≥4 id-matched marks"]);
  }
  if (calRun.mode === "orbit") {
    rows.push([
      "latency",
      calRun.latency
        ? `${calRun.latency.lagMs} ms (|r|=${Math.abs(calRun.latency.r).toFixed(3)}, ${calRun.latency.samples} samples${calRun.latency.r < 0 ? ", mirrored" : ""})`
        : `collecting trace… ${calRun.traceLen}/60`
    ]);
  }
  return htl.html`<table style="font:13px monospace">${rows.map(
    ([k, v]) => htl.html`<tr><td style="padding:1px 12px 1px 0;opacity:.7">${k}</td><td>${v}</td></tr>`
  )}</table>`;
};
const _1gmmbqf = function _edges1Dsub() {return (function edges1Dsub(sig, thr = 6) {
  // Part II's edges1D with parabolic sub-pixel refinement of each gradient peak.
  // Integer edge positions cost ~0.03 of cross ratio at 2px-per-template-unit
  // mark scales — past the CR gate's tolerance — so the quarter-pixel accuracy
  // here is what lets small on-screen marks through detection at all.
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
      const y1 = Math.abs(d[i - 1]), y2 = Math.abs(d[i]), y3 = Math.abs(d[i + 1]);
      const den = y1 - 2 * y2 + y3;
      const off = Math.abs(den) > 1e-6 ? (0.5 * (y1 - y3)) / den : 0;
      idx.push({ x: i + Math.max(-0.5, Math.min(0.5, off)), s: Math.sign(v) });
    }
  }
  return idx;
});};
const _vui5kg = function _CAL_FRAME(FRAME) {
  // Measured through the mirror: a screen mark lands ~70px wide in a 640x480
  // capture, i.e. 1.25 pixels per template unit — under the ~2 the cross ratio
  // needs, so only the odd lucky row decoded. The camera reports a 1920 max, so
  // the resolution was ours to ask for. The sim rig keeps FRAME; oversampling
  // is confined to the calibration capture path.
  return { w: FRAME.w * 2, h: FRAME.h * 2 };
};
const _4iv3z6 = function _calRows(rowStride,CAL_FRAME,FRAME) {
  // scanRows at CAL_FRAME scale: the stride grows with the frame so a mark is
  // crossed by the same number of rows as before, and the sweep costs the same
  // number of rows rather than four times as many
  const stride = rowStride * (CAL_FRAME.h / FRAME.h);
  const rows = [];
  for (let y = Math.floor(stride / 2); y < CAL_FRAME.h; y += stride) rows.push(y);
  return rows;
};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  $def("_1dvf37e", null, ["md"], _1dvf37e);  
  main.define("module @tomlarkworthy/fast-1d-circular-barcode-matching", async () => runtime.module((await import("/@tomlarkworthy/fast-1d-circular-barcode-matching.js?v=4")).default));  
  main.define("edges1D", ["module @tomlarkworthy/fast-1d-circular-barcode-matching", "@variable"], (_, v) => v.import("edges1D", _));  
  main.define("fitMobiusLS", ["module @tomlarkworthy/fast-1d-circular-barcode-matching", "@variable"], (_, v) => v.import("fitMobiusLS", _));  
  main.define("xFromK", ["module @tomlarkworthy/fast-1d-circular-barcode-matching", "@variable"], (_, v) => v.import("xFromK", _));  
  main.define("module @tomlarkworthy/realtime-multi-barcode-tracking", async () => runtime.module((await import("/@tomlarkworthy/realtime-multi-barcode-tracking.js?v=4")).default));  
  main.define("dpScratch", ["module @tomlarkworthy/realtime-multi-barcode-tracking", "@variable"], (_, v) => v.import("dpScratch", _));  
  main.define("dpAlignFast", ["module @tomlarkworthy/realtime-multi-barcode-tracking", "@variable"], (_, v) => v.import("dpAlignFast", _));  
  main.define("FRAME", ["module @tomlarkworthy/realtime-multi-barcode-tracking", "@variable"], (_, v) => v.import("FRAME", _));  
  main.define("rowOf", ["module @tomlarkworthy/realtime-multi-barcode-tracking", "@variable"], (_, v) => v.import("rowOf", _));  
  main.define("crossRatio", ["module @tomlarkworthy/realtime-multi-barcode-tracking", "@variable"], (_, v) => v.import("crossRatio", _));  
  main.define("crDistance", ["module @tomlarkworthy/realtime-multi-barcode-tracking", "@variable"], (_, v) => v.import("crDistance", _));  
  main.define("fuseCluster", ["module @tomlarkworthy/realtime-multi-barcode-tracking", "@variable"], (_, v) => v.import("fuseCluster", _));  
  main.define("module @tomlarkworthy/circular-barcode-simulator", async () => runtime.module((await import("/@tomlarkworthy/circular-barcode-simulator.js?v=4")).default));  
  main.define("THREE", ["module @tomlarkworthy/circular-barcode-simulator", "@variable"], (_, v) => v.import("THREE", _));  
  $def("_106dc0v", null, ["md","tex"], _106dc0v);  
  $def("_lu0qkj", "LAYOUT", [], _lu0qkj);  
  $def("_dwk66l", "codebook", [], _dwk66l);  
  $def("_1p6gckl", "codebookCheck", ["codebook"], _1p6gckl);  
  $def("_1wej8fk", "radialColor", ["LAYOUT"], _1wej8fk);  
  $def("_1i5b3d0", "codewordGallery", ["LAYOUT","codebook"], _1i5b3d0);  
  $def("_4gz48s", null, ["md"], _4gz48s);  
  $def("_faupuu", "codewordTextures", ["LAYOUT","codebook","THREE","invalidation"], _faupuu);  
  $def("_nfwsus", "viewof nLandmarks", ["Inputs"], _nfwsus);  
  $def("_zsvxn7", "nLandmarks", ["Generators","viewof nLandmarks"], _zsvxn7);  
  $def("_15fbbws", "simRig", ["FRAME","THREE","codewordTextures","nLandmarks","invalidation"], _15fbbws);  
  $def("_j6jmhh", "viewof running", ["Inputs"], _j6jmhh);  
  $def("_u5lzp", "running", ["Generators","viewof running"], _u5lzp);  
  $def("_frwygv", "viewof motion", ["Inputs"], _frwygv);  
  $def("_13kodma", "motion", ["Generators","viewof motion"], _13kodma);  
  $def("_1hy8mdc", "simFrame", ["running","simRig","motion"], _1hy8mdc);  
  $def("_tl97yc", "overlaySvg", ["htl","FRAME"], _tl97yc);  
  $def("_xwbf17", "sceneView", ["simRig","htl","FRAME","overlaySvg"], _xwbf17);  
  $def("_2pll7q", "viewof rowStride", ["Inputs"], _2pll7q);  
  $def("_1jjclm3", "rowStride", ["Generators","viewof rowStride"], _1jjclm3);  
  $def("_1svyp0z", "scanRows", ["rowStride","FRAME"], _1svyp0z);  
  $def("_y17nqa", "groundTruth", ["simFrame","simRig","THREE"], _y17nqa);  
  main.define("templateAtOffset", ["module @tomlarkworthy/realtime-multi-barcode-tracking", "@variable"], (_, v) => v.import("templateAtOffset", _));  
  $def("_1aqjzs8", null, ["md"], _1aqjzs8);  
  $def("_c33xmx", "carrierTemplate", ["LAYOUT"], _c33xmx);  
  $def("_7u0e3a", "crCurve", ["LAYOUT","crossRatio"], _7u0e3a);  
  $def("_t28eph", "detectLandmarkRow", ["LAYOUT","crCurve","crossRatio","crDistance","templateAtOffset","carrierTemplate","fitMobiusLS","xFromK","dpScratch","dpAlignFast"], _t28eph);  
  $def("_1w8wvjm", "viewof edgeThreshold", ["Inputs"], _1w8wvjm);  
  $def("_ck7l4a", "edgeThreshold", ["Generators","viewof edgeThreshold"], _ck7l4a);  
  $def("_hqfg1d", "runDetection", ["scanRows","edges1D","rowOf","edgeThreshold","detectLandmarkRow"], _hqfg1d);  
  $def("_1v5ujxb", null, ["md"], _1v5ujxb);  
  $def("_18v6hzh", "decodeLandmark", ["xFromK","LAYOUT","codebook"], _18v6hzh);  
  $def("_1bz0j2c", "viewof minMargin", ["Inputs"], _1bz0j2c);  
  $def("_14a2hls", "minMargin", ["Generators","viewof minMargin"], _14a2hls);  
  $def("_101f5yy", "runPipeline", ["minMargin","scanRows","edges1Dsub","rowOf","edgeThreshold","detectLandmarkRow","decodeLandmark","xFromK"], _101f5yy);  
  $def("_w7qboo", "frameLandmarks", ["runPipeline","simFrame"], _w7qboo);  
  $def("_16dv5r5", "detectionLayer", ["htl","groundTruth","frameLandmarks","overlaySvg","invalidation"], _16dv5r5);  
  $def("_16xqu3c", "landmarkTable", ["Inputs","frameLandmarks"], _16xqu3c);  
  $def("_134ceh", "scoreLandmarks", ["groundTruth"], _134ceh);  
  $def("_vhmell", "frameScore", ["scoreLandmarks","frameLandmarks"], _vhmell);  
  $def("_d8xg2l", null, ["md","minMargin"], _d8xg2l);  
  $def("_1kcdtq1", "fuseLandmarks", ["rowStride","fuseCluster"], _1kcdtq1);  
  $def("_1whsoz5", "fusedLandmarks", ["runPipeline","simFrame","scanRows","fuseLandmarks"], _1whsoz5);  
  $def("_1cm1mhn", "fusedTable", ["Inputs","fusedLandmarks"], _1cm1mhn);  
  $def("_g4km08", "fusedLayer", ["fusedLandmarks","overlaySvg","invalidation"], _g4km08);  
  $def("_hl8v3v", null, ["md"], _hl8v3v);  
  $def("_1uuc46l", "fusionScore", ["groundTruth","fusedLandmarks"], _1uuc46l);  
  $def("_d5ljip", null, ["md"], _d5ljip);  
  $def("_13fbguf", "drawLandmark", ["LAYOUT","codebook"], _13fbguf);  
  $def("_c4vxv2", "viewof calMode", ["Inputs"], _c4vxv2);  
  $def("_trjtqx", "calMode", ["Generators","viewof calMode"], _trjtqx);  
  $def("_ohzx5w", "viewof calRunning", ["Inputs"], _ohzx5w);  
  $def("_mmw90r", "calRunning", ["Generators","viewof calRunning"], _mmw90r);  
  $def("_ntgvpx", "viewof calSpeed", ["Inputs"], _ntgvpx);  
  $def("_73cqhr", "calSpeed", ["Generators","viewof calSpeed"], _73cqhr);  
  $def("_5pnclc", "stimulusBus", [], _5pnclc);  
  $def("_1g04xsf", "stimulusView", [], _1g04xsf);  
  $def("_xfbe8z", "stimulusRun", ["calRunning","stimulusView","calMode","calSpeed","drawLandmark","stimulusBus"], _xfbe8z);  
  $def("_12d6o8", "viewof calSource", ["Inputs"], _12d6o8);  
  $def("_1dh1pen", "calSource", ["Generators","viewof calSource"], _1dh1pen);  
  $def("_1i4d397", "calStream", ["calRunning","calSource","CAL_FRAME","invalidation"], _1i4d397);  
  $def("_1itgjy2", "calVideo", ["htl","calStream","invalidation"], _1itgjy2);  
  $def("_uxbtt2", "calRun", ["calRunning","CAL_FRAME","calRows","calMode","stimulusBus","calSource","calVideo","stimulusView","runPipeline","fuseLandmarks"], _uxbtt2);  
  $def("_9ey4fu", "fitHomography", [], _9ey4fu);  
  $def("_nnfn1b", "calHomography", ["calRun","stimulusBus","fitHomography"], _nnfn1b);  
  $def("_1gnnqz3", "calStats", ["calRun","md","stimulusBus","calHomography","htl"], _1gnnqz3);  
  $def("_1gmmbqf", "edges1Dsub", [], _1gmmbqf);  
  $def("_vui5kg", "CAL_FRAME", ["FRAME"], _vui5kg);  
  $def("_4iv3z6", "calRows", ["rowStride","CAL_FRAME","FRAME"], _4iv3z6);
  return main;
}
