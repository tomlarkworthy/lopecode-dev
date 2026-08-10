// Self-test the calibration math against synthesised data with KNOWN truth.
// Debugging a fit against real observations whose truth is unknown is how you
// end up tuning a bug. Here f, R, t and the distortion are chosen, the points
// are projected exactly, and the fit has to hand them back.
import { calib } from "./calib-core.ts";

const { fitH, applyH, project, poseFromH, refinePose, zhangK, bundle, unproject } = calib;

const rnd = (() => { let s = 12345; return () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff; })();

const MARKS = [
  { id: 56, xMm: 0, yMm: 0 }, { id: 11, xMm: 34.8, yMm: 60.28 }, { id: 22, xMm: 69.6, yMm: 0 },
  { id: 29, xMm: 34.8, yMm: -60.28 }, { id: 37, xMm: -34.8, yMm: -60.28 },
  { id: 46, xMm: -69.6, yMm: 0 }, { id: 51, xMm: -34.8, yMm: 60.28 }
];

const rodriguesOf = (ax: number[], th: number) => {
  const n = Math.hypot(...ax); return ax.map((v) => (v / n) * th);
};

const makeView = (I: any, tiltDeg: number, azDeg: number, distMm: number, rollDeg: number) => {
  // camera looking at the plane origin from a given tilt/azimuth/distance
  const t = (tiltDeg * Math.PI) / 180, a = (azDeg * Math.PI) / 180, ro = (rollDeg * Math.PI) / 180;
  // rotation: roll about z, then tilt about the axis (cos a, sin a, 0)
  const compose = (A: number[][], B: number[][]) => A.map((r) => B[0].map((_, j) => r.reduce((s, v, k) => s + v * B[k][j], 0)));
  const Rz = [[Math.cos(ro), -Math.sin(ro), 0], [Math.sin(ro), Math.cos(ro), 0], [0, 0, 1]];
  const ax = [Math.cos(a), Math.sin(a), 0];
  const c = Math.cos(t), s = Math.sin(t), C = 1 - c;
  const Rt = [
    [c + ax[0] * ax[0] * C, ax[0] * ax[1] * C, ax[1] * s],
    [ax[1] * ax[0] * C, c + ax[1] * ax[1] * C, -ax[0] * s],
    [-ax[1] * s, ax[0] * s, c]
  ];
  const R = compose(Rz, Rt);
  const tv = [0, 0, distMm];
  const tr = R[0][0] + R[1][1] + R[2][2];
  const th = Math.acos(Math.max(-1, Math.min(1, (tr - 1) / 2)));
  let rv = [0, 0, 0];
  if (th > 1e-8) { const q = 2 * Math.sin(th); rv = [(R[2][1] - R[1][2]) / q * th, (R[0][2] - R[2][0]) / q * th, (R[1][0] - R[0][1]) / q * th]; }
  return [rv[0], rv[1], rv[2], tv[0], tv[1], tv[2]];
};

const TRUE: any = { f: 820, cx: 470, cy: 366, k1: -0.18, k2: 0.04, p1: 0, p2: 0 };
const NOISE = +(process.argv.find((a) => a.startsWith("--noise="))?.slice(8) ?? "0");

const views: any[] = [];
for (let i = 0; i < 40; i++) {
  const pose = makeView(TRUE, 15 + rnd() * 50, rnd() * 360, 260 + rnd() * 260, rnd() * 360);
  const pairs = MARKS.map((m) => {
    const [u, v] = project(TRUE, pose, m.xMm, m.yMm);
    return { X: m.xMm, Y: m.yMm, u: u + (rnd() - 0.5) * 2 * NOISE, v: v + (rnd() - 0.5) * 2 * NOISE, id: m.id };
  }).filter((p) => p.u > 0 && p.u < 960 && p.v > 0 && p.v < 720);
  if (pairs.length >= 5) views.push({ name: `v${i}`, pairs, truePose: pose });
}
console.log(`synthetic: ${views.length} views, ${views.reduce((s, v) => s + v.pairs.length, 0)} obs, noise +/-${NOISE}px`);
console.log(`TRUTH  f=${TRUE.f} c=(${TRUE.cx},${TRUE.cy}) k1=${TRUE.k1} k2=${TRUE.k2}`);

