// "Mondtresor" — layered laser-cut puzzle box, 3mm ply, no glue.
//
// Architecture (world: X width 0..132, Y depth 0..96 (front=0), Z up):
//   L0  z0-3   foot ring (plinth, shadow gap)
//   L1  z3-6   base plate (solid; spline pockets; riddle scored underneath)
//   L2  z6-9   drawer floor plane ring (U-open at back mouth)
//   L3-L5 z9-18 drawer cavity rings (U-open back)
//   L6  z18-21 deck plate (solid; secret-compartment ceiling)
//   L7-L15 z21-48 compartment wall rings
//   L16 z48-51 ledge ring (lid runner rests on it)
//   L17 z51-54 groove ring (U-open front; runner slides here)
//   L18 z54-57 rim ring (U-open front; overhangs runner; bolt notches)
//   LID: runner z51-54, frame z54-57 (mechanism plane), top z57-60, knobs z60-63
//
// Mechanisms (all gravity, no springs):
//   1. Two dials (sun/moon) on the lid; each cam has one edge notch. Nose-
//      follower bolts ride the cam edge; teeth sit in rim notches = lid locked.
//      Turn both dials to their marks AND lay the box on its LEFT side: both
//      bolts fall inward (clunk), lid slides out the front.
//   2. Secret drawer in the plinth (seam hidden in the strata). A dropper
//      strip buried in the back wall falls through the drawer floor = locked.
//      Turn the box UPSIDE DOWN: dropper falls clear, tilt -> drawer glides out.
//   3. Six vertical splines tie the ring stack; the closed lid caps them.
//      Open box fully disassembles for the curious.
import {
  bbox, circle, rect, reliefSpike, ensureCCW, translatePoly,
} from "../lib/geom.js";
import { textStrokes } from "../lib/font.js";

// ------------------------------------------------------------------ params
export const T = 3.0;
export const W = 132, D = 96;            // outer footprint (wave midline)
export const NL = 19;                    // flat layers L0..L18
export const Z = (k) => k * T;           // layer k bottom z

export const FIT = {
  press: 2.85,   // drawn slot width for press-fit of a 3.0 tab (kerf 0.05)
  slideCh: 3.35, // spline/dropper channel across-thickness
  slideLen: 0.35,// extra length clearance for sliding strips
  lidSide: 0.45, // runner/frame side clearance
  drawer: 0.4,
};

// wall + stations
const WALL = 6.5;
const MOUTH = { x0: 26, x1: 106 };          // drawer mouth span in back wall
const SPLINE_W = 9.4, SPLINE_CH = { w: 9.7, t: FIT.slideCh };
// stations: side: 'S'=front(y0) 'N'=back 'W'=left 'E'=right; c = along-wall center
const ST = [
  { id: "FL", side: "S", c: 33 }, { id: "FR", side: "S", c: 99 },
  { id: "BL", side: "N", c: 19 }, { id: "BR", side: "N", c: 113 },
  { id: "ML", side: "W", c: 48 }, { id: "MR", side: "E", c: 48 },
];
const ST_DEPTH = 5.0;     // channel centerline distance from outer face
const BUMP_D = 10;        // wall thickness at station bumps
const DROP_ST = { x: 66, y0: 85.3, y1: 88.7, w: 9.8 }; // dropper channel (back wall, buried)
const DROP_BUMP = { x0: 56, x1: 76, innerY: 83 };      // back-wall bump for dropper

// lid geometry
const GROOVE = { x0: 9, x1: 123, yBack: 89.5 };   // L17 opening
const RIM = { x0: 12, x1: 120, yBack: 87 };       // L18 opening
const RUN = { x0: 9.45, x1: 122.55, y0: 0.8, y1: 89 };   // runner plate
const FRM = { x0: 12.45, x1: 119.55, y0: 1.2, y1: 86.55 }; // frame plate
// bolts (both teeth point -x / left) + dials
const BOLT = [
  { id: "A", y0: 27, y1: 34, cam: [66, 30.5], notchLocal: 145, open: 35 },  // sun
  { id: "B", y0: 63, y1: 70, cam: [66, 66.5], notchLocal: 15, open: 165 },  // moon
];
const CAM_R = 12, CAM_NOTCH_R = 7, CAM_NOTCH_SPAN = 36; // deg
const CHAMBER_R = 12.6, NECK_R = 8, BORE_R = 8.4, KNOB_R = 13;
const TOOTH = 4.2, TRAVEL = 5.0;
const NOTCH_DEPTH = 4.2; // rim notch outward from RIM.x0
export const BOLT_EXT_TIP = RIM.x0 - NOTCH_DEPTH + 0.45;   // 8.25
const NOSE_EXT = BOLT[0].cam[0] - CAM_R;                    // 54

// drawer
const DRW = {
  floor: { x0: 29.4, x1: 102.6, y0: 36.4, y1: 92.8 },
  facade: { x0: MOUTH.x0 + 0.4, x1: MOUTH.x1 - 0.4, y0: 92.8, z0: 6, z1: 17.6 },
  wallZ: [9, 17],
  sideX: [31.4, 97.6], // outer faces of the two side walls (slab x..x+3)
  frontY: [40, 43],
  dividerY: [80, 83],
};
const DRAWER_OPEN = { x0: 29, x1: 103, yFront: 36 }; // L2..L5 interior
const LIP_Y = 92.6; // facade recess pocket depth line

