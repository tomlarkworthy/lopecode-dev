// Landmark silhouettes. Local coords: mm, y-up, y=0 at the piece's bottom
// edge, x=0 at the anchor center. Each factory returns:
// { name, outline, holes, scores, mounts } where mounts describe fin
// anchor x positions and the lap style:
//   {x, lap: depth-of-bottom-notch*2 engagement} (notched)  or
//   {x, open: true, restY, lapDepth} (fin mast rises through an opening /
//    under a low band; silhouette material rests on the fin slot bottom)
import { catmullRom, circle } from "./geom.js";
import { textStrokes } from "./font.js";

const mirror = (pts) => pts.map(([x, y]) => [-x, y]);
// build symmetric outline from right-side profile (base-right -> top x=0)
function sym(right, baseHalf) {
  return [[-baseHalf, 0], [baseHalf, 0], ...right, ...mirror(right).reverse()].filter(
    (p, i, a) => i === 0 || Math.hypot(p[0] - a[i - 1][0], p[1] - a[i - 1][1]) > 0.05);
}
const arc = (cx, cy, r, a0, a1, n = 10) => {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    out.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return out;
};
const D = Math.PI / 180;

// ---------------------------------------------------------------- Fernsehturm
export function fernsehturm() {
  const right = [];
  // pylon
  right.push([7.5, 0.0], [6.0, 3.5], [4.8, 8], [3.9, 13], [3.2, 19], [2.8, 27], [2.6, 35], [2.55, 43]);
  // sphere r 10.3 @ y57
  const r = 10.3, cy = 57;
  right.push([3.4, 46.6]);
  for (let y = 48; y <= 66; y += 1.5) {
    const dx = Math.sqrt(Math.max(0, r * r - (y - cy) * (y - cy)));
    if (dx > 2.4) right.push([dx, y]);
  }
  right.push([3.0, 67.5], [2.4, 69.5]);
  // upper shaft + antenna
  right.push([2.4, 78], [1.45, 78], [1.45, 86], [0.85, 86], [0.85, 95], [0.5, 97], [0.12, 103]);
  const outline = sym(right, 7.5);
  // scores: sphere lattice + window band + door + height label
  const scores = [];
  for (let y = 50; y <= 64; y += 2.8) {
    const dx = Math.sqrt(Math.max(0, r * r - (y - cy) * (y - cy))) * 0.94;
    if (dx > 1.6) scores.push([[-dx, y], [dx, y]]);
  }
  for (const f of [-0.62, -0.25, 0.25, 0.62]) {
    const arcPts = [];
    for (let y = 47.6; y <= 66.4; y += 1.6) {
      const dx = Math.sqrt(Math.max(0, r * r - (y - cy) * (y - cy)));
      arcPts.push([f * dx, y]);
    }
    scores.push(arcPts);
  }
  scores.push([[-2.5, 52.6], [2.5, 52.6]], [[-2.6, 55.4], [2.6, 55.4]]); // window band emphasis
  scores.push([[-1.2, 0.4], [-1.2, 4.6], [1.2, 4.6], [1.2, 0.4]]); // door
  scores.push(...textStrokes("368M", { x: 0, y: 12, size: 2.8, angle: 90 }));
  return { name: "fernsehturm", outline, holes: [], scores, mounts: [{ x: 0, notch: true }] };
}

