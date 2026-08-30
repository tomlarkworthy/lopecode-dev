// Renders for design iteration: layer contact sheet, mechanism plane,
// assembled oblique, cross-sections.
import { parts, BOLT, TRAVEL, Z, W, D } from "./design.js";
import { bbox } from "../lib/geom.js";
import { pathD, flipY, svgDoc } from "../lib/svg.js";
import { Solid } from "../lib/solid.js";
import { toWorld } from "../lib/geom.js";
import { writeFileSync } from "fs";

const P = (id) => parts.find((p) => p.id === id);

// ---- contact sheet of key flat parts -------------------------------------
export function contactSheet(ids, file, cols = 4) {
  const cell = 150, pad = 10;
  const rows = Math.ceil(ids.length / cols);
  let body = "";
  ids.forEach((id, i) => {
    const p = P(id);
    if (!p) { return; }
    const cx = (i % cols) * cell + pad, cy = Math.floor(i / cols) * cell + pad;
    const tf = (pts) => pts.map(([u, v]) => [u + cx, cell * rows - (v + cy) + 0]);
    let d = pathD(tf(p.outline), true);
    for (const h of p.holes) d += " " + pathD(tf(h), true);
    body += `<path d="${d}" fill="#d9c8a0" stroke="#333" stroke-width="0.4" fill-rule="evenodd"/>`;
    for (const s of p.scores) body += `<path d="${pathD(tf(s), false)}" fill="none" stroke="#46f" stroke-width="0.35"/>`;
    body += `<text x="${cx + 2}" y="${cell * rows - cy - 2}" font-size="6" fill="#000">${p.id}</text>`;
  });
  const svg = svgDoc({ w: cols * cell + 2 * pad, h: rows * cell + 2 * pad, body, bg: "#fff" });
  writeFileSync(file, svg);
  console.log("wrote", file);
}

// ---- mechanism plane (frame + bolts + cams at a dial angle) --------------
export function mechView(angleA, angleB, file, boltShift = [0, 0]) {
  const H = 100;
  let body = "";
  const draw = (pts, fill, stroke = "#333") => {
    body += `<path d="${pathD(flipY(pts, H), true)}" fill="${fill}" stroke="${stroke}" stroke-width="0.35" fill-rule="evenodd"/>`;
  };
  const drawWithHoles = (p, fill, dx = 0, rot = null) => {
    const tf = (pts) => pts.map(([u, v]) => {
      let x = u, y = v;
      if (rot) {
        const [cx, cy, a] = rot;
        const s = Math.sin(a), c = Math.cos(a);
        const rx = x - cx, ry = y - cy;
        x = cx + rx * c - ry * s; y = cy + rx * s + ry * c;
      }
      return [x + dx, y];
    });
    let d = pathD(flipY(tf(p.outline), H), true);
    for (const h of p.holes || []) d += " " + pathD(flipY(tf(h), H), true);
    body += `<path d="${d}" fill="${fill}" stroke="#333" stroke-width="0.35" fill-rule="evenodd"/>`;
  };
  drawWithHoles(P("L18"), "#c9b083");
  drawWithHoles(P("LFRAME"), "#e2d2ac");
  BOLT.forEach((b, i) => {
    const ang = i === 0 ? angleA : angleB;
    drawWithHoles(P(`CAM${b.id}`), "#b39264", 0, [b.cam[0], b.cam[1], (ang * Math.PI) / 180]);
    drawWithHoles(P(`BOLT${b.id}`), "#8fb08a", boltShift[i]);
  });
  writeFileSync(file, svgDoc({ w: 132, h: H, body, bg: "#fff" }));
  console.log("wrote", file);
}

