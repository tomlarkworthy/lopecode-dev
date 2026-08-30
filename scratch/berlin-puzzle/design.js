// Full assembly design: plate (Berlin map), ribs+hanger (wall mount),
// fins (standoff brackets), landmark silhouettes. Every joint approaches
// straight then slides DOWN to lock (gravity = the locking force on a wall).
import {
  catmullRom, circle, rect, translatePoly, bbox, reliefSpike,
} from "./lib/geom.js";
import { blob, blobBB, spree, havel, lakes, mapXY } from "./lib/map.js";
import { textStrokes } from "./lib/font.js";
import { P, addPart, parts, jointLog, hookTabUp, plainTabUp, slotRect, notchBottom, FRAME_XY, FRAME_YZ } from "./lib/parts.js";
import { ALL } from "./lib/landmarks.js";

const T = P.T;

// ------------------------------------------------------------------ plate
const plate = addPart({
  id: "plate", label: "Berlin map plate", kind: "plate",
  outline: blob.map((p) => [...p]),
  holes: [],
  frame: FRAME_XY(0),
  approach: [],
  order: 0,
  sheet: { n: 1, x: 0, y: 0, rot: 0 },
});
const sp = spree(), hv = havel();
for (const h of [...sp.holes, ...hv.holes, ...lakes()]) plate.holes.push(h);
for (const m of [...sp.bridgeMarks, ...hv.bridgeMarks]) plate.scores.push(m);

// ------------------------------------------------------- ribs + hanger bar
// Ribs: vertical strips behind the plate (slab x [xR, xR+3], z [-ribDepth, 0]).
// Two hook tabs pierce the plate (hooks catch the plate front, slide down).
// A rear ear hooks down over the wall-mounted hanger bar.
const RIB_X = [128, 220];           // slab min-x, chosen clear of fins/river slots
const ribYTabs = [[70, 190], [64, 190]]; // [low, high] tab bottoms per rib (world y)
const D = P.ribDepth;
const HANGER_TOP = 222, HANGER_H = P.hangerH;
const EAR_TOP = 227, EAR_BOT = 206, NOTCH_CEIL = HANGER_TOP - 2;

RIB_X.forEach((xR, i) => {
  const [yLo, yHi] = ribYTabs[i];
  const yBot = yLo - 12, yTop = EAR_TOP;
  const o = [];
  // front edge (z=0, against plate back face), walking up with two hook tabs
  o.push([0, yBot]);
  const t1 = hookTabUp(0, +1, yLo, P.ribTabH);
  const t2 = hookTabUp(0, +1, yHi, P.ribTabH);
  o.push(...t1.pts, ...t2.pts);
  o.push([0, yTop]);
  // rear ear hooks down over the hanger bar: ear z[-22,-16], notch z[-19,-16]
  o.push([-(D + 6), yTop]);           // ear top rear corner (z -22)
  o.push([-(D + 6), EAR_BOT]);        // ear rear edge down
  o.push([-(D + 3), EAR_BOT]);        // ear bottom to notch back wall
  o.push([-(D + 3), NOTCH_CEIL]);     // notch back wall up
  o.push([-D, NOTCH_CEIL]);           // notch ceiling (rests on hanger notch floor)
  o.push([-D, yBot + 22], [-D + 5, yBot + 4], [-D + 7, yBot]); // rear edge + wall-bumper chamfer
  const rib = addPart({
    id: `rib${i + 1}`, label: `Rib R${i + 1}`, kind: "rib",
    outline: o, holes: [],
    spikes: [...t1.spikes, ...t2.spikes,
      reliefSpike([-(D + 3), NOTCH_CEIL], 135), reliefSpike([-D, NOTCH_CEIL], 45)],
    scores: textStrokes(`R${i + 1}`, { x: -D / 2, y: (yBot + yTop) / 2, size: 6, angle: 90 }),
    frame: FRAME_YZ(xR),
    order: 1,
    approach: [[0, P.hookDrop + P.clear / 2, -46], [0, P.hookDrop + P.clear / 2, 0]],
    lockTests: [{ dir: [0, 0, -2], mustCollide: true, why: "hooks catch plate front" }],
  });
  // plate slots for the two front tabs
  for (const yB of [yLo, yHi]) {
    const s = slotRect(xR, yB, P.ribTabH);
    plate.holes.push(s.rect); plate.spikes.push(...s.spikes);
    jointLog.push({ joint: `rib${i + 1}->plate`, slot: s.span, tabH: P.ribTabH });
  }
  plate.scores.push(...textStrokes(`R${i + 1}`, { x: xR + 1.5, y: yLo - 4.5, size: 3, anchor: "middle" }));
  jointLog.push({ joint: `rib${i + 1}->hanger`, lap: { notchCeil: NOTCH_CEIL, hangerTop: HANGER_TOP } });
});

