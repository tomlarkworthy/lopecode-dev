// Emit laser-ready sheets: RED cut / BLUE score, 400x300mm 3mm ply.
// Big flat parts go in a 2x2 grid + a rotated third column; small parts nest
// INSIDE the ring interiors (the waste becomes the mechanism).
// L01 (base plate) is emitted MIRRORED: flip it over at assembly so the
// riddle faces the table, readable only when the box is turned upside down.
import { parts } from "./design.js";
import { bbox } from "../lib/geom.js";
import { svgDoc, pathD, flipY, spikeSegments, cutPath, scorePath, CUT, SCORE, STROKE_W } from "../lib/svg.js";
import { writeFileSync } from "fs";

const SHEET_W = 400, SHEET_H = 300, M = 5.5, GAP = 3;

const byId = new Map(parts.map((p) => [p.id, p]));
const big = (id) => byId.get(id);

// ---- big-part slot layout -------------------------------------------------
const BIG_SHEETS = [
  ["L00", "L01", "L02", "L03", "L04", "L05"],
  ["L06", "L07", "L08", "L09", "L10", "L11"],
  ["L12", "L13", "L14", "L15", "L16", "L17"],
  ["L18", "RUNNER", "LFRAME", "LTOP"],
];
let maxW = 0, maxH = 0;
for (const ids of BIG_SHEETS) for (const id of ids) {
  const bb = bbox(big(id).outline);
  maxW = Math.max(maxW, bb.w); maxH = Math.max(maxH, bb.h);
}
const colW = maxW + GAP, rowH = maxH + GAP;
if (M + 2 * colW + maxH + GAP + M > SHEET_W + 1e-6 || M + 2 * rowH - GAP + M > SHEET_H) {
  console.error(`layout bust: maxW=${maxW.toFixed(1)} maxH=${maxH.toFixed(1)}`);
  process.exit(1);
}
// slots: 4 upright (2x2) then 2 rotated 90 in the third column
const SLOTS = [
  { x: M, y: M, rot: 0 }, { x: M + colW, y: M, rot: 0 },
  { x: M, y: M + rowH, rot: 0 }, { x: M + colW, y: M + rowH, rot: 0 },
  { x: M + 2 * colW, y: M, rot: 90 }, { x: M + 2 * colW, y: M + maxW + GAP, rot: 90 },
];

const placements = new Map(); // id -> {sheet, x, y, rot, bb, mirror}
BIG_SHEETS.forEach((ids, si) => {
  ids.forEach((id, i) => {
    const p = big(id);
    placements.set(id, { sheet: si + 1, ...SLOTS[i], bb: bbox(p.outline), mirror: id === "L01" });
  });
});

// ---- nest small parts inside ring interiors -------------------------------
// safe interior rects (part-local coords) per ring id
function interiorRect(id) {
  const k = parseInt(id.slice(1), 10);
  if (Number.isNaN(k)) return null;
  if (id === "L00") return { x0: 17, y0: 17, x1: 115, y1: 79 };
  if (k >= 2 && k <= 5) return { x0: 32, y0: 39, x1: 100, y1: 88 };
  if (k >= 7 && k <= 16) return { x0: 12.5, y0: 12.5, x1: 119.5, y1: 81 };
  if (k === 17 || k === 18) return { x0: 15, y0: 9, x1: 117, y1: 83 };
  return null; // plates
}
const smalls = parts.filter((p) => !placements.has(p.id)).map((p) => {
  const bb = bbox(p.outline);
  const rot = bb.h > bb.w ? 90 : 0;
  return { p, bb, rot, w: rot ? bb.h : bb.w, h: rot ? bb.w : bb.h };
}).sort((a, b) => b.h - a.h);

