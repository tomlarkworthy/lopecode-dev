// Dense multi-direction labelling: turn the detector into a measuring instrument.
//
// A row scan measures ONE coordinate well. clusterManRows returns xc as the median of the
// per-row involution feet -- observed on every row that locks -- and yc from a V-fit that
// extrapolates |d| -> 0, which no row ever observes. §4.3 measured the gap at 23px against
// 64px. mergeManAxes exists to paper over that with a second pass and a "which do we trust"
// guard.
//
// Scan the frame in K directions and there is nothing to arbitrate. Each direction contributes
// only its MEASURED coordinate, which is the line { p : p·u = c } in the original image. K
// directions give K lines through one centre; least squares intersects them. The extrapolated
// coordinate is never used at all.
//
// Modes:
//   --synth     score against renderHexScene's exact projected centres (the only truth we own)
//   --archive   relabel data/hexcases and write a diff report; nothing is overwritten here
import { chromium } from "playwright";
import { resolve } from "node:path";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";

const NB = resolve("lopebooks/notebooks/tomlarkworthy_coded-landmark-tracking.html");
const MODE = process.argv.includes("--sweep") ? "sweep" : process.argv.includes("--archive") ? "archive" : "synth";
const CASES = process.argv.find((a) => a.startsWith("--cases="))?.split("=")[1]?.split(",") ?? null;
const STRIDE = Number(process.argv.find((a) => a.startsWith("--stride="))?.split("=")[1] ?? 1);
const NDIR = Number(process.argv.find((a) => a.startsWith("--dirs="))?.split("=")[1] ?? 6);
const LIMIT = Number(process.argv.find((a) => a.startsWith("--limit="))?.split("=")[1] ?? 0);
const OUT = process.argv.find((a) => a.startsWith("--out="))?.split("=")[1] ?? null;

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
page.setDefaultTimeout(0);
page.on("pageerror", (e) => console.error("PAGE ERROR:", e.message));
page.on("console", (m) => { if (m.type() === "error") console.error("console:", m.text()); });
await page.addInitScript(() => {
  const orig = (window as any).Runtime; let cap = false;
  Object.defineProperty(window, "Runtime", { get() { return orig; },
    set(N: any) { const W = function (this: any, ...a: any[]) { const i = new N(...a); if (!cap) { (window as any).__ojs_runtime = i; cap = true; } return i; }; W.prototype = N.prototype; Object.assign(W, N); return W; } });
});
await page.goto(`file://${NB}`, { waitUntil: "networkidle", timeout: 180000 });
await page.waitForFunction(() => !!(window as any).__ojs_runtime, { timeout: 180000 });
await page.waitForTimeout(9000);