// ------------------------------------------------------------ Brandenburger Tor
export function brandenburgerTor() {
  const W2 = 26; // half width
  // gaps 3.2 wide centered at 0, ±9.2, ±18.4; columns 6 wide
  const gapC = [-18.4, -9.2, 0, 9.2, 18.4];
  const outline = [];
  // base with two full-height carriageway notches at +-9.2 (mast passages)
  outline.push([-W2, 0]);
  for (const c of [-9.2, 9.2]) outline.push([c - 1.6, 0], [c - 1.6, 21], [c + 1.6, 21], [c + 1.6, 0]);
  outline.push([W2, 0]);
  outline.push([W2, 2.6]); // stylobate
  outline.push([W2 - 1.4, 2.6], [W2 - 1.4, 21], [W2, 21]); // right outer column inset
  outline.push([W2, 26.5]); // entablature
  outline.push([19, 26.5], [19, 30.2]); // attic step right
  // quadriga (right to left): chariot, tall Victoria, staff to wreath ring, horses
  outline.push([10, 30.2], [10, 31.4]); // plinth
  outline.push([8.7, 31.4], [8.4, 33.4], [6.8, 34.2]); // chariot back+rim
  outline.push([4.4, 34.2], [3.8, 34.4]); // chariot front lip
  outline.push([3.4, 36.4], [2.9, 38.0]); // Victoria body taper
  outline.push([2.7, 38.5], [2.9, 39.9], [1.8, 40.5], [0.9, 39.6], [1.1, 38.6]); // head
  // staff up-left, wreath ring bump at tip (ring hole added below)
  outline.push([-2.5, 42.6], [-3.7, 44.2], [-5.8, 44.0], [-6.9, 42.0], [-5.8, 40.0], [-3.9, 39.9], [-2.6, 40.6], [1.3, 36.8], [1.1, 34.4]);
  outline.push([0.2, 34.4]); // chariot base to horses
  outline.push([-0.8, 35.0], [-2.2, 35.7], [-3.2, 36.9], [-3.7, 37.4], [-4.2, 36.7], [-4.7, 35.7], // horse 1 neck/ears/muzzle
  [-5.3, 35.8], [-6.2, 37.0], [-6.8, 37.5], [-7.2, 36.7], [-8.0, 35.2]); // horse 2
  outline.push([-8.9, 33.4], [-9.4, 31.4], [-10, 31.4], [-10, 30.2]); // chest/legs
  outline.push([-19, 30.2], [-19, 26.5]); // attic left
  outline.push([-W2, 26.5], [-W2, 21]);
  outline.push([-(W2 - 1.4), 21], [-(W2 - 1.4), 2.6], [-W2, 2.6]); // left outer column inset
  // remaining column gaps as holes (carriageways at +-9.2 are open), wreath ring
  const holes = [-18.4, 0, 18.4].map((c) => [[c - 1.6, 2.6], [c + 1.6, 2.6], [c + 1.6, 21], [c - 1.6, 21]]);
  holes.push(circle(-4.72, 41.98, 0.7, 12));
  const scores = [];
  for (const c of [-23, -13.8, -4.6, 4.6, 13.8, 23]) {
    scores.push([[c - 1.1, 3.4], [c - 1.1, 20.4]], [[c + 1.1, 3.4], [c + 1.1, 20.4]]); // flutes
    scores.push([[c - 2.2, 20.4], [c + 2.2, 20.4]], [[c - 2.0, 3.4], [c + 2.0, 3.4]]); // capitals/bases
  }
  scores.push([[-W2 + 1, 23.4], [W2 - 1, 23.4]], [[-W2 + 1, 24.8], [W2 - 1, 24.8]]); // entablature bands
  for (let x = -17; x <= 17; x += 4.4) scores.push([[x, 27.4], [x, 29.2]]); // attic dashes
  scores.push(circle(7.2, 32.7, 1.15, 12)); // chariot wheel
  return {
    name: "brandenburger-tor", outline, holes, scores,
    mounts: [{ x: -9.2, open: true, restY: 21, lapDepth: 7 }, { x: 9.2, open: true, restY: 21, lapDepth: 7 }],
  };
}

