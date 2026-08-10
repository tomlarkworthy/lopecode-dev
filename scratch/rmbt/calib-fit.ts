// Camera calibration from the hexcase archive.
//
// Fits one intrinsic model per device (f, cx, cy, k1, k2 [, p1, p2]) plus a
// pose per view, by bundle adjustment against the target's known millimetre
// geometry. Input is calib-obs.json -- MEASURED centres, not the archive's
// frozen `truth`, which is plane-consistent by construction and would hand back
// a lens with no distortion whatever the camera did.
//
// GRADED BY LEAVE-ONE-MARK-OUT, not by the fit's own residual. A per-view
// reprojection RMS is the fit scoring itself against the data it consumed, and
// with six pose parameters against ~14 residuals it looks good even when the
// model is wrong. LOO refits without one mark and predicts it, so the number is
// a prediction -- and it is the same yardstick the rig already uses, which is
// the only reason "2.2px laptop / 14px phone" is comparable to anything here.
//
// The maths lives in calib-core.ts and is exercised by calib-selftest.ts
// against synthetic data with known truth. It is not reimplemented here.
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { calib, type Intr, type Pair, type View } from "./calib-core.ts";

const { fitH, applyH, project, unproject, poseFromH, refinePose, zhangK, bundle } = calib;

const looHomography = (pairs: Pair[]): number[] => {
  const out: number[] = [];
  if (pairs.length < 6) return out;
  for (let i = 0; i < pairs.length; i++) {
    const rest = pairs.filter((_, j) => j !== i);
    const H = fitH(rest);
    if (!H) continue;
    const [u, v] = applyH(H, pairs[i].X, pairs[i].Y);
    out.push(Math.hypot(u - pairs[i].u, v - pairs[i].v));
  }
  return out;
};

const posePairs = (I: Intr, pairs: Pair[]) => {
  // seed on UNDISTORTED points so the seeding homography is a real
  // plane-to-plane map rather than one bent by the lens
  const und = pairs.map((p) => {
    const [xn, yn] = unproject(I, p.u, p.v);
    return { ...p, u: xn * I.f + I.cx, v: yn * I.f + I.cy };
  });
  const H = fitH(und);
  if (!H) return null;
  const P0 = poseFromH({ ...I, k1: 0, k2: 0, p1: 0, p2: 0 }, H);
  if (!P0) return null;
  return refinePose(I, P0, pairs);
};

const looPnp = (I: Intr, pairs: Pair[]): number[] => {
  const out: number[] = [];
  if (pairs.length < 6) return out;
  for (let i = 0; i < pairs.length; i++) {
    const rest = pairs.filter((_, j) => j !== i);
    const P = posePairs(I, rest);
    if (!P) continue;
    const [u, v] = project(I, P, pairs[i].X, pairs[i].Y);
    out.push(Math.hypot(u - pairs[i].u, v - pairs[i].v));
  }
  return out;
};

const stats = (a: number[]) => {
  if (!a.length) return { n: 0, med: null, p90: null, worst: null } as any;
  const s = [...a].sort((x, y) => x - y);
  const q = (f: number) => s[Math.min(s.length - 1, Math.round(f * (s.length - 1)))];
  return { n: s.length, med: +q(0.5).toFixed(2), p90: +q(0.9).toFixed(2), worst: +s[s.length - 1].toFixed(2) };
};

const data = JSON.parse(readFileSync(resolve("scratch/rmbt/calib-obs.json"), "utf8"));
const mmById = new Map<number, any>(data.geom.marks.map((m: any) => [m.id, m]));
const VARIANT = (process.argv.find((a) => a.startsWith("--obs=")) ?? "--obs=both").slice(6);
const MODELS = (process.argv.find((a) => a.startsWith("--models=")) ?? "--models=pinhole,k1,k1k2,k1k2p").slice(9).split(",");
const FREE: Record<string, (keyof Intr)[]> = {
  pinhole: ["f", "cx", "cy"],
  k1: ["f", "cx", "cy", "k1"],
  k1k2: ["f", "cx", "cy", "k1", "k2"],
  k1k2p: ["f", "cx", "cy", "k1", "k2", "p1", "p2"]
};

