// Build a golden label set: every mark of every case gets a position, from measurement where
// there is one and from the plane the measurements determine where there is not.
//
// The captured labels are not consulted at all -- not as a starting point, not as a fallback.
// They came from a single-axis stride-4 run and a plane fitted to it, and are the thing being
// replaced. Position, radius and visibility here are derived only from:
//
//   1. the dense multi-direction measurement (scratch/rmbt/sweep-all.json, per-frame threshold),
//   2. the homography those measurements determine, which also supplies apparent radius,
//   3. the pixel contrast of the mark's own printed design, as an accept/flag test.
//
// `state` is the one field carried over: read/located/missing/misplaced describe what the
// detector ACHIEVED at capture, not where the mark is, so they are not ours to recompute.
//
//   bun scratch/rmbt/golden-labels.ts [--sweep f] [--out f] [--min-score 22]
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from "node:fs";
import { resolve } from "node:path";
import { importNotebookModule } from "../../tools/notebook-import.ts";

(globalThis as any).window = {
  performance,
  lopecode: { contentSync: () => ({ status: 404, mime: "application/octet-stream", bytes: new Uint8Array(0) }) },
};
const { Runtime } = await import("../../tools/node_modules/@observablehq/runtime/src/index.js");
if (!(Runtime as any).prototype.fileAttachments) (Runtime as any).prototype.fileAttachments = () => () => ({});
const nbm = await importNotebookModule("modules/@tomlarkworthy/coded-landmark-tracking.js");
const fitHomography: any = await nbm.value("fitHomography");
const hexTarget: any = await nbm.value("hexTarget");

const argOf = (f: string, d: string) => process.argv.find((a) => a.startsWith(`--${f}=`))?.split("=")[1] ?? d;
const SWEEP = resolve(argOf("sweep", "scratch/rmbt/sweep-all.json"));
const OUT = resolve(argOf("out", "scratch/rmbt/golden.json"));
const MIN_SCORE = Number(argOf("min-score", "22"));
const DIR = resolve("data/hexcases");
const WRITE = process.argv.includes("--write");
const SNAP = resolve("scratch/rmbt/hexcases-prev-relabel");

const sample = (g: Buffer, w: number, h: number, cx: number, cy: number, r0: number, r1: number) => {
  let s = 0, n = 0;
  const R = Math.ceil(r1);
  for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
    const d = Math.hypot(dx, dy);
    if (d < r0 || d > r1) continue;
    const x = Math.round(cx + dx), y = Math.round(cy + dy);
    if (x < 0 || y < 0 || x >= w || y >= h) continue;
    s += g[y * w + x]; n++;
  }
  return n ? s / n : null;
};
const contrast = (g: Buffer, w: number, h: number, x: number, y: number, R: number) => {
  if (!(R > 4)) return null;
  const core = sample(g, w, h, x, y, 0, Math.max(1.5, 0.12 * R));
  const collar = sample(g, w, h, x, y, 0.25 * R, 0.32 * R);
  return core == null || collar == null ? null : +(collar - core).toFixed(1);
};

// The plane, by exhaustive RANSAC over 4-subsets.
//
// Iteratively dropping the worst point is not enough: a mark that decodes to the WRONG id sits
// perfectly on its own ink but hundreds of px from where that id belongs, and with 7 points it
// drags the least-squares fit far enough that the innocent marks look as bad as the guilty one.
// There are only C(7,4)=35 subsets, so every one can be tried and the largest consistent set
// kept. Marks the plane rejects are reported rather than written -- a measurement that lands on
// a mark but under an id the geometry refuses is a decode failure, and the plane's prediction
// for that id is the better label.
const TOL = 4;
const pairsOf = (marks: any[]) => marks.filter((m) => hexTarget.byId.has(m.id)).map((m) => {
  const mk = hexTarget.byId.get(m.id);
  return { sx: mk.xMm, sy: mk.yMm, dx: m.x, dy: m.y, id: m.id };
});
const fitPlane = (marks: any[]) => {
  const pairs = pairsOf(marks);
  if (pairs.length < 4) return null;
  const resid = (fit: any, p: any) => { const [x, y] = fit.map(p.sx, p.sy); return Math.hypot(x - p.dx, y - p.dy); };
  let best: any = null;
  const idx = pairs.map((_, i) => i);
  const combos: number[][] = [];
  for (let a = 0; a < idx.length; a++) for (let b = a + 1; b < idx.length; b++)
    for (let c = b + 1; c < idx.length; c++) for (let d = c + 1; d < idx.length; d++) combos.push([a, b, c, d]);
  for (const cb of combos) {
    const fit = fitHomography(cb.map((i) => pairs[i]));
    if (!fit) continue;
    const inl = pairs.filter((p) => resid(fit, p) < TOL);
    if (inl.length < 4) continue;
    const ref = fitHomography(inl);
    if (!ref) continue;
    const rms = Math.sqrt(inl.reduce((s, p) => s + resid(ref, p) ** 2, 0) / inl.length);
    if (!best || inl.length > best.inl.length || (inl.length === best.inl.length && rms < best.rms))
      best = { fit: ref, inl, rms };
  }
  // FOUR POINTS ALWAYS FIT A HOMOGRAPHY EXACTLY, so a 4-inlier consensus at rms 0 is not
  // evidence of anything -- on hexcase-6j35-21 it locked onto a self-consistent but wrong id
  // assignment and threw out the three marks that were right. Five inliers is the first count
  // that can be contradicted, and nothing below it may overrule a measurement.
  if (!best || best.inl.length < 5) return null;
  const keep = new Set(best.inl.map((p: any) => p.id));
  return {
    fit: best.fit, used: [...keep], rms: +best.rms.toFixed(2),
    rejected: pairs.filter((p) => !keep.has(p.id)).map((p) => p.id),
  };
};