// --------------------------------------------------------------- Siegessäule
export function siegessaeule() {
  const right = [];
  right.push([10, 0], [10, 2.2], [8.6, 2.2], [8.6, 4.4], [7.6, 4.4], [7.6, 7]); // stepped plinth
  right.push([7.5, 7.4], [7.5, 12.6], [6.9, 13.4]); // colonnade drum
  right.push([4.3, 14.2], [4.35, 15], [3.9, 16]); // column base
  right.push([3.75, 25], [3.6, 35], [3.5, 44], [3.45, 49]); // shaft taper
  right.push([4.6, 50], [4.8, 52], [5.4, 52.8], [5.5, 54.6], [6.6, 55.2], [6.6, 56.6]); // capital + platform
  // Goldelse (right side only up to apex-ish, wings handled asymmetric below)
  const outline = sym(right, 10);
  // replace the symmetric top between the two platform corners with the angel
  const iL = outline.findIndex(([x, y]) => Math.abs(x + 6.6) < 0.01 && Math.abs(y - 56.6) < 0.01);
  const iR = outline.findIndex(([x, y]) => Math.abs(x - 6.6) < 0.01 && Math.abs(y - 56.6) < 0.01);
  const angel = [
    [6.6, 56.6], [2.0, 56.9], // platform top right toward body
    [2.4, 59.6], [1.8, 62.6], [2.6, 63.9], // body right, shoulder
    [4.3, 65.7], [5.5, 68.4], // raised arm
    [6.9, 68.8], [7.4, 70.5], [6.3, 71.8], [4.8, 71.3], [4.6, 69.8], // wreath ring in hand
    [3.9, 67.4], [2.4, 65.2], // arm underside
    [2.3, 67.0], [1.1, 68.2], [-0.7, 68.1], [-1.7, 66.7], // head
    [-3.4, 67.6], [-6.2, 68.0], [-8.6, 67.2], // wing top sweep
    [-6.9, 66.0], [-8.0, 65.0], [-6.3, 64.4], [-7.2, 63.2], [-5.5, 62.7], [-6.1, 61.3], [-4.4, 60.9], // feather steps
    [-4.7, 59.2], [-2.9, 58.2], [-2.1, 56.9], [-6.6, 56.6], // wing bottom to platform left
  ];
  const newOutline = [...outline.slice(0, iR + 1), ...angel.slice(1, -1), ...outline.slice(iL)];
  const scores = [];
  for (const dx of [-2.4, -0.8, 0.8, 2.4]) scores.push([[dx * 0.95, 16.5], [dx, 48.5]]); // flutes
  for (const y of [21, 30, 39]) scores.push([[-3.8, y], [3.8, y]], [[-3.8, y + 1.6], [3.8, y + 1.6]]); // gilded cannon bands
  for (const cx of [-5.4, -2.7, 0, 2.7, 5.4]) scores.push(arc(cx, 8.4, 1.25, 0, Math.PI), [[cx - 1.25, 8.4], [cx - 1.25, 12.4]], [[cx + 1.25, 8.4], [cx + 1.25, 12.4]]); // drum arches
  scores.push(...textStrokes("1873", { x: 0, y: 3.4, size: 2.6 }));
  return { name: "siegessaeule", outline: newOutline, holes: [], scores, mounts: [{ x: 0, notch: true }] };
}

// ------------------------------------------------------------- Oberbaumbrücke
export function oberbaumbruecke() {
  const W2 = 32;
  // piers/arches along bottom: abutments ±(26..32); arches centered 0, ±11.3, ±22.6
  const archC = [-22.6, -11.3, 0, 11.3, 22.6];
  const archW2 = 3.4, archSide = 4.2, archR = 3.4; // apex ~7.6
  const outline = [];
  outline.push([-W2, 0]);
  // walk bottom edge left->right inserting arch notches
  let prev = -W2;
  for (const c of archC) {
    outline.push([c - archW2, 0]);
    // arch: up, semicircle, down (walking +x, notch goes up)
    outline.push([c - archW2, archSide]);
    outline.push(...arc(c, archSide, archR, Math.PI, 0, 12).map(([x, y]) => [x, y]).reverse());
    outline.push([c + archW2, archSide], [c + archW2, 0]);
  }
  outline.push([W2, 0], [W2, 19.5]); // right end up to arcade top
  // top edge right->left with towers at ±6.5
  outline.push([10.6, 19.5]);
  // right tower (center +8, 5.2 wide): cap band, cone spire, ball finial
  outline.push([10.6, 29.6], [11.1, 29.6], [11.1, 31.2], [9.2, 31.2]);
  outline.push([8.35, 36.2], [8.6, 36.85], [8.0, 37.55], [7.4, 36.85], [7.65, 36.2]); // cone + ball
  outline.push([6.8, 31.2], [4.9, 31.2], [4.9, 29.6], [5.4, 29.6]);
  outline.push([5.4, 19.5], [-5.4, 19.5]); // arcade top between towers
  outline.push([-5.4, 29.6], [-4.9, 29.6], [-4.9, 31.2], [-6.8, 31.2]);
  outline.push([-7.65, 36.2], [-7.4, 36.85], [-8.0, 37.55], [-8.6, 36.85], [-8.35, 36.2]); // left cone + ball
  outline.push([-9.2, 31.2], [-11.1, 31.2], [-11.1, 29.6], [-10.6, 29.6]);
  outline.push([-10.6, 19.5], [-W2, 19.5]);
  const holes = [];
  const scores = [];
  // arcade arches row (scored) across deck
  for (let x = -30; x <= 30; x += 4) {
    if (Math.abs(x) < 11 && Math.abs(x) > 2.2) continue; // skip towers
    scores.push(arc(x, 16.2, 1.5, 0, Math.PI), [[x - 1.5, 14.6], [x - 1.5, 16.2]], [[x + 1.5, 14.6], [x + 1.5, 16.2]]);
  }
  scores.push([[-W2 + 0.8, 13.6], [W2 - 0.8, 13.6]], [[-W2 + 0.8, 10.4], [W2 - 0.8, 10.4]]); // deck lines
  // brick hatches + crenellation hint on towers
  for (const tc of [-8, 8]) {
    for (let y = 21; y <= 28.4; y += 2.45) scores.push([[tc - 2.0, y], [tc + 2.0, y]]);
    scores.push([[tc - 2.4, 30.4], [tc - 1.2, 30.4], [tc - 1.2, 29.9], [tc + 1.2, 29.9], [tc + 1.2, 30.4], [tc + 2.4, 30.4]]);
  }
  // U1 train between the towers' arcade band: small cab + windows left of left tower
  const tx = -22;
  scores.push([[tx - 5.4, 14.9], [tx + 5.4, 14.9], [tx + 5.9, 15.7], [tx + 5.9, 17.6], [tx - 5.9, 17.6], [tx - 5.9, 15.7], [tx - 5.4, 14.9]]);
  for (const wx of [-3.9, -1.3, 1.3, 3.9]) scores.push([[tx + wx - 0.9, 15.8], [tx + wx + 0.9, 15.8], [tx + wx + 0.9, 17.0], [tx + wx - 0.9, 17.0], [tx + wx - 0.9, 15.8]]);
  return {
    name: "oberbaumbruecke", outline, holes, scores,
    mounts: [{ x: -22.6, open: true, restY: 7.11, lapDepth: 8 }, { x: 22.6, open: true, restY: 7.11, lapDepth: 8 }],
  };
}

