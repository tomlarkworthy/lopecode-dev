// Sub-pixel mark centres by fitting the RING LATTICE, not by intersecting per-direction lines.
//
// dense-label.ts uses one number per direction: clusterManRows' xc, the median involution foot.
// Everything else the scan measured -- every edge crossing, at a radius the barcode itself names --
// is thrown away. This fits the whole set instead.
//
// The model, per mark. A scanline crossing the mark cuts each ring boundary at two points; the
// involution pairs them and solveMan assigns each pair a tooth t, so each crossing is a point known
// to lie at radius teeth[t] in the MARK PLANE. Under the homography the mark plane maps to the
// image, and over one mark (~30-100px) that map is affine to well under a pixel. So
//
//     |A (p - c)| = teeth[t] + delta * pol
//
// with c the mark centre in the image, A the inverse of the local affine map, and delta one
// ink-bleed offset in mm. pol is the edge polarity: a uniform dilation of the dark ink moves a
// dark->light boundary outward and a light->dark boundary inward, and because the involution pairs
// require ss[f] === -ss[e], BOTH edges of a pair take the same signed shift. Consecutive teeth
// alternate polarity, so delta warps the radial lattice in a way solveMan's own A/dHat cannot
// absorb -- it is identifiable rather than degenerate with scale.
//
// 7 parameters against thousands of observations, so the centre is over-determined by orders of
// magnitude more evidence than the 12 numbers the line intersection uses.
//
//   bun scratch/rmbt/conic-label.ts --synth [--dirs=12] [--stride=1] [--dilate=0.6]
//   bun scratch/rmbt/conic-label.ts --bank [--cases=a,b]
import { chromium } from "playwright";
import { resolve } from "node:path";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";

const NB = resolve("lopebooks/notebooks/tomlarkworthy_coded-landmark-tracking.html");
const arg = (f: string, d: string) => process.argv.find((a) => a.startsWith(`--${f}=`))?.split("=")[1] ?? d;
const MODE = process.argv.includes("--bank") ? "bank" : process.argv.includes("--diag") ? "diag" : process.argv.includes("--phase") ? "phase" : process.argv.includes("--dirbias") ? "dirbias" : process.argv.includes("--scores") ? "scores" : process.argv.includes("--relabelsynth") ? "relabelsynth" : process.argv.includes("--relabel") ? "relabel" : process.argv.includes("--shape") ? "shape" : "synth";
const NDIR = Number(arg("dirs", "12"));
const STRIDE = Number(arg("stride", "1"));
const DILATE = Number(arg("dilate", "0"));
const CASES = process.argv.find((a) => a.startsWith("--cases="))?.split("=")[1]?.split(",") ?? null;
const LIMIT = Number(arg("limit", "0"));
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

