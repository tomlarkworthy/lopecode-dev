# Pending cells for @tomlarkworthy/coded-landmark-tracking (define when page wakes)

## 1. fusedTable (display, after fusedLandmarks)

```
fusedTable = Inputs.table(
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
)
```

## 2. fusedLayer (overlay on sceneView, like detectionLayer)

```
fusedLayer = {
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
}
```

## 3. §6 md — metrics narrative

```
md`## 6. Scoring against ground truth

The simulator knows exactly where every mark is and what id it carries, so the whole
pipeline can be scored end-to-end. Two levels:

- **Per row** (\`frameScore\`): every surviving row hit is matched to the nearest
  ground-truth mark in normalized ellipse distance; a hit inside the ellipse
  (distance ≤ 1) whose decoded id equals the mark's id counts as correct.
- **Per landmark** (\`fusionScore\`): each fused cluster is matched the same way on
  its centre estimate.

Occlusion bounds recall: the scene deliberately overlaps marks, and a mark that is
partially behind another loses its edge structure on exactly the rows that cross the
occluder — no amount of per-row cleverness reads a mark that is not visible. The
detector's job is to read every *visible* mark and to say nothing about the rest;
false positives are the failure mode that matters, because a robot that trusts a
phantom landmark navigates with a corrupted map.

Decode cost does not grow with the codebook. The correlation decode is
Σ softᵢ·(2wᵢ−1) per codeword — 16 multiply-adds over 8 bits — and everything before
it (windowing, alignment, photometric sampling) is codebook-blind. Doubling the
payload to 16 bits would double the sample count per row, not the search space:
this is the practical difference between *labelled* landmarks and template-matched
ones, where each new template multiplies detection cost.`
```

## 4. fusionScore

```
fusionScore = {
  const gt = groundTruth.filter((b) => b.onScreen);
  const claimed = new Set();
  let idCorrect = 0, wrong = 0, fp = 0;
  const rows = fusedLandmarks.map((f) => {
    let best = null, bd = Infinity;
    for (const b of gt) {
      const r = Math.hypot((f.xc - b.cx) / b.xExtent, (f.yc - b.cy) / b.yExtent);
      if (r < bd) { bd = r; best = b; }
    }
    const ok = best && bd <= 1;
    if (!ok) fp++;
    else if (f.id === best.trueId) { idCorrect++; claimed.add(best.id); }
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
}
```

## 5. §1 md update (reserved ids)

Find the §1 codebook md cell; add after the codebook table paragraph:

> Two codewords are reserved as invalid: id 0 (payload all black) and id 15
> (payload all white). A window that lands on featureless paint reads a constant
> stripe pattern, and a constant reads as a *perfect* codeword — margin alone
> cannot reject it. Declaring the two constant words non-ids turns the most
> dangerous false positive into a structural impossibility, at the cost of two
> of the sixteen labels. 14 usable ids remain.

## 6. Cleanup before final export

- delete `_seed` cell if present
- re-export, strip cc=LOPE tokens (incl. &amp;cc= HTML-escaped form)