// hanger bar: plain bar with keyholes; rib ears hook down over its top edge.
// Slab z [-(D+3), -D]; local XY = world XY. Screwed to the wall (heads ~7mm
// proud); the sculpture drops onto it, rib notch ceilings resting in the
// bar's shallow top-edge notches (x-lock).
{
  const y0 = HANGER_TOP - HANGER_H, y1 = HANGER_TOP;
  const x0 = 108, x1 = 236; // stays hidden behind the blob (and clear of the Tegeler See cutout)
  const o = [];
  o.push([x0 + 3, y0], [x1 - 3, y0], [x1, y0 + 3], [x1, y1 - 3], [x1 - 3, y1]);
  // top edge right-to-left with a shallow notch over each rib ear
  const spikes = [];
  for (const xR of [...RIB_X].sort((a, b) => b - a)) {
    o.push([xR + 3.2, y1], [xR + 3.2, NOTCH_CEIL], [xR - 0.2, NOTCH_CEIL], [xR - 0.2, y1]);
    spikes.push(reliefSpike([xR - 0.2, NOTCH_CEIL], 225), reliefSpike([xR + 3.2, NOTCH_CEIL], 315));
    jointLog.push({ joint: `hanger-notch@${xR}`, lap: { floor: NOTCH_CEIL } });
  }
  o.push([x0 + 3, y1], [x0, y1 - 3], [x0, y0 + 3]);
  const holes = [];
  // keyholes: screw head passes the circle; the bar slides DOWN so the shaft
  // rides up the narrow slot. Gravity locks.
  for (const kx of [118, 214]) {
    const ky = y0 + 8, r = 4.4, sw = 2.2, top = y0 + 20;
    const kh = [];
    for (let a = 60; a >= -240; a -= 12) kh.push([kx + r * Math.cos(a * Math.PI / 180), ky + r * Math.sin(a * Math.PI / 180)]);
    kh.push([kx - sw, ky + r * Math.sin(120 * Math.PI / 180)], [kx - sw, top], [kx + sw, top]);
    holes.push(kh);
  }
  addPart({
    id: "hanger", label: "Hanger bar (keyholes)", kind: "hanger",
    outline: o, holes, spikes,
    scores: [
      ...textStrokes("BERLIN  WHIMSY  MAP", { x: 166, y: y0 + 14.5, size: 5 }),
      ...textStrokes("OBEN - THIS WAY UP", { x: 166, y: y0 + 5, size: 3.2 }),
      [[159, y0 + 20.9], [166, y0 + 23.4], [173, y0 + 20.9]], // up arrow
    ],
    frame: FRAME_XY(-(D + T)),
    order: 2,
    approach: [[0, -(HANGER_TOP - EAR_BOT - 0.5), 0]], // relative: sculpture drops onto the bar
    lockTests: [{ dir: [0, 0, -2], mustCollide: true, why: "rib ear back wall traps bar" },
                { dir: [0, 0, 2], mustCollide: true, why: "rib body blocks forward" }],
  });
}

// ------------------------------------------------------------- landmarks
// spec: lon/lat anchor, zSil standoff (silhouette back face), factory
const LM = [
  { key: "fernsehturm", at: [13.4094, 52.527], z: 18, finTabs: "high", scale: 0.9 },
  { key: "brandenburgerTor", at: [13.3745, 52.5115], z: 26, finTabs: "low", scale: 1.0 },
  { key: "siegessaeule", at: [13.336, 52.5148], z: 18, finTabs: "low", scale: 0.85 },
  { key: "oberbaumbruecke", at: [13.464, 52.4985], z: 14, finTabs: "split", scale: 0.85 },
  { key: "buddyBear", at: [13.296, 52.4985], z: 30, finTabs: "low", scale: 0.85 },
  { key: "ampelmann", at: [13.4405, 52.5525], z: 30, finTabs: "low", scale: 0.8, knee: [13, 163.8] },
  { key: "currywurst", at: [13.372, 52.478], z: 36, finTabs: "low", scale: 0.8 },
];