// ----------------------------------------------------------------- Buddy Bär
export function buddyBear() {
  const ctrl = [
    [9.0, 1.6], [10.2, 5.5], [10.6, 10.5], [10.2, 15], [9.3, 18.4], // right leg/body
    [10.7, 20.8], [12.3, 24.6], [12.6, 27.8], [11.4, 29.2], [9.9, 27.9], [8.8, 24.7], [7.9, 22.0], // right arm+paw up
    [6.6, 21.4], [6.1, 23.4], [6.5, 26.4], // neck to ear base
    [6.1, 29.2], [4.5, 30.6], [2.9, 29.5], // right ear (distinct)
    [1.5, 28.3], [0, 28.1], [-1.5, 28.3], // dip between ears
    [-2.9, 29.5], [-4.5, 30.6], [-6.1, 29.2], // left ear
    [-6.5, 26.4], [-6.1, 23.4], [-6.6, 21.4], // left side head
    [-7.9, 22.0], [-8.8, 24.7], [-9.9, 27.9], [-11.4, 29.2], [-12.6, 27.8], [-12.3, 24.6], [-10.7, 20.8], // left arm
    [-9.3, 18.4], [-10.2, 15], [-10.6, 10.5], [-10.2, 5.5], [-9.0, 1.6],
  ];
  const smooth = catmullRom(ctrl, { closed: false, seg: 5 });
  const outline = [[-8.2, 0], [8.2, 0], ...smooth];
  const scores = [];
  scores.push(circle(-2.1, 26.2, 0.55, 8), circle(2.1, 26.2, 0.55, 8)); // eyes
  scores.push(circle(0, 24.2, 1.9, 14)); // snout
  scores.push(circle(0, 24.9, 0.6, 8)); // nose
  scores.push(arc(0, 23.4, 1.05, Math.PI * 1.15, Math.PI * 1.85)); // smile
  scores.push(arc(-3.9, 28.6, 1.0, 0.4, 2.8), arc(3.9, 28.6, 1.0, 0.35, 2.75)); // inner ears
  // heart on belly
  const heart = [];
  for (let t = 0; t <= Math.PI * 2 + 0.01; t += 0.22) {
    heart.push([0 + 2.6 * Math.pow(Math.sin(t), 3), 12.5 + 0.5 * (2.1 * Math.cos(t) - 0.8 * Math.cos(2 * t) - 0.35 * Math.cos(3 * t) - 0.15 * Math.cos(4 * t)) * 2]);
  }
  scores.push(heart);
  scores.push(arc(-5.2, 3.2, 1.3, 0.3, 2.9), arc(5.2, 3.2, 1.3, 0.25, 2.85)); // paw pads on feet
  return { name: "buddy-baer", outline, holes: [], scores, mounts: [{ x: 0, notch: true }] };
}