// ---- the labeller, installed once in the page ------------------------------
await page.evaluate(async () => {
  const rt = (window as any).__ojs_runtime;
  const vars = [...rt._variables];
  const val = async (n: string) => { const v = vars.find((z: any) => z._name === n); return v ? await v._module.value(n) : null; };
  const W: any = window as any;
  W.__cells = {
    analyzeFrameMan: await val("analyzeFrameMan"),
    manScanRows: await val("manScanRows"),
    scanRowsMan: await val("scanRowsMan"),
    clusterManRows: await val("clusterManRows"),
    manLayout: await val("manLayout"),
    fitHexPose: await val("fitHexPose"),
    hexTarget: await val("hexTarget"),
    renderHexScene: await val("renderHexScene"),
  };

  // Resample the frame so that direction u becomes the scan direction. Bilinear, clamped at
  // the border so the padding carries no edges of its own. Returns the frame plus the one
  // scalar the fusion needs: the offset that turns a rotated x back into p·u.
  W.__rotAngle = (frame: any, deg: number) => {
    const th = (deg * Math.PI) / 180, c = Math.cos(th), s = Math.sin(th);
    const ux = c, uy = s, vx = -s, vy = c;
    const { gray, w, h } = frame;
    const corners = [[0, 0], [w - 1, 0], [0, h - 1], [w - 1, h - 1]];
    let X0 = Infinity, X1 = -Infinity, Y0 = Infinity, Y1 = -Infinity;
    for (const [x, y] of corners) {
      const X = x * ux + y * uy, Y = x * vx + y * vy;
      if (X < X0) X0 = X; if (X > X1) X1 = X;
      if (Y < Y0) Y0 = Y; if (Y > Y1) Y1 = Y;
    }
    const nw = Math.ceil(X1 - X0) + 1, nh = Math.ceil(Y1 - Y0) + 1;
    const out = new Uint8Array(nw * nh);
    for (let Y = 0; Y < nh; Y++) {
      const Yy = Y + Y0;
      for (let X = 0; X < nw; X++) {
        const Xx = X + X0;
        // p = O + X u + Y v, with u,v orthonormal
        let px = Xx * ux + Yy * vx, py = Xx * uy + Yy * vy;
        if (px < 0) px = 0; else if (px > w - 1) px = w - 1;
        if (py < 0) py = 0; else if (py > h - 1) py = h - 1;
        const x0 = px | 0, y0 = py | 0;
        const x1 = x0 + 1 < w ? x0 + 1 : x0, y1 = y0 + 1 < h ? y0 + 1 : y0;
        const fx = px - x0, fy = py - y0;
        const a = gray[y0 * w + x0], b = gray[y0 * w + x1];
        const cc = gray[y1 * w + x0], d = gray[y1 * w + x1];
        out[Y * nw + X] = (a + (b - a) * fx + ((cc + (d - cc) * fx) - (a + (b - a) * fx)) * fy + 0.5) | 0;
      }
    }
    // a mark centre at rotated x = xc satisfies p·u = xc + X0
    return { gray: out, w: nw, h: nh, ux, uy, off: X0, deg };
  };

  // Weighted-least-squares intersection of the per-direction lines, then two Huber passes so
  // one bad direction cannot drag the centre.
  W.__intersect = (lines: any[]) => {
    const solve = (wts: number[]) => {
      let a11 = 0, a12 = 0, a22 = 0, b1 = 0, b2 = 0;
      lines.forEach((L, i) => {
        const wI = wts[i];
        a11 += wI * L.ux * L.ux; a12 += wI * L.ux * L.uy; a22 += wI * L.uy * L.uy;
        b1 += wI * L.c * L.ux; b2 += wI * L.c * L.uy;
      });
      const det = a11 * a22 - a12 * a12;
      if (Math.abs(det) < 1e-9) return null;
      return { x: (b1 * a22 - b2 * a12) / det, y: (a11 * b2 - a12 * b1) / det, det };
    };
    let wts = lines.map((L) => L.w ?? 1);
    let p = solve(wts);
    if (!p) return null;
    for (let it = 0; it < 2; it++) {
      const res = lines.map((L) => Math.abs(p!.x * L.ux + p!.y * L.uy - L.c));
      const srt = res.slice().sort((x, y) => x - y);
      const mad = Math.max(0.5, srt[srt.length >> 1]);
      wts = lines.map((L, i) => {
        const r = res[i] / (1.5 * mad);
        return (L.w ?? 1) * (r <= 1 ? 1 : 1 / r);
      });
      const q = solve(wts);
      if (!q) break;
      p = q;
    }
    const res = lines.map((L) => p!.x * L.ux + p!.y * L.uy - L.c);
    const rms = Math.sqrt(res.reduce((s, r) => s + r * r, 0) / res.length);
    return { x: p.x, y: p.y, rms, n: lines.length };
  };

  // One frame -> one label per id, from K directions at the given stride.
  W.__denseLabel = (frame: any, opts: any = {}) => {
    const C = W.__cells;
    const nDir = opts.nDir ?? 6;
    const angles = Array.from({ length: nDir }, (_, i) => (i * 180) / nDir);
    const t0 = performance.now();
    const byId = new Map();
    const perDir: any[] = [];
    for (const deg of angles) {
      const R = deg === 0 ? { ...frame, ux: 1, uy: 0, off: 0, deg: 0 } : W.__rotAngle(frame, deg);
      const scanOpts = { ...opts.detector, stride: opts.stride ?? 1, bothAxes: false };
      const ys = C.manScanRows(R, scanOpts);
      const res = C.clusterManRows(C.scanRowsMan(R, ys, scanOpts), scanOpts);
      perDir.push({ deg, read: res.fused.map((f: any) => f.id) });
      for (const f of res.fused) {
        if (f.id == null) continue;
        if (!byId.has(f.id)) byId.set(f.id, []);
        byId.get(f.id).push({
          ux: R.ux, uy: R.uy, c: f.xc + R.off, w: f.rows, a: f.a, deg, rows: f.rows
        });
      }
    }
    const marks: any[] = [];
    for (const [id, lines] of byId) {
      // one direction is a line, not a point: two is the minimum, three before it is a measurement
      const dirs = new Set(lines.map((l: any) => l.deg)).size;
      const p = dirs >= 2 ? W.__intersect(lines) : null;
      const as = lines.map((l: any) => l.a).filter((x: any) => x != null).sort((x: number, y: number) => x - y);
      marks.push({
        id, dirs, x: p ? +p.x.toFixed(2) : null, y: p ? +p.y.toFixed(2) : null,
        rms: p ? +p.rms.toFixed(2) : null,
        radiusPx: as.length ? +as[as.length >> 1].toFixed(1) : null,
        rowsTotal: lines.reduce((s: number, l: any) => s + l.rows, 0)
      });
    }
    return { marks: marks.sort((a, b) => a.id - b.id), perDir, ms: Math.round(performance.now() - t0) };
  };
});