// ---- oblique assembled view ----------------------------------------------
// cabinet projection; draws only camera-facing side walls per layer (front +
// right), so the strata read as a solid object. Lid top face + knobs on top.
export function obliqueView(file, { lidSlide = 0, drawerSlide = 0, back = false } = {}) {
  const world = back ? ([x, y, z]) => [W - x, D - y, z] : (p) => p;
  const proj = (pt) => { const [x, y, z] = world(pt); return [x + y * 0.46, z + y * 0.30]; };
  let body = "";
  const layerParts = parts.filter((p) => p.frame.N?.[2] === 1)
    .sort((a, b) => a.frame.O[2] - b.frame.O[2]);
  const sideQuads = (p, dy, topFace) => {
    const z0 = p.frame.O[2], z1 = z0 + 3;
    const o = p.outline;
    let quads = "", hidden = "";
    for (let i = 0; i < o.length; i++) {
      const a = o[i], b = o[(i + 1) % o.length];
      const dx = b[0] - a[0], dyE = b[1] - a[1];
      const len = Math.hypot(dx, dyE);
      if (len < 1e-6) continue;
      let nx = dyE / len, ny = -dx / len; // outward for CCW
      if (back) { nx = -nx; ny = -ny; }
      const front = ny < -0.2, right = nx > 0.2;
      const A = proj([a[0], a[1] + dy, z0]), B = proj([b[0], b[1] + dy, z0]);
      const C = proj([b[0], b[1] + dy, z1]), Dp = proj([a[0], a[1] + dy, z1]);
      const base = front ? [212, 187, 140] : right ? [178, 148, 103] : [150, 124, 86];
      const jitter = Math.sin(z0 * 1.7 + a[0] * 0.05) * 9;
      const col = `rgb(${base[0] + jitter | 0},${base[1] + jitter | 0},${base[2] + jitter | 0})`;
      const q = `<path d="M${A[0].toFixed(2)},${A[1].toFixed(2)}L${B[0].toFixed(2)},${B[1].toFixed(2)}L${C[0].toFixed(2)},${C[1].toFixed(2)}L${Dp[0].toFixed(2)},${Dp[1].toFixed(2)}Z" fill="${col}" stroke="rgba(90,70,40,0.5)" stroke-width="0.16"/>`;
      if (front || right) quads += q; else hidden += q; // recessed faces drawn first
    }
    quads = hidden + quads;
    if (topFace) {
      const tf = (pts) => pts.map(([u, v]) => proj([u, v + dy, z1]));
      let d = pathD(tf(p.outline), true);
      for (const h of p.holes) d += " " + pathD(tf(h), true);
      quads += `<path d="${d}" fill="#dcc79b" stroke="#7a6544" stroke-width="0.35" fill-rule="evenodd"/>`;
      for (const sc of p.scores) quads += `<path d="${pathD(tf(sc), false)}" fill="none" stroke="#6b5a9e" stroke-width="0.35" opacity="0.85"/>`;
    }
    return quads;
  };
  for (const p of layerParts) {
    if (["cam", "bolt", "key", "drawer"].includes(p.kind) && p.id !== "DFLOOR") { /* internal */ }
    if (p.kind === "cam" && !p.id.startsWith("KNOB")) continue;
    if (p.kind === "bolt" || p.kind === "key") continue;
    if (p.kind === "drawer" && drawerSlide === 0) continue;
    if (p.kind === "drawer" && p.id !== "DFLOOR" && p.frame.N?.[2] !== 1) continue;
    const isLid = p.kind === "lid" || p.id.startsWith("KNOB");
    const dy = isLid ? -lidSlide : p.kind === "drawer" ? drawerSlide : 0;
    const top = p.id === "LTOP" || p.id.startsWith("KNOB");
    body += sideQuads(p, dy, top);
  }
  // vertical drawer pieces (facade, walls): generic face+extrusion draw
  if (drawerSlide > 0) {
    const verts = parts.filter((p) => p.kind === "drawer" && p.frame.N?.[2] !== 1)
      .sort((a, b) => (back ? 1 : -1) * ((a.frame.O[1] + a.frame.N[1]) - (b.frame.O[1] + b.frame.N[1])));
    for (const p of verts) {
      const fr = p.frame;
      const toW = (u, v, w) => [
        fr.O[0] + fr.U[0] * u + fr.V[0] * v + fr.N[0] * w,
        fr.O[1] + fr.U[1] * u + fr.V[1] * v + fr.N[1] * w + drawerSlide,
        fr.O[2] + fr.U[2] * u + fr.V[2] * v + fr.N[2] * w,
      ];
      const o = p.outline;
      // extrusion bands
      for (let i = 0; i < o.length; i++) {
        const a = o[i], b = o[(i + 1) % o.length];
        const A = proj(toW(a[0], a[1], 0)), B = proj(toW(b[0], b[1], 0));
        const C = proj(toW(b[0], b[1], 3)), Dq = proj(toW(a[0], a[1], 3));
        body += `<path d="M${A[0].toFixed(2)},${A[1].toFixed(2)}L${B[0].toFixed(2)},${B[1].toFixed(2)}L${C[0].toFixed(2)},${C[1].toFixed(2)}L${Dq[0].toFixed(2)},${Dq[1].toFixed(2)}Z" fill="#c2a678" stroke="rgba(90,70,40,0.5)" stroke-width="0.16"/>`;
      }
      // near face
      const wNear = (back ? fr.N[1] > 0 : fr.N[1] < 0) ? 3 : 0;
      const face = o.map(([u, v]) => proj(toW(u, v, wNear)));
      body += `<path d="${pathD(face, true)}" fill="#d7c096" stroke="#7a6544" stroke-width="0.3"/>`;
    }
  }
  const bb = { w: W + D * 0.46 + 40, h: 66 + D * 0.30 + 40 };
  body = `<g transform="translate(16,${bb.h - 12}) scale(1,-1)">${body}</g>`;
  writeFileSync(file, svgDoc({ w: bb.w, h: bb.h, body, bg: "#efe9db" }));
  console.log("wrote", file);
}

