// Orthographic + isometric previews of the assembled sculpture.
import { parts } from "./design.js";
import { toWorld, bbox } from "./lib/geom.js";
import { svgDoc, pathD } from "./lib/svg.js";
import { P } from "./lib/parts.js";

const WOOD = ["#e7d7b4", "#dfcaa0", "#d6bc8c", "#cdb07c"];

function facePts(part, w) {
  return part.outline.map(([u, v]) => toWorld(part.frame, u, v, w));
}
function holePts(part, w) {
  return part.holes.map((h) => h.map(([u, v]) => toWorld(part.frame, u, v, w)));
}

// FRONT view (world XY, z toward viewer). Painter sort by z. Drop shadows.
export function frontView() {
  const H = 300, W = 400;
  const proj = ([x, y, z]) => [x + 12, H - y - 14];
  const sorted = [...parts].sort((a, b) => a.frame.O[2] * a.frame.N[2] - b.frame.O[2] * b.frame.N[2] ||
    (a.frame.N[2] === 0 ? -1 : 0) - (b.frame.N[2] === 0 ? -1 : 0));
  let body = `<rect width="${W}" height="${H}" fill="#f4efe6"/>`;
  const order = ["hanger", "rib", "plate", "fin", "silhouette"];
  const byKind = [...parts].sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind) ||
    (a.frame.O[2] - b.frame.O[2]));
  for (const p of byKind) {
    const zMid = p.frame.O[2] + p.frame.N[2] * 1.5;
    if (p.kind === "fin" || p.kind === "rib") {
      // edge-on: draw thin world-XY footprint of the slab (x0..x0+3 wide strip over its y extent, at each u range)
      const pts = p.outline.map(([u, v]) => [p.frame.O[0], v]);
      const bb = bbox(p.outline);
      const x0 = p.frame.O[0];
      const yy0 = bb.y0, yy1 = bb.y1;
      const col = p.kind === "rib" ? "#b9a37e" : "#c9b58d";
      body += `<rect x="${proj([x0, yy1, 0])[0]}" y="${proj([x0, yy1, 0])[1]}" width="${P.T}" height="${yy1 - yy0}" fill="${col}" stroke="#8a7a5c" stroke-width="0.15"/>`;
      continue;
    }
    const face = facePts(p, 0).map(proj);
    const holes = holePts(p, 0).map((h) => h.map(proj));
    const z = p.frame.O[2];
    // shadow
    if (p.kind === "silhouette" || p.kind === "plate") {
      const s = z * 0.12 + 2;
      const sh = face.map(([x, y]) => [x + s * 0.5, y + s]);
      body += `<path d="${pathD(sh, true)}" fill="rgba(60,45,25,0.18)"/>`;
    }
    const col = p.kind === "plate" ? WOOD[0] : p.kind === "hanger" ? "#b9a37e" : WOOD[1 + (Math.abs(Math.round(z)) % 3)];
    body += `<path d="${pathD(face, true)} ${holes.map((h) => pathD(h, true)).join(" ")}" fill="${col}" fill-rule="evenodd" stroke="#7a6a4c" stroke-width="0.2"/>`;
    for (const s of p.scores) {
      const pts = s.map(([u, v]) => proj(toWorld(p.frame, u, v, 0)));
      body += `<path d="${pathD(pts, false)}" fill="none" stroke="#8a6a3a" stroke-width="0.18"/>`;
    }
  }
  return svgDoc({ w: W, h: H, body, title: "front view" });
}

// ISO view
export function isoView() {
  const c30 = Math.cos(Math.PI / 6), s30 = 0.5;
  const proj = ([x, y, z]) => [(x + z) * c30 + 40, 320 - (y + (x - z) * s30) * 0.9];
  let polys = [];
  for (const p of parts) {
    const f0 = facePts(p, 0), f1 = facePts(p, P.T);
    const depth = (pts) => pts.reduce((s, q) => s + q[0] - q[1] + q[2], 0) / pts.length;
    // side quads
    for (let i = 0; i < p.outline.length; i++) {
      const j = (i + 1) % p.outline.length;
      const quad = [f0[i], f0[j], f1[j], f1[i]];
      polys.push({ d: depth(quad), pts: quad.map(proj), col: "#c5ab7e", stroke: "none" });
    }
    const face = p.frame.N[0] + p.frame.N[1] + p.frame.N[2] > 0 ? f1 : f0;
    polys.push({
      d: depth(face) + 0.01, pts: face.map(proj), col: p.kind === "plate" ? "#e7d7b4" : "#dfcaa0",
      holes: holePts(p, p.frame.N[2] >= 0 ? P.T : 0).map((h) => h.map(proj)), stroke: "#7a6a4c",
    });
  }
  polys.sort((a, b) => a.d - b.d);
  let body = `<rect width="560" height="420" fill="#f4efe6"/>`;
  for (const q of polys) {
    body += `<path d="${pathD(q.pts, true)} ${(q.holes || []).map((h) => pathD(h, true)).join(" ")}" fill="${q.col}" fill-rule="evenodd" stroke="${q.stroke}" stroke-width="0.15"/>`;
  }
  return svgDoc({ w: 560, h: 420, body, title: "isometric view" });
}

// SIDE view (look along +x): shows standoffs, hooks, wall
export function sideView() {
  const H = 300;
  const proj = ([x, y, z]) => [80 + z * 2, H - y - 14]; // exaggerate z 2x
  let body = `<rect width="260" height="${H}" fill="#f4efe6"/>`;
  body += `<rect x="${80 - (P.ribDepth + P.T + 7) * 2 - 3}" y="0" width="3" height="${H}" fill="#999"/>`; // wall
  const cols = { plate: "#c9a86a", rib: "#8d7a58", hanger: "#6d5a3a", fin: "#b09468", silhouette: "#84683f" };
  for (const p of parts) {
    if (p.kind === "plate" || p.kind === "hanger") {
      const bb = bbox(p.outline);
      const z0 = p.frame.O[2];
      const [px, py] = proj([0, bb.y1, z0]);
      body += `<rect x="${px}" y="${py}" width="${P.T * 2}" height="${bb.y1 - bb.y0}" fill="${cols[p.kind]}"/>`;
    } else {
      const pts = p.outline.map(([u, v]) => proj(toWorld(p.frame, u, v, 0)));
      body += `<path d="${pathD(pts, true)}" fill="${cols[p.kind]}" fill-opacity="0.75" stroke="#4a3a20" stroke-width="0.2"/>`;
    }
  }
  return svgDoc({ w: 260, h: H, body, title: "side view (z x2)" });
}