const pct = (a: number[], q: number) => { if (!a.length) return NaN; const s = a.slice().sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.round(q * (s.length - 1)))]; };
const fmt = (a: number[]) => a.length ? `n=${a.length} p50=${pct(a, 0.5).toFixed(2)} p90=${pct(a, 0.9).toFixed(2)} max=${Math.max(...a).toFixed(2)}` : "n=0";

if (MODE === "synth") {
  // Scenes chosen to span what the archive actually contains: near/far, tipped, rolled.
  const SCENES = [
    { yawDeg: 0, tiltDeg: 0, rollDeg: 0, fill: 0.8, seed: 1 },
    { yawDeg: 20, tiltDeg: 12, rollDeg: 0, fill: 0.8, seed: 2 },
    { yawDeg: -30, tiltDeg: 20, rollDeg: 15, fill: 0.7, seed: 3 },
    { yawDeg: 35, tiltDeg: -25, rollDeg: -20, fill: 0.6, seed: 4 },
    { yawDeg: 0, tiltDeg: 0, rollDeg: 30, fill: 0.5, seed: 5 },
    { yawDeg: 15, tiltDeg: 30, rollDeg: 45, fill: 0.9, seed: 6 },
  ].slice(0, LIMIT || undefined);

  const rows = await page.evaluate(async ({ scenes, stride, nDir }) => {
    const W: any = window as any, C = W.__cells;
    const out: any[] = [];
    for (const s of scenes) {
      const scene = C.renderHexScene({ ...s, W: 960, H: 720 });
      const frame = { gray: scene.gray, w: scene.w, h: scene.h };
      const truth = new Map(scene.truth.map((t: any) => [t.id, t]));

      const one = C.analyzeFrameMan(frame, { stride: 4, bothAxes: false });
      const both = C.analyzeFrameMan(frame, { stride: 4, bothAxes: true });
      const dense = W.__denseLabel(frame, { stride, nDir });

      const err = (list: any[], gx: string, gy: string) => list
        .filter((f: any) => f.id != null && truth.has(f.id))
        .map((f: any) => Math.hypot(f[gx] - (truth.get(f.id) as any).x, f[gy] - (truth.get(f.id) as any).y));

      out.push({
        scene: s, dPx: Math.round(scene.dPx),
        one: { err: err(one.fused, "xc", "yc"), n: one.fused.length, ms: Math.round(one.ms) },
        both: { err: err(both.fused, "xc", "yc"), n: both.fused.length, ms: Math.round(both.ms) },
        dense: { err: err(dense.marks.filter((m: any) => m.x != null), "x", "y"), n: dense.marks.filter((m: any) => m.x != null).length, ms: dense.ms, rms: dense.marks.map((m: any) => m.rms), dirs: dense.marks.map((m: any) => m.dirs) },
      });
    }
    return out;
  }, { scenes: SCENES, stride: STRIDE, nDir: NDIR });

  const acc: any = { one: [], both: [], dense: [] };
  for (const r of rows) {
    console.log(`\nscene yaw=${r.scene.yawDeg} tilt=${r.scene.tiltDeg} roll=${r.scene.rollDeg} fill=${r.scene.fill}  mark=${r.dPx}px`);
    for (const k of ["one", "both", "dense"] as const) {
      acc[k].push(...r[k].err);
      console.log(`  ${k.padEnd(5)} marks=${r[k].n}/7  ${fmt(r[k].err)}  ${r[k].ms}ms`);
    }
    console.log(`  dense dirs per mark: ${r.dense.dirs.join(",")}  line rms: ${r.dense.rms.map((x: number) => x == null ? "-" : x.toFixed(1)).join(",")}`);
  }
  console.log(`\n=== over all scenes (px error against exact projected centres), stride=${STRIDE} dirs=${NDIR} ===`);
  for (const k of ["one", "both", "dense"] as const) console.log(`  ${k.padEnd(5)} ${fmt(acc[k])}`);
}