// ------------------------------------------------------------- Ampelmännchen
export function ampelmann() {
  // walking man on a little plinth (traffic-light green man), facing left.
  // Bold straight limbs ~3.5mm thick; window between legs is a hole.
  const outline = [
    [-13, 0], [13, 0], [13, 3], // plinth (solid band y 0..3)
    [10.9, 3], // plinth top right
    [10.4, 5.4], [8.9, 5.2], // back shoe heel
    [3.0, 12.0], [3.3, 13.6], // back leg outer up to hip/torso right
    [9.6, 10.4], [11.3, 12.2], [4.3, 16.9], // back arm swung back-down (under, tip, top)
    [2.6, 18.0], [2.5, 19.2], // shoulder/neck
    [3.5, 19.8], [4.3, 21.6], [4.1, 23.3], // head right
    [6.0, 23.7], [6.1, 25.1], // hat brim right tip
    [3.3, 25.6], [2.2, 27.4], [-0.8, 28.2], [-3.2, 26.4], [-3.5, 25.3], // hat dome
    [-6.5, 25.1], [-6.6, 23.7], [-4.0, 23.4], // hat brim left tip
    [-3.5, 21.6], [-3.1, 19.6], // face/chin
    [-4.2, 18.8], // neck front
    [-11.5, 16.6], [-12.2, 14.7], [-4.9, 14.6], // front arm forward (top, tip, under)
    [-4.3, 12.9], // armpit to hip
    [-10.2, 5.9], [-11.9, 5.3], [-12.5, 3.6], [-13, 3], // front leg + shoe toe
  ];
  const holes = [
    [[5.1, 3], [-4.6, 3], [0.3, 8.9]].reverse(), // window between legs
  ];
  const scores = [];
  scores.push([[-11.4, 1.5], [11.4, 1.5]]); // plinth line
  scores.push(circle(0.6, 22.6, 0.5, 8)); // eye
  scores.push([[8.9, 5.2], [6.4, 4.4], [5.1, 3.0]]); // back shoe sole
  scores.push([[-10.2, 5.9], [-8.2, 4.6], [-4.6, 3.6]]); // front shoe
  return {
    name: "ampelmann", outline, holes, scores,
    mounts: [{ x: 0, open: true, restY: 0, lapDepth: 7 }],
  };
}

// ---------------------------------------------------------------- Currywurst
export function currywurst() {
  const outline = [
    [-14, 0], [14, 0], // base
    [16.2, 7.6], [12.6, 7.6], // tray right rim
    // chunky wooden fork, vertical: handle, head, 3 tines
    [12.6, 12.6], [14.2, 12.6], [14.2, 17.4], [13.0, 17.4], [13.0, 14.2], [12.1, 14.2], [12.1, 17.4], [10.9, 17.4], [10.9, 14.2], [10.0, 14.2], [10.0, 17.4], [8.8, 17.4], [8.8, 12.6], [10.4, 12.6],
    [10.4, 7.6], // back to rim
    // wurst slices poking above the rim (bumpy top, right->left)
    [9.4, 7.6], [8.9, 10.8], [7.2, 12.0], [5.4, 11.2], [4.9, 9.4],
    [4.0, 11.0], [2.2, 12.2], [0.3, 11.4], [-0.3, 9.6],
    [-1.2, 11.2], [-3.0, 12.4], [-4.9, 11.5], [-5.4, 9.6],
    [-6.4, 11.0], [-8.2, 12.1], [-10.0, 11.2], [-10.4, 9.0], [-11.4, 7.6],
    [-16.2, 7.6], // tray left rim
  ];
  const scores = [];
  // slice ellipses hint + curry sauce squiggle
  for (const cx of [-8.2, -3.0, 2.2, 7.2]) scores.push(arc(cx, 9.4, 2.1, Math.PI * 0.15, Math.PI * 0.95));
  const sq = [];
  for (let x = -11; x <= 10; x += 0.8) sq.push([x, 9.8 + 1.7 * Math.sin(x * 1.05) * 0.9]);
  scores.push(sq);
  scores.push(...textStrokes("CURRY 36", { x: 0, y: 2.2, size: 3.4 }));
  scores.push([[-14.6, 6.4], [14.6, 6.4]]); // tray rim line
  return { name: "currywurst", outline, holes: [], scores, mounts: [{ x: -1.5, notch: true }] };
}

export const ALL = { fernsehturm, brandenburgerTor, siegessaeule, oberbaumbruecke, buddyBear, ampelmann, currywurst };
