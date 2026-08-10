// Is the archive's calibration actually unstable, or do the models merely
// trade k1 against k2 to describe the same lens?
//
// Coefficients are not the thing. Two (k1,k2) pairs that look nothing alike can
// give the same displacement over the radius range the data actually covers,
// and comparing the numbers instead of the CURVES is how you talk yourself into
// a problem you do not have. So: compare curves over the observed radii, and
// bootstrap over views to get an honest spread.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { calib, type Intr, type Pair, type View } from "./calib-core.ts";

const { fitH, project, unproject, poseFromH, refinePose, zhangK, bundle } = calib;

const data = JSON.parse(readFileSync(resolve("scratch/rmbt/calib-obs.json"), "utf8"));
const result = JSON.parse(readFileSync(resolve("scratch/rmbt/calib-result-both.json"), "utf8"));
const mmById = new Map<number, any>(data.geom.marks.map((m: any) => [m.id, m]));

const posePairs = (I: Intr, pairs: Pair[]) => {
  const und = pairs.map((p) => { const [xn, yn] = unproject(I, p.u, p.v); return { ...p, u: xn * I.f + I.cx, v: yn * I.f + I.cy }; });
  const H = fitH(und);
  if (!H) return null;
  const P0 = poseFromH({ ...I, k1: 0, k2: 0, p1: 0, p2: 0 }, H);
  return P0 ? refinePose(I, P0, pairs) : null;
};

// radial displacement in PIXELS at image radius rPx, which is the quantity the
// pipeline actually suffers from
const dispPx = (I: Intr, rPx: number) => {
  const r = rPx / I.f;
  return I.f * r * (I.k1 * r * r + I.k2 * r * r * r * r);
};

for (const [key, dev] of Object.entries<any>(result.devices)) {
  const [W, H] = key.split("x").map(Number);
  const rMax = Math.hypot(W, H) / 2;
  console.log(`\n=== ${key}  (${dev.views} views)`);

  // --- 1. do the four models agree on the CURVE?
  console.log("  radial displacement (px) predicted by each model:");
  const radii = [0.2, 0.4, 0.6, 0.8, 1.0].map((f) => f * rMax);
  console.log(`    r px      ${radii.map((r) => r.toFixed(0).padStart(8)).join("")}`);
  for (const [name, m] of Object.entries<any>(dev.models)) {
    const I = m.intrinsics as Intr;
    console.log(`    ${name.padEnd(9)} ${radii.map((r) => dispPx(I, r).toFixed(2).padStart(8)).join("")}   (k1=${I.k1.toFixed(3)} k2=${I.k2.toFixed(3)})`);
  }

  // --- 2. how far out does the data actually constrain the curve?
  const cases = data.cases.filter((c: any) => c.w === W && c.h === H);
  const rs: number[] = [];
  for (const c of cases) for (const o of c.both ?? []) rs.push(Math.hypot(o.x - W / 2, o.y - H / 2));
  rs.sort((a, b) => a - b);
  const q = (f: number) => rs[Math.min(rs.length - 1, Math.round(f * (rs.length - 1)))];
  console.log(`  observed mark radii: med ${q(0.5).toFixed(0)}px  p90 ${q(0.9).toFixed(0)}px  max ${q(1).toFixed(0)}px  (frame corner ${rMax.toFixed(0)}px)`);
  console.log(`  -> the lens is UNCONSTRAINED beyond r=${q(1).toFixed(0)}px, which is ${(100 * q(1) / rMax).toFixed(0)}% of the way to the corner`);

  // --- 3. bootstrap the k1k2 model over halves of the views
  const all: View[] = [];
  for (const c of cases) {
    const pairs: Pair[] = (c.both ?? []).map((o: any) => { const m = mmById.get(o.id); return { X: m.xMm, Y: m.yMm, u: o.x, v: o.y, id: o.id }; });
    if (pairs.length >= 5) all.push({ name: c.name, pairs, pose: [0, 0, 0, 0, 0, 400] });
  }
  const rnd = (() => { let s = 7; return () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff; })();
  const fits: Intr[] = [];
  for (let b = 0; b < 6; b++) {
    const sub = all.filter(() => rnd() < 0.5);
    if (sub.length < 8) continue;
    const Hs = sub.map((v) => fitH(v.pairs)).filter(Boolean) as number[][];
    const z = zhangK(Hs, W, H);
    let I: Intr = { f: z.f, cx: z.cx, cy: z.cy, k1: 0, k2: 0, p1: 0, p2: 0 };
    const vs: View[] = sub.map((v) => ({ name: v.name, pairs: [...v.pairs], pose: posePairs(I, v.pairs) ?? [0, 0, 0, 0, 0, 400] }));
    I = bundle(I, vs, ["f", "cx", "cy", "k1", "k2"], 80).I;
    // drop gross outliers once, refit -- a wrong read is a wrong landmark
    for (const v of vs) {
      const keep = v.pairs.filter((p) => { const [u, q2] = project(I, v.pose, p.X, p.Y); return Math.hypot(u - p.u, q2 - p.v) < 8 || v.pairs.length <= 4; });
      if (keep.length >= 4) v.pairs = keep;
    }
    for (const v of vs) v.pose = posePairs(I, v.pairs) ?? v.pose;
    I = bundle(I, vs, ["f", "cx", "cy", "k1", "k2"], 60).I;
    fits.push(I);
  }
  console.log(`  bootstrap over ${fits.length} random half-samples of the views:`);
  const spread = (get: (I: Intr) => number, label: string, dp = 2) => {
    const v = fits.map(get).sort((a, b) => a - b);
    console.log(`    ${label.padEnd(22)} ${v.map((x) => x.toFixed(dp)).join("  ")}`);
  };
  spread((I) => I.f, "f px", 1);
  spread((I) => I.cx, "cx px", 1);
  spread((I) => I.cy, "cy px", 1);
  spread((I) => I.k1, "k1", 3);
  spread((I) => I.k2, "k2", 3);
  spread((I) => dispPx(I, q(0.9)), `displacement @r=${q(0.9).toFixed(0)}px`, 2);
  spread((I) => dispPx(I, rMax), `displacement @corner`, 2);
}
