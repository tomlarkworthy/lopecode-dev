// Part model + joint primitives. All joints assemble by a straight approach
// followed by a downward slide — gravity locks everything on the wall.
//
// World frame: X right, Y up, Z toward viewer. Wall behind at z ~ -26.
// Plate slab z [0,3]. Ribs behind [-16,0]. Hanger [-19,-16]. Silhouettes at
// z [zSil, zSil+3] in front, on fins (planes x=const).
import { ensureCCW, rectHoleSpikes, reliefSpike } from "./geom.js";

export const P = {
  T: 3.0,          // material thickness == slot width (kerf ~0, per user)
  hookDrop: 4,     // slide-down distance that engages hooks
  hookCatch: 3,    // hook material beyond the pierced sheet
  clear: 0.8,      // insertion clearance added to slot height
  finTabH: 8,
  ribTabH: 11,
  lapE: 14,        // default cross-lap engagement silhouette<->fin
  ribDepth: 16,    // plate standoff from hanger plane
  hangerH: 26,
  relief: 0.15,    // 45deg corner relief length
};

export const parts = [];
export const jointLog = []; // audit records for the verifier

export function addPart(part) {
  part.outline = ensureCCW(part.outline);
  part.holes = (part.holes || []).map((h) => ensureCCW(h));
  part.scores = part.scores || [];
  part.spikes = part.spikes || [];
  part.approach = part.approach || [];
  parts.push(part);
  return part;
}

// --- tab profiles, walking a vertical edge in +v direction ---------------
// edgeU: u of the edge being walked; dir: -1 tab points toward smaller u.
// Returns {pts, spikes}. Hook tab catches the far side of a 3mm sheet whose
// near face is at edgeU + dir*0 ... hmm: sheet occupies [edgeU, edgeU+dir*3].
export function hookTabUp(edgeU, dir, vB, tabH, { drop = P.hookDrop, catchLen = P.hookCatch } = {}) {
  const farFace = edgeU + dir * P.T;
  const tip = edgeU + dir * (P.T + catchLen);
  const pts = [
    [edgeU, vB],
    [farFace, vB],
    [farFace, vB - drop],
    [tip, vB - drop],
    [tip, vB + tabH],
    [edgeU, vB + tabH],
  ];
  const s = Math.SQRT1_2 * 2; // unused; angles below
  const spikes = [
    reliefSpike([edgeU, vB], angleOf(-dir, 1)),        // root bottom
    reliefSpike([edgeU, vB + tabH], angleOf(-dir, -1)),// root top
    reliefSpike([farFace, vB], angleOf(dir, 1)),       // hook throat
  ];
  return { pts, spikes };
}

export function plainTabUp(edgeU, dir, vB, tabH) {
  const farFace = edgeU + dir * P.T;
  const pts = [
    [edgeU, vB],
    [farFace, vB],
    [farFace, vB + tabH],
    [edgeU, vB + tabH],
  ];
  const spikes = [
    reliefSpike([edgeU, vB], angleOf(-dir, 1)),
    reliefSpike([edgeU, vB + tabH], angleOf(-dir, -1)),
  ];
  return { pts, spikes };
}

function angleOf(dx, dy) { return (Math.atan2(dy, dx) * 180) / Math.PI; }

// Slot in a pierced sheet (plate/hanger), sheet-local coords. The tab-bearing
// part slab spans [x0, x0+3]; the tab's final bottom edge rests at yB.
// Slot height admits tab raised by drop + clear.
export function slotRect(x0, yB, tabH, { drop = P.hookDrop, clear = P.clear } = {}) {
  const h = tabH + drop + clear;
  return {
    rect: [[x0, yB], [x0 + P.T, yB], [x0 + P.T, yB + h], [x0, yB + h]],
    spikes: rectHoleSpikes(x0, yB, P.T, h),
    span: { x0, x1: x0 + P.T, y0: yB, y1: yB + h },
  };
}

// Cut a notch of given width/depth into a horizontal bottom edge (y=0) of an
// outline. The outline must contain a segment lying on y=0 spanning the notch.
export function notchBottom(outline, xc, width, depth) {
  const w2 = width / 2;
  for (let i = 0; i < outline.length; i++) {
    const a = outline[i], b = outline[(i + 1) % outline.length];
    if (Math.abs(a[1]) > 1e-6 || Math.abs(b[1]) > 1e-6) continue;
    const lo = Math.min(a[0], b[0]), hi = Math.max(a[0], b[0]);
    if (xc - w2 < lo + 0.25 || xc + w2 > hi - 0.25) continue;
    const ltr = b[0] > a[0]; // direction of travel
    const notch = ltr
      ? [[xc - w2, 0], [xc - w2, depth], [xc + w2, depth], [xc + w2, 0]]
      : [[xc + w2, 0], [xc + w2, depth], [xc - w2, depth], [xc - w2, 0]];
    outline.splice(i + 1, 0, ...notch);
    return [
      reliefSpike([xc - w2, depth], angleOf(-1, 1)),
      reliefSpike([xc + w2, depth], angleOf(1, 1)),
    ];
  }
  throw new Error(`notchBottom: no y=0 edge spanning x=${xc} width ${width}`);
}

// Standard orthogonal frames
export const FRAME_XY = (z) => ({ O: [0, 0, z], U: [1, 0, 0], V: [0, 1, 0], N: [0, 0, 1] });
// fin/rib plane at world x = x0 (slab [x0, x0+3]); local u = world z, v = world y
export const FRAME_YZ = (x0) => ({ O: [x0, 0, 0], U: [0, 0, 1], V: [0, 1, 0], N: [1, 0, 0] });
