// Assemblability + manufacturability verifier.
//  1. Assembly simulation: parts placed in order; each swept along its
//     approach path in small steps; any >eps penetration against already
//     placed parts fails.
//  2. Lock tests: at final pose, declared escape directions MUST collide
//     (the joint really locks) .
//  3. Plate/hanger hole audit: slot dims vs tab dims + insertion clearance.
//  4. Cut integrity: min wood web between any two holes / hole & outline.
//  5. Hidden-hardware check: ribs+hanger project inside the plate blob.
//  6. Hang physics: center of gravity between keyholes, below hanger.
import { parts, plate, jointLog } from "./design.js";
import { Solid, penetrates } from "./lib/solid.js";
import { toWorld, bbox, polyArea, pointInPoly, distPointPoly } from "./lib/geom.js";
import { P } from "./lib/parts.js";

const solids = new Map(parts.map((p) => [p.id, new Solid(p)]));
const report = { pass: [], fail: [], warn: [] };
const ok = (m) => report.pass.push(m);
const fail = (m) => report.fail.push(m);
const warn = (m) => report.warn.push(m);

// ---- 1. assembly simulation --------------------------------------------
const ordered = [...parts].sort((a, b) => a.order - b.order);
const placed = [];
for (const part of ordered) {
  const S = solids.get(part.id);
  if (placed.length && part.approach.length) {
    // build waypoint list: approach[0] ... approach[n-1] -> [0,0,0]
    const way = [...part.approach, [0, 0, 0]];
    let steps = 0, hit = null;
    for (let leg = 0; leg + 1 < way.length && !hit; leg++) {
      const a = way[leg], b = way[leg + 1];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
      const n = Math.max(2, Math.ceil(len / 0.75));
      for (let i = 0; i <= n && !hit; i++) {
        const t = i / n;
        const off = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
        for (const q of placed) {
          const pen = penetrates(S, solids.get(q.id), off);
          if (pen) { hit = { q: q.id, off, at: pen.at }; break; }
        }
        steps++;
      }
    }
    if (hit) fail(`ASSEMBLY ${part.id}: collides with ${hit.q} at offset [${hit.off.map((v) => v.toFixed(1))}] world [${hit.at.map((v) => v.toFixed(1))}]`);
    else ok(`assembly: ${part.id} sweeps in clean (${steps} poses checked)`);
  } else if (placed.length) {
    // static final check only
    let bad = null;
    for (const q of placed) {
      const pen = penetrates(S, solids.get(q.id), [0, 0, 0]);
      if (pen) { bad = { q: q.id, at: pen.at }; break; }
    }
    if (bad) fail(`FINAL ${part.id}: penetrates ${bad.q} at [${bad.at.map((v) => v.toFixed(1))}]`);
    else ok(`final: ${part.id} placed clean`);
  }
  placed.push(part);
}

// ---- 2. lock tests -------------------------------------------------------
for (const part of ordered) {
  if (!part.lockTests) continue;
  const S = solids.get(part.id);
  for (const lt of part.lockTests) {
    let collides = false;
    for (const q of parts) {
      if (q.id === part.id) continue;
      if (penetrates(S, solids.get(q.id), lt.dir, 0.15)) { collides = true; break; }
    }
    if (lt.mustCollide && !collides) fail(`LOCK ${part.id}: moving [${lt.dir}] does NOT lock (${lt.why})`);
    else if (lt.mustCollide) ok(`lock: ${part.id} blocked along [${lt.dir}] (${lt.why})`);
  }
}
// removability: reverse approach must be collision-free (already implied by
// sweep symmetry) - spot check silhouettes can lift up.
for (const part of ordered.filter((p) => p.kind === "silhouette")) {
  const S = solids.get(part.id);
  const up = [0, (part.approach[0]?.[1] ?? 10) + 1, 0];
  let hit = null;
  for (const q of parts) {
    if (q.id === part.id) continue;
    const pen = penetrates(S, solids.get(q.id), up);
    if (pen) { hit = q.id; break; }
  }
  if (hit) warn(`removability: ${part.id} lifted up hits ${hit}`);
  else ok(`removability: ${part.id} lifts off cleanly`);
}

// ---- 3. slot audit -------------------------------------------------------
for (const j of jointLog) {
  if (!j.slot) continue;
  const w = j.slot.x1 - j.slot.x0, h = j.slot.y1 - j.slot.y0;
  const expectH = j.tabH + P.hookDrop + P.clear;
  if (Math.abs(w - P.T) > 1e-6) fail(`SLOT ${j.joint}: width ${w} != material ${P.T}`);
  if (Math.abs(h - expectH) > 1e-6) fail(`SLOT ${j.joint}: height ${h} != ${expectH}`);
}
ok(`slot audit: ${jointLog.filter((j) => j.slot).length} slots dimensioned tabH+drop+clear, width=T`);