let finN = 0;
for (const spec of LM) {
  const lm = ALL[spec.key]();
  const sc = spec.scale ?? 1;
  if (sc !== 1) {
    const S = (pts) => pts.map(([x, y]) => [x * sc, y * sc]);
    lm.outline = S(lm.outline);
    lm.holes = lm.holes.map(S);
    lm.scores = lm.scores.map(S);
    lm.mounts = lm.mounts.map((m) => ({ ...m, x: m.x * sc, restY: m.restY !== undefined ? m.restY * sc : undefined }));
  }
  const [ax, ay] = mapXY(spec.at[0], spec.at[1]);
  const zS = spec.z;
  const silBot = ay; // silhouette bottom edge sits at its map point
  const silhouette = addPart({
    id: lm.name, label: lm.name, kind: "silhouette",
    outline: lm.outline, holes: lm.holes, scores: lm.scores,
    spikes: [],
    frame: { O: [ax, silBot, zS], U: [1, 0, 0], V: [0, 1, 0], N: [0, 0, 1] },
    order: 4,
    approach: [],
    lockTests: [{ dir: [0, 0, 2], mustCollide: true, why: "fin slot front wall" },
                { dir: [0, 0, -2], mustCollide: true, why: "fin slot back wall" }],
  });

  let slideDown = 0;
  for (const m of lm.mounts) {
    finN++;
    const fid = `F${finN}`;
    const xW = ax + m.x - 1.5; // fin slab min-x (centered on mount)
    // lap geometry
    const lapDepth = m.notch ? P.lapE / 2 : m.lapDepth; // fin slot depth
    const restY = m.notch ? 0 : m.restY;                // silhouette material bottom at mount
    const vSlotBot = silBot + restY;                     // fin slot bottom (world y)
    const vMastTop = vSlotBot + lapDepth + (m.notch ? P.lapE / 2 : 0);
    slideDown = Math.max(slideDown, m.notch ? P.lapE : restY + lapDepth);
    if (m.notch) {
      const sp2 = notchBottom(silhouette.outline, m.x, T, P.lapE / 2);
      silhouette.spikes.push(...sp2);
    }
    // fin tab vertical layout
    const tabH = P.finTabH;
    let hookB, plainB, backTop, backBot;
    if (spec.finTabs === "high") { hookB = silBot + 18; plainB = silBot + 2; }
    else if (spec.finTabs === "split" && m.x > 0) { hookB = silBot + 6; plainB = silBot - 41; }
    else if (spec.finTabs === "split") { hookB = silBot - 14; plainB = silBot - 32; }
    else { hookB = silBot - 12.5; plainB = silBot - 30.5; }
    backTop = hookB + tabH + 5.5; backBot = plainB - 4;
    // fin outline in (u=z, v=y) world coords
    const mastB = zS - T, mastF = zS + 2 * T;
    const o = [];
    o.push([T, backTop]); // top of back edge (hugs plate front)
    o.push([mastB, vMastTop]); // strut top edge to mast back wall top
    o.push([zS, vMastTop], [zS, vMastTop - lapDepth], [zS + T, vMastTop - lapDepth], [zS + T, vMastTop]); // mast slot
    o.push([mastF - 0.8, vMastTop], [mastF, vMastTop - 0.8]); // front wall top (chamfer)
    o.push([mastF, silBot - 9]); // front wall down
    if (spec.knee) o.push(spec.knee); // clear a neighbour's slide corridor
    o.push([T + 4, backBot + 2], [T, backBot]); // arm underside sweep to plate
    // back edge walking UP with plain tab then hook tab
    const pt = plainTabUp(T, -1, plainB, tabH);
    const ht = hookTabUp(T, -1, hookB, tabH);
    o.push(...pt.pts, ...ht.pts);
    const fin = addPart({
      id: fid, label: `Fin ${fid} (${lm.name})`, kind: "fin",
      outline: o, holes: [],
      spikes: [
        ...pt.spikes, ...ht.spikes,
        reliefSpike([zS, vMastTop - lapDepth], 225), // slot bottom corners: into web
        reliefSpike([zS + T, vMastTop - lapDepth], 315),
      ],
      scores: textStrokes(fid, { x: (T + mastF) / 2, y: backBot + 7, size: 4 }),
      frame: FRAME_YZ(xW),
      order: 3,
      approach: [[0, P.hookDrop + P.clear / 2, 60], [0, P.hookDrop + P.clear / 2, 0]],
      lockTests: [{ dir: [0, 0, 3], mustCollide: true, why: "hook catches plate back" }],
    });
    // plate slots + ID labels
    for (const [yB, th] of [[hookB, tabH], [plainB, tabH]]) {
      const s = slotRect(xW, yB, th);
      plate.holes.push(s.rect); plate.spikes.push(...s.spikes);
      jointLog.push({ joint: `${fid}->plate`, slot: s.span, tabH: th });
    }
    plate.scores.push(...textStrokes(fid, { x: xW + 1.5, y: plainB - 4.2, size: 3 }));
    jointLog.push({ joint: `${lm.name}<->${fid}`, lapDepth, restY, vMastTop });
  }
  silhouette.approach = [[0, slideDown - 0.5, 0]];
  silhouette.order = 4;
}