// dropper strip
const DROPPER = { w: 9.3, len: 25.5, x0: DROP_ST.x + -9.3 / 2, restZ: 6 };
// raised (box inverted): ceiling = underside of L15 (z45)
export const DROPPER_RAISE = 45 - (DROPPER.restZ + DROPPER.len); // 13.5

// --------------------------------------------------------------- registry
export const parts = [];
export const audits = [];
export function addPart(p) {
  p.outline = ensureCCW(p.outline);
  p.holes = (p.holes || []).map(ensureCCW);
  p.scores = p.scores || [];
  p.spikes = p.spikes || [];
  parts.push(p);
  return p;
}
const FR_XY = (z) => ({ O: [0, 0, z], U: [1, 0, 0], V: [0, 1, 0], N: [0, 0, 1] });
const FR_XZ = (y) => ({ O: [0, y, 0], U: [1, 0, 0], V: [0, 0, 1], N: [0, 1, 0] });
const FR_YZ = (x) => ({ O: [x, 0, 0], U: [0, 1, 0], V: [0, 0, 1], N: [1, 0, 0] });

function assertFit(name, actual, want, tol = 0.051) {
  audits.push({ name, actual, want, ok: Math.abs(actual - want) < tol });
}

// ----------------------------------------------------------- wave outlines
// Rounded-rect perimeter with per-layer wave modulation on the outer edge.
// Calm zone across the back mouth so the drawer seam disappears.
function waveOutline(k, { inset = 0, amp = 1.25, r = 7 } = {}) {
  const x0 = inset, y0 = inset, x1 = W - inset, y1 = D - inset;
  const pts = [];
  const seg = (ax, ay, bx, by, nx, ny) => {
    const len = Math.hypot(bx - ax, by - ay);
    const n = Math.max(2, Math.round(len / 2));
    for (let i = 0; i < n; i++) {
      const t = i / n;
      pts.push({ p: [ax + (bx - ax) * t, ay + (by - ay) * t], n: [nx, ny] });
    }
  };
  const arc = (cx, cy, a0, a1) => {
    for (let i = 0; i < 7; i++) {
      const a = a0 + ((a1 - a0) * i) / 7;
      pts.push({ p: [cx + r * Math.cos(a), cy + r * Math.sin(a)], n: [Math.cos(a), Math.sin(a)] });
    }
  };
  seg(x0 + r, y0, x1 - r, y0, 0, -1);
  arc(x1 - r, y0 + r, -Math.PI / 2, 0);
  seg(x1, y0 + r, x1, y1 - r, 1, 0);
  arc(x1 - r, y1 - r, 0, Math.PI / 2);
  seg(x1 - r, y1, x0 + r, y1, 0, 1);
  arc(x0 + r, y1 - r, Math.PI / 2, Math.PI);
  seg(x0, y1 - r, x0, y0 + r, -1, 0);
  arc(x0 + r, y0 + r, Math.PI, 1.5 * Math.PI);
  // arc-length param
  let total = 0;
  const cum = [0];
  for (let i = 1; i <= pts.length; i++) {
    const a = pts[i - 1].p, b = pts[i % pts.length].p;
    total += Math.hypot(b[0] - a[0], b[1] - a[1]);
    cum.push(total);
  }
  const barrel = 1 + 0.85 * Math.sin((Math.PI * Math.min(Math.max(k, 0), 18)) / 18);
  return pts.map(({ p, n }, i) => {
    const s = cum[i] / total;
    let w = amp * (0.62 * Math.sin(2 * Math.PI * (2 * s) + 0.6 * k) +
                   0.5 * Math.sin(2 * Math.PI * (5 * s) + 1.1 + 0.37 * k) +
                   0.25 * Math.sin(2 * Math.PI * (9 * s) + 2.2 + 0.8 * k));
    if (w > 0) w *= barrel; // belly outward at mid-height (barrel silhouette)
    // calm the back face across the mouth (hide the drawer seam)
    if (n[1] > 0.5 && p[0] > MOUTH.x0 - 6 && p[0] < MOUTH.x1 + 6) w *= 0.12;
    w = Math.max(w, -1.35);
    return [p[0] + n[0] * w, p[1] + n[1] * w];
  });
}