// shelf-pack regions: ring interiors (upright slots only) in sheet coords
const regions = [];
for (const [id, pl] of placements) {
  const ir = interiorRect(id);
  if (!ir || pl.rot !== 0) continue;
  regions.push({
    sheet: pl.sheet,
    x0: pl.x + (ir.x0 - pl.bb.x0), y0: pl.y + (ir.y0 - pl.bb.y0),
    x1: pl.x + (ir.x1 - pl.bb.x0), y1: pl.y + (ir.y1 - pl.bb.y0),
    cx: 0, cy: 0, shelf: 0,
  });
}
for (const it of smalls) {
  let done = false;
  for (const r of regions) {
    const W2 = r.x1 - r.x0, H2 = r.y1 - r.y0;
    if (it.w > W2 || it.h > H2) continue;
    if (r.cx + it.w > W2) { r.cy += r.shelf + GAP; r.cx = 0; r.shelf = 0; }
    if (r.cy + it.h > H2) continue;
    placements.set(it.p.id, { sheet: r.sheet, x: r.x0 + r.cx, y: r.y0 + r.cy, rot: it.rot, bb: it.bb });
    r.cx += it.w + GAP;
    r.shelf = Math.max(r.shelf, it.h);
    done = true;
    break;
  }
  if (!done) { console.error(`NEST FAIL: ${it.p.id} (${it.w.toFixed(1)}x${it.h.toFixed(1)})`); process.exit(1); }
}

// ---- transforms ------------------------------------------------------------
function toSheet(pl, pts) {
  return pts.map(([u, v]) => {
    let a = u, b = v;
    if (pl.mirror) a = pl.bb.x0 + pl.bb.x1 - a;
    if (pl.rot) { const t = [b - pl.bb.y0, pl.bb.x1 - a]; a = t[0]; b = t[1]; }
    else { a = a - pl.bb.x0; b = b - pl.bb.y0; }
    return [a + pl.x, b + pl.y];
  });
}

// ---- emit ------------------------------------------------------------------
const sheets = new Map();
for (const p of parts) {
  const pl = placements.get(p.id);
  if (!pl) { console.error(`no placement: ${p.id}`); process.exit(1); }
  if (!sheets.has(pl.sheet)) sheets.set(pl.sheet, { cut: [], score: [], spikes: [], n: 0 });
  const S = sheets.get(pl.sheet);
  const tf = (pts) => toSheet(pl, pts);
  let d = pathD(flipY(tf(p.outline), SHEET_H), true);
  for (const h of p.holes) d += " " + pathD(flipY(tf(h), SHEET_H), true);
  S.cut.push(d);
  S.n++;
  for (const sc of p.scores) S.score.push(pathD(flipY(tf(sc), SHEET_H), false));
  for (const seg of spikeSegments(p.spikes)) S.spikes.push(pathD(flipY(tf(seg), SHEET_H), false));
}

// bounds check
for (const [id, pl] of placements) {
  const q = toSheet(pl, byId.get(id).outline);
  const bb = bbox(q);
  if (bb.x0 < M - 1.5 || bb.y0 < M - 1.5 || bb.x1 > SHEET_W - M + 1.5 || bb.y1 > SHEET_H - M + 1.5) {
    console.error(`BOUNDS: ${id} sheet${pl.sheet} [${bb.x0.toFixed(1)},${bb.y0.toFixed(1)}]-[${bb.x1.toFixed(1)},${bb.y1.toFixed(1)}]`);
    process.exit(1);
  }
}

const preview = process.argv.includes("--preview");
for (const [n, S] of [...sheets.entries()].sort((a, b) => a[0] - b[0])) {
  let body = "";
  for (const d of S.cut) body += cutPath(d, preview) + "\n";
  for (const d of S.score) body += scorePath(d) + "\n";
  for (const d of S.spikes) body += `<path d="${d}" fill="none" stroke="${CUT}" stroke-width="${STROKE_W}"/>\n`;
  const svg = svgDoc({
    w: SHEET_W, h: SHEET_H, body, bg: preview ? "#fff" : null,
    title: `Mondtresor sheet ${n}/4 - RED cut BLUE score - 3mm ply 400x300 - scores face UP (flip L01 at assembly)`,
  });
  writeFileSync(`out/sheet${n}${preview ? "-preview" : ""}.svg`, svg);
  console.log(`sheet${n}: ${S.n} parts, ${S.score.length} scores, ${S.spikes.length} relief nicks`);
}
console.log(`total parts: ${parts.length}`);
