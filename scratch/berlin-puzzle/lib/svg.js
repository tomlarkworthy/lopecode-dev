// SVG emission. Laser convention here: CUT = red stroke, SCORE = blue stroke.
import { RELIEF_LEN } from "./geom.js";

export const CUT = "#FF0000";
export const SCORE = "#0000FF";
export const STROKE_W = 0.1; // mm hairline

const fmt = (n) => (Math.round(n * 1000) / 1000).toString();

export function pathD(pts, closed) {
  if (!pts.length) return "";
  let d = `M${fmt(pts[0][0])} ${fmt(pts[0][1])}`;
  for (let i = 1; i < pts.length; i++) d += `L${fmt(pts[i][0])} ${fmt(pts[i][1])}`;
  if (closed) d += "Z";
  return d;
}

// yFlip: our part coords are y-up; SVG is y-down. Flip about sheet height.
export function flipY(pts, H) {
  return pts.map(([x, y]) => [x, H - y]);
}

export function spikeSegments(spikes) {
  return spikes.map(({ p, ang }) => {
    const a = (ang * Math.PI) / 180;
    return [p, [p[0] + RELIEF_LEN * Math.cos(a), p[1] + RELIEF_LEN * Math.sin(a)]];
  });
}

export function svgDoc({ w, h, body, bg = null, title = "" }) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}mm" height="${h}mm" viewBox="0 0 ${w} ${h}">
${title ? `<title>${title}</title>` : ""}
${bg ? `<rect x="0" y="0" width="${w}" height="${h}" fill="${bg}"/>` : ""}
${body}
</svg>`;
}

export function group(attrs, content) {
  const a = Object.entries(attrs).map(([k, v]) => `${k}="${v}"`).join(" ");
  return `<g ${a}>\n${content}\n</g>`;
}

export function cutPath(d, preview) {
  return `<path d="${d}" fill="${preview ? "#e8ddc8" : "none"}" fill-rule="evenodd" stroke="${CUT}" stroke-width="${STROKE_W}"/>`;
}
export function scorePath(d, preview) {
  return `<path d="${d}" fill="none" stroke="${SCORE}" stroke-width="${STROKE_W}" stroke-linecap="round" stroke-linejoin="round"/>`;
}