// A -- homography self-consistency (must be ~0 at zero noise WITHOUT distortion,
//      and clearly non-zero WITH it: that is the signal we are trying to model)
let hr = 0;
for (const v of views) {
  const H = fitH(v.pairs)!;
  let e = 0; for (const p of v.pairs) { const [u, q] = applyH(H, p.X, p.Y); e += (u - p.u) ** 2 + (q - p.v) ** 2; }
  hr += Math.sqrt(e / v.pairs.length);
}
console.log(`A  homography self-RMS (distortion unmodelled): ${(hr / views.length).toFixed(2)}px`);

// B -- pose decomposition + refine, GIVEN the true intrinsics
let pr = 0, perr = 0;
for (const v of views) {
  const und = v.pairs.map((p: any) => { const [xn, yn] = unproject(TRUE, p.u, p.v); return { ...p, u: xn * TRUE.f + TRUE.cx, v: yn * TRUE.f + TRUE.cy }; });
  const H = fitH(und)!;
  const P0 = poseFromH({ ...TRUE, k1: 0, k2: 0, p1: 0, p2: 0 }, H)!;
  const P = refinePose(TRUE, P0, v.pairs);
  let e = 0; for (const p of v.pairs) { const [u, q] = project(TRUE, P, p.X, p.Y); e += (u - p.u) ** 2 + (q - p.v) ** 2; }
  pr += Math.sqrt(e / v.pairs.length);
  perr += Math.hypot(P[3] - v.truePose[3], P[4] - v.truePose[4], P[5] - v.truePose[5]);
}
console.log(`B  pose refine with TRUE intrinsics: RMS ${(pr / views.length).toFixed(3)}px, translation err ${(perr / views.length).toFixed(3)}mm`);

// C -- Zhang init (no distortion in the model, so expect it off but not absurd)
const Hs = views.map((v: any) => fitH(v.pairs)!);
const z = zhangK(Hs, 960, 720);
console.log(`C  zhang init: f=${z.f.toFixed(1)} c=(${z.cx.toFixed(1)},${z.cy.toFixed(1)})   [truth ${TRUE.f}, (${TRUE.cx},${TRUE.cy})]`);

// D -- the whole thing: init from Zhang, bundle adjust, recover the truth
const I0: any = { f: z.f, cx: z.cx, cy: z.cy, k1: 0, k2: 0, p1: 0, p2: 0 };
const vs = views.map((v: any) => {
  const H = fitH(v.pairs)!;
  const P = poseFromH(I0, H) ?? [0, 0, 0, 0, 0, 400];
  return { name: v.name, pairs: v.pairs, pose: refinePose(I0, P, v.pairs) };
});
const VERBOSE = process.argv.includes("--verbose");
const out = bundle(I0, vs, ["f", "cx", "cy", "k1", "k2"], 120, VERBOSE ? (s) => console.log(s) : undefined);
const I = out.I;
console.log(`D  bundle: f=${I.f.toFixed(1)} c=(${I.cx.toFixed(1)},${I.cy.toFixed(1)}) k1=${I.k1.toFixed(4)} k2=${I.k2.toFixed(4)}  fitRMS ${out.rms.toFixed(3)}px`);
const err = { f: Math.abs(I.f - TRUE.f), cx: Math.abs(I.cx - TRUE.cx), cy: Math.abs(I.cy - TRUE.cy), k1: Math.abs(I.k1 - TRUE.k1) };
const pass = NOISE === 0 ? (err.f < 2 && err.cx < 2 && err.cy < 2 && err.k1 < 0.005 && out.rms < 0.05)
  : (err.f < 15 && err.cx < 10 && err.cy < 10 && err.k1 < 0.02);
console.log(`   err f ${err.f.toFixed(2)}px cx ${err.cx.toFixed(2)} cy ${err.cy.toFixed(2)} k1 ${err.k1.toFixed(4)}`);
console.log(pass ? "PASS" : "FAIL");
process.exit(pass ? 0 : 1);
