import { ALL } from "../lib/landmarks.js";
import { bbox } from "../lib/geom.js";
import { svgDoc, pathD } from "../lib/svg.js";
let body = "", x = 6;
const H = 130;
for (const [k, f] of Object.entries(ALL)) {
  const p = f();
  const bb = bbox(p.outline);
  const ox = x - bb.x0;
  const tf = (pts) => pts.map(([px, py]) => [px + ox, H - 12 - py]);
  body += `<path d="${pathD(tf(p.outline), true)} ${(p.holes||[]).map(h=>pathD(tf(h),true)).join(" ")}" fill="#dcc9a3" fill-rule="evenodd" stroke="#b00" stroke-width="0.15"/>`;
  for (const s of p.scores) body += `<path d="${pathD(tf(s), false)}" fill="none" stroke="#04a" stroke-width="0.15"/>`;
  for (const m of p.mounts) body += `<rect x="${m.x + ox - 1.5}" y="${H-12-(m.notch?7:(m.lapDepth||7))-(m.restY||0)}" width="3" height="${(m.notch?7:m.lapDepth||7)}" fill="none" stroke="#0a0" stroke-width="0.2"/>`;
  body += `<text x="${x + bb.w/2}" y="${H-2}" font-size="4" text-anchor="middle" fill="#333">${k} ${bb.w.toFixed(0)}x${bb.h.toFixed(0)}</text>`;
  x += bb.w + 10;
}
console.log(svgDoc({ w: x + 6, h: H, body, bg: "#fff" }));