await page.evaluate(async (FIXEDGE: boolean) => {
  const rt = (window as any).__ojs_runtime;
  let vars = [...rt._variables];
  const val = async (n: string) => { const v = vars.find((z: any) => z._name === n); return v ? await v._module.value(n) : null; };
  const W: any = window as any;

  // edges1Dsub peaks a BACKWARD difference d[i] = sig[i] - sig[i-1], which is the gradient at
  // i-0.5, but reports the edge at i+off: every edge is half a pixel late ALONG THE SCAN.
  // Redefined rather than wrapped from outside, because scanRowsMan closes over the cell value.
  // The correction is a pure translation of a row's edge list, so involutions, cross ratios and
  // decoded bits are untouched -- only absolute position moves.
  if (FIXEDGE) {
    const v = vars.find((z: any) => z._name === "edges1Dsub");
    const orig = await v._module.value("edges1Dsub");
    v.define("edges1Dsub", [], () => (sig: any, thr: number) =>
      orig(sig, thr).map((e: any) => ({ ...e, x: e.x - 0.5 })));
    await new Promise((r) => setTimeout(r, 1500));
    vars = [...rt._variables];
  }

  W.__C = {
    edges1Dsub: await val("edges1Dsub"),
    manRowGroups: await val("manRowGroups"),
    findInvolution: await val("findInvolution"),
    solveMan: await val("solveMan"),
    manLayout: await val("manLayout"),
    manScanRows: await val("manScanRows"),
    scanRowsMan: await val("scanRowsMan"),
    clusterManRows: await val("clusterManRows"),
    hexTarget: await val("hexTarget"),
    renderHexScene: await val("renderHexScene"),
    fitHomography: await val("fitHomography"),
  };

  // Same resample as the notebook's resampleAlong, but it keeps BOTH offsets: harvesting edge
  // points (not just a scan coordinate) needs the full inverse map back to the original frame.
  W.__rot = (frame: any, deg: number) => {
    if (deg === 0) return { ...frame, ux: 1, uy: 0, vx: 0, vy: 1, offX: 0, offY: 0, deg: 0 };
    const th = (deg * Math.PI) / 180, c = Math.cos(th), s = Math.sin(th);
    const ux = c, uy = s, vx = -s, vy = c;
    const { gray, w, h } = frame;
    let X0 = Infinity, X1 = -Infinity, Y0 = Infinity, Y1 = -Infinity;
    for (const [x, y] of [[0, 0], [w - 1, 0], [0, h - 1], [w - 1, h - 1]]) {
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
        let px = Xx * ux + Yy * vx, py = Xx * uy + Yy * vy;
        if (px < 0) px = 0; else if (px > w - 1) px = w - 1;
        if (py < 0) py = 0; else if (py > h - 1) py = h - 1;
        const x0 = px | 0, y0 = py | 0;
        const x1 = x0 + 1 < w ? x0 + 1 : x0, y1 = y0 + 1 < h ? y0 + 1 : y0;
        const fx = px - x0, fy = py - y0;
        const a = gray[y0 * w + x0], b = gray[y0 * w + x1];
        const cc = gray[y1 * w + x0], d = gray[y1 * w + x1];
        const t = a + (b - a) * fx, bo = cc + (d - cc) * fx;
        out[Y * nw + X] = (t + (bo - t) * fy + 0.5) | 0;
      }
    }
    return { gray: out, w: nw, h: nh, ux, uy, vx, vy, offX: X0, offY: Y0, deg };
  };

  // Every edge crossing the cascade already found, tagged with the radius the barcode names for
  // it. solveMan does not return its tooth assignment, but it returns A and dHat, and the
  // assignment is a pure function of those and the involution -- so this reproduces it rather
  // than reimplementing it.
  W.__obs = (frame: any, opts: any = {}) => {
    const C = W.__C, L = C.manLayout;
    const nDir = opts.nDir ?? 12, stride = opts.stride ?? 1;
    const thr = opts.edgeThreshold ?? 12;
    const byId = new Map();
    const t0 = performance.now();
    for (let k = 0; k < nDir; k++) {
      const R = W.__rot(frame, (k * 180) / nDir);
      const w = R.w, h = R.h;
      for (let y = (stride >> 1); y < h; y += stride) {
        const se = C.edges1Dsub(R.gray.subarray(y * w, (y + 1) * w), thr);
        if (se.length < 6) continue;
        const n = se.length;
        const xs = new Float64Array(n), ss = new Int8Array(n);
        for (let i = 0; i < n; i++) { const e = se[i]; xs[i] = typeof e === "number" ? e : e.x; ss[i] = typeof e === "number" ? 1 : e.s; }
        for (const [lo, hi] of C.manRowGroups(xs, opts)) {
          const sub = [];
          for (let i = lo; i <= hi; i++) sub.push({ x: xs[i], s: ss[i] });
          const iv = C.findInvolution(sub, opts);
          if (!iv) continue;
          const r = C.solveMan(iv, L, opts);
          if (!r.ok || r.sup < 5 || r.id == null) continue;
          const d2 = r.dHat * r.dHat;
          let list = byId.get(r.id);
          if (!list) byId.set(r.id, (list = []));
          for (const p of iv.up) {
            const rad = Math.sqrt(Math.max(0, p.u / r.A + d2));
            const t = Math.round((rad - 6) / L.half);
            if (t < 0 || t > L.nT) continue;
            if (Math.abs(rad - L.teeth[t]) >= 0.45) continue;
            // both edges of the pair, mapped back to the original frame
            for (const idx of [p.e, p.f]) {
              const X = iv.xs[idx] + R.offX, Y = y + R.offY;
              list.push([X * R.ux + Y * R.vx, X * R.uy + Y * R.vy, L.teeth[t], p.sR, k]);
            }
          }
        }
      }
    }
    return { byId, ms: Math.round(performance.now() - t0) };
  };

  // Baseline: the shipped labeller, one measured coordinate per direction.
  W.__base = (frame: any, opts: any = {}) => {
    const C = W.__C;
    const nDir = opts.nDir ?? 12, stride = opts.stride ?? 1;
    const lines = new Map();
    for (let k = 0; k < nDir; k++) {
      const R = W.__rot(frame, (k * 180) / nDir);
      const o = { ...opts, stride, bothAxes: false };
      const res = C.clusterManRows(C.scanRowsMan(R, C.manScanRows(R, o), o), o);
      for (const f of res.fused) {
        if (f.id == null) continue;
        if (!lines.has(f.id)) lines.set(f.id, []);
        lines.get(f.id).push({ ux: R.ux, uy: R.uy, c: f.xc + R.offX, a: f.a });
      }
    }
    const out = new Map();
    for (const [id, ls] of lines) {
      if (ls.length < 2) continue;
      const solve = (wts: number[]) => {
        let a11 = 0, a12 = 0, a22 = 0, b1 = 0, b2 = 0;
        ls.forEach((L: any, i: number) => {
          const w = wts[i];
          a11 += w * L.ux * L.ux; a12 += w * L.ux * L.uy; a22 += w * L.uy * L.uy;
          b1 += w * L.c * L.ux; b2 += w * L.c * L.uy;
        });
        const det = a11 * a22 - a12 * a12;
        return Math.abs(det) < 1e-9 ? null : { x: (b1 * a22 - b2 * a12) / det, y: (a11 * b2 - a12 * b1) / det };
      };
      let wts = ls.map(() => 1), p = solve(wts);
      if (!p) continue;
      for (let it = 0; it < 2; it++) {
        const res = ls.map((L: any) => Math.abs(p!.x * L.ux + p!.y * L.uy - L.c));
        const srt = res.slice().sort((a: number, b: number) => a - b);
        const mad = Math.max(0.5, srt[srt.length >> 1]);
        wts = res.map((r: number) => { const q = r / (1.5 * mad); return q <= 1 ? 1 : 1 / q; });
        const q = solve(wts); if (!q) break; p = q;
      }
      const as = ls.map((L: any) => L.a).filter((x: any) => x != null).sort((a: number, b: number) => a - b);
      out.set(id, { x: p.x, y: p.y, dirs: ls.length, radiusPx: as.length ? as[as.length >> 1] : null });
    }
    return out;
  };

  // What the LIVE rig already has for free: fitManPose's semi-axes from the deg-0 scan,
  // a along the scan and b across it. That is an AXIS-ALIGNED ellipse -- 2 numbers where
  // a general metric needs 3 -- so it cannot represent a rotated ellipse, but it still
  // makes a mark worth 2 + 2 = 4 constraints instead of 2.
  W.__ab = (frame: any, opts: any = {}) => {
    const C = W.__C;
    const o = { ...opts, stride: opts.stride ?? 1, bothAxes: false };
    const res = C.clusterManRows(C.scanRowsMan(frame, C.manScanRows(frame, o), o), o);
    const out = new Map();
    for (const f of res.fused) if (f.id != null && f.a) out.set(f.id, { a: f.a, b: f.b ?? f.a });
    return out;
  };

  // |A (p - c)| = r + delta * pol, by Levenberg-Marquardt with Huber IRLS.
  // theta = [cx, cy, a11, a12, a21, a22, delta] (+ [gx, gy] when perspective is on)
  // Plain Gauss-Newton diverged on ~5% of marks (centres thrown 1000px), so every step must be
  // accepted only if it lowers the weighted cost.
  W.__fit = (obs: any[], init: any, opts: any = {}) => {
    const useDelta = opts.delta !== false;
    const usePersp = !!opts.perspective;
    const n = obs.length;
    if (n < 40) return null;
    const s = 1 / (init.radiusPx ? init.radiusPx / 28.5 : 1);   // px -> mm, isotropic guess
    let th = [init.x, init.y, s, 0, 0, s, 0, 0, 0];
    // The perspective pair is the weakest-constrained direction in the problem and from a cold
    // start it occasionally walked a centre 3px off. Seed it from the converged affine solve.
    let affine: any = null;
    if (usePersp && !opts._staged) {
      affine = W.__fit(obs, init, { ...opts, perspective: false, _staged: true });
      if (affine) th = [affine.x, affine.y, ...affine.A, affine.delta, 0, 0];
    }
    const np = usePersp ? 9 : useDelta ? 7 : 6;
    const eps = [0.01, 0.01, 1e-5, 1e-5, 1e-5, 1e-5, 1e-3, 1e-8, 1e-8];

    const resid = (t: number[], i: number) => {
      const dx = obs[i][0] - t[0], dy = obs[i][1] - t[1];
      let qx = t[2] * dx + t[3] * dy, qy = t[4] * dx + t[5] * dy;
      if (usePersp) { const wgt = 1 + t[7] * dx + t[8] * dy; qx /= wgt; qy /= wgt; }
      return Math.hypot(qx, qy) - (obs[i][2] + (useDelta ? t[6] * obs[i][3] : 0));
    };
    const cost = (t: number[], wts: Float64Array) => {
      let sse = 0, sw = 0;
      for (let i = 0; i < n; i++) { const r = resid(t, i); sse += wts[i] * r * r; sw += wts[i]; }
      return sse / Math.max(1e-9, sw);
    };
    const solveLin = (JTJ: Float64Array[], JTr: Float64Array, lam: number) => {
      const M = JTJ.map((row, i) => Float64Array.from([...row, JTr[i]]));
      for (let a = 0; a < np; a++) M[a][a] *= 1 + lam;
      for (let c = 0; c < np; c++) {
        let piv = c;
        for (let r2 = c + 1; r2 < np; r2++) if (Math.abs(M[r2][c]) > Math.abs(M[piv][c])) piv = r2;
        if (Math.abs(M[piv][c]) < 1e-18) return null;
        const tmp = M[c]; M[c] = M[piv]; M[piv] = tmp;
        for (let r2 = 0; r2 < np; r2++) {
          if (r2 === c) continue;
          const f = M[r2][c] / M[c][c];
          for (let k = c; k <= np; k++) M[r2][k] -= f * M[c][k];
        }
      }
      return Array.from({ length: np }, (_, a) => M[a][np] / M[a][a]);
    };

    let wts = new Float64Array(n).fill(1);
    let lam = 1e-3, cur = cost(th, wts), rms = Math.sqrt(cur);
    for (let iter = 0; iter < 60; iter++) {
      const JTJ = Array.from({ length: np }, () => new Float64Array(np));
      const JTr = new Float64Array(np);
      const g = new Float64Array(np);
      for (let i = 0; i < n; i++) {
        const r0 = resid(th, i);
        for (let k = 0; k < np; k++) { const t2 = th.slice(); t2[k] += eps[k]; g[k] = (resid(t2, i) - r0) / eps[k]; }
        const w = wts[i];
        for (let a = 0; a < np; a++) {
          JTr[a] += w * g[a] * r0;
          for (let b = a; b < np; b++) JTJ[a][b] += w * g[a] * g[b];
        }
      }
      for (let a = 0; a < np; a++) for (let b = 0; b < a; b++) JTJ[a][b] = JTJ[b][a];

      let took = false;
      for (let tryN = 0; tryN < 8; tryN++) {
        const d = solveLin(JTJ.map((r) => Float64Array.from(r)), JTr, lam);
        if (!d) { lam *= 10; continue; }
        const t2 = th.slice();
        for (let a = 0; a < np; a++) t2[a] -= d[a];
        const c2 = cost(t2, wts);
        if (c2 < cur) { th = t2; cur = c2; lam = Math.max(1e-9, lam / 3); took = true; break; }
        lam *= 10;
        if (lam > 1e12) break;
      }
      rms = Math.sqrt(cur);
      if (!took) break;

      // Huber reweight on the mm residual (recompute the cost so the acceptance test stays honest)
      const rs = new Float64Array(n);
      for (let i = 0; i < n; i++) rs[i] = Math.abs(resid(th, i));
      const srt = Float64Array.from(rs).sort();
      const mad = Math.max(0.02, srt[n >> 1]);
      for (let i = 0; i < n; i++) { const q = rs[i] / (2 * mad); wts[i] = q <= 1 ? 1 : 1 / q; }
      cur = cost(th, wts);
    }
    const inl = Array.from(wts).filter((w) => w > 0.99).length;
    // A fit that ran away from its seed is not a better centre, it is a failed solve.
    const moved = Math.hypot(th[0] - init.x, th[1] - init.y);
    const bad = !isFinite(rms) || rms > 1.5 || moved > (init.radiusPx ?? 40) * 0.5;
    // The perspective correction is a sub-pixel refinement of the affine solve by construction.
    // If it lands more than a pixel away it has not refined anything, it has found another
    // minimum -- so keep the affine answer and say so.
    if (affine && !affine.bad) {
      const jump = Math.hypot(th[0] - affine.x, th[1] - affine.y);
      if (bad || jump > 1) return { ...affine, fellBack: true, jump };
      return { x: th[0], y: th[1], delta: th[6], rms, n, inl, moved, bad, jump, A: th.slice(2, 6) };
    }
    return { x: th[0], y: th[1], delta: th[6], rms, n, inl, moved, bad, A: th.slice(2, 6) };
  };
}, process.argv.includes("--fixedge"));

// ---- harness -------------------------------------------------------------
const pct = (a: number[], q: number) => { if (!a.length) return NaN; const s = a.slice().sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.round(q * (s.length - 1)))]; };
const fmt = (a: number[]) => a.length ? `n=${String(a.length).padStart(3)} p50=${pct(a, 0.5).toFixed(3)} p90=${pct(a, 0.9).toFixed(3)} max=${Math.max(...a).toFixed(3)}` : "n=0";

const SCENES = [
  { yawDeg: 0, tiltDeg: 0, rollDeg: 0, fill: 0.8, seed: 1 },
  { yawDeg: 20, tiltDeg: 12, rollDeg: 0, fill: 0.8, seed: 2 },
  { yawDeg: -30, tiltDeg: 20, rollDeg: 15, fill: 0.7, seed: 3 },
  { yawDeg: 35, tiltDeg: -25, rollDeg: -20, fill: 0.6, seed: 4 },
  { yawDeg: 0, tiltDeg: 0, rollDeg: 30, fill: 0.5, seed: 5 },
  { yawDeg: 15, tiltDeg: 30, rollDeg: 45, fill: 0.9, seed: 6 },
];

