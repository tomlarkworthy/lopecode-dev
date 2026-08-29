// Berlin map geometry: whimsical boundary blob, Spree/Havel cut ribbons with
// bridge tabs, lakes. All in plate-local mm, y-up (north up).
import { catmullRom, offsetPolyline, bbox, translatePoly, lerp2, sub2, add2, norm2, perp2, scale2, len2 } from "./geom.js";

// lon/lat -> mm. Anamorphic x stretch 1.15 for whimsy + sheet fit.
const LON0 = 13.088, LAT0 = 52.338;
const KY = 777, KX = 777 * 0.6088 * 1.15; // = 543.9 mm/deg lon
let OX = 0, OY = 0; // set after blob computed so bbox min lands at (8,8)

export const mapXY = (lon, lat) => [(lon - LON0) * KX + OX, (lat - LAT0) * KY + OY];

// Whimsical Berlin boundary, CCW from SW tip.
const BOUNDARY = [
  [13.108, 52.398], // Wannsee SW tip
  [13.20, 52.402],  // Zehlendorf
  [13.28, 52.378],  // Lichterfelde
  [13.35, 52.360],  // Marienfelde
  [13.405, 52.340], // Lichtenrade (southmost)
  [13.47, 52.368],  // Buckow
  [13.52, 52.398],  // Rudow
  [13.575, 52.362], // Grünau
  [13.655, 52.341], // Schmöckwitz tip
  [13.705, 52.375], // Müggelheim
  [13.755, 52.425], // east tip
  [13.715, 52.475], // Rahnsdorf
  [13.635, 52.505], // Mahlsdorf
  [13.62, 52.545],  // Hellersdorf
  [13.56, 52.575],  // Ahrensfelde
  [13.505, 52.635], // Buch
  [13.415, 52.668], // north tip Blankenfelde
  [13.30, 52.662],  // Frohnau
  [13.215, 52.605], // Heiligensee
  [13.13, 52.555],  // Staaken NW
  [13.098, 52.495], // Gatow
  [13.115, 52.438], // Kladow
  [13.092, 52.412], // Glienicke
];

// Compute blob once, derive OX/OY.
const rawBlob = catmullRom(BOUNDARY.map(([lo, la]) => [(lo - LON0) * KX, (la - LAT0) * KY]), { seg: 9 });
const bb = bbox(rawBlob);
OX = 8 - bb.x0; OY = 8 - bb.y0;
export const blob = translatePoly(rawBlob, OX, OY);
export const blobBB = bbox(blob);

// ---- rivers ----
const SPREE = [
  [13.594, 52.4425], [13.575, 52.442], [13.545, 52.452],
  [13.512, 52.468], [13.492, 52.482], [13.468, 52.494], [13.4457, 52.5019],
  [13.428, 52.508], [13.413, 52.514], [13.402, 52.520], [13.387, 52.521],
  [13.370, 52.524], [13.35, 52.528], [13.323, 52.531], [13.30, 52.524],
  [13.28, 52.522], [13.255, 52.528], [13.24, 52.5345], [13.2335, 52.535],
];
const HAVEL = [
  [13.222, 52.560], [13.207, 52.539],
  [13.199, 52.518], [13.187, 52.494], [13.178, 52.472], [13.160, 52.452],
  [13.150, 52.434], [13.134, 52.418], [13.118, 52.404],
];

// bridge tab centers, located by nearest point on the river centerline
const SPREE_BRIDGES = [
  { at: [13.4575, 52.4985], name: "OBERBAUM" },
  { at: [13.401, 52.520], name: "SCHLOSS" },       // Museumsinsel
  { at: [13.370, 52.524], name: "MOLTKE" },        // near Hbf
  { at: [13.29, 52.523], name: "CHARLOTTENBURG" },
];
const HAVEL_BRIDGES = [
  { at: [13.204, 52.532], name: "SPANDAU" },
  { at: [13.142, 52.425], name: "GLIENICKE" },     // Bridge of Spies
];

function resample(pts, step) {
  const out = [pts[0]];
  let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    let a = pts[i - 1], b = pts[i];
    let d = len2(sub2(b, a));
    let t = 0;
    while (acc + (d - t) >= step) {
      t += step - acc;
      out.push(lerp2(a, b, t / d));
      acc = 0;
    }
    acc += d - t;
  }
  out.push(pts[pts.length - 1]);
  return out;
}

