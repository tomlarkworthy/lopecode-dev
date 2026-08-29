import { spree, havel, lakes } from "../lib/map.js";
import { bbox } from "../lib/geom.js";
const sp = spree(), hv = havel();
[...sp.holes, ...hv.holes, ...lakes()].forEach((h, i) => {
  const bb = bbox(h);
  console.log(`hole${i} x[${bb.x0.toFixed(1)},${bb.x1.toFixed(1)}] y[${bb.y0.toFixed(1)},${bb.y1.toFixed(1)}] pts=${h.length}`);
});