if (MODE === "synth") {
  const rows = await page.evaluate(async ({ scenes, nDir, stride, dilate }) => {
    const W: any = window as any, C = W.__C;
    const out: any[] = [];
    for (const s of scenes) {
      const scene = C.renderHexScene({ ...s, W: 960, H: 720 });
      let gray = scene.gray;
      if (dilate > 0) {
        // Print bleed is SUB-pixel, so a morphological min filter is the wrong instrument: its
        // smallest disc is one whole pixel and anything under that rounds to the identity.
        // Blending the 3x3 min in by a fraction f moves a monotone edge to g(x-f) instead --
        // a fractional-pixel growth of the ink in every direction, which is the model delta claims
        // to absorb. Ink is dark, so growing it means taking the minimum.
        const w = scene.w, h = scene.h, f = Math.min(1, dilate);
        const g2 = new Uint8Array(gray.length);
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
          let m = 255;
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
            const yy = Math.min(h - 1, Math.max(0, y + dy)), xx = Math.min(w - 1, Math.max(0, x + dx));
            const v = gray[yy * w + xx];
            if (v < m) m = v;
          }
          g2[y * w + x] = Math.round((1 - f) * gray[y * w + x] + f * m);
        }
        gray = g2;
      }
      const frame = { gray, w: scene.w, h: scene.h };
      // renderHexScene rasterises pixel px from samples at px+0.25 and px+0.75, so pixel INDEX px
      // carries continuous coordinate px+0.5, while truth is project() in continuous space. Every
      // synthetic accuracy number ever taken off this renderer therefore carried a fixed
      // (-0.5,-0.5)px penalty, measured back out at (-0.505,-0.492) by --dirbias.
      const truth = new Map(scene.truth.map((t: any) => [t.id, { id: t.id, x: t.x - 0.5, y: t.y - 0.5 }]));
      const base = W.__base(frame, { nDir, stride });
      const t0 = performance.now();
      const { byId, ms } = W.__obs(frame, { nDir, stride });
      // errs keeps the SIGNED error vector: a constant offset between the renderer's pixel grid
      // and its reported truth centres would inflate every method equally and hide the real
      // scatter, so each variant is also reported with its per-scene mean removed.
      const errs: any = { base: [], fit: [], fitNoDelta: [], fitPersp: [] };
      const deltas: number[] = [], counts: number[] = [];
      let nBad = 0;
      for (const [id, b] of base) {
        const t = truth.get(id) as any;
        if (!t) continue;
        errs.base.push([b.x - t.x, b.y - t.y]);
        const obs = byId.get(id);
        if (!obs) continue;
        counts.push(obs.length);
        const f = W.__fit(obs, b, {});
        const f0 = W.__fit(obs, b, { delta: false });
        const fp = W.__fit(obs, b, { perspective: true });
        if (f) { if (f.bad) nBad++; else { errs.fit.push([f.x - t.x, f.y - t.y]); deltas.push(f.delta); } }
        if (f0 && !f0.bad) errs.fitNoDelta.push([f0.x - t.x, f0.y - t.y]);
        if (fp && !fp.bad) errs.fitPersp.push([fp.x - t.x, fp.y - t.y]);
      }
      out.push({ scene: s, dPx: Math.round(scene.dPx), errs, deltas, obsMs: ms, nBad,
        fitMs: Math.round(performance.now() - t0 - ms), obsPerMark: counts });
    }
    return out;
  }, { scenes: SCENES, nDir: NDIR, stride: STRIDE, dilate: DILATE });

  const VARS = ["base", "fit", "fitNoDelta", "fitPersp"];
  const mag = (v: number[][]) => v.map(([x, y]) => Math.hypot(x, y));
  const demean = (v: number[][]) => {
    if (!v.length) return [];
    const mx = v.reduce((s, e) => s + e[0], 0) / v.length, my = v.reduce((s, e) => s + e[1], 0) / v.length;
    return v.map(([x, y]) => Math.hypot(x - mx, y - my));
  };
  const meanVec = (v: number[][]) => v.length
    ? `(${(v.reduce((s, e) => s + e[0], 0) / v.length).toFixed(3)},${(v.reduce((s, e) => s + e[1], 0) / v.length).toFixed(3)})` : "-";
  const acc: any = Object.fromEntries(VARS.map((k) => [k, [] as number[][]]));
  const accD: any = Object.fromEntries(VARS.map((k) => [k, [] as number[]]));
  const allDeltas: number[] = [];
  for (const r of rows) {
    console.log(`\nscene yaw=${r.scene.yawDeg} tilt=${r.scene.tiltDeg} roll=${r.scene.rollDeg} fill=${r.scene.fill}  mark=${r.dPx}px  obs/mark≈${Math.round(r.obsPerMark.reduce((a: number, b: number) => a + b, 0) / Math.max(1, r.obsPerMark.length))}  ${r.obsMs}ms scan + ${r.fitMs}ms fit${r.nBad ? `  BAD=${r.nBad}` : ""}`);
    for (const k of VARS) {
      acc[k].push(...r.errs[k]);
      accD[k].push(...demean(r.errs[k]));
      console.log(`  ${k.padEnd(11)} ${fmt(mag(r.errs[k]))}   bias ${meanVec(r.errs[k])}  demeaned ${fmt(demean(r.errs[k]))}`);
    }
    allDeltas.push(...r.deltas);
    console.log(`  delta (mm)  ${r.deltas.map((d: number) => d.toFixed(3)).join(" ")}`);
  }
  console.log(`\n=== over all scenes, px error against exact projected centres  (dirs=${NDIR} stride=${STRIDE} dilate=${DILATE}) ===`);
  for (const k of VARS) console.log(`  ${k.padEnd(11)} abs ${fmt(mag(acc[k]))}\n  ${" ".repeat(11)} de-meaned per scene ${fmt(accD[k])}`);
  console.log(`  delta       ${fmt(allDeltas.map(Math.abs))}  (signed p50 ${pct(allDeltas, 0.5).toFixed(3)} mm)`);
  if (OUT) writeFileSync(OUT, JSON.stringify({ rows, opts: { NDIR, STRIDE, DILATE } }, null, 1));
}

if (process.argv.includes("--diag")) {
  // Every method carries a common-mode offset per scene, ~0.45px in -x even on the FRONTAL scene
  // where there is no perspective to blame. Either renderHexScene's reported truth centres sit off
  // its own rasterisation, or the cascade has a shared bias. The intensity centroid of a mark is
  // an estimator with nothing in common with edges1Dsub or the involution -- the rings are
  // concentric, so a frontal mark's ink is radially symmetric and its centroid IS its centre.
  const d = await page.evaluate(async ({ nDir, stride }) => {
    const W: any = window as any, C = W.__C;
    const rows: any[] = [];
    for (const clutter of [0, undefined]) {
      const scene = C.renderHexScene({ yawDeg: 0, tiltDeg: 0, rollDeg: 0, fill: 0.8, seed: 1, W: 960, H: 720, ...(clutter === 0 ? { clutter: 0, noise: 0, blur: 0 } : {}) });
      const frame = { gray: scene.gray, w: scene.w, h: scene.h };
      const base = W.__base(frame, { nDir, stride });
      const { byId } = W.__obs(frame, { nDir, stride });
      for (const t of scene.truth) {
        const b = base.get(t.id); if (!b) continue;
        const obs = byId.get(t.id);
        const f = obs ? W.__fit(obs, b, {}) : null;
        // ink centroid over the mark disc, background level taken from an outer annulus
        const R = b.radiusPx ?? 40, w = scene.w, h = scene.h;
        const cen = (cx: number, cy: number, rad: number) => {
          let bg = 0, nb = 0;
          for (let y = Math.max(0, (cy - rad * 1.6) | 0); y < Math.min(h, cy + rad * 1.6); y++)
            for (let x = Math.max(0, (cx - rad * 1.6) | 0); x < Math.min(w, cx + rad * 1.6); x++) {
              const r = Math.hypot(x - cx, y - cy);
              if (r > rad * 1.25 && r < rad * 1.55) { bg += scene.gray[y * w + x]; nb++; }
            }
          bg = nb ? bg / nb : 255;
          let sx = 0, sy = 0, sw = 0;
          for (let y = Math.max(0, (cy - rad) | 0); y < Math.min(h, cy + rad); y++)
            for (let x = Math.max(0, (cx - rad) | 0); x < Math.min(w, cx + rad); x++) {
              if (Math.hypot(x - cx, y - cy) > rad) continue;
              const wt = Math.max(0, bg - scene.gray[y * w + x]);
              sx += wt * x; sy += wt * y; sw += wt;
            }
          return sw > 0 ? { x: sx / sw, y: sy / sw } : null;
        };
        let c = { x: b.x, y: b.y };
        for (let i = 0; i < 4; i++) { const q = cen(c.x, c.y, R); if (!q) break; c = q; }  // centroid is only unbiased about its own disc
        rows.push({ clean: clutter === 0, id: t.id,
          base: [+(b.x - t.x).toFixed(3), +(b.y - t.y).toFixed(3)],
          fit: f && !f.bad ? [+(f.x - t.x).toFixed(3), +(f.y - t.y).toFixed(3)] : null,
          centroid: [+(c.x - t.x).toFixed(3), +(c.y - t.y).toFixed(3)] });
      }
    }
    return rows;
  }, { nDir: NDIR, stride: STRIDE });
  for (const clean of [true, false]) {
    const r = d.filter((z: any) => z.clean === clean);
    const mean = (k: string, j: number) => {
      const v = r.map((z: any) => z[k]?.[j]).filter((x: any) => x != null);
      return v.length ? (v.reduce((a: number, b: number) => a + b, 0) / v.length).toFixed(3) : "-";
    };
    console.log(`\nfrontal scene, ${clean ? "clean (no blur/noise/clutter)" : "default render"} -- mean error vs reported truth`);
    for (const k of ["base", "fit", "centroid"]) console.log(`  ${k.padEnd(9)} (${mean(k, 0)}, ${mean(k, 1)})`);
    console.log(`  per-mark centroid: ${r.map((z: any) => `${z.id}:(${z.centroid[0]},${z.centroid[1]})`).join(" ")}`);
  }
}