// Build river hole polygons: ribbon of width w, split at bridge tabs (gap wide).
export function riverHoles(waypoints, w, bridges, gap = 7, taper = true) {
  const center0 = catmullRom(waypoints.map(([lo, la]) => mapXY(lo, la)), { closed: false, seg: 8 });
  const center = resample(center0, 1.2);
  const n = center.length;
  let total = 0;
  const cum = [0];
  for (let i = 1; i < n; i++) { total += len2(sub2(center[i], center[i - 1])); cum.push(total); }
  // segment ranges between bridges (nearest centerline point to each bridge)
  const cuts = bridges.map((b) => {
    const p = mapXY(b.at[0], b.at[1]);
    let best = 0, bd = Infinity;
    for (let i = 0; i < n; i++) {
      const d = len2(sub2(center[i], p));
      if (d < bd) { bd = d; best = i; }
    }
    return cum[best];
  }).sort((a, b) => a - b);
  const ranges = [];
  let s0 = 0;
  for (const c of cuts) { ranges.push([s0, c - gap / 2]); s0 = c + gap / 2; }
  ranges.push([s0, total]);
  const holes = [];
  const bridgeMarks = [];
  for (const [a, b] of ranges) {
    const idx = [];
    for (let i = 0; i < n; i++) if (cum[i] >= a && cum[i] <= b) idx.push(i);
    if (idx.length < 3) continue;
    const seg = idx.map((i) => center[i]);
    const widthAt = (i, m) => {
      if (!taper) return w;
      const s = cum[idx[i]];
      const endFade = Math.min(s / 22, (total - s) / 22, 1);
      return w * (0.55 + 0.45 * Math.min(1, endFade));
    };
    const left = seg.map((p, i) => {
      const dir = norm2(sub2(seg[Math.min(i + 1, seg.length - 1)], seg[Math.max(0, i - 1)]));
      return add2(p, scale2(perp2(dir), widthAt(i) / 2));
    });
    const right = seg.map((p, i) => {
      const dir = norm2(sub2(seg[Math.min(i + 1, seg.length - 1)], seg[Math.max(0, i - 1)]));
      return add2(p, scale2(perp2(dir), -widthAt(i) / 2));
    });
    holes.push([...left, ...right.reverse()]);
  }
  // bridge marks: two short score lines across the tab
  for (const c of cuts) {
    let i = 0;
    while (i < n - 1 && cum[i] < c) i++;
    const p = center[i];
    const dir = norm2(sub2(center[Math.min(i + 1, n - 1)], center[Math.max(0, i - 1)]));
    const nrm = perp2(dir);
    for (const off of [-gap / 2 - 1.2, gap / 2 + 1.2]) {
      const q = add2(p, scale2(dir, off));
      bridgeMarks.push([add2(q, scale2(nrm, w / 2 + 1)), add2(q, scale2(nrm, -w / 2 - 1))]);
    }
  }
  return { holes, bridgeMarks, center };
}

export function spree() { return riverHoles(SPREE, 5.2, SPREE_BRIDGES); }
export function havel() { return riverHoles(HAVEL, 6.5, HAVEL_BRIDGES); }

// lakes: organic blobs (cut holes)
function lake(ctrl) {
  return catmullRom(ctrl.map(([lo, la]) => mapXY(lo, la)), { seg: 8 });
}
export function lakes() {
  return [
    // Müggelsee
    lake([[13.60, 52.437], [13.617, 52.447], [13.65, 52.449], [13.678, 52.441], [13.685, 52.428], [13.66, 52.418], [13.625, 52.420], [13.605, 52.428]]),
    // Tegeler See
    lake([[13.235, 52.596], [13.255, 52.594], [13.268, 52.582], [13.258, 52.568], [13.242, 52.566], [13.228, 52.578]]),
    // Wannsee
    lake([[13.184, 52.456], [13.198, 52.450], [13.203, 52.437], [13.194, 52.424], [13.1815, 52.427], [13.1785, 52.444]]),
  ];
}
