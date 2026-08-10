// Regenerate the BANK's labels with the expensive estimator.
//
// The split the bank exists to measure:
//   fast   -- what ships and runs on a live camera feed: one axis, stride 4, no refinement.
//   slow   -- what produces the labels the fast one is scored against: 12 directions,
//             stride 1, per-frame edge threshold, ring-lattice refinement per mark, and a
//             plane fitted to the mark METRICS as well as the centres.
// Scoring the fast path against labels the fast path produced measures nothing, so the
// labels have to come from the best estimator available, not from a cheaper ancestor.
//
// This drives the NOTEBOOK's relabelCase rather than reimplementing it (CLAUDE.md tip 17):
// the previous generator, golden-labels.ts, carried its own copy of the plane fit and the
// contrast veto, which is how the shipped labels drifted away from the notebook's best.
//
//   bun scratch/rmbt/golden-bank.ts                 # measure and report, write nothing
//   bun scratch/rmbt/golden-bank.ts --overlay       # + local PNGs for eye verification
//   bun scratch/rmbt/golden-bank.ts --write         # patch scratch/rmbt/bank/hexframes.json
//
// The overlays contain people. They stay in scratch/ and are never published.
import { chromium } from "playwright";
import { resolve } from "node:path";
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";

const NB = resolve("lopebooks/notebooks/tomlarkworthy_coded-landmark-tracking.html");
const BANK = resolve("scratch/rmbt/bank/hexframes.json");
const SNAP = resolve("scratch/rmbt/bank/hexframes-pre-refine.json");
const OVDIR = resolve("scratch/rmbt/bank-overlay");
const arg = (f: string, d: string) => process.argv.find((a) => a.startsWith(`--${f}=`))?.split("=")[1] ?? d;
const WRITE = process.argv.includes("--write");
const OVERLAY = process.argv.includes("--overlay");
const SCORE = process.argv.includes("--score");
const DISTORT = process.argv.includes("--distort");
const KFIT = process.argv.includes("--kfit");
const SHARP = process.argv.includes("--sharp");
const MODEL = process.argv.includes("--model");
const JUMP = process.argv.includes("--jump");
const SCALE = process.argv.includes("--scale");
const GRID = (process.argv.find((a) => a.startsWith("--grid="))?.split("=")[1] ?? "140:30,140:45,140:55,140:65,80:55,200:55")
  .split(",").map((p) => p.split(":").map(Number));
const NDIR = Number(arg("dirs", "12"));
const STRIDE = Number(arg("stride", "1"));
const ONLY = process.argv.find((a) => a.startsWith("--cases="))?.split("=")[1]?.split(",") ?? null;
// Force the edge threshold instead of sweeping, to ask whether a frame the sweep left with a
// plane-rejected mark measures cleanly somewhere else in the range.
const THRS = process.argv.find((a) => a.startsWith("--thr="))?.split("=")[1]?.split(",").map(Number) ?? null;

const P = (a: number[], p: number) =>
  a.length ? a.slice().sort((x, y) => x - y)[Math.min(a.length - 1, Math.round(p * (a.length - 1)))] : NaN;
const fmt = (a: number[]) =>
  a.length ? `n=${String(a.length).padStart(3)} p50=${P(a, 0.5).toFixed(3)} p90=${P(a, 0.9).toFixed(3)} max=${Math.max(...a).toFixed(3)}` : "n=0";

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

