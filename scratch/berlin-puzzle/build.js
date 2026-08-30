// Emit laser-ready sheet SVGs: RED = cut, BLUE = score.
// Sheet 1: the map plate. Sheet 2+: everything else, shelf-packed.
import { parts, plate } from "./design.js";
import { bbox, translatePoly, rotatePoly } from "./lib/geom.js";
import { svgDoc, pathD, flipY, spikeSegments, cutPath, scorePath, CUT, STROKE_W } from "./lib/svg.js";
import { writeFileSync } from "fs";

const SHEET_W = 400, SHEET_H = 300, MARGIN = 6, GAP = 3.5;

// ---- place parts --------------------------------------------------------
// plate on sheet 1, centered
const pbb = bbox(plate.outline);
plate.sheet = { n: 1, x: (SHEET_W - pbb.w) / 2 - pbb.x0, y: (SHEET_H - pbb.h) / 2 - pbb.y0, rot: 0 };

// others: shelf packing, landscape orientation
const rest = parts.filter((p) => p !== plate).map((p) => {
  const bb = bbox(p.outline);
  const rot = bb.h > bb.w ? 90 : 0; // make landscape
  const w = rot ? bb.h : bb.w, h = rot ? bb.w : bb.h;
  return { p, bb, rot, w, h };
}).sort((a, b) => b.h - a.h);

let sheetN = 2, shelfY = MARGIN, shelfH = 0, cx = MARGIN;
for (const it of rest) {
  if (cx + it.w > SHEET_W - MARGIN) { // new shelf
    shelfY += shelfH + GAP; shelfH = 0; cx = MARGIN;
  }
  if (shelfY + it.h > SHEET_H - MARGIN) { // new sheet
    sheetN++; shelfY = MARGIN; shelfH = 0; cx = MARGIN;
  }
  // local->sheet: optional rot 90 about local bb origin, then translate
  it.p.sheet = { n: sheetN, rot: it.rot, x: cx, y: shelfY, bb: it.bb };
  cx += it.w + GAP;
  shelfH = Math.max(shelfH, it.h);
}

function toSheet(part, pts) {
  const { rot, x, y } = part.sheet;
  const bb = part.sheet.bb ?? bbox(part.outline);
  let q = pts;
  if (rot) {
    // rotate -90 (so taller-than-wide lies down): (u,v) -> (v - bb.y0, bb.x1 - u)... use rotatePoly then re-anchor
    q = q.map(([u, v]) => [v - bb.y0, (bb.x1 - u)]);
    return q.map(([a, b]) => [a + x, b + y]);
  }
  return q.map(([u, v]) => [u - bb.x0 + x, v - bb.y0 + y]);
}
// plate special-case (sheet.x/y are offsets, no re-anchor)
function toSheetPlate(pts) {
  return pts.map(([u, v]) => [u + plate.sheet.x, v + plate.sheet.y]);
}

// ---- emit ----------------------------------------------------------------
const sheets = new Map();
for (const p of parts) {
  const n = p.sheet.n;
  if (!sheets.has(n)) sheets.set(n, { cut: [], score: [], spikes: [] });
  const S = sheets.get(n);
  const tf = p === plate ? toSheetPlate : (pts) => toSheet(p, pts);
  let d = pathD(flipY(tf(p.outline), SHEET_H), true);
  for (const h of p.holes) d += " " + pathD(flipY(tf(h), SHEET_H), true);
  S.cut.push(d);
  for (const s of p.scores) S.score.push(pathD(flipY(tf(s), SHEET_H), false));
  for (const seg of spikeSegments(p.spikes)) S.spikes.push(pathD(flipY(tf(seg), SHEET_H), false));
}

const check = [];
for (const p of parts) {
  const bb = bbox(toSheet === undefined ? p.outline : (p === plate ? toSheetPlate(p.outline) : toSheet(p, p.outline)));
  if (bb.x0 < MARGIN - 1 || bb.y0 < MARGIN - 1 || bb.x1 > SHEET_W - MARGIN + 1 || bb.y1 > SHEET_H - MARGIN + 1)
    check.push(`${p.id} exceeds sheet ${p.sheet.n}: [${bb.x0.toFixed(1)},${bb.y0.toFixed(1)}]-[${bb.x1.toFixed(1)},${bb.y1.toFixed(1)}]`);
}
if (check.length) { console.error("SHEET LAYOUT FAIL"); check.forEach((c) => console.error(" ", c)); process.exit(1); }

for (const [n, S] of [...sheets.entries()].sort((a, b) => a[0] - b[0])) {
  let body = "";
  for (const d of S.cut) body += cutPath(d, process.argv.includes("--preview")) + "\n";
  for (const d of S.score) body += scorePath(d) + "\n";
  for (const d of S.spikes) body += `<path d="${d}" fill="none" stroke="${CUT}" stroke-width="${STROKE_W}"/>\n`;
  const svg = svgDoc({ w: SHEET_W, h: SHEET_H, body, bg: process.argv.includes("--preview") ? "#fff" : null, title: `Berlin puzzle sheet ${n} of ${sheets.size} - RED cut, BLUE score - 3mm ply 400x300` });
  const suffix = process.argv.includes("--preview") ? "-preview" : "";
  writeFileSync(`out/sheet${n}${suffix}.svg`, svg);
  console.log(`sheet${n}${suffix}.svg: ${S.cut.length} parts, ${S.score.length} score paths, ${S.spikes.length} relief nicks`);
}
console.log(`parts total: ${parts.length}`);