if (MODE === "phase") {
  // renderHexScene samples pixel px at px+0.25 and px+0.75, so pixel INDEX px carries continuous
  // coordinate px+0.5 while truth is project() in continuous space -- a built-in (-0.5,-0.5).
  // shiftX/shiftY move the principal point, so they move the image AND the truth by exactly the
  // same amount: any residual that varies with the sweep is the estimator interacting with the
  // sampling grid, and any part that does not is the fixed convention offset.
  const rows = await page.evaluate(async ({ nDir, stride }) => {
    const W: any = window as any, C = W.__C;
    const out: any[] = [];
    for (let i = 0; i < 8; i++) {
      const s = i / 8;
      for (const axis of ["x", "y"]) {
        const scene = C.renderHexScene({ yawDeg: 0, tiltDeg: 0, rollDeg: 0, fill: 0.8, seed: 1, W: 960, H: 720,
          shiftX: axis === "x" ? s : 0, shiftY: axis === "y" ? s : 0 });
        const frame = { gray: scene.gray, w: scene.w, h: scene.h };
        const base = W.__base(frame, { nDir, stride });
        const { byId } = W.__obs(frame, { nDir, stride });
        const eb: number[][] = [], ef: number[][] = [];
        for (const t of scene.truth) {
          const b = base.get(t.id); if (!b) continue;
          eb.push([b.x - t.x, b.y - t.y]);
          const obs = byId.get(t.id); if (!obs) continue;
          const f = W.__fit(obs, b, {});
          if (f && !f.bad) ef.push([f.x - t.x, f.y - t.y]);
        }
        const m = (v: number[][], j: number) => v.length ? v.reduce((a, e) => a + e[j], 0) / v.length : NaN;
        out.push({ s, axis, base: [m(eb, 0), m(eb, 1)], fit: [m(ef, 0), m(ef, 1)], n: ef.length });
      }
    }
    return out;
  }, { nDir: NDIR, stride: STRIDE });
  console.log("sub-pixel phase sweep, frontal scene, mean error over 7 marks (px)");
  console.log("shift  axis   base dx    base dy     fit dx     fit dy");
  for (const r of rows) console.log(`${r.s.toFixed(3)}  ${r.axis}    ${r.base[0].toFixed(3).padStart(7)}    ${r.base[1].toFixed(3).padStart(7)}    ${r.fit[0].toFixed(3).padStart(7)}    ${r.fit[1].toFixed(3).padStart(7)}   n=${r.n}`);
  const mn = (k: string, j: number) => (rows.reduce((a: number, r: any) => a + r[k][j], 0) / rows.length).toFixed(3);
  const sd = (k: string, j: number) => {
    const m = rows.reduce((a: number, r: any) => a + r[k][j], 0) / rows.length;
    return Math.sqrt(rows.reduce((a: number, r: any) => a + (r[k][j] - m) ** 2, 0) / rows.length).toFixed(3);
  };
  console.log(`\nmean over phases  base (${mn("base", 0)}, ${mn("base", 1)})  fit (${mn("fit", 0)}, ${mn("fit", 1)})`);
  console.log(`phase-dependent   base (${sd("base", 0)}, ${sd("base", 1)})  fit (${sd("fit", 0)}, ${sd("fit", 1)})`);
}