// interior opening: rounded rect + inward bumps (station pilasters)
function openingPoly(inset, bumps, r = 3) {
  const x0 = inset, y0 = inset, x1 = W - inset, y1 = D - inset;
  // walk CCW (as a hole it gets re-oriented by ensureCCW; geometry only)
  let pts = [];
  const push = (p) => pts.push(p);
  // south edge west->east with bumps side 'S'
  const edge = (a, b, fixed, axis, side) => {
    // axis: 'x' walking along x at y=fixed, or 'y'
    const bs = bumps.filter((bp) => bp.side === side).sort((p, q) => p.c - q.c);
    const dirPos = (axis === "x" ? b > a : b > a);
    const list = dirPos ? bs : [...bs].reverse();
    let cur = a;
    for (const bp of list) {
      const half = bp.w / 2;
      const c0 = bp.c - half, c1 = bp.c + half;
      const [m0, m1] = dirPos ? [c0, c1] : [c1, c0];
      if (axis === "x") {
        push([m0, fixed]); push([m0, fixed + bp.d * (side === "S" ? 1 : -1)]);
        push([m1, fixed + bp.d * (side === "S" ? 1 : -1)]); push([m1, fixed]);
      } else {
        push([fixed + bp.d * (side === "W" ? 1 : -1), m0]);
        // fix order below
      }
      cur = m1;
    }
  };
  // simpler explicit construction: build each edge with bumps inline
  pts = [];
  const bump = (side) => bumps.filter((b) => b.side === side).sort((a, b2) => a.c - b2.c);
  // S edge: y=y0, x0+r -> x1-r ; bump extends +y
  push([x0 + r, y0]);
  for (const b of bump("S")) {
    push([b.c - b.w / 2, y0]); push([b.c - b.w / 2, y0 + b.d]);
    push([b.c + b.w / 2, y0 + b.d]); push([b.c + b.w / 2, y0]);
  }
  push([x1 - r, y0]); push([x1, y0 + r]);
  // E edge: x=x1, y0+r -> y1-r ; bump extends -x
  for (const b of bump("E")) {
    push([x1, b.c - b.w / 2]); push([x1 - b.d, b.c - b.w / 2]);
    push([x1 - b.d, b.c + b.w / 2]); push([x1, b.c + b.w / 2]);
  }
  push([x1, y1 - r]); push([x1 - r, y1]);
  // N edge: y=y1, x1-r -> x0+r ; bump extends -y
  for (const b of [...bump("N")].reverse()) {
    push([b.c + b.w / 2, y1]); push([b.c + b.w / 2, y1 - b.d]);
    push([b.c - b.w / 2, y1 - b.d]); push([b.c - b.w / 2, y1]);
  }
  push([x0 + r, y1]); push([x0, y1 - r]);
  // W edge: x=x0, y1-r -> y0+r ; bump extends +x
  for (const b of [...bump("W")].reverse()) {
    push([x0, b.c + b.w / 2]); push([x0 + b.d, b.c + b.w / 2]);
    push([x0 + b.d, b.c - b.w / 2]); push([x0, b.c - b.w / 2]);
  }
  push([x0, y0 + r]);
  return pts;
}

// spline channel hole rect for a station
function stationHole(st) {
  const w2 = SPLINE_CH.w / 2, t = SPLINE_CH.t;
  const dIn = ST_DEPTH; // centerline from outer face
  if (st.side === "S") return rect(st.c - w2, dIn - t / 2, SPLINE_CH.w, t);
  if (st.side === "N") return rect(st.c - w2, D - dIn - t / 2, SPLINE_CH.w, t);
  if (st.side === "W") return rect(dIn - t / 2, st.c - w2, t, SPLINE_CH.w);
  return rect(W - dIn + -t / 2, st.c - w2, t, SPLINE_CH.w);
}
const stationBump = (st) => ({
  side: st.side, c: st.c, w: SPLINE_CH.w + 7, d: BUMP_D - WALL,
});
const dropHole = () => rect(DROP_ST.x - DROP_ST.w / 2, DROP_ST.y0, DROP_ST.w, DROP_ST.y1 - DROP_ST.y0);

// U-ring: outer wave outline with an open span on one side, inner opening walk.
// side 'N' (back) or 'S' (front); span [a0,a1] in x.
function uRing(k, opening, side, span, opts = {}) {
  const outer = waveOutline(k, opts);
  // find outer pts on the open side within span, remove them, and stitch to opening
  const onSide = (p) => (side === "N" ? p[1] > D - 4 : p[1] < 4) && p[0] > span[0] && p[0] < span[1];
  // rotate outer so it starts just after the gap
  const n = outer.length;
  let gi0 = -1, gi1 = -1;
  for (let i = 0; i < n; i++) {
    const a = outer[i], b = outer[(i + 1) % n];
    if (!onSide(a) && onSide(b) && gi0 < 0) gi0 = i;      // gap entry
    if (onSide(a) && !onSide(b)) gi1 = (i + 1) % n;        // gap exit
  }
  if (gi0 < 0) throw new Error("uRing: gap not found");
  const path = [];
  for (let i = gi1; i !== gi0 + 1; i = (i + 1) % n) path.push(outer[i]);
  // path now runs from gap-exit around to gap-entry (solid side)
  const o = opening; // walk inner opening from entry side back to exit side
  const yEdge = side === "N" ? D : 0;
  const first = path[0], last = path[path.length - 1];
  // connect: last outer pt -> straight to gap edge -> inner rect walk -> first
  if (side === "N") {
    // stepped mouth: full mouth width down to the facade recess line, then
    // the narrower floor-guide opening forward.
    const yIn = o.yFront;
    return [
      ...path,
      [span[1], yEdge], [span[1], LIP_Y],
      [o.x1, LIP_Y], [o.x1, yIn], [o.x0, yIn], [o.x0, LIP_Y],
      [span[0], LIP_Y], [span[0], yEdge],
    ];
  } else {
    // front gap ('S'): outer CCW walks front edge x0->x1, entry at smaller x
    const yIn = o.yBack;
    return [
      ...path,
      [span[0], yEdge],
      [o.x0, yEdge], [o.x0, yIn], [o.x1, yIn], [o.x1, yEdge],
      [span[1], yEdge],
    ];
  }
}

// ------------------------------------------------------------- the layers
const allBumps = ST.map(stationBump);
const compBumps = [...allBumps, { side: "N", c: DROP_ST.x, w: DROP_BUMP.x1 - DROP_BUMP.x0, d: D - DROP_BUMP.innerY - WALL + 0 }];
// note: bump depth is measured beyond WALL inset

function ringScores(k, label) {
  // layer id scored on top face near front-left inner corner + N tick at back
  return [
    ...textStrokes(label, { x: 16, y: 11, size: 3.4 }),
    [[66, D - 4.2], [66, D - 8.2]], [[64.6, D - 6.8], [66, D - 8.2], [67.4, D - 6.8]],
  ];
}