const sweep = JSON.parse(readFileSync(SWEEP, "utf8"));
const out: any[] = [];
for (const s of sweep) {
  const metaPath = resolve(DIR, s.name + ".json");
  if (!existsSync(metaPath)) continue;
  const meta = JSON.parse(readFileSync(metaPath, "utf8"));
  const gray = readFileSync(resolve(DIR, s.name + ".gray"));
  const measured = new Map((s.best.marks ?? []).map((m: any) => [m.id, m]));
  const plane = fitPlane(s.best.marks ?? []);
  const capState = new Map((meta.truth ?? []).map((t: any) => [t.id, t.state]));

  const truth: any[] = [];
  const quality: any[] = [];
  // How far apart the marks sit in THIS image, so "wrong place" can be judged in units of the
  // thing itself rather than in a fixed pixel count that only ever suits one working distance.
  const pts = (s.best.marks ?? []).map((m: any) => [m.x, m.y]);
  const nn = pts.map(([x, y]: any) => Math.min(...pts.filter((p: any) => p[0] !== x || p[1] !== y)
    .map((p: any) => Math.hypot(p[0] - x, p[1] - y))));
  const pitchPx = nn.length ? nn.slice().sort((a: number, b: number) => a - b)[nn.length >> 1] : 0;

  for (const [id, mk] of hexTarget.byId) {
    const m: any = measured.get(id);
    // The plane may FLAG a measurement but it may not quietly replace one. On a hand-held sheet
    // at a grazing angle the target is not planar to 4px, and a fit that rejects a mark the
    // pixels endorse is the model being wrong, not the measurement (hexcase-6j35-20: 51 and 56
    // rejected, both predicted visibly off the ink they were measured on).
    //
    // The two failures separate by MAGNITUDE. Paper curl moves a mark a few px; a mark decoded
    // under the wrong id sits a whole pitch away. So only a residual on the order of the mark
    // spacing is evidence of a misread, and only that overrules a measurement.
    //
    // The other way a measurement loses: the pixels do not endorse it either. A dark core
    // inside a light collar is what a mark IS, so a measurement without one is on clutter, and
    // when the plane also puts it out of place both kinds of evidence agree (hexcase-6ib0-14:
    // ids 51 and 56 score 4.4 and -9.2 at 52px and 40px out).
    const resid0 = plane && m ? (() => { const p = plane.fit.map(mk.xMm, mk.yMm); return Math.hypot(p[0] - m.x, p[1] - m.y); })() : null;
    const mScore = m ? contrast(gray, meta.w, meta.h, m.x, m.y, m.radiusPx) : null;
    const rejected = !!plane && !!m && resid0 != null &&
      (resid0 > Math.max(25, 0.35 * pitchPx) || (resid0 > 3 && (mScore == null || mScore < MIN_SCORE)));
    let x: number | null = null, y: number | null = null, radiusPx: number | null = null, src = "none";
    if (m && !rejected) { x = m.x; y = m.y; radiusPx = m.radiusPx; src = "measured"; }
    else if (plane) {
      const p = plane.fit.map(mk.xMm, mk.yMm);
      x = +p[0].toFixed(1); y = +p[1].toFixed(1); src = rejected ? "predicted-rejected" : "predicted";
    }
    if (x == null) continue;
    if (radiusPx == null && plane) {
      // apparent radius off the same homography: project the rim and halve the chord
      const a = plane.fit.map(mk.xMm - hexTarget.radiusMm, mk.yMm);
      const b = plane.fit.map(mk.xMm + hexTarget.radiusMm, mk.yMm);
      radiusPx = +(Math.hypot(b[0] - a[0], b[1] - a[1]) / 2).toFixed(1);
    }
    const inFrame = x >= 0 && y >= 0 && x < meta.w && y < meta.h;
    const score = inFrame ? contrast(gray, meta.w, meta.h, x, y, radiusPx ?? 0) : null;
    // residual against the plane: for a measured mark this is independent evidence, since the
    // plane is determined by the OTHER marks as much as by this one
    let planeResid: number | null = null;
    if (plane) { const p = plane.fit.map(mk.xMm, mk.yMm); planeResid = +Math.hypot(p[0] - x, p[1] - y).toFixed(2); }
    truth.push({ id, x: +x.toFixed(1), y: +y.toFixed(1), radiusPx, state: capState.get(id) ?? "missing" });
    quality.push({
      id, src, dirs: m?.dirs ?? 0, lineRms: m?.rms ?? null,
      planeResid, score, inFrame,
      ok: score != null && score >= MIN_SCORE,
    });
  }
  const flagged = quality.filter((q) => q.inFrame && !q.ok);
  out.push({
    name: s.name, w: meta.w, h: meta.h, thr: s.best.thr, planeTrusted: !!plane,
    measured: (s.best.marks ?? []).length,
    planeRms: plane ? plane.rms : null, planeUsed: plane ? plane.used : [],
    planeRejected: plane ? plane.rejected ?? [] : [], truth, quality,
    needsEyes: flagged.length > 0 || !plane || plane.rms > 2,
  });
}