if (MODE === "shape") {
  // Does a mark constrain the plane by more than its centre?
  //
  // fitHexPose keeps xc,yc and discards the rest, so four marks determine a homography
  // EXACTLY and no residual can expose a bad one. But a decoded barcode also fixes the
  // local Jacobian: the tooth widths give metric scale, and their foreshortening across
  // directions gives the whole 2x2 linear part. For a homography that Jacobian is a
  // known function of H, so each mark is worth 2 + 4 = 6 constraints. Two marks already
  // over-determine 8 DOF.
  //
  // Test: fit on FOUR marks, predict the other three, against renderHexScene's exact
  // projected centres. Centres-only has zero redundancy by construction; centres plus
  // Jacobians has 24 constraints for 8 unknowns.
  const rows = await page.evaluate(async ({ scenes, nDir, stride }) => {
    const W: any = window as any, C = W.__C;

    const project = (h: number[], X: number, Y: number) => {
      const w = h[6] * X + h[7] * Y + 1;
      return [(h[0] * X + h[1] * Y + h[2]) / w, (h[3] * X + h[4] * Y + h[5]) / w];
    };
    const jac = (h: number[], X: number, Y: number) => {
      const w = h[6] * X + h[7] * Y + 1;
      const [x, y] = project(h, X, Y);
      return [(h[0] - x * h[6]) / w, (h[1] - x * h[7]) / w,
              (h[3] - y * h[6]) / w, (h[4] - y * h[7]) / w];
    };
    // A is image->mm, so the plane->image Jacobian is its inverse
    const inv2 = (A: number[]) => {
      const d = A[0] * A[3] - A[1] * A[2];
      return Math.abs(d) < 1e-12 ? null : [A[3] / d, -A[1] / d, -A[2] / d, A[0] / d];
    };

    const DIRS = [[1, 0], [Math.SQRT1_2, Math.SQRT1_2], [0, 1], [-Math.SQRT1_2, Math.SQRT1_2]];
    const len = (M: number[], d: number[]) =>
      Math.hypot(M[0] * d[0] + M[1] * d[1], M[2] * d[0] + M[3] * d[1]);
    const fitBoth = (obsMarks: any[], useJ: any, seed: number[]) => {
      const R = C.manLayout.R;            // mm, to put a Jacobian residual in pixels
      // effective radius in px implied by a metric M (mm per px): R*sqrt(2/trace(M'M/R^2))
      const rEff = (M: number[]) => R * Math.SQRT2 / Math.hypot(M[0], M[1], M[2], M[3]);
      // Concentric rings are rotationally symmetric, so |A d| is invariant under any
      // rotation of A: the fit pins the METRIC A'A (3 numbers), not A (4). Comparing
      // Jacobians entry by entry compares one arbitrary number and is meaningless --
      // compare the length A assigns to a displacement instead, in four directions.
      const resid = (h: number[]) => {
        const out: number[] = [];
        for (const m of obsMarks) {
          const [px, py] = project(h, m.X, m.Y);
          out.push(px - m.x, py - m.y);
          if (useJ === "trace" && m.Aab) {
            // The scan's a,b are CENTRE CHORDS, so they are 1/sqrt(M11), 1/sqrt(M22) of the
            // imaged ellipse x'Mx=1. Individually they depend on how the sheet is rolled, but
            // M11+M22 = trace(M) does not -- trace is rotation invariant. So this is the one
            // number an axis-aligned scan can legitimately say about a rotated ellipse.
            // Express it as an effective radius R*sqrt(2/trace) so the residual is in px.
            const ji2 = inv2(jac(h, m.X, m.Y));
            if (ji2) out.push(rEff(ji2) - rEff(m.Aab));
            continue;
          }
          const A = useJ === "ring" ? m.Ainv : useJ === "ab" ? m.Aab : null;
          if (A) {
            const j = jac(h, m.X, m.Y);
            const ji = inv2(j);
            if (!ji) continue;
            // a displacement of one imaged radius, so the mm error lands at the rim,
            // then back to px so it is commensurate with the point residual
            for (const u of DIRS) {
              const d = [u[0] * m.radiusPx, u[1] * m.radiusPx];
              out.push((len(ji, d) - len(A, d)) * (m.radiusPx / R));
            }
          }
        }
        return out;
      };
      let h = seed.slice();
      const eps = [1e-4, 1e-4, 1e-2, 1e-4, 1e-4, 1e-2, 1e-9, 1e-9];
      let lam = 1e-3;
      const sse = (v: number[]) => v.reduce((a, b) => a + b * b, 0);
      let cur = sse(resid(h));
      for (let iter = 0; iter < 80; iter++) {
        const r0 = resid(h), n = r0.length, np = 8;
        const J: number[][] = [];
        for (let k = 0; k < np; k++) {
          const h2 = h.slice(); h2[k] += eps[k];
          const r2 = resid(h2);
          J.push(r2.map((v, i) => (v - r0[i]) / eps[k]));
        }
        const JTJ = Array.from({ length: np }, () => new Float64Array(np));
        const JTr = new Float64Array(np);
        for (let a = 0; a < np; a++) {
          for (let i = 0; i < n; i++) JTr[a] += J[a][i] * r0[i];
          for (let b = a; b < np; b++) { let s2 = 0; for (let i = 0; i < n; i++) s2 += J[a][i] * J[b][i]; JTJ[a][b] = s2; }
        }
        for (let a = 0; a < np; a++) for (let b = 0; b < a; b++) JTJ[a][b] = JTJ[b][a];
        let took = false;
        for (let t = 0; t < 8; t++) {
          const M = JTJ.map((row, i) => Float64Array.from([...row, JTr[i]]));
          for (let a = 0; a < np; a++) M[a][a] *= 1 + lam;
          let ok = true;
          for (let c = 0; c < np && ok; c++) {
            let piv = c;
            for (let r = c + 1; r < np; r++) if (Math.abs(M[r][c]) > Math.abs(M[piv][c])) piv = r;
            if (Math.abs(M[piv][c]) < 1e-20) { ok = false; break; }
            const tmp = M[c]; M[c] = M[piv]; M[piv] = tmp;
            for (let r = 0; r < np; r++) {
              if (r === c) continue;
              const f = M[r][c] / M[c][c];
              for (let k = c; k <= np; k++) M[r][k] -= f * M[c][k];
            }
          }
          if (!ok) { lam *= 10; continue; }
          const h2 = h.slice();
          for (let a = 0; a < np; a++) h2[a] -= M[a][np] / M[a][a];
          const c2 = sse(resid(h2));
          if (c2 < cur) { h = h2; cur = c2; lam = Math.max(1e-9, lam / 3); took = true; break; }
          lam *= 10;
        }
        if (!took) break;
      }
      return h;
    };

    const out: any[] = [];
    for (const s of scenes) {
      const scene = C.renderHexScene({ ...s, W: 960, H: 720 });
      const frame = { gray: scene.gray, w: scene.w, h: scene.h };
      const truth = new Map(scene.truth.map((t: any) => [t.id, { x: t.x - 0.5, y: t.y - 0.5 }]));
      const base = W.__base(frame, { nDir, stride });
      const { byId } = W.__obs(frame, { nDir, stride });
      const ab = W.__ab(frame, { stride });
      const marks: any[] = [];
      for (const [id, b] of base) {
        const mk = C.hexTarget.byId.get(id); if (!mk) continue;
        const t = truth.get(id); if (!t) continue;
        const obs = byId.get(id);
        const f = obs ? W.__fit(obs, b, { perspective: true }) : null;
        if (!f || f.bad) continue;
        // f.A is px -> LAYOUT UNITS (teeth are in layout units, R = manLayout.R); the target
        // is in mm, and mmPerUnit = radiusMm / L.R is the conversion.
        const mmpu = C.hexTarget.mmPerUnit;
        marks.push({ id, X: mk.xMm, Y: mk.yMm, x: f.x, y: f.y,
          Ainv: f.A.map((v: number) => v * mmpu), radiusPx: b.radiusPx ?? 40, tx: t.x, ty: t.y,
          // axis-aligned metric straight off the cheap scan: mm per px along each image axis
          Aab: ab.get(id)
            ? [C.hexTarget.radiusMm / ab.get(id).a, 0, 0, C.hexTarget.radiusMm / ab.get(id).b]
            : null });
      }
      if (marks.length < 7) { out.push({ scene: s, skipped: marks.length }); continue; }

      // Is the measured metric even consistent with the TRUE homography? If the ratio of
      // predicted to measured length is not 1 here, no fitting scheme can help.
      const H = scene.H;
      const hTrue = [H[0][0] / H[2][2], H[0][1] / H[2][2], H[0][2] / H[2][2],
                     H[1][0] / H[2][2], H[1][1] / H[2][2], H[1][2] / H[2][2],
                     H[2][0] / H[2][2], H[2][1] / H[2][2]];
      const DIRS2 = [[1, 0], [Math.SQRT1_2, Math.SQRT1_2], [0, 1], [-Math.SQRT1_2, Math.SQRT1_2]];
      const len2 = (M: number[], d: number[]) =>
        Math.hypot(M[0] * d[0] + M[1] * d[1], M[2] * d[0] + M[3] * d[1]);
      const ratios: number[] = [];
      const ptErr: number[] = [];
      for (const m of marks) {
        const pj = project(hTrue, m.X, m.Y);
        ptErr.push(Math.hypot(pj[0] - m.tx, pj[1] - m.ty));
        const ji = inv2(jac(hTrue, m.X, m.Y));
        if (!ji) continue;
        for (const u of DIRS2) {
          const d = [u[0] * m.radiusPx, u[1] * m.radiusPx];
          ratios.push(len2(ji, d) / len2(m.Ainv, d));
        }
      }
      out.push({ scene: s, diag: true, ratios, ptErr });

      // every 4-of-7 subset, predict the held-out 3
      const errP: number[] = [], errJ: number[] = [], errA: number[] = [], errT: number[] = [], errJ2: number[] = [];
      const detect: number[][] = [];
      const idx = [0, 1, 2, 3, 4, 5, 6];
      for (let a = 0; a < 7; a++) for (let b = a + 1; b < 7; b++)
        for (let c = b + 1; c < 7; c++) for (let d = c + 1; d < 7; d++) {
          const pick = [a, b, c, d], held = idx.filter((i) => !pick.includes(i));
          const sub = pick.map((i) => marks[i]);
          const pairs = sub.map((m) => ({ sx: m.X, sy: m.Y, dx: m.x, dy: m.y }));
          const seedFit = C.fitHomography(pairs);
          if (!seedFit) continue;
          const M = seedFit.M ?? seedFit.h ?? null;
          // fitHomography's internals vary; re-seed from its own map() by solving nothing
          // and instead starting the LM from a similarity guess is unreliable, so use the
          // centres-only LM result as the shared seed.
          const seed = [1, 0, 0, 0, 1, 0, 0, 0];
          const p0 = seedFit.map(0, 0), p1 = seedFit.map(1, 0), p2 = seedFit.map(0, 1);
          seed[2] = p0[0]; seed[5] = p0[1];
          seed[0] = p1[0] - p0[0]; seed[3] = p1[1] - p0[1];
          seed[1] = p2[0] - p0[0]; seed[4] = p2[1] - p0[1];
          const hP = fitBoth(sub, false, seed);
          const hJ = fitBoth(sub, "ring", hP);   // stage off the centres-only solve
          const hA = fitBoth(sub, "ab", hP);
          const hT = fitBoth(sub, "trace", hP);
          const hJ2 = fitBoth(sub, "ring", hT);  // stage off the ROBUST seed, not the raw one
          // a,b as a DETECTOR rather than a constraint: how badly does the centres-only
          // fit disagree with the semi-axes the cheap scan already measured?
          const RR = C.manLayout.R;
          const rEff2 = (M: number[]) => RR * Math.SQRT2 / Math.hypot(M[0], M[1], M[2], M[3]);
          let ss = 0, nn = 0;
          for (const m of sub) {
            if (!m.Aab) continue;
            const ji = inv2(jac(hP, m.X, m.Y));
            if (!ji) continue;
            const e = rEff2(ji) - rEff2(m.Aab);
            ss += e * e; nn++;
          }
          const abResid = nn ? Math.sqrt(ss / nn) : null;
          let worstHeld = 0;
          for (const i of held) {
            const m = marks[i];
            const pp = project(hP, m.X, m.Y);
            worstHeld = Math.max(worstHeld, Math.hypot(pp[0] - m.tx, pp[1] - m.ty));
          }
          if (abResid != null) detect.push([abResid, worstHeld]);
          for (const i of held) {
            const m = marks[i];
            const pp = project(hP, m.X, m.Y), pj = project(hJ, m.X, m.Y), pa = project(hA, m.X, m.Y);
            errP.push(Math.hypot(pp[0] - m.tx, pp[1] - m.ty));
            errJ.push(Math.hypot(pj[0] - m.tx, pj[1] - m.ty));
            errA.push(Math.hypot(pa[0] - m.tx, pa[1] - m.ty));
            const pt = project(hT, m.X, m.Y);
            errT.push(Math.hypot(pt[0] - m.tx, pt[1] - m.ty));
            const p2 = project(hJ2, m.X, m.Y);
            errJ2.push(Math.hypot(p2[0] - m.tx, p2[1] - m.ty));
          }
        }
      out[out.length - 1] = { ...out[out.length - 1], errP, errJ, errA, errT, errJ2, detect, n: marks.length };
    }
    return out;
  }, { scenes: SCENES, nDir: NDIR, stride: STRIDE });

  const allP: number[] = [], allJ: number[] = [], allA: number[] = [], allT: number[] = [], allJ2: number[] = [];
  for (const r of rows) {
    if (r.skipped != null) { console.log(`scene yaw=${r.scene.yawDeg} tilt=${r.scene.tiltDeg}  only ${r.skipped} marks, skipped`); continue; }
    const rs = r.ratios ?? [];
    console.log(`  at the TRUE H: predicted/measured length ${fmt(rs)}   truth point err ${fmt(r.ptErr ?? [])}`);
    allP.push(...r.errP); allJ.push(...r.errJ); allA.push(...(r.errA ?? [])); allT.push(...(r.errT ?? [])); allJ2.push(...(r.errJ2 ?? []));
    console.log(`scene yaw=${r.scene.yawDeg} tilt=${r.scene.tiltDeg} roll=${r.scene.rollDeg}`);
    console.log(`  centres only     ${fmt(r.errP)}`);
    console.log(`  centres + ring   ${fmt(r.errJ)}`);
    console.log(`  centres + a,b    ${fmt(r.errA)}`);
    console.log(`  centres + trace  ${fmt(r.errT ?? [])}`);
    console.log(`  trace -> ring    ${fmt(r.errJ2 ?? [])}`);
  }
  console.log(`\n=== held-out mark prediction from FOUR marks, all 35 subsets, 6 poses ===`);
  console.log(`  centres only     ${fmt(allP)}`);
  console.log(`  centres + ring   ${fmt(allJ)}`);
  console.log(`  centres + a,b    ${fmt(allA)}`);
  console.log(`  centres + trace  ${fmt(allT)}`);
  console.log(`  trace -> ring    ${fmt(allJ2)}`);
  const det = rows.flatMap((r: any) => r.detect ?? []);
  const bad = det.filter((d: number[]) => d[1] > 5), good = det.filter((d: number[]) => d[1] <= 1);
  console.log(`\n  a,b as a DETECTOR of a broken centres-only fit  (${det.length} trials: ${bad.length} worse than 5px, ${good.length} within 1px)`);
  console.log(`  threshold   caught of the bad   falsely rejected of the good`);
  for (const th of [0.5, 1, 2, 3, 5, 8]) {
    const c = bad.filter((d: number[]) => d[0] > th).length;
    const f = good.filter((d: number[]) => d[0] > th).length;
    console.log(`  ${String(th).padStart(5)}px   ${String(c).padStart(4)}/${bad.length} (${(100 * c / Math.max(1, bad.length)).toFixed(0)}%)         ${String(f).padStart(4)}/${good.length} (${(100 * f / Math.max(1, good.length)).toFixed(0)}%)`);
  }
}