const BASE_KEYS = [[18, 7, "h"], [114, 7, "h"], [34, 89, "h"], [98, 89, "h"], [66, 7, "h"], [7, 66, "v"], [125, 66, "v"]];
function baseKeyHoles() {
  return BASE_KEYS.map(([x, y, o]) => o === "v"
    ? rect(x - FIT.press / 2, y - 4.55, FIT.press, 9.1)
    : rect(x - 4.55, y - FIT.press / 2, 9.1, FIT.press));
}

// L0 foot ring
addPart({
  id: "L00", label: "foot ring", kind: "layer",
  outline: waveOutline(0, { inset: 2.2, amp: 1.6 }),
  holes: [
    openingPoly(13.2, []),
    ...baseKeyHoles(),
  ],
  frame: FR_XY(Z(0)), order: 0, approach: [],
  scores: [],
});

// L1 base plate: solid + spline pockets + key holes; riddle scored on the
// UNDERSIDE (cut scored-face-up, assemble flipped) — you must invert the box
// to read it, which is itself the drawer secret.
addPart({
  id: "L01", label: "base plate", kind: "layer",
  outline: waveOutline(1, { amp: 1.25 }),
  holes: [...ST.map(stationHole), ...baseKeyHoles()],
  frame: FR_XY(Z(1)), order: 1, approach: [[0, 0, 25]],
  scores: [
    ...textStrokes("DREH SONNE UND MOND", { x: 66, y: 64, size: 3.4 }),
    ...textStrokes("ZU IHREN ZEICHEN", { x: 66, y: 57, size: 3.4 }),
    ...textStrokes("LEG MICH AUFS LINKE OHR", { x: 66, y: 50, size: 3.4 }),
    ...textStrokes("UND SCHIEB DEN HIMMEL AUF", { x: 66, y: 43, size: 3.4 }),
    ...textStrokes("MEIN RUECKEN TRAEGT", { x: 66, y: 32, size: 2.6 }),
    ...textStrokes("MEHR ALS ER ZEIGT", { x: 66, y: 27, size: 2.6 }),
  ],
});

// base keys (press-fit through L0+L1)
BASE_KEYS.forEach(([x, y, o], i) => {
  const frame = o === "v"
    ? { O: [x - 1.5, y - 4.5, 0.05], U: [0, 1, 0], V: [0, 0, 1], N: [1, 0, 0] }
    : { O: [x - 4.5, y - 1.5, 0.05], U: [1, 0, 0], V: [0, 0, 1], N: [0, 1, 0] };
  addPart({
    id: `K${i}`, label: "base key", kind: "key",
    outline: rect(0, 0, 9, 5.9),
    frame, order: 2, approach: [[0, 0, -12]],
  });
});

// L2..L5 drawer-zone rings (U-open at back)
for (let k = 2; k <= 5; k++) {
  const open = k === 2 ? DRAWER_OPEN : { x0: DRAWER_OPEN.x0 - 0.4, x1: DRAWER_OPEN.x1 + 0.4, yFront: DRAWER_OPEN.yFront - 0.4 };
  addPart({
    id: `L${String(k).padStart(2, "0")}`, label: `drawer ring ${k}`, kind: "layer",
    outline: uRing(k, open, "N", [MOUTH.x0, MOUTH.x1]),
    holes: ST.map(stationHole),
    frame: FR_XY(Z(k)), order: 3, approach: [[0, 0, 25]],
    scores: ringScores(k, `L${k}`),
  });
}

// L6 deck plate
addPart({
  id: "L06", label: "deck (compartment floor)", kind: "layer",
  outline: waveOutline(6, { amp: 1.25 }),
  holes: [...ST.map(stationHole), dropHole()],
  frame: FR_XY(Z(6)), order: 5, approach: [[0, 0, 25]],
  scores: [
    circle(66, 48, 22, 48), circle(66, 48, 19.5, 48),
    ...moonPhases(66, 48, 15),
    ...textStrokes("L6", { x: 16, y: 11, size: 3.4 }),
  ],
});
function moonPhases(cx, cy, r) {
  const out = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * 2 * Math.PI + Math.PI / 2;
    out.push(circle(cx + r * Math.cos(a), cy + r * Math.sin(a), 2.2, 14));
  }
  return out;
}

// L7..L15 compartment rings
for (let k = 7; k <= 15; k++) {
  const holes = [...ST.map(stationHole)];
  if (k >= 7 && k <= 14) holes.push(dropHole());
  addPart({
    id: `L${String(k).padStart(2, "0")}`, label: `wall ring ${k}`, kind: "layer",
    outline: waveOutline(k, { amp: 1.25 }),
    holes,
    frame: FR_XY(Z(k)), order: 6, approach: [[0, 0, 25]],
    scores: ringScores(k, `L${k}`),
    openingSpec: { inset: WALL, bumps: compBumps },
  });
  parts[parts.length - 1].holes.unshift(openingPoly(WALL, compBumps));
}

// L16 ledge ring (same opening as compartment)
addPart({
  id: "L16", label: "ledge ring", kind: "layer",
  outline: waveOutline(16, { amp: 1.25 }),
  holes: [openingPoly(WALL, compBumps), ...ST.map(stationHole)],
  frame: FR_XY(Z(16)), order: 8, approach: [[0, 0, 25]],
  scores: ringScores(16, "L16"),
});