writeFileSync(OUT, JSON.stringify(out, null, 1));
const all = out.flatMap((c) => c.quality);
const P = (a: number[], p: number) => a.slice().sort((x, y) => x - y)[Math.min(a.length - 1, Math.round(p * (a.length - 1)))];
console.log(`=== golden set: ${out.length} cases, ${all.length} labels ===`);
console.log(`  measured        ${all.filter((q) => q.src === "measured").length}`);
console.log(`  predicted       ${all.filter((q) => q.src === "predicted").length}`);
console.log(`  plane-rejected  ${all.filter((q) => q.src === "predicted-rejected").length}   (measured somewhere the geometry refuses -- a decode failure)`);
console.log(`  out of frame    ${all.filter((q) => !q.inFrame).length}`);
console.log(`  no trusted plane ${out.filter((c) => !c.planeTrusted).length} cases (fewer than 5 marks agree on one plane; measurements kept, nothing predicted, nothing rejected)`);
const sc = all.filter((q) => q.score != null).map((q) => q.score);
console.log(`  contrast score  p05=${P(sc, 0.05).toFixed(0)} p50=${P(sc, 0.5).toFixed(0)} (in-frame labels)`);
console.log(`  below ${MIN_SCORE}        ${all.filter((q) => q.inFrame && !q.ok).length}`);
const pr = all.filter((q) => q.planeResid != null).map((q) => q.planeResid);
console.log(`  plane residual  p50=${P(pr, 0.5).toFixed(2)} p90=${P(pr, 0.9).toFixed(2)} max=${Math.max(...pr).toFixed(1)}`);
console.log(`\n  cases needing eyes: ${out.filter((c) => c.needsEyes).length}`);
console.log("    " + out.filter((c) => c.needsEyes).map((c) => `${c.name}(${c.quality.filter((q: any) => q.inFrame && !q.ok).length}f,rms=${c.planeRms})`).join("  "));
console.log(`\nwrote ${OUT}`);

if (WRITE) {
  // Write-once snapshot of whatever is on disk now, so a re-run cannot overwrite the only copy
  // of the previous state with its own output (which is exactly how the capture labels were lost).
  if (!existsSync(SNAP)) mkdirSync(SNAP, { recursive: true });
  let n = 0;
  for (const c of out) {
    const src = resolve(DIR, c.name + ".json");
    const snap = resolve(SNAP, c.name + ".json");
    if (!existsSync(snap)) copyFileSync(src, snap);
    const meta = JSON.parse(readFileSync(src, "utf8"));
    const { labelQuality, relabelled, planeRms, looPx, labelledBy, ...keep } = meta;
    writeFileSync(src, JSON.stringify({
      ...keep,
      truth: c.truth,
      labelQuality: c.quality,
      golden: true,
      goldenThr: c.thr,
      planeTrusted: c.planeTrusted,
      planeRms: c.planeRms,
      labelledBy: "dense-label: 12 directions, stride 1, per-frame edge threshold; plane by RANSAC; pixel contrast veto",
    }, null, 1));
    n++;
  }
  console.log(`\nwrote ${n} case files; previous state snapshotted to ${SNAP}`);
}