// The disk copy of fitRingLattice may predate the fix that exposes A (the local metric).
// Without it relabelCase's `m.Amm = f.A.map(...)` throws and no metric reaches the plane
// fit. Redefine the cell in-page when the loaded copy lacks it, so this harness measures
// the same thing the live notebook does.
async function ensureRingA(page: any) {
  const src = "function fitRingLattice(obs, init, opts = {}) {\n  // One mark's whole ring lattice, fitted at once:\n  //\n  //     |A (p - c)| = teeth[t] + delta * polarity\n  //\n  // c is the centre in the image and A the inverse of the local plane-to-image map.\n  // delta is one ink-bleed offset in mm. It is identifiable rather than degenerate with\n  // scale because the involution pairs require ss[f] === -ss[e]: growing the ink moves a\n  // dark->light boundary out and a light->dark boundary in, and consecutive teeth\n  // alternate polarity, so delta warps the radial lattice in a way A cannot absorb.\n  //\n  // An affine A is not quite enough. Concentric circles map to NON-concentric ellipses\n  // under a homography -- the image ellipse of a ring drifts toward the vanishing point\n  // as the ring grows -- so on a tilted sheet the affine model carries a bias of a few\n  // tenths of a pixel that no amount of data removes. Two more parameters divide out\n  // that drift and it goes away.\n  const n = obs.length;\n  if (n < 40) return null;\n  const usePersp = opts.perspective !== false;\n  const s = init.radiusPx ? manLayout.R / init.radiusPx : 1;   // px -> mm, isotropic seed\n  const eps = [0.01, 0.01, 1e-5, 1e-5, 1e-5, 1e-5, 1e-3, 1e-8, 1e-8];\n\n  const resid = (t, np, i) => {\n    const o = obs[i];\n    const dx = o[0] - t[0], dy = o[1] - t[1];\n    let qx = t[2] * dx + t[3] * dy, qy = t[4] * dx + t[5] * dy;\n    if (np > 7) { const wg = 1 + t[7] * dx + t[8] * dy; qx /= wg; qy /= wg; }\n    return Math.hypot(qx, qy) - (o[2] + t[6] * o[3]);\n  };\n  const cost = (t, np, wts) => {\n    let sse = 0, sw = 0;\n    for (let i = 0; i < n; i++) { const r = resid(t, np, i); sse += wts[i] * r * r; sw += wts[i]; }\n    return sse / Math.max(1e-9, sw);\n  };\n  const solveLin = (JTJ, JTr, np, lam) => {\n    const M = JTJ.map((row, i) => Float64Array.from([...row, JTr[i]]));\n    for (let a = 0; a < np; a++) M[a][a] *= 1 + lam;\n    for (let c = 0; c < np; c++) {\n      let piv = c;\n      for (let r = c + 1; r < np; r++) if (Math.abs(M[r][c]) > Math.abs(M[piv][c])) piv = r;\n      if (Math.abs(M[piv][c]) < 1e-18) return null;\n      const tmp = M[c]; M[c] = M[piv]; M[piv] = tmp;\n      for (let r = 0; r < np; r++) {\n        if (r === c) continue;\n        const f = M[r][c] / M[c][c];\n        for (let k = c; k <= np; k++) M[r][k] -= f * M[c][k];\n      }\n    }\n    return Array.from({ length: np }, (_, a) => M[a][np] / M[a][a]);\n  };\n  // Levenberg-Marquardt with step ACCEPTANCE, not just damping: plain Gauss-Newton\n  // diverged on about one mark in twenty and threw the centre a thousand pixels. A step\n  // that does not lower the weighted cost has to be refused.\n  const solve = (np, th0) => {\n    let th = th0.slice();\n    let wts = new Float64Array(n).fill(1);\n    let lam = 1e-3, cur = cost(th, np, wts);\n    for (let iter = 0; iter < 60; iter++) {\n      const JTJ = Array.from({ length: np }, () => new Float64Array(np));\n      const JTr = new Float64Array(np);\n      const g = new Float64Array(np);\n      for (let i = 0; i < n; i++) {\n        const r0 = resid(th, np, i);\n        for (let k = 0; k < np; k++) {\n          const t2 = th.slice(); t2[k] += eps[k];\n          g[k] = (resid(t2, np, i) - r0) / eps[k];\n        }\n        const w = wts[i];\n        for (let a = 0; a < np; a++) {\n          JTr[a] += w * g[a] * r0;\n          for (let b = a; b < np; b++) JTJ[a][b] += w * g[a] * g[b];\n        }\n      }\n      for (let a = 0; a < np; a++) for (let b = 0; b < a; b++) JTJ[a][b] = JTJ[b][a];\n      let took = false;\n      for (let attempt = 0; attempt < 8; attempt++) {\n        const d = solveLin(JTJ.map((r) => Float64Array.from(r)), JTr, np, lam);\n        if (!d) { lam *= 10; continue; }\n        const t2 = th.slice();\n        for (let a = 0; a < np; a++) t2[a] -= d[a];\n        const c2 = cost(t2, np, wts);\n        if (c2 < cur) { th = t2; cur = c2; lam = Math.max(1e-9, lam / 3); took = true; break; }\n        lam *= 10;\n        if (lam > 1e12) break;\n      }\n      if (!took) break;\n      // Huber on the mm residual: a crossing assigned to the neighbouring tooth is half a\n      // tooth out and would otherwise drag the centre with it.\n      const rs = new Float64Array(n);\n      for (let i = 0; i < n; i++) rs[i] = Math.abs(resid(th, np, i));\n      const srt = Float64Array.from(rs).sort();\n      const mad = Math.max(0.02, srt[n >> 1]);\n      for (let i = 0; i < n; i++) { const q = rs[i] / (2 * mad); wts[i] = q <= 1 ? 1 : 1 / q; }\n      cur = cost(th, np, wts);\n    }\n    return { th, rms: Math.sqrt(cur) };\n  };\n\n  const aff = solve(7, [init.x, init.y, s, 0, 0, s, 0, 0, 0]);\n  // A refinement that ran away from the measurement it was refining is a failed solve,\n  // not a better centre.\n  if (!isFinite(aff.rms) || aff.rms > 1.5 ||\n      Math.hypot(aff.th[0] - init.x, aff.th[1] - init.y) > (init.radiusPx ?? 40) * 0.5) return null;\n\n  let th = aff.th, rms = aff.rms, model = \"affine\";\n  if (usePersp) {\n    const per = solve(9, [...aff.th.slice(0, 7), 0, 0]);\n    // The perspective pair is the weakest constrained direction in the problem and the\n    // correction it applies is sub-pixel by construction, so a solve landing a pixel away\n    // has found a different minimum rather than a better one.\n    const jump = Math.hypot(per.th[0] - aff.th[0], per.th[1] - aff.th[1]);\n    if (isFinite(per.rms) && per.rms <= aff.rms && jump <= 1) {\n      th = per.th; rms = per.rms; model = \"perspective\";\n    }\n  }\n  return {\n    x: th[0], y: th[1], delta: th[6], rms, n, model,\n    // px -> LAYOUT UNITS (teeth are layout units); the caller converts with mmPerUnit\n    A: [th[2], th[3], th[4], th[5]],\n    moved: Math.hypot(th[0] - init.x, th[1] - init.y)\n  };\n}";
  const did = await page.evaluate((fnSrc: string) => {
    const rt = (window as any).__ojs_runtime;
    const v = [...rt._variables].find((z: any) => z._name === "fitRingLattice");
    if (!v) return "missing";
    if (/A:\s*\[th\[2\]/.test(String(v._definition))) return "already has A";
    // eslint-disable-next-line no-new-func
    const make = new Function("manLayout", "return (" + fnSrc + ")");
    v.define("fitRingLattice", ["manLayout"], make);
    return "patched";
  }, src);
  console.log(`  fitRingLattice: ${did}`);
}


if (MODE === "relabelsynth") {
  // The bank can only report plane rms, which is not a common yardstick between the two
  // arms: refinement changes the mark SET (it rescues marks the baseline rejected) and,
  // once Amm populates, it changes the OBJECTIVE (fitPlaneMetric co-minimises the metric,
  // so point rms rises by construction). Synthetic scenes have known truth, so absolute
  // centre error settles it with neither confound.
  await ensureRingA(page);
  const rows = await page.evaluate(async ({ scenes, nDir, stride }) => {
    const W: any = window as any;
    const rt = W.__ojs_runtime;
    const vars = [...rt._variables];
    const val = async (n: string) => { const v = vars.find((z: any) => z._name === n); return await v._module.value(n); };
    const C = { renderHexScene: await val("renderHexScene"), relabelCase: await val("relabelCase") };
    const out: any[] = [];
    for (const sc of scenes) {
      const scene = C.renderHexScene({ ...sc, W: 960, H: 720 });
      const frame = { gray: scene.gray, w: scene.w, h: scene.h };
      // renderHexScene samples pixel px at px+0.25/px+0.75, so index px carries continuous
      // coordinate px+0.5 while truth is project() in continuous space.
      const truth = new Map(scene.truth.map((t: any) => [t.id, { x: t.x - 0.5, y: t.y - 0.5 }]));
      const arms: any = {};
      for (const refine of [false, true]) {
        const r = await C.relabelCase(frame, { nDir, stride, refine });
        const errs: number[] = [];
        for (const L of r.labels) {
          const t = truth.get(L.id);
          if (!t || L.x == null || L.src === "missing") continue;
          errs.push(Math.hypot(L.x - t.x, L.y - t.y));
        }
        arms[refine ? "on" : "off"] = {
          errs, plane: r.plane ? r.plane.rms : null,
          used: r.plane ? r.plane.used.length : 0,
          n: errs.length, ms: r.ms
        };
      }
      out.push({ scene: sc, ...arms });
    }
    return out;
  }, { scenes: SCENES, nDir: NDIR, stride: STRIDE });

  const allOff: number[] = [], allOn: number[] = [];
  for (const r of rows) {
    allOff.push(...r.off.errs); allOn.push(...r.on.errs);
    console.log(`yaw=${String(r.scene.yawDeg).padStart(3)} tilt=${String(r.scene.tiltDeg).padStart(3)} roll=${String(r.scene.rollDeg).padStart(3)}  ` +
      `n ${r.off.n}/${r.on.n}  used ${r.off.used}->${r.on.used}`);
    console.log(`     centre err off ${fmt(r.off.errs)}`);
    console.log(`     centre err on  ${fmt(r.on.errs)}`);
  }
  console.log(`\n=== notebook relabelCase vs KNOWN truth, ${rows.length} scenes ===`);
  console.log(`  refine off ${fmt(allOff)}`);
  console.log(`  refine on  ${fmt(allOn)}`);
}

if (MODE === "relabel") {
  await ensureRingA(page);
  // Validate the NOTEBOOK's own refinement, not this file's copy of the maths: drive
  // relabelCase over the whole bank with refine off and on. The number that matters is
  // not the average -- it is whether refinement ever makes a frame WORSE, since it runs
  // unconditionally on every measured mark.
  const rows = await page.evaluate(async ({ nDir, stride, limit }) => {
    const W: any = window as any;
    const rt = W.__ojs_runtime;
    const vars = [...rt._variables];
    const val = async (n: string) => { const v = vars.find((z: any) => z._name === n); return await v._module.value(n); };
    const bank = await val("hexFrameBank");
    const relabelCase = await val("relabelCase");
    const out: any[] = [];
    for (const b of (limit ? bank.slice(0, limit) : bank)) {
      const frame = { gray: b.frame.gray, w: b.frame.w, h: b.frame.h };
      const off = await relabelCase(frame, { nDir, stride, refine: false });
      const on = await relabelCase(frame, { nDir, stride, refine: true });
      // real marks are 35-95px, so the perspective pair may be under-constrained here
      // even though it is the clear winner on 200px synthetic marks
      const aff = await relabelCase(frame, { nDir, stride, refine: true, ring: { perspective: false } });
      const resids = (r: any) => r.labels.filter((L: any) => L.planeResid != null).map((L: any) => L.planeResid);
      // A FAIR comparison holds both the mark set and the objective fixed. relabelCase's own
      // plane rms does neither: refinement rescues marks the baseline rejected, and once Amm
      // populates the plane co-minimises the metric so point rms rises by construction. So
      // refit a plain centres-only homography over the ids BOTH arms measured.
      const fitH = await val("fitHomography");
      const T3 = await val("hexTarget");
      const pos = (r: any) => new Map(r.labels.filter((L: any) => L.x != null && L.src !== "missing")
        .map((L: any) => [L.id, L]));
      const pa = pos(off), pb = pos(on), pc = pos(aff);
      const common = [...pa.keys()].filter((k) => pb.has(k) && pc.has(k) && T3.byId.has(k));
      const fair = (m: Map<any, any>) => {
        if (common.length < 4) return null;
        const f = fitH(common.map((k) => {
          const mk = T3.byId.get(k), L = m.get(k);
          return { sx: mk.xMm, sy: mk.yMm, dx: L.x, dy: L.y };
        }));
        return f ? +f.rmsResidual.toFixed(3) : null;
      };
      const fairOff = fair(pa), fairOn = fair(pb), fairAff = fair(pc);
      const srcCount = (r: any, k: string) => r.labels.filter((L: any) => L.src === k).length;
      out.push({
        name: b.name, thrOff: off.thr, thrOn: on.thr,
        planeOff: off.plane ? off.plane.rms : null, planeOn: on.plane ? on.plane.rms : null,
        usedOff: off.plane ? off.plane.used.length : 0, usedOn: on.plane ? on.plane.used.length : 0,
        rejOff: off.plane ? off.plane.rejected.length : 0, rejOn: on.plane ? on.plane.rejected.length : 0,
        measOff: srcCount(off, "measured"), refOn: srcCount(on, "refined"),
        residOff: resids(off), residOn: resids(on),
        fairOff, fairOn, fairAff, nCommon: common.length,
        deltaMm: on.refine ? on.refine.deltaMm : null,
        refineMs: on.refine ? on.refine.ms : null, msOff: off.ms, msOn: on.ms
      });
    }
    return out;
  }, { nDir: NDIR, stride: STRIDE, limit: LIMIT });

  let worse = 0;
  for (const r of rows) {
    const d = r.planeOff != null && r.planeOn != null ? r.planeOn - r.planeOff : null;
    if (d != null && d > 0.02) worse++;
    console.log(`${r.name.padEnd(20)} plane ${String(r.planeOff).padStart(6)} -> ${String(r.planeOn).padStart(6)}` +
      `  used ${r.usedOff}->${r.usedOn}  flagged ${r.rejOff}->${r.rejOn}  refined ${r.refOn}` +
      `  delta ${r.deltaMm == null ? "-" : r.deltaMm + "mm"}  +${r.refineMs}ms` +
      (d != null && d > 0.02 ? "   WORSE" : ""));
    const fd = r.fairOff != null && r.fairOn != null ? r.fairOn - r.fairOff : null;
    console.log(`${"".padEnd(20)}   same ${r.nCommon} marks, centres-only plane: ${r.fairOff} -> ${r.fairOn}  (affine-only ring ${r.fairAff})` +
      (fd != null ? (fd < -0.005 ? "   better" : fd > 0.005 ? "   WORSE" : "   same") : ""));
  }
  const po = rows.map((r: any) => r.planeOff).filter((x: any) => x != null);
  const pn = rows.map((r: any) => r.planeOn).filter((x: any) => x != null);
  console.log(`\n=== ${rows.length} bank frames, notebook relabelCase ===`);
  const fo = rows.map((r: any) => r.fairOff).filter((x: any) => x != null);
  const fn2 = rows.map((r: any) => r.fairOn).filter((x: any) => x != null);
  console.log(`  SAME marks, centres-only plane -- off ${fmt(fo)}`);
  console.log(`  SAME marks, centres-only plane -- on  ${fmt(fn2)}`);
  const fa = rows.map((r: any) => r.fairAff).filter((x: any) => x != null);
  console.log(`  SAME marks, centres-only plane -- on, affine ring ${fmt(fa)}`);
  console.log(`  tighter on ${rows.filter((r: any) => r.fairOn != null && r.fairOn < r.fairOff - 0.005).length}/${fo.length} frames`);
  console.log(`  --- relabelCase's own numbers (mark set AND objective differ, not comparable) ---`);
  console.log(`  plane rms refine off ${fmt(po)}`);
  console.log(`  plane rms refine on  ${fmt(pn)}`);
  console.log(`  per-label plane residual off ${fmt(rows.flatMap((r: any) => r.residOff))}`);
  console.log(`  per-label plane residual on  ${fmt(rows.flatMap((r: any) => r.residOn))}`);
  console.log(`  marks used ${rows.reduce((a: number, r: any) => a + r.usedOff, 0)} -> ${rows.reduce((a: number, r: any) => a + r.usedOn, 0)}` +
    `,  flagged ${rows.reduce((a: number, r: any) => a + r.rejOff, 0)} -> ${rows.reduce((a: number, r: any) => a + r.rejOn, 0)}`);
  console.log(`  delta ${fmt(rows.map((r: any) => r.deltaMm).filter((x: any) => x != null))}`);
  console.log(`  frames made worse by refinement: ${worse}/${rows.length}`);
  if (OUT) writeFileSync(OUT, JSON.stringify(rows, null, 1));
}

if (MODE === "scores") {
  // Does correcting the half-pixel change what the SHIPPED detector reads? It should not: the
  // correction translates a whole row's edge list, and involutions, cross ratios and decoded bits
  // are all translation-invariant. Only positions move. Run the bank both ways in one page to
  // check that claim rather than assert it.
  await page.evaluate((sh: number) => { (window as any).__SHIFT = sh; }, Number(arg("shift", "-0.5")));
  const r = await page.evaluate(async () => {
    const W: any = window as any;
    const rt = W.__ojs_runtime;
    const vars = [...rt._variables];
    const val = async (n: string) => { const v = vars.find((z: any) => z._name === n); return await v._module.value(n); };
    const bank = await val("hexFrameBank");
    const score = await val("hexRigScore");
    const run = async () => {
      const analyze = await val("analyzeFrameMan");
      const opts = await val("hexRigOpts");
      const tot = { read: 0, loc: 0, miss: 0, wrong: 0, off: 0, marks: 0, score: 0 };
      const resid: number[] = [];
      const per: any[] = [];
      const pose = await val("fitHexPose");
      for (const b of bank) {
        const res = analyze({ gray: b.frame.gray, w: b.frame.w, h: b.frame.h }, opts);
        const s = score(res, b.truth);
        const pz = pose({ ...res, w: b.frame.w, h: b.frame.h });
        // a,b consistency of the fitted pose: for each READ mark, how far do the semi-axes
        // the plane implies sit from the ones the scan measured? A pose fitted to too few
        // centres satisfies them exactly and gets this badly wrong.
        let abResid = null, abRad = null, abPct = null;
        if (pz.ok && pz.fit && pz.fit.H) {
          const h = pz.fit.H;
          const jac = (X: number, Y: number) => {
            const w = h[6] * X + h[7] * Y + h[8];
            const x = (h[0] * X + h[1] * Y + h[2]) / w, y = (h[3] * X + h[4] * Y + h[5]) / w;
            return [(h[0] - x * h[6]) / w, (h[1] - x * h[7]) / w, (h[3] - y * h[6]) / w, (h[4] - y * h[7]) / w];
          };
          const T2 = await val("hexTarget");
          const RR = T2.radiusMm;
          // rotation-invariant: a,b are centre chords so 1/a^2+1/b^2 = trace(M), which the
          // roll of the sheet cannot change. Expressed as an effective radius, in px.
          const rEff = (M: number[]) => RR * Math.SQRT2 / Math.hypot(M[0], M[1], M[2], M[3]);
          let ss = 0, nn = 0, radAcc = 0;
          for (const f of res.fused) {
            if (f.id == null || !f.a || !T2.byId.has(f.id)) continue;
            const mk = T2.byId.get(f.id);
            const J = jac(mk.xMm, mk.yMm);
            const d = J[0] * J[3] - J[1] * J[2];
            if (Math.abs(d) < 1e-12) continue;
            const ji = [J[3] / d, -J[1] / d, -J[2] / d, J[0] / d];
            const meas = [RR / f.a, 0, 0, RR / (f.b ?? f.a)];
            const e = rEff(ji) - rEff(meas);
            ss += e * e; nn++; radAcc += rEff(meas);
          }
          abResid = nn ? +Math.sqrt(ss / nn).toFixed(2) : null;
          abRad = nn ? +(radAcc / nn).toFixed(0) : null;
          abPct = nn ? +((Math.sqrt(ss / nn) / (radAcc / nn)) * 100).toFixed(1) : null;
        }
        per.push({ name: b.name, read: s.counts.read, poseOk: !!pz.ok,
          poseRead: pz.ok ? pz.counts.read : null, abResid, abRad, abPct,
          spread: pz.ok ? Math.round(Math.max(...pz.marks.map((m: any) => Math.hypot(m.predicted.x - b.frame.w / 2, m.predicted.y - b.frame.h / 2)))) : null });
        tot.read += s.counts.read; tot.loc += s.counts.located; tot.miss += s.counts.missing;
        tot.wrong += s.counts.misplaced; tot.off += s.offTarget.length; tot.marks += b.truth.length;
        tot.score += s.score;
        for (const m of s.marks) if (m.residualPx != null) resid.push(m.residualPx);
      }
      return { tot, resid, per };
    };
    const before = await run();
    const v = vars.find((z: any) => z._name === "edges1Dsub");
    const orig = await v._module.value("edges1Dsub");
    const SHIFT = Number(new URLSearchParams(location.search).get("shift") ?? (window as any).__SHIFT ?? -0.5);
    v.define("edges1Dsub", [], () => (sig: any, thr: number) => orig(sig, thr).map((e: any) => ({ ...e, x: e.x + SHIFT })));
    await new Promise((res) => setTimeout(res, 2000));
    const after = await run();
    return { before, after };
  });
  for (const [k, v] of Object.entries(r) as any) {
    console.log(`${k.padEnd(7)} read ${v.tot.read}/${v.tot.marks}  located ${v.tot.loc}  missing ${v.tot.miss}  misplaced ${v.tot.wrong}  offTarget ${v.tot.off}  score ${v.tot.score}`);
    console.log(`        residual px  ${fmt(v.resid)}`);
    for (const r of v.per) console.log(`        ${r.name.padEnd(20)} read ${r.read}/7  maxPredictedRadius ${String(r.spread).padStart(6)}px  a/b resid ${String(r.abResid).padStart(6)}px  markR ${String(r.abRad).padStart(3)}px  = ${r.abPct}%`);
  }
}

if (MODE === "dirbias") {
  // Per direction the scan measures one line, p.u = c. Against the true centre that is one signed
  // number, offset(theta) = c - truth.u. Two very different causes are separable in it:
  //   - the ink actually sits at truth + (dx,dy) in image space  ->  offset = dx cos + dy sin
  //   - edges1Dsub reports every edge b along the scan            ->  offset = b, constant
  // The 12 directions span 180 deg, not 360, so a constant b does NOT cancel: it lands as
  // (0, 2b/pi) in the intersected centre. Fitting [cos, sin, 1] tells which is which.
  const r = await page.evaluate(async ({ nDir, stride }) => {
    const W: any = window as any, C = W.__C;
    const scene = C.renderHexScene({ yawDeg: 0, tiltDeg: 0, rollDeg: 0, fill: 0.8, seed: 1, W: 960, H: 720, clutter: 0, noise: 0, blur: 1.0 });
    const frame = { gray: scene.gray, w: scene.w, h: scene.h };
    const truth = new Map(scene.truth.map((t: any) => [t.id, t]));
    const rows: any[] = [];
    for (let k = 0; k < nDir; k++) {
      const deg = (k * 180) / nDir;
      const R = W.__rot(frame, deg);
      const o = { stride, bothAxes: false };
      const res = C.clusterManRows(C.scanRowsMan(R, C.manScanRows(R, o), o), o);
      const offs: number[] = [];
      for (const f of res.fused) {
        const t = truth.get(f.id) as any;
        if (!t) continue;
        offs.push(f.xc + R.offX - (t.x * R.ux + t.y * R.uy));
      }
      rows.push({ deg, n: offs.length, mean: offs.reduce((a, b) => a + b, 0) / Math.max(1, offs.length),
        spread: offs.length > 1 ? Math.max(...offs) - Math.min(...offs) : 0 });
    }
    // least squares offset ~ dx cos + dy sin + b
    let A = [[0, 0, 0], [0, 0, 0], [0, 0, 0]], y = [0, 0, 0];
    for (const rw of rows) {
      const th = (rw.deg * Math.PI) / 180, g = [Math.cos(th), Math.sin(th), 1];
      for (let i = 0; i < 3; i++) { y[i] += g[i] * rw.mean; for (let j = 0; j < 3; j++) A[i][j] += g[i] * g[j]; }
    }
    const M = A.map((rr, i) => [...rr, y[i]]);
    for (let c = 0; c < 3; c++) {
      let piv = c;
      for (let r2 = c + 1; r2 < 3; r2++) if (Math.abs(M[r2][c]) > Math.abs(M[piv][c])) piv = r2;
      const tmp = M[c]; M[c] = M[piv]; M[piv] = tmp;
      for (let r2 = 0; r2 < 3; r2++) { if (r2 === c) continue; const f2 = M[r2][c] / M[c][c]; for (let kk = c; kk <= 3; kk++) M[r2][kk] -= f2 * M[c][kk]; }
    }
    return { rows, sol: [M[0][3] / M[0][0], M[1][3] / M[1][1], M[2][3] / M[2][2]] };
  }, { nDir: NDIR, stride: STRIDE });
  console.log("per-direction line offset vs the renderer's truth (px, frontal, no noise/clutter)");
  for (const rw of r.rows) console.log(`  ${rw.deg.toFixed(1).padStart(6)} deg  n=${rw.n}  mean ${rw.mean.toFixed(3).padStart(7)}  spread ${rw.spread.toFixed(3)}`);
  console.log(`\n  offset(theta) = dx cos + dy sin + b`);
  console.log(`  image-space displacement of the ink  (${r.sol[0].toFixed(3)}, ${r.sol[1].toFixed(3)}) px`);
  console.log(`  bias along the scan direction         ${r.sol[2].toFixed(3)} px   (lands as (0, ${(2 * r.sol[2] / Math.PI).toFixed(3)}) in the intersected centre)`);
}

if (MODE === "bank") {
  // No truth here, so the grade is CONSISTENCY: how tightly the seven centres fit one homography.
  const DIR = resolve("data/hexcases");
  let names = CASES ?? readdirSync(DIR).filter((f) => f.endsWith(".gray")).map((f) => f.slice(0, -5)).sort();
  if (LIMIT) names = names.slice(0, LIMIT);
  const results: any[] = [];
  for (const n of names) {
    const meta = JSON.parse(readFileSync(resolve(DIR, n + ".json"), "utf8"));
    const gray = readFileSync(resolve(DIR, n + ".gray"));
    if (gray.length !== meta.w * meta.h) continue;
    const r = await page.evaluate(async ({ b64, w, h, nDir, stride, thr }) => {
      const W: any = window as any, C = W.__C;
      const bin = atob(b64);
      const g = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) g[i] = bin.charCodeAt(i);
      const frame = { gray: g, w, h };
      const base = W.__base(frame, { nDir, stride, edgeThreshold: thr });
      const { byId } = W.__obs(frame, { nDir, stride, edgeThreshold: thr });
      const T = C.hexTarget;
      const planeRms = (pts: Map<number, any>) => {
        const pairs = [...pts].filter(([id]) => T.byId.has(id)).map(([id, p]) => {
          const m = T.byId.get(id); return { sx: m.xMm, sy: m.yMm, dx: p.x, dy: p.y };
        });
        if (pairs.length < 5) return null;
        const fit = C.fitHomography(pairs);
        if (!fit) return null;
        const rs = pairs.map((p: any) => { const [x, y] = fit.map(p.sx, p.sy); return Math.hypot(x - p.dx, y - p.dy); });
        return { rms: Math.sqrt(rs.reduce((s: number, v: number) => s + v * v, 0) / rs.length), max: Math.max(...rs), n: pairs.length };
      };
      const fitted = new Map(), deltas: number[] = [];
      let nBad = 0, nFell = 0;
      for (const [id, b] of base) {
        const obs = byId.get(id);
        if (!obs) continue;
        const f = W.__fit(obs, b, { perspective: true });
        if (!f) continue;
        if (f.bad) { nBad++; continue; }        // a failed solve is not a measurement
        if (f.fellBack) nFell++;
        fitted.set(id, f); deltas.push(f.delta);
      }
      const moved = [...fitted].filter(([id]) => base.has(id))
        .map(([id, f]: any) => Math.hypot(f.x - base.get(id).x, f.y - base.get(id).y));
      // The fit refuses marks the baseline keeps, and dropping the two worst points flatters ANY
      // plane -- so the only fair column is the baseline restricted to the marks the fit accepted.
      const sameSubset = new Map([...base].filter(([id]) => fitted.has(id)));
      return { base: planeRms(base), baseSame: planeRms(sameSubset), fit: planeRms(fitted),
        deltas, moved, nBase: base.size, nFit: fitted.size, nBad, nFell };
    }, { b64: gray.toString("base64"), w: meta.w, h: meta.h, nDir: NDIR, stride: STRIDE, thr: meta.goldenThr ?? 12 });
    results.push({ name: n, ...r });
    const f = (x: any) => (x ? `${x.rms.toFixed(2)}/${x.max.toFixed(2)}(${x.n})` : "-");
    console.log(`${n.padEnd(22)} base ${f(r.base).padEnd(18)} same-subset ${f(r.baseSame).padEnd(18)} fit ${f(r.fit).padEnd(18)} delta p50 ${r.deltas.length ? pct(r.deltas, 0.5).toFixed(3) : "-"}mm  moved p50 ${r.moved.length ? pct(r.moved, 0.5).toFixed(2) : "-"}px  bad=${r.nBad} fellback=${r.nFell}`);
  }
  const pairs = results.filter((r) => r.baseSame && r.fit);
  console.log(`\n=== ${results.length} cases, plane rms (consistency, not accuracy) ===`);
  console.log(`  base all marks   ${fmt(results.map((r) => r.base?.rms).filter((x: any) => x != null))}`);
  console.log(`  base same subset ${fmt(pairs.map((r) => r.baseSame.rms))}`);
  console.log(`  fit  same subset ${fmt(pairs.map((r) => r.fit.rms))}`);
  const win = pairs.filter((r) => r.fit.rms < r.baseSame.rms).length;
  console.log(`  fit tighter on ${win}/${pairs.length} cases`);
  console.log(`  delta ${fmt(results.flatMap((r) => r.deltas))}`);
  if (OUT) writeFileSync(OUT, JSON.stringify(results, null, 1));
}

await browser.close();