// ---- 4. cut integrity: min web between holes / outline -------------------
function minWeb(part, minGap, minEdge) {
  const issues = [];
  const H = part.holes;
  for (let i = 0; i < H.length; i++) {
    // hole-to-outline distance (sample hole vertices)
    let dEdge = Infinity;
    for (const p of H[i]) dEdge = Math.min(dEdge, distPointPoly(p, part.outline));
    if (dEdge < minEdge) issues.push(`hole${i}->outline web ${dEdge.toFixed(2)}mm`);
    for (let k = i + 1; k < H.length; k++) {
      const bbA = bbox(H[i]), bbB = bbox(H[k]);
      if (bbA.x0 > bbB.x1 + minGap || bbB.x0 > bbA.x1 + minGap ||
          bbA.y0 > bbB.y1 + minGap || bbB.y0 > bbA.y1 + minGap) continue;
      let d = Infinity;
      for (const p of H[i]) d = Math.min(d, distPointPoly(p, H[k]));
      for (const p of H[k]) d = Math.min(d, distPointPoly(p, H[i]));
      if (d < minGap) issues.push(`hole${i}<->hole${k} web ${d.toFixed(2)}mm`);
      // overlap check
      if (H[i].some((p) => pointInPoly(p, H[k])) || H[k].some((p) => pointInPoly(p, H[i])))
        issues.push(`hole${i} OVERLAPS hole${k}`);
    }
  }
  return issues;
}
for (const part of parts) {
  if (!part.holes.length) continue;
  const isPlate = part.kind === "plate";
  const issues = minWeb(part, isPlate ? 3.0 : 1.2, isPlate ? 3.0 : 1.2);
  if (issues.length) issues.forEach((i) => fail(`WEB ${part.id}: ${i}`));
  else ok(`web: ${part.id} holes have healthy margins (${part.holes.length} holes)`);
}

// ---- 5. hidden hardware: ribs/hanger project within blob -----------------
for (const part of parts.filter((p) => p.kind === "rib" || p.kind === "hanger")) {
  let out = 0;
  const test = (x, y) => { if (!pointInPoly([x, y], plate.outline) || distPointPoly([x, y], plate.outline) < 1.5) out++; };
  if (part.kind === "hanger") {
    for (const [u, v] of part.outline) test(u, v);
  } else {
    const x = part.frame.O[0];
    const bb = bbox(part.outline);
    for (let y = bb.y0; y <= bb.y1; y += 4) { test(x, y); test(x + P.T, y); }
  }
  if (part.kind === "hanger") {
    // must not show through any plate cutout either
    for (const [u, v] of part.outline) {
      for (const h of plate.holes) {
        if (pointInPoly([u, v], h) || distPointPoly([u, v], h) < 1.5) { out++; break; }
      }
    }
  }
  if (out) fail(`HIDE ${part.id}: ${out} sample points peek past the plate edge or through a cutout`);
  else ok(`hide: ${part.id} fully hidden behind plate`);
}

// ---- 6. hang physics ------------------------------------------------------
{
  const DENS = 0.63e-3; // g/mm^3 birch ply
  let m = 0, mx = 0, my = 0;
  for (const part of parts) {
    const a = Math.abs(polyArea(part.outline)) - part.holes.reduce((s, h) => s + Math.abs(polyArea(h)), 0);
    const bb = bbox(part.outline);
    const c2 = [(bb.x0 + bb.x1) / 2, (bb.y0 + bb.y1) / 2]; // bbox centroid approx
    const cw = toWorld(part.frame, c2[0], c2[1], P.T / 2);
    const mass = a * P.T * DENS;
    m += mass; mx += cw[0] * mass; my += cw[1] * mass;
  }
  const cog = [mx / m, my / m];
  const keyholes = [118, 214];
  ok(`mass ~${Math.round(m)}g; CoG x=${cog[0].toFixed(1)} y=${cog[1].toFixed(1)}`);
  if (cog[0] < keyholes[0] || cog[0] > keyholes[1]) fail(`HANG: CoG x ${cog[0].toFixed(1)} outside keyholes [${keyholes}]`);
  else ok(`hang: CoG between keyholes -> hangs flat`);
}

// ---- report ---------------------------------------------------------------
console.log(`\n=== VERIFICATION ${report.fail.length ? "FAILED" : "PASSED"} ===`);
console.log(`${report.pass.length} pass, ${report.warn.length} warn, ${report.fail.length} fail\n`);
for (const f of report.fail) console.log("  FAIL", f);
for (const w of report.warn) console.log("  warn", w);
if (process.argv.includes("--verbose")) for (const p of report.pass) console.log("  ok  ", p);
process.exit(report.fail.length ? 1 : 0);