// L17 groove ring: U-open front, wide interior
addPart({
  id: "L17", label: "groove ring", kind: "layer",
  outline: uRing(17, { x0: GROOVE.x0, x1: GROOVE.x1, yBack: GROOVE.yBack }, "S", [GROOVE.x0, GROOVE.x1]),
  holes: ST.filter((s) => s.side === "W" || s.side === "E").map(stationHole),
  frame: FR_XY(Z(17)), order: 8, approach: [[0, 0, 25]],
  scores: ringScores(17, "L17"),
});

// L18 rim ring: U-open front, narrow interior + 2 bolt notches in LEFT arm
{
  const o = uRing(18, { x0: RIM.x0, x1: RIM.x1, yBack: RIM.yBack }, "S", [RIM.x0, RIM.x1]);
  // carve bolt notches into the left arm inner edge (x = RIM.x0 wall segment):
  // done as holes-free outline surgery: insert notch rectangles into the walk.
  const notched = [];
  for (let i = 0; i < o.length; i++) {
    const a = o[i], b = o[(i + 1) % o.length];
    notched.push(a);
    // inner left edge segment at x = RIM.x0 (either walk direction)
    if (Math.abs(a[0] - RIM.x0) < 1e-6 && Math.abs(b[0] - RIM.x0) < 1e-6 && Math.abs(a[1] - b[1]) > 20) {
      const down = a[1] > b[1];
      const boltsOrdered = [...BOLT].sort((p, q) => down ? q.y0 - p.y0 : p.y0 - q.y0);
      for (const bolt of boltsOrdered) {
        const ny0 = bolt.y0 - 0.6, ny1 = bolt.y1 + 0.6;
        if (down) notched.push([RIM.x0, ny1], [RIM.x0 - NOTCH_DEPTH, ny1], [RIM.x0 - NOTCH_DEPTH, ny0], [RIM.x0, ny0]);
        else notched.push([RIM.x0, ny0], [RIM.x0 - NOTCH_DEPTH, ny0], [RIM.x0 - NOTCH_DEPTH, ny1], [RIM.x0, ny1]);
      }
    }
  }
  addPart({
    id: "L18", label: "rim ring", kind: "layer",
    outline: notched,
    holes: ST.filter((s) => s.side === "W" || s.side === "E").map(stationHole),
    frame: FR_XY(Z(18)), order: 8, approach: [[0, 0, 25]],
    scores: ringScores(18, "L18"),
    spikes: BOLT.flatMap((b) => [
      reliefSpike([RIM.x0 - NOTCH_DEPTH, b.y0 - 0.6], 45), reliefSpike([RIM.x0 - NOTCH_DEPTH, b.y1 + 0.6], -45),
    ]),
  });
}

// ------------------------------------------------------------- splines
ST.forEach((st, i) => {
  const short = st.side === "S" || st.side === "N"; // stop under the runner
  const zTop = short ? Z(17) : Z(19);
  const len = zTop - Z(1) - 0.4;
  const or8 = rect(0, 0, SPLINE_W, len);
  let frame;
  const dIn = ST_DEPTH;
  if (st.side === "S") frame = { O: [st.c - SPLINE_W / 2, dIn - T / 2, Z(1) + 0.2], U: [1, 0, 0], V: [0, 0, 1], N: [0, 1, 0] };
  if (st.side === "N") frame = { O: [st.c - SPLINE_W / 2, D - dIn - T / 2, Z(1) + 0.2], U: [1, 0, 0], V: [0, 0, 1], N: [0, 1, 0] };
  if (st.side === "W") frame = { O: [dIn - T / 2, st.c - SPLINE_W / 2, Z(1) + 0.2], U: [0, 1, 0], V: [0, 0, 1], N: [1, 0, 0] };
  if (st.side === "E") frame = { O: [W - dIn - T / 2, st.c - SPLINE_W / 2, Z(1) + 0.2], U: [0, 1, 0], V: [0, 0, 1], N: [1, 0, 0] };
  addPart({
    id: `SP${st.id}`, label: `spline ${st.id}`, kind: "spline",
    outline: or8, frame, order: 9,
    approach: [[0, 0, 60]],
    scores: textStrokes("S", { x: SPLINE_W / 2, y: len - 5, size: 3.2 }),
  });
});

// ------------------------------------------------------------- dropper
addPart({
  id: "DROP", label: "gravity dropper", kind: "dropper",
  outline: [
    [0, 0], [DROPPER.w, 0], [DROPPER.w, DROPPER.len - 2], [DROPPER.w - 2, DROPPER.len],
    [2, DROPPER.len], [0, DROPPER.len - 2],
  ],
  frame: { O: [DROP_ST.x - DROPPER.w / 2, DROP_ST.y0 + (DROP_ST.y1 - DROP_ST.y0 - T) / 2, DROPPER.restZ], U: [1, 0, 0], V: [0, 0, 1], N: [0, 1, 0] },
  order: 7, // after L14, before L15 (see verify ordering)
  approach: [[0, 0, 42]],
  scores: textStrokes("D", { x: DROPPER.w / 2, y: DROPPER.len / 2, size: 3.4 }),
});

