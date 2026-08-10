// How big must the mat be, and does lens distortion have to be modelled?
//
// Measured in the unit the job is specified in -- MILLIMETRES ON THE PLANE --
// not in reprojection pixels. The flat-trace pipeline takes a pixel on the
// object outline and asks where it is on the sheet; the error that matters is
// how far that answer is from the truth. Everything else is a proxy.
//
// Two methods are compared on identical synthetic views:
//   A  homography from the visible marks         (what ships today)
//   B  pose against globally calibrated intrinsics, distortion modelled
// B is calibrated on a training set of views and evaluated on held-out ones,
// because a model graded on its own calibration views flatters itself.
import { calib, type Intr, type Pair, type View } from "./calib-core.ts";

const { fitH, applyH, project, unproject, poseFromH, refinePose, zhangK, bundle, rodrigues } = calib;

const mkRnd = (seed: number) => { let s = seed; return () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff; };

// ---- a hexagonal lattice of marks, pitch mm, `rings` rings around the centre
const lattice = (pitchMm: number, rings: number, rollDeg = 30) => {
  const pts: { xMm: number; yMm: number }[] = [];
  const ro = (rollDeg * Math.PI) / 180;
  for (let q = -rings; q <= rings; q++) {
    for (let r = Math.max(-rings, -q - rings); r <= Math.min(rings, -q + rings); r++) {
      const x = pitchMm * (q + r / 2);
      const y = pitchMm * (Math.sqrt(3) / 2) * r;
      pts.push({ xMm: x * Math.cos(ro) - y * Math.sin(ro), yMm: x * Math.sin(ro) + y * Math.cos(ro) });
    }
  }
  return pts;
};

// ---- 3x3 inverse, for mapping pixels back to the plane under method A
const invH = (H: number[]) => {
  const a = H;
  const c = [
    a[4] * a[8] - a[5] * a[7], a[2] * a[7] - a[1] * a[8], a[1] * a[5] - a[2] * a[4],
    a[5] * a[6] - a[3] * a[8], a[0] * a[8] - a[2] * a[6], a[2] * a[3] - a[0] * a[5],
    a[3] * a[7] - a[4] * a[6], a[1] * a[6] - a[0] * a[7], a[0] * a[4] - a[1] * a[3]
  ];
  const det = a[0] * c[0] + a[1] * c[3] + a[2] * c[6];
  return Math.abs(det) < 1e-14 ? null : c.map((v) => v / det);
};

// ---- back-project a pixel onto the target plane (Z=0) given intrinsics+pose
const pixelToPlane = (I: Intr, P: number[], u: number, v: number): [number, number] | null => {
  const [xn, yn] = unproject(I, u, v);
  const R = rodrigues(P.slice(0, 3));
  // camera ray d = (xn, yn, 1); world point = R^T (s*d - t), solve for Z_world = 0
  const t = [P[3], P[4], P[5]];
  const rt = (i: number, j: number) => R[j][i]; // R^T
  const dz = rt(2, 0) * xn + rt(2, 1) * yn + rt(2, 2);
  const oz = -(rt(2, 0) * t[0] + rt(2, 1) * t[1] + rt(2, 2) * t[2]);
  if (Math.abs(dz) < 1e-12) return null;
  const s = -oz / dz;
  const X = rt(0, 0) * (s * xn - t[0]) + rt(0, 1) * (s * yn - t[1]) + rt(0, 2) * (s - t[2]);
  const Y = rt(1, 0) * (s * xn - t[0]) + rt(1, 1) * (s * yn - t[1]) + rt(1, 2) * (s - t[2]);
  return [X, Y];
};

// ---- build one view: a camera pose that frames the mat at a chosen fill
const makePose = (tiltDeg: number, azDeg: number, distMm: number, rollDeg: number) => {
  const t = (tiltDeg * Math.PI) / 180, a = (azDeg * Math.PI) / 180, ro = (rollDeg * Math.PI) / 180;
  const comp = (A: number[][], B: number[][]) => A.map((r) => B[0].map((_, j) => r.reduce((s, v, k) => s + v * B[k][j], 0)));
  const Rz = [[Math.cos(ro), -Math.sin(ro), 0], [Math.sin(ro), Math.cos(ro), 0], [0, 0, 1]];
  const ax = [Math.cos(a), Math.sin(a), 0];
  const c = Math.cos(t), s = Math.sin(t), C = 1 - c;
  const Rt = [
    [c + ax[0] * ax[0] * C, ax[0] * ax[1] * C, ax[1] * s],
    [ax[1] * ax[0] * C, c + ax[1] * ax[1] * C, -ax[0] * s],
    [-ax[1] * s, ax[0] * s, c]
  ];
  const R = comp(Rz, Rt);
  return [...calib.rodriguesInv(R), 0, 0, distMm];
};

