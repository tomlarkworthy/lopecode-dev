import { parts, plate, jointLog } from "../design.js";
import { bbox } from "../lib/geom.js";
import { mapXY } from "../lib/map.js";
console.log("OX/OY check: mapXY(13.088,52.338) =", mapXY(13.088,52.338).map(v=>v.toFixed(1)));
console.log("\n-- plate holes --");
plate.holes.forEach((h, i) => {
  const bb = bbox(h);
  const kind = i < 5 ? "spree" : i < 8 ? "havel" : i < 11 ? "lake" : "slot";
  console.log(`hole${String(i).padStart(2)} ${kind.padEnd(5)} x[${bb.x0.toFixed(1)},${bb.x1.toFixed(1)}] y[${bb.y0.toFixed(1)},${bb.y1.toFixed(1)}]`);
});
console.log("\n-- fins/ribs --");
for (const p of parts) {
  if (p.kind !== "fin" && p.kind !== "rib") continue;
  const bb = bbox(p.outline);
  console.log(`${p.id.padEnd(5)} ${p.label.padEnd(28)} x=[${p.frame.O[0].toFixed(1)},${(p.frame.O[0]+3).toFixed(1)}] z[${bb.x0.toFixed(1)},${bb.x1.toFixed(1)}] y[${bb.y0.toFixed(1)},${bb.y1.toFixed(1)}]`);
}
console.log("\n-- silhouettes --");
for (const p of parts) {
  if (p.kind !== "silhouette") continue;
  const bb = bbox(p.outline);
  console.log(`${p.id.padEnd(18)} O=[${p.frame.O.map(v=>v.toFixed(1))}] local x[${bb.x0.toFixed(1)},${bb.x1.toFixed(1)}] y[${bb.y0.toFixed(1)},${bb.y1.toFixed(1)}]`);
}