// ------------------------------------------------------------- drawer
{
  const f = DRW.floor;
  const slots = [];
  const tabsBack = [[40, 48], [84, 92]]; // x spans of floor->facade tabs
  // floor: plate with back tabs + slots for walls/divider
  const fo = [
    [f.x0, f.y0], [f.x1, f.y0], [f.x1, f.y1],
    [tabsBack[1][1], f.y1], [tabsBack[1][1], f.y1 + T], [tabsBack[1][0], f.y1 + T], [tabsBack[1][0], f.y1],
    [tabsBack[0][1], f.y1], [tabsBack[0][1], f.y1 + T], [tabsBack[0][0], f.y1 + T], [tabsBack[0][0], f.y1],
    [f.x0, f.y1],
  ];
  const wallSlot = (x, y, w, h) => rect(x, y, w, h);
  const floorHoles = [
    // side wall tabs (2 per side)
    wallSlot(DRW.sideX[0] + 0.075, 46, FIT.press, 12), wallSlot(DRW.sideX[0] + 0.075, 68, FIT.press, 12),
    wallSlot(DRW.sideX[1] + 0.075, 46, FIT.press, 12), wallSlot(DRW.sideX[1] + 0.075, 68, FIT.press, 12),
    // front wall tabs
    wallSlot(44, DRW.frontY[0] + (T - FIT.press) / 2, 12, FIT.press), wallSlot(74, DRW.frontY[0] + (T - FIT.press) / 2, 12, FIT.press),
    // divider tabs
    wallSlot(44, DRW.dividerY[0] + (T - FIT.press) / 2, 12, FIT.press), wallSlot(74, DRW.dividerY[0] + (T - FIT.press) / 2, 12, FIT.press),
    // dropper pass-through
    rect(DROP_ST.x - DROP_ST.w / 2, DROP_ST.y0, DROP_ST.w, DROP_ST.y1 - DROP_ST.y0),
  ];
  addPart({
    id: "DFLOOR", label: "drawer floor", kind: "drawer",
    outline: fo, holes: floorHoles,
    frame: FR_XY(Z(2)), order: 4, approach: [[0, 40, 0]],
    scores: textStrokes("GEHEIMFACH", { x: 66, y: 62, size: 3.2 }),
  });
  // facade (vertical XZ at back; wavy strata edges to melt into the box)
  const fc = DRW.facade;
  // facade: bottom-open notches receive the floor tabs (press on the top face;
  // captive between base plate and cavity ceiling once slid home)
  const nz = fc.z0 + T - (T - FIT.press) / 2; // notch ceiling
  const fcOutline = [
    [fc.x0, fc.z0],
    [tabsBack[0][0] - 0.05, fc.z0], [tabsBack[0][0] - 0.05, nz], [tabsBack[0][1] + 0.05, nz], [tabsBack[0][1] + 0.05, fc.z0],
    [tabsBack[1][0] - 0.05, fc.z0], [tabsBack[1][0] - 0.05, nz], [tabsBack[1][1] + 0.05, nz], [tabsBack[1][1] + 0.05, fc.z0],
    [fc.x1, fc.z0], [fc.x1, fc.z1 - 1], [fc.x1 - 1, fc.z1], [fc.x0 + 1, fc.z1], [fc.x0, fc.z1 - 1],
  ];
  const fcHoles = [
    // side wall back-tab slots
    rect(DRW.sideX[0] + (T - FIT.press) / 2, 10.5, FIT.press, 5),
    rect(DRW.sideX[1] + (T - FIT.press) / 2, 10.5, FIT.press, 5),
  ];
  addPart({
    id: "DFACE", label: "drawer facade", kind: "drawer",
    outline: fcOutline, holes: fcHoles,
    frame: FR_XZ(fc.y0), order: 4, approach: [[0, 40, 0]],
    scores: [],
  });
  // side walls (YZ planes)
  for (const [xi, x] of [[0, DRW.sideX[0]], [1, DRW.sideX[1]]].values()) {
    const o = [
      [40, 9], [46, 9], [46, 6.2], [58, 6.2], [58, 9], [68, 9], [68, 6.2], [80, 6.2], [80, 9],
      [92.7, 9], [92.7, 10.5], [95.6, 10.5], [95.6, 15.5], [92.7, 15.5], [92.7, 17], [40, 17],
    ];
    addPart({
      id: `DSIDE${xi}`, label: "drawer side", kind: "drawer",
      outline: o, frame: FR_YZ(x), order: 4, approach: [[0, 40, 0]],
    });
  }
  // front wall + divider (XZ planes)
  for (const [id, y, tx] of [["DFRONT", DRW.frontY[0], [44, 74]], ["DDIV", DRW.dividerY[0], [44, 74]]]) {
    const o = [
      [DRW.sideX[0] + T + 0.2, 9],
      [tx[0], 9], [tx[0], 6.2], [tx[0] + 12, 6.2], [tx[0] + 12, 9],
      [tx[1], 9], [tx[1], 6.2], [tx[1] + 12, 6.2], [tx[1] + 12, 9],
      [DRW.sideX[1] - 0.2, 9], [DRW.sideX[1] - 0.2, 17], [DRW.sideX[0] + T + 0.2, 17],
    ];
    addPart({ id, label: id === "DFRONT" ? "drawer front" : "drawer divider", kind: "drawer", outline: o, frame: FR_XZ(y), order: 4, approach: [[0, 40, 0]] });
  }
}

// ------------------------------------------------------------- lid stack
const RIVETS = [[20, 12], [112, 12], [20, 78], [112, 78]];
const rivetHole = ([x, y]) => rect(x - 4.55, y - FIT.press / 2, 9.1, FIT.press);
const keySlot = (cx, cy) => rect(cx - 4.55, cy - FIT.press / 2, 9.1, FIT.press);