// Cells that exist only in the live notebook are mirrored as function sources in
// scratch/rmbt/livepatch/<cellName>.js (first line: `// inputs: a,b,c`). Applying them here
// keeps this harness measuring what the live notebook does until the next save-in-place.
// Without the fitRingLattice one, relabelCase's `m.Amm = f.A.map(...)` throws and no metric
// ever reaches the plane fit.
for (const f of readdirSync(resolve("scratch/rmbt/livepatch")).filter((f) => f.endsWith(".js"))) {
  const name = f.replace(/\.js$/, "");
  const text = readFileSync(resolve("scratch/rmbt/livepatch", f), "utf8");
  const inputs = (text.match(/^\/\/ inputs:\s*(.*)$/m)?.[1] ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const body = text.replace(/^\/\/ inputs:.*$/m, "").trim();
  console.log(`livepatch ${name}:`, await page.evaluate(({ name, inputs, body }) => {
    const rt = (window as any).__ojs_runtime;
    const v = [...rt._variables].find((z: any) => z._name === name);
    if (!v) return "MISSING";
    v.define(name, inputs, new Function(...inputs, "return (" + body + ")"));
    return `applied (${inputs.length} inputs)`;
  }, { name, inputs, body }));
}

const rows = await page.evaluate(async ({ nDir, stride, only, thrs }) => {
  const rt = (window as any).__ojs_runtime;
  const vars = [...rt._variables];
  const val = async (n: string) => { const v = vars.find((z: any) => z._name === n); return v ? await v._module.value(n) : null; };
  const bank = await val("hexFrameBank");
  const relabelCase = await val("relabelCase");

  const out: any[] = [];
  for (const b of bank) {
    if (only && !only.includes(b.name)) continue;
    const frame = { gray: b.frame.gray, w: b.frame.w, h: b.frame.h };
    const r = await relabelCase(frame, { nDir, stride, refine: true, ...(thrs ? { thresholds: thrs } : {}) });
    // How far each new label sits from the one currently shipped, so a regeneration that
    // quietly moves everything is visible rather than inferred.
    const prev = new Map((b.truth ?? []).map((t: any) => [t.id, t]));
    const labels = r.labels.map((L: any) => {
      const p = prev.get(L.id);
      return { ...L, movedFromShipped: p && L.x != null && p.x != null
        ? +Math.hypot(L.x - p.x, L.y - p.y).toFixed(2) : null };
    });
    out.push({
      name: b.name, thr: r.thr, ms: r.ms,
      planeRms: r.plane ? r.plane.rms : null,
      planeUsed: r.plane ? r.plane.used.length : 0,
      planeRejected: r.plane ? r.plane.rejected.length : 0,
      redundancy: r.plane && r.plane.metric ? r.plane.metric.redundancy : null,
      metricMm: r.plane && r.plane.metric ? r.plane.metric.rmsMm : null,
      deltaMm: r.refine ? r.refine.deltaMm : null,
      refineMs: r.refine ? r.refine.ms : null,
      labels
    });
  }
  return out;
}, { nDir: NDIR, stride: STRIDE, only: ONLY, thrs: THRS });

// ---- report -------------------------------------------------------------------------
const moved: number[] = [], resid: number[] = [], scores: number[] = [];
let nRef = 0, nMeas = 0, nPred = 0, nRej = 0, nNone = 0;
for (const r of rows) {
  const src: Record<string, number> = {};
  for (const L of r.labels) {
    src[L.src] = (src[L.src] ?? 0) + 1;
    if (L.src === "refined") nRef++; else if (L.src === "measured") nMeas++;
    else if (L.src === "predicted") nPred++; else if (L.src === "plane-rejected") nRej++;
    else nNone++;
    if (L.movedFromShipped != null) moved.push(L.movedFromShipped);
    if (L.planeResid != null) resid.push(L.planeResid);
    if (L.score != null) scores.push(L.score);
  }
  console.log(
    `${r.name.padEnd(20)} thr ${String(r.thr).padStart(2)}  plane ${String(r.planeRms).padStart(5)}` +
    `  used ${r.planeUsed} rej ${r.planeRejected}  redund ${r.redundancy ?? "-"}` +
    `  metric ${r.metricMm == null ? "-" : r.metricMm.toFixed(3) + "mm"}  delta ${r.deltaMm ?? "-"}mm` +
    `  ${Object.entries(src).map(([k, v]) => `${v}${k[0]}`).join(" ")}  ${r.ms}ms`);
  const far = r.labels.filter((L: any) => L.movedFromShipped != null && L.movedFromShipped > 2);
  for (const L of far)
    console.log(`${"".padEnd(20)}   id ${String(L.id).padStart(2)} moved ${L.movedFromShipped}px from shipped` +
      `  src ${L.src} score ${L.score} resid ${L.planeResid}`);
}
console.log(`\n=== ${rows.length} bank frames, expensive labeller (${NDIR} dirs, stride ${STRIDE}, refine on) ===`);
console.log(`  sources: ${nRef} refined, ${nMeas} measured, ${nPred} predicted, ${nRej} plane-rejected, ${nNone} none`);
console.log(`  moved from shipped labels  ${fmt(moved)}`);
console.log(`  plane residual             ${fmt(resid)}`);
console.log(`  pixel contrast score       ${fmt(scores)}`);
const planes = rows.map((r: any) => r.planeRms).filter((x: any) => x != null);
console.log(`  plane rms                  ${fmt(planes)}`);

// ---- overlays for eye verification (LOCAL ONLY -- these frames contain people) --------
if (OVERLAY) {
  if (!existsSync(OVDIR)) mkdirSync(OVDIR, { recursive: true });
  const urls = await page.evaluate(async ({ payload }) => {
    const rt = (window as any).__ojs_runtime;
    const vars = [...rt._variables];
    const val = async (n: string) => { const v = vars.find((z: any) => z._name === n); return v ? await v._module.value(n) : null; };
    const bank = await val("hexFrameBank");
    const byName = new Map(payload.map((r: any) => [r.name, r]));
    const out: any[] = [];
    for (const b of bank) {
      const r: any = byName.get(b.name);
      if (!r) continue;
      const cv = document.createElement("canvas");
      cv.width = b.frame.w; cv.height = b.frame.h;
      const cx = cv.getContext("2d")!;
      const img = cx.createImageData(b.frame.w, b.frame.h);
      for (let i = 0; i < b.frame.gray.length; i++) {
        const g = b.frame.gray[i];
        img.data[i * 4] = g; img.data[i * 4 + 1] = g; img.data[i * 4 + 2] = g; img.data[i * 4 + 3] = 255;
      }
      cx.putImageData(img, 0, 0);
      const prev = new Map((b.truth ?? []).map((t: any) => [t.id, t]));
      for (const L of r.labels) {
        const p = prev.get(L.id);
        // magenta = the label being replaced, so a big move is visible as a pair
        if (p && p.x != null) {
          cx.strokeStyle = "magenta"; cx.lineWidth = 1;
          cx.beginPath(); cx.arc(p.x, p.y, 4, 0, 7); cx.stroke();
        }
        if (L.x == null) continue;
        const col = L.src === "refined" ? "#0f0" : L.src === "measured" ? "#8f8"
          : L.src === "predicted" ? "cyan" : "orange";
        cx.strokeStyle = col; cx.lineWidth = 2;
        if (L.outline) {
          cx.beginPath();
          L.outline.forEach(([x, y]: number[], i: number) => i ? cx.lineTo(x, y) : cx.moveTo(x, y));
          cx.closePath(); cx.stroke();
        }
        cx.beginPath(); cx.moveTo(L.x - 8, L.y); cx.lineTo(L.x + 8, L.y);
        cx.moveTo(L.x, L.y - 8); cx.lineTo(L.x, L.y + 8); cx.stroke();
        cx.fillStyle = col; cx.font = "12px monospace";
        cx.fillText(`${L.id} ${L.src[0]}${L.ringN ?? ""} s${Math.round(L.score ?? 0)}`, L.x + 10, L.y - 10);
      }
      cx.fillStyle = "yellow"; cx.font = "14px monospace";
      cx.fillText(`${b.name}  thr ${r.thr}  plane ${r.planeRms}  delta ${r.deltaMm}mm`, 8, 18);
      out.push({ name: b.name, url: cv.toDataURL("image/png") });
    }
    return out;
  }, { payload: rows });
  for (const u of urls)
    writeFileSync(resolve(OVDIR, `${u.name}.png`), Buffer.from(u.url.split(",")[1], "base64"));
  console.log(`\n  ${urls.length} overlays written to ${OVDIR} (local only -- these frames contain people)`);
}


if (SCORE) {
  // Re-score the FAST path -- what runs on a live feed -- against the labels the expensive
  // one produced. Same detector on both sides; only the label set changes, so the delta is
  // attributable to the relabelling and nothing else.
  const prev = JSON.parse(readFileSync(SNAP, "utf8"));
  const rows2 = await page.evaluate(async ({ prevJson }) => {
    const rt = (window as any).__ojs_runtime;
    const vars = [...rt._variables];
    const val = async (n: string) => { const v = vars.find((z: any) => z._name === n); return v ? await v._module.value(n) : null; };
    const bank = await val("hexFrameBank");
    const analyzeFrameMan = await val("analyzeFrameMan");
    const hexRigOpts = await val("hexRigOpts");
    const hexRigScore = await val("hexRigScore");
    const oldBy = new Map(prevJson.map((e: any) => [e.name, e.truth]));
    const out: any[] = [];
    for (const b of bank) {
      const res = analyzeFrameMan({ gray: b.frame.gray, w: b.frame.w, h: b.frame.h }, hexRigOpts);
      const mk = (truth: any) => {
        const s = hexRigScore(res, truth);
        const d = s.marks.map((m: any) => m.residualPx).filter((x: any) => x != null).sort((x: number, y: number) => x - y);
        return { read: s.counts.read, loc: s.counts.located, miss: s.counts.missing,
          wrong: s.counts.misplaced, off: s.offTarget.length, score: s.score,
          p50: d.length ? +d[d.length >> 1].toFixed(2) : null,
          worst: d.length ? +d[d.length - 1].toFixed(2) : null, resids: d };
      };
      out.push({ name: b.name, ms: Math.round(res.ms),
        neu: mk(b.truth), alt: mk(oldBy.get(b.name)) });
    }
    return out;
  }, { prevJson: prev });

  const tot = (k: string, arm: string) => rows2.reduce((s: number, r: any) => s + (r[arm][k] ?? 0), 0);
  const allR = (arm: string) => rows2.flatMap((r: any) => r[arm].resids);
  console.log(`\n=== FAST path at hexRigOpts, scored against each label set ===`);
  for (const r of rows2)
    console.log(`${r.name.padEnd(20)} ${String(r.ms).padStart(3)}ms   old labels ${r.alt.read}/7 score ${String(r.alt.score).padStart(2)} p50 ${String(r.alt.p50).padStart(5)} worst ${String(r.alt.worst).padStart(6)}` +
      `   ->  new labels ${r.neu.read}/7 score ${String(r.neu.score).padStart(2)} p50 ${String(r.neu.p50).padStart(5)} worst ${String(r.neu.worst).padStart(6)}`);
  for (const arm of ["alt", "neu"]) {
    console.log(`  ${arm === "alt" ? "OLD labels" : "NEW labels"}: read ${tot("read", arm)}/112` +
      `  located ${tot("loc", arm)}  missing ${tot("miss", arm)}  misplaced ${tot("wrong", arm)}` +
      `  offTarget ${tot("off", arm)}  score ${tot("score", arm)}   residual ${fmt(allR(arm))}`);
  }
}


if (DISTORT) {
  // WHY ARE THE PHONE FRAMES WORSE?
  //
  // A homography is a global projective map. A real lens is not: it adds radial distortion,
  // which changes LOCAL magnification as a function of distance from the image centre, and
  // does so ANISOTROPICALLY -- for a distortion r' = r(1 + k r^2) the tangential
  // magnification goes as (1 + k r^2) and the radial one as (1 + 3k r^2). No homography has
  // a term for that.
  //
  // The ring fit measures each mark's full local 2x2 A (px -> mm), so with J the fitted
  // homography's Jacobian (mm -> px), E = A.J is dimensionless and is the identity when the
  // projective model is complete. Decompose E along the radial and tangential directions at
  // that mark and the distortion signature is e_rad/e_tan drifting from 1 with r^2 -- which
  // paper curl, motion blur and defocus do not do, because none of them know where the
  // image centre is.
  //
  // Control: the same statistic on renderHexScene, which is projective by construction and
  // must come back flat. Without it a nonzero slope proves nothing about lenses.
  const rows3 = await page.evaluate(async ({ nDir, stride }) => {
    const rt = (window as any).__ojs_runtime;
    const vars = [...rt._variables];
    const val = async (n: string) => { const v = vars.find((z: any) => z._name === n); return v ? await v._module.value(n) : null; };
    const bank = await val("hexFrameBank");
    const T = await val("hexTarget");
    const denseRotations = await val("denseRotations");
    const ringObservations = await val("ringObservations");
    const fitRingLattice = await val("fitRingLattice");
    const fitHomography = await val("fitHomography");
    const renderHexScene = await val("renderHexScene");

    const jac = (h: any, X: number, Y: number) => {
      const w = h[6] * X + h[7] * Y + h[8];
      const x = (h[0] * X + h[1] * Y + h[2]) / w, y = (h[3] * X + h[4] * Y + h[5]) / w;
      return [(h[0] - x * h[6]) / w, (h[1] - x * h[7]) / w, (h[3] - y * h[6]) / w, (h[4] - y * h[7]) / w];
    };
    const mul = (A: number[], B: number[]) =>
      [A[0] * B[0] + A[1] * B[2], A[0] * B[1] + A[1] * B[3],
       A[2] * B[0] + A[3] * B[2], A[2] * B[1] + A[3] * B[3]];
    const ap = (M: number[], u: number[]) => [M[0] * u[0] + M[1] * u[1], M[2] * u[0] + M[3] * u[1]];

    const analyse = (frame: any, labels: any[], thr: number, tag: string) => {
      const rots = denseRotations(frame, nDir);
      const ring = ringObservations(rots, { stride, edgeThreshold: thr });
      const pairs: any[] = [], metrics = new Map();
      for (const L of labels) {
        if (!T.byId.has(L.id) || L.x == null) continue;
        const mk = T.byId.get(L.id);
        pairs.push({ sx: mk.xMm, sy: mk.yMm, dx: L.x, dy: L.y });
        const obs = ring.get(L.id);
        if (!obs) continue;
        const f = fitRingLattice(obs, { x: L.x, y: L.y, radiusPx: L.radiusPx }, {});
        if (f && f.A) metrics.set(L.id, f.A.map((v: number) => v * T.mmPerUnit));
      }
      if (pairs.length < 4) return null;
      const fit = fitHomography(pairs);
      if (!fit) return null;
      const h = fit.H;
      const cx = frame.w / 2, cy = frame.h / 2;
      const half = Math.hypot(cx, cy);
      const pts: any[] = [];
      for (const L of labels) {
        const A = metrics.get(L.id);
        if (!A || !T.byId.has(L.id)) continue;
        const mk = T.byId.get(L.id);
        const E = mul(A, jac(h, mk.xMm, mk.yMm));   // px -> px, identity if projective
        const dx = L.x - cx, dy = L.y - cy;
        const r = Math.hypot(dx, dy);
        if (r < 1e-6) continue;
        const ur = [dx / r, dy / r], ut = [-dy / r, dx / r];
        const eRad = Math.hypot(...ap(E, ur));
        const eTan = Math.hypot(...ap(E, ut));
        pts.push({ id: L.id, rn: r / half, eRad, eTan, ratio: eRad / eTan,
                   iso: Math.sqrt(Math.abs(E[0] * E[3] - E[1] * E[2])) });
      }
      // least squares of (ratio - 1) on rn^2 through the origin
      let sxy = 0, sxx = 0;
      for (const p of pts) { const x = p.rn * p.rn; sxy += x * (p.ratio - 1); sxx += x * x; }
      return { tag, n: pts.length, slope: sxx ? sxy / sxx : null, pts };
    };

    const out: any[] = [];
    for (const b of bank) {
      const labels = b.truth.map((t: any) => ({ id: t.id, x: t.x, y: t.y, radiusPx: t.radiusPx }));
      const r = analyse({ gray: b.frame.gray, w: b.frame.w, h: b.frame.h }, labels, b.goldenThr ?? 12, b.name);
      if (r) out.push({ ...r, phone: /^phone-/.test(b.name), w: b.frame.w, h: b.frame.h,
                        radiusPx: labels.reduce((s: number, l: any) => s + l.radiusPx, 0) / labels.length });
    }
    // projective-by-construction control
    for (const sc of [{ yawDeg: 20, tiltDeg: 12, rollDeg: 0, fill: 0.8, seed: 2 },
                      { yawDeg: 15, tiltDeg: 30, rollDeg: 45, fill: 0.9, seed: 6 }]) {
      const scene = renderHexScene({ ...sc, W: 960, H: 720 });
      const labels = scene.truth.map((t: any) => ({ id: t.id, x: t.x - 0.5, y: t.y - 0.5, radiusPx: 40 }));
      const r = analyse({ gray: scene.gray, w: scene.w, h: scene.h }, labels, 12, `SYNTH yaw${sc.yawDeg} tilt${sc.tiltDeg}`);
      if (r) out.push({ ...r, synth: true });
    }
    return out;
  }, { nDir: NDIR, stride: STRIDE });

  console.log(`\n=== local metric vs the fitted homography: E = A.J, identity if projective ===`);
  console.log(`    e_rad/e_tan drifting from 1 with r^2 is radial lens distortion; nothing else`);
  console.log(`    in the scene knows where the image centre is.\n`);
  const grp: any = { phone: [], cam: [], synth: [] };
  for (const r of rows3.sort((a: any, b: any) => (b.slope ?? 0) - (a.slope ?? 0))) {
    const k = r.synth ? "synth" : r.phone ? "phone" : "cam";
    grp[k].push(...r.pts);
    const rn = r.pts.map((p: any) => p.rn);
    console.log(`${r.tag.padEnd(22)} ${(r.synth ? "SYNTH" : r.phone ? "phone" : "cam  ")}` +
      `  n ${r.n}  slope ${r.slope == null ? "-" : (r.slope >= 0 ? "+" : "") + r.slope.toFixed(4)}` +
      `  r/half ${Math.min(...rn).toFixed(2)}-${Math.max(...rn).toFixed(2)}` +
      `  markR ${r.radiusPx ? r.radiusPx.toFixed(0) + "px" : "-"}`);
  }
  for (const k of ["phone", "cam", "synth"]) {
    const pts = grp[k];
    if (!pts.length) continue;
    let sxy = 0, sxx = 0;
    for (const p of pts) { const x = p.rn * p.rn; sxy += x * (p.ratio - 1); sxx += x * x; }
    const slope = sxx ? sxy / sxx : 0;
    const dev = pts.map((p: any) => Math.abs(p.ratio - 1));
    const iso = pts.map((p: any) => Math.abs(p.iso - 1));
    console.log(`  ${k.padEnd(6)} n=${String(pts.length).padStart(3)}  pooled slope ${(slope >= 0 ? "+" : "") + slope.toFixed(4)}` +
      `   |e_rad/e_tan - 1| ${fmt(dev)}   |isotropic scale - 1| ${fmt(iso)}`);
  }
}


if (KFIT) {
  // Independent confirmation. --distort measures anisotropy from the ring METRIC (each mark's
  // local 2x2). This asks a disjoint question of the same frames: undistort the label CENTRES
  // about the image centre with one shared coefficient and refit the homography. Centres and
  // local shape are different measurements, so if a k derived from one tightens the other,
  // the lens is the explanation rather than a coincidence of that estimator.
  //
  // ONE k per device group across all its frames, not one per frame: 7 points against an
  // 8-DOF homography leaves little room, and a per-frame k would soak up paper curl and call
  // it optics. A lens has ONE k, so sharing it is both the honest constraint and the test.
  const rows4 = await page.evaluate(async () => {
    const rt = (window as any).__ojs_runtime;
    const vars = [...rt._variables];
    const val = async (n: string) => { const v = vars.find((z: any) => z._name === n); return v ? await v._module.value(n) : null; };
    const bank = await val("hexFrameBank");
    const T = await val("hexTarget");
    const fitHomography = await val("fitHomography");

    const rmsAt = (b: any, k: number) => {
      const cx = b.frame.w / 2, cy = b.frame.h / 2, half = Math.hypot(cx, cy);
      const pairs: any[] = [];
      for (const t of b.truth) {
        if (!T.byId.has(t.id) || t.x == null) continue;
        const dx = t.x - cx, dy = t.y - cy;
        const rn = Math.hypot(dx, dy) / half;
        const g = 1 / (1 + k * rn * rn);          // observed -> ideal
        const mk = T.byId.get(t.id);
        pairs.push({ sx: mk.xMm, sy: mk.yMm, dx: cx + dx * g, dy: cy + dy * g });
      }
      if (pairs.length < 4) return null;
      const f = fitHomography(pairs);
      return f ? f.rmsResidual : null;
    };

    const ks: number[] = [];
    for (let k = -0.30; k <= 0.3001; k += 0.005) ks.push(+k.toFixed(3));
    const out: any[] = [];
    for (const b of bank) {
      const curve = ks.map((k) => rmsAt(b, k));
      out.push({ name: b.name, phone: /^phone-/.test(b.name), ks, curve });
    }
    return out;
  }, {});

  const ks = rows4[0].ks;
  const groups: any = { phone: rows4.filter((r: any) => r.phone), cam: rows4.filter((r: any) => !r.phone) };
  const best: any = {};
  for (const g of ["phone", "cam"]) {
    // shared k = the one minimising total squared residual over the group's frames
    let bi = 0, bv = Infinity;
    ks.forEach((k: number, i: number) => {
      let ss = 0, n = 0;
      for (const r of groups[g]) { const v = r.curve[i]; if (v != null) { ss += v * v; n++; } }
      const rms = n ? Math.sqrt(ss / n) : Infinity;
      if (rms < bv) { bv = rms; bi = i; }
    });
    best[g] = { k: ks[bi], i: bi, rms: bv };
  }
  const i0 = ks.indexOf(0);
  console.log(`\n=== one shared radial coefficient per device group, fitted on CENTRES ===`);
  for (const g of ["phone", "cam"]) {
    const b = best[g];
    let ss = 0, n = 0;
    for (const r of groups[g]) { const v = r.curve[i0]; if (v != null) { ss += v * v; n++; } }
    const rms0 = Math.sqrt(ss / n);
    console.log(`  ${g.padEnd(6)} ${String(groups[g].length).padStart(2)} frames   k=0 rms ${rms0.toFixed(3)}px` +
      `  ->  best k ${(b.k >= 0 ? "+" : "") + b.k.toFixed(3)}  rms ${b.rms.toFixed(3)}px` +
      `   (${(100 * (1 - b.rms / rms0)).toFixed(0)}% tighter)`);
    for (const r of groups[g])
      console.log(`      ${r.name.padEnd(20)} rms ${r.curve[i0].toFixed(3)} -> ${r.curve[b.i].toFixed(3)}` +
        `   own best k ${ks[r.curve.indexOf(Math.min(...r.curve.filter((x: any) => x != null)))]}`);
  }
  console.log(`  cross-check: applying the PHONE k to the camera frames and vice versa`);
  for (const g of ["phone", "cam"]) {
    const other = g === "phone" ? "cam" : "phone";
    const j = best[other].i;
    let ss = 0, n = 0;
    for (const r of groups[g]) { const v = r.curve[j]; if (v != null) { ss += v * v; n++; } }
    console.log(`      ${g.padEnd(6)} with ${other}'s k=${best[other].k}: rms ${Math.sqrt(ss / n).toFixed(3)}px` +
      ` (own best ${best[g].rms.toFixed(3)})`);
  }
}


if (SHARP) {
  // Is it BLUR? The ring-lattice residual is 0.65px on phone frames against 0.27px on camera
  // ones, so the edges themselves are worse -- but "worse" could be blur (edges soft) or noise
  // (edges sharp but jittery). They are separable: walk a radial profile out from each mark
  // centre and, at every gradient peak, take the edge's own rise width as
  // amplitude / |gradient|, which is the width of the linear ramp that would produce that
  // slope. Blur widens it; noise does not.
  //
  // Reported both absolutely and against the ring pitch, because the phone marks are larger
  // (70px radius against 45px) and the same absolute blur costs a big mark proportionally
  // less. renderHexScene is the sharp reference.
  const rows5 = await page.evaluate(async () => {
    const rt = (window as any).__ojs_runtime;
    const vars = [...rt._variables];
    const val = async (n: string) => { const v = vars.find((z: any) => z._name === n); return v ? await v._module.value(n) : null; };
    const bank = await val("hexFrameBank");
    const L = await val("manLayout");
    const renderHexScene = await val("renderHexScene");

    const measure = (frame: any, marks: any[]) => {
      const { gray, w, h } = frame;
      const at = (x: number, y: number) => {
        const xi = Math.max(0, Math.min(w - 1, Math.round(x)));
        const yi = Math.max(0, Math.min(h - 1, Math.round(y)));
        return gray[yi * w + xi];
      };
      const widths: number[] = [], pitches: number[] = [], amps: number[] = [];
      for (const m of marks) {
        if (m.x == null || !m.radiusPx) continue;
        const R = m.radiusPx;
        const pitch = R / (L.R / L.half) * 1;      // px per half-tooth: R px spans L.R/L.half of them
        for (let a = 0; a < 16; a++) {
          const th = (a / 16) * 2 * Math.PI, ux = Math.cos(th), uy = Math.sin(th);
          const N = Math.round(R * 1.02);
          const prof: number[] = [];
          for (let i = 0; i <= N; i++) prof.push(at(m.x + ux * i, m.y + uy * i));
          for (let i = 3; i < N - 3; i++) {
            const g = (prof[i + 1] - prof[i - 1]) / 2;
            const gp = (prof[i] - prof[i - 2]) / 2, gn = (prof[i + 2] - prof[i]) / 2;
            if (Math.abs(g) < 6) continue;
            if (Math.abs(g) < Math.abs(gp) || Math.abs(g) < Math.abs(gn)) continue;  // local peak only
            let lo = prof[i], hi = prof[i];
            for (let k = -4; k <= 4; k++) { lo = Math.min(lo, prof[i + k]); hi = Math.max(hi, prof[i + k]); }
            const amp = hi - lo;
            if (amp < 25) continue;                 // a real ring edge, not a noise ripple
            widths.push(amp / Math.abs(g));
            amps.push(amp);
          }
        }
        pitches.push(pitch);
      }
      const P = (a: number[], p: number) => a.length ? a.slice().sort((x, y) => x - y)[Math.min(a.length - 1, Math.round(p * (a.length - 1)))] : NaN;
      return { nEdges: widths.length, widthPx: P(widths, 0.5), amp: P(amps, 0.5), pitch: P(pitches, 0.5) };
    };

    const out: any[] = [];
    for (const b of bank) {
      const marks = b.truth.map((t: any) => ({ x: t.x, y: t.y, radiusPx: t.radiusPx }));
      out.push({ name: b.name, phone: /^phone-/.test(b.name),
                 radiusPx: marks.reduce((s: number, m: any) => s + m.radiusPx, 0) / marks.length,
                 ...measure({ gray: b.frame.gray, w: b.frame.w, h: b.frame.h }, marks) });
    }
    for (const sc of [{ yawDeg: 20, tiltDeg: 12, rollDeg: 0, fill: 0.8, seed: 2 }]) {
      const scene = renderHexScene({ ...sc, W: 960, H: 720 });
      const marks = scene.truth.map((t: any) => ({ x: t.x - 0.5, y: t.y - 0.5, radiusPx: 40 }));
      out.push({ name: "SYNTH (sharp reference)", synth: true, radiusPx: 40,
                 ...measure({ gray: scene.gray, w: scene.w, h: scene.h }, marks) });
    }
    return out;
  }, {});

  console.log(`\n=== edge rise width: amplitude / |gradient| at each ring boundary ===`);
  console.log(`${"frame".padEnd(24)}${"markR".padStart(6)}${"edges".padStart(7)}${"amp".padStart(6)}${"width px".padStart(10)}${"width/pitch".padStart(13)}`);
  const grp: any = { phone: [], cam: [] };
  for (const r of rows5.sort((a: any, b: any) => (b.widthPx ?? 0) - (a.widthPx ?? 0))) {
    const wp = r.widthPx / r.pitch;
    if (!r.synth) grp[r.phone ? "phone" : "cam"].push({ w: r.widthPx, wp });
    console.log(`${r.name.padEnd(24)}${r.radiusPx.toFixed(0).padStart(6)}${String(r.nEdges).padStart(7)}` +
      `${r.amp.toFixed(0).padStart(6)}${r.widthPx.toFixed(2).padStart(10)}${wp.toFixed(2).padStart(13)}`);
  }
  for (const k of ["phone", "cam"]) {
    const a = grp[k];
    console.log(`  ${k.padEnd(6)} n=${a.length}  width ${fmt(a.map((x: any) => x.w))}   width/pitch ${fmt(a.map((x: any) => x.wp))}`);
  }
}


if (MODEL) {
  // Is the phone penalty MODEL ORDER rather than image quality? fitRingLattice models one
  // mark as a local affine map plus two perspective terms. That approximation degrades as the
  // mark subtends more of the view, and the phone frames are shot close: mmPerPx 0.30-0.45
  // against 0.46-0.77, so their marks image about 1.6x larger.
  //
  // If model order is the limit, the two perspective terms must buy MORE on the big marks
  // than on the small ones -- a claim that can fail. Residual is reported in layout units,
  // which are physical, so magnification cannot flatter either group.
  const rows6 = await page.evaluate(async ({ nDir, stride }) => {
    const rt = (window as any).__ojs_runtime;
    const vars = [...rt._variables];
    const val = async (n: string) => { const v = vars.find((z: any) => z._name === n); return v ? await v._module.value(n) : null; };
    const bank = await val("hexFrameBank");
    const T = await val("hexTarget");
    const denseRotations = await val("denseRotations");
    const ringObservations = await val("ringObservations");
    const fitRingLattice = await val("fitRingLattice");

    const out: any[] = [];
    for (const b of bank) {
      const frame = { gray: b.frame.gray, w: b.frame.w, h: b.frame.h };
      const rots = denseRotations(frame, nDir);
      const ring = ringObservations(rots, { stride, edgeThreshold: b.goldenThr ?? 12 });
      const aff: number[] = [], per: number[] = [], rad: number[] = [];
      let nPer = 0, n = 0;
      for (const t of b.truth) {
        const obs = ring.get(t.id);
        if (!obs || !T.byId.has(t.id)) continue;
        const init = { x: t.x, y: t.y, radiusPx: t.radiusPx };
        const a = fitRingLattice(obs, init, { perspective: false });
        const p = fitRingLattice(obs, init, {});
        if (!a || !p) continue;
        aff.push(a.rms); per.push(p.rms); rad.push(t.radiusPx);
        if (p.model === "perspective") nPer++;
        n++;
      }
      const P = (x: number[], q: number) => x.length ? x.slice().sort((u, v) => u - v)[Math.min(x.length - 1, Math.round(q * (x.length - 1)))] : NaN;
      out.push({ name: b.name, phone: /^phone-/.test(b.name), n, nPer,
                 radiusPx: P(rad, 0.5), affRms: P(aff, 0.5), perRms: P(per, 0.5) });
    }
    return out;
  }, { nDir: NDIR, stride: STRIDE });

  console.log(`\n=== ring-lattice residual (LAYOUT UNITS, physical) with and without the perspective pair ===`);
  console.log(`${"frame".padEnd(22)}${"markR".padStart(6)}${"affine".padStart(9)}${"+persp".padStart(9)}${"gain".padStart(8)}${"persp kept".padStart(12)}`);
  const grp: any = { phone: [], cam: [] };
  for (const r of rows6.sort((a: any, b: any) => b.radiusPx - a.radiusPx)) {
    const gain = 1 - r.perRms / r.affRms;
    grp[r.phone ? "phone" : "cam"].push({ ...r, gain });
    console.log(`${r.name.padEnd(22)}${r.radiusPx.toFixed(0).padStart(6)}${r.affRms.toFixed(3).padStart(9)}` +
      `${r.perRms.toFixed(3).padStart(9)}${(100 * gain).toFixed(0).padStart(7)}%${(r.nPer + "/" + r.n).padStart(12)}`);
  }
  for (const k of ["phone", "cam"]) {
    const a = grp[k];
    console.log(`  ${k.padEnd(6)} n=${a.length}  markR p50 ${fmt(a.map((x: any) => x.radiusPx)).split(" ")[1]}` +
      `  affine ${fmt(a.map((x: any) => x.affRms))}`);
    console.log(`         ${"".padEnd(6)}  +persp ${fmt(a.map((x: any) => x.perRms))}   median gain ${(100 * a.map((x: any) => x.gain).sort((u: number, v: number) => u - v)[a.length >> 1]).toFixed(0)}%`);
  }
}


if (JUMP) {
  // Is the guard protecting against a real divergence, or just miscalibrated? Record every
  // mark's perspective solve regardless of the verdict: how far it moved the centre (as a
  // FRACTION of the mark radius, which is the scale the question lives at) and whether it
  // actually lowered the residual. A miscalibrated guard looks like large jumps that also
  // improve rms; a necessary guard looks like large jumps that make rms worse.
  const rows7 = await page.evaluate(async ({ nDir, stride }) => {
    const rt = (window as any).__ojs_runtime;
    const vars = [...rt._variables];
    const val = async (n: string) => { const v = vars.find((z: any) => z._name === n); return v ? await v._module.value(n) : null; };
    const bank = await val("hexFrameBank");
    const T = await val("hexTarget");
    const denseRotations = await val("denseRotations");
    const ringObservations = await val("ringObservations");
    const fitRingLattice = await val("fitRingLattice");
    const out: any[] = [];
    for (const b of bank) {
      const frame = { gray: b.frame.gray, w: b.frame.w, h: b.frame.h };
      const rots = denseRotations(frame, nDir);
      const ring = ringObservations(rots, { stride, edgeThreshold: b.goldenThr ?? 12 });
      for (const t of b.truth) {
        const obs = ring.get(t.id);
        if (!obs || !T.byId.has(t.id)) continue;
        // jumpMax huge so the guard never fires and the diagnostic is always populated
        const f = fitRingLattice(obs, { x: t.x, y: t.y, radiusPx: t.radiusPx }, { jumpMax: 1e9 });
        if (!f || !f.diag) continue;
        const d = f.diag;
        out.push({ name: b.name, phone: /^phone-/.test(b.name), id: t.id, radiusPx: t.radiusPx,
          jump: d.jump, jumpFrac: d.jump / t.radiusPx, affRms: d.affRms, perRms: d.perRms,
          better: d.perRms <= d.affRms, gain: 1 - d.perRms / d.affRms });
      }
    }
    return out;
  }, { nDir: NDIR, stride: STRIDE });

  for (const g of [true, false]) {
    const a = rows7.filter((r: any) => r.phone === g);
    const wouldReject = a.filter((r: any) => r.jump > 1);
    const rejButBetter = wouldReject.filter((r: any) => r.better);
    console.log(`\n  ${g ? "phone" : "cam  "} n=${a.length} marks`);
    console.log(`     jump px            ${fmt(a.map((r: any) => r.jump))}`);
    console.log(`     jump / mark radius ${fmt(a.map((r: any) => r.jumpFrac))}`);
    console.log(`     perspective lowers rms on ${a.filter((r: any) => r.better).length}/${a.length}` +
      `   median gain ${(100 * a.map((r: any) => r.gain).sort((x: number, y: number) => x - y)[a.length >> 1]).toFixed(0)}%`);
    console.log(`     the jump<=1px guard would reject ${wouldReject.length}, of which ${rejButBetter.length} IMPROVE rms` +
      ` (median gain ${rejButBetter.length ? (100 * rejButBetter.map((r: any) => r.gain).sort((x: number, y: number) => x - y)[rejButBetter.length >> 1]).toFixed(0) : "-"}%)`);
  }
  // where should the bound sit?
  console.log(`\n  candidate bounds, over all ${rows7.length} marks:`);
  for (const [lab, f] of [["1px (current)", (r: any) => r.jump <= 1],
                          ["2% of radius", (r: any) => r.jumpFrac <= 0.02],
                          ["4% of radius", (r: any) => r.jumpFrac <= 0.04],
                          ["8% of radius", (r: any) => r.jumpFrac <= 0.08]] as any) {
    const kept = rows7.filter((r: any) => f(r) && r.better);
    const badKept = rows7.filter((r: any) => f(r) && !r.better);
    console.log(`     ${lab.padEnd(14)} keeps ${String(kept.length).padStart(3)}/${rows7.length}` +
      `  admits ${badKept.length} that do NOT improve rms`);
  }
}


if (SCALE) {
  // The gap that let the pixel-scaled guard through: every synthetic scene in the notebook
  // images marks at 40-65px radius, and the guard only misbehaves above that. So sweep
  // magnification with truth known, and watch the fraction of marks that KEEP the
  // perspective model -- that column is the direct tripwire for a bound in the wrong units.
  const rows8 = await page.evaluate(async ({ nDir, stride }) => {
    const rt = (window as any).__ojs_runtime;
    const vars = [...rt._variables];
    const val = async (n: string) => { const v = vars.find((z: any) => z._name === n); return v ? await v._module.value(n) : null; };
    const T = await val("hexTarget");
    const renderHexScene = await val("renderHexScene");
    const denseRotations = await val("denseRotations");
    const denseLabel = await val("denseLabel");
    const ringObservations = await val("ringObservations");
    const fitRingLattice = await val("fitRingLattice");

    const out: any[] = [];
    for (const [dPx, tilt] of (cfg.grid as any[])) {
      const scale = dPx / T.diameterMm;
      const H = Math.round((Math.max(T.heightMm, T.widthMm) * scale) / 0.8);
      const W = Math.round((H * 16) / 9);
      const scene = renderHexScene({ target: T, W, H, fill: (T.heightMm * scale) / H,
        yawDeg: 10, tiltDeg: tilt, rollDeg: 0, blur: 1.0, noise: 4, seed: 11 });
      const frame = { gray: scene.gray, w: scene.w, h: scene.h };
      // renderHexScene samples pixel px at px+0.25/px+0.75: index px is continuous px+0.5
      const truth = new Map(scene.truth.map((t: any) => [t.id, { x: t.x - 0.5, y: t.y - 0.5 }]));
      const rots = denseRotations(frame, nDir);
      const d = denseLabel(frame, { nDir, stride, rots, detector: { edgeThreshold: 12 } });
      const marks = d.marks.filter((m: any) => m.x != null && m.dirs >= 3 && T.byId.has(m.id));
      const ring = ringObservations(rots, { stride, edgeThreshold: 12 });
      const eBase: number[] = [], eRef: number[] = [], rr: number[] = [];
      let nPer = 0, n = 0;
      for (const m of marks) {
        const t = truth.get(m.id); if (!t) continue;
        eBase.push(Math.hypot(m.x - t.x, m.y - t.y));
        const obs = ring.get(m.id);
        const f = obs ? fitRingLattice(obs, m, {}) : null;
        if (!f) continue;
        eRef.push(Math.hypot(f.x - t.x, f.y - t.y));
        rr.push(f.rms);
        if (f.model === "perspective") nPer++;
        n++;
      }
      const P = (a: number[], q: number) => a.length ? a.slice().sort((x, y) => x - y)[Math.min(a.length - 1, Math.round(q * (a.length - 1)))] : NaN;
      const radius = dPx / 2;
      out.push({ dPx, tilt, radius, nMarks: marks.length, n, nPer,
        base: P(eBase, 0.5), ref: P(eRef, 0.5), refMax: eRef.length ? Math.max(...eRef) : NaN,
        refFrac: P(eRef, 0.5) / radius, rms: P(rr, 0.5) });
    }
    return out;
  }, { nDir: NDIR, stride: STRIDE, cfg: { grid: GRID } });

  console.log(`\n=== refinement accuracy vs magnification, truth known (yaw 10, tilt 30) ===`);
  console.log(`${"mark ⌀".padStart(8)}${"tilt".padStart(6)}${"radius".padStart(8)}${"marks".padStart(7)}${"persp kept".padStart(12)}` +
    `${"base err".padStart(10)}${"refined".padStart(9)}${"worst".padStart(8)}${"ref/radius".padStart(12)}`);
  for (const r of rows8)
    console.log(`${(r.dPx + "px").padStart(8)}${(r.tilt + "°").padStart(6)}${r.radius.toFixed(0).padStart(8)}${String(r.nMarks).padStart(7)}` +
      `${(r.nPer + "/" + r.n).padStart(12)}${r.base.toFixed(3).padStart(10)}${r.ref.toFixed(3).padStart(9)}` +
      `${r.refMax.toFixed(3).padStart(8)}${(r.refFrac * 1000).toFixed(2).padStart(11)}‰`);
}

// ---- write --------------------------------------------------------------------------
if (WRITE) {
  const bank = JSON.parse(readFileSync(BANK, "utf8"));
  // Write-once. A previous relabel lost its pristine captures to an unconditional backup
  // copy on the second run; the snapshot must never be overwritten.
  if (!existsSync(SNAP)) { writeFileSync(SNAP, readFileSync(BANK)); console.log(`  snapshot -> ${SNAP}`); }
  else console.log(`  snapshot already exists, left alone: ${SNAP}`);
  const byName = new Map(rows.map((r: any) => [r.name, r]));
  let patched = 0;
  for (const e of bank) {
    const r: any = byName.get(e.name);
    if (!r) continue;
    const usable = r.labels.filter((L: any) => L.x != null);
    if (usable.length < 7) { console.log(`  ${e.name}: only ${usable.length} labels, LEFT AS IS`); continue; }
    e.truth = r.labels.map((L: any) => ({
      id: L.id, x: L.x, y: L.y, radiusPx: L.radiusPx,
      state: L.src === "predicted" || L.src === "plane-rejected" ? "located" : "read"
    }));
    e.labelQuality = r.labels.map((L: any) => ({
      id: L.id, src: L.src, dirs: L.dirs, lineRms: L.lineRms,
      ringN: L.ringN, ringRms: L.ringRms, refinedPx: L.refinedPx, ringModel: L.ringModel,
      planeResid: L.planeResid, score: L.score, inFrame: L.inFrame, ok: L.ok
    }));
    e.goldenThr = r.thr;
    e.planeRms = r.planeRms;
    e.planeRedundancy = r.redundancy;
    e.deltaMm = r.deltaMm;
    e.labelledBy = `relabelCase: ${NDIR} directions, stride ${STRIDE}, per-frame edge threshold, ring-lattice refinement per mark, plane fitted to centres AND mark metrics`;
    patched++;
  }
  writeFileSync(BANK, JSON.stringify(bank, null, 1));
  console.log(`  patched ${patched}/${bank.length} entries in ${BANK}`);
}

await browser.close();