const groups = new Map<string, any[]>();
for (const c of data.cases) {
  if (!c.w) continue;
  const key = `${c.w}x${c.h}`;
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key)!.push(c);
}

const report: any = { variant: VARIANT, devices: {} };
for (const [key, cs] of groups) {
  const [W, H] = key.split("x").map(Number);
  const all: View[] = [];
  for (const c of cs) {
    const pairs: Pair[] = (c[VARIANT] ?? []).map((o: any) => {
      const m = mmById.get(o.id);
      return { X: m.xMm, Y: m.yMm, u: o.x, v: o.y, id: o.id };
    });
    if (pairs.length >= 4) all.push({ name: c.name, pairs, pose: [0, 0, 0, 0, 0, 400] });
  }
  const total = all.reduce((s, v) => s + v.pairs.length, 0);
  console.log(`\n=== ${key}  ${all.length} views, ${total} observations  (obs=${VARIANT})`);

  const base = stats(all.flatMap((v) => looHomography(v.pairs)));
  console.log(`  homography (what ships today)  LOO med ${base.med}px  p90 ${base.p90}px  worst ${base.worst}px  (n=${base.n})`);
  const dev: any = { views: all.length, obs: total, homography: base, models: {} };

  for (const model of MODELS) {
    const free = FREE[model];
    if (!free) continue;
    const Hs = all.map((v) => fitH(v.pairs)).filter(Boolean) as number[][];
    const z = zhangK(Hs, W, H);
    let I: Intr = { f: z.f, cx: z.cx, cy: z.cy, k1: 0, k2: 0, p1: 0, p2: 0 };
    const vs: View[] = all.map((v) => ({ name: v.name, pairs: [...v.pairs], pose: posePairs(I, v.pairs) ?? [0, 0, 0, 0, 0, 400] }));
    I = bundle(I, vs, free, 100).I; // poses are refined in place
    // one robust round: a misplaced read is a WRONG landmark, not a noisy one,
    // and one of those drags a least-squares fit everywhere
    let dropped = 0;
    for (const v of vs) {
      const keep = v.pairs.filter((p) => {
        const [u, q] = project(I, v.pose, p.X, p.Y);
        if (Math.hypot(u - p.u, q - p.v) > 8 && v.pairs.length > 4) { dropped++; return false; }
        return true;
      });
      if (keep.length >= 4) v.pairs = keep;
    }
    for (const v of vs) v.pose = posePairs(I, v.pairs) ?? v.pose;
    const r2 = bundle(I, vs, free, 60);
    I = r2.I;
    const loo = stats(vs.flatMap((v) => looPnp(I, v.pairs)));
    const n = (x: number) => +x.toFixed(Math.abs(x) > 1 ? 1 : 5);
    console.log(
      `  ${model.padEnd(7)} f=${n(I.f)} c=(${n(I.cx)},${n(I.cy)}) k1=${n(I.k1)} k2=${n(I.k2)}` +
      (model === "k1k2p" ? ` p=(${n(I.p1)},${n(I.p2)})` : "") +
      `${z.fallback ? " [zhang fallback]" : ""}` +
      `  fitRMS ${r2.rms.toFixed(2)}px  LOO med ${loo.med}px  p90 ${loo.p90}px  worst ${loo.worst}px  [dropped ${dropped}]`
    );
    dev.models[model] = { intrinsics: I, fitRms: +r2.rms.toFixed(3), loo, dropped, zhangFallback: z.fallback };
  }
  report.devices[key] = dev;
}

writeFileSync(resolve(`scratch/rmbt/calib-result-${VARIANT}.json`), JSON.stringify(report, null, 1));
console.log(`\nwrote scratch/rmbt/calib-result-${VARIANT}.json`);