// runner
{
  const r = RUN;
  const o = [
    [r.x0, r.y0 + 3], [r.x0 + 3, r.y0], [r.x1 - 3, r.y0], [r.x1, r.y0 + 3],
    [r.x1, r.y1 - 3], [r.x1 - 3, r.y1], [r.x0 + 3, r.y1], [r.x0, r.y1 - 3],
  ];
  addPart({
    id: "RUNNER", label: "lid runner", kind: "lid",
    outline: o, holes: RIVETS.map(rivetHole),
    frame: FR_XY(Z(17)), order: 20, approach: [],
  });
}
// frame plate with bolt channels + chambers
{
  const f = FRM;
  const o = [];
  o.push([f.x0, f.y0]);
  // walk: front edge -> east -> back -> west edge; each bolt channel is a
  // keyhole-shaped void open at the west edge: slot walls + chamber circle
  // traced as ONE outline feature (merged voids must not overlap as holes).
  o.push([f.x1, f.y0], [f.x1, f.y1], [f.x0, f.y1]);
  for (const b of [...BOLT].sort((p2, q) => q.y0 - p2.y0)) {
    const [cx, cy] = b.cam;
    const half = 4.25;
    const jx = cx - Math.sqrt(CHAMBER_R * CHAMBER_R - half * half);
    const aJ = Math.atan2(half, jx - cx); // ~160deg
    o.push([f.x0, cy + half], [jx, cy + half]);
    for (let a = aJ; a > -aJ + 1e-9 - 2 * Math.PI * 0 && a > -aJ; a -= Math.PI / 24) {
      o.push([cx + CHAMBER_R * Math.cos(a), cy + CHAMBER_R * Math.sin(a)]);
    }
    o.push([jx, cy - half], [f.x0, cy - half]);
  }
  const holes = [...RIVETS.map(rivetHole)];
  addPart({
    id: "LFRAME", label: "lid mechanism frame", kind: "lid",
    outline: o, holes,
    frame: FR_XY(Z(18)), order: 20, approach: [],
    spikes: BOLT.flatMap((b) => [
      reliefSpike([f.x0 + 42.05, b.y0 - 0.75], 135), reliefSpike([f.x0 + 42.05, b.y1 + 0.75], -135),
    ]),
  });
}
// bolts
BOLT.forEach((b) => {
  const tipX = BOLT_EXT_TIP;
  const cy = (b.y0 + b.y1) / 2;
  // bar full height to x 48.5, then a 3.6-wide nose finger that can follow
  // the cam notch to its floor (notch width at r7 = 4.4)
  const o = [
    [tipX, b.y0], [48.5, b.y0], [48.5, cy - 1.8], [NOSE_EXT - 0.9, cy - 1.8],
    [NOSE_EXT, cy - 0.9], [NOSE_EXT, cy + 0.9], [NOSE_EXT - 0.9, cy + 1.8],
    [48.5, cy + 1.8], [48.5, b.y1], [tipX, b.y1],
  ];
  addPart({
    id: `BOLT${b.id}`, label: `bolt ${b.id}`, kind: "bolt",
    outline: o, frame: FR_XY(Z(18)), order: 21, approach: [],
    scores: textStrokes(b.id, { x: tipX + 9, y: (b.y0 + b.y1) / 2, size: 3.4 }),
  });
});
// cams (+notch), necks, knobs
BOLT.forEach((b) => {
  const [cx, cy] = b.cam;
  const cam = [];
  const n0 = ((b.notchLocal - CAM_NOTCH_SPAN / 2) * Math.PI) / 180;
  const n1 = ((b.notchLocal + CAM_NOTCH_SPAN / 2) * Math.PI) / 180;
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * 2 * Math.PI;
    let r = CAM_R;
    if (a > n0 && a < n1) r = CAM_NOTCH_R;
    cam.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  addPart({
    id: `CAM${b.id}`, label: `cam ${b.id}`, kind: "cam",
    outline: cam, holes: [keySlot(cx, cy)],
    frame: FR_XY(Z(18)), order: 22, approach: [],
  });
  addPart({
    id: `NECK${b.id}`, label: `dial neck ${b.id}`, kind: "cam",
    outline: circle(cx, cy, NECK_R, 40), holes: [keySlot(cx, cy)],
    frame: FR_XY(Z(19)), order: 22, approach: [],
  });
  const knob = [];
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * 2 * Math.PI;
    const r = KNOB_R + 0.9 * Math.sin(8 * a); // scalloped grip
    knob.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  addPart({
    id: `KNOB${b.id}`, label: `dial knob ${b.id} (${b.id === "A" ? "sun" : "moon"})`, kind: "cam",
    outline: knob, holes: [keySlot(cx, cy)],
    frame: FR_XY(Z(20)), order: 23, approach: [],
    scores: b.id === "A" ? sunScores(cx, cy) : moonScores(cx, cy),
  });
  // dial key (press-fit through knob+neck+cam, 9 tall next to 3x3 layers)
  addPart({
    id: `DKEY${b.id}`, label: `dial key ${b.id}`, kind: "key",
    outline: rect(0, 0, 9, 8.9),
    frame: { O: [cx - 4.5, cy - 1.5, Z(18) + 0.05], U: [1, 0, 0], V: [0, 0, 1], N: [0, 1, 0] },
    order: 24, approach: [],
  });
});
function sunScores(cx, cy) {
  const out = [circle(cx, cy, 5.5, 24)];
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * 2 * Math.PI;
    out.push([[cx + 6.5 * Math.cos(a), cy + 6.5 * Math.sin(a)], [cx + 9.5 * Math.cos(a), cy + 9.5 * Math.sin(a)]]);
  }
  return out;
}
function moonScores(cx, cy) {
  const c1 = circle(cx, cy, 6, 30);
  const c2 = circle(cx + 2.6, cy + 1.4, 5.2, 30);
  return [c1, c2, ...[[3, 8], [-5, 7], [6, -6]].map(([dx, dy]) => circle(cx + dx * 0.9, cy + dy * 0.9, 0.5, 8))];
}
// top plate
{
  const o = waveOutline(20, { inset: -1.2, amp: 1.55 });
  const holes = [
    ...BOLT.map((b) => circle(b.cam[0], b.cam[1], BORE_R, 40)),
    ...RIVETS.map(rivetHole),
  ];
  const scores = [
    // horizon glyphs at the two open angles
    glyphAt(BOLT[0].cam, BOLT[0].open, "sea"),
    glyphAt(BOLT[1].cam, BOLT[1].open, "mountain"),
    // orbit rings around each dial
    [circle(BOLT[0].cam[0], BOLT[0].cam[1], 17.5, 48)],
    [circle(BOLT[0].cam[0], BOLT[0].cam[1], 19, 48)],
    [circle(BOLT[1].cam[0], BOLT[1].cam[1], 17.5, 48)],
    [circle(BOLT[1].cam[0], BOLT[1].cam[1], 19, 48)],
    ...starfield(),
    constellation(),
    [...textStrokes("M O N D T R E S O R", { x: 66, y: 6.5, size: 3.2 })],
    // diamonds framing the rivet keys (joinery as ornament)
    ...RIVETS.map(([x, y]) => [[[x - 7.5, y], [x, y + 4.5], [x + 7.5, y], [x, y - 4.5], [x - 7.5, y]]]),
  ].flat();
  addPart({
    id: "LTOP", label: "lid top plate", kind: "lid",
    outline: o, holes,
    frame: FR_XY(Z(19)), order: 20, approach: [],
    scores: wrapScoreList(scores),
  });
}
function glyphAt([cx, cy], angDeg, type) {
  const a = (angDeg * Math.PI) / 180;
  const gx = cx + 15.5 * Math.cos(a), gy = cy + 15.5 * Math.sin(a);
  if (type === "sea") {
    return [
      [[gx - 3.6, gy], [gx - 1.8, gy + 1.4], [gx, gy], [gx + 1.8, gy + 1.4], [gx + 3.6, gy]],
      [[gx - 2.8, gy - 1.8], [gx - 1.2, gy - 0.6], [gx + 0.4, gy - 1.8], [gx + 2, gy - 0.6]],
    ];
  }
  return [
    [[gx - 3.4, gy - 2], [gx - 0.8, gy + 2.6], [gx + 0.6, gy + 0.4], [gx + 1.8, gy + 2], [gx + 3.6, gy - 2]],
  ];
}
function starfield() {
  const seeds = [[30, 26], [42, 86], [100, 14], [114, 58], [88, 90], [16, 44], [124, 30], [50, 8], [16, 86], [124, 88], [98, 42]];
  return seeds.map(([x, y], i) => {
    const s = 1 + (i % 3) * 0.45;
    return [[[x - s, y], [x + s, y]], [[x, y - s], [x, y + s]],
            [[x - s * 0.55, y - s * 0.55], [x + s * 0.55, y + s * 0.55]],
            [[x - s * 0.55, y + s * 0.55], [x + s * 0.55, y - s * 0.55]]];
  }).flat();
}
function constellation() {
  // little dipper pouring toward the moon dial
  const pts = [[18, 76], [26, 80], [34, 78], [41, 73], [44, 66], [50, 62], [56, 64]];
  return pts.map((q, i) => i ? [pts[i - 1], q] : null).filter(Boolean);
}
function wrapScoreList(list) {
  // scores are arrays of polylines already; flatten one level safely
  return list.filter((s) => Array.isArray(s) && s.length && Array.isArray(s[0]));
}