if (MODE === "sweep") {
  // One edge threshold cannot serve every mark size. Clutter scales with the imaged mark, so a
  // threshold tuned for a 30px mark drowns an 80px one -- and the frames the labeller could not
  // measure are overwhelmingly the phone captures, where the marks are 80px across. The
  // labeller is a measuring instrument, not the shipping detector, so it is free to pick the
  // threshold per frame: more marks measured, and the seven-point plane says whether they agree.
  const DIR = resolve("data/hexcases");
  let names = CASES ?? readdirSync(DIR).filter((f) => f.endsWith(".gray")).map((f) => f.slice(0, -5)).sort();
  if (LIMIT) names = names.slice(0, LIMIT);
  const THRS = [8, 12, 16, 20, 24, 30, 36];
  const out: any[] = [];
  for (const n of names) {
    const meta = JSON.parse(readFileSync(resolve(DIR, n + ".json"), "utf8"));
    const gray = readFileSync(resolve(DIR, n + ".gray"));
    if (gray.length !== meta.w * meta.h) continue;
    const r = await page.evaluate(async ({ b64, w, h, stride, nDir, thrs }) => {
      const W: any = window as any, C = W.__cells;
      const bin = atob(b64);
      const g = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) g[i] = bin.charCodeAt(i);
      const frame = { gray: g, w, h };
      const T = C.hexTarget;
      const tries: any[] = [];
      for (const thr of thrs) {
        const d = W.__denseLabel(frame, { stride, nDir, detector: { edgeThreshold: thr } });
        const good = d.marks.filter((m: any) => m.x != null && m.dirs >= 3 && T.byId.has(m.id));
        const pose = good.length >= 4
          ? C.fitHexPose({ fused: good.map((m: any) => ({ id: m.id, xc: m.x, yc: m.y, posed: true })), unidentified: [] })
          : null;
        tries.push({
          thr, n: good.length,
          planeRms: pose && pose.fit ? +pose.fit.rmsResidual.toFixed(2) : null,
          pairs: pose && pose.fit ? pose.fit.pairs : 0,
          marks: good, ms: d.ms,
        });
      }
      return tries;
    }, { b64: gray.toString("base64"), w: meta.w, h: meta.h, stride: STRIDE, nDir: NDIR, thrs: THRS });
    // most marks wins; a tie goes to the tighter plane, since that is the only evidence that
    // the extra mark is real rather than clutter that happened to vote an id
    const best = r.slice().sort((a: any, b: any) => b.n - a.n || (a.planeRms ?? 9) - (b.planeRms ?? 9))[0];
    out.push({ name: n, w: meta.w, h: meta.h, best, tries: r.map((t: any) => ({ thr: t.thr, n: t.n, planeRms: t.planeRms })) });
    console.log(`${n.padEnd(22)} ${r.map((t: any) => `${t.thr}:${t.n}${t.planeRms != null ? `/${t.planeRms}` : ""}`).join("  ")}   -> thr=${best.thr} n=${best.n}`);
  }
  if (OUT) { writeFileSync(OUT, JSON.stringify(out, null, 1)); console.log(`wrote ${OUT}`); }
}