// ---- method C: fit the lens from ONE photo's marks.
//
// The attraction is that it needs no calibration ritual at all -- if the mat
// puts enough marks in every frame, each photo corrects its own lens. The
// unknowns are a homography plus k1,k2 about an assumed centre; the plane is
// recovered as part of the same solve, so nothing is carried between frames.
const fitViewLens = (pairs: Pair[], W: number, H: number) => {
  if (pairs.length < 7) return null;                 // 8 + 2 unknowns need real redundancy
  const cx = W / 2, cy = H / 2;
  // undistort with the current guess, refit H, repeat. Alternating like this
  // converges quickly because the two halves are nearly independent: H is
  // linear given the undistortion, and k is a small correction given H.
  let k1 = 0, k2 = 0, Hh = fitH(pairs);
  if (!Hh) return null;
  const fGuess = Math.hypot(Hh[0], Hh[3]) * 12;      // rough scale; only sets the r units
  const und = (u: number, v: number, a: number, b: number) => {
    const x = (u - cx) / fGuess, y = (v - cy) / fGuess;
    const r2 = x * x + y * y;
    const s = 1 + a * r2 + b * r2 * r2;
    return [cx + (u - cx) / s, cy + (v - cy) / s] as [number, number];
  };
  const residFor = (a: number, b: number) => {
    const uv = pairs.map((p) => { const [uu, vv] = und(p.u, p.v, a, b); return { ...p, u: uu, v: vv }; });
    const Hx = fitH(uv);
    if (!Hx) return null;
    let E = 0;
    for (const p of uv) { const [pu, pv] = applyH(Hx, p.X, p.Y); E += (pu - p.u) ** 2 + (pv - p.v) ** 2; }
    return { E, H: Hx };
  };
  let best = residFor(0, 0);
  if (!best) return null;
  // coordinate search: cheap, derivative-free, and k1/k2 are only two numbers
  for (let step = 0.08; step > 1e-4; step *= 0.5) {
    for (let round = 0; round < 6; round++) {
      let improved = false;
      for (const [da, db] of [[step, 0], [-step, 0], [0, step * 0.5], [0, -step * 0.5]]) {
        const r = residFor(k1 + da, k2 + db);
        if (r && r.E < best!.E) { k1 += da; k2 += db; best = r; improved = true; }
      }
      if (!improved) break;
    }
  }
  return { k1, k2, H: best.H, cx, cy, f: fGuess };
};
const planeFromViewLens = (L: NonNullable<ReturnType<typeof fitViewLens>>, u: number, v: number) => {
  const x = (u - L.cx) / L.f, y = (v - L.cy) / L.f;
  const r2 = x * x + y * y;
  const s = 1 + L.k1 * r2 + L.k2 * r2 * r2;
  const uu = L.cx + (u - L.cx) / s, vv = L.cy + (v - L.cy) / s;
  const Hi = invH(L.H);
  if (!Hi) return null;
  const w = Hi[6] * uu + Hi[7] * vv + Hi[8];
  return [(Hi[0] * uu + Hi[1] * vv + Hi[2]) / w, (Hi[3] * uu + Hi[4] * vv + Hi[5]) / w] as [number, number];
};

type Profile = { name: string; f: number; k1: number; k2: number };
const PROFILES: Profile[] = [
  { name: "mild webcam", f: 900, k1: -0.10, k2: 0.02 },
  { name: "phone wide", f: 820, k1: -0.25, k2: 0.07 },
  { name: "very wide", f: 700, k1: -0.40, k2: 0.15 }
];

const W = 960, H = 720;
const NOISE = +(process.argv.find((a) => a.startsWith("--noise="))?.slice(8) ?? "0.4");
const OBJ_MM = +(process.argv.find((a) => a.startsWith("--object="))?.slice(9) ?? "60"); // object half-extent
// The detector's centre estimate is ANISOTROPIC: along a scan row the centre is
// the involution's fixed point, measured directly on every row; across rows it
// is where the d-space V-fit extrapolates to zero. The frame bank measured 23px
// vs 64px on those two axes. Isotropic noise would flatter the fit.
const ANISO = +(process.argv.find((a) => a.startsWith("--aniso="))?.slice(8) ?? "1");

console.log(`frame ${W}x${H}, centre noise +/-${NOISE}px in x and +/-${(NOISE * ANISO).toFixed(2)}px in y, object region +/-${OBJ_MM}mm\n`);
console.log("mat            marks fill% | A homography mm    | B calibrated mm    | C per-photo mm     | k1");
console.log("-".repeat(104));