// --------------------------------------------------------- plate artwork
function addPlateArt() {
  const s = plate.scores;
  const at = (lon, lat) => mapXY(lon, lat);
  // title
  s.push(...textStrokes("BERLIN", { x: at(13.478, 52.607)[0], y: at(13.478, 52.607)[1], size: 13, spacing: 1.12, angle: -2 }));
  // compass rose (NW, Tegel forest)
  {
    const [cx, cy] = at(13.165, 52.59);
    s.push(circle(cx, cy, 7, 28), circle(cx, cy, 5.4, 24));
    s.push([[cx, cy - 5.4], [cx - 1.8, cy], [cx, cy + 5.4], [cx + 1.8, cy], [cx, cy - 5.4]]);
    s.push(...textStrokes("N", { x: cx, y: cy + 8.4, size: 4.5 }));
  }
  // Tempelhofer Feld: oval rings + kite on a string
  {
    const [cx, cy] = at(13.402, 52.474);
    const oval = (rx, ry) => { const o = []; for (let a = 0; a <= 360; a += 12) o.push([cx + rx * Math.cos(a * Math.PI / 180), cy + ry * Math.sin(a * Math.PI / 180)]); return o; };
    s.push(oval(10, 5.2), oval(6.6, 3.1));
    const kx = cx + 15, ky = cy + 11;
    s.push([[kx, ky], [kx - 2.6, ky - 3.4], [kx, ky - 7.2], [kx + 2.6, ky - 3.4], [kx, ky]]); // kite diamond
    s.push([[kx, ky - 7.2], [kx - 1.4, ky - 9], [kx + 0.6, ky - 10.4], [kx - 0.8, ky - 12]]); // tail
    const st = []; for (let t = 0; t <= 1.001; t += 0.12) st.push([kx - 2.6 - (kx - 2.6 - (cx + 2)) * t, ky - 3.4 - (ky - 3.4 - cy) * t + 3.5 * Math.sin(t * 6)]); s.push(st); // string
    s.push(...textStrokes("TEMPELHOFER FELD", { x: cx, y: cy - 9.6, size: 3.2 }));
  }
  // Rosinenbomber + parachute candies (approach to Tempelhof)
  {
    const [px, py] = at(13.355, 52.452);
    s.push([[px - 7, py], [px + 4.6, py], [px + 6.8, py + 1.2], [px + 4.2, py + 1.6], [px - 5.2, py + 1.4], [px - 7, py]]); // fuselage
    s.push([[px - 1.2, py + 0.8], [px - 3.2, py + 4.2], [px - 1.0, py + 4.0], [px + 0.9, py + 1.2]]); // wing
    s.push([[px - 6.2, py + 1.2], [px - 7.6, py + 3.4], [px - 6.2, py + 3.2], [px - 5.2, py + 1.4]]); // tail
    s.push(circle(px + 2.2, py + 0.4, 0.9, 8), circle(px - 0.6, py + 0.35, 0.9, 8)); // props/engines
    for (const [dx, dy] of [[9, -5], [13, -9], [16.5, -13.5]]) {
      const bx = px + dx, by = py + dy;
      s.push(arcPts(bx, by, 2.2, Math.PI, 0)); // canopy
      s.push([[bx - 2.2, by], [bx - 0.7, by - 3]], [[bx + 2.2, by], [bx + 0.7, by - 3]]);
      s.push([[bx - 0.7, by - 3], [bx + 0.7, by - 3], [bx + 0.7, by - 4.2], [bx - 0.7, by - 4.2], [bx - 0.7, by - 3]]); // candy box
    }
  }
  // Grunewald pines + Teufelsberg domes
  {
    const pine = (x, y, sc = 1) => {
      s.push([[x - 2.6 * sc, y], [x, y + 5.4 * sc], [x + 2.6 * sc, y], [x - 2.6 * sc, y]]);
      s.push([[x - 1.9 * sc, y + 2.6 * sc], [x, y + 6.8 * sc], [x + 1.9 * sc, y + 2.6 * sc]]);
      s.push([[x - 0.45 * sc, y], [x - 0.45 * sc, y - 1.6 * sc], [x + 0.45 * sc, y - 1.6 * sc], [x + 0.45 * sc, y]]);
    };
    const spots = [[13.225, 52.487], [13.243, 52.474], [13.262, 52.492], [13.212, 52.468], [13.235, 52.456], [13.28, 52.478]];
    spots.forEach(([lo, la], i) => { const [x, y] = at(lo, la); pine(x, y, 0.85 + (i % 3) * 0.2); });
    const [tx, ty] = at(13.247, 52.498);
    s.push([[tx - 6, ty], [tx + 6, ty], [tx + 4, ty + 2.6], [tx - 4, ty + 2.6], [tx - 6, ty]]); // hill
    s.push(arcPts(tx - 2.2, ty + 2.6, 1.7, Math.PI, 0), arcPts(tx + 1.8, ty + 2.6, 2.2, Math.PI, 0)); // radomes
    s.push(...textStrokes("GRUNEWALD", { x: tx + 1, y: ty - 7.5, size: 3.2 }));
  }
  // Tiergarten mini park ring around Siegessäule
  {
    const [cx, cy] = at(13.336, 52.5148);
    for (const [dx, dy] of [[-9, -3], [-6.5, 3.5], [7, 3], [10, -2.5], [-11.5, 1]]) {
      s.push(circle(cx + dx, cy + dy, 1.7, 10), [[cx + dx, cy + dy - 1.7], [cx + dx, cy + dy - 3.2]]);
    }
  }
  // labels
  const label = (txt, lon, lat, size = 4.4, angle = 0) => {
    const [x, y] = at(lon, lat); s.push(...textStrokes(txt, { x, y, size, angle }));
  };
  label("SPANDAU", 13.163, 52.53);
  label("WANNSEE", 13.148, 52.408);
  label("MÜGGELSEE", 13.641, 52.405);
  label("KÖPENICK", 13.565, 52.425);
  label("TEGEL", 13.29, 52.585);
  label("MITTE", 13.402, 52.535, 4.0);
  label("KREUZBERG", 13.437, 52.4865, 4.0);
  label("SPREE", 13.53, 52.4415, 4.0, 24);
  label("HAVEL", 13.1795, 52.483, 4.0, 78);
  // bear paw trail wandering out of Köpenick forest
  {
    const paw = (x, y, a) => {
      const ca = Math.cos(a), sa = Math.sin(a);
      const T2 = (dx, dy) => [x + dx * ca - dy * sa, y + dx * sa + dy * ca];
      s.push([T2(-0.9, 0), T2(0.9, 0), T2(0.9, 1.3), T2(-0.9, 1.3), T2(-0.9, 0)].map((p) => p)); // pad
      for (const ddx of [-1.05, -0.35, 0.35, 1.05]) { const c = T2(ddx, 2.05); s.push(circle(c[0], c[1], 0.32, 6)); }
    };
    const trail = [[13.60, 52.46, 2.6], [13.585, 52.472, 2.9], [13.575, 52.486, 3.1], [13.558, 52.494, 3.4], [13.54, 52.499, 3.5]];
    for (const [lo, la, a] of trail) { const [x, y] = at(lo, la); paw(x, y, a); }
  }
}
function arcPts(cx, cy, r, a0, a1, n = 10) {
  const o = []; for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; o.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); } return o;
}
addPlateArt();

export { parts, plate, jointLog, LM };