if (MODE === "archive") {
  // A mark is MEASURED only with agreement from three directions -- two lines always meet
  // somewhere, so two directions cannot disagree and thus cannot be checked. Marks that fail
  // the gate fall back to the plane's prediction, and marks with neither stay as they were.
  const MIN_DIRS = 3, MAX_RMS = 2.0;
  const DIR = resolve("data/hexcases");
  let names = readdirSync(DIR).filter((f) => f.endsWith(".gray")).map((f) => f.slice(0, -5)).sort();
  if (LIMIT) names = names.slice(0, LIMIT);
  const results: any[] = [];
  for (const n of names) {
    const meta = JSON.parse(readFileSync(resolve(DIR, n + ".json"), "utf8"));
    const gray = readFileSync(resolve(DIR, n + ".gray"));
    if (gray.length !== meta.w * meta.h) { console.log(`${n}: size mismatch, skipped`); continue; }
    const r = await page.evaluate(async ({ b64, w, h, stride, nDir, minDirs, maxRms }) => {
      const W: any = window as any, C = W.__cells;
      const bin = atob(b64);
      const g = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) g[i] = bin.charCodeAt(i);
      const dense = W.__denseLabel({ gray: g, w, h }, { stride, nDir });
      const good = dense.marks.filter((m: any) => m.x != null && m.dirs >= minDirs && m.rms <= maxRms);
      // The plane is the independent check: seven coplanar marks, so a centre that is wrong
      // shows up as a residual against the other six rather than having to be believed.
      const pose = C.fitHexPose({ fused: good.map((m: any) => ({ id: m.id, xc: m.x, yc: m.y, posed: true })), unidentified: [] });
      const T = C.hexTarget;
      const predicted: any = {};
      if (pose && pose.fit) for (const [id, m] of T.byId) {
        const p = pose.fit.map(m.xMm, m.yMm);
        predicted[id] = { x: +p[0].toFixed(2), y: +p[1].toFixed(2) };
      }
      return {
        dense, good: good.map((m: any) => m.id), predicted,
        targetIds: [...T.byId.keys()],
        fitRms: pose && pose.fit ? +pose.fit.rmsResidual.toFixed(2) : null,
        fitPairs: pose && pose.fit ? pose.fit.pairs : 0,
        offTarget: dense.marks.filter((m: any) => m.x != null && !T.byId.has(m.id)).map((m: any) => m.id),
      };
    }, { b64: gray.toString("base64"), w: meta.w, h: meta.h, stride: STRIDE, nDir: NDIR, minDirs: MIN_DIRS, maxRms: MAX_RMS });

    const byId = new Map(r.dense.marks.map((m: any) => [m.id, m]));
    const goodSet = new Set(r.good);
    // Candidates only. Nothing is decided here: a plane PREDICTION was tried and the pixels
    // rejected it every time (label-darkness.ts), because a 3-4 point fit is exactly
    // determined and one bad centre throws the rest hundreds of px. Only a direct measurement
    // is offered, and label-darkness.ts decides whether the image agrees with it.
    const truth: any[] = [];
    const quality: any[] = [];
    for (const t of meta.truth ?? []) {
      const m: any = byId.get(t.id);
      const has = goodSet.has(t.id);
      const x = has ? m.x : t.x, y = has ? m.y : t.y;
      truth.push({ id: t.id, x: +x.toFixed(1), y: +y.toFixed(1), radiusPx: +Number(has && m.radiusPx != null ? m.radiusPx : t.radiusPx).toFixed(1), state: t.state });
      quality.push({
        id: t.id, src: has ? "measured" : "kept",
        dirs: m ? m.dirs : 0, rms: m ? m.rms : null,
        predX: r.predicted[t.id] ? r.predicted[t.id].x : null,
        predY: r.predicted[t.id] ? r.predicted[t.id].y : null,
        moved: +Math.hypot(x - t.x, y - t.y).toFixed(1)
      });
    }
    results.push({ name: n, w: meta.w, h: meta.h, fitRms: r.fitRms, fitPairs: r.fitPairs, offTarget: r.offTarget, truth, quality, ms: r.dense.ms });
    const moves = quality.filter((q) => q.src !== "kept").map((q) => q.moved);
    console.log(`${n.padEnd(24)} measured=${r.good.length} fit=${r.fitPairs}pts rms=${r.fitRms ?? "-"}  moved p50=${moves.length ? pct(moves, 0.5).toFixed(1) : "-"} max=${moves.length ? Math.max(...moves).toFixed(1) : "-"}px${r.offTarget.length ? `  offTarget=[${r.offTarget}]` : ""}  ${r.dense.ms}ms`);
  }
  const allMoves = results.flatMap((r) => r.quality.filter((q: any) => q.src !== "kept").map((q: any) => q.moved));
  const fits = results.map((r) => r.fitRms).filter((x) => x != null);
  console.log(`\n=== ${results.length} cases ===`);
  console.log(`  label movement  ${fmt(allMoves)}`);
  console.log(`  plane fit rms   ${fmt(fits)}`);
  console.log(`  labels >5px out ${allMoves.filter((d) => d > 5).length} / ${allMoves.length}`);
  console.log(`  sources         ${["measured", "predicted", "kept"].map((s) => `${s}=${results.flatMap((r) => r.quality).filter((q: any) => q.src === s).length}`).join(" ")}`);
  if (OUT) { writeFileSync(OUT, JSON.stringify(results, null, 1)); console.log(`wrote ${OUT}`); }
}

await browser.close();