// ---- cross-section --------------------------------------------------------
// slice all parts with plane y=yc or x=xc; render material cells in (x/ y, z)
export function section(axis, val, file) {
  const solids = parts.map((p) => ({ p, s: new Solid(p) }));
  const step = 0.5;
  let body = "";
  const colors = { layer: "#cdb488", lid: "#9db6d8", drawer: "#d89d9d", cam: "#b78ac9", bolt: "#8fb08a", key: "#888", spline: "#e0d276", dropper: "#e08c3c" };
  for (const { p, s } of solids) {
    const col = colors[p.kind] || "#aaa";
    // sample world grid on the section plane over part AABB
    const bbW = s.worldAABB;
    let cells = "";
    for (let a = bbW.lo[axis === "y" ? 0 : 1]; a <= bbW.hi[axis === "y" ? 0 : 1]; a += step) {
      for (let z = bbW.lo[2]; z <= bbW.hi[2]; z += step) {
        const pt = axis === "y" ? [a, val, z] : [val, a, z];
        if (s.containsWorld(pt, 0.01)) cells += `<rect x="${a - step / 2}" y="${z - step / 2}" width="${step}" height="${step}"/>`;
      }
    }
    if (cells) body += `<g fill="${col}">${cells}</g>`;
  }
  body = `<g transform="translate(5,75) scale(1,-1)">${body}</g>`;
  writeFileSync(file, svgDoc({ w: 142, h: 80, body, bg: "#fff" }));
  console.log("wrote", file);
}

// CLI
const mode = process.argv[2] || "all";
if (mode === "all" || mode === "sheet") {
  contactSheet(["L00", "L01", "L02", "L03", "L06", "L07", "L16", "L17", "L18", "LFRAME", "LTOP", "RUNNER", "DFLOOR", "CAMA", "KNOBA", "KNOBB"], "out/layers.svg", 4);
}
if (mode === "all" || mode === "mech") {
  mechView(0, 0, "out/mech-locked.svg");
  mechView(BOLT[0].open, BOLT[1].open, "out/mech-open.svg", [TRAVEL, TRAVEL]);
}
if (mode === "all" || mode === "iso") {
  obliqueView("out/box-closed.svg");
  obliqueView("out/box-open.svg", { lidSlide: 55 });
  obliqueView("out/box-drawer.svg", { drawerSlide: 34, back: true });
}
if (mode === "all" || mode === "sec") {
  section("x", 66, "out/section-x66.svg");
  section("y", 30.5, "out/section-y30.svg");
}