for (const prof of PROFILES) {
  const TRUE: Intr = { f: prof.f, cx: W / 2 - 6, cy: H / 2 + 4, k1: prof.k1, k2: prof.k2, p1: 0, p2: 0 };
  for (const [label, pitch, rings] of [
    ["current 7-mark", 69.6, 1],
    ["19-mark lattice", 69.6, 2],
    ["37-mark lattice", 60, 3],
    ["61-mark lattice", 45, 4]
  ] as [string, number, number][]) {
    const marks = lattice(pitch, rings);
    const rnd = mkRnd(9001);
    // distance chosen so the mat spans most of the frame height at zero tilt
    const extent = Math.max(...marks.map((m) => Math.hypot(m.xMm, m.yMm)));
    const dist = (2 * extent * TRUE.f) / (0.85 * H);

    const build = (n: number, seedShift: number) => {
      const out: { pose: number[]; pairs: Pair[] }[] = [];
      for (let i = 0; i < n; i++) {
        const pose = makePose(10 + rnd() * 45, rnd() * 360, dist * (0.8 + rnd() * 0.5), rnd() * 360);
        const pairs: Pair[] = [];
        for (const m of marks) {
          const [u, v] = project(TRUE, pose, m.xMm, m.yMm);
          if (u < 4 || u > W - 4 || v < 4 || v > H - 4) continue;
          pairs.push({ X: m.xMm, Y: m.yMm, u: u + (rnd() - 0.5) * 2 * NOISE, v: v + (rnd() - 0.5) * 2 * NOISE * ANISO });
        }
        if (pairs.length >= 5) out.push({ pose, pairs });
      }
      return out;
    };
    const train = build(40, 0);
    const test = build(25, 1);
    if (!train.length || !test.length) { console.log(`${label.padEnd(15)} -- no usable views`); continue; }

    // how much of the frame do the marks actually cover?
    const fill = test.reduce((s, v) => {
      const xs = v.pairs.map((p) => p.u), ys = v.pairs.map((p) => p.v);
      return s + ((Math.max(...xs) - Math.min(...xs)) * (Math.max(...ys) - Math.min(...ys))) / (W * H);
    }, 0) / test.length;

    // ---- B: calibrate on the training views only
    const Hs = train.map((v) => fitH(v.pairs)).filter(Boolean) as number[][];
    const z = zhangK(Hs, W, H);
    let I: Intr = { f: z.f, cx: z.cx, cy: z.cy, k1: 0, k2: 0, p1: 0, p2: 0 };
    const vs: View[] = train.map((v, i) => {
      const Hh = fitH(v.pairs)!;
      return { name: `t${i}`, pairs: v.pairs, pose: refinePose(I, poseFromH(I, Hh) ?? [0, 0, 0, 0, 0, dist], v.pairs) };
    });
    I = bundle(I, vs, ["f", "cx", "cy", "k1", "k2"], 120).I;

    // ---- evaluate both methods on held-out views, in millimetres
    const errA: number[] = [], errB: number[] = [], errC: number[] = [];
    const grid: [number, number][] = [];
    for (let gx = -OBJ_MM; gx <= OBJ_MM; gx += OBJ_MM / 4)
      for (let gy = -OBJ_MM; gy <= OBJ_MM; gy += OBJ_MM / 4) grid.push([gx, gy]);

    for (const v of test) {
      const Ha = fitH(v.pairs);
      const Hai = Ha ? invH(Ha) : null;
      const und = v.pairs.map((p) => { const [xn, yn] = unproject(I, p.u, p.v); return { ...p, u: xn * I.f + I.cx, v: yn * I.f + I.cy }; });
      const Hb = fitH(und);
      const Pb = Hb ? refinePose(I, poseFromH({ ...I, k1: 0, k2: 0, p1: 0, p2: 0 }, Hb) ?? v.pose, v.pairs) : null;
      const Lc = fitViewLens(v.pairs, W, H);

      for (const [gx, gy] of grid) {
        // where the TRUE camera puts this plane point
        const [u, q] = project(TRUE, v.pose, gx, gy);
        if (u < 0 || u > W || q < 0 || q > H) continue;
        if (Hai) {
          const w = Hai[6] * u + Hai[7] * q + Hai[8];
          const X = (Hai[0] * u + Hai[1] * q + Hai[2]) / w, Y = (Hai[3] * u + Hai[4] * q + Hai[5]) / w;
          errA.push(Math.hypot(X - gx, Y - gy));
        }
        if (Pb) {
          const pt = pixelToPlane(I, Pb, u, q);
          if (pt) errB.push(Math.hypot(pt[0] - gx, pt[1] - gy));
        }
        if (Lc) {
          const pt = planeFromViewLens(Lc, u, q);
          if (pt) errC.push(Math.hypot(pt[0] - gx, pt[1] - gy));
        }
      }
    }
    const qt = (a: number[], f: number) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.round(f * (s.length - 1)))] : NaN; };
    const fmt = (a: number[]) => a.length ? `med ${qt(a, 0.5).toFixed(2)} p95 ${qt(a, 0.95).toFixed(2)}` : "n/a";
    console.log(
      `${label.padEnd(15)} ${String(Math.round(test.reduce((s, v) => s + v.pairs.length, 0) / test.length)).padStart(4)} ` +
      `${(fill * 100).toFixed(0).padStart(4)}% | ${fmt(errA).padEnd(18)} | ${fmt(errB).padEnd(18)} | ${fmt(errC).padEnd(18)} | ` +
      `${I.k1.toFixed(3)}/${TRUE.k1}  [${prof.name}]`
    );
  }
  console.log("");
}