// lid rivet keys
RIVETS.forEach(([x, y], i) => {
  addPart({
    id: `RK${i}`, label: "lid rivet key", kind: "key",
    outline: rect(0, 0, 9, 8.9),
    frame: { O: [x - 4.5, y - 1.5, Z(17) + 0.05], U: [1, 0, 0], V: [0, 0, 1], N: [0, 1, 0] },
    order: 24, approach: [],
  });
});

// --------------------------------------------------------------- audits
assertFit("spline w clearance", SPLINE_CH.w - SPLINE_W, 0.3, 0.06);
assertFit("dropper w clearance", DROP_ST.w - DROPPER.w, 0.5, 0.06);
assertFit("bolt travel vs cam", CAM_R - CAM_NOTCH_R, TRAVEL, 0.06);
assertFit("tooth engagement", RIM.x0 - BOLT_EXT_TIP - 0.45, T + 0.3, 0.36);
assertFit("runner side clr", RUN.x0 - GROOVE.x0, FIT.lidSide, 0.01);
assertFit("frame side clr", FRM.x0 - RIM.x0, FIT.lidSide, 0.01);
assertFit("rim overhang", RUN.x0 + 0 - RIM.x0, -2.55, 0.06); // rim overlaps runner 2.55

export const LAYERS = parts.filter((p) => p.kind === "layer");
export const BOLTS = parts.filter((p) => p.kind === "bolt");
export { BOLT, CAM_R, CAM_NOTCH_R, TRAVEL, RIM, GROOVE, RUN, FRM, DROP_ST, DROPPER, MOUTH, WALL, ST, DRW };
